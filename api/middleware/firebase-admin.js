import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

let initialized = false;

function loadEnvIfNeeded() {
  const hasAuthEnv = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.DEV_AUTH_BYPASS
  );

  if (hasAuthEnv) return;

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const apiEnv = path.resolve(currentDir, "../.env");
  const rootEnv = path.resolve(currentDir, "../../.env");

  if (fs.existsSync(apiEnv)) {
    dotenv.config({ path: apiEnv });
  }

  if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv, override: false });
  }
}

function parseServiceAccount(rawValue) {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  } catch {
    return null;
  }
}

export function initFirebaseAdmin() {
  if (initialized) return;

  loadEnvIfNeeded();

  const serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

  if (serviceAccount) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    initialized = true;
    return;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    initialized = true;
    return;
  }

  throw new Error(
    "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS (and keep DEV_AUTH_BYPASS=true only for local development)."
  );
}

export function getFirebaseAdminAuth() {
  initFirebaseAdmin();
  return admin.auth();
}
