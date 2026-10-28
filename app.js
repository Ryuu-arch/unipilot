// Application State
let assignments = JSON.parse(localStorage.getItem('unipilot_assignments')) || [];
let classes = JSON.parse(localStorage.getItem('unipilot_classes')) || [];
let focusSeconds = parseInt(localStorage.getItem('unipilot_focus_seconds')) || 0;
let activeDay = 'Monday';
let activeFilter = 'all';

// Pomodoro State
let timerInterval = null;
let timerMode = 'work'; // work, short, long
let timerSeconds = 25 * 60;
let isTimerRunning = false;

// DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
  initDate();
  initTheme();
  renderDashboard();
  renderAssignments();
  renderSchedule();

  // Navigation Tabs
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId + 'Tab').classList.add('active');
      document.getElementById('pageTitle').innerText = btn.querySelector('span').innerText;
      closeSidebar();
    });
  });

  // Mobile Sidebar Toggle
  document.getElementById('menuToggle').addEventListener('click', openSidebar);
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

  // Modals
  setupModal('openAddAssignmentModal', 'assignmentModal');
  setupModal('openAddClassModal', 'classModal');
  setupModal('themeModalBtn', 'themeModal');

  // Forms
  document.getElementById('assignmentForm').addEventListener('submit', addAssignment);
  document.getElementById('classForm').addEventListener('submit', addClass);

  // Filters & Schedule Tabs
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activeFilter = e.target.getAttribute('data-filter');
      renderAssignments();
    });
  });

  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activeDay = e.target.getAttribute('data-day');
      renderSchedule();
    });
  });

  // Pomodoro Controls
  document.getElementById('startTimerBtn').addEventListener('click', startTimer);
  document.getElementById('pauseTimerBtn').addEventListener('click', pauseTimer);
  document.getElementById('resetTimerBtn').addEventListener('click', resetTimer);

  document.querySelectorAll('.pomo-mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.pomo-mode-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      timerMode = e.target.getAttribute('data-mode');
      resetTimer();
    });
  });

  // Dark Mode & Colors
  document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
  document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', (e) => {
      setPrimaryColor(e.target.getAttribute('data-color'));
    });
  });
  document.getElementById('customColorPicker').addEventListener('input', (e) => {
    setPrimaryColor(e.target.value);
  });

  // Backup & Restore
  document.getElementById('exportDataBtn').addEventListener('click', exportData);
  document.getElementById('importDataBtn').addEventListener('click', () => document.getElementById('importFileInput').click());
  document.getElementById('importFileInput').addEventListener('change', importData);
});

// Navigation Helpers
function openSidebar() {
  document.getElementById('sidebar').classList.add('active');
  document.getElementById('sidebarOverlay').classList.add('active');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('active');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

function initDate() {
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  document.getElementById('currentDate').innerText = new Date().toLocaleDateString('en-US', options);
}

// Assignments Logic
function addAssignment(e) {
  e.preventDefault();
  const newItem = {
    id: Date.now(),
    title: document.getElementById('assignTitle').value,
    subject: document.getElementById('assignSubject').value,
    dueDate: document.getElementById('assignDueDate').value,
    completed: false
  };
  assignments.push(newItem);
  saveData();
  renderAssignments();
  renderDashboard();
  closeModals();
  e.target.reset();
}

function toggleAssignment(id) {
  assignments = assignments.map(a => a.id === id ? { ...a, completed: !a.completed } : a);
  saveData();
  renderAssignments();
  renderDashboard();
}

function deleteAssignment(id) {
  assignments = assignments.filter(a => a.id !== id);
  saveData();
  renderAssignments();
  renderDashboard();
}

function renderAssignments() {
  const list = document.getElementById('assignmentsList');
  let items = assignments;
  if (activeFilter === 'pending') items = items.filter(a => !a.completed);
  if (activeFilter === 'completed') items = items.filter(a => a.completed);

  if (items.length === 0) {
    list.innerHTML = `<p style="color:var(--text-secondary);">No assignments found.</p>`;
    return;
  }

  list.innerHTML = items.map(a => `
    <div class="item-card ${a.completed ? 'completed' : ''}">
      <span class="item-badge">${escapeHtml(a.subject)}</span>
      <h4>${escapeHtml(a.title)}</h4>
      <p style="font-size:0.85rem; color:var(--text-secondary);"><i class="fa-regular fa-calendar"></i> Due: ${a.dueDate}</p>
      <div class="card-actions">
        <button class="btn btn-secondary" onclick="toggleAssignment(${a.id})">${a.completed ? 'Undo' : 'Complete'}</button>
        <button class="btn btn-outline" onclick="deleteAssignment(${a.id})"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

// Schedule Logic
function addClass(e) {
  e.preventDefault();
  const newClass = {
    id: Date.now(),
    name: document.getElementById('className').value,
    room: document.getElementById('classRoom').value,
    day: document.getElementById('classDay').value,
    startTime: document.getElementById('classStartTime').value,
    endTime: document.getElementById('classEndTime').value
  };
  classes.push(newClass);
  saveData();
  renderSchedule();
  renderDashboard();
  closeModals();
  e.target.reset();
}

function deleteClass(id) {
  classes = classes.filter(c => c.id !== id);
  saveData();
  renderSchedule();
  renderDashboard();
}

function renderSchedule() {
  const list = document.getElementById('scheduleList');
  const filtered = classes.filter(c => c.day === activeDay);

  if (filtered.length === 0) {
    list.innerHTML = `<p style="color:var(--text-secondary);">No classes scheduled for ${activeDay}.</p>`;
    return;
  }

  list.innerHTML = filtered.map(c => `
    <div class="item-card">
      <span class="item-badge"><i class="fa-regular fa-clock"></i> ${c.startTime} - ${c.endTime}</span>
      <h4>${escapeHtml(c.name)}</h4>
      <p style="font-size:0.85rem; color:var(--text-secondary);"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(c.room || 'No location set')}</p>
      <div class="card-actions">
        <button class="btn btn-outline" onclick="deleteClass(${c.id})"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

// Dashboard Summary
function renderDashboard() {
  const pending = assignments.filter(a => !a.completed).length;
  const completed = assignments.filter(a => a.completed).length;
  
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'Long' });
  const todayClasses = classes.filter(c => c.day === todayName).length;

  document.getElementById('statPending').innerText = pending;
  document.getElementById('statCompleted').innerText = completed;
  document.getElementById('statTodayClasses').innerText = todayClasses;
  document.getElementById('statFocusMinutes').innerText = Math.round(focusSeconds / 60) + 'm';

  // Urgent Assignments List
  const urgentList = document.getElementById('urgentAssignmentsList');
  const urgentItems = assignments.filter(a => !a.completed).slice(0, 3);
  urgentList.innerHTML = urgentItems.length ? urgentItems.map(a => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
      <div>
        <strong>${escapeHtml(a.title)}</strong>
        <p style="font-size:0.8rem; color:var(--text-secondary);">${escapeHtml(a.subject)} • Due ${a.dueDate}</p>
      </div>
    </div>
  `).join('') : '<p style="font-size:0.85rem; color:var(--text-secondary);">No pending tasks!</p>';

  // Today Schedule List
  const todayList = document.getElementById('todayScheduleList');
  const todayItems = classes.filter(c => c.day === todayName);
  todayList.innerHTML = todayItems.length ? todayItems.map(c => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
      <div>
        <strong>${escapeHtml(c.name)}</strong>
        <p style="font-size:0.8rem; color:var(--text-secondary);">${c.startTime} - ${c.endTime}</p>
      </div>
    </div>
  `).join('') : '<p style="font-size:0.85rem; color:var(--text-secondary);">No classes today.</p>';
}

