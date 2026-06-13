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
    // الإمبيد
    embedChannelId: { type: String, default: null },
    embedMessageId: { type: String, default: null },
    embedTitle: { type: String, default: '📞 استدعاء' },
    embedDescription: { type: String, default: 'اضغط الزر أدناه لتقديم استدعاء' },
    embedColor: { type: String, default: '#5865F2' },
    buttonLabel: { type: String, default: '📋 تقديم استدعاء' },
    buttonColor: { type: String, default: 'Primary' },

    // الرتب
    roleToRemove: { type: String, default: null },
    roleToAdd: { type: String, default: null },

    // الروم
    formSubmitChannelId: { type: String, default: null },
    logChannelId: { type: String, default: null },
    watchChannelId: { type: String, default: null }, // روم المراقبة (لما يدخله المستدعى)

    // رسالة للمستدعى عند تنفيذ الكول-آب
    dmToTarget: { type: Boolean, default: true },
    dmToTargetMessage: { type: String, default: 'تم استدعاؤك في {server}. السبب: {reason}' },

    // رسالة للمستدعي لما يدخل المستدعى الروم
    dmToSubmitterOnJoin: { type: Boolean, default: true },
    dmToSubmitterMessage: { type: String, default: 'دخل {target} الروم المحدد!' },

    // إعدادات اللوق - وش يظهر
    logFields: {
      showSubmitter: { type: Boolean, default: true },
      showTarget: { type: Boolean, default: true },
      showReason: { type: Boolean, default: true },
      showEvidence: { type: Boolean, default: true },
      showDeadline: { type: Boolean, default: true },
      showRoleChange: { type: Boolean, default: true },
    },

    // تخصيص أسماء الحقول في اللوق
    logLabels: {
      submitter: { type: String, default: 'تنفذ بواسطة' },
      target: { type: String, default: 'المستدعى' },
      reason: { type: String, default: 'السبب' },
      evidence: { type: String, default: 'الدليل' },
      deadline: { type: String, default: 'الموعد النهائي' },
      roleChange: { type: String, default: 'التغيير' },
    },

    // مدة الكول-آب الافتراضية (بالساعات)
    defaultDeadlineHours: { type: Number, default: 24 },

    // إعدادات الفورم
    formFields: {
      reason: { type: Boolean, default: true },
      evidence: { type: Boolean, default: true },
      deadline: { type: Boolean, default: true },
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
  deadline: { type: String, default: null }, // الموعد النهائي
  customField1: { type: String, default: null },
  customField2: { type: String, default: null },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewerId: { type: String, default: null },
  reviewerTag: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date, default: null },
});

const Client = mongoose.model('Client', clientSchema);
const Request = mongoose.model('Request', requestSchema);

module.exports = { Client, Request };
