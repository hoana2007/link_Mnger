// GLOBAL STATE & CONFIGURATION
let allLinks = [];
let config = {
  scriptUrl: localStorage.getItem('script_url') || '',
  password: localStorage.getItem('app_password') || '123456'
};

// MOCK DATA FOR DEMO IF NO APPS SCRIPT URL IS PROVIDED
const MOCK_DATA = [
  { stt: 1, link: "https://tailwindcss.com/docs", description: "Tài liệu tra cứu CSS Tailwind tiện lợi", kind: "Thiết kế" },
  { stt: 2, link: "https://github.com", description: "Nền tảng lưu trữ mã nguồn mở & dự án cá nhân", kind: "Công nghệ" },
  { stt: 3, link: "https://chatgpt.com", description: "Trợ lý trí tuệ nhân tạo hỗ trợ lập trình", kind: "AI" },
  { stt: 4, link: "https://fontawesome.com/icons", description: "Kho biểu tượng Icon vector miễn phí phong phú", kind: "Thiết kế" },
  { stt: 5, link: "https://news.ycombinator.com", description: "Trang tin tức công nghệ Hacker News", kind: "Tin tức" }
];

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  checkAuth();
  
  const appScriptUrlInput = document.getElementById('app-script-url');
  const configPasswordInput = document.getElementById('config-password');
  
  if (appScriptUrlInput) appScriptUrlInput.value = config.scriptUrl;
  if (configPasswordInput) configPasswordInput.value = config.password;
});

// THEME MANAGEMENT (DARK / LIGHT MODE)
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
}

function toggleTheme() {
  if (document.documentElement.classList.contains('dark')) {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }
}

