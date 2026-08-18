import { useState } from 'react';
import styles from '../universite/dashboard/DashboardEtablissement.module.css';

const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

export default function Parametres() {
  const [formData, setFormData] = useState({
    nomEtablissement: 'Université de Yaoundé I - Faculté des Sciences',
    codeEtablissement: 'UY1-FS-2026',
    emailContact: 'support.ancrage@uy1.cm',
    noeudBlockchain: 'https://rpc-mainnet.inubil-verify.org',
    signatureAuto: true,
    notificationsEmail: true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Paramètres enregistrés avec succès !');
  };

  return (
    <div className={styles.page}>
      <div className={styles.tableCard} style={{ padding: '24px' }}>
        <div className={styles.tableHeader} style={{ paddingLeft: 0, paddingRight: 0, paddingTop: 0 }}>
          <div className={styles.tableTitle}>
            <IconSettings />
            PARAMÈTRES DU NŒUD ÉTABLISSEMENT
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                NOM DE L'ÉTABLISSEMENT
              </label>
              <input
                type="text"
                name="nomEtablissement"
                value={formData.nomEtablissement}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                CODE IDENTIFIANT
              </label>
              <input
                type="text"
                name="codeEtablissement"
                value={formData.codeEtablissement}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
              EMAIL DE CONTACT ADMINISTRATIF
            </label>
            <input
              type="email"
              name="emailContact"
              value={formData.emailContact}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
              ENDPOINT DU NŒUD BLOCKCHAIN PRINCIPAL
            </label>
            <input
              type="text"
              name="noeudBlockchain"
              value={formData.noeudBlockchain}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="signatureAuto"
                checked={formData.signatureAuto}
                onChange={handleChange}
              />
              Ancrage automatique des attestations validées par le Directeur
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="notificationsEmail"
                checked={formData.notificationsEmail}
                onChange={handleChange}
              />
              Recevoir une notification email pour chaque diplôme révoqué
            </label>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className={styles.btnOutline}
              style={{ backgroundColor: '#2563eb', color: '#ffffff', borderColor: '#2563eb', padding: '10px 20px', fontWeight: '600' }}
            >
              ENREGISTRER LES CONFIGURATIONS
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}