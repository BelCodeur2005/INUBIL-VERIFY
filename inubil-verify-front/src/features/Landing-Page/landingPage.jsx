import React, { useRef, useState } from 'react';
import styles from './landingPage.module.css';
import Logo_Inubil from '../../assets/logo_inubil.png';


export default function LandingPage() {
  const [query, setQuery] = useState('');
  const diplomaCardRef = useRef(null);

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

  const handleVerify = (e) => {
    e.preventDefault();
    if (query.trim()) {
      // Redirection ou appel API de vérification publique
      window.location.href = `/verification?q=${encodeURIComponent(query)}`;
    }
  };

  return (
    <div className={styles.landingContainer}>
      {/* Header / Navigation */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.brand}>
                <img 
                  src={Logo_Inubil} 
                  alt="INUBIL Verify" 
                  style={{ height: '80px', width: 'auto', objectFit: 'contain' }} 
                />
          </div>

          {/*<nav className={styles.navLinks}>
            <a href="#verify">Vérification</a>
          </nav>  */}

          <div className={styles.headerActions}>
            <a href="/login" className={styles.btnLogin}>Connexion</a>
            <a href="/verification-publique" className={styles.btnPrimary}>Vérifier un diplôme</a>
          </div>
        </div>
      </header>

      {/* Section Hero */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.heroCopy}>
            <div className={styles.heroBadge}>
              Intégrité & Transparence
            </div>
            <h1 className={styles.heroTitle}>
              Authentifiez et validez vos diplômes académiques en quelques secondes
            </h1>
            <p className={styles.heroSubtitle}>
              INUBIL Verify utilise la puissance de la blockchain pour garantir l'infalsifiabilité des titres académiques et simplifier la vérification de vos documents academiques.
            </p>

            {/* Barre de recherche publique */}
            <form id="verify" onSubmit={handleVerify} className={styles.searchBox}>
              <input
                type="text"
                placeholder="Entrez le numéro unique ou l'ID du document..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={styles.searchInput}
              />
              <button type="submit" className={styles.searchButton}>
                Vérifier
              </button>
            </form>
          </div>

          <div className={styles.heroVisual} onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave}>
            <div className={styles.diplomaCard} ref={diplomaCardRef}>
              <div className={styles.diplomaScanBeam}></div>
              <div className={styles.diplomaStamp}>
                <span className="material-symbols-outlined">verified</span>
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
                  <div className={styles.diplomaFooterField}>
                    <span className={styles.diplomaFooterLabel}>Numéro unique</span>
                    <span className={styles.diplomaFooterValueCode}>INUB-2026-XXXXX</span>
                  </div>
                </div>
                <div className={styles.diplomaHashRow}>
                  <span className="material-symbols-outlined">lock</span>
                  <span className={styles.diplomaHash}>a3f9c2d1e8b7…f67891c</span>
                </div>
              </div>
              <span className={styles.diplomaExample}>Exemple</span>
            </div>
          </div>
        </div>
      </section>

      {/* Cartes des Fonctionnalités */}
      <section id="features" className={styles.featuresSection}>
        <h2 className={styles.featuresTitle}>Comment ça marche</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <span className="material-symbols-outlined">qr_code_scanner</span>
            </div>
            <h3>Scanner ou saisir</h3>
            <p>
              Scannez le QR code imprimé sur le diplôme, ou saisissez son identifiant unique (ex. INUB-2026-00123).
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <span className="material-symbols-outlined">hub</span>
            </div>
            <h3>Vérification blockchain</h3>
            <p>
              Le hash SHA-256 du document est comparé en temps réel à l'empreinte enregistrée sur le réseau Polygon.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <span className="material-symbols-outlined">verified</span>
            </div>
            <h3>Résultat certifié</h3>
            <p>
              Statut authentique ou révoqué affiché immédiatement, avec un rapport de vérification PDF téléchargeable.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.statsSection} aria-label="Chiffres clés">
        <div className={styles.statItem}>
          <strong className={styles.statValue}>&lt; 3s</strong>
          <span className={styles.statLabel}>Vérification publique</span>
        </div>
        <div className={styles.statItem}>
          <strong className={styles.statValue}>SHA-256</strong>
          <span className={styles.statLabel}>Empreinte par diplôme</span>
        </div>
        <div className={styles.statItem}>
          <strong className={styles.statValue}>Polygon</strong>
          <span className={styles.statLabel}>Réseau blockchain</span>
        </div>
        <div className={styles.statItem}>
          <strong className={styles.statValue}>0</strong>
          <span className={styles.statLabel}>Compte requis pour vérifier</span>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} INUBIL Verify-tous droits réservés.</p>
      </footer>
    </div>
  );
}