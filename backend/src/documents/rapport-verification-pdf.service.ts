import { Injectable } from '@nestjs/common';
import { join } from 'path';
import PDFDocument = require('pdfkit');

export interface RapportVerificationData {
  // Résultat
  resultat: 'authentique' | 'revoque' | 'non_trouve' | 'falsifie';
  verification_id: string;
  verifie_le: Date;
  type_verification: 'lien_unique' | 'hash' | 'upload_pdf';

  // Document certifié (présent si résultat !== 'non_trouve')
  numero_unique?: string;
  etudiant_nom?: string;
  filiere?: string;
  mention?: string;
  universite?: string;
  date_emission?: Date;
  hash_sha256?: string;
  transaction_hash?: string;
  ip_verifieur?: string;
}

// Palette INUBIL
const NAVY   = '#1a1a2e';
const OR     = '#c9a84c';
const GRIS   = '#555555';
const BLANC  = '#ffffff';
const VERT   = '#2d7a3a';
const ROUGE  = '#b91c1c';
const ORANGE = '#c2710c';

const LABELS_TYPE: Record<string, string> = {
  lien_unique: 'Scan QR code / lien unique',
  hash:        'Soumission directe du hash SHA-256',
  upload_pdf:  'Upload du fichier PDF',
};

@Injectable()
export class RapportVerificationPdfService {
  async generateRapport(data: RapportVerificationData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margins: { top: 50, bottom: 50, left: 55, right: 55 },
        info: {
          Title: `Rapport de vérification - ${data.numero_unique ?? data.verification_id}`,
          Author: 'INUBIL Verify',
          Creator: 'INUBIL Verify',
        },
      });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.dessiner(doc, data);
      doc.end();
    });
  }

  private dessiner(doc: PDFKit.PDFDocument, data: RapportVerificationData): void {
    const { width } = doc.page;
    const marge = 55;
    const largeurContenu = width - marge * 2;

    // ── En-tête ────────────────────────────────────────────────────────
    const headerHeight = 85;
    doc.rect(0, 0, width, headerHeight).fill(NAVY);

    // Logo INUBIL (512x269 RGBA - fond transparent)
    const logoPath = join(__dirname, '..', 'assets', 'inubil-logo.png');
    const logoH = 60;
    const logoW = Math.round(logoH * (512 / 269)); // ratio original ~113px
    const logoY = (headerHeight - logoH) / 2;
    try {
      doc.image(logoPath, marge, logoY, { height: logoH, width: logoW });
    } catch {
      // Fallback texte si le fichier est introuvable
      doc.fontSize(20).fillColor(OR).font('Helvetica-Bold')
        .text('INUBIL', marge, 22, { align: 'left' });
    }

    // Textes à droite du logo
    const xTexte = marge + logoW + 16;
    const largeurTexte = width - xTexte - marge;
    doc.fontSize(8).fillColor(BLANC).font('Helvetica')
      .text('Plateforme Nationale de Certification', xTexte, 28, { width: largeurTexte });
    doc.fontSize(8).fillColor(BLANC).font('Helvetica')
      .text('République du Cameroun', xTexte, 40, { width: largeurTexte });
    doc.fontSize(9).fillColor(OR).font('Helvetica-Bold')
      .text('RAPPORT DE VÉRIFICATION OFFICIEL', xTexte, 56, { width: largeurTexte });

    // ── Résultat ────────────────────────────────────────────────────────
    const { couleur, libelle, icone } = this.stylesResultat(data.resultat);
    const yResultat = 110;

    doc.rect(marge, yResultat, largeurContenu, 56).fill(this.couleurFond(data.resultat));
    doc.rect(marge, yResultat, 6, 56).fill(couleur);

    doc.fontSize(22).fillColor(couleur).font('Helvetica-Bold')
      .text(`${icone}  ${libelle}`, marge + 18, yResultat + 10);

    doc.fontSize(9).fillColor(GRIS).font('Helvetica')
      .text(this.sousTitreResultat(data.resultat), marge + 18, yResultat + 38);

    // ── Section : Document certifié ─────────────────────────────────────
    let y = yResultat + 75;

    if (data.numero_unique) {
      y = this.section(doc, 'Informations du document certifié', y, marge, largeurContenu);

      const lignes: [string, string][] = [
        ['Numéro unique',   data.numero_unique],
        ['Étudiant',        data.etudiant_nom ?? '-'],
        ['Filière',         data.filiere ?? '-'],
        ['Mention',         data.mention ?? '-'],
        ['Université',      data.universite ?? '-'],
        ['Date d\'émission', data.date_emission
          ? this.formaterDate(data.date_emission)
          : '-'],
      ];
      y = this.tableau(doc, lignes, y, marge, largeurContenu);
    }

    // ── Section : Certification blockchain ──────────────────────────────
    y = this.section(doc, 'Certification blockchain', y, marge, largeurContenu);

    const hashAffiche = data.hash_sha256
      ? `${data.hash_sha256.slice(0, 32)}…${data.hash_sha256.slice(-8)}`
      : '-';
    const txAffiche = data.transaction_hash ?? 'En attente (#22 - intégration Polygon)';
    const polygonscanUrl = data.transaction_hash
      ? `https://amoy.polygonscan.com/tx/${data.transaction_hash}`
      : 'Non disponible';

    const lignesBlockchain: [string, string][] = [
      ['Hash SHA-256',   hashAffiche],
      ['Réseau',         'Polygon Amoy Testnet'],
      ['Transaction',    txAffiche],
      ['Polygonscan',    polygonscanUrl],
    ];
    y = this.tableau(doc, lignesBlockchain, y, marge, largeurContenu);

    // ── Section : Horodatage de la vérification ─────────────────────────
    y = this.section(doc, 'Horodatage de cette vérification', y, marge, largeurContenu);

    const lignesHorodatage: [string, string][] = [
      ['Référence',       data.verification_id],
      ['Date et heure',   this.formaterDateHeure(data.verifie_le)],
      ['Type',            LABELS_TYPE[data.type_verification] ?? data.type_verification],
      ['IP du vérificateur', data.ip_verifieur ?? 'Non renseignée'],
    ];
    y = this.tableau(doc, lignesHorodatage, y, marge, largeurContenu);

    // ── Pied de page ─────────────────────────────────────────────────────
    const piedY = doc.page.height - 70;
    doc.moveTo(marge, piedY).lineTo(width - marge, piedY).lineWidth(0.5).stroke(OR);

    doc.fontSize(8).fillColor(GRIS).font('Helvetica')
      .text(
        'Ce rapport est généré automatiquement par la plateforme INUBIL Verify. ' +
        'Il atteste de la vérification effectuée à la date et heure indiquées ci-dessus.\n' +
        'INUBIL Verify - https://verify.inubil.com',
        marge, piedY + 8,
        { width: largeurContenu, align: 'center' },
      );
  }

  // ─── Helpers de rendu ──────────────────────────────────────────────────

  private section(
    doc: PDFKit.PDFDocument,
    titre: string,
    y: number,
    marge: number,
    largeur: number,
  ): number {
    const yTitre = y + 12;
    doc.fontSize(11).fillColor(NAVY).font('Helvetica-Bold')
      .text(titre, marge, yTitre);
    doc.moveTo(marge, yTitre + 16).lineTo(marge + largeur, yTitre + 16)
      .lineWidth(0.8).stroke(OR);
    return yTitre + 24;
  }

  private tableau(
    doc: PDFKit.PDFDocument,
    lignes: [string, string][],
    yDepart: number,
    marge: number,
    largeur: number,
  ): number {
    const colLabel = 160;
    let y = yDepart + 4;

    for (const [label, valeur] of lignes) {
      doc.fontSize(9).fillColor(GRIS).font('Helvetica')
        .text(label, marge, y, { width: colLabel });

      doc.fontSize(9).fillColor(NAVY).font('Helvetica-Bold')
        .text(valeur, marge + colLabel, y, { width: largeur - colLabel });

      y += 18;
    }

    return y + 8;
  }

  private stylesResultat(resultat: string): { couleur: string; libelle: string; icone: string } {
    const map: Record<string, { couleur: string; libelle: string; icone: string }> = {
      authentique: { couleur: VERT,   libelle: 'DOCUMENT AUTHENTIQUE', icone: '✓' },
      revoque:     { couleur: ROUGE,  libelle: 'DOCUMENT RÉVOQUÉ',     icone: '✗' },
      non_trouve:  { couleur: ORANGE, libelle: 'DOCUMENT NON TROUVÉ',  icone: '!' },
      falsifie:    { couleur: ROUGE,  libelle: 'DOCUMENT FALSIFIÉ',    icone: '✗' },
    };
    return map[resultat] ?? map['non_trouve'];
  }

  private couleurFond(resultat: string): string {
    const map: Record<string, string> = {
      authentique: '#f0fdf4',
      revoque:     '#fef2f2',
      non_trouve:  '#fffbeb',
      falsifie:    '#fef2f2',
    };
    return map[resultat] ?? '#fffbeb';
  }

  private sousTitreResultat(resultat: string): string {
    const map: Record<string, string> = {
      authentique: 'Ce document est enregistré et certifié sur la blockchain INUBIL.',
      revoque:     'Ce document a été révoqué par l\'établissement émetteur.',
      non_trouve:  'Aucun document certifié ne correspond à cet identifiant.',
      falsifie:    'Ce document ne correspond à aucun certificat enregistré - possible falsification.',
    };
    return map[resultat] ?? '';
  }

  private formaterDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  private formaterDateHeure(date: Date): string {
    return date.toLocaleString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'UTC', timeZoneName: 'short',
    });
  }
}
