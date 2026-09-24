export interface AIDifficultyConfig {
  level: number;
  name: string;
  description: string;
  depth: number;
  timeLimitMs?: number;
  blunderRate: number;
  inaccuracyMargin: number;
  eloEstimate: number;
}

export const AI_DIFFICULTIES: AIDifficultyConfig[] = [
  {
    level: 1,
    name: 'Người mới (Tập chơi)',
    description: 'Nước đi ngẫu hứng, hay để lọt quân và chưa biết tính kế sách.',
    depth: 1,
    timeLimitMs: 200,
    blunderRate: 0.40,
    inaccuracyMargin: 300,
    eloEstimate: 800,
  },
  {
    level: 2,
    name: 'Sơ cấp (Tập sự)',
    description: 'Biết ăn quân tự do, nhìn trước 1 nước, thỉnh thoảng bỏ sót đòn phối hợp.',
    depth: 1,
    timeLimitMs: 300,
    blunderRate: 0.20,
    inaccuracyMargin: 150,
    eloEstimate: 1000,
  },
  {
    level: 3,
    name: 'Nghiệp dư 1',
    description: 'Tính toán 2 nước, biết bảo vệ các quân yếu và phòng thủ căn bản.',
    depth: 2,
    timeLimitMs: 500,
    blunderRate: 0.10,
    inaccuracyMargin: 80,
    eloEstimate: 1200,
  },
  {
    level: 4,
    name: 'Nghiệp dư 2',
    description: 'Tránh đòn bắt đôi, biết chiếm giữ trung lộ và khai cuộc đều đặn.',
    depth: 2,
    timeLimitMs: 800,
    blunderRate: 0.04,
    inaccuracyMargin: 40,
    eloEstimate: 1400,
  },
  {
    level: 5,
    name: 'Phong trào',
    description: 'Lối chơi chặt chẽ, kiểm soát lộ xe và ngòi pháo, nhìn trước 3 nước.',
    depth: 3,
    timeLimitMs: 1200,
    blunderRate: 0.01,
    inaccuracyMargin: 20,
    eloEstimate: 1600,
  },
  {
    level: 6,
    name: 'Bán chuyên',
    description: 'Tính toán chiến thuật sắc bén 3-4 nước, ít mắc sai sót sơ đẳng.',
    depth: 3,
    timeLimitMs: 2000,
    blunderRate: 0.0,
    inaccuracyMargin: 0,
    eloEstimate: 1800,
  },
  {
    level: 7,
    name: 'Chuyên nghiệp',
    description: 'Thế trận vững chắc, công thủ toàn diện, tàn cuộc chuẩn mực.',
    depth: 4,
    timeLimitMs: 3500,
    blunderRate: 0.0,
    inaccuracyMargin: 0,
    eloEstimate: 2000,
  },
  {
    level: 8,
    name: 'Kiện tướng',
    description: 'Engine đánh giá tối đa độ sâu, tính toán chiến lược thâm sâu.',
    depth: 4,
    timeLimitMs: 6000,
    blunderRate: 0.0,
    inaccuracyMargin: 0,
    eloEstimate: 2200,
  },
];

export function getDifficultyConfig(level: number): AIDifficultyConfig {
  const clamped = Math.max(1, Math.min(8, Math.round(level)));
  return AI_DIFFICULTIES.find((d) => d.level === clamped) || AI_DIFFICULTIES[0];
}
