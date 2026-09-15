import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu khởi tạo dữ liệu mẫu (Seeding)...');

  // 1. Roles
  const roles = [
    { id: 1, code: 'admin', name: 'Quản trị viên hệ thống', description: 'Toàn quyền quản trị danh mục và người dùng' },
    { id: 2, code: 'doctor', name: 'Bác sĩ khám tại nhà', description: 'Khám bệnh, chẩn đoán và kê đơn thuốc' },
    { id: 3, code: 'nurse', name: 'Điều dưỡng tại nhà', description: 'Chăm sóc, thực hiện y lệnh và hỗ trợ khám' },
    { id: 4, code: 'cskh', name: 'Nhân viên CSKH', description: 'Quản lý lịch hẹn, chăm sóc khách hàng và tái khám' },
  ];

  for (const role of roles) {
    await prisma.roles.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description },
      create: role,
    });
  }
  console.log('Đã nạp bảng roles');

  // 2. Default Admin User
  const adminRole = await prisma.roles.findUnique({ where: { code: 'admin' } });
  if (adminRole) {
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    await prisma.users.upsert({
      where: { email: 'admin@hospital.local' },
      update: {},
      create: {
        role_id: adminRole.id,
        full_name: 'Quản trị viên Hệ thống',
        email: 'admin@hospital.local',
        phone: '0901234567',
        password_hash: passwordHash,
        status: 'active',
      },
    });
    console.log('Đã tạo tài khoản Admin mặc định: admin@hospital.local / Admin@123');
  }

  // 3. Default Doctor User
  const doctorRole = await prisma.roles.findUnique({ where: { code: 'doctor' } });
  if (doctorRole) {
    const doctorHash = await bcrypt.hash('Doctor@123', 10);
    await prisma.users.upsert({
      where: { email: 'doctor@hospital.local' },
      update: {},
      create: {
        role_id: doctorRole.id,
        full_name: 'BS. Nguyễn Văn A',
        email: 'doctor@hospital.local',
        phone: '0902345678',
        password_hash: doctorHash,
        status: 'active',
      },
    });
    console.log('Đã tạo tài khoản Bác sĩ: doctor@hospital.local / Doctor@123');
  }

  // 4. Default CSKH User
  const cskhRole = await prisma.roles.findUnique({ where: { code: 'cskh' } });
  if (cskhRole) {
    const cskhHash = await bcrypt.hash('Cskh@123', 10);
    await prisma.users.upsert({
      where: { email: 'cskh@hospital.local' },
      update: {},
      create: {
        role_id: cskhRole.id,
        full_name: 'CSKH Trần Thị B',
        email: 'cskh@hospital.local',
        phone: '0903456789',
        password_hash: cskhHash,
        status: 'active',
      },
    });
    console.log('Đã tạo tài khoản CSKH: cskh@hospital.local / Cskh@123');
  }

  // 5. Body Parts (Mô hình giải phẫu mặt trước / sau)
  const bodyPartsData = [
    { code: 'HEAD_FRONT', name: 'Đầu - Mặt trước', region: 'Đầu', view_side: 'front', coord_x: 50.0, coord_y: 10.0 },
    { code: 'HEAD_BACK', name: 'Đầu gáy - Mặt sau', region: 'Đầu', view_side: 'back', coord_x: 50.0, coord_y: 10.0 },
    { code: 'CHEST', name: 'Vùng Ngực', region: 'Ngực', view_side: 'front', coord_x: 50.0, coord_y: 28.0 },
    { code: 'ABDOMEN', name: 'Vùng Bụng', region: 'Bụng', view_side: 'front', coord_x: 50.0, coord_y: 42.0 },
    { code: 'UPPER_BACK', name: 'Lưng trên', region: 'Lưng', view_side: 'back', coord_x: 50.0, coord_y: 30.0 },
    { code: 'LOWER_BACK', name: 'Thắt lưng / Lưng dưới', region: 'Lưng', view_side: 'back', coord_x: 50.0, coord_y: 45.0 },
    { code: 'LEFT_ARM', name: 'Cánh tay trái', region: 'Tay', view_side: 'front', coord_x: 30.0, coord_y: 35.0 },
    { code: 'RIGHT_ARM', name: 'Cánh tay phải', region: 'Tay', view_side: 'front', coord_x: 70.0, coord_y: 35.0 },
    { code: 'LEFT_KNEE', name: 'Đầu gối trái', region: 'Chân', view_side: 'front', coord_x: 42.0, coord_y: 72.0 },
    { code: 'RIGHT_KNEE', name: 'Đầu gối phải', region: 'Chân', view_side: 'front', coord_x: 58.0, coord_y: 72.0 },
  ];

  for (const part of bodyPartsData) {
    await prisma.body_parts.upsert({
      where: { code: part.code },
      update: { name: part.name, region: part.region, view_side: part.view_side },
      create: part,
    });
  }
  console.log('Đã nạp bảng body_parts');

  // 6. Symptoms
  const symptomsData = [
    { name: 'Sốt cao (>38.5°C)', category: 'Toàn thân', description: 'Nhiệt độ cơ thể tăng cao kèm rét run' },
    { name: 'Đau đầu / Chóng mặt', category: 'Thần kinh', description: 'Cảm giác đau âm ỉ hoặc giật từng cơn vùng đầu' },
    { name: 'Ho khan / Ho có đờm', category: 'Hô hấp', description: 'Cơn ho kéo dài, có thể có đờm màu vàng xanh' },
    { name: 'Đau rát họng', category: 'Hô hấp', description: 'Cổ họng đau buốt khi nuốt nước bọt hoặc thức ăn' },
    { name: 'Đau bụng âm ỉ', category: 'Tiêu hóa', description: 'Đau quặn hoặc âm ỉ quanh rốn hoặc thượng vị' },
    { name: 'Buồn nôn / Nôn ói', category: 'Tiêu hóa', description: 'Cảm giác cồn cào và muốn nôn' },
    { name: 'Đau mỏi thắt lưng', category: 'Cơ xương khớp', description: 'Đau nhức vùng thắt lưng khi ngồi lâu hoặc vận động' },
    { name: 'Đau khớp gối', category: 'Cơ xương khớp', description: 'Khớp gối sưng đau hoặc lục cục khi co duỗi' },
  ];

  for (const sym of symptomsData) {
    await prisma.symptoms.upsert({
      where: { name: sym.name },
      update: { category: sym.category, description: sym.description },
      create: sym,
    });
  }
  console.log('Đã nạp bảng symptoms');

  // 7. Diseases
  const diseasesData = [
    { name: 'Cảm cúm mùa (Influenza)', icd_code: 'J10', description: 'Nhiễm virus đường hô hấp cấp tính' },
    { name: 'Viêm họng cấp tính', icd_code: 'J02', description: 'Tình trạng viêm niêm mạc họng do virus hoặc vi khuẩn' },
    { name: 'Viêm dạ dày cấp tính', icd_code: 'K29.0', description: 'Viêm niêm mạc dạ dày gây đau vùng thượng vị' },
    { name: 'Thoái hóa cột sống thắt lưng', icd_code: 'M47', description: 'Tổn thương sụn và đĩa đệm vùng thắt lưng' },
  ];

  for (const dis of diseasesData) {
    const existing = await prisma.diseases.findFirst({ where: { name: dis.name } });
    if (!existing) {
      await prisma.diseases.create({ data: dis });
    }
  }
  console.log('Đã nạp bảng diseases');

  // 8. Products
  const productsData = [
    {
      name: 'Paracetamol 500mg (Hasan)',
      type: 'medicine' as const,
      manufacturer: 'Hasan-Dermapharm',
      unit: 'Hộp 10 vỉ x 10 viên',
      dosage_form: 'Viên nén',
      price: 65000,
      stock_quantity: 200,
      usage_instruction: 'Uống 1-2 viên/lần, cách 4-6 giờ khi sốt > 38.5 độ',
      contraindication: 'Suy gan nặng, mẫn cảm với Paracetamol',
      status: 'active' as const,
    },
    {
      name: 'Vitamin C 1000mg Effervescent',
      type: 'supplement' as const,
      manufacturer: 'Bayer',
      unit: 'Tuýp 10 viên',
      dosage_form: 'Viên sủi',
      price: 85000,
      stock_quantity: 150,
      usage_instruction: 'Hòa tan 1 viên vào 200ml nước, uống buổi sáng sau ăn',
      status: 'active' as const,
    },
    {
      name: 'Men Vi Sinh Bio-Probiotics Plus',
      type: 'supplement' as const,
      manufacturer: 'Mediphar USA',
      unit: 'Hộp 30 gói',
      dosage_form: 'Bột pha uống',
      price: 180000,
      stock_quantity: 80,
      usage_instruction: 'Uống 1 gói/lần x 2 lần/ngày trước bữa ăn 30 phút',
      status: 'active' as const,
    },
    {
      name: 'Cao Dán Giảm Đau Khớp Salonpas',
      type: 'medicine' as const,
      manufacturer: 'Hisamitsu',
      unit: 'Gói 10 miếng',
      dosage_form: 'Miếng dán',
      price: 35000,
      stock_quantity: 300,
      usage_instruction: 'Dán trực tiếp vào vùng đau (không quá 3 lần/ngày)',
      status: 'active' as const,
    },
  ];

  for (const prod of productsData) {
    const existing = await prisma.products.findFirst({ where: { name: prod.name } });
    if (!existing) {
      await prisma.products.create({ data: prod });
    }
  }
  console.log('Đã nạp bảng products');

  console.log('Hoàn thành quá trình nạp dữ liệu mẫu!');
}

main()
  .catch((e) => {
    console.error('Lỗi khi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
