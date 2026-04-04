import { getFirebaseAdminAuth } from "./firebase-admin.js";

const rateStore = new Map();

function isDevAuthBypassEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "true";
}

const ENDPOINT_LIMITS = {
  chat: { windowMs: 60 * 1000, limit: 15 },
  analyse: { windowMs: 60 * 1000, limit: 8 },
  risk: { windowMs: 60 * 1000, limit: 10 },
  "analyse-upload": { windowMs: 60 * 1000, limit: 4 },
};

export function safeLog(event, details = {}) {
  const sanitized = {
    event,
    path: details.path || "unknown",
    uid: details.uid || null,
    ip: details.ip || null,
    message: String(details.message || "").slice(0, 180),
    status: details.status || null,
  };
  console.error("[security]", sanitized);
}

export function sendSafeError(res, status, error, message) {
  return res.status(status).json({ error, message });
}

export function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function enforceRateLimit({ endpoint, uid, ip }) {
  const limits = ENDPOINT_LIMITS[endpoint] || { windowMs: 60 * 1000, limit: 8 };
  const now = Date.now();
  const key = `${endpoint}:${uid || ip}`;
  const current = rateStore.get(key);

  if (!current || now > current.resetAt) {
    rateStore.set(key, { count: 1, resetAt: now + limits.windowMs });
    return true;
  }

  if (current.count >= limits.limit) {
    return false;
  }

  current.count += 1;
  rateStore.set(key, current);
  return true;
}

function normalizeAndValidateToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice(7).trim();
  return token || null;
}

export function sanitizeAiInput(value, maxLength) {
  const normalized = String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  return normalized.slice(0, maxLength);
}

export function hasPromptInjectionPatterns(text) {
  const pattern = /(ignore\s+(all|any|previous|above)\s+instructions|system\s+prompt|developer\s+mode|jailbreak|role\s*:\s*system|you\s+are\s+now|override\s+the\s+rules)/i;
  return pattern.test(String(text || ""));
}

export async function guardApiRequest(req, res, options) {
  const { endpoint, method = "POST", maxBodyBytes = 512 * 1024 } = options;
  const ip = getClientIp(req);

  if (req.method !== method) {
    sendSafeError(res, 405, "method_not_allowed", "Method not allowed");
    return { ok: false };
  }

  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength && contentLength > maxBodyBytes) {
    sendSafeError(res, 413, "payload_too_large", "Request payload is too large");
    return { ok: false };
  }

  const token = normalizeAndValidateToken(req);
  if (!token) {
    sendSafeError(res, 401, "unauthorized", "Missing or invalid authorization token");
    return { ok: false };
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
    };
  } catch (error) {
    const lowered = String(error?.message || "").toLowerCase();
    if (lowered.includes("firebase admin is not configured")) {
      if (isDevAuthBypassEnabled()) {
        req.user = {
          uid: "dev-user",
          email: "dev-user@local",
        };
      } else {
        sendSafeError(res, 503, "auth_unavailable", "Authentication service unavailable");
        return { ok: false };
      }
    } else {
      sendSafeError(res, 401, "unauthorized", "Invalid or expired authorization token");
      return { ok: false };
    }
  }

  if (!enforceRateLimit({ endpoint, uid: req.user.uid, ip })) {
    sendSafeError(res, 429, "rate_limited", "Too many requests, please retry later");
    return { ok: false };
  }

  return { ok: true };
}