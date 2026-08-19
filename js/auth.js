// ============================================================
// DARKNESS ESPORTS — Authentication
// Phase 1 scope: account creation (email/password), login, logout,
// session persistence, and a minimal `users` document per account.
// Full player-profile fields (IGN, UID, role, region, bio, photo)
// are added to this same document in Phase 2.
// ============================================================

function setFieldError(fieldEl, message) {
  fieldEl.classList.add('has-error');
  const errEl = fieldEl.querySelector('.field-error');
  if (errEl) errEl.textContent = message;
}

function clearFieldError(fieldEl) {
  fieldEl.classList.remove('has-error');
}

function showAlert(alertEl, message, type = 'error') {
  alertEl.textContent = message;
  alertEl.className = `form-alert show ${type}`;
}

function friendlyAuthError(code) {
  const map = {
    'auth/email-already-in-use': 'That email is already registered. Try logging in instead.',
    'auth/invalid-email': 'That email address doesn\'t look right.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

async function isUsernameTaken(username) {
  const snap = await db.collection('users').where('usernameLower', '==', username.toLowerCase()).limit(1).get();
  return !snap.empty;
}

async function isUidTaken(uid) {
  const snap = await db.collection('users').where('uid', '==', uid).limit(1).get();
  return !snap.empty;
}

// ---------------- Registration ----------------
function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  // Live avatar preview from the photo URL field
  const photoUrlInput = document.getElementById('photoUrl');
  const avatarPreview = document.getElementById('avatarPreview');
  if (photoUrlInput && avatarPreview) {
    photoUrlInput.addEventListener('input', () => {
      const url = photoUrlInput.value.trim();
      if (url) {
        avatarPreview.innerHTML = `<img src="${url}" alt="" onerror="this.parentElement.innerHTML='?'">`;
      } else {
        avatarPreview.innerHTML = '?';
      }
    });
  }

  // Bio character counter
  const bioInput = document.getElementById('bio');
  const bioCount = document.getElementById('bioCount');
  if (bioInput && bioCount) {
    bioInput.addEventListener('input', () => {
      bioCount.textContent = bioInput.value.length;
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('registerAlert');
    alertEl.classList.remove('show');

    const fieldIds = [
      'field-username', 'field-displayName', 'field-email', 'field-password', 'field-confirm',
      'field-ign', 'field-uid', 'field-age', 'field-region', 'field-role', 'field-contact',
      'field-photoUrl', 'field-bio'
    ];
    fieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) clearFieldError(el);
    });

    const username = document.getElementById('username').value.trim();
    const displayName = document.getElementById('displayName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm').value;
    const ign = document.getElementById('ign').value.trim();
    const uid = document.getElementById('uid').value.trim();
    const age = document.getElementById('age').value;
    const region = document.getElementById('region').value;
    const role = document.getElementById('role').value;
    const contact = document.getElementById('contact').value.trim();
    const photoUrl = document.getElementById('photoUrl').value.trim();
    const bio = document.getElementById('bio').value.trim();

    let hasError = false;
    const fail = (fieldId, msg) => { setFieldError(document.getElementById(fieldId), msg); hasError = true; };

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      fail('field-username', '3-20 characters: letters, numbers, underscores only.');
    }
    if (displayName.length < 2) fail('field-displayName', 'Please enter a display name.');
    if (password.length < 6) fail('field-password', 'Password must be at least 6 characters.');
    if (password !== confirm) fail('field-confirm', 'Passwords do not match.');
    if (ign.length < 2) fail('field-ign', 'Please enter your in-game name.');
    if (!/^[0-9]{6,12}$/.test(uid)) fail('field-uid', 'UID must be 6-12 digits, numbers only.');
    if (!age || age < 10 || age > 99) fail('field-age', 'Enter a valid age.');
    if (!region) fail('field-region', 'Please select a region.');
    if (!role) fail('field-role', 'Please select a preferred role.');
    if (contact.length < 2) fail('field-contact', 'Please enter a contact/Discord/Instagram username.');
    if (photoUrl && !/^https?:\/\//.test(photoUrl)) fail('field-photoUrl', 'Must be a valid URL starting with http(s)://');
    if (bio.length > 280) fail('field-bio', 'Bio must be 280 characters or fewer.');

    if (hasError) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
      if (await isUsernameTaken(username)) {
        setFieldError(document.getElementById('field-username'), 'That username is already taken.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
        return;
      }
      if (await isUidTaken(uid)) {
        setFieldError(document.getElementById('field-uid'), 'That Free Fire UID is already registered.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
        return;
      }

      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName, photoURL: photoUrl || null });

      await db.collection('users').doc(cred.user.uid).set({
        username: username,
        usernameLower: username.toLowerCase(),
        displayName: displayName,
        email: email,
        ign: ign,
        uid: uid,
        age: Number(age),
        region: region,
        role: role,
        contact: contact,
        photoUrl: photoUrl || null,
        bio: bio || null,
        roleTag: 'Player',
        adminRole: 'player',
        status: 'OFFLINE',
        team: null,
        matchesPlayed: 0,
        wins: 0,
        kd: 0,
        verified: false,
        joinDate: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      showToast('Welcome to DARKNESS ESPORTS.');
      window.location.href = 'dashboard.html';
    } catch (err) {
      showAlert(alertEl, friendlyAuthError(err.code));
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  });
}

// ---------------- Login ----------------
function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('loginAlert');
    alertEl.classList.remove('show');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember')?.checked;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
      await auth.setPersistence(
        remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION
      );
      await auth.signInWithEmailAndPassword(email, password);
      window.location.href = 'dashboard.html';
    } catch (err) {
      showAlert(alertEl, friendlyAuthError(err.code));
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  });

  const forgotLink = document.getElementById('forgotPassword');
  if (forgotLink) {
    forgotLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const alertEl = document.getElementById('loginAlert');
      if (!email) {
        showAlert(alertEl, 'Enter your email above first, then click "Forgot password?"');
        return;
      }
      try {
        await auth.sendPasswordResetEmail(email);
        showAlert(alertEl, 'Password reset email sent. Check your inbox.', 'success');
      } catch (err) {
        showAlert(alertEl, friendlyAuthError(err.code));
      }
    });
  }
}

// ---------------- Dashboard guard ----------------
// Redirects to login if not authenticated; populates basic user info.
function initDashboardGuard() {
  const root = document.getElementById('dashboardRoot');
  if (!root) return;

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    const doc = await db.collection('users').doc(user.uid).get();
    const data = doc.exists ? doc.data() : {};

    document.getElementById('welcomeName').textContent = data.displayName || user.displayName || 'Player';
    document.getElementById('welcomeUsername').textContent = '@' + (data.username || 'unknown');

    const status = data.status && STATUS_META[data.status] ? data.status : 'OFFLINE';
    const statusPill = document.getElementById('welcomeStatus');
    statusPill.className = 'status-pill status-' + status;
    document.getElementById('welcomeStatusText').textContent = STATUS_META[status].label;

    const profileLink = document.getElementById('viewPublicProfileLink');
    if (profileLink && data.username) {
      profileLink.href = 'profile.html?u=' + encodeURIComponent(data.username);
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await auth.signOut();
        window.location.href = 'index.html';
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initRegisterForm();
  initLoginForm();
  initDashboardGuard();
});
