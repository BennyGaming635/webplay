(() => {
  'use strict';

  /* ── Data ──────────────────────────────────────────────────────────────── */
  const TRACKS = [
    { emoji:'🎵', title:'Blinding Lights',   artist:'The Weeknd',       dur:200, bg:'#ff2d55' },
    { emoji:'🎸', title:'Shape of You',      artist:'Ed Sheeran',       dur:234, bg:'#ff9f0a' },
    { emoji:'🎤', title:'Levitating',        artist:'Dua Lipa',         dur:203, bg:'#bf5af2' },
    { emoji:'🎶', title:'Stay',              artist:'The Kid LAROI',    dur:141, bg:'#30d158' },
    { emoji:'🎧', title:'Watermelon Sugar',  artist:'Harry Styles',     dur:174, bg:'#0a84ff' },
    { emoji:'🎼', title:"Driver's License",   artist:'Olivia Rodrigo',   dur:242, bg:'#5ac8fa' },
    { emoji:'🎹', title:'Good 4 U',          artist:'Olivia Rodrigo',   dur:178, bg:'#ff453a' },
    { emoji:'🎺', title:'Peaches',           artist:'Justin Bieber',    dur:198, bg:'#ffd60a' },
  ];

  const PODCASTS = [
    { emoji:'🧠', title:'Huberman Lab',        episode:'#87 – Using Light to Optimize Sleep', dur:'1h 42m', bg:'#1c1c1e' },
    { emoji:'💡', title:'How I Built This',    episode:'Airbnb: Brian Chesky',                 dur:'54m',    bg:'#2c2c2e' },
    { emoji:'🔬', title:'Lex Fridman Podcast', episode:'#375 – Sam Altman',                    dur:'2h 10m', bg:'#1a1a2e' },
    { emoji:'📰', title:'The Daily',           episode:'Today\'s Top Stories',                  dur:'22m',    bg:'#1e1e1e' },
    { emoji:'🚀', title:'Acquired',            episode:'NVIDIA: Jensen Huang',                 dur:'3h 05m', bg:'#0a0a1a' },
    { emoji:'🎙️', title:'Conan O\'Brien Needs A Friend', episode:'Jeff Goldblum',              dur:'1h 08m', bg:'#1c0a00' },
  ];

  const MESSAGES = [
    { initials:'M',  name:'Mom',             preview:'Don\'t forget dinner tonight!',           time:'9:42 AM',  unread:2, color:'#30d158' },
    { initials:'A',  name:'Alex',            preview:'On my way, 5 min away',                   time:'9:31 AM',  unread:0, color:'#0a84ff' },
    { initials:'S',  name:'Sarah',           preview:'Can you pick me up?',                     time:'8:55 AM',  unread:1, color:'#ff2d55' },
    { initials:'JD', name:'John Doe',        preview:'Meeting at 3pm confirmed',                time:'Yesterday',unread:0, color:'#bf5af2' },
    { initials:'W',  name:'Work Group',      preview:'Jake: The report is ready',               time:'Yesterday',unread:4, color:'#ff9f0a' },
    { initials:'E',  name:'Emma',            preview:'Thanks for the ride!',                    time:'Mon',      unread:0, color:'#5ac8fa' },
  ];

  /* ── State ─────────────────────────────────────────────────────────────── */
  let currentScreen = 'home';
  let trackIdx = 0;
  let isPlaying = false;
  let progress = 0;       // seconds
  let progressTimer = null;
  let callActive = false;
  let callTimer = null;
  let callSeconds = 0;
  let dialInput = '';

  /* ── Helpers ───────────────────────────────────────────────────────────── */
  const $ = id => document.getElementById(id);
  const q = sel => document.querySelector(sel);
  const qa = sel => document.querySelectorAll(sel);

  function fmt(s) {
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${m}:${ss.toString().padStart(2,'0')}`;
  }

  /* ── Clock ─────────────────────────────────────────────────────────────── */
  function updateClock() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes().toString().padStart(2,'0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = ((h % 12) || 12);
    $('clock').textContent = `${h12}:${m} ${ampm}`;
    $('home-greeting').textContent = greetingText(h);
    $('home-date').textContent = now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
  }

  function greetingText(h) {
    if (h < 12) return 'Good Morning 🌅';
    if (h < 17) return 'Good Afternoon ☀️';
    return 'Good Evening 🌙';
  }

  /* ── Screen navigation ─────────────────────────────────────────────────── */
  function showScreen(name) {
    currentScreen = name;
    qa('.screen').forEach(s => s.classList.remove('active'));
    qa('.sidebar-btn').forEach(b => b.classList.remove('active'));
    const sc = $(`screen-${name}`);
    if (sc) sc.classList.add('active');
    const btn = document.querySelector(`.sidebar-btn[data-screen="${name}"]`);
    if (btn) btn.classList.add('active');
  }

  /* ── Music ─────────────────────────────────────────────────────────────── */
  function loadTrack(idx) {
    trackIdx = (idx + TRACKS.length) % TRACKS.length;
    const t = TRACKS[trackIdx];
    progress = 0;
    renderMusicUI();
    updateNowPlayingBar();
    buildQueue();
    if (isPlaying) restartProgressTimer();
  }

  function renderMusicUI() {
    const t = TRACKS[trackIdx];
    $('music-artwork').textContent = t.emoji;
    $('music-artwork').style.background = `linear-gradient(145deg,${t.bg}cc,${t.bg}55)`;
    $('track-name').textContent = t.title;
    $('track-artist').textContent = t.artist;
    $('track-dur').textContent = fmt(t.dur);
    updateProgressBar();
  }

  function updateProgressBar() {
    const t = TRACKS[trackIdx];
    const pct = Math.min((progress / t.dur) * 100, 100);
    $('progress-fill').style.width = pct + '%';
    $('track-pos').textContent = fmt(progress);
  }

  function togglePlay() {
    isPlaying = !isPlaying;
    updatePlayButtons();
    if (isPlaying) {
      restartProgressTimer();
      $('music-artwork').classList.add('playing');
    } else {
      clearInterval(progressTimer);
      $('music-artwork').classList.remove('playing');
    }
  }

  function updatePlayButtons() {
    const icon = isPlaying ? '⏸' : '▶';
    $('play-btn').textContent = icon;
    $('np-play-btn').textContent = icon;
  }

  function restartProgressTimer() {
    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
      progress++;
      const t = TRACKS[trackIdx];
      if (progress >= t.dur) {
        progress = 0;
        loadTrack(trackIdx + 1);
        return;
      }
      updateProgressBar();
    }, 1000);
  }

  function updateNowPlayingBar() {
    const t = TRACKS[trackIdx];
    const bar = $('now-playing-bar');
    $('np-thumb').textContent = t.emoji;
    $('np-thumb').style.background = `linear-gradient(145deg,${t.bg}cc,${t.bg}44)`;
    $('np-track').textContent = t.title;
    $('np-artist').textContent = t.artist;
    bar.classList.add('visible');
  }

  function buildQueue() {
    const list = $('queue-list');
    list.innerHTML = '';
    TRACKS.forEach((t, i) => {
      const div = document.createElement('div');
      div.className = 'queue-item' + (i === trackIdx ? ' playing' : '');
      div.innerHTML = `
        <div class="queue-thumb" style="background:linear-gradient(145deg,${t.bg}cc,${t.bg}44)">${t.emoji}</div>
        <div class="queue-meta">
          <div class="q-name">${t.title}</div>
          <div class="q-artist">${t.artist}</div>
        </div>`;
      div.addEventListener('click', () => { loadTrack(i); if (!isPlaying) togglePlay(); });
      list.appendChild(div);
    });
  }

  /* ── Phone / Dialer ────────────────────────────────────────────────────── */
  function updateDialDisplay() {
    const el = $('dial-display');
    const formatted = formatPhone(dialInput);
    el.textContent = formatted || '';
    $('dial-cursor').style.display = dialInput ? 'none' : 'inline';
  }

  function formatPhone(num) {
    if (!num) return '';
    const d = num.replace(/\D/g,'');
    if (d.length <= 3)  return d;
    if (d.length <= 6)  return `(${d.slice(0,3)}) ${d.slice(3)}`;
    if (d.length <= 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
    return `+${d.slice(0,d.length-10)} (${d.slice(-10,-7)}) ${d.slice(-7,-4)}-${d.slice(-4)}`;
  }

  function dialPress(digit) {
    if (dialInput.length >= 15) return;
    dialInput += digit;
    updateDialDisplay();
  }

  function dialClear() {
    dialInput = dialInput.slice(0, -1);
    updateDialDisplay();
  }

  function startCall() {
    const name = dialInput ? formatPhone(dialInput) : 'Unknown Number';
    $('call-name').textContent = name || 'Unknown Number';
    $('call-status-txt').textContent = 'Calling…';
    $('call-overlay').classList.add('active');
    callActive = true;
    callSeconds = 0;
    // Simulate connection after 2s
    setTimeout(() => {
      if (!callActive) return;
      $('call-status-txt').textContent = '0:00';
      callTimer = setInterval(() => {
        callSeconds++;
        $('call-status-txt').textContent = fmt(callSeconds);
      }, 1000);
    }, 2000);
  }

  function endCall() {
    callActive = false;
    clearInterval(callTimer);
    $('call-overlay').classList.remove('active');
    dialInput = '';
    updateDialDisplay();
  }

  /* ── Podcasts ──────────────────────────────────────────────────────────── */
  function buildPodcasts() {
    const list = $('pod-list');
    list.innerHTML = '';
    PODCASTS.forEach((p, i) => {
      const div = document.createElement('div');
      div.className = 'pod-row';
      div.innerHTML = `
        <div class="pod-art" style="background:${p.bg}">${p.emoji}</div>
        <div class="pod-meta">
          <div class="pod-name">${p.title}</div>
          <div class="pod-episode">${p.episode}</div>
          <div class="pod-duration">🕐 ${p.dur}</div>
        </div>`;
      div.addEventListener('click', () => {
        qa('.pod-row').forEach(r => r.classList.remove('playing'));
        div.classList.add('playing');
      });
      list.appendChild(div);
    });
  }

  /* ── Messages ──────────────────────────────────────────────────────────── */
  function buildMessages() {
    const list = $('msgs-list');
    list.innerHTML = '';
    MESSAGES.forEach(m => {
      const div = document.createElement('div');
      div.className = 'msg-row';
      div.innerHTML = `
        <div class="msg-avatar" style="background:${m.color}">${m.initials}</div>
        <div class="msg-body">
          <div class="msg-name">${m.name}</div>
          <div class="msg-preview">${m.preview}</div>
        </div>
        <div class="msg-meta">
          <div class="msg-time">${m.time}</div>
          ${m.unread ? `<div class="msg-unread">${m.unread}</div>` : ''}
        </div>`;
      list.appendChild(div);
    });
  }

  /* ── Settings toggles ──────────────────────────────────────────────────── */
  function initToggles() {
    qa('.toggle').forEach(t => {
      t.addEventListener('click', () => t.classList.toggle('on'));
    });
  }

  /* ── Init ──────────────────────────────────────────────────────────────── */
  function init() {
    updateClock();
    setInterval(updateClock, 10000);

    // Sidebar nav
    qa('.sidebar-btn').forEach(btn => {
      btn.addEventListener('click', () => showScreen(btn.dataset.screen));
    });

    // App grid icons
    qa('.app-icon[data-screen]').forEach(icon => {
      icon.addEventListener('click', () => showScreen(icon.dataset.screen));
    });

    // Music controls
    $('play-btn').addEventListener('click', togglePlay);
    $('prev-btn').addEventListener('click', () => loadTrack(trackIdx - 1));
    $('next-btn').addEventListener('click', () => loadTrack(trackIdx + 1));

    // Tap progress bar to seek
    $('progress-bar-wrap').addEventListener('click', e => {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      progress = Math.floor(ratio * TRACKS[trackIdx].dur);
      updateProgressBar();
    });

    // NP bar controls
    $('np-play-btn').addEventListener('click', togglePlay);
    $('np-prev-btn').addEventListener('click', () => loadTrack(trackIdx - 1));
    $('np-next-btn').addEventListener('click', () => loadTrack(trackIdx + 1));
    $('np-goto-music').addEventListener('click', () => showScreen('music'));

    // Dialer
    qa('.dial-key').forEach(key => {
      key.addEventListener('click', () => dialPress(key.dataset.digit));
    });
    $('dial-call-btn').addEventListener('click', startCall);
    $('dial-clear-btn').addEventListener('click', dialClear);

    // Call overlay
    $('call-end-btn').addEventListener('click', endCall);

    // Build dynamic lists
    buildQueue();
    buildMessages();
    buildPodcasts();
    renderMusicUI();
    initToggles();

    // Show home
    showScreen('home');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
