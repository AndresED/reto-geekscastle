import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @IsString()
  @IsNotEmpty()
  FIREBASE_PROJECT_ID!: string;

  /** Host:port for Firestore emulator (e.g. 127.0.0.1:8085). Empty = production Admin SDK. */
  @IsOptional()
  @IsString()
  FIRESTORE_EMULATOR_HOST?: string;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const normalized = {
    ...config,
    PORT: config.PORT !== undefined ? Number(config.PORT) : 3000,
  };

  const validated = plainToInstance(EnvironmentVariables, normalized, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: true,
    // process.env includes many unrelated keys
    forbidNonWhitelisted: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${messages}`);
  }

  return validated;
}
