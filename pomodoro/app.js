const STORAGE_KEY = 'pomodoro.timer.state.v1';
const LONG_BREAK_INTERVAL = 4;

const DURATIONS = {
  focus: 25 * 60 * 1000,
  short: 5 * 60 * 1000,
  long: 15 * 60 * 1000,
};

const MODE_LABELS = {
  focus: 'フォーカス',
  short: 'ショートブレイク',
  long: 'ロングブレイク',
};

const MODE_MESSAGES = {
  focus: '1 セッション 25 分で集中しましょう。',
  short: '5 分だけリラックスしてリフレッシュ。',
  long: '15 分のロングブレイクでしっかり休憩。',
};

const state = loadState();
let tickHandle = null;
let messageTimer = null;
let messageOverride = null;
let audioContext;

function canUseNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window && window.isSecureContext;
}

const elements = {
  timeDisplay: document.querySelector('#timeDisplay'),
  modeLabel: document.querySelector('#modeLabel'),
  startPauseButton: document.querySelector('#startPauseButton'),
  skipButton: document.querySelector('#skipButton'),
  resetButton: document.querySelector('#resetButton'),
  modeButtons: Array.from(document.querySelectorAll('.mode-button')),
  timerDial: document.querySelector('#timerDial'),
  completedCount: document.querySelector('#completedCount'),
  queueLabel: document.querySelector('#queueLabel'),
  sessionStatus: document.querySelector('#sessionStatus'),
  timerMessage: document.querySelector('#timerMessage'),
};

initialize();

function initialize() {
  reconcileState();
  attachEventListeners();
  updateUI();
  if (state.isRunning) {
    startTicking();
  }
}

function startSession(options = {}) {
  const settings = { announce: true, ...options };
  const now = Date.now();
  state.isRunning = true;
  state.endTime = now + state.remaining;
  startTicking();
  persistState();
  if (settings.announce) {
    showMessage(`${MODE_LABELS[state.mode]}を開始しました。`, 3400);
  }
  updateUI();
}

function attachEventListeners() {
  elements.startPauseButton.addEventListener('click', handleStartPause);
  elements.skipButton.addEventListener('click', () => advanceSession({ cause: 'skip', silent: true }));
  elements.resetButton.addEventListener('click', handleReset);
  elements.modeButtons.forEach((button) => {
    button.addEventListener('click', () => switchMode(button.dataset.mode));
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      updateUI();
    }
  });

  window.addEventListener('beforeunload', persistState);

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) {
      return;
    }
    try {
      const incoming = JSON.parse(event.newValue);
      Object.assign(state, sanitizeState(incoming));
      reconcileState();
      updateUI();
      if (state.isRunning) {
        startTicking();
      } else {
        stopTicking();
      }
    } catch (error) {
      console.warn('Failed to sync state from storage', error);
    }
  });
}

function handleStartPause() {
  if (state.isRunning) {
    pauseTimer();
    return;
  }

  const remaining = Math.max(0, getTimeLeft());
  if (remaining <= 0) {
    state.remaining = DURATIONS[state.mode];
  }

  ensureAudioContext();
  startSession();
}

function pauseTimer() {
  const msLeft = Math.max(0, getTimeLeft());
  state.isRunning = false;
  state.remaining = msLeft;
  state.endTime = null;
  stopTicking();
  persistState();
  showMessage('一時停止しました。', 2400);
  updateUI();
}

function handleReset() {
  Object.assign(state, createDefaultState());
  stopTicking();
  persistState();
  showMessage('タイマーをリセットしました。', 2600);
  updateUI();
}

function switchMode(mode) {
  if (!DURATIONS[mode] || state.mode === mode) {
    return;
  }

  state.mode = mode;
  state.isRunning = false;
  state.remaining = DURATIONS[mode];
  state.endTime = null;
  stopTicking();
  persistState();
  showMessage(`${MODE_LABELS[mode]}モードに切り替えました。`, 3200);
  updateUI();
}

