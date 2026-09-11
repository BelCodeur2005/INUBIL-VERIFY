import { forwardRef } from 'react';
import { BadgeCheck } from 'lucide-react';
import styles from './DiplomaBadge.module.css';

function formaterDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Badge de vérification partageable (LinkedIn, CV, signature email) — capturé en PNG
// par DiplomaBadge.download.js. Dimensions fixes (480x640, ratio 3:4) : ce composant
// n'est jamais affiché redimensionné à l'écran, seulement rendu hors-champ pour capture.
const DiplomaBadge = forwardRef(function DiplomaBadge(
  { prenom, nom, typeDocument, mention, universite, numeroUnique, dateEmission, qrDataUrl },
  ref,
) {
  const dateFormatee = formaterDate(dateEmission);

  return (
    <div ref={ref} className={styles.badge}>
      <div className={styles.frame}>
        <p className={styles.wordmark}>INUBIL Verify</p>

        <div className={styles.seal}>
          <BadgeCheck size={44} strokeWidth={1.75} />
        </div>

        <h1 className={styles.name}>{prenom} {nom}</h1>
        <p className={styles.diploma}>
          {typeDocument}{mention ? ` (${mention})` : ''}
        </p>
        <p className={styles.universite}>{universite}</p>

        <div className={styles.divider} />
        {dateFormatee && <p className={styles.metaRow}>Émis le {dateFormatee}</p>}

        <div className={styles.qrBlock}>
          {qrDataUrl && <img src={qrDataUrl} alt="" className={styles.qr} />}
          <div className={styles.qrCaption}>
            <p className={styles.qrLabel}>Référence</p>
            <p className={styles.reference}>{numeroUnique}</p>
            <p className={styles.qrHint}>Scanner ou ouvrir le lien pour vérifier l'authenticité en direct.</p>
          </div>
        </div>

        <div className={styles.footer}>
          <p className={styles.tagline}>Authentifié sur la blockchain Polygon</p>
          <p className={styles.domain}>verify.inubil.com</p>
        </div>
      </div>
    </div>
  );
});

export default DiplomaBadge;
