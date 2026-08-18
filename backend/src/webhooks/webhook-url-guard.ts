import { BadRequestException } from '@nestjs/common';
import { isIP } from 'net';
import { promises as dns } from 'dns';

const BLOCKED_IPV4_CIDRS: [string, number][] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local — inclut les endpoints metadata cloud (169.254.169.254)
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserve
];

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isBlockedIPv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  return BLOCKED_IPV4_CIDRS.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (value & mask) === (ipv4ToInt(base) & mask);
  });
}

function isBlockedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true; // unspecified / loopback
  if (/^fe[89ab][0-9a-f]:/.test(lower)) return true; // fe80::/10 link-local
  if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true; // fc00::/7 unique local
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIPv4(mapped[1]);
  return false;
}

function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isBlockedIPv4(ip);
  if (version === 6) return isBlockedIPv6(ip);
  return true; // ni v4 ni v6 : on ne sait pas l'evaluer, on refuse par prudence
}

/**
 * Valide qu'une URL de webhook ne pointe pas vers une IP privee/loopback/link-local
 * (protection SSRF — sinon un utilisateur peut faire sonder le reseau interne par le backend,
 * y compris les endpoints de metadata cloud sur 169.254.169.254).
 * A appeler a la creation/modification ET juste avant chaque fetch (defense en profondeur
 * contre le DNS rebinding, ou le hostname resout differemment entre les deux instants).
 */
export async function assertSafeWebhookUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BadRequestException('URL de webhook invalide');
  }

  if (parsed.protocol !== 'https:') {
    throw new BadRequestException('Le webhook doit utiliser https://');
  }

  const hostname = parsed.hostname;
  const directIpVersion = isIP(hostname);
  const addresses = directIpVersion
    ? [hostname]
    : (await dns.lookup(hostname, { all: true }).catch(() => [])).map((a) => a.address);

  if (addresses.length === 0) {
    throw new BadRequestException('Impossible de resoudre le nom d\'hote du webhook');
  }

  if (addresses.some(isBlockedIp)) {
    throw new BadRequestException(
      'URL de webhook refusee : cible une adresse IP privee, locale ou reservee',
    );
  }
}

/**
 * fetch() qui valide la cible avant chaque requete ET revalide a chaque redirection
 * (une redirection https://ok.example.com -> http://169.254.169.254 contournerait
 * sinon la validation initiale).
 */
export async function safeWebhookFetch(
  url: string,
  init: RequestInit,
  maxRedirects = 3,
): Promise<Response> {
  let currentUrl = url;

  for (let i = 0; i <= maxRedirects; i++) {
    await assertSafeWebhookUrl(currentUrl);

    const response = await fetch(currentUrl, { ...init, redirect: 'manual' });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return response;
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return response;
  }

  throw new BadRequestException('Trop de redirections sur ce webhook');
}
