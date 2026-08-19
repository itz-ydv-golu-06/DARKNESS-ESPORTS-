// ============================================================
// DARKNESS ESPORTS — Team logic
// Data model:
//   teams/{teamId}            { name, tag, logoUrl, description, contact,
//                                captainUid, captainUsername, memberCount,
//                                isOfficialRoster, createdAt }
//   teams/{teamId}/members/{uid}  { uid, username, displayName, role,
//                                    lineupSlot: 'main'|'sub', order,
//                                    isCaptain, joinedAt }
//   invites/{inviteId}        { teamId, teamName, teamTag, toUid, toUsername,
//                                fromUid, role, status: pending|accepted|declined,
//                                createdAt }
// ============================================================

const TEAM_ROLES = ['IGL', 'Primary Rusher', 'Sniper', 'Assaulter', 'Bomber', 'Support', 'Substitute'];

async function getUserTeamId(uid) {
  const doc = await db.collection('users').doc(uid).get();
  return doc.exists ? doc.data().teamId || null : null;
}

// ---------------- Create team ----------------
function initCreateTeamForm() {
  const form = document.getElementById('createTeamForm');
  if (!form) return;

  auth.onAuthStateChanged(async (user) => {
    if (!user) { window.location.href = 'login.html'; return; }
    const existingTeamId = await getUserTeamId(user.uid);
    if (existingTeamId) {
      document.getElementById('createTeamRoot').innerHTML = `
        <div class="empty-state hud-card"><div class="hud-corner"></div>
          <h3>You're already on a team</h3>
          <p>Leave your current team before creating a new one.</p>
          <a href="team.html?id=${existingTeamId}" class="btn btn-primary btn-sm" style="margin-top:16px;">View My Team</a>
        </div>`;
    }
  });

  const logoInput = document.getElementById('teamLogoUrl');
  const preview = document.getElementById('teamLogoPreview');
  logoInput.addEventListener('input', () => {
    const url = logoInput.value.trim();
    preview.innerHTML = url ? `<img src="${url}" onerror="this.parentElement.innerHTML='?'">` : '?';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('createTeamAlert');
    alertEl.classList.remove('show');
    ['field-teamName', 'field-teamTag', 'field-teamDesc', 'field-teamContact'].forEach(id => clearFieldError(document.getElementById(id)));

    const name = document.getElementById('teamName').value.trim();
    const tag = document.getElementById('teamTag').value.trim().toUpperCase();
    const logoUrl = document.getElementById('teamLogoUrl').value.trim();
    const description = document.getElementById('teamDesc').value.trim();
    const contact = document.getElementById('teamContact').value.trim();

    let hasError = false;
    if (name.length < 2) { setFieldError(document.getElementById('field-teamName'), 'Enter a team name.'); hasError = true; }
    if (!/^[A-Z0-9]{2,6}$/.test(tag)) { setFieldError(document.getElementById('field-teamTag'), '2-6 letters/numbers, e.g. DRKN.'); hasError = true; }
    if (contact.length < 2) { setFieldError(document.getElementById('field-teamContact'), 'Enter a contact username.'); hasError = true; }
    if (hasError) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating team...';

    try {
      const user = auth.currentUser;
      const userDoc = await db.collection('users').doc(user.uid).get();
      const userData = userDoc.data();

      const teamRef = await db.collection('teams').add({
        name, tag, logoUrl: logoUrl || null, description: description || null, contact,
        captainUid: user.uid,
        captainUsername: userData.username,
        memberCount: 1,
        isOfficialRoster: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      await teamRef.collection('members').doc(user.uid).set({
        uid: user.uid,
        username: userData.username,
        displayName: userData.displayName,
        role: userData.role || 'IGL',
        lineupSlot: 'main',
        order: 1,
        isCaptain: true,
        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      await db.collection('users').doc(user.uid).update({
        teamId: teamRef.id, team: name,
      });

      showToast('Team created.');
      window.location.href = 'team.html?id=' + teamRef.id;
    } catch (err) {
      showAlert(alertEl, 'Could not create team. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Team';
    }
  });
}

// ---------------- Browse teams ----------------
async function loadTeamsList() {
  const root = document.getElementById('teamsListRoot');
  if (!root) return;

  const snap = await db.collection('teams').orderBy('createdAt', 'desc').limit(50).get();
  if (snap.empty) {
    root.innerHTML = `<div class="empty-state hud-card"><div class="hud-corner"></div><h3>No teams yet</h3><p>Be the first to create one.</p></div>`;
    return;
  }

  root.innerHTML = '<div class="grid grid-3" id="teamsGrid"></div>';
  const grid = document.getElementById('teamsGrid');

  snap.forEach((doc) => {
    const t = doc.data();
    const card = document.createElement('a');
    card.href = 'team.html?id=' + doc.id;
    card.className = 'hud-card';
    card.style.display = 'block';
    const logoHtml = t.logoUrl
      ? `<img src="${t.logoUrl}" onerror="this.parentElement.textContent='${(t.tag || '?').charAt(0)}'">`
      : (t.tag || '?').charAt(0);
    card.innerHTML = `
      <div class="hud-corner"></div>
      <div class="team-card-header">
        <div class="team-logo">${logoHtml}</div>
        <div><div style="font-weight:600;">${t.name}</div><div class="team-tag">[${t.tag}]</div></div>
      </div>
      <p style="color:var(--muted);font-size:0.85rem;margin-bottom:10px;">${t.description || 'No description yet.'}</p>
      <span class="status-pill">${t.memberCount || 1} member${(t.memberCount || 1) === 1 ? '' : 's'}</span>
    `;
    grid.appendChild(card);
  });
}

// ---------------- Team detail + captain controls ----------------
async function loadTeamDetail() {
  const root = document.getElementById('teamDetailRoot');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const teamId = params.get('id');
  if (!teamId) {
    root.innerHTML = `<div class="empty-state" style="padding-top:60px;"><h3>No team specified</h3></div>`;
    return;
  }

  const teamDoc = await db.collection('teams').doc(teamId).get();
  if (!teamDoc.exists) {
    root.innerHTML = `<div class="empty-state" style="padding-top:60px;"><h3>Team not found</h3></div>`;
    return;
  }
  const team = teamDoc.data();
  document.title = `${team.name} — DARKNESS ESPORTS`;

  const membersSnap = await db.collection('teams').doc(teamId).collection('members').orderBy('order', 'asc').get();
  const members = membersSnap.docs.map(d => d.data());

  const currentUser = auth.currentUser;
  const isCaptain = currentUser && currentUser.uid === team.captainUid;

  const logoHtml = team.logoUrl
    ? `<img src="${team.logoUrl}" onerror="this.parentElement.textContent='${(team.tag || '?').charAt(0)}'">`
    : (team.tag || '?').charAt(0);

  let html = `
    <div class="profile-header">
      <div class="profile-avatar team-logo" style="width:90px;height:90px;border-radius:12px;">${logoHtml}</div>
      <div class="profile-meta">
        <h1>${team.name}</h1>
        <div class="handle mono">[${team.tag}] &middot; Captain: @${team.captainUsername}</div>
      </div>
    </div>
    <p class="profile-bio">${team.description || 'No description yet.'}</p>
    <dl class="profile-detail-list">
      <div><dt>Contact</dt><dd>${team.contact || '—'}</dd></div>
      <div><dt>Members</dt><dd>${members.length}</dd></div>
    </dl>
  `;

  const main = members.filter(m => m.lineupSlot === 'main').sort((a, b) => a.order - b.order);
  const subs = members.filter(m => m.lineupSlot === 'sub').sort((a, b) => a.order - b.order);

  const memberCardHtml = (m) => `
    <div class="member-row" data-uid="${m.uid}">
      <div class="who">
        <div class="avatar-preview">${(m.displayName || m.username).charAt(0).toUpperCase()}</div>
        <div>
          <div class="name"><a href="profile.html?u=${m.username}">${m.displayName}</a> ${m.isCaptain ? '<span class="captain-badge">Captain</span>' : ''}</div>
          <div class="sub">@${m.username} &middot; ${m.role}</div>
        </div>
      </div>
      ${isCaptain && !m.isCaptain ? `
        <div class="member-actions">
          <select class="roleSelect" data-uid="${m.uid}">${TEAM_ROLES.map(r => `<option ${r === m.role ? 'selected' : ''}>${r}</option>`).join('')}</select>
          <select class="slotSelect" data-uid="${m.uid}">
            <option value="main" ${m.lineupSlot === 'main' ? 'selected' : ''}>Main</option>
            <option value="sub" ${m.lineupSlot === 'sub' ? 'selected' : ''}>Sub</option>
          </select>
          <button class="btn btn-ghost btn-sm removeMemberBtn" data-uid="${m.uid}">Remove</button>
        </div>` : ''}
    </div>
  `;

  html += `
    <div class="form-section-label">Main Lineup</div>
    <div style="margin-bottom:30px;">${main.length ? main.map(memberCardHtml).join('') : '<p style="color:var(--muted);">No main players yet.</p>'}</div>
    <div class="form-section-label">Substitutes</div>
    <div style="margin-bottom:30px;">${subs.length ? subs.map(memberCardHtml).join('') : '<p style="color:var(--muted);">No substitutes yet.</p>'}</div>
  `;

  if (isCaptain) {
    html += `
      <div class="form-section-label">Invite a Player</div>
      <div class="hud-card" style="max-width:520px;margin-bottom:30px;">
        <div class="hud-corner"></div>
        <div class="form-alert" id="inviteAlert"></div>
        <form id="inviteForm">
          <div class="field" id="field-inviteUsername">
            <label for="inviteUsername">Username</label>
            <input type="text" id="inviteUsername" placeholder="playerusername" required>
            <div class="field-error"></div>
          </div>
          <div class="field" id="field-inviteRole">
            <label for="inviteRole">Proposed Role</label>
            <select id="inviteRole">${TEAM_ROLES.map(r => `<option>${r}</option>`).join('')}</select>
          </div>
          <button type="submit" class="btn btn-primary btn-sm">Send Invite</button>
        </form>
      </div>
    `;
  }

  root.innerHTML = html;

  if (isCaptain) {
    bindCaptainControls(teamId);
    initInviteForm(teamId, team);
  }
}

function bindCaptainControls(teamId) {
  document.querySelectorAll('.roleSelect').forEach(sel => {
    sel.addEventListener('change', async () => {
      await db.collection('teams').doc(teamId).collection('members').doc(sel.dataset.uid).update({ role: sel.value });
      showToast('Role updated.');
    });
  });
  document.querySelectorAll('.slotSelect').forEach(sel => {
    sel.addEventListener('change', async () => {
      await db.collection('teams').doc(teamId).collection('members').doc(sel.dataset.uid).update({ lineupSlot: sel.value, order: 99 });
      showToast('Lineup updated.');
      loadTeamDetail();
    });
  });
  document.querySelectorAll('.removeMemberBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this player from the team?')) return;
      const uid = btn.dataset.uid;
      await db.collection('teams').doc(teamId).collection('members').doc(uid).delete();
      await db.collection('teams').doc(teamId).update({ memberCount: firebase.firestore.FieldValue.increment(-1) });
      await db.collection('users').doc(uid).update({ teamId: null, team: null });
      showToast('Player removed.');
      loadTeamDetail();
    });
  });
}

