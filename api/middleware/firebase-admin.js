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

function parseBase64ServiceAccount(rawValue) {
  if (!rawValue) return null;

  try {
    const decoded = Buffer.from(rawValue, "base64").toString("utf8");
    return parseServiceAccount(decoded);
  } catch {
    return null;
  }
}

function parseSplitServiceAccountEnv() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    return null;
  }

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: String(privateKeyRaw).replace(/\\n/g, "\n"),
  };
}

function getServiceAccountFromEnv() {
  return (
    parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) ||
    parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON) ||
    parseBase64ServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64) ||
    parseSplitServiceAccountEnv()
  );
}

export function initFirebaseAdmin() {
  if (initialized) return;

  loadEnvIfNeeded();

  const serviceAccount = getServiceAccountFromEnv();

  if (serviceAccount) {
    if (admin.apps.length === 0) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    initialized = true;
    return;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    if (admin.apps.length === 0) {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    }
    initialized = true;
    return;
  }

  throw new Error(
    "Firebase Admin is not configured. Set one of: FIREBASE_SERVICE_ACCOUNT_KEY, FIREBASE_SERVICE_ACCOUNT_KEY_JSON, FIREBASE_SERVICE_ACCOUNT_KEY_BASE64, split env vars (FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY), or GOOGLE_APPLICATION_CREDENTIALS. Keep DEV_AUTH_BYPASS=true only for local development."
  );
}

export function getFirebaseAdminAuth() {
  initFirebaseAdmin();
  return admin.auth();
}
