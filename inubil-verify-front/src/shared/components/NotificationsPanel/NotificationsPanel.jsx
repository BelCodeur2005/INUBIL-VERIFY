import { useEffect, useState } from 'react';
import { Bell, CheckCircle2, ShieldOff, Eye, Share2, X, Loader2, CheckCheck } from 'lucide-react';
import {
  listerMesNotifications,
  marquerNotificationLue,
  marquerToutesNotificationsLues,
  archiverNotification,
} from '../../../core/notifications/notifications.api';
import Pagination from '../Pagination/Pagination';
import styles from './NotificationsPanel.module.css';

const LIMIT = 20;

const ICONE_PAR_TYPE = {
  document_emis:    CheckCircle2,
  document_revoque: ShieldOff,
  document_verifie: Eye,
  partage_consulte: Share2,
};

function tempsEcoule(iso) {
  const secondes = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secondes < 60) return "à l'instant";
  const minutes = Math.floor(secondes / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  return `il y a ${jours} j`;
}

// Contenu de la liste de notifications, extrait du drawer de NotificationsBell —
// reutilise en pleine page (/universite/notifications) et dans les onglets internes
// d'AdminInubil et DashboardEtudiant (ces deux zones n'utilisent pas React Router
// pour leurs sections, cf. leur propre etat activeTab/activeMenu).
export default function NotificationsPanel() {
  const [nonLues, setNonLues] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    let annule = false;
    (async () => {
      setChargement(true);
      setErreur(null);
      try {
        const reponse = await listerMesNotifications({ page, limit: LIMIT });
        if (annule) return;
        setNotifications(reponse.data);
        setTotal(reponse.total);
        setNonLues(reponse.non_lues);
      } catch {
        if (!annule) setErreur('Impossible de charger vos notifications.');
      } finally {
        if (!annule) setChargement(false);
      }
    })();
    return () => { annule = true; };
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const handleClicNotification = async (notif) => {
    if (notif.statut === 'non_lue') {
      try {
        await marquerNotificationLue(notif.id);
        setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, statut: 'lue' } : n)));
        setNonLues((n) => Math.max(0, n - 1));
      } catch {
        // navigation quand meme, le marquage-lu n'est pas bloquant
      }
    }
    // Le lien vient de la base (champ libre) : on ne navigue que vers un chemin
    // relatif du meme site, jamais vers un javascript: ou un domaine externe.
    if (notif.lien && notif.lien.startsWith('/') && !notif.lien.startsWith('//')) {
      window.location.assign(notif.lien);
    }
  };

  const handleArchiver = async (id, e) => {
    e.stopPropagation();
    const etaitNonLue = notifications.find((n) => n.id === id)?.statut === 'non_lue';
    try {
      await archiverNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((n) => Math.max(0, n - 1));
      if (etaitNonLue) setNonLues((n) => Math.max(0, n - 1));
    } catch {
      setErreur('Impossible de supprimer cette notification.');
    }
  };

  const handleToutMarquerLu = async () => {
    try {
      await marquerToutesNotificationsLues();
      setNotifications((prev) => prev.map((n) => ({ ...n, statut: n.statut === 'non_lue' ? 'lue' : n.statut })));
      setNonLues(0);
    } catch {
      setErreur('Impossible de marquer les notifications comme lues.');
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <span className={styles.total}>
          {chargement ? '…' : `${total} notification${total > 1 ? 's' : ''}`}
        </span>
        {nonLues > 0 && (
          <button type="button" className={styles.toutLireBtn} onClick={handleToutMarquerLu}>
            <CheckCheck size={14} /> Tout marquer comme lu
          </button>
        )}
      </div>

      <div className={styles.liste}>
        {chargement && (
          <div className={styles.etatVide}><Loader2 size={20} className={styles.spin} /></div>
        )}

        {!chargement && erreur && <div className={styles.etatVide}>{erreur}</div>}

        {!chargement && !erreur && notifications.length === 0 && (
          <div className={styles.etatVide}>
            <Bell size={26} />
            <p>Aucune notification pour le moment.</p>
          </div>
        )}

        {!chargement && !erreur && notifications.map((notif) => {
          const Icone = ICONE_PAR_TYPE[notif.type] ?? Bell;
          return (
            <div
              key={notif.id}
              role="button"
              tabIndex={0}
              className={`${styles.item} ${notif.statut === 'non_lue' ? styles.itemNonLue : ''}`}
              onClick={() => handleClicNotification(notif)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClicNotification(notif); }}
            >
              <span className={styles.itemIcon}><Icone size={18} /></span>
              <span className={styles.itemBody}>
                <span className={styles.itemTitre}>{notif.titre}</span>
                <span className={styles.itemMessage}>{notif.message}</span>
                <span className={styles.itemDate}>{tempsEcoule(notif.created_at)}</span>
              </span>
              {notif.statut === 'non_lue' && <span className={styles.dotNonLue} />}
              <button type="button" className={styles.itemArchiver} onClick={(e) => handleArchiver(notif.id, e)} title="Supprimer">
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>

      {!chargement && !erreur && (
        <div className={styles.paginationWrap}>
          <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} itemLabel="notification" />
        </div>
      )}
    </div>
  );
}
