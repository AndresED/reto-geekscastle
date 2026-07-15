import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class BcryptPasswordHasher implements PasswordHasherPort {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }
}
