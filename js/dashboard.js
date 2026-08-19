// ============================================================
// DARKNESS ESPORTS — Dashboard: status changer + edit profile
// ============================================================

function buildStatusChanger(currentStatus, uid) {
  const container = document.getElementById('statusChanger');
  if (!container) return;

  container.innerHTML = '';
  Object.keys(STATUS_META).forEach((key) => {
    const meta = STATUS_META[key];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hud-card';
    btn.style.cursor = 'pointer';
    btn.style.textAlign = 'left';
    btn.style.border = key === currentStatus ? '1px solid var(--purple-bright)' : '';
    btn.innerHTML = `<div class="hud-corner"></div><span class="status-pill status-${key}"><span class="status-dot"></span>${meta.label}</span>`;
    btn.addEventListener('click', async () => {
      try {
        await db.collection('users').doc(uid).update({ status: key });
        showToast(`Status set to ${meta.label}.`);
        buildStatusChanger(key, uid);
        const pill = document.getElementById('welcomeStatus');
        if (pill) {
          pill.className = 'status-pill status-' + key;
          document.getElementById('welcomeStatusText').textContent = meta.label;
        }
      } catch (err) {
        showToast('Could not update status. Try again.');
      }
    });
    container.appendChild(btn);
  });
}

function populateEditForm(data) {
  document.getElementById('editIgn').value = data.ign || '';
  document.getElementById('editRegion').value = data.region || 'South Asia';
  document.getElementById('editRole').value = data.role || 'Sniper';
  document.getElementById('editContact').value = data.contact || '';
  document.getElementById('editBio').value = data.bio || '';
  document.getElementById('editBioCount').textContent = (data.bio || '').length;
  document.getElementById('editPhotoUrl').value = data.photoUrl || '';

  const preview = document.getElementById('editAvatarPreview');
  if (data.photoUrl) {
    preview.innerHTML = `<img src="${data.photoUrl}" alt="" onerror="this.parentElement.innerHTML='?'">`;
  } else {
    preview.textContent = '?';
  }
}

