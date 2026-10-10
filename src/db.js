const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'tracker.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'schema.sql');

function init() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);

  migrate(db);

  return db;
}

// schema.sql only creates the table when it doesn't exist yet, so a
// pre-existing tracker.db from before a column was added needs it backfilled.
function migrate(db) {
  const columns = db.prepare('PRAGMA table_info(applications)').all().map((c) => c.name);
  if (!columns.includes('referral')) {
    db.exec('ALTER TABLE applications ADD COLUMN referral TEXT');
  }
}

const db = init();

// better-sqlite3's native binding can crash during Node's V8 teardown on
// recent Node versions if the connection is never explicitly closed.
process.on('exit', () => {
  if (db.open) db.close();
});

function createApplication(data) {
  const stmt = db.prepare(`
    INSERT INTO applications
      (company, role, track, cv_version, status, location, url, applied_date, last_contact_date, notes, referral)
    VALUES
      (@company, @role, @track, @cv_version, @status, @location, @url, @applied_date, @last_contact_date, @notes, @referral)
  `);
  const info = stmt.run(withDefaults(data));
  return getApplication(info.lastInsertRowid);
}

function getApplication(id) {
  return db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
}

function listApplications(filters = {}) {
  let query = 'SELECT * FROM applications';
  const clauses = [];
  const params = {};

  if (filters.status) {
    clauses.push('status = @status');
    params.status = filters.status;
  }
  if (filters.track) {
    clauses.push('track = @track');
    params.track = filters.track;
  }

  if (clauses.length) {
    query += ' WHERE ' + clauses.join(' AND ');
  }
  query += ' ORDER BY id DESC';

  return db.prepare(query).all(params);
}

function updateApplication(id, data) {
  const existing = getApplication(id);
  if (!existing) {
    throw new Error(`Application with id ${id} not found`);
  }

  const merged = { ...existing, ...data };
  const stmt = db.prepare(`
    UPDATE applications SET
      company = @company,
      role = @role,
      track = @track,
      cv_version = @cv_version,
      status = @status,
      location = @location,
      url = @url,
      applied_date = @applied_date,
      last_contact_date = @last_contact_date,
      notes = @notes,
      referral = @referral
    WHERE id = @id
  `);
  stmt.run({ ...merged, id });
  return getApplication(id);
}

function deleteApplication(id) {
  const info = db.prepare('DELETE FROM applications WHERE id = ?').run(id);
  return info.changes > 0;
}

function withDefaults(data) {
  return {
    company: data.company ?? null,
    role: data.role ?? null,
    track: data.track ?? 'Other',
    cv_version: data.cv_version ?? null,
    status: data.status ?? 'Bookmarked',
    location: data.location ?? null,
    url: data.url ?? null,
    applied_date: data.applied_date ?? null,
    last_contact_date: data.last_contact_date ?? null,
    notes: data.notes ?? null,
    referral: data.referral ?? null,
  };
}

module.exports = {
  db,
  createApplication,
  getApplication,
  listApplications,
  updateApplication,
  deleteApplication,
};
