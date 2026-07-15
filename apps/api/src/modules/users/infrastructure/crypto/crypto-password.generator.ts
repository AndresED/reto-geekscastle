import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PasswordGeneratorPort } from '../../domain/ports/password-generator.port';

const CHARSET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
const LENGTH = 16;

@Injectable()
export class CryptoPasswordGenerator implements PasswordGeneratorPort {
  generate(): string {
    const bytes = randomBytes(LENGTH);
    let out = '';
    for (let i = 0; i < LENGTH; i += 1) {
      out += CHARSET[bytes[i] % CHARSET.length];
    }
    return out;
  }
}
