// resources/js/app.js

// Default Laravel Vite entry
import '../css/app.css';
import axios from 'axios';

// Always send these on AJAX requests
axios.defaults.withCredentials = true;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
axios.defaults.headers.common['Accept'] = 'application/json';

// Read CSRF token from the meta tag Laravel outputs
const tokenMeta = document.querySelector('meta[name="csrf-token"]');

if (tokenMeta) {
  const token = tokenMeta.getAttribute('content') || '';

  // Expose globally if you ever need it outside axios
  window.__CSRF_TOKEN__ = token;

  // Let axios send it automatically on all requests
  axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
}

// Optional: auto-reload on 419 (CSRF/session expired)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 419) {
      // Session/CSRF expired: reload to get a fresh token/session
      window.location.reload();
    }

    return Promise.reject(error);
  }
);
