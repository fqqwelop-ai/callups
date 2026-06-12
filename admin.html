<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin Panel - CoopBot</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');

  :root {
    --bg: #080a12;
    --surface: #0f1220;
    --surface2: #141828;
    --border: #1e2540;
    --accent: #e84393;
    --text: #e3e8f4;
    --muted: #6b7694;
    --success: #3ba55c;
    --danger: #ed4245;
    --radius: 12px;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Tajawal', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
  }

  #login-screen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(ellipse at 50% 0%, #2d0a25 0%, var(--bg) 70%);
  }

  .login-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 48px 40px;
    width: 100%;
    max-width: 380px;
    text-align: center;
  }

  .login-logo {
    width: 64px; height: 64px;
    background: linear-gradient(135deg, var(--accent), #b52f6a);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 28px;
    margin: 0 auto 20px;
  }

  .login-card h1 { font-size: 22px; font-weight: 800; margin-bottom: 6px; }
  .login-card p { color: var(--muted); font-size: 14px; margin-bottom: 28px; }

  .form-group { margin-bottom: 14px; text-align: right; }
  .form-group label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 5px; }
  .form-group input {
    width: 100%;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 11px 14px;
    color: var(--text);
    font-family: 'Tajawal', sans-serif;
    font-size: 14px;
    outline: none;
    transition: border-color .2s;
  }
  .form-group input:focus { border-color: var(--accent); }

  .btn {
    padding: 11px 22px;
    border-radius: 10px;
    border: none;
    font-family: 'Tajawal', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all .2s;
  }

  .btn-primary { background: var(--accent); color: #fff; width: 100%; }
  .btn-primary:hover { opacity: .9; }
  .btn-success { background: var(--success); color: #fff; }
  .btn-success:hover { opacity: .9; }
  .btn-danger { background: var(--danger); color: #fff; }
  .btn-danger:hover { opacity: .9; }
  .btn-sm { padding: 7px 14px; font-size: 13px; }
  .btn-secondary { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }

  .error-msg {
    background: rgba(237,66,69,.15);
    border: 1px solid rgba(237,66,69,.3);
    color: #ff7a7d;
    padding: 9px 12px;
    border-radius: 8px;
    font-size: 13px;
    margin-top: 10px;
    display: none;
  }

  /* ===== Admin Panel ===== */
  #admin-panel { display: none; }

  .top-bar {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 0 32px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .top-bar-logo { display: flex; align-items: center; gap: 10px; font-weight: 800; }
  .top-bar-logo span { color: var(--accent); }

  .main { padding: 32px; max-width: 1100px; margin: 0 auto; }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .section-header h2 { font-size: 18px; font-weight: 800; }

  /* ===== Add Client Modal ===== */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    display: none;
  }

  .modal-overlay.open { display: flex; }

  .modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 32px;
    width: 100%;
    max-width: 480px;
  }

  .modal h3 { font-size: 18px; font-weight: 800; margin-bottom: 20px; }

  /* ===== Clients Table ===== */
  .clients-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--surface);
    border-radius: var(--radius);
    overflow: hidden;
    border: 1px solid var(--border);
  }

  .clients-table th {
    text-align: right;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    color: var(--muted);
    font-size: 13px;
    font-weight: 600;
    background: var(--surface2);
  }

  .clients-table td {
    padding: 14px 16px;
    border-bottom: 1px solid rgba(30,37,64,.5);
    font-size: 14px;
    vertical-align: middle;
  }

  .clients-table tr:last-child td { border-bottom: none; }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  }

  .status-active { background: rgba(59,165,92,.15); color: var(--success); }
  .status-inactive { background: rgba(237,66,69,.15); color: var(--danger); }
  .status-online { background: rgba(59,165,92,.15); color: var(--success); }
  .status-offline { background: rgba(107,118,148,.15); color: var(--muted); }

  .actions { display: flex; gap: 8px; }

  /* ===== Stats bar ===== */
  .stats-bar {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 28px;
  }

  .stat-mini {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 18px 20px;
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .stat-mini-icon { font-size: 28px; }
  .stat-mini-value { font-size: 22px; font-weight: 900; }
  .stat-mini-label { font-size: 13px; color: var(--muted); }

  #toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(80px);
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 11px 22px;
    border-radius: 30px;
    font-size: 14px;
    transition: transform .3s;
    z-index: 9999;
  }

  #toast.show { transform: translateX(-50%) translateY(0); }
