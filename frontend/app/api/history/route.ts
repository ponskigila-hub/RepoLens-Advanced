import { proxyBackend } from '@/services/backendProxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return proxyBackend('/api/history', request, 30_000);
}
