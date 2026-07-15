import 'reflect-metadata';
import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('should accept valid configuration', () => {
    const env = validateEnv({
      PORT: '3000',
      FIREBASE_PROJECT_ID: 'demo-reto',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    });
    expect(env.PORT).toBe(3000);
    expect(env.FIREBASE_PROJECT_ID).toBe('demo-reto');
  });

  it('should fail when FIREBASE_PROJECT_ID missing', () => {
    expect(() => validateEnv({ PORT: '3000' })).toThrow(
      /Invalid environment configuration/,
    );
  });
});
