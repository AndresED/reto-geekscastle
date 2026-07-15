import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateUserHandler } from './application/commands/handlers/create-user.handler';
import { UserCreatedAuditHandler } from './application/events/handlers/user-created-audit.handler';
import { FinalizeMissingPasswordService } from './application/services/finalize-missing-password.service';
import { GetUserByIdHandler } from './application/queries/handlers/get-user-by-id.handler';
import { PASSWORD_GENERATOR_PORT } from './domain/ports/password-generator.port';
import { PASSWORD_HASHER_PORT } from './domain/ports/password-hasher.port';
import { USER_REPOSITORY_PORT } from './domain/ports/user-repository.port';
import { BcryptPasswordHasher } from './infrastructure/crypto/bcrypt-password.hasher';
import { CryptoPasswordGenerator } from './infrastructure/crypto/crypto-password.generator';
import { FirestoreProvider } from './infrastructure/firebase/firebase-admin.provider';
import { UsersController } from './infrastructure/http/users.controller';
import { FirestoreUserRepository } from './infrastructure/persistence/firestore-user.repository';

const commandHandlers = [CreateUserHandler];
const queryHandlers = [GetUserByIdHandler];
const eventHandlers = [UserCreatedAuditHandler];

@Module({
  imports: [CqrsModule],
  controllers: [UsersController],
  providers: [
    FirestoreProvider,
    FinalizeMissingPasswordService,
    ...commandHandlers,
    ...queryHandlers,
    ...eventHandlers,
    {
      provide: USER_REPOSITORY_PORT,
      useClass: FirestoreUserRepository,
    },
    {
      provide: PASSWORD_GENERATOR_PORT,
      useClass: CryptoPasswordGenerator,
    },
    {
      provide: PASSWORD_HASHER_PORT,
      useClass: BcryptPasswordHasher,
    },
  ],
})
export class UsersModule {}
