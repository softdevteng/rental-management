export const API_URL = '';

export async function api(path, { method = 'GET', body, token, isMultipart } = {}) {
  const headers = {};
  if (!isMultipart) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? (isMultipart ? body : JSON.stringify(body)) : undefined,
  });
  if (res.status === 401) {
    // bubble up a uniform 401 error for global handling
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
