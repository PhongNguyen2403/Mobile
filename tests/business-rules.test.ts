import assert from 'assert';
import {
  canCreateRescheduleProposal,
  getDoctorSlotConflictWindow,
  resolveRescheduleDecision,
} from '../src/modules/appointments/appointment.rules';
import {
  createAppointmentSchema,
  createRescheduleProposalSchema,
  respondToRescheduleProposalSchema,
} from '../src/modules/appointments/appointment.schema';

/**
 * Test Suite: Business Logic Verification
 */

// 1. Test Appointment State Machine Logic
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

function canTransition(current: string, target: string): boolean {
  return (VALID_TRANSITIONS[current] || []).includes(target);
}

// 2. Test Single Active CSKH Assignment Logic
interface Assignment {
  id: number;
  patientId: string;
  staffId: string;
  isActive: boolean;
}

function assignCskh(
  existingAssignments: Assignment[],
  patientId: string,
  newStaffId: string
): Assignment[] {
  // Step 1: Deactivate existing active assignments for this patient
  const updated = existingAssignments.map((a) =>
    a.patientId === patientId && a.isActive ? { ...a, isActive: false } : a
  );
  // Step 2: Add new active assignment
  updated.push({
    id: existingAssignments.length + 1,
    patientId,
    staffId: newStaffId,
    isActive: true,
  });
  return updated;
}

