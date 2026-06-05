import { io } from "socket.io-client";

let socketRef = null;

function baseWsUrl() {
  const api = import.meta.env.VITE_API_URL || window.location.origin + '/api/v1';
  return api.replace(/\/api\/v1\/?$/, '');
}

export function getSocket() {
  if (socketRef) return socketRef;
  socketRef = io(baseWsUrl(), {
    path: "/ws",
    transports: ["websocket", "polling"],
    reconnection: true,
  });
  socketRef.setMaxListeners?.(30);
  return socketRef;
}

export function subscribeSocket(event, handler) {
  const socket = getSocket();
  socket.off(event, handler);
  socket.on(event, handler);
  return () => socket.off(event, handler);
}

export function subscribeConnectStatus(onConnect, onDisconnect) {
  const socket = getSocket();
  if (onConnect) {
    socket.off('connect', onConnect);
    socket.on('connect', onConnect);
  }
  if (onDisconnect) {
    socket.off('disconnect', onDisconnect);
    socket.on('disconnect', onDisconnect);
  }
  return () => {
    if (onConnect) socket.off('connect', onConnect);
    if (onDisconnect) socket.off('disconnect', onDisconnect);
  };
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (socketRef) {
      socketRef.removeAllListeners();
      socketRef.disconnect();
      socketRef = null;
    }
  });
}
