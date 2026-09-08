import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { compterNotificationsNonLues } from '../../../core/notifications/notifications.api';
import styles from './NotificationsBell.module.css';

const INTERVALLE_POLL_MS = 60_000;

// Cloche de notifications partagee par tous les headers (Etudiant, AdminInubil,
// AppLayout) — n'affiche plus qu'un badge de compteur et delegue la navigation
// au parent (route /universite/notifications, ou onglet interne pour les zones
// qui n'utilisent pas React Router). La liste elle-meme vit dans NotificationsPanel.
export default function NotificationsBell({ onClick }) {
  const [nonLues, setNonLues] = useState(0);

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

  return (
    <button className={styles.trigger} onClick={onClick} title="Notifications">
      <Bell size={20} />
      {nonLues > 0 && <span className={styles.badge}>{nonLues > 9 ? '9+' : nonLues}</span>}
    </button>
  );
}