function advanceSession({ cause, silent }) {
  const previousMode = state.mode;
  state.isRunning = false;
  state.endTime = null;

  if (previousMode === 'focus' && cause !== 'skip') {
    state.completedFocus = (state.completedFocus || 0) + 1;
  }

  const nextMode = determineNextMode(previousMode);
  state.mode = nextMode;
  state.remaining = DURATIONS[nextMode];

  stopTicking();
  persistState();

  if (!silent) {
    playAlarm();
    notifyCompletion(previousMode, nextMode);
  }

  if (cause === 'skip') {
    showMessage(`${MODE_LABELS[previousMode]}をスキップしました。`, 3200);
  } else if (previousMode === 'focus') {
    showMessage(`${MODE_LABELS[previousMode]}完了。${MODE_LABELS[nextMode]}でリフレッシュしましょう。`, 5200);
  } else {
    showMessage(`${MODE_LABELS[previousMode]}が終わりました。${MODE_LABELS[nextMode]}を始めましょう。`, 5200);
  }

  updateUI();

  if (cause !== 'skip') {
    startSession({ announce: false });
  }
}

function determineNextMode(currentMode) {
  if (currentMode === 'focus') {
    const completed = state.completedFocus || 0;
    if (completed > 0 && completed % LONG_BREAK_INTERVAL === 0) {
      return 'long';
    }
    return 'short';
  }
  return 'focus';
}

function startTicking() {
  if (tickHandle !== null) {
    return;
  }
  tickHandle = setInterval(() => {
    if (!state.isRunning) {
      return;
    }
    const left = getTimeLeft();
    if (left <= 0) {
      advanceSession({ cause: 'elapsed', silent: false });
      return;
    }
    state.remaining = left;
    updateUI();
  }, 1000);
}

function stopTicking() {
  if (tickHandle === null) {
    return;
  }
  clearInterval(tickHandle);
  tickHandle = null;
}

function getTimeLeft() {
  if (state.isRunning && state.endTime) {
    return state.endTime - Date.now();
  }
  return state.remaining ?? DURATIONS[state.mode];
}

function updateUI() {
  updateModeButtons();
  updateTimeDisplay();
  updateMeta();
  updateStatus();
  updateMessage();
}

function updateModeButtons() {
  elements.modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === state.mode;
    button.classList.toggle('is-active', isActive);
  });
}

function updateTimeDisplay() {
  const total = DURATIONS[state.mode];
  const leftMs = Math.max(0, getTimeLeft());
  const totalSeconds = Math.ceil(leftMs / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  const clampedMs = Math.min(leftMs, total);
  const progressAngle = Math.min(359.999, Math.max(0, 360 - (clampedMs / total) * 360));

  elements.timeDisplay.textContent = `${minutes}:${seconds}`;
  elements.modeLabel.textContent = MODE_LABELS[state.mode];
  elements.startPauseButton.textContent = state.isRunning ? 'ポーズ' : 'スタート';
  elements.timerDial.style.setProperty('--progress-angle', `${progressAngle}deg`);
}

function updateMeta() {
  elements.completedCount.textContent = state.completedFocus || 0;
  const upcoming = previewNextMode();
  elements.queueLabel.textContent = MODE_LABELS[upcoming];
}

function previewNextMode() {
  if (state.mode === 'focus') {
    const projected = (state.completedFocus || 0) + 1;
    if (projected % LONG_BREAK_INTERVAL === 0) {
      return 'long';
    }
    return 'short';
  }
  return 'focus';
}

function updateStatus() {
  const modeLabel = MODE_LABELS[state.mode];
  const statusText = state.isRunning ? 'カウント中' : '待機中';
  elements.sessionStatus.textContent = `${modeLabel} - ${statusText}`;
}

function updateMessage() {
  if (messageOverride) {
    elements.timerMessage.textContent = messageOverride;
    return;
  }
  elements.timerMessage.textContent = MODE_MESSAGES[state.mode];
}

function showMessage(text, duration) {
  messageOverride = text;
  elements.timerMessage.textContent = text;
  if (messageTimer) {
    clearTimeout(messageTimer);
  }
  if (duration) {
    messageTimer = setTimeout(() => {
      messageOverride = null;
      updateMessage();
    }, duration);
  }
}

function notifyCompletion(previousMode, nextMode) {
  if (!canUseNotifications()) {
    return;
  }
  if (Notification.permission !== 'granted') {
    return;
  }

  const title = `${MODE_LABELS[previousMode]}の時間です`;
  const body = previousMode === 'focus'
    ? `${MODE_LABELS[previousMode]}が終了しました。${MODE_LABELS[nextMode]}で休憩しましょう。`
    : `${MODE_LABELS[previousMode]}が終わりました。${MODE_LABELS[nextMode]}に切り替えましょう。`;

  try {
    new Notification(title, {
      body,
      tag: 'pomodoro-timer',
      silent: true,
    });
  } catch (error) {
    console.warn('Notification failed', error);
  }
}

function requestNotificationPermission() {
  if (!canUseNotifications()) {
    return;
  }
  if (Notification.permission !== 'default') {
    return;
  }
  try {
    const result = Notification.requestPermission();
    if (result && typeof result.then === 'function') {
      result.catch(() => {});
    }
  } catch (error) {
    console.warn('Notification permission request failed', error);
  }
}

function playAlarm() {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.85, now);
  masterGain.connect(ctx.destination);

  const pattern = [
    { time: now, frequency: 880 },
    { time: now + 0.45, frequency: 660 },
    { time: now + 0.9, frequency: 990 },
  ];

  pattern.forEach(({ time, frequency }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(0.4, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.42);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + 0.48);
  });
}

