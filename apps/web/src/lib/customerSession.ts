const STORAGE_KEY = "nobat_customer_session";

export interface CustomerSession {
  token: string;
  firstName: string;
}

export function loadCustomerSession(): CustomerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CustomerSession) : null;
  } catch {
    return null;
  }
}

export function saveCustomerSession(session: CustomerSession) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // localStorage can throw in private-browsing contexts — the session just won't persist.
  }
}

export function clearCustomerSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
