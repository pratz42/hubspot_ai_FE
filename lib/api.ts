import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default API;

/** Normalizes GET /leads responses that may be a plain array or a paginated
 *  object { data: [...], total, page, per_page } returned by the backend. */
export function extractArray<T>(responseData: unknown): T[] {
  if (Array.isArray(responseData)) return responseData as T[];
  if (responseData && typeof responseData === "object") {
    const obj = responseData as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.leads)) return obj.leads as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
  }
  return [];
}