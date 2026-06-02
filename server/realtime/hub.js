import { Server } from "socket.io";
import { getAllPrices } from "../services/marketData.js";
import { getIntegrationsHealth } from "../services/integrationsHealth.js";
import { getDeskIntelligenceBundle } from "../services/deskIntelligence.js";
import { pub } from "../services/redis.js";

let ioRef = null;
let started = false;

export function initRealtime(httpServer) {
  if (ioRef) return ioRef;
  ioRef = new Server(httpServer, {
    cors: { origin: true, credentials: true },
    path: "/ws",
  });

  ioRef.on("connection", (socket) => {
    socket.emit("realtime:status", { online: true, connectedAt: new Date().toISOString() });
  });

  if (!started) {
    started = true;
    startBroadcastLoop();
  }
  return ioRef;
}

async function startBroadcastLoop() {
  setInterval(async () => {
    try {
      const pricesRes = await getAllPrices();
      const payload = {
        ts: Date.now(),
        prices: pricesRes || {},
      };
      if (ioRef) ioRef.emit("market:prices", payload);
      await pub("market:prices", payload);
    } catch (err) {
      if (ioRef) ioRef.emit("system:error", { scope: "market:prices", message: err.message });
    }
  }, 5000);

  setInterval(async () => {
    try {
      const health = await getIntegrationsHealth();
      const payload = { ts: Date.now(), providers: health };
      if (ioRef) ioRef.emit("system:providers", payload);
      await pub("system:providers", payload);
    } catch (err) {
      if (ioRef) ioRef.emit("system:error", { scope: "providers", message: err.message });
    }
  }, 15000);

  setInterval(async () => {
    try {
      const data = await getDeskIntelligenceBundle("XAUUSD");
      const payload = { ts: Date.now(), data };
      if (ioRef) ioRef.emit("desk:snapshot", payload);
      await pub("desk:snapshot", payload);
    } catch (err) {
      if (ioRef) ioRef.emit("system:error", { scope: "desk:snapshot", message: err.message });
    }
  }, 30000);
}

export function getRealtime() {
  return ioRef;
}
