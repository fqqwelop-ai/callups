const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Client: DBClient } = require('../shared/models');
const { startBot, stopBot, activeBots } = require('../bot/botManager');

// ===== Middleware: تحقق من كلمة مرور الأدمن =====
function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  return res.status(401).json({ error: 'غير مصرح' });
}

// ===== تسجيل دخول الأدمن =====
router.post('/login', async (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'كلمة المرور خاطئة' });
});

// ===== تسجيل خروج =====
router.post('/logout', (req, res) => {
  req.session.isAdmin = false;
  res.json({ success: true });
});

// ===== جلب كل العملاء =====
router.get('/clients', requireAdmin, async (req, res) => {
  try {
    const clients = await DBClient.find({}, '-botToken -password'); // لا نرجع التوكن والباسوورد
    const withStatus = clients.map(c => ({
      ...c.toObject(),
      botActive: activeBots.has(c.guildId),
    }));
    res.json(withStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== إضافة عميل جديد =====
router.post('/clients', requireAdmin, async (req, res) => {
  try {
    const { guildId, botToken, password, ownerDiscordId } = req.body;

    if (!guildId || !botToken || !password) {
      return res.status(400).json({ error: 'Guild ID, توكن البوت، وكلمة المرور مطلوبة' });
    }

    const exists = await DBClient.findOne({ guildId });
    if (exists) return res.status(409).json({ error: 'هذا السيرفر موجود بالفعل' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newClient = new DBClient({
      guildId,
      botToken,
      password: hashedPassword,
      ownerDiscordId: ownerDiscordId || null,
    });

    await newClient.save();

    // تشغيل البوت فوراً
    const result = await startBot(newClient);
    if (!result.success) {
      // إذا التوكن خاطئ، حذف العميل
      await DBClient.deleteOne({ guildId });
      return res.status(400).json({ error: `التوكن خاطئ أو البوت مو في السيرفر: ${result.error}` });
    }

    res.json({ success: true, guildId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== تحديث عميل =====
router.put('/clients/:guildId', requireAdmin, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { password, botToken, isActive } = req.body;

    const update = {};
    if (password) update.password = await bcrypt.hash(password, 10);
    if (botToken) update.botToken = botToken;
    if (isActive !== undefined) update.isActive = isActive;

    await DBClient.findOneAndUpdate({ guildId }, update);

    // إعادة تشغيل البوت إذا تغير التوكن أو الحالة
    if (botToken || isActive !== undefined) {
      const clientData = await DBClient.findOne({ guildId });
      if (isActive === false) {
        await stopBot(guildId);
      } else if (clientData.isActive) {
        await startBot(clientData);
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== حذف عميل =====
router.delete('/clients/:guildId', requireAdmin, async (req, res) => {
  try {
    const { guildId } = req.params;
    await stopBot(guildId);
    await DBClient.deleteOne({ guildId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== إعادة تشغيل بوت =====
router.post('/clients/:guildId/restart', requireAdmin, async (req, res) => {
  try {
    const { guildId } = req.params;
    const clientData = await DBClient.findOne({ guildId });
    if (!clientData) return res.status(404).json({ error: 'غير موجود' });

    await startBot(clientData);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
