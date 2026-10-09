import { proxyBackend } from '@/services/backendProxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request) {
  return proxyBackend('/api/analyze/stream', request, 120_000);
}
