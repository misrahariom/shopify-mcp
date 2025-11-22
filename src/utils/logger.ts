export const logger = {
  info: (...msg: any[]) => {
    const ts = new Date().toISOString();
    console.log(`[${ts}]`, ...msg);
  }
};