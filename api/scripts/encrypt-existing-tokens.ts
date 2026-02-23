/**
 * One-time migration script: encrypts all plain-text MonobankToken rows.
 *
 * Run ONCE after deploying the encryption change:
 *   npx ts-node scripts/encrypt-existing-tokens.ts
 *
 * The script is idempotent — already-encrypted rows are skipped.
 * ENCRYPTION_KEY must be set in the environment (or .env file).
 */

import { PrismaClient } from '@prisma/client';
import { createCipheriv, randomBytes } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 16;
const PARTS_COUNT = 3;

function buildKey(): Buffer {
  const hexKey = process.env.ENCRYPTION_KEY;

  if (!hexKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  const key = Buffer.from(hexKey, 'hex');

  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }

  return key;
}

function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function isAlreadyEncrypted(value: string): boolean {
  const parts = value.split(':');

  return (
    parts.length === PARTS_COUNT && parts.every((p) => /^[0-9a-f]+$/i.test(p))
  );
}

async function main(): Promise<void> {
  const key = buildKey();
  const prisma = new PrismaClient();

  try {
    const tokens = await prisma.monobankToken.findMany();
    console.log(`Found ${tokens.length} token(s) to check`);

    let encrypted = 0;
    let skipped = 0;

    for (const record of tokens) {
      if (isAlreadyEncrypted(record.token)) {
        skipped++;
        continue;
      }

      const encryptedToken = encrypt(record.token, key);

      await prisma.monobankToken.update({
        where: { id: record.id },
        data: { token: encryptedToken },
      });

      encrypted++;
      console.log(`Encrypted token for record ${record.id}`);
    }

    console.log(`Done. Encrypted: ${encrypted}, skipped (already encrypted): ${skipped}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
