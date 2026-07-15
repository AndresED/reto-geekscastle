export const PASSWORD_HASHER_PORT = Symbol('PASSWORD_HASHER_PORT');

export interface PasswordHasherPort {
  hash(plain: string): Promise<string>;
}
