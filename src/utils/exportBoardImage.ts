import { Board, Piece, PieceType, Side } from '../core/types';
import { toSquare } from '../core/board';
import { PieceSet } from '../components/Board/XiangqiBoard';

const TRADITIONAL_CHARS: Record<Side, Record<PieceType, string>> = {
  red: {
    general: '帥',
    advisor: '仕',
    elephant: '相',
    horse: '傌',
    rook: '俥',
    cannon: '炮',
    pawn: '兵',
  },
  black: {
    general: '將',
    advisor: '士',
    elephant: '象',
    horse: '馬',
    rook: '車',
    cannon: '砲',
    pawn: '卒',
  },
};

const SIMPLIFIED_CHARS: Record<Side, Record<PieceType, string>> = {
  red: {
    general: '帅',
    advisor: '仕',
    elephant: '相',
    horse: '马',
    rook: '车',
    cannon: '炮',
    pawn: '兵',
  },
  black: {
    general: '将',
    advisor: '士',
    elephant: '象',
    horse: '马',
    rook: '车',
    cannon: '炮',
    pawn: '卒',
  },
};

const VIETNAMESE_NAMES: Record<PieceType, string> = {
  general: 'Tướng',
  advisor: 'Sĩ',
  elephant: 'Tượng',
  horse: 'Mã',
  rook: 'Xe',
  cannon: 'Pháo',
  pawn: 'Tốt',
};

export interface ExportImageOptions {
  title?: string;
  turn?: Side;
  flipped?: boolean;
  pieceSet?: PieceSet;
  watermark?: string;
}

/**
 * Draws star corner marks on standard points (cannons and pawns).
 */
function drawCrossMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  leftOnly = false,
  rightOnly = false
) {
  const d = 6;
  const l = 12;
  ctx.strokeStyle = '#523114';
  ctx.lineWidth = 2;

  ctx.beginPath();
  if (!rightOnly) {
    // Top-Left
    ctx.moveTo(x - d, y - d - l);
    ctx.lineTo(x - d, y - d);
    ctx.lineTo(x - d - l, y - d);
    // Bottom-Left
    ctx.moveTo(x - d, y + d + l);
    ctx.lineTo(x - d, y + d);
    ctx.lineTo(x - d - l, y + d);
  }
  if (!leftOnly) {
    // Top-Right
    ctx.moveTo(x + d, y - d - l);
    ctx.lineTo(x + d, y - d);
    ctx.lineTo(x + d + l, y - d);
    // Bottom-Right
    ctx.moveTo(x + d, y + d + l);
    ctx.lineTo(x + d, y + d);
    ctx.lineTo(x + d + l, y + d);
  }
  ctx.stroke();
}

/**
 * Renders an HD Xiangqi Board with wooden texture, pieces, and calligraphy onto a Canvas.
 */
