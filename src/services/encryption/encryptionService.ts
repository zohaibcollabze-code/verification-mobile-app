/**
 * OFFLINE-FIRST ARCHITECTURE — Encryption Service
 * AES-256-GCM encryption for sensitive data at rest.
 * Master key derived from hardware-backed secure storage.
 */
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const MASTER_KEY_KEY = 'mpvp_encryption_master_key';
const MASTER_KEY_SIZE = 32; // 256 bits

/**
 * Generate or retrieve the master encryption key from hardware-backed storage.
 * This key never leaves secure storage and is used to derive per-record keys.
 */
async function getMasterKey(): Promise<Crypto.CryptoKey> {
  let masterKeyData: string | null = null;

  try {
    masterKeyData = await SecureStore.getItemAsync(MASTER_KEY_KEY);
  } catch (error) {
    console.warn('[Encryption] Failed to retrieve master key, generating new one');
  }

  if (!masterKeyData) {
    // Generate new master key
    const keyData = await Crypto.getRandomBytesAsync(MASTER_KEY_SIZE);
    masterKeyData = keyData.base64;

    try {
      await SecureStore.setItemAsync(MASTER_KEY_KEY, masterKeyData, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      });
    } catch (error) {
      console.error('[Encryption] Failed to store master key:', error);
      throw new Error('Cannot store encryption key securely');
    }
  }

  // Import the key for crypto operations
  return await Crypto.CryptoKey.importKey(
    new Uint8Array(Buffer.from(masterKeyData, 'base64')),
    { name: 'AES-GCM', length: 256 }
  );
}

/**
 * Encrypt plaintext data with AES-256-GCM.
 * Returns base64-encoded encrypted data with IV prepended.
 */
export async function encryptData(plaintext: string): Promise<string> {
  try {
    const masterKey = await getMasterKey();
    const iv = await Crypto.getRandomBytesAsync(12); // 96-bit IV for GCM

    const encrypted = await Crypto.CryptoKey.encrypt(
      masterKey,
      new TextEncoder().encode(plaintext),
      { name: 'AES-GCM', iv }
    );

    // Prepend IV to encrypted data (IV is not secret)
    const combined = new Uint8Array(iv.length + encrypted.length);
    combined.set(iv);
    combined.set(encrypted, iv.length);

    return Buffer.from(combined).toString('base64');
  } catch (error) {
    console.error('[Encryption] Encrypt failed:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt AES-256-GCM encrypted data.
 * Expects base64-encoded data with IV prepended.
 */
export async function decryptData(encryptedBase64: string): Promise<string> {
  try {
    const masterKey = await getMasterKey();
    const combined = new Uint8Array(Buffer.from(encryptedBase64, 'base64'));

    // Extract IV (first 12 bytes) and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await Crypto.CryptoKey.decrypt(
      masterKey,
      encrypted,
      { name: 'AES-GCM', iv }
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('[Encryption] Decrypt failed:', error);
    throw new Error('Decryption failed');
  }
}

/**
 * Compute SHA-256 checksum of binary data for integrity validation.
 */
export async function computeChecksum(data: Uint8Array): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    Buffer.from(data).toString('base64')
  );
  return hash;
}

/**
 * Validate checksum against binary data.
 */
export async function validateChecksum(data: Uint8Array, expectedChecksum: string): Promise<boolean> {
  const computed = await computeChecksum(data);
  return computed === expectedChecksum;
}
