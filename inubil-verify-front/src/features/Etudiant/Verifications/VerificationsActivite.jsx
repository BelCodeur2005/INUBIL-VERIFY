import { useEffect, useState } from 'react';
import {
  Activity,
  ShieldCheck,
  FileCheck2,
  Link2,
  QrCode,
  Hash,
  Upload,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  UserX,
  Loader2
} from 'lucide-react';
import { listerMesVerifications } from '../../../core/etudiants/etudiants.api';
import { ApiError } from '../../../core/api/client';
import styles from './VerificationsActivite.module.css';

const CANAL = {
  lien_unique: { label: 'Lien unique', icone: Link2 },
  qr_code:     { label: 'Code QR',     icone: QrCode },
  hash:        { label: 'Hash direct', icone: Hash },
  upload_pdf:  { label: 'Upload du PDF', icone: Upload },
};

const RESULTAT = {
  authentique: { label: 'Authentique', classe: 'resAuthentique', icone: CheckCircle2 },
  revoque:     { label: 'Révoqué',     classe: 'resRevoque',     icone: XCircle },
  non_trouve:  { label: 'Non trouvé',  classe: 'resInconnu',     icone: HelpCircle },
  falsifie:    { label: 'Falsifié',    classe: 'resFalsifie',    icone: AlertTriangle },
};

function fmtDateHeure(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function VerificationsActivite() {
  const [verifications, setVerifications] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    (async () => {
      setChargement(true);
      setErreur(null);
      try {
        const reponse = await listerMesVerifications({ limit: 100 });
        setVerifications(reponse.data);
      } catch (err) {
        setErreur(err instanceof ApiError ? err.message : 'Impossible de charger votre activité de vérification');
      } finally {
        setChargement(false);
      }
    })();
  }, []);

  const total = verifications.length;
  const nbAuthentiques = verifications.filter((v) => v.resultat === 'authentique').length;
  const nbDiplomesDistincts = new Set(verifications.map((v) => v.document_id).filter(Boolean)).size;
  const tauxReussite = total > 0 ? Math.round((nbAuthentiques / total) * 100) : 0;

  return (
    <div className={styles.container}>
      {/* En-tête de section */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Activity className={styles.titleIcon} size={26} />
            Activité de Vérification
          </h1>
          <p className={styles.subtitle}>
            Chaque contrôle public (lien, QR code ou hash) effectué sur vos documents, dans l'ordre chronologique.
          </p>
        </div>
      </div>

      {/* Cartes de Statistiques */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={`${styles.iconBox} ${styles.blueIcon}`}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className={styles.statNumber}>{total}</span>
            <span className={styles.statLabel}>Vérifications au total</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.iconBox} ${styles.greenIcon}`}>
            <FileCheck2 size={20} />
          </div>
          <div>
            <span className={styles.statNumber}>{nbDiplomesDistincts}</span>
            <span className={styles.statLabel}>Documents distincts consultés</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.iconBox} ${styles.purpleIcon}`}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className={styles.statNumber}>{total > 0 ? `${tauxReussite}%` : '—'}</span>
            <span className={styles.statLabel}>Vérifications authentiques</span>
          </div>
        </div>
      </div>

      {/* Historique */}
      <div className={styles.listeSection}>
        <h2 className={styles.sectionTitle}>Historique</h2>

        {chargement && (
          <div className={styles.etatVide}>
            <Loader2 size={22} className={styles.spin} />
            <p>Chargement de votre activité...</p>
          </div>
        )}

        {!chargement && erreur && (
          <div className={styles.etatVide}>
            <AlertTriangle size={22} />
            <p>{erreur}</p>
          </div>
        )}

        {!chargement && !erreur && verifications.length === 0 && (
          <div className={styles.etatVide}>
            <Activity size={22} />
            <p>Aucune vérification n'a encore été effectuée sur vos documents.</p>
          </div>
        )}

        {!chargement && !erreur && verifications.length > 0 && (
          <div className={styles.verifList}>
            {verifications.map((v) => {
              const canal = CANAL[v.type_verification] ?? { label: v.type_verification, icone: Hash };
              const resultat = RESULTAT[v.resultat] ?? RESULTAT.non_trouve;
              const IconeCanal = canal.icone;
              const IconeResultat = resultat.icone;

              return (
                <div key={v.id} className={styles.verifCard}>
                  <div className={styles.canalBadge} title={canal.label}>
                    <IconeCanal size={18} />
                  </div>

                  <div className={styles.verifInfo}>
                    <div className={styles.verifHeader}>
                      <h3 className={styles.docTitle}>
                        {v.type_document ?? 'Document'}{v.numero_unique ? ` — ${v.numero_unique}` : ''}
                      </h3>
                      <span className={`${styles.resultBadge} ${styles[resultat.classe]}`}>
                        <IconeResultat size={12} /> {resultat.label}
                      </span>
                    </div>
                    <div className={styles.verifMeta}>
                      <span>{canal.label}</span>
                      <span className={styles.dot}>•</span>
                      <span>{fmtDateHeure(v.created_at)}</span>
                    </div>
                    <p className={styles.destinataire}>
                      {v.destinataire_partage ? (
                        <>Consulté via le lien envoyé à <strong>{v.destinataire_partage}</strong></>
                      ) : (
                        <span className={styles.anonyme}><UserX size={12} /> Vérification anonyme</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
