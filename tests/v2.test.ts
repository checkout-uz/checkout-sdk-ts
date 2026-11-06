import assert from "node:assert/strict";
import test from "node:test";
import { CheckoutApiError } from "../src/exceptions";
import { ProfileClient } from "../src/client";
import { V2Client } from "../src/v2";
import type { FetchLike } from "../src/http";

function mockFetch(status: number, data: unknown): { impl: FetchLike; calls: unknown[] } {
  const calls: unknown[] = [];
  const impl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => data,
    };
  };
  return { impl, calls };
}

test("createPayment with idempotency key sets header", async () => {
  const { impl, calls } = mockFetch(200, { status: "success" });
  const client = new V2Client("test_key_123", { fetchImpl: impl });

  await client.createPayment({ amount: 50000, expireTime: 7200, idempotencyKey: "order-42" });

  const call = calls[0] as { url: string; init: { headers: Record<string, string>; body: string } };
  assert.equal(call.url, "https://checkout.uz/api/v2/create_payment");
  assert.deepEqual(JSON.parse(call.init.body), { amount: 50000, expire_time: 7200 });
  assert.equal(call.init.headers["Idempotency-Key"], "order-42");
});

test("createPayment without idempotency key omits header", async () => {
  const { impl, calls } = mockFetch(200, { status: "success" });
  const client = new V2Client("test_key_123", { fetchImpl: impl });

  await client.createPayment({ amount: 1000 });

  const call = calls[0] as { init: { headers: Record<string, string> } };
  assert.equal(call.init.headers["Idempotency-Key"], undefined);
});

test("getHistory sends filters", async () => {
  const { impl, calls } = mockFetch(200, { status: "success", data: [] });
  const client = new V2Client("test_key_123", { fetchImpl: impl });

  await client.getHistory({ limit: 20, offset: 10, status: "paid", dateFrom: "2026-01-01" });

  const call = calls[0] as { url: string; init: { body: string } };
  assert.equal(call.url, "https://checkout.uz/api/v2/get_history");
  assert.deepEqual(JSON.parse(call.init.body), {
    limit: 20,
    offset: 10,
    status: "paid",
    date_from: "2026-01-01",
  });
});

test("cancelPayment", async () => {
  const { impl, calls } = mockFetch(200, { status: "success", order_status: "canceled" });
  const client = new V2Client("test_key_123", { fetchImpl: impl });

  const result = await client.cancelPayment({ orderId: 123 });

  const call = calls[0] as { url: string; init: { body: string } };
  assert.equal(call.url, "https://checkout.uz/api/v2/cancel_payment");
  assert.deepEqual(JSON.parse(call.init.body), { order_id: 123 });
  assert.deepEqual(result, { status: "success", order_status: "canceled" });
});

test("refundPayment error raises CheckoutApiError", async () => {
  const { impl } = mockFetch(409, { error: "More than 22 hours have passed" });
  const client = new V2Client("test_key_123", { fetchImpl: impl });

  await assert.rejects(
    () => client.refundPayment({ orderId: 123 }),
    (err: unknown) => {
      assert.ok(err instanceof CheckoutApiError);
      assert.equal(err.statusCode, 409);
      return true;
    }
  );
});

test("getFiscal", async () => {
  const { impl, calls } = mockFetch(200, { status: "success", fiscal: {} });
  const client = new V2Client("test_key_123", { fetchImpl: impl });

  await client.getFiscal({ orderId: 123 });

  const call = calls[0] as { url: string; init: { body: string } };
  assert.equal(call.url, "https://checkout.uz/api/v2/get_fiscal");
  assert.deepEqual(JSON.parse(call.init.body), { order_id: 123 });
});

test("ProfileClient uses a different credential against the same base url", async () => {
  const { impl, calls } = mockFetch(200, { status: "success", shops: [] });
  const profile = new ProfileClient("profile_key_xyz", { fetchImpl: impl });

  await profile.getShops();

  const call = calls[0] as { url: string; init: { headers: Record<string, string> } };
  assert.equal(call.url, "https://checkout.uz/api/v2/get_shops");
  assert.equal(call.init.headers.Authorization, "Bearer profile_key_xyz");
});

test("ProfileClient requires a key", () => {
  assert.throws(() => new ProfileClient(""));
});
