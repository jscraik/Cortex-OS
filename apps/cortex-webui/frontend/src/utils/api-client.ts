"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            "content-type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });

    if (res.status === 401 || res.status === 403) {
        if (typeof window !== "undefined") {
            localStorage.removeItem("access_token");
            window.location.href = "/login";
        }
        throw new Error("Unauthorized");
    }

    if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
    }

    return (await res.json()) as T;
}
