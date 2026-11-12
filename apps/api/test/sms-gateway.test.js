// Unit tests for the template-driven SMS gateway client (SMS_PROVIDER=http) and BD phone
// normalization. Runs against compiled dist/ (build first) and a throwaway local HTTP server.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { SmsService } = require('../dist/messaging/sms.service');
const { normalizeBdMobile, maskPhone, maskEmail } = require('../dist/common/utils/phone');

const fakeConfig = (vars) => ({ get: (k) => vars[k] });

let server;
let base;
let last;
let reply = { status: 200, body: '{"status":"SUCCESS"}' };

before(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      last = { method: req.method, url: req.url, headers: req.headers, body };
      res.writeHead(reply.status, { 'Content-Type': 'application/json' });
      res.end(reply.body);
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

describe('normalizeBdMobile', () => {
  test('accepts the usual spellings and returns E.164', () => {
    for (const input of ['01712345678', '+8801712345678', '8801712345678', '017-1234 5678', '+88 017 1234 5678']) {
      assert.equal(normalizeBdMobile(input), '+8801712345678', input);
    }
  });
  test('rejects non-mobile / foreign numbers', () => {
    for (const input of ['01212345678', '0171234567', '+14155550100', '', null]) {
      assert.equal(normalizeBdMobile(input), null, String(input));
    }
  });
  test('masks', () => {
    assert.equal(maskPhone('+8801712345678'), '+880171****678');
    assert.equal(maskEmail('someone@example.com'), 'so*****@example.com');
  });
});

describe('SmsService (http)', () => {
  const msg = 'Code: 123456 & "quotes" — বাংলা';

  test('GET with URL placeholders is URL-encoded', async () => {
    const sms = new SmsService(fakeConfig({ SMS_PROVIDER: 'http', SMS_HTTP_URL: `${base}/send?key=K&to={to}&msg={message}` }));
    await sms.send('+8801712345678', msg);
    assert.equal(last.method, 'GET');
    const url = new URL(last.url, base);
    assert.equal(url.searchParams.get('to'), '8801712345678');
    assert.equal(url.searchParams.get('msg'), msg);
  });

  test('JSON body is JSON-escaped and content type inferred', async () => {
    const sms = new SmsService(
      fakeConfig({
        SMS_PROVIDER: 'http',
        SMS_HTTP_URL: `${base}/api`,
        SMS_HTTP_BODY: '{"api_token":"T","msisdn":"{to}","sms":"{message}","csms_id":"{ref}"}',
        SMS_HTTP_HEADERS: '{"X-Api-Key":"secret"}',
      }),
    );
    await sms.send('+8801712345678', msg);
    assert.equal(last.method, 'POST');
    assert.equal(last.headers['content-type'], 'application/json');
    assert.equal(last.headers['x-api-key'], 'secret');
    const body = JSON.parse(last.body);
    assert.equal(body.msisdn, '8801712345678');
    assert.equal(body.sms, msg);
    assert.match(body.csms_id, /^[0-9a-f]{32}$/);
  });

  test('form body is form-encoded (Twilio-style, E.164)', async () => {
    const sms = new SmsService(
      fakeConfig({ SMS_PROVIDER: 'http', SMS_HTTP_URL: `${base}/twilio`, SMS_HTTP_BODY: 'To={to_e164}&From=NIR&Body={message}' }),
    );
    await sms.send('+8801712345678', msg);
    assert.equal(last.headers['content-type'], 'application/x-www-form-urlencoded');
    const form = new URLSearchParams(last.body);
    assert.equal(form.get('To'), '+8801712345678');
    assert.equal(form.get('Body'), msg);
  });

  test('non-2xx or a failed success pattern throws', async () => {
    const sms = new SmsService(
      fakeConfig({ SMS_PROVIDER: 'http', SMS_HTTP_URL: `${base}/x?to={to}`, SMS_HTTP_SUCCESS_PATTERN: '"status":"SUCCESS"' }),
    );
    reply = { status: 200, body: '{"status":"FAILED"}' };
    await assert.rejects(sms.send('+8801712345678', 'hi'), /rejected/);
    reply = { status: 500, body: 'boom' };
    await assert.rejects(sms.send('+8801712345678', 'hi'), /HTTP 500/);
    reply = { status: 200, body: '{"status":"SUCCESS"}' };
    await sms.send('+8801712345678', 'hi');
  });

  test('misconfiguration fails fast', () => {
    assert.throws(() => new SmsService(fakeConfig({ SMS_PROVIDER: 'http' })), /SMS_HTTP_URL is required/);
    assert.throws(() => new SmsService(fakeConfig({ SMS_PROVIDER: 'carrier-pigeon' })), /not valid/);
    assert.throws(() => new SmsService(fakeConfig({ NODE_ENV: 'production' })), /must be set in production/);
  });
});
