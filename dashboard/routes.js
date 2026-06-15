const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Client: DBClient, Request } = require('../shared/models');
const { deployEmbed, activeBots } = require('../bot/botManager');

function requireAuth(req, res, next) {
  if (req.session?.clientGuildId) return next();
  return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
}

router.post('/auth/login', async (req, res) => {
  try {
    const { guildId, password } = req.body;
    if (!guildId || !password) return res.status(400).json({ error: 'بياناتك ناقصة' });
    const client = await DBClient.findOne({ guildId, isActive: true });
    if (!client) return res.status(404).json({ error: 'السيرفر غير موجود أو غير نشط' });
    const isValid = await bcrypt.compare(password, client.password);
    if (!isValid) return res.status(401).json({ error: 'كلمة المرور خاطئة' });
    req.session.clientGuildId = guildId;
    res.json({ success: true, guildId, guildName: client.guildName, botActive: activeBots.has(guildId) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/auth/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });

router.get('/settings', requireAuth, async (req, res) => {
  try {
    const client = await DBClient.findOne({ guildId: req.session.clientGuildId });
    if (!client) return res.status(404).json({ error: 'غير موجود' });
    res.json({ guildId: client.guildId, guildName: client.guildName, isActive: client.isActive, botActive: activeBots.has(client.guildId), viewerRoles: client.viewerRoles || [], settings: client.settings });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/settings', requireAuth, async (req, res) => {
  try {
    const s = req.body.settings || {};
    const update = {};
    const simpleFields = [
      'logChannelId', 'watchChannelId',
      'deadlineValue', 'deadlineUnit', 'deadlineReminderEnabled', 'deadlineReminderMsg',
      'dmToTarget', 'dmToTargetMessage', 'dmToSubmitterOnJoin', 'dmToSubmitterMessage',
    ];
    simpleFields.forEach(f => { if (s[f] !== undefined) update[`settings.${f}`] = s[f]; });
    if (s.rolesToRemove !== undefined) update['settings.rolesToRemove'] = s.rolesToRemove;
    if (s.rolesToAdd !== undefined) update['settings.rolesToAdd'] = s.rolesToAdd;
    if (s.embeds !== undefined) update['settings.embeds'] = s.embeds;
    if (s.logEmbed) Object.keys(s.logEmbed).forEach(k => update[`settings.logEmbed.${k}`] = s.logEmbed[k]);
    if (s.logFields) Object.keys(s.logFields).forEach(k => update[`settings.logFields.${k}`] = s.logFields[k]);
    if (s.logLabels) Object.keys(s.logLabels).forEach(k => update[`settings.logLabels.${k}`] = s.logLabels[k]);
    if (s.formFields) Object.keys(s.formFields).forEach(k => update[`settings.formFields.${k}`] = s.formFields[k]);
    if (req.body.viewerRoles !== undefined) update['viewerRoles'] = req.body.viewerRoles;
    await DBClient.findOneAndUpdate({ guildId: req.session.clientGuildId }, { $set: update });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// تغيير كلمة المرور
router.put('/auth/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const client = await DBClient.findOne({ guildId: req.session.clientGuildId });
    const isValid = await bcrypt.compare(currentPassword, client.password);
    if (!isValid) return res.status(401).json({ error: 'كلمة المرور الحالية خاطئة' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await DBClient.findOneAndUpdate({ guildId: req.session.clientGuildId }, { password: hashed });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/deploy-embed', requireAuth, async (req, res) => {
  try {
    const { embedIndex = 0 } = req.body;
    const result = await deployEmbed(req.session.clientGuildId, embedIndex);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/requests', requireAuth, async (req, res) => {
  try {
    const { status, page = 1 } = req.query;
    const filter = { guildId: req.session.clientGuildId };
    if (status) filter.status = status;
    const requests = await Request.find(filter).sort({ createdAt: -1 }).limit(20).skip((page - 1) * 20);
    const total = await Request.countDocuments(filter);
    res.json({ requests, total, pages: Math.ceil(total / 20) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// إلغاء استدعاء من الموقع
router.post('/requests/:id/cancel', requireAuth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request || request.guildId !== req.session.clientGuildId) return res.status(404).json({ error: 'غير موجود' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'الاستدعاء مو قيد الانتظار' });
    await Request.findByIdAndUpdate(req.params.id, { status: 'cancelled', reviewedAt: new Date() });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', requireAuth, async (req, res) => {
  try {
    const guildId = req.session.clientGuildId;
    const [total, approved, rejected, pending, cancelled] = await Promise.all([
      Request.countDocuments({ guildId }),
      Request.countDocuments({ guildId, status: 'approved' }),
      Request.countDocuments({ guildId, status: 'rejected' }),
      Request.countDocuments({ guildId, status: 'pending' }),
      Request.countDocuments({ guildId, status: 'cancelled' }),
    ]);
    res.json({ total, approved, rejected, pending, cancelled, botActive: activeBots.has(guildId) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
