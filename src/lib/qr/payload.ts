/** Build the text stored inside a QR code for each content type. Pure functions, unit-tested. */

export type PayloadResult = { ok: true; payload: string; warning?: string } | { ok: false; error: string };

const ok = (payload: string, warning?: string): PayloadResult => ({ ok: true, payload, warning });
const fail = (error: string): PayloadResult => ({ ok: false, error });

/* URL ---------------------------------------------------------------- */
export function urlPayload(input: string): PayloadResult {
  const raw = input.trim();
  if (!raw) return fail('Enter a web address, for example example.com.');
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return fail('That does not look like a web address. Check for spaces or typos.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    return ok(withScheme, 'This link does not start with http or https, so some phones may not open it.');
  }
  if (!url.hostname.includes('.') && url.hostname !== 'localhost') {
    return fail('The address needs a domain ending, such as .com or .org.');
  }
  return ok(withScheme);
}

/* Text --------------------------------------------------------------- */
export function textPayload(input: string): PayloadResult {
  return input.length === 0 ? fail('Type the text you want in the QR code.') : ok(input);
}

/* WiFi --------------------------------------------------------------- */
/** Escape \ ; , : " with a backslash, as the WiFi QR format requires. */
export function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1');
}

export interface WifiInput {
  ssid: string;
  password: string;
  security: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

export function wifiPayload({ ssid, password, security, hidden }: WifiInput): PayloadResult {
  if (!ssid) return fail('Enter the network name (SSID).');
  if (security !== 'nopass' && !password) {
    return fail('Enter the WiFi password, or choose "None" if the network is open.');
  }
  let payload = `WIFI:T:${security};S:${escapeWifi(ssid)};`;
  if (security !== 'nopass') payload += `P:${escapeWifi(password)};`;
  if (hidden) payload += 'H:true;';
  return ok(`${payload};`);
}

/* Email -------------------------------------------------------------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailPayload({ to, subject, body }: { to: string; subject: string; body: string }): PayloadResult {
  const address = to.trim();
  if (!address) return fail('Enter an email address.');
  if (!EMAIL_RE.test(address)) return fail('Check the email address: it should look like name@example.com.');
  const params = [
    subject ? `subject=${encodeURIComponent(subject)}` : '',
    body ? `body=${encodeURIComponent(body)}` : '',
  ].filter(Boolean);
  return ok(`mailto:${address}${params.length ? `?${params.join('&')}` : ''}`);
}

/* Phone and SMS ------------------------------------------------------ */
/** Keep a leading + and digits only. */
export function cleanPhone(input: string): string {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

export function phonePayload(number: string): PayloadResult {
  const n = cleanPhone(number);
  if (n.replace('+', '').length < 3) return fail('Enter a phone number.');
  return ok(`tel:${n}`);
}

export function smsPayload({ number, message }: { number: string; message: string }): PayloadResult {
  const n = cleanPhone(number);
  if (n.replace('+', '').length < 3) return fail('Enter the phone number to text.');
  return ok(`SMSTO:${n}:${message}`);
}

/* WhatsApp ----------------------------------------------------------- */
/** wa.me needs the full international number with digits only: no +, spaces, dashes or leading 00. */
export function cleanWhatsAppNumber(input: string): string {
  return input.replace(/\D/g, '').replace(/^00/, '');
}

export function whatsappPayload({ number, message }: { number: string; message: string }): PayloadResult {
  const n = cleanWhatsAppNumber(number);
  if (n.length < 7) return fail('Enter the WhatsApp number with the country code, for example +44 7700 900123.');
  if (n.length > 15) return fail('That number is too long. International numbers have at most 15 digits.');
  const warning =
    startsWithLocalZero(number)
      ? 'The number starts with 0. WhatsApp links need the country code instead of the leading 0.'
      : undefined;
  return ok(`https://wa.me/${n}${message ? `?text=${encodeURIComponent(message)}` : ''}`, warning);
}

function startsWithLocalZero(input: string): boolean {
  const t = input.trim();
  return /^0[1-9]/.test(t.replace(/[\s()-]/g, ''));
}

/* vCard 3.0 ---------------------------------------------------------- */
/** Escape per vCard 3.0: backslash, comma, semicolon and newlines. */
export function escapeVcard(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\r\n|\r|\n/g, '\\n');
}

export interface VcardInput {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  company: string;
  title: string;
  website: string;
  street: string;
  city: string;
  region: string;
  postcode: string;
  country: string;
}

export function vcardPayload(v: VcardInput): PayloadResult {
  const first = v.firstName.trim();
  const last = v.lastName.trim();
  if (!first && !last && !v.company.trim()) return fail('Enter at least a name or a company.');
  if (v.email.trim() && !EMAIL_RE.test(v.email.trim())) return fail('Check the email address: it should look like name@example.com.');
  const e = (s: string) => escapeVcard(s.trim());
  const full = [first, last].filter(Boolean).join(' ') || v.company.trim();
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${e(last)};${e(first)};;;`, `FN:${e(full)}`];
  if (v.company.trim()) lines.push(`ORG:${e(v.company)}`);
  if (v.title.trim()) lines.push(`TITLE:${e(v.title)}`);
  if (v.phone.trim()) lines.push(`TEL;TYPE=CELL:${cleanPhone(v.phone)}`);
  if (v.email.trim()) lines.push(`EMAIL:${e(v.email)}`);
  if (v.website.trim()) lines.push(`URL:${e(v.website)}`);
  if ([v.street, v.city, v.region, v.postcode, v.country].some((x) => x.trim())) {
    lines.push(`ADR;TYPE=WORK:;;${e(v.street)};${e(v.city)};${e(v.region)};${e(v.postcode)};${e(v.country)}`);
  }
  lines.push('END:VCARD');
  return ok(lines.join('\r\n'));
}

/* Location ----------------------------------------------------------- */
export function geoPayload(latInput: string, lngInput: string): PayloadResult {
  if (!latInput.trim() || !lngInput.trim()) return fail('Enter both latitude and longitude.');
  const lat = Number(latInput.trim());
  const lng = Number(lngInput.trim());
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return fail('Latitude must be a number between -90 and 90.');
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return fail('Longitude must be a number between -180 and 180.');
  return ok(`geo:${lat},${lng}`);
}

/* Color contrast ----------------------------------------------------- */
function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1]!, 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Returns a warning when colors may make the code hard to scan, otherwise null. */
export function colorWarning(foreground: string, background: string, minRatio: number): string | null {
  const ratio = contrastRatio(foreground, background);
  if (ratio < minRatio) {
    return `The colors are too similar (contrast ${ratio.toFixed(1)}:1). Use a darker code color or a lighter background so phones can scan it.`;
  }
  if (luminance(foreground) > luminance(background)) {
    return 'Light code on a dark background is not read by some scanner apps. Dark on light is the safest choice.';
  }
  return null;
}
