# Legal Brdige

Legal Brdige is an AI-powered legal assistance platform focused on helping users understand legal issues, assess legal risk, and analyze legal documents.

## Features

- Firebase authentication (Email/Password and Google Sign-In)
- User profile management with Firestore persistence
- AI legal chatbot
- Legal document analysis
- Legal risk assessment
- Query history with filters

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- AI: Google Gemini API
- Auth and Database: Firebase Auth + Firestore

## Project Structure

- frontend: React application
- api: Express API routes for chat, analysis, and risk
- firestore.rules: Firestore security rules

## Prerequisites

- Node.js 18+
- npm
- Firebase project with Auth and Firestore enabled
- Gemini API key

## Environment Variables

Create api/.env with:

GOOGLE_API_KEY=your_gemini_api_key

## Local Development

1. Install frontend dependencies

cd frontend
npm install

2. Install backend dependencies

cd ../api
npm install

3. Start backend

npm run dev

4. Start frontend in a new terminal

cd ../frontend
npm run dev

Frontend runs on http://localhost:3000
Backend runs on http://localhost:3001

## Firestore Rules

Use the rules in firestore.rules to allow authenticated users to read and write only their own users/{uid} documents and subcollections.

## Deployment

See DEPLOYMENT.md for deployment instructions.

## Contributing

1. Create a branch from main
2. Make changes
3. Commit and push
4. Open a pull request

## License

Add your preferred license in a LICENSE file.
