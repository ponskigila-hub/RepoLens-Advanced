import { proxyBackend } from '@/services/backendProxy';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return proxyBackend('/api/reports', request, 15_000);
}
