import React, { useState, useRef } from 'react';
import { Board, Move, Piece, PieceType, Side, Square } from '../../core/types';
import { parseSquare, toSquare } from '../../core/board';
import { generateLegalMoves } from '../../core/gameEngine';
import { soundEffects } from '../../audio/soundFX';

export type PieceSet = 'traditional' | 'simplified' | 'vietnamese';

interface XiangqiBoardProps {
  board: Board;
  turn?: Side;
  flipped?: boolean; // True when playing as Black (view from Black's side)
  selectedSquare?: Square | null;
  legalMoves?: Move[];
  lastMove?: Move;
  checkSquare?: Square | null; // Square of General currently in check
  illegalSquare?: Square | null; // Square of illegal attempt (triggers shake animation)
  isThinking?: boolean; // True when AI is computing
  pieceSet?: PieceSet;
  arrows?: [string, string][]; // e.g. [["a2", "a9"]]
  highlights?: string[]; // Squares to highlight (for hints/lessons)
  interactive?: boolean;
  onSquareClick?: (square: Square) => void;
  onMove?: (from: Square, to: Square) => void;
}

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

// Helper to draw star corner markers at intersections (e.g. cannon and pawn points)
const CrossMark: React.FC<{ x: number; y: number; leftOnly?: boolean; rightOnly?: boolean }> = ({
  x,
  y,
  leftOnly,
  rightOnly,
}) => {
  const d = 5; // distance from center
  const l = 10; // length of mark
  return (
    <g stroke="#523114" strokeWidth="1.5" fill="none">
      {!rightOnly && (
        <>
          {/* Top-Left */}
          <path d={`M ${x - d} ${y - d - l} L ${x - d} ${y - d} L ${x - d - l} ${y - d}`} />
          {/* Bottom-Left */}
          <path d={`M ${x - d} ${y + d + l} L ${x - d} ${y + d} L ${x - d - l} ${y + d}`} />
        </>
      )}
      {!leftOnly && (
        <>
          {/* Top-Right */}
          <path d={`M ${x + d} ${y - d - l} L ${x + d} ${y - d} L ${x + d + l} ${y - d}`} />
          {/* Bottom-Right */}
          <path d={`M ${x + d} ${y + d + l} L ${x + d} ${y + d} L ${x + d + l} ${y + d}`} />
        </>
      )}
    </g>
  );
};

