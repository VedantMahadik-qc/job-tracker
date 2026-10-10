#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const inquirer = require('inquirer');
const Table = require('cli-table3');
const pc = require('picocolors');

const db = require('./db');
const { colorStatus, today, formatDaysSince, daysSince, emptyToNull, buildApplicationsTable } = require('./formatters');
const exporters = require('./export');
const completion = require('./completion');

const TRACKS = ['Quantum', 'HPC', 'FullStack', 'Other'];
const STATUSES = ['Bookmarked', 'Applied', 'Screening', 'Technical', 'Final', 'Offer', 'Rejected'];
const RESPONDED_STATUSES = ['Screening', 'Technical', 'Final', 'Offer', 'Rejected'];
const TERMINAL_STATUSES = ['Offer', 'Rejected'];
const STALE_THRESHOLD_DAYS = 10;

const program = new Command();
program
  .name('jobtrack')
  .description('Local CLI job application tracker')
  .version('1.0.0');

program
  .command('add [company] [role]')
  .description('Add a new job application (non-interactive if company and role are both given)')
  .option('-t, --track <track>', `track: ${TRACKS.join('|')}`)
  .option('-s, --status <status>', `status: ${STATUSES.join('|')}`, 'Applied')
  .option('-c, --cv <version>', 'CV version used')
  .option('-l, --location <location>', 'location')
  .option('-u, --url <url>', 'job posting URL')
  .option('-n, --notes <notes>', 'notes')
  .option('-r, --referral <referral>', 'who referred you')
  .action(async (company, role, options) => {
    if (company && role) {
      const track = options.track || 'Other';
      const status = options.status;

      if (!TRACKS.includes(track)) {
        console.log(pc.red(`Unknown track "${track}". Expected one of: ${TRACKS.join(', ')}`));
        return;
      }
      if (!STATUSES.includes(status)) {
        console.log(pc.red(`Unknown status "${status}". Expected one of: ${STATUSES.join(', ')}`));
        return;
      }

      const app = db.createApplication({
        company: company.trim(),
        role: role.trim(),
        track,
        status,
        cv_version: emptyToNull(options.cv),
        location: emptyToNull(options.location),
        url: emptyToNull(options.url),
        applied_date: today(),
        notes: emptyToNull(options.notes),
        referral: emptyToNull(options.referral),
      });

      console.log(pc.green(`\nAdded application #${app.id}: ${app.company} — ${app.role}\n`));
      return;
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'company',
        message: 'Company:',
        validate: (v) => (v.trim() ? true : 'Company is required'),
      },
      {
        type: 'input',
        name: 'role',
        message: 'Role:',
        validate: (v) => (v.trim() ? true : 'Role is required'),
      },
      {
        type: 'list',
        name: 'track',
        message: 'Track:',
        choices: TRACKS,
      },
      {
        type: 'input',
        name: 'cv_version',
        message: 'CV version used (optional):',
      },
      {
        type: 'list',
        name: 'status',
        message: 'Status:',
        choices: STATUSES,
        default: 'Applied',
      },
      {
        type: 'input',
        name: 'location',
        message: 'Location (optional):',
      },
      {
        type: 'input',
        name: 'url',
        message: 'URL (optional):',
      },
      {
        type: 'input',
        name: 'notes',
        message: 'Notes (optional):',
      },
      {
        type: 'input',
        name: 'referral',
        message: 'Referred by (optional, press enter to skip):',
      },
    ]);

    const app = db.createApplication({
      company: answers.company.trim(),
      role: answers.role.trim(),
      track: answers.track,
      cv_version: emptyToNull(answers.cv_version),
      status: answers.status,
      location: emptyToNull(answers.location),
      url: emptyToNull(answers.url),
      applied_date: today(),
      notes: emptyToNull(answers.notes),
      referral: emptyToNull(answers.referral),
    });

    console.log(pc.green(`\nAdded application #${app.id}: ${app.company} — ${app.role}\n`));
  });

