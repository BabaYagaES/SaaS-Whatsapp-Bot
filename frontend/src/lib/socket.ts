import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

let socket: Socket | null = null;
let joinedUserId: string | null = null;

export function getSocket(): Socket {
    if (!socket) {
        socket = io(WS_URL, {
            transports: ['polling', 'websocket'],
            autoConnect: false,
            reconnection: true,
        });

        socket.on('connect', () => {
            if (joinedUserId) {
                socket?.emit('join', joinedUserId);
            }
        });
    }
    return socket;
}

export function connectSocket(userId: string): Socket {
    const s = getSocket();
    joinedUserId = userId;
    if (!s.connected) {
        s.connect();
    } else {
        s.emit('join', userId);
    }
    return s;
}

export function disconnectSocket(): void {
    if (socket) {
        socket.disconnect();
        socket = null;
        joinedUserId = null;
    }
}
