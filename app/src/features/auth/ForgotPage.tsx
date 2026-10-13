import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function ForgotPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        setError(error.message);
      } else {
        setSent(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-extrabold text-lg shadow-md">
            SR
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Mot de passe oublié</h1>
          <p className="text-sm text-slate-500">Recevez un lien par e-mail pour réinitialiser votre accès.</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="text-4xl">📬</div>
              <h2 className="text-base font-bold text-slate-900">E-mail envoyé</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Si un compte existe pour <b className="text-slate-800">{email}</b>, vous recevrez un lien de réinitialisation sous quelques instants.
              </p>
              <Link
                to="/login"
                className="inline-block px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition"
              >
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Votre adresse e-mail</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="votre.email@ecole.ma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs transition shadow-sm"
                >
                  {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
                </button>
              </form>

              <div className="pt-2 border-t border-slate-100 text-center text-xs text-slate-500">
                <Link to="/login" className="text-blue-700 hover:underline font-bold">
                  ← Retour à la connexion
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
