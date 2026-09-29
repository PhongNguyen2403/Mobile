-- CreateEnum
CREATE TYPE "appointment_status" AS ENUM ('pending', 'confirmed', 'reschedule_pending', 'in_progress', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "appointment_reschedule_status" AS ENUM ('pending_patient', 'accepted', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "appointment_type" AS ENUM ('first_visit', 'follow_up', 'emergency');

-- CreateEnum
CREATE TYPE "care_interaction_type" AS ENUM ('call', 'message', 'zalo', 'email', 'home_visit', 'other');

-- CreateEnum
CREATE TYPE "followup_status" AS ENUM ('scheduled', 'reminded', 'confirmed', 'completed', 'missed', 'cancelled');

-- CreateEnum
CREATE TYPE "gender_type" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('pending', 'sent', 'failed', 'read');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('follow_up_reminder', 'appointment_confirmation', 'cskh_care', 'system', 'medicine_reminder');

-- CreateEnum
CREATE TYPE "product_status" AS ENUM ('active', 'discontinued', 'out_of_stock');

-- CreateEnum
CREATE TYPE "product_type" AS ENUM ('medicine', 'supplement');

-- CreateEnum
CREATE TYPE "severity_level" AS ENUM ('mild', 'moderate', 'severe');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'inactive', 'locked');

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "assigned_staff_id" UUID,
    "type" "appointment_type" NOT NULL DEFAULT 'first_visit',
    "status" "appointment_status" NOT NULL DEFAULT 'pending',
    "scheduled_at" TIMESTAMPTZ(6) NOT NULL,
    "visit_address" TEXT,
    "created_by" UUID,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "appointment_reschedule_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "proposal_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMPTZ(6) NOT NULL,
    "selected_at" TIMESTAMPTZ(6),

    CONSTRAINT "appointment_reschedule_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "body_parts" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "region" VARCHAR(50),
    "view_side" VARCHAR(10),
    "parent_id" INTEGER,
    "coord_x" DECIMAL(6,2),
    "coord_y" DECIMAL(6,2),
    "model_node_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "body_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cskh_assignments" (
    "id" BIGSERIAL NOT NULL,
    "patient_id" UUID NOT NULL,
    "cskh_staff_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cskh_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cskh_care_logs" (
    "id" BIGSERIAL NOT NULL,
    "patient_id" UUID NOT NULL,
    "cskh_staff_id" UUID,
    "interaction_type" "care_interaction_type" NOT NULL,
    "content" TEXT,
    "next_action" TEXT,
    "next_action_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cskh_care_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disease_product_recommendations" (
    "id" BIGSERIAL NOT NULL,
    "disease_id" INTEGER NOT NULL,
    "product_id" UUID NOT NULL,
    "recommended_dosage" VARCHAR(200),
    "priority" SMALLINT DEFAULT 1,
    "note" TEXT,

    CONSTRAINT "disease_product_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disease_symptoms" (
    "disease_id" INTEGER NOT NULL,
    "symptom_id" INTEGER NOT NULL,

    CONSTRAINT "disease_symptoms_pkey" PRIMARY KEY ("disease_id","symptom_id")
);

-- CreateTable
CREATE TABLE "diseases" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "icd_code" VARCHAR(20),
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diseases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "examination_symptoms" (
    "id" BIGSERIAL NOT NULL,
    "examination_id" UUID NOT NULL,
    "symptom_id" INTEGER NOT NULL,
    "severity" "severity_level" DEFAULT 'mild',
    "note" TEXT,

    CONSTRAINT "examination_symptoms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "examinations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointment_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "report_id" UUID,
    "doctor_id" UUID,
    "diagnosis_id" INTEGER,
    "diagnosis_note" TEXT,
    "examined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "next_visit_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "examinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "examination_id" UUID,
    "patient_id" UUID NOT NULL,
    "next_visit_date" DATE NOT NULL,
    "status" "followup_status" NOT NULL DEFAULT 'scheduled',
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_up_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID,
    "user_id" UUID,
    "type" "notification_type" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT,
    "related_table" VARCHAR(50),
    "related_id" UUID,
    "scheduled_at" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "status" "notification_status" NOT NULL DEFAULT 'pending',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_medical_history" (
    "id" BIGSERIAL NOT NULL,
    "patient_id" UUID NOT NULL,
    "condition_name" VARCHAR(200) NOT NULL,
    "note" TEXT,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_medical_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_symptom_report_items" (
    "id" BIGSERIAL NOT NULL,
    "report_id" UUID NOT NULL,
    "body_part_id" INTEGER NOT NULL,
    "symptom_id" INTEGER,
    "severity" "severity_level" DEFAULT 'mild',
    "note" TEXT,

    CONSTRAINT "patient_symptom_report_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_symptom_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "source" VARCHAR(30) DEFAULT 'app',
    "status" VARCHAR(30) DEFAULT 'submitted',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_symptom_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "full_name" VARCHAR(150) NOT NULL,
    "date_of_birth" DATE,
    "gender" "gender_type",
    "phone" VARCHAR(20),
    "address" TEXT,
    "province" VARCHAR(100),
    "health_insurance_no" VARCHAR(50),
    "emergency_contact_name" VARCHAR(150),
    "emergency_contact_phone" VARCHAR(20),
    "note" TEXT,
    "assigned_cskh_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "id" BIGSERIAL NOT NULL,
    "prescription_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "dosage" VARCHAR(200),
    "usage_instruction" TEXT,
    "duration_days" INTEGER,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "examination_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "prescribed_by" UUID,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "type" "product_type" NOT NULL,
    "manufacturer" VARCHAR(150),
    "unit" VARCHAR(50),
    "dosage_form" VARCHAR(100),
    "price" DECIMAL(12,2) DEFAULT 0,
    "stock_quantity" INTEGER DEFAULT 0,
    "usage_instruction" TEXT,
    "contraindication" TEXT,
    "status" "product_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SMALLSERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptom_product_recommendations" (
    "id" BIGSERIAL NOT NULL,
    "symptom_id" INTEGER NOT NULL,
    "product_id" UUID NOT NULL,
    "recommended_dosage" VARCHAR(200),
    "priority" SMALLINT DEFAULT 1,
    "note" TEXT,

    CONSTRAINT "symptom_product_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptoms" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" VARCHAR(100),
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "symptoms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_id" SMALLINT NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(150),
    "password_hash" TEXT NOT NULL,
    "avatar_url" TEXT,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_appointments_patient" ON "appointments"("patient_id");

-- CreateIndex
CREATE INDEX "idx_appointments_scheduled" ON "appointments"("scheduled_at");

-- CreateIndex
CREATE INDEX "idx_appointments_staff" ON "appointments"("assigned_staff_id");

-- CreateIndex
CREATE INDEX "idx_reschedule_proposals_appointment_status" ON "appointment_reschedule_proposals"("appointment_id", "status");

-- CreateIndex
CREATE INDEX "idx_reschedule_proposals_user" ON "appointment_reschedule_proposals"("proposed_by");

-- CreateIndex
CREATE INDEX "idx_reschedule_options_staff_time" ON "appointment_reschedule_options"("staff_id", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_reschedule_options_proposal_staff_time" ON "appointment_reschedule_options"("proposal_id", "staff_id", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "body_parts_code_key" ON "body_parts"("code");

-- CreateIndex
CREATE INDEX "idx_bodyparts_parent" ON "body_parts"("parent_id");

-- CreateIndex
CREATE INDEX "idx_bodyparts_region" ON "body_parts"("region");

-- CreateIndex
CREATE INDEX "idx_cskh_assign_patient" ON "cskh_assignments"("patient_id");

-- CreateIndex
CREATE INDEX "idx_cskh_assign_staff" ON "cskh_assignments"("cskh_staff_id");

-- CreateIndex
CREATE INDEX "idx_care_logs_patient" ON "cskh_care_logs"("patient_id");

-- CreateIndex
CREATE INDEX "idx_care_logs_staff" ON "cskh_care_logs"("cskh_staff_id");

-- CreateIndex
CREATE INDEX "idx_recommend_disease" ON "disease_product_recommendations"("disease_id");

-- CreateIndex
CREATE UNIQUE INDEX "disease_product_recommendations_disease_id_product_id_key" ON "disease_product_recommendations"("disease_id", "product_id");

-- CreateIndex
CREATE INDEX "idx_exam_symptoms_exam" ON "examination_symptoms"("examination_id");

-- CreateIndex
CREATE INDEX "idx_examinations_appointment" ON "examinations"("appointment_id");

-- CreateIndex
CREATE INDEX "idx_examinations_patient" ON "examinations"("patient_id");

-- CreateIndex
CREATE INDEX "idx_followup_date" ON "follow_up_schedules"("next_visit_date");

-- CreateIndex
CREATE INDEX "idx_followup_patient" ON "follow_up_schedules"("patient_id");

-- CreateIndex
CREATE INDEX "idx_followup_status" ON "follow_up_schedules"("status");

-- CreateIndex
CREATE INDEX "idx_notifications_patient" ON "notifications"("patient_id");

-- CreateIndex
CREATE INDEX "idx_notifications_scheduled" ON "notifications"("scheduled_at");

-- CreateIndex
CREATE INDEX "idx_notifications_status" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "idx_history_patient" ON "patient_medical_history"("patient_id");

-- CreateIndex
CREATE INDEX "idx_report_items_bodypart" ON "patient_symptom_report_items"("body_part_id");

-- CreateIndex
CREATE INDEX "idx_report_items_report" ON "patient_symptom_report_items"("report_id");

-- CreateIndex
CREATE INDEX "idx_symptom_reports_patient" ON "patient_symptom_reports"("patient_id");

-- CreateIndex
CREATE INDEX "idx_patients_cskh" ON "patients"("assigned_cskh_id");

-- CreateIndex
CREATE INDEX "idx_patients_phone" ON "patients"("phone");

-- CreateIndex
CREATE INDEX "idx_prescription_items_presc" ON "prescription_items"("prescription_id");

-- CreateIndex
CREATE INDEX "idx_prescriptions_patient" ON "prescriptions"("patient_id");

-- CreateIndex
CREATE INDEX "idx_products_name" ON "products"("name");

-- CreateIndex
CREATE INDEX "idx_products_type" ON "products"("type");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE INDEX "idx_recommend_symptom" ON "symptom_product_recommendations"("symptom_id");

-- CreateIndex
CREATE UNIQUE INDEX "symptom_product_recommendations_symptom_id_product_id_key" ON "symptom_product_recommendations"("symptom_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "symptoms_name_key" ON "symptoms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_phone" ON "users"("phone");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role_id");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointment_reschedule_proposals" ADD CONSTRAINT "appointment_reschedule_proposals_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointment_reschedule_proposals" ADD CONSTRAINT "appointment_reschedule_proposals_proposed_by_fkey" FOREIGN KEY ("proposed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointment_reschedule_proposals" ADD CONSTRAINT "appointment_reschedule_proposals_original_staff_id_fkey" FOREIGN KEY ("original_staff_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointment_reschedule_options" ADD CONSTRAINT "appointment_reschedule_options_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "appointment_reschedule_proposals"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointment_reschedule_options" ADD CONSTRAINT "appointment_reschedule_options_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "body_parts" ADD CONSTRAINT "body_parts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "body_parts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cskh_assignments" ADD CONSTRAINT "cskh_assignments_cskh_staff_id_fkey" FOREIGN KEY ("cskh_staff_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cskh_assignments" ADD CONSTRAINT "cskh_assignments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cskh_care_logs" ADD CONSTRAINT "cskh_care_logs_cskh_staff_id_fkey" FOREIGN KEY ("cskh_staff_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cskh_care_logs" ADD CONSTRAINT "cskh_care_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "disease_product_recommendations" ADD CONSTRAINT "disease_product_recommendations_disease_id_fkey" FOREIGN KEY ("disease_id") REFERENCES "diseases"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "disease_product_recommendations" ADD CONSTRAINT "disease_product_recommendations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "disease_symptoms" ADD CONSTRAINT "disease_symptoms_disease_id_fkey" FOREIGN KEY ("disease_id") REFERENCES "diseases"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "disease_symptoms" ADD CONSTRAINT "disease_symptoms_symptom_id_fkey" FOREIGN KEY ("symptom_id") REFERENCES "symptoms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "examination_symptoms" ADD CONSTRAINT "examination_symptoms_examination_id_fkey" FOREIGN KEY ("examination_id") REFERENCES "examinations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "examination_symptoms" ADD CONSTRAINT "examination_symptoms_symptom_id_fkey" FOREIGN KEY ("symptom_id") REFERENCES "symptoms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "examinations" ADD CONSTRAINT "examinations_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "examinations" ADD CONSTRAINT "examinations_diagnosis_id_fkey" FOREIGN KEY ("diagnosis_id") REFERENCES "diseases"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "examinations" ADD CONSTRAINT "examinations_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "examinations" ADD CONSTRAINT "examinations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "examinations" ADD CONSTRAINT "examinations_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "patient_symptom_reports"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "follow_up_schedules" ADD CONSTRAINT "follow_up_schedules_examination_id_fkey" FOREIGN KEY ("examination_id") REFERENCES "examinations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "follow_up_schedules" ADD CONSTRAINT "follow_up_schedules_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_medical_history" ADD CONSTRAINT "patient_medical_history_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_symptom_report_items" ADD CONSTRAINT "patient_symptom_report_items_body_part_id_fkey" FOREIGN KEY ("body_part_id") REFERENCES "body_parts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_symptom_report_items" ADD CONSTRAINT "patient_symptom_report_items_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "patient_symptom_reports"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_symptom_report_items" ADD CONSTRAINT "patient_symptom_report_items_symptom_id_fkey" FOREIGN KEY ("symptom_id") REFERENCES "symptoms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_symptom_reports" ADD CONSTRAINT "patient_symptom_reports_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_assigned_cskh_id_fkey" FOREIGN KEY ("assigned_cskh_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_examination_id_fkey" FOREIGN KEY ("examination_id") REFERENCES "examinations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_prescribed_by_fkey" FOREIGN KEY ("prescribed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "symptom_product_recommendations" ADD CONSTRAINT "symptom_product_recommendations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "symptom_product_recommendations" ADD CONSTRAINT "symptom_product_recommendations_symptom_id_fkey" FOREIGN KEY ("symptom_id") REFERENCES "symptoms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

