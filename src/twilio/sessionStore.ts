export interface SessionData {
  attempts: number;
  customerId?: string;
  customerName?: string;
  registeredPhone?: string;
  stage?: string;
}

const sessions: Record<string, SessionData> = {};

export function getSession(callSid: string): SessionData {
  if (!sessions[callSid]) {
    sessions[callSid] = { attempts: 0 };
  }
  return sessions[callSid];
}

export function updateSession(callSid: string, data: Partial<SessionData>) {
  sessions[callSid] = { ...sessions[callSid], ...data };
}

export function clearSession(callSid: string) {
  delete sessions[callSid];
}
