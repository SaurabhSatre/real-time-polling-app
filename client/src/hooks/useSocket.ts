// Custom hook for Socket.io management
import { useEffect, useRef, useState } from 'react';
import { socketManager } from '@/lib/socket';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const socket = socketManager.connect();
    socketRef.current = socket;

    const handleConnect = () => {
      setIsConnected(true);
      setSocketId(socket.id || null);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setSocketId(null);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    socketId,
    connect: () => socketManager.connect(),
    disconnect: () => socketManager.disconnect(),
  };
};

