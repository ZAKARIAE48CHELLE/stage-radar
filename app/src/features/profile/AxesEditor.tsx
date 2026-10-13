import { AXIS_COLORS, FIELDS } from '../../lib/constants';

export interface AxisItem {
  label: string;
  weight: number;
  keywords: string[];
}

interface AxesEditorProps {
  axes: AxisItem[];
  onChange: (axes: AxisItem[]) => void;
  selectedField: string;
  onChangeField: (field: string) => void;
}

export function AxesEditor({
  axes,
  onChange,
  selectedField,
  onChangeField,
}: AxesEditorProps) {
  function handleLabelChange(index: number, label: string) {
    const next = [...axes];
    next[index] = { ...next[index], label };
    onChange(next);
  }

  function handleWeightChange(index: number, weight: number) {
    const next = [...axes];
    next[index] = { ...next[index], weight };
    onChange(next);
  }

  function handleKeywordsChange(index: number, kwStr: string) {
    const kws = kwStr
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const next = [...axes];
    next[index] = { ...next[index], keywords: kws };
    onChange(next);
  }

  function handleRemoveAxis(index: number) {
    onChange(axes.filter((_, i) => i !== index));
  }

  function handleAddAxis() {
    if (axes.length >= 6) return;
    onChange([...axes, { label: 'Nouvel axe', weight: 20, keywords: [] }]);
  }

  function handleApplyTemplate() {
    const tpl = FIELDS[selectedField];
    if (!tpl) return;
    if (axes.length > 0 && !window.confirm('Remplacer vos axes actuels par ceux du modèle ?')) {
      return;
    }
    onChange(JSON.parse(JSON.stringify(tpl.axes)));
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
      {/* Header and template picker */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Domaine & axes de compétences</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Chaque axe possède un poids et des mots-clés cherchés dans les offres. Mots-clés séparés par des virgules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedField}
            onChange={(e) => onChangeField(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {Object.entries(FIELDS).map(([k, f]) => (
              <option key={k} value={k}>
                {f.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleApplyTemplate}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            Appliquer
          </button>
        </div>
      </div>

      {/* Axes list */}
      <div className="space-y-3">
        {axes.length === 0 ? (
          <p className="text-sm text-slate-400 italic p-4 text-center">
            Aucun axe défini. Appliquez un modèle ci-dessus ou ajoutez un axe manuellement.
          </p>
        ) : (
          axes.map((axis, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 transition"
            >
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: AXIS_COLORS[i % AXIS_COLORS.length] }}
                />

                <input
                  type="text"
                  value={axis.label}
                  onChange={(e) => handleLabelChange(i, e.target.value)}
                  maxLength={60}
                  placeholder="Nom de l'axe (ex: IA générative)"
                  className="w-full sm:flex-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />

                <div className="flex items-center gap-2 sm:w-64 text-xs font-semibold text-slate-600">
                  <span className="w-10">Poids :</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={axis.weight}
                    onChange={(e) => handleWeightChange(i, Number(e.target.value))}
                    className="flex-1 accent-blue-600 cursor-pointer"
                  />
                  <span className="w-8 text-right font-bold text-slate-800">{axis.weight}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveAxis(i)}
                  className="text-xs text-rose-600 hover:underline font-semibold self-end sm:self-auto"
                >
                  Supprimer
                </button>
              </div>

              <textarea
                rows={2}
                value={(axis.keywords || []).join(', ')}
                onChange={(e) => handleKeywordsChange(i, e.target.value)}
                placeholder="Ex: python, sql, machine learning, pytorch, transformers..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          ))
        )}
      </div>

      {axes.length < 6 && (
        <button
          type="button"
          onClick={handleAddAxis}
          className="px-4 py-2 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-800 text-xs font-semibold transition w-full text-center"
        >
          + Ajouter un axe (max 6 axes)
        </button>
      )}
    </div>
  );
}
