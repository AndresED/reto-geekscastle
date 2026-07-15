import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PasswordGeneratorPort } from '../../domain/ports/password-generator.port';

const CHARSET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
const LENGTH = 16;
const MAX_UNBIASED = 256 - (256 % CHARSET.length);

@Injectable()
export class CryptoPasswordGenerator implements PasswordGeneratorPort {
  generate(): string {
    let out = '';
    while (out.length < LENGTH) {
      const byte = randomBytes(1)[0]!;
      if (byte >= MAX_UNBIASED) {
        continue;
      }
      out += CHARSET[byte % CHARSET.length];
    }
    return out;
  }
}
