import type { MatchOffer } from '../../types/api';
import { STATUSES } from '../../lib/constants';
import { daysAgo, formatDate, isFresh, scoreClass, srcLabel } from '../../lib/format';
import { isPaid } from '../../lib/paid';

interface OfferRowProps {
  offer: MatchOffer;
  onSelect: (offer: MatchOffer) => void;
}

export function OfferRow({ offer, onSelect }: OfferRowProps) {
  const statusInfo = offer.app_status ? STATUSES[offer.app_status] : null;
  const paid = isPaid(offer);
  const fresh = isFresh(offer.first_seen);

  return (
    <tr
      onClick={() => onSelect(offer)}
      className="group hover:bg-slate-50/80 transition-colors cursor-pointer border-b border-slate-100 last:border-b-0"
    >
      {/* Score */}
      <td className="py-3.5 pl-4 pr-3 align-middle whitespace-nowrap">
        <div
          className={`inline-flex items-center justify-center w-11 h-11 rounded-xl font-black text-sm shadow-sm ${scoreClass(
            offer.score
          )}`}
        >
          {offer.score}%
        </div>
      </td>

      {/* Title & metadata */}
      <td className="py-3.5 px-3 align-middle max-w-md">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <span className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition">
            {offer.title}
          </span>
          {fresh && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 tracking-wide">
              NOUVEAU
            </span>
          )}
          {offer.is_pfe && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
              PFE
            </span>
          )}
          {paid && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
              RÉMUNÉRÉ
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{offer.company || 'Entreprise non précisée'}</span>
          <span>•</span>
          <span>{[offer.city, offer.modality].filter(Boolean).join(' · ') || 'Maroc'}</span>
          <span>•</span>
          <span className="text-slate-400">{srcLabel(offer.source)}</span>
          {offer.also_on && offer.also_on.length > 0 && (
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
              +{offer.also_on.length} source{offer.also_on.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Matched keywords preview */}
        {offer.matched && offer.matched.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {offer.matched.slice(0, 4).map((kw, i) => (
              <span
                key={i}
                className="px-1.5 py-0.2 text-[10px] font-medium bg-slate-100 text-slate-600 rounded"
              >
                {kw}
              </span>
            ))}
            {offer.matched.length > 4 && (
              <span className="text-[10px] text-slate-400 self-center">
                +{offer.matched.length - 4}
              </span>
            )}
          </div>
        )}
      </td>

      {/* Date */}
      <td className="py-3.5 px-3 align-middle text-xs text-slate-500 whitespace-nowrap hidden sm:table-cell">
        <div>{daysAgo(offer.date_posted || offer.first_seen)}</div>
        <div className="text-[10px] text-slate-400">{formatDate(offer.date_posted || offer.first_seen)}</div>
      </td>

      {/* Application Status */}
      <td className="py-3.5 px-3 align-middle whitespace-nowrap text-right pr-4">
        {statusInfo ? (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border shadow-2xs ${statusInfo.cls}`}
          >
            {statusInfo.label}
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs text-slate-400 bg-slate-50 border border-slate-100">
            Non postulé
          </span>
        )}
      </td>
    </tr>
  );
}
