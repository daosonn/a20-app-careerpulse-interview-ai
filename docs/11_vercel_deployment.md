# Vercel Deployment Guide (Fork: `daosonn/A20-App-011`)

This repo should be deployed as **2 Vercel projects**:

1. `a20-app-011-backend` (Root Directory: `backend`)
2. `a20-app-011-frontend` (Root Directory: `frontend`)

## 1) Prepare your fork

```bash
git remote -v
# if needed, set origin to your fork
git remote set-url origin https://github.com/daosonn/A20-App-011.git
git push origin main
```

## 2) Deploy Backend Project

Create a new Vercel project from `daosonn/A20-App-011`:

- Framework Preset: `Other`
- Root Directory: `backend`

Set Environment Variables in Vercel (Project Settings -> Environment Variables):

- `OPENAI_API_KEY`
- `GEMINI_API_KEY` (if used)
- `FIREBASE_PROJECT_ID`
- `CORS_ALLOW_ORIGINS` = `https://<your-frontend-domain>`
- `DATABASE_URL` (recommended: managed Postgres URL)

Notes:

- If `DATABASE_URL` is not set, backend will use SQLite.
- On Vercel, local SQLite is temporary (`/tmp`) and not persistent.
- For production, use managed Postgres (Neon/Supabase/Vercel Postgres).

Deploy and copy your backend URL, e.g.:

`https://a20-app-011-backend.vercel.app`

## 3) Deploy Frontend Project

Create another Vercel project from the same repo:

- Framework Preset: `Vite`
- Root Directory: `frontend`

Set Environment Variables:

- `VITE_API_BASE_URL` = `https://a20-app-011-backend.vercel.app`

Deploy frontend.

## 4) Firebase / Auth Checklist

- In Firebase Console, add frontend domain to Authorized Domains:
  - `https://<your-frontend-domain>`
  - `https://<your-frontend-domain>.vercel.app` (if preview/production domains differ)
- Ensure `FIREBASE_PROJECT_ID` matches `frontend/firebase-applet-config.json`.

## 5) Quick Verification

After deploy:

1. Open backend URL `/` -> should return JSON health status.
2. Open frontend URL and login with Google.
3. Check browser Network: `/api/v1/user/profile` should return `200`.
4. If `401`, re-check:
   - `FIREBASE_PROJECT_ID`
   - Firebase Authorized Domains
   - frontend `VITE_API_BASE_URL`

