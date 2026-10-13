import { useAuth } from './AuthProvider';

export function PendingPage() {
  const { profile, isBlocked, signOut, refreshProfile } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
        <div className="text-4xl">{isBlocked ? '⛔' : '⏳'}</div>
        <h1 className="text-xl font-extrabold text-slate-900">
          {isBlocked ? 'Compte désactivé' : 'Compte en attente de validation'}
        </h1>
        <p className="text-xs text-slate-600 leading-relaxed">
          {isBlocked
            ? "Votre compte a été désactivé par l'administrateur. Contactez-le si vous pensez qu'il s'agit d'une erreur."
            : `Bonjour ${profile?.full_name || ''}, l'administrateur doit valider votre accès (${profile?.email || ''}). Revenez un peu plus tard ou contactez l'administrateur.`}
        </p>

        <div className="flex items-center justify-center gap-3 pt-3">
          <button
            type="button"
            onClick={refreshProfile}
            className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition shadow-sm"
          >
            Vérifier à nouveau
          </button>
          <button
            type="button"
            onClick={signOut}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
