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
    difficulty: 3,
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
];

export function getDailyPuzzle(date?: Date): Puzzle {
  const targetDate = date || new Date();
  const dayIndex =
    (targetDate.getUTCFullYear() * 365 + targetDate.getUTCMonth() * 31 + targetDate.getUTCDate()) %
    PUZZLES.length;
  return PUZZLES[dayIndex];
}
