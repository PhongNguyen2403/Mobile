import { testUtils } from './unit/utils.test';
import { testSchemas } from './unit/schemas.test';
import { testBusinessRules } from './unit/business-rules.test';
import { testDoctorPatientsAggregator } from './unit/doctor-patients.test';

async function main() {
  const startTime = Date.now();
  console.log('================================================================');
  console.log('🏥  BỘ KIỂM THỬ ĐƠN VỊ (UNIT TESTS) - HỆ THỐNG Y TẾ HOME HEALTHCARE');
  console.log('================================================================');

  let passedSuites = 0;
  let totalSuites = 4;

  try {
    // Suite 1
    await testUtils();
    passedSuites++;

    // Suite 2
    await testSchemas();
    passedSuites++;

    // Suite 3
    await testBusinessRules();
    passedSuites++;

    // Suite 4
    await testDoctorPatientsAggregator();
    passedSuites++;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n================================================================');
    console.log(`✅  TẤT CẢ ${passedSuites}/${totalSuites} TEST SUITES ĐÃ VƯỢT QUA THÀNH CÔNG!`);
    console.log(`⏱️   Thời gian thực thi: ${duration}s`);
    console.log('================================================================\n');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌  KIỂM THỬ THẤT BẠI!');
    console.error(error.message || error);
    process.exit(1);
  }
}

main();
