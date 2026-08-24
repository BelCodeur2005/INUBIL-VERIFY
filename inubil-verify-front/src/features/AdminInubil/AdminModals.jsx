import { useEffect, useState } from 'react';
import { creerInvitation } from '../../core/invitations/invitations.api';
import { listerUniversites } from '../../core/universites/universites.api';
import { upsertConfiguration } from '../../core/configurations/configurations.api';
import { ApiError } from '../../core/api/client';
import drawerStyles from './AdminModals.module.css';

// Style commun pour le fond des modales
const overlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.65)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(3px)',
};

const modalCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  width: '550px',
  maxWidth: '90%',
  padding: '1.5rem',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
};

// 1. Modale Ajouter un Établissement
export function EtablissementModal({ onClose }) {
  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: 'var(--primary)' }}>Nouveau Partenaire Établissement</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); alert("Établissement enregistré !"); onClose(); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input type="text" placeholder="Nom de l'Établissement (ex: Université de Douala)" required style={inputStyle} />
            <input type="text" placeholder="Code Identifiant (ex: UD-IUT)" required style={inputStyle} />
            <select style={inputStyle}>
              <option value="Public">Établissement Public</option>
              <option value="Privé">Établissement Privé</option>
            </select>
            <input type="number" placeholder="Quota Initial d'Ancrages (ex: 5000)" required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button type="button" onClick={onClose} style={btnCancelStyle}>Annuler</button>
            <button type="submit" style={btnSubmitStyle}>Créer Établissement</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 2. Modale Inviter un Collaborateur — POST /invitations (email + role, TTL 72h).
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

// 4. Drawer Détails du Nœud
export function NodeDetailsModal({ node, onClose }) {
  return (
    <div className={drawerStyles.drawerOverlay} onClick={onClose}>
      <div className={drawerStyles.drawerPanel} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: 'var(--primary)' }}>Métriques du Nœud : {node.id}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ fontSize: '0.85rem' }}>
          <p>Statut : <strong style={{ color: 'green' }}>{node.status}</strong></p>
          <p>Pairs connectés : <strong>{node.peers} Nœuds</strong></p>
          <p>Consensus : <strong>Proof of Authority (IBFT 2.0)</strong></p>
        </div>
      </div>
    </div>
  );
}

// 5. Drawer Inspection Log — champs reels de AuditEntryDto (GET /admin/audit).
export function AuditLogDetailsModal({ log, onClose }) {
  return (
    <div className={drawerStyles.drawerOverlay} onClick={onClose}>
      <div className={drawerStyles.drawerPanel} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: 'var(--primary)' }}>Détails de l'Événement</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
          <p>Horodatage : <strong>{new Date(log.created_at).toLocaleString('fr-FR')}</strong></p>
          <p>Opérateur : <strong>{log.nom_utilisateur ?? 'Système'}</strong></p>
          <p>Module : <strong>{log.module}</strong></p>
          <p>Action Réalisée : <strong>{log.action}</strong></p>
          {log.table_concernee && <p>Table concernée : <strong>{log.table_concernee}</strong></p>}
          {log.enregistrement_id && <p>ID enregistrement : <strong style={{ fontFamily: 'monospace' }}>{log.enregistrement_id}</strong></p>}
          <p>Adresse IP Source : <strong style={{ fontFamily: 'monospace' }}>{log.ip_address ?? '—'}</strong></p>
          {log.user_agent && <p>Client : <span style={{ fontSize: '0.75rem' }}>{log.user_agent}</span></p>}
        </div>
      </div>
    </div>
  );
}

// 6. Drawer Modifier un Paramètre Système — PUT /configurations/:cle.
export function ConfigEditDrawer({ config, onClose, onSaved }) {
  const [valeur, setValeur] = useState(config.valeur);
  const [description, setDescription] = useState(config.description ?? '');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

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
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: 'var(--primary)', fontFamily: 'monospace', fontSize: '1rem' }}>{config.cle}</h3>
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
  backgroundColor: '#002c53',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};