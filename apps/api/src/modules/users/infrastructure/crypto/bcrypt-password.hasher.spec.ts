import * as bcrypt from 'bcrypt';
import { BcryptPasswordHasher } from './bcrypt-password.hasher';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('BcryptPasswordHasher', () => {
  it('should hash with bcrypt cost 10', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    const hasher = new BcryptPasswordHasher();

    await expect(hasher.hash('plain')).resolves.toBe('hashed');
    expect(bcrypt.hash).toHaveBeenCalledWith('plain', 10);
  });
});
