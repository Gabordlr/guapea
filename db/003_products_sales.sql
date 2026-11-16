-- Products catalog + sales receipts (vales now; comida later via categoria).
-- session_id is optional: sales are not owned by a session at the SQL level.

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  precio_default numeric(12, 2) NOT NULL CHECK (precio_default >= 0),
  categoria text NOT NULL CHECK (categoria IN ('vale', 'comida')),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products (id),
  nombre text NOT NULL,
  monto numeric(12, 2) NOT NULL CHECK (monto >= 0),
  metodo_pago text NOT NULL CHECK (metodo_pago IN ('efectivo', 'transferencia')),
  fecha date NOT NULL,
  session_id uuid REFERENCES sessions (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_categoria_activo_idx
  ON products (categoria, activo);

CREATE INDEX IF NOT EXISTS sales_fecha_idx ON sales (fecha);
CREATE INDEX IF NOT EXISTS sales_session_id_idx ON sales (session_id);
CREATE INDEX IF NOT EXISTS sales_product_id_idx ON sales (product_id);

-- Seed vale catalog (idempotent by nombre + categoria).
-- Only the known single-class price; add packs later as product rows.
INSERT INTO products (nombre, precio_default, categoria)
SELECT v.nombre, v.precio_default, 'vale'
FROM (
  VALUES
    ('Vale clase', 125.00)
) AS v(nombre, precio_default)
WHERE NOT EXISTS (
  SELECT 1 FROM products p
  WHERE p.nombre = v.nombre AND p.categoria = 'vale'
);
