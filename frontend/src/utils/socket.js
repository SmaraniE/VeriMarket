import { io } from 'socket.io-client';

let socket;

// One shared connection for the whole app. The auth callback re-reads the token on every
// (re)connect, so logging in or out only needs reconnectSocket().
export const getSocket = () => {
  if (!socket) {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || undefined;
    socket = io(socketUrl, {
      autoConnect: true,
      reconnectionDelayMax: 5000,
      auth: (cb) => {
        let token = null;
        try {
          token = localStorage.getItem('vm_token');
        } catch {
          /* storage unavailable */
        }
        cb({ token });
      },
    });
  }
  return socket;
};

export const reconnectSocket = () => {
  if (!socket) return;
  socket.disconnect();
  socket.connect();
};
