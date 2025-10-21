const crypto = require('crypto');
const bcryptjs = require('bcryptjs');
const { Admin, OTP, sequelize } = require('../models');
const { sendOTPEmail } = require('../config/brevo');
const { generateOTP, getOTPExpiry, isOTPValid } = require('../utils/otp');

const ADMIN_TOKEN_EXPIRY_MINUTES = parseInt(process.env.ADMIN_TOKEN_EXPIRY_MINUTES || '60', 10);

const generateToken = () => crypto.randomBytes(32).toString('hex');

// Admin login - returns token
const adminLogin = async (email, password) => {
  if (!email || !password) throw new Error('Email and password are required');
  const admin = await Admin.findOne({ where: { email: email.toLowerCase() } });
  if (!admin) throw new Error('Invalid credentials');
  const ok = await bcryptjs.compare(password, admin.password);
  if (!ok) throw new Error('Invalid credentials');
  if (!admin.isActive) throw new Error('Admin account inactive');

  const token = generateToken();
  const expiry = new Date(Date.now() + ADMIN_TOKEN_EXPIRY_MINUTES * 60 * 1000);
  admin.token = token;
  admin.tokenExpiry = expiry;
  admin.lastLogin = new Date();
  await admin.save();

  return { token, expiresAt: expiry, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } };
};

// Middleware-like verifier (used in routes)
const verifyAdminToken = async (token) => {
  if (!token) return null;
  const admin = await Admin.findOne({ where: { token } });
  if (!admin) return null;
  if (!admin.tokenExpiry || new Date(admin.tokenExpiry) < new Date()) return null;
  return admin;
};

// Request admin password reset OTP (email)
const requestAdminPasswordResetOTP = async (email) => {
  if (!email) throw new Error('Email is required');
  const admin = await Admin.findOne({ where: { email: email.toLowerCase() } });
  // still generate OTP even if not found to avoid enumeration
  const otp = generateOTP();
  const expiresAt = getOTPExpiry();
  await OTP.create({ email: email.toLowerCase(), code: otp, purpose: 'admin_password_reset', expiresAt });
  if (admin) {
    await sendOTPEmail(email, otp, admin.name || 'Admin');
  }
  return { success: true, message: 'If this email exists, an OTP has been sent' };
};

// Verify admin OTP
const verifyAdminPasswordResetOTP = async (email, otp) => {
  if (!email || !otp) throw new Error('Email and OTP are required');
  const otpRecord = await OTP.findOne({ where: { email: email.toLowerCase(), code: otp, purpose: 'admin_password_reset', isUsed: false } });
  if (!otpRecord) throw new Error('Invalid OTP');
  if (!isOTPValid(otpRecord.expiresAt)) throw new Error('OTP expired');
  // mark used
  otpRecord.isUsed = true;
  otpRecord.usedAt = new Date();
  await otpRecord.save();
  return { success: true, message: 'OTP verified' };
};

// Complete admin password reset
const completeAdminPasswordReset = async (email, otp, newPassword) => {
  if (!email || !otp || !newPassword) throw new Error('Email, OTP and new password required');
  const otpRecord = await OTP.findOne({ where: { email: email.toLowerCase(), code: otp, purpose: 'admin_password_reset', isUsed: true } });
  if (!otpRecord) throw new Error('OTP not verified');
  const admin = await Admin.findOne({ where: { email: email.toLowerCase() } });
  if (!admin) throw new Error('Admin not found');
  admin.password = newPassword;
  await admin.save();
  return { success: true, message: 'Password reset successful' };
};

// Create staff user
const createStaff = async ({ name, email, password, role = 'Admin' }, createdBy) => {
  if (!name || !email || !password) throw new Error('Name, email and password are required');
  const existing = await Admin.findOne({ where: { email: email.toLowerCase() } });
  if (existing) throw new Error('Admin with this email already exists');
  const admin = await Admin.create({ name, email: email.toLowerCase(), password, role, isActive: true });
  return { success: true, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } };
};

// Generic fetch with pagination, filtering, search, date range, export
const fetchTable = async (tableName, query = {}) => {
  const Model = sequelize.models[tableName];
  if (!Model) throw new Error('Table not found');

  const page = Math.max(1, parseInt(query.page || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '20', 10)));
  const offset = (page - 1) * pageSize;

  const where = {};
  // simple search across name/email fields
  if (query.search) {
    const { Op } = require('sequelize');
    const term = `%${query.search}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: term } },
      { email: { [Op.iLike]: term } },
      { phoneNumber: { [Op.iLike]: term } }
    ];
  }

  if (query.dateFrom || query.dateTo) {
    const { Op } = require('sequelize');
    where.createdAt = {};
    if (query.dateFrom) where.createdAt[Op.gte] = new Date(query.dateFrom);
    if (query.dateTo) where.createdAt[Op.lte] = new Date(query.dateTo);
  }

  const { rows, count } = await Model.findAndCountAll({ where, offset, limit: pageSize, order: [['createdAt','DESC']] });
  return { items: rows, total: count, page, pageSize, totalPages: Math.ceil(count / pageSize) };
};

// Generic add record
const addRecord = async (tableName, data) => {
  const Model = sequelize.models[tableName];
  if (!Model) throw new Error('Table not found');
  const rec = await Model.create(data);
  return rec;
};

// Generic update
const updateRecord = async (tableName, id, data) => {
  const Model = sequelize.models[tableName];
  if (!Model) throw new Error('Table not found');
  const rec = await Model.findByPk(id);
  if (!rec) throw new Error('Record not found');
  await rec.update(data);
  return rec;
};

// Generic delete
const deleteRecord = async (tableName, id) => {
  const Model = sequelize.models[tableName];
  if (!Model) throw new Error('Table not found');
  const rec = await Model.findByPk(id);
  if (!rec) throw new Error('Record not found');
  await rec.destroy();
  return { success: true };
};

module.exports = {
  adminLogin,
  verifyAdminToken,
  requestAdminPasswordResetOTP,
  verifyAdminPasswordResetOTP,
  completeAdminPasswordReset,
  createStaff,
  fetchTable,
  addRecord,
  updateRecord,
  deleteRecord
};