program
  .command('list')
  .alias('ls')
  .description('List all job applications')
  .option('-s, --status <status>', 'filter by status')
  .option('-t, --track <track>', 'filter by track')
  .action((options) => {
    const apps = db.listApplications({ status: options.status, track: options.track });

    if (apps.length === 0) {
      console.log(pc.gray('No applications found.'));
      return;
    }

    console.log(buildApplicationsTable(apps));
  });

program
  .command('filter')
  .description('View a subset of applications by track, status, and/or referral')
  .option('-t, --track <track>', 'filter by track')
  .option('-s, --status <status>', 'filter by status')
  .option('-r, --referred', 'only show applications that came through a referral')
  .action((options) => {
    if (!options.track && !options.status && !options.referred) {
      console.log(pc.red('Provide at least one of --track, --status, or --referred (or use "list" to see everything).'));
      return;
    }

    if (options.track && !TRACKS.includes(options.track)) {
      console.log(pc.red(`Unknown track "${options.track}". Expected one of: ${TRACKS.join(', ')}`));
      return;
    }

    if (options.status && !STATUSES.includes(options.status)) {
      console.log(pc.red(`Unknown status "${options.status}". Expected one of: ${STATUSES.join(', ')}`));
      return;
    }

    let apps = db.listApplications({ status: options.status, track: options.track });
    if (options.referred) {
      apps = apps.filter((a) => a.referral);
    }

    if (apps.length === 0) {
      console.log(pc.gray('No applications match that filter.'));
      return;
    }

    console.log(buildApplicationsTable(apps));
  });

program
  .command('update [id]')
  .description('Update status, notes, or last contact date for an application')
  .action(async (id) => {
    let app;

    if (id) {
      app = db.getApplication(Number(id));
      if (!app) {
        console.log(pc.red(`No application found with id ${id}`));
        return;
      }
    } else {
      const apps = db.listApplications();
      if (apps.length === 0) {
        console.log(pc.gray('No applications found.'));
        return;
      }
      const { selectedId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedId',
          message: 'Select an application to update:',
          choices: apps.map((a) => ({
            name: `#${a.id} ${a.company} — ${a.role} (${a.status})`,
            value: a.id,
          })),
        },
      ]);
      app = db.getApplication(selectedId);
    }

    const { fields } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'fields',
        message: 'What would you like to update?',
        choices: ['Status', 'Notes', 'Referral', 'Last contact date (set to today)'],
        validate: (v) => (v.length ? true : 'Select at least one field'),
      },
    ]);

    const updates = {};

    if (fields.includes('Status')) {
      const { status } = await inquirer.prompt([
        {
          type: 'list',
          name: 'status',
          message: 'New status:',
          choices: STATUSES,
          default: app.status,
        },
      ]);
      updates.status = status;
    }

    if (fields.includes('Notes')) {
      const { note } = await inquirer.prompt([
        {
          type: 'input',
          name: 'note',
          message: 'Note to add:',
          validate: (v) => (v.trim() ? true : 'Note cannot be empty'),
        },
      ]);
      const stamped = `[${today()}] ${note.trim()}`;
      updates.notes = app.notes ? `${app.notes}\n${stamped}` : stamped;
    }

    if (fields.includes('Referral')) {
      const { referral } = await inquirer.prompt([
        {
          type: 'input',
          name: 'referral',
          message: 'Referred by (leave blank to clear):',
          default: app.referral || '',
        },
      ]);
      updates.referral = emptyToNull(referral);
    }

    if (fields.includes('Last contact date (set to today)')) {
      updates.last_contact_date = today();
    }

    const updated = db.updateApplication(app.id, updates);
    console.log(pc.green(`\nUpdated application #${updated.id}: ${updated.company} — ${updated.role}\n`));
  });