</style>
</head>
<body>

<!-- Login -->
<div id="login-screen">
  <div class="login-card">
    <div class="login-logo">👑</div>
    <h1>لوحة الأدمن</h1>
    <p>للدخول أدخل كلمة مرور الأدمن</p>
    <div class="form-group">
      <label>كلمة مرور الأدمن</label>
      <input type="password" id="admin-pass" placeholder="••••••••" onkeydown="if(event.key==='Enter')doAdminLogin()">
    </div>
    <button class="btn btn-primary" onclick="doAdminLogin()">دخول</button>
    <div class="error-msg" id="admin-error"></div>
  </div>
</div>

<!-- Admin Panel -->
<div id="admin-panel">
  <div class="top-bar">
    <div class="top-bar-logo">
      👑 <span>Admin Panel</span> — CoopBot
    </div>
    <button class="btn btn-secondary btn-sm" onclick="doLogout()">تسجيل خروج</button>
  </div>

  <div class="main">
    <!-- Stats -->
    <div class="stats-bar">
      <div class="stat-mini">
        <div class="stat-mini-icon">🏪</div>
        <div>
          <div class="stat-mini-value" id="s-total">--</div>
          <div class="stat-mini-label">إجمالي العملاء</div>
        </div>
      </div>
      <div class="stat-mini">
        <div class="stat-mini-icon">🟢</div>
        <div>
          <div class="stat-mini-value" id="s-active">--</div>
          <div class="stat-mini-label">بوتات نشطة</div>
        </div>
      </div>
      <div class="stat-mini">
        <div class="stat-mini-icon">🔴</div>
        <div>
          <div class="stat-mini-value" id="s-inactive">--</div>
          <div class="stat-mini-label">غير نشطة</div>
        </div>
      </div>
    </div>

    <!-- Clients -->
    <div class="section-header">
      <h2>📋 العملاء</h2>
      <button class="btn btn-success" onclick="openAddModal()">➕ إضافة عميل</button>
    </div>

    <table class="clients-table" id="clients-table">
      <thead>
        <tr>
          <th>اسم السيرفر</th>
          <th>Guild ID</th>
          <th>حالة البوت</th>
          <th>حالة الحساب</th>
          <th>الإجراءات</th>
        </tr>
      </thead>
      <tbody id="clients-tbody">
        <tr><td colspan="5" style="text-align:center;padding:40px;color:var(--muted)">جاري التحميل...</td></tr>
      </tbody>
    </table>
  </div>
</div>

<!-- Add Client Modal -->
<div class="modal-overlay" id="add-modal">
  <div class="modal">
    <h3>➕ إضافة عميل جديد</h3>
    <div class="form-group">
      <label>Guild ID (آيدي السيرفر) *</label>
      <input type="text" id="new-guild-id" placeholder="123456789012345678">
    </div>
    <div class="form-group">
      <label>توكن البوت *</label>
      <input type="text" id="new-token" placeholder="Bot Token">
    </div>
    <div class="form-group">
      <label>كلمة مرور الداشبورد للعميل *</label>
      <input type="password" id="new-password" placeholder="كلمة مرور قوية">
    </div>
    <div class="form-group">
      <label>Discord ID للمالك (اختياري)</label>
      <input type="text" id="new-owner" placeholder="آيدي ديسكورد">
    </div>
    <div id="add-error" class="error-msg"></div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="btn btn-success" onclick="addClient()" style="flex:1">إضافة وتشغيل البوت</button>
      <button class="btn btn-secondary" onclick="closeAddModal()" style="flex:0;white-space:nowrap">إلغاء</button>
    </div>
  </div>
</div>

<div id="toast"></div>

<script>
function showToast(msg, ok = true) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.borderColor = ok ? '#3ba55c' : '#ed4245';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

async function doAdminLogin() {
  const password = document.getElementById('admin-pass').value;
  const errEl = document.getElementById('admin-error');
  try {
    const res = await fetch('/admin/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error;
      errEl.style.display = 'block';
      return;
    }
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    loadClients();
  } catch(e) {
    errEl.textContent = 'خطأ في الاتصال';
    errEl.style.display = 'block';
  }
}

