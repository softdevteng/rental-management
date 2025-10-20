export const API_URL = '';

export async function api(path, { method = 'GET', body, token, isMultipart } = {}) {
  const headers = {};
const BASE = process.env.REACT_APP_API_BASE || '';
  if (!isMultipart) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const url = BASE ? (path.startsWith('http') ? path : `${BASE}${path}`) : path;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? (isMultipart ? body : JSON.stringify(body)) : undefined,
  });
  if (res.status === 401) {
    // bubble up a uniform 401 error for global handling
    try {
      // Notify app-level listeners only if this was an authenticated call
      if (token && typeof window !== 'undefined') {
        const ev = new CustomEvent('api:unauthorized', { detail: { path, method } });
        // Dispatch asynchronously to avoid interfering with current call stack
        setTimeout(() => window.dispatchEvent(ev), 0);
      }
    } catch {}
    const data = await safeJson(res);
    const err = new Error(data?.error || 'Unauthorized');
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.error || 'Request failed');
  }
  return res.json();
}

async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}
