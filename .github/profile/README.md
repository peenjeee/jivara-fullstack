# Jivara

Jivara is an AI-assisted health platform for medication adherence, food-drug interaction checks, nutrition insights, and remote patient monitoring.

## Repositories

- `frontend/`: Next.js 16 PWA for patients, nurses, admins, and super admins.
- `backend/`: Express.js and TypeScript REST API with Drizzle ORM and PostgreSQL/Supabase.
- `dataScience/`: AI and data-science assets for food detection and reasoning workflows.

## Production

- Web app: `https://www.jivara.web.id`
- API: `https://api.jivara.web.id`
- API docs: `https://api.jivara.web.id/api-docs`

## Local Development

Backend:

```bash
cd backend
npm install
cp .env.example .env
npm run db:push
npm run dev
```

Frontend:

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

See `backend/README.md` and `frontend/README.md` for full environment setup, deployment notes, verification commands, and demo credentials.

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `superadmin@jivara.test` | `Demo12345` |
| Admin | `admin@jivara.test` | `Demo12345` |
| Nurse | `nurse1@jivara.test` | `Demo12345` |
| Patient | `patient1@jivara.test` | `Demo12345` |

## Contributor Notes

- Use `/api/v1` for new backend endpoints and clients.
- Set `NEXT_PUBLIC_API_URL=https://api.jivara.web.id/api/v1` in frontend hosting, not backend hosting.
- Do not commit `.env`, service-role keys, VAPID private keys, or production secrets.
- Verify backend changes with `npm run lint`, `npm run build`, and `npm run test` from `backend/`.
- Verify frontend changes with `npm run lint`, `npm run build`, and `npm run test` from `frontend/`.
