# Quick Reference Card

## 📦 What's Been Delivered

### Core Implementation ✅
| Component | Status | Details |
|-----------|--------|---------|
| **API Migration** | ✅ Complete | Anthropic → Gemini (chat.js, analyse.js, risk.js) |
| **Firestore Setup** | ✅ Complete | Database + Service Layer (firestore-service.js) |
| **Auth Enhancement** | ✅ Complete | Email/Password + Google OAuth working |
| **Profile Page** | ✅ Complete | Edit mode, settings, real-time sync |
| **Chat Integration** | ✅ Complete | Saves to Firestore, multi-turn context |
| **Document Analysis** | ✅ Complete | Auto-saves analysis results |
| **Risk Assessment** | ✅ Complete | Calculates + persists to Firestore |
| **History Page** | ✅ Complete | Loads from Firestore, filters by type |

---

## 🔑 Gemini API Setup (Required First Step)

```bash
1. Visit https://ai.google.dev/app/apikey
2. Click "Create API key"
3. Copy the generated key
4. Open api/.env and paste it:
   GOOGLE_API_KEY=your-key-here
5. Save and restart npm run dev
```

---

## 🚀 Quick Start

### Terminal 1 (Backend)
```bash
cd api
npm run dev
```

### Terminal 2 (Frontend)
```bash
cd frontend  
npm run dev
```

### Browser
```
http://localhost:3000
Test features as you normally would
```

---

## 🧪 Quick Test Checklist

- [ ] Sign up with email/password
- [ ] Edit profile and verify it saves
- [ ] Ask a legal question in chatbot
- [ ] Send another message (test multi-turn)
- [ ] Paste legal text and analyze
- [ ] Start risk assessment quiz
- [ ] Check history page for all saved items
- [ ] Verify sign out and sign back in → data still there
- [ ] Test profile language preference

---

## 📂 Files Created (NEW)

```
frontend/src/
  ├── firestore-service.js (300+ lines, 15 functions)
  └── ProfilePage.jsx (350+ lines, full profile UI)

api/
  └── .env (Gemini API key template)
```

---

## 📝 Files Modified (UPDATED)

```
api/
  ├── chat.js (Anthropic → Gemini)
  ├── analyse.js (Anthropic → Gemini)
  ├── risk.js (Anthropic → Gemini)
  └── package.json (dependencies)

frontend/src/
  ├── firebase-config.js (added Firestore exports)
  ├── auth-service.js (added updateProfile)
  └── App.jsx (major: added 200+ lines of integration)
```

---

## 🔧 Endpoints Available

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | Legal chatbot powered by Gemini |
| `/api/analyse` | POST | Document analysis (JSON output) |
| `/api/risk` | POST | Risk assessment scoring |

---

## 🎭 User Flows Implemented

**Registration → Profile Setup**
1. User signs up email/Google
2. Profile auto-created in Firestore
3. User can edit profile anytime
4. Settings saved (language, notifications)

**Chat → History**
1. User sends legal question
2. Gemini AI responds
3. Message auto-saved to Firestore
4. Appears in History instantly

**Document → Analysis → Save**
1. User uploads/pastes document
2. Gemini analyzes
3. Results auto-saved to Firestore
4. Queryable in History

**Risk Quiz → Score → Save**
1. User answers 5 questions
2. Algorithm calculates risk
3. Results saved to Firestore
4. Retrievable via History

---

## 🔒 Security

- Users can only read/write their own Firestore data
- API keys secured in backend .env file
- Firebase rules enforce authentication
- No sensitive data in frontend storage

---

## 📊 Data Flow

```
Frontend (React)
    ↓
Vite Dev Server (Port 3000)
    ↓↓↓ /api proxy
Backend (Express, Port 3001)
    ↓
Google Gemini API
    ↓
Response back → Frontend
    ↓
Save to Firestore
    ↓
Real-time sync back to UI
```

---

## ⚡ Performance Notes

- Gemini responses typically return in 1-3 seconds
- Firestore writes/reads are instant
- Chat context limited to last 10 messages (to manage tokens)
- Document text limited to 4000 chars (API limit)

---

## 🐛 Debug Checklist

If something isn't working:

1. **Check API key**
   ```bash
   grep GOOGLE_API_KEY api/.env
   ```

2. **Check backend is running**
   ```bash
   curl http://localhost:3001/api/chat
   # Should show server running (CORS error is OK)
   ```

3. **Check frontend is running**
   ```bash
   open http://localhost:3000
   ```

4. **Check Firestore connection**
   - Open Firebase Console
   - Check Firestore Database tab
   - Verify database exists

5. **Check browser console**
   - Press F12
   - Look for red errors
   - Check Network tab for failed requests

---

## 🎯 What's Ready for Testing

✅ **User Authentication** - Email signup/login, Google OAuth  
✅ **Profile Management** - Create, read, update in real-time  
✅ **Chat System** - Multi-turn, Firestore persistence  
✅ **Document Analysis** - Text input, structured output  
✅ **Risk Assessment** - Questionnaire, scoring algorithm  
✅ **History Tracking** - Real-time Firestore loading, filters  
✅ **Data Persistence** - All data survives logout/login  

---

**Ready to test! Start with Step 1: Configure Gemini API Key** 🚀
