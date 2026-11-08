-- Promo is optional price override (e.g. pareja), not a payment method.
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS promo text;
