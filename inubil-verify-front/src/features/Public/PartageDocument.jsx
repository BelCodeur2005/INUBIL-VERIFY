import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './PartageDocument.module.css';
import PublicHeader from './PublicHeader';
import { accederPartage } from '../../core/partages/partages.api';
import { telechargerRapport } from '../../core/verify/verify.api';

const LABELS_CATEGORIE = {
  diplome: 'Diplôme',
  releve_notes: 'Relevé de Notes',
  attestation: 'Attestation',
};

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtDateHeure(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Page publique "Document partage (destinataire)" — GET /partages/:token. Route : /partage/:token */
export default function PartageDocument() {
  const { token } = useParams();
  const [etat, setEtat] = useState('chargement');
  const [reponse, setReponse] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [telechargement, setTelechargement] = useState(false);
  const [erreurRapport, setErreurRapport] = useState(null);

  useEffect(() => {
    let annule = false;

    (async () => {
      setEtat('chargement');
      try {
        const res = await accederPartage(token);
        if (annule) return;
        setReponse(res);
        setEtat('ok');
      } catch (err) {
        if (annule) return;
        setErreur({ status: err.status, message: err.message });
        setEtat('erreur');
      }
    })();

    return () => {
      annule = true;
    };
  }, [token]);

  const telecharger = async () => {
    if (!reponse) return;
    setErreurRapport(null);
    setTelechargement(true);
    try {
      await telechargerRapport(reponse.document.numero_unique);
    } catch (err) {
      setErreurRapport(err.message ?? 'Le rapport n\'a pas pu être généré.');
    } finally {
      setTelechargement(false);
    }
  };

  if (etat === 'chargement') {
    return (
      <div className={styles.page}>
        <PublicHeader />
        <main className={styles.main}>
          <div className={styles.centerBox}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#002c53' }}>hourglass_empty</span>
            <p className={styles.centerText}>Ouverture du document partagé…</p>
          </div>
        </main>
      </div>
    );
  }

  if (etat === 'erreur') {
    const expire = erreur?.status === 410;
    return (
      <div className={styles.page}>
        <PublicHeader />
        <main className={styles.main}>
          <div className={styles.centerBox}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: expire ? '#B38F4D' : '#ba1a1a' }}>
              {expire ? 'schedule' : 'link_off'}
            </span>
            <h2 className={styles.centerTitle}>{expire ? 'Ce lien a expiré' : 'Lien introuvable'}</h2>
            <p className={styles.centerText}>
              {erreur?.message ?? "Ce lien de partage n'est plus valide."}
            </p>
            <Link to="/verification-publique" className={styles.centerLink}>Vérifier un diplôme</Link>
          </div>
        </main>
      </div>
    );
  }

  const { document: doc, partage } = reponse;
  const urlVerification = doc.url_verification || `${window.location.origin}/d/${doc.numero_unique}`;

  return (
    <div className={styles.page}>
      <PublicHeader />

      <main className={styles.main}>
        <div className={styles.mainContainer}>

          <div className={`${styles.banner} ${doc.statut === 'revoque' ? styles.bannerAlert : ''}`}>
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              {doc.statut === 'revoque' ? 'warning' : 'folder_shared'}
            </span>
            <div>
              <h2 className={styles.bannerTitle}>
                {doc.statut === 'revoque' ? 'DOCUMENT RÉVOQUÉ' : 'DOCUMENT PARTAGÉ AVEC VOUS'}
              </h2>
              <p className={styles.bannerDesc}>
                {doc.statut === 'revoque'
                  ? "Ce document a été révoqué par l'établissement émetteur depuis son partage."
                  : `${doc.etudiant_nom} vous a donné accès à ce document académique.`}
              </p>
            </div>
          </div>

          <div className={styles.grid}>
            <div className={styles.leftCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <span className="material-symbols-outlined">description</span>
                  Données du Document
                </h3>
                <span className={styles.badge}>{LABELS_CATEGORIE[doc.categorie] ?? doc.categorie}</span>
              </div>

              <div className={styles.dataGrid}>
                <div className={styles.field}>
                  <span className={styles.label}>Titulaire</span>
                  <span className={styles.valueBold}>{doc.etudiant_nom}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>Établissement</span>
                  <span className={styles.valueBold}>{doc.universite}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>Type de Document</span>
                  <span className={styles.valueNormal}>{doc.type_document}</span>
                </div>
                {doc.filiere && (
                  <div className={styles.field}>
                    <span className={styles.label}>Filière / Parcours</span>
                    <span className={styles.valueNormal}>{doc.filiere}</span>
                  </div>
                )}
                {doc.annee_academique && (
                  <div className={styles.field}>
                    <span className={styles.label}>Année Académique</span>
                    <span className={styles.valueNormal}>{doc.annee_academique}</span>
                  </div>
                )}
                {doc.mention && (
                  <div className={styles.field}>
                    <span className={styles.label}>Mention</span>
                    <span className={styles.valueAccent}>{doc.mention}</span>
                  </div>
                )}
                {doc.moyenne_generale !== null && doc.moyenne_generale !== undefined && (
                  <div className={styles.field}>
                    <span className={styles.label}>Moyenne Générale</span>
                    <span className={styles.valueNormal}>{doc.moyenne_generale}/20</span>
                  </div>
                )}
                <div className={styles.field}>
                  <span className={styles.label}>Date d'Émission</span>
                  <span className={styles.valueNormal}>{fmtDate(doc.date_emission)}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>Numéro Unique</span>
                  <span className={styles.valueCode}>{doc.numero_unique}</span>
                </div>
              </div>

              {doc.matieres?.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <span className={styles.label}>Relevé des Matières</span>
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {doc.matieres.map((m, i) => (
                      <div key={i} className={styles.matiereRow}>
                        <span>{m.nom_matiere}</span>
                        <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {m.note !== null ? `${m.note}/${m.note_max}` : m.resultat}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button className={styles.downloadBtn} onClick={telecharger} disabled={telechargement}>
                <span className="material-symbols-outlined">picture_as_pdf</span>
                {telechargement ? 'Génération en cours…' : 'Télécharger le rapport de vérification (PDF)'}
              </button>
              {erreurRapport && (
                <p style={{ color: '#ba1a1a', fontSize: '13px', marginTop: '8px' }}>{erreurRapport}</p>
              )}
            </div>

            <div className={styles.rightCard}>
              <h3 className={styles.cardTitle} style={{ marginBottom: '24px' }}>Ce lien de partage</h3>

              <div className={styles.infoRow}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#42474f' }}>visibility</span>
                <span>{partage.nb_consultations} consultation{partage.nb_consultations > 1 ? 's' : ''}</span>
              </div>
              <div className={styles.infoRow}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#42474f' }}>schedule</span>
                <span>
                  {partage.date_expiration
                    ? `Expire le ${fmtDateHeure(partage.date_expiration)}`
                    : "N'expire pas"}
                </span>
              </div>

              <a className={styles.verifyLink} href={urlVerification} target="_blank" rel="noopener noreferrer">
                <span className="material-symbols-outlined">verified</span>
                Vérifier ce document sur la blockchain
              </a>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
