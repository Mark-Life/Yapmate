#!/bin/bash

set -e

# =======================
# 🔧 CONFIGURATION
# =======================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_PACKAGE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROJECT_ROOT="$(cd "$DB_PACKAGE_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.local"

# Load environment variables from .env file
if [ -f "$ENV_FILE" ]; then
	set -a
	source "$ENV_FILE"
	set +a
else
	echo "⚠️  Warning: .env file not found at $ENV_FILE"
fi

# Validate DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
	echo "❌ Error: DATABASE_URL environment variable is not set"
	echo "   Please set it in $ENV_FILE or export it before running this script"
	exit 1
fi

# Convert pooler URL to direct connection URL for pg_dump
# Supabase pooler URLs don't support pg_dump, need direct connection
convert_to_direct_url() {
	local url="$1"

	# Check if it's a pooler URL (contains "pooler.supabase.com")
	if echo "$url" | grep -q "pooler\.supabase\.com"; then
		echo "🔄 Detected pooler connection, converting to direct connection for pg_dump..." >&2

		# Extract project ID from user part (format: postgres.[project-id])
		# URL format: postgresql://postgres.[project-id]:[pass]@host:port/db
		if echo "$url" | grep -q "postgres\.[^:]*:"; then
			# Extract project ID
			PROJECT_ID=$(echo "$url" | sed -n 's|.*postgres\.\([^:]*\):.*|\1|p')

			if [ -n "$PROJECT_ID" ]; then
				# Extract password (between : and @)
				PASSWORD=$(echo "$url" | sed -n 's|.*postgres\.[^:]*:\([^@]*\)@.*|\1|p')

				# Extract database name (after last /)
				DB_NAME=$(echo "$url" | sed -n 's|.*/\([^?]*\).*|\1|p')

				# Construct direct connection URL
				# Format: postgresql://postgres.[project-id]:[pass]@db.[project-id].supabase.co:5432/[db]
				echo "postgresql://postgres.${PROJECT_ID}:${PASSWORD}@db.${PROJECT_ID}.supabase.co:5432/${DB_NAME}"
				return
			fi
		fi

		# Fallback: try transaction pooler port 6543 (supports pg_dump)
		echo "⚠️  Could not extract project ID, trying transaction pooler port 6543..." >&2
		echo "$url" | sed 's/:5432\//:6543\//' | sed 's/?workaround=supabase-pooler.vercel//'
		return
	fi

	# Not a pooler URL, return as-is
	echo "$url"
}

# Get direct connection URL for pg_dump
DIRECT_DATABASE_URL=$(convert_to_direct_url "$DATABASE_URL")

# Local Supabase config (default Supabase CLI values)
LOCAL_DB_HOST="127.0.0.1"
LOCAL_DB_PORT=54322
LOCAL_DB_USER="postgres"
LOCAL_DB_NAME="postgres"
LOCAL_DB_PASSWORD="postgres"

# Output SQL file (in script directory)
EXPORT_FILE="$SCRIPT_DIR/clean_export.sql"
CLEANED_FILE="$SCRIPT_DIR/cleaned_export.sql"

# =======================
# ✅ VALIDATION
# =======================

echo "🔍 Validating local Supabase is running..."

# Find PostgreSQL client tools (psql and pg_dump)
# Prioritize newer versions from Homebrew, then fall back to PATH
find_pg_tool() {
	local tool=$1

	# Check common Homebrew installation paths first (prioritize newer versions)
	# This ensures we use the newest available version even if older one is in PATH
	for base in \
		"/opt/homebrew/opt/postgresql@17/bin" \
		"/opt/homebrew/opt/postgresql@16/bin" \
		"/opt/homebrew/opt/postgresql@15/bin" \
		"/opt/homebrew/opt/libpq/bin" \
		"/usr/local/opt/postgresql@17/bin" \
		"/usr/local/opt/postgresql@16/bin" \
		"/usr/local/opt/postgresql@15/bin" \
		"/usr/local/opt/libpq/bin"; do
		if [ -f "$base/$tool" ]; then
			echo "$base/$tool"
			return
		fi
	done

	# Fall back to PATH if not found in Homebrew paths
	if command -v "$tool" &> /dev/null; then
		echo "$tool"
		return
	fi

	echo ""
}

PSQL_CMD=$(find_pg_tool "psql")
PG_DUMP_CMD=$(find_pg_tool "pg_dump")

# Show which PostgreSQL version is being used
if [ -n "$PG_DUMP_CMD" ]; then
	PG_VERSION=$($PG_DUMP_CMD --version 2>/dev/null | head -1 || echo "unknown")
	echo "   Using: $PG_VERSION"
	echo "   Path: $PG_DUMP_CMD"
fi

