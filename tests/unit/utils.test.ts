import assert from 'assert';
import { JwtUtil, TokenPayload } from '../../src/utils/jwt.util';
import { PaginationUtil } from '../../src/utils/pagination.util';
import { PasswordUtil } from '../../src/utils/password.util';
import { serializeBigInt } from '../../src/utils/bigint.util';

export async function testUtils() {
  console.log('\n--- [TEST SUITE 1: UTILITIES (Mobile_Dev/src/utils)] ---');

  // ================= 1. JwtUtil Tests =================
  console.log('Testing JwtUtil (generateTokens, verifyAccessToken, verifyRefreshToken)...');
  const payload: TokenPayload = {
    userId: 'user-uuid-1234',
    role: 'doctor',
    email: 'doctor@hospital.local',
    phone: '0912345678',
  };

  const { accessToken, refreshToken } = JwtUtil.generateTokens(payload);
  assert(accessToken && typeof accessToken === 'string', 'AccessToken phải là chuỗi hợp lệ');
  assert(refreshToken && typeof refreshToken === 'string', 'RefreshToken phải là chuỗi hợp lệ');
  assert.notStrictEqual(accessToken, refreshToken, 'Access token và Refresh token phải khác nhau');

  // Verify Access Token
  const decodedAccess = JwtUtil.verifyAccessToken(accessToken);
  assert.strictEqual(decodedAccess.userId, payload.userId, 'UserId giải mã phải khớp');
  assert.strictEqual(decodedAccess.role, 'doctor', 'Role giải mã phải là doctor');
  assert.strictEqual(decodedAccess.email, payload.email, 'Email giải mã phải khớp');

  // Verify Refresh Token
  const decodedRefresh = JwtUtil.verifyRefreshToken(refreshToken);
  assert.strictEqual(decodedRefresh.userId, payload.userId, 'UserId refresh token phải khớp');

  // Verify Invalid Token throws error
  assert.throws(
    () => JwtUtil.verifyAccessToken('invalid.token.signature'),
    /jwt malformed|invalid token|signature/i,
    'Token sai phải ném lỗi'
  );
  console.log('  ✔ JwtUtil passed all assertions.');

  // ================= 2. PaginationUtil Tests =================
  console.log('Testing PaginationUtil (getPagination, formatResult)...');
  const p1 = PaginationUtil.getPagination({ page: '1', limit: '10' });
  assert.strictEqual(p1.page, 1, 'Page phải là 1');
  assert.strictEqual(p1.limit, 10, 'Limit phải là 10');
  assert.strictEqual(p1.skip, 0, 'Skip của page 1 phải là 0');
  assert.strictEqual(p1.take, 10, 'Take phải là 10');

  const p2 = PaginationUtil.getPagination({ page: '3', limit: '25' });
  assert.strictEqual(p2.skip, 50, 'Skip của page 3 limit 25 phải là 50');

  // Clamping boundary tests
  const pClampMin = PaginationUtil.getPagination({ page: '-5', limit: '0' });
  assert.strictEqual(pClampMin.page, 1, 'Page < 1 phải được clamp về 1');
  assert.strictEqual(pClampMin.limit, 1, 'Limit < 1 phải được clamp về 1');

  const pClampMax = PaginationUtil.getPagination({ limit: '500' });
  assert.strictEqual(pClampMax.limit, 100, 'Limit > 100 phải được clamp về 100');

  // formatResult tests
  const sampleItems = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const formatted = PaginationUtil.formatResult(sampleItems, 25, 2, 10);
  assert.strictEqual(formatted.data.length, 3, 'Data length phải là 3');
  assert.strictEqual(formatted.meta.total, 25, 'Total meta phải là 25');
  assert.strictEqual(formatted.meta.page, 2, 'Page meta phải là 2');
  assert.strictEqual(formatted.meta.totalPages, 3, 'Total pages của 25 items limit 10 phải là 3');
  assert.strictEqual(formatted.meta.hasNextPage, true, 'Page 2/3 phải hasNextPage = true');
  assert.strictEqual(formatted.meta.hasPrevPage, true, 'Page 2/3 phải hasPrevPage = true');

  const formattedLast = PaginationUtil.formatResult(sampleItems, 25, 3, 10);
  assert.strictEqual(formattedLast.meta.hasNextPage, false, 'Page cuối phải hasNextPage = false');
  console.log('  ✔ PaginationUtil passed all assertions.');

  // ================= 3. PasswordUtil Tests =================
  console.log('Testing PasswordUtil (hash, compare)...');
  const rawPassword = 'SecurePassword@2026';
  const hashedPassword = await PasswordUtil.hash(rawPassword);

  assert(hashedPassword && hashedPassword.startsWith('$2'), 'Hashed password phải là chuẩn bcrypt');
  assert.notStrictEqual(rawPassword, hashedPassword, 'Mật khẩu hash không được trùng mật khẩu gốc');

  const isMatch = await PasswordUtil.compare(rawPassword, hashedPassword);
  assert.strictEqual(isMatch, true, 'Mật khẩu đúng phải trả về true khi so sánh');

  const isWrongMatch = await PasswordUtil.compare('WrongPassword@123', hashedPassword);
  assert.strictEqual(isWrongMatch, false, 'Mật khẩu sai phải trả về false');
  console.log('  ✔ PasswordUtil passed all assertions.');

  // ================= 4. BigInt Serialization Tests =================
  console.log('Testing serializeBigInt...');
  const nestedDataWithBigInt = {
    id: BigInt('9007199254740995'),
    name: 'Bệnh nhân xét nghiệm',
    stats: {
      visitCount: BigInt(42),
      notes: ['Lần 1', 'Lần 2'],
    },
    history: [
      { id: BigInt(1), record: 'Khám tim' },
      { id: BigInt(2), record: 'Khám phổi' },
    ],
  };

  const serialized = serializeBigInt(nestedDataWithBigInt);
  assert.strictEqual(typeof serialized.id, 'string', 'BigInt gốc phải được serialize thành chuỗi');
  assert.strictEqual(serialized.id, '9007199254740995', 'Giá trị chuỗi phải khớp chính xác');
  assert.strictEqual(typeof serialized.stats.visitCount, 'string', 'Nested BigInt phải thành chuỗi');
  assert.strictEqual(serialized.history[0].id, '1', 'Array item BigInt phải thành chuỗi');
  console.log('  ✔ BigInt serialization passed all assertions.');
}
