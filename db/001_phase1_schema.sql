-- Guapea Phase 1 schema
-- See docs/phase1-schema.md

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  dia_de_la_semana smallint NOT NULL CHECK (dia_de_la_semana BETWEEN 0 AND 6),
  hora_inicio time NOT NULL,
  duracion_minutos integer NOT NULL CHECK (duracion_minutos > 0),
  precio numeric(12, 2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
  fecha date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, fecha)
);

CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  nombre text NOT NULL,
  genero text NOT NULL CHECK (genero IN ('hombre', 'mujer')),
  pago text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attendance_session_id_idx ON attendance (session_id);
CREATE INDEX IF NOT EXISTS sessions_fecha_idx ON sessions (fecha);
CREATE INDEX IF NOT EXISTS sessions_class_id_idx ON sessions (class_id);
