import React, { useState, useMemo } from 'react';
import { Board, Piece, PieceType, Side, Square } from '../../core/types';
import { createEmptyBoard, parseSquare, toSquare } from '../../core/board';
import { boardToFEN, INITIAL_FEN, parseFEN } from '../../core/fen';
import { areGeneralsFacing } from '../../core/moveRules';
import { XiangqiBoard, PieceSet } from '../Board/XiangqiBoard';
import { downloadBoardImage, copyBoardImageToClipboard } from '../../utils/exportBoardImage';
import { soundEffects } from '../../audio/soundFX';

interface EditorViewProps {
  pieceSet: PieceSet;
  onPlayWithAI: (fen: string) => void;
  onAnalyze: (board: Board) => void;
}

interface PiecePaletteItem {
  type: PieceType;
  side: Side;
  label: string;
  charRed: string;
  charBlack: string;
  maxCount: number;
}

const PALETTE_PIECES: PiecePaletteItem[] = [
  { type: 'general', side: 'red', label: 'Tướng', charRed: '帥', charBlack: '將', maxCount: 1 },
  { type: 'advisor', side: 'red', label: 'Sĩ', charRed: '仕', charBlack: '士', maxCount: 2 },
  { type: 'elephant', side: 'red', label: 'Tượng', charRed: '相', charBlack: '象', maxCount: 2 },
  { type: 'horse', side: 'red', label: 'Mã', charRed: '傌', charBlack: '馬', maxCount: 2 },
  { type: 'rook', side: 'red', label: 'Xe', charRed: '俥', charBlack: '車', maxCount: 2 },
  { type: 'cannon', side: 'red', label: 'Pháo', charRed: '炮', charBlack: '砲', maxCount: 2 },
  { type: 'pawn', side: 'red', label: 'Tốt', charRed: '兵', charBlack: '卒', maxCount: 5 },
];

const PRESET_TEMPLATES = [
  {
    name: '♟️ Khởi đầu chuẩn',
    fen: INITIAL_FEN,
    description: 'Bàn cờ ban đầu với đầy đủ 32 quân',
  },
  {
    name: '🧹 Bàn cờ trống',
    fen: '9/9/9/9/9/9/9/9/9/9 w - - 0 1',
    description: 'Bàn cờ hoàn toàn trống để tự do xếp quân',
  },
  {
    name: '⚔️ Đơn Xe thắng Mã Sĩ',
    fen: '3ak4/4a4/2n6/9/9/9/9/9/4R4/4K4 w - - 0 1',
    description: 'Thế tàn cuộc Đơn Xe khống chế Mã Song Sĩ',
  },
  {
    name: '💥 Pháo Tốt thắng Tượng',
    fen: '2bakab2/9/4P4/9/9/9/9/9/4C4/4K4 w - - 0 1',
    description: 'Thế tàn Pháo Tốt ép Sĩ Tượng toàn',
  },
  {
    name: '⚡ Mã Hậu Pháo',
    fen: '3ak4/3N5/2C6/9/9/9/9/9/4A4/4K4 w - - 0 1',
    description: 'Sát pháp kinh điển: Mã trước làm ngòi, Pháo sau bắn',
  },
  {
    name: '🏰 Thiết Môn Hãn',
    fen: '3ak4/4a4/4C4/9/9/9/9/9/8R/4K4 w - - 0 1',
    description: 'Sát pháp Cửa Sắt: Pháo giữ trung lộ, Xe đâm đáy',
  },
  {
    name: '🌊 Hải Đáy Mò Trăng',
    fen: '4k4/4a4/9/9/9/9/9/9/4C4/3RK4 w - - 0 1',
    description: 'Sát pháp Mò Trăng Đáy Biển: Xe đè trên, Pháo luồn đáy',
  },
  {
    name: '🎯 Song Xe Tỏa Giáp',
    fen: '3Rk4/9/9/9/9/9/9/9/4AR3/4K4 w - - 0 1',
    description: 'Sát pháp Hai Xe kẹp nách cung',
  },
];

