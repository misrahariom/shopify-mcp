const colors = {
  reset: "\x1b[0m",
  info: "\x1b[32m",   // green
  warn: "\x1b[33m",   // yellow
  error: "\x1b[31m"   // red
};

// Safe stringify to avoid circular structure errors
function safeStringify(entry: any): string {
  const seen = new WeakSet();

  return JSON.stringify(
    entry,
    (_, val) => {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) return "[Circular]";
        seen.add(val);
      }
      return val;
    },
    2
  );
}

// Internal logger
function log(level: "info" | "warn" | "error", file: string, msg: any[]) {
  const ts = new Date().toISOString();
  const color = colors[level];

  const prefix = `${color}[${ts}] ${level.toUpperCase()} [${file}]${colors.reset}`;

  const parts = msg.map((entry) => {
    if (typeof entry === "object") {
      return safeStringify(entry);   // <-- FIXED
    }
    return String(entry);
  });

  console.log(`${prefix} ${parts.join(" ")}`);
}

// Factory: returns a logger bound to a filename
export function createLogger(file: string) {
  return {
    info: (...msg: any[]) => log("info", file, msg),
    warn: (...msg: any[]) => log("warn", file, msg),
    error: (...msg: any[]) => log("error", file, msg)
  };
}
