import { Move, Side } from '../core/types';

export type CoachLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface CoachAdvice {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'good';
}

export function generateCoachAdvice(
  score: number,
  bestMove: Partial<Move> | null,
  side: Side,
  level: CoachLevel
): CoachAdvice[] {
  const sideName = side === 'red' ? 'Đỏ' : 'Đen';

  if (!bestMove || !bestMove.from || !bestMove.to) {
    return [
      {
        title: 'Không có nước rõ ràng',
        message: 'Thế cờ hiện tại chưa có một nước chủ lực nào nổi bật. Hãy quan sát vị trí quân và tìm cách nắm thế trung tuyến.',
        severity: 'info',
      },
    ];
  }

  if (Math.abs(score) < 30) {
    if (level === 'beginner') {
      return [{
        title: 'Thế cờ cân bằng',
        message: 'Thế cờ đang ở trạng thái ổn định. Hãy ưu tiên giữ quân an toàn và tránh đánh đổi không cần thiết.',
        severity: 'info',
      }];
    }

    return [{
      title: 'Cân bằng chiến thuật',
      message: 'Hai bên đang ở thế đối kháng tương đương. Hãy tìm cách tăng áp lực ở trung tuyến hoặc bảo vệ các quân trọng yếu.',
      severity: 'info',
    }];
  }

  const positive = score > 0;
  const advantageSide = positive ? 'Đỏ' : 'Đen';

  if (level === 'beginner') {
    return [{
      title: 'Ưu thế hiện tại',
      message: `${advantageSide} đang có ưu thế. Nước ${bestMove.from} → ${bestMove.to} là lựa chọn an toàn và dễ kiểm soát, hãy tập trung giữ nhịp và tránh đánh mạo hiểm.`,
      severity: positive ? 'good' : 'warning',
    }];
  }

  if (level === 'intermediate') {
    return [{
      title: 'Phân tích ngắn gọn',
      message: `${advantageSide} đang nắm lợi thế nhờ ${positive ? 'tính chủ động và kiểm soát trung tuyến' : 'áp lực từ phản công'}. Nước ${bestMove.from} → ${bestMove.to} cải thiện thế cờ và tạo áp lực lên quân đối phương.`,
      severity: positive ? 'good' : 'warning',
    }];
  }

  if (level === 'advanced') {
    return [{
      title: 'Chiến thuật trọng tâm',
      message: `${advantageSide} đang có ưu thế chiến thuật vì hướng đi ${bestMove.from} → ${bestMove.to} giúp phối hợp quân tốt hơn, mở đường tấn công và buộc đối phương phải phòng ngự chặt chẽ.`,
      severity: positive ? 'good' : 'warning',
    }];
  }

  return [{
    title: 'Chiến lược sâu',
    message: `${advantageSide} đang nắm ưu thế chiến lược rõ rệt. Nước ${bestMove.from} → ${bestMove.to} không chỉ cải thiện giá trị vị trí mà còn làm tăng áp lực phòng ngự, ràng buộc quân đối thủ và mở ra kế hoạch tấn công theo hướng trung tuyến.`,
    severity: positive ? 'good' : 'warning',
  }];
}
