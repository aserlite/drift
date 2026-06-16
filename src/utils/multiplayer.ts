import Peer, { type DataConnection } from 'peerjs';
import { useGameStore } from '../store/useGameStore';

class MultiplayerManager {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;

  initHost() {
    console.log('[P2P] Initializing Host...');
    if (this.peer) {
      this.peer.destroy();
    }
    this.peer = new Peer({ debug: 2 }); // Add debug level
    
    this.peer.on('open', (id) => {
      console.log('[P2P] Host Peer created with ID:', id);
      useGameStore.getState().setPeerId(id);
    });

    this.peer.on('connection', (connection) => {
      console.log('[P2P] Incoming connection from:', connection.peer);
      this.conn = connection;
      this.setupConnection();
      useGameStore.getState().setConnectedPeerId(connection.peer);
    });

    this.peer.on('error', (err) => {
      console.error('[P2P] Host Peer Error:', err);
    });
  }

  joinGame(hostId: string) {
    console.log('[P2P] Joining game with Host ID:', hostId);
    if (this.peer) {
      this.peer.destroy();
    }
    this.peer = new Peer({ debug: 2 });
    
    this.peer.on('open', (id) => {
      console.log('[P2P] Client Peer created with ID:', id);
      useGameStore.getState().setPeerId(id);
      
      console.log('[P2P] Attempting to connect to:', hostId);
      this.conn = this.peer!.connect(hostId, { reliable: true });
      this.setupConnection();
      
      this.conn.on('open', () => {
        console.log('[P2P] Connection to host established!');
        useGameStore.getState().setConnectedPeerId(hostId);
      });

      this.conn.on('error', (err) => {
        console.error('[P2P] Client Connection Error:', err);
      });
    });

    this.peer.on('error', (err) => {
      console.error('[P2P] Client Peer Error:', err);
    });
  }

  private setupConnection() {
    if (!this.conn) return;
    console.log('[P2P] Setting up connection event listeners...');
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