program
  .command('stats')
  .description('Show summary statistics across all applications')
  .action(() => {
    const apps = db.listApplications();
    const total = apps.length;

    if (total === 0) {
      console.log(pc.gray('No applications found.'));
      return;
    }

    const active = apps.filter((a) => !TERMINAL_STATUSES.includes(a.status)).length;
    const appliedOrBeyond = apps.filter((a) => a.status !== 'Bookmarked').length;
    const responded = apps.filter((a) => RESPONDED_STATUSES.includes(a.status)).length;
    const responseRate = appliedOrBeyond > 0 ? ((responded / appliedOrBeyond) * 100).toFixed(1) : '0.0';
    const referred = apps.filter((a) => a.referral).length;
    const referralRate = ((referred / total) * 100).toFixed(1);

    const byTrack = TRACKS.reduce((acc, track) => {
      acc[track] = apps.filter((a) => a.track === track).length;
      return acc;
    }, {});

    console.log(pc.bold('\nJob Application Stats\n'));
    console.log(`Total applications:  ${pc.bold(total)}`);
    console.log(`Active pipelines:    ${pc.bold(active)}`);
    console.log(`Response rate:       ${pc.bold(responseRate + '%')} (${responded}/${appliedOrBeyond} applied)`);
    console.log(`Via referral:        ${pc.bold(referralRate + '%')} (${referred}/${total})`);

    console.log(pc.bold('\nBy Track:'));
    const table = new Table({ head: ['Track', 'Count'], style: { head: ['bold'] } });
    for (const track of TRACKS) {
      table.push([track, byTrack[track]]);
    }
    console.log(table.toString());
    console.log('');
  });

program
  .command('stale')
  .description(`Flag 'Applied' applications with no contact in over ${STALE_THRESHOLD_DAYS} days`)
  .action(() => {
    const apps = db.listApplications({ status: 'Applied' });

    const stale = apps
      .map((a) => ({ app: a, refDate: a.last_contact_date || a.applied_date }))
      .filter(({ refDate }) => refDate && daysSince(refDate) > STALE_THRESHOLD_DAYS);

    if (stale.length === 0) {
      console.log(pc.green('\nNo stale applications — you are all caught up!\n'));
      return;
    }

    console.log(pc.yellow(`\nApplications with no contact in over ${STALE_THRESHOLD_DAYS} days:\n`));

    const table = new Table({
      head: ['ID', 'Company', 'Role', 'Last Contact', 'Days Since'],
      style: { head: ['bold'] },
    });

    for (const { app, refDate } of stale) {
      table.push([
        app.id,
        app.company,
        app.role,
        app.last_contact_date ? app.last_contact_date : `${app.applied_date} (applied)`,
        pc.red(formatDaysSince(refDate)),
      ]);
    }

    console.log(table.toString());
    console.log('');
  });

program
  .command('export')
  .description('Export all applications to a Markdown or CSV file')
  .option('-f, --format <format>', 'export format: md or csv', 'md')
  .option('-o, --output <file>', 'output file path (default: applications_summary.<ext>)')
  .action((options) => {
    const format = String(options.format).toLowerCase();
    if (format !== 'md' && format !== 'csv') {
      console.log(pc.red(`Unknown format "${options.format}". Use "md" or "csv".`));
      return;
    }

    const apps = db.listApplications();
    const content = format === 'csv' ? exporters.toCsv(apps) : exporters.toMarkdown(apps);
    const defaultName = `applications_summary.${format}`;
    const outputPath = path.resolve(options.output || defaultName);

    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(pc.green(`Exported ${apps.length} application(s) to ${outputPath}`));
  });

program
  .command('completion <shell>')
  .description('Print a tab-completion script to add to your shell profile (bash or pwsh)')
  .action((shell) => {
    const normalized = shell.toLowerCase();
    if (normalized === 'bash') {
      process.stdout.write(completion.bashScript());
    } else if (normalized === 'pwsh' || normalized === 'powershell') {
      process.stdout.write(completion.pwshScript());
    } else {
      console.log(pc.red(`Unknown shell "${shell}". Supported: bash, pwsh`));
    }
  });

program.parse(process.argv);
