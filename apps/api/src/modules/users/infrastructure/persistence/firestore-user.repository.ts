import { Inject, Injectable } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { User } from '../../domain/entities/user.entity';
import {
  UserEmailConflictError,
  UserPersistenceError,
} from '../../domain/errors/user.errors';
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

type EmailClaimDoc = {
  userId: string;
  createdAt: string;
};

@Injectable()
export class FirestoreUserRepository implements UserRepositoryPort {
  private readonly usersCollection = 'users';
  private readonly emailsCollection = 'emails';

  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  async create(user: User): Promise<User> {
    const emailRef = this.db.collection(this.emailsCollection).doc(user.email);
    const userRef = this.db.collection(this.usersCollection).doc(user.id);
    const claim: EmailClaimDoc = {
      userId: user.id,
      createdAt: user.createdAt.toISOString(),
    };
    const doc: UserDoc = {
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      passwordGenerated: user.passwordGenerated,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    try {
      await this.db.runTransaction(async (tx) => {
        const existingClaim = await tx.get(emailRef);
        if (existingClaim.exists) {
          throw new UserEmailConflictError(user.email);
        }
        tx.set(emailRef, claim);
        tx.set(userRef, doc);
      });
      return user;
    } catch (error) {
      const conflict = asEmailConflict(error, user.email);
      if (conflict) {
        throw conflict;
      }

      // Race/wrap fallback: if claim exists after a failed create, surface 409 not 502.
      try {
        const claimSnap = await emailRef.get();
        if (claimSnap.exists) {
          throw new UserEmailConflictError(user.email);
        }
      } catch (probeError) {
        if (probeError instanceof UserEmailConflictError) {
          throw probeError;
        }
      }

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
      const ref = this.db.collection(this.usersCollection).doc(userId);
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
      const snap = await this.db.collection(this.usersCollection).doc(id).get();
      if (!snap.exists) {
        return null;
      }
      return this.toUser(snap.id, snap.data() as UserDoc);
    } catch (error) {
      throw new UserPersistenceError(
        `Failed to find user: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const normalized = email.trim().toLowerCase();
      const claim = await this.db
        .collection(this.emailsCollection)
        .doc(normalized)
        .get();
      if (!claim.exists) {
        return null;
      }
      const userId = (claim.data() as EmailClaimDoc).userId;
      return this.findById(userId);
    } catch (error) {
      throw new UserPersistenceError(
        `Failed to find user by email: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async listAll(): Promise<User[]> {
    try {
      const snap = await this.db.collection(this.usersCollection).get();
      return snap.docs
        .map((doc) => this.toUser(doc.id, doc.data() as UserDoc))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } catch (error) {
      throw new UserPersistenceError(
        `Failed to list users: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const user = await this.findById(id);
      const batch = this.db.batch();
      batch.delete(this.db.collection(this.usersCollection).doc(id));
      if (user) {
        batch.delete(this.db.collection(this.emailsCollection).doc(user.email));
      }
      await batch.commit();
    } catch (error) {
      throw new UserPersistenceError(
        `Failed to delete user: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private toUser(id: string, data: UserDoc): User {
    return User.create({
      id,
      username: data.username,
      email: data.email,
      passwordHash: data.passwordHash,
      passwordGenerated: data.passwordGenerated,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    });
  }
}

/** Recover conflict through instanceof, message prefix, or Error.cause chain. */
function asEmailConflict(
  error: unknown,
  email: string,
): UserEmailConflictError | null {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current != null; depth++) {
    if (current instanceof UserEmailConflictError) {
      return current;
    }
    const message =
      current instanceof Error ? current.message : String(current);
    if (message.includes(UserEmailConflictError.messagePrefix)) {
      return new UserEmailConflictError(email);
    }
    current =
      current instanceof Error
        ? (current as Error & { cause?: unknown }).cause
        : undefined;
  }
  return null;
}
