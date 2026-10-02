# Short-URL

A URL shortener with user accounts and click analytics, built with Express 5, MongoDB (Mongoose) and EJS.

## Features

- Sign up, log in and log out. Passwords are hashed with bcrypt, and sessions are signed JWTs stored in an HttpOnly cookie.
- Shorten any `http://` or `https://` URL and copy the short link with one click.
- Every visit to a short link is counted, and the dashboard shows clicks per link.
- `ADMIN` users see every link in the workspace. `NORMAL` users see only their own.
- A JSON API is available for scripts (see below).

## Requirements

- Node.js 20.19 or newer
- MongoDB running locally or remotely

## Getting started

```bash
npm install
cp .env.example .env   # then edit the values
npm run dev            # auto-restarts on changes (or: npm start)
```

Open http://localhost:8001 and create an account.

## Configuration

| Variable     | Default                                | Notes                                          |
| ------------ | -------------------------------------- | ---------------------------------------------- |
| `PORT`       | `8001`                                 | HTTP port                                      |
| `MONGO_URL`  | `mongodb://127.0.0.1:27017/short-url`  | MongoDB connection string                      |
| `JWT_SECRET` | dev-only fallback                      | **Required** when `NODE_ENV=production`        |
| `BASE_URL`   | request host                           | Public address shown for short links           |

For Vercel, set `MONGO_URL` to an internet-accessible MongoDB connection string and set a strong `JWT_SECRET` in the project's Environment Variables.

## Routes

| Method | Path                       | Auth           | Description                                  |
| ------ | -------------------------- | -------------- | -------------------------------------------- |
| GET    | `/`                        | logged in      | Dashboard with your links                    |
| GET    | `/signup`, `/login`        | –              | Auth pages                                   |
| POST   | `/user`                    | –              | Create account                               |
| POST   | `/user/login`              | –              | Log in                                       |
| POST   | `/user/logout`             | –              | Log out                                      |
| POST   | `/url`                     | logged in      | Create a short link (`url` field)            |
| GET    | `/url/analytics/:shortId`  | owner or admin | Click count and visit history (JSON)         |
| GET    | `/:shortId`                | –              | Redirect to the original URL                 |

For JSON responses from `POST /url`, send `Accept: application/json`. API clients can authenticate with `Authorization: Bearer <token>` instead of the cookie.

## Making a user an admin

```bash
mongosh short-url --eval 'db.users.updateOne({ email: "you@example.com" }, { $set: { role: "ADMIN" } })'
```

Then log out and back in so the new role is included in your session.
