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

// The handbook's guidance for each criterion, in the same order as CRIT (Adjudicator Guide v1.1, section 8):
// focus, what to consider, guiding questions, and what each rating from 1 to 5 means.
const RUBRIC = [
  {
    focus: 'Quality of teaching practice, learner engagement and instructional excellence.',
    consider: [
      'Teaching methodologies',
      'Learner engagement techniques',
      'Classroom practice',
      'Peer evaluations',
      'Teaching-related achievements',
      'Alignment between teaching practice and learner outcomes',
    ],
    ask: [
      'How effectively are learners engaged?',
      'What evidence demonstrates instructional excellence?',
      'Is there evidence of measurable learner improvement?',
      'Can the practice be replicated elsewhere?',
    ],
    levels: [
      'Little evidence of effective teaching practice.',
      'Some effective practices evident but significant gaps remain.',
      'Good evidence of quality teaching and learner engagement.',
      'Strong evidence of excellence and measurable impact.',
      'Exceptional teaching practice demonstrating sustained excellence, innovation and sector impact.',
    ],
  },
  {
    focus: 'Learner achievement, completion and success rates.',
    consider: [
      'Pass rates',
      'Completion rates',
      'Certification rates',
      'Retention rates',
      'Progression data',
      'Trade test results',
      'Longitudinal trends',
    ],
    ask: [
      'What learner outcomes are demonstrated?',
      'How significant are the achievements?',
      'Are improvements sustained?',
    ],
    levels: [
      'Minimal evidence of learner success.',
      'Limited evidence of learner performance improvement.',
      'Good and verifiable learner outcomes demonstrated.',
      'Strong and consistent positive learner outcomes.',
      'Outstanding learner performance supported by compelling data and measurable impact.',
    ],
  },
  {
    focus: 'Employer engagement and workplace relevance.',
    consider: [
      'Employer partnerships',
      'Workplace placements',
      'Apprenticeships',
      'Internships',
      'Graduate employment outcomes',
      'Employer testimonials',
    ],
    ask: [
      'How strong are industry partnerships?',
      'How have learners benefited?',
      'Is there evidence of employability outcomes?',
    ],
    levels: [
      'Little or no evidence of industry engagement.',
      'Limited partnerships and workplace relevance.',
      'Adequate industry engagement and learner benefit.',
      'Strong partnerships with measurable outcomes.',
      'Exceptional industry engagement resulting in significant employability impact.',
    ],
  },
  {
    focus: 'Innovative approaches and technology integration.',
    consider: [
      'Innovative teaching methods',
      'Digital tools',
      'Technology-enabled learning',
      'Learner support interventions',
      'Measurable outcomes',
    ],
    ask: ['What innovation was introduced?', 'What challenge did it address?', 'What evidence demonstrates impact?'],
    levels: [
      'No evidence of innovation.',
      'Innovation is limited with weak evidence of impact.',
      'Innovation has been implemented successfully.',
      'Strong innovation with measurable outcomes.',
      'Outstanding innovation demonstrating transformative impact.',
    ],
  },
  {
    focus: 'Continuous learning and contribution to the TVET sector.',
    consider: [
      'Training attended',
      'Qualifications obtained',
      'Sector participation',
      'Institutional contributions',
      'Application of learning',
    ],
    ask: [
      'Is there commitment to continuous learning?',
      'Has learning improved practice?',
      'Has the nominee contributed to the sector?',
    ],
    levels: [
      'Minimal professional development evidence.',
      'Some development activity with limited impact.',
      'Consistent professional growth evident.',
      'Strong commitment to development and contribution.',
      'Exceptional professional growth and sector contribution.',
    ],
  },
  {
    focus: 'Learner satisfaction and teaching effectiveness ratings.',
    consider: [
      'Student surveys',
      'Graduate feedback',
      'Testimonials',
      'Satisfaction ratings',
      'Quality of learner comments',
    ],
    ask: [
      'How do learners perceive the nominee?',
      'Is feedback consistent?',
      'Does feedback support claims of excellence?',
    ],
    levels: [
      'Negative, absent or insufficient feedback.',
      'Mixed learner feedback.',
      'Positive learner feedback supporting effectiveness.',
      'Strong learner satisfaction demonstrated.',
      'Exceptional and consistently positive learner feedback.',
    ],
  },
];

// The one-line focus shown under each criterion name.
const GUIDE = RUBRIC.map(r => r.focus);

// Cross-cutting judging indicators (handbook section 9): they inform the score on every criterion.
const INDICATORS = [
  ['Impact', 'What measurable difference was achieved?'],
  ['Innovation', 'What new or improved approach was introduced?'],
  ['Industry Relevance', 'How well does the work respond to labour market needs?'],
  ['Learner Success', 'What evidence demonstrates improved learner outcomes?'],
  ['Sustainability', 'Can the initiative continue over time?'],
  ['Transferability', 'Can the practice be replicated elsewhere?'],
];

// Evidence review guidance (handbook section 6): what to review and where to verify it.
const EVIDENCE_GUIDE = [
  [
    'Student performance data',
    [
      'Pass rates',
      'Completion rates',
      'Certification rates',
      'Retention rates',
      'Progression rates',
      'Trade test performance',
      'Three-year performance trends',
    ],
    ['Examination reports', 'Academic records', 'MIS reports', 'Quality assurance reports'],
  ],
  [
    'Industry partnership evidence',
    [
      'Workplace placements',
      'Apprenticeships',
      'Learnerships',
      'Internship records',
      'Memoranda of Understanding',
      'Employer testimonials',
      'Employment outcomes',
    ],
    ['Signed agreements', 'Placement records', 'Employer confirmations'],
  ],
  [
    'Peer reviews',
    ['Classroom observations', 'Moderation reports', 'Academic evaluations', 'Subject specialist reviews'],
    ['HoD reports', 'Senior lecturer assessments', 'Academic manager reports'],
  ],
  [
    'Student feedback',
    ['Student surveys', 'Graduate surveys', 'Learner feedback reports', 'Focus group findings', 'Testimonials'],
    [],
  ],
  [
    'Institutional endorsement',
    ['Principal support letter', 'HoD recommendation', 'Institutional confirmation of achievements'],
    [],
  ],
];

// Printed under the 1 to 5 buttons on small screens.
const ENDS = '<div class="endpts"><span>1 Poor</span><span>5 Outstanding</span></div>';

// Recognition bands: calculated from the average of the judges' totals (see recog in scoring.js).
const OUTCOMES = ['National Excellence Winner', 'Finalist Recognition', 'Merit Recognition', 'Does Not Qualify'];

// Confidentiality declaration shown to a judge on first sign-in.
const DECL_TEXT =
  'I acknowledge that all nomination materials, presentations, scores, comments and deliberations are confidential and may not be disclosed outside the official adjudication process. I will not share my personal code.';

// The impartiality sign-off a judge ticks for each nominee (handbook section 15).
const SIGNOFF_TEXT =
  'I confirm that I have assessed this nomination impartially and solely on the basis of the submitted and verified evidence, in accordance with the National TVET Excellence Awards Framework and Adjudicator Handbook.';

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
