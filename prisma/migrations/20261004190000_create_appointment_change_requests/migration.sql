CREATE TYPE "appointment_change_action" AS ENUM ('reschedule', 'cancel');

CREATE TYPE "appointment_change_request_status" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE "appointment_change_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointment_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "action" "appointment_change_action" NOT NULL,
    "requested_scheduled_at" TIMESTAMPTZ(6),
    "reason" TEXT,
    "status" "appointment_change_request_status" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_change_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_appt_change_requests_appointment"
    ON "appointment_change_requests"("appointment_id");

CREATE INDEX "idx_appt_change_requests_patient"
    ON "appointment_change_requests"("patient_id");

CREATE INDEX "idx_appt_change_requests_status"
    ON "appointment_change_requests"("status");

ALTER TABLE "appointment_change_requests"
    ADD CONSTRAINT "appointment_change_requests_appointment_id_fkey"
    FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "appointment_change_requests"
    ADD CONSTRAINT "appointment_change_requests_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patients"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "appointment_change_requests"
    ADD CONSTRAINT "appointment_change_requests_reviewed_by_fkey"
    FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;
