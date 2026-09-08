import styles from './RepartitionDocuments.module.css';

// Repartition des documents par statut (barre segmentee) — extrait depuis AdminInubil.jsx
// pour etre reutilise par DashboardEtablissement.jsx. 3 categories seulement (actifs/
// en_validation/revoques) par choix delibere : garder une lecture rapide plutot que
// d'empiler tous les statuts possibles (brouillon/rejete/expire ont leur propre tuile KPI).
export default function RepartitionDocuments({ documents }) {
  const total = documents.total || 0;
  const items = [
    { key: 'actifs', label: 'Actifs', valeur: documents.actifs, seg: styles.segActif, dot: styles.dotActif },
    { key: 'en_validation', label: 'En validation', valeur: documents.en_validation, seg: styles.segEnValidation, dot: styles.dotEnValidation },
    { key: 'revoques', label: 'Révoqués', valeur: documents.revoques, seg: styles.segRevoque, dot: styles.dotRevoque },
  ];

  return (
    <div className={styles.analyticsCard}>
      <div className={styles.analyticsCardHeader}>
        <div>
          <h3 className={styles.viewTitle}>Répartition des documents</h3>
          <p className={styles.viewSubtitle}>{total} document{total > 1 ? 's' : ''} au total.</p>
        </div>
      </div>

      {total === 0 ? (
        <p className={styles.emptyState}>Aucun document émis pour l'instant.</p>
      ) : (
        <>
          <div className={styles.repartitionTrack}>
            {items.map((it) => {
              const pct = Math.round((it.valeur / total) * 100);
              return (
                <div
                  key={it.key}
                  className={`${styles.repartitionSegment} ${it.seg}`}
                  style={{ flexGrow: it.valeur || 0 }}
                  title={`${it.label} — ${it.valeur} (${pct}%)`}
                >
                  {pct >= 12 && <span>{pct}%</span>}
                </div>
              );
            })}
          </div>
          <div className={styles.repartitionLegend}>
            {items.map((it) => {
              const pct = total ? Math.round((it.valeur / total) * 100) : 0;
              return (
                <div key={it.key} className={styles.repartitionLegendItem}>
                  <span className={styles.repartitionLegendLabel}>
                    <span className={`${styles.legendDot} ${it.dot}`} /> {it.label}
                  </span>
                  <span>
                    <span className={styles.repartitionLegendValue}>{it.valeur}</span>{' '}
                    <span className={styles.repartitionLegendPct}>({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
