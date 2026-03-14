// backend/server.js
// College Complaint Management System - Main Server

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
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── File Upload Config ───────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'video/mp4'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only images, PDFs, and MP4 videos are allowed'));
  }
});

// ─── Data Helpers ─────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, '..', 'data');

const readJSON = (filename) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf8'));
  } catch { return []; }
};

const writeJSON = (filename, data) => {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
};

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

// Generate complaint ID
const generateComplaintId = () => {
  const complaints = readJSON('complaints.json');
  const lastId = complaints.length > 0
    ? parseInt(complaints[complaints.length - 1].id.replace('CMP', ''))
    : 1000;
  return `CMP${lastId + 1}`;
};

// Log activity
const logActivity = (action, user, role, complaintId = null) => {
  const logs = readJSON('logs.json');
  logs.unshift({
    id: `LOG${Date.now()}`,
    action,
    user,
    role,
    timestamp: new Date().toISOString(),
    complaintId
  });
  writeJSON('logs.json', logs.slice(0, 200)); // Keep last 200 logs
};

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'College CMS Server Running', time: new Date().toISOString() });
});

// ─── AUTH ─────────────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ success: false, message: 'Email, password, and role are required.' });
  }

  const users = readJSON('users.json');
  const user = users.find(u =>
    u.email.toLowerCase() === email.toLowerCase() &&
    u.password === password &&
    u.role === role
  );

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password. Please try again.' });
  }

  const { password: _, ...safeUser } = user;
  logActivity(`User logged in`, user.name, user.role);

  res.json({ success: true, user: safeUser, message: `Welcome back, ${user.name}!` });
});

app.post('/api/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Register new user
app.post("/api/register", (req, res) => {
  const { name, email, phone, password, role, department, rollNo } = req.body;
  if (!name || name.length < 2) return res.status(400).json({ success: false, message: "Name must be at least 2 characters." });
  if (!email || !email.includes("@")) return res.status(400).json({ success: false, message: "Invalid email address." });
  if (!phone || String(phone).length < 10) return res.status(400).json({ success: false, message: "Phone must be at least 10 digits." });
  if (!password || password.length < 6) return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
  if (!role) return res.status(400).json({ success: false, message: "Role is required." });
  const users = readJSON("users.json");
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ success: false, message: "An account with this email already exists." });
  }
  const lastId = users.length > 0 ? parseInt(users[users.length - 1].id.replace("U", "")) : 0;
  const newUser = { id: "U" + String(lastId + 1).padStart(3, "0"), name, email, password, role, department: department || "", phone, rollNo: rollNo || null };
  users.push(newUser);
  writeJSON("users.json", users);
  logActivity("New user registered: " + name + " (" + role + ")", name, role);
  res.json({ success: true, message: "Account created successfully! Welcome, " + name + "." });
});

// ─── COMPLAINTS ───────────────────────────────────────────────────────────────

// Get all complaints (with filters)
app.get('/api/complaints', (req, res) => {
  let complaints = readJSON('complaints.json');
  const { status, category, department, userId, search, page = 1, limit = 10 } = req.query;

  if (userId) complaints = complaints.filter(c => c.submittedBy === userId);
  if (status) complaints = complaints.filter(c => c.status === status);
  if (category) complaints = complaints.filter(c => c.category === category);
  if (department) complaints = complaints.filter(c => c.assignedTo === department);
  if (search) {
    const q = search.toLowerCase();
    complaints = complaints.filter(c =>
      c.id.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.submittedByName?.toLowerCase().includes(q)
    );
  }

  // Sort newest first
  complaints.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  // Pagination
  const total = complaints.length;
  const start = (parseInt(page) - 1) * parseInt(limit);
  const paginated = complaints.slice(start, start + parseInt(limit));

  res.json({ success: true, complaints: paginated, total, page: parseInt(page), limit: parseInt(limit) });
});

// Get single complaint
app.get('/api/complaints/:id', (req, res) => {
  const complaints = readJSON('complaints.json');
  const complaint = complaints.find(c => c.id === req.params.id);
  if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' });
  res.json({ success: true, complaint });
});

