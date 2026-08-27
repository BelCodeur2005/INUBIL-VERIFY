import { useEffect, useRef, useState } from 'react';
import { FileText, ShieldOff } from 'lucide-react';
import { getUrlPdfMonDocument } from '../../../core/etudiants/etudiants.api';
import styles from './DiplomaThumbnail.module.css';

// pdfjs-dist tourne dans un worker dedie : point vers le fichier .mjs livre par le package
// (import ?url => Vite l'expose comme asset et renvoie son URL finale).
let pdfjsLibPromise = null;
async function chargerPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = (async () => {
      const [pdfjsLib, { default: workerUrl }] = await Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
      ]);
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjsLib;
    })();
  }
  return pdfjsLibPromise;
}

/**
 * Miniature reelle de la 1ere page du PDF d'un document (diplome/releve), recadree sur le
 * haut de la page. Necessite que le document possede un PDF (a_un_pdf) et ne soit pas revoque
 * (l'URL presignee est refusee par le backend dans ce cas — cf. EtudiantsService.obtenirUrlPdf).
 */
export default function DiplomaThumbnail({ documentId, aUnPdf, statut }) {
  const disponible = aUnPdf && statut !== 'revoque';
  const [etat, setEtat] = useState(disponible ? 'loading' : 'error'); // idle | loading | ready | error
  const canvasRef = useRef(null);
  const annule = useRef(false);

  useEffect(() => {
    if (!disponible) return undefined;

    annule.current = false;

    (async () => {
      setEtat('loading');
      try {
        const { url } = await getUrlPdfMonDocument(documentId);
        const pdfjsLib = await chargerPdfjs();
        const pdf = await pdfjsLib.getDocument(url).promise;
        const page = await pdf.getPage(1);

        const largeurCible = 340; // correspond a la largeur type d'une carte de la grille
        const viewportBrut = page.getViewport({ scale: 1 });
        const echelle = largeurCible / viewportBrut.width;
        const viewport = page.getViewport({ scale: echelle * (window.devicePixelRatio || 1) });

        if (annule.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / (window.devicePixelRatio || 1)}px`;

        const contexte = canvas.getContext('2d');
        await page.render({ canvasContext: contexte, viewport }).promise;

        if (!annule.current) setEtat('ready');
      } catch {
        if (!annule.current) setEtat('error');
      }
    })();

    return () => {
      annule.current = true;
    };
  }, [documentId, aUnPdf, statut]);

  if (etat === 'error') {
    return (
      <div className={styles.fallback}>
        {statut === 'revoque' ? <ShieldOff size={28} /> : <FileText size={28} />}
      </div>
    );
  }

  return (
    <div className={styles.thumbWrap}>
      {etat === 'loading' && <div className={styles.skeleton} />}
      <canvas ref={canvasRef} className={styles.canvas} style={{ opacity: etat === 'ready' ? 1 : 0 }} />
      <div className={styles.fade} />
    </div>
  );
}
