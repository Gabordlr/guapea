import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authClient } from "../auth/client";
import { COBRO_FLUSH_INTERVAL_MS } from "../cobro/config";
import { AttendeeForm } from "../components/AttendeeForm";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { SessionPicker } from "../components/SessionPicker";
import {
  addAttendee,
  classesForDate,
  deleteClass,
  getAttendance,
  listClasses,
  patchAttendeeCobro,
  removeAttendee,
  saveClass,
  todayISO,
} from "../storage/repository";
import type {
  Asistente,
  Clase,
  DiaSemana,
  Genero,
  MetodoPago,
  MetricasSesion,
  Promo,
} from "../types";
import {
  DIAS,
  DURACIONES,
  formatHorario,
  formatMoney,
  listHorasInicio,
} from "../utils/format";
import {
  applyPagoChange,
  applyPromoChange,
  formatPromoPrecio,
  PROMOS,
} from "../utils/pricing";
import { computeSessionMetrics } from "../utils/sessionMetrics";

const HORAS_INICIO = listHorasInicio(15);

type CobroDirty = {
  pago: MetodoPago | undefined;
  promo: Promo | undefined;
};

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
  const navigate = useNavigate();
  const session = authClient.useSession();
  const [tab, setTab] = useState<AdminTab>("cobro");
  const [tick, setTick] = useState(0);
  const [fecha, setFecha] = useState(todayISO);
  const [claseId, setClaseId] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<Asistente[]>([]);
  const [allClasses, setAllClasses] = useState<Clase[]>([]);
  const [dayClasses, setDayClasses] = useState<Clase[]>([]);
  const [metrics, setMetrics] = useState<MetricasSesion | null>(null);
  const [cobroSearch, setCobroSearch] = useState("");
  const [pendingRemove, setPendingRemove] = useState<Asistente | null>(null);
  const [pendingDeleteClass, setPendingDeleteClass] = useState<Clase | null>(
    null,
  );
  const [editing, setEditing] = useState<Clase | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [flushError, setFlushError] = useState<string | null>(null);

  const dirtyRef = useRef(new Map<string, CobroDirty>());
  const flushTimerRef = useRef<number | null>(null);
  const flushingRef = useRef(false);
  const cobroSessionRef = useRef({ fecha, claseId });
  cobroSessionRef.current = { fecha, claseId };
  const precioRef = useRef(0);

  const selectedClass = dayClasses.find((c) => c.id === claseId);
  precioRef.current = selectedClass?.precio ?? 0;

  const filteredAttendees = useMemo(() => {
    const q = cobroSearch.trim().toLowerCase();
    if (!q) return attendees;
    return attendees.filter((a) =>
      `${a.emoji} ${a.nombre}`.toLowerCase().includes(q),
    );
  }, [attendees, cobroSearch]);

  function syncMetrics(list: Asistente[], precio = precioRef.current) {
    setMetrics(computeSessionMetrics(list, precio));
  }

  async function flushDirtyCobro(forceSession?: {
    fecha: string;
    claseId: string | null;
  }) {
    const { fecha: f, claseId: cId } = forceSession ?? cobroSessionRef.current;
    if (!cId || flushingRef.current) return;
    if (flushTimerRef.current != null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    const entries = [...dirtyRef.current.entries()];
    if (entries.length === 0) return;

    flushingRef.current = true;
    dirtyRef.current.clear();
    try {
      await Promise.all(
        entries.map(([attendeeId, patch]) =>
          patchAttendeeCobro(f, cId, attendeeId, {
            pago: patch.pago ?? null,
            promo: patch.promo ?? null,
          }),
        ),
      );
      setFlushError(null);
    } catch (err) {
      for (const [id, patch] of entries) {
        if (!dirtyRef.current.has(id)) dirtyRef.current.set(id, patch);
      }
      setFlushError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar el cobro; reintentando…",
      );
      scheduleCobroFlush();
    } finally {
      flushingRef.current = false;
    }
  }

  function scheduleCobroFlush() {
    if (flushTimerRef.current != null) return;
    if (dirtyRef.current.size === 0) return;
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      void flushDirtyCobro();
    }, COBRO_FLUSH_INTERVAL_MS);
  }

  function markCobroDirty(attendeeId: string, next: Asistente) {
    dirtyRef.current.set(attendeeId, {
      pago: next.pago,
      promo: next.promo,
    });
    scheduleCobroFlush();
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([listClasses(), classesForDate(fecha)])
      .then(([all, day]) => {
        if (cancelled) return;
        setAllClasses(all);
        setDayClasses(day);
        setLoadError(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setAllClasses([]);
        setDayClasses([]);
        setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [fecha, tick]);

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
      setMetrics(null);
      return;
    }
    let cancelled = false;
    getAttendance(fecha, claseId)
      .then((list) => {
        if (cancelled) return;
        // Don't clobber optimistic edits waiting to flush.
        if (dirtyRef.current.size > 0) return;
        setAttendees(list);
        setMetrics(computeSessionMetrics(list, precioRef.current));
        setLoadError(null);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [fecha, claseId, tick]);

  // Hard-flush dirty cobro when leaving this day/class session.
  useEffect(() => {
    const session = { fecha, claseId };
    return () => {
      void flushDirtyCobro(session);
    };
  }, [fecha, claseId]);

  // Hard-flush when leaving Cobro tab or unmounting / hiding the page.
  useEffect(() => {
    if (tab !== "cobro") {
      void flushDirtyCobro();
    }
  }, [tab]);

  useEffect(() => {
    function onHide() {
      if (document.visibilityState === "hidden") {
        void flushDirtyCobro();
      }
    }
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      void flushDirtyCobro();
    };
  }, []);

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

  async function handleAdd(data: {
    nombre: string;
    emoji: string;
    genero: Genero;
  }) {
    if (!claseId) return;
    try {
      await addAttendee(fecha, claseId, data);
      refresh();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "No se pudo anotar");
    }
  }

  function handlePayment(attendeeId: string, pago: MetodoPago) {
    if (!claseId) return;
    const current = attendees.find((a) => a.id === attendeeId);
    if (!current) return;
    const next = { ...current, ...applyPagoChange(current, pago) };
    const nextList = attendees.map((a) =>
      a.id === attendeeId ? next : a,
    );
    setAttendees(nextList);
    syncMetrics(nextList);
    markCobroDirty(attendeeId, next);
  }

  function handlePromo(attendeeId: string, promo: Promo) {
    if (!claseId) return;
    const current = attendees.find((a) => a.id === attendeeId);
    if (!current) return;
    const next = { ...current, ...applyPromoChange(current, promo) };
    const nextList = attendees.map((a) =>
      a.id === attendeeId ? next : a,
    );
    setAttendees(nextList);
    syncMetrics(nextList);
    markCobroDirty(attendeeId, next);
  }

  async function confirmRemove() {
    if (!claseId || !pendingRemove) return;
    try {
      await removeAttendee(fecha, claseId, pendingRemove.id);
      setPendingRemove(null);
      refresh();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "No se pudo eliminar");
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
          <h1 className="page-title">Admin</h1>
          <p className="page-sub">
            Clases semanales y cobro al final de la sesión.
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
      {flushError ? (
        <p className="form-error" role="alert">
          No se pudo guardar el cobro; reintentando… ({flushError})
        </p>
      ) : null}

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
                          <div className="promo-seg">
                            {PROMOS.map((promo) => (
                              <button
                                key={promo.id}
                                type="button"
                                className={`promo-btn ${a.promo === promo.id ? "active" : ""}`}
                                onClick={() => handlePromo(a.id, promo.id)}
                              >
                                {promo.label} · {formatPromoPrecio(promo.precio)}
                              </button>
                            ))}
                          </div>
                          <div className="pay-seg">
                            {(
                              [
                                ["efectivo", "Efectivo"],
                                ["transferencia", "Transfer"],
                                ["suscripcion", "Vale"],
                                ["sin_pago", "Sin pago"],
                              ] as const
                            ).map(([value, label]) => (
                              <button
                                key={value}
                                type="button"
                                className={`pay-btn ${value === "sin_pago" ? "muted" : ""} ${a.pago === value ? "active" : ""}`}
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
              <div className="panel">
                <h2>Métricas</h2>
                <div className="metrics">
                  <div className="metric">
                    <div className="k">Personas</div>
                    <div className="v">
                      {metrics.total}
                      <span className="metric-sub">
                        {" "}
                        · {metrics.hombres}H / {metrics.mujeres}M
                      </span>
                    </div>
                  </div>
                  <div className="metric">
                    <div className="k">Promos</div>
                    <div className="v">
                      {metrics.promoPareja + metrics.promoCumpleanos}
                      <span className="metric-sub">
                        {" "}
                        · {metrics.promoPareja}P / {metrics.promoCumpleanos}C
                      </span>
                    </div>
                  </div>
                  <div className="metric">
                    <div className="k">Efectivo</div>
                    <div className="v">
                      {formatMoney(metrics.efectivoEsperado)}
                      <span className="metric-sub"> · {metrics.efectivo}</span>
                    </div>
                  </div>
                  <div className="metric">
                    <div className="k">Transferencia</div>
                    <div className="v">
                      {formatMoney(metrics.transferenciaMonto)}
                      <span className="metric-sub">
                        {" "}
                        · {metrics.transferencia}
                      </span>
                    </div>
                  </div>
                  <div className="metric">
                    <div className="k">Vale</div>
                    <div className="v">{metrics.suscripcion}</div>
                  </div>
                  <div className="metric">
                    <div className="k">Sin pago</div>
                    <div className="v">{metrics.sinPagar}</div>
                  </div>
                  <div className="metric wide">
                    <div className="k">Total</div>
                    <div className="v">{formatMoney(metrics.totalMonto)}</div>
                  </div>
                </div>
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
