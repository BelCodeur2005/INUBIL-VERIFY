import { useEffect, useState } from 'react';
import { Bell, CheckCircle2, ShieldOff, Eye, Share2, X, Loader2, CheckCheck } from 'lucide-react';
import {
  listerMesNotifications,
  compterNotificationsNonLues,
  marquerNotificationLue,
  marquerToutesNotificationsLues,
  archiverNotification,
} from '../../../core/notifications/notifications.api';
import styles from './NotificationsBell.module.css';

const ICONE_PAR_TYPE = {
  document_emis:    CheckCircle2,
  document_revoque: ShieldOff,
  document_verifie: Eye,
  partage_consulte: Share2,
};

const INTERVALLE_POLL_MS = 60_000;

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

// Cloche de notifications partagee par tous les headers (Etudiant, AdminInubil,
// DashboardDirecteur, AppLayout) — meme composant que AccountMenu : autonome,
// son propre style, branche sur le vrai backend NotificationsController.
export default function NotificationsBell() {
  const [nonLues, setNonLues] = useState(0);
  const [drawerOuvert, setDrawerOuvert] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    const rafraichirCompteur = async () => {
      try {
        const { count } = await compterNotificationsNonLues();
        setNonLues(count);
      } catch {
        // silencieux : le badge reste simplement a sa derniere valeur connue
      }
    };
    rafraichirCompteur();
    const intervalle = setInterval(rafraichirCompteur, INTERVALLE_POLL_MS);
    return () => clearInterval(intervalle);
  }, []);

  const ouvrirDrawer = async () => {
    setDrawerOuvert(true);
    setChargement(true);
    setErreur(null);
    try {
      const reponse = await listerMesNotifications({ limit: 20 });
      setNotifications(reponse.data);
      setNonLues(reponse.non_lues);
    } catch {
      setErreur('Impossible de charger vos notifications');
    } finally {
      setChargement(false);
    }
  };

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
      if (etaitNonLue) setNonLues((n) => Math.max(0, n - 1));
    } catch {
      setErreur('Impossible de supprimer cette notification');
    }
  };

  const handleToutMarquerLu = async () => {
    try {
      await marquerToutesNotificationsLues();
      setNotifications((prev) => prev.map((n) => ({ ...n, statut: n.statut === 'non_lue' ? 'lue' : n.statut })));
      setNonLues(0);
    } catch {
      setErreur('Impossible de marquer les notifications comme lues');
    }
  };

  return (
    <>
      <button className={styles.trigger} onClick={ouvrirDrawer} title="Notifications">
        <Bell size={20} />
        {nonLues > 0 && <span className={styles.badge}>{nonLues > 9 ? '9+' : nonLues}</span>}
      </button>

      {drawerOuvert && (
        <div className={styles.drawerOverlay} onClick={() => setDrawerOuvert(false)}>
          <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h2>Notifications</h2>
              <button className={styles.closeBtn} onClick={() => setDrawerOuvert(false)}>
                <X size={18} />
              </button>
            </div>

            {nonLues > 0 && (
              <button className={styles.toutLireBtn} onClick={handleToutMarquerLu}>
                <CheckCheck size={14} /> Tout marquer comme lu
              </button>
            )}

            <div className={styles.liste}>
              {chargement && (
                <div className={styles.etatVide}>
                  <Loader2 size={20} className={styles.spin} />
                </div>
              )}

              {!chargement && erreur && <div className={styles.etatVide}>{erreur}</div>}

              {!chargement && !erreur && notifications.length === 0 && (
                <div className={styles.etatVide}>
                  <Bell size={22} />
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
                    <span className={styles.itemIcon}><Icone size={16} /></span>
                    <span className={styles.itemBody}>
                      <span className={styles.itemTitre}>{notif.titre}</span>
                      <span className={styles.itemMessage}>{notif.message}</span>
                      <span className={styles.itemDate}>{tempsEcoule(notif.created_at)}</span>
                    </span>
                    {notif.statut === 'non_lue' && <span className={styles.dotNonLue} />}
                    <button className={styles.itemArchiver} onClick={(e) => handleArchiver(notif.id, e)} title="Supprimer">
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
