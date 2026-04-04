// Local development server — mirrors the Vercel serverless functions
// Run: node server.js  (from the /api folder)
import "dotenv/config";
import express from "express";
import cors from "cors";
import { verifyFirebaseToken } from "./middleware/auth.js";
import { aiLimiter, apiLimiter, heavyAiLimiter } from "./middleware/rate-limit.js";

// Import handlers (same files Vercel will use)
import chatHandler from "./chat.js";
import analyseHandler from "./analyse.js";
import analyseUploadHandler from "./analyse-upload.js";
import riskHandler from "./risk.js";

const app = express();

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const corsOptions = {
  origin(origin, callback) {
    if (!origin || origin === FRONTEND_ORIGIN) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ["POST", "GET", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(
  cors(corsOptions)
);

app.options("*", cors(corsOptions));
app.use(express.json({ limit: "512kb" }));

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.use("/api", verifyFirebaseToken, apiLimiter);

// Mount each handler — simulate Vercel's req/res interface
function mount(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error("[server_error]", {
        route: req.path,
        method: req.method,
        message: String(err?.message || "unknown"),
      });
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

app.post("/api/chat", aiLimiter, mount(chatHandler));
app.post("/api/analyse", heavyAiLimiter, mount(analyseHandler));
app.post("/api/analyse-upload", heavyAiLimiter, mount(analyseUploadHandler));
app.post("/api/risk", aiLimiter, mount(riskHandler));

app.get("/api/health", (_, res) => res.json({ status: "ok", protected: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n✅  Legal Brdige API running on http://localhost:${PORT}`);
  console.log(`   POST /api/chat`);
  console.log(`   POST /api/analyse`);
  console.log(`   POST /api/analyse-upload`);
  console.log(`   POST /api/risk\n`);
});
