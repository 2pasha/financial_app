import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

const VALID_HEX_KEY = 'a'.repeat(64);

function buildConfigService(key: string): Partial<ConfigService> {
  return {
    getOrThrow: jest.fn().mockReturnValue(key),
  };
}

async function buildService(configService: Partial<ConfigService>): Promise<CryptoService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      CryptoService,
      { provide: ConfigService, useValue: configService },
    ],
  }).compile();

  return module.get<CryptoService>(CryptoService);
}

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    service = await buildService(buildConfigService(VALID_HEX_KEY));
  });

  describe('encrypt / decrypt roundtrip', () => {
    it('decrypts back to the original plaintext', () => {
      const plaintext = 'u7kQXmtZ3vBcL1sP9nEoFdRaG8hJyW2x';

      const ciphertext = service.encrypt(plaintext);
      const result = service.decrypt(ciphertext);

      expect(result).toBe(plaintext);
    });

    it('produces a different ciphertext each call (random IV)', () => {
      const plaintext = 'same-token';

      const first = service.encrypt(plaintext);
      const second = service.encrypt(plaintext);

      expect(first).not.toBe(second);
      expect(service.decrypt(first)).toBe(plaintext);
      expect(service.decrypt(second)).toBe(plaintext);
    });

    it('stored format contains exactly three colon-separated hex parts', () => {
      const ciphertext = service.encrypt('any-token');
      const parts = ciphertext.split(':');

      expect(parts).toHaveLength(3);
      parts.forEach((part) => expect(part).toMatch(/^[0-9a-f]+$/i));
    });
  });

  describe('isEncrypted', () => {
    it('returns true for a value produced by encrypt', () => {
      const ciphertext = service.encrypt('some-token');

      expect(service.isEncrypted(ciphertext)).toBe(true);
    });

    it('returns false for a plain-text token', () => {
      expect(service.isEncrypted('u7kQXmtZ3vBcL1sP9nEoFdRaG8hJyW2x')).toBe(false);
    });

    it('returns false for a value with only two parts', () => {
      expect(service.isEncrypted('aabb:ccdd')).toBe(false);
    });
  });

  describe('decrypt error handling', () => {
    it('throws on malformed stored value', () => {
      expect(() => service.decrypt('not-valid-format')).toThrow(
        'Invalid encrypted token format',
      );
    });

    it('throws when auth tag does not match (tampered ciphertext)', () => {
      const ciphertext = service.encrypt('real-token');
      const parts = ciphertext.split(':');
      const tampered = `${parts[0]}:${parts[1]}:${'ff'.repeat(parts[2].length / 2)}`;

      expect(() => service.decrypt(tampered)).toThrow();
    });
  });

  describe('constructor validation', () => {
    it('throws when ENCRYPTION_KEY is not 32 bytes', async () => {
      await expect(
        buildService(buildConfigService('short_key')),
      ).rejects.toThrow('ENCRYPTION_KEY must be a 64-character hex string');
    });
  });
});
