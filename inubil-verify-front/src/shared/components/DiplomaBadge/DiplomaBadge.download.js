import { toPng } from 'html-to-image';
import QRCode from 'qrcode';

/** QR code (data URL PNG) pointant vers le lien de vérification public et permanent du diplôme. */
export function genererQrDataUrl(urlVerification) {
  return QRCode.toDataURL(urlVerification, {
    margin: 1,
    width: 300,
    color: { dark: '#0b192c', light: '#ffffff' },
  });
}

/**
 * Capture un noeud DOM (le badge, rendu hors-champ) en PNG et déclenche le téléchargement.
 * Attend que les polices web (EB Garamond/Inter) soient chargées — sinon html-to-image peut
 * capturer une police de repli avant que la vraie police n'ait fini de charger.
 */
export async function telechargerBadgePng(node, filename) {
  await document.fonts.ready;
  const dataUrl = await toPng(node, { pixelRatio: 3, backgroundColor: '#f6f8fc' });

  const lien = document.createElement('a');
  lien.href = dataUrl;
  lien.download = filename;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
}
