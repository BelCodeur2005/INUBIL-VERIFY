import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Pagination.module.css';

// Pagination numerotee reutilisable (remplace les listes "precedent/suivant" seules,
// impraticables des que le total depasse quelques pages — cf. FicheEtudiant/ListeDocuments).
// Affiche toujours la 1ere et la derniere page, la page courante +/-1, et des points de
// suspension pour le reste — algorithme standard de pagination "avec trous".
function plageAffichee(page, totalPages) {
  const delta = 1;
  const plage = [];
  for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i += 1) {
    plage.push(i);
  }
  if (page - delta > 2) plage.unshift('…');
  if (page + delta < totalPages - 1) plage.push('…');
  plage.unshift(1);
  if (totalPages > 1) plage.push(totalPages);
  return plage;
}

export default function Pagination({ page, totalPages, total, onChange, itemLabel = 'résultat' }) {
  const pluriel = total > 1 ? 's' : '';

  if (totalPages <= 1) {
    return (
      <div className={styles.pagination}>
        <span className={styles.info}>
          {total === 0 ? `Aucun ${itemLabel}` : `${total} ${itemLabel}${pluriel}`}
        </span>
      </div>
    );
  }

  const plage = plageAffichee(page, totalPages);

  return (
    <div className={styles.pagination}>
      <span className={styles.info}>{total} {itemLabel}{pluriel}</span>
      <div className={styles.pages}>
        <button
          type="button"
          className={styles.navBtn}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Page précédente"
        >
          <ChevronLeft size={14} />
        </button>

        {plage.map((p, i) => (p === '…' ? (
          <span key={`ellipsis-${i}`} className={styles.ellipsis}>…</span>
        ) : (
          <button
            key={p}
            type="button"
            className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        )))}

        <button
          type="button"
          className={styles.navBtn}
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Page suivante"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