// Submit new complaint
app.post('/api/complaints', upload.single('attachment'), async (req, res) => {
  try {
    const { title, description, category, location, priority, submittedBy, submittedByName, userRole,
            asset_id, hostel_room_id, lab_equipment_id, employee_id } = req.body;

    // Validation
    if (!title || title.length < 5) return res.status(400).json({ success: false, message: 'Title must be at least 5 characters.' });
    if (!description) return res.status(400).json({ success: false, message: 'Description is required.' });
    if (!category) return res.status(400).json({ success: false, message: 'Category is required.' });
    if (!location) return res.status(400).json({ success: false, message: 'Location is required.' });
    if (!priority) return res.status(400).json({ success: false, message: 'Priority is required.' });

    const id = generateComplaintId();
    const now = new Date().toISOString();
    const expectedHours = priority === 'Critical' ? 4 : priority === 'High' ? 24 : priority === 'Medium' ? 72 : 168;
    const expectedResolution = new Date(Date.now() + expectedHours * 3600000).toISOString();

    const newComplaint = {
      id, title, description, category, location, priority,
      status: 'Submitted',
      submittedBy: submittedBy || 'unknown',
      submittedByName: submittedByName || 'Unknown User',
      userRole: userRole || 'student',
      assignedTo: DEPT_ROUTING[category] || 'Campus Administration',
      submittedAt: now,
      updatedAt: now,
      expectedResolution,
      actualResolution: null,
      resolutionNotes: '',
      attachment: req.file ? `/uploads/${req.file.filename}` : null,
      feedback: null,
      escalated: false,
      asset_id: asset_id || null,
      hostel_room_id: hostel_room_id || null,
      lab_equipment_id: lab_equipment_id || null,
      employee_id: employee_id || null
    };

    const complaints = readJSON('complaints.json');
    complaints.push(newComplaint);
    writeJSON('complaints.json', complaints);

    logActivity(`Submitted complaint ${id}: ${title}`, submittedByName || 'User', userRole || 'student', id);

    // Send confirmation email
    const users = readJSON('users.json');
    const user = users.find(u => u.id === submittedBy) || { name: submittedByName, email: null };
    if (user.email) {
      await sendEmail(user.email, 'complaintSubmitted', newComplaint, user);
    }

    res.json({ success: true, complaint: newComplaint, message: `Complaint submitted successfully. Complaint ID: ${id}` });
  } catch (error) {
    console.error('Error submitting complaint:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// Update complaint (status, assignment, notes)
app.put('/api/complaints/:id', async (req, res) => {
  const complaints = readJSON('complaints.json');
  const idx = complaints.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Complaint not found.' });

  const { status, assignedTo, resolutionNotes, updatedBy, updatedByRole } = req.body;
  const complaint = { ...complaints[idx] };
  const oldStatus = complaint.status;

  if (status) complaint.status = status;
  if (assignedTo !== undefined) complaint.assignedTo = assignedTo;
  if (resolutionNotes !== undefined) complaint.resolutionNotes = resolutionNotes;
  if (status === 'Escalated') complaint.escalated = true;
  if (status === 'Resolved' || status === 'Closed') {
    complaint.actualResolution = new Date().toISOString();
  }
  complaint.updatedAt = new Date().toISOString();

  complaints[idx] = complaint;
  writeJSON('complaints.json', complaints);

  logActivity(`Updated complaint ${complaint.id} status: ${oldStatus} → ${complaint.status}`, updatedBy || 'Admin', updatedByRole || 'admin', complaint.id);

  // Send email on key status changes
  const users = readJSON('users.json');
  const user = users.find(u => u.id === complaint.submittedBy) || { name: complaint.submittedByName, email: null };
  if (user.email) {
    if (status === 'Assigned' || status === 'In Progress') await sendEmail(user.email, 'complaintAssigned', complaint, user);
    if (status === 'Resolved') await sendEmail(user.email, 'complaintResolved', complaint, user);
    if (status === 'Escalated') await sendEmail(user.email, 'complaintEscalated', complaint, user);
  }

  res.json({ success: true, complaint, message: 'Complaint updated successfully.' });
});

// Submit feedback
app.post('/api/complaints/:id/feedback', (req, res) => {
  const complaints = readJSON('complaints.json');
  const idx = complaints.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Complaint not found.' });

  const { rating, comment, userId } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });

  complaints[idx].feedback = { rating: parseInt(rating), comment: comment || '', submittedAt: new Date().toISOString() };
  complaints[idx].status = 'Closed';
  complaints[idx].updatedAt = new Date().toISOString();
  writeJSON('complaints.json', complaints);

  logActivity(`Submitted feedback (${rating}★) for ${req.params.id}`, 'User', 'student', req.params.id);
  res.json({ success: true, message: 'Feedback submitted successfully. Complaint closed.' });
});

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
app.get('/api/analytics', (req, res) => {
  const complaints = readJSON('complaints.json');
  const now = new Date();
  const today = now.toDateString();

  // Status counts
  const statusCounts = {};
  ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Rejected', 'Escalated'].forEach(s => {
    statusCounts[s] = complaints.filter(c => c.status === s).length;
  });

  // Category distribution
  const categoryData = {};
  complaints.forEach(c => {
    categoryData[c.category] = (categoryData[c.category] || 0) + 1;
  });

  // Department distribution
  const deptData = {};
  complaints.forEach(c => {
    if (c.assignedTo) deptData[c.assignedTo] = (deptData[c.assignedTo] || 0) + 1;
  });

  // Monthly trends (last 6 months)
  const monthly = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    monthly[key] = 0;
  }
  complaints.forEach(c => {
    const d = new Date(c.submittedAt);
    const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    if (monthly[key] !== undefined) monthly[key]++;
  });

  // Average resolution time (hours)
  const resolved = complaints.filter(c => c.actualResolution && c.submittedAt);
  const avgResolutionHours = resolved.length > 0
    ? Math.round(resolved.reduce((sum, c) => {
        return sum + (new Date(c.actualResolution) - new Date(c.submittedAt)) / 3600000;
      }, 0) / resolved.length)
    : 0;

  // Resolved today
  const resolvedToday = complaints.filter(c =>
    c.actualResolution && new Date(c.actualResolution).toDateString() === today
  ).length;

  res.json({
    success: true,
    stats: {
      total: complaints.length,
      open: statusCounts['Submitted'] + statusCounts['Under Review'] + statusCounts['Assigned'],
      inProgress: statusCounts['In Progress'],
      resolvedToday,
      escalated: complaints.filter(c => c.escalated).length,
      avgResolutionHours
    },
    statusCounts,
    categoryData,
    deptData,
    monthly
  });
});

