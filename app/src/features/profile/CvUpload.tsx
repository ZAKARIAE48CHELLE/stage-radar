import React, { useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useDeleteCv, useUploadCv } from './api';
import { Check } from 'lucide-react';

interface CvUploadProps {
  userId: string;
  cvPath: string | null;
}

export function CvUpload({ userId, cvPath }: CvUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const uploadMutation = useUploadCv();
  const deleteMutation = useDeleteCv();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');

    try {
      await uploadMutation.mutateAsync({ userId, file });
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Erreur lors de l’envoi du CV.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleOpenCv() {
    if (!cvPath) return;
    try {
      const { data, error } = await supabase.storage.from('cvs').createSignedUrl(cvPath, 120);
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener');
      }
    } catch (err: unknown) {
      alert((err as Error).message || 'Impossible d’ouvrir le CV.');
    }
  }

  async function handleDeleteCv() {
    if (!cvPath || !window.confirm('Supprimer votre CV ?')) return;
    setErrorMsg('');
    try {
      await deleteMutation.mutateAsync({ userId, cvPath });
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Erreur lors de la suppression.');
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
      <h2 className="text-base font-bold text-slate-900">Curriculum Vitae (CV)</h2>
      <p className="text-xs text-slate-500">
        Format PDF uniquement, 5 Mo maximum. Stocké de manière sécurisée et privée : vous seul pouvez y accéder.
      </p>

      {errorMsg && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <span className="text-xs font-semibold text-slate-700">
          {uploadMutation.isPending ? (
            <span className="text-blue-600 animate-pulse">Envoi en cours...</span>
          ) : cvPath ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
              <Check className="w-3.5 h-3.5" />
              <span>CV enregistré</span>
            </span>
          ) : (
            'Aucun CV enregistré'
          )}
        </span>

        <label className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs">
          Choisir un PDF
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {cvPath && (
          <>
            <button
              type="button"
              onClick={handleOpenCv}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Ouvrir le CV ↗
            </button>
            <button
              type="button"
              onClick={handleDeleteCv}
              disabled={deleteMutation.isPending}
              className="text-xs text-rose-600 hover:underline font-semibold"
            >
              Supprimer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
