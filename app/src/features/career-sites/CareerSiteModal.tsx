import React, { useEffect, useState } from 'react';
import type { CareerSite } from '../../types/db';
import { CAREER_CATEGORIES, useDeleteCareerSite, useSaveCareerSite } from './api';
import { useAuth } from '../auth/AuthProvider';
import { Modal } from '../../components/ui/Modal';

interface CareerSiteModalProps {
  site: CareerSite | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CareerSiteModal({ site, isOpen, onClose }: CareerSiteModalProps) {
  const { user } = useAuth();
  const saveMutation = useSaveCareerSite();
  const deleteMutation = useDeleteCareerSite();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('Tech & Conseil');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (site) {
      setName(site.name || '');
      setUrl(site.url || '');
      setCategory(site.category || 'Tech & Conseil');
      setNotes(site.notes || '');
    } else {
      setName('');
      setUrl('');
      setCategory('Tech & Conseil');
      setNotes('');
    }
  }, [site, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim() || !url.trim()) return;

    await saveMutation.mutateAsync({
      id: site ? site.id : undefined,
      userId: user.id,
      name: name.trim(),
      url: url.trim(),
      category,
      notes,
    });

    onClose();
  }

  async function handleDelete() {
    if (!user || !site || !window.confirm('Supprimer ce site carrière ?')) return;
    await deleteMutation.mutateAsync({ id: site.id, userId: user.id });
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>{site ? '✏️ Modifier le site carrière' : '➕ Ajouter un site carrière'}</span>
        </div>
      }
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Nom de l'entreprise ou plateforme <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: OCP Group, Capgemini, Attijariwafa..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            URL directe du portail de recrutement <span className="text-rose-500">*</span>
          </label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Secteur / Catégorie</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
          >
            {CAREER_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Notes ou conseils de candidature</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Périodes de stage PFE, processus de sélection, contacts RH..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {site ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
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
              disabled={saveMutation.isPending}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-sm disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
