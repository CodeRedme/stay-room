// ===================== STAY ROOM · app.js =====================
const STORE_KEY = 'stayroom_v1';

const DEFAULT_SECTIONS = [
  { id: 'morning', name: 'Morning', emoji: '☀️', hint: 'Wake up · Freshen up · Breakfast · Study session · Get ready', startHour: 5 },
  { id: 'noon',    name: 'Noon',    emoji: '🌤️', hint: 'Classes · Lunch · Homework · Important tasks', startHour: 12 },
  { id: 'evening', name: 'Evening', emoji: '🌆', hint: 'Revision · Hobbies · Exercise · Personal projects', startHour: 17 },
  { id: 'night',   name: 'Night',   emoji: '🌙', hint: 'Finish pending work · Prepare for tomorrow · Journal · Rest', startHour: 21 }
];

const defaultState = {
  name: '',
  theme: 'dark',
  stayMode: true,
  buddyIndex: null,
  subjects: [],       // {id, name, progress}
  tasks: [],           // legacy (migrated into the planner on load)
  sections: structuredClone(DEFAULT_SECTIONS),
  plan: {},             // 'YYYY-MM-DD' -> {tasks, energy, rest, diary}
  pending: [],          // tasks left unscheduled
  sessions: [],         // {date, minutes, subject}
  exam: null            // {label, date}
};

// ---------- date helpers ----------
function dateKey(d){ const z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; }
function todayKey(){ return dateKey(new Date()); }
function parseKey(k){ const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function shiftKey(k, n){ const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); }
function prettyDate(k){ return parseKey(k).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }); }
function sectionForHour(sections, h){
  let found = null;
  sections.forEach(s => { if(s.startHour <= h) found = s.id; });
  return found || sections[sections.length - 1].id;
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    const s = raw ? {...structuredClone(defaultState), ...JSON.parse(raw)} : structuredClone(defaultState);
    if(!Array.isArray(s.sections) || !s.sections.length) s.sections = structuredClone(DEFAULT_SECTIONS);
    if(!s.plan || typeof s.plan !== 'object') s.plan = {};
    if(!Array.isArray(s.pending)) s.pending = [];
    if(s.tasks && s.tasks.length){
      const k = todayKey();
      if(!s.plan[k]) s.plan[k] = { tasks: [], energy: '', rest: false, diary: { mood: '', happened: '', grateful: '', improve: '' } };
      const sec = sectionForHour(s.sections, new Date().getHours());
      s.tasks.forEach(t => s.plan[k].tasks.push({ id: t.id, title: t.title, section: sec, done: !!t.done, size: 'medium', kind: 'task', subject: t.subject || '', deadline: '' }));
      s.tasks = [];
    }
    return s;
  }catch(e){ return structuredClone(defaultState); }
}
function saveState(){ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

let state = loadState();
let uid = () => Math.random().toString(36).slice(2,9);

// ---------- theme / stay mode ----------
function applySettingsUI(){
  document.body.setAttribute('data-theme', state.theme);
  document.getElementById('toggleTheme').classList.toggle('on', state.theme === 'light');
  document.getElementById('toggleStayMode').classList.toggle('on', state.stayMode);
  document.getElementById('nameInput').value = state.name || '';
  document.getElementById('modeChipTop').textContent = state.stayMode ? '⭐ STAY Mode' : '🌎 Universal';
  document.getElementById('modeChipTop').style.display = 'inline-block';
}

document.getElementById('toggleTheme').addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  saveState(); applySettingsUI();
});
document.getElementById('toggleStayMode').addEventListener('click', () => {
  state.stayMode = !state.stayMode;
  saveState(); applySettingsUI();
  toast(state.stayMode ? '⭐ STAY Mode activated' : '🌎 Universal Mode on');
});
document.getElementById('nameInput').addEventListener('change', (e) => {
  state.name = e.target.value.trim();
  saveState(); renderGreeting();
});

// ---------- navigation ----------
const views = ['home','planner','focus','subjects','settings'];
function goto(view){
  views.forEach(v => {
    document.getElementById('view-'+v).classList.toggle('active', v === view);
  });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
  window.scrollTo({top:0, behavior:'instant'});
}
document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => goto(btn.dataset.view)));
document.querySelectorAll('[data-goto]').forEach(btn => btn.addEventListener('click', () => goto(btn.dataset.goto)));

// ---------- greeting + live clock ----------
function greetingLine(hour, name){
  const n = name ? name : 'STAY';
  if(hour < 5) return [`Hello, Night Owl. 🦉`, `Still going, ${n}?`];
  if(hour < 12) return [`Good morning, ${n}. ☀️`, `Ready to make today count?`];
  if(hour < 17) return [`Good afternoon, ${n}. ☕`, `Let's get through the list.`];
  if(hour < 21) return [`Good evening, ${n}. 🌆`, `A little focus goes a long way.`];
  return [`Hello, Night Owl. 🌙`, `Still studying? You've got this.`];
}
function renderGreeting(){
  const now = new Date();
  const [line1, line2] = greetingLine(now.getHours(), state.name);
  document.getElementById('greetingText').textContent = line1;
  document.getElementById('dateText').textContent = line2;
}
function tickClock(){
  const now = new Date();
  document.getElementById('liveClock').textContent = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}