export function renderBoardToCanvas(
  board: Board,
  options: ExportImageOptions = {}
): HTMLCanvasElement {
  const {
    title = 'Kỳ Đạo - Thế Cờ Tướng',
    turn = 'red',
    flipped = false,
    pieceSet = 'traditional',
    watermark = 'Kỳ Đạo • daycotuong.vn',
  } = options;

  const canvas = document.createElement('canvas');
  // High resolution: 1200 x 1480 for crisp HD export
  const width = 1200;
  const height = 1480;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. Background Container Gradient
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#1c1814');
  bgGradient.addColorStop(1, '#0e0c0a');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // 2. Header Title Banner
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 36px "Cinzel", "Noto Serif", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, width / 2, 60);

  // Turn status subtext
  ctx.fillStyle = turn === 'red' ? '#e74c3c' : '#bdc3c7';
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `Lượt đi: ${turn === 'red' ? '🔴 Bên Đỏ (Đi trước)' : '⚫ Bên Đen (Đi trước)'}`,
    width / 2,
    105
  );

  // 3. Wooden Board Dimensions
  const boardMarginX = 100;
  const boardMarginY = 150;
  const boardWidth = 1000;
  const boardHeight = 1120;
  const cellWidth = 100;
  const cellHeight = 112;

  // Board wooden gradient surface
  const woodGrad = ctx.createLinearGradient(
    boardMarginX,
    boardMarginY,
    boardMarginX + boardWidth,
    boardMarginY + boardHeight
  );
  woodGrad.addColorStop(0, '#f8e4c3');
  woodGrad.addColorStop(0.5, '#ebd09e');
  woodGrad.addColorStop(1, '#d8b075');

  // Board shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 15;

  ctx.fillStyle = woodGrad;
  ctx.roundRect(boardMarginX, boardMarginY, boardWidth, boardHeight, 16);
  ctx.fill();

  // Reset shadow for board lines
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Outer double border lines
  ctx.strokeStyle = '#523114';
  ctx.lineWidth = 5;
  ctx.strokeRect(boardMarginX + 50, boardMarginY + 50, 900, 1008);

  ctx.lineWidth = 2;
  ctx.strokeRect(boardMarginX + 40, boardMarginY + 40, 920, 1028);

  const startX = boardMarginX + 50;
  const startY = boardMarginY + 50;
  const stepX = 900 / 8; // 112.5 px
  const stepY = 1008 / 9; // 112 px

  // 10 Horizontal grid lines
  ctx.lineWidth = 2.5;
  for (let r = 0; r < 10; r++) {
    const y = startY + r * stepY;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + 8 * stepX, y);
    ctx.stroke();
  }

  // 9 Vertical grid lines (Broken at River)
  for (let c = 0; c < 9; c++) {
    const x = startX + c * stepX;
    // Top half (ranks 10 to 6)
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, startY + 4 * stepY);
    ctx.stroke();

    // Bottom half (ranks 5 to 1)
    ctx.beginPath();
    ctx.moveTo(x, startY + 5 * stepY);
    ctx.lineTo(x, startY + 9 * stepY);
    ctx.stroke();
  }

  // Border connecting vertical lines across the river
  ctx.beginPath();
  ctx.moveTo(startX, startY + 4 * stepY);
  ctx.lineTo(startX, startY + 5 * stepY);
  ctx.moveTo(startX + 8 * stepX, startY + 4 * stepY);
  ctx.lineTo(startX + 8 * stepX, startY + 5 * stepY);
  ctx.stroke();

  // Palaces diagonal lines
  // Top Palace
  ctx.beginPath();
  ctx.moveTo(startX + 3 * stepX, startY);
  ctx.lineTo(startX + 5 * stepX, startY + 2 * stepY);
  ctx.moveTo(startX + 5 * stepX, startY);
  ctx.lineTo(startX + 3 * stepX, startY + 2 * stepY);
  ctx.stroke();

  // Bottom Palace
  ctx.beginPath();
  ctx.moveTo(startX + 3 * stepX, startY + 7 * stepY);
  ctx.lineTo(startX + 5 * stepX, startY + 9 * stepY);
  ctx.moveTo(startX + 5 * stepX, startY + 7 * stepY);
  ctx.lineTo(startX + 3 * stepX, startY + 9 * stepY);
  ctx.stroke();

  // Star Corner Marks (Cannons and Pawns)
  drawCrossMark(ctx, startX + 1 * stepX, startY + 2 * stepY);
  drawCrossMark(ctx, startX + 7 * stepX, startY + 2 * stepY);
  drawCrossMark(ctx, startX + 1 * stepX, startY + 7 * stepY);
  drawCrossMark(ctx, startX + 7 * stepX, startY + 7 * stepY);

  drawCrossMark(ctx, startX, startY + 3 * stepY, false, true);
  drawCrossMark(ctx, startX + 2 * stepX, startY + 3 * stepY);
  drawCrossMark(ctx, startX + 4 * stepX, startY + 3 * stepY);
  drawCrossMark(ctx, startX + 6 * stepX, startY + 3 * stepY);
  drawCrossMark(ctx, startX + 8 * stepX, startY + 3 * stepY, true, false);

  drawCrossMark(ctx, startX, startY + 6 * stepY, false, true);
  drawCrossMark(ctx, startX + 2 * stepX, startY + 6 * stepY);
  drawCrossMark(ctx, startX + 4 * stepX, startY + 6 * stepY);
  drawCrossMark(ctx, startX + 6 * stepX, startY + 6 * stepY);
  drawCrossMark(ctx, startX + 8 * stepX, startY + 6 * stepY, true, false);

  // River Calligraphy
  ctx.fillStyle = '#6d461f';
  ctx.font = 'bold 42px "Noto Serif SC", KaiTi, serif';
  ctx.fillText('楚   河', startX + 2 * stepX, startY + 4.5 * stepY);
  ctx.fillText('漢   界', startX + 6 * stepX, startY + 4.5 * stepY);

  // Column numbers (1 to 9)
  ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#7a5229';
  for (let c = 0; c < 9; c++) {
    const colLabel = flipped ? (9 - c).toString() : (c + 1).toString();
    const x = startX + c * stepX;
    // Top col labels
    ctx.fillText(colLabel, x, startY - 20);
    // Bottom col labels
    ctx.fillText(colLabel, x, startY + 9 * stepY + 28);
  }

  // 4. Render All Pieces on Board
  const pieceRadius = 42;

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const displayCol = flipped ? 8 - c : c;
      const displayRow = flipped ? 9 - r : r;
      const px = startX + displayCol * stepX;
      const py = startY + displayRow * stepY;

      // Piece shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 6;

      // Outer piece wood disc
      const pieceGrad = ctx.createRadialGradient(
        px - 10,
        py - 10,
        5,
        px,
        py,
        pieceRadius
      );
      pieceGrad.addColorStop(0, '#fff6e5');
      pieceGrad.addColorStop(0.8, '#f5deb3');
      pieceGrad.addColorStop(1, '#d2b48c');

      ctx.fillStyle = pieceGrad;
      ctx.beginPath();
      ctx.arc(px, py, pieceRadius, 0, Math.PI * 2);
      ctx.fill();

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Outer piece rim
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Inner decorative ring
      ctx.strokeStyle = piece.side === 'red' ? '#c0392b' : '#2c3e50';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, pieceRadius - 6, 0, Math.PI * 2);
      ctx.stroke();

      // Character / Name
      let char = '';
      if (pieceSet === 'vietnamese') {
        char = VIETNAMESE_NAMES[piece.type];
      } else if (pieceSet === 'simplified') {
        char = SIMPLIFIED_CHARS[piece.side][piece.type];
      } else {
        char = TRADITIONAL_CHARS[piece.side][piece.type];
      }

      ctx.fillStyle = piece.side === 'red' ? '#c0392b' : '#1a1a1a';
      ctx.font =
        pieceSet === 'vietnamese'
          ? 'bold 22px "Plus Jakarta Sans", sans-serif'
          : 'bold 44px "Noto Serif SC", KaiTi, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char, px, py + 2);
    }
  }

  // 5. Footer Watermark
  ctx.fillStyle = 'rgba(212, 175, 55, 0.85)';
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(watermark, width / 2, height - 40);

  return canvas;
}

/**
 * Trigger download of the board canvas as PNG image.
 */
export function downloadBoardImage(
  board: Board,
  filename = 'the-co-ky-dao.png',
  options: ExportImageOptions = {}
): void {
  const canvas = renderBoardToCanvas(board, options);
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Copies the board image directly to the system clipboard.
 */
export async function copyBoardImageToClipboard(
  board: Board,
  options: ExportImageOptions = {}
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
  try {
    const canvas = renderBoardToCanvas(board, options);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    );
    if (!blob) return false;
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
    return true;
  } catch (err) {
    console.error('Failed to copy image to clipboard', err);
    return false;
  }
}
