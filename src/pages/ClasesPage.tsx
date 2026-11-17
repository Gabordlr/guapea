import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authClient } from "../auth/client";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { deleteClass, listClasses, saveClass } from "../storage/repository";
import type { Clase, DiaSemana } from "../types";
import {
  DIAS,
  DURACIONES,
  formatHorario,
  formatMoney,
  listHorasInicio,
} from "../utils/format";

const HORAS_INICIO = listHorasInicio(15);

const EMPTY_FORM = {
  nombre: "",
  descripcion: "",
  diaDeLaSemana: 3 as DiaSemana,
  horaInicio: "19:00",
  duracionMinutos: 60,
  precio: 150,
};

export function ClasesPage() {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const [tick, setTick] = useState(0);
  const [allClasses, setAllClasses] = useState<Clase[]>([]);
  const [pendingDeleteClass, setPendingDeleteClass] = useState<Clase | null>(
    null,
  );
  const [editing, setEditing] = useState<Clase | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listClasses()
      .then((all) => {
        if (cancelled) return;
        setAllClasses(all);
        setLoadError(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setAllClasses([]);
        setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  function refresh() {
    setTick((t) => t + 1);
  }

  function startCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function startEdit(c: Clase) {
    setEditing(c);
    setForm({
      nombre: c.nombre,
      descripcion: c.descripcion,
      diaDeLaSemana: c.diaDeLaSemana,
      horaInicio: c.horaInicio,
      duracionMinutos: c.duracionMinutos,
      precio: c.precio,
    });
    setFormError(null);
  }

  function normalizeTime(value: string): string {
    const trimmed = value.trim();
    if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
    if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed.slice(0, 5);
    return trimmed;
  }

  async function handleSaveClass(e?: React.FormEvent) {
    e?.preventDefault();
    const nombre = form.nombre.trim();
    const horaInicio = normalizeTime(form.horaInicio);
    const duracionMinutos = Number(form.duracionMinutos);
    const precio = Number(form.precio);

    if (!nombre) {
      setFormError("Escribe un nombre para la clase.");
      return;
    }
    if (!horaInicio) {
      setFormError("Elige a qué hora empieza.");
      return;
    }
    if (!Number.isFinite(duracionMinutos) || duracionMinutos < 15) {
      setFormError("La duración mínima es 15 minutos.");
      return;
    }
    if (!Number.isFinite(precio) || precio < 0) {
      setFormError("Revisa el precio.");
      return;
    }

    try {
      await saveClass({
        id: editing?.id,
        nombre,
        descripcion: form.descripcion.trim(),
        diaDeLaSemana: form.diaDeLaSemana,
        horaInicio,
        duracionMinutos: Math.max(15, duracionMinutos),
        precio,
      });
      setFormError(null);
      startCreate();
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  async function confirmDeleteClass() {
    if (!pendingDeleteClass) return;
    try {
      await deleteClass(pendingDeleteClass.id);
      setPendingDeleteClass(null);
      if (editing?.id === pendingDeleteClass.id) startCreate();
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo borrar");
    }
  }

  async function handleSignOut() {
    await authClient.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="stack">
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div>
          <h1 className="page-title">Clases</h1>
          <p className="page-sub">
            Horario semanal.
            {session.data?.user?.name || session.data?.user?.email
              ? ` · ${session.data.user.name || session.data.user.email}`
              : null}
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={handleSignOut}>
          Salir
        </button>
      </div>

      {loadError ? (
        <p className="form-error" role="alert">
          {loadError}
        </p>
      ) : null}

      <form className="panel" onSubmit={handleSaveClass} noValidate>
        <h2>{editing ? "Editar clase" : "Nueva clase"}</h2>
        <div className="field">
          <label className="label" htmlFor="c-nombre">
            Nombre
          </label>
          <input
            id="c-nombre"
            className="input"
            value={form.nombre}
            placeholder="Intermedio"
            onChange={(e) => {
              setForm({ ...form, nombre: e.target.value });
              setFormError(null);
            }}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="c-desc">
            Descripción
          </label>
          <textarea
            id="c-desc"
            className="textarea"
            value={form.descripcion}
            placeholder="Nivel intermedio, foco en musicalidad"
            onChange={(e) =>
              setForm({ ...form, descripcion: e.target.value })
            }
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="c-dia">
            Día
          </label>
          <select
            id="c-dia"
            className="select"
            value={form.diaDeLaSemana}
            onChange={(e) =>
              setForm({
                ...form,
                diaDeLaSemana: Number(e.target.value) as DiaSemana,
              })
            }
          >
            {(Object.entries(DIAS) as [string, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="row-2">
          <div className="field">
            <label className="label" htmlFor="c-hora">
              Empieza
            </label>
            <select
              id="c-hora"
              className="select"
              value={form.horaInicio}
              onChange={(e) => {
                setForm({ ...form, horaInicio: e.target.value });
                setFormError(null);
              }}
            >
              {!HORAS_INICIO.includes(form.horaInicio) && form.horaInicio ? (
                <option value={form.horaInicio}>{form.horaInicio}</option>
              ) : null}
              {HORAS_INICIO.map((hora) => (
                <option key={hora} value={hora}>
                  {hora}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="c-duracion">
              Duración
            </label>
            <select
              id="c-duracion"
              className="select"
              value={form.duracionMinutos}
              onChange={(e) => {
                setForm({
                  ...form,
                  duracionMinutos: Number(e.target.value),
                });
                setFormError(null);
              }}
            >
              {!(DURACIONES as readonly number[]).includes(
                form.duracionMinutos,
              ) ? (
                <option value={form.duracionMinutos}>
                  {form.duracionMinutos} min
                </option>
              ) : null}
              {DURACIONES.map((mins) => (
                <option key={mins} value={mins}>
                  {mins} min
                </option>
              ))}
            </select>
          </div>
        </div>
        {form.horaInicio ? (
          <p className="empty" style={{ marginTop: "-0.35rem" }}>
            Horario: {formatHorario(form)}
          </p>
        ) : null}
        <div className="field">
          <label className="label" htmlFor="c-precio">
            Precio
          </label>
          <input
            id="c-precio"
            className="input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={form.precio}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              setForm({
                ...form,
                precio: raw === "" ? 0 : Number(raw),
              });
              setFormError(null);
            }}
          />
        </div>
        {formError ? (
          <p className="form-error" role="alert">
            {formError}
          </p>
        ) : null}
        <div className={`form-actions${editing ? " split" : ""}`}>
          {editing ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={startCreate}
            >
              Cancelar
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleSaveClass()}
          >
            {editing ? "Guardar" : "Crear clase"}
          </button>
        </div>
      </form>

      <div className="panel">
        <h2>Clases semanales</h2>
        {allClasses.length === 0 ? (
          <p className="empty">
            Aún no hay clases. Crea la primera arriba (ej. Intermedio los
            miércoles).
          </p>
        ) : (
          allClasses.map((c) => (
            <div key={c.id} className="class-card">
              <div className="class-card-top">
                <div>
                  <h3>{c.nombre}</h3>
                  <p>
                    {DIAS[c.diaDeLaSemana]} · {formatHorario(c)} ·{" "}
                    {formatMoney(c.precio)}
                  </p>
                  {c.descripcion ? <p>{c.descripcion}</p> : null}
                </div>
                <div className="class-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => startEdit(c)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => setPendingDeleteClass(c)}
                  >
                    Borrar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {pendingDeleteClass ? (
        <ConfirmDialog
          title="¿Borrar clase?"
          message={`Se eliminará “${pendingDeleteClass.nombre}” del horario semanal. Las listas de asistencia ya guardadas se mantienen.`}
          confirmLabel="Borrar"
          onConfirm={confirmDeleteClass}
          onCancel={() => setPendingDeleteClass(null)}
        />
      ) : null}
    </div>
  );
}
