import { useEffect, useState } from "react";
import { AttendanceLists } from "../components/AttendanceLists";
import { AttendeeForm } from "../components/AttendeeForm";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { SalsaLoader } from "../components/loaders/SalsaLoader";
import { SessionPicker } from "../components/SessionPicker";
import {
  addAttendee,
  classesForDate,
  getAttendance,
  removeAttendee,
  todayISO,
} from "../storage/repository";
import type { Asistente, Clase, Genero } from "../types";
import {
  endOfWeekContaining,
  startOfWeekContaining,
} from "../utils/format";

export function HomePage() {
  const today = todayISO();
  const minFecha = startOfWeekContaining(today);
  const maxFecha = endOfWeekContaining(today);
  const [fecha, setFecha] = useState(todayISO);
  const [claseId, setClaseId] = useState<string | null>(null);
  const [classes, setClasses] = useState<Clase[]>([]);
  const [attendees, setAttendees] = useState<Asistente[]>([]);
  const [pendingRemove, setPendingRemove] = useState<Asistente | null>(null);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    classesForDate(fecha)
      .then((list) => {
        if (cancelled) return;
        setClasses(list);
        setError(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setClasses([]);
        setError(err.message || "No se pudieron cargar las clases");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fecha, tick]);

  useEffect(() => {
    if (classes.length === 0) {
      setClaseId(null);
      return;
    }
    setClaseId((current) =>
      current && classes.some((c) => c.id === current)
        ? current
        : classes[0].id,
    );
  }, [classes]);

  useEffect(() => {
    if (!claseId) {
      setAttendees([]);
      return;
    }
    let cancelled = false;
    getAttendance(fecha, claseId)
      .then((list) => {
        if (!cancelled) setAttendees(list);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [fecha, claseId, tick]);

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
      setError(err instanceof Error ? err.message : "No se pudo anotar");
    }
  }

  async function confirmRemove() {
    if (!claseId || !pendingRemove) return;
    try {
      await removeAttendee(fecha, claseId, pendingRemove.id);
      setPendingRemove(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  }

  return (
    <div className="stack">
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <SessionPicker
        fecha={fecha}
        onFechaChange={(f) => {
          if (f < minFecha) setFecha(minFecha);
          else if (f > maxFecha) setFecha(maxFecha);
          else setFecha(f);
        }}
        classes={classes}
        claseId={claseId}
        onClaseChange={setClaseId}
        minFecha={minFecha}
        maxFecha={maxFecha}
      />

      {loading ? <SalsaLoader kind="basic" size={120} /> : null}

      {claseId ? (
        <>
          <AttendeeForm onSubmit={handleAdd} />
          <AttendanceLists
            attendees={attendees}
            onRequestRemove={setPendingRemove}
          />
        </>
      ) : null}

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
