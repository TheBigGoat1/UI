import { execSync } from "node:child_process";

const port = Number(process.argv[2] || 3001);
if (!Number.isFinite(port)) process.exit(0);

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
      console.warn(`[kill-port] Could not stop PID ${pid} (try closing terminals or Task Manager)`);
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

if (process.platform === "win32") killWindows(port);
else killUnix(port);
