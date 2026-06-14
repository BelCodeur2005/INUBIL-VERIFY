import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');

export interface DiplomaPdfData {
  nom: string;
  prenom: string;
  filiere: string;
  mention?: string;
  date_emission: Date;
  annee_academique?: string;
  numero_unique: string;
  universite_nom: string;
  /** Buffer PNG du QR code pré-généré (optionnel - embarqué en bas à droite du diplôme). */
  qr_code_buffer?: Buffer;
}

// Palette couleurs INUBIL
const COULEUR_PRIMAIRE = '#1a1a2e';
const COULEUR_ACCENT = '#16213e';
const COULEUR_OR = '#c9a84c';
const GRIS_TEXTE = '#444444';

@Injectable()
export class PdfService {
  /**
   * Génère le PDF officiel d'un diplôme INUBIL et retourne un Buffer.
   * Aucune écriture disque - le stockage (pdf_url, pdf_taille_ko) est géré par #24.
   */
  async generateDiplomaPdf(data: DiplomaPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 40, bottom: 40, left: 50, right: 50 },
        info: {
          Title: `Diplôme - ${data.prenom} ${data.nom}`,
          Author: data.universite_nom,
          Subject: data.filiere,
          Creator: 'INUBIL Verify',
        },
      });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.dessinerDiplome(doc, data);
      doc.end();
    });
  }

  // ─── Rendu du diplôme ────────────────────────────────────────────────

  private dessinerDiplome(doc: PDFKit.PDFDocument, data: DiplomaPdfData): void {
    const { width, height } = doc.page;

    // ── Fond et bordure dorée ──
    doc.rect(0, 0, width, height).fill('#fdfaf3');

    // Bordure extérieure
    doc
      .rect(15, 15, width - 30, height - 30)
      .lineWidth(4)
      .stroke(COULEUR_OR);

    // Bordure intérieure fine
    doc
      .rect(22, 22, width - 44, height - 44)
      .lineWidth(1)
      .stroke(COULEUR_OR);

    // ── Bandeau supérieur ──
    doc.rect(15, 15, width - 30, 55).fill(COULEUR_PRIMAIRE);

    doc
      .fontSize(11)
      .fillColor('#ffffff')
      .font('Helvetica')
      .text('REPUBLIC OF CAMEROON', 30, 28, { align: 'left' })
      .text('RÉPUBLIQUE DU CAMEROUN', 30, 42, { align: 'left' });

    doc
      .fontSize(11)
      .fillColor(COULEUR_OR)
      .font('Helvetica-Bold')
      .text('INUBIL VERIFY', 0, 28, { align: 'center' })
      .text('Plateforme Nationale de Certification', 0, 42, { align: 'center' });

    doc
      .fillColor('#ffffff')
      .font('Helvetica')
      .text(data.universite_nom.toUpperCase(), 0, 28, { align: 'right', width: width - 30 })
      .text(`N° ${data.numero_unique}`, 0, 42, { align: 'right', width: width - 30 });

    // ── Titre principal ──
    doc
      .fontSize(28)
      .fillColor(COULEUR_PRIMAIRE)
      .font('Helvetica-Bold')
      .text('DIPLÔME', 0, 85, { align: 'center' });

    doc
      .fontSize(14)
      .fillColor(COULEUR_OR)
      .font('Helvetica')
      .text(data.filiere.toUpperCase(), 0, 118, { align: 'center' });

    // Ligne décorative
    const ligneY = 140;
    doc
      .moveTo(80, ligneY)
      .lineTo(width - 80, ligneY)
      .lineWidth(1.5)
      .stroke(COULEUR_OR);

    // ── Corps ──
    doc
      .fontSize(13)
      .fillColor(GRIS_TEXTE)
      .font('Helvetica')
      .text("L'Université certifie que", 0, 158, { align: 'center' });

    const nomComplet = `${data.prenom} ${data.nom.toUpperCase()}`;
    doc
      .fontSize(24)
      .fillColor(COULEUR_ACCENT)
      .font('Helvetica-Bold')
      .text(nomComplet, 0, 178, { align: 'center' });

    doc
      .fontSize(13)
      .fillColor(GRIS_TEXTE)
      .font('Helvetica')
      .text('a satisfait aux conditions requises et a obtenu le diplôme de', 0, 215, {
        align: 'center',
      });

    doc
      .fontSize(16)
      .fillColor(COULEUR_PRIMAIRE)
      .font('Helvetica-Bold')
      .text(data.filiere, 0, 238, { align: 'center' });

    if (data.mention) {
      doc
        .fontSize(13)
        .fillColor(COULEUR_OR)
        .font('Helvetica-BoldOblique')
        .text(`Mention : ${data.mention}`, 0, 262, { align: 'center' });
    }

    // ── Pied de page - dates ──
    const dateFormatee = this.formaterDate(data.date_emission);
    const annee = data.annee_academique ?? String(data.date_emission.getFullYear());

    const piedY = height - 110;
    doc
      .moveTo(80, piedY)
      .lineTo(width - 80, piedY)
      .lineWidth(1)
      .stroke(COULEUR_OR);

    doc
      .fontSize(11)
      .fillColor(GRIS_TEXTE)
      .font('Helvetica')
      .text(`Année académique : ${annee}`, 80, piedY + 10)
      .text(`Délivré le : ${dateFormatee}`, 80, piedY + 26);

    // ── Zone signature ──
    doc
      .font('Helvetica-Bold')
      .fillColor(COULEUR_PRIMAIRE)
      .text('Le Directeur', width - 220, piedY + 10, { width: 160, align: 'center' });

    doc
      .moveTo(width - 220, piedY + 55)
      .lineTo(width - 60, piedY + 55)
      .lineWidth(1)
      .stroke(GRIS_TEXTE);

    // ── QR code ──
    if (data.qr_code_buffer) {
      doc.image(data.qr_code_buffer, width - 215, piedY - 90, { width: 75, height: 75 });
      doc
        .fontSize(7)
        .fillColor(GRIS_TEXTE)
        .font('Helvetica')
        .text('Vérifier l\'authenticité', width - 220, piedY - 12, {
          width: 85,
          align: 'center',
        });
    }

    // ── Filigrane ──
    doc.save();
    doc
      .rotate(-35, { origin: [width / 2, height / 2] })
      .fontSize(80)
      .fillColor('#eeeeee')
      .font('Helvetica-Bold')
      .opacity(0.15)
      .text('INUBIL VERIFY', width / 2 - 250, height / 2 - 40);
    doc.restore();
  }

  private formaterDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }
}
