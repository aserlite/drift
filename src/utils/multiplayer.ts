import Peer, { type DataConnection } from 'peerjs';
import { useGameStore } from '../store/useGameStore';

class MultiplayerManager {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;

  initHost() {
    if (this.peer) {
      this.peer.destroy();
    }
    this.peer = new Peer();
    this.peer.on('open', (id) => {
      useGameStore.getState().setPeerId(id);
    });

    this.peer.on('connection', (connection) => {
      this.conn = connection;
      this.setupConnection();
      useGameStore.getState().setConnectedPeerId(connection.peer);
    });
  }

  joinGame(hostId: string) {
    if (this.peer) {
      this.peer.destroy();
    }
    this.peer = new Peer();
    this.peer.on('open', (id) => {
      useGameStore.getState().setPeerId(id);
      this.conn = this.peer!.connect(hostId);
      this.setupConnection();
      this.conn.on('open', () => {
        useGameStore.getState().setConnectedPeerId(hostId);
      });
    });
  }

  private setupConnection() {
    if (!this.conn) return;
    this.conn.on('data', (data: any) => {
      const store = useGameStore.getState();
      if (data.type === 'car_pos') {
        store.setNetworkCar(data.pos, data.heading);
      } else if (data.type === 'cop_pos') {
        store.setNetworkCop(data.pos, data.heading);
      } else if (data.type === 'game_over') {
        store.setGameOver(true);
      }
    });
    
    this.conn.on('close', () => {
      useGameStore.getState().setConnectedPeerId('');
      useGameStore.getState().setGameMode('single');
    });
  }

  sendCarPos(pos: [number, number, number], heading: number) {
    if (this.conn && this.conn.open) {
      this.conn.send({ type: 'car_pos', pos, heading });
    }
  }

  sendCopPos(pos: [number, number, number], heading: number) {
    if (this.conn && this.conn.open) {
      this.conn.send({ type: 'cop_pos', pos, heading });
    }
  }

  sendGameOver() {
    if (this.conn && this.conn.open) {
      this.conn.send({ type: 'game_over' });
    }
  }

  disconnect() {
    if (this.conn) {
      this.conn.close();
    }
    if (this.peer) {
      this.peer.destroy();
    }
    useGameStore.getState().setConnectedPeerId('');
    useGameStore.getState().setPeerId('');
  }
}

export const mpManager = new MultiplayerManager();
