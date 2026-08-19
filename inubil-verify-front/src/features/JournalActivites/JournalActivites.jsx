import React from 'react';
import { Link } from 'react-router-dom';
import styles from './JournalActivites.module.css'

const logsData = [
  { id: 'BK-992', action: 'Ancrage Diplôme', cible: 'Mbarga Lucien (FS-240188)', date: '18/08/2026 - 14:32', statut: 'SUCCÈS', hash: '0x8a1...f3e9' },
  { id: 'BK-991', action: 'Demande de Révision', cible: 'Ngassa Chantal (FS-240192)', date: '18/08/2026 - 12:15', statut: 'EN COURS', hash: '-' },
  { id: 'BK-990', action: 'Erreur d\'Ancrage', cible: 'Kamga Junior (FS-240056)', date: '17/08/2026 - 09:40', statut: 'REJETÉ', hash: 'ERR_HASH_MISMATCH' },
  { id: 'BK-989', action: 'Révocation Titre', cible: 'Talla Frank (FS-230011)', date: '16/08/2026 - 16:05', statut: 'RÉVOQUÉ', hash: '0x3c2...b1d4' },
];

export default function JournalActivites() {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a' }}>Journal d'Audit & Activités Nœud</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Traçabilité immuable des événements et transactions exécutés sur la Blockchain INUBIL.
          </p>
        </div>
        <Link to="/universite" style={{ color:'white', textDecoration: 'none', fontWeight: '500', background: 'linear-gradient(135deg, #0350bd 0%, #062362 100%)' }}>
          ← Retour au Tableau de bord
        </Link>
      </div>

      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '14px 18px' }}>ID / BLOC</th>
              <th style={{ padding: '14px 18px' }}>ACTION</th>
              <th style={{ padding: '14px 18px' }}>CIBLE / MATRICULE</th>
              <th style={{ padding: '14px 18px' }}>DATE & HEURE</th>
              <th style={{ padding: '14px 18px' }}>PREUVE (HASH)</th>
              <th style={{ padding: '14px 18px' }}>STATUT</th>
            </tr>
          </thead>
          <tbody>
            {logsData.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 18px', fontWeight: '600' }}>#{log.id}</td>
                <td style={{ padding: '14px 18px' }}>{log.action}</td>
                <td style={{ padding: '14px 18px', color: '#334155' }}>{log.cible}</td>
                <td style={{ padding: '14px 18px', color: '#64748b' }}>{log.date}</td>
                <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: '#0284c7' }}>{log.hash}</td>
                <td style={{ padding: '14px 18px' }}>
                  <span style={{
                    padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                    backgroundColor: log.statut === 'SUCCÈS' ? '#dcfce7' : log.statut === 'REJETÉ' ? '#fee2e2' : '#fef3c7',
                    color: log.statut === 'SUCCÈS' ? '#15803d' : log.statut === 'REJETÉ' ? '#b91c1c' : '#b45309'
                  }}>
                    {log.statut}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}