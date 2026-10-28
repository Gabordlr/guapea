import { useEffect, useMemo, useState } from "react";
import { AttendeeForm } from "../components/AttendeeForm";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { SessionPicker } from "../components/SessionPicker";
import {
  addAttendee,
  classesForDate,
  deleteClass,
  getAttendance,
  getClass,
  getSessionMetrics,
  listClasses,
  removeAttendee,
  saveClass,
  setPayment,
  todayISO,
} from "../storage/repository";
import type { Asistente, Clase, DiaSemana, Genero, MetodoPago } from "../types";
import { DIAS, formatHorario, formatMoney } from "../utils/format";

type AdminTab = "cobro" | "clases";

const EMPTY_FORM = {
  nombre: "",
  descripcion: "",
  diaDeLaSemana: 3 as DiaSemana,
  horaInicio: "19:00",
  duracionMinutos: 60,
  precio: 150,
};

export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("cobro");
  const [tick, setTick] = useState(0);
  const [fecha, setFecha] = useState(todayISO);
  const [claseId, setClaseId] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<Asistente[]>([]);
  const [cobroSearch, setCobroSearch] = useState("");
  const [pendingRemove, setPendingRemove] = useState<Asistente | null>(null);
  const [pendingDeleteClass, setPendingDeleteClass] = useState<Clase | null>(
    null,
  );
  const [editing, setEditing] = useState<Clase | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const allClasses = useMemo(() => listClasses(), [tick]);
  const dayClasses = useMemo(() => classesForDate(fecha), [fecha, tick]);
  const metrics = useMemo(
    () => (claseId ? getSessionMetrics(fecha, claseId) : null),
    [fecha, claseId, tick],
  );
  const selectedClass = claseId ? getClass(claseId) : undefined;
  const filteredAttendees = useMemo(() => {
    const q = cobroSearch.trim().toLowerCase();
    if (!q) return attendees;
    return attendees.filter((a) =>
      `${a.emoji} ${a.nombre}`.toLowerCase().includes(q),
    );
  }, [attendees, cobroSearch]);

  useEffect(() => {
    if (dayClasses.length === 0) {
      setClaseId(null);
      return;
    }
    setClaseId((current) =>
      current && dayClasses.some((c) => c.id === current)
        ? current
        : dayClasses[0].id,
    );
  }, [dayClasses]);

  useEffect(() => {
    if (!claseId) {
      setAttendees([]);
      return;
    }
    setAttendees(getAttendance(fecha, claseId));
  }, [fecha, claseId, tick]);

  useEffect(() => {
    setCobroSearch("");
  }, [fecha, claseId]);

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

  function handleSaveClass(e?: React.FormEvent) {
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

    saveClass({
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
  }

  function confirmDeleteClass() {
    if (!pendingDeleteClass) return;
    deleteClass(pendingDeleteClass.id);
    setPendingDeleteClass(null);
    if (editing?.id === pendingDeleteClass.id) startCreate();
    refresh();
  }

  function handleAdd(data: { nombre: string; emoji: string; genero: Genero }) {
    if (!claseId) return;
    addAttendee(fecha, claseId, data);
    refresh();
  }

  function handlePayment(attendeeId: string, pago: MetodoPago) {
    if (!claseId) return;
    const current = attendees.find((a) => a.id === attendeeId);
    const next = current?.pago === pago ? undefined : pago;
    setPayment(fecha, claseId, attendeeId, next);
    refresh();
  }

  function confirmRemove() {
    if (!claseId || !pendingRemove) return;
    removeAttendee(fecha, claseId, pendingRemove.id);
    setPendingRemove(null);
    refresh();
  }

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Admin</h1>
        <p className="page-sub">
          Clases semanales y cobro al final de la sesión.
        </p>
      </div>

      <div className="tabs">
        <button
          type="button"
          className={`tab ${tab === "cobro" ? "active" : ""}`}
          onClick={() => setTab("cobro")}
        >
          Cobro
        </button>
        <button
          type="button"
          className={`tab ${tab === "clases" ? "active" : ""}`}
          onClick={() => setTab("clases")}
        >
          Clases
        </button>
      </div>

      {tab === "cobro" ? (
        <>
          <SessionPicker
            fecha={fecha}
            onFechaChange={setFecha}
            classes={dayClasses}
            claseId={claseId}
            onClaseChange={setClaseId}
          />

          {claseId && metrics && selectedClass ? (
            <>
              <div className="panel">
                <h2>Métricas</h2>
                <div className="metrics">
                  <div className="metric">
                    <div className="k">Personas</div>
                    <div className="v">{metrics.total}</div>
                  </div>
                  <div className="metric">
                    <div className="k">H / M</div>
                    <div className="v">
                      {metrics.hombres}/{metrics.mujeres}
                    </div>
                  </div>
                  <div className="metric">
                    <div className="k">Efectivo</div>
                    <div className="v">{metrics.efectivo}</div>
                  </div>
                  <div className="metric">
                    <div className="k">Transferencia</div>
                    <div className="v">{metrics.transferencia}</div>
                  </div>
                  <div className="metric">
                    <div className="k">Suscripción</div>
                    <div className="v">{metrics.suscripcion}</div>
                  </div>
                  <div className="metric">
                    <div className="k">Sin pagar</div>
                    <div className="v">{metrics.sinPagar}</div>
                  </div>
                  <div className="metric wide">
                    <div className="k">Efectivo esperado</div>
                    <div className="v">
                      {formatMoney(metrics.efectivoEsperado)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel">
                <h2>Cobrar — {selectedClass.nombre}</h2>
                {attendees.length === 0 ? (
                  <p className="empty">Todavía no hay nadie en la lista.</p>
                ) : (
                  <>
                    <div className="field">
                      <label className="label" htmlFor="cobro-search">
                        Buscar
                      </label>
                      <input
                        id="cobro-search"
                        className="input"
                        type="search"
                        placeholder="Filtrar por nombre…"
                        value={cobroSearch}
                        onChange={(e) => setCobroSearch(e.target.value)}
                        autoComplete="off"
                      />
                      {cobroSearch.trim() ? (
                        <small style={{ color: "var(--muted)" }}>
                          {filteredAttendees.length} de {attendees.length}
                        </small>
                      ) : null}
                    </div>
                    {filteredAttendees.length === 0 ? (
                      <p className="empty">
                        Nadie coincide con “{cobroSearch.trim()}”.
                      </p>
                    ) : (
                      filteredAttendees.map((a) => (
                        <div key={a.id} className="admin-person">
                          <div className="admin-person-top">
                            <strong>
                              {a.emoji ? `${a.emoji} ` : ""}
                              {a.nombre}
                              <span
                                style={{
                                  color: "var(--muted)",
                                  fontWeight: 500,
                                  marginLeft: "0.4rem",
                                }}
                              >
                                · {a.genero === "hombre" ? "H" : "M"}
                              </span>
                            </strong>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setPendingRemove(a)}
                            >
                              Quitar
                            </button>
                          </div>
                          <div className="pay-seg">
                            {(
                              [
                                ["efectivo", "Efectivo"],
                                ["transferencia", "Transfer"],
                                ["suscripcion", "Vale"],
                              ] as const
                            ).map(([value, label]) => (
                              <button
                                key={value}
                                type="button"
                                className={`pay-btn ${a.pago === value ? "active" : ""}`}
                                onClick={() => handlePayment(a.id, value)}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>

              <AttendeeForm
                onSubmit={handleAdd}
                title="Agregar persona"
                submitLabel="Agregar a la lista"
              />
            </>
          ) : null}
        </>
      ) : (
        <>
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
                <input
                  id="c-hora"
                  className="input"
                  type="time"
                  value={form.horaInicio}
                  onChange={(e) => {
                    setForm({ ...form, horaInicio: e.target.value });
                    setFormError(null);
                  }}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="c-duracion">
                  Duración (min)
                </label>
                <input
                  id="c-duracion"
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min={15}
                  step={15}
                  value={form.duracionMinutos}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      duracionMinutos: Number(e.target.value),
                    });
                    setFormError(null);
                  }}
                />
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
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={form.precio}
                onChange={(e) => {
                  setForm({ ...form, precio: Number(e.target.value) });
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
        </>
      )}

      {pendingRemove ? (
        <ConfirmDialog
          title="¿Eliminar de la lista?"
          message={`¿Seguro que quieres quitar a ${pendingRemove.nombre}?`}
          onConfirm={confirmRemove}
          onCancel={() => setPendingRemove(null)}
        />
      ) : null}

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
