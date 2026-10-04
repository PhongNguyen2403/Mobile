# 📘 TÀI LIỆU ĐẶC TẢ NGHIỆP VỤ HỆ THỐNG
# QUẢN LÝ KHÁM CHỮA BỆNH TẠI NHÀ & CHĂM SÓC BỆNH NHÂN (HOME HEALTHCARE & PATIENT CRM)

---

## 📑 MỤC LỤC
1. [TỔNG QUAN HỆ THỐNG](#1-tổng-quan-hệ-thống)
   - 1.1. Bối cảnh & Mục tiêu
   - 1.2. Đối tượng thụ hưởng & Mô hình vận hành
2. [MA TRẬN PHÂN QUYỀN & VAI TRÒ (RBAC)](#2-ma-trận-phân-quyền--vai-trò-rbac)
   - 2.1. Định danh các nhóm Actor
   - 2.2. Ma trận phân quyền chức năng
3. [CÁC QUY TRÌNH NGHIỆP VỤ CHÍNH (BUSINESS PROCESSES)](#3-các-quy-trình-nghiệp-vụ-chính-business-processes)
   - 3.1. Quy trình Khai báo triệu chứng Body Map & Đặt lịch khám
   - 3.2. Quy trình Khám chữa bệnh tại nhà & Kê đơn thuốc (Bác sĩ)
   - 3.3. Quy trình Phân công & Chăm sóc khách hàng (CSKH)
   - 3.4. Quy trình Bác sĩ yêu cầu đổi/hủy lịch hẹn
   - 3.5. Chu trình Tự động nhắc lịch Tái khám (Cron Job)
4. [CÁC QUY TẮC NGHIỆP VỤ CỐT LÕI (CORE BUSINESS RULES)](#4-các-quy-tắc-nghiệp-vụ-cốt-lõi-core-business-rules)
   - Rule 1: Nguyên tắc Phân công CSKH độc quyền
   - Rule 2: Phân lập Dữ liệu tự khai và Dữ liệu lâm sàng
   - Rule 3: Cảnh báo Pháp lý Y tế đối với Sản phẩm gợi ý
   - Rule 4: Tự động hóa Vòng đời Tái khám
   - Rule 5: Máy trạng thái Lịch hẹn (Appointment State Machine)
   - Rule 6: Cơ chế Quét tự động & Cảnh báo thông báo
   - Rule 7: Bảo mật Dữ liệu Sức khỏe & Quyền riêng tư (PII)
5. [MÔ HÌNH THỰC THỂ DỮ LIỆU & QUAN HỆ (DOMAIN DATA MODEL)](#5-mô-hình-thực-thể-dữ-liệu--quan-hệ-domain-data-model)
   - 5.1. Sơ đồ Thực thể Quan hệ (ERD)
   - 5.2. Giải nghĩa các thực thể dữ liệu nghiệp vụ
6. [DANH MỤC TRẠNG THÁI & MÃ HÓA NGHIỆP VỤ (ENUMS & CODES)](#6-danh-mục-trạng-thái--mã-hóa-nghiệp-vụ-enums--codes)

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1. Bối cảnh & Mục tiêu
Hệ thống **Home Healthcare & Patient CRM** là giải pháp phần mềm y tế phục vụ mô hình **khám chữa bệnh tại nhà kết hợp chăm sóc khách hàng chủ động**. Mục tiêu cốt lõi:
- **Tối ưu hóa hành trình bệnh nhân**: Cho phép bệnh nhân mô tả trực quan triệu chứng trên mô hình người 2D/3D (Body Map), nhận thông tin tư vấn tham khảo sơ bộ và đặt lịch bác sĩ đến tận nhà thăm khám.
- **Chuẩn hóa hồ sơ bệnh án điện tử (EMR)**: Bác sĩ ghi nhận kết quả khám, chẩn đoán theo mã ICD, kê đơn thuốc điện tử và lên lịch tái khám chính xác.
- **Chăm sóc khách hàng toàn diện (CRM y tế)**: Phân luồng mỗi bệnh nhân cho một nhân viên CSKH quản lý, theo dõi lịch sử tương tác, nhật ký sức khỏe và tự động hóa nhắc nhở tái khám.

### 1.2. Đối tượng thụ hưởng & Mô hình vận hành
```mermaid
flowchart LR
    Patient((Bệnh nhân)) <-->|Khai triệu chứng / Đặt lịch| App[Hệ Thống Backend API]
    Doctor((Bác sĩ / Điều dưỡng)) <-->|Khám tại nhà / Kê đơn| App
    CSKH((Nhân viên CSKH)) <-->|Chăm sóc / Phân luồng| App
    Admin((Quản trị viên)) <-->|Quản lý Danh mục & User| App
```

---

## 2. MA TRẬN PHÂN QUYỀN & VAI TRÒ (RBAC)

### 2.1. Định danh các nhóm Actor
| Mã Role | Tên hiển thị | Kênh truy cập | Trách nhiệm chính |
| :--- | :--- | :--- | :--- |
| `patient` | Bệnh nhân / Khách hàng | Mobile App | Đăng ký qua SĐT/OTP, tự khai triệu chứng qua Body Map, đặt lịch khám, xem bệnh án & đơn thuốc của chính mình |
| `doctor` | Bác sĩ khám tại nhà | Mobile / Web App | Xem lịch được phân công, đến nhà khám bệnh, chẩn đoán, xác nhận triệu chứng, kê đơn, hẹn tái khám |
| `nurse` | Điều dưỡng tại nhà | Mobile / Web App | Xem lịch khám, hỗ trợ lấy mẫu/thực hiện y lệnh chăm sóc tại nhà |
| `cskh` | Nhân viên CSKH | Web CRM / App | Phân công phụ trách khách, gọi điện/nhắn tin chăm sóc, theo dõi dashboard tái khám, hỗ trợ đặt lịch |
| `admin` | Quản trị viên hệ thống | Web Admin | Quản lý danh mục y tế (bệnh, triệu chứng, thuốc, vị trí giải phẫu), tài khoản nhân viên, cấu hình hệ thống |

### 2.2. Ma trận phân quyền chức năng
| Module / Nghiệp vụ | Patient | Doctor | Nurse | CSKH | Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Đăng ký OTP & Đăng nhập khách** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Đăng nhập nội bộ (Email/Pass)** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Xem Body Map & Gợi ý sơ bộ** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Tạo phiên tự khai triệu chứng** | ✅ | ❌ | ❌ | ✅ (hộ) | ❌ |
| **Đặt lịch hẹn khám tại nhà** | ✅ | ❌ | ❌ | ✅ (hộ) | ✅ |
| **Xem danh sách lịch hẹn** | ✅ (chính mình)| ✅ (được phân) | ✅ (được phân) | ✅ (toàn bộ) | ✅ (toàn bộ) |
| **Cập nhật trạng thái lịch hẹn** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Gửi yêu cầu đổi/hủy lịch bác sĩ phụ trách** | ❌ | ✅ (lịch được phân công) | ❌ | ❌ | ❌ |
| **Xem và xử lý yêu cầu đổi/hủy lịch** | ✅ (chọn phương án) | ❌ | ❌ | ✅ | ✅ |
| **Phân công Bác sĩ/Điều dưỡng** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Ghi nhận kết quả khám & chẩn đoán**| ❌ | ✅ | ❌ | ❌ | ✅ |
| **Kê đơn thuốc điện tử** | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Xem hồ sơ & Lịch sử khám** | ✅ (chính mình)| ✅ | ✅ | ✅ | ✅ |
| **Quản lý danh mục y tế & Thuốc** | ❌ | Xem | Xem | Xem | ✅ (CRUD) |
| **Phân công CSKH phụ trách** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Ghi nhật ký CSKH (Care Logs)** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Dashboard CSKH** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Quản lý tài khoản nhân viên** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 3. CÁC QUY TRÌNH NGHIỆP VỤ CHÍNH (BUSINESS PROCESSES)

### 3.1. Quy trình Khai báo triệu chứng Body Map & Đặt lịch khám
Quy trình giúp bệnh nhân định vị vị trí đau trên cơ thể và chuyển đổi thành yêu cầu khám:

```mermaid
sequenceDiagram
    autonumber
    actor P as Bệnh nhân (App)
    participant API as Backend System
    participant DB as Database

    P->>API: 1. GET /api/body-parts?viewSide=front/back
    API-->>P: Danh sách điểm giải phẫu (Tọa độ, Mã bộ phận)
    P->>API: 2. POST /api/symptom-reports (Khởi tạo phiên tự khai)
    API-->>P: reportId
    P->>API: 3. POST /api/symptom-reports/:id/items (Chọn điểm đau + triệu chứng + mức độ)
    API-->>P: Xác nhận lưu triệu chứng
    P->>API: 4. GET /api/symptom-reports/:id
    API-->>P: Chi tiết phiên khai + Gợi ý thuốc/TPCN (is_reference_only: true)
    P->>API: 5. POST /api/symptom-reports/:id/convert-to-appointment
    Note over API,DB: Tạo appointment (status: pending, type: first_visit)<br/>Đổi status report sang 'converted_to_appointment'
    API-->>P: Thông tin lịch hẹn mới + Gửi thông báo xác nhận
```

### 3.2. Quy trình Khám chữa bệnh tại nhà & Kê đơn thuốc (Bác sĩ)
Bác sĩ thực hiện quy trình nghiệp vụ chuyên môn độc lập:

```mermaid
sequenceDiagram
    autonumber
    actor D as Bác sĩ
    participant API as Backend System
    participant DB as Database
    actor P as Bệnh nhân

    D->>API: 1. GET /api/appointments?staff_id=doctor_id (Lấy lịch hẹn)
    D->>API: 2. PATCH /api/appointments/:id/status (Chuyển sang 'in_progress')
    Note over D: Bác sĩ đến nhà bệnh nhân thăm khám lâm sàng
    D->>API: 3. POST /api/examinations
    Note over API,DB: - Lưu chẩn đoán & liên kết report_id tự khai (nếu có)<br/>- Lưu triệu chứng xác nhận vào examination_symptoms<br/>- Tự động tạo follow_up_schedules nếu có next_visit_date<br/>- Cập nhật appointment sang 'completed'
    API-->>D: examinationId
    D->>API: 4. POST /api/examinations/:id/prescriptions
    Note over API,DB: Lưu đơn thuốc + chi tiết liều dùng từng thuốc/TPCN
    API-->>D: Đơn thuốc chính thức
    API-->>P: Gửi Notification kết quả khám & đơn thuốc điện tử
```

### 3.3. Quy trình Phân công & Chăm sóc khách hàng (CSKH)
Quy tắc một cửa chăm sóc bệnh nhân:

```mermaid
flowchart TD
    A[Bệnh nhân mới đăng ký / khám xong] --> B{Đã có CSKH phụ trách chưa?}
    B -- Chưa có / Cần đổi CSKH --> C[Admin / Leader CSKH gọi POST /api/cskh/assignments]
    C --> D[Transaction: Đóng assignment cũ is_active = false]
    D --> E[Mở assignment mới is_active = true]
    E --> F[Cập nhật patients.assigned_cskh_id = new_staff_id]
    B -- Đã có CSKH --> G[CSKH truy cập Dashboard /api/cskh/dashboard]
    G --> H[Theo dõi: Lịch tái khám sắp tới của khách phụ trách]
    H --> I[Liên hệ bệnh nhân qua Điện thoại / Zalo / Thăm hỏi]
    I --> J[Ghi nhật ký: POST /api/cskh/care-logs]
```

### 3.4. Quy trình Bác sĩ yêu cầu đổi/hủy lịch hẹn
Bác sĩ không tự ý đổi hoặc hủy lịch đã phân công. CSKH tiếp nhận yêu cầu, thông báo để bệnh nhân chọn phương án; sau lựa chọn, CSKH duyệt đổi giờ hoặc phân công bác sĩ thay thế.

```mermaid
sequenceDiagram
    autonumber
    actor D as Bác sĩ phụ trách
    participant API as Backend
    participant DB as Database
    actor C as CSKH
    actor P as Bệnh nhân
    actor D2 as Bác sĩ thay thế

    D->>API: POST /api/appointments/:id/doctor-change-request<br/>{action: reschedule | cancel, reason}
    API->>API: Xác thực bác sĩ được phân công<br/>và lịch chưa bắt đầu khám
    API->>DB: Tạo appointment_change_request<br/>initiated_by_role=doctor, status=pending
    API->>DB: Tạo notification cho CSKH phụ trách
    API-->>D: Xác nhận đã gửi yêu cầu

    C->>API: GET /api/appointments/change-requests?status=pending
    API-->>C: Danh sách yêu cầu kèm lịch hẹn và bệnh nhân
    C->>API: POST /api/appointments/change-requests/:requestId/notify-patient
    API->>DB: Chuyển yêu cầu sang awaiting_patient
    API->>DB: Tạo notification cho bệnh nhân
    API-->>P: Thông báo chọn đổi ngày hoặc đổi bác sĩ
    P->>API: GET /api/appointments/change-requests?status=awaiting_patient
    Note over API,DB: Backend lấy patient_id từ token,<br/>không nhận patient_id từ query
    API-->>P: Danh sách yêu cầu đang chờ lựa chọn của chính bệnh nhân

    alt Bệnh nhân chọn đổi ngày
        P->>API: PATCH /api/appointments/change-requests/:requestId/patient-choice<br/>{choice: reschedule, requestedScheduledAt}
    else Bệnh nhân chọn đổi bác sĩ
        P->>API: PATCH /api/appointments/change-requests/:requestId/patient-choice<br/>{choice: change_doctor}
    end
    API->>DB: Lưu lựa chọn; chuyển về pending
    API->>DB: Tạo notification cho CSKH
    API-->>C: Yêu cầu được đưa lại vào hàng đợi xử lý

    alt Bệnh nhân chọn đổi ngày
        C->>API: PATCH /api/appointments/change-requests/:requestId/review<br/>{decision: approved}
        API->>API: Kiểm tra giờ làm và trùng lịch bác sĩ
        API->>DB: Cập nhật scheduled_at và đánh dấu approved
    else Bệnh nhân chọn đổi bác sĩ
        C->>API: PATCH /api/appointments/change-requests/:requestId/review<br/>{decision: approved, assignedStaffId}
        API->>API: Kiểm tra bác sĩ thay thế đang hoạt động<br/>và không trùng lịch
        API->>DB: Cập nhật assigned_staff_id và đánh dấu approved
        API->>DB: Tạo notification cho bác sĩ thay thế
        API-->>D2: Thông báo được phân công lịch khám
    end
    API->>DB: Gửi notification kết quả cho bệnh nhân
    API-->>P: Thông báo kết quả xử lý
```

**Quy tắc xử lý**
- Chỉ bác sĩ đang được phân công mới gửi yêu cầu cho lịch đó; lịch phải ở trạng thái chưa bắt đầu khám (`pending` hoặc `confirmed`) và chưa đến giờ hẹn.
- Khi bác sĩ gửi yêu cầu, lịch hiện tại không tự thay đổi. CSKH thông báo bệnh nhân trước khi yêu cầu chuyển sang `awaiting_patient`.
- Bệnh nhân chọn một trong hai phương án: đổi ngày/giờ trong khung 07:00–21:00 (lượt khám 30 phút) hoặc đổi sang bác sĩ khác. Bệnh nhân không trực tiếp chọn bác sĩ thay thế.
- Lựa chọn của bệnh nhân đưa yêu cầu về `pending` để CSKH xử lý. Với phương án đổi bác sĩ, CSKH phải gửi `assignedStaffId` khi duyệt; backend xác thực người được phân công là bác sĩ đang hoạt động và kiểm tra trùng lịch.
- Nếu CSKH từ chối, lịch không đổi; bệnh nhân nhận thông báo kết quả. Các bước duyệt và cập nhật lịch được thực hiện trong transaction để tránh cập nhật dở dang.

### 3.5. Chu trình Tự động nhắc lịch Tái khám (Cron Job)
Cơ chế tự động hóa vận hành mỗi 07:00 sáng hằng ngày:

```mermaid
flowchart TD
    Start([07:00 Sáng mỗi ngày]) --> Trigger[Cron Job notification.cron.ts kích hoạt]
    Trigger --> Query[Quét bảng follow_up_schedules:<br/>- next_visit_date trong vòng 3 ngày tới<br/>- status in 'scheduled', 'confirmed'<br/>- reminder_sent = false]
    Query --> Check{Có lịch đến hạn?}
    Check -- Không --> Done([Kết thúc phiên quét])
    Check -- Có --> Loop[Duyệt từng lịch tái khám]
    Loop --> NotifPatient[Tạo notification cho Bệnh nhân:<br/>type: follow_up_reminder]
    Loop --> NotifCSKH[Tìm CSKH đang active của bệnh nhân<br/>Tạo notification cho CSKH phụ trách]
    Loop --> UpdateSchedule[Cập nhật follow_up_schedules:<br/>- reminder_sent = true<br/>- status = 'reminded']
    UpdateSchedule --> Done
```

---

## 4. CÁC QUY TẮC NGHIỆP VỤ CỐT LÕI (CORE BUSINESS RULES)

### 📌 Rule 1: Nguyên tắc Phân công CSKH độc quyền (Single Active CSKH)
- **Mục tiêu**: Tránh tình trạng nhiều nhân viên CSKH cùng lúc liên hệ làm phiền khách hàng, hoặc ngược lại bỏ quên khách hàng.
- **Ràng buộc**: Tại mọi thời điểm, một bệnh nhân **chỉ có duy nhất 1 bản ghi `cskh_assignments` có `is_active = true`**.
- **Cơ chế kỹ thuật**: 
  - Thực thi thông qua **Prisma Database Transaction** (`tx.$transaction`).
  - Khi tạo phân công mới: Tìm mọi phân công đang active của bệnh nhân đó ➔ cập nhật `is_active = false`, `unassigned_at = NOW()` ➔ tạo bản ghi mới với `is_active = true` ➔ cập nhật trường `patients.assigned_cskh_id`.

### 📌 Rule 2: Phân lập Dữ liệu tự khai và Dữ liệu lâm sàng
- **Mục tiêu**: Bảo đảm tính chính xác và giá trị pháp lý y khoa của bệnh án điện tử.
- **Ràng buộc**: 
  - Dữ liệu bệnh nhân tự bấm chọn trên Body Map (`patient_symptom_reports` và `patient_symptom_report_items`) là **dữ liệu chủ quan mang tính tham khảo**, **KHÔNG ĐƯỢC TỰ ĐỘNG SAO CHÉP** vào bảng triệu chứng khám bệnh chính thức (`examination_symptoms`).
  - Khi bác sĩ khám bệnh tại nhà, bác sĩ sẽ xem lại thông tin tự khai qua liên kết `examinations.report_id`. Sau khi khám thực tế, bác sĩ tự tay nhập hoặc tích chọn các triệu chứng y khoa được khẳng định vào `examination_symptoms`.

### 📌 Rule 3: Cảnh báo Pháp lý Y tế đối với Sản phẩm gợi ý (Medical Disclaimer)
- **Mục tiêu**: Tuân thủ luật khám chữa bệnh và bảo vệ sức khỏe người dùng, tránh việc người dùng tự ý mua thuốc điều trị khi chưa có chỉ định của bác sĩ.
- **Ràng buộc**:
  - Mọi API trả về danh sách gợi ý thuốc/TPCN dựa trên triệu chứng hoặc bệnh lý (`/recommendations`, `/symptom-reports/:id`) **bắt buộc phải trả về thuộc tính `is_reference_only: true`**.
  - Bắt buộc kèm theo thông điệp cảnh báo pháp lý (`disclaimer`): *"Các sản phẩm thuốc/TPCN dưới đây chỉ mang tính chất tham khảo sơ bộ dựa trên triệu chứng tự khai, KHÔNG thay thế chỉ định và đơn thuốc chính thức từ bác sĩ chuyên môn."*

### 📌 Rule 4: Tự động hóa Vòng đời Tái khám (Auto Follow-up Scheduling)
- **Mục tiêu**: Khép kín chu trình điều trị, không để sót bệnh nhân cần theo dõi sau đợt khám cấp tính hoặc mãn tính.
- **Ràng buộc**:
  - Khi bác sĩ tạo kết quả khám bệnh (`POST /api/examinations`) mà có chỉ định ngày tái khám (`next_visit_date` khác null) ➔ Hệ thống trong cùng transaction đó **phải tự động tạo ngay một bản ghi trong `follow_up_schedules`** với trạng thái `scheduled`, `reminder_sent = false`.

### 📌 Rule 5: Máy trạng thái Lịch hẹn (Appointment State Machine)
- **Mục tiêu**: Bảo đảm luồng nghiệp vụ khám diễn ra tuần tự, ngăn ngừa việc nhân viên hoặc hệ thống nhảy cóc trạng thái.
- **Sơ đồ chuyển trạng thái hợp lệ**:

```mermaid
stateDiagram-v2
    [*] --> pending: Đặt lịch hẹn mới
    pending --> confirmed: CSKH / Hệ thống xác nhận lịch
    pending --> cancelled: Hủy lịch (Khách hủy / Không xếp được lịch)

    confirmed --> in_progress: Bác sĩ bắt đầu đến khám
    confirmed --> cancelled: Hủy lịch sau khi đã xác nhận
    confirmed --> no_show: Bệnh nhân vắng mặt tại địa chỉ hẹn

    in_progress --> completed: Bác sĩ hoàn thành khám & gửi bệnh án
    in_progress --> cancelled: Hủy do sự cố đột xuất tại chỗ

    completed --> [*]
    cancelled --> [*]
    no_show --> [*]
```

- **Quy tắc chặn**:
  - Tuyệt đối không cho phép chuyển từ `pending` sang `completed` (bắt buộc phải qua bước khám).
  - Trạng thái `completed`, `cancelled`, `no_show` là trạng thái kết thúc (Terminal states), không thể đổi sang bất kỳ trạng thái nào khác.

### 📌 Rule 6: Cơ chế Quét tự động & Cảnh báo thông báo
- **Mục tiêu**: Tự động thông báo trước cho bệnh nhân chuẩn bị và nhắc CSKH liên hệ chăm sóc.
- **Ràng buộc**:
  - Định kỳ mỗi ngày vào 07:00 sáng, hệ thống tự động quét các lịch tái khám nằm trong khoảng `[hôm nay, hôm nay + X ngày]` (mặc định X = 3 ngày) mà chưa gửi nhắc (`reminder_sent = false`).
  - Gửi thông báo kép:
    1. Thông báo cho Bệnh nhân (`patient_id`).
    2. Thông báo cho CSKH đang phụ trách (`user_id` của CSKH active).
  - Cập nhật `reminder_sent = true`, chuyển trạng thái `status = 'reminded'`.

### 📌 Rule 7: Bảo mật Dữ liệu Sức khỏe & Quyền riêng tư (PII & Medical Privacy)
- **Mục tiêu**: Đảm bảo an toàn thông tin cá nhân và bảo mật dữ liệu y tế theo chuẩn quốc tế.
- **Ràng buộc**:
  - Bệnh nhân chỉ có quyền đọc và sửa thông tin của chính mình (`patientAccessGuard`). Không thể xem dữ liệu khám, đơn thuốc, lịch hẹn của bệnh nhân khác bằng cách đổi ID trên URL.
  - Mật khẩu của nhân viên nội bộ luôn được mã hóa một chiều bằng thuật toán `bcrypt` với `saltRounds = 10`.
  - Token JWT phân tách rõ: `accessToken` (thời hạn ngắn: 15 phút) và `refreshToken` (thời hạn dài: 7 ngày).

---

## 5. MÔ HÌNH THỰC THỂ DỮ LIỆU & QUAN HỆ (DOMAIN DATA MODEL)

### 5.1. Sơ đồ Thực thể Quan hệ (ERD Nghiệp Vụ)

```mermaid
erDiagram
    roles ||--o{ users : "defines role"
    users ||--o{ appointments : "assigned to / created by"
    users ||--o{ examinations : "doctor examines"
    users ||--o{ prescriptions : "prescribes"
    users ||--o{ cskh_assignments : "cskh staff assigned"
    users ||--o{ cskh_care_logs : "creates log"
    users ||--o{ notifications : "receives"

    patients ||--o{ appointments : "books"
    patients ||--o{ patient_medical_history : "has"
    patients ||--o{ patient_symptom_reports : "submits"
    patients ||--o{ examinations : "undergoes"
    patients ||--o{ prescriptions : "receives"
    patients ||--o{ follow_up_schedules : "scheduled for"
    patients ||--o{ cskh_assignments : "assigned to CSKH"
    patients ||--o{ cskh_care_logs : "care history"
    patients ||--o{ notifications : "receives"

    body_parts ||--o{ body_parts : "parent hierarchy"
    body_parts ||--o{ patient_symptom_report_items : "located at"

    symptoms ||--o{ patient_symptom_report_items : "reported"
    symptoms ||--o{ examination_symptoms : "doctor confirmed"
    symptoms ||--o{ disease_symptoms : "manifests in"
    symptoms ||--o{ symptom_product_recommendations : "suggests"

    diseases ||--o{ disease_symptoms : "associated with"
    diseases ||--o{ examinations : "diagnosed as"
    diseases ||--o{ disease_product_recommendations : "suggests"

    products ||--o{ symptom_product_recommendations : "recommended"
    products ||--o{ disease_product_recommendations : "recommended"
    products ||--o{ prescription_items : "prescribed in"

    patient_symptom_reports ||--o{ patient_symptom_report_items : "contains"
    patient_symptom_reports ||--o{ examinations : "referenced by"

    appointments ||--o{ examinations : "results in"
    examinations ||--o{ examination_symptoms : "confirmed symptoms"
    examinations ||--o{ prescriptions : "orders"
    examinations ||--o{ follow_up_schedules : "triggers next visit"

    prescriptions ||--o{ prescription_items : "contains items"
```

### 5.2. Giải nghĩa các thực thể dữ liệu nghiệp vụ

| Tên bảng / Entity | Ý nghĩa nghiệp vụ |
| :--- | :--- |
| `roles` | Bảng danh mục vai trò hệ thống: `admin`, `doctor`, `nurse`, `cskh`. |
| `users` | Tài khoản nhân viên nội bộ của cơ sở y tế (Bác sĩ, Điều dưỡng, CSKH, Quản trị viên). |
| `patients` | Hồ sơ thông tin hành chính của bệnh nhân/khách hàng (Họ tên, ngày sinh, giới tính, địa chỉ, bảo hiểm, người liên hệ khẩn cấp). |
| `patient_medical_history` | Tiền sử bệnh lý, dị ứng thuốc, bệnh mạn tính của bệnh nhân. |
| `body_parts` | Tọa độ và danh mục các điểm giải phẫu trên mô hình cơ thể 2D/3D (Mặt trước/Mặt sau). |
| `patient_symptom_reports` | Phiên tự khai báo triệu chứng của bệnh nhân trên ứng dụng di động. |
| `patient_symptom_report_items`| Chi tiết từng điểm đau, triệu chứng và mức độ nghiêm trọng bệnh nhân tự khai. |
| `symptoms` | Danh mục chuẩn các triệu chứng y tế (Sốt, đau đầu, ho, đau bụng,...). |
| `diseases` | Danh mục bệnh lý chuẩn y khoa kèm mã phân loại quốc tế ICD-10. |
| `disease_symptoms` | Bảng liên kết ánh xạ bệnh lý với các triệu chứng đặc trưng. |
| `products` | Danh mục Thuốc kê đơn, Thuốc không kê đơn và Thực phẩm chức năng (TPCN). |
| `symptom_product_recommendations` | Cấu hình gợi ý sản phẩm tham khảo theo triệu chứng sơ bộ. |
| `disease_product_recommendations` | Cấu hình gợi ý sản phẩm tham khảo theo bệnh lý sơ bộ. |
| `appointments` | Lịch hẹn khám chữa bệnh tại nhà của bệnh nhân (Thời gian hẹn, địa chỉ khám, trạng thái). |
| `appointment_change_requests` | Lưu yêu cầu đổi/hủy lịch của bệnh nhân, thời gian mong muốn, lý do và trạng thái duyệt của nhân viên. |
| `examinations` | Hồ sơ kết quả khám bệnh tại nhà do Bác sĩ lập (Chẩn đoán, ghi chú lâm sàng, ngày hẹn tái khám). |
| `examination_symptoms` | Các triệu chứng lâm sàng thực tế được Bác sĩ kiểm tra và xác nhận trong buổi khám. |
| `prescriptions` | Đơn thuốc điện tử chính thức được Bác sĩ ban hành sau buổi khám. |
| `prescription_items` | Chi tiết các loại thuốc trong đơn (Liều lượng, cách dùng, số lượng, số ngày uống). |
| `follow_up_schedules` | Kế hoạch lịch hẹn tái khám của bệnh nhân, theo dõi trạng thái gửi nhắc nhở. |
| `notifications` | Hộp thư thông báo trong ứng dụng cho cả bệnh nhân và nhân viên (Nhắc lịch, xác nhận lịch, chăm sóc). |
| `cskh_assignments` | Lịch sử và trạng thái phân công nhân viên CSKH phụ trách từng bệnh nhân. |
| `cskh_care_logs` | Sổ nhật ký ghi lại các lần tương tác chăm sóc khách hàng (Cuộc gọi, nhắn tin, Zalo, thăm hỏi). |

---

## 6. DANH MỤC TRẠNG THÁI & MÃ HÓA NGHIỆP VỤ (ENUMS & CODES)

### 6.1. Trạng thái Lịch hẹn (`appointment_status`)
- `pending`: Khách hàng vừa đặt lịch hoặc vừa tạo từ Body Map, đang đợi xác nhận.
- `confirmed`: Đã được CSKH/Hệ thống gọi điện xác nhận và sắp xếp nhân sự khám.
- `in_progress`: Bác sĩ/Điều dưỡng đang di chuyển đến nhà hoặc đang thực hiện khám tại chỗ.
- `completed`: Đã hoàn tất buổi khám, đã lập kết quả khám và kê đơn thuốc xong.
- `cancelled`: Lịch hẹn bị hủy do khách hàng yêu cầu hoặc không bố trí được nhân sự.
- `no_show`: Bác sĩ đến địa chỉ hẹn nhưng không gặp được bệnh nhân / bệnh nhân vắng mặt.

### 6.2. Loại hình Lịch hẹn (`appointment_type`)
- `first_visit`: Khám lần đầu tiên hoặc khám một đợt bệnh mới phát sinh.
- `follow_up`: Khám tái khám theo chỉ định của đợt khám trước đó.
- `emergency`: Yêu cầu khám ưu tiên khẩn cấp tại nhà.

### 6.3. Yêu cầu thay đổi lịch hẹn
- `appointment_change_action`: `reschedule` (yêu cầu đổi ngày/giờ) hoặc `cancel` (yêu cầu hủy lịch).
- `appointment_change_request_status`: `pending` (chờ CSKH xử lý), `awaiting_patient` (đang chờ bệnh nhân chọn phương án), `approved` (đã duyệt) hoặc `rejected` (đã từ chối).
- `initiated_by_role` ghi nhận `patient` hoặc `doctor`; `patient_choice` ghi nhận `reschedule` hoặc `change_doctor`.
- Mỗi yêu cầu liên kết với lịch hẹn và bệnh nhân; người duyệt, thời điểm duyệt và ghi chú xử lý được lưu riêng để bảo toàn lịch sử.
- Bệnh nhân gửi yêu cầu tại `POST /api/appointments/:id/change-request` với `action` là `reschedule` kèm `requestedScheduledAt` theo ISO 8601, hoặc `cancel`; có thể gửi thêm `reason`.
- Chỉ chủ lịch hẹn được gửi yêu cầu khi lịch ở trạng thái `pending`/`confirmed` và chưa đến giờ khám. Yêu cầu được gửi cho CSKH đang phụ trách bệnh nhân; nếu chưa có CSKH phụ trách thì gửi tới các tài khoản CSKH đang hoạt động. Lịch không đổi cho đến khi CSKH xử lý; mỗi lịch chỉ có một yêu cầu `pending` tại một thời điểm.
- CSKH/Admin lấy hàng đợi bằng `GET /api/appointments/change-requests?status=pending&page=1&limit=10`; có thể lọc thêm `appointmentId` và dùng `status=approved` hoặc `status=rejected` để xem lịch sử.
- CSKH/Admin xử lý bằng `PATCH /api/appointments/change-requests/:requestId/review` với `{ "decision": "approved" | "rejected", "reviewNote": "..." }`. Duyệt yêu cầu hủy sẽ chuyển lịch sang `cancelled`; duyệt đổi lịch sẽ cập nhật `scheduled_at` sau khi kiểm tra trùng lịch bác sĩ. Từ chối không làm thay đổi lịch. Bệnh nhân nhận thông báo kết quả.
- Bác sĩ phụ trách yêu cầu đổi/hủy bằng `POST /api/appointments/:id/doctor-change-request` với `{ "action": "reschedule" | "cancel", "reason": "..." }`. Yêu cầu được gửi cho CSKH, chưa tự thay đổi lịch; bác sĩ chỉ được yêu cầu với lịch được phân công và chưa bắt đầu.
- CSKH thông báo lựa chọn cho bệnh nhân bằng `POST /api/appointments/change-requests/:requestId/notify-patient`. Yêu cầu chuyển sang `awaiting_patient`.
- Bệnh nhân xem yêu cầu đang chờ lựa chọn bằng `GET /api/appointments/change-requests?status=awaiting_patient` với Bearer token bệnh nhân. Backend lọc theo `patient_id` trong token; không nhận diện bệnh nhân theo query parameter.
- Bệnh nhân chọn `PATCH /api/appointments/change-requests/:requestId/patient-choice`: `{ "choice": "reschedule", "requestedScheduledAt": "..." }` hoặc `{ "choice": "change_doctor" }`. Lựa chọn được đưa lại vào hàng đợi `pending` cho CSKH.
- CSKH duyệt đổi ngày bằng review `decision: "approved"`; nếu bệnh nhân chọn bác sĩ khác, gửi thêm `assignedStaffId` để phân công. Hệ thống kiểm tra bác sĩ đang hoạt động và không bị trùng lịch. Việc từ chối yêu cầu gửi thông báo kết quả cho bệnh nhân.

### 6.4. Giờ làm việc và khung giờ khám
- Giờ nhận lịch khám là 07:00–21:00 theo múi giờ `Asia/Ho_Chi_Minh`; mỗi lượt khám mặc định 30 phút. Vì vậy giờ bắt đầu nhận lịch từ 07:00 đến 20:30 để lượt cuối kết thúc trước 21:00.
- Không thể tạo lịch hẹn hoặc chuyển phiên triệu chứng thành lịch với thời điểm bằng hoặc sớm hơn thời gian hiện tại. Quy tắc áp dụng cả khi đặt lịch trực tiếp và qua Body Map.
- Quy tắc giờ làm áp dụng cho đặt lịch trực tiếp, chuyển phiên triệu chứng thành lịch, yêu cầu đổi lịch và lúc CSKH duyệt đổi lịch.
- `GET /api/appointments/doctor-availability` trả thêm `businessHours` và `availableTimes` (các khung 30 phút chưa qua và chưa bị đặt).
- Bác sĩ chỉ được chuyển lịch sang `in_progress` hoặc gửi kết quả khám từ thời điểm `scheduled_at` trở đi; trước giờ hẹn API trả lỗi `400`.

### 6.5. Trạng thái Tái khám (`followup_status`)
- `scheduled`: Đã lên lịch hẹn tái khám trong tương lai.
- `reminded`: Hệ thống/CSKH đã gửi thông báo nhắc lịch cho bệnh nhân trước ngày khám.
- `confirmed`: Bệnh nhân đã xác nhận đồng ý ngày giờ tái khám.
- `completed`: Đã thực hiện khám tái khám xong (chuyển đổi thành lần khám mới).
- `missed`: Bệnh nhân bỏ lỡ lịch tái khám.
- `cancelled`: Bệnh nhân từ chối hoặc hủy lịch tái khám.

### 6.6. Loại Tương tác Chăm sóc Khách hàng (`care_interaction_type`)
- `call`: Gọi điện thoại trực tiếp thăm hỏi sức khỏe.
- `message`: Nhắn tin SMS.
- `zalo`: Nhắn tin hoặc gọi điện qua ứng dụng Zalo OA/Zalo cá nhân.
- `email`: Gửi email hướng dẫn chế độ sinh hoạt hoặc thông tin sức khỏe.
- `home_visit`: Thăm hỏi trực tiếp tại nhà bệnh nhân.
- `other`: Các kênh tương tác khác.

### 6.7. Loại Thông báo (`notification_type`)
- `follow_up_reminder`: Nhắc nhở lịch tái khám sắp đến hạn.
- `appointment_confirmation`: Thông báo lịch hẹn khám tại nhà đã được ghi nhận/xác nhận.
- `cskh_care`: Tin nhắn hỏi thăm sức khỏe sau điều trị từ nhân viên CSKH.
- `medicine_reminder`: Nhắc nhở uống thuốc đúng giờ theo đơn.
- `system`: Thông báo hệ thống, phân công công việc nội bộ.

### 6.8. Mức độ Nghiêm trọng của Triệu chứng (`severity_level`)
- `mild`: Nhẹ, chưa ảnh hưởng nhiều đến sinh hoạt.
- `moderate`: Vừa phải, bắt đầu gây khó chịu hoặc hạn chế vận động.
- `severe`: Nghiêm trọng, đau dữ dội hoặc có dấu hiệu cảnh báo nguy hiểm.

---
*Tài liệu nghiệp vụ được chuẩn hóa bởi Senior Developer - Hệ thống Home Healthcare & Patient CRM.*