function initEditProfileForm(uid) {
  const form = document.getElementById('editProfileForm');
  if (!form) return;

  const bioInput = document.getElementById('editBio');
  const bioCount = document.getElementById('editBioCount');
  bioInput.addEventListener('input', () => { bioCount.textContent = bioInput.value.length; });

  const photoInput = document.getElementById('editPhotoUrl');
  const preview = document.getElementById('editAvatarPreview');
  photoInput.addEventListener('input', () => {
    const url = photoInput.value.trim();
    preview.innerHTML = url ? `<img src="${url}" alt="" onerror="this.parentElement.innerHTML='?'">` : '?';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('editAlert');
    alertEl.classList.remove('show');

    ['field-editIgn', 'field-editContact', 'field-editBio', 'field-editPhotoUrl'].forEach(id => {
      clearFieldError(document.getElementById(id));
    });

    const ign = document.getElementById('editIgn').value.trim();
    const region = document.getElementById('editRegion').value;
    const role = document.getElementById('editRole').value;
    const contact = document.getElementById('editContact').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    const photoUrl = document.getElementById('editPhotoUrl').value.trim();

    let hasError = false;
    if (ign.length < 2) { setFieldError(document.getElementById('field-editIgn'), 'Please enter your IGN.'); hasError = true; }
    if (contact.length < 2) { setFieldError(document.getElementById('field-editContact'), 'Please enter a contact username.'); hasError = true; }
    if (bio.length > 280) { setFieldError(document.getElementById('field-editBio'), 'Bio must be 280 characters or fewer.'); hasError = true; }
    if (photoUrl && !/^https?:\/\//.test(photoUrl)) { setFieldError(document.getElementById('field-editPhotoUrl'), 'Must be a valid URL.'); hasError = true; }
    if (hasError) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      await db.collection('users').doc(uid).update({
        ign, region, role, contact, bio: bio || null, photoUrl: photoUrl || null,
        profileComplete: true,
      });
      showAlert(alertEl, 'Profile updated.', 'success');
      showToast('Profile saved.');
    } catch (err) {
      showAlert(alertEl, 'Could not save changes. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Changes';
    }
  });
}

async function loadMyTeam(uid, teamId) {
  const root = document.getElementById('myTeamRoot');
  if (!root) return;

  if (!teamId) {
    root.innerHTML = `
      <div class="hud-card"><div class="hud-corner"></div>
        <p style="color:var(--muted);font-size:0.9rem;margin-bottom:14px;">You're not on a team yet.</p>
        <a href="create-team.html" class="btn btn-primary btn-sm">Create a Team</a>
        <a href="teams.html" class="btn btn-ghost btn-sm">Browse Teams</a>
      </div>`;
    return;
  }

  const teamDoc = await db.collection('teams').doc(teamId).get();
  if (!teamDoc.exists) {
    root.innerHTML = `<p style="color:var(--muted);">Team not found.</p>`;
    return;
  }
  const team = teamDoc.data();
  root.innerHTML = `
    <div class="hud-card">
      <div class="hud-corner"></div>
      <div class="team-card-header">
        <div class="team-logo">${team.tag ? team.tag.charAt(0) : '?'}</div>
        <div><div style="font-weight:600;">${team.name}</div><div class="team-tag">[${team.tag}]</div></div>
      </div>
      <a href="team.html?id=${teamId}" class="btn btn-ghost btn-sm">Manage / View Team</a>
    </div>`;
}

async function loadMyInvites(uid) {
  const root = document.getElementById('invitesRoot');
  if (!root) return;

  const snap = await db.collection('invites').where('toUid', '==', uid).where('status', '==', 'pending').get();
  if (snap.empty) { root.innerHTML = ''; return; }

  let html = `<div class="form-section-label">Team Invitations</div>`;
  snap.forEach((doc) => {
    const inv = doc.data();
    html += `
      <div class="invite-row" data-invite-id="${doc.id}">
        <div><strong>${inv.teamName}</strong> <span class="team-tag">[${inv.teamTag}]</span> invited you as <strong>${inv.role}</strong></div>
        <div class="member-actions">
          <button class="btn btn-primary btn-sm acceptInviteBtn" data-id="${doc.id}">Accept</button>
          <button class="btn btn-ghost btn-sm declineInviteBtn" data-id="${doc.id}">Decline</button>
        </div>
      </div>`;
  });
  root.innerHTML = html;

  root.querySelectorAll('.acceptInviteBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const inviteDoc = await db.collection('invites').doc(btn.dataset.id).get();
      const inv = inviteDoc.data();
      const userDoc = await db.collection('users').doc(uid).get();
      const userData = userDoc.data();

      if (userData.teamId) {
        showToast('You are already on a team.');
        return;
      }

      await db.collection('teams').doc(inv.teamId).collection('members').doc(uid).set({
        uid, username: userData.username, displayName: userData.displayName,
        role: inv.role, lineupSlot: 'sub', order: 99, isCaptain: false,
        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      await db.collection('teams').doc(inv.teamId).update({ memberCount: firebase.firestore.FieldValue.increment(1) });
      await db.collection('users').doc(uid).update({ teamId: inv.teamId, team: inv.teamName });
      await db.collection('invites').doc(btn.dataset.id).update({ status: 'accepted' });

      showToast(`Joined ${inv.teamName}.`);
      loadMyTeam(uid, inv.teamId);
      loadMyInvites(uid);
    });
  });

  root.querySelectorAll('.declineInviteBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await db.collection('invites').doc(btn.dataset.id).update({ status: 'declined' });
      showToast('Invite declined.');
      loadMyInvites(uid);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof auth === 'undefined') return;
  auth.onAuthStateChanged(async (user) => {
    if (!user) return; // auth.js already redirects to login
    const doc = await db.collection('users').doc(user.uid).get();
    if (!doc.exists) return;
    const data = doc.data();
    const status = data.status && STATUS_META[data.status] ? data.status : 'OFFLINE';

    buildStatusChanger(status, user.uid);
    populateEditForm(data);
    initEditProfileForm(user.uid);
    loadMyTeam(user.uid, data.teamId || null);
    loadMyInvites(user.uid);
  });
});
