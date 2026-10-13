export const STATUSES = {
  a_postuler: { label: 'À postuler', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  envoyee:    { label: 'Envoyée',    cls: 'bg-blue-50 text-blue-800 border-blue-200' },
  relance:    { label: 'Relancée',   cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  entretien:  { label: 'Entretien',  cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  offre:      { label: 'Offre reçue', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  refus:      { label: 'Refus',      cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  abandon:    { label: 'Abandonnée', cls: 'bg-slate-50 text-slate-400 border-slate-200' },
} as const;

export type ApplicationStatus = keyof typeof STATUSES;

export const ALL_KANBAN_COLS = [
  { id: 'a_postuler', title: 'À postuler', headerCls: 'bg-slate-200 text-slate-800' },
  { id: 'envoyee',    title: 'Envoyée',    headerCls: 'bg-blue-100 text-blue-800' },
  { id: 'relance',    title: 'Relancée',   headerCls: 'bg-indigo-100 text-indigo-800' },
  { id: 'entretien',  title: 'Entretien',  headerCls: 'bg-amber-200 text-amber-950 ring-2 ring-amber-400' },
  { id: 'offre',      title: 'Offre reçue', headerCls: 'bg-emerald-200 text-emerald-950 ring-2 ring-emerald-400' },
  { id: 'refus',      title: 'Refusée',    headerCls: 'bg-rose-100 text-rose-800' },
  { id: 'abandon',    title: 'Sans suite', headerCls: 'bg-slate-200 text-slate-600' },
] as const;

export const CITIES = [
  'Casablanca', 'Rabat', 'Tanger', 'Marrakech', 'Fès', 'Agadir', 'Kénitra', 'Mohammedia',
  'Tétouan', 'Oujda', 'Meknès', 'El Jadida', 'Bouskoura', 'Télétravail'
] as const;

export const AXIS_COLORS = [
  '#2563eb', '#0d9488', '#d97706', '#7c3aed', '#db2777', '#059669'
] as const;

export interface FieldTemplate {
  label: string;
  axes: Array<{
    label: string;
    weight: number;
    keywords: string[];
  }>;
}

export const FIELDS: Record<string, FieldTemplate> = {
  ia_data: {
    label: 'IA & Data',
    axes: [
      { label: 'IA générative & LLM', weight: 35, keywords: ['llm', 'rag', 'langchain', 'langgraph', 'genai', 'ia generative', 'prompt engineering', 'agents ia', 'nlp', 'transformers', 'hugging face', 'openai', 'fine-tuning', 'chatbot'] },
      { label: 'Data engineering & Big Data', weight: 25, keywords: ['spark', 'pyspark', 'hadoop', 'kafka', 'airflow', 'etl', 'data engineer', 'big data', 'sql', 'nosql', 'databricks', 'data warehouse', 'pipeline', 'dbt'] },
      { label: 'Machine learning & Data science', weight: 25, keywords: ['machine learning', 'deep learning', 'data science', 'data scientist', 'scikit-learn', 'pytorch', 'tensorflow', 'mlops', 'python', 'statistiques', 'pandas', 'modeles predictifs'] },
      { label: 'Computer vision', weight: 15, keywords: ['computer vision', 'vision par ordinateur', 'cnn', 'opencv', 'yolo', 'traitement d images', 'image processing', 'segmentation'] },
    ],
  },
  dev: {
    label: 'Développement logiciel',
    axes: [
      { label: 'Backend', weight: 35, keywords: ['java', 'spring boot', 'node.js', 'nestjs', 'django', 'fastapi', '.net', 'c#', 'php', 'laravel', 'symfony', 'api rest', 'microservices', 'sql'] },
      { label: 'Frontend', weight: 30, keywords: ['react', 'angular', 'vue', 'next.js', 'typescript', 'javascript', 'html', 'css', 'tailwind', 'ui'] },
      { label: 'Mobile', weight: 15, keywords: ['flutter', 'react native', 'kotlin', 'swift', 'android', 'ios', 'mobile'] },
      { label: 'DevOps & Cloud', weight: 20, keywords: ['docker', 'kubernetes', 'ci/cd', 'devops', 'aws', 'azure', 'gcp', 'git', 'jenkins', 'linux', 'terraform'] },
    ],
  },
  cyber: {
    label: 'Cybersécurité & Réseaux',
    axes: [
      { label: 'Sécurité offensive & défensive', weight: 40, keywords: ['cybersecurite', 'securite', 'soc', 'siem', 'pentest', 'tests d intrusion', 'iso 27001', 'vulnerabilites', 'forensic', 'owasp', 'red team', 'blue team'] },
      { label: 'Réseaux', weight: 30, keywords: ['reseau', 'reseaux', 'cisco', 'ccna', 'routage', 'switching', 'firewall', 'fortinet', 'vpn', 'tcp/ip', 'wifi', 'telecom'] },
      { label: 'Systèmes & Cloud', weight: 30, keywords: ['linux', 'windows server', 'active directory', 'virtualisation', 'vmware', 'azure', 'aws', 'cloud', 'administration systeme', 'scripting', 'powershell'] },
    ],
  },
  bi_erp: {
    label: 'BI, ERP & Systèmes d\'information',
    axes: [
      { label: 'Business intelligence', weight: 35, keywords: ['power bi', 'tableau', 'qlik', 'business intelligence', 'bi', 'dax', 'sql', 'reporting', 'dashboard', 'etl', 'data analyst', 'excel'] },
      { label: 'ERP', weight: 35, keywords: ['sap', 'odoo', 'erp', 'dynamics', 'sage', 'abap', 'crm', 'salesforce'] },
      { label: 'Gestion de projet & MOA', weight: 30, keywords: ['gestion de projet', 'agile', 'scrum', 'jira', 'cahier des charges', 'specifications', 'business analyst', 'moa', 'uml', 'processus'] },
    ],
  },
  industriel: {
    label: 'Génie industriel & Qualité',
    axes: [
      { label: 'Lean & méthodes', weight: 30, keywords: ['lean', 'lean manufacturing', 'kaizen', '5s', 'vsm', 'smed', 'methodes', 'amelioration continue', 'six sigma', 'kpi'] },
      { label: 'Qualité', weight: 30, keywords: ['qualite', 'iso 9001', 'iatf', 'amdec', '8d', 'spc', 'audit', 'qhse', 'controle qualite', 'non-conformites'] },
      { label: 'Supply chain & logistique', weight: 20, keywords: ['supply chain', 'logistique', 'approvisionnement', 'stocks', 'planification', 'achats', 'transport', 'mrp'] },
      { label: 'Production & maintenance', weight: 20, keywords: ['production', 'maintenance', 'gmao', 'tpm', 'automobile', 'aeronautique', 'process', 'industrialisation'] },
    ],
  },
  electrique: {
    label: 'Électrique, Électronique & Embarqué',
    axes: [
      { label: 'Systèmes embarqués', weight: 40, keywords: ['systemes embarques', 'embarque', 'embedded', 'c', 'c++', 'stm32', 'microcontroleur', 'rtos', 'arduino', 'iot', 'firmware'] },
      { label: 'Automatisme & électrique', weight: 35, keywords: ['automatisme', 'automate', 'plc', 'siemens', 'tia portal', 'schneider', 'electrique', 'electrotechnique', 'variateur', 'scada'] },
      { label: 'Automobile & aéro', weight: 25, keywords: ['autosar', 'can', 'catia', 'cablage', 'harness', 'aeronautique', 'automobile', 'validation', 'matlab', 'simulink'] },
    ],
  },
  custom: {
    label: 'Autre / personnalisé',
    axes: [{ label: 'Mes compétences', weight: 50, keywords: [] }],
  },
};
