import React, { useState } from 'react';
import { StoredGameRecord, deleteGameFromHistory, clearAllGameHistory } from '../../play/gameStorage';
import { exportToPGN, parsePGN } from '../../core/pgn';
import { Move } from '../../core/types';
import { XiangqiGame } from '../../core/gameEngine';

interface GameHistoryModalProps {
  isOpen: boolean;
  history: StoredGameRecord[];
  onClose: () => void;
  onResumeGame: (record: StoredGameRecord) => void;
  onAnalyzeGame: (initialFEN: string, moves: Move[]) => void;
  onImportGame: (initialFEN: string, moves: Move[], title?: string) => void;
  onRefreshHistory: () => void;
}

export const GameHistoryModal: React.FC<GameHistoryModalProps> = ({
  isOpen,
  history,
  onClose,
  onResumeGame,
  onAnalyzeGame,
  onImportGame,
  onRefreshHistory,
}) => {
  const [activeTab, setActiveTab] = useState<'saved' | 'import' | 'export_selected'>('saved');
  const [selectedRecord, setSelectedRecord] = useState<StoredGameRecord | null>(null);
  const [importText, setImportText] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc muốn xóa ván cờ này khỏi lịch sử?')) {
      deleteGameFromHistory(id);
      onRefreshHistory();
      if (selectedRecord?.id === id) setSelectedRecord(null);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử các ván cờ đã lưu?')) {
      clearAllGameHistory();
      onRefreshHistory();
      setSelectedRecord(null);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(`Đã sao chép ${label} vào clipboard!`);
    setTimeout(() => setCopySuccess(null), 2500);
  };

  const handleDownloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = () => {
    setImportError(null);
    const trimmed = importText.trim();
    if (!trimmed) {
      setImportError('Vui lòng nhập FEN, PGN hoặc JSON.');
      return;
    }

    try {
      // 1. Check if JSON format
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const json = JSON.parse(trimmed);
        if (json.initialFEN && Array.isArray(json.moves)) {
          onImportGame(json.initialFEN, json.moves, json.aiName ? `Nhập JSON (${json.aiName})` : 'Ván cờ JSON');
          onClose();
          return;
        }
      }

      // 2. Check if FEN format (single line containing 10 rows)
      if (trimmed.includes('/') && trimmed.split('/').length === 10) {
        onImportGame(trimmed, [], 'Thế cờ FEN');
        onClose();
        return;
      }

      // 3. Parse as PGN
      const parsed = parsePGN(trimmed);
      if (parsed.moves.length > 0 || parsed.initialFEN) {
        onImportGame(
          parsed.initialFEN,
          parsed.moves,
          parsed.headers.Event || 'Ván cờ PGN'
        );
        onClose();
        return;
      }

      setImportError('Không thể nhận diện định dạng ván cờ (hỗ trợ PGN, FEN hoặc JSON).');
    } catch (err: any) {
      setImportError(`Lỗi khi nhập ván cờ: ${err.message || err}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportText(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="game-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="history-modal-tabs">
            <button
              className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
              onClick={() => setActiveTab('saved')}
            >
              📚 Lịch Sử Ván Cờ ({history.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
              onClick={() => setActiveTab('import')}
            >
              📥 Nhập FEN / PGN
            </button>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body history-body">
          {copySuccess && <div className="feedback-alert success">{copySuccess}</div>}

          {activeTab === 'saved' && (
            <div className="saved-games-container">
              {history.length === 0 ? (
                <div className="empty-history-placeholder">
                  <span className="placeholder-icon">📭</span>
                  <p>Chưa có ván cờ nào được lưu trữ.</p>
                  <span className="placeholder-hint">
                    Các ván cờ bạn đang chơi hoặc kết thúc sẽ tự động được lưu tại đây để xem lại bất cứ lúc nào.
                  </span>
                </div>
              ) : (
                <>
                  <div className="history-actions-bar">
                    <span className="history-summary-text">
                      Lưu trữ tối đa 50 ván cờ gần nhất trên thiết bị này.
                    </span>
                    <button className="btn-danger-outline btn-sm" onClick={handleClearAll}>
                      🗑️ Xóa tất cả
                    </button>
                  </div>

                  <div className="history-games-list">
                    {history.map((record) => {
                      const isSelected = selectedRecord?.id === record.id;
                      const resultBadge =
                        record.result === 'win'
                          ? 'Thắng'
                          : record.result === 'loss'
                          ? 'Thua'
                          : record.result === 'draw'
                          ? 'Hòa'
                          : 'Dở dang';

                      const badgeClass =
                        record.result === 'win'
                          ? 'badge-win'
                          : record.result === 'loss'
                          ? 'badge-loss'
                          : record.result === 'draw'
                          ? 'badge-draw'
                          : 'badge-progress';

                      const pgnString = exportToPGN({
                        headers: {
                          Event: `Đấu AI (${record.aiName})`,
                          Date: record.dateFormatted,
                          Red: record.playerSide === 'red' ? 'Người chơi' : `AI ${record.aiName}`,
                          Black: record.playerSide === 'black' ? 'Người chơi' : `AI ${record.aiName}`,
                          Result:
                            record.result === 'win'
                              ? record.playerSide === 'red'
                                ? '1-0'
                                : '0-1'
                              : record.result === 'loss'
                              ? record.playerSide === 'red'
                                ? '0-1'
                                : '1-0'
                              : record.result === 'draw'
                              ? '1/2-1/2'
                              : '*',
                        },
                        moves: record.moves,
                        initialFEN: record.initialFEN,
                      });

                      return (
                        <div
                          key={record.id}
                          className={`history-card-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedRecord(isSelected ? null : record)}
                        >
                          <div className="card-top-row">
                            <span className={`result-tag ${badgeClass}`}>
                              {resultBadge}
                            </span>
                            <span className="game-date">{record.dateFormatted}</span>
                            <button
                              className="btn-delete-item"
                              onClick={(e) => handleDelete(record.id, e)}
                              title="Xóa ván cờ này"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="card-info-row">
                            <span className="opponent-tag">
                              🤖 vs AI Cấp {record.aiLevel} ({record.aiName})
                            </span>
                            <span className="side-tag">
                              {record.playerSide === 'red' ? '🔴 Cầm Đỏ' : '⚫ Cầm Đen'}
                            </span>
                            <span className="moves-count-tag">
                              {record.totalMoves} nước đi
                            </span>
                          </div>

                          {record.resultReason && (
                            <div className="card-reason-row">
                              {record.resultReason}
                            </div>
                          )}

                          <div className="card-controls-row">
                            <button
                              className="btn-primary btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onResumeGame(record);
                                onClose();
                              }}
                              title="Chơi tiếp ván cờ này"
                            >
                              🔄 Tiếp tục chơi
                            </button>
                            <button
                              className="btn-secondary btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAnalyzeGame(record.initialFEN, record.moves);
                                onClose();
                              }}
                              title="Phân tích ván cờ với AI"
                            >
                              🔍 Phân tích ván
                            </button>
                            <button
                              className="btn-secondary btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(pgnString, 'biên bản PGN');
                              }}
                              title="Sao chép PGN"
                            >
                              📋 Copy PGN
                            </button>
                            <button
                              className="btn-secondary btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadFile(pgnString, `kydao_${record.id}.pgn`, 'text/plain');
                              }}
                              title="Tải file PGN"
                            >
                              💾 Tải PGN
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'import' && (
            <div className="import-container">
              <label className="import-label">
                Dán chuỗi <strong>PGN, FEN</strong> hoặc <strong>JSON</strong> của ván cờ vào khung bên dưới:
              </label>
              <textarea
                className="import-textarea"
                rows={8}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`Ví dụ PGN:
[Event "Kỳ Đạo Trực Tuyến"]
[Date "2026.09.25"]
[Red "Người chơi"]
[Black "AI Kỳ Đạo"]

1. P2-5 P8-5 2. M2.3 M8.7 ...`}
              />

              <div className="import-file-row">
                <label className="file-upload-btn">
                  📁 Hoặc tải tệp từ máy (.pgn, .fen, .json)
                  <input
                    type="file"
                    accept=".pgn,.fen,.json,.txt"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {importError && <div className="feedback-alert error">{importError}</div>}

              <div className="import-actions">
                <button className="btn-primary" onClick={handleImportSubmit}>
                  🚀 Nạp ván cờ & Bắt đầu
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
