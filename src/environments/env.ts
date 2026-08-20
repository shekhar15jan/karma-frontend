export interface KarmaEnvironment {
  production: boolean;
  apiUrl: string;
  wsUrl: string;
  sseUrl: string;
}

/**
 * Runtime-configurable API base. The `window.__KARMA_API_BASE__` global (set by the
 * deployment shell, e.g. nginx template or a bootstrap script) overrides the baked-in
 * default so production builds are not hardwired to localhost.
 */
export function resolveApiBase(): string {
  const g = (window as any)?.__KARMA_API_BASE__;
  return typeof g === 'string' && g.trim() ? g.replace(/\/+$/, '') : 'http://127.0.0.1:8080/api';
}

export function deriveWsUrl(apiBase: string): string {
  const base = apiBase.replace(/^http/, 'ws');
  return `${base}/ws`;
}

export function deriveSseUrl(apiBase: string): string {
  return `${apiBase.replace(/\/api$/, '')}/sse`;
}