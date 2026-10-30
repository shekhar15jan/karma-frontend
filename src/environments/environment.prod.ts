// Served behind nginx (see nginx.conf), which proxies /api, /ws and /sse to the API.
export const environment = {
  production: true,
  apiUrl: '/api',
  wsUrl: '/ws',
  sseUrl: '/sse',
};
