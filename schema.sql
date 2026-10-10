CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  track TEXT NOT NULL CHECK (track IN ('Quantum', 'HPC', 'FullStack', 'Other')),
  cv_version TEXT,
  status TEXT NOT NULL DEFAULT 'Bookmarked' CHECK (status IN ('Bookmarked', 'Applied', 'Screening', 'Technical', 'Final', 'Offer', 'Rejected')),
  location TEXT,
  url TEXT,
  applied_date TEXT,
  last_contact_date TEXT,
  notes TEXT,
  referral TEXT
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications (status);
CREATE INDEX IF NOT EXISTS idx_applications_track ON applications (track);
