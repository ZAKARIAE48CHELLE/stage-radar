import React, { useEffect, useState } from 'react';
import type { MatchOffer } from '../../types/api';
import type { ApplicationStatus } from '../../lib/constants';
import { AXIS_COLORS, STATUSES } from '../../lib/constants';
import { daysAgo, formatDate, formatDateTime, scoreClass, srcLabel, toDatetimeLocal } from '../../lib/format';
import { isPaid } from '../../lib/paid';
import { useAuth } from '../auth/AuthProvider';
import { useOfferDetail } from './api';
import { useDeleteApplication, useSaveOfferApplication } from '../applications/api';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/feedback/Spinner';
import { supabase } from '../../lib/supabase';
import { Coins, FileText, Calendar } from 'lucide-react';

interface OfferModalProps {
  offer: MatchOffer | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OfferModal({ offer, isOpen, onClose }: OfferModalProps) {
  const { user, profile } = useAuth();
  const { data: offerDetail, isLoading: isLoadingDetail } = useOfferDetail(offer ? offer.id : null);

  const [status, setStatus] = useState<ApplicationStatus | ''>('');
  const [appliedAt, setAppliedAt] = useState<string>('');
  const [interviewAt, setInterviewAt] = useState<string>('');
  const [interviewType, setInterviewType] = useState<'visio' | 'presentiel' | 'telephone'>('visio');
  const [interviewNotes, setInterviewNotes] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [letter, setLetter] = useState<string>('');
  const [copyFeedback, setCopyFeedback] = useState<string>('');
  const [loadingApp, setLoadingApp] = useState<boolean>(false);
  const [hasExistingApp, setHasExistingApp] = useState<boolean>(false);

  const saveOfferApp = useSaveOfferApplication();
  const deleteApp = useDeleteApplication();

  // Load existing application if present
  useEffect(() => {
    if (!offer || !user) return;
    let isMounted = true;
    setLoadingApp(true);

    supabase
      .from('applications')
      .select('*')
      .eq('offer_id', offer.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!isMounted) return;
        if (data) {
          setHasExistingApp(true);
          setStatus(data.status as ApplicationStatus);
          setAppliedAt(data.applied_at ? String(data.applied_at).slice(0, 10) : '');
          setInterviewAt(data.interview_at ? toDatetimeLocal(data.interview_at) : '');
          setInterviewType(data.interview_type || 'visio');
          setInterviewNotes(data.interview_notes || '');
          setNotes(data.notes || '');
          setLetter(data.letter || '');
        } else {
          setHasExistingApp(false);
          setStatus(offer.app_status || '');
          setAppliedAt('');
          setInterviewAt('');
          setInterviewType('visio');
          setInterviewNotes('');
          setNotes('');
          setLetter('');
        }
        setLoadingApp(false);
      });

    return () => {
      isMounted = false;
    };
  }, [offer, user]);

  if (!offer) return null;

  const hits = offer.axis_hits || {};
  const maxHit = Math.max(1, ...Object.values(hits));
  const desc = offerDetail?.description || '';
  const paid = isPaid(offerDetail || offer, desc);

  function handleStatusChange(newStatus: ApplicationStatus | '') {
    setStatus(newStatus);
    if (['envoyee', 'relance', 'entretien'].includes(newStatus) && !appliedAt) {
      setAppliedAt(new Date().toISOString().slice(0, 10));
    }
  }

  function handleGenerateLetter() {
    if (!profile) return;
    if (letter.trim() && !window.confirm('Remplacer la lettre actuelle par un nouveau brouillon ?')) {
      return;
    }
    const kws = (offer?.matched || []).slice(0, 4);
    const kwText =
      kws.length > 1
        ? kws.slice(0, -1).join(', ') + ' et ' + kws[kws.length - 1]
        : kws[0] || '';
    const who =
      profile.headline ||
      (profile.school ? `étudiant(e) à ${profile.school}` : 'étudiant(e) ingénieur(e)');

    const draft = [
      `Objet : Candidature — ${offer?.title}`,
      '',
      'Madame, Monsieur,',
      '',
      `Actuellement ${who}, je vous adresse ma candidature pour l’offre « ${offer?.title} »${
        offer?.company ? ` au sein de ${offer.company}` : ''
      }${offer?.city ? ` à ${offer.city}` : ''}.`,
      '',
      profile.pitch ||
        '[Présentez ici en 2-3 phrases vos projets ou expériences les plus proches de l’offre.]',
      '',
      kwText
        ? `Votre offre met l’accent sur ${kwText} : ce sont des compétences que j’ai mises en pratique dans mes projets et que je serais heureux(se) de mettre au service de vos équipes.`
        : 'Les missions décrites correspondent à mon projet professionnel et aux compétences que je développe.',
      '',
      `Disponible pour ${
        offer?.is_pfe || profile.wants_pfe ? 'un stage de fin d’études (PFE)' : 'un stage'
      }, je me tiens à votre disposition pour un entretien.`,
      '',
      'Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.',
      '',
      profile.full_name || '',
      profile.email || '',
    ].join('\n');

    setLetter(draft);
  }

  async function handleCopyLetter() {
    try {
      await navigator.clipboard.writeText(letter);
      setCopyFeedback('Copiée !');
      setTimeout(() => setCopyFeedback(''), 2000);
    } catch {
      setCopyFeedback('Erreur copie');
    }
  }

  async function handleOpenCv() {
    if (!profile?.cv_path) return;
    try {
      const { data, error } = await supabase.storage.from('cvs').createSignedUrl(profile.cv_path, 120);
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener');
      }
    } catch (err: unknown) {
      alert((err as Error).message || 'Impossible d’ouvrir le CV.');
    }
  }

  async function handleSaveApp(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !offer) return;

    let targetStatus: ApplicationStatus = status as ApplicationStatus;
    if (!targetStatus) {
      if (!hasExistingApp && !interviewAt) {
        onClose();
        return;
      }
      targetStatus = interviewAt ? 'entretien' : 'a_postuler';
    } else if (interviewAt && ['a_postuler', 'envoyee', 'relance'].includes(targetStatus)) {
      targetStatus = 'entretien';
    }

    await saveOfferApp.mutateAsync({
      offerId: offer.id,
      userId: user.id,
      status: targetStatus,
      appliedAt: appliedAt || null,
      notes,
      letter,
      interviewAt: interviewAt ? new Date(interviewAt).toISOString() : null,
      interviewType,
      interviewNotes,
    });

    onClose();
  }

  async function handleUntrack() {
    if (!user || !offer) return;
    await deleteApp.mutateAsync({ offerId: offer.id, userId: user.id });
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-4xl"
      title={
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${scoreClass(offer.score)}`}>
            Score {offer.score}%
          </span>
          <span className="font-bold text-slate-900 text-base">{offer.title}</span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Header badges and meta */}
        <div className="pb-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {offer.is_pfe && (
              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold">PFE</span>
            )}
            {paid && (
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" />
                <span>RÉMUNÉRÉ</span>
              </span>
            )}
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
              {srcLabel(offer.source)}
            </span>
            <span className="text-slate-400">|</span>
            <span className="font-semibold text-slate-700">{offer.company || 'Entreprise non précisée'}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">
              {[offer.city, offer.modality].filter(Boolean).join(' · ') || 'Maroc'}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-400">publiée {daysAgo(offer.date_posted || offer.first_seen)}</span>
            {offer.valid_through && (
              <span className="text-amber-600 font-medium">• expire le {formatDate(offer.valid_through)}</span>
            )}
          </div>

          <a
            href={offer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
          >
            Postuler sur {srcLabel(offer.source)} ↗
          </a>
        </div>

        {/* Body grid: 3 cols left (info & desc), 2 cols right (application form) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-1">
          {/* Left: Offer details */}
          <div className="md:col-span-7 space-y-4 text-xs">
            {/* Axis matches */}
            {Object.keys(hits).length > 0 && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <h4 className="font-bold text-slate-800 mb-2">Correspondance avec vos axes</h4>
                <div className="space-y-1.5">
                  {Object.entries(hits).map(([k, v], i) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="w-36 truncate text-slate-600 text-[11px] font-medium">{k}</span>
                      <div className="flex-1 h-2 rounded bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded transition-all duration-300"
                          style={{
                            width: `${Math.round((100 * v) / maxHit)}%`,
                            backgroundColor: AXIS_COLORS[i % AXIS_COLORS.length],
                          }}
                        />
                      </div>
                      <span className="w-5 text-right font-bold text-slate-700">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matched keywords */}
            {offer.matched && offer.matched.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-800 mb-1.5">Vos compétences repérées</h4>
                <div className="flex flex-wrap gap-1.5">
                  {offer.matched.map((k) => (
                    <span
                      key={k}
                      className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px]"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h4 className="font-bold text-slate-800 mb-1.5">Description de l'offre</h4>
              {isLoadingDetail ? (
                <Spinner className="w-5 h-5 text-blue-600" text="Chargement des détails de l'offre..." />
              ) : (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-600 leading-relaxed max-h-72 overflow-y-auto whitespace-pre-line text-xs font-sans">
                  {desc || "Description non disponible. Cliquez sur 'Postuler' pour consulter l'offre originale."}
                </div>
              )}
            </div>
          </div>

          {/* Right: Application form */}
          <form
            onSubmit={handleSaveApp}
            className="md:col-span-5 bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3.5 self-start text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <h4 className="font-bold text-slate-900 text-sm">Ma candidature</h4>
              {profile?.cv_path ? (
                <button
                  type="button"
                  onClick={handleOpenCv}
                  className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
                >
                  <span>Voir mon CV</span>
                  <FileText className="w-3.5 h-3.5" />
                </button>
              ) : (
                <a href="/profil" className="text-slate-400 hover:underline">
                  + Ajouter mon CV
                </a>
              )}
            </div>

            {loadingApp ? (
              <Spinner className="w-5 h-5 text-blue-600" text="Chargement candidature..." />
            ) : (
              <>
                {/* Status select */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Statut</label>
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value as ApplicationStatus | '')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">— Non suivie —</option>
                    {Object.entries(STATUSES).map(([id, info]) => (
                      <option key={id} value={id}>
                        {info.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Applied at date */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date d'envoi</label>
                  <input
                    type="date"
                    value={appliedAt}
                    onChange={(e) => setAppliedAt(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Interview Section */}
                <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-950 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Entretien & Planning</span>
                    </span>
                    {interviewAt && (
                      <span className="text-[10px] text-amber-900 font-bold">
                        {formatDateTime(interviewAt)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-600 text-[11px] mb-0.5">
                        Date & heure
                      </label>
                      <input
                        type="datetime-local"
                        value={interviewAt}
                        onChange={(e) => setInterviewAt(e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 text-[11px] mb-0.5">Format</label>
                      <select
                        value={interviewType}
                        onChange={(e) =>
                          setInterviewType(e.target.value as 'visio' | 'presentiel' | 'telephone')
                        }
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                      >
                        <option value="visio">Visio</option>
                        <option value="presentiel">Présentiel</option>
                        <option value="telephone">Téléphone</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 text-[11px] mb-0.5">
                      Notes / Lien visio
                    </label>
                    <input
                      type="text"
                      value={interviewNotes}
                      onChange={(e) => setInterviewNotes(e.target.value)}
                      placeholder="Lien Meet/Teams, contact..."
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs"
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
                    placeholder="Contact RH, relance prévue..."
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Cover letter */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Lettre de motivation</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateLetter}
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        Générer
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyLetter}
                        className="text-slate-500 hover:underline"
                      >
                        {copyFeedback || 'Copier'}
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={letter}
                    onChange={(e) => setLetter(e.target.value)}
                    placeholder="Cliquez sur « Générer » pour un brouillon personnalisé..."
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={saveOfferApp.isPending}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-sm text-xs disabled:opacity-50"
                  >
                    {saveOfferApp.isPending ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  {hasExistingApp && (
                    <button
                      type="button"
                      onClick={handleUntrack}
                      disabled={deleteApp.isPending}
                      className="px-3 py-2 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 rounded-xl font-semibold text-slate-600 text-xs transition"
                    >
                      Retirer
                    </button>
                  )}
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </Modal>
  );
}
