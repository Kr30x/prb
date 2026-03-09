// Firebase Admin SDK (for server-side: scraper, analyzer)
import * as admin from "firebase-admin";

let adminApp: admin.app.App | null = null;

export function getAdminApp(): admin.app.App {
  if (adminApp) return adminApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
    );
  }

  if (!admin.apps.length) {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    adminApp = admin.apps[0]!;
  }

  return adminApp;
}

export function getAdminFirestore(): admin.firestore.Firestore {
  return getAdminApp().firestore();
}
