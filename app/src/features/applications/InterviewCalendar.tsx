import { useState } from 'react';
import type { ApplicationItem } from '../../types/api';
import { interviewCountdown } from '../../lib/format';

interface InterviewCalendarProps {
  apps: ApplicationItem[];
  onSelectInterview: (app: ApplicationItem) => void;
}

export function InterviewCalendar({
  apps,
  onSelectInterview,
}: InterviewCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

  // Filter apps that have scheduled interviews
  const appsWithInterviews = apps.filter((a) => !!a.interview_at);

  // Month navigation
  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }
  function today() {
    setCurrentDate(new Date());
  }

  // Calculate days in month
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const totalDays = lastDayOfMonth.getDate();

  // Day of week for first day (0 is Sun, convert to Mon=0...Sun=6)
  const startDay = (firstDayOfMonth.getDay() + 6) % 7;

  // Calendar cells: empty cells before first day + day cells
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Calendar Header */}
      <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-800 capitalize">{monthName}</h2>
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
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/40 text-center text-xs font-bold text-slate-500 py-2.5">
        {weekDays.map((wd) => (
          <div key={wd}>{wd}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 bg-slate-100/30">
        {dayCells.map((cell, idx) => {
          if (!cell) {
            return <div key={`empty-${idx}`} className="min-h-[105px] bg-slate-50/50" />;
          }

          const isToday = cell.dateStr === todayStr;

          // Find interviews on this day
          const dayInterviews = appsWithInterviews.filter((a) => {
            if (!a.interview_at) return false;
            return a.interview_at.slice(0, 10) === cell.dateStr;
          });

          return (
            <div
              key={cell.dateStr}
              className={`min-h-[105px] p-2 bg-white transition flex flex-col justify-between ${
                isToday ? 'bg-blue-50/30 ring-1 ring-inset ring-blue-500/30' : ''
              }`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                    isToday ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700'
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {dayInterviews.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>

              {/* Day interviews list */}
              <div className="space-y-1.5 flex-1 overflow-y-auto max-h-24">
                {dayInterviews.map((app) => {
                  const d = new Date(app.interview_at!);
                  const timeStr = !isNaN(d.getTime())
                    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    : '';
                  const countdown = interviewCountdown(app.interview_at);

                  return (
                    <div
                      key={app.app_id}
                      onClick={() => onSelectInterview(app)}
                      className="p-1.5 rounded-lg bg-amber-50 border border-amber-200/80 hover:bg-amber-100/80 cursor-pointer transition text-left text-[11px]"
                    >
                      <div className="flex items-center justify-between gap-1 font-bold text-amber-950">
                        <span className="truncate">
                          {app.interview_type === 'visio' ? '💻' : app.interview_type === 'presentiel' ? '🏢' : '📞'}{' '}
                          {timeStr}
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
    </div>
  );
}
