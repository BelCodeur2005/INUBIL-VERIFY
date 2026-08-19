import { useState, useRef } from 'react';
import styles from './Ajout_Unitaire.module.css';

export default function FormCertificatModal({ isOpen, onClose }) {
  const fileInputRef = useRef(null); // Ref pour piloter l'input fichier caché
  const [selectedFile, setSelectedFile] = useState(null); // État du fichier sélectionné

  const [formData, setFormData] = useState({
    nom: '',
    prenoms: '',
    sexe: '',
    matricule: '',
    typeDiplome: '',
    specialite: '',
    mention: '',
    dateObtention: '',
    anneeAcademique: ''
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Déclenche l'ouverture du sélecteur de fichier
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  // Traite la sélection du fichier
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Supprime le fichier sélectionné
  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSend = {
      ...formData,
      fichier: selectedFile
    };
    console.log("Données complètes du certificat soumises :", dataToSend);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        
        <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className={styles.formHeader}>
          <div>
            <h2 className={styles.formTitle}>Nouveau Dossier Diplômé</h2>
            <p className={styles.formSubtitle}>Veuillez renseigner avec précision les informations du titulaire du titre académique.</p>
          </div>
          <div className={styles.sessionBadge}>
            <span className={styles.sessionLabel}>ID Session</span>
            <p className={styles.sessionCode}>AR-2024-X992-B</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} id="dossierForm" className={styles.formLayout}>
          
          {/* SECTION 1: Données de l'Étudiant */}
          <section className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className="material-symbols-outlined">person</span>
              <h3>Données de l'Étudiant</h3>
            </div>
            <div className={styles.gridTwoCols}>
              <div className={styles.inputGroup}>
                <label>Nom de Famille</label>
                <input 
                  type="text" 
                  name="nom" 
                  value={formData.nom} 
                  onChange={handleChange} 
                  placeholder="ex: KOUAM" 
                  required 
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Prénoms</label>
                <input 
                  type="text" 
                  name="prenoms" 
                  value={formData.prenoms} 
                  onChange={handleChange} 
                  placeholder="ex: Jean-Pierre" 
                  required 
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Sexe</label>
                <select name="sexe" value={formData.sexe} onChange={handleChange} required>
                  <option value="" disabled>Sélectionner...</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Matricule Unique</label>
                <div className={styles.inputWithIcon}>
                  <span className={`material-symbols-outlined ${styles.innerIcon}`}>fingerprint</span>
                  <input 
                    type="text" 
                    name="matricule" 
                    value={formData.matricule} 
                    onChange={handleChange} 
                    placeholder="INUB-2024-001" 
                    className={styles.uppercaseInput} 
                    required 
                  />
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: Détails Académiques */}
          <section className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className="material-symbols-outlined">school</span>
              <h3>Détails Académiques</h3>
            </div>
            <div className={styles.gridThreeCols}>
              <div className={styles.inputGroup}>
                <label>Type de Diplôme</label>
                <select name="typeDiplome" value={formData.typeDiplome} onChange={handleChange} required>
                  <option value="" disabled>Choisir...</option>
                  <option value="licence">Licence / Bachelor</option>
                  <option value="master">Master / Ingénieur</option>
                  <option value="doctorat">Doctorat / PhD</option>
                </select>
              </div>
              <div className={`${styles.inputGroup} ${styles.colSpanTwo}`}>
                <label>Domaine d'Études / Spécialité</label>
                <input 
                  type="text" 
                  name="specialite" 
                  value={formData.specialite} 
                  onChange={handleChange} 
                  placeholder="ex: Génie Logiciel et Systèmes d'Information" 
                  required 
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Grade / Mention</label>
                <select name="mention" value={formData.mention} onChange={handleChange} required>
                  <option value="" disabled>Mention...</option>
                  <option value="excellent">Très Bien</option>
                  <option value="v_good">Bien</option>
                  <option value="good">Assez Bien</option>
                  <option value="pass">Passable</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Date d'Obtention</label>
                <input 
                  type="date" 
                  name="dateObtention" 
                  value={formData.dateObtention} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Année Académique</label>
                <input 
                  type="text" 
                  name="anneeAcademique" 
                  value={formData.anneeAcademique} 
                  onChange={handleChange} 
                  placeholder="ex: 2023-2024" 
                  required 
                />
              </div>
            </div>
          </section>

          {/* SECTION 3: Pièces Justificatives */}
          <section className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className="material-symbols-outlined">description</span>
              <h3>Pièces Justificatives</h3>
            </div>
            
            {/* Input masqué */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".pdf,.jpeg,.jpg,.png" 
              style={{ display: 'none' }} 
            />

            <div className={styles.uploadArea}>
              <span className={`material-symbols-outlined ${styles.uploadIcon}`}>cloud_upload</span>
              <p className={styles.uploadMainText}>Glissez-déposez le scan du diplôme (PDF, JPEG)</p>
              <p className={styles.uploadSubText}>Taille maximale autorisée : 10 Mo par fichier</p>
              <button type="button" className={styles.browseBtn} onClick={handleBrowseClick}>
                Parcourir les fichiers
              </button>
            </div>
            
            {/* Aperçu dynamique du fichier sélectionné */}
            {selectedFile && (
              <div className={styles.fileListPreview}>
                <div className={styles.fileCard}>
                  <div className={styles.fileIconBox}>
                    <span className="material-symbols-outlined">
                      {selectedFile.type.includes('pdf') ? 'picture_as_pdf' : 'image'}
                    </span>
                  </div>
                  <div className={styles.fileDetails}>
                    <p className={styles.fileName}>{selectedFile.name}</p>
                    <p className={styles.fileStatus}>
                      <span className={styles.statusDot}></span> 
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Prêt pour injection
                    </p>
                  </div>
                  <button type="button" className={styles.deleteFileBtn} onClick={handleRemoveFile}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Zone d'actions inférieure */}
          <footer className={styles.formFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              <span className="material-symbols-outlined">cancel</span>
              Annuler la saisie
            </button>
            <div className={styles.footerRight}>
              <p className={styles.legalNotice}>
                En soumettant, vous certifiez l'exactitude des données vis-à-vis du registre institutionnel.
              </p>
              <button type="submit" className={styles.submitBtn}>
                Soumettre le Dossier
                <span className="material-symbols-outlined">check_circle</span>
              </button>
            </div>
          </footer>
        </form>

      </div>
    </div>
  );
}