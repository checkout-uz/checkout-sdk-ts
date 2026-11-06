import { BaseClient, BaseClientOptions } from "./http";
import { V1Client } from "./v1";
import { V2Client, V2_BASE_URL } from "./v2";

/**
 * Top-level entry point for the CHECKOUT.UZ merchant API. Holds a single
 * shop API key and exposes both API versions:
 *
 * ```ts
 * const client = new CheckoutClient("shop_api_key");
 * await client.v1.createPayment({ amount: 50000 });
 * await client.v2.createPayment({ amount: 50000, expireTime: 7200 });
 * ```
 *
 * For the account-level (not shop-level) v2 endpoints
 * (getProfile/getShops/getProfileStats), use {@link ProfileClient} instead
 * - they use a different credential.
 */
export class CheckoutClient {
  public readonly v1: V1Client;
  public readonly v2: V2Client;

  constructor(apiKey: string, options: BaseClientOptions = {}) {
    this.v1 = new V1Client(apiKey, options);
    this.v2 = new V2Client(apiKey, options);
  }
}

/**
 * Client for the account-level (profile) v2 endpoints. Authenticated with
 * a **profile API key** (from account settings), sent as
 * `Authorization: Bearer <profileApiKey>`. This is a different credential
 * from a shop's `apiKey` used by {@link CheckoutClient} - it is not tied
 * to one shop and can read data across every shop the account owns.
 *
 * ```ts
 * const profile = new ProfileClient("profile_api_key");
 * await profile.getShops();
 * ```
 */
export class ProfileClient extends BaseClient {
  constructor(profileApiKey: string, options: BaseClientOptions = {}) {
    super(V2_BASE_URL, profileApiKey, options);
  }

  /** Return the authenticated account's profile information. */
  getProfile() {
    return this.post("get_profile");
  }

  /** List every (non-deleted) shop owned by the authenticated account. */
  getShops() {
    return this.post("get_shops");
  }

  /** Return aggregate stats across all of the account's shops, broken down by shop and by provider. */
  getProfileStats(params: { dateFrom?: string; dateTo?: string } = {}) {
    return this.post("get_profile_stats", {
      date_from: params.dateFrom,
      date_to: params.dateTo,
    });
  }
}
