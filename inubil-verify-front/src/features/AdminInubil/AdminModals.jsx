import { useEffect, useState } from 'react';
import { creerInvitation } from '../../core/invitations/invitations.api';
import { listerUniversites } from '../../core/universites/universites.api';
import { upsertConfiguration } from '../../core/configurations/configurations.api';
import { ApiError } from '../../core/api/client';
import { metaConfig } from './configurations-metadata';
import drawerStyles from './AdminModals.module.css';

// Modale Inviter un Collaborateur — POST /invitations (email + role, TTL 72h).
export function InviterUtilisateurModal({ onClose, onInvited, roles }) {
  const [universites, setUniversites] = useState([]);
  const [chargementUniv, setChargementUniv] = useState(true);
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [universiteId, setUniversiteId] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    let annule = false;
    listerUniversites({ limit: 100 })
      .then((res) => {
        if (annule) return;
        const liste = res.data ?? [];
        setUniversites(liste);
        if (liste.length === 1) setUniversiteId(liste[0].id);
      })
      .catch(() => { /* selection manuelle si le chargement echoue */ })
      .finally(() => { if (!annule) setChargementUniv(false); });
    return () => { annule = true; };
  }, []);

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      await creerInvitation({ email, role_id: roleId, universite_id: universiteId });
      onInvited?.();
      onClose();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Impossible d'envoyer l'invitation.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className={drawerStyles.drawerOverlay} onClick={onClose}>
      <div className={drawerStyles.drawerPanel} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: 'var(--primary)' }}>Inviter un Collaborateur</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
        </div>
        {erreur && <p style={{ color: '#ba1a1a', fontSize: '0.8rem', marginTop: 0 }}>{erreur}</p>}
        <form onSubmit={soumettre} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="email"
              placeholder="Adresse email institutionnelle"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
            <select value={roleId} onChange={(e) => setRoleId(e.target.value)} required style={inputStyle}>
              <option value="" disabled>Choisir un rôle</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
            </select>
            <select
              value={universiteId}
              onChange={(e) => setUniversiteId(e.target.value)}
              required
              disabled={chargementUniv || universites.length <= 1}
              style={inputStyle}
            >
              <option value="" disabled>Choisir un établissement</option>
              {universites.map((u) => <option key={u.id} value={u.id}>{u.nom}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: 'auto', paddingTop: '1.25rem' }}>
            <button type="button" onClick={onClose} style={btnCancelStyle}>Annuler</button>
            <button type="submit" style={btnSubmitStyle} disabled={envoi}>
              {envoi ? 'Envoi…' : "Envoyer l'invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Drawer Modifier un Paramètre Système — PUT /configurations/:cle.
export function ConfigEditDrawer({ config, onClose, onSaved }) {
  const [valeur, setValeur] = useState(config.valeur);
  const [description, setDescription] = useState(config.description ?? '');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);
  const meta = metaConfig(config.cle);

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      await upsertConfiguration(config.cle, { valeur, type: config.type, description: description || undefined });
      onSaved?.();
      onClose();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Impossible d'enregistrer ce paramètre.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className={drawerStyles.drawerOverlay} onClick={onClose}>
      <div className={drawerStyles.drawerPanel} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.05rem' }}>{meta.label}</h3>
            <p style={{ margin: '0.3rem 0 0 0', fontFamily: 'monospace', fontSize: '0.72rem', color: '#8a94a6' }}>{config.cle}</p>
            {!meta.connecte && (
              <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.72rem', color: '#a5680f', fontWeight: 600 }}>
                ⚠ Non connecté : modifier cette valeur n&#x2019;a aucun effet réel côté backend.
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
        </div>
        {erreur && <p style={{ color: '#ba1a1a', fontSize: '0.8rem', marginTop: 0 }}>{erreur}</p>}
        <form onSubmit={soumettre} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#666' }}>
              Valeur ({config.type})
              <input
                type="text"
                required
                value={valeur}
                onChange={(e) => setValeur(e.target.value)}
                style={{ ...inputStyle, marginTop: '0.35rem' }}
              />
            </label>
            <label style={{ fontSize: '0.75rem', color: '#666' }}>
              Description
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ ...inputStyle, marginTop: '0.35rem' }}
              />
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: 'auto', paddingTop: '1.25rem' }}>
            <button type="button" onClick={onClose} style={btnCancelStyle}>Annuler</button>
            <button type="submit" style={btnSubmitStyle} disabled={envoi}>
              {envoi ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Styles partagés
const inputStyle = {
  width: '100%',
  padding: '0.6rem 0.8rem',
  borderRadius: '6px',
  border: '1px solid #ccc',
  fontSize: '0.85rem',
};

const btnCancelStyle = {
  padding: '0.5rem 1rem',
  backgroundColor: '#f3f4f5',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};

const btnSubmitStyle = {
  padding: '0.5rem 1rem',
  backgroundColor: '#2b56cb',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};