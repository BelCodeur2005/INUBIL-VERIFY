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

// 2. Modale Créer Utilisateur
export function UserModal({ onClose, etablissements }) {
  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: 'var(--primary)' }}>Créer un Utilisateur</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); alert("Utilisateur créé !"); onClose(); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input type="text" placeholder="Nom complet" required style={inputStyle} />
            <input type="email" placeholder="Adresse Email institutionnelle" required style={inputStyle} />
            <select style={inputStyle}>
              <option value="AGENT_SAISIE">Agent de Saisie</option>
              <option value="DIRECTEUR_SIGNATAIRE">Directeur Signataire</option>
              <option value="SUPER_ADMIN">Super Admin INUBIL</option>
            </select>
            <select style={inputStyle}>
              {etablissements.map(e => <option key={e.id} value={e.code}>{e.nom}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button type="button" onClick={onClose} style={btnCancelStyle}>Annuler</button>
            <button type="submit" style={btnSubmitStyle}>Enregistrer l'Utilisateur</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 3. Modale Recharger Quota
export function QuotaModal({ etab, onClose }) {
  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        <h3 style={{ margin: 0, color: 'var(--primary)' }}>Recharger Quota : {etab?.code}</h3>
        <p style={{ fontSize: '0.8rem', color: '#666' }}>Quota actuel : {etab?.quotas} Crédits</p>
        <form onSubmit={(e) => { e.preventDefault(); alert("Quota rechargé !"); onClose(); }}>
          <input type="number" placeholder="Nombre de crédits à ajouter (ex: 2000)" required style={inputStyle} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button type="button" onClick={onClose} style={btnCancelStyle}>Annuler</button>
            <button type="submit" style={btnSubmitStyle}>Allouer Crédits</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 4. Modale Détails du Nœud
export function NodeDetailsModal({ node, onClose }) {
  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        <h3 style={{ margin: 0, color: 'var(--primary)' }}>Métriques du Nœud : {node.id}</h3>
        <div style={{ fontSize: '0.85rem', margin: '1rem 0' }}>
          <p>Statut : <strong style={{ color: 'green' }}>{node.status}</strong></p>
          <p>Pairs connectés : <strong>{node.peers} Nœuds</strong></p>
          <p>Consensus : <strong>Proof of Authority (IBFT 2.0)</strong></p>
        </div>
        <button onClick={onClose} style={btnSubmitStyle}>Fermer</button>
      </div>
    </div>
  );
}

// 5. Modale Inspection Log
export function AuditLogDetailsModal({ log, onClose }) {
  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        <h3 style={{ margin: 0, color: 'var(--primary)' }}>Détails de l'Événement : {log.id}</h3>
        <div style={{ fontSize: '0.85rem', margin: '1rem 0', lineHeight: '1.6' }}>
          <p>Horodatage : <strong>{log.horodatage}</strong></p>
          <p>Opérateur : <strong>{log.auteur}</strong></p>
          <p>Adresse IP Source : <strong style={{ fontFamily: 'monospace' }}>{log.ip}</strong></p>
          <p>Action Réalisée : <strong>{log.action}</strong></p>
          <p>Détails : <i>{log.details}</i></p>
        </div>
        <button onClick={onClose} style={btnSubmitStyle}>Fermer</button>
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