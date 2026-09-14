import { useState } from 'react';
import styles from './TendanceChart.module.css';

// Graphique de tendance (SVG, sans dependance externe) — documents emis + verifications
// publiques sur une plage de jours, provenant de GET /admin/statistiques/graphe.
// Axe unique partage entre les deux series (pas de double axe, cf. skill dataviz) ;
// couleurs validees CVD + contraste (voir commentaire sur les classes de serie ci-dessous).
// Extrait depuis AdminInubil.jsx pour etre reutilise par DashboardEtablissement.jsx.
// Voir plageJours.js pour construire la plage de dates a passer a getStatistiquesGraphe.

function formaterDateCourte(iso) {
  const [, mois, jour] = iso.split('-');
  return `${jour}/${mois}`;
}

function formaterDateLongue(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const CHART_W = 640;
const CHART_H = 220;
const CHART_PAD = { top: 16, right: 12, bottom: 26, left: 30 };

export default function TendanceChart({ points, titre = 'Activité — 30 derniers jours', sousTitre = 'Documents émis et vérifications publiques, par jour.' }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const [vue, setVue] = useState('graphique');

  const n = points.length;
  const maxVal = Math.max(1, ...points.map((p) => Math.max(p.documents_emis, p.verifications)));
  const maxAffiche = Math.max(4, Math.ceil(maxVal / 4) * 4);
  const plotW = CHART_W - CHART_PAD.left - CHART_PAD.right;
  const plotH = CHART_H - CHART_PAD.top - CHART_PAD.bottom;
  const xStep = n > 1 ? plotW / (n - 1) : 0;

  const xAt = (i) => CHART_PAD.left + i * xStep;
  const yAt = (v) => CHART_PAD.top + plotH - (v / maxAffiche) * plotH;

  const construireLigne = (cle) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)},${yAt(p[cle]).toFixed(1)}`).join(' ');

  const construireAire = (cle) => {
    if (n === 0) return '';
    return `${construireLigne(cle)} L ${xAt(n - 1).toFixed(1)},${yAt(0).toFixed(1)} L ${xAt(0).toFixed(1)},${yAt(0).toFixed(1)} Z`;
  };

  const graduations = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
    y: yAt(maxAffiche * frac),
    valeur: Math.round(maxAffiche * frac),
  }));

  const gererSurvol = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const echelleX = CHART_W / rect.width;
    const xLocal = (e.clientX - rect.left) * echelleX;
    let idx = Math.round((xLocal - CHART_PAD.left) / (xStep || 1));
    idx = Math.max(0, Math.min(n - 1, idx));
    setHoverIdx(idx);
  };

  const point = hoverIdx !== null ? points[hoverIdx] : null;
  const tooltipAGauche = hoverIdx !== null && xAt(hoverIdx) > CHART_W - 138;

  if (n === 0) {
    return (
      <div className={styles.analyticsCard}>
        <div className={styles.analyticsCardHeader}>
          <div>
            <h3 className={styles.viewTitle}>{titre}</h3>
            <p className={styles.viewSubtitle}>{sousTitre}</p>
          </div>
        </div>
        <p className={styles.chartEmptyState}>Aucune donnée sur cette période.</p>
      </div>
    );
  }

  return (
    <div className={styles.analyticsCard}>
      <div className={styles.analyticsCardHeader}>
        <div>
          <h3 className={styles.viewTitle}>{titre}</h3>
          <p className={styles.viewSubtitle}>{sousTitre}</p>
        </div>
        <button
          type="button"
          className={styles.ghostToggleBtn}
          onClick={() => setVue((v) => (v === 'graphique' ? 'tableau' : 'graphique'))}
        >
          {vue === 'graphique' ? 'Voir en tableau' : 'Voir le graphique'}
        </button>
      </div>

      <div className={styles.chartLegend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.dotDocuments}`} /> Documents émis
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.dotVerifications}`} /> Vérifications
        </span>
      </div>

      {vue === 'graphique' ? (
        <div className={styles.chartSvgWrap}>
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            onMouseMove={gererSurvol}
            onMouseLeave={() => setHoverIdx(null)}
            role="img"
            aria-label={sousTitre}
          >
            {graduations.map((g) => (
              <g key={g.valeur}>
                <line x1={CHART_PAD.left} x2={CHART_W - CHART_PAD.right} y1={g.y} y2={g.y} stroke="#e1e0d9" strokeWidth="1" />
                <text x={CHART_PAD.left - 6} y={g.y + 3} textAnchor="end" fontSize="9" fill="#898781">{g.valeur}</text>
              </g>
            ))}

            <path d={construireAire('documents_emis')} className={styles.seriesDocumentsFill} stroke="none" />
            <path d={construireAire('verifications')} className={styles.seriesVerificationsFill} stroke="none" />
            <path d={construireLigne('documents_emis')} className={styles.seriesDocumentsStroke} fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <path d={construireLigne('verifications')} className={styles.seriesVerificationsStroke} fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

            {points.map((p, i) => (
              (i % 5 === 0 || i === n - 1) && (
                <text key={p.date} x={xAt(i)} y={CHART_H - 8} textAnchor="middle" fontSize="9" fill="#898781">
                  {formaterDateCourte(p.date)}
                </text>
              )
            ))}

            {hoverIdx !== null && point && (
              <>
                <line
                  x1={xAt(hoverIdx)} x2={xAt(hoverIdx)}
                  y1={CHART_PAD.top} y2={CHART_H - CHART_PAD.bottom}
                  stroke="#c3c2b7" strokeWidth="1" strokeDasharray="3 3"
                />
                <circle cx={xAt(hoverIdx)} cy={yAt(point.documents_emis)} r="3.5" style={{ fill: 'var(--color-primary)' }} stroke="#fff" strokeWidth="1.5" />
                <circle cx={xAt(hoverIdx)} cy={yAt(point.verifications)} r="3.5" fill="#c8871a" stroke="#fff" strokeWidth="1.5" />
                <foreignObject
                  x={tooltipAGauche ? xAt(hoverIdx) - 138 : xAt(hoverIdx) + 8}
                  y={CHART_PAD.top}
                  width="130"
                  height="62"
                >
                  <div className={styles.chartTooltipBox}>
                    <div>{formaterDateLongue(point.date)}</div>
                    <div className={styles.chartTooltipRow}>
                      <span className={`${styles.legendDot} ${styles.dotDocuments}`} /> {point.documents_emis} émis
                    </div>
                    <div className={styles.chartTooltipRow}>
                      <span className={`${styles.legendDot} ${styles.dotVerifications}`} /> {point.verifications} vérif.
                    </div>
                  </div>
                </foreignObject>
              </>
            )}
          </svg>
        </div>
      ) : (
        <div className={styles.miniTableScroll}>
          <table className={styles.miniTable}>
            <thead>
              <tr><th>Date</th><th>Documents émis</th><th>Vérifications</th></tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.date}>
                  <td>{formaterDateLongue(p.date)}</td>
                  <td>{p.documents_emis}</td>
                  <td>{p.verifications}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
