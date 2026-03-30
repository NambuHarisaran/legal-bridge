// Local development server — mirrors the Vercel serverless functions
// Run: node server.js  (from the /api folder)
import "dotenv/config";
import express from "express";
import cors from "cors";

// Import handlers (same files Vercel will use)
import chatHandler from "./chat.js";
import analyseHandler from "./analyse.js";
import riskHandler from "./risk.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Mount each handler — simulate Vercel's req/res interface
function mount(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

app.post("/api/chat",    mount(chatHandler));
app.post("/api/analyse", mount(analyseHandler));
app.post("/api/risk",    mount(riskHandler));

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n✅  Legal Bridge API running on http://localhost:${PORT}`);
  console.log(`   POST /api/chat`);
  console.log(`   POST /api/analyse`);
  console.log(`   POST /api/risk\n`);
});
