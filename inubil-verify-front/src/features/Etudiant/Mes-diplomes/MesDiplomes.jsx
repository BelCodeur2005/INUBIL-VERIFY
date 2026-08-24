import { useState } from 'react';
import {
  Search,
  Download,
  Share2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  X,
  Award,
  Calendar,
  Building2,
  FileCheck2,
  ShieldCheck
} from 'lucide-react';
import styles from './MesDiplomes.module.css';

// Données de démonstration
const DIPLOMAS_DATA = [
  {
    id: 'dip-1',
    title: 'Master Informatique - Spécialité Blockchain & Web3',
    institution: 'Université de Technologie de Paris',
    degreeLevel: 'Bac +5 (Master 2)',
    graduationDate: '15 Juillet 2024',
    status: 'certified', // 'certified' | 'pending'
    blockchainHash: '0x8f2d...3a91b',
    fullHash: '0x8f2d4e1a9b8c7f6e5d4c3b2a1f0e9d8c7b6a51b',
    certificateId: 'UTP-2024-BC-8921',
    credits: '120 ECTS',
    mention: 'Très Bien'
  },
  {
    id: 'dip-2',
    title: 'Licence Informatique et Systèmes d\'Information',
    institution: 'Institut Supérieur du Numérique',
    degreeLevel: 'Bac +3 (Licence)',
    graduationDate: '20 Juin 2022',
    status: 'certified',
    blockchainHash: '0x4a1e...9c82d',
    fullHash: '0x4a1e7d3c5b9a8f2e6d1c4b7a0f9e8d3c2b1a9c82d',
    certificateId: 'ISN-2022-LIC-4412',
    credits: '180 ECTS',
    mention: 'Bien'
  },
  {
    id: 'dip-3',
    title: 'Certification Lead Developer Smart Contracts',
    institution: 'Web3 Tech Academy',
    degreeLevel: 'Certification Professionnelle',
    graduationDate: 'En cours (Oct. 2026)',
    status: 'pending',
    blockchainHash: 'En attente d\'émission',
    fullHash: '',
    certificateId: 'W3A-2026-PENDING',
    credits: '30 ECTS',
    mention: '-'
  }
];

