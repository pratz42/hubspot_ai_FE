import axios from "axios";

export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
) {
  if (axios.isAxiosError(error)) {
    const response = error.response?.data as any;

    if (response?.detail) {
      return String(response.detail);
    }

    if (typeof response?.message === "string") {
      return response.message;
    }

    if (error.message) {
      return error.message;
    }

    return fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === "string") {
    return error;
  }

  return fallback;
}
