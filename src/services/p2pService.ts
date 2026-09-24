import { Peer, DataConnection } from 'peerjs';
import { Move, Side } from '../core/types';

export type P2PMessageType =
  | 'JOIN_ROOM'
  | 'GAME_START'
  | 'MOVE'
  | 'SYNC_CLOCK'
  | 'OFFER_DRAW'
  | 'ACCEPT_DRAW'
  | 'REJECT_DRAW'
  | 'OFFER_UNDO'
  | 'ACCEPT_UNDO'
  | 'REJECT_UNDO'
  | 'RESIGN'
  | 'REMATCH_REQUEST'
  | 'REMATCH_ACCEPT'
  | 'CHAT_MESSAGE'
  | 'EMOJI_REACTION'
  | 'PING'
  | 'PONG';

export interface P2PMessage {
  type: P2PMessageType;
  senderName: string;
  timestamp: number;
  payload?: any;
}

export interface RoomConfig {
  roomId: string;
  hostName: string;
  hostSide: Side | 'random';
  timeControl: 'none' | '5m' | '10m' | '15m';
}

export interface P2PCallbacks {
  onPeerReady?: (myPeerId: string) => void;
  onConnected?: (peerName: string) => void;
  onDisconnected?: () => void;
  onMoveReceived?: (move: Move, nextTurn: Side, remainingTime?: { red: number; black: number }) => void;
  onGameStart?: (config: { mySide: Side; timeControl: string; opponentName: string }) => void;
  onDrawOffered?: () => void;
  onDrawAccepted?: () => void;
  onDrawRejected?: () => void;
  onUndoOffered?: () => void;
  onUndoAccepted?: () => void;
  onUndoRejected?: () => void;
  onOpponentResigned?: () => void;
  onRematchRequested?: () => void;
  onRematchAccepted?: () => void;
  onChatMessage?: (sender: string, text: string) => void;
  onEmojiReceived?: (sender: string, emoji: string) => void;
  onError?: (err: string) => void;
}

const PEER_PREFIX = 'cotuong-p2p-';

export class P2PService {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private callbacks: P2PCallbacks = {};
  private myPeerId: string = '';
  private myName: string = 'Kỳ Thủ';
  private pingInterval: any = null;

  constructor() {
    // Peer will be initialized on demand
  }

  public init(playerName: string, callbacks: P2PCallbacks): Promise<string> {
    this.myName = playerName || 'Kỳ Thủ';
    this.callbacks = callbacks;

    return new Promise((resolve, reject) => {
      try {
        if (this.peer && !this.peer.destroyed) {
          this.peer.destroy();
        }

        // Initialize Peer with random id or prefix
        const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.peer = new Peer(`${PEER_PREFIX}${randomId}`, {
          debug: 1,
        });

        this.peer.on('open', (id) => {
          this.myPeerId = id.replace(PEER_PREFIX, '');
          this.callbacks.onPeerReady?.(this.myPeerId);
          resolve(this.myPeerId);
        });

        this.peer.on('connection', (connection) => {
          this.setupConnection(connection);
        });

        this.peer.on('error', (err) => {
          console.error('[P2P Error]', err);
          this.callbacks.onError?.(err.message || 'Lỗi kết nối mạng P2P');
          reject(err);
        });
      } catch (e: any) {
        reject(e);
      }
    });
  }

  public getMyRoomCode(): string {
    return this.myPeerId;
  }

  public joinRoom(roomCode: string, playerName: string): Promise<void> {
    this.myName = playerName || 'Kỳ Thủ Khách';
    const targetPeerId = `${PEER_PREFIX}${roomCode.trim().toUpperCase()}`;

    return new Promise((resolve, reject) => {
      if (!this.peer || this.peer.destroyed) {
        return reject(new Error('Peer chưa được khởi tạo'));
      }

      const connection = this.peer.connect(targetPeerId, {
        reliable: true,
      });

      connection.on('open', () => {
        this.setupConnection(connection);
        // Send JOIN message to host
        this.sendMessage({
          type: 'JOIN_ROOM',
          senderName: this.myName,
          timestamp: Date.now(),
        });
        resolve();
      });

      connection.on('error', (err) => {
        console.error('[P2P Connection Error]', err);
        this.callbacks.onError?.('Không tìm thấy phòng hoặc phòng đã đóng.');
        reject(err);
      });
    });
  }

  public startGameAsHost(config: RoomConfig) {
    let hostAssignedSide: Side = 'red';
    if (config.hostSide === 'random') {
      hostAssignedSide = Math.random() < 0.5 ? 'red' : 'black';
    } else {
      hostAssignedSide = config.hostSide;
    }

    const guestSide: Side = hostAssignedSide === 'red' ? 'black' : 'red';

    // Tell guest to start game
    this.sendMessage({
      type: 'GAME_START',
      senderName: this.myName,
      timestamp: Date.now(),
      payload: {
        guestSide,
        timeControl: config.timeControl,
        hostName: this.myName,
      },
    });

    // Notify local host
    this.callbacks.onGameStart?.({
      mySide: hostAssignedSide,
      timeControl: config.timeControl,
      opponentName: this.conn?.metadata?.peerName || 'Đối Thủ',
    });
  }

