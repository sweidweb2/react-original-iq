-- Original IQ — 022: never cascade-delete financial records
-- Deleting a client no longer cascades to their tasks, and deleting a task no longer cascades to its
-- payments/refunds (and, through payments, invoices). The backend deletes payment-free tasks explicitly
-- and answers 409 when a foreign key blocks a delete.

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_client_id_fkey;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES users (id) ON DELETE RESTRICT;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_task_id_fkey;
ALTER TABLE payments
  ADD CONSTRAINT payments_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE RESTRICT;

ALTER TABLE refunds DROP CONSTRAINT IF EXISTS refunds_task_id_fkey;
ALTER TABLE refunds
  ADD CONSTRAINT refunds_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE RESTRICT;
