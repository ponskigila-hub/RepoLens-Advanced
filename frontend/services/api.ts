import type { AnalysisRequest, AnalysisResult, PublicReport, SavedReport } from '@/types/analysis';

export class ApiService {
  private readonly baseUrl: string;

  // Empty by default: requests stay same-origin and are forwarded by the Next.js server route.
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private endpoint(path: string) {
    return `${this.baseUrl}${path}`;
  }

  async analyzeRepository(githubUrl: string, skipLlm = true, signal?: AbortSignal): Promise<AnalysisResult> {
    const payload: AnalysisRequest = { github_url: githubUrl, include_llm: !skipLlm, use_mock: false };
    let response: Response;
    try {
      response = await fetch(this.endpoint('/api/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
        cache: 'no-store',
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new Error('Could not reach the RepoLens API. Check that the FastAPI backend is running and that REPOLENS_API_URL is configured on the frontend server.');
    }

    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof data === 'object' && data !== null && 'detail' in data && typeof data.detail === 'string'
        ? data.detail
        : `Analysis request failed (${response.status}).`;
      throw new Error(detail);
    }
    return data as AnalysisResult;
  }

  async healthCheck(): Promise<{ status: string; service: string; scoring?: string }> {
    let response: Response;
    try {
      response = await fetch(this.endpoint('/api/health'), { cache: 'no-store' });
    } catch {
      throw new Error('Analysis service is unreachable.');
    }
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof data === 'object' && data !== null && 'detail' in data && typeof data.detail === 'string'
        ? data.detail
        : 'Analysis service is unavailable.';
      throw new Error(detail);
    }
    return data as { status: string; service: string; scoring?: string };
  }

  async saveReport(result: AnalysisResult): Promise<SavedReport> {
    let response: Response;
    try {
      response = await fetch(this.endpoint('/api/reports'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result }),
        cache: 'no-store',
      });
    } catch {
      throw new Error('The report could not be saved. Check the analysis service connection and try again.');
    }
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof data === 'object' && data !== null && 'detail' in data && typeof data.detail === 'string'
        ? data.detail
        : `Saving the report failed (${response.status}).`;
      throw new Error(detail);
    }
    return data as SavedReport;
  }

  async getReport(reportId: string): Promise<PublicReport> {
    const response = await fetch(this.endpoint(`/api/reports/${encodeURIComponent(reportId)}`), { cache: 'no-store' });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof data === 'object' && data !== null && 'detail' in data && typeof data.detail === 'string'
        ? data.detail
        : `Loading the report failed (${response.status}).`;
      throw new Error(detail);
    }
    return data as PublicReport;
  }
}

export const apiService = new ApiService();
