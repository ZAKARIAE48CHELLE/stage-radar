import React, { useEffect, useState } from 'react';
import type { ApplicationItem } from '../../types/api';
import { interviewCountdown, toDatetimeLocal } from '../../lib/format';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

interface InterviewModalProps {
  app: ApplicationItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InterviewModal({ app, isOpen, onClose }: InterviewModalProps) {
  const queryClient = useQueryClient();
  const [interviewAt, setInterviewAt] = useState<string>('');
  const [interviewType, setInterviewType] = useState<'visio' | 'presentiel' | 'telephone'>('visio');
  const [interviewNotes, setInterviewNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (app) {
      setInterviewAt(app.interview_at ? toDatetimeLocal(app.interview_at) : '');
      setInterviewType(app.interview_type || 'visio');
      setInterviewNotes(app.interview_notes || '');
    }
  }, [app]);

  if (!app) return null;

  const countdown = interviewCountdown(interviewAt ? new Date(interviewAt).toISOString() : null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!app) return;
    setIsSubmitting(true);

    try {
      const patch: Record<string, unknown> = {
        interview_at: interviewAt ? new Date(interviewAt).toISOString() : null,
        interview_type: interviewType,
        interview_notes: interviewNotes,
        updated_at: new Date().toISOString(),
      };

      if (interviewAt && ['a_postuler', 'envoyee', 'relance'].includes(app.status)) {
        patch.status = 'entretien';
      }

      const { data, error } = await supabase
        .from('applications')
        .update(patch)
        .eq('id', app.app_id)
        .select()
        .single();

      if (error) throw error;

      queryClient.setQueryData<ApplicationItem[]>(['applications'], (old = []) =>
        old.map((item) => (item.app_id === app.app_id ? { ...item, ...data } : item))
      );
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      onClose();
    } catch (err: unknown) {
      alert((err as Error).message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleClearInterview() {
    if (!app) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('applications')
        .update({
          interview_at: null,
          interview_notes: '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', app.app_id)
        .select()
        .single();

      if (error) throw error;

      queryClient.setQueryData<ApplicationItem[]>(['applications'], (old = []) =>
        old.map((item) => (item.app_id === app.app_id ? { ...item, ...data } : item))
      );
      onClose();
    } catch (err: unknown) {
      alert((err as Error).message || 'Erreur');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>🎤</span>
          <span>Planifier un entretien</span>
        </div>
      }
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSave} className="space-y-4 text-xs">
        {/* Application context */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="font-bold text-slate-800 text-sm truncate">{app.title}</div>
          <div className="text-slate-500 font-medium mt-0.5">
            {app.company} • {app.city || 'Maroc'}
          </div>
        </div>

        {/* Live Countdown badge */}
        {countdown && (
          <div className="flex items-center justify-between p-2.5 bg-amber-50 rounded-xl border border-amber-200">
            <span className="font-semibold text-amber-900">Compte à rebours :</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${countdown.cls}`}>
              {countdown.label}
            </span>
          </div>
        )}

        {/* Date and time */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Date et heure de l'entretien</label>
          <input
            type="datetime-local"
            value={interviewAt}
            onChange={(e) => setInterviewAt(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Format */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Format de l'échange</label>
          <select
            value={interviewType}
            onChange={(e) => setInterviewType(e.target.value as 'visio' | 'presentiel' | 'telephone')}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="visio">💻 Visioconférence (Google Meet, Teams, Zoom...)</option>
            <option value="presentiel">🏢 Présentiel (Dans les locaux de l'entreprise)</option>
            <option value="telephone">📞 Entretien téléphonique</option>
          </select>
        </div>

        {/* Notes / Link */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Lien de visio ou instructions RH</label>
          <textarea
            rows={3}
            value={interviewNotes}
            onChange={(e) => setInterviewNotes(e.target.value)}
            placeholder="Lien de connexion, adresse, nom de la personne à contacter..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {app.interview_at ? (
            <button
              type="button"
              onClick={handleClearInterview}
              disabled={isSubmitting}
              className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition"
            >
              Supprimer l'entretien
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