function ensureAudioContext() {
  if (typeof window === 'undefined') {
    return null;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return null;
  }
  try {
    if (!audioContext) {
      audioContext = new AudioCtx();
    }
  } catch (error) {
    console.warn('AudioContext init failed', error);
    return null;
  }
  if (audioContext.state === 'suspended' && typeof audioContext.resume === 'function') {
    try {
      const resumeResult = audioContext.resume();
      if (resumeResult && typeof resumeResult.catch === 'function') {
        resumeResult.catch(() => {});
      }
    } catch (resumeError) {
      console.warn('AudioContext resume failed', resumeError);
    }
  }
  return audioContext;
}

function reconcileState() {
  if (!DURATIONS[state.mode]) {
    state.mode = 'focus';
  }
  if (typeof state.remaining !== 'number' || Number.isNaN(state.remaining) || state.remaining <= 0) {
    state.remaining = DURATIONS[state.mode];
  }
  if (state.isRunning && state.endTime) {
    const leftover = state.endTime - Date.now();
    if (leftover <= 0) {
      state.isRunning = false;
      state.remaining = 0;
      state.endTime = null;
      advanceSession({ cause: 'elapsed', silent: true });
    } else {
      state.remaining = leftover;
    }
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultState();
    }
    const parsed = JSON.parse(raw);
    return sanitizeState(parsed);
  } catch (error) {
    console.warn('Failed to load state', error);
    return createDefaultState();
  }
}

function sanitizeState(raw) {
  const base = createDefaultState();
  if (!raw || typeof raw !== 'object') {
    return base;
  }
  return {
    ...base,
    ...raw,
    mode: DURATIONS[raw.mode] ? raw.mode : base.mode,
    remaining: typeof raw.remaining === 'number' && !Number.isNaN(raw.remaining)
      ? Math.max(0, raw.remaining)
      : base.remaining,
    endTime: typeof raw.endTime === 'number' && !Number.isNaN(raw.endTime)
      ? raw.endTime
      : base.endTime,
    completedFocus: typeof raw.completedFocus === 'number' && raw.completedFocus >= 0
      ? raw.completedFocus
      : base.completedFocus,
    isRunning: Boolean(raw.isRunning),
  };
}

function createDefaultState() {
  return {
    mode: 'focus',
    isRunning: false,
    remaining: DURATIONS.focus,
    endTime: null,
    completedFocus: 0,
  };
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      mode: state.mode,
      isRunning: state.isRunning,
      remaining: state.remaining,
      endTime: state.endTime,
      completedFocus: state.completedFocus,
    }));
  } catch (error) {
    console.warn('Failed to persist state', error);
  }
}
