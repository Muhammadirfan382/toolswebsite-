import { describe, expect, it } from 'vitest';
import {
  cleanWhatsAppNumber,
  colorWarning,
  contrastRatio,
  emailPayload,
  escapeVcard,
  escapeWifi,
  geoPayload,
  phonePayload,
  smsPayload,
  textPayload,
  urlPayload,
  vcardPayload,
  whatsappPayload,
  wifiPayload,
  type VcardInput,
} from '../../src/lib/qr/payload';

const payload = (r: { ok: boolean; payload?: string; error?: string }) => {
  if (!r.ok) throw new Error(`expected ok: ${r.error}`);
  return r.payload!;
};
const error = (r: { ok: boolean; error?: string }) => (r.ok ? null : r.error);

describe('URL', () => {
  it('adds https:// when missing', () => {
    expect(payload(urlPayload('example.com/menu'))).toBe('https://example.com/menu');
    expect(payload(urlPayload('  http://example.com '))).toBe('http://example.com');
  });
  it('rejects empty or invalid input', () => {
    expect(error(urlPayload(''))).toMatch(/Enter/);
    expect(error(urlPayload('not a url'))).toBeTruthy();
    expect(error(urlPayload('example'))).toMatch(/domain ending/);
  });
});

describe('WiFi', () => {
  it('escapes special characters ; , : \\ "', () => {
    expect(escapeWifi('a;b,c:d\\e"f')).toBe('a\\;b\\,c\\:d\\\\e\\"f');
  });
  it('builds a WPA payload', () => {
    expect(payload(wifiPayload({ ssid: 'My Net', password: 'p@ss;word', security: 'WPA', hidden: false }))).toBe(
      'WIFI:T:WPA;S:My Net;P:p@ss\\;word;;',
    );
  });
  it('omits the password for open networks and flags hidden ones', () => {
    expect(payload(wifiPayload({ ssid: 'Cafe', password: 'ignored', security: 'nopass', hidden: true }))).toBe(
      'WIFI:T:nopass;S:Cafe;H:true;;',
    );
  });
  it('requires SSID and password', () => {
    expect(error(wifiPayload({ ssid: '', password: 'x', security: 'WPA', hidden: false }))).toMatch(/SSID/);
    expect(error(wifiPayload({ ssid: 'x', password: '', security: 'WEP', hidden: false }))).toMatch(/password/);
  });
});

describe('Email, phone, SMS, text', () => {
  it('builds mailto with encoded subject and body', () => {
    expect(payload(emailPayload({ to: 'a@b.com', subject: 'Hi there', body: 'Line 1\nLine & 2' }))).toBe(
      'mailto:a@b.com?subject=Hi%20there&body=Line%201%0ALine%20%26%202',
    );
    expect(payload(emailPayload({ to: 'a@b.com', subject: '', body: '' }))).toBe('mailto:a@b.com');
    expect(error(emailPayload({ to: 'nope', subject: '', body: '' }))).toMatch(/name@example.com/);
  });
  it('cleans phone numbers', () => {
    expect(payload(phonePayload('+1 (555) 123-4567'))).toBe('tel:+15551234567');
    expect(error(phonePayload('  '))).toMatch(/Enter/);
    expect(payload(smsPayload({ number: '0300 1234567', message: 'Hello' }))).toBe('SMSTO:03001234567:Hello');
  });
  it('requires text', () => {
    expect(error(textPayload(''))).toBeTruthy();
    expect(payload(textPayload('  spaced  '))).toBe('  spaced  ');
  });
});

describe('WhatsApp', () => {
  it('cleans numbers for wa.me', () => {
    expect(cleanWhatsAppNumber('+92 300-123 4567')).toBe('923001234567');
    expect(cleanWhatsAppNumber('0044 7700 900123')).toBe('447700900123');
  });
  it('builds the link with an encoded message', () => {
    expect(payload(whatsappPayload({ number: '+92 300 1234567', message: 'Hi! Is this available?' }))).toBe(
      'https://wa.me/923001234567?text=Hi!%20Is%20this%20available%3F',
    );
    expect(payload(whatsappPayload({ number: '+44 7700 900123', message: '' }))).toBe('https://wa.me/447700900123');
  });
  it('warns about a local leading zero and rejects bad lengths', () => {
    const r = whatsappPayload({ number: '0300 1234567', message: '' });
    expect(r.ok && r.warning).toMatch(/country code/);
    expect(error(whatsappPayload({ number: '123', message: '' }))).toMatch(/country code/);
    expect(error(whatsappPayload({ number: '1'.repeat(16), message: '' }))).toMatch(/too long/);
  });
});

describe('vCard', () => {
  const base: VcardInput = {
    firstName: 'Ana', lastName: 'Silva', phone: '+1 555 0100', email: 'ana@example.com', company: 'Acme, Inc.',
    title: 'Owner; Chef', website: 'https://example.com', street: '1 Main St', city: 'Springfield', region: '',
    postcode: '12345', country: 'USA',
  };
  it('escapes , ; \\ and newlines', () => {
    expect(escapeVcard('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });
  it('builds a vCard 3.0 with CRLF line endings', () => {
    const v = payload(vcardPayload(base));
    expect(v.split('\r\n')).toEqual([
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Silva;Ana;;;',
      'FN:Ana Silva',
      'ORG:Acme\\, Inc.',
      'TITLE:Owner\\; Chef',
      'TEL;TYPE=CELL:+15550100',
      'EMAIL:ana@example.com',
      'URL:https://example.com',
      'ADR;TYPE=WORK:;;1 Main St;Springfield;;12345;USA',
      'END:VCARD',
    ]);
  });
  it('needs a name or company and a valid email', () => {
    const empty = Object.fromEntries(Object.keys(base).map((k) => [k, ''])) as unknown as VcardInput;
    expect(error(vcardPayload(empty))).toMatch(/name or a company/);
    expect(error(vcardPayload({ ...base, email: 'bad' }))).toMatch(/email/);
  });
});

describe('Location', () => {
  it('builds geo: URIs and validates ranges', () => {
    expect(payload(geoPayload('24.8607', '67.0011'))).toBe('geo:24.8607,67.0011');
    expect(error(geoPayload('91', '0'))).toMatch(/Latitude/);
    expect(error(geoPayload('0', '-181'))).toMatch(/Longitude/);
    expect(error(geoPayload('', '1'))).toMatch(/both/);
  });
});

describe('Color contrast', () => {
  it('computes contrast and warns', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(colorWarning('#000000', '#ffffff', 4)).toBeNull();
    expect(colorWarning('#777777', '#888888', 4)).toMatch(/too similar/);
    expect(colorWarning('#ffffff', '#000000', 4)).toMatch(/Light code/);
  });
});