function initInviteForm(teamId, team) {
  const form = document.getElementById('inviteForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('inviteAlert');
    alertEl.classList.remove('show');
    clearFieldError(document.getElementById('field-inviteUsername'));

    const username = document.getElementById('inviteUsername').value.trim().toLowerCase();
    const role = document.getElementById('inviteRole').value;

    const userSnap = await db.collection('users').where('usernameLower', '==', username).limit(1).get();
    if (userSnap.empty) {
      setFieldError(document.getElementById('field-inviteUsername'), 'No player found with that username.');
      return;
    }
    const invited = userSnap.docs[0];
    if (invited.data().teamId) {
      setFieldError(document.getElementById('field-inviteUsername'), 'That player is already on a team.');
      return;
    }

    await db.collection('invites').add({
      teamId, teamName: team.name, teamTag: team.tag,
      toUid: invited.id, toUsername: invited.data().username,
      fromUid: auth.currentUser.uid,
      role,
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    showAlert(alertEl, `Invite sent to @${invited.data().username}.`, 'success');
    form.reset();
  });
}

// ---------------- Official roster lineup page ----------------
async function loadOfficialLineup() {
  const root = document.getElementById('officialLineupRoot');
  if (!root) return;

  const snap = await db.collection('teams').where('isOfficialRoster', '==', true).limit(1).get();
  if (snap.empty) {
    root.innerHTML = `<div class="empty-state hud-card"><div class="hud-corner"></div>
      <h3>Official roster not set yet</h3>
      <p>An admin needs to flag a team as the official DARKNESS ESPORTS roster. Until the admin panel (Phase 5) exists, set <code class="mono">isOfficialRoster: true</code> on the team's document in the Firestore console.</p>
      <a href="teams.html" class="btn btn-ghost btn-sm" style="margin-top:16px;">Browse Teams</a>
    </div>`;
    return;
  }

  const teamDoc = snap.docs[0];
  const team = teamDoc.data();
  const membersSnap = await db.collection('teams').doc(teamDoc.id).collection('members').orderBy('order', 'asc').get();
  const members = membersSnap.docs.map(d => d.data());
  const main = members.filter(m => m.lineupSlot === 'main').sort((a, b) => a.order - b.order);
  const subs = members.filter(m => m.lineupSlot === 'sub').sort((a, b) => a.order - b.order);

  const roleEmoji = { 'IGL': '👑', 'Primary Rusher': '⚡', 'Sniper': '🎯', 'Assaulter': '💣', 'Bomber': '💣', 'Support': '🛡', 'Substitute': '🔄' };

  const cardHtml = (m, i) => `
    <div class="hud-card lineup-player-card" style="margin-bottom:12px;">
      <div class="hud-corner"></div>
      <div class="slot-num">${i + 1}</div>
      <div class="avatar-preview">${(m.displayName || m.username).charAt(0).toUpperCase()}</div>
      <div style="flex:1;">
        <div style="font-weight:600;">${roleEmoji[m.role] || ''} <a href="profile.html?u=${m.username}">${m.displayName}</a></div>
        <div class="sub mono" style="font-size:0.78rem;color:var(--muted);">${m.role}</div>
      </div>
    </div>
  `;

  root.innerHTML = `
    <div class="section-eyebrow">DARKNESS ESPORTS</div>
    <h2 style="margin-bottom:30px;">Current Lineup</h2>
    <div class="lineup-block">
      <h3>Main Squad</h3>
      ${main.length ? main.map(cardHtml).join('') : '<p style="color:var(--muted);">No main players set.</p>'}
    </div>
    <div class="lineup-block">
      <h3>Substitutes</h3>
      ${subs.length ? subs.map(cardHtml).join('') : '<p style="color:var(--muted);">No substitutes set.</p>'}
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  initCreateTeamForm();
  loadTeamsList();
  loadTeamDetail();
  loadOfficialLineup();
});
