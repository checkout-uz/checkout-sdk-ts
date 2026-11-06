import { BaseClient, BaseClientOptions } from "./http";

export const V2_BASE_URL = "https://checkout.uz/api/v2";

/**
 * Client for the CHECKOUT.UZ merchant API v2 (`/api/v2`). Authenticated
 * with the same shop API key as v1. v2 adds idempotent payment creation,
 * pagination, cancellation/refunds and fiscal receipts on top of
 * everything v1 offers.
 *
 * Note: `getProfile`/`getShops`/`getProfileStats` are account-level (not
 * shop-level) and use a *different* credential - see {@link ProfileClient}.
 */
export class V2Client extends BaseClient {
  constructor(apiKey: string, options: BaseClientOptions = {}) {
    super(V2_BASE_URL, apiKey, options);
  }

  /**
   * Create a new payment invoice. `amount` is in UZS (1000-10,000,000).
   * `expireTime` is in seconds (60-432000, default 3600). If
   * `idempotencyKey` is given and the same key was used for this shop
   * within the last 24 hours, the original invoice is returned instead
   * of creating a new one (`idempotent_replay` in the response tells you
   * which happened).
   */
  createPayment(params: {
    amount: number;
    description?: string;
    expireTime?: number;
    webhookUrl?: string;
    returnUrl?: string;
    idempotencyKey?: string;
  }) {
    const headers: Record<string, string> = params.idempotencyKey
      ? { "Idempotency-Key": params.idempotencyKey }
      : {};
    return this.post(
      "create_payment",
      {
        amount: params.amount,
        description: params.description,
        expire_time: params.expireTime,
        webhook_url: params.webhookUrl,
        return_url: params.returnUrl,
      },
      headers
    );
  }

  /** Look up an invoice by its numeric `id` or its `uuid` (pay_token). Provide exactly one. */
  statusPayment(params: { id?: number; uuid?: string }) {
    if (params.id === undefined && params.uuid === undefined) {
      throw new Error("Provide either id or uuid");
    }
    return this.post("status_payment", { id: params.id, uuid: params.uuid });
  }

  /** Return the shop's current balance per currency (uppercase currency codes). */
  getBalance() {
    return this.post("get_balance");
  }

  /**
   * Return the shop's invoices, newest first. `limit` is 1-200. `status`
   * filters by one of pending/paid/canceled/reversed. `dateFrom`/`dateTo`
   * accept any format PHP's `strtotime()` understands (e.g. "2026-01-01").
   * The response's `has_more` tells you whether another page exists.
   */
  getHistory(
    params: {
      limit?: number;
      offset?: number;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ) {
    return this.post("get_history", {
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
      status: params.status,
      date_from: params.dateFrom,
      date_to: params.dateTo,
    });
  }

  /** Return aggregate order count / income for the shop, broken down by payment provider. */
  getStats(params: { dateFrom?: string; dateTo?: string } = {}) {
    return this.post("get_stats", { date_from: params.dateFrom, date_to: params.dateTo });
  }

  /** List the payment methods enabled for this shop, including min/max amount and fiscal support. */
  getPaymentMethods() {
    return this.post("get_payment_methods");
  }

  /** Start a direct card payment (Uzcard/Humo) for a pending invoice. Sends an SMS code to the cardholder. */
  payViaCard(params: { orderId: number; cardNumber: string; cardExpiry: string }) {
    return this.post("pay_via_card", {
      order_id: params.orderId,
      card_number: params.cardNumber,
      card_expiry: params.cardExpiry,
    });
  }

  /** Confirm a card payment started with payViaCard using the SMS code the cardholder received. */
  confirmCardPayment(params: { paymentToken: string; smsCode: string }) {
    return this.post("confirm_card_payment", {
      payment_token: params.paymentToken,
      sms_code: params.smsCode,
    });
  }

  /** Cancel a pending invoice. Fails if the invoice is not in `pending` status. */
  cancelPayment(params: { orderId: number }) {
    return this.post("cancel_payment", { order_id: params.orderId });
  }

  /**
   * Reverse a successful card/Payme/Click payment and deduct it back from
   * the shop balance. Only available within a limited window after the
   * original payment (currently 22 hours); the API returns an error past
   * that point.
   */
  refundPayment(params: { orderId: number }) {
    return this.post("refund_payment", { order_id: params.orderId });
  }

  /** Fetch the fiscal (tax) receipt for a paid order. Supported for Payme, Click and Plum payments only. */
  getFiscal(params: { orderId: number }) {
    return this.post("get_fiscal", { order_id: params.orderId });
  }
}
