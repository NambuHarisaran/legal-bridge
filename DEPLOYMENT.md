# Legal Brdige — Setup & Deployment Guide

## Project Structure

```
legal-bridge/
├── api/                        ← Vercel Serverless Functions (Node.js)
│   ├── chat.js                 ← POST /api/chat
│   ├── analyse.js              ← POST /api/analyse
│   ├── risk.js                 ← POST /api/risk
│   ├── server.js               ← Local Express dev server
│   ├── package.json
│   └── .env.example
├── frontend/                   ← React + Vite app
│   ├── src/
│   │   ├── App.jsx             ← Full Legal Brdige UI
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js          ← Proxies /api/* to localhost:3001 in dev
│   └── package.json
├── vercel.json                 ← Vercel deployment config
├── package.json                ← Root scripts (runs both together)
└── .gitignore
```

---

## Step 1 — Get Your Anthropic API Key

1. Go to **https://console.anthropic.com/**
2. Sign in (or create a free account)
3. Click **API Keys** → **Create Key**
4. Copy the key — it starts with `sk-ant-...`
5. Keep it safe — you'll use it in Step 3 and Step 6

---

## Step 2 — Install Everything Locally

Open Terminal and run these commands one by one:

```bash
# 1. Go into the project folder
cd legal-bridge

# 2. Install root dependencies
npm install

# 3. Install API dependencies
cd api
npm install
cd ..

# 4. Install frontend dependencies
cd frontend
npm install
cd ..
```

---

## Step 3 — Set Up Local Environment

```bash
# Copy the example env file
cp api/.env.example api/.env

# Open api/.env in any text editor and paste your key:
# ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

On Windows (Notepad):
```
notepad api\.env
```

On Mac/Linux:
```bash
nano api/.env
```

---

## Step 4 — Run Locally

Open **two terminal windows**:

**Terminal 1 — Start the API server:**
```bash
cd legal-bridge/api
node server.js
# You should see:
# ✅  Legal Brdige API running on http://localhost:3001
```

**Terminal 2 — Start the frontend:**
```bash
cd legal-bridge/frontend
npm run dev
# You should see:
# Local: http://localhost:3000
```

Open **http://localhost:3000** in your browser.
The frontend automatically proxies `/api/*` calls to port 3001.

---

## Step 5 — Push to GitHub

You need a GitHub account. Then:

```bash
# From the legal-bridge folder:
git init
git add .
git commit -m "Initial commit — Legal Brdige"
```

Go to **https://github.com/new** and create a new repository called `legal-bridge`.
Then run (replace YOUR_USERNAME):

```bash
git remote add origin https://github.com/YOUR_USERNAME/legal-bridge.git
git branch -M main
git push -u origin main
```

---

## Step 6 — Deploy to Vercel

### 6a. Create a Vercel Account
- Go to **https://vercel.com**
- Click **Sign Up** → choose **Continue with GitHub**
- Authorise Vercel to access your GitHub

### 6b. Import Your Project
1. Click **Add New → Project**
2. Find `legal-bridge` in the list → click **Import**
3. Vercel will auto-detect the `vercel.json` config

### 6c. Add Your API Key (IMPORTANT)
Before clicking Deploy:
1. Scroll down to **Environment Variables**
2. Click **Add Variable**
3. Name: `ANTHROPIC_API_KEY`
4. Value: paste your `sk-ant-...` key
5. Make sure **Production**, **Preview**, and **Development** are all checked

### 6d. Add Firebase Admin Variables (REQUIRED for authenticated API routes)
If this is missing, protected endpoints return:
`Authentication service unavailable`

Add one of the following credential formats in Vercel Project Settings -> Environment Variables:

Option A (recommended):
- `FIREBASE_SERVICE_ACCOUNT_KEY` = full Firebase service account JSON in one line

Option B (split values, easiest in dashboard forms):
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (paste key with `\\n` line breaks)

Also keep these set:
- `DEV_AUTH_BYPASS=false`

After adding variables, redeploy the latest commit.

### 6e. Deploy
1. Click **Deploy**
2. Wait ~2 minutes for the build to finish
3. Vercel gives you a live URL like:
   `https://legal-bridge-xyz.vercel.app`

Your site is now live! 🎉

---

## How It Works in Production

```
User Browser
     │
     ▼
Vercel CDN (React app — static files)
     │
     │  POST /api/chat
     │  POST /api/analyse
     │  POST /api/risk
     ▼
Vercel Serverless Functions (api/*.js)
     │
     │  Uses ANTHROPIC_API_KEY (secret, never exposed)
     ▼
Anthropic Claude API
```

The API key **never touches the browser** — it only lives in Vercel's secure environment.

---

## Updating Your Site

After making changes to the code:

```bash
git add .
git commit -m "Update: describe your change"
git push
```

Vercel auto-deploys every push to `main` — live in ~60 seconds.

---

## Common Issues & Fixes

| Problem | Fix |
|---|---|
| `ANTHROPIC_API_KEY is missing` | Add the env variable in Vercel dashboard → Settings → Environment Variables |
| API works locally but not on Vercel | Check Vercel Function logs: Dashboard → your project → Deployments → Functions tab |
| Frontend loads but chatbot doesn't reply | Open browser DevTools → Network tab → check if `/api/chat` returns an error |
| `npm install` fails | Make sure Node.js ≥ 18 is installed: `node --version` |
| Port 3000 already in use | Kill the process: `npx kill-port 3000` |

---

## Free Usage Limits

- **Vercel Free Plan**: 100GB bandwidth/month, unlimited deployments ✅
- **Anthropic**: Pay-per-token. For a final year project with light usage, expect < ₹500/month.
  - Claude Sonnet: ~$3 per million input tokens
  - A typical legal question uses ~500 tokens → roughly ₹0.12 per question

---

## Emergency Helpline Numbers (built into the app)
- Police: 100
- Legal Aid: 1800-110-1000 (toll-free)
- Women Helpline: 181