setInterval(tickClock, 1000); tickClock();
setInterval(renderGreeting, 60000);

// ---------- tasks (Home shows today's planner tasks) ----------
function todaysTasks(){
  const day = state.plan[todayKey()];
  if(!day) return [];
  const order = state.sections.map(s => s.id);
  return [...day.tasks].sort((a, b) => order.indexOf(a.section) - order.indexOf(b.section));
}
function renderTasks(){
  const list = document.getElementById('taskList');
  const today = todaysTasks();
  if(today.length === 0){
    list.innerHTML = `<div class="empty-note">Nothing planned for today yet. Add a task below. 📋</div>`;
  } else {
    list.innerHTML = today.map(t => {
      const sec = state.sections.find(s => s.id === t.section);
      return `
      <div class="task-row ${t.done ? 'done' : ''}" data-id="${t.id}">
        <button class="check" data-action="toggle">${t.done ? '✓' : ''}</button>
        <div style="flex:1">
          <div class="task-title">${escapeHtml(t.title)}</div>
          <div class="task-subject">${sec ? sec.emoji + ' ' + escapeHtml(sec.name) : ''}${t.subject ? ' · ' + escapeHtml(t.subject) : ''}</div>
        </div>
      </div>`;
    }).join('');
  }
  const done = today.filter(t => t.done).length;
  document.getElementById('statTasks').textContent = `${done}/${today.length}`;
}
document.getElementById('taskList').addEventListener('click', (e) => {
  const row = e.target.closest('.task-row');
  if(!row) return;
  const day = state.plan[todayKey()];
  const t = day && day.tasks.find(t => t.id === row.dataset.id);
  if(!t) return;
  t.done = !t.done;
  saveState(); renderTasks(); renderStats(); renderPlanner();
});
document.getElementById('quickTaskAdd').addEventListener('click', addQuickTask);
document.getElementById('quickTaskInput').addEventListener('keydown', e => { if(e.key === 'Enter') addQuickTask(); });
function addQuickTask(){
  const input = document.getElementById('quickTaskInput');
  const val = input.value.trim();
  if(!val) return;
  getDay(todayKey()).tasks.push(newTask({ title: val, section: currentSectionId() }));
  input.value = '';
  saveState(); renderTasks(); renderStats(); renderPlanner();
}

// ---------- subjects ----------
function renderSubjects(){
  const list = document.getElementById('subjectList');
  if(state.subjects.length === 0){
    list.innerHTML = `<div class="empty-note">No subjects yet — add whatever you're studying, however you'd label it. 📚</div>`;
    return;
  }
  list.innerHTML = state.subjects.map(s => `
    <div class="subject-card">
      <div class="subject-top">
        <div class="subject-name">${escapeHtml(s.name)}</div>
        <div class="subject-pct">${s.progress}%</div>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${s.progress}%"></div></div>
    </div>
  `).join('');
}
document.getElementById('subjectAdd').addEventListener('click', addSubject);
document.getElementById('subjectInput').addEventListener('keydown', e => { if(e.key === 'Enter') addSubject(); });
function addSubject(){
  const input = document.getElementById('subjectInput');
  const val = input.value.trim();
  if(!val) return;
  state.subjects.push({id: uid(), name: val, progress: 0});
  input.value = '';
  saveState(); renderSubjects();
}

// ---------- stats ----------
function renderStats(){
  const today = new Date().toDateString();
  const todaysMinutes = state.sessions.filter(s => s.date === today).reduce((a,b)=>a+b.minutes,0);
  document.getElementById('statToday').textContent = todaysMinutes >= 60 ? `${Math.floor(todaysMinutes/60)}h ${todaysMinutes%60}m` : `${todaysMinutes}m`;
  document.getElementById('statSessions').textContent = state.sessions.filter(s => s.date === today).length;
}

// ---------- focus setup chips ----------
let selectedMinutes = 45;
let selectedAudio = 'silent';
document.getElementById('durationChips').addEventListener('click', e => {
  const chip = e.target.closest('.chip'); if(!chip) return;
  document.querySelectorAll('#durationChips .chip').forEach(c => c.classList.remove('selected'));
  chip.classList.add('selected');
  selectedMinutes = parseInt(chip.dataset.min, 10);
});
document.getElementById('audioChips').addEventListener('click', e => {
  const chip = e.target.closest('.chip'); if(!chip) return;
  document.querySelectorAll('#audioChips .chip').forEach(c => c.classList.remove('selected'));
  chip.classList.add('selected');
  selectedAudio = chip.dataset.audio;
});

// ---------- deep focus timer (timestamp-based, survives tab throttling) ----------
let focusTimer = { endsAt: null, durationSec: 0, paused: false, remainingAtPause: 0, subject: '', topic: '', raf: null };

document.getElementById('beginFocusBtn').addEventListener('click', () => {
  const subject = document.getElementById('focusSubject').value.trim() || 'Study';
  const topic = document.getElementById('focusTopic').value.trim();
  startFocus(subject, topic, selectedMinutes);
});

