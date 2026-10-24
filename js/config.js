// Fixed content: the API address, award categories, criteria, scoring scale, recognition bands and guidance text.
// Nothing here changes while the app runs.

// Set apiUrl to the deployed Apps Script web app address (…/exec). Empty = demo mode (data lives in memory).
// sheetUrl is optional: the address of the Google Sheet, for the "Open the Google Sheet" button in Settings.
const CONFIG = {
  apiUrl:
    'https://script.google.com/macros/s/AKfycbwXOBrM1AaMIh7Jkc_ifGTlf1Kwl2RqBh7_MsTRPWSAGYM4IEFqGgeXjQIdn1EUc4Nfzw/exec',
  sheetUrl: '',
};

// The seven award categories, in sheet order (index = CatIdx). The sheet's own names win if it supplies any (see setCats).
const CATS = [
  'National TVET Lecturer of the Year',
  'Engineering Lecturer Excellence Award',
  'Business and Utility Studies Lecturer Excellence Award',
  'Occupational Programmes Lecturer Excellence Award',
  'Emerging TVET Lecturer Award',
  'Innovation in Teaching and Learning Award',
  'Work-Integrated Learning Excellence Award',
];

// The six scoring criteria and their weights (they add up to 100).
const CRIT = [
  ['Teaching Effectiveness', 25],
  ['Student Performance', 20],
  ['Industry Alignment and Work-Integrated Learning', 20],
  ['Innovation and Digital Teaching', 15],
  ['Professional Development', 10],
  ['Student Feedback', 10],
];

// What each score from 1 to 5 means, shown to judges.
const SCALE = [
  ['1 – Poor', 'Does not meet requirements. Little or no supporting evidence.'],
  ['2 – Fair', 'Partially meets requirements. Significant gaps in evidence or impact.'],
  ['3 – Good', 'Meets requirements with sufficient supporting evidence.'],
  ['4 – Very good', 'Exceeds requirements with strong evidence and measurable impact.'],
  ['5 – Outstanding', 'Exceptional evidence of innovation, sustainability and sector-wide impact.'],
];

// The one-line guidance printed under each criterion, in the same order as CRIT.
const GUIDE = [
  'Quality of lesson delivery, learner engagement and assessment practice.',
  'Pass rates, throughput and improvement in learner results.',
  'Links with employers, workplace placements and relevance to industry needs.',
  'Use of digital tools and new methods that improve learning.',
  'Qualifications, training and ongoing growth as a lecturer.',
  'Learner surveys and testimonials about the nominee’s teaching.',
];

// Printed under the 1 to 5 buttons on small screens.
const ENDS = '<div class="endpts"><span>1 Poor</span><span>5 Outstanding</span></div>';

// Recognition bands: calculated from the average of the judges' totals (see recog in scoring.js).
const OUTCOMES = ['National Excellence Winner', 'Finalist Recognition', 'Merit Recognition', 'Does not qualify'];

// Confidentiality declaration shown to a judge on first sign-in.
const DECL_TEXT =
  'I will keep all nominee information, scores and panel discussions confidential. I will not share my personal code, and I will use the nominee details only for judging.';

// Every nomination detail the sheet stores, as [field, label]. Same order as the EXTRA list in Code.gs.
const EXTRA_F = [
  ['source', 'Source'],
  ['title', 'Title'],
  ['campus', 'Campus'],
  ['department', 'Department'],
  ['designation', 'Designation'],
  ['status', 'Status'],
  ['experience', 'Years of experience'],
  ['province', 'Province'],
  ['employeeNo', 'Employee number'],
  ['focus', 'Focus area (subjects)'],
  ['learners', 'Annual learners'],
  ['email', 'Email'],
  ['mobile', 'Mobile'],
  ['nominator', 'Nominator'],
  ['relationship', 'Nominator relationship'],
  ['nominatorContact', 'Nominator contact'],
  ['nominationDate', 'Nomination date'],
  ['motivation', 'Motivation summary'],
  ['why', 'Why deserving'],
  ['impact', 'Measurable impact / evidence summary'],
  ['profile', 'Professional profile'],
  ['philosophy', 'Teaching philosophy'],
  ['examples', 'Examples (teaching, curriculum, innovation)'],
  ['evidence', 'Evidence, previous two academic years'],
  ['poe', 'PoE link (Google Drive or SharePoint)'],
  ['poeFolder', 'PoE folder link (Google Drive folder)'],
];

// Fields shown as large text boxes, and the groups they are shown in on the judge's page.
const LAB = Object.fromEntries(EXTRA_F),
  LONGF = new Set(['motivation', 'why', 'impact', 'profile', 'philosophy', 'examples', 'evidence']);
const GROUPS = [
  [
    'About the nominee',
    [
      'source',
      'title',
      'campus',
      'department',
      'designation',
      'status',
      'experience',
      'province',
      'focus',
      'learners',
      'employeeNo',
    ],
  ],
  ['Nomination', ['nominator', 'relationship', 'nominatorContact', 'nominationDate']],
  ['Contact details', ['email', 'mobile']],
  ['Motivation and evidence', ['motivation', 'why', 'impact', 'profile', 'philosophy', 'examples', 'evidence']],
];

// What a valid PoE link looks like: a Google Drive file ID, a Drive folder link, or a SharePoint / OneDrive link.
const FILE_ID = /^[A-Za-z0-9_-]{20,}$/,
  FOLD = /^https:\/\/drive\.google\.com\/drive\/folders\/[A-Za-z0-9_-]{20,}$/,
  SPURL = /^https:\/\/(?:[a-z0-9-]+\.)*(?:sharepoint\.com|sharepoint\.us|1drv\.ms|onedrive\.live\.com)(?:[\/?#]|$)/i;