// ─── REPORTS ─────────────────────────────────────────────────────────────────
app.get('/api/reports/monthly', (req, res) => {
  const complaints = readJSON('complaints.json');
  const { month, year } = req.query;
  const m = month ? parseInt(month) - 1 : new Date().getMonth();
  const y = year ? parseInt(year) : new Date().getFullYear();

  const filtered = complaints.filter(c => {
    const d = new Date(c.submittedAt);
    return d.getMonth() === m && d.getFullYear() === y;
  });

  const monthName = new Date(y, m).toLocaleString('default', { month: 'long' });

  res.json({
    success: true,
    report: {
      period: `${monthName} ${y}`,
      total: filtered.length,
      byStatus: filtered.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {}),
      byCategory: filtered.reduce((acc, c) => { acc[c.category] = (acc[c.category] || 0) + 1; return acc; }, {}),
      byPriority: filtered.reduce((acc, c) => { acc[c.priority] = (acc[c.priority] || 0) + 1; return acc; }, {}),
      complaints: filtered
    }
  });
});

// ─── ACTIVITY LOGS ────────────────────────────────────────────────────────────
app.get('/api/logs', (req, res) => {
  const logs = readJSON('logs.json');
  res.json({ success: true, logs: logs.slice(0, 50) });
});

// ─── SEND EMAIL (manual trigger) ─────────────────────────────────────────────
app.post('/api/send-email', async (req, res) => {
  const { to, type, complaintId } = req.body;
  const complaints = readJSON('complaints.json');
  const users = readJSON('users.json');
  const complaint = complaints.find(c => c.id === complaintId);
  if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' });
  const user = users.find(u => u.id === complaint.submittedBy) || { name: complaint.submittedByName, email: to };
  const result = await sendEmail(to, type, complaint, user);
  res.json(result);
});

// ─── ESCALATION CHECK (run periodically) ─────────────────────────────────────
const checkEscalations = async () => {
  const complaints = readJSON('complaints.json');
  const now = new Date();
  let updated = false;

  for (const complaint of complaints) {
    if (['Resolved', 'Closed', 'Rejected', 'Escalated'].includes(complaint.status)) continue;

    const submittedAt = new Date(complaint.submittedAt);
    const hoursElapsed = (now - submittedAt) / 3600000;

    if (hoursElapsed >= 48 && complaint.status !== 'Escalated') {
      complaint.status = 'Escalated';
      complaint.escalated = true;
      complaint.updatedAt = now.toISOString();
      complaint.resolutionNotes = (complaint.resolutionNotes || '') + '\n[System] Auto-escalated to Admin after 48 hours.';
      updated = true;
      logActivity(`Auto-escalated complaint ${complaint.id} to Admin (48h+)`, 'System', 'system', complaint.id);
    } else if (hoursElapsed >= 24 && !complaint.escalated) {
      complaint.escalated = true;
      complaint.status = 'Escalated';
      complaint.updatedAt = now.toISOString();
      complaint.resolutionNotes = (complaint.resolutionNotes || '') + '\n[System] Auto-escalated to HOD after 24 hours.';
      updated = true;
      logActivity(`Auto-escalated complaint ${complaint.id} to HOD (24h+)`, 'System', 'system', complaint.id);
    }
  }

  if (updated) writeJSON('complaints.json', complaints);
};

// Check escalations every 30 minutes
setInterval(checkEscalations, 30 * 60 * 1000);

// ─── Serve Frontend ───────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'login.html'));
});

app.get('*', (req, res) => {
  const file = req.path.replace('/', '') || 'login.html';
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.sendFile(path.join(__dirname, '..', 'login.html'));
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   🏛️  College Complaint Management System            ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║   Server running at: http://localhost:${PORT}           ║`);
  console.log('║                                                      ║');
  console.log('║   Login Credentials:                                 ║');
  console.log('║   Admin:    admin@college.edu    / Admin@123         ║');
  console.log('║   Student:  student@college.edu  / Student@123       ║');
  console.log('║   HOD:      hod@college.edu      / Hod@123           ║');
  console.log('║   Staff:    staff@college.edu    / Staff@123         ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