function startFocus(subject, topic, minutes){
  focusTimer.durationSec = minutes * 60;
  focusTimer.endsAt = Date.now() + focusTimer.durationSec * 1000;
  focusTimer.paused = false;
  focusTimer.subject = subject;
  focusTimer.topic = topic;

  document.getElementById('ofSubject').textContent = subject.toUpperCase();
  document.getElementById('ofTopic').textContent = topic || '—';
  document.getElementById('ofPauseBtn').textContent = 'Pause';
  document.getElementById('focusOverlay').classList.add('active');
  tickFocus();
}

function tickFocus(){
  if(focusTimer.paused) return;
  const remainingMs = focusTimer.endsAt - Date.now();
  const remainingSec = Math.max(0, Math.round(remainingMs/1000));
  const mm = String(Math.floor(remainingSec/60)).padStart(2,'0');
  const ss = String(remainingSec%60).padStart(2,'0');
  document.getElementById('ofTimer').textContent = `${mm}:${ss}`;
  const pct = 100 - (remainingSec / focusTimer.durationSec * 100);
  document.getElementById('ofBar').style.width = pct + '%';

  if(remainingSec <= 0){
    finishFocus(true);
    return;
  }
  focusTimer.raf = setTimeout(tickFocus, 250);
}

document.getElementById('ofPauseBtn').addEventListener('click', () => {
  if(!focusTimer.paused){
    focusTimer.paused = true;
    focusTimer.remainingAtPause = focusTimer.endsAt - Date.now();
    clearTimeout(focusTimer.raf);
    document.getElementById('ofPauseBtn').textContent = 'Resume';
  } else {
    focusTimer.paused = false;
    focusTimer.endsAt = Date.now() + focusTimer.remainingAtPause;
    document.getElementById('ofPauseBtn').textContent = 'Pause';
    tickFocus();
  }
});
document.getElementById('ofFinishBtn').addEventListener('click', () => finishFocus(false));
document.getElementById('exitFocusBtn').addEventListener('click', () => finishFocus(false));

function finishFocus(completed){
  clearTimeout(focusTimer.raf);
  const elapsedSec = focusTimer.durationSec - Math.max(0, Math.round((focusTimer.endsAt - Date.now())/1000));
  const minutes = Math.max(1, Math.round(elapsedSec/60));
  state.sessions.push({ date: new Date().toDateString(), minutes, subject: focusTimer.subject });
  saveState();
  document.getElementById('focusOverlay').classList.remove('active');
  renderStats();
  toast(completed ? `✨ Session complete — ${minutes} min focused` : `Session saved — ${minutes} min focused`);
  goto('home');
}

// ---------- compass clock ----------
const MASCOTS = [
  { name: 'Wolf Chan', emoji: '🐺', quote: '"One task at a time — you\'ve got this."' },
  { name: 'Leebit', emoji: '🐰', quote: '"Steady pace wins the day."' },
  { name: 'Dwaekki', emoji: '🐷', quote: '"Let\'s go — one page, one rep."' },
  { name: 'Jiniret', emoji: '🥟', quote: '"Small steps still count as progress."' },
  { name: 'Han Quokka', emoji: '🐿️', quote: '"Stash this away — you\'ll need it later."' },
  { name: 'BbokAri', emoji: '🐥', quote: '"Bright start, bright finish."' },
  { name: 'PuppyM', emoji: '🐶', quote: '"Stay loyal to your goals today."' },
  { name: 'FoxI.Ny', emoji: '🦊', quote: '"Sharp focus, clever moves."' }
];

function renderCompassTicks(){
  const g = document.getElementById('compassTicks');
  let html = '';
  for(let i = 0; i < 60; i++){
    const angle = i * 6;
    const isMajor = i % 5 === 0;
    const r1 = 140, r2 = isMajor ? 128 : 133;
    const rad = (angle - 90) * (Math.PI / 180);
    const x1 = 150 + r1 * Math.cos(rad), y1 = 150 + r1 * Math.sin(rad);
    const x2 = 150 + r2 * Math.cos(rad), y2 = 150 + r2 * Math.sin(rad);
    html += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${isMajor ? 'tick-major' : 'tick-minor'}"/>`;
  }
  g.innerHTML = html;
}

function renderCompassNodes(){
  const g = document.getElementById('compassNodes');
  const radius = 116;
  const accentCycle = ['var(--amber)', 'var(--lavender)', 'var(--pink)', 'var(--green)'];
  let html = '';
  MASCOTS.forEach((m, i) => {
    const angle = (i * 45 - 90) * (Math.PI / 180);
    const cx = 150 + radius * Math.cos(angle);
    const cy = 150 + radius * Math.sin(angle);
    const selected = i === state.buddyIndex;
    const accent = accentCycle[i % accentCycle.length];
    html += `
      <g class="compass-node ${selected ? 'selected' : ''}" data-idx="${i}" transform="translate(${cx},${cy})">
        <circle r="16" class="node-bg" style="fill:${accent}; opacity:${selected ? 0.28 : 0.16};"/>
        <text x="0" y="5.5" text-anchor="middle" font-size="16">${m.emoji}</text>
      </g>`;
  });
  g.innerHTML = html;
}