  public sendMove(move: Move, nextTurn: Side, remainingTime?: { red: number; black: number }) {
    this.sendMessage({
      type: 'MOVE',
      senderName: this.myName,
      timestamp: Date.now(),
      payload: {
        move,
        nextTurn,
        remainingTime,
      },
    });
  }

  public offerDraw() {
    this.sendMessage({
      type: 'OFFER_DRAW',
      senderName: this.myName,
      timestamp: Date.now(),
    });
  }

  public acceptDraw() {
    this.sendMessage({
      type: 'ACCEPT_DRAW',
      senderName: this.myName,
      timestamp: Date.now(),
    });
  }

  public rejectDraw() {
    this.sendMessage({
      type: 'REJECT_DRAW',
      senderName: this.myName,
      timestamp: Date.now(),
    });
  }

  public offerUndo() {
    this.sendMessage({
      type: 'OFFER_UNDO',
      senderName: this.myName,
      timestamp: Date.now(),
    });
  }

  public acceptUndo() {
    this.sendMessage({
      type: 'ACCEPT_UNDO',
      senderName: this.myName,
      timestamp: Date.now(),
    });
  }

  public rejectUndo() {
    this.sendMessage({
      type: 'REJECT_UNDO',
      senderName: this.myName,
      timestamp: Date.now(),
    });
  }

  public resign() {
    this.sendMessage({
      type: 'RESIGN',
      senderName: this.myName,
      timestamp: Date.now(),
    });
  }

  public requestRematch() {
    this.sendMessage({
      type: 'REMATCH_REQUEST',
      senderName: this.myName,
      timestamp: Date.now(),
    });
  }

  public acceptRematch() {
    this.sendMessage({
      type: 'REMATCH_ACCEPT',
      senderName: this.myName,
      timestamp: Date.now(),
    });
  }

  public sendChat(text: string) {
    this.sendMessage({
      type: 'CHAT_MESSAGE',
      senderName: this.myName,
      timestamp: Date.now(),
      payload: { text },
    });
  }

  public sendEmoji(emoji: string) {
    this.sendMessage({
      type: 'EMOJI_REACTION',
      senderName: this.myName,
      timestamp: Date.now(),
      payload: { emoji },
    });
  }

  private sendMessage(msg: P2PMessage) {
    if (this.conn && this.conn.open) {
      this.conn.send(msg);
    }
  }

  private setupConnection(connection: DataConnection) {
    this.conn = connection;

    connection.on('open', () => {
      this.callbacks.onConnected?.(connection.peer.replace(PEER_PREFIX, ''));
      this.startHeartbeat();
    });

    connection.on('data', (raw: any) => {
      const msg = raw as P2PMessage;
      this.handleIncomingMessage(msg);
    });

    connection.on('close', () => {
      this.stopHeartbeat();
      this.callbacks.onDisconnected?.();
    });

    connection.on('error', (err) => {
      console.error('[Connection Data Error]', err);
      this.callbacks.onError?.('Lỗi truyền dữ liệu ván đấu');
    });
  }

  private handleIncomingMessage(msg: P2PMessage) {
    switch (msg.type) {
      case 'JOIN_ROOM':
        this.callbacks.onConnected?.(msg.senderName);
        break;

      case 'GAME_START':
        this.callbacks.onGameStart?.({
          mySide: msg.payload.guestSide,
          timeControl: msg.payload.timeControl,
          opponentName: msg.senderName,
        });
        break;

      case 'MOVE':
        this.callbacks.onMoveReceived?.(
          msg.payload.move,
          msg.payload.nextTurn,
          msg.payload.remainingTime
        );
        break;

      case 'OFFER_DRAW':
        this.callbacks.onDrawOffered?.();
        break;

      case 'ACCEPT_DRAW':
        this.callbacks.onDrawAccepted?.();
        break;

      case 'REJECT_DRAW':
        this.callbacks.onDrawRejected?.();
        break;

      case 'OFFER_UNDO':
        this.callbacks.onUndoOffered?.();
        break;

      case 'ACCEPT_UNDO':
        this.callbacks.onUndoAccepted?.();
        break;

      case 'REJECT_UNDO':
        this.callbacks.onUndoRejected?.();
        break;

      case 'RESIGN':
        this.callbacks.onOpponentResigned?.();
        break;

      case 'REMATCH_REQUEST':
        this.callbacks.onRematchRequested?.();
        break;

      case 'REMATCH_ACCEPT':
        this.callbacks.onRematchAccepted?.();
        break;

      case 'CHAT_MESSAGE':
        this.callbacks.onChatMessage?.(msg.senderName, msg.payload.text);
        break;

      case 'EMOJI_REACTION':
        this.callbacks.onEmojiReceived?.(msg.senderName, msg.payload.emoji);
        break;

      case 'PING':
        this.sendMessage({
          type: 'PONG',
          senderName: this.myName,
          timestamp: Date.now(),
        });
        break;

      case 'PONG':
        // Connection alive
        break;

      default:
        break;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.conn && this.conn.open) {
        this.sendMessage({
          type: 'PING',
          senderName: this.myName,
          timestamp: Date.now(),
        });
      }
    }, 10000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public disconnect() {
    this.stopHeartbeat();
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    if (this.peer && !this.peer.destroyed) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}

export const p2pService = new P2PService();
