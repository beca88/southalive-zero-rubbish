// Single source of truth for the backend URL.
// VITE_API_BASE_URL is the API's origin only — no "/api" suffix and no trailing slash
// (e.g. https://southalive-zero-rubbish.onrender.com). The "/api" prefix is added here.
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!rawBaseUrl) {
    throw new Error(
        "VITE_API_BASE_URL is not set. Add it to .env.development for local dev, " +
        "or to the Vercel project's environment variables for deployments."
    );
}

export const API_BASE_URL = `${rawBaseUrl.replace(/\/+$/, "")}/api`;
