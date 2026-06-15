const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, Events } = require('discord.js');
const { Client: DBClient, Request } = require('../shared/models');

const activeBots = new Map();

function calcDeadlineDate(value, unit) {
  const ms = unit === 'days' ? value * 24 * 60 * 60 * 1000 : value * 60 * 60 * 1000;
  return new Date(Date.now() + ms);
}

function formatDeadline(value, unit) {
  return unit === 'days' ? `${value} يوم` : `${value} ساعة`;
}

// دعم متغيرات المنشن في الرسائل
function parseMessage(template, vars) {
  return template
    .replace(/{target_mention}/g, vars.targetId ? `<@${vars.targetId}>` : vars.targetTag || '')
    .replace(/{submitter_mention}/g, vars.submitterId ? `<@${vars.submitterId}>` : vars.submitterTag || '')
    .replace(/{server_mention}/g, vars.guildName || '')
    .replace(/{target}/g, vars.targetTag || '')
    .replace(/{submitter}/g, vars.submitterTag || '')
    .replace(/{server}/g, vars.guildName || '')
    .replace(/{reason}/g, vars.reason || '')
    .replace(/{deadline}/g, vars.deadline || '');
}

async function startBot(clientData) {
  const guildId = clientData.guildId;
  if (activeBots.has(guildId)) await stopBot(guildId);

  const bot = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildVoiceStates,
    ]
  });

  bot.once(Events.ClientReady, async (readyClient) => {
    console.log(`✅ Bot ready for guild: ${guildId} | Tag: ${readyClient.user.tag}`);
    const guild = readyClient.guilds.cache.get(guildId);
    if (guild) await DBClient.findOneAndUpdate({ guildId }, { guildName: guild.name });
  });

  // ===== مراقبة دخول روم الانتظار =====
  bot.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    try {
      if (newState.guild.id !== guildId) return;
      const db = await DBClient.findOne({ guildId });
      if (!db?.settings?.watchChannelId) return;
      if (!newState.channelId || newState.channelId !== db.settings.watchChannelId) return;
      if (oldState.channelId === newState.channelId) return;

      const userId = newState.member.id;
      const pendingRequests = await Request.find({ guildId, targetUserId: userId, status: 'pending' });
      if (!pendingRequests.length) return;

      for (const req of pendingRequests) {
        if (!db.settings.dmToSubmitterOnJoin) continue;
        try {
          const submitter = await bot.users.fetch(req.submitterId);
          const msg = parseMessage(db.settings.dmToSubmitterMessage || 'دخل {target_mention} روم الانتظار!', {
            targetId: userId, targetTag: newState.member.user.tag,
            submitterId: req.submitterId, submitterTag: req.submitterTag,
            guildName: db.guildName,
          });
          await submitter.send(`📢 **إشعار:** ${msg}`);
        } catch (e) { console.error('DM error:', e.message); }
      }
    } catch (err) { console.error('VoiceState error:', err.message); }
  });

  bot.on(Events.InteractionCreate, async (interaction) => {
    try {
      const db = await DBClient.findOne({ guildId });
      if (!db) return;

      // دعم إمبيدات متعددة
      if (interaction.isButton()) {
        const embeds = db.settings?.embeds || [];
        for (let i = 0; i < embeds.length; i++) {
          if (interaction.customId === `callup_open_${guildId}_${i}`) {
            await handleOpenForm(interaction, db);
            return;
          }
        }
        // fallback للإمبيد القديم
        if (interaction.customId === `callup_open_${guildId}`) {
          await handleOpenForm(interaction, db);
          return;
        }
      }

      if (interaction.isButton() && interaction.customId.startsWith(`callup_approve_`)) await handleApprove(interaction, db);
      if (interaction.isButton() && interaction.customId.startsWith(`callup_reject_`)) await handleReject(interaction, db);
      if (interaction.isButton() && interaction.customId.startsWith(`callup_cancel_`)) await handleCancel(interaction, db);
      if (interaction.isButton() && interaction.customId.startsWith(`callup_remind_person_`)) await handleRemindPerson(interaction, db);
      if (interaction.isButton() && interaction.customId.startsWith(`callup_remind_admin_`)) await handleRemindAdmin(interaction, db);
      if (interaction.isModalSubmit() && interaction.customId.startsWith(`callup_modal_${guildId}`)) await handleModalSubmit(interaction, db);
    } catch (err) {
      console.error(`Bot error [${guildId}]:`, err.message);
      try {
        if (!interaction.replied && !interaction.deferred)
          await interaction.reply({ content: '❌ صار خطأ، حاول مرة ثانية.', ephemeral: true });
      } catch {}
    }
  });

  try {
    await bot.login(clientData.botToken);
    activeBots.set(guildId, bot);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function stopBot(guildId) {
  if (activeBots.has(guildId)) {
    activeBots.get(guildId).destroy();
    activeBots.delete(guildId);
  }
}

async function deployEmbed(guildId, embedIndex = 0) {
  const bot = activeBots.get(guildId);
  if (!bot) return { success: false, error: 'البوت مو شغال' };
  const db = await DBClient.findOne({ guildId });
  const embeds = db?.settings?.embeds || [];
  const embedConfig = embeds[embedIndex];
  if (!embedConfig?.embedChannelId) return { success: false, error: 'ما تم تحديد الروم' };

  try {
    const guild = bot.guilds.cache.get(guildId);
    const channel = guild?.channels.cache.get(embedConfig.embedChannelId);
    if (!channel) return { success: false, error: 'الروم مو موجود' };

    const embed = new EmbedBuilder()
      .setTitle(embedConfig.embedTitle || '📞 استدعاء')
      .setDescription(embedConfig.embedDescription || 'اضغط الزر أدناه للاستدعاء')
      .setColor(embedConfig.embedColor || '#5865F2')
      .setTimestamp();

    const btnStyle = { Primary: ButtonStyle.Primary, Secondary: ButtonStyle.Secondary, Success: ButtonStyle.Success, Danger: ButtonStyle.Danger }[embedConfig.buttonColor] || ButtonStyle.Primary;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`callup_open_${guildId}_${embedIndex}`)
        .setLabel(embedConfig.buttonLabel || '📋 تقديم استدعاء')
        .setStyle(btnStyle)
    );

    if (embedConfig.embedMessageId) {
      try { const old = await channel.messages.fetch(embedConfig.embedMessageId); await old.delete(); } catch {}
    }

    const msg = await channel.send({ embeds: [embed], components: [row] });
    await DBClient.findOneAndUpdate({ guildId }, { [`settings.embeds.${embedIndex}.embedMessageId`]: msg.id });
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
}

