import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        socket = io(WS_URL, {
            transports: ['websocket', 'polling'],
            autoConnect: false,
        });
    }
    return socket;
}

export function connectSocket(userId: string): Socket {
    const s = getSocket();
    if (!s.connected) {
        s.connect();
        s.emit('join', userId);
    }
    return s;
}

export function disconnectSocket(): void {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
