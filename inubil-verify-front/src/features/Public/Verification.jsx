import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './Valide.module.css';
import Logo_Inubil from '../../assets/Logo_Inubil.png';
import { verifierParIdentifiant } from '../../core/verify/verify.api';
import Valide from './Valide';
import Revoque from './Revoque';

function Chrome({ children }) {
  const navigate = useNavigate();
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <div className={styles.brandGroup}>
            <img alt="INUBIL Logo" className={styles.logo} src={Logo_Inubil} />
          </div>
          <div className={styles.navGroup}>
            <nav>
              <span className={styles.navLinkActive}>Vérification</span>
            </nav>
            <button className={styles.connexionBtn} onClick={() => navigate('/login')}>
              Connexion
            </button>
          </div>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.mainContainer} style={{ alignItems: 'center', textAlign: 'center', paddingTop: '80px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}

/** Page de verification publique par lien/QR — GET /verify/:identifiant. Route : /d/:identifiant */
export default function Verification() {
  const { identifiant } = useParams();
  const [etat, setEtat] = useState('chargement');
  const [reponse, setReponse] = useState(null);

  useEffect(() => {
    let annule = false;

    (async () => {
      setEtat('chargement');
      try {
        const res = await verifierParIdentifiant(identifiant);
        if (annule) return;
        setReponse(res);
        setEtat('ok');
      } catch {
        if (!annule) setEtat('erreur_reseau');
      }
    })();

    return () => {
      annule = true;
    };
  }, [identifiant]);

  if (etat === 'chargement') {
    return (
      <Chrome>
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#002c53' }}>hourglass_empty</span>
        <h2 style={{ color: '#002c53', marginTop: '16px' }}>Vérification en cours…</h2>
        <p style={{ color: '#42474f' }}>Interrogation du registre INUBIL pour « {identifiant} ».</p>
      </Chrome>
    );
  }

  if (etat === 'erreur_reseau') {
    return (
      <Chrome>
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#ba1a1a' }}>cloud_off</span>
        <h2 style={{ color: '#002c53', marginTop: '16px' }}>Service de vérification indisponible</h2>
        <p style={{ color: '#42474f', marginBottom: '20px' }}>
          Impossible de contacter le registre INUBIL pour le moment. Réessayez dans quelques instants.
        </p>
        <button className={styles.connexionBtn} onClick={() => window.location.reload()}>
          Réessayer
        </button>
      </Chrome>
    );
  }

  if (reponse.resultat === 'authentique') {
    return <Valide document={reponse.document} blockchain={reponse.blockchain} verifieLe={reponse.verifie_le} />;
  }

  return (
    <Revoque
      resultat={reponse.resultat}
      message={reponse.message}
      hashSoumis={null}
      blockchain={reponse.blockchain}
      verifieLe={reponse.verifie_le}
    />
  );
}
