import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

/**
 * AES-256-GCM encryption for OAuth tokens at rest.
 *
 * Key material comes from INTEGRATION_ENCRYPTION_KEY (env-only, never in code):
 *   * 64 hex chars → used directly as the 32-byte key
 *   * any other non-empty string → hashed with SHA-256 into a 32-byte key
 *
 * Ciphertext format: base64(iv[12] || authTag[16] || encrypted). Tokens are
 * encrypted in the API route before any DB write and decrypted only inside
 * server-side tool execution — never serialized to a client.
 */

export function isEncryptionConfigured(): boolean {
  return Boolean(process.env.INTEGRATION_ENCRYPTION_KEY);
}

function getKey(): Buffer {
  const secret = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY is not set — cannot encrypt integration tokens.",
    );
  }
  const hex = /^[0-9a-fA-F]{64}$/.test(secret) ? Buffer.from(secret, "hex") : null;
  return hex ?? createHash("sha256").update(secret, "utf8").digest();
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64");
}

export function decryptToken(ciphertext: string): string {
  const raw = Buffer.from(ciphertext, "base64");
  if (raw.length < 12 + 16) throw new Error("Invalid ciphertext payload.");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** Constant-time string compare (state cookie vs. callback value). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqualShim(ab, bb);
}

function timingSafeEqualShim(a: Buffer, b: Buffer): boolean {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}
