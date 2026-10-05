import { proxyBackend } from '@/services/backendProxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return proxyBackend('/health', undefined, 5_000);
}