// AUTHENTICATION LOGIC
function checkAuth() {
  const token = localStorage.getItem('auth_token');
  const loginScreen = document.getElementById('login-screen');
  const appScreen = document.getElementById('app-screen');

  if (token) {
    if (loginScreen) loginScreen.classList.add('hidden');
    if (appScreen) appScreen.classList.remove('hidden');
    loadLinks();
  } else {
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (appScreen) appScreen.classList.add('hidden');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const pwdInput = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');
  
  errorEl.classList.add('hidden');
  loginBtn.disabled = true;
  loginBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang xác thực...</span>`;

  if (config.scriptUrl) {
    try {
      const res = await fetch(`${config.scriptUrl}?action=login&password=${encodeURIComponent(pwdInput)}`);
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('auth_token', data.token || 'AUTH_VALID');
        checkAuth();
      } else {
        errorEl.classList.remove('hidden');
      }
    } catch (err) {
      console.error(err);
      if (pwdInput === config.password) {
        localStorage.setItem('auth_token', 'LOCAL_AUTH');
        checkAuth();
      } else {
        errorEl.classList.remove('hidden');
      }
    }
  } else {
    if (pwdInput === config.password) {
      localStorage.setItem('auth_token', 'MOCK_AUTH');
      checkAuth();
    } else {
      errorEl.classList.remove('hidden');
    }
  }

  loginBtn.disabled = false;
  loginBtn.innerHTML = `<span>Đăng nhập</span> <i class="fa-solid fa-arrow-right text-sm"></i>`;
}

function handleLogout() {
  localStorage.removeItem('auth_token');
  checkAuth();
}

// DATA FETCHING & RENDERING
async function loadLinks() {
  showStatus('Đang tải dữ liệu từ Google Sheets...', 'info');
  
  if (config.scriptUrl) {
    try {
      const res = await fetch(`${config.scriptUrl}?action=getLinks`);
      const data = await res.json();
      if (data.success && Array.isArray(data.links)) {
        allLinks = data.links;
        hideStatus();
      } else {
        allLinks = MOCK_DATA;
        showStatus('Không kết nối được Google Sheet, hiển thị dữ liệu mẫu.', 'warning');
      }
    } catch (err) {
      console.error('Lỗi kết nối API:', err);
      allLinks = MOCK_DATA;
      showStatus('Đang dùng dữ liệu mẫu (chưa cấu hình API Apps Script hoặc lỗi CORS).', 'warning');
    }
  } else {
    allLinks = MOCK_DATA;
    showStatus('Đang hiển thị dữ liệu mẫu. Nhấn vào biểu tượng ⚙️ để dán URL Google Apps Script.', 'info');
  }

  updateKindFilterOptions();
  filterAndRenderLinks();
}

function updateKindFilterOptions() {
  const select = document.getElementById('kind-filter');
  if (!select) return;

  const currentSelected = select.value;
  const kinds = [...new Set(allLinks.map(item => item.kind).filter(Boolean))];
  
  select.innerHTML = `<option value="ALL">Tất cả thể loại (${allLinks.length})</option>`;
  kinds.forEach(k => {
    const count = allLinks.filter(item => item.kind === k).length;
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = `${k} (${count})`;
    select.appendChild(opt);
  });

  if (kinds.includes(currentSelected)) {
    select.value = currentSelected;
  }
}

function filterAndRenderLinks() {
  const searchInput = document.getElementById('search-input');
  const kindFilter = document.getElementById('kind-filter');
  
  const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const selectedKind = kindFilter ? kindFilter.value : 'ALL';

  const filtered = allLinks.filter(item => {
    const matchesKind = (selectedKind === 'ALL') || (item.kind === selectedKind);
    const matchesSearch = !searchQuery || 
      (item.link && item.link.toLowerCase().includes(searchQuery)) ||
      (item.description && item.description.toLowerCase().includes(searchQuery)) ||
      (item.kind && item.kind.toLowerCase().includes(searchQuery));
    return matchesKind && matchesSearch;
  });

  const badge = document.getElementById('total-count-badge');
  if (badge) badge.textContent = `${allLinks.length} link`;

  renderGrid(filtered);
}

function renderGrid(links) {
  const container = document.getElementById('links-container');
  const emptyState = document.getElementById('empty-state');

  if (!container) return;
  container.innerHTML = '';

  if (links.length === 0) {
    if (emptyState) {
      emptyState.classList.remove('hidden');
      emptyState.classList.add('flex');
    }
    return;
  }

  if (emptyState) {
    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');
  }

  links.forEach(item => {
    const domain = getDomainName(item.link);
    const card = document.createElement('div');
    card.className = "group relative bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 hover:border-brand-500/50 dark:hover:border-brand-500/50 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between";

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between gap-2 mb-3">
          <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-800/60">
            ${escapeHtml(item.kind || 'Chưa phân loại')}
          </span>
          <span class="text-[11px] font-mono text-slate-400 dark:text-slate-500">#${item.stt}</span>
        </div>

        <h4 class="font-semibold text-slate-900 dark:text-white text-base mb-1 line-clamp-1 group-hover:text-brand-500 transition-colors">
          ${escapeHtml(domain)}
        </h4>

        <p class="text-xs text-slate-600 dark:text-slate-300 mb-4 line-clamp-3 leading-relaxed">
          ${escapeHtml(item.description || 'Không có mô tả')}
        </p>
      </div>

      <div class="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2 mt-auto">
        <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer"
           class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1.5 truncate max-w-[200px]">
          <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
          <span class="truncate">${escapeHtml(item.link)}</span>
        </a>

        <div class="flex items-center gap-1 shrink-0">
          <button onclick="copyToClipboard('${escapeHtml(item.link)}')" title="Sao chép link"
                  class="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
            <i class="fa-regular fa-copy text-xs"></i>
          </button>
          <button onclick="handleDeleteLink(${item.stt})" title="Xóa link"
                  class="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all">
            <i class="fa-regular fa-trash-can text-xs"></i>
          </button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

// ACTIONS: ADD LINK
async function handleAddLink(e) {
  e.preventDefault();
  const url = document.getElementById('add-url').value.trim();
  const kind = document.getElementById('add-kind').value.trim();
  const description = document.getElementById('add-description').value.trim();
  const submitBtn = document.getElementById('add-submit-btn');

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang lưu...</span>`;

  if (config.scriptUrl) {
    try {
      const payload = {
        action: 'addLink',
        password: config.password,
        link: url,
        kind: kind,
        description: description
      };

      await fetch(config.scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      showStatus('Đã gửi yêu cầu thêm link thành công!', 'success');
      const newStt = allLinks.length > 0 ? Math.max(...allLinks.map(l => l.stt)) + 1 : 1;
      allLinks.unshift({ stt: newStt, link: url, kind: kind, description: description });
    } catch (err) {
      console.error(err);
      showStatus('Lỗi khi lưu link lên server!', 'error');
    }
  } else {
    const newStt = allLinks.length > 0 ? Math.max(...allLinks.map(l => l.stt)) + 1 : 1;
    allLinks.unshift({ stt: newStt, link: url, kind: kind, description: description });
    showStatus('Đã thêm link (Chế độ lưu tạm bộ nhớ)', 'success');
  }

  submitBtn.disabled = false;
  submitBtn.innerHTML = `<i class="fa-solid fa-check text-xs"></i> <span>Lưu Link</span>`;
  closeAddModal();
  document.getElementById('add-link-form').reset();
  updateKindFilterOptions();
  filterAndRenderLinks();
}

// ACTIONS: DELETE LINK
async function handleDeleteLink(stt) {
  if (!confirm(`Bạn có chắc chắn muốn xóa link có STT #${stt}?`)) return;

  if (config.scriptUrl) {
    try {
      await fetch(config.scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteLink', password: config.password, stt: stt })
      });
      showStatus(`Đã xóa link #${stt}`, 'success');
    } catch (err) {
      console.error(err);
    }
  }

  allLinks = allLinks.filter(item => item.stt !== stt);
  updateKindFilterOptions();
  filterAndRenderLinks();
}

// UTILS & MODAL CONTROLS
function openAddModal() { 
  const el = document.getElementById('add-modal');
  if (el) el.classList.remove('hidden'); 
}

function closeAddModal() { 
  const el = document.getElementById('add-modal');
  if (el) el.classList.add('hidden'); 
}

function openSettingsModal() { 
  const el = document.getElementById('settings-modal');
  if (el) el.classList.remove('hidden'); 
}

function closeSettingsModal() { 
  const el = document.getElementById('settings-modal');
  if (el) el.classList.add('hidden'); 
}

function saveSettings() {
  const url = document.getElementById('app-script-url').value.trim();
  const pwd = document.getElementById('config-password').value.trim() || '123456';
  
  localStorage.setItem('script_url', url);
  localStorage.setItem('app_password', pwd);
  config.scriptUrl = url;
  config.password = pwd;

  closeSettingsModal();
  showStatus('Đã lưu cấu hình Google Apps Script!', 'success');
  loadLinks();
}

function showStatus(msg, type = 'info') {
  const bar = document.getElementById('status-bar');
  if (!bar) return;

  bar.textContent = msg;
  bar.className = 'p-3 rounded-xl text-xs font-medium text-center border ';
  if (type === 'success') {
    bar.className += 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
  } else if (type === 'warning') {
    bar.className += 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
  } else if (type === 'error') {
    bar.className += 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800';
  } else {
    bar.className += 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-800';
  }
  bar.classList.remove('hidden');
  setTimeout(() => { bar.classList.add('hidden'); }, 5000);
}

function hideStatus() {
  const bar = document.getElementById('status-bar');
  if (bar) bar.classList.add('hidden');
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showStatus('Đã sao chép link vào bộ nhớ tạm!', 'success');
  });
}

function getDomainName(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch (e) {
    return url || 'Link';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}