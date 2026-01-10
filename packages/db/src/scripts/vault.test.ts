/**
 * Test script to verify vault operations (create, read, delete)
 * Run: bun --env-file ../../.env.local src/scripts/vault.test.ts
 */

import {
  createSecret,
  deleteSecret,
  getSecret,
  SecretNotFoundError,
} from "../service/vault";

const TEST_SECRET_NAME = "test-vault-secret";
const TEST_SECRET_VALUE = "test-secret-value-12345";

const main = async () => {
  console.log("🧪 Starting vault test...\n");

  try {
    // Step 1: Create/update secret
    console.log("1️⃣ Creating secret...");
    const secretName = await createSecret(TEST_SECRET_NAME, TEST_SECRET_VALUE);
    console.log(`✅ Secret created with name: ${secretName}\n`);

    // Step 2: Read the secret
    console.log("2️⃣ Reading secret...");
    const retrievedValue = await getSecret(TEST_SECRET_NAME);
    console.log(`✅ Secret retrieved: ${retrievedValue}\n`);

    // Verify the value matches
    if (retrievedValue !== TEST_SECRET_VALUE) {
      throw new Error(
        `Secret value mismatch! Expected: ${TEST_SECRET_VALUE}, Got: ${retrievedValue}`
      );
    }
    console.log("✅ Secret value matches expected value\n");

    // Step 3: Delete the secret
    console.log("3️⃣ Deleting secret...");
    const deleted = await deleteSecret(TEST_SECRET_NAME);
    console.log(`✅ Secret deleted: ${deleted}\n`);

    // Step 4: Try to read again (should fail)
    console.log("4️⃣ Attempting to read deleted secret...");
    try {
      const shouldNotExist = await getSecret(TEST_SECRET_NAME);
      console.log(`❌ ERROR: Secret still exists! Value: ${shouldNotExist}`);
      process.exit(1);
    } catch (error) {
      if (error instanceof SecretNotFoundError) {
        console.log(
          `✅ Correctly threw SecretNotFoundError: ${error.message}\n`
        );
      } else {
        throw error;
      }
    }

    console.log("🎉 All vault tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
};

main();
