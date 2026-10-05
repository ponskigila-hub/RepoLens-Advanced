import { AnalysisRequest, AnalysisResult } from '@/types/analysis';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiService {
  private baseUrl: string;
  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async analyzeRepository(githubUrl: string, skipLlm = false, signal?: AbortSignal): Promise<AnalysisResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_url: githubUrl, include_llm: !skipLlm, use_mock: false } satisfies AnalysisRequest),
        signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = typeof data.detail === 'string' ? data.detail : `HTTP error: ${response.status}`;
        throw new Error(detail);
      }
      return data as AnalysisResult;
    } catch (error) {
      if (error instanceof Error) throw new Error(`Failed to analyze repository: ${error.message}`);
      throw new Error('Failed to analyze repository: Unknown error');
    }
  }

  async healthCheck(): Promise<{ status: string; service: string; scoring?: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) throw new Error('Backend service is unavailable');
    return response.json();
  }
}

export const apiService = new ApiService();
