import { useEffect, useState } from 'react';
import {
  Search, X, Loader2, AlertTriangle, ScrollText, ChevronDown,
  FileText, GraduationCap, Users, Building2, Award, ShieldCheck,
  Mail, Webhook, Handshake, KeyRound, Settings2, LayoutGrid, FileDown,
} from 'lucide-react';
import { listerJournalAudit, exporterJournalAuditCsv } from '../../../core/admin/admin.api';
import { ApiError } from '../../../core/api/client';
import Pagination from '../Pagination/Pagination';
import { infosAction, labelModule, CATEGORIES } from './audit-labels';
import styles from './JournalAudit.module.css';

const ICONE_PAR_MODULE = {
  documents:      FileText,
  etudiants:       GraduationCap,
  utilisateurs:    Users,
  universites:     Building2,
  departements:    Building2,
  mentions:        Award,
  types_document:  FileText,
  roles:           ShieldCheck,
  invitations:     Mail,
  webhooks:        Webhook,
  partenariats:    Handshake,
  cles_api:        KeyRound,
  configurations:  Settings2,
  admin:           LayoutGrid,
};

const MODULES_FILTRABLES = [
  'documents', 'etudiants', 'utilisateurs', 'universites', 'departements',
  'mentions', 'types_document', 'roles', 'invitations', 'webhooks',
  'partenariats', 'cles_api', 'configurations', 'admin',
];

