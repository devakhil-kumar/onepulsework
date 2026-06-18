// Fixes avatar/media URLs when the backend APP_URL env var defaults to localhost.
// Replaces http(s)://localhost:PORT or 127.0.0.1:PORT with the real server origin.
const SERVER_ORIGIN = 'https://onepulsework.com';

export function resolveMediaUrl(url) {
  if (!url) return undefined;
  return url.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, SERVER_ORIGIN);
}
