import { useState } from 'react';
import { AlertTriangle, Mail, X, KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import {
  useAdminStats,
  useAdminUsers,
  useCreateInvite,
  useDeleteInvite,
  useInvites,
  useUpdateMember,
  useAdminUpdatePassword,
} from './api';
import { useAuth } from '../auth/AuthProvider';
import { Spinner } from '../../components/feedback/Spinner';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Modal } from '../../components/ui/Modal';
import { daysAgo, formatDateTime, srcLabel } from '../../lib/format';
import { FIELDS } from '../../lib/constants';
import type { AdminUserItem } from '../../types/api';

export function AdminPage() {
  const { user } = useAuth();
  const { data: users = [], isLoading: isLoadingUsers, error: usersError, refetch: refetchUsers } = useAdminUsers();
  const { data: stats, isLoading: isLoadingStats } = useAdminStats();
  const { data: invites = [] } = useInvites();

  const updateMember = useUpdateMember();
  const createInvite = useCreateInvite();
  const deleteInvite = useDeleteInvite();
  const adminUpdatePassword = useAdminUpdatePassword();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Password reset modal state
  const [passwordUser, setPasswordUser] = useState<AdminUserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  function openPasswordModal(u: AdminUserItem) {
    setPasswordUser(u);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess(false);
    setShowPassword(false);
  }

  function closePasswordModal() {
    setPasswordUser(null);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess(false);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordUser) return;
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    try {
      await adminUpdatePassword.mutateAsync({
        userId: passwordUser.id,
        newPassword,
      });
      setPasswordSuccess(true);
      setTimeout(() => {
        closePasswordModal();
      }, 1500);
    } catch (err: unknown) {
      setPasswordError((err as Error).message || 'Erreur lors de la mise à jour du mot de passe.');
    }
  }

  if (isLoadingUsers || isLoadingStats) {
    return <Spinner className="w-8 h-8 text-blue-600" text="Chargement du back-office..." />;
  }

  if (usersError) {
    return (
      <ErrorState
        title="Accès refusé ou erreur serveur"
        message={(usersError as Error).message}
        onRetry={() => refetchUsers()}
      />
    );
  }

  const run = stats?.last_run;
  const apps = stats?.apps_by_status || {};
  const sentCount = Object.entries(apps)
    .filter(([k]) => k !== 'a_postuler')
    .reduce((acc, [, n]) => acc + n, 0);

  const isRunStale = run && Date.now() - new Date(run.run_at).getTime() > 2.5 * 864e5;

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !inviteEmail.trim()) return;
    setInviteError('');

    try {
      await createInvite.mutateAsync({
        email: inviteEmail.trim(),
        invitedBy: user.id,
      });
      setInviteEmail('');
    } catch (err: unknown) {
      setInviteError((err as Error).message || 'Erreur lors de la création de l’invitation.');
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Administration & Back-office</h1>
        <p className="text-sm text-slate-500">
          Gestion des membres, suivi des invitations et état des collectes du scraper.
          (Les notes, lettres et CV des membres restent strictement privés).
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Membres validés</div>
          <div className="text-3xl font-black text-slate-900 mt-1">{stats?.users ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">comptes approuvés</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">En attente</div>
          <div className={`text-3xl font-black mt-1 ${stats?.pending ? 'text-amber-600' : 'text-slate-900'}`}>
            {stats?.pending ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {stats?.pending ? 'validation requise ci-dessous' : 'aucune demande'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Offres actives</div>
          <div className="text-3xl font-black text-emerald-700 mt-1">{stats?.offers_active ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            {Object.entries(stats?.offers_by_source || {})
              .map(([s, n]) => `${srcLabel(s)}: ${n}`)
              .join(' · ')}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Candidatures envoyées</div>
          <div className="text-3xl font-black text-blue-700 mt-1">{sentCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {apps.entretien || 0} entretien(s) · {apps.offre || 0} offre(s)
          </div>
        </div>
      </div>

      {/* Scraper Run Status */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 mb-1">Dernière collecte automatique</h2>
        {run ? (
          <div className="text-xs text-slate-600 space-y-1">
            <p>
              Exécutée le <span className="font-bold text-slate-800">{formatDateTime(run.run_at)}</span> —{' '}
              <span className="font-semibold">{run.stats?.synced ?? 0}</span> offres synchronisées,{' '}
              <span className="font-semibold text-emerald-700">+{run.stats?.new_this_run ?? 0}</span> nouvelles,{' '}
              <span className="font-semibold text-rose-600">-{run.stats?.deactivated ?? 0}</span> désactivées.
            </p>
            {isRunStale && (
              <p className="text-amber-700 font-bold bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Dernière collecte il y a plus de 2 jours : vérifiez le workflow GitHub Actions.</span>
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
            Aucune collecte enregistrée. Vérifiez vos secrets GitHub Actions (SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY).
          </p>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Membres inscrits ({users.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 pl-6 pr-3">Membre</th>
                <th className="py-3 px-3">École & Domaine</th>
                <th className="py-3 px-3">Statut</th>
                <th className="py-3 px-3 text-center">Suivies</th>
                <th className="py-3 px-3 text-center">Envoyées</th>
                <th className="py-3 px-3 text-center">Entretiens</th>
                <th className="py-3 px-3">Activité</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isMe = u.id === user?.id;
                const fieldLabel = FIELDS[u.field]?.label || u.field || '—';

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 pl-6 pr-3 align-middle">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <span>{u.full_name || '—'}</span>
                        {u.role === 'admin' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-900 text-white font-bold">
                            admin
                          </span>
                        )}
                        {isMe && <span className="text-slate-400 font-normal text-[10px]">(vous)</span>}
                      </div>
                      <div className="text-slate-500 font-mono text-[11px]">{u.email}</div>
                    </td>

                    <td className="py-3 px-3 align-middle">
                      <div className="font-semibold text-slate-700">{u.school || '—'}</div>
                      <div className="text-[10px] text-slate-400">{fieldLabel}</div>
                    </td>

                    <td className="py-3 px-3 align-middle whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          u.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : u.status === 'pending'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {u.status === 'approved' ? 'Validé' : u.status === 'pending' ? 'En attente' : 'Bloqué'}
                      </span>
                    </td>

                    <td className="py-3 px-3 align-middle text-center font-bold text-slate-700">
                      {u.n_applications}
                    </td>
                    <td className="py-3 px-3 align-middle text-center font-bold text-blue-700">
                      {u.n_sent}
                    </td>
                    <td className="py-3 px-3 align-middle text-center font-bold text-amber-700">
                      {u.n_interviews}
                    </td>

                    <td className="py-3 px-3 align-middle text-slate-500 whitespace-nowrap">
                      {daysAgo(u.last_activity)}
                    </td>

                    <td className="py-3 px-6 align-middle text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {u.status !== 'approved' && (
                          <button
                            onClick={() =>
                              updateMember.mutate({ userId: u.id, patch: { status: 'approved' } })
                            }
                            className="font-bold text-emerald-700 hover:underline"
                          >
                            Valider
                          </button>
                        )}
                        {u.status !== 'blocked' && !isMe && (
                          <button
                            onClick={() => {
                              if (window.confirm('Bloquer ce membre ? Il ne pourra plus accéder à l’application.')) {
                                updateMember.mutate({ userId: u.id, patch: { status: 'blocked' } });
                              }
                            }}
                            className="font-bold text-rose-600 hover:underline"
                          >
                            Bloquer
                          </button>
                        )}
                        {u.status === 'approved' && !isMe && (
                          <button
                            onClick={() =>
                              updateMember.mutate({
                                userId: u.id,
                                patch: { role: u.role === 'admin' ? 'user' : 'admin' },
                              })
                            }
                            className="font-bold text-slate-500 hover:underline"
                          >
                            {u.role === 'admin' ? 'Retirer admin' : 'Rendre admin'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openPasswordModal(u)}
                          className="font-bold text-amber-700 hover:text-amber-800 hover:underline inline-flex items-center gap-1"
                          title="Modifier le mot de passe"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Mot de passe</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invitations Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Invitations</h2>
          <p className="text-xs text-slate-500">
            Un e-mail pré-invité est validé automatiquement dès son inscription sans passer par l'étape "En attente".
          </p>
        </div>

        {inviteError && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {inviteError}
          </div>
        )}

        <form onSubmit={handleCreateInvite} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="ami@exemple.com"
            className="flex-1 max-w-sm px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="submit"
            disabled={createInvite.isPending}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            {createInvite.isPending ? 'Ajout...' : 'Inviter'}
          </button>
        </form>

        <div className="flex flex-wrap gap-2 pt-2">
          {invites.length === 0 ? (
            <span className="text-xs text-slate-400">Aucune invitation en attente.</span>
          ) : (
            invites.map((inv) => {
              const mailSub = encodeURIComponent('Invitation à rejoindre Stage Radar');
              const mailBody = encodeURIComponent(
                `Bonjour,\n\nJe t'ai invité(e) sur Stage Radar, notre plateforme de veille pour les stages au Maroc.\n\nTon adresse est déjà pré-approuvée. Crée directement ton compte ici :\n${window.location.origin}\n\nÀ très vite !`
              );

              return (
                <span
                  key={inv.email}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium"
                >
                  <span className="font-mono">{inv.email}</span>
                  <a
                    href={`mailto:${encodeURIComponent(inv.email)}?subject=${mailSub}&body=${mailBody}`}
                    className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Envoyer</span>
                  </a>
                  <button
                    onClick={() => deleteInvite.mutate(inv.email)}
                    className="text-slate-400 hover:text-rose-600 font-bold ml-1 flex items-center"
                    title="Retirer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              );
            })
          )}
        </div>

        {/* Copy shareable link */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <input
            type="text"
            readOnly
            value={window.location.origin}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-600 max-w-sm flex-1"
          />
          <button
            onClick={handleCopyLink}
            className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            {copiedLink ? 'Copié !' : 'Copier le lien'}
          </button>
        </div>
      </div>

      {/* Password Reset Modal */}
      <Modal
        isOpen={!!passwordUser}
        onClose={closePasswordModal}
        title={
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-600" />
            <span>Modifier le mot de passe</span>
          </div>
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
          {/* Target user info */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="font-bold text-slate-900 text-sm truncate">
              {passwordUser?.full_name || 'Sans nom'}
            </div>
            <div className="text-slate-500 font-mono text-xs mt-0.5">
              {passwordUser?.email}
            </div>
          </div>

          {passwordError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Mot de passe mis à jour avec succès !</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Au moins 6 caractères"
                required
                minLength={6}
                className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Confirmer le nouveau mot de passe
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Répétez le mot de passe"
              required
              minLength={6}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={closePasswordModal}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={adminUpdatePassword.isPending || passwordSuccess}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-sm disabled:opacity-50"
            >
              {adminUpdatePassword.isPending ? 'Mise à jour...' : 'Valider le changement'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
