# job-tracker

A local, terminal-based CLI for tracking job applications. No accounts, no cloud — everything lives in a SQLite file on your machine.

Built with [Commander](https://github.com/tj/commander.js), [Inquirer](https://github.com/SBoudrias/Inquirer.js), and [better-sqlite3](https://github.com/WiseLibs/better-sqlite3).

## Install

```bash
git clone <your-repo-url>
cd job-tracker
npm install
npm link
```

`npm link` registers three equivalent global commands: `track`, `jobtrack`, and `jt`. Use whichever you like — the examples below use `jt`.

Your data is stored in `data/tracker.db`, resolved relative to this project folder, so it stays the same database no matter which directory you run the command from.

## Commands

### `jt add`

Interactive prompt to log a new application: company, role, track (`Quantum` / `HPC` / `FullStack` / `Other`), CV version used, status, location, URL, notes, and who referred you (if anyone). The applied date is set to today automatically.

### `jt list` (alias `ls`)

Table view of every application, color-coded by status:

| Status | Color |
|---|---|
| Bookmarked | gray |
| Applied | yellow |
| Screening | cyan |
| Technical | blue |
| Final | magenta |
| Offer | green |
| Rejected | red |

```bash
jt list
jt list --status Applied
jt list --track Quantum
```

### `jt filter`

Same table, but requires at least one filter — a quick way to narrow the view:

```bash
jt filter --track HPC
jt filter --status Technical
jt filter --referred       # only applications that came through a referral
```

### `jt update [id]`

Update an existing application. Omit the id to pick one from a list interactively. Lets you change status, append a timestamped note, set/clear the referral, and bump the last-contact date to today.

```bash
jt update
jt update 3
```

### `jt stats`

Summary of your pipeline: total applications, active count (excludes Offer/Rejected), response rate, referral rate, and a breakdown by track.

```bash
jt stats
```

### `jt stale`

Flags any application still sitting in `Applied` status with no contact (or no update since applying) in over 10 days — a follow-up nudge list.

```bash
jt stale
```

### `jt export`

Dumps every application to a file for review outside the terminal.

```bash
jt export                        # applications_summary.md
jt export --format csv           # applications_summary.csv
jt export -o ~/Desktop/apps.md   # custom path
```

## Data model

Applications are stored in a single `applications` table (see `schema.sql`):

| Column | Notes |
|---|---|
| `company`, `role` | required |
| `track` | one of `Quantum`, `HPC`, `FullStack`, `Other` |
| `status` | one of `Bookmarked`, `Applied`, `Screening`, `Technical`, `Final`, `Offer`, `Rejected` |
| `cv_version` | which resume/CV variant you used |
| `location`, `url` | free text |
| `applied_date`, `last_contact_date` | ISO dates |
| `notes` | freeform, appended to (not overwritten) via `jt update` |
| `referral` | who referred you, if anyone |

## Uninstall / unlink

```bash
npm unlink -g job-tracker
```
