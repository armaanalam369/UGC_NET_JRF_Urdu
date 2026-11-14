/* =====================================================================
   Urdu NET Arena — manifest.js
   Exam rules, the 10 syllabus units, and the list of paper files.

   HOW TO ADD A NEW PAPER (2 steps)
   1. Copy data/2021-1.js, rename it (e.g. data/2022-2.js), change the key
      at the top to '2022-2', and replace the questions.
   2. Add one line to PAPER_LIST:  {year:2022, shift:2, file:'data/2022-2.js'}
   ===================================================================== */
window.RULES = {
  examName: 'UGC NET JRF · Urdu · Paper II',
  fullMinutes: 120,   // time for a full paper
  marks: 2,           // marks per correct answer (change to 1 if you want a 100-mark paper)
  negative: 0,        // marks cut per wrong answer
  shifts: { 1: 'Shift 1', 2: 'Shift 2' },

  /* Syllabus units. In each question, "u" must be the unit number (1-10).
     Edit these names to match the latest NTA syllabus exactly. */
  units: [
    { n: 'Origin & Growth of Urdu Language',       ur: 'اردو زبان کا آغاز و ارتقا',        i: '🌱' },
    { n: 'History of Urdu Literature',             ur: 'اردو ادب کی تاریخ',               i: '🏛️' },
    { n: 'Classical Poetry (Ghazal & Masnavi)',    ur: 'کلاسیکی شاعری',                    i: '🪔' },
    { n: 'Marsiya, Qasida & Nazm',                 ur: 'مرثیہ، قصیدہ اور نظم',             i: '🕯️' },
    { n: 'Modern Poetry & Movements',              ur: 'جدید شاعری اور تحریکیں',           i: '🌙' },
    { n: 'Fiction (Dastan, Novel, Afsana)',        ur: 'فکشن: داستان، ناول، افسانہ',       i: '📖' },
    { n: 'Drama & Non-fiction Prose',              ur: 'ڈراما اور نثر',                    i: '🎭' },
    { n: 'Criticism & Literary Theory',            ur: 'تنقید اور نظریات',                 i: '🔎' },
    { n: 'Research, Tadvin & Linguistics',         ur: 'تحقیق، تدوین اور لسانیات',         i: '🧭' },
    { n: 'Prosody, Rhetoric & Journalism',         ur: 'عروض، بلاغت اور صحافت',            i: '✒️' }
  ]
};

window.PAPER_LIST = [
  { year: 2021, shift: 1, file: 'data/2021-1.js' },
  { year: 2021, shift: 2, file: 'data/2021-2.js' }
];
