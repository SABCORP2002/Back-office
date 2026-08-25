import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth } from './components/RequireAuth';
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/transactions" element={<RequireAuth><TransactionsPage /></RequireAuth>} />
        <Route path="/utilisateurs" element={<RequireAuth><UtilisateursPage /></RequireAuth>} />
        <Route path="/kyc" element={<RequireAuth><KycPage /></RequireAuth>} />
        <Route path="/fournisseurs" element={<RequireAuth><FournisseursPage /></RequireAuth>} />
        <Route path="/taux-marges" element={<RequireAuth><TauxMargesPage /></RequireAuth>} />
        <Route path="/pays-paiements" element={<RequireAuth><PaysPaiementsPage /></RequireAuth>} />
        <Route path="/support" element={<RequireAuth><SupportPage /></RequireAuth>} />
        <Route path="/finance" element={<RequireAuth><FinancePage /></RequireAuth>} />
        <Route path="/parametres" element={<RequireAuth><ParametresPage /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  );
}
