import React, { useState } from 'react';
import { 
  Eye, 
  Building2, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  Search, 
  Filter, 
  TrendingUp, 
  Globe, 
  CheckCircle2 
} from 'lucide-react';
import styles from './VuesRecruteurs.module.css';

export default function VuesRecruteurs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Exemple de données de consultations par des recruteurs
  const views = [
    {
      id: 'v_101',
      company: 'Orange Cameroun',
      sector: 'Télécommunications / Tech',
      location: 'Douala, Cameroun',
      diplomaViewed: 'Licence en Développement Web (DAWII)',
      date: '19/08/2026 à 14:32',
      verificationMethod: 'Lien de partage',
      status: 'Certifié Blockchain',
      verified: true
    },
    {
      id: 'v_102',
      company: 'Cabinet RH Executive',
      sector: 'Recrutement / Consulting',
      location: 'Yaoundé, Cameroun',
      diplomaViewed: 'Licence en Développement Web (DAWII)',
      date: '17/08/2026 à 09:15',
      verificationMethod: 'Code QR',
      status: 'Certifié Blockchain',
      verified: true
    },
    {
      id: 'v_103',
      company: 'Université de Paris (Master)',
      sector: 'Enseignement Supérieur',
      location: 'Paris, France',
      diplomaViewed: 'Licence en Développement Web (DAWII)',
      date: '10/08/2026 à 11:40',
      verificationMethod: 'Lien de partage',
      status: 'Certifié Blockchain',
      verified: true
    },
    {
      id: 'v_104',
      company: 'Société Générale Cameroun',
      sector: 'Secteur Bancaire',
      location: 'Douala, Cameroun',
      diplomaViewed: 'Licence en Développement Web (DAWII)',
      date: '02/08/2026 à 16:05',
      verificationMethod: 'Recherche directe Hash',
      status: 'Certifié Blockchain',
      verified: true
    }
  ];

  const filteredViews = views.filter((item) => {
    const matchesSearch = item.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.sector.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className={styles.container}>
      {/* En-tête de section */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Eye className={styles.titleIcon} size={28} />
            Consultations & Vues Recruteurs
          </h1>
          <p className={styles.subtitle}>
            Suivez en temps réel les entreprises et institutions qui vérifient l'authenticité de vos diplômes.
          </p>
        </div>
      </div>

      {/* Cartes de Statistiques */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={`${styles.iconBox} ${styles.blueIcon}`}>
            <Eye size={20} />
          </div>
          <div>
            <span className={styles.statNumber}>14</span>
            <span className={styles.statLabel}>Vues Totales Ce Mois</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.iconBox} ${styles.greenIcon}`}>
            <Building2 size={20} />
          </div>
          <div>
            <span className={styles.statNumber}>4</span>
            <span className={styles.statLabel}>Entreprises Distinctes</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.iconBox} ${styles.purpleIcon}`}>
            <TrendingUp size={20} />
          </div>
          <div>
            <span className={styles.statNumber}>100%</span>
            <span className={styles.statLabel}>Vérifications Réussies</span>
          </div>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Rechercher une entreprise, une ville ou un secteur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterGroup}>
          <Filter size={16} className={styles.filterIcon} />
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Tous les canaux</option>
            <option value="link">Lien de partage</option>
            <option value="qr">Code QR</option>
            <option value="hash">Recherche Hash</option>
          </select>
        </div>
      </div>

      {/* Liste de l'Historique des Vues */}
      <div className={styles.viewsSection}>
        <h2 className={styles.sectionTitle}>Historique d'activité de vérification</h2>

        <div className={styles.viewsList}>
          {filteredViews.length > 0 ? (
            filteredViews.map((view) => (
              <div key={view.id} className={styles.viewCard}>
                <div className={styles.cardMain}>
                  <div className={styles.companyAvatar}>
                    <Building2 size={22} />
                  </div>
                  <div className={styles.companyInfo}>
                    <div className={styles.companyHeader}>
                      <h3 className={styles.companyName}>{view.company}</h3>
                      <span className={styles.verifiedBadge}>
                        <CheckCircle2 size={13} /> {view.status}
                      </span>
                    </div>
                    <p className={styles.sectorText}>{view.sector}</p>
                    <span className={styles.diplomaTag}>{view.diplomaViewed}</span>
                  </div>
                </div>

                <div className={styles.cardDetails}>
                  <div className={styles.detailItem}>
                    <MapPin size={14} />
                    <span>{view.location}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <Calendar size={14} />
                    <span>{view.date}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <Globe size={14} />
                    <span>Moyen : <strong>{view.verificationMethod}</strong></span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <Eye size={36} />
              <p>Aucune consultation ne correspond à votre recherche.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}