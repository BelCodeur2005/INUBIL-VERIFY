import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Importation des Layouts et pages existantes
import AuthLayout from './shared/layouts/auth-layout/AuthLayout';
import AppLayout from './shared/layouts/app-layout/AppLayout';
import Login from './features/auth/login/Login';
import ForgotPassword from "./features/auth/forgot-password/ForgotPassword";
import ResetPassword from './features/auth/reset-password/ResetPassword';
import DashboardEtablissement from './features/universite/dashboard/DashboardEtablissement'; 
import LandingPage from './features/Landing-Page/landingPage';
import VerificationPublique from './features/Public/VerificationPublique';
import Verification from './features/Public/Verification';
import PartageDocument from './features/Public/PartageDocument';
import DashboardEtudiant from './features/Etudiant/DashboardEtudiant';
import DashboardDirecteur from './features/DashboardDirecteur/DashboardDirecteur';
import AdminInubil from './features/AdminInubil/AdminInubil';
import RegistreLocal from './features/RegistreLocal/RegistreLocal';
import Revocations from './features/ListeRevocations_Agent/ListeRevocations_Agent';
import Parametres_Agent from './features/Parametres_Agent/Parametres_Agent';
import Support_Agent from './features/Support_Agent/Support';
import JournalActivites from './features/JournalActivites/JournalActivites';
import MonComptePage from './features/universite/mon-compte/MonComptePage';
import EmissionDiplome from './shared/components/EmissionDiplome/EmissionDiplome';
import FicheEtudiant from './shared/components/FicheEtudiant/FicheEtudiant';
import MonCompte from './shared/components/MonCompte/MonCompte';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/*1. LES PAGES D'AUTHENTIFICATION */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>
        

        {/*2. L'ESPACE UNIVERSITÉ */}
        <Route path="/universite" element={<AppLayout />}>
          <Route index element={<DashboardEtablissement />} />
          <Route path="ajout" element={<EmissionDiplome />} />
          <Route path="etudiants" element={<FicheEtudiant />} />
          <Route path="registre" element={<RegistreLocal />} />
          <Route path="revocations" element={<Revocations />} />
          <Route path="parametres" element={<Parametres_Agent />} />
          <Route path="support" element={<Support_Agent />} />
          <Route path="journal" element={<JournalActivites />} />
          <Route path="mon-compte" element={<MonComptePage />} />

        </Route>

      

        {/* 3. DASHBOARD DIRECTEUR */}
        <Route path="/dashboard-directeur" element={<DashboardDirecteur />} />

        {/* 4. DASHBOARD ADMIN INUBIL */}
        <Route path="/admin-inubil" element={<AdminInubil />} />

        {/* Vérification publique — formulaire upload/hash + résultat par lien/QR (GET /verify/:identifiant) */}
        <Route path="/verification-publique" element={<VerificationPublique />} />
        <Route path="/d/:identifiant" element={<Verification />} />
        <Route path="/partage/:token" element={<PartageDocument />} />
        <Route path="/dashboard-etudiant" element={<DashboardEtudiant />} />
        <Route path="/mon-compte" element={<MonCompte />} />



        <Route path="/" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}