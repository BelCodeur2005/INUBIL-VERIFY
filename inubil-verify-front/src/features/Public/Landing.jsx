import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Landing.module.css';
import PublicHeader from './PublicHeader';
import Logo_Inubil from '../../assets/Logo_Inubil.png';

function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, visible];
}

const ETAPES = [
  {
    titre: 'Scanner ou saisir',
    desc: 'Scannez le QR code imprimé sur le diplôme, ou saisissez son identifiant unique (ex. INUB-2026-00123).',
    icone: 'qr_code_scanner',
  },
  {
    titre: 'Vérification blockchain',
    desc: "Le hash SHA-256 du document est comparé en temps réel à l'empreinte enregistrée sur le réseau Polygon.",
    icone: 'hub',
  },
  {
    titre: 'Résultat certifié',
    desc: 'Statut authentique ou révoqué affiché immédiatement, avec un rapport de vérification PDF téléchargeable.',
    icone: 'verified',
  },
];

const GARANTIES = [
  { valeur: '< 3s', label: 'Vérification publique' },
  { valeur: 'SHA-256', label: 'Empreinte par diplôme' },
  { valeur: 'Polygon', label: 'Réseau blockchain' },
  { valeur: '0', label: 'Compte requis pour vérifier' },
];

export default function Landing() {
  const navigate = useNavigate();
  const diplomaCardRef = useRef(null);
  const [etapesRef, etapesVisible] = useReveal();
  const [garantiesRef, garantiesVisible] = useReveal();

  const handleTiltMove = (e) => {
    const card = diplomaCardRef.current;
    if (!card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(900px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`;
  };

  const handleTiltLeave = () => {
    if (diplomaCardRef.current) diplomaCardRef.current.style.transform = '';
  };

  return (
    <div className={styles.page}>
      <PublicHeader verifyLabel="Vérifier un diplôme" />

      <main>
        <section className={styles.hero}>
          <div className={styles.hashTexture} aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i}>
                a3f9c2 8b74f5 60ab12 c3d4e5 f67891 2e8f0a d1c9b6 4e7f21 9a0c3d 5b8e12
              </span>
            ))}
          </div>

          <div className={styles.heroScanLine} aria-hidden="true"></div>

          <div className={styles.heroInner}>
            <div className={styles.heroText}>
              <h1 className={styles.headline}>
                L'authenticité de vos diplômes, <span className={styles.headlineAccent}>prouvée par la blockchain.</span>
              </h1>

              <p className={styles.subheadline}>
                L'Institut Universitaire Bilingue du Littoral (INUBIL, Douala) ancre chaque diplôme émis sur la
                blockchain Polygon. Employeurs, universités partenaires ou particuliers : vérifiez un diplôme INUBIL
                en quelques secondes, sans créer de compte.
              </p>

              <div className={styles.ctaRow}>
                <button className={styles.ctaPrimary} onClick={() => navigate('/verification-publique')}>
                  Vérifier un diplôme
                </button>
                <a className={styles.ctaGhost} href="#comment-ca-marche">
                  Comment ça marche
                  <span className="material-symbols-outlined">arrow_downward</span>
                </a>
              </div>
            </div>

            <div className={styles.heroVisual} onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave}>
              <div className={styles.diplomaCard} ref={diplomaCardRef}>
                <div className={styles.diplomaScanTrack}>
                  <div className={styles.diplomaScanBeam}></div>
                </div>

                <div className={styles.diplomaStamp}>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>verified</span>
                  AUTHENTIQUE
                </div>

                <div className={styles.diplomaFrame}>
                  <img src={Logo_Inubil} alt="" className={styles.diplomaSeal} />
                  <span className={styles.diplomaEyebrow}>Diplôme</span>
                  <h3 className={styles.diplomaInstitution}>Institut Universitaire Bilingue du Littoral</h3>

                  <div className={styles.diplomaDivider}></div>

                  <p className={styles.diplomaGrantText}>Ce document certifie que</p>
                  <p className={styles.diplomaRecipient}>Prénom NOM</p>
                  <p className={styles.diplomaDegree}>a obtenu le diplôme de Licence Professionnelle</p>

                  <div className={styles.diplomaDivider}></div>

                  <div className={styles.diplomaFooterRow}>
                    <div className={styles.diplomaFooterField}>
                      <span className={styles.diplomaFooterLabel}>Établissement</span>
                      <span className={styles.diplomaFooterValue}>INUBIL — Douala</span>
                    </div>
                    <div className={styles.diplomaFooterField} style={{ alignItems: 'flex-end' }}>
                      <span className={styles.diplomaFooterLabel}>Numéro unique</span>
                      <span className={styles.diplomaFooterValueCode}>INUB-2026-XXXXX</span>
                    </div>
                  </div>

                  <div className={styles.diplomaHashRow}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span>
                    <span className={styles.diplomaHash}>a3f9c2d1e8b7…f67891c</span>
                  </div>
                </div>

                <span className={styles.diplomaExemple}>Exemple</span>
              </div>
            </div>
          </div>
        </section>

        <section id="comment-ca-marche" className={styles.etapesSection}>
          <h2 className={styles.sectionTitle}>Comment ça marche</h2>
          <div ref={etapesRef} className={`${styles.etapesGrid} ${etapesVisible ? styles.revealed : ''}`}>
            {ETAPES.map((e, i) => (
              <div
                key={e.titre}
                className={styles.etapeCard}
                style={{ '--reveal-delay': `${i * 0.12}s` }}
              >
                <span className={styles.etapeNumero}>{String(i + 1).padStart(2, '0')}</span>
                <span className={`material-symbols-outlined ${styles.etapeIcon}`}>{e.icone}</span>
                <h3 className={styles.etapeTitre}>{e.titre}</h3>
                <p className={styles.etapeDesc}>{e.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section ref={garantiesRef} className={`${styles.garantiesSection} ${garantiesVisible ? styles.revealed : ''}`}>
          {GARANTIES.map((g, i) => (
            <div
              key={g.label}
              className={styles.garantieItem}
              style={{ '--reveal-delay': `${i * 0.1}s` }}
            >
              <span className={styles.garantieValeur}>{g.valeur}</span>
              <span className={styles.garantieLabel}>{g.label}</span>
            </div>
          ))}
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <span className={styles.footerBrand}>INUBIL Verify</span>
            <p className={styles.footerCopy}>© 2026 Institut Universitaire Bilingue du Littoral — Douala, Cameroun</p>
          </div>
          <div className={styles.footerLinks}>
            <a href="https://www.inubil.com" target="_blank" rel="noopener noreferrer">Site institutionnel</a>
            <a href="mailto:support@inubil-verify.ac">Contact</a>
            <button type="button" onClick={() => navigate('/login')}>Se connecter</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
