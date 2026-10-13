import ExcelJS from 'exceljs';
import type { ApplicationItem } from '../../types/api';
import { STATUSES } from '../../lib/constants';
import { formatDateTime } from '../../lib/format';

export async function exportAppsExcel(apps: ApplicationItem[]): Promise<void> {
  if (!apps || !apps.length) return;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Stage Radar';
  wb.created = new Date();

  const ws = wb.addWorksheet('Mes candidatures', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { defaultRowHeight: 22, tabColor: { argb: 'FF047857' } },
  });

  ws.columns = [
    { header: 'Type', key: 'type', width: 14 },
    { header: 'Poste', key: 'title', width: 34 },
    { header: 'Entreprise', key: 'company', width: 24 },
    { header: 'Ville', key: 'city', width: 18 },
    { header: 'Statut', key: 'status', width: 16 },
    { header: "Date d'envoi", key: 'applied_at', width: 16 },
    { header: 'Entretien prévu', key: 'interview', width: 22 },
    { header: 'Format entretien', key: 'interview_type', width: 18 },
    { header: 'Notes entretien', key: 'interview_notes', width: 30 },
    { header: 'Notes personnelles', key: 'notes', width: 36 },
    { header: "Lien vers l'offre", key: 'link', width: 24 },
  ];

  const header = ws.getRow(1);
  header.height = 28;
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  apps.forEach((a, i) => {
    const row = ws.addRow({
      type: a.external ? 'Externe' : 'Interne',
      title: a.title || '—',
      company: a.company || '—',
      city: a.city || '—',
      status: (a.status && STATUSES[a.status]?.label) || a.status || '—',
      applied_at: a.applied_at || a.ext_date || '—',
      interview: a.interview_at ? formatDateTime(a.interview_at) : '—',
      interview_type: a.interview_at ? (a.interview_type === 'visio' ? 'Visio' : a.interview_type === 'presentiel' ? 'Présentiel' : 'Téléphone') : '—',
      interview_notes: a.interview_notes || '',
      notes: a.notes || '',
      link: a.url ? { text: a.external ? 'Lien externe ↗' : "Voir l'offre ↗", hyperlink: a.url } : '—',
    });

    row.height = 22;
    const bg = i % 2 === 1 ? 'FFF8FAFC' : 'FFFFFFFF';

    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      if (col === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Segoe UI', size: 10, bold: true };
        if (a.external) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
          cell.font.color = { argb: 'FF6B21A8' };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
          cell.font.color = { argb: 'FF1E40AF' };
        }
      }

      if (col === 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Segoe UI', size: 10, bold: true };
        if (['entretien', 'offre'].includes(a.status)) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
          cell.font.color = { argb: 'FF065F46' };
        } else if (['envoyee', 'relance'].includes(a.status)) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
          cell.font.color = { argb: 'FF1E40AF' };
        } else if (a.status === 'refus') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
          cell.font.color = { argb: 'FF9F1239' };
        }
      }

      if (col === 6 || col === 7 || col === 8) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }

      if (col === 11 && a.url) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF2563EB' }, underline: true };
      }
    });
  });

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ws.columns.length },
  };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `stage_radar_candidatures_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const link = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: filename,
  });
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}
