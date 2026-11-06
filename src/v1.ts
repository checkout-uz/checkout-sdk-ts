import { BaseClient, BaseClientOptions } from "./http";

export const V1_BASE_URL = "https://checkout.uz/api/v1";

/**
 * Client for the original CHECKOUT.UZ merchant API (`/api/v1`).
 * Authenticated with a shop's API key (found in the shop's settings on
 * checkout.uz), sent as `Authorization: Bearer <apiKey>`.
 */
export class V1Client extends BaseClient {
  constructor(apiKey: string, options: BaseClientOptions = {}) {
    super(V1_BASE_URL, apiKey, options);
  }

  /** Create a new payment invoice. `amount` is in UZS (1000-10,000,000). */
  createPayment(params: {
    amount: number;
    description?: string;
    webhookUrl?: string;
    returnUrl?: string;
  }) {
    return this.post("create_payment", {
      amount: params.amount,
      description: params.description,
      webhook_url: params.webhookUrl,
      return_url: params.returnUrl,
    });
  }

  /** Look up an invoice by its numeric `id` or its `uuid` (pay_token). Provide exactly one. */
  statusPayment(params: { id?: number; uuid?: string }) {
    if (params.id === undefined && params.uuid === undefined) {
      throw new Error("Provide either id or uuid");
    }
    return this.post("status_payment", { id: params.id, uuid: params.uuid });
  }

  /** Return the shop's current balance per currency. */
  getBalance() {
    return this.post("get_balance");
  }

  /** Return the shop's most recent invoices (newest first). */
  getHistory(params: { limit?: number } = {}) {
    return this.post("get_history", { limit: params.limit ?? 10 });
  }

  /** Return aggregate order count / total income for the shop. */
  getStats() {
    return this.post("get_stats");
  }

  /** List the payment methods enabled for this shop. */
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
}