export default function MesDiplomes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'certified', 'pending'
  const [copiedHashId, setCopiedHashId] = useState(null);
  const [selectedDiploma, setSelectedDiploma] = useState(null);

  // Copie du Hash Blockchain
  const handleCopyHash = (id, hash, e) => {
    e.stopPropagation();
    if (!hash || hash.includes('attente')) return;
    navigator.clipboard.writeText(hash);
    setCopiedHashId(id);
    setTimeout(() => setCopiedHashId(null), 2000);
  };

  // Filtrage des diplômes
  const filteredDiplomas = DIPLOMAS_DATA.filter((item) => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.institution.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.certificateId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className={styles.container}>
      {/* En-tête de la page */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Mes Diplômes & Certifications</h1>
          <p className={styles.pageSubtitle}>
            Consultez, partagez et téléchargez l'ensemble de vos titres académiques certifiés sur la blockchain.
          </p>
        </div>
      </div>

      {/* Barre de Filtres et Recherche */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Rechercher par intitulé, établissement ou identifiant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterTabs}>
          <button 
            className={`${styles.filterTab} ${statusFilter === 'all' ? styles.filterTabActive : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Tous ({DIPLOMAS_DATA.length})
          </button>
          <button 
            className={`${styles.filterTab} ${statusFilter === 'certified' ? styles.filterTabActive : ''}`}
            onClick={() => setStatusFilter('certified')}
          >
            Certifiés ({DIPLOMAS_DATA.filter(d => d.status === 'certified').length})
          </button>
          <button 
            className={`${styles.filterTab} ${statusFilter === 'pending' ? styles.filterTabActive : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            En attente ({DIPLOMAS_DATA.filter(d => d.status === 'pending').length})
          </button>
        </div>
      </div>

      {/* Grille des Diplômes */}
      <div className={styles.diplomasGrid}>
        {filteredDiplomas.map((diploma) => {
          const isCertified = diploma.status === 'certified';

          return (
            <div key={diploma.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.titleGroup}>
                  <span className={styles.levelBadge}>{diploma.degreeLevel}</span>
                  <h3 className={styles.degreeTitle}>{diploma.title}</h3>
                  <p className={styles.institutionName}>{diploma.institution}</p>
                </div>
                <span className={`${styles.statusBadge} ${isCertified ? styles.statusCertified : styles.statusPending}`}>
                  {isCertified ? (
                    <>
                      <CheckCircle2 size={12} /> Certifié
                    </>
                  ) : (
                    <>
                      <Clock size={12} /> En cours
                    </>
                  )}
                </span>
              </div>

              <div className={styles.metadataGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Date d'obtention</span>
                  <span className={styles.metaValue}>{diploma.graduationDate}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Crédits / Mention</span>
                  <span className={styles.metaValue}>{diploma.credits} - {diploma.mention}</span>
                </div>
              </div>

              {/* Bloc Empreinte Blockchain */}
              <div className={styles.blockchainBlock}>
                <div className={styles.blockchainInfo}>
                  <ShieldCheck size={14} className={isCertified ? styles.shieldCertified : styles.shieldPending} />
                  <span className={styles.hashCode}>{diploma.blockchainHash}</span>
                </div>
                {isCertified && (
                  <button 
                    className={styles.copyBtn}
                    onClick={(e) => handleCopyHash(diploma.id, diploma.fullHash, e)}
                    title="Copier le Hash complet"
                  >
                    {copiedHashId === diploma.id ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  </button>
                )}
              </div>

              {/* Actions de la carte */}
              <div className={styles.cardActions}>
                <button 
                  className={styles.primaryActionBtn}
                  onClick={() => setSelectedDiploma(diploma)}
                >
                  <FileCheck2 size={14} />
                  <span>Voir le certificat</span>
                </button>
                <button className={styles.secondaryActionBtn} title="Télécharger le PDF">
                  <Download size={14} />
                </button>
                <button className={styles.secondaryActionBtn} title="Partager l'accès">
                  <Share2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de détail d'un certificat */}
      {selectedDiploma && (
        <div className={styles.modalOverlay} onClick={() => setSelectedDiploma(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleBox}>
                <Award size={20} className={styles.modalIcon} />
                <h2>Détails du Certificat</h2>
              </div>
              <button className={styles.closeBtn} onClick={() => setSelectedDiploma(null)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalBanner}>
                <span className={selectedDiploma.status === 'certified' ? styles.statusCertified : styles.statusPending}>
                  {selectedDiploma.status === 'certified' ? 'Certifié Blockchain' : 'En attente de validation'}
                </span>
                <p className={styles.certIdText}>ID: {selectedDiploma.certificateId}</p>
              </div>

              <div className={styles.detailSection}>
                <h3>{selectedDiploma.title}</h3>
                <p className={styles.institutionDetail}>
                  <Building2 size={14} /> {selectedDiploma.institution}
                </p>
                <p className={styles.dateDetail}>
                  <Calendar size={14} /> Délivré le : {selectedDiploma.graduationDate}
                </p>
              </div>

              <div className={styles.proofBox}>
                <h4>Preuve cryptographique</h4>
                <div className={styles.hashDetailRow}>
                  <span className={styles.fieldLabel}>Hash Transaction :</span>
                  <p className={styles.fullHashText}>{selectedDiploma.fullHash || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.modalDownloadBtn}>
                <Download size={14} /> Télécharger le PDF officiel
              </button>
              {selectedDiploma.status === 'certified' && (
                <a 
                  href={`https://etherscan.io/tx/${selectedDiploma.fullHash}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className={styles.modalVerifyBtn}
                >
                  <ExternalLink size={14} /> Vérifier sur l'explorateur
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}