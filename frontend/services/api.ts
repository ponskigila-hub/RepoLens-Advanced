import type { AnalysisProgress, AnalysisRequest, AnalysisResult, FilePreview, PublicReport, RepositoryHistory, SavedReport } from '@/types/analysis';

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

  async analyzeRepositoryWithProgress(
    githubUrl: string,
    skipLlm = true,
    onProgress?: (event: AnalysisProgress) => void,
    signal?: AbortSignal,
  ): Promise<AnalysisResult> {
    const payload: AnalysisRequest = { github_url: githubUrl, include_llm: !skipLlm, use_mock: false };
    let response: Response;
    try {
      response = await fetch(this.endpoint('/api/analyze/stream'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal, cache: 'no-store',
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new Error('Could not reach the RepoLens analysis stream. Check that the FastAPI backend is running and REPOLENS_API_URL is configured.');
    }
    if (!response.ok) {
      const data: unknown = await response.json().catch(() => ({}));
      const detail = typeof data === 'object' && data !== null && 'detail' in data && typeof data.detail === 'string' ? data.detail : `Analysis request failed (${response.status}).`;
      throw new Error(detail);
    }
    if (!response.body) throw new Error('The analysis stream returned no response body.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result: AnalysisResult | null = null;
    const consume = (frame: string) => {
      let eventName = 'message';
      const dataLines: string[] = [];
      for (const line of frame.split(/\r?\n/)) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
      }
      if (!dataLines.length) return;
      const value: unknown = JSON.parse(dataLines.join('\n'));
      if (eventName === 'progress') onProgress?.(value as AnalysisProgress);
      else if (eventName === 'error') {
        const detail = typeof value === 'object' && value !== null && 'detail' in value && typeof value.detail === 'string' ? value.detail : 'Analysis did not complete.';
        throw new Error(detail);
      } else if (eventName === 'result') result = value as AnalysisResult;
    };
    try {
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? '';
        for (const frame of frames) consume(frame);
        if (done) break;
      }
      if (buffer.trim()) consume(buffer);
    } finally {
      reader.releaseLock();
    }
    if (!result) throw new Error('The analysis stream ended before the report payload arrived.');
    return result;
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

  async getFilePreview(githubUrl: string, path: string): Promise<FilePreview> {
    let response: Response;
    try {
      response = await fetch(this.endpoint('/api/file-preview'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_url: githubUrl, path }),
        cache: 'no-store',
      });
    } catch {
      throw new Error('The file preview service is unreachable.');
    }
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof data === 'object' && data !== null && 'detail' in data && typeof data.detail === 'string'
        ? data.detail
        : `File preview failed (${response.status}).`;
      throw new Error(detail);
    }
    return data as FilePreview;
  }

  async getRepositoryHistory(githubUrl: string, signal?: AbortSignal): Promise<RepositoryHistory> {
    let response: Response;
    try {
      response = await fetch(this.endpoint('/api/history'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_url: githubUrl }),
        signal,
        cache: 'no-store',
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new Error('Could not reach the GitHub history service.');
    }
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof data === 'object' && data !== null && 'detail' in data && typeof data.detail === 'string'
        ? data.detail
        : `Loading repository history failed (${response.status}).`;
      throw new Error(detail);
    }
    return data as RepositoryHistory;
  }
}

export const apiService = new ApiService();
