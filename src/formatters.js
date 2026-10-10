const pc = require('picocolors');
const Table = require('cli-table3');
const { differenceInCalendarDays, parseISO, format } = require('date-fns');

const STATUS_COLORS = {
  Bookmarked: pc.gray,
  Applied: pc.yellow,
  Screening: pc.cyan,
  Technical: pc.blue,
  Final: pc.magenta,
  Offer: pc.green,
  Rejected: pc.red,
};

function colorStatus(status) {
  const colorFn = STATUS_COLORS[status] || ((s) => s);
  return colorFn(status);
}

function today() {
  return format(new Date(), 'yyyy-MM-dd');
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const date = parseISO(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return differenceInCalendarDays(new Date(), date);
}

function formatDaysSince(dateStr) {
  const days = daysSince(dateStr);
  return days === null ? '-' : String(days);
}

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function buildApplicationsTable(apps) {
  const table = new Table({
    head: ['ID', 'Company', 'Role', 'Track', 'Status', 'CV Used', 'Days Since Applied', 'Referral'],
    style: { head: ['bold'] },
  });

  for (const app of apps) {
    table.push([
      app.id,
      app.company,
      app.role,
      app.track,
      colorStatus(app.status),
      app.cv_version || '-',
      formatDaysSince(app.applied_date),
      app.referral || '-',
    ]);
  }

  return table.toString();
}

module.exports = {
  STATUS_COLORS,
  colorStatus,
  today,
  daysSince,
  formatDaysSince,
  emptyToNull,
  buildApplicationsTable,
};
