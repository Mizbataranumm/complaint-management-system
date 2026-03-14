require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { sendEmail } = require('./emailService');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve ALL static files from project root
const ROOT = path.join(__dirname, '..');
app.use(express.static(ROOT));
app.use('/uploads', express.static(path.join(ROOT, 'uploads')));

// ─── File Upload Config ───────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(ROOT, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/gif','application/pdf','video/mp4'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('File type not allowed'));
  }
});

// ─── Data Helpers ─────────────────────────────────────────────────────────────
const DATA_DIR = path.join(ROOT, 'data');
const readJSON = (f) => { try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')); } catch { return []; } };
const writeJSON = (f, d) => fs.writeFileSync(path.join(DATA_DIR, f), JSON.stringify(d, null, 2));

// ─── Department Routing ───────────────────────────────────────────────────────
const DEPT_ROUTING = {
  'Electricity': 'Electrical Department',
  'Internet / WiFi': 'IT Department',
  'Hostel Issues': 'Hostel Management',
  'Laboratory Equipment': 'Lab Technicians',
  'Infrastructure': 'Maintenance',
  'Water Supply': 'Maintenance',
  'Cleanliness': 'Campus Administration',
  'Furniture': 'Maintenance',
  'Safety': 'Campus Administration',
  'Other': 'Campus Administration'
};

const generateComplaintId = () => {
  const c = readJSON('complaints.json');
  const last = c.length > 0 ? parseInt(c[c.length-1].id.replace('CMP','')) : 1000;
  return `CMP${last + 1}`;
};

const logActivity = (action, user, role, complaintId = null) => {
  const logs = readJSON('logs.json');
  logs.unshift({ id: `LOG${Date.now()}`, action, user, role, timestamp: new Date().toISOString(), complaintId });
  writeJSON('logs.json', logs.slice(0, 200));
};

// ─── HEALTH ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'College CMS Running', time: new Date().toISOString() }));

// ─── AUTH ─────────────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) return res.status(400).json({ success: false, message: 'All fields are required.' });
  const users = readJSON('users.json');
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.role === role);
  if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password. Please try again.' });
  const { password: _, ...safeUser } = user;
  logActivity(`User logged in`, user.name, user.role);
  res.json({ success: true, user: safeUser, message: `Welcome back, ${user.name}!` });
});

app.post('/api/logout', (req, res) => res.json({ success: true }));

// Register new user
app.post('/api/register', (req, res) => {
  const { name, email, phone, password, role, department, rollNo } = req.body;
  if (!name || name.length < 2) return res.status(400).json({ success: false, message: 'Name must be at least 2 characters.' });
  if (!email || !email.includes('@')) return res.status(400).json({ success: false, message: 'Invalid email address.' });
  if (!phone || String(phone).length < 10) return res.status(400).json({ success: false, message: 'Phone must be at least 10 digits.' });
  if (!password || password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  if (!role) return res.status(400).json({ success: false, message: 'Role is required.' });
  const users = readJSON('users.json');
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
  }
  const lastId = users.length > 0 ? parseInt(users[users.length-1].id.replace('U','')) : 0;
  const newUser = { id: `U${String(lastId+1).padStart(3,'0')}`, name, email, password, role, department: department || '', phone, rollNo: rollNo || null };
  users.push(newUser);
  writeJSON('users.json', users);
  logActivity(`New user registered: ${name} (${role})`, name, role);
  res.json({ success: true, message: `Account created! Welcome, ${name}.` });
});

// ─── COMPLAINTS ───────────────────────────────────────────────────────────────
app.get('/api/complaints', (req, res) => {
  let complaints = readJSON('complaints.json');
  const { status, category, department, userId, search, page = 1, limit = 10 } = req.query;
  if (userId) complaints = complaints.filter(c => c.submittedBy === userId);
  if (status) complaints = complaints.filter(c => c.status === status);
  if (category) complaints = complaints.filter(c => c.category === category);
  if (department) complaints = complaints.filter(c => c.assignedTo === department);
  if (search) { const q = search.toLowerCase(); complaints = complaints.filter(c => c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || (c.submittedByName||'').toLowerCase().includes(q)); }
  complaints.sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const total = complaints.length;
  const start = (parseInt(page)-1) * parseInt(limit);
  res.json({ success: true, complaints: complaints.slice(start, start+parseInt(limit)), total, page: parseInt(page), limit: parseInt(limit) });
});

