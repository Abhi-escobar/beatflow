/**
 * search.js — YouTube search + track rendering
 * Depends on: Storage, Player
 */

const API_KEY = 'AIzaSyDGgbD0NMJwtN8DGBoPIGoo5nele_mRSmY';

const Search = (() => {
  let results = [];
  let currentView = 'search'; // 'search' | 'liked' | 'queue'

  /* ── DOM helpers ── */
  const el = (id) => document.getElementById(id);
  const setStatus = (html) => { el('status').innerHTML = html; };

  function getResults() { return results; }
  function setResults(r) { results = r; }
  function getCurrentView() { return currentView; }

  /* ── Tab switching ── */
  function switchTab(tab) {
    currentView = tab;

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');

    const searchWrap = document.querySelector('.search-wrap');
    const statusEl   = el('status');

    if (tab === 'search') {
      searchWrap.style.display = '';
      statusEl.style.display   = '';
      renderTracks(results, Player.getCurrentIdx());
    } else if (tab === 'liked') {
      searchWrap.style.display = 'none';
      statusEl.style.display   = 'none';
      renderLiked();
    } else if (tab === 'queue') {
      searchWrap.style.display = 'none';
      statusEl.style.display   = 'none';
      renderQueue();
    }
  }

  /* ── Search ── */
  async function doSearch() {
    const q = el('searchInput').value.trim();
    if (!q) return;

    switchTab('search');
    setStatus('<span class="loading-dots"><span></span><span></span><span></span></span> Searching...');
    el('trackList').innerHTML = '';

    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q + ' song')}&type=video&maxResults=20&key=${API_KEY}`;
      const res  = await fetch(url);
      const data = await res.json();

      if (data.error) { setStatus('Error: ' + data.error.message); return; }

      results = (data.items || []).filter(i => i.id && i.id.videoId);
      renderTracks(results, Player.getCurrentIdx());
      setStatus(`${results.length} results for "${q}"`);
    } catch (e) {
      setStatus('Network error — try again');
    }
  }

  /* ── Render helpers ── */
  function heartSVG(filled) {
    return filled
      ? `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
      : `<svg viewBox="0 0 24 24"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/></svg>`;
  }

  function trackHTML(item, idx, isActive, isLiked, fromLiked = false) {
    const thumb = item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url;
    const vid   = item.id.videoId;
    const clickFn = fromLiked ? `Search.selectFromLiked('${vid}')` : `Search.selectTrack(${idx})`;

    return `
      <div class="track ${isActive ? 'active' : ''}" data-vid="${vid}" style="animation-delay:${idx * 0.02}s">
        <div class="track-num" onclick="${clickFn}">${isActive ? '▶' : idx + 1}</div>
        <img class="track-thumb" src="${item.snippet.thumbnails.default.url}" alt="" loading="lazy" onclick="${clickFn}"/>
        <div class="track-info" onclick="${clickFn}">
          <div class="track-title">${escapeHTML(item.snippet.title)}</div>
          <div class="track-channel">${escapeHTML(item.snippet.channelTitle)}</div>
        </div>
        <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="Search.toggleLikeTrack('${vid}', ${idx}, ${fromLiked})" title="${isLiked ? 'Unlike' : 'Like'}">
          ${heartSVG(isLiked)}
        </button>
      </div>`;
  }

  function renderTracks(list, activeIdx) {
    const container = el('trackList');
    if (!list.length) {
      container.innerHTML = '<div class="empty-state"><div class="big">😶</div><p>No results</p></div>';
      return;
    }
    container.innerHTML = list.map((item, i) =>
      trackHTML(item, i, i === activeIdx, Storage.isLiked(item.id.videoId))
    ).join('');
  }

  function renderLiked() {
    const list      = Storage.getAllLiked();
    const container = el('trackList');
    const activeVid = Player.getCurrentTrack()?.id?.videoId;

    if (!list.length) {
      container.innerHTML = '<div class="empty-state"><div class="big">🤍</div><p>No liked songs yet</p></div>';
      return;
    }

    let html = `<div class="queue-header">
      <div class="queue-header-title">Liked Songs</div>
      <div class="queue-count">${list.length} song${list.length !== 1 ? 's' : ''}</div>
    </div>`;

    html += list.map((item, i) =>
      trackHTML(item, i, item.id.videoId === activeVid, true, true)
    ).join('');

    container.innerHTML = html;
  }

  function renderQueue() {
    const queue     = Player.getQueue();
    const activeIdx = Player.getCurrentIdx();
    const container = el('trackList');

    if (!queue.length) {
      container.innerHTML = '<div class="empty-state"><div class="big">🎶</div><p>Queue is empty — search for songs first</p></div>';
      return;
    }

    let html = `<div class="queue-header">
      <div class="queue-header-title">Up Next</div>
      <div class="queue-count">${queue.length} track${queue.length !== 1 ? 's' : ''}</div>
    </div>`;

    html += queue.map((item, i) =>
      trackHTML(item, i, i === activeIdx, Storage.isLiked(item.id.videoId))
    ).join('');

    container.innerHTML = html;
  }

  /* ── Select track ── */
  function selectTrack(idx) {
    const item = results[idx];
    if (!item) return;
    showTapOverlay(item, () => {
      Player.setQueue(results);
      Player.playTrack(idx);
      Player.openFullPlayer();
    });
  }

  function selectFromLiked(videoId) {
    const liked = Storage.getAllLiked();
    const item  = liked.find(t => t.id.videoId === videoId);
    if (!item) return;
    showTapOverlay(item, () => {
      Player.setQueue(liked);
      const idx = liked.findIndex(t => t.id.videoId === videoId);
      Player.playTrack(idx);
      Player.openFullPlayer();
    });
  }

  /* ── Like toggle ── */
  function toggleLikeTrack(videoId, idx, fromLiked) {
    // Find the track from the right source
    const track = fromLiked
      ? Storage.getAllLiked().find(t => t.id.videoId === videoId)
      : results[idx];
    if (!track) return;

    const nowLiked = Storage.toggleLike(track);
    showToast(nowLiked ? '❤️ Added to Liked Songs' : '💔 Removed from Liked Songs');

    // Re-render current view
    if (currentView === 'liked') {
      renderLiked();
    } else if (currentView === 'search') {
      renderTracks(results, Player.getCurrentIdx());
    } else if (currentView === 'queue') {
      renderQueue();
    }

    // Sync full player like button if this is the active track
    if (Player.getCurrentTrack()?.id?.videoId === videoId) {
      Player.syncLikeButton(nowLiked);
    }
  }

  /* ── Tap overlay ── */
  let _pendingCallback = null;

  function showTapOverlay(item, callback) {
    const thumb = item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url;
    el('tapArt').src   = thumb;
    el('tapTitle').textContent = item.snippet.title;
    el('tapCh').textContent    = item.snippet.channelTitle;
    _pendingCallback = callback;
    el('tapOverlay').classList.add('show');
  }

  function confirmPlay() {
    el('tapOverlay').classList.remove('show');
    if (_pendingCallback) { _pendingCallback(); _pendingCallback = null; }
  }

  function cancelTap() {
    el('tapOverlay').classList.remove('show');
    _pendingCallback = null;
  }

  /* ── Refresh views ── */
  function refreshCurrentView() {
    if (currentView === 'search') renderTracks(results, Player.getCurrentIdx());
    else if (currentView === 'liked') renderLiked();
    else if (currentView === 'queue') renderQueue();
  }

  /* ── Utility ── */
  function escapeHTML(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return {
    doSearch,
    getResults, setResults,
    getCurrentView,
    switchTab,
    selectTrack,
    selectFromLiked,
    toggleLikeTrack,
    renderTracks,
    renderLiked,
    renderQueue,
    confirmPlay,
    cancelTap,
    refreshCurrentView
  };
})();

/* ── Toast helper (global) ── */
let _toastTimer = null;
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}
