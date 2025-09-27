// Socket.io client for real-time communication
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './constant';

class SocketManager {
  private socket: Socket | null = null;
  private isConnected = false;

  connect(): Socket {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.isConnected = false;
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Poll Events
  onPollCreated(callback: (poll: any) => void): void {
    if (this.socket) {
      this.socket.on('poll:created', callback);
    }
  }

  onPollUpdated(callback: (poll: any) => void): void {
    if (this.socket) {
      this.socket.on('poll:updated', callback);
    }
  }

  onPollEnded(callback: (poll: any) => void): void {
    if (this.socket) {
      this.socket.on('poll:ended', callback);
    }
  }

  onPollResults(callback: (results: any) => void): void {
    if (this.socket) {
      this.socket.on('poll:results', callback);
    }
  }

  // Student Events
  onStudentJoined(callback: (student: any) => void): void {
    if (this.socket) {
      this.socket.on('student:joined', callback);
    }
  }

  onStudentLeft(callback: (studentId: string) => void): void {
    if (this.socket) {
      this.socket.on('student:left', callback);
    }
  }

  onStudentKicked(callback: (studentId: string) => void): void {
    if (this.socket) {
      this.socket.on('student:kicked', callback);
    }
  }

  onStudentAnswered(callback: (data: { studentId: string; pollId: string }) => void): void {
    if (this.socket) {
      this.socket.on('student:answered', callback);
    }
  }

  // Answer Events
  onAnswerSubmitted(callback: (answer: any) => void): void {
    if (this.socket) {
      this.socket.on('answer:submitted', callback);
    }
  }

  // Chat Events
  onChatMessage(callback: (message: any) => void): void {
    if (this.socket) {
      this.socket.on('chat:message', callback);
    }
  }

  onChatCleared(callback: () => void): void {
    if (this.socket) {
      this.socket.on('chat:cleared', callback);
    }
  }

  // Emit Events
  emitPollCreated(pollData: any): void {
    if (this.socket) {
      this.socket.emit('poll:create', pollData);
    }
  }

  emitPollEnded(pollId: string): void {
    if (this.socket) {
      this.socket.emit('poll:end', pollId);
    }
  }

  emitStudentJoined(studentData: any): void {
    if (this.socket) {
      this.socket.emit('student:join', studentData);
    }
  }

  emitAnswerSubmitted(answerData: any): void {
    if (this.socket) {
      this.socket.emit('answer:submit', answerData);
    }
  }

  emitChatMessage(messageData: any): void {
    if (this.socket) {
      this.socket.emit('chat:send', messageData);
    }
  }

  // Remove event listeners
  removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  removeListener(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

// Export singleton instance
export const socketManager = new SocketManager();
export default socketManager;
