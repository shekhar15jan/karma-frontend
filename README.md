# Karma OS UI

Angular 17 front end for Karma OS (talks to `karma-backend`).

```bash
npm ci
npm start          # http://localhost:4200, API expected at http://localhost:8000
npm run build      # production build -> dist/browser
```

- Dev API/SSE/WebSocket URLs: `src/environments/environment.ts` (`localhost:8000`).
- Production uses same-origin relative URLs (`/api`, `/sse`, `/ws`, see `environment.prod.ts`), so serve it behind the provided `nginx.conf` (Dockerfile), which proxies them to `karma-api:8000`.
- First run: open the login page and either register, or use **Bypass (Local Developer Mode)** (backend dev profile only).
