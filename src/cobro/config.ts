/**
 * Cobro autosave: wait this long after the first dirty tap, then flush all
 * pending pago/promo changes to Neon in one wave.
 *
 * Change this number to tune how often cobro hits the DB.
 * Example: `5_000` = 5 seconds, `15_000` = 15 seconds.
 *
 * Hard flushes still run immediately when leaving Cobro, changing day/class,
 * hiding the tab, or unmounting Admin — this interval only rate-limits
 * while the admin keeps tapping.
 */
export const COBRO_FLUSH_INTERVAL_MS = 10_000