document.getElementById('compassNodes').addEventListener('click', (e) => {
  const node = e.target.closest('.compass-node');
  if(!node) return;
  state.buddyIndex = parseInt(node.dataset.idx, 10);
  saveState();
  renderCompassNodes();
  renderBuddyQuote();
});

function renderBuddyQuote(){
  const el = document.getElementById('buddyQuote');
  if(state.buddyIndex === null){ el.textContent = 'Tap a mascot to pick your study buddy ✨'; return; }
  const m = MASCOTS[state.buddyIndex];
  el.textContent = `${m.emoji} ${m.name} — ${m.quote}`;
}

function updateCompassHands(){
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  const hourAngle = ((h % 12) + m / 60) * 30;
  const minAngle = (m + s / 60) * 6;
  const secAngle = s * 6;
  document.getElementById('hourHand').setAttribute('transform', `rotate(${hourAngle} 150 150)`);
  document.getElementById('minuteHand').setAttribute('transform', `rotate(${minAngle} 150 150)`);
  document.getElementById('secondHand').setAttribute('transform', `rotate(${secAngle} 150 150)`);
}
setInterval(updateCompassHands, 1000);

// ---------- ambient sounds (synthesized, no audio files) ----------
let audioCtx = null, rainGain = null, spaceGain = null, cafeGain = null;
function ensureAudio(){
  if(audioCtx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AC();
  const bufferSize = audioCtx.sampleRate * 2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  function makeLayer(filterType, freq, q){
    const src = audioCtx.createBufferSource();
    src.buffer = buffer; src.loop = true;
    const filter = audioCtx.createBiquadFilter();
    filter.type = filterType; filter.frequency.value = freq;
    if(q) filter.Q.value = q;
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    src.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
    src.start();
    return gain;
  }
  rainGain = makeLayer('bandpass', 1000);
  spaceGain = makeLayer('lowpass', 180);
  cafeGain = makeLayer('bandpass', 500, 0.7);
}
function wireAmbientSlider(id, getGain, divisor){
  document.getElementById(id).addEventListener('input', (e) => {
    ensureAudio();
    getGain().gain.value = e.target.value / divisor;
  });
}
wireAmbientSlider('rainVolume', () => rainGain, 300);
wireAmbientSlider('spaceVolume', () => spaceGain, 200);
wireAmbientSlider('cafeVolume', () => cafeGain, 250);

// ---------- exam countdown ----------
function renderExamTag(){
  const tag = document.getElementById('nextExamTag');
  if(!state.exam){ tag.textContent = '+ Add an exam'; return; }
  const days = Math.ceil((new Date(state.exam.date) - new Date()) / 86400000);
  tag.textContent = days >= 0 ? `${state.exam.label} · ${days}d left` : state.exam.label;
}

document.getElementById('nextExamTag').addEventListener('click', () => {
  const editor = document.getElementById('examEditor');
  const opening = editor.style.display === 'none';
  editor.style.display = opening ? 'block' : 'none';
  if(opening){
    document.getElementById('examLabelInput').value = state.exam ? state.exam.label : '';
    document.getElementById('examDateInput').value = state.exam ? state.exam.date : '';
  }
});
document.getElementById('examSaveBtn').addEventListener('click', () => {
  const label = document.getElementById('examLabelInput').value.trim();
  const date = document.getElementById('examDateInput').value;
  if(!label || !date){ toast('Add both a name and a date'); return; }
  state.exam = { label, date };
  saveState(); renderExamTag();
  document.getElementById('examEditor').style.display = 'none';
  toast('Exam saved 📅');
});
document.getElementById('examRemoveBtn').addEventListener('click', () => {
  state.exam = null;
  saveState(); renderExamTag();
  document.getElementById('examEditor').style.display = 'none';
});

// ---------- export / clear ----------
document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'stay-room-backup.json'; a.click();
  URL.revokeObjectURL(url);
  toast('Backup downloaded 📤');
});
document.getElementById('clearDataBtn').addEventListener('click', () => {
  if(confirm('This removes everything stored on this device — tasks, subjects, sessions. This can\'t be undone unless you exported a backup. Continue?')){
    localStorage.removeItem(STORE_KEY);
    state = structuredClone(defaultState);
    renderAll();
    toast('Your data has been cleared');
  }
});

// ---------- planner ----------
let plannerDate = todayKey();
const SIZE_MIN = { short: 15, medium: 30, long: 60 };
const ENERGY_CAP = { low: 90, medium: 180, high: 300 };
const KIND_LABEL = { task: 'Task', revision: 'Revision', assignment: 'Assignment' };
const MOODS = ['😞', '😕', '😐', '🙂', '😄'];

