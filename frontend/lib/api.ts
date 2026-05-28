import type { HealthResponse } from "@/types/api";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends RequestInit {
  skipJson?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const bodyIsFormData = options.body instanceof FormData;

  if (!bodyIsFormData && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await safeJson(response);
    const message =
      typeof details === "object" && details && "detail" in details
        ? String(details.detail)
        : `Request failed with ${response.status}`;
    throw new ApiError(message, response.status, details);
  }

  if (options.skipJson) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function getBackendHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/health");
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
