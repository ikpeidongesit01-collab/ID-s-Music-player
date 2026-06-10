const audio = new Audio();
audio.volume = 0.8;

let tracks = [];
let currentIndex = -1;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let likedIds = new Set();
let currentTab = 'all';
let isMuted = false;
let lastVol = 0.8;

function musicIcon() {
  return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;
}

document.getElementById('fileInput').addEventListener('change', function(e) {
  const files = Array.from(e.target.files);
  let loaded = 0;
  files.forEach((file, i) => {
    const url = URL.createObjectURL(file);
    const tmpAudio = new Audio(url);
    const id = Date.now() + i;
    tmpAudio.addEventListener('loadedmetadata', () => {
      tracks.push({ id, name: file.name.replace(/\.[^.]+$/, ''), artist: 'Unknown Artist', duration: tmpAudio.duration, url, file });
      loaded++;
      if (loaded === files.length) {
        renderTracks();
        updateHero();
        updateQueue();
        if (currentIndex === -1) loadTrack(0);
      }
    });
    tmpAudio.addEventListener('error', () => {
      tracks.push({ id, name: file.name.replace(/\.[^.]+$/, ''), artist: 'Unknown Artist', duration: 0, url, file });
      loaded++;
      if (loaded === files.length) { renderTracks(); updateHero(); updateQueue(); if (currentIndex === -1) loadTrack(0); }
    });
  });
  this.value = '';
});

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

function renderTracks() {
  const list = document.getElementById('trackList');
  const query = document.getElementById('searchInput').value.toLowerCase();
  let filtered = tracks.filter(t => {
    if (currentTab === 'liked' && !likedIds.has(t.id)) return false;
    if (query && !t.name.toLowerCase().includes(query) && !t.artist.toLowerCase().includes(query)) return false;
    return true;
  });

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">${musicIcon()}<p style="font-size:14px;color:var(--text);margin-bottom:6px">${currentTab === 'liked' ? 'No liked tracks yet' : 'No tracks found'}</p><p>${currentTab === 'liked' ? 'Like a track to see it here' : 'Try a different search'}</p></div>`;
    return;
  }

  list.innerHTML = filtered.map((t, i) => {
    const globalIdx = tracks.indexOf(t);
    const playing = globalIdx === currentIndex;
    const liked = likedIds.has(t.id);
    return `<div class="track-row ${playing ? 'playing' : ''}" id="tr-${t.id}" ondblclick="loadTrack(${globalIdx});playAudio()">
      <div class="track-num">${playing ? `<span style="color:var(--accent)">▶</span>` : i + 1}</div>
      <div class="track-info">
        <div class="track-thumb">${musicIcon()}</div>
        <div class="track-text">
          <div class="track-title">${t.name}</div>
          <div class="track-artist">${t.artist}</div>
        </div>
      </div>
      <div class="track-album">${formatTime(t.duration)}</div>
      <div class="track-dur"></div>
      <div class="track-like"><button class="like-btn ${liked ? 'liked' : ''}" onclick="toggleLike(event,${t.id})"><svg viewBox="0 0 24 24" fill="${liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button></div>
    </div>`;
  }).join('');
}

function updateHero() {
  const t = tracks.length;
  document.getElementById('statTitle').textContent = t + ' Track' + (t !== 1 ? 's' : '');
  const totalSec = tracks.reduce((s, t) => s + (t.duration || 0), 0);
  document.getElementById('statMeta').textContent = Math.round(totalSec / 60) + ' minutes of music';
  if (currentIndex >= 0 && tracks[currentIndex]) {
    const tr = tracks[currentIndex];
    document.getElementById('heroTitle').textContent = tr.name;
    document.getElementById('heroMeta').textContent = tr.artist + ' · ' + formatTime(tr.duration);
  }
}

function updateQueue() {
  const ql = document.getElementById('queueList');
  if (tracks.length === 0) { ql.innerHTML = ''; return; }
  const upcoming = [];
  for (let i = 0; i < Math.min(tracks.length, 8); i++) {
    upcoming.push(tracks[i]);
  }
  ql.innerHTML = upcoming.map((t, i) => {
    const globalIdx = tracks.indexOf(t);
    const active = globalIdx === currentIndex;
    return `<div class="queue-item ${active ? 'active' : ''}" onclick="loadTrack(${globalIdx});playAudio()">
      <div class="queue-thumb">${musicIcon()}</div>
      <div class="queue-text">
        <div class="queue-title">${t.name}</div>
        <div class="queue-artist">${t.artist}</div>
      </div>
      <div class="queue-dur">${formatTime(t.duration)}</div>
    </div>`;
  }).join('');
}

function loadTrack(idx) {
  if (idx < 0 || idx >= tracks.length) return;
  currentIndex = idx;
  const t = tracks[idx];
  audio.src = t.url;
  audio.load();

  document.getElementById('nowTitle').textContent = t.name;
  document.getElementById('nowArtist').textContent = t.artist;
  document.getElementById('playerTitle').textContent = t.name;
  document.getElementById('playerArtist').textContent = t.artist;
  document.getElementById('totalTime').textContent = formatTime(t.duration);
  document.getElementById('progressFill').style.width = '0%';
  document.getElementById('currentTime').textContent = '0:00';

  updateHero();
  renderTracks();
  updateQueue();
}