async function handleOpenForm(interaction, db) {
  const { settings, guildId } = db;
  const modalId = `callup_modal_${guildId}_${Date.now()}`;
  const modal = new ModalBuilder().setCustomId(modalId).setTitle('📞 تقديم استدعاء');

  const components = [];

  // آيدي الشخص - قابل للإخفاء
  if (settings.formFields?.showUserId !== false) {
    components.push(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('target_user_id').setLabel('كوبي آيدي الشخص المستدعى').setStyle(TextInputStyle.Short).setPlaceholder('123456789012345678').setRequired(true)
    ));
  }

  if (settings.formFields?.reason !== false) {
    components.push(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('reason').setLabel(settings.logLabels?.reason || 'السبب').setStyle(TextInputStyle.Paragraph).setRequired(true)
    ));
  }

  if (settings.formFields?.evidence !== false) {
    components.push(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('evidence').setLabel(settings.logLabels?.evidence || 'الدليل (رابط)').setStyle(TextInputStyle.Short).setRequired(false)
    ));
  }

  if (settings.formFields?.customField1) {
    components.push(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('custom1').setLabel(settings.formFields.customField1).setStyle(TextInputStyle.Short).setRequired(false)
    ));
  }

  if (settings.formFields?.customField2) {
    components.push(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('custom2').setLabel(settings.formFields.customField2).setStyle(TextInputStyle.Short).setRequired(false)
    ));
  }

  modal.addComponents(...components.slice(0, 5));
  await interaction.showModal(modal);
}

