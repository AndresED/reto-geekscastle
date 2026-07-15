import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, getApps, initializeApp } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

export const FIRESTORE = Symbol('FIRESTORE');

export const FirestoreProvider: Provider = {
  provide: FIRESTORE,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Firestore => {
    const projectId = config.getOrThrow<string>('FIREBASE_PROJECT_ID');
    const emulatorHost = config.get<string>('FIRESTORE_EMULATOR_HOST');

    if (emulatorHost) {
      process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
    }

    let app: App;
    if (getApps().length === 0) {
      app = initializeApp({ projectId });
    } else {
      app = getApps()[0]!;
    }

    return getFirestore(app);
  },
};
