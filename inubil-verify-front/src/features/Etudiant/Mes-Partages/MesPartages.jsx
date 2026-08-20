import React, { useState } from 'react';
import { 
  Share2, 
  Link2, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  Eye, 
  Clock, 
  ShieldCheck,
  Calendar,
  X
} from 'lucide-react';
import styles from './MesPartages.module.css';

export default function MesPartages() {
  const [copiedId, setCopiedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Formulaire pour le nouveau lien
  const [newShare, setNewShare] = useState({
    title: '',
    diploma: 'Licence en Développement Web (DAWII)',
    recipient: '',
    duration: '7'
  });

  const [shares, setShares] = useState([
    {
      id: 'sh_101',
      title: 'Lien Recrutement — Tech Lead',
      diploma: 'Licence en Développement Web (DAWII)',
      recipient: 'Recruteurs publics',
      createdDate: '12/08/2026',
      expiresIn: '7 jours',
      viewsCount: 5,
      status: 'Actif',
      shareUrl: 'https://verify.inubil.org/v/abc123xyz'
    },
    {
      id: 'sh_102',
      title: 'Partage pour Candidature Master',
      diploma: 'Licence en Développement Web (DAWII)',
      recipient: 'Université de Paris',
      createdDate: '01/08/2026',
      expiresIn: 'Expiré',
      viewsCount: 12,
      status: 'Expiré',
      shareUrl: 'https://verify.inubil.org/v/exp987456'
    }
  ]);

  const handleCopyLink = (id, url) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevokeShare = (id) => {
    setShares(shares.filter(share => share.id !== id));
  };

  const handleCreateShare = (e) => {
    e.preventDefault();
    if (!newShare.title || !newShare.recipient) return;

    const created = {
      id: `sh_${Date.now()}`,
      title: newShare.title,
      diploma: newShare.diploma,
      recipient: newShare.recipient,
      createdDate: new Date().toLocaleDateString('fr-FR'),
      expiresIn: `${newShare.duration} jours`,
      viewsCount: 0,
      status: 'Actif',
      shareUrl: `https://verify.inubil.org/v/${Math.random().toString(36).substr(2, 9)}`
    };

    setShares([created, ...shares]);
    setShowCreateModal(false);
    setNewShare({ title: '', diploma: 'Licence en Développement Web (DAWII)', recipient: '', duration: '7' });
  };

  return (
    <div className={styles.container}>
      {/* Entête */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Share2 className={styles.titleIcon} size={28} />
            Mes Partages & Liens de Vérification
          </h1>
          <p className={styles.subtitle}>
            Gérez les accès sécurisés que vous avez générés pour les recruteurs et institutions.
          </p>
        </div>
        <button 
          className={styles.createBtn}
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={18} />
          Nouveau Lien de Partage
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={`${styles.iconBox} ${styles.blueIcon}`}><Link2 size={20} /></div>
          <div>
            <span className={styles.statNumber}>{shares.filter(s => s.status === 'Actif').length}</span>
            <span className={styles.statLabel}>Liens Actifs</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.iconBox} ${styles.greenIcon}`}><Eye size={20} /></div>
          <div>
            <span className={styles.statNumber}>{shares.reduce((acc, curr) => acc + curr.viewsCount, 0)}</span>
            <span className={styles.statLabel}>Consultations Totales</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.iconBox} ${styles.purpleIcon}`}><ShieldCheck size={20} /></div>
          <div>
            <span className={styles.statNumber}>Blockchain</span>
            <span className={styles.statLabel}>Protection Active</span>
          </div>
        </div>
      </div>

      {/* Liste des Partages */}
      <div className={styles.sharesListSection}>
        <h2 className={styles.sectionTitle}>Historique des accès générés</h2>

        <div className={styles.sharesGrid}>
          {shares.map((share) => (
            <div key={share.id} className={styles.shareCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderInfo}>
                  <h3 className={styles.shareTitle}>{share.title}</h3>
                  <span className={styles.diplomaName}>{share.diploma}</span>
                </div>
                <span className={`${styles.statusBadge} ${share.status === 'Actif' ? styles.statusActive : styles.statusExpired}`}>
                  {share.status}
                </span>
              </div>

              <div className={styles.linkBox}>
                <code className={styles.urlText}>{share.shareUrl}</code>
                <button 
                  className={styles.copyBtn} 
                  onClick={() => handleCopyLink(share.id, share.shareUrl)}
                  title="Copier le lien"
                >
                  {copiedId === share.id ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                </button>
              </div>

              <div className={styles.cardMeta}>
                <div className={styles.metaItem}><Calendar size={14} /><span>Créé le : {share.createdDate}</span></div>
                <div className={styles.metaItem}><Clock size={14} /><span>Expiration : {share.expiresIn}</span></div>
                <div className={styles.metaItem}><Eye size={14} /><span>{share.viewsCount} vues</span></div>
              </div>

              <div className={styles.cardFooter}>
                <span className={styles.recipient}>Destinataire : <strong>{share.recipient}</strong></span>
                <button className={styles.revokeBtn} onClick={() => handleRevokeShare(share.id)}>
                  <Trash2 size={14} /> Révoquer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODALE DE CRÉATION */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Générer un lien de vérification</h3>
              <button className={styles.closeModalBtn} onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateShare} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Diplôme concerné</label>
                <select 
                  value={newShare.diploma} 
                  onChange={(e) => setNewShare({...newShare, diploma: e.target.value})}
                >
                  <option value="Licence en Développement Web (DAWII)">
                    Licence en Développement Web (DAWII)
                  </option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Nom ou motif du partage</label>
                <input 
                  type="text" 
                  placeholder="Ex: Candidature Poste Développeur Fullstack"
                  value={newShare.title}
                  onChange={(e) => setNewShare({...newShare, title: e.target.value})}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Destinataire / Entreprise</label>
                <input 
                  type="text" 
                  placeholder="Ex: RH Google / Cabinet Recruitment"
                  value={newShare.recipient}
                  onChange={(e) => setNewShare({...newShare, recipient: e.target.value})}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Durée de validité du lien</label>
                <select 
                  value={newShare.duration} 
                  onChange={(e) => setNewShare({...newShare, duration: e.target.value})}
                >
                  <option value="1">24 heures</option>
                  <option value="7">7 jours</option>
                  <option value="30">30 jours</option>
                  <option value="90">90 jours</option>
                </select>
              </div>

              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  className={styles.cancelBtn} 
                  onClick={() => setShowCreateModal(false)}
                >
                  Annuler
                </button>
                <button type="submit" className={styles.submitBtn}>
                  Générer le lien
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}