// Pomodoro Functions
function startTimer() {
  if (isTimerRunning) return;
  isTimerRunning = true;
  document.getElementById('startTimerBtn').disabled = true;
  document.getElementById('pauseTimerBtn').disabled = false;

  timerInterval = setInterval(() => {
    if (timerSeconds > 0) {
      timerSeconds--;
      if (timerMode === 'work') {
        focusSeconds++;
        localStorage.setItem('unipilot_focus_seconds', focusSeconds);
        renderDashboard();
      }
      updateTimerDisplay();
    } else {
      clearInterval(timerInterval);
      isTimerRunning = false;
      alert("Pomodoro cycle finished!");
      resetTimer();
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  isTimerRunning = false;
  document.getElementById('startTimerBtn').disabled = false;
  document.getElementById('pauseTimerBtn').disabled = true;
}

function resetTimer() {
  pauseTimer();
  if (timerMode === 'work') timerSeconds = 25 * 60;
  if (timerMode === 'short') timerSeconds = 5 * 60;
  if (timerMode === 'long') timerSeconds = 15 * 60;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
  const s = (timerSeconds % 60).toString().padStart(2, '0');
  document.getElementById('timerTime').innerText = `${m}:${s}`;
}

// Modals Setup
function setupModal(openBtnId, modalId) {
  document.getElementById(openBtnId).addEventListener('click', () => {
    document.getElementById(modalId).classList.add('active');
  });
  document.querySelectorAll(`#${modalId} .close-modal`).forEach(btn => {
    btn.addEventListener('click', closeModals);
  });
}

function closeModals() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
}

// Storage & Theme Handling
function saveData() {
  localStorage.setItem('unipilot_assignments', JSON.stringify(assignments));
  localStorage.setItem('unipilot_classes', JSON.stringify(classes));
}

function initTheme() {
  const savedDarkMode = localStorage.getItem('unipilot_dark_mode') === 'true';
  const savedColor = localStorage.getItem('unipilot_primary_color');

  if (savedDarkMode) document.body.setAttribute('data-theme', 'dark');
  if (savedColor) setPrimaryColor(savedColor);
}

function toggleDarkMode() {
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.body.removeAttribute('data-theme');
    localStorage.setItem('unipilot_dark_mode', 'false');
  } else {
    document.body.setAttribute('data-theme', 'dark');
    localStorage.setItem('unipilot_dark_mode', 'true');
  }
}

function setPrimaryColor(color) {
  document.documentElement.style.setProperty('--primary-color', color);
  document.documentElement.style.setProperty('--primary-hover', color);
  localStorage.setItem('unipilot_primary_color', color);
}

// Data Backup / Restore
function exportData() {
  const backup = {
    assignments,
    classes,
    focusSeconds,
    themeColor: localStorage.getItem('unipilot_primary_color'),
    darkMode: localStorage.getItem('unipilot_dark_mode')
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'unipilot_backup.json';
  a.click();
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = JSON.parse(evt.target.result);
      if (data.assignments) localStorage.setItem('unipilot_assignments', JSON.stringify(data.assignments));
      if (data.classes) localStorage.setItem('unipilot_classes', JSON.stringify(data.classes));
      if (data.focusSeconds) localStorage.setItem('unipilot_focus_seconds', data.focusSeconds);
      if (data.themeColor) localStorage.setItem('unipilot_primary_color', data.themeColor);
      if (data.darkMode) localStorage.setItem('unipilot_dark_mode', data.darkMode);
      location.reload();
    } catch (err) {
      alert("Invalid backup file.");
    }
  };
  reader.readAsText(file);
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
