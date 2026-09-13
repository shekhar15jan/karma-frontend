import { deriveSseUrl, deriveWsUrl, resolveApiBase } from './env';

const apiBase = resolveApiBase();

export const environment = {
  production: true,
  apiUrl: apiBase,
  wsUrl: deriveWsUrl(apiBase),
  sseUrl: deriveSseUrl(apiBase),
};