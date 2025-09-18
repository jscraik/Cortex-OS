'use client';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
	const doFetch = async (url: string) =>
		fetch(url, {
			...options,
			headers: {
				'content-type': 'application/json',
				...(token ? { Authorization: `Bearer ${token}` } : {}),
				...(options.headers || {}),
			},
		});

	let res: Response;
	try {
		res = await doFetch(`${API_BASE}${path}`);
	} catch (err) {
		// Some environments (node/undici) refuse to parse relative URLs like '/api/..'.
		// Fall back to a localhost absolute URL during tests or Node environments.
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes('Invalid URL') || msg.includes('Failed to parse URL')) {
			const fallback = `http://localhost${path}`;
			res = await doFetch(fallback);
		} else {
			throw err;
		}
	}

	if (res.status === 401 || res.status === 403) {
		if (typeof window !== 'undefined') {
			localStorage.removeItem('access_token');
			window.location.href = '/login';
		}
		throw new Error('Unauthorized');
	}

	if (!res.ok) {
		throw new Error(`API error: ${res.status}`);
	}

	return (await res.json()) as T;
}
