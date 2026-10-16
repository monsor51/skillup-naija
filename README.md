# SkillUp NAIJA — Public Site + Admin (SQLite + Docker)

This repository contains the public registration site and an admin dashboard served from the same Express app. Data is stored in SQLite (`/data/skillup.db`).

Quick start

1. Clone the repo
2. Copy `.env.example` to `.env` and edit values (especially SESSION_SECRET and ADMIN_PASSWORD)
3. Install and run locally:

   ```bash
   npm install
   npm start
   ```

4. Open the public site: http://localhost:3000/
5. Open the admin dashboard: http://localhost:3000/admin.html

Docker

Build and run with Docker Compose:

```bash
docker-compose up --build
```

Environment

- On first run the server will create the SQLite DB and store the admin password hash.
- Set `ADMIN_PASSWORD` in `.env` before first run to control the admin password.

Security notes

- Do NOT commit `.env` or secrets to the repo.
- Use HTTPS and a strong `SESSION_SECRET` and `ADMIN_PASSWORD` in production.
- For production, use a persistent session store and a proper DB server (Postgres, MySQL).
