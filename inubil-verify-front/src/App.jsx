import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importation des Layouts et pages existantes
import AuthLayout from './shared/layouts/auth-layout/AuthLayout';
import AppLayout from './shared/layouts/app-layout/AppLayout';
import Login from './features/auth/login/Login';
import ForgotPassword from "./features/auth/forgot-password/ForgotPassword";
import ResetPassword from './features/auth/reset-password/ResetPassword';
import DashboardEtablissement from './features/universite/dashboard/DashboardEtablissement'; 
import VerificationPublique from './features/Public/VerificationPublique';
import Revoque from './features/Public/Revoque';
import Valide from './features/Public/Valide';
import DashboardEtudiant from './features/Etudiant/DashboardEtudiant';
import DashboardDirecteur from './features/DashboardDirecteur/DashboardDirecteur';
import AdminInubil from './features/AdminInubil/AdminInubil';
import RegistreLocal from './features/RegistreLocal/RegistreLocal';
import Revocations from './features/ListeRevocations_Agent/ListeRevocations_Agent';
import Parametres_Agent from './features/Parametres_Agent/Parametres_Agent';
import Support_Agent from './features/Support_Agent/Support';
import JournalActivites from './features/JournalActivites/JournalActivites';

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
          <Route path="registre" element={<RegistreLocal />} />
          <Route path="revocations" element={<Revocations />} />
          <Route path="parametres" element={<Parametres_Agent />} />
          <Route path="support" element={<Support_Agent />} />
          <Route path="journal" element={<JournalActivites />} />
          
        </Route>

      

        {/* 3. DASHBOARD DIRECTEUR */}
        <Route path="/dashboard-directeur" element={<DashboardDirecteur />} />

        {/* 4. DASHBOARD ADMIN INUBIL */}
        <Route path="/admin-inubil" element={<AdminInubil />} />

        {/* Route isolée pour accéder directement à la vérification publique    */}
        <Route path="/verification-publique" element={<VerificationPublique />} /> {/* http://localhost:5173/verification-publique */}
        <Route path="/revoque" element={<Revoque />} />  {/*http://localhost:5173/verification-publique */}
        <Route path="/valide" element={<Valide />} />    {/* http://localhost:5173/valide*/}
        <Route path="/dashboard-etudiant" element={<DashboardEtudiant />} />


        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}