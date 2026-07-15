# StuGig

StuGig is a full-stack freelance marketplace with:
- authentication and role-based access
- job posting and bidding
- real-time chat
- Stripe-based payment flows
- reviews and ratings
- a basic admin panel

## Tech stack
- Frontend: React + Vite
- Backend: Node.js + Express + MongoDB + Socket.IO

## Local development

### 1. Clone and install
```bash
git clone <repo-url>
cd StuGig
cd client && npm install
cd ../server && npm install
```

### 2. Environment variables
Create a `.env` file in the server folder with:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/stugig
JWT_SECRET=change-me
CLIENT_ORIGIN=http://localhost:5173
STRIPE_KEY=sk_test_your_key_here
```

Create a `.env.local` file in the client folder with:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Start the app
```bash
# server
cd server
node server.js

# client (new terminal)
cd client
npm run dev
```

Open the frontend at http://localhost:5173 and the backend at http://localhost:5000.

## Deployment notes

### Vercel (frontend)
- Set the build command to `npm run build`
- Set the output directory to `dist`
- Set the environment variable:
  - `VITE_API_URL=https://your-render-app.onrender.com/api`

### Render (backend)
- Create a web service from the `server` folder
- Set the build command to `npm install`
- Set the start command to `node server.js`
- Add the same environment variables as above, with a real MongoDB URI and Stripe secret key

## Notes
- The Stripe integration is ready for test mode, but payments will only work when a valid `STRIPE_KEY` is configured.
- The admin panel requires a user with the `admin` role.
