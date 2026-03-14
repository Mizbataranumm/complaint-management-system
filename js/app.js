// js/app.js - Core Application Logic

const isRender = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const API = isRender ? window.location.origin + '/api' : 'http://localhost:3000/api';
let currentUser = null;
let allComplaints = [];
let currentPage = 1;
const PAGE_SIZE = 8;
let sortCol = 'submittedAt';
let sortDir = -1;

// ─── Auth ────────────────────────────────────────────────────────────
function requireAuth() {
  const userData = sessionStorage.getItem('cms_user');
  if (!userData) {
    window.location.href = 'login.html';
    return null;
  }
  return JSON.parse(userData);
}

function logout() {
  sessionStorage.removeItem('cms_user');
  window.location.href = 'login.html';
}

// ─── API Helpers ─────────────────────────────────────────────────────
async function apiFetch(endpoint, opts = {}) {
  try {
    const res = await fetch(API + endpoint, {
      headers: { 'Content-Type': 'application/json', ...opts.headers },
      ...opts
    });
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    return { success: false, message: 'Network error. Is the server running?' };
  }
}

// ─── Toast Notifications ─────────────────────────────────────────────
function showToast(message, type = 'success') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(30px)'; toast.style.transition = '0.3s'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// ─── Navigation ───────────────────────────────────────────────────────
function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById(`page-${pageId}`);
  if (page) page.classList.add('active');
  const navItem = document.querySelector(`[data-page="${pageId}"]`);
  if (navItem) navItem.classList.add('active');
  updateHeaderTitle(pageId);
  loadPage(pageId);
}

function updateHeaderTitle(pageId) {
  const titles = {
    dashboard: { title: 'Dashboard', sub: 'Overview & Statistics' },
    submit: { title: 'Submit Complaint', sub: 'Report an issue' },
    mycomplaints: { title: 'My Complaints', sub: 'Track your complaints' },
    complaints: { title: 'All Complaints', sub: 'Manage & resolve complaints' },
    analytics: { title: 'Analytics', sub: 'Charts & Reports' },
    reports: { title: 'Reports', sub: 'Generate & export reports' },
    logs: { title: 'Activity Logs', sub: 'System activity history' },
    settings: { title: 'Settings', sub: 'System configuration' }
  };
  const t = titles[pageId] || { title: 'Dashboard', sub: '' };
  document.getElementById('header-title').textContent = t.title;
  document.getElementById('header-sub').textContent = t.sub;
}

