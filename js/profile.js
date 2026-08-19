// ============================================================
// DARKNESS ESPORTS — Player profile logic
// Shared status metadata used by both the public profile page
// and the dashboard's status changer / edit-profile form.
// ============================================================

const STATUS_META = {
  AVAILABLE: { label: 'Available', emoji: '🟢' },
  IN_MATCH: { label: 'In Match', emoji: '🟡' },
  BUSY: { label: 'Busy', emoji: '🔴' },
  OFFLINE: { label: 'Offline', emoji: '⚫' },
  LOOKING_FOR_TEAM: { label: 'Looking For Team', emoji: '🔵' },
  SUBSTITUTE: { label: 'Substitute', emoji: '🟣' },
};

function formatJoinDate(timestamp) {
  if (!timestamp || !timestamp.toDate) return '—';
  return timestamp.toDate().toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
}

function initialsFrom(name) {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

async function loadPublicProfile() {
  const root = document.getElementById('profileRoot');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const username = (params.get('u') || '').trim().toLowerCase();

  if (!username) {
    root.innerHTML = `<div class="empty-state" style="padding-top:80px;"><h3>No player specified</h3><p>Use a link like profile.html?u=username</p></div>`;
    return;
  }

  const snap = await db.collection('users').where('usernameLower', '==', username).limit(1).get();
  if (snap.empty) {
    root.innerHTML = `<div class="empty-state" style="padding-top:80px;"><h3>Player not found</h3><p>No profile matches "${username}".</p></div>`;
    return;
  }

  const data = snap.docs[0].data();
  const tpl = document.getElementById('profileTemplate').content.cloneNode(true);

  const avatarEl = tpl.getElementById('tplAvatar');
  if (data.photoUrl) {
    avatarEl.innerHTML = `<img src="${data.photoUrl}" alt="" onerror="this.parentElement.textContent='${initialsFrom(data.displayName)}'">`;
  } else {
    avatarEl.textContent = initialsFrom(data.displayName);
  }

  tpl.getElementById('tplDisplayName').textContent = data.displayName || data.username;
  tpl.getElementById('tplHandle').textContent = '@' + data.username;

  const status = data.status && STATUS_META[data.status] ? data.status : 'OFFLINE';
  const statusPill = tpl.getElementById('tplStatus');
  statusPill.classList.add('status-' + status);
  tpl.getElementById('tplStatusText').textContent = STATUS_META[status].label;

  tpl.getElementById('tplMatches').textContent = data.matchesPlayed ?? 0;
  tpl.getElementById('tplWins').textContent = data.wins ?? 0;
  tpl.getElementById('tplKd').textContent = data.kd ?? 0;
  tpl.getElementById('tplRole').textContent = data.role || '—';
  tpl.getElementById('tplBio').textContent = data.bio || 'This player hasn\'t written a bio yet.';
  tpl.getElementById('tplIgn').textContent = data.ign || '—';
  tpl.getElementById('tplUid').textContent = data.uid || '—';
  tpl.getElementById('tplRegion').textContent = data.region || '—';
  tpl.getElementById('tplTeam').textContent = data.team || 'Unassigned';
  tpl.getElementById('tplContact').textContent = data.contact || '—';
  tpl.getElementById('tplJoined').textContent = formatJoinDate(data.joinDate);

  root.innerHTML = '';
  root.appendChild(tpl);

  const copyBtn = document.getElementById('copyUidBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(data.uid || '');
      showToast('UID copied to clipboard.');
    });
  }

  document.title = `${data.displayName || data.username} — DARKNESS ESPORTS`;
}

document.addEventListener('DOMContentLoaded', loadPublicProfile);
