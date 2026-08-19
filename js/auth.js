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

// ---------------- Registration ----------------
function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('registerAlert');
    alertEl.classList.remove('show');

    const usernameField = document.getElementById('field-username');
    const displayNameField = document.getElementById('field-displayName');
    const emailField = document.getElementById('field-email');
    const passwordField = document.getElementById('field-password');
    const confirmField = document.getElementById('field-confirm');

    [usernameField, displayNameField, emailField, passwordField, confirmField].forEach(clearFieldError);

    const username = document.getElementById('username').value.trim();
    const displayName = document.getElementById('displayName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm').value;

    let hasError = false;
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setFieldError(usernameField, '3-20 characters: letters, numbers, underscores only.');
      hasError = true;
    }
    if (displayName.length < 2) {
      setFieldError(displayNameField, 'Please enter a display name.');
      hasError = true;
    }
    if (password.length < 6) {
      setFieldError(passwordField, 'Password must be at least 6 characters.');
      hasError = true;
    }
    if (password !== confirm) {
      setFieldError(confirmField, 'Passwords do not match.');
      hasError = true;
    }
    if (hasError) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
      if (await isUsernameTaken(username)) {
        setFieldError(usernameField, 'That username is already taken.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
        return;
      }

      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName });

      await db.collection('users').doc(cred.user.uid).set({
        username: username,
        usernameLower: username.toLowerCase(),
        displayName: displayName,
        email: email,
        roleTag: 'Player',
        adminRole: 'player',
        status: 'OFFLINE',
        profileComplete: false,
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
    document.getElementById('welcomeStatus').textContent = data.status || 'OFFLINE';

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
