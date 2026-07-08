// Handle auth state, form submissions, login, logout, and token check
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const alertBox = document.getElementById('alert-box');

  function showAlert(message, type = 'danger') {
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.className = `alert-box active bg-${type}-subtle text-${type}`;
    setTimeout(() => {
      alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }

  // 1. Check if user is already logged in on the landing page
  const currentPath = window.location.pathname;
  const isLandingPage = currentPath === '/' || currentPath === '/index.html';
  const hasToken = localStorage.getItem('token');
  const hasUser = localStorage.getItem('user');

  if (isLandingPage && hasToken && hasUser) {
    // Already authenticated, redirect to dashboard
    window.location.href = '/dashboard';
    return;
  }

  // 2. Handle Login Form Submit
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const usernameOrEmail = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Connecting... <span class="spinner" style="width: 14px; height: 14px; border-width: 2px; margin-left: 6px; display: inline-block;"></span>';

      try {
        const res = await API.post('/api/auth/login', { usernameOrEmail, password });
        if (res.success) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          window.location.href = '/dashboard';
        } else {
          showAlert(res.message || 'Login failed. Please check credentials.');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      } catch (err) {
        showAlert('Server connection failed. Is the server running?');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  // 3. Handle Register Form Submit
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const full_name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const username = document.getElementById('reg-username').value;
      const password = document.getElementById('reg-password').value;
      const role = document.getElementById('reg-role').value;

      if (password.length < 6) {
        showAlert('Password must be at least 6 characters long.');
        return;
      }

      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Creating account...';

      try {
        const res = await API.post('/api/auth/register', { full_name, email, username, password, role });
        if (res.success) {
          showAlert(res.message || 'Registration successful! You can now log in.', 'success');
          registerForm.reset();
          setTimeout(() => {
            switchAuthTab('login');
          }, 1500);
        } else {
          showAlert(res.message || 'Registration failed.');
        }
      } catch (err) {
        showAlert('Server connection failed. Is the server running?');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  // 4. Handle Theme Toggle on login page
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    const sunIcon = document.getElementById('theme-sun');
    const moonIcon = document.getElementById('theme-moon');
    
    // Check saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'light') {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    }

    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      let newTheme = 'dark';
      if (currentTheme === 'dark') {
        newTheme = 'light';
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
      } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
      }
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }
});

// Logout functionality accessible from anywhere
async function logoutUser() {
  try {
    await API.post('/api/auth/logout', {});
  } catch (e) {
    console.error('Logout error:', e);
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  }
}