function emptyDay(){ return { tasks: [], energy: '', rest: false, diary: { mood: '', happened: '', grateful: '', improve: '' } }; }
function getDay(key){
  if(!state.plan[key]) state.plan[key] = emptyDay();
  const d = state.plan[key];
  if(!d.diary) d.diary = emptyDay().diary;
  return d;
}
function viewDay(key){ return state.plan[key] || emptyDay(); }
function newTask(f){ return Object.assign({ id: uid(), title: '', section: '', done: false, size: 'medium', kind: 'task', subject: '', deadline: '' }, f); }
function fmtMin(m){ if(m < 60) return m + 'm'; const h = Math.floor(m / 60), r = m % 60; return r ? `${h}h ${r}m` : `${h}h`; }
function shortDate(k){ return parseKey(k).toLocaleDateString([], { day: 'numeric', month: 'short' }); }
function currentSectionId(){ return sectionForHour(state.sections, new Date().getHours()); }
function sectionIndexNow(){ return state.sections.findIndex(s => s.id === currentSectionId()); }
function sectionLabel(id){ const s = state.sections.find(x => x.id === id); return s ? `${s.emoji} ${s.name}` : 'Pending'; }

function taskTags(t){
  const tags = [`<span class="tag">⏱ ${t.size}</span>`];
  if(t.kind !== 'task') tags.push(`<span class="tag">${KIND_LABEL[t.kind]}</span>`);
  if(t.subject) tags.push(`<span class="tag subj">${escapeHtml(t.subject)}</span>`);
  if(t.deadline) tags.push(`<span class="tag due">due ${shortDate(t.deadline)}</span>`);
  return tags.join('');
}

function renderPlanner(){
  const isToday = plannerDate === todayKey();
  const day = viewDay(plannerDate);
  document.getElementById('dateInput').value = plannerDate;
  document.getElementById('dateLine').textContent = prettyDate(plannerDate) + (isToday ? ' · Today' : '');
  document.querySelectorAll('#energyChips [data-energy]').forEach(c => c.classList.toggle('selected', c.dataset.energy === day.energy));
  document.getElementById('restToggle').classList.toggle('selected', !!day.rest);
  renderEnergyNote(day);
  renderComposerOptions();
  renderSectionCards(day, isToday);
  renderPending();
  renderDeadlines();
  renderDiary(day);
  renderProgress();
}

function renderEnergyNote(day){
  const el = document.getElementById('energyNote');
  const left = day.tasks.filter(t => !t.done).reduce((a, t) => a + SIZE_MIN[t.size], 0);
  if(day.rest){ el.textContent = 'Rest day 💗 Nothing is expected today.'; return; }
  if(!day.energy){ el.textContent = left ? `About ${fmtMin(left)} planned. Pick an energy level to see if it feels realistic.` : 'Pick an energy level and build a plan that fits your actual day.'; return; }
  const cap = ENERGY_CAP[day.energy];
  if(left <= cap) el.textContent = left ? `About ${fmtMin(left)} still planned. That fits a ${day.energy}-energy day ✨` : `Nothing left on the plan. Enjoy the ${day.energy}-energy day ✨`;
  else el.textContent = `About ${fmtMin(left)} planned is a lot for a ${day.energy}-energy day. Maybe plan again for a long task or two?`;
}

function renderComposerOptions(){
  const secSel = document.getElementById('planSection'), subSel = document.getElementById('planSubject');
  const secVal = secSel.value, subVal = subSel.value;
  secSel.innerHTML = state.sections.map(s => `<option value="${s.id}">${s.emoji} ${escapeHtml(s.name)}</option>`).join('');
  secSel.value = state.sections.some(s => s.id === secVal) ? secVal : currentSectionId();
  subSel.innerHTML = `<option value="">No subject</option>` + state.subjects.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('');
  subSel.value = subVal;
}

function renderSectionCards(day, isToday){
  const nowIdx = isToday ? sectionIndexNow() : -1;
  document.getElementById('sectionList').innerHTML = state.sections.map((s, si) => {
    const tasks = day.tasks.filter(t => t.section === s.id);
    const done = tasks.filter(t => t.done).length;
    const open = tasks.length - done;
    const passed = isToday && si < nowIdx && open > 0;
    const rows = tasks.map(t => `
      <div class="ptask ${t.done ? 'done' : ''}" data-id="${t.id}">
        <button class="check" data-action="toggle" aria-label="Mark done">${t.done ? '✓' : ''}</button>
        <div class="ptask-body">
          <div class="task-title">${escapeHtml(t.title)}</div>
          <div class="ptask-meta">${taskTags(t)}</div>
        </div>
        <div class="ptask-actions">
          <button data-action="up" aria-label="Move up">↑</button>
          <button data-action="down" aria-label="Move down">↓</button>
          <button data-action="move" aria-label="Move to another part of the day">→</button>
          <button data-action="edit" aria-label="Edit">✎</button>
          <button data-action="delete" aria-label="Delete">✕</button>
        </div>
      </div>`).join('') || `<div class="empty-note small">Nothing here yet.</div>`;
    return `
      <div class="plan-section ${si === nowIdx ? 'current' : ''}" data-sid="${s.id}">
        <div class="plan-head">
          <div class="plan-title">${s.emoji} ${escapeHtml(s.name)} <span class="plan-count">${tasks.length ? `${done}/${tasks.length}` : ''}</span></div>
          <button class="mini-btn" data-action="edit-section" aria-label="Edit this part of the day">✎</button>
        </div>
        <div class="plan-hint">${escapeHtml(s.hint)}</div>
        ${rows}
        ${open > 0 ? `<button class="plan-again" data-action="plan-again">↻ Plan again (${open})</button>` : ''}
        ${passed ? `<div class="plan-nudge">This part of the day has passed. No stress, just plan again.</div>` : ''}
      </div>`;
  }).join('');
}

