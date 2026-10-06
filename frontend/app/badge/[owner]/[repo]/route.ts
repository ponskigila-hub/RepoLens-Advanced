import { proxyBackend } from '@/services/backendProxy';

export const dynamic = 'force-dynamic';
const REPO_PART_RE = /^[A-Za-z0-9_.-]{1,100}$/;

type RouteContext = { params: Promise<{ owner: string; repo: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { owner, repo } = await context.params;
  const name = repo.endsWith('.svg') ? repo.slice(0, -4) : '';
  if (!REPO_PART_RE.test(owner) || !REPO_PART_RE.test(name)) {
    return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  return proxyBackend(`/badge/${encodeURIComponent(owner)}/${encodeURIComponent(name)}.svg`, undefined, 5_000);
}
