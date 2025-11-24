const colors = {
  reset: "\x1b[0m",
  info: "\x1b[32m",   // green
  warn: "\x1b[33m",   // yellow
  error: "\x1b[31m"   // red
}

function log(level: "info" | "warn" | "error", msg: any[]) {
  const ts = new Date().toISOString()
  const color = colors[level]

  const prefix = `${color}[${ts}] ${level.toUpperCase()}${colors.reset}`

  // Convert each arg to a single string
  const parts = msg.map((entry) => {
    if (typeof entry === "object") {
      return JSON.stringify(entry, null, 2)
    }
    return String(entry)
  })

  console.log(`${prefix} ${parts.join(" ")}`)
}

export const logger = {
  info: (...msg: any[]) => log("info", msg),
  warn: (...msg: any[]) => log("warn", msg),
  error: (...msg: any[]) => log("error", msg)
}
