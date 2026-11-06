import assert from "node:assert/strict";
import test from "node:test";
import { CheckoutApiError } from "../src/exceptions";
import { V1Client } from "../src/v1";
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

test("throws when api key missing", () => {
  assert.throws(() => new V1Client(""));
});

test("createPayment sends correct request", async () => {
  const { impl, calls } = mockFetch(200, { status: "success", payment: { _id: 1 } });
  const client = new V1Client("test_key_123", { fetchImpl: impl });

  const result = await client.createPayment({ amount: 50000, description: "test order" });

  assert.deepEqual(result, { status: "success", payment: { _id: 1 } });
  const call = calls[0] as { url: string; init: { headers: Record<string, string>; body: string } };
  assert.equal(call.url, "https://checkout.uz/api/v1/create_payment");
  assert.equal(call.init.headers.Authorization, "Bearer test_key_123");
  assert.deepEqual(JSON.parse(call.init.body), { amount: 50000, description: "test order" });
});

test("optional undefined params are omitted", async () => {
  const { impl, calls } = mockFetch(200, { status: "success" });
  const client = new V1Client("test_key_123", { fetchImpl: impl });

  await client.createPayment({ amount: 1000 });

  const call = calls[0] as { init: { body: string } };
  assert.deepEqual(JSON.parse(call.init.body), { amount: 1000 });
});

test("error response raises CheckoutApiError", async () => {
  const { impl } = mockFetch(401, { error: "Unauthorized: Invalid or missing Bearer token" });
  const client = new V1Client("test_key_123", { fetchImpl: impl });

  await assert.rejects(
    () => client.getBalance(),
    (err: unknown) => {
      assert.ok(err instanceof CheckoutApiError);
      assert.equal(err.statusCode, 401);
      assert.match(err.message, /Unauthorized/);
      return true;
    }
  );
});

test("statusPayment requires id or uuid", () => {
  const client = new V1Client("test_key_123", { fetchImpl: mockFetch(200, {}).impl });
  assert.throws(() => client.statusPayment({}));
});

test("statusPayment by uuid", async () => {
  const { impl, calls } = mockFetch(200, { status: "success" });
  const client = new V1Client("test_key_123", { fetchImpl: impl });

  await client.statusPayment({ uuid: "abc-123" });

  const call = calls[0] as { init: { body: string } };
  assert.deepEqual(JSON.parse(call.init.body), { uuid: "abc-123" });
});

test("network error raises CheckoutApiError", async () => {
  const impl: FetchLike = async () => {
    throw new Error("boom");
  };
  const client = new V1Client("test_key_123", { fetchImpl: impl });

  await assert.rejects(() => client.getBalance(), CheckoutApiError);
});

test("payViaCard sends correct body", async () => {
  const { impl, calls } = mockFetch(200, { status: "success" });
  const client = new V1Client("test_key_123", { fetchImpl: impl });

  await client.payViaCard({ orderId: 5, cardNumber: "8600123412341234", cardExpiry: "1230" });

  const call = calls[0] as { url: string; init: { body: string } };
  assert.equal(call.url, "https://checkout.uz/api/v1/pay_via_card");
  assert.deepEqual(JSON.parse(call.init.body), {
    order_id: 5,
    card_number: "8600123412341234",
    card_expiry: "1230",
  });
});
