# 🏛️ College Complaint Management System (CMS)
## Complete ERP Integration-Ready Portal

A full-stack web application for managing college complaints with role-based access, analytics, email notifications, and a modern ERP-style dashboard.

---

## 📁 Project Structure

```
college-cms/
├── login.html              ← Login page
├── dashboard.html          ← Main application (all pages in one SPA)
├── package.json
├── .env.example            ← Copy to .env and configure
│
├── css/
│   └── style.css           ← Complete stylesheet (IBM Plex Sans font)
│
├── js/
│   ├── app.js              ← Core application logic, API calls, navigation
│   └── charts.js           ← Chart.js rendering for all charts
│
├── backend/
│   ├── server.js           ← Express server with all API routes
│   ├── emailService.js     ← Nodemailer + Gmail SMTP templates
│   └── models.js           ← Mongoose schemas (MongoDB-ready)
│
├── data/
│   ├── users.json          ← User accounts
│   ├── complaints.json     ← Complaint records
│   └── logs.json           ← Activity logs
│
└── uploads/                ← File uploads (auto-created)
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd college-cms
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Start the Server
```bash
node backend/server.js
# OR for development with auto-reload:
npm run dev
```

### 4. Open in Browser
```
http://localhost:3000
```

---

## 👥 Login Credentials

| Role    | Email                    | Password      |
|---------|--------------------------|---------------|
| Admin   | admin@college.edu        | Admin@123     |
| Student | student@college.edu      | Student@123   |
| HOD     | hod@college.edu          | Hod@123       |
| Staff   | staff@college.edu        | Staff@123     |
| Maint.  | maintenance@college.edu  | Maint@123     |

---

## ✉️ Email Setup (Gmail SMTP)

1. Go to [Google Account > Security](https://myaccount.google.com/security)
2. Enable **2-Factor Authentication**
3. Go to **App Passwords** → Generate a 16-character password
4. Add to `.env`:
   ```
   GMAIL_USER=your-gmail@gmail.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```

> Without email config, the system logs emails to console (development mode).

---

## 🗄️ MongoDB Setup (Optional)

By default the system uses JSON files. To enable MongoDB:

1. Install & start MongoDB
2. Set in `.env`: `MONGODB_URI=mongodb://localhost:27017/college_cms`
3. In `backend/server.js`, import and use models from `backend/models.js`

---

## 🔌 API Documentation

### Authentication
| Method | Endpoint     | Description    |
|--------|-------------|----------------|
| POST   | /api/login  | Login user     |
| POST   | /api/logout | Logout         |

### Complaints
| Method | Endpoint                    | Description         |
|--------|-----------------------------|---------------------|
| GET    | /api/complaints             | Get all (filters)   |
| GET    | /api/complaints/:id         | Get one             |
| POST   | /api/complaints             | Submit new          |
| PUT    | /api/complaints/:id         | Update complaint    |
| POST   | /api/complaints/:id/feedback| Submit feedback     |

**Query Parameters for GET /api/complaints:**
- `status` – Filter by status
- `category` – Filter by category
- `department` – Filter by assigned department
- `userId` – Filter by submitter
- `search` – Search by ID or title
- `page` – Page number (default: 1)
- `limit` – Per page (default: 10)

### Analytics & Reports
| Method | Endpoint            | Description          |
|--------|---------------------|----------------------|
| GET    | /api/analytics      | Dashboard statistics |
| GET    | /api/reports/monthly| Monthly report       |
| GET    | /api/logs           | Activity logs        |

### Other
| Method | Endpoint          | Description        |
|--------|-------------------|--------------------|
| POST   | /api/send-email   | Trigger email      |
| GET    | /api/health       | Server health check|

---

## 🧩 Features Summary

### ✅ Implemented
- [x] Secure role-based login (Student/Staff/HOD/Admin/Maintenance)
- [x] Complaint submission with file upload (image/PDF/video)
- [x] Unique Complaint ID generation (CMP1001, CMP1002...)
- [x] 10 complaint categories with auto-department routing
- [x] 8-stage status workflow
- [x] Admin dashboard with 6 stat cards
- [x] 4 interactive Chart.js charts (pie, bar, line, doughnut)
- [x] Sortable complaints table with 11 columns
- [x] Search & filters (status/category/department/search)
- [x] Pagination
- [x] Complaint detail modal with admin controls
- [x] Email notifications via Nodemailer (submit/assign/resolve/escalate)
- [x] Auto-escalation after 24h → HOD, 48h → Admin
- [x] 5-star feedback system
- [x] Monthly reports with download
- [x] Activity logs
- [x] ERP-ready fields (asset_id, hostel_room_id, lab_equipment_id, employee_id)
- [x] Responsive design
- [x] Input validation

---

## 🎨 Tech Stack

| Layer     | Technology              |
|-----------|------------------------|
| Frontend  | HTML5, CSS3, Vanilla JS |
| Fonts     | IBM Plex Sans + Mono    |
| Charts    | Chart.js v4 (CDN)       |
| Backend   | Node.js + Express       |
| Database  | JSON files (MongoDB ready) |
| Email     | Nodemailer + Gmail SMTP |
| Upload    | Multer                  |
| IDs       | UUID v4                 |

---

## 🔐 Department Auto-Routing

| Category          | Routed To             |
|-------------------|-----------------------|
| Electricity       | Electrical Department |
| Internet / WiFi   | IT Department         |
| Hostel Issues     | Hostel Management     |
| Laboratory Equip. | Lab Technicians       |
| Infrastructure    | Maintenance           |
| Water Supply      | Maintenance           |
| Cleanliness       | Campus Administration |
| Furniture         | Maintenance           |
| Safety            | Campus Administration |
| Other             | Campus Administration |

---

## ⏱️ Priority SLA (Expected Resolution)

| Priority | Expected Resolution |
|----------|---------------------|
| Critical | 4 hours             |
| High     | 24 hours            |
| Medium   | 72 hours (3 days)   |
| Low      | 168 hours (7 days)  |

---

## 🔄 Complaint Lifecycle

```
Submitted → Under Review → Assigned → In Progress → Resolved → Closed
                                                         ↑
                                               Rejected (any stage)
                                               Escalated (24/48h auto)
```

---

## 📝 Adding New Users

Edit `data/users.json`:
```json
{
  "id": "U006",
  "name": "New User",
  "email": "newuser@college.edu",
  "password": "Password@123",
  "role": "student",
  "department": "Computer Science",
  "phone": "9876543210"
}
```

Roles: `student`, `staff`, `hod`, `admin`, `maintenance`

---

## 🐛 Troubleshooting

**Server won't start?**
- Run `npm install` first
- Check if port 3000 is free: `lsof -i :3000`

**Login fails?**
- Check credentials in `data/users.json`
- Ensure role matches exactly

**Emails not sending?**
- System works without email (logs to console)
- For Gmail: use App Password, not account password
- Ensure 2FA is enabled on Google account

**Charts not showing?**
- Check browser console for errors
- Ensure internet connection (Chart.js loads from CDN)

---

Made with ❤️ for ABC Engineering College ERP Platform