export const EditorView: React.FC<EditorViewProps> = ({
  pieceSet,
  onPlayWithAI,
  onAnalyze,
}) => {
  const [board, setBoard] = useState<Board>(() => parseFEN().board);
  const [turn, setTurn] = useState<Side>('red');
  const [selectedTool, setSelectedTool] = useState<{
    type: PieceType;
    side: Side;
  } | 'trash' | null>(null);
  const [boardSelectedSquare, setBoardSelectedSquare] = useState<Square | null>(null);
  const [fenInput, setFenInput] = useState<string>('');
  const [fenError, setFenError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [exportTitle, setExportTitle] = useState<string>('Kỳ Đạo - Thế Cờ Tướng');

  // Compute live FEN
  const currentFEN = useMemo(() => {
    return boardToFEN(board, turn);
  }, [board, turn]);

  // Count pieces on board
  const pieceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const p = board[r][c];
        if (p) {
          const key = `${p.side}_${p.type}`;
          counts[key] = (counts[key] || 0) + 1;
        }
      }
    }
    return counts;
  }, [board]);

  // Live Rule Validations
  const validationIssues = useMemo(() => {
    const issues: { type: 'error' | 'warning'; text: string }[] = [];

    const redKingCount = pieceCounts['red_general'] || 0;
    const blackKingCount = pieceCounts['black_general'] || 0;

    if (redKingCount === 0) issues.push({ type: 'error', text: 'Bên Đỏ chưa có Tướng (帥).' });
    if (redKingCount > 1) issues.push({ type: 'error', text: 'Bên Đỏ có nhiều hơn 1 Tướng.' });
    if (blackKingCount === 0) issues.push({ type: 'error', text: 'Bên Đen chưa có Tướng (將).' });
    if (blackKingCount > 1) issues.push({ type: 'error', text: 'Bên Đen có nhiều hơn 1 Tướng.' });

    // Validate positions of pieces on board
    let redKingPos: { r: number; c: number } | null = null;
    let blackKingPos: { r: number; c: number } | null = null;

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const p = board[r][c];
        if (!p) continue;

        // General Palace Check
        if (p.type === 'general') {
          if (p.side === 'red') {
            redKingPos = { r, c };
            if (r < 7 || r > 9 || c < 3 || c > 5) {
              issues.push({ type: 'error', text: `Tướng Đỏ tại ô ${toSquare(r, c)} nằm ngoài Cửu Cung.` });
            }
          } else {
            blackKingPos = { r, c };
            if (r < 0 || r > 2 || c < 3 || c > 5) {
              issues.push({ type: 'error', text: `Tướng Đen tại ô ${toSquare(r, c)} nằm ngoài Cửu Cung.` });
            }
          }
        }

        // Advisor Palace Check
        if (p.type === 'advisor') {
          if (p.side === 'red' && (r < 7 || r > 9 || c < 3 || c > 5)) {
            issues.push({ type: 'error', text: `Sĩ Đỏ tại ô ${toSquare(r, c)} nằm ngoài Cửu Cung.` });
          }
          if (p.side === 'black' && (r < 0 || r > 2 || c < 3 || c > 5)) {
            issues.push({ type: 'error', text: `Sĩ Đen tại ô ${toSquare(r, c)} nằm ngoài Cửu Cung.` });
          }
        }

        // Elephant River Check
        if (p.type === 'elephant') {
          if (p.side === 'red' && r < 5) {
            issues.push({ type: 'error', text: `Tượng Đỏ tại ô ${toSquare(r, c)} đã vượt qua sông.` });
          }
          if (p.side === 'black' && r > 4) {
            issues.push({ type: 'error', text: `Tượng Đen tại ô ${toSquare(r, c)} đã vượt qua sông.` });
          }
        }
      }
    }

    // Flying General Check
    if (redKingPos && blackKingPos && redKingPos.c === blackKingPos.c) {
      let obstacle = false;
      for (let r = blackKingPos.r + 1; r < redKingPos.r; r++) {
        if (board[r][redKingPos.c] !== null) {
          obstacle = true;
          break;
        }
      }
      if (!obstacle) {
        issues.push({ type: 'error', text: 'Lỗi Lộ Mặt Tướng: Hai Tướng đang đối mặt trực tiếp trên cùng cột.' });
      }
    }

    return issues;
  }, [board, pieceCounts]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSquareClick = (square: Square) => {
    const { row, col } = parseSquare(square);
    const existing = board[row][col];

    // 1. If Trash Tool is active -> Remove piece
    if (selectedTool === 'trash') {
      if (existing) {
        const next = board.map((r) => [...r]);
        next[row][col] = null;
        setBoard(next);
        soundEffects.playCapture();
      }
      return;
    }

    // 2. If a Piece is selected in the Palette -> Place on square
    if (selectedTool && typeof selectedTool === 'object') {
      const next = board.map((r) => [...r]);
      next[row][col] = {
        id: `${selectedTool.side}_${selectedTool.type}_${square}_${Date.now()}`,
        type: selectedTool.type,
        side: selectedTool.side,
        square,
      };
      setBoard(next);
      soundEffects.playMove();
      return;
    }

    // 3. No palette piece selected -> Select square to move or inspect
    if (boardSelectedSquare) {
      if (boardSelectedSquare === square) {
        setBoardSelectedSquare(null);
        return;
      }
      const { row: fR, col: fC } = parseSquare(boardSelectedSquare);
      const pieceToMove = board[fR][fC];
      if (pieceToMove) {
        const next = board.map((r) => [...r]);
        next[fR][fC] = null;
        next[row][col] = {
          ...pieceToMove,
          square,
        };
        setBoard(next);
        setBoardSelectedSquare(null);
        soundEffects.playMove();
        return;
      }
    }

    if (existing) {
      setBoardSelectedSquare(square);
    } else {
      setBoardSelectedSquare(null);
    }
  };

  const handleClearBoard = () => {
    setBoard(createEmptyBoard());
    setBoardSelectedSquare(null);
    showToast('Đã xóa trắng toàn bộ bàn cờ');
  };

  const handleResetInitial = () => {
    setBoard(parseFEN(INITIAL_FEN).board);
    setBoardSelectedSquare(null);
    showToast('Đã khôi phục bàn cờ tiêu chuẩn ban đầu');
  };

  const handleLoadPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    try {
      const parsed = parseFEN(preset.fen);
      setBoard(parsed.board);
      setTurn(parsed.turn);
      setBoardSelectedSquare(null);
      showToast(`Đã tải thế cờ: ${preset.name}`);
    } catch {
      showToast('Lỗi khi tải thế cờ mẫu');
    }
  };

  const handleLoadCustomFEN = () => {
    try {
      const parsed = parseFEN(fenInput.trim());
      setBoard(parsed.board);
      setTurn(parsed.turn);
      setFenError(null);
      setBoardSelectedSquare(null);
      showToast('Đã nạp thế cờ từ FEN thành công');
    } catch {
      setFenError('Chuỗi FEN không hợp lệ. Vui lòng kiểm tra lại!');
    }
  };

  const handleCopyFEN = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentFEN);
      showToast('📋 Đã sao chép chuỗi FEN vào bộ nhớ tạm!');
    }
  };

  const handleDownloadImage = () => {
    downloadBoardImage(board, 'the-co-ky-dao.png', {
      title: exportTitle || 'Kỳ Đạo - Thế Cờ Tướng',
      turn,
      pieceSet,
      watermark: 'Kỳ Đạo • daycotuong.vn',
    });
    showToast('📸 Đang tải ảnh bàn cờ HD về máy!');
  };

  const handleCopyImage = async () => {
    const success = await copyBoardImageToClipboard(board, {
      title: exportTitle || 'Kỳ Đạo - Thế Cờ Tướng',
      turn,
      pieceSet,
      watermark: 'Kỳ Đạo • daycotuong.vn',
    });
    if (success) {
      showToast('📋 Đã sao chép ảnh bàn cờ vào Clipboard! (Có thể dán vào Zalo/Facebook)');
    } else {
      showToast('Không thể sao chép ảnh tự động. Vui lòng dùng nút Tải ảnh!');
    }
  };

  const hasCriticalErrors = validationIssues.some((i) => i.type === 'error');

  return (
    <div className="editor-container">
      {/* Toast popup */}
      {toastMessage && <div className="editor-toast">{toastMessage}</div>}

      {/* Top Header */}
      <div className="editor-topbar">
        <div className="topbar-title-group">
          <h2>♟️ Bàn Cờ Tự Xếp Thế & Xuất Ảnh HD</h2>
          <p>Tự do dàn trận, tạo thế cờ theo ý muốn, xuất ảnh chia sẻ hoặc luyện tập trực tiếp với AI</p>
        </div>

        <div className="editor-header-actions">
          <button
            className="btn-primary"
            onClick={() => onPlayWithAI(currentFEN)}
            disabled={hasCriticalErrors}
            title={hasCriticalErrors ? 'Vui lòng sửa các lỗi luật cờ trước khi thi đấu' : 'Bắt đầu ván đấu với AI từ thế cờ này'}
          >
            ⚔️ Đấu với máy từ thế này
          </button>
          <button
            className="btn-secondary"
            onClick={() => onAnalyze(board)}
            disabled={hasCriticalErrors}
            title="Mở thế cờ này trong module Phân tích để xem điểm số"
          >
            🔍 Phân tích thế trận
          </button>
        </div>
      </div>

      <div className="editor-body">
        {/* Main Board Column */}
        <div className="editor-board-col">
          <XiangqiBoard
            board={board}
            selectedSquare={boardSelectedSquare}
            pieceSet={pieceSet}
            interactive={true}
            onSquareClick={handleSquareClick}
          />

          {/* Quick Clear / Reset Action Bar */}
          <div className="board-quick-actions">
            <button className="btn-secondary btn-sm" onClick={handleClearBoard} title="Xóa toàn bộ quân trên bàn cờ">
              🧹 Xóa trắng
            </button>
            <button className="btn-secondary btn-sm" onClick={handleResetInitial} title="Xếp lại 32 quân ở vị trí xuất phát">
              ♟️ Xếp ban đầu
            </button>
            <button
              className={`btn-secondary btn-sm ${turn === 'red' ? 'active-red' : 'active-black'}`}
              onClick={() => setTurn((t) => (t === 'red' ? 'black' : 'red'))}
              title="Đổi bên đi trước trong thế cờ này"
            >
              Lượt đi: {turn === 'red' ? '🔴 Đỏ (Tiên)' : '⚫ Đen (Hậu)'}
            </button>
          </div>
        </div>

        {/* Tools & Settings Column */}
        <div className="editor-tools-col">
          {/* Piece Palette Card */}
          <div className="editor-card palette-card">
            <h4>📦 Khay Quân Cờ (Chọn quân rồi bấm vào ô để đặt)</h4>

            {/* Red Pieces */}
            <div className="palette-group">
              <span className="palette-group-title red">🔴 Quân Đỏ:</span>
              <div className="palette-piece-grid">
                {PALETTE_PIECES.map((item) => {
                  const isSelected =
                    selectedTool &&
                    typeof selectedTool === 'object' &&
                    selectedTool.type === item.type &&
                    selectedTool.side === 'red';
                  const currentCount = pieceCounts[`red_${item.type}`] || 0;

                  return (
                    <button
                      key={`red-${item.type}`}
                      className={`palette-piece-btn red ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedTool({ type: item.type, side: 'red' })}
                      title={`${item.label} Đỏ (Hiện có: ${currentCount}/${item.maxCount})`}
                    >
                      <span className="piece-char-tag">
                        {pieceSet === 'traditional' ? item.charRed : item.label}
                      </span>
                      <span className="count-badge">{currentCount}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Black Pieces */}
            <div className="palette-group">
              <span className="palette-group-title black">⚫ Quân Đen:</span>
              <div className="palette-piece-grid">
                {PALETTE_PIECES.map((item) => {
                  const isSelected =
                    selectedTool &&
                    typeof selectedTool === 'object' &&
                    selectedTool.type === item.type &&
                    selectedTool.side === 'black';
                  const currentCount = pieceCounts[`black_${item.type}`] || 0;

                  return (
                    <button
                      key={`black-${item.type}`}
                      className={`palette-piece-btn black ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedTool({ type: item.type, side: 'black' })}
                      title={`${item.label} Đen (Hiện có: ${currentCount}/${item.maxCount})`}
                    >
                      <span className="piece-char-tag">
                        {pieceSet === 'traditional' ? item.charBlack : item.label}
                      </span>
                      <span className="count-badge">{currentCount}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trash / Selection Tools */}
            <div className="palette-extra-tools">
              <button
                className={`tool-btn ${selectedTool === 'trash' ? 'active-trash' : ''}`}
                onClick={() => setSelectedTool((prev) => (prev === 'trash' ? null : 'trash'))}
                title="Bấm vào quân bất kỳ trên bàn cờ để xóa"
              >
                🗑️ Chế độ Xóa quân ({selectedTool === 'trash' ? 'Đang bật' : 'Tắt'})
              </button>
              <button
                className={`tool-btn ${selectedTool === null ? 'active-pointer' : ''}`}
                onClick={() => setSelectedTool(null)}
                title="Chế độ di chuyển quân trên bàn cờ"
              >
                👆 Chế độ Chọn / Di chuyển
              </button>
            </div>
          </div>

          {/* Validation & Live Status Card */}
          <div className="editor-card validation-card">
            <h4>Kiểm tra tính hợp lệ của thế cờ</h4>
            {validationIssues.length === 0 ? (
              <div className="valid-status-badge">
                ✅ Thế cờ hoàn toàn chuẩn luật cờ tướng, sẵn sàng để đấu hoặc phân tích!
              </div>
            ) : (
              <div className="issues-list">
                {validationIssues.map((issue, idx) => (
                  <div key={idx} className={`issue-item ${issue.type}`}>
                    {issue.type === 'error' ? '❌' : '⚠️'} {issue.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export HD Image Card */}
          <div className="editor-card export-image-card">
            <h4>📸 Xuất Ảnh Bàn Cờ HD (Đăng Facebook / Zalo)</h4>
            <div className="export-title-row">
              <input
                type="text"
                placeholder="Nhập tiêu đề thế cờ (ví dụ: Thế Sát Pháp Song Xe)"
                value={exportTitle}
                onChange={(e) => setExportTitle(e.target.value)}
              />
            </div>
            <div className="export-buttons-row">
              <button className="btn-primary btn-sm" onClick={handleDownloadImage} title="Tải ảnh PNG độ nét cao về máy">
                📥 Tải ảnh PNG về máy
              </button>
              <button className="btn-secondary btn-sm" onClick={handleCopyImage} title="Sao chép ảnh trực tiếp để dán vào Zalo/Facebook">
                📋 Sao chép ảnh
              </button>
            </div>
          </div>

          {/* FEN String & Presets Card */}
          <div className="editor-card fen-card">
            <h4>Chuỗi FEN & Thế cờ mẫu</h4>
            <div className="fen-display-row">
              <input type="text" readOnly value={currentFEN} className="fen-readonly-input" />
              <button className="btn-secondary btn-sm" onClick={handleCopyFEN} title="Sao chép chuỗi FEN">
                Sao chép
              </button>
            </div>

            {/* Custom FEN Import */}
            <div className="fen-import-sub">
              <input
                type="text"
                placeholder="Dán chuỗi FEN tùy ý để nạp vào bàn cờ..."
                value={fenInput}
                onChange={(e) => setFenInput(e.target.value)}
              />
              <button className="btn-secondary btn-sm" onClick={handleLoadCustomFEN}>
                Tải FEN
              </button>
            </div>
            {fenError && <p className="fen-error-text">{fenError}</p>}

            {/* Preset Templates Grid */}
            <div className="presets-section">
              <span className="presets-label">Thế cờ mẫu kinh điển:</span>
              <div className="presets-grid">
                {PRESET_TEMPLATES.map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    className="preset-pill-btn"
                    onClick={() => handleLoadPreset(preset)}
                    title={preset.description}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