async function handleModalSubmit(interaction, db) {
  const { settings, guildId } = db;
  await interaction.deferReply({ ephemeral: true });

  const targetUserId = interaction.fields.fields.has('target_user_id')
    ? interaction.fields.getTextInputValue('target_user_id')?.trim()
    : null;

  if (targetUserId && !/^\d{17,20}$/.test(targetUserId)) {
    return interaction.editReply({ content: '❌ آيدي الشخص غير صحيح!' });
  }

  const reason = interaction.fields.fields.has('reason') ? interaction.fields.getTextInputValue('reason')?.trim() : '-';
  const evidence = interaction.fields.fields.has('evidence') ? interaction.fields.getTextInputValue('evidence')?.trim() : null;
  const custom1 = interaction.fields.fields.has('custom1') ? interaction.fields.getTextInputValue('custom1')?.trim() : null;
  const custom2 = interaction.fields.fields.has('custom2') ? interaction.fields.getTextInputValue('custom2')?.trim() : null;

  const deadlineVal = settings.deadlineValue || 24;
  const deadlineUnit = settings.deadlineUnit || 'hours';
  const deadlineDate = calcDeadlineDate(deadlineVal, deadlineUnit);
  const deadlineText = formatDeadline(deadlineVal, deadlineUnit);

  let targetMember = null;
  let targetTag = targetUserId || 'غير محدد';
  if (targetUserId) {
    try {
      targetMember = await interaction.guild.members.fetch(targetUserId);
      targetTag = targetMember.user.tag;
    } catch {}
  }

  const request = new Request({
    guildId, submitterId: interaction.user.id, submitterTag: interaction.user.tag,
    targetUserId: targetUserId || 'N/A', targetTag, reason, evidence,
    deadline: deadlineText, deadlineDate,
    customField1: custom1, customField2: custom2,
  });
  await request.save();

  // DM للمستدعى
  if (settings.dmToTarget && targetMember) {
    try {
      const msg = parseMessage(settings.dmToTargetMessage || 'تم استدعاؤك في {server_mention}. السبب: {reason}', {
        targetId: targetUserId, targetTag,
        submitterId: interaction.user.id, submitterTag: interaction.user.tag,
        guildName: db.guildName, reason, deadline: deadlineText,
      });
      await targetMember.send(`📢 **استدعاء:** ${msg}`);
    } catch {}
  }

  // إرسال اللوق
  if (settings.logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(settings.logChannelId);
    if (logChannel) {
      const labels = settings.logLabels || {};
      const logFields = settings.logFields || {};
      const logEmbed = settings.logEmbed || {};

      const embed = new EmbedBuilder()
        .setTitle(logEmbed.title || 'تم تنفيذ الكول آب')
        .setColor(logEmbed.color || '#5865F2')
        .setTimestamp()
        .setFooter({ text: (logEmbed.footer || 'ID: {id}').replace('{id}', targetUserId || 'N/A') });

      if (logEmbed.description) embed.setDescription(logEmbed.description);
      if (targetMember?.user?.displayAvatarURL) embed.setThumbnail(targetMember.user.displayAvatarURL());

      if (logFields.showSubmitter !== false) embed.addFields({ name: labels.submitter || 'تنفذ بواسطة', value: `<@${interaction.user.id}>`, inline: true });
      if (targetUserId && logFields.showTarget !== false) embed.addFields({ name: labels.target || 'المستدعى', value: `<@${targetUserId}>`, inline: true });
      if (logFields.showReason !== false) embed.addFields({ name: labels.reason || 'السبب', value: reason });
      if (evidence && logFields.showEvidence !== false) {
        const ev = evidence.startsWith('http') ? `[${labels.evidence || 'الدليل'}](${evidence})` : evidence;
        embed.addFields({ name: labels.evidence || 'الدليل', value: ev });
      }
      if (logFields.showDeadline !== false) embed.addFields({ name: labels.deadline || 'الموعد النهائي', value: `يبدأ من الآن — ${deadlineText}` });
      if (logFields.showRoleChange !== false) {
        const removes = (settings.rolesToRemove || []).map(r => `إزالة <@&${r}>`).join('\n') || '-';
        const adds = (settings.rolesToAdd || []).map(r => `إضافة <@&${r}>`).join('\n') || '-';
        embed.addFields({ name: labels.roleChange || 'التغيير', value: `${removes}\n${adds}` });
      }
      if (custom1 && settings.formFields?.customField1) embed.addFields({ name: settings.formFields.customField1, value: custom1 });
      if (custom2 && settings.formFields?.customField2) embed.addFields({ name: settings.formFields.customField2, value: custom2 });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`callup_remind_person_${request._id}`).setLabel('تذكير الشخص').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`callup_remind_admin_${request._id}`).setLabel('تذكير الإداري').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`callup_approve_${request._id}`).setLabel('إرجاع الرتبة').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`callup_reject_${request._id}`).setLabel('إرجاع بدون رتبة').setStyle(ButtonStyle.Danger),
      );
      await logChannel.send({ embeds: [embed], components: [row] });
    }
  }

  // تغيير الرتب (متعددة)
  if (targetMember) {
    for (const r of (settings.rolesToRemove || [])) await targetMember.roles.remove(r).catch(() => {});
    for (const r of (settings.rolesToAdd || [])) await targetMember.roles.add(r).catch(() => {});
  }

  await interaction.editReply({ content: '✅ تم تقديم الاستدعاء بنجاح!' });
}