function formaterHorodatage(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// Journal d'audit — GET /admin/audit, scope automatique cote backend (super_admin/
// admin_istama voient tout ; responsable_universite ne voit que les entrees dont
// l'auteur appartient a sa propre universite). Reutilise par AdminInubil (portee
// globale) et /universite/journal (portee universite) via les props titre/sousTitre.
export default function JournalAudit({ titre = "Journal d'audit", sousTitre }) {
  const [entrees, setEntrees] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const [moduleFiltre, setModuleFiltre] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [recherche, setRecherche] = useState('');

  const [entreeSelectionnee, setEntreeSelectionnee] = useState(null);
  const [exportEnCours, setExportEnCours] = useState(false);

  useEffect(() => {
    let annule = false;
    (async () => {
      setChargement(true);
      setErreur(null);
      try {
        const res = await listerJournalAudit({
          page, limit,
          module: moduleFiltre || undefined,
          date_debut: dateDebut || undefined,
          date_fin: dateFin || undefined,
        });
        if (annule) return;
        setEntrees(res.data ?? []);
        setTotal(res.total ?? 0);
      } catch (err) {
        if (annule) return;
        setErreur(err instanceof ApiError ? err.message : "Impossible de charger le journal d'audit.");
      } finally {
        if (!annule) setChargement(false);
      }
    })();
    return () => { annule = true; };
  }, [page, moduleFiltre, dateDebut, dateFin]);

  const texte = recherche.trim().toLowerCase();
  const entreesAffichees = texte
    ? entrees.filter((e) => {
        const { label } = infosAction(e.action);
        return (
          label.toLowerCase().includes(texte)
          || (e.nom_utilisateur ?? 'système').toLowerCase().includes(texte)
          || labelModule(e.module).toLowerCase().includes(texte)
        );
      })
    : entrees;

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const filtresActifs = Boolean(moduleFiltre || dateDebut || dateFin);
  const reinitialiserFiltres = () => {
    setModuleFiltre(''); setDateDebut(''); setDateFin(''); setRecherche(''); setPage(1);
  };

  const exporterCsv = async () => {
    setExportEnCours(true);
    try {
      await exporterJournalAuditCsv({
        module: moduleFiltre || undefined,
        date_debut: dateDebut || undefined,
        date_fin: dateFin || undefined,
      });
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Export impossible.');
    } finally {
      setExportEnCours(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{titre}</h2>
          {sousTitre && <p className={styles.subtitle}>{sousTitre}</p>}
        </div>
        <div className={styles.headerActions}>
          <span className={styles.totalCount}>{total} entrée{total !== 1 ? 's' : ''}</span>
          <button type="button" className={styles.exportBtn} onClick={exporterCsv} disabled={exportEnCours}>
            <FileDown size={14} /> {exportEnCours ? 'Export…' : 'Exporter CSV'}
          </button>
        </div>
      </div>

      <div className={styles.filtersBar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Rechercher (action, module, auteur)..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </div>

        <div className={styles.selectWrap}>
          <select value={moduleFiltre} onChange={(e) => { setModuleFiltre(e.target.value); setPage(1); }}>
            <option value="">Tous les modules</option>
            {MODULES_FILTRABLES.map((m) => <option key={m} value={m}>{labelModule(m)}</option>)}
          </select>
          <ChevronDown size={13} className={styles.selectChevron} />
        </div>

        <input
          type="date"
          className={styles.dateInput}
          value={dateDebut}
          onChange={(e) => { setDateDebut(e.target.value); setPage(1); }}
          title="Du"
        />
        <input
          type="date"
          className={styles.dateInput}
          value={dateFin}
          onChange={(e) => { setDateFin(e.target.value); setPage(1); }}
          title="Au"
        />

        {filtresActifs && (
          <button type="button" className={styles.resetBtn} onClick={reinitialiserFiltres}>
            <X size={14} /> Réinitialiser
          </button>
        )}
      </div>

      {erreur && <p className={styles.errorText}><AlertTriangle size={14} /> {erreur}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Horodatage</th>
              <th>Événement</th>
              <th>Module</th>
              <th>Auteur</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {chargement && (
              <tr><td colSpan={5} className={styles.loadingCell}><Loader2 size={18} className={styles.spin} /> Chargement...</td></tr>
            )}
            {!chargement && entreesAffichees.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.emptyCell}>
                  <ScrollText size={22} />
                  {filtresActifs || texte ? 'Aucune entrée ne correspond à ces filtres.' : 'Aucune activité enregistrée pour le moment.'}
                </td>
              </tr>
            )}
            {!chargement && entreesAffichees.map((e) => {
              const { label, categorie } = infosAction(e.action);
              const cat = CATEGORIES[categorie];
              const IconeModule = ICONE_PAR_MODULE[e.module] ?? LayoutGrid;
              return (
                <tr key={e.id} className={styles.row} onClick={() => setEntreeSelectionnee(e)}>
                  <td className={styles.dateCell}>{formaterHorodatage(e.created_at)}</td>
                  <td>
                    <div className={styles.eventCell}>
                      <span className={`${styles.badge} ${styles[cat.classe]}`}>{cat.label}</span>
                      <span className={styles.eventLabel}>{label}</span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.moduleCell}><IconeModule size={14} /> {labelModule(e.module)}</span>
                  </td>
                  <td className={styles.bold}>{e.nom_utilisateur ?? 'Système'}</td>
                  <td className={styles.mono}>{e.ip_address ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} itemLabel="entrée" />

      {entreeSelectionnee && (
        <DetailDrawer entree={entreeSelectionnee} onClose={() => setEntreeSelectionnee(null)} />
      )}
    </div>
  );
}

function DetailDrawer({ entree, onClose }) {
  const { label, categorie } = infosAction(entree.action);
  const cat = CATEGORIES[categorie];
  const IconeModule = ICONE_PAR_MODULE[entree.module] ?? LayoutGrid;

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerIcon}><IconeModule size={20} /></span>
          <div className={styles.drawerHeaderInfo}>
            <h3>{label}</h3>
            <span className={`${styles.badge} ${styles[cat.classe]}`}>{cat.label}</span>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={styles.drawerBody}>
          <div className={styles.champsGrid}>
            <div className={styles.champ}>
              <span className={styles.champLabel}>Horodatage</span>
              <span className={styles.champValeur}>{formaterHorodatage(entree.created_at)}</span>
            </div>
            <div className={styles.champ}>
              <span className={styles.champLabel}>Auteur</span>
              <span className={styles.champValeur}>{entree.nom_utilisateur ?? 'Système'}</span>
            </div>
            <div className={styles.champ}>
              <span className={styles.champLabel}>Module</span>
              <span className={styles.champValeur}>{labelModule(entree.module)}</span>
            </div>
            <div className={styles.champ}>
              <span className={styles.champLabel}>Adresse IP</span>
              <span className={styles.champValeurMono}>{entree.ip_address ?? '—'}</span>
            </div>
            {entree.table_concernee && (
              <div className={styles.champ}>
                <span className={styles.champLabel}>Table concernée</span>
                <span className={styles.champValeur}>{entree.table_concernee}</span>
              </div>
            )}
            {entree.enregistrement_id && (
              <div className={styles.champ}>
                <span className={styles.champLabel}>ID enregistrement</span>
                <span className={styles.champValeurMono}>{entree.enregistrement_id}</span>
              </div>
            )}
          </div>

          <div className={styles.champ}>
            <span className={styles.champLabel}>Action technique (brute)</span>
            <span className={styles.champValeurMono}>{entree.action}</span>
          </div>

          {entree.user_agent && (
            <div className={styles.champ}>
              <span className={styles.champLabel}>Client</span>
              <span className={styles.champValeurMuted}>{entree.user_agent}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
