import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly AUTH_URL = 'https://notify.eskiz.uz/api/auth/login';
  private readonly SEND_URL = 'https://notify.eskiz.uz/api/message/sms/send';
  private readonly FROM = '4546';

  constructor(private readonly config: ConfigService) { }

  // ─── Token ────────────────────────────────────────────────────────────────

  private async getToken(): Promise<string | null> {
    const email = this.config.get<string>('ESKIZ_EMAIL');
    const password = this.config.get<string>('ESKIZ_PASSWORD');

    try {
      console.log(email, password, 'password email');

      const res = await fetch(this.AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json() as any;
      const token: string | undefined = json?.data?.token;

      if (!token) {
        this.logger.error('Eskiz auth failed — no token in response', json);
        return null;
      }

      return token;
    } catch (e) {
      this.logger.error('Eskiz auth request failed', e?.message);
      return null;
    }
  }

  // ─── Message cleanup (cyrillic → latin) ───────────────────────────────────

  private cleanMessage(message: string): string {
    const MAP: [string, string][] = [
      // lower
      ['ц', 'ts'], ['ч', 'ch'], ['ю', 'yu'], ['ё', 'yo'], ['ж', 'j'],
      ['ш', 'sh'], ['щ', 'sh'], ['ъ', "'"], ['ь', "'"], ['э', 'e'],
      ['ы', 'i'], ['я', 'ya'], ['а', 'a'], ['б', 'b'], ['в', 'v'],
      ['г', 'g'], ['д', 'd'], ['е', 'e'], ['з', 'z'], ['и', 'i'],
      ['й', 'y'], ['к', 'k'], ['л', 'l'], ['м', 'm'], ['н', 'n'],
      ['о', 'o'], ['п', 'p'], ['р', 'r'], ['с', 's'], ['т', 't'],
      ['у', 'u'], ['ф', 'f'], ['х', 'x'],
      // uzbek specific
      ['қ', 'q'], ['ў', "o'"], ['ғ', "g'"], ['ҳ', 'h'],
      // upper
      ['Ц', 'Ts'], ['Ч', 'Ch'], ['Ю', 'Yu'], ['Ё', 'Yo'], ['Ж', 'J'],
      ['Ш', 'Sh'], ['Щ', 'Sh'], ['Э', 'E'], ['Я', 'Ya'],
      ['А', 'A'], ['Б', 'B'], ['В', 'V'], ['Г', 'G'], ['Д', 'D'],
      ['Е', 'E'], ['З', 'Z'], ['И', 'I'], ['Й', 'Y'], ['К', 'K'],
      ['Л', 'L'], ['М', 'M'], ['Н', 'N'], ['О', 'O'], ['П', 'P'],
      ['Р', 'R'], ['С', 'S'], ['Т', 'T'], ['У', 'U'], ['Ф', 'F'],
      ['Х', 'X'], ['Қ', 'Q'], ['Ғ', "G'"], ['Ҳ', 'H'],
    ];

    let result = message;
    for (const [from, to] of MAP) {
      result = result.split(from).join(to);
    }
    return result;
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Send an OTP or any arbitrary SMS to a phone number.
   * @param phone 9-digit Uzbek phone number without country code (e.g. "974409931")
   * @param message Text to send (Cyrillic will be auto-transliterated)
   */
  async sendSms(phone: string, message: string): Promise<boolean> {
    // Validate phone — must be 9 digits
    let cleaned = phone.replace(/\D/g, ''); // faqat raqamlarni qoldiradi
    console.log(cleaned, 'cleaned1');

    // boshidagi 998 ni kesib tashlash
    if (cleaned.startsWith('998')) {
      cleaned = cleaned.slice(3);
    }

    console.log(cleaned, 'cleaned2');
    if (cleaned.length !== 9) {
      this.logger.warn(`Invalid phone number: ${phone}`);
      return false;
    }

    if (!message) {
      this.logger.warn('SMS message is empty');
      return false;
    }

    const cleanedMessage = this.cleanMessage(message);

    const token = await this.getToken();
    if (!token) return false;

    try {
      const formData = new URLSearchParams();
      formData.append('mobile_phone', '998' + cleaned);
      formData.append('message', cleanedMessage);
      formData.append('from', this.FROM);

      const res = await fetch(this.SEND_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const json = await res.json() as any;
      this.logger.log(`Eskiz SMS response: ${JSON.stringify(json)}`);

      if (!res.ok) {
        this.logger.error(`SMS failed (HTTP ${res.status})`, json);
        return false;
      }

      this.logger.log(`SMS sent to +998${cleaned}`);
      return true;
    } catch (e) {
      this.logger.error('Eskiz send request failed', e?.message);
      return false;
    }
  }

  /**
   * Convenience wrapper — sends OTP code.
   * @param phone 9-digit number e.g. "974409931"
   * @param code  OTP code string e.g. "123456"
   */
  async sendOtp(phone: string, code: string): Promise<boolean> {
    const message = `Fuel Pay ilovasiga kirish uchun kod - ${code}`;
    return this.sendSms(phone, message);
  }
}