function moveWithin(day, id, dir){
  const t = day.tasks.find(x => x.id === id); if(!t) return;
  const same = day.tasks.filter(x => x.section === t.section);
  const i = same.indexOf(t), j = i + dir;
  if(j < 0 || j >= same.length) return;
  const a = day.tasks.indexOf(same[i]), b = day.tasks.indexOf(same[j]);
  [day.tasks[a], day.tasks[b]] = [day.tasks[b], day.tasks[a]];
}

function refreshAfterPlanChange(){
  saveState(); renderPlanner(); renderTasks(); renderStats();
}

document.getElementById('sectionList').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]'); if(!btn) return;
  const action = btn.dataset.action;
  const sid = btn.closest('.plan-section').dataset.sid;
  const row = btn.closest('.ptask');
  const id = row ? row.dataset.id : null;
  const day = getDay(plannerDate);
  if(action === 'toggle'){ const t = day.tasks.find(x => x.id === id); if(t) t.done = !t.done; refreshAfterPlanChange(); }
  else if(action === 'up'){ moveWithin(day, id, -1); refreshAfterPlanChange(); }
  else if(action === 'down'){ moveWithin(day, id, 1); refreshAfterPlanChange(); }
  else if(action === 'delete'){ day.tasks = day.tasks.filter(x => x.id !== id); refreshAfterPlanChange(); toast('Task removed'); }
  else if(action === 'edit'){ openEditTask(id); }
  else if(action === 'move'){ openMoveSheet([id], sid); }
  else if(action === 'plan-again'){
    const ids = day.tasks.filter(t => t.section === sid && !t.done).map(t => t.id);
    openMoveSheet(ids, sid);
  }
  else if(action === 'edit-section'){ openEditSection(sid); }
});

// ---- date + energy + composer controls ----
function setPlannerDate(k){ plannerDate = k; renderPlanner(); }
document.getElementById('datePrev').addEventListener('click', () => setPlannerDate(shiftKey(plannerDate, -1)));
document.getElementById('dateNext').addEventListener('click', () => setPlannerDate(shiftKey(plannerDate, 1)));
document.getElementById('dateToday').addEventListener('click', () => setPlannerDate(todayKey()));
document.getElementById('dateInput').addEventListener('change', (e) => { if(e.target.value) setPlannerDate(e.target.value); });

document.getElementById('energyChips').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip'); if(!chip) return;
  const day = getDay(plannerDate);
  if(chip.id === 'restToggle') day.rest = !day.rest;
  else day.energy = (day.energy === chip.dataset.energy) ? '' : chip.dataset.energy;
  saveState(); renderPlanner(); renderProgress();
});

document.getElementById('planKind').addEventListener('change', (e) => {
  document.getElementById('planDeadlineRow').style.display = e.target.value === 'assignment' ? 'block' : 'none';
});
document.getElementById('planAddBtn').addEventListener('click', addPlanTask);
document.getElementById('planTitle').addEventListener('keydown', (e) => { if(e.key === 'Enter') addPlanTask(); });
function addPlanTask(){
  const titleEl = document.getElementById('planTitle');
  const title = titleEl.value.trim();
  if(!title){ toast('Give the task a name first'); return; }
  const kind = document.getElementById('planKind').value;
  const t = newTask({
    title,
    section: document.getElementById('planSection').value || currentSectionId(),
    size: document.getElementById('planSize').value,
    kind,
    subject: document.getElementById('planSubject').value,
    deadline: kind === 'assignment' ? document.getElementById('planDeadline').value : ''
  });
  getDay(plannerDate).tasks.push(t);
  titleEl.value = '';
  document.getElementById('planDeadline').value = '';
  refreshAfterPlanChange();
  toast('Added to your plan ✨');
}

// ---- sheets ----
function openSheet(id){ document.getElementById(id).classList.add('active'); }
function closeSheet(id){ document.getElementById(id).classList.remove('active'); }
document.querySelectorAll('.sheet-backdrop').forEach(b => b.addEventListener('click', (e) => { if(e.target === b) b.classList.remove('active'); }));
document.querySelectorAll('[data-close-sheet]').forEach(b => b.addEventListener('click', () => closeSheet(b.dataset.closeSheet)));

