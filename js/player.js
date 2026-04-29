/**
 * player.js — YouTube IFrame Player controller
 * Features: play/pause, next/prev, seek, progress,
 *           volume, shuffle, repeat (off/one/all), liked sync
 */

const Player = (() => {
  /* ── State ── */
  let queue         = [];   // current playlist
  let currentIdx    = -1;
  let shuffleOn     = false;
  let repeatMode    = 'off'; // 'off' | 'one' | 'all'
  let volume        = 80;

  let ytPlayer      = null;
  let playerReady   = false;
  let isPlaying     = false;
  let progressInterval = null;

  /* ── Init YouTube IFrame API ── */
  function init() {
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }

  window.onYouTubeIframeAPIReady = () => {
    ytPlayer = new YT.Player('ytPlayer', {
      height: '1', width: '1',
      playerVars: { autoplay: 0, playsinline: 1, controls: 0 },
      events: {
        onReady: () => {
          playerReady = true;
          ytPlayer.setVolume(volume);
          _updateVolumeSlider();
        },
        onStateChange: _onStateChange
      }
    });
  };

  /* ── State change handler ── */
  function _onStateChange(e) {
    if (e.data === YT.PlayerState.PLAYING) {
      isPlaying = true;
      _setIcons('pause');
      _startProgress();
      document.getElementById('fpArt').classList.add('playing');
    } else if (e.data === YT.PlayerState.PAUSED) {
      isPlaying = false;
      _setIcons('play');
      clearInterval(progressInterval);
      document.getElementById('fpArt').classList.remove('playing');
    } else if (e.data === YT.PlayerState.ENDED) {
      _handleEnded();
    }
  }

  function _handleEnded() {
    if (repeatMode === 'one') {
      ytPlayer.seekTo(0);
      ytPlayer.playVideo();
    } else if (repeatMode === 'all') {
      const next = _getNextIdx();
      playTrack(next);
    } else {
      // 'off' — play next if exists
      const next = _getNextIdx();
      if (next !== currentIdx) playTrack(next);
    }
  }

  /* ── Queue ── */
  function setQueue(list) { queue = list; }
  function getQueue() { return queue; }

  /* ── Shuffle helper ── */
  function _getNextIdx() {
    if (shuffleOn && queue.length > 1) {
      let r;
      do { r = Math.floor(Math.random() * queue.length); } while (r === currentIdx);
      return r;
    }
    if (currentIdx < queue.length - 1) return currentIdx + 1;
    if (repeatMode === 'all') return 0;
    return currentIdx;
  }

  function _getPrevIdx() {
    if (shuffleOn && queue.length > 1) {
      let r;
      do { r = Math.floor(Math.random() * queue.length); } while (r === currentIdx);
      return r;
    }
    if (currentIdx > 0) return currentIdx - 1;
    if (repeatMode === 'all') return queue.length - 1;
    return currentIdx;
  }

  /* ── Play ── */
  function playTrack(idx) {
    if (!queue.length || idx < 0 || idx >= queue.length) return;
    currentIdx = idx;
    const item  = queue[idx];
    const thumb = item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url;
    const vid   = item.id.videoId;

    // Mini player
    document.getElementById('miniTitle').textContent   = item.snippet.title;
    document.getElementById('miniChannel').textContent = item.snippet.channelTitle;
    document.getElementById('miniThumb').src           = thumb;
    document.getElementById('miniPlayer').classList.add('visible');

    // Full player
    document.getElementById('fpTitle').textContent   = item.snippet.title;
    document.getElementById('fpChannel').textContent = item.snippet.channelTitle;
    document.getElementById('fpArt').src             = thumb;
    document.getElementById('fpBgArt').style.backgroundImage = `url(${thumb})`;

    // Like button sync
    syncLikeButton(Storage.isLiked(vid));

    // Reset progress
    _resetProgress();

    // Status
    document.getElementById('status').textContent = 'Now playing: ' + item.snippet.title;

    // Load & play
    if (ytPlayer && playerReady) {
      ytPlayer.loadVideoById(vid);
      ytPlayer.playVideo();
      ytPlayer.setVolume(volume);
    }

    // Refresh track list view
    Search.refreshCurrentView();
  }

  function togglePlay() {
    if (!ytPlayer || !playerReady) return;
    isPlaying ? ytPlayer.pauseVideo() : ytPlayer.playVideo();
  }

  function playNext() { playTrack(_getNextIdx()); }
  function playPrev() { playTrack(_getPrevIdx()); }

  /* ── Seek ── */
  function seek(e) {
    if (!ytPlayer || !ytPlayer.getDuration) return;
    const bar   = document.getElementById('fpBar');
    const ratio = e.offsetX / bar.offsetWidth;
    ytPlayer.seekTo(ratio * ytPlayer.getDuration(), true);
  }

  /* ── Volume ── */
  function setVolume(val) {
    volume = Math.max(0, Math.min(100, val));
    if (ytPlayer && playerReady) ytPlayer.setVolume(volume);
    _updateVolumeSlider();
  }

  function _updateVolumeSlider() {
    const slider = document.getElementById('volumeSlider');
    const label  = document.getElementById('volLabel');
    if (slider) {
      slider.value = volume;
      slider.style.backgroundSize = `${volume}% 100%`;
    }
    if (label) label.textContent = volume + '%';
    _updateVolIcon();
  }

  function _updateVolIcon() {
    const btn = document.getElementById('volIconBtn');
    if (!btn) return;
    if (volume === 0) {
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
    } else if (volume < 50) {
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>`;
    } else {
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
    }
  }

  function toggleMute() {
    if (volume > 0) {
      _savedVolume = volume;
      setVolume(0);
    } else {
      setVolume(_savedVolume || 80);
    }
  }

  let _savedVolume = 80;

  /* ── Shuffle ── */
  function toggleShuffle() {
    shuffleOn = !shuffleOn;
    const btn = document.getElementById('shuffleBtn');
    if (btn) btn.classList.toggle('mode-active', shuffleOn);
    showToast(shuffleOn ? '🔀 Shuffle on' : '🔀 Shuffle off');
  }

  /* ── Repeat ── */
  function toggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const next  = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
    repeatMode  = next;
    _updateRepeatBtn();
    const labels = { off: '↩ Repeat off', all: '🔁 Repeat all', one: '🔂 Repeat one' };
    showToast(labels[repeatMode]);
  }

  function _updateRepeatBtn() {
    const btn = document.getElementById('repeatBtn');
    if (!btn) return;

    btn.classList.toggle('mode-active', repeatMode !== 'off');

    if (repeatMode === 'one') {
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/></svg>`;
    } else {
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>`;
    }
  }

  /* ── Like sync ── */
  function syncLikeButton(liked) {
    const btn = document.getElementById('fpLikeBtn');
    if (!btn) return;
    btn.classList.toggle('liked', liked);
    btn.title = liked ? 'Unlike' : 'Like';
    btn.innerHTML = liked
      ? `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
      : `<svg viewBox="0 0 24 24"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/></svg>`;
  }

  function toggleLikeCurrentTrack() {
    const track = getCurrentTrack();
    if (!track) return;
    const nowLiked = Storage.toggleLike(track);
    syncLikeButton(nowLiked);
    showToast(nowLiked ? '❤️ Added to Liked Songs' : '💔 Removed from Liked Songs');
    Search.refreshCurrentView();
  }

  /* ── Full player open/close ── */
  function openFullPlayer() {
    document.getElementById('fullPlayer').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeFullPlayer() {
    document.getElementById('fullPlayer').classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ── Progress ── */
  function _startProgress() {
    clearInterval(progressInterval);
    progressInterval = setInterval(() => {
      if (!ytPlayer || !ytPlayer.getCurrentTime) return;
      const cur = ytPlayer.getCurrentTime();
      const dur = ytPlayer.getDuration();
      if (!dur) return;
      const pct = (cur / dur * 100) + '%';
      document.getElementById('fpFill').style.width    = pct;
      document.getElementById('miniProgress').style.width = pct;
      document.getElementById('fpCurrent').textContent = _fmt(cur);
      document.getElementById('fpTotal').textContent   = _fmt(dur);
    }, 500);
  }

  function _resetProgress() {
    document.getElementById('fpFill').style.width        = '0%';
    document.getElementById('miniProgress').style.width  = '0%';
    document.getElementById('fpCurrent').textContent     = '0:00';
    document.getElementById('fpTotal').textContent       = '0:00';
  }

  /* ── Icons ── */
  function _setIcons(state) {
    const path = state === 'pause'
      ? '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>'
      : '<path d="M8 5v14l11-7z"/>';
    document.getElementById('miniPlayIcon').innerHTML = path;
    document.getElementById('fpPlayIcon').innerHTML   = path;
  }

  /* ── Getters ── */
  function getCurrentIdx() { return currentIdx; }
  function getCurrentTrack() { return queue[currentIdx] || null; }
  function getIsPlaying() { return isPlaying; }

  /* ── Utility ── */
  function _fmt(s) {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  }

  return {
    init,
    setQueue, getQueue,
    playTrack, togglePlay, playNext, playPrev,
    seek,
    setVolume, toggleMute,
    toggleShuffle, toggleRepeat,
    syncLikeButton, toggleLikeCurrentTrack,
    openFullPlayer, closeFullPlayer,
    getCurrentIdx, getCurrentTrack, getIsPlaying
  };
})();
