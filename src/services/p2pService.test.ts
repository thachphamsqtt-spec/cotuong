import { describe, it, expect, vi } from 'vitest';
import { P2PService } from './p2pService';

describe('P2PService Unit Tests', () => {
  it('instantiates cleanly and provides getMyRoomCode', () => {
    const service = new P2PService();
    expect(service.getMyRoomCode()).toBe('');
  });

  it('disconnects safely when no peer or active connection exists', () => {
    const service = new P2PService();
    expect(() => service.disconnect()).not.toThrow();
  });
});
