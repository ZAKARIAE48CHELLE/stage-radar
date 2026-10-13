import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { CITIES } from '../../lib/constants';
import { AxesEditor, type AxisItem } from './AxesEditor';
import { CvUpload } from './CvUpload';
import { useUpdateProfile } from './api';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export function ProfilePage() {
  const { user, profile } = useAuth();
  const updateProfile = useUpdateProfile();

  const [fullName, setFullName] = useState('');
  const [school, setSchool] = useState('');
  const [headline, setHeadline] = useState('');
  const [pitch, setPitch] = useState('');
  const [field, setField] = useState('ia_data');
  const [wantsPfe, setWantsPfe] = useState(false);
  const [preferredCities, setPreferredCities] = useState<string[]>([]);
  const [axes, setAxes] = useState<AxisItem[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setSchool(profile.school || '');
      setHeadline(profile.headline || '');
      setPitch(profile.pitch || '');
      setField(profile.field || 'ia_data');
      setWantsPfe(profile.wants_pfe || false);
      setPreferredCities(profile.preferred_cities || []);
      setAxes(profile.axes || []);
    }
  }, [profile]);

  if (!user || !profile) return null;

  function toggleCity(city: string) {
    if (preferredCities.includes(city)) {
      setPreferredCities(preferredCities.filter((c) => c !== city));
    } else {
      setPreferredCities([...preferredCities, city]);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaveSuccess(false);
    setSaveError('');

    // Validate axes labels uniqueness
    const cleanAxes = axes.map((a) => ({
      label: String(a.label || '').trim().slice(0, 60) || 'Axe',
      weight: Math.max(0, Math.min(100, Number(a.weight) || 0)),
      keywords: [
        ...new Set(
          (a.keywords || [])
            .map((k) => String(k).trim().slice(0, 60))
            .filter((k) => k.length > 1)
        ),
      ].slice(0, 60),
    }));

    const labels = cleanAxes.map((a) => a.label.toLowerCase());
    if (new Set(labels).size !== labels.length) {
      setSaveError('Deux axes ne peuvent pas avoir le même nom.');
      return;
    }

    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        patch: {
          full_name: fullName.trim(),
          school: school.trim(),
          headline: headline.trim(),
          pitch: pitch.trim(),
          field,
          wants_pfe: wantsPfe,
          preferred_cities: preferredCities,
          axes: cleanAxes,
        },
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      setSaveError((err as Error).message || 'Erreur lors de la sauvegarde du profil.');
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mon profil & préférences</h1>
        <p className="text-sm text-slate-500">
          Personnalisez vos coordonnées, votre parcours et les critères de scoring utilisés pour filtrer les offres.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-2xl flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Profil enregistré avec succès. Les scores de vos offres ont été recalculés !</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section: Identité & Études */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Informations personnelles & études
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nom complet</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={80}
                placeholder="Ex: Zakariae Chelle"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">École ou université</label>
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                maxLength={120}
                placeholder="Ex: EMSI Tanger, ENSIAS, INPT..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Titre accrocheur (utilisé dans les lettres de motivation)
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                maxLength={160}
                placeholder="Ex: élève ingénieur en IA & Big Data à l'EMSI Tanger"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Villes préférées */}
          <div className="pt-2">
            <label className="block font-semibold text-slate-700 text-xs mb-2">
              Villes préférées (+3 points de bonus par offre située dans ces villes)
            </label>
            <div className="flex flex-wrap gap-2">
              {CITIES.map((c) => {
                const isSelected = preferredCities.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCity(c)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PFE Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={wantsPfe}
                onChange={(e) => setWantsPfe(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600"
              />
              <span>Je cherche un stage de fin d'études (PFE) : +5 points aux offres PFE</span>
            </label>
          </div>
        </div>

        {/* Section: Axes & Compétences */}
        <AxesEditor
          axes={axes}
          onChange={setAxes}
          selectedField={field}
          onChangeField={setField}
        />

        {/* Section: Pitch de présentation */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-2">
          <h2 className="text-base font-bold text-slate-900">Présentation personnelle (pour les lettres)</h2>
          <p className="text-xs text-slate-500">
            2 à 4 phrases résumant vos projets, expériences ou technologies de prédilection. Elles seront insérées dans chaque brouillon de lettre de motivation.
          </p>
          <textarea
            rows={4}
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            maxLength={1500}
            placeholder="J'ai notamment conçu un système de recommandation distribué avec PySpark et déployé des modèles LLM avec LangChain..."
            className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Section: CV Upload */}
        <CvUpload userId={user.id} cvPath={profile.cv_path} />

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-sm text-sm disabled:opacity-50"
          >
            {updateProfile.isPending ? 'Enregistrement...' : 'Enregistrer mon profil'}
          </button>
        </div>
      </form>
    </div>
  );
}
