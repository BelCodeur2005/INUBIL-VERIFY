import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileCheck2, Clock3, GraduationCap, ShieldCheck, Link2,
  Plus, ArrowUpRight, Loader2, AlertTriangle, FileX, Eye,
} from 'lucide-react';
import { useAuth } from '../../../core/auth/useAuth';
import { listerDocuments } from '../../../core/documents/documents.api';
import { listerTypesDocument } from '../../../core/types-document/types-document.api';
import { rechercherEtudiants, getEtudiant } from '../../../core/etudiants/etudiants.api';
import { getStatistiquesGlobales, getStatistiquesGraphe } from '../../../core/admin/admin.api';
import { ApiError } from '../../../core/api/client';
import TendanceChart from '../../../shared/components/TendanceChart/TendanceChart';
import { plageJours } from '../../../shared/components/TendanceChart/plageJours';
import RepartitionDocuments from '../../../shared/components/RepartitionDocuments/RepartitionDocuments';
import styles from './DashboardEtablissement.module.css';

// Tableau de bord (index de /universite) — partagé agent_saisie / directeur_pedagogique /
// responsable_universite (docs/ROLES_ET_PAGES.md §1-2). Entièrement branché sur des données
// réelles (GET /documents, /admin/etudiants, /admin/statistiques*) — remplace l'ancienne
// version 100% mockée (registre fictif, "statut du nœud" blockchain fictif jamais implémenté).
//
// Les tuiles "Vérifications" et "Intégrité blockchain" nécessitent la permission stats:read
// (directeur_pedagogique / responsable_universite uniquement, cf. seed.ts ROLES_METIER) — un
// agent_saisie voit un tableau de bord plus sobre, centré sur ses actions du jour.

const ROLES_PRIVILEGIES = ['directeur_pedagogique', 'responsable_universite'];

const STATUTS = {
  brouillon:     { label: 'Brouillon',     classe: 'statutBrouillon' },
  en_validation: { label: 'En validation', classe: 'statutEnValidation' },
  actif:         { label: 'Actif',         classe: 'statutActif' },
  revoque:       { label: 'Révoqué',       classe: 'statutRevoque' },
  rejete:        { label: 'Rejeté',        classe: 'statutRejete' },
  expire:        { label: 'Expiré',        classe: 'statutExpire' },
};