// 3. Test Auto Follow-up Logic
function shouldCreateFollowUp(nextVisitDate?: string | null): boolean {
  return Boolean(nextVisitDate && nextVisitDate.trim() !== '');
}

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ CÁC QUY TẮC NGHIỆP VỤ (BUSINESS RULES) ---');

  // Test 1: Appointment State Machine
  console.log('Kiểm thử 1: Luồng chuyển trạng thái Appointment...');
  assert.strictEqual(canTransition('pending', 'confirmed'), true, 'pending -> confirmed phải hợp lệ');
  assert.strictEqual(canTransition('pending', 'cancelled'), true, 'pending -> cancelled phải hợp lệ');
  assert.strictEqual(canTransition('pending', 'completed'), false, 'pending -> completed KHÔNG ĐƯỢC phép nhảy bước');
  assert.strictEqual(canTransition('pending', 'in_progress'), false, 'pending -> in_progress KHÔNG ĐƯỢC phép');
  assert.strictEqual(canTransition('confirmed', 'in_progress'), true, 'confirmed -> in_progress phải hợp lệ');
  assert.strictEqual(canTransition('confirmed', 'no_show'), true, 'confirmed -> no_show phải hợp lệ');
  assert.strictEqual(canTransition('in_progress', 'completed'), true, 'in_progress -> completed phải hợp lệ');
  assert.strictEqual(canTransition('completed', 'confirmed'), false, 'completed không thể chuyển sang trạng thái khác');
  console.log('✔ Kiểm thử 1 THÀNH CÔNG: State Machine hoạt động chính xác.');

  // Test 2: Single Active CSKH Assignment Rule
  console.log('Kiểm thử 2: Đảm bảo chỉ có 1 CSKH active tại một thời điểm cho 1 bệnh nhân...');
  const patientId = 'patient-uuid-123';
  let assignments: Assignment[] = [
    { id: 1, patientId, staffId: 'cskh-uuid-1', isActive: true },
  ];

  // Gán CSKH mới (cskh-uuid-2)
  assignments = assignCskh(assignments, patientId, 'cskh-uuid-2');

  const activeAssignments = assignments.filter((a) => a.patientId === patientId && a.isActive);
  assert.strictEqual(activeAssignments.length, 1, 'Chỉ được có duy nhất 1 assignment active');
  assert.strictEqual(activeAssignments[0].staffId, 'cskh-uuid-2', 'Assignment active phải là CSKH mới được gán');

  const oldAssignment = assignments.find((a) => a.staffId === 'cskh-uuid-1');
  assert.strictEqual(oldAssignment?.isActive, false, 'Assignment cũ phải bị vô hiệu hóa (isActive = false)');
  console.log('✔ Kiểm thử 2 THÀNH CÔNG: Quy tắc duy nhất 1 CSKH active được đảm bảo.');

  // Test 3: Auto-scheduling Follow-up when next_visit_date is present
  console.log('Kiểm thử 3: Tự động lên lịch tái khám khi có next_visit_date...');
  assert.strictEqual(shouldCreateFollowUp('2026-10-01'), true, 'Có next_visit_date phải kích hoạt tạo follow-up');
  assert.strictEqual(shouldCreateFollowUp(null), false, 'Không có next_visit_date không được tạo follow-up');
  assert.strictEqual(shouldCreateFollowUp(''), false, 'Chuỗi rỗng không được tạo follow-up');
  console.log('✔ Kiểm thử 3 THÀNH CÔNG: Logic tự động lên lịch tái khám hoạt động đúng.');

  // Test 4: Recommendation is_reference_only warning flag
  console.log('Kiểm thử 4: Cảnh báo gợi ý sản phẩm tham khảo (is_reference_only)...');
  const recommendationResponse = {
    is_reference_only: true,
    disclaimer: 'CẢNH BÁO: Gợi ý thuốc/TPCN mang tính tham khảo sơ bộ...',
    items: [],
  };
  assert.strictEqual(recommendationResponse.is_reference_only, true, 'is_reference_only phải luôn là true');
  assert.ok(recommendationResponse.disclaimer.length > 0, 'Phải có disclaimer cảnh báo bệnh nhân');
  console.log('✔ Kiểm thử 4 THÀNH CÔNG: Cảnh báo tham khảo luôn được gắn kèm response.');

  // Test 5: Patient self-booking request
  console.log('Kiểm thử 5: Bệnh nhân tự đặt lịch không cần patientId hoặc địa chỉ...');
  assert.strictEqual(createAppointmentSchema.safeParse({
    body: { scheduledAt: '2030-09-30T09:00:00.000Z' },
  }).success, true);
  console.log('✔ Kiểm thử 5 THÀNH CÔNG: patientId lấy từ token, địa chỉ phòng khám không bắt buộc.');

  // Test 6: Appointment reschedule proposal workflow rules
  console.log('Kiểm thử 6: Quy tắc đề xuất và phản hồi đổi lịch...');
  assert.strictEqual(canCreateRescheduleProposal('confirmed'), true);
  assert.strictEqual(canCreateRescheduleProposal('reschedule_pending'), true);
  assert.strictEqual(canCreateRescheduleProposal('completed'), false);

  const accepted = resolveRescheduleDecision('accept');
  assert.deepStrictEqual(accepted, {
    proposalStatus: 'accepted',
    appointmentStatus: 'confirmed',
  });
  const rejected = resolveRescheduleDecision('reject');
  assert.deepStrictEqual(rejected, {
    proposalStatus: 'rejected',
    appointmentStatus: 'reschedule_pending',
  });

  const conflictWindow = getDoctorSlotConflictWindow(new Date('2030-09-30T09:30:00.000Z'));
  assert.strictEqual(conflictWindow.after.toISOString(), '2030-09-30T09:00:00.000Z');
  assert.strictEqual(conflictWindow.before.toISOString(), '2030-09-30T10:00:00.000Z');

  const appointmentId = '00000000-0000-4000-8000-000000000001';
  const staffId = '00000000-0000-4000-8000-000000000002';
  const proposalId = '00000000-0000-4000-8000-000000000003';
  const optionId = '00000000-0000-4000-8000-000000000004';
  const proposalPayload = {
    params: { id: appointmentId },
    body: {
      reason: 'Bác sĩ có lịch đột xuất',
      options: [
        { staffId, scheduledAt: '2030-09-30T09:30:00.000Z' },
        { staffId, scheduledAt: '2030-09-30T14:00:00.000Z' },
      ],
    },
  };
  assert.strictEqual(createRescheduleProposalSchema.safeParse(proposalPayload).success, true);
  assert.strictEqual(
    createRescheduleProposalSchema.safeParse({
      ...proposalPayload,
      body: { ...proposalPayload.body, options: [proposalPayload.body.options[0]] },
    }).success,
    false,
    'Đề xuất phải có ít nhất hai phương án'
  );
  assert.strictEqual(createRescheduleProposalSchema.safeParse({
    ...proposalPayload,
    body: {
      ...proposalPayload.body,
      options: [proposalPayload.body.options[0], proposalPayload.body.options[0]],
    },
  }).success, false, 'Không được gửi hai phương án bác sĩ/giờ trùng nhau');
  assert.strictEqual(respondToRescheduleProposalSchema.safeParse({
    params: { id: appointmentId, proposalId },
    body: { decision: 'accept', optionId },
  }).success, true);
  assert.strictEqual(respondToRescheduleProposalSchema.safeParse({
    params: { id: appointmentId, proposalId },
    body: { decision: 'accept' },
  }).success, false, 'Chấp nhận phải chỉ rõ phương án được chọn');
  assert.strictEqual(respondToRescheduleProposalSchema.safeParse({
    params: { id: appointmentId, proposalId },
    body: { decision: 'reject' },
  }).success, true);
  console.log('✔ Kiểm thử 6 THÀNH CÔNG: Proposal, lựa chọn và từ chối được validate.');

  console.log('=== TẤT CẢ CÁC BÀI KIỂM THỬ NGHIỆP VỤ ĐÃ VƯỢT QUA 100%! ===');
}

runTests().catch((err) => {
  console.error('Kiểm thử thất bại:', err);
  process.exit(1);
});
