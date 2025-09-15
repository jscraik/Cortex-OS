/// <reference path="../vite-env.d.ts" />

export const WEBUI_BASE_URL =
	import.meta.env?.VITE_WEBUI_BASE_URL || 'http://localhost:3012';
export const API_BASE_URL =
	import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3033/api';
