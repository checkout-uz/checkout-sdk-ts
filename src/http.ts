import { CheckoutApiError } from "./exceptions";

export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  }
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export interface BaseClientOptions {
  timeoutMs?: number;
  /** Injectable for tests - defaults to the global `fetch` (Node >=18). */
  fetchImpl?: FetchLike;
}

const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * Shared request/response handling for all CHECKOUT.UZ API clients. Every
 * endpoint accepts a JSON body over POST and replies with a JSON body -
 * any non-2xx HTTP status is treated as an error.
 */
export class BaseClient {
  protected readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(baseUrl: string, token: string, options: BaseClientOptions = {}) {
    if (!token) {
      throw new Error("An API token is required");
    }
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.token = token;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
    if (!this.fetchImpl) {
      throw new Error(
        "global fetch is not available - use Node 18+ or pass a fetchImpl"
      );
    }
  }

  protected async post<T = Record<string, unknown>>(
    methodName: string,
    params: Record<string, unknown> = {},
    extraHeaders: Record<string, string> = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/${methodName}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    };

    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) body[key] = value;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: { ok: boolean; status: number; json: () => Promise<unknown> };
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      throw new CheckoutApiError(
        `Network error while calling ${methodName}: ${(err as Error).message}`
      );
    } finally {
      clearTimeout(timer);
    }

    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const d = data as { error?: string; message?: string } | null;
      const message = d?.error ?? d?.message ?? "Unknown error";
      throw new CheckoutApiError(message, response.status, data);
    }

    return (data ?? {}) as T;
  }
}
