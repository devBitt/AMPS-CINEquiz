import axios from 'axios';
import { setAuthTokenGetter } from '@workspace/api-client-react';

// ── customFetch-based api-client token getter ─────────────────────────────────
// The generated api-client-react uses customFetch (native fetch), NOT axios.
// We must register a token getter so every admin call carries the Bearer header.
setAuthTokenGetter(() => {
  return typeof window !== 'undefined'
    ? localStorage.getItem('cinequiz_admin_token')
    : null;
});

// Get token from localStorage if it exists (for axios fallbacks)
const token = typeof window !== 'undefined' ? localStorage.getItem('cinequiz_admin_token') : null;

if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export const setAdminToken = (newToken: string | null) => {
  if (newToken) {
    localStorage.setItem('cinequiz_admin_token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  } else {
    localStorage.removeItem('cinequiz_admin_token');
    delete axios.defaults.headers.common['Authorization'];
  }
  // No need to re-register setAuthTokenGetter — it reads from localStorage dynamically.
};
