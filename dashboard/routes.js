const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Client: DBClient, Request } = require('../shared/models');
const { startBot, stopBot, deployEmbed, activeBots } = require('../bot/botManager');

// ===== Middleware: تحقق أن العميل مسجل دخول =====
function requireAuth(req, res, next) {
  if (req.session?.clientGuildId) return next();
  return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
}

// ===== تسجيل دخول العميل =====
router.post('/auth/login', async (req, res) => {
  try {
    const { guildId, password } = req.body;
    if (!guildId || !password) return res.status(400).json({ error: 'بياناتك ناقصة' });

    const client = await DBClient.findOne({ guildId, isActive: true });
    if (!client) return res.status(404).json({ error: 'السيرفر غير موجود أو غير نشط' });

    const isValid = await bcrypt.compare(password, client.password);
    if (!isValid) return res.status(401).json({ error: 'كلمة المرور خاطئة' });

    req.session.clientGuildId = guildId;
    req.session.clientName = client.guildName;

    res.json({ 
      success: true, 
      guildId, 
      guildName: client.guildName,
      botActive: activeBots.has(guildId)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== تسجيل خروج =====
router.post('/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ===== جلب بيانات العميل =====
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const client = await DBClient.findOne({ guildId: req.session.clientGuildId });
    if (!client) return res.status(404).json({ error: 'غير موجود' });

    // لا نرجع التوكن أبداً
    const safe = {
      guildId: client.guildId,
      guildName: client.guildName,
      isActive: client.isActive,
      botActive: activeBots.has(client.guildId),
      settings: client.settings,
    };
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== تحديث الإعدادات =====
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const allowed = [
      'settings.embedChannelId', 'settings.embedTitle', 'settings.embedDescription',
      'settings.embedColor', 'settings.buttonLabel', 'settings.buttonColor',
      'settings.roleToRemove', 'settings.roleToAdd',
      'settings.formSubmitChannelId', 'settings.logChannelId',
      'settings.formFields.userId', 'settings.formFields.reason',
      'settings.formFields.evidence', 'settings.formFields.customField1',
      'settings.formFields.customField2',
    ];

    const update = {};
    for (const key of allowed) {
      const parts = key.split('.');
      let val = req.body;
      for (const p of parts) val = val?.[p];
      if (val !== undefined) update[key] = val;
    }

    await DBClient.findOneAndUpdate(
      { guildId: req.session.clientGuildId },
      { $set: update }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== نشر الإمبيد =====
router.post('/deploy-embed', requireAuth, async (req, res) => {
  try {
    const result = await deployEmbed(req.session.clientGuildId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== جلب الطلبات =====
router.get('/requests', requireAuth, async (req, res) => {
  try {
    const { status, page = 1 } = req.query;
    const filter = { guildId: req.session.clientGuildId };
    if (status) filter.status = status;

    const requests = await Request.find(filter)
      .sort({ createdAt: -1 })
      .limit(20)
      .skip((page - 1) * 20);

    const total = await Request.countDocuments(filter);

    res.json({ requests, total, pages: Math.ceil(total / 20) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== إحصائيات =====
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const guildId = req.session.clientGuildId;
    const [total, approved, rejected, pending] = await Promise.all([
      Request.countDocuments({ guildId }),
      Request.countDocuments({ guildId, status: 'approved' }),
      Request.countDocuments({ guildId, status: 'rejected' }),
      Request.countDocuments({ guildId, status: 'pending' }),
    ]);
    res.json({ total, approved, rejected, pending, botActive: activeBots.has(guildId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
