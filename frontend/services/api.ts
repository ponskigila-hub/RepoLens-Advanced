import type { AnalysisRequest, AnalysisResult } from '@/types/analysis';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiService {
  private readonly baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async analyzeRepository(githubUrl: string, skipLlm = true, signal?: AbortSignal): Promise<AnalysisResult> {
    try {
      const payload: AnalysisRequest = { github_url: githubUrl, include_llm: !skipLlm, use_mock: false };
      const response = await fetch(`${this.baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      });
      const data: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = typeof data === 'object' && data !== null && 'detail' in data && typeof data.detail === 'string'
          ? data.detail
          : `Request failed (${response.status}).`;
        throw new Error(detail);
      }
      return data as AnalysisResult;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      if (error instanceof Error) throw new Error(`Could not analyze repository: ${error.message}`);
      throw new Error('Could not analyze repository. Please try again.');
    }
  }

  async healthCheck(): Promise<{ status: string; service: string; scoring?: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) throw new Error('Backend service is unavailable.');
    return response.json();
  }
}

export const apiService = new ApiService();
