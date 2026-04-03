import rateLimit from "express-rate-limit";

function keyGenerator(req) {
  return req.user?.uid || req.ip;
}

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: { error: "Too many requests. Please try again later." },
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: { error: "Rate limit reached for AI requests. Slow down and retry." },
});

export const heavyAiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: { error: "Heavy endpoint rate limit reached. Please retry later." },
});