// ---- "Plan again, not start over" ----
let moveCtx = null;
function openMoveSheet(ids, fromSid){
  if(!ids.length) return;
  moveCtx = { ids, fromSid, dateKey: plannerDate };
  document.getElementById('moveTitle').textContent = ids.length === 1 ? 'Plan this again' : `Plan these ${ids.length} tasks again`;
  const idx = state.sections.findIndex(s => s.id === fromSid);
  const ordered = idx < 0 ? state.sections : [...state.sections.slice(idx + 1), ...state.sections.slice(0, idx)];
  document.getElementById('moveOptions').innerHTML = ordered
    .filter(s => s.id !== fromSid)
    .map(s => `<button class="sheet-option" data-dest="section:${s.id}">${s.emoji} Move to ${escapeHtml(s.name)}</button>`).join('');
  document.getElementById('moveDate').value = shiftKey(plannerDate, 1);
  document.getElementById('movePendingBtn').style.display = fromSid === 'pending' ? 'none' : 'block';
  openSheet('moveSheet');
}
function takeTask(id){
  let i = state.pending.findIndex(t => t.id === id);
  if(i >= 0) return state.pending.splice(i, 1)[0];
  const day = state.plan[moveCtx.dateKey]; if(!day) return null;
  i = day.tasks.findIndex(t => t.id === id);
  return i >= 0 ? day.tasks.splice(i, 1)[0] : null;
}
function applyMove(type, value){
  moveCtx.ids.forEach(id => {
    const t = takeTask(id); if(!t) return;
    if(type === 'section'){ t.section = value; getDay(moveCtx.dateKey).tasks.push(t); }
    else if(type === 'date'){ t.section = state.sections[0].id; t.done = false; getDay(value).tasks.push(t); }
    else { t.section = 'pending'; t.done = false; state.pending.push(t); }
  });
  closeSheet('moveSheet');
  refreshAfterPlanChange();
  toast(type === 'pending' ? 'Saved in pending. No rush 🫶' : 'Plan updated. The day goes on ✨');
}
document.getElementById('moveOptions').addEventListener('click', (e) => {
  const b = e.target.closest('[data-dest]'); if(!b) return;
  applyMove('section', b.dataset.dest.split(':')[1]);
});
document.getElementById('moveDateBtn').addEventListener('click', () => {
  const v = document.getElementById('moveDate').value;
  if(!v){ toast('Pick a date first'); return; }
  applyMove('date', v);
});
document.getElementById('movePendingBtn').addEventListener('click', () => applyMove('pending'));

// ---- pending ----
function renderPending(){
  const el = document.getElementById('pendingList');
  if(!state.pending.length){ el.innerHTML = `<div class="empty-note">No pending tasks. Anything you leave here waits with no pressure. 🫶</div>`; return; }
  el.innerHTML = state.pending.map(t => `
    <div class="ptask" data-id="${t.id}">
      <div class="ptask-body">
        <div class="task-title">${escapeHtml(t.title)}</div>
        <div class="ptask-meta">${taskTags(t)}</div>
      </div>
      <div class="ptask-actions">
        <button data-action="plan">Plan</button>
        <button data-action="edit" aria-label="Edit">✎</button>
        <button data-action="delete" aria-label="Delete">✕</button>
      </div>
    </div>`).join('');
}
document.getElementById('pendingList').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]'); if(!btn) return;
  const id = btn.closest('.ptask').dataset.id;
  if(btn.dataset.action === 'plan') openMoveSheet([id], 'pending');
  else if(btn.dataset.action === 'edit') openEditTask(id);
  else if(btn.dataset.action === 'delete'){ state.pending = state.pending.filter(t => t.id !== id); refreshAfterPlanChange(); }
});

// ---- edit task ----
let editTaskId = null;
function findTask(id){
  const p = state.pending.find(t => t.id === id); if(p) return p;
  for(const k of Object.keys(state.plan)){ const t = state.plan[k].tasks.find(x => x.id === id); if(t) return t; }
  return null;
}
function openEditTask(id){
  const t = findTask(id); if(!t) return;
  editTaskId = id;
  document.getElementById('etTitle').value = t.title;
  document.getElementById('etSize').value = t.size;
  document.getElementById('etKind').value = t.kind;
  const names = [...new Set([t.subject, ...state.subjects.map(s => s.name)].filter(Boolean))];
  document.getElementById('etSubject').innerHTML = `<option value="">No subject</option>` + names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  document.getElementById('etSubject').value = t.subject;
  document.getElementById('etDeadline').value = t.deadline || '';
  openSheet('editTaskSheet');
}
document.getElementById('etSave').addEventListener('click', () => {
  const t = findTask(editTaskId); if(!t) return;
  const title = document.getElementById('etTitle').value.trim();
  if(!title){ toast('Task needs a name'); return; }
  t.title = title;
  t.size = document.getElementById('etSize').value;
  t.kind = document.getElementById('etKind').value;
  t.subject = document.getElementById('etSubject').value;
  t.deadline = document.getElementById('etDeadline').value;
  closeSheet('editTaskSheet');
  refreshAfterPlanChange();
});

// ---- edit section ----
let editSectionId = null;
function openEditSection(sid){
  const s = state.sections.find(x => x.id === sid); if(!s) return;
  editSectionId = sid;
  document.getElementById('esName').value = s.name;
  document.getElementById('esEmoji').value = s.emoji;
  document.getElementById('esHint').value = s.hint;
  document.getElementById('esStart').value = s.startHour;
  openSheet('editSectionSheet');
}
document.getElementById('esSave').addEventListener('click', () => {
  const s = state.sections.find(x => x.id === editSectionId); if(!s) return;
  s.name = document.getElementById('esName').value.trim() || s.name;
  s.emoji = document.getElementById('esEmoji').value.trim() || s.emoji;
  s.hint = document.getElementById('esHint').value.trim();
  const h = parseInt(document.getElementById('esStart').value, 10);
  if(!isNaN(h) && h >= 0 && h <= 23) s.startHour = h;
  closeSheet('editSectionSheet');
  refreshAfterPlanChange();
});
document.getElementById('esReset').addEventListener('click', () => {
  state.sections = structuredClone(DEFAULT_SECTIONS);
  closeSheet('editSectionSheet');
  refreshAfterPlanChange();
  toast('Sections reset to the defaults');
});

