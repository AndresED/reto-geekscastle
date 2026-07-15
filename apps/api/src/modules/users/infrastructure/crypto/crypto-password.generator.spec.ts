import { CryptoPasswordGenerator } from './crypto-password.generator';

const CHARSET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

describe('CryptoPasswordGenerator', () => {
  it('should generate password with length at least 16', () => {
    const generator = new CryptoPasswordGenerator();
    const password = generator.generate();
    expect(password.length).toBeGreaterThanOrEqual(16);
  });

  it('should generate different values across calls', () => {
    const generator = new CryptoPasswordGenerator();
    const a = generator.generate();
    const b = generator.generate();
    expect(a).not.toEqual(b);
  });

  it('should only use configured charset characters', () => {
    const generator = new CryptoPasswordGenerator();
    const password = generator.generate();
    for (const ch of password) {
      expect(CHARSET.includes(ch)).toBe(true);
    }
  });
});
