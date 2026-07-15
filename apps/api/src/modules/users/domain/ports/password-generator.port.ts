export const PASSWORD_GENERATOR_PORT = Symbol('PASSWORD_GENERATOR_PORT');

export interface PasswordGeneratorPort {
  generate(): string;
}
