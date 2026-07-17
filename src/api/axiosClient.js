import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'http://localhost:8080',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  // セッションCookie(JSESSIONID)を別オリジン間でもやり取りするために必須。
  // これが無いと、ログイン自体は成功してもブラウザがCookieを送信せず、
  // 以降のAPI呼び出しが全て401になってしまう
  withCredentials: true,
});

/**
 * ブラウザのCookieから、指定した名前の値を取り出すヘルパー関数
 */
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * CSRFトークンをCookie（XSRF-TOKEN）から読み取り、
 * リクエストヘッダー（X-XSRF-TOKEN）に自動で載せるインターセプター。
 *
 * axios標準のXSRF自動送信機能は、別オリジン間（今回のような5173→8080）では
 * 動作しないことがあるため、自前でCookieを読み取り確実に送信する方式にしている
 */
axiosClient.interceptors.request.use((config) => {
  const csrfToken = getCookie('XSRF-TOKEN');
  if (csrfToken) {
    config.headers['X-XSRF-TOKEN'] = csrfToken;
  }
  return config;
});

export default axiosClient;