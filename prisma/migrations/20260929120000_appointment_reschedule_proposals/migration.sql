ALTER TYPE "appointment_status" ADD VALUE 'reschedule_pending' BEFORE 'in_progress';

CREATE TYPE "appointment_reschedule_status" AS ENUM (
  'pending_patient',
  'accepted',
  'rejected',
  'cancelled'
);

CREATE TABLE "appointment_reschedule_proposals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "appointment_id" UUID NOT NULL,
  "proposed_by" UUID NOT NULL,
  "original_staff_id" UUID,
  "original_scheduled_at" TIMESTAMPTZ(6) NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "appointment_reschedule_status" NOT NULL DEFAULT 'pending_patient',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "responded_at" TIMESTAMPTZ(6),
  CONSTRAINT "appointment_reschedule_proposals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "appointment_reschedule_options" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "proposal_id" UUID NOT NULL,
  "staff_id" UUID NOT NULL,
  "scheduled_at" TIMESTAMPTZ(6) NOT NULL,
  "selected_at" TIMESTAMPTZ(6),
  CONSTRAINT "appointment_reschedule_options_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_reschedule_options_proposal_staff_time"
  ON "appointment_reschedule_options"("proposal_id", "staff_id", "scheduled_at");
CREATE INDEX "idx_reschedule_options_staff_time"
  ON "appointment_reschedule_options"("staff_id", "scheduled_at");
CREATE INDEX "idx_reschedule_proposals_appointment_status"
  ON "appointment_reschedule_proposals"("appointment_id", "status");
CREATE INDEX "idx_reschedule_proposals_user"
  ON "appointment_reschedule_proposals"("proposed_by");

ALTER TABLE "appointment_reschedule_proposals"
  ADD CONSTRAINT "appointment_reschedule_proposals_appointment_id_fkey"
  FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "appointment_reschedule_proposals"
  ADD CONSTRAINT "appointment_reschedule_proposals_proposed_by_fkey"
  FOREIGN KEY ("proposed_by") REFERENCES "users"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "appointment_reschedule_proposals"
  ADD CONSTRAINT "appointment_reschedule_proposals_original_staff_id_fkey"
  FOREIGN KEY ("original_staff_id") REFERENCES "users"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "appointment_reschedule_options"
  ADD CONSTRAINT "appointment_reschedule_options_proposal_id_fkey"
  FOREIGN KEY ("proposal_id") REFERENCES "appointment_reschedule_proposals"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "appointment_reschedule_options"
  ADD CONSTRAINT "appointment_reschedule_options_staff_id_fkey"
  FOREIGN KEY ("staff_id") REFERENCES "users"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;