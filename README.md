# National TVET Excellence Awards 2026: Scoring App

Static web app (Vercel) + Google Apps Script + Google Sheet. No build step.

## Structure

```
index.html            page markup only (all pages, header, script tags)
css/styles.css        all styles
assets/logo.webp      DHET logo
js/                   app code, loaded in this order (see index.html)
  config.js           SHEET_URL, categories, colleges, scoring scale, bands, handbook text
  utils.js            small helpers ($, escHTML, pct, bandOf, parseR)
  core.js             page shell, local state, original renderers
  api.js              requests to the Apps Script, busy overlay, scoped refresh
  auth.js             judge sign-in and admin PIN guard
  nominees.js         nominee register
  import.js           bulk import of the nominations workbook
  scoring.js          judge scoring page
  results.js          results leaderboard and auditor sign-in
  judges.js           judge panel (admin)
  help.js             built-in help page
  settings.js         settings page
  export.js           Excel master export
  nomination-details.js  nomination details view and admin form fields
  ui.js               refresh wrapper (drop-downs, counts, panels)
  handbook.js         rubrics, declarations, moderation report
  audit.js            audit trail and read-only auditor behaviour
  main.js             start-up and 2-minute refresh timer (must load last)
apps-script/Code.gs   paste into Extensions > Apps Script of the Google Sheet (not served by Vercel)
docs/                 guides (PDF)
```

## Important

- **Load order matters.** Later files wrap functions defined in earlier ones, so keep the order in `index.html`.
- **SHEET_URL** is in `js/config.js`. It must be the `https://script.google.com/macros/s/.../exec` address of the current deployment.
- After any change to `apps-script/Code.gs`: Deploy, Manage deployments, pencil, New version, Deploy.
- Never commit the admin PIN or any judge/auditor codes. They live only in the Google Sheet.
