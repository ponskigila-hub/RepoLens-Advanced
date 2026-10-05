const backendOrigin = () => {
  const configured = process.env.REPOLENS_API_URL || 'http://127.0.0.1:8000';
  return configured.trim().replace(/\/+$/, '');
};

export async function proxyBackend(path: '/api/analyze' | '/health', request?: Request, timeoutMs = 10_000) {
  const headers = new Headers();
  if (request?.headers.get('content-type')) headers.set('content-type', request.headers.get('content-type')!);

  try {
    const response = await fetch(`${backendOrigin()}${path}`, {
      method: request?.method ?? 'GET',
      headers,
      body: request?.method === 'POST' ? await request.text() : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    const responseHeaders = new Headers({
      'content-type': response.headers.get('content-type') || 'application/json',
      'cache-control': 'no-store, max-age=0',
    });
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    const detail = timedOut
      ? 'The RepoLens backend took too long to respond. Try again, or check the backend service logs.'
      : 'The RepoLens backend is unreachable. Set REPOLENS_API_URL on the frontend server to the FastAPI service origin, then redeploy.';
    return Response.json({ detail }, { status: timedOut ? 504 : 503 });
  }
}
