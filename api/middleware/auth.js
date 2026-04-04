import { getFirebaseAdminAuth } from "./firebase-admin.js";

function isDevAuthBypassEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "true";
}

export async function verifyFirebaseToken(req, res, next) {
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Missing authorization token" });
    }

    const decoded = await getFirebaseAdminAuth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
      token: decoded,
    };

    return next();
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("firebase admin is not configured")) {
      if (isDevAuthBypassEnabled()) {
        req.user = {
          uid: "dev-user",
          email: "dev-user@local",
          token: { devBypass: true },
        };
        return next();
      }
      return res.status(503).json({ error: "Authentication service is not configured" });
    }
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
