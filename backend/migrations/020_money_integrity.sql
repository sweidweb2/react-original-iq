-- Original IQ — 020: money integrity (USD-only ledger + atomic payment/refund writes)
-- 1) Totals are summed without conversion, so every payment/refund row must be USD.
-- 2) Payment and refund writes lock the task row (SELECT … FOR UPDATE) and re-check the caps
--    inside the same transaction, so concurrent requests cannot overpay or over-refund a task.
--    Errors are raised with messages OVERPAY / REFUND_CAP / REFUND_UNCOVERED / TASK_NOT_FOUND /
--    PAYMENT_NOT_FOUND (SQLSTATE P0001), which the backend maps to 400/404.
-- Functions are callable only with the service-role key.

UPDATE payments SET currency = 'USD' WHERE currency <> 'USD';
UPDATE refunds SET currency = 'USD' WHERE currency <> 'USD';

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_currency_usd_check;
ALTER TABLE payments ADD CONSTRAINT payments_currency_usd_check CHECK (currency = 'USD');
ALTER TABLE refunds DROP CONSTRAINT IF EXISTS refunds_currency_usd_check;
ALTER TABLE refunds ADD CONSTRAINT refunds_currency_usd_check CHECK (currency = 'USD');

CREATE OR REPLACE FUNCTION task_money_totals(
  p_task_id uuid,
  OUT paid_payments numeric,
  OUT paid_refunds numeric,
  OUT pending_refunds numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    coalesce((SELECT sum(amount) FROM payments WHERE task_id = p_task_id AND status = 'paid'), 0),
    coalesce((SELECT sum(amount) FROM refunds WHERE task_id = p_task_id AND status = 'paid'), 0),
    coalesce((SELECT sum(amount) FROM refunds WHERE task_id = p_task_id AND status = 'pending'), 0);
$$;

CREATE OR REPLACE FUNCTION create_task_payment(
  p_task_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_status payment_status,
  p_gateway varchar,
  p_method varchar,
  p_txn_id varchar,
  p_max_net numeric
)
RETURNS SETOF payments
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_totals record;
  v_row payments;
BEGIN
  PERFORM 1 FROM tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND';
  END IF;

  IF p_status = 'paid' THEN
    SELECT * INTO v_totals FROM task_money_totals(p_task_id);
    IF v_totals.paid_payments - v_totals.paid_refunds + p_amount > p_max_net + 0.005 THEN
      RAISE EXCEPTION 'OVERPAY';
    END IF;
  END IF;

  INSERT INTO payments (
    task_id, user_id, amount, currency, gateway, status, payment_method, montypay_transaction_id
  )
  VALUES (p_task_id, p_user_id, p_amount, 'USD', p_gateway, p_status, p_method, p_txn_id)
  RETURNING * INTO v_row;

  RETURN NEXT v_row;
END;
$$;

-- p_amount / p_status NULL = keep current; p_set_method distinguishes "clear method" from "keep".
CREATE OR REPLACE FUNCTION update_task_payment(
  p_payment_id uuid,
  p_amount numeric,
  p_status payment_status,
  p_set_method boolean,
  p_method varchar,
  p_max_net numeric
)
RETURNS SETOF payments
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_current payments;
  v_totals record;
  v_next_amount numeric;
  v_next_status payment_status;
  v_others numeric;
  v_next_paid numeric;
  v_row payments;
BEGIN
  SELECT * INTO v_current FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND';
  END IF;

  PERFORM 1 FROM tasks WHERE id = v_current.task_id FOR UPDATE;
  SELECT * INTO v_current FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND';
  END IF;

  v_next_amount := coalesce(p_amount, v_current.amount);
  v_next_status := coalesce(p_status, v_current.status);

  SELECT * INTO v_totals FROM task_money_totals(v_current.task_id);
  v_others := v_totals.paid_payments
    - CASE WHEN v_current.status = 'paid' THEN v_current.amount ELSE 0 END;

  IF v_next_status = 'paid'
    AND v_others + v_next_amount - v_totals.paid_refunds > p_max_net + 0.005 THEN
    RAISE EXCEPTION 'OVERPAY';
  END IF;

  -- PL/pgSQL ends an IF condition at the first THEN, so a CASE cannot appear inside it.
  v_next_paid := v_others + CASE WHEN v_next_status = 'paid' THEN v_next_amount ELSE 0 END;
  IF v_next_paid < v_totals.paid_payments
    AND v_next_paid < v_totals.paid_refunds + v_totals.pending_refunds - 0.005 THEN
    RAISE EXCEPTION 'REFUND_UNCOVERED';
  END IF;

  UPDATE payments
  SET amount = v_next_amount,
      status = v_next_status,
      payment_method = CASE WHEN p_set_method THEN p_method ELSE payment_method END
  WHERE id = p_payment_id
  RETURNING * INTO v_row;

  RETURN NEXT v_row;
END;
$$;

CREATE OR REPLACE FUNCTION create_task_refund(
  p_task_id uuid,
  p_refunder_id uuid,
  p_amount numeric,
  p_reason text
)
RETURNS SETOF refunds
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_totals record;
  v_row refunds;
BEGIN
  PERFORM 1 FROM tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND';
  END IF;

  SELECT * INTO v_totals FROM task_money_totals(p_task_id);
  IF p_amount > v_totals.paid_payments - v_totals.paid_refunds - v_totals.pending_refunds + 0.005 THEN
    RAISE EXCEPTION 'REFUND_CAP';
  END IF;

  INSERT INTO refunds (
    task_id, refunder_id, amount, refund_reason, currency, gateway, status, payment_method
  )
  VALUES (p_task_id, p_refunder_id, p_amount, p_reason, 'USD', 'manual', 'pending', 'manual')
  RETURNING * INTO v_row;

  RETURN NEXT v_row;
END;
$$;

REVOKE ALL ON FUNCTION task_money_totals(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION create_task_payment(uuid, uuid, numeric, payment_status, varchar, varchar, varchar, numeric)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION update_task_payment(uuid, numeric, payment_status, boolean, varchar, numeric)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION create_task_refund(uuid, uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION task_money_totals(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION create_task_payment(uuid, uuid, numeric, payment_status, varchar, varchar, varchar, numeric)
  TO service_role;
GRANT EXECUTE ON FUNCTION update_task_payment(uuid, numeric, payment_status, boolean, varchar, numeric)
  TO service_role;
GRANT EXECUTE ON FUNCTION create_task_refund(uuid, uuid, numeric, text) TO service_role;