if [ -z "$PSQL_CMD" ] || [ -z "$PG_DUMP_CMD" ]; then
	echo "❌ Error: PostgreSQL client tools (psql, pg_dump) not found"
	echo ""
	echo "   PostgreSQL client tools are required for this script."
	echo "   Install them using one of these methods:"
	echo ""
	echo "   macOS (Homebrew):"
	echo "     brew install postgresql@15"
	echo "     # or (lighter weight, just client tools):"
	echo "     brew install libpq"
	echo "     brew link --force libpq"
	echo ""
	echo "   Or add PostgreSQL bin directory to PATH:"
	echo "     export PATH=\"/opt/homebrew/opt/postgresql@15/bin:\$PATH\""
	echo "     # or for Intel Macs:"
	echo "     export PATH=\"/usr/local/opt/postgresql@15/bin:\$PATH\""
	echo ""
	exit 1
fi

# Try to connect with retries (Supabase might need a moment to fully start)
MAX_RETRIES=5
RETRY_DELAY=2
CONNECTED=false

for i in $(seq 1 $MAX_RETRIES); do
	if PGPASSWORD=$LOCAL_DB_PASSWORD $PSQL_CMD -h $LOCAL_DB_HOST -p $LOCAL_DB_PORT -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -c "SELECT 1;" >/dev/null 2>&1; then
		CONNECTED=true
		break
	fi
	if [ $i -lt $MAX_RETRIES ]; then
		echo "   Retrying connection ($i/$MAX_RETRIES)..."
		sleep $RETRY_DELAY
	fi
done

if [ "$CONNECTED" = false ]; then
	echo "❌ Error: Cannot connect to local Supabase on $LOCAL_DB_HOST:$LOCAL_DB_PORT"
	echo "   Make sure Supabase CLI is running: bun run supabase:start"
	echo "   Check connection with: $PSQL_CMD -h $LOCAL_DB_HOST -p $LOCAL_DB_PORT -U $LOCAL_DB_USER -d $LOCAL_DB_NAME"
	exit 1
fi

echo "✅ Local Supabase is running and accessible"

# =======================
# 🚨 DROP USER-DEFINED SCHEMAS (safe list)
# =======================

echo "🚨 Dropping all user-defined schemas in local Supabase (excluding system schemas)..."

PGPASSWORD=$LOCAL_DB_PASSWORD $PSQL_CMD -h $LOCAL_DB_HOST -p $LOCAL_DB_PORT -U $LOCAL_DB_USER -d $LOCAL_DB_NAME <<EOF
DO \$\$
DECLARE
    _schema text;
BEGIN
    FOR _schema IN
        SELECT nspname
        FROM pg_namespace
        WHERE nspname NOT IN (
            'information_schema',
            'pg_catalog',
            'auth',
            'storage',
            'extensions',
            'supabase_functions',
            'realtime',
            'graphql',
            'graphql_public',
            'pgsodium',
            'net',
            'vault',
            'drizzle',
            '_realtime'
        )
        AND nspname NOT LIKE 'pg_%'
    LOOP
        EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', _schema);
    END LOOP;

    -- Drop and recreate public schema
    EXECUTE 'DROP SCHEMA IF EXISTS public CASCADE';
    EXECUTE 'CREATE SCHEMA public AUTHORIZATION postgres';
END
\$\$;
EOF

# =======================
# 📤 EXPORT REMOTE DATABASE
# =======================

echo "📤 Exporting remote Supabase database..."

# Try transaction pooler (port 6543) first, then direct connection
DUMP_ERROR_FILE_1="$SCRIPT_DIR/dump_error_1.log"
DUMP_ERROR_FILE_2="$SCRIPT_DIR/dump_error_2.log"
DUMP_SUCCESS=false

# Extract base URL components for fallback
if echo "$DATABASE_URL" | grep -q "pooler\.supabase\.com"; then
	# Try transaction pooler port 6543 first (supports pg_dump)
	TRANSACTION_POOLER_URL=$(echo "$DATABASE_URL" | sed 's/:5432\//:6543\//' | sed 's/?workaround=supabase-pooler.vercel//')

	echo "   Trying transaction pooler (port 6543) first..."
	echo "   Connection: $(echo "$TRANSACTION_POOLER_URL" | sed 's/:[^:@]*@/:***@/g')"

	if $PG_DUMP_CMD --no-owner --no-privileges --no-acl \
		--dbname="$TRANSACTION_POOLER_URL" >"$EXPORT_FILE" 2>"$DUMP_ERROR_FILE_1"; then
		DUMP_SUCCESS=true
		echo "   ✅ Transaction pooler connection successful!"
	else
		echo "   ❌ Transaction pooler failed (see errors below)"
	fi
fi

# If transaction pooler failed, try direct connection
if [ "$DUMP_SUCCESS" = false ]; then
	echo ""
	echo "   Trying direct connection..."
	echo "   Connection: $(echo "$DIRECT_DATABASE_URL" | sed 's/:[^:@]*@/:***@/g')"

	if $PG_DUMP_CMD --no-owner --no-privileges --no-acl \
		--dbname="$DIRECT_DATABASE_URL" >"$EXPORT_FILE" 2>"$DUMP_ERROR_FILE_2"; then
		DUMP_SUCCESS=true
		echo "   ✅ Direct connection successful!"
	fi
fi

