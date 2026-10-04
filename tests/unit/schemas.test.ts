import assert from 'assert';
import {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
  assignAppointmentStaffSchema,
  listAppointmentsQuerySchema,
} from '../../src/modules/appointments/appointment.schema';
import {
  sendOtpSchema,
  verifyOtpSchema,
  loginSchema,
} from '../../src/modules/auth/auth.schema';
import {
  createExaminationSchema,
  createPrescriptionSchema,
} from '../../src/modules/examinations/examination.schema';
import {
  convertToAppointmentSchema,
  addSymptomReportItemSchema,
} from '../../src/modules/body-map/body-map.schema';

export async function testSchemas() {
  console.log('\n--- [TEST SUITE 2: ZOD VALIDATION SCHEMAS (Mobile_Dev/src/modules/*/schema)] ---');

  // ================= 1. Appointment Schemas =================
  console.log('Testing Appointment Schemas...');

  // Valid appointment creation
  const validAppointmentInput = {
    body: {
      patientId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      scheduledAt: new Date().toISOString(),
      visitAddress: 'Số 144 Xuân Thủy, Cầu Giấy, Hà Nội',
      type: 'first_visit',
      note: 'Sốt cao, đau họng',
    },
  };
  const parsedAppointment = createAppointmentSchema.safeParse(validAppointmentInput);
  assert.strictEqual(parsedAppointment.success, true, 'Valid appointment input must pass validation');

  // Invalid patientId (not UUID)
  const invalidPatientIdInput = {
    body: {
      patientId: 'invalid-uuid-string',
      scheduledAt: new Date().toISOString(),
      visitAddress: 'Số 144 Xuân Thủy',
    },
  };
  const parsedInvalidPatient = createAppointmentSchema.safeParse(invalidPatientIdInput);
  assert.strictEqual(parsedInvalidPatient.success, false, 'Invalid UUID must be rejected');

  // Invalid visitAddress (< 5 characters)
  const invalidAddressInput = {
    body: {
      patientId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      scheduledAt: new Date().toISOString(),
      visitAddress: 'HN',
    },
  };
  const parsedInvalidAddress = createAppointmentSchema.safeParse(invalidAddressInput);
  assert.strictEqual(parsedInvalidAddress.success, false, 'Address under 5 chars must be rejected');

  // Valid update status
  const validStatusUpdate = {
    params: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
    body: { status: 'in_progress', note: 'Bác sĩ đang đến' },
  };
  assert.strictEqual(updateAppointmentStatusSchema.safeParse(validStatusUpdate).success, true);

  // Invalid status enum
  const invalidStatusUpdate = {
    params: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
    body: { status: 'flying_to_patient' },
  };
  assert.strictEqual(updateAppointmentStatusSchema.safeParse(invalidStatusUpdate).success, false);
  console.log('  ✔ Appointment Schemas passed all assertions.');

  // ================= 2. Auth Schemas =================
  console.log('Testing Auth Schemas (sendOtp, verifyOtp, login)...');

  // Valid send OTP
  assert.strictEqual(sendOtpSchema.safeParse({ body: { phone: '0912345678' } }).success, true);
  assert.strictEqual(sendOtpSchema.safeParse({ body: { phone: '123' } }).success, false, 'Short phone must fail');

  // Verify OTP
  assert.strictEqual(
    verifyOtpSchema.safeParse({ body: { phone: '0912345678', otp: '123456' } }).success,
    true
  );
  assert.strictEqual(
    verifyOtpSchema.safeParse({ body: { phone: '0912345678', otp: '12' } }).success,
    false,
    'OTP < 4 chars must fail'
  );

  // Staff Login
  assert.strictEqual(
    loginSchema.safeParse({ body: { email: 'doctor@hospital.local', password: 'Password@123' } }).success,
    true
  );
  assert.strictEqual(
    loginSchema.safeParse({ body: { email: 'not-an-email', password: 'Password@123' } }).success,
    false,
    'Invalid email format must fail'
  );
  assert.strictEqual(
    loginSchema.safeParse({ body: { email: 'doctor@hospital.local', password: '123' } }).success,
    false,
    'Password < 6 chars must fail'
  );
  console.log('  ✔ Auth Schemas passed all assertions.');

  // ================= 3. Examination & Prescription Schemas =================
  console.log('Testing Examination & Prescription Schemas...');

  // Valid examination with ICD-10 and nextVisitDate
  const validExam = {
    body: {
      appointmentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      patientId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      diagnosisNote: 'Bệnh nhân có ran rít phế quản, sốt 38.5 độ C',
      diagnosisId: 101,
      nextVisitDate: '2026-10-10',
      symptoms: [
        { symptomId: 1, severity: 'moderate', note: 'Ran rít' },
        { symptomId: 2, severity: 'severe' },
      ],
    },
  };
  assert.strictEqual(createExaminationSchema.safeParse(validExam).success, true);

  // Invalid nextVisitDate format
  const invalidDateExam = {
    body: {
      ...validExam.body,
      nextVisitDate: '10/10/2026', // wrong format, must be YYYY-MM-DD
    },
  };
  assert.strictEqual(createExaminationSchema.safeParse(invalidDateExam).success, false);

  // Prescription validation
  const validPrescription = {
    params: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
    body: {
      note: 'Uống thuốc sau ăn no',
      items: [
        {
          productId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
          quantity: 14,
          dosage: 'Uống 1 viên/lần x 2 lần/ngày',
          durationDays: 7,
        },
      ],
    },
  };
  assert.strictEqual(createPrescriptionSchema.safeParse(validPrescription).success, true);

  // Empty items prescription must fail
  const emptyItemsPrescription = {
    params: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
    body: { items: [] },
  };
  assert.strictEqual(createPrescriptionSchema.safeParse(emptyItemsPrescription).success, false);
  console.log('  ✔ Examination Schemas passed all assertions.');

  // ================= 4. Body Map Schemas =================
  console.log('Testing Body Map Schemas...');
  const validConvert = {
    params: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
    body: {
      scheduledAt: new Date().toISOString(),
      visitAddress: '123 Giải Phóng, Hà Nội',
      note: 'Chuyển từ body map tự khai',
    },
  };
  assert.strictEqual(convertToAppointmentSchema.safeParse(validConvert).success, true);

  const validReportItem = {
    params: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
    body: {
      bodyPartId: 3,
      symptomId: 5,
      severity: 'severe',
      note: 'Đau thắt từng cơn',
    },
  };
  assert.strictEqual(addSymptomReportItemSchema.safeParse(validReportItem).success, true);
  console.log('  ✔ Body Map Schemas passed all assertions.');
}
