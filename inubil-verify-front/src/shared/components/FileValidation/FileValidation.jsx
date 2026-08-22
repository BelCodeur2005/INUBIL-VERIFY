import { useEffect, useState } from 'react';
import { FileCheck2, ShieldCheck, XCircle, FileText, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../core/auth/useAuth';
import { listerDocuments, getUrlPdfPresignee, validerDocument, rejeterDocument } from '../../../core/documents/documents.api';
import { listerTypesDocument } from '../../../core/types-document/types-document.api';
import { listerMentions } from '../../../core/mentions/mentions.api';
import { getEtudiant } from '../../../core/etudiants/etudiants.api';
import { ApiError } from '../../../core/api/client';
import styles from './FileValidation.module.css';

// File de validation reelle (docs/ROLES_ET_PAGES.md §D item 20, POST /documents/:id/valider
// et /rejeter). Remplace l'ancien systeme mock de "manifeste"/lot batch signale au §4 comme
// concept fictif sans equivalent backend : le backend valide/rejette UN document a la fois,
// directement depuis "brouillon" ou "en_validation" des qu'un PDF+hash existe.
//
// Design : le detail (etudiant, type, mention, lien vers le PDF) et la decision (Valider/
// Rejeter) restent dans la meme carte plutot qu'une table + navigation separee, pour que le
// motif de rejet et le justificatif restent visibles au moment de decider.

export default function FileValidation() {
  const { utilisateur } = useAuth();
  const peutDecider = ['directeur_pedagogique', 'responsable_universite', 'super_admin'].includes(utilisateur?.role?.nom);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [typesDocument, setTypesDocument] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [etudiantsCache, setEtudiantsCache] = useState({});

  const [enCoursId, setEnCoursId] = useState(null);
  const [rejetOuvertId, setRejetOuvertId] = useState(null);
  const [motifRejet, setMotifRejet] = useState('');
  const [messageSucces, setMessageSucces] = useState(null);

  useEffect(() => {
    listerTypesDocument({}).then(setTypesDocument).catch(() => {});
    listerMentions({}).then(setMentions).catch(() => {});
  }, []);

  const chargerFile = async () => {
    try {
      const [brouillons, enValidation] = await Promise.all([
        listerDocuments({ statut: 'brouillon', limit: 50 }),
        listerDocuments({ statut: 'en_validation', limit: 50 }),
      ]);
      const tous = [...(brouillons.items ?? []), ...(enValidation.items ?? [])]
        .filter((d) => d.pdf_url && d.hash_sha256)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setItems(tous);

      const idsManquants = [...new Set(tous.map((d) => d.etudiant_id))].filter((id) => id);
      const resultats = await Promise.all(idsManquants.map((id) => getEtudiant(id).catch(() => null)));
      setEtudiantsCache((prev) => {
        const next = { ...prev };
        resultats.forEach((e) => { if (e) next[e.id] = e; });
        return next;
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger la file de validation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => { await chargerFile(); })();
  }, []);

  const nomType = (id) => typesDocument.find((t) => t.id === id)?.nom ?? '—';
  const nomMention = (id) => mentions.find((m) => m.id === id)?.nom;
  const nomEtudiant = (id) => {
    const e = etudiantsCache[id];
    return e ? `${e.prenom} ${e.nom}` : '…';
  };
  const matriculeEtudiant = (id) => etudiantsCache[id]?.numero_etudiant ?? '';

  const voirLePdf = async (doc) => {
    try {
      const { url } = await getUrlPdfPresignee(doc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible d\'ouvrir le PDF.');
    }
  };

  const valider = async (doc) => {
    setEnCoursId(doc.id);
    setError(null);
    try {
      await validerDocument(doc.id);
      setItems((prev) => prev.filter((d) => d.id !== doc.id));
      setMessageSucces(`${doc.numero_unique} validé et ancré.`);
      setTimeout(() => setMessageSucces(null), 4000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Validation impossible.');
    } finally {
      setEnCoursId(null);
    }
  };

  const confirmerRejet = async (doc) => {
    if (motifRejet.trim().length < 10) return;
    setEnCoursId(doc.id);
    setError(null);
    try {
      await rejeterDocument(doc.id, motifRejet.trim());
      setItems((prev) => prev.filter((d) => d.id !== doc.id));
      setMessageSucces(`${doc.numero_unique} rejeté — l'agent de saisie verra le motif.`);
      setTimeout(() => setMessageSucces(null), 4000);
      setRejetOuvertId(null);
      setMotifRejet('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Rejet impossible.');
    } finally {
      setEnCoursId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>File de validation</h1>
        <p className={styles.subtitle}>Documents prêts à être validés (PDF + empreinte déjà enregistrés) — un ancrage blockchain par document.</p>
      </div>

      {messageSucces && <div className={styles.successBanner}><CheckCircle2 size={16} /> {messageSucces}</div>}
      {error && <p className={styles.errorText}><AlertTriangle size={14} /> {error}</p>}

      {loading && (
        <div className={styles.emptyState}><Loader2 size={22} className={styles.spinnerIcon} /> Chargement...</div>
      )}

      {!loading && items.length === 0 && (
        <div className={styles.emptyState}>
          <FileCheck2 size={28} />
          <p>File de validation vide — tous les documents sont à jour.</p>
        </div>
      )}

      <div className={styles.cardsList}>
        {items.map((doc) => (
          <div className={styles.card} key={doc.id}>
            <div className={styles.cardHeader}>
              <span className={styles.numero}>{doc.numero_unique}</span>
              <span className={`${styles.badge} ${doc.statut === 'en_validation' ? styles.badgeEnValidation : styles.badgeBrouillon}`}>
                {doc.statut === 'en_validation' ? 'En validation' : 'Brouillon'}
              </span>
            </div>

            <div className={styles.cardBody}>
              <div className={styles.field}>
                <span>Étudiant</span>
                <strong>{nomEtudiant(doc.etudiant_id)} {matriculeEtudiant(doc.etudiant_id) && `— ${matriculeEtudiant(doc.etudiant_id)}`}</strong>
              </div>
              <div className={styles.field}>
                <span>Type de diplôme</span>
                <strong>{nomType(doc.type_document_id)}</strong>
              </div>
              <div className={styles.field}>
                <span>Filière</span>
                <strong>{doc.filiere || '—'}</strong>
              </div>
              <div className={styles.field}>
                <span>Mention</span>
                <strong>{nomMention(doc.mention_id) ?? '—'}</strong>
              </div>
              <div className={styles.field}>
                <span>Date d'émission</span>
                <strong>{doc.date_emission ? new Date(doc.date_emission).toLocaleDateString('fr-FR') : '—'}</strong>
              </div>
            </div>

            <button type="button" className={styles.pdfLink} onClick={() => voirLePdf(doc)}>
              <FileText size={15} /> Voir le PDF avant de décider
            </button>

            {rejetOuvertId === doc.id ? (
              <div className={styles.rejectPanel}>
                <label>Motif du rejet (visible par l'agent de saisie, 10 caractères min.)</label>
                <textarea
                  value={motifRejet}
                  onChange={(e) => setMotifRejet(e.target.value)}
                  placeholder="ex : Le nom de l'étudiant ne correspond pas au registre académique."
                  rows={3}
                />
                <div className={styles.rejectActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => { setRejetOuvertId(null); setMotifRejet(''); }}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className={styles.confirmRejectBtn}
                    disabled={motifRejet.trim().length < 10 || enCoursId === doc.id}
                    onClick={() => confirmerRejet(doc)}
                  >
                    {enCoursId === doc.id ? <Loader2 size={15} className={styles.spinnerIcon} /> : <XCircle size={15} />}
                    Confirmer le rejet
                  </button>
                </div>
              </div>
            ) : (
              peutDecider && (
                <div className={styles.cardActions}>
                  <button type="button" className={styles.rejectBtn} disabled={enCoursId === doc.id} onClick={() => setRejetOuvertId(doc.id)}>
                    <XCircle size={16} /> Rejeter
                  </button>
                  <button type="button" className={styles.approveBtn} disabled={enCoursId === doc.id} onClick={() => valider(doc)}>
                    {enCoursId === doc.id ? <Loader2 size={16} className={styles.spinnerIcon} /> : <ShieldCheck size={16} />}
                    Valider & ancrer
                  </button>
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
