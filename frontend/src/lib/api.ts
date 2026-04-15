const rawBaseUrl = ((import.meta as any).env.VITE_API_BASE_URL || '').trim();

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
