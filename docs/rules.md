# QUY TẮC LUẬT CỜ TƯỚNG & KÝ HIỆU (XIANGQI RULES & NOTATION)

Tài liệu này định nghĩa chi tiết các quy tắc luật cờ, quy ước ký hiệu nước đi tiếng Việt, và các ràng buộc kết thúc ván được cài đặt trong hệ thống.

---

## 1. Hệ tọa độ & Bàn cờ

* **Kích thước**: 9 cột dọc (files `a` đến `i` từ trái sang phải theo góc nhìn của bên Đỏ) và 10 hàng ngang (ranks `1` đến `10` từ đáy Đỏ lên đỉnh Đen).
* **Điểm giao cắt**: 90 điểm (ô cờ dạng `a1` đến `i10`).
* **Cung (Palace / Cửu cung)**:
  * Bên Đỏ: cột `d` đến `f` (cột 4–6), hàng `1` đến `3` (hàng 1–3).
  * Bên Đen: cột `d` đến `f` (cột 4–6), hàng `8` đến `10` (hàng 8–10).
* **Sông (River / Sở Hà - Hán Giới)**: Ranh giới nằm giữa hàng 5 và hàng 6.

---

## 2. Quy tắc di chuyển 7 loại quân

1. **Tướng (General / King)**:
   * Di chuyển từng ô một theo chiều dọc hoặc ngang, chỉ được nằm trong phạm vi Cung.
   * **Luật Lộ mặt Tướng (Flying General / Tướng đối mặt)**: Hai Tướng của hai bên không được nhìn thẳng vào nhau trên cùng một cột dọc mà không có bất kỳ quân cờ nào ở giữa.
2. **Sĩ (Advisor / Guard)**:
   * Di chuyển từng ô một theo đường chéo, chỉ được nằm trong Cung (tối đa có 5 điểm hợp lệ trong Cung).
3. **Tượng (Elephant / Bishop)**:
   * Di chuyển chéo 2 ô (hình chữ điền), không được qua sông.
   * **Cản mắt Tượng**: Nếu có một quân cờ nằm ngay tại trung điểm đường chéo (mắt Tượng), Tượng bị cản và không thể nhảy qua ô đó.
4. **Mã (Horse / Knight)**:
   * Di chuyển theo hình chữ L (1 ô thẳng + 1 ô chéo).
   * **Cản chân Mã**: Nếu có quân cờ nằm ngay ô kề sát theo hướng đi thẳng đầu tiên (chân Mã), Mã bị cản và không thể thực hiện nước nhảy đó.
5. **Xe (Rook / Chariot)**:
   * Di chuyển tùy ý theo chiều ngang hoặc dọc miễn là không bị cản bởi quân khác.
6. **Pháo (Cannon)**:
   * Di chuyển không ăn quân: Giống hệt Xe (đi thẳng, ngang không giới hạn ô trống).
   * Di chuyển ăn quân: Bắt buộc phải có đúng một quân cờ bất kỳ (quân của ta hoặc đối phương) làm "ngòi" (hurdle) ở giữa trên đường đi, và ăn quân đầu tiên nằm phía sau ngòi đó.
7. **Tốt (Pawn / Soldier)**:
   * Chưa qua sông: Chỉ được tiến thẳng từng ô một.
   * Đã qua sông: Được tiến thẳng 1 ô hoặc đi ngang sang trái/phải 1 ô.
   * Tốt không bao giờ được đi lùi (thoái).

---

## 3. Quy ước Ký hiệu Nước đi Tiếng Việt

Cột được đánh số từ `1` đến `9` theo góc nhìn của bên đang đi (từ phải sang trái của chính bên đó):
* Bên Đỏ: Cột `i` là cột 1, cột `a` là cột 9.
* Bên Đen: Cột `a` là cột 1, cột `i` là cột 9.

### 3.1. Trường hợp chuẩn (1 quân trên cột)
* Dạng đầy đủ: `[Tên quân] [Cột xuất phát] [tiến/thoái/bình] [Số bước / Cột đích]` (VD: `Pháo 2 bình 5`, `Mã 8 tiến 7`, `Xe 9 tiến 8`, `Xe 9 thoái 2`).
* Dạng rút gọn: `[Ký hiệu][Cột xuất phát][./-/][Số bước / Cột đích]` (VD: `P2-5`, `M8.7`, `X9.8`, `X9/2`).
  * `.` : Tiến
  * `/` : Thoái
  * `-` : Bình

