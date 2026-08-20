import { useEffect, useRef, useState } from 'react';
import { User } from 'lucide-react';
import styles from './AccountMenu.module.css';

// Bouton avatar+nom du header, commun aux 3 dashboards staff/admin (/universite,
// AdminInubil, DashboardDirecteur). Ouvre un menu vers les pages de compte
// personnel communes à tout utilisateur connecté (docs/ROLES_ET_PAGES.md §C),
// qui n'avaient jusqu'ici aucun point d'entrée dans ces 3 sidebars.
export default function AccountMenu({ nom, prenom, roleLabel, onOpenAccount }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const nomComplet = `${prenom} ${nom}`.trim() || 'Utilisateur';
  const initiales = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || '··';

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (wrapperRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className={styles.userTexts}>
          <span className={styles.userName}>{nomComplet}</span>
          <span className={styles.userRole}>{roleLabel}</span>
        </span>
        <span className={styles.avatar}>{initiales}</span>
      </button>

      {open && (
        <div className={styles.panel} role="menu">
          <div className={styles.panelHeader}>
            <span className={styles.avatar}>{initiales}</span>
            <span className={styles.panelHeaderTexts}>
              <span className={styles.panelName}>{nomComplet}</span>
              <span className={styles.panelRole}>{roleLabel}</span>
            </span>
          </div>
          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenAccount();
            }}
          >
            <User size={16} />
            Mon compte
          </button>
        </div>
      )}
    </div>
  );
}
