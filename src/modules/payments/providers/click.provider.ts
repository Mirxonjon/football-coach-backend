import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PaymentProvider, ChargeResult } from './payment-provider.interface';

/**
 * Click.uz Merchant API client.
 *
 * Card tokenisation flow (two-step, user-driven):
 *   1) POST /card_token/request         → issues temporary card_token, triggers SMS to cardholder
 *   2) POST /card_token/verify          → confirms OTP, returns permanent card_token
 *   3) POST /card_token/{token}/payment → charges saved card (used by auto-pay cron & manual buy)
 *   4) DELETE /card_token/{token}       → revoke
 *
 * Env:
 *   CLICK_BASE_URL        (default https://api.click.uz/v2/merchant)
 *   CLICK_MERCHANT_ID
 *   CLICK_SERVICE_ID
 *   CLICK_SECRET_KEY
 *   CLICK_MERCHANT_USER_ID
 */
@Injectable()
export class ClickProvider implements PaymentProvider {
  readonly name = 'click';
  private readonly logger = new Logger(ClickProvider.name);

  private readonly baseUrl = process.env.CLICK_BASE_URL || 'https://api.click.uz/v2/merchant';
  private readonly merchantId = process.env.CLICK_MERCHANT_ID || '';
  private readonly serviceId = process.env.CLICK_SERVICE_ID || '';
  private readonly secretKey = process.env.CLICK_SECRET_KEY || '';
  private readonly merchantUserId = process.env.CLICK_MERCHANT_USER_ID || '';

  private isConfigured() {
    return !!(this.merchantId && this.serviceId && this.secretKey && this.merchantUserId);
  }

  private authHeader(): Record<string, string> {
    // Click uses: timestamp + sha1(timestamp + secret_key)
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const digest = createHash('sha1')
      .update(timestamp + this.secretKey)
      .digest('hex');

    return {
      'Auth': `${this.merchantUserId}:${digest}:${timestamp}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async request<T = any>(path: string, init: RequestInit): Promise<T> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Click merchant credentials are not configured');
    }
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: { ...this.authHeader(), ...(init.headers || {}) },
    });
    const text = await res.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    if (!res.ok || (json.error_code !== undefined && json.error_code !== 0)) {
      this.logger.warn(`Click ${path} failed: ${res.status} ${text}`);
      throw new BadRequestException({
        errorCode: json.error_code ?? res.status,
        errorMessage: json.error_note ?? res.statusText,
      });
    }
    return json as T;
  }

  // ─── Card tokenisation ───

  async requestCardToken(cardNumber: string, expireDate: string) {
    return this.request<{
      card_token: string;
      phone_number?: string;
      temporary?: number;
    }>('/card_token/request', {
      method: 'POST',
      body: JSON.stringify({
        service_id: Number(this.serviceId),
        card_number: cardNumber,
        expire_date: expireDate,
        temporary: 0,
      }),
    });
  }

  async verifyCardToken(cardToken: string, smsCode: string) {
    return this.request<{
      card_token: string;
      phone_number?: string;
      card_number?: string;
    }>('/card_token/verify', {
      method: 'POST',
      body: JSON.stringify({
        service_id: Number(this.serviceId),
        card_token: cardToken,
        sms_code: smsCode,
      }),
    });
  }

  async deleteCardToken(cardToken: string) {
    return this.request(`/card_token/${encodeURIComponent(cardToken)}`, {
      method: 'DELETE',
    });
  }

  // ─── Charging saved card ───

  async charge(amount: number, cardToken: string): Promise<ChargeResult> {
    if (!this.isConfigured()) {
      // Allow dev environments to run without Click creds — fail loudly but structured.
      this.logger.warn('Click charge skipped — provider not configured');
      return {
        success: false,
        errorCode: 'click_not_configured',
        errorMessage: 'Click merchant credentials are not configured',
      };
    }
    try {
      const res = await this.request<{
        payment_id?: number;
        payment_status?: number;
        error_code?: number;
        error_note?: string;
      }>('/card_token/payment', {
        method: 'POST',
        body: JSON.stringify({
          service_id: Number(this.serviceId),
          card_token: cardToken,
          amount,
          transaction_parameter: `auto-${Date.now()}`,
        }),
      });

      const ok = (res.payment_status ?? -1) >= 0 && (res.error_code ?? 0) === 0;
      return ok
        ? { success: true, externalId: res.payment_id ? String(res.payment_id) : undefined }
        : { success: false, errorCode: String(res.error_code ?? 'unknown'), errorMessage: res.error_note };
    } catch (err: any) {
      const body = err?.response ?? err?.getResponse?.() ?? {};
      return {
        success: false,
        errorCode: String(body?.errorCode ?? err?.status ?? 'click_error'),
        errorMessage: body?.errorMessage ?? err?.message ?? 'Click charge failed',
      };
    }
  }
}