app.get('/api/complaints/:id', (req, res) => {
  const c = readJSON('complaints.json').find(c => c.id === req.params.id);
  if (!c) return res.status(404).json({ success: false, message: 'Complaint not found.' });
  res.json({ success: true, complaint: c });
});

app.post('/api/complaints', upload.single('attachment'), async (req, res) => {
  try {
    const { title, description, category, location, priority, submittedBy, submittedByName, userRole, asset_id, hostel_room_id, lab_equipment_id } = req.body;
    if (!title || title.length < 5) return res.status(400).json({ success: false, message: 'Title must be at least 5 characters.' });
    if (!description) return res.status(400).json({ success: false, message: 'Description is required.' });
    if (!category) return res.status(400).json({ success: false, message: 'Category is required.' });
    if (!location) return res.status(400).json({ success: false, message: 'Location is required.' });
    if (!priority) return res.status(400).json({ success: false, message: 'Priority is required.' });
    const id = generateComplaintId();
    const now = new Date().toISOString();
    const hrs = priority === 'Critical' ? 4 : priority === 'High' ? 24 : priority === 'Medium' ? 72 : 168;
    const newComplaint = {
      id, title, description, category, location, priority, status: 'Submitted',
      submittedBy: submittedBy || 'unknown', submittedByName: submittedByName || 'Unknown',
      userRole: userRole || 'student', assignedTo: DEPT_ROUTING[category] || 'Campus Administration',
      submittedAt: now, updatedAt: now,
      expectedResolution: new Date(Date.now() + hrs*3600000).toISOString(),
      actualResolution: null, resolutionNotes: '',
      attachment: req.file ? `/uploads/${req.file.filename}` : null,
      feedback: null, escalated: false,
      asset_id: asset_id||null, hostel_room_id: hostel_room_id||null, lab_equipment_id: lab_equipment_id||null
    };
    const complaints = readJSON('complaints.json');
    complaints.push(newComplaint);
    writeJSON('complaints.json', complaints);
    logActivity(`Submitted complaint ${id}: ${title}`, submittedByName||'User', userRole||'student', id);
    const users = readJSON('users.json');
    const user = users.find(u => u.id === submittedBy);
    if (user && user.email) await sendEmail(user.email, 'complaintSubmitted', newComplaint, user);
    res.json({ success: true, complaint: newComplaint, message: `Complaint submitted successfully. Complaint ID: ${id}` });
  } catch(e) { console.error(e); res.status(500).json({ success: false, message: 'Server error.' }); }
});

app.put('/api/complaints/:id', async (req, res) => {
  const complaints = readJSON('complaints.json');
  const idx = complaints.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found.' });
  const { status, assignedTo, resolutionNotes, updatedBy, updatedByRole } = req.body;
  const c = { ...complaints[idx] };
  if (status) c.status = status;
  if (assignedTo !== undefined) c.assignedTo = assignedTo;
  if (resolutionNotes !== undefined) c.resolutionNotes = resolutionNotes;
  if (status === 'Escalated') c.escalated = true;
  if (status === 'Resolved' || status === 'Closed') c.actualResolution = new Date().toISOString();
  c.updatedAt = new Date().toISOString();
  complaints[idx] = c;
  writeJSON('complaints.json', complaints);
  logActivity(`Updated complaint ${c.id} → ${c.status}`, updatedBy||'Admin', updatedByRole||'admin', c.id);
  const users = readJSON('users.json');
  const user = users.find(u => u.id === c.submittedBy);
  if (user && user.email) {
    if (status === 'Assigned' || status === 'In Progress') await sendEmail(user.email, 'complaintAssigned', c, user);
    if (status === 'Resolved') await sendEmail(user.email, 'complaintResolved', c, user);
    if (status === 'Escalated') await sendEmail(user.email, 'complaintEscalated', c, user);
  }
  res.json({ success: true, complaint: c });
});

