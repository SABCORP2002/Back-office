import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LogIn } from 'lucide-react';
import { login, ApiError, isPreviewMode } from '../lib/api';

/**
 * Was entirely missing — the previous scaffold had 10 pages and no login
 * route at all, despite every admin route requiring a Bearer token.
 * ADM-AUTH-001.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(isPreviewMode ? 'demo@jaltrade.com' : '');
  const [password, setPassword] = useState(isPreviewMode ? 'aperçu' : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Identifiants invalides.' : 'Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg border border-border bg-surface-low p-5 sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <img src="/jal_trade_logo_complete_final.png" alt="JAL Trade" className="h-24 w-20 object-contain object-center" />
          <div className="text-center">
            <div className="text-xl font-extrabold">
              <span className="text-primary-container">JAL</span> <span className="text-onSurface">TRADE</span>
            </div>
            <div className="text-[10px] font-semibold tracking-wide text-primary/80">BACK-OFFICE</div>
          </div>
        </div>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-onSurfaceVariant">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-11 w-full rounded-md border border-border bg-surface-higher px-3 py-2.5 text-onSurface outline-none focus:border-primary-container/60"
          />
        </label>
        <label className="mb-5 block text-sm">
          <span className="mb-1 block text-onSurfaceVariant">Mot de passe</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-11 w-full rounded-md border border-border bg-surface-higher px-3 py-2.5 text-onSurface outline-none focus:border-primary-container/60"
          />
        </label>

        {isPreviewMode && (
          <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
            Mode aperçu : données de démonstration, aucune connexion au serveur.
          </div>
        )}
        {error && <div className="mb-4 rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary-container py-2.5 text-sm font-semibold text-primary-onContainer transition hover:brightness-110 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
          {isPreviewMode ? 'Accéder à l’aperçu' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