function formaterDateSalutation() {
  const d = new Date();
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function DashboardEtablissement() {
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const estPrivilegie = ROLES_PRIVILEGIES.includes(utilisateur?.role?.nom);

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const [documentsRecents, setDocumentsRecents] = useState([]);
  const [compteurs, setCompteurs] = useState({ actifs: 0, brouillons: 0, enValidation: 0, revoques: 0, etudiants: 0 });
  const [typesDocument, setTypesDocument] = useState([]);
  const [etudiantsCache, setEtudiantsCache] = useState({});

  const [statsGlobales, setStatsGlobales] = useState(null);
  const [graphePoints, setGraphePoints] = useState([]);
  const [chargementAnalytics, setChargementAnalytics] = useState(estPrivilegie);

  // Chargement commun aux 3 rôles — compteurs + documents récents, tous scopés
  // automatiquement à l'université (et au département si l'acteur y est restreint).
  useEffect(() => {
    let annule = false;
    (async () => {
      setChargement(true);
      setErreur(null);
      try {
        const [recents, actifs, brouillons, enValidation, revoques, etudiants, types] = await Promise.all([
          listerDocuments({ limit: 8 }),
          listerDocuments({ statut: 'actif', limit: 1 }),
          listerDocuments({ statut: 'brouillon', limit: 1 }),
          listerDocuments({ statut: 'en_validation', limit: 1 }),
          listerDocuments({ statut: 'revoque', limit: 1 }),
          rechercherEtudiants(undefined, { limit: 1 }),
          listerTypesDocument({ estActif: null }),
        ]);
        if (annule) return;

        setDocumentsRecents(recents.items ?? []);
        setCompteurs({
          actifs: actifs.total ?? 0,
          brouillons: brouillons.total ?? 0,
          enValidation: enValidation.total ?? 0,
          revoques: revoques.total ?? 0,
          etudiants: etudiants.total ?? 0,
        });
        setTypesDocument(types ?? []);

        const idsManquants = [...new Set((recents.items ?? []).map((d) => d.etudiant_id))].filter(Boolean);
        if (idsManquants.length > 0) {
          const resultats = await Promise.all(idsManquants.map((id) => getEtudiant(id).catch(() => null)));
          if (annule) return;
          setEtudiantsCache(Object.fromEntries(resultats.filter(Boolean).map((e) => [e.id, e])));
        }
      } catch (err) {
        if (annule) return;
        setErreur(err instanceof ApiError ? err.message : 'Impossible de charger le tableau de bord.');
      } finally {
        if (!annule) setChargement(false);
      }
    })();
    return () => { annule = true; };
  }, []);

  // Analytics globales — reservees aux roles avec la permission stats:read.
  useEffect(() => {
    if (!estPrivilegie) return;
    let annule = false;
    (async () => {
      setChargementAnalytics(true);
      try {
        const jours = plageJours(30);
        const [stats, graphe] = await Promise.all([
          getStatistiquesGlobales(),
          getStatistiquesGraphe({ granularite: 'jour', debut: jours[0], fin: jours[jours.length - 1] }),
        ]);
        if (annule) return;
        setStatsGlobales(stats);
        setGraphePoints(graphe ?? []);
      } catch {
        // Analytics degradees si l'appel echoue (ex. permission manquante) — le reste
        // du tableau de bord (compteurs, documents recents) reste utilisable sans ça.
      } finally {
        if (!annule) setChargementAnalytics(false);
      }
    })();
    return () => { annule = true; };
  }, [estPrivilegie]);

  const nomType = (id) => typesDocument.find((t) => t.id === id)?.nom ?? '—';
  const nomEtudiant = (id) => {
    const e = etudiantsCache[id];
    return e ? `${e.prenom} ${e.nom}` : '…';
  };
  const matriculeEtudiant = (id) => etudiantsCache[id]?.numero_etudiant ?? '';

  const enAttente = compteurs.brouillons + compteurs.enValidation;
  const pctIntegrite = statsGlobales?.documents.actifs
    ? Math.round((statsGlobales.documents.ancres_blockchain / statsGlobales.documents.actifs) * 100)
    : null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Bonjour, {utilisateur?.prenom ?? ''}
        </h1>
        <p className={styles.subtitle}>
          {formaterDateSalutation()} — {utilisateur?.universite?.nom ?? 'votre établissement'}
        </p>
      </div>

      {erreur && <p className={styles.errorText}><AlertTriangle size={14} /> {erreur}</p>}

      {/* ── KPI ── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={`${styles.kpiIcon} ${styles.kpiBlue}`}><FileCheck2 size={20} /></span>
          <div className={styles.kpiTexts}>
            <span className={styles.kpiLabel}>Documents actifs</span>
            <span className={styles.kpiValue}>{chargement ? '—' : compteurs.actifs}</span>
            {compteurs.revoques > 0 && <span className={styles.kpiSub}>{compteurs.revoques} révoqué{compteurs.revoques > 1 ? 's' : ''}</span>}
          </div>
        </div>

        <button
          type="button"
          className={`${styles.kpiCard} ${estPrivilegie ? styles.kpiCardClickable : ''}`}
          onClick={() => estPrivilegie && navigate('/universite/validation')}
          disabled={!estPrivilegie}
        >
          <span className={`${styles.kpiIcon} ${styles.kpiAmber}`}><Clock3 size={20} /></span>
          <div className={styles.kpiTexts}>
            <span className={styles.kpiLabel}>En attente de validation</span>
            <span className={styles.kpiValue}>{chargement ? '—' : enAttente}</span>
            <span className={styles.kpiSub}>{compteurs.brouillons} brouillon{compteurs.brouillons > 1 ? 's' : ''} · {compteurs.enValidation} en cours</span>
          </div>
        </button>

        <button type="button" className={`${styles.kpiCard} ${styles.kpiCardClickable}`} onClick={() => navigate('/universite/etudiants')}>
          <span className={`${styles.kpiIcon} ${styles.kpiPurple}`}><GraduationCap size={20} /></span>
          <div className={styles.kpiTexts}>
            <span className={styles.kpiLabel}>Étudiants enregistrés</span>
            <span className={styles.kpiValue}>{chargement ? '—' : compteurs.etudiants}</span>
          </div>
        </button>

        {estPrivilegie && (
          <div className={styles.kpiCard}>
            <span className={`${styles.kpiIcon} ${styles.kpiGreen}`}><ShieldCheck size={20} /></span>
            <div className={styles.kpiTexts}>
              <span className={styles.kpiLabel}>Vérifications</span>
              <span className={styles.kpiValue}>{chargementAnalytics ? '—' : (statsGlobales?.verifications.total ?? 0)}</span>
              <span className={styles.kpiSub}>{statsGlobales?.verifications.ce_mois ?? 0} ce mois-ci</span>
            </div>
          </div>
        )}

        {estPrivilegie && (
          <div className={styles.kpiCard}>
            <span className={`${styles.kpiIcon} ${styles.kpiTeal}`}><Link2 size={20} /></span>
            <div className={styles.kpiTexts}>
              <span className={styles.kpiLabel}>Intégrité blockchain</span>
              <span className={styles.kpiValue}>{chargementAnalytics || pctIntegrite === null ? '—' : `${pctIntegrite}%`}</span>
              <span className={styles.kpiSub}>{statsGlobales?.documents.ancres_blockchain ?? 0} document(s) ancré(s)</span>
            </div>
          </div>
        )}
      </div>

      {/* ── ANALYTICS (rôles privilégiés uniquement) ── */}
      {estPrivilegie && (
        <div className={styles.analyticsRow}>
          {chargementAnalytics ? (
            <div className={styles.analyticsLoading}><Loader2 size={18} className={styles.spin} /> Chargement des statistiques...</div>
          ) : (
            <>
              <TendanceChart points={graphePoints} />
              {statsGlobales && <RepartitionDocuments documents={statsGlobales.documents} />}
            </>
          )}
        </div>
      )}

      {/* ── CONTENU PRINCIPAL ── */}
      <div className={styles.mainGrid}>

        {/* Documents récents */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <h2 className={styles.tableTitle}>Documents récents</h2>
              <p className={styles.tableSubtitle}>Les 8 derniers documents émis pour votre établissement.</p>
            </div>
            <Link to="/universite/registre" className={styles.linkBtn}>
              Voir le registre complet <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Numéro unique</th>
                  <th>Étudiant</th>
                  <th>Type</th>
                  <th>Date d'émission</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {chargement && (
                  <tr><td colSpan={5} className={styles.loadingCell}><Loader2 size={18} className={styles.spin} /> Chargement...</td></tr>
                )}
                {!chargement && documentsRecents.length === 0 && (
                  <tr>
                    <td colSpan={5} className={styles.emptyCell}>
                      <FileX size={22} />
                      Aucun document émis pour le moment.
                    </td>
                  </tr>
                )}
                {!chargement && documentsRecents.map((doc) => (
                  <tr key={doc.id}>
                    <td className={styles.mono}>{doc.numero_unique}</td>
                    <td className={styles.bold}>
                      {nomEtudiant(doc.etudiant_id)}
                      {matriculeEtudiant(doc.etudiant_id) && <span className={styles.subText}>{matriculeEtudiant(doc.etudiant_id)}</span>}
                    </td>
                    <td>{nomType(doc.type_document_id)}</td>
                    <td className={styles.dateCell}>{doc.date_emission ? new Date(doc.date_emission).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[STATUTS[doc.statut]?.classe ?? 'statutBrouillon']}`}>
                        {STATUTS[doc.statut]?.label ?? doc.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions rapides */}
        <div className={styles.sidebar}>
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Actions rapides</h3>

            <button type="button" className={styles.actionPrimary} onClick={() => navigate('/universite/ajout')}>
              <span className={styles.actionIconBox}><Plus size={18} /></span>
              <span className={styles.actionTexts}>
                <span className={styles.actionMain}>Émettre un diplôme</span>
                <span className={styles.actionSub}>Nouveau document, en 4 étapes</span>
              </span>
              <ArrowUpRight size={16} />
            </button>

            {estPrivilegie && enAttente > 0 && (
              <button type="button" className={styles.actionSecondary} onClick={() => navigate('/universite/validation')}>
                <span className={styles.actionIconBox}><Eye size={18} /></span>
                <span className={styles.actionTexts}>
                  <span className={styles.actionMain}>File de validation</span>
                  <span className={styles.actionSub}>{enAttente} document{enAttente > 1 ? 's' : ''} en attente</span>
                </span>
                <ArrowUpRight size={16} />
              </button>
            )}

            <Link to="/universite/etudiants" className={styles.actionSecondary}>
              <span className={styles.actionIconBox}><GraduationCap size={18} /></span>
              <span className={styles.actionTexts}>
                <span className={styles.actionMain}>Gérer les étudiants</span>
                <span className={styles.actionSub}>Rechercher ou créer un dossier</span>
              </span>
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
