import { BadRequestException } from '@nestjs/common';
import { assertSafeWebhookUrl } from './webhook-url-guard';

describe('assertSafeWebhookUrl', () => {
  it('rejette une URL http (non https)', async () => {
    await expect(assertSafeWebhookUrl('http://exemple.cm/webhook')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejette une URL malformee', async () => {
    await expect(assertSafeWebhookUrl('pas-une-url')).rejects.toThrow(BadRequestException);
  });

  it('rejette le loopback IPv4', async () => {
    await expect(assertSafeWebhookUrl('https://127.0.0.1/webhook')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejette le endpoint metadata cloud (link-local 169.254.x.x)', async () => {
    await expect(
      assertSafeWebhookUrl('https://169.254.169.254/latest/meta-data/'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejette les plages privees RFC1918', async () => {
    await expect(assertSafeWebhookUrl('https://10.0.0.5/webhook')).rejects.toThrow(
      BadRequestException,
    );
    await expect(assertSafeWebhookUrl('https://192.168.1.10/webhook')).rejects.toThrow(
      BadRequestException,
    );
    await expect(assertSafeWebhookUrl('https://172.16.5.5/webhook')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejette le loopback IPv6', async () => {
    await expect(assertSafeWebhookUrl('https://[::1]/webhook')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('accepte une IP publique valide en https', async () => {
    await expect(assertSafeWebhookUrl('https://1.1.1.1/webhook')).resolves.toBeUndefined();
  });
});
