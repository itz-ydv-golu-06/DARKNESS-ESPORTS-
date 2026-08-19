// ============================================================
// DARKNESS ESPORTS — shared UI behavior
// ============================================================

function initNavToggle() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => links.classList.toggle('open'));
}

function ensureToastStack() {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  return stack;
}

function showToast(message, duration = 3200) {
  const stack = ensureToastStack();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  stack.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// Reflects logged-in state in the navbar: swaps "Login/Join" for
// "Dashboard/Logout" once Firebase confirms an active session.
function initAuthAwareNav() {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions || typeof auth === 'undefined') return;

  auth.onAuthStateChanged((user) => {
    if (user) {
      navActions.innerHTML = `
        <a href="dashboard.html" class="btn btn-ghost btn-sm">Dashboard</a>
        <button class="btn btn-primary btn-sm" id="navLogoutBtn">Logout</button>
      `;
      document.getElementById('navLogoutBtn').addEventListener('click', async () => {
        await auth.signOut();
        window.location.href = 'index.html';
      });
    } else {
      navActions.innerHTML = `
        <a href="login.html" class="btn btn-ghost btn-sm">Login</a>
        <a href="register.html" class="btn btn-primary btn-sm">Join The Darkness</a>
      `;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNavToggle();
  initAuthAwareNav();
});
