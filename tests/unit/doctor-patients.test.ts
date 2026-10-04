import assert from 'assert';

/**
 * Test Suite: Doctor Patient Aggregator Logic
 * Tests the deduplication and patient summarization algorithm used in ExaminationService.getDoctorPatients
 */

interface MockExamination {
  id: string;
  doctor_id: string;
  patient_id: string;
  examined_at: Date;
  diagnosis_note?: string;
  diseases?: { name: string; icd_code: string };
  patients: {
    id: string;
    full_name: string;
    phone: string;
    address: string;
    gender: string;
  };
}

interface MockAppointment {
  id: string;
  assigned_staff_id: string;
  patient_id: string;
  scheduled_at: Date;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  note?: string;
  visit_address?: string;
  patients: {
    id: string;
    full_name: string;
    phone: string;
    address: string;
    gender: string;
  };
}

function aggregateDoctorPatients(
  doctorId: string,
  exams: MockExamination[],
  appointments: MockAppointment[]
) {
  const patientMap = new Map<string, any>();

  // Process completed examinations
  for (const exam of exams) {
    if (exam.doctor_id !== doctorId) continue;
    const p = exam.patients;
    if (!patientMap.has(p.id)) {
      patientMap.set(p.id, {
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        total_examinations: 0,
        last_diagnosis: exam.diseases?.name || exam.diagnosis_note,
        last_icd_code: exam.diseases?.icd_code || null,
        has_pending_visit: false,
      });
    }
    const item = patientMap.get(p.id);
    item.total_examinations += 1;
  }

  // Merge appointments assigned to this doctor
  for (const apt of appointments) {
    if (apt.assigned_staff_id !== doctorId) continue;
    const p = apt.patients;
    if (!patientMap.has(p.id)) {
      patientMap.set(p.id, {
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        total_examinations: 0,
        last_diagnosis: apt.note,
        last_icd_code: null,
        has_pending_visit: apt.status === 'confirmed' || apt.status === 'in_progress',
        latest_appointment_status: apt.status,
      });
    } else {
      const item = patientMap.get(p.id);
      if (apt.status === 'confirmed' || apt.status === 'in_progress') {
        item.has_pending_visit = true;
        item.latest_appointment_status = apt.status;
      }
    }
  }

  return Array.from(patientMap.values());
}

export async function testDoctorPatientsAggregator() {
  console.log('\n--- [TEST SUITE 4: DOCTOR PATIENT AGGREGATOR LOGIC] ---');
  console.log('Testing aggregation, deduplication, and count calculation...');

  const doctorId = 'doc-123';
  const otherDoctorId = 'doc-999';

  const mockExams: MockExamination[] = [
    {
      id: 'ex-1',
      doctor_id: doctorId,
      patient_id: 'pat-1',
      examined_at: new Date(Date.now() - 86400000 * 10),
      diagnosis_note: 'Viêm phế quản cấp',
      diseases: { name: 'Viêm phế quản cấp tính', icd_code: 'J20' },
      patients: {
        id: 'pat-1',
        full_name: 'Nguyễn Văn Bệnh Nhân',
        phone: '0912345678',
        address: '144 Xuân Thủy',
        gender: 'male',
      },
    },
    {
      id: 'ex-2',
      doctor_id: doctorId,
      patient_id: 'pat-1', // Same patient examined again!
      examined_at: new Date(Date.now() - 86400000 * 2),
      diagnosis_note: 'Khám lại viêm phế quản',
      diseases: { name: 'Viêm phế quản cấp tính', icd_code: 'J20' },
      patients: {
        id: 'pat-1',
        full_name: 'Nguyễn Văn Bệnh Nhân',
        phone: '0912345678',
        address: '144 Xuân Thủy',
        gender: 'male',
      },
    },
    {
      id: 'ex-3',
      doctor_id: otherDoctorId, // Different doctor!
      patient_id: 'pat-9',
      examined_at: new Date(),
      patients: {
        id: 'pat-9',
        full_name: 'Bệnh nhân của bác sĩ khác',
        phone: '0999999999',
        address: 'Hà Nội',
        gender: 'female',
      },
    },
  ];

  const mockAppointments: MockAppointment[] = [
    {
      id: 'apt-1',
      assigned_staff_id: doctorId,
      patient_id: 'pat-1',
      scheduled_at: new Date(),
      status: 'confirmed', // has pending visit today!
      note: 'Tái khám định kỳ',
      patients: {
        id: 'pat-1',
        full_name: 'Nguyễn Văn Bệnh Nhân',
        phone: '0912345678',
        address: '144 Xuân Thủy',
        gender: 'male',
      },
    },
    {
      id: 'apt-2',
      assigned_staff_id: doctorId,
      patient_id: 'pat-2', // New patient with appointment, not examined yet
      scheduled_at: new Date(),
      status: 'in_progress',
      note: 'Đau lưng dữ dội',
      patients: {
        id: 'pat-2',
        full_name: 'Trần Thị Mai',
        phone: '0988776655',
        address: 'Chung cư Sunrise',
        gender: 'female',
      },
    },
  ];

  const result = aggregateDoctorPatients(doctorId, mockExams, mockAppointments);

  // Assertions
  assert.strictEqual(result.length, 2, 'Phải có đúng 2 bệnh nhân duy nhất (pat-1 và pat-2)');
  
  // Check pat-1 (examined 2 times + has confirmed appointment today)
  const patient1 = result.find((p) => p.id === 'pat-1');
  assert(patient1, 'Bệnh nhân 1 phải tồn tại trong kết quả');
  assert.strictEqual(patient1.total_examinations, 2, 'Patient 1 phải có tổng cộng 2 lần khám');
  assert.strictEqual(patient1.has_pending_visit, true, 'Patient 1 phải có has_pending_visit = true');
  assert.strictEqual(patient1.last_icd_code, 'J20', 'Patient 1 mã ICD phải là J20');

  // Check pat-2 (0 exams done yet + has in_progress appointment)
  const patient2 = result.find((p) => p.id === 'pat-2');
  assert(patient2, 'Bệnh nhân 2 phải tồn tại trong kết quả');
  assert.strictEqual(patient2.total_examinations, 0, 'Patient 2 chưa khám lần nào');
  assert.strictEqual(patient2.has_pending_visit, true, 'Patient 2 đang có ca khám in_progress');

  // Ensure other doctor's patient pat-9 was filtered out
  const otherPatient = result.find((p) => p.id === 'pat-9');
  assert.strictEqual(otherPatient, undefined, 'Bệnh nhân của bác sĩ khác không được xuất hiện');

  console.log('  ✔ Doctor Patient Aggregator passed all assertions.');
}
