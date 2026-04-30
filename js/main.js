/**
 * main.js — App bootstrap & event wiring
 * Connects: Player, Search, Storage
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Init YouTube player ── */
  Player.init();

  /* ── Search bindings ── */
  document.getElementById('searchBtn').addEventListener('click', () => Search.doSearch());
  document.getElementById('searchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') Search.doSearch();
  });

  /* ── Sidebar nav bindings ── */
  document.getElementById('tab-search').addEventListener('click', () => Search.switchTab('search'));
  document.getElementById('tab-liked').addEventListener('click',  () => Search.switchTab('liked'));
  document.getElementById('tab-queue').addEventListener('click',  () => Search.switchTab('queue'));

  /* ── Mobile nav bindings ── */
  document.getElementById('mob-tab-search').addEventListener('click', () => {
    Search.switchTab('search');
    syncMobileNav('search');
  });
  document.getElementById('mob-tab-liked').addEventListener('click', () => {
    Search.switchTab('liked');
    syncMobileNav('liked');
  });
  document.getElementById('mob-tab-queue').addEventListener('click', () => {
    Search.switchTab('queue');
    syncMobileNav('queue');
  });

  function syncMobileNav(tab) {
    document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
    const mobBtn = document.getElementById(`mob-tab-${tab}`);
    if (mobBtn) mobBtn.classList.add('active');
  }

  /* ── Mini player: expand button → open full player ── */
  document.getElementById('miniExpandBtn').addEventListener('click', () => Player.openFullPlayer());

  /* ── Mini controls (stop propagation so click doesn't open full player) ── */
  document.getElementById('miniControls').addEventListener('click', e => e.stopPropagation());
  document.getElementById('miniPrevBtn').addEventListener('click', () => Player.playPrev());
  document.getElementById('miniPlayBtn').addEventListener('click', () => Player.togglePlay());
  document.getElementById('miniNextBtn').addEventListener('click', () => Player.playNext());

  /* ── Full player controls ── */
  document.getElementById('fpDownBtn').addEventListener('click',  () => Player.closeFullPlayer());
  document.getElementById('fpHandle').addEventListener('click',   () => Player.closeFullPlayer());
  document.getElementById('fpPrevBtn').addEventListener('click',  () => Player.playPrev());
  document.getElementById('fpPlayBtn').addEventListener('click',  () => Player.togglePlay());
  document.getElementById('fpNextBtn').addEventListener('click',  () => Player.playNext());
  document.getElementById('fpBar').addEventListener('click',      e  => Player.seek(e));

  /* ── Full player: shuffle / repeat ── */
  document.getElementById('shuffleBtn').addEventListener('click', () => Player.toggleShuffle());
  document.getElementById('repeatBtn').addEventListener('click',  () => Player.toggleRepeat());

  /* ── Full player: like ── */
  document.getElementById('fpLikeBtn').addEventListener('click',  () => Player.toggleLikeCurrentTrack());

  /* ── Volume ── */
  document.getElementById('volumeSlider').addEventListener('input', e => {
    Player.setVolume(parseInt(e.target.value, 10));
  });
  document.getElementById('volIconBtn').addEventListener('click', () => Player.toggleMute());

  /* ── Tap overlay ── */
  document.getElementById('tapPlayBtn').addEventListener('click',   () => Search.confirmPlay());
  document.getElementById('tapCancelBtn').addEventListener('click', () => Search.cancelTap());

  /* ── Swipe down to close full player ── */
  let touchStartY = 0;
  const fullPlayer = document.getElementById('fullPlayer');
  fullPlayer.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, { passive: true });
  fullPlayer.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientY - touchStartY > 80) Player.closeFullPlayer();
  }, { passive: true });

  /* ── Show empty home on initial load ── */
  document.getElementById('emptyHome').classList.remove('hidden');

});
