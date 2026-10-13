import React, { useState } from 'react';
import type { MatchOffer } from '../../types/api';
import { EmptyState } from '../../components/feedback/EmptyState';
import { STATUSES } from '../../lib/constants';
import { daysAgo, isFresh, scoreClass, srcLabel } from '../../lib/format';
import { isPaid } from '../../lib/paid';
import {
  Search,
  Zap,
  GraduationCap,
  Coins,
  Building2,
  MapPin,
  ChevronRight,
} from 'lucide-react';

interface OfferCardGridProps {
  offers: MatchOffer[];
  onSelect: (offer: MatchOffer) => void;
  onResetFilters?: () => void;
}

export function OfferCardGrid({
  offers,
  onSelect,
  onResetFilters,
}: OfferCardGridProps) {
  const [pageSize, setPageSize] = useState<number>(12);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const totalPages = Math.max(1, Math.ceil(offers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const startIndex = (safePage - 1) * pageSize;
  const currentOffers = offers.slice(startIndex, startIndex + pageSize);

  function handlePageChange(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 200, behavior: 'smooth' });
    }
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setCurrentPage(1);
  }

  if (offers.length === 0) {
    return (
      <EmptyState
        icon={<Search className="w-8 h-8 text-slate-400" />}
        title="Aucune offre trouvée"
        description="Essayez d'assouplir vos critères ou de réinitialiser vos filtres."
        action={
          onResetFilters
            ? {
                label: 'Réinitialiser les filtres',
                onClick: onResetFilters,
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-4 mb-8">
      {/* Top Count & Controls Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div>
          <span className="font-bold text-slate-900">{offers.length}</span> offre
          {offers.length > 1 ? 's' : ''} disponible{offers.length > 1 ? 's' : ''}
        </div>

        <div className="flex items-center gap-1.5">
          <span>Cartes par page :</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="px-2 py-1 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none"
          >
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={36}>36</option>
            <option value={48}>48</option>
          </select>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentOffers.map((offer) => {
          const statusInfo = offer.app_status ? STATUSES[offer.app_status] : null;
          const paid = isPaid(offer);
          const fresh = isFresh(offer.first_seen);
          const matchedSkills = (offer.matched || []).slice(0, 4);

          return (
            <div
              key={offer.id}
              onClick={() => onSelect(offer)}
              className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-400/80 hover:shadow-md transition-all duration-200 cursor-pointer p-4 sm:p-5 flex flex-col justify-between select-none relative overflow-hidden"
            >
              {/* Top Row: Score + Badges */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  {/* Score Pill */}
                  <div
                    className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 shadow-2xs ${scoreClass(
                      offer.score
                    )}`}
                  >
                    <span>{offer.score}%</span>
                    <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider">
                      match
                    </span>
                  </div>

                  {/* Feature Pills */}
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {fresh && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-100 text-blue-700 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-blue-600" />
                        <span>Nouveau</span>
                      </span>
                    )}
                    {offer.is_pfe && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-100 text-purple-700 flex items-center gap-1">
                        <GraduationCap className="w-3 h-3 text-purple-600" />
                        <span>PFE</span>
                      </span>
                    )}
                    {paid && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                        <Coins className="w-3 h-3 text-emerald-600" />
                        <span>Rémunéré</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Offer Title & Company */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-2 leading-snug">
                    {offer.title}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mt-1.5 truncate">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800 truncate">
                      {offer.company || 'Entreprise non précisée'}
                    </span>
                  </div>

                  {/* Location & Modality */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{offer.city || 'Maroc'}</span>
                    </span>
                    {offer.modality && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium text-slate-600">
                          {offer.modality}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Matched Skills / Keywords Chips */}
                {matchedSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {matchedSkills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold"
                      >
                        {skill}
                      </span>
                    ))}
                    {(offer.matched || []).length > 4 && (
                      <span className="px-1.5 py-0.5 text-slate-400 text-[10px] font-medium">
                        +{offer.matched.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Row: Source, Date, and Status */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <span className="font-medium text-slate-500">
                    {srcLabel(offer.source)}
                  </span>
                  <span>•</span>
                  <span>{daysAgo(offer.date_posted || offer.first_seen)}</span>
                </div>

                {statusInfo ? (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.cls}`}
                  >
                    {statusInfo.label}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                    <span>Voir l'offre</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="text-xs text-slate-500">
            <span className="font-semibold text-slate-800">{startIndex + 1}</span>-
            <span className="font-semibold text-slate-800">
              {Math.min(startIndex + pageSize, offers.length)}
            </span>{' '}
            sur <span className="font-semibold text-slate-800">{offers.length}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(safePage - 1)}
              disabled={safePage === 1}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
            >
              Précédent
            </button>

            <div className="flex items-center gap-1 mx-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-0.5 text-xs text-slate-400">...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(p)}
                      className={`w-7 h-7 text-xs rounded-lg font-bold transition ${
                        p === safePage
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}
            </div>

            <button
              onClick={() => handlePageChange(safePage + 1)}
              disabled={safePage === totalPages}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
