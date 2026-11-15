/* =====================================================================
   Wise Choice · UGC NET / JRF Paper II — data/manifest.js
   Exam rules, subjects (with their syllabus units), quotes and the list
   of question-paper files.

      HOW TO ADD A NEW PAPER (every exam cycle = 2 papers a year: June + December)
   1. Copy any data/*.js file, rename it e.g. data/urdu-2026-december.js,
      change the id inside it to the same id you use below, and paste questions.
   2. Add one line to PAPER_LIST:
        { id:'urdu-2026-december', subject:'urdu', year:2026, session:'December', file:'data/urdu-2026-december.js' }
   That's all — the paper card appears on the home screen automatically.
   (Entries whose file is missing are silently hidden.)
   ===================================================================== */

/* ---- Exam rules (edit to match the pattern you want to simulate) ---- */
window.RULES = {
  examName: 'UGC NET/JRF · Urdu · Paper II',
  shortName: 'NET Urdu',
  totalQuestions: 100,      // questions in a full Paper II
  marksPerQ: 2,             // 100 questions x 2 marks = 200 marks
  fullMinutes: 120,         // minutes for a full Paper II (the real exam gives 180 min for Paper I + II together)
  negative: 0,              // official UGC NET has NO negative marking. Students can still switch on practice negative marking.
  sessions: ['June', 'December']   // the exam is held twice a year, in a single shift
};

/* ---- Subject: Urdu (اردو) and its syllabus units ----
   `i` = icon, `k` = short label used on the radar chart.
   Unit titles are a working outline — please verify them against the latest official NTA Urdu syllabus
   and rename here (the "s" field of every question must match the unit name EXACTLY). */
window.SUBJECTS = [
  {
    id: 'urdu', n: 'Urdu (اردو)', short: 'اردو · Urdu', i: '📜',
    units: [
      { n: 'Urdu Language: Origin, Development & Linguistics (اردو زبان و لسانیات)', i: '🔤', k: 'Language' },
      { n: 'Classical Urdu Poetry (کلاسیکی شاعری)',                                   i: '🕌', k: 'Classical' },
      { n: 'Poetic Genres: Qasida, Masnavi, Marsiya, Rubai (اصنافِ سخن)',               i: '✒️', k: 'Genres' },
      { n: 'Modern Urdu Poetry & Nazm (جدید شاعری)',                                   i: '🌙', k: 'Modern' },
      { n: 'Urdu Fiction: Dastan, Novel & Afsana (داستان، ناول، افسانہ)',               i: '📖', k: 'Fiction' },
      { n: 'Urdu Drama & Theatre (اردو ڈراما)',                                        i: '🎭', k: 'Drama' },
      { n: 'Non-fiction Prose: Inshaiya, Khaka, Safarnama, Letters (غیر افسانوی نثر)',  i: '✉️', k: 'Prose' },
      { n: 'Urdu Criticism & Literary Theory (تنقید)',                                 i: '🔍', k: 'Criticism' },
      { n: 'Research, Tazkira & Textual Editing (تحقیق و تدوین)',                       i: '🔬', k: 'Research' },
      { n: 'Urdu Journalism, Translation & Literary Movements (صحافت، ترجمہ، تحریکیں)', i: '📰', k: 'Journalism' }
    ]
  }
];

/* ---- Question papers (exam is held twice a year: June + December) ---- */
window.PAPER_LIST = [
  { id: 'urdu-2025-december', subject: 'urdu', year: 2025, session: 'December', file: 'data/urdu-2025-december.js' },
  { id: 'urdu-2025-june',     subject: 'urdu', year: 2025, session: 'June',     file: 'data/urdu-2025-june.js' }
];

/* ---- Motivational quotes (one per day on the home screen). Add your own! ---- */
window.QUOTES = [
  'Consistency beats intensity — one solid hour every day wins the exam.',
  'Every wrong answer you review today is a mark you keep tomorrow.',
  'You don\'t need to be perfect. You need to be better than yesterday.',
  'Discipline is choosing what you want most over what you want now.',
  'Small daily progress adds up to big results.',
  'Mock tests are rehearsals. Make your mistakes here, not in the exam hall.',
  'Your future Assistant Professor self is watching — keep going.',
  'Don\'t count the days; make the days count.',
  'Hard work compounds. Start the next question.',
  'Revision is where marks are made.',
  'Slow progress is still progress.',
  'Focus on the process; the JRF will follow.',
  'Today\'s effort is tomorrow\'s confidence.',
  'One more unit. One more test. One step closer.',
  'Be patient with the syllabus, be strict with your schedule.'
];
