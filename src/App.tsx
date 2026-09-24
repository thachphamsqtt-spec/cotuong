import React, { useState, useEffect } from 'react';
import { LearnView } from './components/Learn/LearnView';
import { PracticeView } from './components/Practice/PracticeView';
import { PlayView } from './components/Play/PlayView';
import { AnalysisView } from './components/Analysis/AnalysisView';
import { EditorView } from './components/Editor/EditorView';
import { InstallPwaBanner } from './components/PWA/InstallPwaBanner';
import { PieceSet } from './components/Board/XiangqiBoard';
import { Board, Move } from './core/types';
import { soundEffects } from './audio/soundFX';
import { parseFEN } from './core/fen';

type ActiveTab = 'learn' | 'practice' | 'play' | 'analysis' | 'editor';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('learn');
  const [pieceSet, setPieceSet] = useState<PieceSet>('traditional');
  const [notationFormat, setNotationFormat] = useState<'short' | 'full'>('full');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  // Analysis target game state
  const [analysisInitialBoard, setAnalysisInitialBoard] = useState<Board>(() => parseFEN().board);
  const [analysisMoves, setAnalysisMoves] = useState<Move[]>([]);

  // Custom play FEN from Editor
  const [customPlayFEN, setCustomPlayFEN] = useState<string | undefined>(undefined);

  useEffect(() => {
    soundEffects.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  const handleStartAnalysis = (initialBoard: Board, moves: Move[]) => {
    setAnalysisInitialBoard(initialBoard);
    setAnalysisMoves(moves);
    setActiveTab('analysis');
  };

  const handlePlayFromEditor = (fen: string) => {
    setCustomPlayFEN(fen);
    setActiveTab('play');
  };

  return (
    <div className={`app-root ${themeMode}`}>
      {/* Top Navbar */}
      <header className="main-navbar">
        <div className="nav-brand">
          <div className="brand-logo-piece">帥</div>
          <div className="brand-text">
            <h1 className="brand-name">Kỳ Đạo</h1>
            <span className="brand-tagline">Học – Luyện – Đấu Cờ Tướng</span>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <nav className="nav-tab-group" role="tablist">
          <button
            className={`nav-tab-btn ${activeTab === 'learn' ? 'active' : ''}`}
            onClick={() => setActiveTab('learn')}
            role="tab"
            aria-selected={activeTab === 'learn'}
          >
            <span className="tab-icon">🎓</span>
            <span className="tab-text">Học Cờ</span>
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'practice' ? 'active' : ''}`}
            onClick={() => setActiveTab('practice')}
            role="tab"
            aria-selected={activeTab === 'practice'}
          >
            <span className="tab-icon">🧩</span>
            <span className="tab-text">Luyện Tập</span>
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'play' ? 'active' : ''}`}
            onClick={() => setActiveTab('play')}
            role="tab"
            aria-selected={activeTab === 'play'}
          >
            <span className="tab-icon">⚔️</span>
            <span className="tab-text">Đấu Máy</span>
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
            role="tab"
            aria-selected={activeTab === 'analysis'}
          >
            <span className="tab-icon">🔍</span>
            <span className="tab-text">Phân Tích</span>
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
            role="tab"
            aria-selected={activeTab === 'editor'}
          >
            <span className="tab-icon">♟️</span>
            <span className="tab-text">Xếp Cờ</span>
          </button>
        </nav>

        {/* Right Settings & Controls */}
        <div className="nav-actions">
          <button
            className="icon-action-btn"
            onClick={() => setSoundEnabled((prev) => !prev)}
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <button
            className="icon-action-btn"
            onClick={() => setThemeMode((m) => (m === 'dark' ? 'light' : 'dark'))}
            title={themeMode === 'dark' ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
          >
            {themeMode === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            className="icon-action-btn"
            onClick={() => setSettingsOpen(true)}
            title="Cài đặt quân cờ và hiển thị"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* PWA Install Banner */}
      <InstallPwaBanner />

      {/* Main View Area */}
      <main className="main-content-area">
        {activeTab === 'learn' && <LearnView pieceSet={pieceSet} />}
        {activeTab === 'practice' && <PracticeView pieceSet={pieceSet} />}
        {activeTab === 'play' && (
          <PlayView
            pieceSet={pieceSet}
            notationFormat={notationFormat}
            customInitialFEN={customPlayFEN}
            onAnalyzeGame={handleStartAnalysis}
          />
        )}
        {activeTab === 'analysis' && (
          <AnalysisView
            initialBoard={analysisInitialBoard}
            moves={analysisMoves}
            pieceSet={pieceSet}
            onBackToPlay={() => setActiveTab('play')}
          />
        )}
        {activeTab === 'editor' && (
          <EditorView
            pieceSet={pieceSet}
            onPlayWithAI={handlePlayFromEditor}
            onAnalyze={(board) => handleStartAnalysis(board, [])}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" role="tablist" aria-label="Điều hướng di động">
        <button
          className={`mobile-tab-btn ${activeTab === 'learn' ? 'active' : ''}`}
          onClick={() => setActiveTab('learn')}
          role="tab"
          aria-selected={activeTab === 'learn'}
        >
          <span className="mobile-tab-icon">🎓</span>
          <span className="mobile-tab-text">Học Cờ</span>
        </button>
        <button
          className={`mobile-tab-btn ${activeTab === 'practice' ? 'active' : ''}`}
          onClick={() => setActiveTab('practice')}
          role="tab"
          aria-selected={activeTab === 'practice'}
        >
          <span className="mobile-tab-icon">🧩</span>
          <span className="mobile-tab-text">Luyện Tập</span>
        </button>
        <button
          className={`mobile-tab-btn ${activeTab === 'play' ? 'active' : ''}`}
          onClick={() => setActiveTab('play')}
          role="tab"
          aria-selected={activeTab === 'play'}
        >
          <span className="mobile-tab-icon">⚔️</span>
          <span className="mobile-tab-text">Đấu Máy</span>
        </button>
        <button
          className={`mobile-tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
          role="tab"
          aria-selected={activeTab === 'analysis'}
        >
          <span className="mobile-tab-icon">🔍</span>
          <span className="mobile-tab-text">Phân Tích</span>
        </button>
        <button
          className={`mobile-tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
          role="tab"
          aria-selected={activeTab === 'editor'}
        >
          <span className="mobile-tab-icon">♟️</span>
          <span className="mobile-tab-text">Xếp Cờ</span>
        </button>
      </nav>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚙️ Cài Đặt Ứng Dụng</h3>
              <button className="close-btn" onClick={() => setSettingsOpen(false)}>
                ✕
              </button>
            </div>

            <div className="settings-body">
              {/* Piece Set Option */}
              <div className="setting-group">
                <label className="setting-label">Bộ quân cờ:</label>
                <div className="setting-options-grid">
                  <button
                    className={`setting-choice-btn ${pieceSet === 'traditional' ? 'active' : ''}`}
                    onClick={() => setPieceSet('traditional')}
                  >
                    <span className="preview-piece">帥 / 將</span>
                    <span>Chữ Hán phồn thể (Chuẩn)</span>
                  </button>
                  <button
                    className={`setting-choice-btn ${pieceSet === 'simplified' ? 'active' : ''}`}
                    onClick={() => setPieceSet('simplified')}
                  >
                    <span className="preview-piece">帅 / 将</span>
                    <span>Chữ Hán giản thể</span>
                  </button>
                  <button
                    className={`setting-choice-btn ${pieceSet === 'vietnamese' ? 'active' : ''}`}
                    onClick={() => setPieceSet('vietnamese')}
                  >
                    <span className="preview-piece">Tướng</span>
                    <span>Ký hiệu Tiếng Việt</span>
                  </button>
                </div>
              </div>

              {/* Notation Format Option */}
              <div className="setting-group">
                <label className="setting-label">Biên bản nước đi:</label>
                <div className="setting-options-grid">
                  <button
                    className={`setting-choice-btn ${notationFormat === 'full' ? 'active' : ''}`}
                    onClick={() => setNotationFormat('full')}
                  >
                    <span>Pháo 2 bình 5 (Đầy đủ)</span>
                  </button>
                  <button
                    className={`setting-choice-btn ${notationFormat === 'short' ? 'active' : ''}`}
                    onClick={() => setNotationFormat('short')}
                  >
                    <span>P2-5 (Viết tắt sách cờ)</span>
                  </button>
                </div>
              </div>

              {/* Sound Option */}
              <div className="setting-group-inline">
                <span>Âm thanh đặt quân & chiếu tướng</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {/* Theme Option */}
              <div className="setting-group-inline">
                <span>Giao diện nền tối (Dark mode)</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={themeMode === 'dark'}
                    onChange={(e) => setThemeMode(e.target.checked ? 'dark' : 'light')}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {/* PWA & Offline Support Info */}
              <div className="setting-group">
                <label className="setting-label">📲 Cài đặt App & Ngoại tuyến (PWA):</label>
                <div className="pwa-settings-box">
                  <div className="pwa-status-badge offline-ready">
                    <span className="pwa-status-dot"></span>
                    <span>Hỗ trợ chơi Offline 100% không cần mạng</span>
                  </div>
                  <div className="pwa-ios-instructions">
                    💡 <strong>Mẹo cài đặt:</strong>
                    <br />
                    • <strong>Android / Chrome:</strong> Chọn biểu tượng cài đặt trên thanh địa chỉ hoặc nhấn banner xuất hiện trên đầu trang.
                    <br />
                    • <strong>iPhone / Safari:</strong> Nhấn biểu tượng Chia sẻ (Share) 📤 rồi chọn <strong>"Thêm vào Màn hình chính" (Add to Home Screen)</strong>.
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setSettingsOpen(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