function playAudio() {
  audio.play().then(() => {
    isPlaying = true;
    updatePlayUI();
  }).catch(() => {});
}

function togglePlay() {
  if (tracks.length === 0) return;
  if (currentIndex === -1) loadTrack(0);
  if (isPlaying) {
    audio.pause();
    isPlaying = false;
  } else {
    audio.play().then(() => { isPlaying = true; }).catch(() => {});
  }
  updatePlayUI();
}

function updatePlayUI() {
  const icon = document.getElementById('playIcon');
  const disc = document.getElementById('discSpinner');
  const vis = document.getElementById('visBars');
  if (isPlaying) {
    icon.innerHTML = '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>';
    disc.classList.add('playing');
    vis.classList.add('playing');
  } else {
    icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    disc.classList.remove('playing');
    vis.classList.remove('playing');
  }
}

function prevTrack() {
  if (tracks.length === 0) return;
  let idx = currentIndex - 1;
  if (idx < 0) idx = tracks.length - 1;
  loadTrack(idx);
  if (isPlaying) playAudio();
}

function nextTrack() {
  if (tracks.length === 0) return;
  let idx;
  if (isShuffle) idx = Math.floor(Math.random() * tracks.length);
  else { idx = currentIndex + 1; if (idx >= tracks.length) idx = 0; }
  loadTrack(idx);
  if (isPlaying) playAudio();
}

function playAll() {
  if (tracks.length === 0) return;
  loadTrack(0);
  playAudio();
}

audio.addEventListener('ended', () => {
  if (isRepeat) { audio.currentTime = 0; audio.play(); }
  else nextTrack();
});

audio.addEventListener('timeupdate', () => {
  const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressHandle').style.right = (100 - pct) + '%';
  document.getElementById('progressHandle').style.left = 'auto';
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('currentTime').textContent = formatTime(audio.currentTime);
});

function seekTo(e) {
  const bar = document.getElementById('progressBar');
  const pct = e.offsetX / bar.offsetWidth;
  if (audio.duration) audio.currentTime = pct * audio.duration;
}

// ── Sidebar toggle (mobile only) ──────────────────────────
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
}

function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

// ── Replace your existing setTab() ────────────────────────
function setTab(t) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  event.currentTarget.classList.add('active');
  closeSidebar(); // close sidebar after nav selection on mobile
}

// ── Right panel visibility (shows only when playing) ──────
function updateRightPanel() {
  const panel = document.querySelector('.right-panel');
  if (window.innerWidth <= 768) {
    if (isPlaying && currentIndex >= 0) {
      panel.classList.add('now-playing-active');
    } else {
      panel.classList.remove('now-playing-active');
    }
  } else {
    // Desktop: always visible
    panel.classList.remove('now-playing-active');
    panel.style.display = '';
  }
}

// ── Replace your existing updatePlayUI() ──────────────────
function updatePlayUI() {
  const icon = document.getElementById('playIcon');
  const disc = document.getElementById('discSpinner');
  const vis = document.getElementById('visBars');
  if (isPlaying) {
    icon.innerHTML = '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>';
    disc.classList.add('playing');
    vis.classList.add('playing');
  } else {
    icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    disc.classList.remove('playing');
    vis.classList.remove('playing');
  }
  updateRightPanel();
}

// Handle resize (switching between mobile/desktop)
window.addEventListener('resize', updateRightPanel);

function setVolume(v) {
  audio.volume = v / 100;
  lastVol = v / 100;
  isMuted = false;
  updateVolIcon(v);
}

function toggleMute() {
  isMuted = !isMuted;
  audio.muted = isMuted;
  const v = isMuted ? 0 : Math.round(lastVol * 100);
  updateVolIcon(isMuted ? 0 : v);
}

function updateVolIcon(v) {
  const icon = document.getElementById('volIcon');
  if (v == 0) icon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
  else if (v < 50) icon.innerHTML = '<path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>';
  else icon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
}

function toggleShuffle() {
  isShuffle = !isShuffle;
  document.getElementById('shuffleBtn').classList.toggle('active', isShuffle);
}

function toggleRepeat() {
  isRepeat = !isRepeat;
  document.getElementById('repeatBtn').classList.toggle('active', isRepeat);
}

function toggleLike(e, id) {
  e.stopPropagation();
  if (likedIds.has(id)) likedIds.delete(id);
  else likedIds.add(id);
  renderTracks();
}

function filterTracks() { renderTracks(); }

function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tab-all').classList.toggle('active', tab === 'all');
  document.getElementById('tab-liked').classList.toggle('active', tab === 'liked');
  renderTracks();
}

function setTab(t) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  event.currentTarget.classList.add('active');
}

audio.addEventListener('play', () => { isPlaying = true; updatePlayUI(); });
audio.addEventListener('pause', () => { isPlaying = false; updatePlayUI(); });