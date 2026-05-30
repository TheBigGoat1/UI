import { io } from "socket.io-client";

let socketRef = null;

function baseWsUrl() {
  if (import.meta.env.DEV) return window.location.origin;
  const api = import.meta.env.VITE_API_URL || window.location.origin;
  return api.replace("/api/v1", "");
}

export function getSocket() {
  if (socketRef) return socketRef;
  socketRef = io(baseWsUrl(), {
    path: "/ws",
    transports: ["websocket", "polling"],
    reconnection: true,
  });
  return socketRef;
}

export function subscribeSocket(event, handler) {
  const socket = getSocket();
  socket.on(event, handler);
  return () => socket.off(event, handler);
}
