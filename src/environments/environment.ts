import { deriveSseUrl, deriveWsUrl, resolveApiBase } from './env';

const apiBase = resolveApiBase();

export const environment = {
  production: false,
  apiUrl: apiBase,
  wsUrl: deriveWsUrl(apiBase),
  sseUrl: deriveSseUrl(apiBase),
};