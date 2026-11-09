import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { SalsaLoader } from "../components/loaders/SalsaLoader";
import { authClient, usernameToEmail } from "../auth/client";

function loginErrorMessage(raw: string | undefined | null): string {
  const msg = (raw || "").toLowerCase();
  if (
    !msg ||
    msg.includes("invalid email or password") ||
    msg.includes("invalid credentials") ||
    msg.includes("unauthorized") ||
    msg.includes("user not found")
  ) {
    return "Usuario o contraseña incorrectos";
  }
  if (msg.includes("invalid origin")) {
    return "Origen no permitido. Abre la app desde la URL configurada.";
  }
  return raw || "No se pudo iniciar sesión";
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = authClient.useSession();
  const from =
    (location.state as { from?: string } | null)?.from &&
    (location.state as { from: string }).from !== "/login"
      ? (location.state as { from: string }).from
      : "/admin";

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [postLogin, setPostLogin] = useState(false);

  if (session.isPending || postLogin) {
    return (
      <div className="salsa-loader-screen">
        <SalsaLoader />
      </div>
    );
  }

  if (session.data?.user) {
    return <Navigate to={from} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const email = usernameToEmail(usuario);
      const result = await authClient.signIn.email({
        email,
        password,
      });
      if (result.error) {
        setError(loginErrorMessage(result.error.message));
        return;
      }
      setPostLogin(true);
      await new Promise((r) => setTimeout(r, 5000));
      navigate(from, { replace: true });
    } catch (err) {
      setError(loginErrorMessage(err instanceof Error ? err.message : null));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className="panel" style={{ maxWidth: 420, margin: "0 auto" }}>
        <p className="page-sub" style={{ marginTop: 0 }}>
          Inicia sesión para gestionar clases y cobros.
        </p>

        <form onSubmit={onSubmit} className="stack" style={{ gap: "0.85rem" }}>
          <label className="field">
            <span className="label">Usuario</span>
            <input
              className="input"
              autoComplete="username"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="usuario"
              required
            />
          </label>
          <label className="field">
            <span className="label">Contraseña</span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