async function handleApprove(interaction, db) {
  const requestId = interaction.customId.replace('callup_approve_', '');
  await interaction.deferUpdate();
  const request = await Request.findById(requestId);
  if (!request) return;
  const member = await interaction.guild.members.fetch(request.targetUserId).catch(() => null);
  if (member) {
    for (const r of (db.settings.rolesToAdd || [])) await member.roles.remove(r).catch(() => {});
    for (const r of (db.settings.rolesToRemove || [])) await member.roles.add(r).catch(() => {});
  }
  await Request.findByIdAndUpdate(requestId, { status: 'approved', reviewerId: interaction.user.id, reviewedAt: new Date() });
  await interaction.message.edit({ components: [buildDisabledRow('✅ تم إرجاع الرتبة', true)] });
}

async function handleReject(interaction, db) {
  const requestId = interaction.customId.replace('callup_reject_', '');
  await interaction.deferUpdate();
  const request = await Request.findById(requestId);
  if (!request) return;
  const member = await interaction.guild.members.fetch(request.targetUserId).catch(() => null);
  if (member) {
    for (const r of (db.settings.rolesToAdd || [])) await member.roles.remove(r).catch(() => {});
    // ما يرجع الرتبة الأصلية
  }
  await Request.findByIdAndUpdate(requestId, { status: 'rejected', reviewerId: interaction.user.id, reviewedAt: new Date() });
  await interaction.message.edit({ components: [buildDisabledRow('✅ إرجاع بدون رتبة', false)] });
}

async function handleCancel(interaction, db) {
  const requestId = interaction.customId.replace('callup_cancel_', '');
  await interaction.deferUpdate();
  const request = await Request.findById(requestId);
  if (!request) return;
  // إرجاع الرتب كما كانت
  const member = await interaction.guild.members.fetch(request.targetUserId).catch(() => null);
  if (member) {
    for (const r of (db.settings.rolesToAdd || [])) await member.roles.remove(r).catch(() => {});
    for (const r of (db.settings.rolesToRemove || [])) await member.roles.add(r).catch(() => {});
  }
  await Request.findByIdAndUpdate(requestId, { status: 'cancelled', reviewerId: interaction.user.id, reviewedAt: new Date() });
  await interaction.message.edit({ components: [buildDisabledRow('🚫 تم الإلغاء', false)] });
  await interaction.followUp({ content: '✅ تم إلغاء الاستدعاء وإرجاع الرتب', ephemeral: true });
}