async function doLogout() {
  await fetch('/admin/api/logout', { method: 'POST', credentials: 'include' });
  location.reload();
}

async function loadClients() {
  const res = await fetch('/admin/api/clients', { credentials: 'include' });
  if (!res.ok) return;
  const clients = await res.json();

  const total = clients.length;
  const active = clients.filter(c => c.botActive).length;
  document.getElementById('s-total').textContent = total;
  document.getElementById('s-active').textContent = active;
  document.getElementById('s-inactive').textContent = total - active;

  const tbody = document.getElementById('clients-tbody');
  if (!clients.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--muted)">لا يوجد عملاء</td></tr>';
    return;
  }

  tbody.innerHTML = clients.map(c => `
    <tr>
      <td><strong>${c.guildName || 'Unknown'}</strong></td>
      <td><code style="background:var(--surface2);padding:2px 8px;border-radius:4px;font-size:12px">${c.guildId}</code></td>
      <td>
        <span class="status-badge ${c.botActive ? 'status-online' : 'status-offline'}">
          ${c.botActive ? '🟢 نشط' : '⚫ متوقف'}
        </span>
      </td>
      <td>
        <span class="status-badge ${c.isActive ? 'status-active' : 'status-inactive'}">
          ${c.isActive ? '✅ مفعّل' : '❌ موقوف'}
        </span>
      </td>
      <td>
        <div class="actions">
          <button class="btn btn-sm ${c.isActive ? 'btn-danger' : 'btn-success'}" 
            onclick="toggleClient('${c.guildId}', ${!c.isActive})">
            ${c.isActive ? 'إيقاف' : 'تفعيل'}
          </button>
          <button class="btn btn-sm btn-secondary" onclick="restartBot('${c.guildId}')">🔄</button>
          <button class="btn btn-sm btn-danger" onclick="deleteClient('${c.guildId}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openAddModal() {
  document.getElementById('add-modal').classList.add('open');
}

function closeAddModal() {
  document.getElementById('add-modal').classList.remove('open');
  document.getElementById('add-error').style.display = 'none';
}

async function addClient() {
  const errEl = document.getElementById('add-error');
  const body = {
    guildId: document.getElementById('new-guild-id').value.trim(),
    botToken: document.getElementById('new-token').value.trim(),
    password: document.getElementById('new-password').value,
    ownerDiscordId: document.getElementById('new-owner').value.trim(),
  };

  if (!body.guildId || !body.botToken || !body.password) {
    errEl.textContent = 'الحقول المطلوبة ناقصة';
    errEl.style.display = 'block';
    return;
  }

  try {
    const res = await fetch('/admin/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error;
      errEl.style.display = 'block';
      return;
    }
    closeAddModal();
    showToast('✅ تم إضافة العميل وتشغيل البوت!');
    loadClients();
    // Reset form
    ['new-guild-id','new-token','new-password','new-owner'].forEach(id => document.getElementById(id).value = '');
  } catch(e) {
    errEl.textContent = 'خطأ في الاتصال';
    errEl.style.display = 'block';
  }
}

async function toggleClient(guildId, isActive) {
  const res = await fetch(`/admin/api/clients/${guildId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ isActive })
  });
  if (res.ok) {
    showToast(isActive ? '✅ تم تفعيل العميل' : '🛑 تم إيقاف العميل');
    loadClients();
  }
}

async function restartBot(guildId) {
  const res = await fetch(`/admin/api/clients/${guildId}/restart`, {
    method: 'POST',
    credentials: 'include'
  });
  showToast(res.ok ? '🔄 تم إعادة تشغيل البوت' : '❌ فشل إعادة التشغيل', res.ok);
}

async function deleteClient(guildId) {
  if (!confirm('هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع!')) return;
  const res = await fetch(`/admin/api/clients/${guildId}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (res.ok) {
    showToast('🗑️ تم حذف العميل');
    loadClients();
  }
}

// Check admin session on load
(async () => {
  const res = await fetch('/admin/api/clients', { credentials: 'include' });
  if (res.ok) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    loadClients();
  }
})();

// Close modal on overlay click
document.getElementById('add-modal').addEventListener('click', function(e) {
  if (e.target === this) closeAddModal();
});
</script>
</body>
</html>
