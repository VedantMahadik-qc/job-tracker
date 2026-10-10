const EXPORT_HEADERS = [
  'ID',
  'Company',
  'Role',
  'Track',
  'Status',
  'CV Version',
  'Location',
  'URL',
  'Applied Date',
  'Last Contact',
  'Notes',
  'Referral',
];

function rowFor(app) {
  return [
    app.id,
    app.company,
    app.role,
    app.track,
    app.status,
    app.cv_version || '',
    app.location || '',
    app.url || '',
    app.applied_date || '',
    app.last_contact_date || '',
    app.notes || '',
    app.referral || '',
  ];
}

function escapeMarkdownCell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
}

function escapeCsvCell(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toMarkdown(apps) {
  const rows = apps.map(rowFor);
  const headerLine = `| ${EXPORT_HEADERS.join(' | ')} |`;
  const sepLine = `| ${EXPORT_HEADERS.map(() => '---').join(' | ')} |`;
  const bodyLines = rows.map((row) => `| ${row.map(escapeMarkdownCell).join(' | ')} |`);

  const generated = new Date().toISOString().slice(0, 10);
  return [
    '# Job Applications Summary',
    `_Generated ${generated} — ${apps.length} application(s)_`,
    '',
    headerLine,
    sepLine,
    ...bodyLines,
    '',
  ].join('\n');
}

function toCsv(apps) {
  const rows = apps.map(rowFor);
  const lines = [EXPORT_HEADERS.map(escapeCsvCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(','));
  }
  return lines.join('\n') + '\n';
}

module.exports = { toMarkdown, toCsv };
