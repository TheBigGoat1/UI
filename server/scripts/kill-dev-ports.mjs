import { execSync } from "node:child_process";

/** Ports used by Insidr dev (API fallbacks + default Vite). */
const PORTS = [3001, 3002, 3003, 3004, 5173];

function killWindows(p) {
  let out = "";
  try {
    out = execSync(`netstat -ano | findstr :${p}`, { encoding: "utf8" });
  } catch {
    return;
  }
  const pids = new Set();
  for (const line of out.split("\n")) {
    if (!/LISTENING/i.test(line)) continue;
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && /^\d+$/.test(pid) && pid !== "0") pids.add(pid);
  }
  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
      console.log(`[kill-port] Stopped PID ${pid} on port ${p}`);
    } catch {
      console.warn(`[kill-port] Could not stop PID ${pid} (try Task Manager)`);
    }
  }
}

function killUnix(p) {
  try {
    execSync(`lsof -ti tcp:${p} | xargs -r kill -9`, { stdio: "ignore", shell: true });
  } catch {
    /* nothing listening */
  }
}

const kill = process.platform === "win32" ? killWindows : killUnix;

for (const port of PORTS) {
  kill(port);
}

console.log(`[kill-dev-ports] Cleared API ports: ${PORTS.join(", ")}`);
