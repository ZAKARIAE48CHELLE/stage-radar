import { useState } from 'react';
import type { ApplicationItem } from '../../types/api';
import { formatDate, interviewCountdown } from '../../lib/format';
import { Video, Building2, Phone } from 'lucide-react';

interface InterviewCalendarProps {
  apps: ApplicationItem[];
  onSelectInterview: (app: ApplicationItem) => void;
}

export function InterviewCalendar({
  apps,
  onSelectInterview,
}: InterviewCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

  // Filter apps that have scheduled interviews
  const appsWithInterviews = apps.filter((a) => !!a.interview_at);

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
  const startDay = (firstDayOfMonth.getDay() + 6) % 7;

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
  const todayStr = new Date().toISOString().slice(0, 10);

  // Interviews for the selected day or for the whole month on mobile
  const displayedMobileInterviews = selectedDay
    ? appsWithInterviews.filter((a) => a.interview_at?.slice(0, 10) === selectedDay)
    : appsWithInterviews.filter((a) => {
        if (!a.interview_at) return false;
        const d = new Date(a.interview_at);
        return d.getFullYear() === year && d.getMonth() === month;
      });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Calendar Header */}
      <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 capitalize truncate">
            {monthName}
          </h2>
          <button
            onClick={today}
            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition shadow-2xs"
          >
            Aujourd'hui
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 transition"
            aria-label="Mois précédent"
          >
            ◀
          </button>
          <button
            onClick={nextMonth}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 transition"
            aria-label="Mois suivant"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/40 text-center text-[11px] sm:text-xs font-bold text-slate-500 py-2">
        {weekDays.map((wd) => (
          <div key={wd}>{wd}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 bg-slate-100/30">
        {dayCells.map((cell, idx) => {
          if (!cell) {
            return <div key={`empty-${idx}`} className="h-10 sm:min-h-[105px] bg-slate-50/50" />;
          }

          const isToday = cell.dateStr === todayStr;
          const isSelected = cell.dateStr === selectedDay;

          const dayInterviews = appsWithInterviews.filter((a) => {
            if (!a.interview_at) return false;
            return a.interview_at.slice(0, 10) === cell.dateStr;
          });

          return (
            <div
              key={cell.dateStr}
              onClick={() => setSelectedDay(selectedDay === cell.dateStr ? null : cell.dateStr)}
              className={`h-11 sm:h-auto sm:min-h-[105px] p-1 sm:p-2 bg-white transition flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-blue-50 ring-2 ring-inset ring-blue-600'
                  : isToday
                  ? 'bg-blue-50/40 ring-1 ring-inset ring-blue-500/30'
                  : ''
              }`}
            >
              {/* Day number & dot */}
              <div className="flex items-center justify-between sm:mb-1.5">
                <span
                  className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                    isToday
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isSelected
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700'
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {dayInterviews.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>

              {/* Desktop view interview cards */}
              <div className="hidden sm:block space-y-1.5 flex-1 overflow-y-auto max-h-24">
                {dayInterviews.map((app) => {
                  const d = new Date(app.interview_at!);
                  const timeStr = !isNaN(d.getTime())
                    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    : '';
                  const countdown = interviewCountdown(app.interview_at);

                  return (
                    <div
                      key={app.app_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectInterview(app);
                      }}
                      className="p-1.5 rounded-lg bg-amber-50 border border-amber-200/80 hover:bg-amber-100/80 cursor-pointer transition text-left text-[11px]"
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
                          <span className={`px-1 py-0.2 rounded text-[9px] ${countdown.cls}`}>
                            {countdown.label}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-slate-800 truncate mt-0.5">{app.company}</div>
                      <div className="text-slate-500 text-[10px] truncate">{app.title}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Agenda List below grid (< sm screens) */}
      <div className="sm:hidden p-4 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            {selectedDay ? `Entretiens du ${formatDate(selectedDay)}` : `Entretiens prévus (${monthName})`}
          </h3>
          {selectedDay && (
            <button
              onClick={() => setSelectedDay(null)}
              className="text-[11px] text-blue-600 font-semibold"
            >
              Voir tout le mois
            </button>
          )}
        </div>

        {displayedMobileInterviews.length === 0 ? (
          <div className="text-center p-4 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
            {selectedDay ? 'Aucun entretien ce jour-là' : 'Aucun entretien prévu ce mois-ci'}
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedMobileInterviews.map((app) => {
              const countdown = interviewCountdown(app.interview_at);
              const d = new Date(app.interview_at!);
              const timeStr = !isNaN(d.getTime())
                ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={app.app_id}
                  onClick={() => onSelectInterview(app)}
                  className="p-3 bg-white rounded-xl border border-amber-200/90 shadow-2xs hover:shadow-xs transition cursor-pointer"
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
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${countdown.cls}`}>
                        {countdown.label}
                      </span>
                    )}
                  </div>

                  <div className="font-bold text-slate-900 text-sm mt-1">{app.company}</div>
                  <div className="text-xs text-slate-500 font-medium truncate">{app.title}</div>

                  {app.interview_notes && (
                    <div className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100 mt-2 font-mono break-all">
                      {app.interview_notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
