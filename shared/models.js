const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  guildName: { type: String, default: 'Unknown Server' },
  botToken: { type: String, required: true },
  password: { type: String, required: true },
  ownerDiscordId: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  settings: {
    embedChannelId: { type: String, default: null },
    embedMessageId: { type: String, default: null },
    embedTitle: { type: String, default: '📞 استدعاء' },
    embedDescription: { type: String, default: 'اضغط الزر أدناه للاستدعاء' },
    embedColor: { type: String, default: '#5865F2' },
    buttonLabel: { type: String, default: '📋 تقديم استدعاء' },
    buttonColor: { type: String, default: 'Primary' },
    roleToRemove: { type: String, default: null },
    roleToAdd: { type: String, default: null },
    formSubmitChannelId: { type: String, default: null },
    logChannelId: { type: String, default: null },
    watchChannelId: { type: String, default: null },
    // الموعد النهائي
    deadlineValue: { type: Number, default: 24 },
    deadlineUnit: { type: String, default: 'hours' },
    deadlineReminderEnabled: { type: Boolean, default: true },
    deadlineAdminId: { type: String, default: null },
    deadlineReminderMsg: { type: String, default: 'انتهى موعد كول-آب {target}! السبب: {reason}' },
    // رسائل تلقائية
    dmToTarget: { type: Boolean, default: true },
    dmToTargetMessage: { type: String, default: 'تم استدعاؤك في {server}. السبب: {reason}' },
    dmToSubmitterOnJoin: { type: Boolean, default: true },
    dmToSubmitterMessage: { type: String, default: 'دخل {target} الروم المحدد!' },
    // إعدادات اللوق
    logFields: {
      showSubmitter: { type: Boolean, default: true },
      showTarget: { type: Boolean, default: true },
      showReason: { type: Boolean, default: true },
      showEvidence: { type: Boolean, default: true },
      showDeadline: { type: Boolean, default: true },
      showRoleChange: { type: Boolean, default: true },
    },
    logLabels: {
      submitter: { type: String, default: 'تنفذ بواسطة' },
      target: { type: String, default: 'المستدعى' },
      reason: { type: String, default: 'السبب' },
      evidence: { type: String, default: 'الدليل' },
      deadline: { type: String, default: 'الموعد النهائي' },
      roleChange: { type: String, default: 'التغيير' },
    },
    logEmbed: {
      title: { type: String, default: 'تم تنفيذ الكول آب' },
      color: { type: String, default: '#5865F2' },
      description: { type: String, default: null },
      footer: { type: String, default: 'ID: {id}' },
    },
    formFields: {
      reason: { type: Boolean, default: true },
      evidence: { type: Boolean, default: true },
      customField1: { type: String, default: null },
      customField2: { type: String, default: null },
    }
  }
});

const requestSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  submitterId: { type: String, required: true },
  submitterTag: { type: String, required: true },
  targetUserId: { type: String, required: true },
  targetTag: { type: String, default: null },
  reason: { type: String, required: true },
  evidence: { type: String, default: null },
  deadline: { type: String, default: null },
  deadlineDate: { type: Date, default: null },
  reminderSent: { type: Boolean, default: false },
  customField1: { type: String, default: null },
  customField2: { type: String, default: null },
  status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  reviewerId: { type: String, default: null },
  reviewerTag: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date, default: null },
});

const Client = mongoose.model('Client', clientSchema);
const Request = mongoose.model('Request', requestSchema);
module.exports = { Client, Request };
