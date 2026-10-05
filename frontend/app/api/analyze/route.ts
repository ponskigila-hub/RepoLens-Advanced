import { proxyBackend } from '@/services/backendProxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return proxyBackend('/api/analyze', request, 120_000);
}
