ALTER TYPE "appointment_change_request_status" ADD VALUE 'awaiting_patient';

CREATE TYPE "appointment_change_request_actor" AS ENUM ('patient', 'doctor');

CREATE TYPE "appointment_change_patient_choice" AS ENUM ('reschedule', 'change_doctor');

ALTER TABLE "appointment_change_requests"
    ADD COLUMN "initiated_by_role" "appointment_change_request_actor" NOT NULL DEFAULT 'patient',
    ADD COLUMN "initiated_by_user_id" UUID,
    ADD COLUMN "patient_choice" "appointment_change_patient_choice";

ALTER TABLE "appointment_change_requests"
    ADD CONSTRAINT "appointment_change_requests_initiated_by_user_id_fkey"
    FOREIGN KEY ("initiated_by_user_id") REFERENCES "users"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX "idx_appt_change_requests_initiator"
    ON "appointment_change_requests"("initiated_by_role");
