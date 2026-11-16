import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import {
  createSale,
  deleteSale,
  listProducts,
  listSales,
} from '../storage/repository'
import type { Clase, MetodoPagoVenta, Producto, Venta } from '../types'
import {
  formatFechaTitulo,
  formatHorario,
  formatMoney,
  shiftFecha,
} from '../utils/format'

const METODOS: { id: MetodoPagoVenta; label: string }[] = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'transferencia', label: 'Transfer' },
]

type ValesPanelProps = {
  fecha: string
  onFechaChange: (fecha: string) => void
  dayClasses: Clase[]
  /** When a class is chosen for linking, sync Cobro to the same session. */
  onClaseLinked: (claseId: string) => void
}

export function ValesPanel({
  fecha,
  onFechaChange,
  dayClasses,
  onClaseLinked,
}: ValesPanelProps) {
  const [linkClaseId, setLinkClaseId] = useState<string | null>(null)
  const [products, setProducts] = useState<Producto[]>([])
  const [sales, setSales] = useState<Venta[]>([])
  const [nombre, setNombre] = useState('')
  const [productId, setProductId] = useState('')
  const [monto, setMonto] = useState('')
  const [metodoPago, setMetodoPago] = useState<MetodoPagoVenta>('efectivo')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Venta | null>(null)

  const selectedProduct = products.find((p) => p.id === productId)

  const totals = useMemo(() => {
    const efectivo = sales
      .filter((s) => s.metodoPago === 'efectivo')
      .reduce((sum, s) => sum + s.monto, 0)
    const transferencia = sales
      .filter((s) => s.metodoPago === 'transferencia')
      .reduce((sum, s) => sum + s.monto, 0)
    return {
      count: sales.length,
      efectivo,
      transferencia,
      total: efectivo + transferencia,
    }
  }, [sales])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await listProducts('vale')
        if (cancelled) return
        setProducts(list)
        setProductId((current) => {
          if (current && list.some((p) => p.id === current)) return current
          return list[0]?.id ?? ''
        })
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : 'No se pudieron cargar productos',
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const product = products.find((p) => p.id === productId)
    if (!product) return
    setMonto(String(product.precioDefault))
  }, [productId, products])

  useEffect(() => {
    if (dayClasses.length === 0) {
      setLinkClaseId(null)
      return
    }
    setLinkClaseId((current) => {
      if (current && dayClasses.some((c) => c.id === current)) return current
      return dayClasses[dayClasses.length - 1].id
    })
  }, [dayClasses])

  useEffect(() => {
    if (linkClaseId) onClaseLinked(linkClaseId)
  }, [linkClaseId, onClaseLinked])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await listSales(fecha, 'vale')
        if (!cancelled) {
          setSales(list)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : 'No se pudieron cargar ventas',
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fecha])

  function toggleLinkClase(id: string) {
    setLinkClaseId((current) => {
      if (current === id) return null
      onClaseLinked(id)
      return id
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = nombre.trim()
    if (!trimmed) {
      setError('Escribe el nombre de quien compró')
      return
    }
    if (!productId) {
      setError('Elige un producto')
      return
    }
    const amount = Number(monto)
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Monto inválido')
      return
    }

    setSaving(true)
    try {
      const created = await createSale({
        productId,
        nombre: trimmed,
        monto: amount,
        metodoPago,
        fecha,
        classId: linkClaseId,
      })
      setSales((prev) => [created, ...prev])
      setNombre('')
      if (selectedProduct) setMonto(String(selectedProduct.precioDefault))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const id = pendingDelete.id
    setPendingDelete(null)
    try {
      await deleteSale(id)
      setSales((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  return (
    <>
      <div className="panel">
        <h2>Fecha</h2>
        <div className="field">
          <span className="label" id="vale-fecha-label">
            Día de la venta
          </span>
          <div
            className="date-stepper"
            role="group"
            aria-labelledby="vale-fecha-label"
          >
            <button
              type="button"
              className="date-stepper-btn"
              aria-label="Día anterior"
              onClick={() => onFechaChange(shiftFecha(fecha, -1))}
            >
              ‹
            </button>
            <div className="date-stepper-value" aria-live="polite">
              {formatFechaTitulo(fecha)}
            </div>
            <button
              type="button"
              className="date-stepper-btn"
              aria-label="Día siguiente"
              onClick={() => onFechaChange(shiftFecha(fecha, 1))}
            >
              ›
            </button>
          </div>
        </div>

        {dayClasses.length > 0 ? (
          <div className="field">
            <span className="label">Sesión (opcional)</span>
            <div className="class-list">
              {dayClasses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`class-option ${linkClaseId === c.id ? 'active' : ''}`}
                  aria-pressed={linkClaseId === c.id}
                  onClick={() => toggleLinkClase(c.id)}
                >
                  <strong>{c.nombre}</strong>
                  <small>
                    {formatHorario(c)}
                    {c.descripcion ? ` · ${c.descripcion}` : ''}
                  </small>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <form className="panel" onSubmit={handleSubmit} noValidate>
        <h2>Registrar vale</h2>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="field">
          <label className="label" htmlFor="vale-nombre">
            Nombre
          </label>
          <input
            id="vale-nombre"
            className="input"
            value={nombre}
            placeholder="Quién compró"
            onChange={(e) => setNombre(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="field">
          <span className="label" id="vale-producto-label">
            Producto
          </span>
          {products.length === 0 ? (
            <p className="empty">
              No hay productos vale. Corre la migración 003 y recarga.
            </p>
          ) : (
            <div
              className="class-list"
              role="listbox"
              aria-labelledby="vale-producto-label"
            >
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={productId === p.id}
                  className={`class-option ${productId === p.id ? 'active' : ''}`}
                  onClick={() => setProductId(p.id)}
                >
                  <strong>{p.nombre}</strong>
                  <small>{formatMoney(p.precioDefault)}</small>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="vale-monto">
            Monto
          </label>
          <input
            id="vale-monto"
            className="input"
            type="number"
            min={0}
            step={1}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
        </div>

        <div className="field">
          <span className="label">Método de pago</span>
          <div className="pay-seg">
            {METODOS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`pay-btn ${metodoPago === m.id ? 'active' : ''}`}
                onClick={() => setMetodoPago(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || products.length === 0}
          >
            {saving ? 'Guardando…' : 'Registrar venta'}
          </button>
        </div>
      </form>

      <div className="panel">
        <h2>Vales del día</h2>
        <div className="metrics">
          <div className="metric">
            <div className="k">Ventas</div>
            <div className="v">{totals.count}</div>
          </div>
          <div className="metric">
            <div className="k">Efectivo</div>
            <div className="v">{formatMoney(totals.efectivo)}</div>
          </div>
          <div className="metric">
            <div className="k">Transfer</div>
            <div className="v">{formatMoney(totals.transferencia)}</div>
          </div>
          <div className="metric wide">
            <div className="k">Total vales</div>
            <div className="v">{formatMoney(totals.total)}</div>
          </div>
        </div>

        {sales.length === 0 ? (
          <p className="empty">Todavía no hay vales registrados este día.</p>
        ) : (
          <ul className="vale-sales-list">
            {sales.map((s) => (
              <li key={s.id} className="vale-sale-row">
                <div>
                  <strong>{s.nombre}</strong>
                  <small>
                    {s.productNombre} · {formatMoney(s.monto)} ·{' '}
                    {s.metodoPago === 'efectivo' ? 'Efectivo' : 'Transfer'}
                    {s.sessionId ? ' · sesión' : ''}
                  </small>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPendingDelete(s)}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pendingDelete ? (
        <ConfirmDialog
          title="¿Eliminar venta?"
          message={`${pendingDelete.nombre} · ${pendingDelete.productNombre} · ${formatMoney(pendingDelete.monto)}`}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </>
  )
}
