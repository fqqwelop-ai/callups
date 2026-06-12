const mongoose = require('mongoose');

// ===== موديل العميل (كل شخص اشترى البوت) =====
const clientSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  guildName: { type: String, default: 'Unknown Server' },
  botToken: { type: String, required: true },
  password: { type: String, required: true }, // مشفرة
  ownerDiscordId: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },

  // إعدادات البوت
  settings: {
    // الإمبيد (الرسالة الثابتة اللي تظهر للناس)
    embedChannelId: { type: String, default: null },
    embedMessageId: { type: String, default: null },
    embedTitle: { type: String, default: '🛡️ طلب كوب-آب' },
    embedDescription: { type: String, default: 'اضغط الزر أدناه لتقديم طلب كوب-آب' },
    embedColor: { type: String, default: '#5865F2' },
    buttonLabel: { type: String, default: '📋 تقديم طلب' },
    buttonColor: { type: String, default: 'Primary' }, // Primary, Secondary, Success, Danger

    // الرتب
    roleToRemove: { type: String, default: null }, // الرتبة اللي تنشال
    roleToAdd: { type: String, default: null },    // الرتبة اللي تنحط

    // الروم
    formSubmitChannelId: { type: String, default: null }, // روم يجي فيه الطلب
    logChannelId: { type: String, default: null },        // روم اللوق

    // إعدادات الفورم
    formFields: {
      userId: { type: Boolean, default: true, label: 'كوبي آيدي الشخص' },
      reason: { type: Boolean, default: true, label: 'السبب' },
      evidence: { type: Boolean, default: true, label: 'الدليل (رابط)' },
      customField1: { type: String, default: null },
      customField2: { type: String, default: null },
    }
  }
});

// ===== موديل الطلبات (اللوق) =====
const requestSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  submitterId: { type: String, required: true },   // مين قدم الطلب
  submitterTag: { type: String, required: true },
  targetUserId: { type: String, required: true },  // الشخص اللي بينكوبه
  reason: { type: String, required: true },
  evidence: { type: String, default: null },
  customField1: { type: String, default: null },
  customField2: { type: String, default: null },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  reviewerId: { type: String, default: null },
  reviewerTag: { type: String, default: null },
  reviewNote: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date, default: null },
});

const Client = mongoose.model('Client', clientSchema);
const Request = mongoose.model('Request', requestSchema);

module.exports = { Client, Request };
