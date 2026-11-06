/**
 * Raised whenever the CHECKOUT.UZ API returns an HTTP error status or a
 * network error occurs. `statusCode` is 0 if the request never reached
 * the server.
 */
export class CheckoutApiError extends Error {
  public readonly statusCode: number;
  public readonly response: unknown;

  constructor(message: string, statusCode = 0, response: unknown = null) {
    super(message);
    this.name = "CheckoutApiError";
    this.statusCode = statusCode;
    this.response = response;
    Object.setPrototypeOf(this, CheckoutApiError.prototype);
  }
}
