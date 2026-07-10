// Small fetch helper shared by all pages.
export async function api(path, params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== ''),
  );
  const url = `/api/${path}${qs.toString() ? `?${qs}` : ''}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const REGIONS = [
  { value: 'eu', label: 'EU' },
  { value: 'us', label: 'US' },
  { value: 'kr', label: 'KR' },
  { value: 'tw', label: 'TW' },
];