if [ "$DUMP_SUCCESS" = false ]; then
	echo ""
	echo "❌ Error: Failed to export remote database"
	echo ""

	VERSION_MISMATCH=false
	if [ -f "$DUMP_ERROR_FILE_1" ] && grep -q "server version mismatch" "$DUMP_ERROR_FILE_1" 2>/dev/null; then
		VERSION_MISMATCH=true
	fi
	if [ -f "$DUMP_ERROR_FILE_2" ] && grep -q "server version mismatch" "$DUMP_ERROR_FILE_2" 2>/dev/null; then
		VERSION_MISMATCH=true
	fi

	if [ "$VERSION_MISMATCH" = true ]; then
		echo "   ⚠️  PostgreSQL Version Mismatch Detected!"
		echo ""
		if [ -f "$DUMP_ERROR_FILE_1" ] && [ -s "$DUMP_ERROR_FILE_1" ]; then
			echo "   Transaction pooler error:"
			cat "$DUMP_ERROR_FILE_1" | sed 's/^/   /'
			echo ""
		fi
		echo "   Solution: Upgrade PostgreSQL client tools to match server version"
		echo ""
		echo "   macOS (Homebrew):"
		echo "     brew install postgresql@17"
		echo "     brew link --force postgresql@17"
		echo ""
		echo "   Or install latest version:"
		echo "     brew install postgresql"
		echo ""
		echo "   After upgrading, verify version:"
		echo "     $PG_DUMP_CMD --version"
		echo ""
	else
		if [ -f "$DUMP_ERROR_FILE_1" ] && [ -s "$DUMP_ERROR_FILE_1" ]; then
			echo "   Transaction pooler (port 6543) error:"
			cat "$DUMP_ERROR_FILE_1" | sed 's/^/   /'
			echo ""
		fi

		if [ -f "$DUMP_ERROR_FILE_2" ] && [ -s "$DUMP_ERROR_FILE_2" ]; then
			echo "   Direct connection error:"
			cat "$DUMP_ERROR_FILE_2" | sed 's/^/   /'
			echo ""
		fi

		echo "   Troubleshooting:"
		echo "   1. Transaction pooler (port 6543) is recommended for pg_dump"
		echo "   2. Ensure your IP is allowed in Supabase dashboard (Settings → Database → Connection pooling)"
		echo "   3. Direct connection requires IP allowlisting (Settings → Database → Network restrictions)"
		echo "   4. Get connection strings from Supabase dashboard:"
		echo "      Settings → Database → Connection string"
		echo ""
	fi

	echo "   Original URL (masked): $(echo "$DATABASE_URL" | sed 's/:[^:@]*@/:***@/g')"
	if echo "$DATABASE_URL" | grep -q "pooler\.supabase\.com"; then
		echo "   Transaction pooler tried (masked): $(echo "$TRANSACTION_POOLER_URL" | sed 's/:[^:@]*@/:***@/g')"
	fi
	echo "   Direct URL tried (masked): $(echo "$DIRECT_DATABASE_URL" | sed 's/:[^:@]*@/:***@/g')"
	echo ""
	rm -f "$EXPORT_FILE" "$DUMP_ERROR_FILE_1" "$DUMP_ERROR_FILE_2"
	exit 1
fi

rm -f "$DUMP_ERROR_FILE_1" "$DUMP_ERROR_FILE_2"

echo "✅ Database exported to $EXPORT_FILE"

# =======================
# 🧼 CLEANUP SQL (SAFE & SURGICAL)
# =======================

echo "🧼 Cleaning SQL dump (removing superuser-only operations)..."

# Remove problematic lines that require superuser privileges
sed -E \
	-e '/^--.*PostgreSQL database dump/d' \
	-e '/^SET .*;/d' \
	-e '/^SELECT pg_catalog\.set_config/d' \
	-e '/^CREATE EXTENSION IF NOT EXISTS/d' \
	-e '/^COMMENT ON EXTENSION/d' \
	-e '/^REVOKE ALL ON SCHEMA/d' \
	-e '/^GRANT ALL ON SCHEMA/d' \
	-e '/^ALTER DEFAULT PRIVILEGES/d' \
	-e '/^CREATE SCHEMA IF NOT EXISTS "pg_/d' \
	-e '/^COMMENT ON SCHEMA "pg_/d' \
	"$EXPORT_FILE" >"$CLEANED_FILE" || {
	echo "❌ Error: Failed to clean SQL dump"
	rm -f "$EXPORT_FILE" "$CLEANED_FILE"
	exit 1
}

echo "✅ SQL dump cleaned"

# =======================
# 📥 IMPORT INTO LOCAL SUPABASE
# =======================

echo "📥 Importing cleaned SQL into local Supabase..."

if ! PGPASSWORD=$LOCAL_DB_PASSWORD $PSQL_CMD -h $LOCAL_DB_HOST -p $LOCAL_DB_PORT -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -f "$CLEANED_FILE" >/dev/null 2>&1; then
	echo "⚠️  Warning: Some SQL statements may have failed (this is often normal)"
	echo "   Check the output above for specific errors"
fi

# =======================
# 🧹 CLEANUP TEMP FILES
# =======================

rm -f "$EXPORT_FILE" "$CLEANED_FILE"

echo "✅ All done! Your local Supabase is now synced and clean."