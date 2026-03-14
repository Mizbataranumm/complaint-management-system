// backend/models.js
// Mongoose schemas for MongoDB integration (optional)
// The system works with JSON files by default.
// To enable MongoDB: set MONGODB_URI in .env and use these models in server.js

const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'staff', 'hod', 'admin', 'maintenance'], required: true },
  department: String,
  phone: String,
  rollNo: String,
  employee_id: String,
  createdAt: { type: Date, default: Date.now }
});

// Complaint Schema
const complaintSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true, minlength: 5 },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['Infrastructure', 'Electricity', 'Water Supply', 'Internet / WiFi', 'Laboratory Equipment', 'Hostel Issues', 'Cleanliness', 'Furniture', 'Safety', 'Other'],
    required: true
  },
  location: {
    type: String,
    enum: ['Hostel', 'Laboratory', 'Classroom', 'Library', 'Campus'],
    required: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    required: true
  },
  status: {
    type: String,
    enum: ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Rejected', 'Escalated'],
    default: 'Submitted'
  },
  submittedBy: { type: String, required: true },
  submittedByName: String,
  userRole: String,
  assignedTo: String,
  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  expectedResolution: Date,
  actualResolution: Date,
  resolutionNotes: String,
  attachment: String,
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    submittedAt: Date
  },
  escalated: { type: Boolean, default: false },
  // ERP Integration Fields (optional)
  asset_id: String,
  hostel_room_id: String,
  lab_equipment_id: String,
  employee_id: String
});

// Activity Log Schema
const activityLogSchema = new mongoose.Schema({
  id: String,
  action: String,
  user: String,
  role: String,
  timestamp: { type: Date, default: Date.now },
  complaintId: String
});

const User = mongoose.model('User', userSchema);
const Complaint = mongoose.model('Complaint', complaintSchema);
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = { User, Complaint, ActivityLog };
