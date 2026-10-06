import { proxyBackend } from '@/services/backendProxy';

export const dynamic = 'force-dynamic';
const REPORT_ID_RE = /^[A-Za-z0-9_-]{12,64}$/;

type RouteContext = { params: Promise<{ reportId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { reportId } = await context.params;
  if (!REPORT_ID_RE.test(reportId)) {
    return Response.json({ detail: 'Report not found.' }, { status: 404 });
  }
  return proxyBackend(`/api/reports/${encodeURIComponent(reportId)}`, undefined, 8_000);
}
