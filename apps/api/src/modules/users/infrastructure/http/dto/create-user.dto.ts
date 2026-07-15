import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'jane',
    maxLength: 64,
    description: 'Display / login name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;

  @ApiProperty({
    example: 'jane@example.com',
    format: 'email',
    maxLength: 254,
    description: 'Must be unique (stored normalized: trim + lowercase)',
  })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  email!: string;

  @ApiPropertyOptional({
    example: 'secret123',
    minLength: 8,
    maxLength: 128,
    description:
      'Optional. If omitted, the API generates a secure password, hashes it (bcrypt), and persists it before responding 201.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;
}
