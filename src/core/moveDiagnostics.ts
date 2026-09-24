import { Board, Piece, Side, Square } from './types';
import { parseSquare } from './board';
import { isCheck } from './gameEngine';
import { areGeneralsFacing } from './moveRules';
import { PIECE_NAMES_VI } from './vietnameseNotation';

/**
 * Explains why a move from `from` to `to` is illegal according to Xiangqi rules.
 */
export function diagnoseIllegalMove(board: Board, from: Square, to: Square, turn: Side): string {
  const { row: fromR, col: fromC } = parseSquare(from);
  const { row: toR, col: toC } = parseSquare(to);

  const piece = board[fromR][fromC];
  if (!piece) return 'Không có quân cờ tại ô này.';
  if (piece.side !== turn) return `Đang là lượt đi của bên ${turn === 'red' ? 'Đỏ' : 'Đen'}.`;

  const destPiece = board[toR][toC];
  if (destPiece && destPiece.side === piece.side) {
    return 'Không thể ăn quân cùng màu của chính mình.';
  }

  const dR = toR - fromR;
  const dC = toC - fromC;
  const absR = Math.abs(dR);
  const absC = Math.abs(dC);
  const pieceName = PIECE_NAMES_VI[piece.type].full;

  switch (piece.type) {
    case 'horse': {
      if (!((absR === 2 && absC === 1) || (absR === 1 && absC === 2))) {
        return 'Quân Mã phải đi theo đường chữ Nhật (tiến 2 ngang 1 hoặc tiến 1 ngang 2).';
      }
      // Check horse leg
      const legR = fromR + (absR === 2 ? (dR > 0 ? 1 : -1) : 0);
      const legC = fromC + (absC === 2 ? (dC > 0 ? 1 : -1) : 0);
      if (board[legR][legC] !== null) {
        return `Quân Mã bị cản chân bởi quân tại ô gần kề!`;
      }
      break;
    }
    case 'elephant': {
      if (absR !== 2 || absC !== 2) {
        return 'Quân Tượng phải đi chéo đúng 2 ô (đường chữ Điền).';
      }
      // River crossing check
      const crossed = piece.side === 'red' ? toR <= 4 : toR >= 5;
      if (crossed) {
        return 'Quân Tượng không được phép qua sông!';
      }
      // Elephant eye check
      const eyeR = fromR + dR / 2;
      const eyeC = fromC + dC / 2;
      if (board[eyeR][eyeC] !== null) {
        return 'Quân Tượng bị cản mắt Tượng bởi quân tại tâm chữ Điền!';
      }
      break;
    }
    case 'advisor': {
      if (absR !== 1 || absC !== 1) {
        return 'Quân Sĩ chỉ được đi chéo 1 ô mỗi nước.';
      }
      const inPalaceCol = toC >= 3 && toC <= 5;
      const inPalaceRow = piece.side === 'red' ? toR >= 7 && toR <= 9 : toR >= 0 && toR <= 2;
      if (!inPalaceCol || !inPalaceRow) {
        return 'Quân Sĩ không được phép rời khỏi Cung Cấm!';
      }
      break;
    }
    case 'general': {
      if (!((absR === 1 && absC === 0) || (absR === 0 && absC === 1))) {
        return 'Quân Tướng chỉ được đi ngang hoặc dọc 1 ô mỗi nước.';
      }
      const inPalaceCol = toC >= 3 && toC <= 5;
      const inPalaceRow = piece.side === 'red' ? toR >= 7 && toR <= 9 : toR >= 0 && toR <= 2;
      if (!inPalaceCol || !inPalaceRow) {
        return 'Quân Tướng không được phép rời khỏi Cung Cấm!';
      }
      break;
    }
    case 'pawn': {
      const forwardDir = piece.side === 'red' ? -1 : 1;
      const isPastRiver = piece.side === 'red' ? fromR <= 4 : fromR >= 5;

      if (!isPastRiver) {
        // Before river: can only advance 1 step forward
        if (dC !== 0 || dR !== forwardDir) {
          return 'Tốt chưa qua sông chỉ được tiến thẳng 1 ô, không thể đi ngang hoặc lùi!';
        }
      } else {
        // After river: can advance forward or move sideways 1 step, but NEVER backwards
        if (dR === -forwardDir) {
          return 'Quân Tốt không bao giờ được phép đi lùi!';
        }
        if (!((dR === forwardDir && dC === 0) || (dR === 0 && absC === 1))) {
          return 'Tốt qua sông chỉ được tiến thẳng 1 ô hoặc đi ngang 1 ô.';
        }
      }
      break;
    }
    case 'rook': {
      if (fromR !== toR && fromC !== toC) {
        return 'Quân Xe chỉ được đi theo hàng ngang hoặc cột dọc.';
      }
      // Count hurdles
      const stepR = dR === 0 ? 0 : dR > 0 ? 1 : -1;
      const stepC = dC === 0 ? 0 : dC > 0 ? 1 : -1;
      let currR = fromR + stepR;
      let currC = fromC + stepC;
      let hurdle = 0;
      while (currR !== toR || currC !== toC) {
        if (board[currR][currC] !== null) hurdle++;
        currR += stepR;
        currC += stepC;
      }
      if (hurdle > 0) {
        return 'Quân Xe không thể nhảy qua quân cờ khác trên đường đi!';
      }
      break;
    }
    case 'cannon': {
      if (fromR !== toR && fromC !== toC) {
        return 'Quân Pháo chỉ được di chuyển theo hàng ngang hoặc cột dọc.';
      }
      // Count hurdles
      const stepR = dR === 0 ? 0 : dR > 0 ? 1 : -1;
      const stepC = dC === 0 ? 0 : dC > 0 ? 1 : -1;
      let currR = fromR + stepR;
      let currC = fromC + stepC;
      let hurdles = 0;
      while (currR !== toR || currC !== toC) {
        if (board[currR][currC] !== null) hurdles++;
        currR += stepR;
        currC += stepC;
      }
      if (destPiece === null && hurdles > 0) {
        return 'Pháo khi không ăn quân thì đường đi phải thông suốt, không được có quân cản!';
      }
      if (destPiece !== null && hurdles !== 1) {
        return `Pháo muốn ăn quân phải cách đúng 1 quân làm ngòi (hiện tại có ${hurdles} quân ở giữa)!`;
      }
      break;
    }
  }

  // If geometric move is legal, check if moving exposes own General or results in Facing Generals
  const testBoard = board.map((row) => row.map((p) => (p ? { ...p } : null)));
  testBoard[fromR][fromC] = null;
  testBoard[toR][toC] = { ...piece, square: to };

  if (areGeneralsFacing(testBoard)) {
    return 'Phạm luật: Nước đi này khiến hai Tướng đối mặt trực diện (Lộ mặt Tướng)!';
  }

  if (isCheck(testBoard, piece.side)) {
    return 'Phạm luật: Nước đi này khiến Tướng của bạn rơi vào thế bị Chiếu Tướng!';
  }

  return `Nước đi của quân ${pieceName} không hợp lệ.`;
}
