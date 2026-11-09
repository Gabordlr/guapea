# Guapea — lista de asistencia

App móvil (mobile-first) en español para anotar asistencia a clases de salsa semanales. Sustituye el copy-paste de WhatsApp.

## Fase 1

- Datos en `localStorage` (un solo navegador)
- Usuario: fecha + clase, lista hombres/mujeres, nombre + emoji, autocompletado
- Admin: CRUD de clases semanales, cobro (efectivo / transferencia / suscripción) y métricas

## Desarrollo

```bash
npm install
npm run dev
```

Abre la URL local en el teléfono (misma red) o usa las herramientas de dispositivo del navegador.

## Producción (Vercel)

`VITE_API_URL` and `VITE_NEON_AUTH_URL` must exist **when Vercel runs `npm run build`**. Vite inlines them into the JS (visible in the browser). Never put `DATABASE_URL` or passwords in `VITE_*`.

**Do not commit them to git.** If a file is gitignored, Vercel never sees it — set vars in the Vercel UI instead:

1. Vercel → your project → **Settings → Environment Variables**
2. Add for **Production** (and Preview if you want):
   - `VITE_API_URL` = your Neon Function URL  
   - `VITE_NEON_AUTH_URL` = your Neon Auth URL  
3. **Redeploy** (Deployments → … → Redeploy). Changing env alone does not patch an old build.

Locally, put the same keys in gitignored `.env` for `npm run dev`.

Also add your Vercel origin to Neon Auth trusted domains, e.g. `neon neon-auth domain add https://your-app.vercel.app`.
