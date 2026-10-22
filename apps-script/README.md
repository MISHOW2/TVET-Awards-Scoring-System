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

## Portfolio of Evidence (PoE) PDFs

Each nominee can have one PoE, a PDF kept in Google Drive. Only the Drive file ID is stored in the Nominees tab (last column); the PDF itself is never copied into the sheet or this repository.

1. **Put the PDFs in a private Drive folder.** Name them with the nominee's name, e.g. `Category_College_Surname_Name_POE_2026.pdf`.
2. **Link them to nominees**, either way:
   - In the app (admin PIN): Nominees tab, click **PoE** on a nominee's row and paste the file's Google Drive link. Leave it empty to remove it. The **Edit** form and the bulk-import template also have a PoE column.
   - In bulk: in the Settings tab add `poeFolder` = the folder ID, then run `linkPoEs` in the Apps Script editor. It matches file names to nominees, never overwrites an existing link, and reports files it could not match.
3. **Decide who can open the files.** Either share the folder with each judge's Google account (view only), or add `poeShare` = `anyone` in the Settings tab so `linkPoEs` sets matched files to "anyone with the link can view". The link is only ever shown to a signed-in judge, auditor or admin, but anyone who is sent the link could open the file.
4. Judges and auditors see **View the PoE here** (opens inside the page) and **Open in a new tab** above the nomination details. A nominee with no PoE shows "No PoE has been linked".

After editing `Code.gs`, redeploy: Deploy > Manage deployments > pencil > Version: New version > Deploy.