// ---- deadlines (study mode) ----
function renderDeadlines(){
  const items = [];
  Object.keys(state.plan).forEach(k => state.plan[k].tasks.forEach(t => { if(t.deadline && !t.done) items.push(t); }));
  state.pending.forEach(t => { if(t.deadline) items.push(t); });
  items.sort((a, b) => a.deadline.localeCompare(b.deadline));
  const el = document.getElementById('deadlineList');
  if(!items.length){ el.innerHTML = `<div class="empty-note">No deadlines yet. Add an assignment with a due date and it shows up here. 📚</div>`; return; }
  const today = parseKey(todayKey());
  el.innerHTML = items.slice(0, 6).map(t => {
    const d = Math.round((parseKey(t.deadline) - today) / 86400000);
    const label = d < 0 ? `${-d}d ago` : d === 0 ? 'today' : `${d}d left`;
    return `<div class="deadline-row"><div><div class="task-title">${escapeHtml(t.title)}</div><div class="task-subject">${t.subject ? escapeHtml(t.subject) + ' · ' : ''}${shortDate(t.deadline)}</div></div><span class="deadline-chip">${label}</span></div>`;
  }).join('');
}

// ---- diary ----
function renderDiary(day){
  document.getElementById('moodRow').innerHTML = MOODS.map(m => `<button class="mood ${day.diary.mood === m ? 'selected' : ''}" data-mood="${m}">${m}</button>`).join('');
  document.getElementById('diaryHappened').value = day.diary.happened;
  document.getElementById('diaryGrateful').value = day.diary.grateful;
  document.getElementById('diaryImprove').value = day.diary.improve;
}
document.getElementById('moodRow').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mood]'); if(!b) return;
  const d = getDay(plannerDate);
  d.diary.mood = d.diary.mood === b.dataset.mood ? '' : b.dataset.mood;
  saveState(); renderDiary(d);
});
[['diaryHappened', 'happened'], ['diaryGrateful', 'grateful'], ['diaryImprove', 'improve']].forEach(([id, key]) => {
  document.getElementById(id).addEventListener('input', (e) => { getDay(plannerDate).diary[key] = e.target.value; saveState(); });
});

// ---- gentle progress ----
function renderProgress(){
  const el = document.getElementById('progressCard');
  const tk = todayKey();
  const today = viewDay(tk);
  const total = today.tasks.length, done = today.tasks.filter(t => t.done).length, open = total - done;
  let dots = '', active = 0, rests = 0, weekDone = 0;
  for(let i = 6; i >= 0; i--){
    const k = shiftKey(tk, -i);
    const d = viewDay(k);
    const dn = d.tasks.filter(t => t.done).length;
    weekDone += dn;
    const hadSession = state.sessions.some(s => s.date === parseKey(k).toDateString());
    const isActive = dn > 0 || hadSession;
    if(d.rest) rests++; else if(isActive) active++;
    const cls = d.rest ? 'rest' : isActive ? 'on' : '';
    const sym = d.rest ? '🛌' : isActive ? '●' : '○';
    dots += `<div class="week-dot ${cls}"><span>${sym}</span><small>${parseKey(k).toLocaleDateString([], { weekday: 'narrow' })}</small></div>`;
  }
  let msg;
  if(today.rest) msg = 'Rest day. Nothing to prove today 🛌💗';
  else if(total === 0) msg = 'Plan one small thing whenever you feel like it.';
  else if(done === total) msg = 'Everything on today\'s plan is done. Go rest 💗';
  else if(done === 0) msg = 'Nothing ticked yet, and that\'s okay. Plan again whenever you\'re ready.';
  else msg = `Nice, ${done} down. The rest can move if the day changes.`;
  el.innerHTML = `
    <div class="prog-row"><div class="prog-big">${done}/${total}</div><div class="prog-label">done today${open ? ` · ${open} still open` : ''}</div></div>
    <div class="week-dots">${dots}</div>
    <div class="prog-note">Active ${active} of ${7 - rests} days this week · ${weekDone} tasks completed. Rest days never count as misses 💗</div>
    <div class="prog-msg">${msg}</div>`;
}

// ---------- toast ----------
let toastTimer;
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML.replace(/"/g, '&quot;');
}

function renderAll(){
  applySettingsUI();
  renderGreeting();
  renderTasks();
  renderSubjects();
  renderStats();
  renderExamTag();
  renderPlanner();
  renderCompassTicks();
  renderCompassNodes();
  renderBuddyQuote();
  updateCompassHands();
}
renderAll();

// ---------- service worker ----------
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}
