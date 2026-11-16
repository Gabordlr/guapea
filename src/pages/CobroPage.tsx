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
  getAttendance,
  getSessionSales,
  patchAttendeeCobro,
  removeAttendee,
  todayISO,
} from "../storage/repository";
import type {
  Asistente,
  Clase,
  Genero,
  MetodoPago,
  MetricasSesion,
  Promo,
  Venta,
} from "../types";
import { ValesPanel } from "./ValesPanel";
import { formatMoney } from "../utils/format";
import {
  applyPagoChange,
  applyPromoChange,
  formatPromoPrecio,
  PROMOS,
  tienePagoElegido,
} from "../utils/pricing";
import { computeSessionMetrics } from "../utils/sessionMetrics";

type CobroDirty = {
  pago: MetodoPago | undefined;
  promo: Promo | undefined;
};

type CobroTab = "cobro" | "vales";

export function CobroPage() {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const [tab, setTab] = useState<CobroTab>("cobro");
  const [tick, setTick] = useState(0);
  const [fecha, setFecha] = useState(todayISO);
  const [claseId, setClaseId] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<Asistente[]>([]);
  const [dayClasses, setDayClasses] = useState<Clase[]>([]);
  const [metrics, setMetrics] = useState<MetricasSesion | null>(null);
  const [sessionSales, setSessionSales] = useState<Venta[]>([]);
  const [cobroSearch, setCobroSearch] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<Asistente | null>(null);
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

  const pendientesCount = useMemo(
    () => attendees.filter((a) => !tienePagoElegido(a.pago)).length,
    [attendees],
  );

  const filteredAttendees = useMemo(() => {
    const q = cobroSearch.trim().toLowerCase();
    return attendees.filter((a) => {
      if (soloPendientes && tienePagoElegido(a.pago)) return false;
      if (!q) return true;
      return `${a.emoji} ${a.nombre}`.toLowerCase().includes(q);
    });
  }, [attendees, cobroSearch, soloPendientes]);

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
    classesForDate(fecha)
      .then((day) => {
        if (cancelled) return;
        setDayClasses(day);
        setLoadError(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
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
      setSessionSales([]);
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
    getSessionSales(fecha, claseId)
      .then((list) => {
        if (!cancelled) setSessionSales(list);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setSessionSales([]);
          setLoadError(err.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fecha, claseId, tick]);

  const sessionSalesTotals = useMemo(() => {
    let efectivo = 0;
    let transferencia = 0;
    for (const s of sessionSales) {
      if (s.metodoPago === "efectivo") efectivo += s.monto;
      else if (s.metodoPago === "transferencia") transferencia += s.monto;
    }
    return { efectivo, transferencia };
  }, [sessionSales]);

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
    const nextList = attendees.map((a) => (a.id === attendeeId ? next : a));
    setAttendees(nextList);
    syncMetrics(nextList);
    markCobroDirty(attendeeId, next);
  }

  function handlePromo(attendeeId: string, promo: Promo) {
    if (!claseId) return;
    const current = attendees.find((a) => a.id === attendeeId);
    if (!current) return;
    const next = { ...current, ...applyPromoChange(current, promo) };
    const nextList = attendees.map((a) => (a.id === attendeeId ? next : a));
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
          <h1 className="page-title">Cobro</h1>
          <p className="page-sub">
            Cobro al final de la sesión.
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
          onClick={() => {
            setTab("cobro");
            setTick((t) => t + 1);
          }}
        >
          Clases
        </button>
        <button
          type="button"
          className={`tab ${tab === "vales" ? "active" : ""}`}
          onClick={() => setTab("vales")}
        >
          Vales
        </button>
      </div>

      {tab === "vales" ? (
        <ValesPanel
          fecha={fecha}
          onFechaChange={setFecha}
          dayClasses={dayClasses}
          onClaseLinked={setClaseId}
        />
      ) : (
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
                <div className="panel-head">
                  <h2>Cobrar — {selectedClass.nombre}</h2>
                  {attendees.length > 0 ? (
                    <button
                      type="button"
                      className={`btn btn-sm cobro-filter-btn${soloPendientes ? " active" : ""}`}
                      aria-pressed={soloPendientes}
                      onClick={() => setSoloPendientes((v) => !v)}
                    >
                      Pendientes
                      <span className="cobro-filter-count">
                        {pendientesCount}
                      </span>
                    </button>
                  ) : null}
                </div>
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
                      {cobroSearch.trim() || soloPendientes ? (
                        <small style={{ color: "var(--muted)" }}>
                          {filteredAttendees.length} de {attendees.length}
                        </small>
                      ) : null}
                    </div>
                    {filteredAttendees.length === 0 ? (
                      <p className="empty">
                        {soloPendientes && !cobroSearch.trim()
                          ? "Nadie pendiente de cobro."
                          : `Nadie coincide con “${cobroSearch.trim()}”.`}
                      </p>
                    ) : (
                      filteredAttendees.map((a) => (
                        <div
                          key={a.id}
                          className={`admin-person${tienePagoElegido(a.pago) ? " is-cobrado" : ""}`}
                        >
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
                                {promo.label} ·{" "}
                                {formatPromoPrecio(promo.precio)}
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
                <h2>Clase</h2>
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
              {sessionSales.length > 0 ? (
                <div className="panel">
                  <h2>Clase + Nuevos vales</h2>
                  <div className="metrics">
                    <div className="metric">
                      <div className="k">Efectivo</div>
                      <div className="v">
                        {formatMoney(
                          metrics.efectivoEsperado +
                          sessionSalesTotals.efectivo,
                        )}
                        <span className="metric-breakdown">
                          {formatMoney(metrics.efectivoEsperado)} +{" "}
                          {formatMoney(sessionSalesTotals.efectivo)}
                        </span>
                      </div>
                    </div>
                    <div className="metric">
                      <div className="k">Transferencia</div>
                      <div className="v">
                        {formatMoney(
                          metrics.transferenciaMonto +
                          sessionSalesTotals.transferencia,
                        )}
                        <span className="metric-breakdown">
                          {formatMoney(metrics.transferenciaMonto)} +{" "}
                          {formatMoney(sessionSalesTotals.transferencia)}
                        </span>
                      </div>
                    </div>
                    <div className="metric wide">
                      <div className="k">Total</div>
                      <div className="v">
                        {formatMoney(
                          metrics.totalMonto +
                          sessionSalesTotals.efectivo +
                          sessionSalesTotals.transferencia,
                        )}
                        <span className="metric-breakdown">
                          {formatMoney(metrics.totalMonto)} +{" "}
                          {formatMoney(
                            sessionSalesTotals.efectivo +
                            sessionSalesTotals.transferencia,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              <AttendeeForm
                onSubmit={handleAdd}
                title="Agregar persona"
                submitLabel="Agregar a la lista"
              />
            </>
          ) : null}
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
    </div>
  );
}
