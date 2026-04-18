import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';

@Injectable()
export class FirebaseAdminService {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (admin.apps.length > 0) {
        this.initialized = true;
        return;
      }

      const credsPath = process.env.FIREBASE_CREDENTIALS_PATH;
      if (credsPath) {
        const fullPath = path.resolve(process.cwd(), credsPath);

        admin.initializeApp({
          credential: admin.credential.cert(require(fullPath)),
        });

        this.initialized = true;
        this.logger.log('Firebase initialized with credentials file');
        return;
      }

      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (privateKey) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          } as admin.ServiceAccount),
        });
        this.initialized = true;
        this.logger.log('Firebase initialized with env credentials');
      } else {
        this.logger.warn(
          'Firebase credentials are not set. Push will be disabled.'
        );
      }
    } catch (e) {
      this.logger.error('Failed to initialize Firebase', e as any);
    }
  }

  get messaging(): admin.messaging.Messaging | null {
    if (!this.initialized) return null;
    return admin.messaging();
  }
}
