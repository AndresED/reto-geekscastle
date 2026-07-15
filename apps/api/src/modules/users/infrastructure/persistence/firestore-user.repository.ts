import { Inject, Injectable } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { User } from '../../domain/entities/user.entity';
import { UserPersistenceError } from '../../domain/errors/user.errors';
import type { UserRepositoryPort } from '../../domain/ports/user-repository.port';
import { FIRESTORE } from '../firebase/firebase-admin.provider';

type UserDoc = {
  username: string;
  email: string;
  passwordHash: string | null;
  passwordGenerated: boolean;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class FirestoreUserRepository implements UserRepositoryPort {
  private readonly collection = 'users';

  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  async create(user: User): Promise<User> {
    try {
      const doc: UserDoc = {
        username: user.username,
        email: user.email,
        passwordHash: user.passwordHash,
        passwordGenerated: user.passwordGenerated,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
      await this.db.collection(this.collection).doc(user.id).set(doc);
      return user;
    } catch (error) {
      throw new UserPersistenceError(
        `Failed to create user: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async updatePassword(
    userId: string,
    passwordHash: string,
    passwordGenerated: boolean,
  ): Promise<User> {
    try {
      const ref = this.db.collection(this.collection).doc(userId);
      const snap = await ref.get();
      if (!snap.exists) {
        throw new UserPersistenceError(
          `Cannot update password; user missing: ${userId}`,
        );
      }
      const updatedAt = new Date().toISOString();
      await ref.update({ passwordHash, passwordGenerated, updatedAt });
      const data = snap.data() as UserDoc;
      return User.create({
        id: userId,
        username: data.username,
        email: data.email,
        passwordHash,
        passwordGenerated,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(updatedAt),
      });
    } catch (error) {
      if (error instanceof UserPersistenceError) {
        throw error;
      }
      throw new UserPersistenceError(
        `Failed to update password: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const snap = await this.db.collection(this.collection).doc(id).get();
      if (!snap.exists) {
        return null;
      }
      const data = snap.data() as UserDoc;
      return User.create({
        id: snap.id,
        username: data.username,
        email: data.email,
        passwordHash: data.passwordHash,
        passwordGenerated: data.passwordGenerated,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      });
    } catch (error) {
      throw new UserPersistenceError(
        `Failed to find user: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