app.post('/api/complaints/:id/feedback', (req, res) => {
  const complaints = readJSON('complaints.json');
  const idx = complaints.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found.' });
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ success: false, message: 'Rating must be 1-5.' });
  complaints[idx].feedback = { rating: parseInt(rating), comment: comment||'', submittedAt: new Date().toISOString() };
  complaints[idx].status = 'Closed';
  complaints[idx].updatedAt = new Date().toISOString();
  writeJSON('complaints.json', complaints);
  res.json({ success: true, message: 'Feedback submitted. Complaint closed.' });
});

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
app.get('/api/analytics', (req, res) => {
  const complaints = readJSON('complaints.json');
  const today = new Date().toDateString();
  const statusCounts = {};
  ['Submitted','Under Review','Assigned','In Progress','Resolved','Closed','Rejected','Escalated'].forEach(s => { statusCounts[s] = complaints.filter(c => c.status === s).length; });
  const categoryData = {}, deptData = {}, monthly = {};
  complaints.forEach(c => { categoryData[c.category] = (categoryData[c.category]||0)+1; if(c.assignedTo) deptData[c.assignedTo] = (deptData[c.assignedTo]||0)+1; });
  for (let i=5; i>=0; i--) { const d = new Date(new Date().getFullYear(), new Date().getMonth()-i, 1); monthly[d.toLocaleString('default',{month:'short',year:'2-digit'})] = 0; }
  complaints.forEach(c => { const k = new Date(c.submittedAt).toLocaleString('default',{month:'short',year:'2-digit'}); if(monthly[k]!==undefined) monthly[k]++; });
  const resolved = complaints.filter(c => c.actualResolution && c.submittedAt);
  const avgResolutionHours = resolved.length > 0 ? Math.round(resolved.reduce((s,c) => s+(new Date(c.actualResolution)-new Date(c.submittedAt))/3600000, 0)/resolved.length) : 0;
  res.json({
    success: true,
    stats: { total: complaints.length, open: (statusCounts['Submitted']||0)+(statusCounts['Under Review']||0)+(statusCounts['Assigned']||0), inProgress: statusCounts['In Progress']||0, resolvedToday: complaints.filter(c => c.actualResolution && new Date(c.actualResolution).toDateString()===today).length, escalated: complaints.filter(c=>c.escalated).length, avgResolutionHours },
    statusCounts, categoryData, deptData, monthly
  });
});

app.get('/api/reports/monthly', (req, res) => {
  const complaints = readJSON('complaints.json');
  const m = req.query.month ? parseInt(req.query.month)-1 : new Date().getMonth();
  const y = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
  const filtered = complaints.filter(c => { const d = new Date(c.submittedAt); return d.getMonth()===m && d.getFullYear()===y; });
  res.json({ success: true, report: { period: `${new Date(y,m).toLocaleString('default',{month:'long'})} ${y}`, total: filtered.length, byStatus: filtered.reduce((a,c)=>{a[c.status]=(a[c.status]||0)+1;return a},{}), byCategory: filtered.reduce((a,c)=>{a[c.category]=(a[c.category]||0)+1;return a},{}), complaints: filtered }});
});

app.get('/api/logs', (req, res) => res.json({ success: true, logs: readJSON('logs.json').slice(0, 50) }));

app.post('/api/send-email', async (req, res) => {
  const { to, type, complaintId } = req.body;
  const c = readJSON('complaints.json').find(c => c.id === complaintId);
  if (!c) return res.status(404).json({ success: false, message: 'Complaint not found.' });
  const user = readJSON('users.json').find(u => u.id === c.submittedBy) || { name: c.submittedByName, email: to };
  res.json(await sendEmail(to, type, c, user));
});

// ─── Auto-Escalation ──────────────────────────────────────────────────────────
const checkEscalations = () => {
  const complaints = readJSON('complaints.json');
  const now = new Date(); let updated = false;
  for (const c of complaints) {
    if (['Resolved','Closed','Rejected','Escalated'].includes(c.status)) continue;
    const hrs = (now - new Date(c.submittedAt)) / 3600000;
    if (hrs >= 24 && !c.escalated) {
      c.status = 'Escalated'; c.escalated = true; c.updatedAt = now.toISOString();
      c.resolutionNotes = (c.resolutionNotes||'') + '\n[System] Auto-escalated after 24 hours.';
      updated = true;
    }
  }
  if (updated) writeJSON('complaints.json', complaints);
};
setInterval(checkEscalations, 30*60*1000);

// ─── Serve Frontend Pages ─────────────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'login.html')));
app.get('/login', (req, res) => res.sendFile(path.join(ROOT, 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(ROOT, 'dashboard.html')));
app.get('/register', (req, res) => res.sendFile(path.join(ROOT, 'register.html')));

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║   🏛️  College Complaint Management System            ║`);
  console.log(`╠══════════════════════════════════════════════════════╣`);
  console.log(`║   Server running at: http://localhost:${PORT}           ║`);
  console.log(`║   Admin:    admin@college.edu    / Admin@123         ║`);
  console.log(`║   Student:  student@college.edu  / Student@123       ║`);
  console.log(`╚══════════════════════════════════════════════════════╝\n`);
});

module.exports = app;