export const XiangqiBoard: React.FC<XiangqiBoardProps> = ({
  board,
  turn,
  flipped = false,
  selectedSquare,
  legalMoves = [],
  lastMove,
  checkSquare,
  illegalSquare,
  isThinking = false,
  pieceSet = 'traditional',
  arrows = [],
  highlights = [],
  interactive = true,
  onSquareClick,
  onMove,
}) => {
  const [draggedSquare, setDraggedSquare] = useState<Square | null>(null);
  const [touchHoverSquare, setTouchHoverSquare] = useState<Square | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const handleSquareClick = (square: Square) => {
    if (!interactive) return;

    if (selectedSquare && onMove) {
      // Check if clicked square is a legal destination
      const isLegal = legalMoves.some((m) => m.from === selectedSquare && m.to === square);
      if (isLegal) {
        onMove(selectedSquare, square);
        return;
      }
    }

    if (onSquareClick) {
      onSquareClick(square);
    }
  };

  const handleDragStart = (e: React.DragEvent, square: Square, piece: Piece | null) => {
    if (!interactive || !piece) return;
    if (turn && piece.side !== turn) return;
    setDraggedSquare(square);
    e.dataTransfer.setData('text/plain', square);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSquare: Square) => {
    e.preventDefault();
    const fromSquare = draggedSquare || (e.dataTransfer.getData('text/plain') as Square);
    setDraggedSquare(null);

    if (fromSquare && fromSquare !== targetSquare && onMove) {
      let isLegal = legalMoves.some((m) => m.from === fromSquare && m.to === targetSquare);
      if (!isLegal && turn) {
        const boardLegals = generateLegalMoves(board, turn);
        isLegal = boardLegals.some((m) => m.from === fromSquare && m.to === targetSquare);
      }
      if (isLegal) {
        onMove(fromSquare, targetSquare);
      }
    }
  };

  // Touch event handlers for smooth mobile / tablet drag-and-drop
  const handleTouchStart = (square: Square, piece: Piece | null) => {
    if (!interactive || !piece) return;
    if (turn && piece.side !== turn) return;
    setDraggedSquare(square);
    setTouchHoverSquare(square);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggedSquare) return;
    const touch = e.touches[0];
    if (!touch) return;

    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    const intersection = elem?.closest('[data-square]') as HTMLElement | null;
    if (intersection) {
      const sq = intersection.getAttribute('data-square') as Square;
      if (sq) {
        setTouchHoverSquare(sq);
      }
    }
  };

  const handleTouchEnd = () => {
    if (draggedSquare && touchHoverSquare && draggedSquare !== touchHoverSquare && onMove) {
      let isLegal = legalMoves.some((m) => m.from === draggedSquare && m.to === touchHoverSquare);
      if (!isLegal && turn) {
        const boardLegals = generateLegalMoves(board, turn);
        isLegal = boardLegals.some((m) => m.from === draggedSquare && m.to === touchHoverSquare);
      }
      if (isLegal) {
        onMove(draggedSquare, touchHoverSquare);
      }
    }
    setDraggedSquare(null);
    setTouchHoverSquare(null);
  };

  const getPieceLabel = (piece: Piece) => {
    if (pieceSet === 'vietnamese') {
      return VIETNAMESE_NAMES[piece.type];
    }
    if (pieceSet === 'simplified') {
      return SIMPLIFIED_CHARS[piece.side][piece.type];
    }
    return TRADITIONAL_CHARS[piece.side][piece.type];
  };

  // Convert board coordinate (r: 0..9, c: 0..8) to percentage on the board
  const getPositionPercent = (r: number, c: number) => {
    const displayCol = flipped ? 8 - c : c;
    const displayRow = flipped ? 9 - r : r;
    const leftPercent = ((50 + displayCol * 100) / 900) * 100;
    const topPercent = ((50 + displayRow * 100) / 1000) * 100;
    return { leftPercent, topPercent };
  };

  const colLabels = flipped
    ? ['9', '8', '7', '6', '5', '4', '3', '2', '1']
    : ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="xiangqi-board-container" ref={boardRef} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div className="xiangqi-board" role="grid" aria-label="Bàn cờ tướng">
        {/* Board Background SVG (Lines, Palaces, River, Star Points) */}
        <svg className="board-svg-grid" viewBox="0 0 900 1000" preserveAspectRatio="none">
          <defs>
            <linearGradient id="boardWood" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f5ddb2" />
              <stop offset="50%" stopColor="#e5be82" />
              <stop offset="100%" stopColor="#d4a76a" />
            </linearGradient>
            <filter id="shadowPiece" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="5" stdDeviation="4" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Board surface */}
          <rect width="900" height="1000" fill="url(#boardWood)" rx="10" />

          {/* Outer Border line */}
          <rect x="50" y="50" width="800" height="900" fill="none" stroke="#523114" strokeWidth="4" />
          <rect x="42" y="42" width="816" height="916" fill="none" stroke="#523114" strokeWidth="1.5" />

          {/* 10 Horizontal lines (y = 50 to 950) */}
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1="50"
              y1={50 + i * 100}
              x2="850"
              y2={50 + i * 100}
              stroke="#523114"
              strokeWidth="2"
            />
          ))}

          {/* 9 Vertical lines - Top half (ranks 10 to 6 -> y = 50 to 450) */}
          {Array.from({ length: 9 }).map((_, i) => (
            <line
              key={`v-top-${i}`}
              x1={50 + i * 100}
              y1="50"
              x2={50 + i * 100}
              y2="450"
              stroke="#523114"
              strokeWidth="2"
            />
          ))}

          {/* 9 Vertical lines - Bottom half (ranks 5 to 1 -> y = 550 to 950) */}
          {Array.from({ length: 9 }).map((_, i) => (
            <line
              key={`v-bottom-${i}`}
              x1={50 + i * 100}
              y1="550"
              x2={50 + i * 100}
              y2="950"
              stroke="#523114"
              strokeWidth="2"
            />
          ))}

          {/* Side boundary lines connecting across river (x=50 and x=850, y=450 to 550) */}
          <line x1="50" y1="450" x2="50" y2="550" stroke="#523114" strokeWidth="2" />
          <line x1="850" y1="450" x2="850" y2="550" stroke="#523114" strokeWidth="2" />

          {/* Top Palace diagonals (cols 3 to 5 -> x = 350 to 550; rows 0 to 2 -> y = 50 to 250) */}
          <line x1="350" y1="50" x2="550" y2="250" stroke="#523114" strokeWidth="2" />
          <line x1="550" y1="50" x2="350" y2="250" stroke="#523114" strokeWidth="2" />

          {/* Bottom Palace diagonals (cols 3 to 5 -> x = 350 to 550; rows 7 to 9 -> y = 750 to 950) */}
          <line x1="350" y1="750" x2="550" y2="950" stroke="#523114" strokeWidth="2" />
          <line x1="550" y1="750" x2="350" y2="950" stroke="#523114" strokeWidth="2" />

          {/* Star Corner Marks on Standard Points */}
          {/* Cannons */}
          <CrossMark x={150} y={250} />
          <CrossMark x={750} y={250} />
          <CrossMark x={150} y={750} />
          <CrossMark x={750} y={750} />

          {/* Pawns Top */}
          <CrossMark x={50} y={350} rightOnly />
          <CrossMark x={250} y={350} />
          <CrossMark x={450} y={350} />
          <CrossMark x={650} y={350} />
          <CrossMark x={850} y={350} leftOnly />

          {/* Pawns Bottom */}
          <CrossMark x={50} y={650} rightOnly />
          <CrossMark x={250} y={650} />
          <CrossMark x={450} y={650} />
          <CrossMark x={650} y={650} />
          <CrossMark x={850} y={650} leftOnly />

          {/* River Text: Sở Hà - Hán Giới (楚河 - 漢界) */}
          <text
            x="250"
            y="515"
            fill="#6d461f"
            fontSize="34"
            fontFamily="'Noto Serif SC', serif, KaiTi"
            fontWeight="bold"
            textAnchor="middle"
            letterSpacing="10"
          >
            楚 河
          </text>
          <text
            x="650"
            y="515"
            fill="#6d461f"
            fontSize="34"
            fontFamily="'Noto Serif SC', serif, KaiTi"
            fontWeight="bold"
            textAnchor="middle"
            letterSpacing="10"
          >
            漢 界
          </text>

          {/* Dynamic SVG arrows */}
          {arrows.map(([from, to], idx) => {
            const pFrom = parseSquare(from as Square);
            const pTo = parseSquare(to as Square);
            const x1 = 50 + (flipped ? 8 - pFrom.col : pFrom.col) * 100;
            const y1 = 50 + (flipped ? 9 - pFrom.row : pFrom.row) * 100;
            const x2 = 50 + (flipped ? 8 - pTo.col : pTo.col) * 100;
            const y2 = 50 + (flipped ? 9 - pTo.row : pTo.row) * 100;

            return (
              <g key={`arr-${idx}`}>
                <defs>
                  <marker
                    id={`arrowhead-${idx}`}
                    markerWidth="8"
                    markerHeight="6"
                    refX="7"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#e67e22" />
                  </marker>
                </defs>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#e67e22"
                  strokeWidth="8"
                  strokeLinecap="round"
                  opacity="0.85"
                  markerEnd={`url(#arrowhead-${idx})`}
                />
              </g>
            );
          })}
        </svg>

        {/* AI Thinking Laser Scanner Overlay */}
        {isThinking && (
          <div className="board-ai-scanning-overlay">
            <div className="ai-scanner-beam"></div>
            <div className="ai-thinking-badge">
              <span className="thinking-spinner"></span>
              <span>AI đang tính toán...</span>
            </div>
          </div>
        )}

        {/* 90 Exact Intersection Points */}
        <div className={`intersections-layer ${isThinking ? 'ai-busy' : ''}`}>
          {Array.from({ length: 10 }).map((_, r) =>
            Array.from({ length: 9 }).map((_, c) => {
              const sq = toSquare(r, c);
              const piece = board[r][c];
              const { leftPercent, topPercent } = getPositionPercent(r, c);

              const isSelected = selectedSquare === sq;
              const isLegal = legalMoves.some((m) => m.to === sq);
              const isLastMoveFrom = lastMove?.from === sq;
              const isLastMoveTo = lastMove?.to === sq;
              const isCheck = checkSquare === sq;
              const isIllegal = illegalSquare === sq;
              const isHighlighted = highlights.includes(sq);
              const isTouchHover = touchHoverSquare === sq;

              return (
                <div
                  key={sq}
                  className={`board-intersection ${isSelected ? 'selected' : ''} ${
                    isLegal ? 'legal' : ''
                  } ${isLastMoveFrom ? 'last-move-from' : ''} ${isLastMoveTo ? 'last-move-to' : ''} ${
                    isLastMoveFrom || isLastMoveTo ? 'last-move' : ''
                  } ${isCheck ? 'in-check' : ''} ${isIllegal ? 'illegal-shake' : ''} ${
                    isHighlighted ? 'highlighted' : ''
                  } ${isTouchHover ? 'touch-hover' : ''}`}
                  style={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                  }}
                  onClick={() => handleSquareClick(sq)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, sq)}
                  data-square={sq}
                >
                  {/* Legal move indicator (dot or capture target reticle) */}
                  {isLegal && (
                    <span className={`legal-indicator ${piece ? 'capture-ring' : 'dot'}`}>
                      {piece && <span className="target-reticle-bracket" />}
                    </span>
                  )}

                  {/* Piece Component */}
                  {piece && (
                    <div
                      className={`piece-token ${piece.side} ${
                        pieceSet === 'vietnamese' ? 'viet-token' : ''
                      } ${isSelected ? 'piece-selected' : ''} ${isIllegal ? 'piece-shake' : ''}`}
                      draggable={interactive && !isThinking && (!turn || piece.side === turn)}
                      onDragStart={(e) => handleDragStart(e, sq, piece)}
                      onTouchStart={() => handleTouchStart(sq, piece)}
                      title={`${VIETNAMESE_NAMES[piece.type]} (${
                        piece.side === 'red' ? 'Đỏ' : 'Đen'
                      }) - ${sq}`}
                    >
                      <div className="piece-inner-bevel">
                        <span className="piece-char">{getPieceLabel(piece)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
