import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Logo_Inubil from '../../../assets/Logo_Inubil.png';
import styles from './AuthLayout.module.css';

export default function AuthLayout() {
  useEffect(() => {
    // Bloque le scroll global au niveau du navigateur (body et html)
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Restaure le scroll quand on quitte les pages d'auth
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className={styles.authContainer}>
      
      {/* Navbar supérieure */}
      <nav className={styles.navbar}>
        <img 
          src={Logo_Inubil} 
          alt="INUBIL Verify Logo" 
          className={styles.logo} 
        />
      </nav>
      
      {/* Conteneur principal */}
      <main className={styles.mainContent}>
        <Outlet />
      </main>

    </div>
  );
}