async function loadPage(pageId) {
  switch (pageId) {
    case 'dashboard': await loadDashboard(); break;
    case 'complaints': await loadComplaintsTable(); break;
    case 'mycomplaints': await loadMyComplaints(); break;
    case 'analytics': await loadAnalytics(); break;
    case 'reports': await loadReports(); break;
    case 'logs': await loadLogs(); break;
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────
async function loadDashboard() {
  const data = await apiFetch('/analytics');
  if (!data.success) return;

  const s = data.stats;
  document.getElementById('stat-total').textContent = s.total;
  document.getElementById('stat-open').textContent = s.open;
  document.getElementById('stat-progress').textContent = s.inProgress;
  document.getElementById('stat-resolved').textContent = s.resolvedToday;
  document.getElementById('stat-escalated').textContent = s.escalated;
  document.getElementById('stat-avg').textContent = s.avgResolutionHours + 'h';

  renderDashboardCharts(data);
  loadRecentComplaints();
  loadActivityLogs();
}

async function loadRecentComplaints() {
  const data = await apiFetch('/complaints?limit=5');
  if (!data.success) return;
  const tbody = document.getElementById('recent-tbody');
  if (!data.complaints.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:24px">No complaints yet</td></tr>';
    return;
  }
  tbody.innerHTML = data.complaints.map(c => `
    <tr>
      <td><span class="table-link" onclick="openComplaintModal('${c.id}')">${c.id}</span></td>
      <td>${c.title}</td>
      <td>${c.category}</td>
      <td><span class="badge badge-${priorityClass(c.priority)}">${c.priority}</span></td>
      <td><span class="badge badge-${statusClass(c.status)}">${c.status}</span></td>
      <td>${formatDate(c.submittedAt)}</td>
    </tr>`).join('');
}

async function loadActivityLogs() {
  const data = await apiFetch('/logs');
  if (!data.success) return;
  const el = document.getElementById('activity-log-list');
  el.innerHTML = data.logs.slice(0, 8).map(l => `
    <div class="log-item">
      <div class="log-dot"></div>
      <div class="log-content">
        <div class="log-action">${l.action}</div>
        <div class="log-meta">
          <strong>${l.user}</strong> · ${l.role}
          ${l.complaintId ? `<span class="log-complaint-id">${l.complaintId}</span>` : ''}
          · ${formatDate(l.timestamp)}
        </div>
      </div>
    </div>`).join('');
}

// ─── Complaints Table (Admin) ─────────────────────────────────────────
async function loadComplaintsTable() {
  const status = document.getElementById('f-status')?.value || '';
  const category = document.getElementById('f-category')?.value || '';
  const dept = document.getElementById('f-dept')?.value || '';
  const search = document.getElementById('f-search')?.value || '';

  const query = new URLSearchParams({ page: currentPage, limit: PAGE_SIZE });
  if (status) query.set('status', status);
  if (category) query.set('category', category);
  if (dept) query.set('department', dept);
  if (search) query.set('search', search);

  const data = await apiFetch(`/complaints?${query}`);
  if (!data.success) return;

  allComplaints = data.complaints;
  renderComplaintsTable(data.complaints);
  renderPagination(data.total, data.page, data.limit, 'complaints');
}

function renderComplaintsTable(complaints) {
  const tbody = document.getElementById('complaints-tbody');
  if (!complaints.length) {
    tbody.innerHTML = `<tr><td colspan="10">
      <div class="empty-state"><div class="empty-icon">📋</div><h3>No complaints found</h3><p>Try adjusting your filters.</p></div>
    </td></tr>`;
    return;
  }
  tbody.innerHTML = complaints.map(c => `
    <tr>
      <td><span class="table-link font-mono" onclick="openComplaintModal('${c.id}')">${c.id}</span></td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${c.title}">${c.title}</td>
      <td>${c.category}</td>
      <td>${c.location}</td>
      <td>${c.submittedByName || '—'}</td>
      <td><span class="badge badge-${c.userRole || 'submitted'}">${c.userRole || '—'}</span></td>
      <td><span class="badge badge-${priorityClass(c.priority)}">${c.priority}</span></td>
      <td><span class="badge badge-${statusClass(c.status)}">${c.status}</span></td>
      <td>${c.assignedTo || '—'}</td>
      <td>${formatDate(c.submittedAt)}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-xs btn-outline" onclick="openComplaintModal('${c.id}')">View</button>
          ${currentUser.role === 'admin' ? `<button class="btn btn-xs btn-primary" onclick="openAssignModal('${c.id}')">Assign</button>` : ''}
        </div>
      </td>
    </tr>`).join('');
}

// ─── My Complaints ────────────────────────────────────────────────────
async function loadMyComplaints() {
  const data = await apiFetch(`/complaints?userId=${currentUser.id}&limit=50`);
  if (!data.success) return;
  const container = document.getElementById('my-complaints-list');
  if (!data.complaints.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><h3>No complaints yet</h3><p>Submit your first complaint using the sidebar.</p></div>`;
    return;
  }
  container.innerHTML = data.complaints.map(c => `
    <div class="card mb-20" style="overflow:visible">
      <div style="padding:18px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div>
          <span class="font-mono" style="color:var(--primary-light);font-weight:700;font-size:13px">${c.id}</span>
          <h3 style="font-size:15px;margin-top:4px">${c.title}</h3>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span class="badge badge-${priorityClass(c.priority)}">${c.priority}</span>
          <span class="badge badge-${statusClass(c.status)}">${c.status}</span>
          ${c.escalated ? '<span class="badge badge-escalated">⚠️ Escalated</span>' : ''}
        </div>
      </div>
      <div style="padding:16px 20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px">
        <div><div class="text-muted text-sm">Category</div><div style="font-weight:600;margin-top:2px">${c.category}</div></div>
        <div><div class="text-muted text-sm">Location</div><div style="font-weight:600;margin-top:2px">${c.location}</div></div>
        <div><div class="text-muted text-sm">Assigned To</div><div style="font-weight:600;margin-top:2px">${c.assignedTo || 'Pending'}</div></div>
        <div><div class="text-muted text-sm">Submitted</div><div style="font-weight:600;margin-top:2px">${formatDate(c.submittedAt)}</div></div>
        ${c.expectedResolution ? `<div><div class="text-muted text-sm">Expected By</div><div style="font-weight:600;margin-top:2px">${formatDate(c.expectedResolution)}</div></div>` : ''}
      </div>
      ${c.resolutionNotes ? `<div style="padding:0 20px 16px"><div style="background:var(--surface2);border-radius:8px;padding:12px;font-size:13px;color:var(--text-secondary)">📝 <strong>Update:</strong> ${c.resolutionNotes}</div></div>` : ''}
      <div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-sm btn-outline" onclick="openComplaintModal('${c.id}')">View Details</button>
        ${c.status === 'Resolved' && !c.feedback ? `<button class="btn btn-sm btn-success" onclick="openFeedbackModal('${c.id}')">⭐ Give Feedback</button>` : ''}
        ${c.feedback ? `<div style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--text-muted)">Your rating: ${starDisplay(c.feedback.rating)}</div>` : ''}
      </div>
    </div>`).join('');
}

// ─── Submit Complaint ─────────────────────────────────────────────────
async function submitComplaint(e) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('submit-btn');

  // Validate
  const title = form.title.value.trim();
  const description = form.description.value.trim();
  const category = form.category.value;
  const location = form.location.value;
  const priority = form.priority.value;

  if (title.length < 5) { showToast('Title must be at least 5 characters.', 'error'); return; }
  if (!description) { showToast('Description is required.', 'error'); return; }
  if (!category) { showToast('Please select a category.', 'error'); return; }
  if (!location) { showToast('Please select a location.', 'error'); return; }
  if (!priority) { showToast('Please select a priority level.', 'error'); return; }

  btn.innerHTML = '⏳ Submitting...';
  btn.disabled = true;

  const formData = new FormData(form);
  formData.set('submittedBy', currentUser.id);
  formData.set('submittedByName', currentUser.name);
  formData.set('userRole', currentUser.role);

  try {
    const res = await fetch(API + '/complaints', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (data.success) {
      showToast(data.message, 'success');
      form.reset();
      document.getElementById('file-name-display').textContent = '';
      setTimeout(() => navigateTo('mycomplaints'), 1500);
    } else {
      showToast(data.message || 'Failed to submit complaint.', 'error');
    }
  } catch (err) {
    showToast('Network error. Is the server running?', 'error');
  }

  btn.innerHTML = '📤 Submit Complaint';
  btn.disabled = false;
}

// ─── Complaint Detail Modal ───────────────────────────────────────────
async function openComplaintModal(id) {
  const data = await apiFetch(`/complaints/${id}`);
  if (!data.success) { showToast('Could not load complaint.', 'error'); return; }
  const c = data.complaint;

  const statusOrder = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
  const currentIdx = statusOrder.indexOf(c.status);

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-header">
      <div>
        <div class="font-mono" style="color:var(--primary-light);font-size:13px;font-weight:700">${c.id}</div>
        <div class="modal-title">${c.title}</div>
      </div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
        <span class="badge badge-${statusClass(c.status)}">${c.status}</span>
        <span class="badge badge-${priorityClass(c.priority)}">${c.priority}</span>
        ${c.escalated ? '<span class="badge badge-escalated">⚠️ Escalated</span>' : ''}
      </div>

      <div class="grid-2" style="margin-bottom:20px;gap:16px">
        <div><div class="text-muted text-sm">Category</div><div style="font-weight:600">${c.category}</div></div>
        <div><div class="text-muted text-sm">Location</div><div style="font-weight:600">${c.location}</div></div>
        <div><div class="text-muted text-sm">Submitted By</div><div style="font-weight:600">${c.submittedByName} (${c.userRole})</div></div>
        <div><div class="text-muted text-sm">Assigned To</div><div style="font-weight:600">${c.assignedTo || 'Not assigned'}</div></div>
        <div><div class="text-muted text-sm">Submitted</div><div style="font-weight:600">${formatDate(c.submittedAt)}</div></div>
        <div><div class="text-muted text-sm">Expected Resolution</div><div style="font-weight:600">${c.expectedResolution ? formatDate(c.expectedResolution) : '—'}</div></div>
        ${c.actualResolution ? `<div><div class="text-muted text-sm">Actual Resolution</div><div style="font-weight:600">${formatDate(c.actualResolution)}</div></div>` : ''}
        ${c.asset_id ? `<div><div class="text-muted text-sm">Asset ID</div><div class="font-mono">${c.asset_id}</div></div>` : ''}
      </div>

      <div style="margin-bottom:20px">
        <div class="text-muted text-sm" style="margin-bottom:6px">Description</div>
        <div style="background:var(--surface2);border-radius:8px;padding:14px;font-size:14px;line-height:1.6">${c.description}</div>
      </div>

      ${c.resolutionNotes ? `
      <div style="margin-bottom:20px">
        <div class="text-muted text-sm" style="margin-bottom:6px">Resolution Notes</div>
        <div style="background:var(--success-pale);border-radius:8px;padding:14px;font-size:14px;color:#065f46">${c.resolutionNotes}</div>
      </div>` : ''}

      ${c.attachment ? `
      <div style="margin-bottom:20px">
        <div class="text-muted text-sm" style="margin-bottom:6px">Attachment</div>
        <a href="${c.attachment}" target="_blank" class="btn btn-outline btn-sm">📎 View Attachment</a>
      </div>` : ''}

      <div style="margin-bottom:20px">
        <div class="text-muted text-sm" style="margin-bottom:10px">Status Timeline</div>
        <div class="timeline">
          ${statusOrder.map((s, i) => `
            <div class="timeline-item">
              <div class="timeline-dot ${i < currentIdx ? 'done' : i === currentIdx ? 'active' : ''}"></div>
              <div class="timeline-text">
                <div class="timeline-status" style="color:${i <= currentIdx ? 'var(--text)' : 'var(--text-muted)'}">${s}</div>
                ${i === 0 ? `<div class="timeline-time">${formatDate(c.submittedAt)}</div>` : ''}
                ${i === currentIdx && i > 0 ? `<div class="timeline-time">${formatDate(c.updatedAt)}</div>` : ''}
              </div>
            </div>`).join('')}
        </div>
      </div>

      ${c.feedback ? `
      <div style="background:var(--warning-pale);border-radius:8px;padding:14px;border:1px solid #fde68a">
        <div style="font-weight:600;margin-bottom:6px">⭐ User Feedback</div>
        <div style="display:flex;gap:4px;margin-bottom:4px">${starDisplay(c.feedback.rating)}</div>
        ${c.feedback.comment ? `<div style="font-size:13px;color:var(--text-secondary);margin-top:6px">"${c.feedback.comment}"</div>` : ''}
      </div>` : ''}

      ${currentUser.role === 'admin' ? `
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--border)">
        <div style="font-weight:700;margin-bottom:14px">⚙️ Admin Controls</div>
        <div class="form-grid" style="gap:12px">
          <div class="form-group">
            <label class="form-label">Update Status</label>
            <select class="form-control" id="modal-status" onchange="updateComplaint('${c.id}','status',this.value)">
              ${['Submitted','Under Review','Assigned','In Progress','Resolved','Closed','Rejected','Escalated'].map(s =>
                `<option value="${s}" ${c.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Assign To Department</label>
            <select class="form-control" id="modal-dept" onchange="updateComplaint('${c.id}','assignedTo',this.value)">
              ${['Maintenance','IT Department','Hostel Management','Lab Technicians','Electrical Department','Campus Administration'].map(d =>
                `<option value="${d}" ${c.assignedTo === d ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
          </div>
          <div class="form-group form-full">
            <label class="form-label">Resolution Notes</label>
            <textarea class="form-control" id="modal-notes" placeholder="Add resolution notes...">${c.resolutionNotes || ''}</textarea>
          </div>
        </div>
        <button class="btn btn-primary btn-sm mt-4" onclick="saveResolutionNotes('${c.id}')">💾 Save Notes</button>
      </div>` : ''}
    </div>`;

  document.getElementById('complaint-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('complaint-modal').classList.add('hidden');
}

async function updateComplaint(id, field, value) {
  const body = { [field]: value, updatedBy: currentUser.name, updatedByRole: currentUser.role };
  const data = await apiFetch(`/complaints/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  if (data.success) {
    showToast(`Complaint ${field} updated.`, 'success');
    loadComplaintsTable();
  } else {
    showToast(data.message, 'error');
  }
}

async function saveResolutionNotes(id) {
  const notes = document.getElementById('modal-notes').value;
  const status = document.getElementById('modal-status').value;
  const assignedTo = document.getElementById('modal-dept').value;
  const data = await apiFetch(`/complaints/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ resolutionNotes: notes, status, assignedTo, updatedBy: currentUser.name, updatedByRole: currentUser.role })
  });
  if (data.success) { showToast('Complaint updated successfully.', 'success'); closeModal(); loadComplaintsTable(); }
  else showToast(data.message, 'error');
}

// ─── Feedback Modal ───────────────────────────────────────────────────
function openFeedbackModal(id) {
  let rating = 0;
  document.getElementById('feedback-modal-content').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">⭐ Submit Feedback</div>
      <button class="modal-close" onclick="closeFeedbackModal()">✕</button>
    </div>
    <div class="modal-body">
      <p style="margin-bottom:16px;color:var(--text-secondary)">How satisfied are you with the resolution of complaint <strong>${id}</strong>?</p>
      <div style="margin-bottom:20px">
        <div class="form-label" style="margin-bottom:10px">Rating</div>
        <div class="star-rating" id="stars">
          ${[1,2,3,4,5].map(i => `<span class="star" data-val="${i}" onclick="setRating(${i})">★</span>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Comment (Optional)</label>
        <textarea class="form-control" id="feedback-comment" placeholder="Share your experience..."></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeFeedbackModal()">Cancel</button>
      <button class="btn btn-success" onclick="submitFeedback('${id}')">Submit Feedback</button>
    </div>`;
  document.getElementById('feedback-modal').classList.remove('hidden');
}

function setRating(val) {
  window._selectedRating = val;
  document.querySelectorAll('#stars .star').forEach((s, i) => {
    s.classList.toggle('active', i < val);
  });
}

function closeFeedbackModal() {
  document.getElementById('feedback-modal').classList.add('hidden');
}

async function submitFeedback(id) {
  const rating = window._selectedRating;
  if (!rating) { showToast('Please select a rating.', 'error'); return; }
  const comment = document.getElementById('feedback-comment').value;
  const data = await apiFetch(`/complaints/${id}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment, userId: currentUser.id })
  });
  if (data.success) { showToast('Feedback submitted. Thank you!', 'success'); closeFeedbackModal(); loadMyComplaints(); }
  else showToast(data.message, 'error');
}

// ─── Logs ─────────────────────────────────────────────────────────────
async function loadLogs() {
  const data = await apiFetch('/logs');
  if (!data.success) return;
  const el = document.getElementById('logs-list');
  el.innerHTML = data.logs.map(l => `
    <div class="log-item">
      <div class="log-dot"></div>
      <div class="log-content">
        <div class="log-action">${l.action}</div>
        <div class="log-meta">
          <strong>${l.user}</strong> · ${l.role}
          ${l.complaintId ? `<span class="log-complaint-id">${l.complaintId}</span>` : ''}
          · ${formatDate(l.timestamp)}
        </div>
      </div>
    </div>`).join('');
}

// ─── Reports ──────────────────────────────────────────────────────────
async function loadReports() {
  const data = await apiFetch('/reports/monthly');
  if (!data.success) return;
  const r = data.report;
  document.getElementById('report-period').textContent = r.period;
  document.getElementById('report-total').textContent = r.total;
  const statusEl = document.getElementById('report-status');
  statusEl.innerHTML = Object.entries(r.byStatus).map(([k, v]) =>
    `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span>${k}</span><strong>${v}</strong>
    </div>`).join('');
  const catEl = document.getElementById('report-category');
  catEl.innerHTML = Object.entries(r.byCategory).map(([k, v]) =>
    `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span>${k}</span><strong>${v}</strong>
    </div>`).join('');
}

function downloadReport() {
  const el = document.getElementById('reports-card');
  const text = `COLLEGE COMPLAINT MANAGEMENT SYSTEM\nMonthly Report\nGenerated: ${new Date().toLocaleString()}\n\n` +
    `Period: ${document.getElementById('report-period').textContent}\n` +
    `Total Complaints: ${document.getElementById('report-total').textContent}\n\n` +
    `Report downloaded from admin dashboard.`;
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `complaint-report-${new Date().toISOString().split('T')[0]}.txt`;
  a.click();
  showToast('Report downloaded!', 'success');
}

// ─── Pagination ───────────────────────────────────────────────────────
function renderPagination(total, page, limit, pageId) {
  const pages = Math.ceil(total / limit);
  const el = document.getElementById(`${pageId}-pagination`);
  if (!el) return;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  el.innerHTML = `
    <span>${start}–${end} of ${total} complaints</span>
    <div class="pagination-controls">
      <button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="changePage(${page - 1}, '${pageId}')">← Prev</button>
      ${Array.from({ length: Math.min(pages, 5) }, (_, i) => {
        const p = i + 1;
        return `<button class="page-btn ${p === page ? 'active' : ''}" onclick="changePage(${p}, '${pageId}')">${p}</button>`;
      }).join('')}
      <button class="page-btn" ${page >= pages ? 'disabled' : ''} onclick="changePage(${page + 1}, '${pageId}')">Next →</button>
    </div>`;
}

function changePage(page, pageId) {
  currentPage = page;
  if (pageId === 'complaints') loadComplaintsTable();
}

// ─── Helpers ──────────────────────────────────────────────────────────
function statusClass(status) {
  const map = {
    'Submitted': 'submitted', 'Under Review': 'review', 'Assigned': 'assigned',
    'In Progress': 'progress', 'Resolved': 'resolved', 'Closed': 'closed',
    'Rejected': 'rejected', 'Escalated': 'escalated'
  };
  return map[status] || 'submitted';
}

function priorityClass(priority) {
  const map = { 'Low': 'low', 'Medium': 'medium', 'High': 'high', 'Critical': 'critical' };
  return map[priority] || 'low';
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function starDisplay(rating) {
  return [1,2,3,4,5].map(i =>
    `<span class="star ${i <= rating ? 'active' : ''}" style="cursor:default">★</span>`).join('');
}

// ─── Init ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  currentUser = requireAuth();
  if (!currentUser) return;

  // Set user info in sidebar
  document.getElementById('sidebar-user-name').textContent = currentUser.name;
  document.getElementById('sidebar-user-role').textContent = currentUser.role;
  document.getElementById('sidebar-user-role').className = `user-role-badge role-${currentUser.role}`;
  document.getElementById('sidebar-avatar').textContent = currentUser.name.charAt(0).toUpperCase();

  // Hide admin-only nav items for non-admins
  if (currentUser.role !== 'admin') {
    document.querySelectorAll('[data-admin-only]').forEach(el => el.classList.add('hidden'));
  }
  if (currentUser.role === 'student' || currentUser.role === 'staff') {
    document.querySelectorAll('[data-staff-hidden]').forEach(el => el.classList.add('hidden'));
  }

  // Nav click handlers
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', logout);

  // File upload display
  const fileInput = document.getElementById('attachment');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      document.getElementById('file-name-display').textContent = file ? `📎 ${file.name}` : '';
    });
  }

  // Complaint form
  const complaintForm = document.getElementById('complaint-form');
  if (complaintForm) complaintForm.addEventListener('submit', submitComplaint);

  // Filter events
  ['f-status', 'f-category', 'f-dept'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => { currentPage = 1; loadComplaintsTable(); });
  });
  const searchEl = document.getElementById('f-search');
  if (searchEl) {
    let debounce;
    searchEl.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { currentPage = 1; loadComplaintsTable(); }, 400);
    });
  }

  // Clock
  const clockEl = document.getElementById('header-clock');
  if (clockEl) {
    setInterval(() => {
      clockEl.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }, 1000);
  }

  // Modal close on overlay click
  document.getElementById('complaint-modal')?.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
  document.getElementById('feedback-modal')?.addEventListener('click', function(e) {
    if (e.target === this) closeFeedbackModal();
  });

  // Start on dashboard
  navigateTo('dashboard');
});