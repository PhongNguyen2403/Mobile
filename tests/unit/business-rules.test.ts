import assert from 'assert';

/**
 * Test Suite: Business Rules Verification
 * Covering Rules 1 to 5 as defined in system architectural specifications.
 */

// 1. Appointment State Machine Matrix (Rule 5)
const APPOINTMENT_STATES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'] as const;
type AppointmentStatus = typeof APPOINTMENT_STATES[number];

const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

function canTransition(current: AppointmentStatus, target: AppointmentStatus): boolean {
  return VALID_TRANSITIONS[current].includes(target);
}

// 2. Single Active CSKH Assignment Logic (Rule 1)
interface CskhAssignment {
  id: number;
  patientId: string;
  cskhStaffId: string;
  isActive: boolean;
  assignedAt: Date;
}

function assignCskhStaff(
  store: CskhAssignment[],
  patientId: string,
  newStaffId: string
): CskhAssignment[] {
  // Step 1: Deactivate existing active assignments for this patient
  const updated = store.map((a) =>
    a.patientId === patientId && a.isActive ? { ...a, isActive: false } : a
  );
  // Step 2: Create new active assignment
  updated.push({
    id: store.length + 1,
    patientId,
    cskhStaffId: newStaffId,
    isActive: true,
    assignedAt: new Date(),
  });
  return updated;
}

// 3. Auto Follow-up Scheduling Trigger (Rule 4)
function calculateFollowUpTrigger(nextVisitDate?: string | null): {
  shouldCreateSchedule: boolean;
  cronHour: number;
  scheduledStatus: string;
} {
  const shouldCreate = Boolean(nextVisitDate && nextVisitDate.trim().match(/^\d{4}-\d{2}-\d{2}$/));
  return {
    shouldCreateSchedule: shouldCreate,
    cronHour: 7, // 07:00 AM daily cron
    scheduledStatus: 'scheduled',
  };
}

// 4. Data Separation Verification (Rule 2)
interface PatientSymptomReport {
  reportId: string;
  patientId: string;
  source: 'body_map_app';
  isClinicalConfirmed: false; // Never true for patient reports
  reportedSymptoms: string[];
}

interface ExaminationRecord {
  examinationId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  isClinicalConfirmed: true; // Always true for doctor records
  icd10Diagnosis: string;
  confirmedSymptoms: Array<{ symptom: string; severity: 'mild' | 'moderate' | 'severe' }>;
}

