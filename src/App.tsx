import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth } from './components/RequireAuth';
import { RequirePermission } from './components/RequirePermission';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import TransactionsPage from './pages/Transactions';
import UtilisateursPage from './pages/Utilisateurs';
import KycPage from './pages/Kyc';
import FournisseursPage from './pages/Fournisseurs';
import TauxMargesPage from './pages/TauxMarges';
import PaysPaiementsPage from './pages/PaysPaiements';
import SupportPage from './pages/Support';
import FinancePage from './pages/Finance';
import ParametresPage from './pages/Parametres';
import AdminUsersPage from './pages/AdminUsers';
import GrowthProgramsPage from './pages/GrowthPrograms';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><RequirePermission permission="VIEW_DASHBOARD"><DashboardPage /></RequirePermission></RequireAuth>} />
        <Route path="/transactions" element={<RequireAuth><RequirePermission permission="VIEW_TRANSACTIONS"><TransactionsPage /></RequirePermission></RequireAuth>} />
        <Route path="/utilisateurs" element={<RequireAuth><RequirePermission permission="VIEW_USERS"><UtilisateursPage /></RequirePermission></RequireAuth>} />
        <Route path="/kyc" element={<RequireAuth><RequirePermission permission="VIEW_KYC"><KycPage /></RequirePermission></RequireAuth>} />
        <Route path="/fournisseurs" element={<RequireAuth><RequirePermission permission="VIEW_PROVIDERS"><FournisseursPage /></RequirePermission></RequireAuth>} />
        <Route path="/taux-marges" element={<RequireAuth><RequirePermission permission="VIEW_PRICING"><TauxMargesPage /></RequirePermission></RequireAuth>} />
        <Route path="/pays-paiements" element={<RequireAuth><RequirePermission permission="VIEW_COUNTRIES_PAYMENTS"><PaysPaiementsPage /></RequirePermission></RequireAuth>} />
        <Route path="/croissance" element={<RequireAuth><RequirePermission permission="VIEW_GROWTH_PROGRAMS"><GrowthProgramsPage /></RequirePermission></RequireAuth>} />
        <Route path="/support" element={<RequireAuth><RequirePermission permission="VIEW_SUPPORT"><SupportPage /></RequirePermission></RequireAuth>} />
        <Route path="/finance" element={<RequireAuth><RequirePermission permission="VIEW_FINANCIAL_REPORTS"><FinancePage /></RequirePermission></RequireAuth>} />
        <Route path="/admin-utilisateurs" element={<RequireAuth><RequirePermission permission="VIEW_ADMIN_USERS"><AdminUsersPage /></RequirePermission></RequireAuth>} />
        <Route path="/parametres" element={<RequireAuth><RequirePermission permission="VIEW_PLATFORM_SETTINGS"><ParametresPage /></RequirePermission></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  );
}
