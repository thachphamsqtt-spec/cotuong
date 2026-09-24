# Báo Cáo Nghiên Cứu Tích Hợp Engine Pikafish / Fairy-Stockfish & Giấy Phép GPL

## 1. Giấy Phép & Ràng Buộc Pháp Lý (GPL-3.0)

### 1.1. Bản Quyền Pikafish & Fairy-Stockfish
- **Pikafish** và **Fairy-Stockfish** là các engine mã nguồn mở phái sinh từ **Stockfish**, được phân phối theo giấy phép **GNU General Public License v3.0 (GPL-3.0)**.
- **Quy định chính của GPL-3.0**:
  - **Copyleft mạnh mẽ**: Bất kỳ sản phẩm kết hợp phái sinh nào (derivative work / statically linked work) tích hợp mã nguồn GPL-3.0 đều bắt buộc phải công khai toàn bộ mã nguồn theo cùng giấy phép GPL-3.0.
  - **Quyền tự do của người dùng**: Người dùng phải có quyền truy cập mã nguồn, sửa đổi và biên dịch lại engine.

### 1.2. Giải Pháp Kiến Trúc Tách Biệt (Isolated Worker Architecture)
Để tuân thủ tuyệt đối giấy phép GPL-3.0 mà không làm ảnh hưởng đến mã nguồn ứng dụng web chính:
1. **Engine độc lập (Separate Program/Process)**:
   - Engine Pikafish WebAssembly chạy trong một Web Worker tách biệt hoàn toàn (`pikafish.worker.js`).
   - Giao tiếp giữa Ứng dụng Web chính và Engine diễn ra **hoàn toàn thông qua giao thức văn bản UCCI/UCI** (`postMessage` dạng dòng lệnh: `position fen ...`, `go depth ...`, `bestmove ...`).
   - Theo hướng dẫn của Free Software Foundation (FSF), việc giao tiếp qua các luồng IPC/pipe độc lập với cấu trúc thông điệp chuẩn không tạo ra "tác phẩm phái sinh kết hợp tĩnh" (static derivative work).
2. **Minh bạch & Điều khoản phân phối**:
   - Khi phát hành kèm bản build WebAssembly của Pikafish, dự án cần đính kèm file LICENSE GPL-3.0 và liên kết đến kho mã nguồn gốc của Pikafish (https://github.com/official-pikafish/Pikafish).

---

## 2. Thách Thức Kỹ Thuật WebAssembly & NNUE

### 2.1. Yêu Cầu Tài Nguyên của Pikafish WASM
1. **File Mạng Nơ-ron NNUE**: Pikafish yêu cầu tệp trọng số mạng nơ-ron đánh giá (`pikafish.nnue`) có dung lượng từ **40MB đến 100MB**.
2. **SIMD & Đa luồng (Pthreads)**:
   - Để đạt hiệu năng cao trên trình duyệt, WASM cần WebAssembly SIMD và `SharedArrayBuffer` (yêu cầu cấu hình HTTP headers `Cross-Origin-Opener-Policy: same-origin` và `Cross-Origin-Embedder-Policy: require-corp`).
   - Nếu không có COOP/COEP, engine chỉ có thể chạy ở chế độ đơn luồng (Single Thread), giảm tốc độ tính toán nhưng vẫn hoạt động tốt trên các thiết bị di động.

---

## 3. Kiến Trúc Adapter Đã Triển Khai (`UCCIEngineAdapter`)

Dự án đã hoàn thiện lớp trừu tượng `Engine` và `UCCIEngineAdapter` trong `src/ai/`:
- **`Engine` interface** (`src/ai/engineInterface.ts`):
  - `setPosition(fen, moves)`
  - `go({ depth, timeLimitMs })`
  - `stop()`
  - `onInfo` callback (depth, score, nodes, nps, pv)
- **`UCCIEngineAdapter`** (`src/ai/ucciAdapter.ts`):
  - Nhận bất kỳ `EngineTransport` nào (Web Worker, WebSocket, Native Binary).
  - Tự động phân tích cú pháp UCCI/UCI và chuyển đổi 2 chiều giữa tọa độ cờ tướng chuẩn (`e0`, `e9`, `h2e2`) và đối tượng `Move` của `DayCotuong`.
- **`BuiltinEngine`** (`src/ai/builtinEngine.ts`):
  - Engine mặc định viết bằng TypeScript, chạy trong Web Worker không tải thêm tài nguyên nặng, sẵn sàng hoạt động 100% offline ngay lập tức.
