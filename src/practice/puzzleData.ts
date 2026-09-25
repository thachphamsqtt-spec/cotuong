import { Puzzle } from './types';

export const PUZZLES: Puzzle[] = [
  // 1. Chiếu bí 1 nước: Đòn Thiết Môn Thuyên
  {
    id: 'puz-01',
    title: 'Thiết Môn Thuyên - Chiếu Bí 1 Nước',
    theme: 'mate_in_1',
    difficulty: 1,
    fen: '4ka3/4a4/9/9/9/9/9/9/R8/4K4 w - - 0 1',
    side: 'red',
    goal: 'Đỏ đi trước chiếu bí trong 1 nước cờ',
    solution: {
      move: { from: 'a2', to: 'a10' },
      commentary: 'Xe a2 tiến a10 chiếu ngang kết hợp mặt Tướng chiếu bí hoàn hảo! Hai Sĩ Đen tự cản đường thoát của Tướng.',
    },
    hints: [
      'Tướng Đỏ ở e1 đang kiểm soát cột e.',
      'Đưa Xe a2 tiến thẳng lên hàng 10 (ô a10) tấn công.',
      'Xe tiến a10 kết hợp mặt Tướng tạo thế sát cục Thiết Môn Thuyên không thể cản phá.',
    ],
  },

  // 2. Chiếu bí 1 nước: Đòn Mã Ngọa Tào
  {
    id: 'puz-02',
    title: 'Mã Ngọa Tào Tuyệt Sát',
    theme: 'mate_in_1',
    difficulty: 1,
    fen: '4ka3/9/2N6/9/9/9/9/9/R8/3K5 w - - 0 1',
    side: 'red',
    goal: 'Đỏ đi trước phối hợp Xe Mã chiếu bí',
    solution: {
      move: { from: 'a2', to: 'a10' },
      commentary: 'Xe a2 tiến thẳng lên a10 chiếu bí! Mã c8 đã khóa chặt hai ô thoát d10 và e9 của Tướng Đen, Sĩ f10 tự cản đường.',
    },
    hints: [
      'Mã Đỏ tại c8 đang khóa chặt các điểm thoát của Tướng Đen.',
      'Đưa Xe Đỏ lên hàng 10 (ô a10) tấn công trực diện.',
      'Xe tiến a10 chiếu ngang kết hợp Mã ngọa tào tạo thế sát cục không thể chống đỡ.',
    ],
  },

  // 3. Chiếu bí 2 nước: Song Pháo Trùng
  {
    id: 'puz-03',
    title: 'Song Pháo Trùng Tuyệt Kỹ',
    theme: 'mate_in_2',
    difficulty: 2,
    fen: '3k5/3a5/3C5/3C5/9/9/9/9/9/4K4 w - - 0 1',
    side: 'red',
    goal: 'Đỏ đi trước chiếu bí trong 2 nước bằng Pháo Trùng',
    solution: {
      move: { from: 'd8', to: 'e8' },
      reply: { from: 'd10', to: 'e10' },
      next: {
        move: { from: 'd7', to: 'e7' },
        commentary: 'Pháo d7 bình sang e7 mượn Pháo e8 làm ngòi chiếu bí!',
      },
    },
    hints: [
      'Bình Pháo d8 sang e8 để lộ đường chiếu của Pháo d7 qua ngòi Sĩ d9.',
      'Pháo d8 bình sang ô e8.',
      'Sau khi Tướng Đen sang e10, bình Pháo d7 sang e7 mượn Pháo e8 làm ngòi kết liễu.',
    ],
  },

  // 4. Chiếu bí 2 nước: Thang Xe Liên Hoàn
  {
    id: 'puz-04',
    title: 'Song Xe Thang Tuyệt Chiêu',
    theme: 'mate_in_2',
    difficulty: 2,
    fen: '3k5/R8/1R7/9/9/9/9/9/9/4K4 w - - 0 1',
    side: 'red',
    goal: 'Đỏ đi trước dùng hai Xe dồn Tướng Đen vào thế bí',
    solution: {
      move: { from: 'a9', to: 'a10' },
      reply: { from: 'd10', to: 'd9' },
      next: {
        move: { from: 'b8', to: 'b9' },
        commentary: 'Xe b8 tiến lên b9 chiếu bí thang Xe hoàn hảo!',
      },
    },
    hints: [
      'Dùng Xe ở hàng 9 tiến lên hàng 10 chiếu dồn Tướng Đen xuống hàng 9.',
      'Xe a9 tiến lên a10.',
      'Sau khi Tướng Đen lùi về d9, đưa Xe b8 lên b9 dứt điểm trận đấu.',
    ],
  },

  // 5. Đòn Bắt Đôi (Fork): Xe bắt đôi Pháo và Mã
  {
    id: 'puz-05',
    title: 'Chiến Thuật Bắt Đôi Quân Lực',
    theme: 'double_attack',
    difficulty: 2,
    fen: '4k4/9/4b4/2c3n2/9/9/9/9/1R7/4K4 w - - 0 1',
    side: 'red',
    goal: 'Tìm nước cờ tấn công đồng thời hai quân đối phương',
    solution: {
      move: { from: 'b2', to: 'b7' },
      commentary: 'Xe b2 tiến lên b7 khống chế ngang cả Pháo c7 và Mã g7 của Đen!',
    },
    hints: [
      'Tìm hàng ngang có cả 2 quân Pháo và Mã của Đen.',
      'Tiến Xe b2 lên hàng 7 (ô b7).',
      'Xe lên b7 tạo đòn bắt đôi, đối phương không thể giữ cả hai!',
    ],
  },

  // 6. Chiếu bí 1 nước: Pháo Lồng Khóa Tướng
  {
    id: 'puz-06',
    title: 'Đòn Pháo Lồng Khét Tiếng',
    theme: 'mate_in_1',
    difficulty: 3,
    fen: '3akab2/9/2N6/4C4/9/9/9/4C4/9/3K5 w - - 0 1',
    side: 'red',
    goal: 'Đỏ tung đòn Pháo lồng dứt điểm trận đấu',
    solution: {
      move: { from: 'e7', to: 'e9' },
      commentary: 'Pháo e7 tiến e9 làm ngòi cho Pháo e3 chiếu bí! Hai Sĩ Đen tự cản đường thoát của Tướng.',
    },
    hints: [
      'Tiến Pháo e7 lên e9 làm ngòi chiếu thẳng cho Pháo e3.',
      'Tiến Pháo e7 lên ô e9.',
      'Pháo e7 tiến e9 tạo thế Pháo lồng chiếu bí không thể chống đỡ.',
    ],
  },

  // 7. Tàn cuộc: Đơn Xe Sát Tướng Trụ
  {
    id: 'puz-07',
    title: 'Tàn Cuộc Đơn Xe Thắng Khuyết Sĩ',
    theme: 'endgame',
    difficulty: 1,
    fen: '3k5/4a4/9/9/9/9/9/9/R8/4K4 w - - 0 1',
    side: 'red',
    goal: 'Tận dụng mặt Tướng ép chết Tướng đối phương',
    solution: {
      move: { from: 'a2', to: 'a10' },
      commentary: 'Xe a2 tiến thẳng lên a10 chiếu bí! Tướng Đen bị Tướng Đỏ khống chế cột e, không thể sang e10 và Sĩ e9 cản đường.',
    },
    hints: [
      'Tướng Đỏ ở e1 đang khóa chặt cột e của Cung Đen.',
      'Đưa Xe a2 lên hàng 10 (a10) chiếu ngang.',
      'Xe a2 tiến a10 kết hợp mặt Tướng chiếu bí tức thì.',
    ],
  },

  // 8. Đòn Ghìm Quân (Pin): Xe Ghìm Mã và Tướng
  {
    id: 'puz-08',
    title: 'Đòn Ghìm Khóa Trục Cung',
    theme: 'pin',
    difficulty: 2,
    fen: '3k5/3n5/9/9/9/9/9/9/3R5/4K4 w - - 0 1',
    side: 'red',
    goal: 'Khóa chặt Mã đối phương không cho di chuyển',
    solution: {
      move: { from: 'd2', to: 'd9' },
      commentary: 'Xe d2 tiến lên d9 ăn thẳng Mã ghim Tướng chiếu bí!',
    },
    hints: [
      'Mã Đen ở d9 đang bị ghìm thẳng hàng với Tướng Đen ở d10.',
      'Dùng Xe d2 ăn thẳng Mã d9.',
      'Xe d2 tiến lên d9 ăn Mã và tung đòn chiếu sát cục.',
    ],
  },

  // 9. Trắc Diện Hổ (Mã Sườn Tuyệt Sát)
  {
    id: 'puz-09',
    title: 'Trắc Diện Hổ - Mã Sườn Khóa Tướng',
    theme: 'mate_in_1',
    difficulty: 1,
    fen: '4k4/4a4/1N7/9/9/9/9/9/R8/4K4 w - - 0 1',
    side: 'red',
    goal: 'Phối hợp Xe và Mã sườn để chiếu bí trong 1 nước',
    solution: {
      move: { from: 'a2', to: 'a10' },
      commentary: 'Xe a2 tiến a10 chiếu bí! Mã b8 khóa chặt đường thoát sang c10 của Tướng Đen, Sĩ e9 tự cản đường.',
    },
    hints: [
      'Mã Đỏ ở b8 kiểm soát các ô thoát bên trái.',
      'Tiến Xe a2 lên hàng 10 (a10) tấn công.',
      'Xe tiến a10 kết hợp Mã sườn kết liễu trận đấu.',
    ],
  },

  // 10. Đơn Mã Chiếu Bí Khuyết Sĩ
  {
    id: 'puz-10',
    title: 'Mã Ngọa Cung Chiếu Bí',
    theme: 'mate_in_1',
    difficulty: 1,
    fen: '3k5/3a5/4N4/9/9/9/9/9/9/4K4 w - - 0 1',
    side: 'red',
    goal: 'Nhảy Mã chiếu bí ngay lập tức',
    solution: {
      move: { from: 'e8', to: 'c9' },
      commentary: 'Mã e8 nhảy lên c9 chiếu bí! Tướng d10 không thể sang e10 do mặt Tướng e1, và Sĩ d9 tự cản đường lùi.',
    },
    hints: [
      'Mặt Tướng Đỏ e1 đang kiểm soát cột e.',
      'Nhảy Mã e8 lên ô c9.',
      'Mã e8 nhảy c9 chiếu trực diện Tướng Đen không còn đường chạy.',
    ],
  },

  // 11. Bạt Sơn Cái Thế (Xe Tốt Phối Hợp)
  {
    id: 'puz-11',
    title: 'Bạt Sơn Cái Thế - Xe Tốt Nhập Cung',
    theme: 'mate_in_2',
    difficulty: 2,
    fen: '4k4/4a4/4P4/9/9/9/9/9/R8/4K4 w - - 0 1',
    side: 'red',
    goal: 'Dùng Tốt phá Sĩ rồi Xe chiếu dứt điểm',
    solution: {
      move: { from: 'e8', to: 'e9' },
      reply: { from: 'e10', to: 'd10' },
      next: {
        move: { from: 'a2', to: 'a10' },
        commentary: 'Xe a2 tiến lên a10 chiếu bí! Tốt e9 kết hợp mặt Tướng khóa toàn bộ Cung.',
      },
    },
    hints: [
      'Dùng Tốt e8 ăn Sĩ e9 chiếu mở đường.',
      'Tốt e8 ăn Sĩ e9.',
      'Sau khi Tướng dạt sang d10, Xe a2 tiến a10 chiếu bí.',
    ],
  },

  // 12. Bạch Mã Khiêu Khê
  {
    id: 'puz-12',
    title: 'Bạch Mã Khiêu Khê Tuyệt Đòn',
    theme: 'mate_in_1',
    difficulty: 1,
    fen: '3ak4/4a4/5N3/9/9/9/9/9/R8/4K4 w - - 0 1',
    side: 'red',
    goal: 'Xe Mã phối hợp sát cục trong 1 nước',
    solution: {
      move: { from: 'a2', to: 'a10' },
      commentary: 'Xe a2 tiến thẳng a10 chiếu bí! Mã f8 khóa chặt d9, Sĩ d10 tự cản Tướng sang cánh trái.',
    },
    hints: [
      'Mã f8 đang khóa chặn điểm thoát d9.',
      'Tiến Xe a2 lên hàng 10 (a10).',
      'Xe lên a10 kết hợp mặt Tướng và Mã khóa chặt hoàn toàn.',
    ],
  },

  // 13. Song Xe Phá Trận
  {
    id: 'puz-13',
    title: 'Song Xe Tấn Đáy Chiếu Bí',
    theme: 'mate_in_1',
    difficulty: 1,
    fen: '3k5/3a5/9/9/9/9/9/9/R1R6/4K4 w - - 0 1',
    side: 'red',
    goal: 'Đỏ đi trước chiếu bí trong 1 nước cờ',
    solution: {
      move: { from: 'c2', to: 'c10' },
      commentary: 'Xe c2 tiến lên c10 chiếu bí! Tướng d10 bị khống chế hoàn toàn không thể sang e10 do mặt Tướng e1.',
    },
    hints: [
      'Đưa Xe c2 lên hàng 10 (ô c10) chiếu ngang.',
      'Xe c2 tiến lên c10.',
      'Xe c2 tiến c10 chiếu trực diện kết hợp mặt Tướng Đỏ tạo thế sát bí.',
    ],
  },

  // 14. Điệp Pháo Hạ Màn
  {
    id: 'puz-14',
    title: 'Điệp Pháo Hạ Màn Tuyệt Chiêu',
    theme: 'mate_in_1',
    difficulty: 1,
    fen: '3k5/3a5/4b4/3C5/3C5/9/9/9/9/4K4 w - - 0 1',
    side: 'red',
    goal: 'Pháo nhảy qua Sĩ chiếu bí ngay lập tức',
    solution: {
      move: { from: 'd7', to: 'd10' },
      commentary: 'Pháo d7 nhảy qua Sĩ d9 lên d10 chiếu bí! Mặt Tướng e1 khống chế không cho Tướng sang e10.',
    },
    hints: [
      'Pháo d7 có ngòi Sĩ d9 ở phía trước.',
      'Pháo d7 nhảy lên d10.',
      'Pháo d7 tiến d10 mượn Sĩ d9 làm ngòi dứt điểm trận đấu.',
    ],
  },

  // 15. Khởi Mã Đoạt Xe
  {
    id: 'puz-15',
    title: 'Khởi Mã Đoạt Xe - Đòn Bắt Đôi',
    theme: 'double_attack',
    difficulty: 2,
    fen: '3k5/9/9/9/2r6/4N4/9/9/9/4K4 w - - 0 1',
    side: 'red',
    goal: 'Nhảy Mã chiếu Tướng đồng thời bắt Xe đối phương',
    solution: {
      move: { from: 'e5', to: 'd7' },
      commentary: 'Mã e5 nhảy d7 chiếu Tướng d10 đồng thời bắt chết Xe c6 của Đen!',
    },
    hints: [
      'Tìm ô nhảy Mã vừa chiếu Tướng vừa đe dọa Xe c6.',
      'Mã e5 nhảy lên d7.',
      'Mã nhảy d7 tạo đòn bắt đôi Tướng và Xe.',
    ],
  },

  // 16. Song Pháo Khóa Đáy
  {
    id: 'puz-16',
    title: 'Song Pháo Khóa Đáy Tuyệt Chiêu',
    theme: 'mate_in_1',
    difficulty: 2,
    fen: '3k5/3a1a3/9/9/9/9/9/9/3C5/3CK4 w - - 0 1',
    side: 'red',
    goal: 'Dùng Pháo mượn ngòi dứt điểm ván đấu',
    solution: {
      move: { from: 'd2', to: 'd10' },
      commentary: 'Pháo d2 tiến lên d10 mượn ngòi Sĩ d9 chiếu bí Tướng d10!',
    },
    hints: [
      'Pháo d2 có thể mượn ngòi Sĩ d9 ăn thẳng lên hàng 10.',
      'Pháo d2 tiến lên ô d10.',
      'Pháo d2 tiến d10 mượn Sĩ d9 làm ngòi tạo đòn chiếu bí sát cục.',
    ],
  },

  // 17. Tiền Mã Hậu Xe Tuyệt Sát
  {
    id: 'puz-17',
    title: 'Tiền Mã Hậu Xe Tuyệt Sát',
    theme: 'mate_in_1',
    difficulty: 1,
    fen: '4ka3/2N1a4/9/9/9/9/9/9/R8/4K4 w - - 0 1',
    side: 'red',
    goal: 'Tiến Xe đáy cung chiếu bí trong 1 nước',
    solution: {
      move: { from: 'a2', to: 'a10' },
      commentary: 'Xe a2 tiến lên a10 chiếu bí! Xe a10 kiểm soát toàn bộ hàng đáy dứt điểm ván cờ.',
    },
    hints: [
      'Xe a2 có đường thông thoáng lên hàng 10.',
      'Xe a2 tiến lên ô a10.',
      'Xe a2 tiến a10 chiếu bí khóa chặt toàn bộ hàng đáy của Tướng Đen.',
    ],
  },

  // 18. Tốt Nhập Cung Sát Tướng
  {
    id: 'puz-18',
    title: 'Tốt Nhập Cung Sát Tướng',
    theme: 'endgame',
    difficulty: 1,
    fen: '3k5/3P5/9/9/9/9/9/9/9/3K5 w - - 0 1',
    side: 'red',
    goal: 'Tốt ăn Tướng hoặc áp sát chiếu bí',
    solution: {
      move: { from: 'd9', to: 'd10' },
      commentary: 'Tốt d9 tiến d10 ăn Tướng d10 dứt điểm trận đấu!',
    },
    hints: [
      'Tốt d9 đang đối diện trực diện Tướng Đen.',
      'Tốt d9 tiến lên d10.',
      'Tốt d9 tiến thẳng lên d10 kết liễu trận đấu.',
    ],
  },

  // 19. Song Xe Thang Ép Cung
  {
    id: 'puz-19',
    title: 'Song Xe Thang Ép Cung',
    theme: 'mate_in_2',
    difficulty: 2,
    fen: '3k5/9/3a5/9/9/9/9/9/RR7/4K4 w - - 0 1',
    side: 'red',
    goal: 'Dùng hai Xe thay nhau chiếu dồn ép Tướng',
    solution: {
      move: { from: 'a2', to: 'a10' },
      reply: { from: 'd10', to: 'd9' },
      next: {
        move: { from: 'b2', to: 'b9' },
        commentary: 'Xe b2 tiến lên b9 chiếu bí thang Xe tuyệt đỉnh!',
      },
    },
    hints: [
      'Xe a2 tiến lên hàng 10 (a10) chiếu trước.',
      'Xe a2 tiến a10 ép Tướng lùi xuống d9.',
      'Xe b2 tiến b9 dứt điểm chiếu bí.',
    ],
  },

  // 20. Trắc Diện Hổ Cánh Phải
  {
    id: 'puz-20',
    title: 'Trắc Diện Hổ Cánh Phải Tuyệt Kỹ',
    theme: 'mate_in_1',
    difficulty: 1,
    fen: '4k4/4a4/7N1/9/9/9/9/9/8R/4K4 w - - 0 1',
    side: 'red',
    goal: 'Xe Mã cánh phải phối hợp chiếu bí trong 1 nước',
    solution: {
      move: { from: 'i2', to: 'i10' },
      commentary: 'Xe i2 tiến lên i10 chiếu bí! Mã h8 khóa chặt đường thoát sang g10 của Tướng Đen.',
    },
    hints: [
      'Mã Đỏ tại h8 đang kiểm soát các điểm thoát bên phải.',
      'Tiến Xe i2 lên hàng 10 (i10).',
      'Xe i2 tiến i10 kết hợp Mã h8 khóa chặt Cung chiếu bí hoàn hảo.',
    ],
  },
];

export function getDailyPuzzle(date?: Date): Puzzle {
  const targetDate = date || new Date();
  const dayIndex =
    (targetDate.getUTCFullYear() * 365 + targetDate.getUTCMonth() * 31 + targetDate.getUTCDate()) %
    PUZZLES.length;
  return PUZZLES[dayIndex];
}
