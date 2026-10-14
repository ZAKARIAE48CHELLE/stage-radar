import React, { useEffect, useState } from 'react';
import type { ApplicationItem } from '../../types/api';
import type { ApplicationStatus } from '../../lib/constants';
import { CITIES, STATUSES } from '../../lib/constants';
import { toDatetimeLocal } from '../../lib/format';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../auth/AuthProvider';
import { useDeleteApplication, useSaveExternalApp } from './api';
import { Plus, Edit3, Calendar } from 'lucide-react';

interface ExternalAppModalProps {
  app: ApplicationItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ExternalAppModal({ app, isOpen, onClose }: ExternalAppModalProps) {
  const { user } = useAuth();
  const saveExternal = useSaveExternalApp();
  const deleteApp = useDeleteApplication();

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [city, setCity] = useState('');
  const [url, setUrl] = useState('');
  const [source, setSource] = useState('externe');
  const [status, setStatus] = useState<ApplicationStatus>('a_postuler');
  const [extDate, setExtDate] = useState('');
  const [notes, setNotes] = useState('');
  const [letter, setLetter] = useState('');
  const [interviewAt, setInterviewAt] = useState('');
  const [interviewType, setInterviewType] = useState<'visio' | 'presentiel' | 'telephone'>('visio');
  const [interviewNotes, setInterviewNotes] = useState('');

  useEffect(() => {
    if (app) {
      setTitle(app.title || '');
      setCompany(app.company || '');
      setCity(app.city || '');
      setUrl(app.url || '');
      setSource(app.source || 'externe');
      setStatus(app.status || 'a_postuler');
      setExtDate(app.ext_date ? String(app.ext_date).slice(0, 10) : (app.applied_at ? String(app.applied_at).slice(0, 10) : ''));
      setNotes(app.notes || '');
      setLetter(app.letter || '');
      setInterviewAt(app.interview_at ? toDatetimeLocal(app.interview_at) : '');
      setInterviewType(app.interview_type || 'visio');
      setInterviewNotes(app.interview_notes || '');
    } else {
      setTitle('');
      setCompany('');
      setCity('');
      setUrl('');
      setSource('externe');
      setStatus('a_postuler');
      setExtDate(new Date().toISOString().slice(0, 10));
      setNotes('');
      setLetter('');
      setInterviewAt('');
      setInterviewType('visio');
      setInterviewNotes('');
    }
  }, [app, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !title.trim() || !company.trim()) return;

    let targetStatus = status;
    if (interviewAt && ['a_postuler', 'envoyee', 'relance'].includes(targetStatus)) {
      targetStatus = 'entretien';
    }

    await saveExternal.mutateAsync({
      id: app ? app.app_id : undefined,
      userId: user.id,
      title: title.trim(),
      company: company.trim(),
      city: city.trim() || undefined,
      url: url.trim() || undefined,
      source: source.trim() || 'externe',
      status: targetStatus,
      extDate: extDate || null,
      notes,
      letter,
      interviewAt: interviewAt ? new Date(interviewAt).toISOString() : null,
      interviewType,
      interviewNotes,
    });

    onClose();
  }

  async function handleDelete() {
    if (!app || !window.confirm('Supprimer cette candidature externe ?')) return;
    await deleteApp.mutateAsync({ appId: app.app_id });
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {app ? <Edit3 className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
          <span>{app ? 'Modifier la candidature externe' : 'Ajouter une candidature externe'}</span>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Row: Title & Company */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Intitulé du poste / stage <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Stage PFE Data Engineer"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Entreprise <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Ex: Capgemini, OCP, Startup..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Row: City & Source */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ville</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex: Casablanca, Paris, À distance..."
              list="external-cities-list"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <datalist id="external-cities-list">
              {CITIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Source de l'annonce</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Ex: LinkedIn, Indeed, Site carrière..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Row: URL / Reference */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Lien de l'offre ou de l'annonce</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://... ou référence de l'annonce"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Row: Status & Applied Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Statut du suivi</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
            >
              {Object.entries(STATUSES).map(([id, info]) => (
                <option key={id} value={id}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Date d'envoi / postulation</label>
            <input
              type="date"
              value={extDate}
              onChange={(e) => setExtDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Interview Section */}
        <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/90 space-y-2">
          <div className="font-bold text-amber-950 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Planification d'entretien</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-600 text-[11px] mb-0.5">Date et heure</label>
              <input
                type="datetime-local"
                value={interviewAt}
                onChange={(e) => setInterviewAt(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 text-[11px] mb-0.5">Format</label>
              <select
                value={interviewType}
                onChange={(e) => setInterviewType(e.target.value as 'visio' | 'presentiel' | 'telephone')}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
              >
                <option value="visio">Visioconférence</option>
                <option value="presentiel">Présentiel</option>
                <option value="telephone">Téléphone</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 text-[11px] mb-0.5">Notes d'entretien / Lien visio</label>
            <input
              type="text"
              value={interviewNotes}
              onChange={(e) => setInterviewNotes(e.target.value)}
              placeholder="Lien Meet/Teams, contact RH..."
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Notes personnelles</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contacts, retours, relances prévues..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {app ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteApp.isPending}
              className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 font-semibold transition"
            >
              Supprimer
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-semibold transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saveExternal.isPending}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-sm disabled:opacity-50"
            >
              {saveExternal.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