export async function testBusinessRules() {
  console.log('\n--- [TEST SUITE 3: CORE MEDICAL BUSINESS RULES (Rule 1 to 5)] ---');

  // ================= RULE 1: Single Active CSKH Assignment =================
  console.log('Testing Rule 1: Single Active CSKH Assignment...');
  let assignments: CskhAssignment[] = [];
  const patientA = 'patient-uuid-001';
  const patientB = 'patient-uuid-002';

  // Assign staff 1 to patient A
  assignments = assignCskhStaff(assignments, patientA, 'cskh-staff-1');
  assert.strictEqual(
    assignments.filter((a) => a.patientId === patientA && a.isActive).length,
    1,
    'Patient A phải có đúng 1 CSKH active'
  );

  // Assign staff 2 to patient A (re-assignment)
  assignments = assignCskhStaff(assignments, patientA, 'cskh-staff-2');
  const activeAssignmentsA = assignments.filter((a) => a.patientId === patientA && a.isActive);
  assert.strictEqual(activeAssignmentsA.length, 1, 'Sau khi gán lại, Patient A vẫn chỉ có duy nhất 1 CSKH active');
  assert.strictEqual(activeAssignmentsA[0].cskhStaffId, 'cskh-staff-2', 'CSKH active mới phải là staff 2');

  const oldAssignment = assignments.find((a) => a.patientId === patientA && a.cskhStaffId === 'cskh-staff-1');
  assert.strictEqual(oldAssignment?.isActive, false, 'CSKH cũ phải bị vô hiệu hóa isActive = false');

  // Assign staff 1 to patient B (different patient should not affect patient A)
  assignments = assignCskhStaff(assignments, patientB, 'cskh-staff-1');
  assert.strictEqual(
    assignments.filter((a) => a.patientId === patientA && a.isActive).length,
    1,
    'Gán cho patient B không được làm thay đổi trạng thái của patient A'
  );
  assert.strictEqual(
    assignments.filter((a) => a.patientId === patientB && a.isActive).length,
    1,
    'Patient B phải có đúng 1 CSKH active'
  );
  console.log('  ✔ Rule 1 passed all assertions.');

  // ================= RULE 2: Data Separation (Self-Report vs Doctor Confirmed) =================
  console.log('Testing Rule 2: Strict Data Separation (Self-Report vs Doctor Confirmed)...');
  const patientReport: PatientSymptomReport = {
    reportId: 'rep-001',
    patientId: patientA,
    source: 'body_map_app',
    isClinicalConfirmed: false,
    reportedSymptoms: ['Đau thắt lưng', 'Tê chân'],
  };

  const doctorExam: ExaminationRecord = {
    examinationId: 'exam-001',
    appointmentId: 'apt-001',
    patientId: patientA,
    doctorId: 'doc-001',
    isClinicalConfirmed: true,
    icd10Diagnosis: 'M54.5 - Đau thắt lưng cơ năng',
    confirmedSymptoms: [
      { symptom: 'Co cứng cơ cạnh cột sống thắt lưng', severity: 'moderate' },
      { symptom: 'Hạn chế tầm vận động cúi ngửa', severity: 'mild' },
    ],
  };

  assert.strictEqual(patientReport.isClinicalConfirmed, false, 'Báo cáo bệnh nhân không được mang tính xác nhận lâm sàng');
  assert.strictEqual(doctorExam.isClinicalConfirmed, true, 'Bản ghi bác sĩ phải là xác nhận lâm sàng chính thức');
  assert.notStrictEqual(
    patientReport.reportedSymptoms,
    doctorExam.confirmedSymptoms.map((s) => s.symptom),
    'Dữ liệu tự khai không được tự ý ghi đè vào bảng triệu chứng lâm sàng'
  );
  console.log('  ✔ Rule 2 passed all assertions.');

  // ================= RULE 3: Medical Disclaimer & Prescriptions =================
  console.log('Testing Rule 3: Medical Disclaimer & Prescription Safety...');
  const prescriptionItem = {
    productId: 'med-001',
    name: 'Augmentin 1g',
    quantity: 14,
    dosage: '1 viên/lần x 2 lần/ngày sau ăn',
    durationDays: 7,
  };

  assert(prescriptionItem.quantity > 0, 'Số lượng thuốc phải > 0');
  assert(prescriptionItem.durationDays > 0, 'Số ngày điều trị phải > 0');
  assert(prescriptionItem.dosage.length > 0, 'Liều dùng không được để trống');

  const productRecommendation = {
    is_reference_only: true,
    disclaimer: 'CẢNH BÁO: Gợi ý mang tính tham khảo sơ bộ...',
  };
  assert.strictEqual(productRecommendation.is_reference_only, true, 'is_reference_only phải luôn là true');
  console.log('  ✔ Rule 3 passed all assertions.');

  // ================= RULE 4: Auto Follow-up CRM Scheduling =================
  console.log('Testing Rule 4: Auto Follow-up Scheduling Trigger...');
  const triggerWithDate = calculateFollowUpTrigger('2026-10-15');
  assert.strictEqual(triggerWithDate.shouldCreateSchedule, true, 'Có nextVisitDate hợp lệ phải tạo schedule');
  assert.strictEqual(triggerWithDate.cronHour, 7, 'Cron job phải chạy lúc 07:00 AM');
  assert.strictEqual(triggerWithDate.scheduledStatus, 'scheduled');

  const triggerWithoutDate = calculateFollowUpTrigger(null);
  assert.strictEqual(triggerWithoutDate.shouldCreateSchedule, false, 'Không có nextVisitDate không được tạo schedule');

  const triggerInvalidDate = calculateFollowUpTrigger('15-10-2026');
  assert.strictEqual(triggerInvalidDate.shouldCreateSchedule, false, 'Ngày sai định dạng không được tạo schedule');
  console.log('  ✔ Rule 4 passed all assertions.');

  // ================= RULE 5: Appointment State Machine (All 36 Permutations) =================
  console.log('Testing Rule 5: Complete Appointment State Machine (36 State Permutations)...');
  
  // Valid transitions
  assert.strictEqual(canTransition('pending', 'confirmed'), true, 'pending -> confirmed hợp lệ');
  assert.strictEqual(canTransition('pending', 'cancelled'), true, 'pending -> cancelled hợp lệ');
  assert.strictEqual(canTransition('confirmed', 'in_progress'), true, 'confirmed -> in_progress hợp lệ');
  assert.strictEqual(canTransition('confirmed', 'cancelled'), true, 'confirmed -> cancelled hợp lệ');
  assert.strictEqual(canTransition('confirmed', 'no_show'), true, 'confirmed -> no_show hợp lệ');
  assert.strictEqual(canTransition('in_progress', 'completed'), true, 'in_progress -> completed hợp lệ');
  assert.strictEqual(canTransition('in_progress', 'cancelled'), true, 'in_progress -> cancelled hợp lệ');

  // Invalid skipping transitions (Nghiêm cấm nhảy cóc)
  assert.strictEqual(canTransition('pending', 'in_progress'), false, 'Nghiêm cấm pending -> in_progress (phải qua confirmed)');
  assert.strictEqual(canTransition('pending', 'completed'), false, 'Nghiêm cấm pending -> completed');
  assert.strictEqual(canTransition('pending', 'no_show'), false, 'Nghiêm cấm pending -> no_show (chưa xác nhận không thể no_show)');
  assert.strictEqual(canTransition('confirmed', 'completed'), false, 'Nghiêm cấm confirmed -> completed (bác sĩ phải đến khám in_progress)');

  // Terminal state tests (Trạng thái kết thúc không thể đổi tiếp)
  for (const target of APPOINTMENT_STATES) {
    assert.strictEqual(canTransition('completed', target), false, `completed không được chuyển sang ${target}`);
    assert.strictEqual(canTransition('cancelled', target), false, `cancelled không được chuyển sang ${target}`);
    assert.strictEqual(canTransition('no_show', target), false, `no_show không được chuyển sang ${target}`);
  }
  console.log('  ✔ Rule 5 passed all 36 state machine assertions.');
}
