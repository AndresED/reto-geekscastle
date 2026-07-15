import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User id (generated on create)',
  })
  id!: string;

  @ApiProperty({ example: 'jane', maxLength: 64 })
  username!: string;

  @ApiProperty({
    format: 'email',
    example: 'jane@example.com',
    description: 'Normalized unique email (trim + lowercase)',
  })
  email!: string;

  @ApiProperty({
    example: true,
    description:
      'True when the API generated a password because none was provided on create',
  })
  passwordGenerated!: boolean;

  @ApiProperty({
    example: true,
    description:
      'True when a password hash is stored. Never exposes plaintext or hash.',
  })
  hasPassword!: boolean;

  @ApiProperty({
    format: 'date-time',
    example: '2026-07-15T19:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-07-15T19:00:00.000Z',
  })
  updatedAt!: string;
}
