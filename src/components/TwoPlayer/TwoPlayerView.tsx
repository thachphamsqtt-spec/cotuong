import React, { useState, useEffect, useRef, useCallback } from 'react';
import { XiangqiGame } from '../../core/gameEngine';
import { Board, Move, Side, Square } from '../../core/types';
import { toVietnameseNotation } from '../../core/vietnameseNotation';
import { soundEffects } from '../../audio/soundFX';
import { XiangqiBoard, PieceSet } from '../Board/XiangqiBoard';
import { parseSquare } from '../../core/board';
import { p2pService } from '../../services/p2pService';
import { exportToPGN } from '../../core/pgn';

interface TwoPlayerViewProps {
  pieceSet: PieceSet;
  notationFormat: 'short' | 'full';
  onAnalyzeGame: (initialBoard: Board, moves: Move[]) => void;
}

type ModeTab = 'local' | 'online';

export const TwoPlayerView: React.FC<TwoPlayerViewProps> = ({
  pieceSet,
  notationFormat,
  onAnalyzeGame,
}) => {
  const [modeTab, setModeTab] = useState<ModeTab>('local');

  // --- Local Pass & Play State ---
  const [localGame, setLocalGame] = useState<XiangqiGame>(() => new XiangqiGame());
  const [localTimeControl, setLocalTimeControl] = useState<'none' | '5m' | '10m' | '15m'>('10m');
  const [localRedTime, setLocalRedTime] = useState<number>(600);
  const [localBlackTime, setLocalBlackTime] = useState<number>(600);
  const [localAutoFlip, setLocalAutoFlip] = useState<boolean>(false);
  const [localIsFlipped, setLocalIsFlipped] = useState<boolean>(false);
  const [localSelectedSquare, setLocalSelectedSquare] = useState<Square | null>(null);
  const [localMoveHistory, setLocalMoveHistory] = useState<{ notation: string; move: Move }[]>([]);
  const [localGameOverModal, setLocalGameOverModal] = useState<{
    show: boolean;
    title: string;
    reason: string;
  } | null>(null);

  // ---  // Online State
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('cotuong_player_name') || `Kỳ Thủ ${Math.floor(100 + Math.random() * 900)}`;
  });
  const [onlineHostSide, setOnlineHostSide] = useState<Side | 'random'>('random');
  const [onlineTimeControl, setOnlineTimeControl] = useState<'none' | '5m' | '10m' | '15m'>('10m');
  const [myRoomCode, setMyRoomCode] = useState<string>('');
  const [currentOnlineRoomCode, setCurrentOnlineRoomCode] = useState<string>('');
  const [roomHostName, setRoomHostName] = useState<string>('');
  const [isGuestJoined, setIsGuestJoined] = useState<boolean>(false);
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [isHosting, setIsHosting] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [onlineStatusMessage, setOnlineStatusMessage] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Online Game In-Progress State
  const [onlineGameActive, setOnlineGameActive] = useState<boolean>(false);
  const [onlineGame, setOnlineGame] = useState<XiangqiGame>(() => new XiangqiGame());
  const [mySide, setMySide] = useState<Side>('red');
  const [opponentName, setOpponentName] = useState<string>('Đối Thủ');
  const [onlineRedTime, setOnlineRedTime] = useState<number>(600);
  const [onlineBlackTime, setOnlineBlackTime] = useState<number>(600);
  const [onlineSelectedSquare, setOnlineSelectedSquare] = useState<Square | null>(null);
  const [onlineMoveHistory, setOnlineMoveHistory] = useState<{ notation: string; move: Move }[]>([]);
  const [onlineChatMessages, setOnlineChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [recentEmojiReaction, setRecentEmojiReaction] = useState<{ sender: string; emoji: string } | null>(null);

  // Online Dialogs & Confirmations
  const [incomingDrawOffer, setIncomingDrawOffer] = useState<boolean>(false);
  const [incomingUndoOffer, setIncomingUndoOffer] = useState<boolean>(false);
  const [incomingRematchOffer, setIncomingRematchOffer] = useState<boolean>(false);
  const [onlineGameOverModal, setOnlineGameOverModal] = useState<{
    show: boolean;
    title: string;
    reason: string;
  } | null>(null);

  const initialLocalBoardRef = useRef<Board>(localGame.getBoard());
  const initialOnlineBoardRef = useRef<Board>(onlineGame.getBoard());

  // Save nickname
  const handleNameChange = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('cotuong_player_name', name);
  };

  // --- Auto-join from URL parameter on initial mount ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      const clean = roomParam.trim().replace(/^cotuong-p2p-/i, '').toUpperCase();
      setModeTab('online');
      setJoinCodeInput(clean);
      setOnlineStatusMessage(`Đã nhận diện liên kết phòng [${clean}]. Bấm "Vào Phòng Ngay" để tham gia!`);
    }
  }, []);

  // --- Local Game Clocks ---
  useEffect(() => {
    if (localGameOverModal?.show || localTimeControl === 'none') return;

    const timer = setInterval(() => {
      const turn = localGame.getTurn();
      if (turn === 'red') {
        setLocalRedTime((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            soundEffects.playDefeat();
            setLocalGameOverModal({
              show: true,
              title: 'HẾT GIỜ!',
              reason: 'Bên Đỏ đã hết thời gian. Bên Đen giành chiến thắng!',
            });
            return 0;
          }
          if (prev === 30 || prev === 10) soundEffects.playCheck();
          return prev - 1;
        });
      } else {
        setLocalBlackTime((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            soundEffects.playDefeat();
            setLocalGameOverModal({
              show: true,
              title: 'HẾT GIỜ!',
              reason: 'Bên Đen đã hết thời gian. Bên Đỏ giành chiến thắng!',
            });
            return 0;
          }
          if (prev === 30 || prev === 10) soundEffects.playCheck();
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [localGame, localGameOverModal, localTimeControl]);

  // --- Online Game Clocks ---
  useEffect(() => {
    if (!onlineGameActive || onlineGameOverModal?.show || onlineTimeControl === 'none') return;

    const timer = setInterval(() => {
      const turn = onlineGame.getTurn();
      if (turn === 'red') {
        setOnlineRedTime((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            const winner = mySide === 'red' ? 'Đối thủ' : 'Bạn';
            setOnlineGameOverModal({
              show: true,
              title: 'HẾT GIỜ!',
              reason: `Bên Đỏ hết giờ. ${winner} thắng cuộc!`,
            });
            return 0;
          }
          return prev - 1;
        });
      } else {
        setOnlineBlackTime((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            const winner = mySide === 'black' ? 'Đối thủ' : 'Bạn';
            setOnlineGameOverModal({
              show: true,
              title: 'HẾT GIỜ!',
              reason: `Bên Đen hết giờ. ${winner} thắng cuộc!`,
            });
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [onlineGameActive, onlineGame, onlineGameOverModal, onlineTimeControl, mySide]);

  // --- Format Seconds to MM:SS ---
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ==========================================
  // LOCAL PASS & PLAY LOGIC
  // ==========================================
  const startNewLocalGame = useCallback((tc = localTimeControl) => {
    const newG = new XiangqiGame();
    setLocalGame(newG);
    initialLocalBoardRef.current = newG.getBoard();
    setLocalSelectedSquare(null);
    setLocalMoveHistory([]);
    setLocalGameOverModal(null);

    const initialSecs = tc === '5m' ? 300 : tc === '10m' ? 600 : tc === '15m' ? 900 : 0;
    setLocalRedTime(initialSecs);
    setLocalBlackTime(initialSecs);
  }, [localTimeControl]);

  const handleLocalSquareClick = (sq: Square) => {
    if (localGameOverModal?.show) return;

    const board = localGame.getBoard();
    const { row, col } = parseSquare(sq);
    const piece = board[row][col];
    const turn = localGame.getTurn();

    if (!localSelectedSquare) {
      if (piece && piece.side === turn) {
        setLocalSelectedSquare(sq);
        soundEffects.playMove();
      }
      return;
    }

    if (localSelectedSquare === sq) {
      setLocalSelectedSquare(null);
      return;
    }

    if (piece && piece.side === turn) {
      setLocalSelectedSquare(sq);
      soundEffects.playMove();
      return;
    }

    // Try executing move
    const legal = localGame.getLegalMoves();
    const targetMove = legal.find((m) => m.from === localSelectedSquare && m.to === sq);

    if (targetMove) {
      const isCapture = Boolean(board[parseSquare(sq).row][parseSquare(sq).col]);
      const prevBoard = localGame.getBoard();
      const nextTurn = turn === 'red' ? 'black' : 'red';
      const notation = toVietnameseNotation(prevBoard, targetMove, notationFormat);

      const res = localGame.makeMove(targetMove.from, targetMove.to);
      if (res.success) {
        setLocalMoveHistory((prev) => [...prev, { notation, move: targetMove }]);
        setLocalSelectedSquare(null);

        // Sound
        if (res.status === 'stalemate' || res.status === 'loss_perpetual_check') {
          soundEffects.playVictory();
          setLocalGameOverModal({
            show: true,
            title: 'HẾT NƯỚC ĐI!',
            reason: `Bên ${turn === 'red' ? 'Đỏ' : 'Đen'} đã dồn đối phương vào thế hết nước đi và giành chiến thắng!`,
          });
        } else if (res.status === 'check') {
          soundEffects.playCheck();
        } else if (isCapture) {
          soundEffects.playCapture();
        } else {
          soundEffects.playMove();
        }

        // Auto flip if enabled
        if (localAutoFlip) {
          setLocalIsFlipped(nextTurn === 'black');
        }
      }
    } else {
      setLocalSelectedSquare(null);
    }
  };

  const handleLocalUndo = () => {
    if (localMoveHistory.length === 0) return;
    localGame.undo();
    setLocalMoveHistory((prev) => prev.slice(0, -1));
    setLocalSelectedSquare(null);
    if (localAutoFlip) {
      setLocalIsFlipped(localGame.getTurn() === 'black');
    }
  };

  const handleLocalResign = () => {
    const loser = localGame.getTurn();
    const winner = loser === 'red' ? 'Đen' : 'Đỏ';
    soundEffects.playDefeat();
    setLocalGameOverModal({
      show: true,
      title: 'ĐẦU HÀNG',
      reason: `Bên ${loser === 'red' ? 'Đỏ' : 'Đen'} xin hàng. Bên ${winner} giành chiến thắng!`,
    });
  };

  // ==========================================
  // ONLINE P2P WEBRTC LOGIC
  // ==========================================
  const setupP2PCallbacks = () => {
    return {
      onPeerReady: (code: string) => {
        setMyRoomCode(code);
      },
      onConnected: (peerName: string) => {
        setOpponentName(peerName || 'Kỳ Thủ');
        setIsConnecting(false);
        setOnlineStatusMessage(`🟢 Đã kết nối với [${peerName}]!`);
      },
      onRoomInfo: (info: { roomCode: string; hostName: string }) => {
        setCurrentOnlineRoomCode(info.roomCode);
        setRoomHostName(info.hostName);
        setOpponentName(info.hostName);
        setIsGuestJoined(true);
        setIsHosting(false);
        setIsConnecting(false);
        setOnlineStatusMessage(`🟢 Đã vào phòng [${info.roomCode}] của [${info.hostName}]! Đang chờ chủ phòng bắt đầu...`);
      },
      onDisconnected: () => {
        setOnlineStatusMessage('Đối thủ đã rời phòng hoặc mất kết nối mạng.');
        setOnlineGameOverModal({
          show: true,
          title: 'MẤT KẾT NỐI',
          reason: 'Đối thủ đã ngắt kết nối khỏi ván đấu.',
        });
      },
      onGameStart: (config: { mySide: Side; timeControl: string; opponentName: string; roomCode: string }) => {
        setMySide(config.mySide);
        setOpponentName(config.opponentName);
        if (config.roomCode) {
          setCurrentOnlineRoomCode(config.roomCode);
        }
        const newG = new XiangqiGame();
        setOnlineGame(newG);
        initialOnlineBoardRef.current = newG.getBoard();
        setOnlineGameActive(true);
        setOnlineMoveHistory([]);
        setOnlineSelectedSquare(null);
        setOnlineGameOverModal(null);

        const initialSecs =
          config.timeControl === '5m' ? 300 : config.timeControl === '10m' ? 600 : config.timeControl === '15m' ? 900 : 0;
        setOnlineRedTime(initialSecs);
        setOnlineBlackTime(initialSecs);
        soundEffects.playVictory();
      },
      onMoveReceived: (move: Move, _nextTurn: Side, remainingTime?: { red: number; black: number }) => {
        const prevBoard = onlineGame.getBoard();
        const isCapture = Boolean(prevBoard[parseSquare(move.to).row][parseSquare(move.to).col]);
        const notation = toVietnameseNotation(prevBoard, move, notationFormat);

        const res = onlineGame.makeMove(move.from, move.to);
        if (res.success) {
          setOnlineMoveHistory((prev) => [...prev, { notation, move }]);
          setOnlineSelectedSquare(null);

          if (remainingTime) {
            setOnlineRedTime(remainingTime.red);
            setOnlineBlackTime(remainingTime.black);
          }

          if (res.status === 'stalemate' || res.status === 'loss_perpetual_check') {
            soundEffects.playDefeat();
            setOnlineGameOverModal({
              show: true,
              title: 'THUA CUỘC!',
              reason: 'Đối thủ đã tung đòn kết liễu trận đấu!',
            });
          } else if (res.status === 'check') {
            soundEffects.playCheck();
          } else if (isCapture) {
            soundEffects.playCapture();
          } else {
            soundEffects.playMove();
          }
        }
      },
      onDrawOffered: () => {
        setIncomingDrawOffer(true);
      },
      onDrawAccepted: () => {
        setOnlineGameOverModal({
          show: true,
          title: 'HÒA CỜ',
          reason: 'Hai kỳ thủ đã đồng ý ký hòa ván đấu.',
        });
      },
      onDrawRejected: () => {
        alert('Đối thủ không đồng ý hòa cờ!');
      },
      onUndoOffered: () => {
        setIncomingUndoOffer(true);
      },
      onUndoAccepted: () => {
        onlineGame.undo();
        setOnlineMoveHistory((prev) => prev.slice(0, -1));
        setOnlineSelectedSquare(null);
      },
      onUndoRejected: () => {
        alert('Đối thủ không đồng ý cho hoãn nước cờ!');
      },
      onOpponentResigned: () => {
        soundEffects.playVictory();
        setOnlineGameOverModal({
          show: true,
          title: 'CHIẾN THẮNG!',
          reason: `${opponentName} đã xin đầu hàng. Bạn giành chiến thắng!`,
        });
      },
      onRematchRequested: () => {
        setIncomingRematchOffer(true);
      },
      onRematchAccepted: () => {
        // Swap sides and restart
        const nextSide: Side = mySide === 'red' ? 'black' : 'red';
        setMySide(nextSide);
        const newG = new XiangqiGame();
        setOnlineGame(newG);
        initialOnlineBoardRef.current = newG.getBoard();
        setOnlineMoveHistory([]);
        setOnlineSelectedSquare(null);
        setOnlineGameOverModal(null);
        const initialSecs =
          onlineTimeControl === '5m' ? 300 : onlineTimeControl === '10m' ? 600 : onlineTimeControl === '15m' ? 900 : 0;
        setOnlineRedTime(initialSecs);
        setOnlineBlackTime(initialSecs);
      },
      onChatMessage: (sender: string, text: string) => {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setOnlineChatMessages((prev) => [...prev, { sender, text, time: timeStr }]);
      },
      onEmojiReceived: (sender: string, emoji: string) => {
        setRecentEmojiReaction({ sender, emoji });
        setTimeout(() => setRecentEmojiReaction(null), 3000);
      },
      onError: (err: string) => {
        setOnlineStatusMessage(`⚠️ ${err}`);
        setIsConnecting(false);
      },
    };
  };

  const handleCreateRoom = async () => {
    setIsConnecting(true);
    setIsHosting(true);
    setIsGuestJoined(false);
    setOnlineStatusMessage('Đang khởi tạo máy chủ phòng...');
    try {
      const code = await p2pService.init(playerName, setupP2PCallbacks());
      setMyRoomCode(code);
      setCurrentOnlineRoomCode(code);
      setIsConnecting(false);
      setOnlineStatusMessage(`Đã tạo phòng [${code}]! Hãy gửi link hoặc mã phòng cho bạn bè.`);
    } catch (e: any) {
      setOnlineStatusMessage('Không thể tạo phòng, vui lòng thử lại.');
      setIsHosting(false);
      setIsConnecting(false);
    }
  };

  const handleStartGameAsHost = () => {
    p2pService.startGameAsHost({
      roomId: myRoomCode,
      hostName: playerName,
      hostSide: onlineHostSide,
      timeControl: onlineTimeControl,
    });
  };

  const handleJoinRoom = async () => {
    if (!joinCodeInput.trim()) return;
    const clean = joinCodeInput.trim().replace(/^cotuong-p2p-/i, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    setIsConnecting(true);
    setIsHosting(false);
    setOnlineStatusMessage(`Đang tìm và kết nối tới phòng [${clean}]...`);

    try {
      await p2pService.init(playerName, setupP2PCallbacks());
      setCurrentOnlineRoomCode(clean);
      await p2pService.joinRoom(clean, playerName);
      setIsGuestJoined(true);
      setIsConnecting(false);
      setOnlineStatusMessage(`🟢 Đã kết nối tới phòng [${clean}]! Đang chờ chủ phòng bắt đầu trận đấu...`);
    } catch (e: any) {
      setOnlineStatusMessage(`Không thể kết nối vào phòng [${clean}]. Vui lòng kiểm tra lại mã.`);
      setIsConnecting(false);
      setIsGuestJoined(false);
    }
  };

  const handleCopyInviteLink = () => {
    const code = currentOnlineRoomCode || myRoomCode;
    const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handleLeaveOnlineRoom = () => {
    if (onlineGameActive) {
      if (!window.confirm('Bạn có chắc chắn muốn rời phòng đấu trực tuyến?')) return;
    }
    p2pService.disconnect();
    setOnlineGameActive(false);
    setIsHosting(false);
    setIsGuestJoined(false);
    setCurrentOnlineRoomCode('');
    setMyRoomCode('');
    setRoomHostName('');
    setOpponentName('Đối Thủ');
    setOnlineGameOverModal(null);
    setOnlineStatusMessage('Đã rời phòng đấu.');
  };

  const handleOnlineSquareClick = (sq: Square) => {
    if (!onlineGameActive || onlineGameOverModal?.show) return;

    // Must be player's turn
    const turn = onlineGame.getTurn();
    if (turn !== mySide) return;

    const board = onlineGame.getBoard();
    const { row, col } = parseSquare(sq);
    const piece = board[row][col];

    if (!onlineSelectedSquare) {
      if (piece && piece.side === mySide) {
        setOnlineSelectedSquare(sq);
        soundEffects.playMove();
      }
      return;
    }

    if (onlineSelectedSquare === sq) {
      setOnlineSelectedSquare(null);
      return;
    }

    if (piece && piece.side === mySide) {
      setOnlineSelectedSquare(sq);
      soundEffects.playMove();
      return;
    }

    // Try move
    const legal = onlineGame.getLegalMoves();
    const targetMove = legal.find((m) => m.from === onlineSelectedSquare && m.to === sq);

    if (targetMove) {
      const isCapture = Boolean(board[parseSquare(sq).row][parseSquare(sq).col]);
      const prevBoard = onlineGame.getBoard();
      const nextTurn = mySide === 'red' ? 'black' : 'red';
      const notation = toVietnameseNotation(prevBoard, targetMove, notationFormat);

      const res = onlineGame.makeMove(targetMove.from, targetMove.to);
      if (res.success) {
        setOnlineMoveHistory((prev) => [...prev, { notation, move: targetMove }]);
        setOnlineSelectedSquare(null);

        // Send move via P2P
        p2pService.sendMove(targetMove, nextTurn, {
          red: onlineRedTime,
          black: onlineBlackTime,
        });

        if (res.status === 'stalemate' || res.status === 'loss_perpetual_check') {
          soundEffects.playVictory();
          setOnlineGameOverModal({
            show: true,
            title: 'CHIẾN THẮNG!',
            reason: 'Chúc mừng! Bạn đã giành chiến thắng xuất sắc!',
          });
        } else if (res.status === 'check') {
          soundEffects.playCheck();
        } else if (isCapture) {
          soundEffects.playCapture();
        } else {
          soundEffects.playMove();
        }
      }
    } else {
      setOnlineSelectedSquare(null);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    p2pService.sendChat(chatInput.trim());
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setOnlineChatMessages((prev) => [...prev, { sender: 'Bạn', text: chatInput.trim(), time: timeStr }]);
    setChatInput('');
  };

  const handleSendEmoji = (emoji: string) => {
    p2pService.sendEmoji(emoji);
    setRecentEmojiReaction({ sender: 'Bạn', emoji });
    setTimeout(() => setRecentEmojiReaction(null), 3000);
  };

  // Clean disconnect on unmount
  useEffect(() => {
    return () => {
      p2pService.disconnect();
    };
  }, []);

  const activeLegalMoves =
    modeTab === 'local'
      ? localSelectedSquare
        ? localGame.getLegalMoves().filter((m) => m.from === localSelectedSquare)
        : []
      : onlineSelectedSquare
      ? onlineGame.getLegalMoves().filter((m) => m.from === onlineSelectedSquare)
      : [];

  return (
    <div className="two-player-container">
      {/* Top Header Mode Switcher */}
      <div className="two-player-header-bar">
        <div className="sub-mode-pills">
          <button
            className={`sub-mode-pill ${modeTab === 'local' ? 'active' : ''}`}
            onClick={() => setModeTab('local')}
          >
            <span className="pill-icon">📱</span>
            <span className="pill-title">Đấu Cùng Máy (Pass & Play)</span>
          </button>
          <button
            className={`sub-mode-pill ${modeTab === 'online' ? 'active' : ''}`}
            onClick={() => setModeTab('online')}
          >
            <span className="pill-icon">🌐</span>
            <span className="pill-title">Phòng Đấu Online P2P</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: LOCAL PASS & PLAY */}
      {/* ========================================================================= */}
      {modeTab === 'local' && (
        <div className="two-player-body">
          <div className="board-column">
            {/* Top Player Clock (Black) */}
            <div className={`two-player-clock top ${localGame.getTurn() === 'black' ? 'active-turn' : ''}`}>
              <div className="player-meta">
                <span className="player-dot black-dot">●</span>
                <span className="player-label">Bên Đen (Hậu)</span>
              </div>
              <div className="clock-digits">
                {localTimeControl === 'none' ? '∞' : formatTime(localBlackTime)}
              </div>
            </div>

            {/* Main Board */}
            <XiangqiBoard
              board={localGame.getBoard()}
              turn={localGame.getTurn()}
              selectedSquare={localSelectedSquare}
              legalMoves={activeLegalMoves}
              pieceSet={pieceSet}
              flipped={localIsFlipped}
              onSquareClick={handleLocalSquareClick}
            />

            {/* Bottom Player Clock (Red) */}
            <div className={`two-player-clock bottom ${localGame.getTurn() === 'red' ? 'active-turn' : ''}`}>
              <div className="player-meta">
                <span className="player-dot red-dot">●</span>
                <span className="player-label">Bên Đỏ (Tiên)</span>
              </div>
              <div className="clock-digits">
                {localTimeControl === 'none' ? '∞' : formatTime(localRedTime)}
              </div>
            </div>
          </div>

          {/* Control Panel Column */}
          <div className="control-column">
            <div className="control-card">
              <h3 className="card-header-title">⚙️ Cài Đặt Ván Đấu</h3>

              <div className="config-group">
                <label className="config-label">Thời gian ván cờ:</label>
                <div className="time-select-pills">
                  {(['none', '5m', '10m', '15m'] as const).map((tc) => (
                    <button
                      key={tc}
                      className={`tc-pill ${localTimeControl === tc ? 'active' : ''}`}
                      onClick={() => {
                        setLocalTimeControl(tc);
                        startNewLocalGame(tc);
                      }}
                    >
                      {tc === 'none' ? 'Vô hạn' : tc === '5m' ? '5 phút' : tc === '10m' ? '10 phút' : '15 phút'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="config-group">
                <label className="checkbox-setting-row">
                  <input
                    type="checkbox"
                    checked={localAutoFlip}
                    onChange={(e) => setLocalAutoFlip(e.target.checked)}
                  />
                  <span>Tự động xoay bàn cờ theo lượt đi</span>
                </label>
              </div>

              <div className="action-buttons-grid">
                <button
                  className="btn-secondary"
                  onClick={() => setLocalIsFlipped((f) => !f)}
                  title="Xoay ngược bàn cờ 180 độ"
                >
                  🔄 Lật bàn cờ
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleLocalUndo}
                  disabled={localMoveHistory.length === 0}
                  title="Đi lại nước cờ trước"
                >
                  ↺ Hoãn nước
                </button>
                <button
                  className="btn-secondary btn-danger-text"
                  onClick={handleLocalResign}
                  disabled={localGameOverModal?.show}
                >
                  🏳️ Xin hàng
                </button>
                <button
                  className="btn-primary"
                  onClick={() => startNewLocalGame()}
                >
                  ⚡ Ván mới
                </button>
              </div>
            </div>

            {/* Move History Card */}
            <div className="control-card move-history-card">
              <div className="history-header">
                <h4>📜 Biên Bản Nước Đi ({localMoveHistory.length} nước)</h4>
              </div>
              <div className="history-list-scroll">
                {localMoveHistory.length === 0 ? (
                  <div className="empty-history-text">Chưa có nước đi nào. Bên Đỏ đi trước!</div>
                ) : (
                  <div className="history-moves-grid">
                    {Array.from({ length: Math.ceil(localMoveHistory.length / 2) }).map((_, idx) => {
                      const redMove = localMoveHistory[idx * 2];
                      const blackMove = localMoveHistory[idx * 2 + 1];
                      return (
                        <div key={idx} className="history-step-row">
                          <span className="step-index">{idx + 1}.</span>
                          <span className="step-red">{redMove?.notation || ''}</span>
                          <span className="step-black">{blackMove?.notation || ''}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {localMoveHistory.length > 0 && (
                <button
                  className="btn-secondary btn-sm full-width mt-2"
                  onClick={() => onAnalyzeGame(initialLocalBoardRef.current, localMoveHistory.map((m) => m.move))}
                >
                  🔍 Phân tích ván cờ này
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: ONLINE P2P WEBRTC */}
      {/* ========================================================================= */}
      {modeTab === 'online' && (
        <div className="two-player-body">
          {!onlineGameActive ? (
            /* --- ONLINE LOBBY CARD --- */
            <div className="online-lobby-wrapper">
              <div className="online-lobby-card">
                <div className="lobby-brand-icon">🌐</div>
                <h2 className="lobby-title">Phòng Đấu Trực Tuyến P2P</h2>
                <p className="lobby-subtitle">
                  Kết nối trực tiếp thời gian thực không cần tạo tài khoản. Gửi mã hoặc link phòng cho bạn bè để bắt đầu!
                </p>

                {/* Nickname Input */}
                <div className="player-name-field">
                  <label>Biệt danh của bạn:</label>
                  <input
                    type="text"
                    className="name-input"
                    value={playerName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    maxLength={20}
                    placeholder="Nhập tên kỳ thủ..."
                  />
                </div>

                <div className="lobby-split-grid">
                  {/* CREATE ROOM COLUMN */}
                  <div className="lobby-box">
                    <h3>➕ Tạo Phòng Mới</h3>
                    <div className="form-item">
                      <label>Chọn bên cầm quân:</label>
                      <div className="side-select-group">
                        <button
                          className={`side-btn ${onlineHostSide === 'red' ? 'active' : ''}`}
                          onClick={() => setOnlineHostSide('red')}
                        >
                          🔴 Cầm Đỏ
                        </button>
                        <button
                          className={`side-btn ${onlineHostSide === 'black' ? 'active' : ''}`}
                          onClick={() => setOnlineHostSide('black')}
                        >
                          ⚫ Cầm Đen
                        </button>
                        <button
                          className={`side-btn ${onlineHostSide === 'random' ? 'active' : ''}`}
                          onClick={() => setOnlineHostSide('random')}
                        >
                          🎲 Ngẫu nhiên
                        </button>
                      </div>
                    </div>

                    <div className="form-item">
                      <label>Thời gian ván cờ:</label>
                      <div className="tc-select-group">
                        {(['none', '5m', '10m', '15m'] as const).map((tc) => (
                          <button
                            key={tc}
                            className={`tc-pill ${onlineTimeControl === tc ? 'active' : ''}`}
                            onClick={() => setOnlineTimeControl(tc)}
                          >
                            {tc === 'none' ? 'Vô hạn' : tc === '5m' ? '5p' : tc === '10m' ? '10p' : '15p'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {!isHosting ? (
                      <button
                        className="btn-primary full-width"
                        onClick={handleCreateRoom}
                        disabled={isConnecting}
                      >
                        {isConnecting ? '⏳ Đang khởi tạo...' : '✨ Tạo Phòng'}
                      </button>
                    ) : (
                      <div className="created-room-box">
                        <div className="room-code-tag">
                          MÃ PHÒNG: <strong>{myRoomCode}</strong>
                        </div>
                        <div className="room-host-status">
                          👑 Chủ phòng: <strong>{playerName}</strong>
                          <br />
                          {opponentName !== 'Đối Thủ' ? (
                            <span className="text-success">🟢 Đã có người vào: <strong>{opponentName}</strong></span>
                          ) : (
                            <span className="text-muted">⏳ Đang đợi bạn bè tham gia...</span>
                          )}
                        </div>
                        <button className="btn-secondary full-width" onClick={handleCopyInviteLink}>
                          {copySuccess ? '✓ Đã chép Link Mời!' : '📋 Sao Chép Link Mời'}
                        </button>
                        <button className="btn-primary full-width mt-2" onClick={handleStartGameAsHost}>
                          🚀 Bắt đầu ván đấu
                        </button>
                        <button className="btn-secondary btn-sm full-width mt-2" onClick={handleLeaveOnlineRoom}>
                          ✕ Hủy / Đóng phòng
                        </button>
                      </div>
                    )}
                  </div>

                  {/* JOIN ROOM COLUMN */}
                  <div className="lobby-box">
                    <h3>🚀 Tham Gia Phòng</h3>
                    {!isGuestJoined ? (
                      <>
                        <p className="box-desc">Nhập mã phòng 6 ký tự do bạn bè chia sẻ:</p>
                        <input
                          type="text"
                          className="room-code-input"
                          placeholder="VD: YMG3FQ"
                          value={joinCodeInput}
                          onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                          maxLength={12}
                        />
                        <button
                          className="btn-primary full-width mt-2"
                          onClick={handleJoinRoom}
                          disabled={isConnecting || !joinCodeInput.trim()}
                        >
                          {isConnecting ? '⏳ Đang kết nối...' : '👉 Vào Phòng Ngay'}
                        </button>
                      </>
                    ) : (
                      <div className="joined-room-card">
                        <div className="room-code-tag">
                          PHÒNG: <strong>{currentOnlineRoomCode}</strong>
                        </div>
                        <div className="joined-room-meta">
                          👑 Chủ phòng: <strong>{roomHostName || opponentName}</strong>
                          <br />
                          <span className="text-success">🟢 Đã vào phòng thành công!</span>
                          <p className="wait-host-text">Đang đợi chủ phòng bấm bắt đầu ván đấu...</p>
                        </div>
                        <button className="btn-secondary btn-sm full-width mt-2" onClick={handleLeaveOnlineRoom}>
                          ✕ Rời phòng
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {onlineStatusMessage && (
                  <div className="online-status-alert">
                    <span className="status-indicator-dot"></span>
                    {onlineStatusMessage}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* --- ONLINE IN-GAME BOARD VIEW --- */
            <>
              <div className="board-column">
                {/* Online Active Room Info Header Bar */}
                <div className="online-in-game-header-bar">
                  <div className="room-info-pill">
                    <span className="room-badge">PHÒNG: <strong>{currentOnlineRoomCode || myRoomCode}</strong></span>
                    <span className="status-dot-live">●</span>
                    <span className="room-opp-name">vs <strong>{opponentName}</strong></span>
                  </div>
                  <div className="room-header-actions">
                    <button className="btn-tiny-action" onClick={handleCopyInviteLink} title="Sao chép link phòng">
                      {copySuccess ? '✓ Đã chép' : '📋 Link'}
                    </button>
                    <button className="btn-tiny-action btn-danger-action" onClick={handleLeaveOnlineRoom} title="Rời phòng">
                      🚪 Rời
                    </button>
                  </div>
                </div>

                {/* Opponent Info & Clock */}
                <div className={`two-player-clock top ${onlineGame.getTurn() !== mySide ? 'active-turn' : ''}`}>
                  <div className="player-meta">
                    <span className={`player-dot ${mySide === 'red' ? 'black-dot' : 'red-dot'}`}>●</span>
                    <span className="player-label">{opponentName} ({mySide === 'red' ? 'Đen' : 'Đỏ'})</span>
                  </div>
                  <div className="clock-digits">
                    {onlineTimeControl === 'none' ? '∞' : formatTime(mySide === 'red' ? onlineBlackTime : onlineRedTime)}
                  </div>
                </div>

                {/* Main Online Board */}
                <div className="online-board-wrapper">
                  <XiangqiBoard
                    board={onlineGame.getBoard()}
                    turn={onlineGame.getTurn()}
                    selectedSquare={onlineSelectedSquare}
                    legalMoves={activeLegalMoves}
                    pieceSet={pieceSet}
                    flipped={mySide === 'black'}
                    onSquareClick={handleOnlineSquareClick}
                  />

                  {recentEmojiReaction && (
                    <div className="floating-emoji-reaction">
                      <span className="emoji-char">{recentEmojiReaction.emoji}</span>
                      <span className="emoji-sender">{recentEmojiReaction.sender}</span>
                    </div>
                  )}
                </div>

                {/* My Info & Clock */}
                <div className={`two-player-clock bottom ${onlineGame.getTurn() === mySide ? 'active-turn' : ''}`}>
                  <div className="player-meta">
                    <span className={`player-dot ${mySide === 'red' ? 'red-dot' : 'black-dot'}`}>●</span>
                    <span className="player-label">{playerName} ({mySide === 'red' ? 'Đỏ' : 'Đen'} - Bạn)</span>
                  </div>
                  <div className="clock-digits">
                    {onlineTimeControl === 'none' ? '∞' : formatTime(mySide === 'red' ? onlineRedTime : onlineBlackTime)}
                  </div>
                </div>
              </div>

              {/* Online Side Controls & Chat */}
              <div className="control-column">
                {/* Quick Emoji Reactions */}
                <div className="control-card">
                  <h4 className="card-header-title">💬 Tương Tác Nhanh</h4>
                  <div className="emoji-reactions-bar">
                    {['👏', '☕', '🤔', '👍', '💥', '🏳️'].map((emoji) => (
                      <button
                        key={emoji}
                        className="emoji-btn"
                        onClick={() => handleSendEmoji(emoji)}
                        title={`Gửi biểu cảm ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  {/* Actions (Draw, Undo, Resign) */}
                  <div className="action-buttons-grid mt-2">
                    <button
                      className="btn-secondary"
                      onClick={() => p2pService.offerUndo()}
                      title="Xin đối thủ cho hoãn nước cờ"
                    >
                      ↺ Xin hoãn
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => p2pService.offerDraw()}
                      title="Đề nghị hòa cờ"
                    >
                      🤝 Xin hòa
                    </button>
                    <button
                      className="btn-secondary btn-danger-text"
                      onClick={() => p2pService.resign()}
                      title="Xin đầu hàng ván đấu"
                    >
                      🏳️ Đầu hàng
                    </button>
                  </div>
                </div>

                {/* Online Chat Box */}
                <div className="control-card online-chat-card">
                  <h4 className="card-header-title">💬 Trò Chuyện Trong Ván</h4>
                  <div className="chat-messages-scroll">
                    {onlineChatMessages.length === 0 ? (
                      <div className="empty-history-text">Chưa có tin nhắn nào. Hãy gửi lời chào!</div>
                    ) : (
                      onlineChatMessages.map((m, idx) => (
                        <div key={idx} className={`chat-message-item ${m.sender === 'Bạn' ? 'me' : 'opponent'}`}>
                          <div className="chat-meta">
                            <strong>{m.sender}</strong>
                            <span className="chat-time">{m.time}</span>
                          </div>
                          <div className="chat-bubble">{m.text}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <form onSubmit={handleSendChat} className="chat-input-row">
                    <input
                      type="text"
                      className="chat-text-input"
                      placeholder="Nhập tin nhắn..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                    />
                    <button type="submit" className="btn-primary btn-sm">
                      Gửi
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION MODALS (DRAW / UNDO / REMATCH / GAME OVER) */}
      {/* ========================================================================= */}

      {/* Incoming Draw Offer Modal */}
      {incomingDrawOffer && (
        <div className="modal-overlay">
          <div className="two-player-modal">
            <h3>🤝 Đề Nghị Hòa Cờ</h3>
            <p>Đối thủ <strong>{opponentName}</strong> gửi đề nghị hòa cờ. Bạn có đồng ý không?</p>
            <div className="modal-actions-row">
              <button
                className="btn-secondary"
                onClick={() => {
                  p2pService.rejectDraw();
                  setIncomingDrawOffer(false);
                }}
              >
                Từ chối
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  p2pService.acceptDraw();
                  setIncomingDrawOffer(false);
                  setOnlineGameOverModal({
                    show: true,
                    title: 'HÒA CỜ',
                    reason: 'Hai kỳ thủ đã đồng ý ký hòa ván đấu.',
                  });
                }}
              >
                Đồng ý hòa ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Undo Offer Modal */}
      {incomingUndoOffer && (
        <div className="modal-overlay">
          <div className="two-player-modal">
            <h3>↺ Xin Hoãn Nước Cờ</h3>
            <p>Đối thủ <strong>{opponentName}</strong> xin hoãn lại 1 nước cờ. Bạn có đồng ý?</p>
            <div className="modal-actions-row">
              <button
                className="btn-secondary"
                onClick={() => {
                  p2pService.rejectUndo();
                  setIncomingUndoOffer(false);
                }}
              >
                Không cho
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  p2pService.acceptUndo();
                  onlineGame.undo();
                  setOnlineMoveHistory((prev) => prev.slice(0, -1));
                  setOnlineSelectedSquare(null);
                  setIncomingUndoOffer(false);
                }}
              >
                Đồng ý cho hoãn ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Rematch Offer Modal */}
      {incomingRematchOffer && (
        <div className="modal-overlay">
          <div className="two-player-modal">
            <h3>⚡ Đề Nghị Đấu Lại</h3>
            <p>Đối thủ <strong>{opponentName}</strong> muốn đấu lại ván mới và đổi bên cầm quân. Bạn có chấp nhận?</p>
            <div className="modal-actions-row">
              <button
                className="btn-secondary"
                onClick={() => setIncomingRematchOffer(false)}
              >
                Để sau
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  p2pService.acceptRematch();
                  setIncomingRematchOffer(false);
                  const nextSide: Side = mySide === 'red' ? 'black' : 'red';
                  setMySide(nextSide);
                  const newG = new XiangqiGame();
                  setOnlineGame(newG);
                  initialOnlineBoardRef.current = newG.getBoard();
                  setOnlineMoveHistory([]);
                  setOnlineSelectedSquare(null);
                  setOnlineGameOverModal(null);
                }}
              >
                Đấu lại ngay ⚔️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local Game Over Modal */}
      {localGameOverModal?.show && (
        <div className="modal-overlay">
          <div className="two-player-modal game-over-box">
            <h2 className="game-over-title">🏆 {localGameOverModal.title}</h2>
            <p className="game-over-reason">{localGameOverModal.reason}</p>
            <div className="modal-actions-row">
              <button
                className="btn-secondary"
                onClick={() => {
                  setLocalGameOverModal(null);
                  onAnalyzeGame(initialLocalBoardRef.current, localMoveHistory.map((m) => m.move));
                }}
              >
                🔍 Phân tích ván cờ
              </button>
              <button
                className="btn-primary"
                onClick={() => startNewLocalGame()}
              >
                ⚡ Ván mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Online Game Over Modal */}
      {onlineGameOverModal?.show && (
        <div className="modal-overlay">
          <div className="two-player-modal game-over-box">
            <h2 className="game-over-title">🏆 {onlineGameOverModal.title}</h2>
            <p className="game-over-reason">{onlineGameOverModal.reason}</p>
            <div className="modal-actions-row">
              <button
                className="btn-secondary"
                onClick={() => {
                  setOnlineGameOverModal(null);
                  onAnalyzeGame(initialOnlineBoardRef.current, onlineMoveHistory.map((m) => m.move));
                }}
              >
                🔍 Phân tích ván cờ
              </button>
              <button
                className="btn-primary"
                onClick={() => p2pService.requestRematch()}
              >
                ⚔️ Đề nghị đấu lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
