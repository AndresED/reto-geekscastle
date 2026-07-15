export type UserProps = {
  id: string;
  username: string;
  email: string;
  passwordHash: string | null;
  passwordGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(input: {
    id: string;
    username: string;
    email: string;
    passwordHash?: string | null;
    passwordGenerated?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }): User {
    const now = new Date();
    return new User({
      id: input.id,
      username: input.username.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash ?? null,
      passwordGenerated: input.passwordGenerated ?? false,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get username(): string {
    return this.props.username;
  }

  get email(): string {
    return this.props.email;
  }

  get passwordHash(): string | null {
    return this.props.passwordHash;
  }

  get passwordGenerated(): boolean {
    return this.props.passwordGenerated;
  }

  get hasPassword(): boolean {
    return this.props.passwordHash !== null;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  withPasswordHash(passwordHash: string, passwordGenerated: boolean): User {
    return new User({
      ...this.props,
      passwordHash,
      passwordGenerated,
      updatedAt: new Date(),
    });
  }
}
