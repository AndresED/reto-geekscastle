import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './modules/users/users.module';
import { validateEnv } from './shared/config/env.validation';
import { HealthController } from './shared/health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    UsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
