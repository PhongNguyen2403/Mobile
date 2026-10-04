# 🏥 Home Healthcare Management Backend API
### Hệ Thống Quản Lý Khám Chữa Bệnh Tại Nhà & Quản Lý Bệnh Nhân

Backend RESTful API xây dựng bằng **Node.js**, **Express**, **TypeScript** và **Prisma ORM** kết nối **PostgreSQL**, tuân thủ mô hình **MVC kết hợp Service Layer**.

---

## 📋 Yêu Cầu Môi Trường (Prerequisites)
- **Node.js**: Phiên bản LTS mới nhất (Khuyến nghị **Node.js v20.x**)
- **Package Manager**: npm hoặc yarn
- **Database**: **PostgreSQL** (v14+) đang chạy trên máy cục bộ hoặc máy chủ
- **Git**

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy (Quickstart)

### Bước 1: Clone dự án về máy
```bash
git clone https://github.com/PhongNguyen2403/Mobile.git
cd Mobile
```

### Bước 2: Cài đặt các gói thư viện (Dependencies)
```bash
npm install
```

### Bước 3: Cấu hình biến môi trường
Tạo file `.env` từ file mẫu `.env.example`:
- **Trên Windows (PowerShell)**:
  ```powershell
  Copy-Item .env.example .env
  ```
- **Trên Linux / macOS**:
  ```bash
  cp .env.example .env
  ```

Mở file `.env` và cập nhật thông tin kết nối cơ sở dữ liệu PostgreSQL của bạn:
```env
PORT=3000
NODE_ENV=development

# Thay thế user và mật khẩu PostgreSQL của bạn
DATABASE_URL="postgresql://postgres:MAT_KHAU_CUA_BAN@localhost:5432/Hospital_Mobile?schema=public"

JWT_ACCESS_SECRET="your_jwt_super_secret_access_key_min_32_characters"
JWT_REFRESH_SECRET="your_jwt_super_secret_refresh_key_min_32_characters"
OTP_MOCK_ENABLED=true
OTP_MOCK_CODE="123456"
```

### Bước 4: Tạo Prisma Client từ Schema DB
*(Đảm bảo database `Hospital_Mobile` đã được tạo trong PostgreSQL)*
```bash
npm run prisma:generate
```

### Bước 5: Nạp dữ liệu mẫu khởi tạo (Seed Data)
Chạy script seed để tự động nạp Roles, tài khoản mặc định (Admin, Bác sĩ, CSKH), vị trí giải phẫu cơ thể, danh mục triệu chứng, bệnh lý và thuốc mẫu:
```bash
npm run prisma:seed
```

### Bước 6: Chạy kiểm thử các quy tắc nghiệp vụ (Unit Test)
```bash
npm test
```

### Bước 7: Khởi động Server
- **Chế độ phát triển (Dev mode with Hot Reload)**:
  ```bash
  npm run dev
  ```
- **Biên dịch và chạy Production**:
  ```bash
  npm run build
  npm start
  ```

Server sẽ khởi chạy tại: **`http://localhost:3000`**

---

## 📖 Tài Liệu Dự Án & API

- **Tài Liệu Đặc Tả Nghiệp Vụ Toàn Diện (Business Docs)**:
  👉 [docs/BUSINESS_DOCS.md](./docs/BUSINESS_DOCS.md) *(Bao gồm: Luồng nghiệp vụ, Ma trận phân quyền RBAC, 7 Quy tắc nghiệp vụ cốt lõi, State Machine, ERD và Enums)*
- **Swagger API Docs (Giao diện trực quan để test API)**:
  👉 [http://localhost:3000/docs](http://localhost:3000/docs)
- **Health Check Endpoint**:
  👉 [http://localhost:3000/health](http://localhost:3000/health)

---

## 🔑 Tài Khoản Mặc Định Đã Tạo Sẵn

| Vai trò | Email / SĐT | Mật khẩu / OTP | Chức năng |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@hospital.local` | `Admin@123` | Quản trị toàn bộ danh mục, nhân viên |
| **Bác sĩ** | `doctor@hospital.local` | `Doctor@123` | Khám bệnh tại nhà, kê đơn, lên lịch tái khám |
| **CSKH** | `cskh@hospital.local` | `Cskh@123` | Quản lý lịch hẹn, chăm sóc khách, theo dõi tái khám |
| **Bệnh nhân** | Số điện thoại bất kỳ (VD: `0987654321`) | OTP: `123456` | Tự khai triệu chứng, đặt lịch khám tại nhà |
