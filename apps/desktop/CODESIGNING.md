# macOS Code Signing & Notarization Setup

This guide explains how to set up code signing and notarization for DMG distribution.

## Prerequisites

1. Apple Developer account (you have this ✅)
2. Developer ID certificates installed in Keychain

## Step 1: Get Your Certificates

1. Go to [Apple Developer Certificates](https://developer.apple.com/account/resources/certificates/list)
2. Create two certificates (if you don't have them):
   - **Developer ID Application** - for signing the `.app` bundle
   - **Developer ID Installer** - for signing the `.dmg` file
3. Download and double-click to install them in your Keychain

## Step 2: Create App Store Connect API Key (for Notarization)

1. Go to [App Store Connect API Keys](https://appstoreconnect.apple.com/access/api)
2. Click "+" to create a new key
3. Give it a name (e.g., "Yapmate Notarization")
4. Download the `.p8` key file (you can only download once!)
5. Note the:
   - **Key ID** (e.g., `ABC123DEF4`)
   - **Issuer ID** (e.g., `12345678-1234-1234-1234-123456789012`)

## Step 3: Find Your Signing Identity

Run this command to see your available certificates:

```bash
security find-identity -v -p codesigning
```

Look for something like:
```
Developer ID Application: Mark Life Ltd (96ZJ439B4W)
```

Copy the **full name** (everything after the number).

## Step 4: Set Environment Variables

Create a `.env` file in `apps/desktop/` (or set these in your shell):

```bash
# Your signing identity (full name from Step 3)
APPLE_SIGNING_IDENTITY="Developer ID Application: Mark Life Ltd (96ZJ439B4W)"

# App Store Connect API credentials (from Step 2)
APPLE_API_ISSUER="your-issuer-id-here"
APPLE_API_KEY="your-key-id-here"
APPLE_API_KEY_PATH="/path/to/AuthKey_XXXXX.p8"
```

**Important**: Add `apps/desktop/.env` to `.gitignore` to keep secrets safe!

## Step 5: Build Signed DMG

Run the build command:

```bash
bun run build:desktop
```

Or from `apps/desktop`:

```bash
bun run build
```

Tauri will:
1. Build the web frontend
2. Build the Rust backend
3. Sign the `.app` bundle
4. Create and sign the `.dmg`
5. Submit for notarization
6. Staple the notarization ticket

The signed DMG will be in:
```
apps/desktop/src-tauri/target/release/bundle/dmg/Yapmate_0.1.0_x64.dmg
```

## Troubleshooting

### "No signing identity found"
- Make sure certificates are installed in Keychain
- Check the identity name matches exactly (including spaces and parentheses)

### Notarization fails
- Check API key has correct permissions
- Verify `.p8` file path is correct
- Check Apple Developer account status

### Build works but app shows as "damaged"
- Make sure notarization completed successfully
- Try: `xattr -cr /path/to/Yapmate.app` to remove quarantine

## Testing Without Signing

For local testing, you can build without signing:

```bash
APPLE_SIGNING_IDENTITY="" bun run build:desktop
```

The app will work locally but won't pass Gatekeeper for distribution.
