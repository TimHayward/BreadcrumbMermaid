// Client for the endpoints in server.mjs. Errors carry the server's own message.
async function request(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Request failed.');
  return body;
}

export const listDiagrams = () => request('/api/diagrams');

export const openDiagram = (file) => request(`/api/diagrams/${encodeURIComponent(file)}`);

export const saveDiagram = (file, code, revision) =>
  request(`/api/diagrams/${encodeURIComponent(file)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, revision })
  });
