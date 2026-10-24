# National TVET Excellence Awards 2026: Scoring App

Static web app (Vercel) + Google Apps Script + Google Sheet. No build step.

## Structure
```
index.html            page shell (header, tabs, script tags)
css/styles.css        all styles
assets/logo.webp      DHET logo
js/app.js             config (CONFIG.apiUrl), state, API calls, sign-in, judge list, results, background refresh
js/views.js           screens: sign-in, scoring (COI, PoE, details), nominees admin, declarations, moderation, settings, help
apps-script/Code.gs   paste into Extensions > Apps Script of the Google Sheet (not served by Vercel)
docs/                 guides (PDF; written for the previous layout, update before circulating)
```
Load order matters: `app.js` first, `views.js` second (it replaces some of app.js's screens).

## Important
- `CONFIG.apiUrl` in `js/app.js` must be the `https://script.google.com/macros/s/.../exec` address of the current deployment.
- After any change to `Code.gs`: Deploy, Manage deployments, pencil, New version, Deploy.
- Never commit the admin PIN or any judge/auditor codes. They live only in the Google Sheet.

## Scoring open / closed
Stored in the Settings tab (`open`). Settings page > Open/Closed > Save settings. When closed the server refuses scores and recusals.

## Background update
Every 2 minutes the app re-reads the sheet quietly. It never redraws while someone is scoring, typing or editing, and only redraws the list when the data changed.

## PoEs (documents and folders)
Each nominee can have a PoE PDF and a link to their evidence folder.
- Admin: Nominees > Attach PoE (a PDF link or a Google Drive folder link), or the details panel in Edit, or the import columns.
- Bulk: Settings tab `poeFolder` = the top Drive folder ID, then run `linkPoEs` in the Apps Script editor. Expected layout: Category / Lecturer name / files. The lecturer folder is matched by name; the PDF called "Portfolio of Evidence" or "PoE" is linked as the PoE document; "Supporting Documents" and other letters are ignored. Existing links are never overwritten.
- Sharing: share the top folder with the judges' Google accounts (private), or set `poeShare` = `anyone` (anyone with the link, less private).
- PDFs kept on SharePoint/OneDrive can be linked instead: `linkPoEsFromList` (see comments in Code.gs).

## Sessions and PoE links
- A page refresh does not sign anyone out. The sign-in is kept in the browser tab's session storage until the person presses Sign out or closes the tab/browser. A wrong, changed or locked-out code ends it.
- The personal code and admin PIN fields are masked while typing.
- The PoE PDF and the evidence folder open only in a new tab; nothing is embedded in the page.
