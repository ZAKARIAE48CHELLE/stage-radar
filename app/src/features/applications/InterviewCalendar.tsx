import { useState } from 'react';
import type { ApplicationItem } from '../../types/api';
import { formatDate, interviewCountdown } from '../../lib/format';
import {
  Video,
  Building2,
  Phone,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react';

interface InterviewCalendarProps {
  apps: ApplicationItem[];
  allApps?: ApplicationItem[];
  onSelectInterview: (app: ApplicationItem) => void;
  onScheduleNew?: (dateStr?: string) => void;
}

function getLocalDateStr(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function InterviewCalendar({
  apps,
  allApps = apps,
  onSelectInterview,
  onScheduleNew,
}: InterviewCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

  // Scheduled interviews
  const appsWithInterviews = allApps.filter((a) => !!a.interview_at);

  // Applications in 'entretien' status but without date set yet
  const appsAwaitingDate = allApps.filter((a) => a.status === 'entretien' && !a.interview_at);

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  }
  function today() {
    setCurrentDate(new Date());
    setSelectedDay(null);
  }

  // Calculate days in month
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const totalDays = lastDayOfMonth.getDate();
  const startDay = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0

  const dayCells: Array<{ dayNumber: number; dateStr: string } | null> = [];
  for (let i = 0; i < startDay; i++) {
    dayCells.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
    dayCells.push({ dayNumber: d, dateStr });
  }

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const todayStr = getLocalDateStr(new Date().toISOString());

  // Interviews in current month
  const monthInterviews = appsWithInterviews.filter((a) => {
    if (!a.interview_at) return false;
    const d = new Date(a.interview_at);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  // Interviews for the active panel (either for selected day or for entire month)
  const activePanelInterviews = selectedDay
    ? appsWithInterviews.filter((a) => getLocalDateStr(a.interview_at) === selectedDay)
    : monthInterviews;

  return (
    <div className="space-y-6 mb-8">
      {/* Calendar Header with Quick Action */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 capitalize tracking-tight">
              {monthName}
            </h2>
            <button
              onClick={today}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 transition"
            >
              Aujourd'hui
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">
              <Calendar className="w-3 h-3" />
              {monthInterviews.length} prévu{monthInterviews.length > 1 ? 's' : ''} ce mois
            </span>
            {appsAwaitingDate.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold">
                <Clock className="w-3 h-3" />
                {appsAwaitingDate.length} à planifier
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Month navigators */}
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <button
              onClick={prevMonth}
              className="p-2 text-slate-600 hover:bg-slate-50 transition border-r border-slate-200"
              title="Mois précédent"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 text-slate-600 hover:bg-slate-50 transition"
              title="Mois suivant"
              aria-label="Mois suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* New Interview Button */}
          {onScheduleNew && (
            <button
              onClick={() => onScheduleNew(selectedDay || undefined)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Planifier un entretien</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid + Sidebar Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Monthly Calendar (8 cols on lg) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-500 py-2.5">
            {weekDays.map((wd) => (
              <div key={wd}>{wd}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 bg-slate-100/30">
            {dayCells.map((cell, idx) => {
              if (!cell) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="h-12 sm:min-h-[115px] bg-slate-50/40"
                  />
                );
              }

              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDay;

              const dayInterviews = appsWithInterviews.filter(
                (a) => getLocalDateStr(a.interview_at) === cell.dateStr
              );

              return (
                <div
                  key={cell.dateStr}
                  onClick={() =>
                    setSelectedDay(selectedDay === cell.dateStr ? null : cell.dateStr)
                  }
                  className={`group relative h-12 sm:h-auto sm:min-h-[115px] p-1 sm:p-2 bg-white transition flex flex-col justify-between cursor-pointer select-none ${
                    isSelected
                      ? 'bg-blue-50/70 ring-2 ring-inset ring-blue-600'
                      : isToday
                      ? 'bg-blue-50/30 ring-1 ring-inset ring-blue-400/30'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Day header: Number, dot indicator, and hover + button */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                        isToday
                          ? 'bg-blue-600 text-white shadow-xs'
                          : isSelected
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 group-hover:text-slate-900'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    <div className="flex items-center gap-1">
                      {dayInterviews.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      )}

                      {/* Quick schedule for this day on desktop */}
                      {onScheduleNew && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onScheduleNew(cell.dateStr);
                          }}
                          title={`Planifier un entretien le ${cell.dateStr}`}
                          className="opacity-0 group-hover:opacity-100 hidden sm:flex w-5 h-5 rounded-md bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 items-center justify-center transition text-[10px]"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Desktop view interview pills */}
                  <div className="hidden sm:block space-y-1.5 flex-1 overflow-y-auto max-h-24 mt-1">
                    {dayInterviews.map((app) => {
                      const d = new Date(app.interview_at!);
                      const timeStr = !isNaN(d.getTime())
                        ? d.toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '';
                      const countdown = interviewCountdown(app.interview_at);

                      return (
                        <div
                          key={app.app_id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectInterview(app);
                          }}
                          className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100/90 hover:border-amber-300 cursor-pointer transition text-left text-[11px] shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-1 font-bold text-amber-950">
                            <span className="truncate flex items-center gap-1">
                              {app.interview_type === 'visio' ? (
                                <Video className="w-3 h-3 text-blue-600 shrink-0" />
                              ) : app.interview_type === 'presentiel' ? (
                                <Building2 className="w-3 h-3 text-indigo-600 shrink-0" />
                              ) : (
                                <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                              )}
                              <span>{timeStr}</span>
                            </span>
                            {countdown && (
                              <span
                                className={`px-1 py-0.2 rounded text-[9px] ${countdown.cls}`}
                              >
                                {countdown.label}
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-slate-800 truncate mt-0.5">
                            {app.company}
                          </div>
                          <div className="text-slate-500 text-[10px] truncate">
                            {app.title}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Agenda & Actions Panel (4 cols on lg, below on mobile) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Active Agenda Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {selectedDay
                    ? `Entretiens du ${formatDate(selectedDay)}`
                    : `Agenda du mois (${monthName})`}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activePanelInterviews.length} entretien
                  {activePanelInterviews.length > 1 ? 's' : ''} au programme
                </p>
              </div>

              {selectedDay && (
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold transition"
                >
                  Voir tout
                </button>
              )}
            </div>

            {/* List of interviews */}
            {activePanelInterviews.length === 0 ? (
              <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-500 space-y-2">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">
                  {selectedDay
                    ? 'Aucun entretien prévu ce jour-là.'
                    : 'Aucun entretien programmé pour ce mois.'}
                </p>
                {onScheduleNew && (
                  <button
                    onClick={() => onScheduleNew(selectedDay || undefined)}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Planifier un entretien</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {activePanelInterviews.map((app) => {
                  const countdown = interviewCountdown(app.interview_at);
                  const d = new Date(app.interview_at!);
                  const timeStr = !isNaN(d.getTime())
                    ? d.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';

                  return (
                    <div
                      key={app.app_id}
                      onClick={() => onSelectInterview(app)}
                      className="p-3.5 bg-amber-50/60 hover:bg-amber-50 rounded-xl border border-amber-200 transition cursor-pointer space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                          {app.interview_type === 'visio' ? (
                            <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          ) : app.interview_type === 'presentiel' ? (
                            <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          ) : (
                            <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                          <span>
                            {formatDate(app.interview_at)} • {timeStr}
                          </span>
                        </span>

                        {countdown && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${countdown.cls}`}
                          >
                            {countdown.label}
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          {app.company}
                        </div>
                        <div className="text-xs text-slate-600 font-medium truncate">
                          {app.title}
                        </div>
                      </div>

                      {app.interview_notes && (
                        <div className="text-[11px] text-slate-700 bg-white/80 p-2 rounded-lg border border-amber-100 font-medium break-all">
                          {app.interview_notes}
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-end">
                        <span className="text-[11px] font-bold text-blue-600 hover:text-blue-800">
                          Modifier les détails →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Candidatures awaiting date */}
          {appsAwaitingDate.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-200/90 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    À planifier ({appsAwaitingDate.length})
                  </h4>
                </div>
                <span className="text-[11px] text-amber-700 font-medium">
                  Statut Entretien
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Ces candidatures sont acceptées en entretien. Fixez une date pour les voir sur le calendrier.
              </p>

              <div className="space-y-2">
                {appsAwaitingDate.map((app) => (
                  <div
                    key={app.app_id}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between gap-2 transition"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {app.company}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {app.title}
                      </div>
                    </div>
                    <button
                      onClick={() => onSelectInterview(app)}
                      className="shrink-0 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition shadow-2xs"
                    >
                      Fixer date
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
