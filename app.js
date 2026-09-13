// ===================== STAY ROOM · app.js =====================
const STORE_KEY = 'stayroom_v1';

const defaultState = {
  name: '',
  theme: 'dark',
  stayMode: true,
  subjects: [],       // {id, name, progress}
  tasks: [],           // {id, title, subject, done}
  sessions: [],         // {date, minutes, subject}
  exam: null            // {label, date}
};

function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return structuredClone(defaultState);
    return {...structuredClone(defaultState), ...JSON.parse(raw)};
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
const views = ['home','focus','subjects','settings'];
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

// ---------- tasks ----------
function renderTasks(){
  const list = document.getElementById('taskList');
  const today = state.tasks;
  if(today.length === 0){
    list.innerHTML = `<div class="empty-note">Nothing on the list yet. Add your first task below. 📋</div>`;
  } else {
    list.innerHTML = today.map(t => `
      <div class="task-row ${t.done?'done':''}" data-id="${t.id}">
        <button class="check" data-action="toggle">${t.done?'✓':''}</button>
        <div style="flex:1">
          <div class="task-title">${escapeHtml(t.title)}</div>
          ${t.subject ? `<div class="task-subject">${escapeHtml(t.subject)}</div>` : ''}
        </div>
      </div>
    `).join('');
  }
  const done = state.tasks.filter(t=>t.done).length;
  document.getElementById('statTasks').textContent = `${done}/${state.tasks.length}`;
}
document.getElementById('taskList').addEventListener('click', (e) => {
  const row = e.target.closest('.task-row');
  if(!row) return;
  const t = state.tasks.find(t => t.id === row.dataset.id);
  t.done = !t.done;
  saveState(); renderTasks(); renderStats();
});
document.getElementById('quickTaskAdd').addEventListener('click', addQuickTask);
document.getElementById('quickTaskInput').addEventListener('keydown', e => { if(e.key === 'Enter') addQuickTask(); });
function addQuickTask(){
  const input = document.getElementById('quickTaskInput');
  const val = input.value.trim();
  if(!val) return;
  state.tasks.push({id: uid(), title: val, subject: '', done:false});
  input.value = '';
  saveState(); renderTasks(); renderStats();
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

// ---------- exam countdown ----------
function renderExamTag(){
  const tag = document.getElementById('nextExamTag');
  if(!state.exam){ tag.textContent = 'No exam added yet'; return; }
  const days = Math.ceil((new Date(state.exam.date) - new Date()) / 86400000);
  tag.textContent = days >= 0 ? `${state.exam.label} · ${days}d left` : state.exam.label;
}

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
  return d.innerHTML;
}

function renderAll(){
  applySettingsUI();
  renderGreeting();
  renderTasks();
  renderSubjects();
  renderStats();
  renderExamTag();
}
renderAll();

// ---------- service worker ----------
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}
