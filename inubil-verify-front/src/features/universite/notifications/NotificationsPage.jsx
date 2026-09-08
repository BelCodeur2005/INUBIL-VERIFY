import NotificationsPanel from '../../../shared/components/NotificationsPanel/NotificationsPanel';
import styles from './NotificationsPage.module.css';

export default function NotificationsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Notifications</h1>
        <p className={styles.subtitle}>Émissions, validations et révocations concernant votre activité.</p>
      </div>
      <NotificationsPanel />
    </div>
  );
}
