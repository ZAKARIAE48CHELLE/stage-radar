/* Stage Radar — multi-user web app (Supabase auth + database, static hosting).
 * Views: auth · pending · offres · candidatures · marché · profil · admin
 * Every string coming from the database is escaped with esc() before reaching innerHTML.
 */
'use strict';

// ───────────────────────── constants ─────────────────────────
const CFG = Object.assign({ appName: 'Stage Radar', maxAgeDays: 60 }, window.STAGE_RADAR_CONFIG || {});
const CITIES = ['Casablanca', 'Rabat', 'Tanger', 'Marrakech', 'Fès', 'Agadir', 'Kénitra', 'Mohammedia',
  'Tétouan', 'Oujda', 'Meknès', 'El Jadida', 'Bouskoura', 'Télétravail'];
const STATUSES = {
  a_postuler: { label: 'À postuler', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  envoyee:    { label: 'Envoyée',    cls: 'bg-blue-50 text-blue-800 border-blue-200' },
  relance:    { label: 'Relancée',   cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  entretien:  { label: 'Entretien',  cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  offre:      { label: 'Offre reçue', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  refus:      { label: 'Refus',      cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  abandon:    { label: 'Abandonnée', cls: 'bg-slate-50 text-slate-400 border-slate-200' },
};
const AXIS_COLORS = ['#2563eb', '#0d9488', '#d97706', '#7c3aed', '#db2777', '#059669'];

// Field templates: starting axes the user can then edit freely.
const FIELDS = {
  ia_data: { label: 'IA & Data', axes: [
    { label: 'IA générative & LLM', weight: 35, keywords: ['llm', 'rag', 'langchain', 'langgraph', 'genai', 'ia generative', 'prompt engineering', 'agents ia', 'nlp', 'transformers', 'hugging face', 'openai', 'fine-tuning', 'chatbot'] },
    { label: 'Data engineering & Big Data', weight: 25, keywords: ['spark', 'pyspark', 'hadoop', 'kafka', 'airflow', 'etl', 'data engineer', 'big data', 'sql', 'nosql', 'databricks', 'data warehouse', 'pipeline', 'dbt'] },
    { label: 'Machine learning & Data science', weight: 25, keywords: ['machine learning', 'deep learning', 'data science', 'data scientist', 'scikit-learn', 'pytorch', 'tensorflow', 'mlops', 'python', 'statistiques', 'pandas', 'modeles predictifs'] },
    { label: 'Computer vision', weight: 15, keywords: ['computer vision', 'vision par ordinateur', 'cnn', 'opencv', 'yolo', 'traitement d images', 'image processing', 'segmentation'] },
  ] },
  dev: { label: 'Développement logiciel', axes: [
    { label: 'Backend', weight: 35, keywords: ['java', 'spring boot', 'node.js', 'nestjs', 'django', 'fastapi', '.net', 'c#', 'php', 'laravel', 'symfony', 'api rest', 'microservices', 'sql'] },
    { label: 'Frontend', weight: 30, keywords: ['react', 'angular', 'vue', 'next.js', 'typescript', 'javascript', 'html', 'css', 'tailwind', 'ui'] },
    { label: 'Mobile', weight: 15, keywords: ['flutter', 'react native', 'kotlin', 'swift', 'android', 'ios', 'mobile'] },
    { label: 'DevOps & Cloud', weight: 20, keywords: ['docker', 'kubernetes', 'ci/cd', 'devops', 'aws', 'azure', 'gcp', 'git', 'jenkins', 'linux', 'terraform'] },
  ] },
  cyber: { label: 'Cybersécurité & Réseaux', axes: [
    { label: 'Sécurité offensive & défensive', weight: 40, keywords: ['cybersecurite', 'securite', 'soc', 'siem', 'pentest', 'tests d intrusion', 'iso 27001', 'vulnerabilites', 'forensic', 'owasp', 'red team', 'blue team'] },
    { label: 'Réseaux', weight: 30, keywords: ['reseau', 'reseaux', 'cisco', 'ccna', 'routage', 'switching', 'firewall', 'fortinet', 'vpn', 'tcp/ip', 'wifi', 'telecom'] },
    { label: 'Systèmes & Cloud', weight: 30, keywords: ['linux', 'windows server', 'active directory', 'virtualisation', 'vmware', 'azure', 'aws', 'cloud', 'administration systeme', 'scripting', 'powershell'] },
  ] },
  bi_erp: { label: 'BI, ERP & Systèmes d\'information', axes: [
    { label: 'Business intelligence', weight: 35, keywords: ['power bi', 'tableau', 'qlik', 'business intelligence', 'bi', 'dax', 'sql', 'reporting', 'dashboard', 'etl', 'data analyst', 'excel'] },
    { label: 'ERP', weight: 35, keywords: ['sap', 'odoo', 'erp', 'dynamics', 'sage', 'abap', 'crm', 'salesforce'] },
    { label: 'Gestion de projet & MOA', weight: 30, keywords: ['gestion de projet', 'agile', 'scrum', 'jira', 'cahier des charges', 'specifications', 'business analyst', 'moa', 'uml', 'processus'] },
  ] },
  industriel: { label: 'Génie industriel & Qualité', axes: [
    { label: 'Lean & méthodes', weight: 30, keywords: ['lean', 'lean manufacturing', 'kaizen', '5s', 'vsm', 'smed', 'methodes', 'amelioration continue', 'six sigma', 'kpi'] },
    { label: 'Qualité', weight: 30, keywords: ['qualite', 'iso 9001', 'iatf', 'amdec', '8d', 'spc', 'audit', 'qhse', 'controle qualite', 'non-conformites'] },
    { label: 'Supply chain & logistique', weight: 20, keywords: ['supply chain', 'logistique', 'approvisionnement', 'stocks', 'planification', 'achats', 'transport', 'mrp'] },
    { label: 'Production & maintenance', weight: 20, keywords: ['production', 'maintenance', 'gmao', 'tpm', 'automobile', 'aeronautique', 'process', 'industrialisation'] },
  ] },
  electrique: { label: 'Électrique, Électronique & Embarqué', axes: [
    { label: 'Systèmes embarqués', weight: 40, keywords: ['systemes embarques', 'embarque', 'embedded', 'c', 'c++', 'stm32', 'microcontroleur', 'rtos', 'arduino', 'iot', 'firmware'] },
    { label: 'Automatisme & électrique', weight: 35, keywords: ['automatisme', 'automate', 'plc', 'siemens', 'tia portal', 'schneider', 'electrique', 'electrotechnique', 'variateur', 'scada'] },
    { label: 'Automobile & aéro', weight: 25, keywords: ['autosar', 'can', 'catia', 'cablage', 'harness', 'aeronautique', 'automobile', 'validation', 'matlab', 'simulink'] },
  ] },
  custom: { label: 'Autre / personnalisé', axes: [{ label: 'Mes compétences', weight: 50, keywords: [] }] },
};

// ───────────────────────── state & helpers ─────────────────────────
const S = {
  sb: null, user: null, profile: null, matches: [], loadedAt: 0, apps: null,
  view: 'offres', shown: 100, charts: {}, recovering: false,
  f: { q: '', city: '', modality: '', source: '', status: '', fresh: false, pfe: false, min: 0, sort: 'score' },
};
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '#';
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const srcLabel = s => (s || '').startsWith('email:') ? s.slice(6) + ' (alerte)' : (s || '—');
const place = o => [o.city, o.modality].filter(Boolean).join(' · ') || '—';
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
function daysAgo(iso) {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - new Date(String(iso).slice(0, 10) + 'T00:00:00Z')) / 864e5);
  return d <= 0 ? "aujourd'hui" : d === 1 ? 'hier' : `il y a ${d} j`;
}
const isFresh = o => o.first_seen && (Date.now() - new Date(o.first_seen + 'T00:00:00Z')) < 2 * 864e5;
const scoreCls = s => s >= 75 ? 'bg-emerald-100 text-emerald-800' : s >= 55 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600';
const statusPill = st => st && STATUSES[st]
  ? `<span class="inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold whitespace-nowrap ${STATUSES[st].cls}">${STATUSES[st].label}</span>` : '';
const input = 'w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm';
const btn = 'px-4 py-2.5 rounded-xl font-semibold text-sm transition disabled:opacity-50';
const btnPrimary = `${btn} bg-blue-700 hover:bg-blue-800 text-white`;
const btnGhost = `${btn} border border-slate-200 hover:bg-slate-50 text-slate-700`;
const card = 'bg-white rounded-3xl border border-slate-200 p-5 sm:p-7';

function toast(msg, tone = 'ok') {
  const t = $('#toast');
  t.className = `fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg ${tone === 'err' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'}`;
  t.textContent = msg;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hidden'), 3200);
}
function errMsg(e) {
  const m = (e && (e.message || e.error_description)) || String(e);
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou mot de passe incorrect.';
  if (/already registered/i.test(m)) return 'Un compte existe déjà avec cet e-mail.';
  if (/Password should be at least/i.test(m)) return 'Mot de passe trop court (8 caractères minimum).';
  if (/not approved/i.test(m)) return 'Compte en attente de validation.';
  if (/rate limit/i.test(m)) return 'Trop de tentatives, réessayez dans quelques minutes.';
  return m;
}
async function call(promise) {             // supabase-js returns {data, error}
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

function attachPasswordToggle(btnSel, inputSel, eyeSel, eyeOffSel) {
  const b = $(btnSel), inp = $(inputSel), eye = $(eyeSel), eyeOff = $(eyeOffSel);
  if (!b || !inp) return;
  b.addEventListener('click', () => {
    const isPass = inp.type === 'password';
    inp.type = isPass ? 'text' : 'password';
    if (eye && eyeOff) {
      eye.classList.toggle('hidden', isPass);
      eyeOff.classList.toggle('hidden', !isPass);
    }
    b.setAttribute('aria-label', isPass ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
  });
}

// ───────────────────────── boot & auth ─────────────────────────

function boot() {
  $('#appName').textContent = CFG.appName;
  document.title = CFG.appName;
  if (!CFG.supabaseUrl || !CFG.supabaseAnonKey || !window.supabase) {
    $('#view').innerHTML = `<div class="${card} max-w-xl mx-auto mt-10 space-y-3">
      <h1 class="text-xl font-extrabold">Configuration requise</h1>
      <p class="text-sm text-slate-600">Renseignez <code>supabaseUrl</code> et <code>supabaseAnonKey</code> dans <code>docs/config.js</code> (voir le README, section « Application multi-utilisateurs »).</p>
      ${window.supabase ? '' : '<p class="text-sm text-rose-600">La librairie Supabase n’a pas pu être chargée (connexion ?).</p>'}
      <p class="text-sm text-slate-600">Votre ancien tableau de bord personnel reste disponible : <a class="underline text-blue-700" href="perso.html">perso.html</a>.</p></div>`;
    return;
  }
  S.sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
  S.sb.auth.onAuthStateChange((event, session) => {
    // never await supabase calls inside this callback (supabase-js deadlock); defer instead
    setTimeout(() => onAuth(event, session), 0);
  });
  $('#logoutBtn').addEventListener('click', async () => { await S.sb.auth.signOut(); });
  window.addEventListener('hashchange', route);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
}

async function onAuth(event, session) {
  if (event === 'PASSWORD_RECOVERY') { S.recovering = true; return renderResetPassword(); }
  if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
  if (S.recovering && event !== 'SIGNED_OUT') return;
  S.user = session?.user || null;
  if (!S.user) {
    Object.assign(S, { profile: null, matches: [], apps: null, loadedAt: 0, shown: 100 });
    S.f = { q: '', city: '', modality: '', source: '', status: '', fresh: false, pfe: false, min: 0, sort: 'score' };
    $('#topbar').classList.add('hidden');
    return renderAuth();
  }
  if (S.profile && S.profile.id === S.user.id && event === 'SIGNED_IN') return;  // tab refocus
  try {
    S.profile = await call(S.sb.from('profiles').select('*').eq('id', S.user.id).single());
  } catch (e) {
    $('#view').innerHTML = `<div class="${card} max-w-lg mx-auto mt-10 text-sm">Profil introuvable : ${esc(errMsg(e))}. Vérifiez que <code>supabase/schema.sql</code> a bien été exécuté.</div>`;
    return;
  }
  $('#whoami').textContent = S.profile.full_name || S.profile.email;
  if (S.profile.status !== 'approved') return renderPending();
  $('#topbar').classList.remove('hidden');
  if (!(S.profile.axes || []).length && !location.hash.startsWith('#/profil')) location.hash = '#/profil';
  route();
}

function renderAuth(mode = 'login', notice = '') {
  const signup = mode === 'signup', forgot = mode === 'forgot';
  $('#view').innerHTML = `
  <div class="max-w-md mx-auto mt-6 sm:mt-14 space-y-6">
    <div class="text-center space-y-2">
      <div class="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-extrabold">SR</div>
      <h1 class="text-2xl font-extrabold text-slate-900">${esc(CFG.appName)}</h1>
      <p class="text-sm text-slate-500">Les stages du Maroc, triés selon votre profil. Suivez vos candidatures en équipe.</p>
    </div>
    <div class="${card} space-y-4">
      ${forgot ? '' : `<div class="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl text-sm font-semibold">
        <button data-mode="login" class="py-2 rounded-lg ${!signup ? 'bg-white shadow-sm' : 'text-slate-500'}">Connexion</button>
        <button data-mode="signup" class="py-2 rounded-lg ${signup ? 'bg-white shadow-sm' : 'text-slate-500'}">Créer un compte</button></div>`}
      ${notice ? `<div class="text-sm rounded-xl p-3 bg-emerald-50 border border-emerald-200 text-emerald-900">${notice}</div>` : ''}
      <form id="authForm" class="space-y-3">
        ${signup ? `<label class="block text-xs font-semibold text-slate-600">Nom complet<input name="name" required maxlength="80" class="${input} mt-1" autocomplete="name"></label>` : ''}
        <label class="block text-xs font-semibold text-slate-600">E-mail<input name="email" type="email" required class="${input} mt-1" autocomplete="email"></label>
        ${forgot ? '' : `<label class="block text-xs font-semibold text-slate-600">Mot de passe
          <div class="relative mt-1">
            <input id="pwdInput" name="password" type="password" required minlength="8" class="${input} pr-10" autocomplete="${signup ? 'new-password' : 'current-password'}">
            <button type="button" id="togglePwdBtn" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer focus:outline-none" title="Afficher/masquer le mot de passe" aria-label="Afficher le mot de passe">
              <svg id="eyeIcon" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <svg id="eyeOffIcon" class="w-4 h-4 hidden" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            </button>
          </div>
        </label>`}
        <p id="authErr" class="hidden text-sm text-rose-600"></p>
        <button class="${btnPrimary} w-full">${forgot ? 'Envoyer le lien de réinitialisation' : signup ? 'Créer mon compte' : 'Se connecter'}</button>
      </form>
      <div class="text-center text-xs text-slate-500">
        ${forgot ? '<button data-mode="login" class="underline">Retour à la connexion</button>'
                 : '<button data-mode="forgot" class="underline">Mot de passe oublié ?</button>'}
      </div>
      ${signup ? '<p class="text-xs text-slate-500">Après inscription, l’administrateur valide votre compte (immédiat si vous avez été invité).</p>' : ''}
    </div>
  </div>`;
  $$('[data-mode]').forEach(b => b.addEventListener('click', () => renderAuth(b.dataset.mode)));
  attachPasswordToggle('#togglePwdBtn', '#pwdInput', '#eyeIcon', '#eyeOffIcon');
  $('#authForm').addEventListener('submit', async ev => {
    ev.preventDefault();
    const fd = new FormData(ev.target), b = ev.target.querySelector('button');
    const email = String(fd.get('email')).trim().toLowerCase();
    b.disabled = true; $('#authErr').classList.add('hidden');
    try {
      if (forgot) {
        await call(S.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }));
        return renderAuth('login', 'Si un compte existe pour cet e-mail, un lien de réinitialisation vient d’être envoyé.');
      }
      if (signup) {
        const data = await call(S.sb.auth.signUp({ email, password: fd.get('password'),
          options: { data: { full_name: String(fd.get('name')).trim() }, emailRedirectTo: location.origin + location.pathname } }));
        if (!data.session) return renderAuth('login', 'Compte créé. Confirmez votre adresse via l’e-mail reçu, puis connectez-vous.');
      } else {
        await call(S.sb.auth.signInWithPassword({ email, password: fd.get('password') }));
      }
    } catch (e) {
      $('#authErr').textContent = errMsg(e); $('#authErr').classList.remove('hidden');
    } finally { b.disabled = false; }
  });
}

function renderResetPassword() {
  $('#topbar').classList.add('hidden');
  $('#view').innerHTML = `<div class="${card} max-w-md mx-auto mt-14 space-y-4">
    <h1 class="text-xl font-extrabold">Nouveau mot de passe</h1>
    <form id="resetForm" class="space-y-3">
      <div class="relative">
        <input id="resetPwdInput" name="password" type="password" minlength="8" required placeholder="8 caractères minimum" class="${input} pr-10" autocomplete="new-password">
        <button type="button" id="toggleResetPwdBtn" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer focus:outline-none" title="Afficher/masquer le mot de passe" aria-label="Afficher le mot de passe">
          <svg id="resetEyeIcon" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <svg id="resetEyeOffIcon" class="w-4 h-4 hidden" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
          </svg>
        </button>
      </div>
      <p id="resetErr" class="hidden text-sm text-rose-600"></p>
      <button class="${btnPrimary} w-full">Enregistrer</button></form></div>`;
  attachPasswordToggle('#toggleResetPwdBtn', '#resetPwdInput', '#resetEyeIcon', '#resetEyeOffIcon');
  $('#resetForm').addEventListener('submit', async ev => {

    ev.preventDefault();
    try {
      await call(S.sb.auth.updateUser({ password: new FormData(ev.target).get('password') }));
      S.recovering = false; toast('Mot de passe mis à jour');
      const { data } = await S.sb.auth.getSession(); onAuth('SIGNED_IN', data.session);
    } catch (e) { $('#resetErr').textContent = errMsg(e); $('#resetErr').classList.remove('hidden'); }
  });
}

function renderPending() {
  $('#topbar').classList.add('hidden');
  const blocked = S.profile.status === 'blocked';
  $('#view').innerHTML = `<div class="${card} max-w-lg mx-auto mt-14 text-center space-y-3">
    <div class="text-4xl">${blocked ? '⛔' : '⏳'}</div>
    <h1 class="text-xl font-extrabold">${blocked ? 'Compte désactivé' : 'Compte en attente de validation'}</h1>
    <p class="text-sm text-slate-600">${blocked ? 'Contactez l’administrateur si vous pensez qu’il s’agit d’une erreur.'
      : `Bonjour ${esc(S.profile.full_name || '')}, l’administrateur doit valider votre compte (${esc(S.profile.email)}). Revenez un peu plus tard.`}</p>
    <div class="flex justify-center gap-2"><button id="recheck" class="${btnGhost}">Vérifier à nouveau</button>
    <button id="out" class="${btnGhost}">Déconnexion</button></div></div>`;
  $('#recheck').onclick = async () => { S.profile = null; const { data } = await S.sb.auth.getSession(); onAuth('INITIAL_SESSION', data.session); };
  $('#out').onclick = () => S.sb.auth.signOut();
}

// ───────────────────────── routing ─────────────────────────
function route() {
  if (!S.profile || S.profile.status !== 'approved') return;
  const v = (location.hash.replace(/^#\//, '') || 'offres').split('?')[0];
  S.view = ['offres', 'candidatures', 'marche', 'profil', 'admin'].includes(v) ? v : 'offres';
  if (S.view === 'admin' && S.profile.role !== 'admin') S.view = 'offres';
  renderNav();
  closeModal();
  Object.values(S.charts).forEach(c => c.destroy()); S.charts = {};
  ({ offres: viewOffers, candidatures: viewApps, marche: viewMarket, profil: viewProfile, admin: viewAdmin })[S.view]();
  window.scrollTo(0, 0);
}

function renderNav() {
  const items = [['offres', 'Offres'], ['candidatures', 'Mes candidatures'], ['marche', 'Marché'], ['profil', 'Profil']];
  if (S.profile.role === 'admin') items.push(['admin', 'Admin']);
  $('#nav').innerHTML = items.map(([k, l]) =>
    `<a href="#/${k}" class="nav-btn px-3 py-2 rounded-lg hover:bg-slate-100 whitespace-nowrap" ${S.view === k ? 'aria-current="page"' : ''}>${l}${k === 'admin' ? '<span id="pendingBadge"></span>' : ''}</a>`).join('');
  if (S.profile.role === 'admin') {
    S.sb.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending').then(({ count }) => {
      if (count && $('#pendingBadge')) $('#pendingBadge').innerHTML = ` <span class="ml-1 px-1.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-extrabold">${count}</span>`;
    });
  }
}

// ───────────────────────── data ─────────────────────────
async function loadMatches(force = false) {
  if (!force && S.loadedAt && Date.now() - S.loadedAt < 5 * 60e3) return S.matches;
  const all = [];
  for (let from = 0; ; from += 1000) {          // PostgREST caps responses at 1000 rows
    const page = await call(S.sb.rpc('my_matches', { max_age_days: CFG.maxAgeDays }).range(from, from + 999));
    all.push(...page);
    if (page.length < 1000) break;
  }
  S.matches = all; S.loadedAt = Date.now();
  return all;
}

async function saveApplication(offerId, patch) {
  const row = Object.assign({ user_id: S.user.id, offer_id: offerId }, patch);
  const saved = await call(S.sb.from('applications').upsert(row, { onConflict: 'user_id,offer_id' }).select().single());
  const m = S.matches.find(x => x.id === offerId);
  if (m) { m.app_status = saved.status; m.app_updated = saved.updated_at; }
  S.apps = null;
  return saved;
}

// ───────────────────────── view: offres ─────────────────────────
async function viewOffers() {
  const v = $('#view');
  v.innerHTML = `<div class="${card} text-sm text-slate-500">Chargement des offres et calcul de vos scores…</div>`;
  try { await loadMatches(); } catch (e) {
    v.innerHTML = `<div class="${card} text-sm text-rose-600">Erreur de chargement : ${esc(errMsg(e))}</div>`; return;
  }
  const uniq = f => [...new Set(S.matches.map(f).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
  const opt = (vals, cur, all) => `<option value="">${all}</option>` + vals.map(x => `<option ${x === cur ? 'selected' : ''} value="${esc(x)}">${esc(x)}</option>`).join('');
  const f = S.f;
  v.innerHTML = `
  <div class="space-y-6">
    <section class="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white">
      <p class="text-xs font-semibold text-blue-200" id="lastRun">&nbsp;</p>
      <h1 class="text-2xl sm:text-3xl font-extrabold mt-1">Bonjour ${esc((S.profile.full_name || '').split(' ')[0] || '')} 👋</h1>
      <p class="text-sm text-slate-300 mt-1">Offres classées selon <a href="#/profil" class="underline">vos compétences</a>. Mettez à jour un statut pour suivre vos candidatures.</p>
    </section>
    <section id="kpis" class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"></section>
    <section class="${card} space-y-4">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <h2 class="text-lg font-bold text-slate-900">Offres pour vous</h2>
        <div class="flex items-center gap-3"><span id="count" class="bg-blue-50 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-200"></span>
        <button id="refresh" class="text-xs underline text-slate-500">Actualiser</button><button id="reset" class="text-xs underline text-slate-500">Réinitialiser</button></div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
        <label class="sm:col-span-2"><span class="block font-semibold text-slate-600 mb-1">Recherche</span><input id="fq" type="search" value="${esc(f.q)}" placeholder="Poste, entreprise, compétence…" class="${input}"></label>
        <label><span class="block font-semibold text-slate-600 mb-1">Ville</span><select id="fcity" class="${input}">${opt(uniq(o => o.city), f.city, 'Toutes')}</select></label>
        <label><span class="block font-semibold text-slate-600 mb-1">Modalité</span><select id="fmod" class="${input}">${opt(uniq(o => o.modality), f.modality, 'Toutes')}</select></label>
        <label><span class="block font-semibold text-slate-600 mb-1">Source</span><select id="fsrc" class="${input}">${opt(uniq(o => srcLabel(o.source)), f.source, 'Toutes')}</select></label>
        <label><span class="block font-semibold text-slate-600 mb-1">Mon statut</span><select id="fstat" class="${input}">
          <option value="">Tous</option><option value="none" ${f.status === 'none' ? 'selected' : ''}>Sans statut</option>
          ${Object.entries(STATUSES).map(([k, s]) => `<option value="${k}" ${f.status === k ? 'selected' : ''}>${s.label}</option>`).join('')}</select></label>
        <label class="flex items-center gap-2"><input id="ffresh" type="checkbox" ${f.fresh ? 'checked' : ''} class="w-4 h-4 accent-amber-500"><span class="font-semibold text-slate-600">Nouvelles (48 h)</span></label>
        <label class="flex items-center gap-2"><input id="fpfe" type="checkbox" ${f.pfe ? 'checked' : ''} class="w-4 h-4 accent-blue-600"><span class="font-semibold text-slate-600">PFE uniquement</span></label>
        <label class="sm:col-span-2"><span class="block font-semibold text-slate-600 mb-1">Score minimum : <b id="fminl">${f.min}</b>%</span><input id="fmin" type="range" min="0" max="100" value="${f.min}" class="w-full accent-blue-600"></label>
        <label class="sm:col-span-2"><span class="block font-semibold text-slate-600 mb-1">Trier par</span><select id="fsort" class="${input}">
          <option value="score">Score</option><option value="date" ${f.sort === 'date' ? 'selected' : ''}>Date de publication</option>
          <option value="expiry" ${f.sort === 'expiry' ? 'selected' : ''}>Expire bientôt</option></select></label>
      </div>
      <div class="overflow-x-auto rounded-2xl border border-slate-200 scroll">
        <table class="w-full text-left text-xs">
          <thead><tr class="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
            <th class="py-3 px-4">Poste</th><th class="py-3 px-4">Entreprise</th><th class="py-3 px-4">Lieu</th>
            <th class="py-3 px-4">Publiée</th><th class="py-3 px-4 text-center">Score</th><th class="py-3 px-4">Statut</th></tr></thead>
          <tbody id="tbody" class="divide-y divide-slate-200"></tbody>
        </table>
      </div>
      <div class="text-center"><button id="more" class="${btnGhost} hidden">Afficher plus</button></div>
    </section>
  </div>`;
  const bind = (id, key, ev = 'change', conv = x => x) => $(id).addEventListener(ev, e => {
    f[key] = conv(e.target.type === 'checkbox' ? e.target.checked : e.target.value); S.shown = 100; renderOfferRows();
  });
  bind('#fq', 'q', 'input'); bind('#fcity', 'city'); bind('#fmod', 'modality'); bind('#fsrc', 'source');
  bind('#fstat', 'status'); bind('#ffresh', 'fresh'); bind('#fpfe', 'pfe'); bind('#fsort', 'sort');
  bind('#fmin', 'min', 'input', Number);
  $('#reset').onclick = () => { Object.assign(S.f, { q: '', city: '', modality: '', source: '', status: '', fresh: false, pfe: false, min: 0, sort: 'score' }); viewOffers(); };
  $('#refresh').onclick = async () => { S.loadedAt = 0; await viewOffers(); toast('Offres actualisées'); };
  $('#more').onclick = () => { S.shown += 100; renderOfferRows(); };
  S.sb.from('scrape_runs').select('run_at').order('run_at', { ascending: false }).limit(1).then(({ data }) => {
    if (data && data[0] && $('#lastRun')) $('#lastRun').textContent = `Dernière collecte : ${new Date(data[0].run_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}`;
  });
  renderOfferRows();
}

function filteredOffers() {
  const f = S.f, q = norm(f.q);
  const list = S.matches.filter(o =>
    (!q || norm([o.title, o.company, o.city, (o.matched || []).join(' ')].join(' ')).includes(q)) &&
    (!f.city || o.city === f.city) && (!f.modality || o.modality === f.modality) &&
    (!f.source || srcLabel(o.source) === f.source || (o.also_on || []).some(a => srcLabel(a.source) === f.source)) &&
    (!f.status || (f.status === 'none' ? !o.app_status : o.app_status === f.status)) &&
    (!f.fresh || isFresh(o)) && (!f.pfe || o.is_pfe) && o.score >= f.min);
  const by = { score: (a, b) => b.score - a.score || String(b.date_posted).localeCompare(String(a.date_posted)),
               date: (a, b) => String(b.date_posted || '').localeCompare(String(a.date_posted || '')),
               expiry: (a, b) => String(a.valid_through || '9999').localeCompare(String(b.valid_through || '9999')) };
  return list.sort(by[f.sort] || by.score);
}

function renderOfferRows() {
  const list = filteredOffers();
  $('#fminl').textContent = S.f.min;
  $('#count').textContent = `${list.length} / ${S.matches.length} offres`;
  const tracked = S.matches.filter(o => o.app_status && !['refus', 'abandon'].includes(o.app_status)).length;
  const fresh = S.matches.filter(isFresh).length;
  const top = S.matches.filter(o => o.score >= 75).length;
  $('#kpis').innerHTML = [
    ['Offres pour vous', S.matches.length, 'correspondent à vos compétences', 'text-slate-900'],
    ['Nouvelles (48 h)', fresh, fresh ? 'à regarder en priorité' : 'rien de neuf', 'text-amber-600'],
    ['Très bon match', top, 'score ≥ 75 %', 'text-emerald-600'],
    ['Candidatures actives', tracked, '<a href="#/candidatures" class="underline">voir le suivi</a>', 'text-blue-700'],
  ].map(([l, v, s, c]) => `<div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200"><div class="text-[11px] font-medium text-slate-500 uppercase tracking-wider">${l}</div>
    <div class="text-3xl font-extrabold mt-1.5 ${c}">${v}</div><div class="text-xs text-slate-500 mt-1">${s}</div></div>`).join('');
  const rows = list.slice(0, S.shown);
  $('#tbody').innerHTML = rows.length ? rows.map(o => `
    <tr class="hover:bg-slate-50 cursor-pointer" data-id="${o.id}">
      <td class="py-3 px-4 font-bold text-slate-900 min-w-[220px]">
        ${isFresh(o) ? '<span class="mr-1 px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 text-[9px] font-extrabold align-middle">NOUVEAU</span>' : ''}
        ${o.is_pfe ? '<span class="mr-1 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold align-middle">PFE</span>' : ''}${esc(o.title)}</td>
      <td class="py-3 px-4 font-semibold text-slate-700">${esc(o.company || '—')}<div class="text-[10px] font-medium text-slate-400">${esc(srcLabel(o.source))}${(o.also_on || []).length ? ' +' + o.also_on.length : ''}</div></td>
      <td class="py-3 px-4 text-slate-600 whitespace-nowrap">${esc(place(o))}</td>
      <td class="py-3 px-4 text-slate-500 whitespace-nowrap">${esc(daysAgo(o.date_posted || o.first_seen))}</td>
      <td class="py-3 px-4 text-center"><span class="px-2.5 py-1 rounded-full font-extrabold ${scoreCls(o.score)}">${o.score}%</span></td>
      <td class="py-3 px-4">${statusPill(o.app_status) || '<span class="text-slate-300">—</span>'}</td>
    </tr>`).join('')
    : `<tr><td colspan="6" class="py-10 text-center text-slate-400">${S.matches.length ? 'Aucune offre ne correspond à ces filtres.' : 'Aucune offre ne correspond encore à vos compétences. <a href="#/profil" class="underline text-blue-700">Ajoutez des mots-clés</a> ou attendez la prochaine collecte.'}</td></tr>`;
  $$('#tbody tr[data-id]').forEach(tr => tr.addEventListener('click', () => openOffer(Number(tr.dataset.id))));
  $('#more').classList.toggle('hidden', list.length <= S.shown);
}

// ───────────────────────── offer modal ─────────────────────────
function closeModal() { $('#modal').classList.add('hidden'); $('#modalBox').innerHTML = ''; }

async function openOffer(id) {
  let o = S.matches.find(x => x.id === id);
  if (!o) {  // e.g. from "Mes candidatures" for an offer no longer in the list
    try { o = await call(S.sb.from('offers').select('id,url,source,title,company,city,modality,date_posted,valid_through,is_pfe,first_seen,also_on').eq('id', id).single()); }
    catch (e) { return toast(errMsg(e), 'err'); }
    o = Object.assign({ score: null, matched: [], axis_hits: {} }, o);
  }
  let app = null, desc = '';
  try {
    const [a, d] = await Promise.all([
      S.sb.from('applications').select('*').eq('offer_id', id).maybeSingle(),
      S.sb.from('offers').select('description').eq('id', id).single()]);
    app = a.data; desc = d.data?.description || '';
  } catch (e) { /* show what we have */ }
  const hits = o.axis_hits || {};
  const maxHit = Math.max(1, ...Object.values(hits));
  const exp = o.valid_through ? ` · expire le ${fmtDate(o.valid_through)}` : '';
  $('#modalBox').innerHTML = `
    <button id="mClose" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 font-bold" aria-label="Fermer">✕</button>
    <div class="space-y-1 border-b border-slate-200 pb-4 pr-8">
      <div class="flex flex-wrap gap-1.5">${o.is_pfe ? '<span class="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold">PFE</span>' : ''}
        ${o.score != null ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold ${scoreCls(o.score)}">Score ${o.score}%</span>` : ''}
        <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">${esc(srcLabel(o.source))}</span></div>
      <h3 class="text-xl font-bold text-slate-900">${esc(o.title)}</h3>
      <p class="text-xs font-semibold text-slate-500">${esc(o.company || '—')} — ${esc(place(o))} · publiée ${esc(daysAgo(o.date_posted || o.first_seen))}${esc(exp)}</p>
      ${(o.also_on || []).length ? `<p class="text-[11px] text-slate-500">Aussi publiée sur : ${o.also_on.map(a => `<a class="underline hover:text-blue-700" target="_blank" rel="noopener" href="${esc(safeUrl(a.url))}">${esc(srcLabel(a.source))}</a>`).join(', ')}</p>` : ''}
    </div>
    <div class="grid md:grid-cols-5 gap-5 pt-4 text-xs">
      <div class="md:col-span-3 space-y-4">
        ${Object.keys(hits).length ? `<div><h4 class="font-bold text-slate-900 mb-2">Correspondance avec vos axes</h4>
          ${Object.entries(hits).map(([k, v], i) => `<div class="flex items-center gap-2 mb-1"><span class="w-40 truncate text-slate-600">${esc(k)}</span>
          <span class="flex-1 h-2 rounded bg-slate-100"><span class="block h-2 rounded" style="width:${Math.round(100 * v / maxHit)}%;background:${AXIS_COLORS[i % AXIS_COLORS.length]}"></span></span><b class="w-5 text-right">${v}</b></div>`).join('')}</div>` : ''}
        ${(o.matched || []).length ? `<div><h4 class="font-bold text-slate-900 mb-1">Vos compétences repérées</h4><div class="flex flex-wrap gap-1.5">
          ${o.matched.map(k => `<span class="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800">${esc(k)}</span>`).join('')}</div></div>` : ''}
        <div><h4 class="font-bold text-slate-900 mb-1">Description</h4>
          <p class="desc bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-600 leading-relaxed max-h-80 overflow-y-auto scroll">${esc(desc || 'Description non disponible : consultez l’offre originale.')}</p></div>
      </div>
      <form id="appForm" class="md:col-span-2 space-y-3 bg-slate-50 rounded-2xl border border-slate-200 p-4 self-start">
        <h4 class="font-bold text-slate-900">Ma candidature</h4>
        <label class="block font-semibold text-slate-600">Statut<select name="status" class="${input} mt-1">
          <option value="">— Non suivie —</option>${Object.entries(STATUSES).map(([k, s]) => `<option value="${k}" ${app?.status === k ? 'selected' : ''}>${s.label}</option>`).join('')}</select></label>
        <label class="block font-semibold text-slate-600">Date d’envoi<input type="date" name="applied_at" value="${esc(app?.applied_at || '')}" class="${input} mt-1"></label>
        <label class="block font-semibold text-slate-600">Notes<textarea name="notes" rows="3" maxlength="4000" class="${input} mt-1" placeholder="Contact RH, relance prévue…">${esc(app?.notes || '')}</textarea></label>
        <div class="space-y-1">
          <div class="flex items-center justify-between"><span class="font-semibold text-slate-600">Lettre de motivation</span>
            <span class="space-x-2"><button type="button" id="genLetter" class="underline text-blue-700">Générer</button><button type="button" id="copyLetter" class="underline text-slate-500">Copier</button></span></div>
          <textarea name="letter" rows="6" maxlength="10000" class="${input}" placeholder="Cliquez sur « Générer » pour un brouillon personnalisé.">${esc(app?.letter || '')}</textarea>
        </div>
        <div class="flex flex-wrap gap-2 pt-1">
          <button class="${btnPrimary} flex-1">Enregistrer</button>
          ${app ? '<button type="button" id="untrack" class="' + btnGhost + '">Retirer</button>' : ''}
        </div>
        <div class="flex flex-col gap-2 pt-2 border-t border-slate-200">
          <a href="${esc(safeUrl(o.url))}" target="_blank" rel="noopener" class="${btn} bg-slate-900 hover:bg-slate-800 text-white text-center">Postuler sur ${esc(srcLabel(o.source))} ↗</a>
          ${S.profile.cv_path ? '<button type="button" id="myCv" class="underline text-slate-500">Ouvrir mon CV</button>' : '<a href="#/profil" class="underline text-slate-500 text-center">Ajouter mon CV au profil</a>'}
        </div>
      </form>
    </div>`;
  $('#modal').classList.remove('hidden');
  $('#mClose').onclick = closeModal;
  const form = $('#appForm');
  form.status.addEventListener('change', () => {
    if (['envoyee', 'relance', 'entretien'].includes(form.status.value) && !form.applied_at.value)
      form.applied_at.value = new Date().toISOString().slice(0, 10);
  });
  $('#genLetter').onclick = () => {
    if (form.letter.value.trim() && !confirm('Remplacer la lettre actuelle par un nouveau brouillon ?')) return;
    form.letter.value = buildLetter(o);
  };
  $('#copyLetter').onclick = async () => {
    try { await navigator.clipboard.writeText(form.letter.value); toast('Lettre copiée'); }
    catch { form.letter.select(); toast('Sélectionnée : Ctrl+C pour copier'); }
  };
  if ($('#myCv')) $('#myCv').onclick = openMyCv;
  if ($('#untrack')) $('#untrack').onclick = async () => {
    try {
      await call(S.sb.from('applications').delete().eq('offer_id', id).eq('user_id', S.user.id));
      const m = S.matches.find(x => x.id === id); if (m) { m.app_status = null; }
      S.apps = null; toast('Suivi retiré'); closeModal(); refreshCurrent();
    } catch (e) { toast(errMsg(e), 'err'); }
  };
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const fd = new FormData(form);
    if (!fd.get('status')) { if (!app) return closeModal(); fd.set('status', 'a_postuler'); }
    try {
      await saveApplication(id, { status: fd.get('status'), notes: fd.get('notes'), letter: fd.get('letter'), applied_at: fd.get('applied_at') || null });
      toast('Candidature enregistrée'); closeModal(); refreshCurrent();
    } catch (e) { toast(errMsg(e), 'err'); }
  });
}

function refreshCurrent() {
  if (S.view === 'offres' && $('#tbody')) renderOfferRows();
  else if (S.view === 'candidatures') viewApps();
}

function buildLetter(o) {
  const p = S.profile;
  const kws = (o.matched || []).slice(0, 4);
  const kwText = kws.length > 1 ? kws.slice(0, -1).join(', ') + ' et ' + kws[kws.length - 1] : kws[0] || '';
  const who = p.headline || (p.school ? `étudiant(e) à ${p.school}` : 'étudiant(e) ingénieur(e)');
  return [
    `Objet : Candidature — ${o.title}`, '',
    'Madame, Monsieur,', '',
    `Actuellement ${who}, je vous adresse ma candidature pour l’offre « ${o.title} »${o.company ? ` au sein de ${o.company}` : ''}${o.city ? ` à ${o.city}` : ''}.`, '',
    p.pitch || '[Présentez ici en 2-3 phrases vos projets ou expériences les plus proches de l’offre.]', '',
    kwText ? `Votre offre met l’accent sur ${kwText} : ce sont des compétences que j’ai mises en pratique dans mes projets et que je serais heureux(se) de mettre au service de vos équipes.` :
      'Les missions décrites correspondent à mon projet professionnel et aux compétences que je développe.', '',
    `Disponible pour ${o.is_pfe || p.wants_pfe ? 'un stage de fin d’études (PFE)' : 'un stage'}, je me tiens à votre disposition pour un entretien.`, '',
    'Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.', '',
    p.full_name || '', p.email || '',
  ].join('\n');
}

async function openMyCv() {
  try {
    const data = await call(S.sb.storage.from('cvs').createSignedUrl(S.profile.cv_path, 120));
    window.open(data.signedUrl, '_blank', 'noopener');
  } catch (e) { toast(errMsg(e), 'err'); }
}

// ───────────────────────── view: candidatures ─────────────────────────
async function viewApps() {
  const v = $('#view');
  v.innerHTML = `<div class="${card} text-sm text-slate-500">Chargement…</div>`;
  try { S.apps = await call(S.sb.rpc('my_applications')); } catch (e) {
    v.innerHTML = `<div class="${card} text-sm text-rose-600">${esc(errMsg(e))}</div>`; return;
  }
  const counts = Object.fromEntries(Object.keys(STATUSES).map(k => [k, 0]));
  S.apps.forEach(a => counts[a.status]++);
  v.innerHTML = `
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div><h1 class="text-2xl font-extrabold text-slate-900">Mes candidatures</h1>
      <p class="text-sm text-slate-500">${S.apps.length} offre${S.apps.length > 1 ? 's' : ''} suivie${S.apps.length > 1 ? 's' : ''}. Visible uniquement par vous.</p></div>
      <button id="csv" class="${btnGhost}">📥 Export CSV</button>
    </div>
    <section class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      ${Object.entries(STATUSES).map(([k, s]) => `<div class="rounded-2xl border p-3 ${s.cls}"><div class="text-[10px] font-bold uppercase">${s.label}</div><div class="text-2xl font-extrabold">${counts[k]}</div></div>`).join('')}
    </section>
    <section class="${card}">
      ${S.apps.length ? `<div class="overflow-x-auto scroll"><table class="w-full text-left text-xs">
        <thead><tr class="text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
          <th class="py-2 pr-4">Poste</th><th class="py-2 pr-4">Entreprise</th><th class="py-2 pr-4">Statut</th><th class="py-2 pr-4">Envoyée le</th><th class="py-2 pr-4">Mise à jour</th><th class="py-2"></th></tr></thead>
        <tbody class="divide-y divide-slate-100">${S.apps.map(a => `
          <tr><td class="py-2.5 pr-4 font-semibold text-slate-900 min-w-[200px]">${esc(a.title)}${a.active ? '' : ' <span class="text-[10px] text-slate-400 font-normal">(offre retirée)</span>'}
              ${a.notes ? `<div class="text-[11px] font-normal text-slate-500 truncate max-w-xs">${esc(a.notes)}</div>` : ''}</td>
            <td class="py-2.5 pr-4">${esc(a.company || '—')}<div class="text-[10px] text-slate-400">${esc(a.city || '')}</div></td>
            <td class="py-2.5 pr-4"><select data-offer="${a.offer_id}" class="appStatus px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs">
              ${Object.entries(STATUSES).map(([k, s]) => `<option value="${k}" ${a.status === k ? 'selected' : ''}>${s.label}</option>`).join('')}</select></td>
            <td class="py-2.5 pr-4 whitespace-nowrap">${esc(fmtDate(a.applied_at))}</td>
            <td class="py-2.5 pr-4 whitespace-nowrap text-slate-500">${esc(daysAgo(a.updated_at))}</td>
            <td class="py-2.5 text-right whitespace-nowrap"><button data-open="${a.offer_id}" class="underline text-blue-700">Ouvrir</button></td></tr>`).join('')}
        </tbody></table></div>`
      : `<p class="text-sm text-slate-500 text-center py-8">Aucune candidature suivie. Ouvrez une offre dans <a href="#/offres" class="underline text-blue-700">Offres</a> et choisissez un statut.</p>`}
    </section>
  </div>`;
  $$('.appStatus').forEach(sel => sel.addEventListener('change', async e => {
    const offerId = Number(e.target.dataset.offer), status = e.target.value;
    const a = S.apps.find(x => x.offer_id === offerId);
    const patch = { status };
    if (['envoyee', 'relance', 'entretien'].includes(status) && !a.applied_at) patch.applied_at = new Date().toISOString().slice(0, 10);
    try { await saveApplication(offerId, patch); toast('Statut mis à jour'); viewApps(); } catch (err) { toast(errMsg(err), 'err'); }
  }));
  $$('[data-open]').forEach(b => b.addEventListener('click', () => openOffer(Number(b.dataset.open))));
  $('#csv').onclick = () => downloadCsv(`candidatures_${new Date().toISOString().slice(0, 10)}.csv`,
    ['Poste', 'Entreprise', 'Ville', 'Statut', 'Envoyée le', 'Notes', 'Lien'],
    S.apps.map(a => [a.title, a.company, a.city, STATUSES[a.status]?.label, a.applied_at, a.notes, a.url]));
}

function downloadCsv(name, head, rows) {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob(['﻿' + [head, ...rows].map(r => r.map(q).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ───────────────────────── view: marché ─────────────────────────
async function viewMarket() {
  const v = $('#view');
  v.innerHTML = `<div class="${card} text-sm text-slate-500">Chargement…</div>`;
  try { await loadMatches(); } catch (e) { v.innerHTML = `<div class="${card} text-sm text-rose-600">${esc(errMsg(e))}</div>`; return; }
  v.innerHTML = `<div class="space-y-6">
    <div><h1 class="text-2xl font-extrabold text-slate-900">Marché</h1><p class="text-sm text-slate-500">Calculé sur les ${S.matches.length} offres qui correspondent à votre profil.</p></div>
    <div class="grid lg:grid-cols-2 gap-5">
      <div class="${card}"><h2 class="text-sm font-bold mb-2">Offres par ville</h2><div class="chart-box"><canvas id="cCity"></canvas></div></div>
      <div class="${card}"><h2 class="text-sm font-bold mb-2">Offres par source</h2><div class="chart-box"><canvas id="cSrc"></canvas></div></div>
      <div class="${card} lg:col-span-2"><h2 class="text-sm font-bold">Vos priorités vs la demande</h2>
        <p class="text-xs text-slate-500 mb-2">Part de chaque axe dans vos pondérations, comparée à sa part dans les compétences demandées par ces offres.</p>
        <div class="chart-box"><canvas id="cAxes"></canvas></div></div>
      <div class="${card} lg:col-span-2"><h2 class="text-sm font-bold mb-2">Compétences les plus demandées (parmi les vôtres)</h2><div id="topKw" class="flex flex-wrap gap-2"></div></div>
    </div></div>`;
  if (typeof Chart === 'undefined') return;
  const count = f => { const m = {}; S.matches.forEach(o => { const k = f(o); m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const font = { family: 'Plus Jakarta Sans', size: 11 };
  const bar = (id, entries, color) => new Chart($(id), { type: 'bar',
    data: { labels: entries.map(e => e[0]), datasets: [{ data: entries.map(e => e[1]), backgroundColor: color, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0, font } }, x: { ticks: { font } } } } });
  S.charts.city = bar('#cCity', count(o => o.modality === 'Télétravail' ? 'Télétravail' : (o.city || 'Non précisé')).slice(0, 10), '#1d4ed8');
  S.charts.src = bar('#cSrc', count(o => srcLabel(o.source)), '#0d9488');
  const axes = S.profile.axes || [];
  const wSum = axes.reduce((a, x) => a + (+x.weight || 0), 0) || 1;
  const demand = axes.map(x => S.matches.reduce((a, o) => a + ((o.axis_hits || {})[x.label] || 0), 0));
  const dSum = demand.reduce((a, b) => a + b, 0) || 1;
  S.charts.axes = new Chart($('#cAxes'), { type: axes.length >= 3 ? 'radar' : 'bar',
    data: { labels: axes.map(x => x.label), datasets: [
      { label: 'Mes priorités (%)', data: axes.map(x => Math.round(100 * (+x.weight || 0) / wSum)), backgroundColor: 'rgba(37,99,235,.2)', borderColor: '#2563eb', pointBackgroundColor: '#2563eb' },
      { label: 'Demande (%)', data: demand.map(d => Math.round(100 * d / dSum)), backgroundColor: 'rgba(13,148,136,.18)', borderColor: '#0d9488', pointBackgroundColor: '#0d9488' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { font } } } } });
  const kw = {}; S.matches.forEach(o => (o.matched || []).forEach(k => kw[k] = (kw[k] || 0) + 1));
  $('#topKw').innerHTML = Object.entries(kw).sort((a, b) => b[1] - a[1]).slice(0, 30)
    .map(([k, n]) => `<span class="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs"><b>${esc(k)}</b> <span class="text-slate-500">${n}</span></span>`).join('') || '<span class="text-sm text-slate-400">—</span>';
}

// ───────────────────────── view: profil ─────────────────────────
function viewProfile() {
  const p = S.profile;
  const axes = JSON.parse(JSON.stringify(p.axes || []));
  const first = !axes.length;
  const v = $('#view');
  v.innerHTML = `
  <form id="pf" class="space-y-6 max-w-4xl mx-auto">
    ${first ? `<div class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><b>Bienvenue !</b> Choisissez votre domaine ci-dessous puis enregistrez : vos offres seront classées selon ces compétences.</div>` : ''}
    <div class="flex items-end justify-between gap-3"><div><h1 class="text-2xl font-extrabold text-slate-900">Mon profil</h1>
      <p class="text-sm text-slate-500">${esc(p.email)} · ${p.role === 'admin' ? 'administrateur' : 'membre'}</p></div>
      <button class="${btnPrimary}">Enregistrer</button></div>

    <section class="${card} grid sm:grid-cols-2 gap-4">
      <h2 class="sm:col-span-2 font-bold text-slate-900">Identité</h2>
      <label class="text-xs font-semibold text-slate-600">Nom complet<input name="full_name" maxlength="80" value="${esc(p.full_name)}" class="${input} mt-1"></label>
      <label class="text-xs font-semibold text-slate-600">École / université<input name="school" maxlength="120" value="${esc(p.school)}" class="${input} mt-1" placeholder="EMSI Tanger"></label>
      <label class="sm:col-span-2 text-xs font-semibold text-slate-600">Titre (utilisé dans les lettres)<input name="headline" maxlength="160" value="${esc(p.headline)}" class="${input} mt-1" placeholder="élève ingénieur en IA & Data à l’EMSI Tanger"></label>
      <div class="sm:col-span-2 text-xs font-semibold text-slate-600">Villes préférées (+3 points)
        <div class="flex flex-wrap gap-2 mt-2">${CITIES.map(c => `<label class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 font-medium cursor-pointer has-[:checked]:bg-blue-50 has-[:checked]:border-blue-300">
          <input type="checkbox" name="cities" value="${esc(c)}" ${(p.preferred_cities || []).includes(c) ? 'checked' : ''} class="accent-blue-600">${esc(c)}</label>`).join('')}</div></div>
      <label class="sm:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" name="wants_pfe" ${p.wants_pfe ? 'checked' : ''} class="w-4 h-4 accent-blue-600"> Je cherche un stage de fin d’études (PFE) : +5 points aux offres PFE</label>
    </section>

    <section class="${card} space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div><h2 class="font-bold text-slate-900">Domaine & compétences</h2>
        <p class="text-xs text-slate-500">Chaque axe a un poids (son importance pour vous) et des mots-clés cherchés dans les offres. Séparez les mots-clés par des virgules.</p></div>
        <div class="flex gap-2"><select id="tpl" class="${input} sm:w-64">${Object.entries(FIELDS).map(([k, f]) => `<option value="${k}" ${p.field === k ? 'selected' : ''}>${esc(f.label)}</option>`).join('')}</select>
        <button type="button" id="applyTpl" class="${btnGhost} whitespace-nowrap">Appliquer</button></div>
      </div>
      <div id="axes" class="space-y-3"></div>
      <button type="button" id="addAxis" class="${btnGhost}">+ Ajouter un axe</button>
    </section>

    <section class="${card} space-y-2">
      <h2 class="font-bold text-slate-900">Présentation (pour les lettres)</h2>
      <p class="text-xs text-slate-500">2 à 4 phrases sur vos projets ou expériences clés. Reprises dans chaque brouillon de lettre.</p>
      <textarea name="pitch" rows="4" maxlength="1500" class="${input}" placeholder="J’ai notamment conçu…">${esc(p.pitch)}</textarea>
    </section>

    <section class="${card} space-y-3">
      <h2 class="font-bold text-slate-900">CV</h2>
      <p class="text-xs text-slate-500">PDF, 5 Mo maximum. Stocké en privé : vous seul pouvez l’ouvrir.</p>
      <div class="flex flex-wrap items-center gap-3">
        <span id="cvState" class="text-sm">${p.cv_path ? '✅ CV enregistré' : 'Aucun CV'}</span>
        <label class="${btnGhost} cursor-pointer">Choisir un PDF<input id="cvFile" type="file" accept="application/pdf" class="hidden"></label>
        ${p.cv_path ? '<button type="button" id="cvOpen" class="underline text-sm text-blue-700">Ouvrir</button><button type="button" id="cvDel" class="underline text-sm text-rose-600">Supprimer</button>' : ''}
      </div>
    </section>
    <div class="flex justify-end"><button class="${btnPrimary}">Enregistrer</button></div>
  </form>`;

  const renderAxes = () => {
    $('#axes').innerHTML = axes.map((a, i) => `
      <div class="rounded-2xl border border-slate-200 p-4 space-y-3" data-i="${i}">
        <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
          <span class="w-3 h-3 rounded-full shrink-0" style="background:${AXIS_COLORS[i % AXIS_COLORS.length]}"></span>
          <input data-k="label" value="${esc(a.label)}" maxlength="60" class="${input} sm:flex-1 font-semibold" placeholder="Nom de l’axe">
          <label class="flex items-center gap-2 text-xs font-semibold text-slate-600 sm:w-64">Poids
            <input data-k="weight" type="range" min="0" max="100" value="${+a.weight || 0}" class="flex-1 accent-blue-600"><b class="w-8 text-right">${+a.weight || 0}</b></label>
          <button type="button" data-del="${i}" class="text-xs underline text-rose-600 self-end sm:self-auto">Supprimer</button>
        </div>
        <textarea data-k="keywords" rows="2" class="${input} text-xs" placeholder="python, sql, power bi…">${esc((a.keywords || []).join(', '))}</textarea>
      </div>`).join('') || '<p class="text-sm text-slate-400">Aucun axe : appliquez un modèle ou ajoutez un axe.</p>';
    $$('#axes [data-i]').forEach(box => {
      const i = +box.dataset.i;
      box.querySelector('[data-k="label"]').oninput = e => axes[i].label = e.target.value;
      box.querySelector('[data-k="weight"]').oninput = e => { axes[i].weight = +e.target.value; e.target.nextElementSibling.textContent = e.target.value; };
      box.querySelector('[data-k="keywords"]').oninput = e => axes[i].keywords = e.target.value.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
    });
    $$('#axes [data-del]').forEach(b => b.onclick = () => { axes.splice(+b.dataset.del, 1); renderAxes(); });
    $('#addAxis').disabled = axes.length >= 6;
  };
  renderAxes();
  $('#applyTpl').onclick = () => {
    if (axes.length && !confirm('Remplacer vos axes actuels par ceux du modèle ?')) return;
    axes.splice(0, axes.length, ...JSON.parse(JSON.stringify(FIELDS[$('#tpl').value].axes)));
    renderAxes();
  };
  if (first) { axes.push(...JSON.parse(JSON.stringify(FIELDS.ia_data.axes))); $('#tpl').value = 'ia_data'; renderAxes(); }
  $('#addAxis').onclick = () => { if (axes.length < 6) { axes.push({ label: 'Nouvel axe', weight: 20, keywords: [] }); renderAxes(); } };

  $('#pf').addEventListener('submit', async ev => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const clean = axes.map(a => ({ label: String(a.label || '').trim().slice(0, 60) || 'Axe',
      weight: Math.max(0, Math.min(100, +a.weight || 0)),
      keywords: [...new Set((a.keywords || []).map(k => String(k).trim().slice(0, 60)).filter(k => k.length > 1))].slice(0, 60) }));
    const labels = clean.map(a => a.label.toLowerCase());
    if (new Set(labels).size !== labels.length) return toast('Deux axes ont le même nom', 'err');
    const patch = { full_name: String(fd.get('full_name')).trim(), school: String(fd.get('school')).trim(),
      headline: String(fd.get('headline')).trim(), pitch: String(fd.get('pitch')).trim(),
      preferred_cities: fd.getAll('cities'), wants_pfe: fd.get('wants_pfe') === 'on', field: $('#tpl').value, axes: clean };
    try {
      S.profile = await call(S.sb.from('profiles').update(patch).eq('id', S.user.id).select().single());
      S.loadedAt = 0; $('#whoami').textContent = S.profile.full_name || S.profile.email;
      toast('Profil enregistré : scores recalculés');
      if (first) location.hash = '#/offres'; else viewProfile();
    } catch (e) { toast(errMsg(e), 'err'); }
  });

  $('#cvFile').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.type !== 'application/pdf') return toast('Le CV doit être un PDF', 'err');
    if (file.size > 5 * 1024 * 1024) return toast('PDF trop lourd (5 Mo max)', 'err');
    $('#cvState').textContent = 'Envoi…';
    const path = `${S.user.id}/cv.pdf`;
    try {
      await call(S.sb.storage.from('cvs').upload(path, file, { upsert: true, contentType: 'application/pdf' }));
      S.profile = await call(S.sb.from('profiles').update({ cv_path: path }).eq('id', S.user.id).select().single());
      toast('CV enregistré'); viewProfile();
    } catch (err) { $('#cvState').textContent = 'Échec de l’envoi'; toast(errMsg(err), 'err'); }
  });
  if ($('#cvOpen')) $('#cvOpen').onclick = openMyCv;
  if ($('#cvDel')) $('#cvDel').onclick = async () => {
    if (!confirm('Supprimer votre CV ?')) return;
    try {
      await call(S.sb.storage.from('cvs').remove([S.profile.cv_path]));
      S.profile = await call(S.sb.from('profiles').update({ cv_path: null }).eq('id', S.user.id).select().single());
      toast('CV supprimé'); viewProfile();
    } catch (err) { toast(errMsg(err), 'err'); }
  };
}

// ───────────────────────── view: admin ─────────────────────────
async function viewAdmin() {
  const v = $('#view');
  v.innerHTML = `<div class="${card} text-sm text-slate-500">Chargement…</div>`;
  let users, stats, invites;
  try {
    [users, stats, invites] = await Promise.all([call(S.sb.rpc('admin_users')), call(S.sb.rpc('admin_stats')),
      call(S.sb.from('invites').select('*').order('created_at', { ascending: false }))]);
  } catch (e) { v.innerHTML = `<div class="${card} text-sm text-rose-600">${esc(errMsg(e))}</div>`; return; }
  const run = stats.last_run;
  const apps = stats.apps_by_status || {};
  const sent = Object.entries(apps).filter(([k]) => k !== 'a_postuler').reduce((a, [, n]) => a + n, 0);
  const pill = st => ({ approved: 'bg-emerald-50 text-emerald-700 border-emerald-200', pending: 'bg-amber-50 text-amber-800 border-amber-200', blocked: 'bg-rose-50 text-rose-700 border-rose-200' }[st]);
  const stLabel = { approved: 'Validé', pending: 'En attente', blocked: 'Bloqué' };
  v.innerHTML = `
  <div class="space-y-6">
    <div><h1 class="text-2xl font-extrabold text-slate-900">Back office</h1>
      <p class="text-sm text-slate-500">Gestion des membres et suivi de la collecte. Les notes, lettres et CV des membres restent privés.</p></div>
    <section class="grid grid-cols-2 md:grid-cols-4 gap-3">
      ${[['Membres validés', stats.users, ''], ['En attente', stats.pending, stats.pending ? 'à valider ci-dessous' : ''],
         ['Offres actives', stats.offers_active, Object.entries(stats.offers_by_source || {}).map(([s, n]) => `${esc(srcLabel(s))} ${n}`).join(' · ')],
         ['Candidatures envoyées', sent, `${apps.entretien || 0} entretien(s) · ${apps.offre || 0} offre(s)`]]
        .map(([l, n, s]) => `<div class="bg-white p-4 rounded-2xl border border-slate-200"><div class="text-[11px] font-medium text-slate-500 uppercase tracking-wider">${l}</div>
          <div class="text-3xl font-extrabold mt-1">${n ?? 0}</div><div class="text-[11px] text-slate-500 mt-1">${s}</div></div>`).join('')}
    </section>
    <section class="${card} text-sm">
      <h2 class="font-bold text-slate-900 mb-1">Dernière collecte</h2>
      ${run ? `<p class="text-slate-600">${esc(new Date(run.run_at).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }))} — ${run.stats?.synced ?? 0} offres synchronisées, ${run.stats?.new_this_run ?? 0} nouvelles, ${run.stats?.deactivated ?? 0} retirées.
        ${(Date.now() - new Date(run.run_at)) > 2.5 * 864e5 ? '<br><b class="text-amber-700">Plus de 2 jours : vérifiez la tâche GitHub Actions.</b>' : ''}</p>`
        : '<p class="text-amber-700">Aucune collecte enregistrée. Ajoutez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY aux secrets GitHub et lancez le workflow.</p>'}
    </section>
    <section class="${card} space-y-4">
      <h2 class="font-bold text-slate-900">Membres (${users.length})</h2>
      <div class="overflow-x-auto scroll"><table class="w-full text-left text-xs">
        <thead><tr class="text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
          <th class="py-2 pr-4">Membre</th><th class="py-2 pr-4">École / domaine</th><th class="py-2 pr-4">Statut</th>
          <th class="py-2 pr-4 text-center">Suivies</th><th class="py-2 pr-4 text-center">Envoyées</th><th class="py-2 pr-4 text-center">Entretiens</th>
          <th class="py-2 pr-4">Activité</th><th class="py-2 text-right">Actions</th></tr></thead>
        <tbody class="divide-y divide-slate-100">${users.map(u => {
          const me = u.id === S.user.id;
          const acts = [];
          if (u.status !== 'approved') acts.push(['approved', 'Valider', 'text-emerald-700']);
          if (u.status !== 'blocked' && !me) acts.push(['blocked', 'Bloquer', 'text-rose-600']);
          if (u.status === 'approved' && !me) acts.push([u.role === 'admin' ? 'user' : 'admin', u.role === 'admin' ? 'Retirer admin' : 'Rendre admin', 'text-slate-600']);
          return `<tr><td class="py-2.5 pr-4"><b class="text-slate-900">${esc(u.full_name || '—')}</b>${u.role === 'admin' ? ' <span class="text-[10px] px-1.5 rounded bg-slate-900 text-white">admin</span>' : ''}${me ? ' <span class="text-[10px] text-slate-400">(vous)</span>' : ''}
              <div class="text-slate-500">${esc(u.email)}</div></td>
            <td class="py-2.5 pr-4">${esc(u.school || '—')}<div class="text-[10px] text-slate-400">${esc(FIELDS[u.field]?.label || u.field || '')}</div></td>
            <td class="py-2.5 pr-4"><span class="px-2 py-0.5 rounded-md border text-[10px] font-bold ${pill(u.status)}">${stLabel[u.status]}</span>
              <div class="text-[10px] text-slate-400 mt-0.5">inscrit ${esc(daysAgo(u.created_at))}</div></td>
            <td class="py-2.5 pr-4 text-center">${u.n_applications}</td><td class="py-2.5 pr-4 text-center">${u.n_sent}</td><td class="py-2.5 pr-4 text-center">${u.n_interviews}</td>
            <td class="py-2.5 pr-4 text-slate-500 whitespace-nowrap">${u.last_activity ? esc(daysAgo(u.last_activity)) : '—'}</td>
            <td class="py-2.5 text-right whitespace-nowrap space-x-2">${acts.map(([act, l, c]) => `<button data-u="${u.id}" data-act="${act}" class="underline font-semibold ${c}">${l}</button>`).join('')}</td></tr>`;
        }).join('')}</tbody></table></div>
    </section>
    <section class="${card} space-y-3">
      <h2 class="font-bold text-slate-900">Invitations</h2>
      <p class="text-xs text-slate-500">Un e-mail invité est validé automatiquement à l’inscription. Envoyez ensuite le lien du site à votre ami(e).</p>
      <form id="inviteForm" class="flex flex-col sm:flex-row gap-2"><input name="email" type="email" required placeholder="ami@exemple.com" class="${input} sm:max-w-sm"><button class="${btnPrimary}">Inviter</button></form>
      <div class="flex flex-wrap gap-2">${invites.map(i => `<span class="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs">${esc(i.email)} <button data-uninvite="${esc(i.email)}" class="ml-1 text-rose-600" aria-label="Retirer">✕</button></span>`).join('') || '<span class="text-xs text-slate-400">Aucune invitation en attente.</span>'}</div>
      <div class="flex items-center gap-2 pt-2"><input id="siteLink" readonly value="${esc(location.origin + location.pathname)}" class="${input} sm:max-w-sm text-xs"><button id="copyLink" type="button" class="${btnGhost}">Copier le lien</button></div>
    </section>
  </div>`;
  $$('[data-act]').forEach(b => b.onclick = async () => {
    const act = b.dataset.act, patch = act === 'admin' || act === 'user' ? { role: act } : { status: act };
    if (act === 'blocked' && !confirm('Bloquer ce membre ? Il ne pourra plus accéder à l’application.')) return;
    try { await call(S.sb.from('profiles').update(patch).eq('id', b.dataset.u)); toast('Membre mis à jour'); viewAdmin(); renderNav(); }
    catch (e) { toast(errMsg(e), 'err'); }
  });
  $('#inviteForm').addEventListener('submit', async ev => {
    ev.preventDefault();
    const email = String(new FormData(ev.target).get('email')).trim().toLowerCase();
    try { await call(S.sb.from('invites').insert({ email, invited_by: S.user.id })); toast('Invitation ajoutée'); viewAdmin(); }
    catch (e) { toast(/duplicate/i.test(errMsg(e)) ? 'Déjà invité' : errMsg(e), 'err'); }
  });
  $$('[data-uninvite]').forEach(b => b.onclick = async () => {
    try { await call(S.sb.from('invites').delete().eq('email', b.dataset.uninvite)); viewAdmin(); } catch (e) { toast(errMsg(e), 'err'); }
  });
  $('#copyLink').onclick = async () => { try { await navigator.clipboard.writeText($('#siteLink').value); toast('Lien copié'); } catch { $('#siteLink').select(); } };
}

boot();