function buildDisabledRow(doneLabel, isApprove) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('d1').setLabel('تذكير الشخص').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId('d2').setLabel('تذكير الإداري').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId('d3').setLabel(isApprove ? doneLabel : 'إرجاع الرتبة').setStyle(ButtonStyle.Success).setDisabled(true),
    new ButtonBuilder().setCustomId('d4').setLabel(!isApprove ? doneLabel : 'إرجاع بدون رتبة').setStyle(ButtonStyle.Danger).setDisabled(true),
  );
}

async function handleRemindPerson(interaction, db) {
  const requestId = interaction.customId.replace('callup_remind_person_', '');
  await interaction.deferReply({ ephemeral: true });
  const request = await Request.findById(requestId);
  if (!request) return interaction.editReply({ content: '❌ الطلب مو موجود' });
  try {
    const member = await interaction.guild.members.fetch(request.targetUserId);
    await member.send(`🔔 **تذكير:** أنت مستدعى في سيرفر **${db.guildName}**.\nالسبب: ${request.reason}\nالموعد: ${request.deadline || '-'}`);
    await interaction.editReply({ content: '✅ تم إرسال التذكير للشخص' });
  } catch {
    await interaction.editReply({ content: '❌ ما قدرت أرسل رسالة (ربما أوقف الـ DMs)' });
  }
}

async function handleRemindAdmin(interaction, db) {
  const requestId = interaction.customId.replace('callup_remind_admin_', '');
  await interaction.deferReply({ ephemeral: true });
  const request = await Request.findById(requestId);
  try {
    const msg = parseMessage(db.settings.deadlineReminderMsg || 'تذكير: كول-آب {target_mention} بانتظار المراجعة!', {
      targetId: request?.targetUserId, targetTag: request?.targetTag,
      submitterId: request?.submitterId, submitterTag: request?.submitterTag,
      guildName: db.guildName, reason: request?.reason, deadline: request?.deadline,
    });
    await interaction.user.send(`🔔 **تذكير إداري:** ${msg}`);
    await interaction.editReply({ content: '✅ تم إرسال التذكير لك بالخاص' });
  } catch {
    await interaction.editReply({ content: '❌ ما قدرت أرسل رسالة (تأكد الـ DMs مفتوحة)' });
  }
}

// فحص المواعيد المنتهية - يرسل للمستدعي
async function checkDeadlines() {
  try {
    const clients = await DBClient.find({ isActive: true, 'settings.deadlineReminderEnabled': true });
    for (const db of clients) {
      const bot = activeBots.get(db.guildId);
      if (!bot) continue;
      const expired = await Request.find({
        guildId: db.guildId, status: 'pending',
        deadlineDate: { $lte: new Date() },
        reminderSent: { $ne: true }
      });
      for (const req of expired) {
        try {
          const submitter = await bot.users.fetch(req.submitterId);
          const msg = parseMessage(db.settings.deadlineReminderMsg || 'انتهى موعد كول-آب {target_mention}! السبب: {reason}', {
            targetId: req.targetUserId, targetTag: req.targetTag,
            submitterId: req.submitterId, submitterTag: req.submitterTag,
            guildName: db.guildName, reason: req.reason, deadline: req.deadline,
          });
          await submitter.send(`⏰ **انتهى الموعد:** ${msg}`);
          await Request.findByIdAndUpdate(req._id, { reminderSent: true });
        } catch {}
      }
    }
  } catch {}
}

setInterval(checkDeadlines, 60 * 1000);

async function startAllBots() {
  const clients = await DBClient.find({ isActive: true });
  console.log(`🚀 Starting ${clients.length} bots...`);
  for (const c of clients) {
    await startBot(c);
    await new Promise(r => setTimeout(r, 1000));
  }
}

module.exports = { startBot, stopBot, deployEmbed, startAllBots, activeBots };