### 3.2. Trường hợp 2 quân cùng loại trên cùng một cột
* Dạng đầy đủ:
  * Quân phía trước (gần phía đối phương hơn): `[Tên quân] trước [tiến/thoái/bình] [Số bước / Cột đích]` (VD: `Pháo trước bình 5`, `Xe trước thoái 1`).
  * Quân phía sau: `[Tên quân] sau [tiến/thoái/bình] [Số bước / Cột đích]` (VD: `Pháo sau tiến 2`).
* Dạng rút gọn: `Tiền [Ký hiệu] [./-/] [Giá trị]` hoặc `Hậu [Ký hiệu] [./-/] [Giá trị]` (VD: `Tiền P-5`, `Hậu X.2`).

### 3.3. Trường hợp 3 quân Tốt cùng nằm trên một cột
* Dạng đầy đủ:
  * Tốt phía trước nhất: `Tiền Tốt [tiến/bình] [Giá trị]` (hoặc `Tốt 1`).
  * Tốt ở giữa: `Trung Tốt [tiến/bình] [Giá trị]` (hoặc `Tốt 2`).
  * Tốt ở sau cùng: `Hậu Tốt [tiến/bình] [Giá trị]` (hoặc `Tốt 3`).
* Dạng rút gọn: `Tiền B.1`, `Trung B-5`, `Hậu B.1`.

### 3.4. Trường hợp 4 hoặc 5 quân Tốt cùng nằm trên một cột
* Đánh số thứ tự từ trước về sau: `Tốt 1`, `Tốt 2`, `Tốt 3`, `Tốt 4`, `Tốt 5` (VD: `Tốt 1 tiến 1`, `Tốt 3 bình 4`).
* Rút gọn: `B1.1`, `B3-4`.

---

## 4. Quy tắc Kết thúc Ván & Xử lý Hòa / Thua

Hệ thống áp dụng **Bộ Luật Châu Á Đơn Giản Hóa (AXF Simplified Rules)**:

### 4.1. Chiếu bí (Checkmate)
* Tướng bị chiếu và bên bị chiếu không còn bất kỳ nước đi hợp lệ nào để thoát chiếu $\rightarrow$ Bên bị chiếu **Thua cuộc**.

### 4.2. Hết nước đi / Bị nhốt (Stalemate)
* Đến lượt đi nhưng không bị chiếu và không có bất kỳ nước đi hợp lệ nào $\rightarrow$ Bên hết nước đi **Thua cuộc** (khác với Cờ Vua là hòa).

### 4.3. Giới hạn số nước không ăn quân (60-move rule)
* Nếu trải qua 60 nước đi của cả hai bên (120 half-moves) liên tiếp mà không có quân cờ nào bị ăn $\rightarrow$ Ván cờ xử **Hòa** (`draw_moves_limit`).

### 4.4. Lặp thế & Chiếu liên tục (Perpetual Check)
Lặp thế xảy ra khi cùng một trạng thái bàn cờ (cùng vị trí các quân và cùng bên đến lượt đi) xuất hiện **3 lần** trong ván:
1. **Đơn phương chiếu liên tục (Perpetual Check / Trường chiếu)**:
   * Nếu bên A thực hiện chiếu tướng ở tất cả các nước đi trong chu kỳ lặp lại thế cờ $\rightarrow$ Bên A bắt buộc phải đổi nước, nếu tiếp tục để lặp thế lần thứ 3 thì bên A bị **Xử Thua** (`loss_perpetual_check`).
2. **Song phương chiếu liên tục**:
   * Nếu cả hai bên cùng luân phiên chiếu tướng lẫn nhau trong chu kỳ lặp $\rightarrow$ Xử **Hòa** (`draw_repetition`).
3. **Lặp thế thông thường (Repetition không chiếu)**:
   * Nếu không có bên nào chiếu liên tục $\rightarrow$ Xử **Hòa** (`draw_repetition`).

### 4.5. Điểm mở rộng chưa hỗ trợ (Out of Scope for Stage 1)
* **Luật Đuổi bắt quân liên tục (Perpetual Chase / Trường Tróc)**: Luật phân biệt giữa chiếu bắt quân (tróc) và quân phòng thủ rất phức tạp theo các biến thể của Liên đoàn Cờ tướng Châu Á (AXF / WXF). Giai đoạn 1 tạm thời chưa cài đặt luật đuổi bắt quân liên tục, chỉ xử lý lặp thế thường và trường chiếu. Hệ thống để sẵn cờ mở rộng `isChase` trong cấu trúc Move để nâng cấp ở giai đoạn sau.
