import { ProviderSmsDriver } from './provider.driver.js';

const message = { kind: 'otp', to: '09121234567', params: { code: '12345', domain: '' }, text: 'کد تایید نوبتا: 12345' } as const;

describe('ProviderSmsDriver (notifycloud)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts the text with the bearer key', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"id":"x"}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    await new ProviderSmsDriver({ apiKey: 'ncsms_test', templates: {} }).send(message);

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://notifycloud.ir/api/v1/sms');
    expect(init.headers.Authorization).toBe('Bearer ncsms_test');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ number: '09121234567', text: 'کد تایید نوبتا: 12345' });
    expect(body.clientSmsId).toMatch(/^otp:/);
  });

  it('throws the gateway error so SmsService logs it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"Insufficient API key balance."}', { status: 400 })));
    await expect(new ProviderSmsDriver({ apiKey: 'k', templates: {} }).send(message)).rejects.toThrow('Insufficient API key balance.');
  });

  it('refuses to send without a key', async () => {
    await expect(new ProviderSmsDriver({ templates: {} }).send(message)).rejects.toThrow('SMS_API_KEY');
  });
});
