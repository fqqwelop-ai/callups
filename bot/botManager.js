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

  // مراقبة دخول الروم
  bot.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    try {
      if (oldState.guildId !== guildId) return;
      const db = await DBClient.findOne({ guildId });
      if (!db?.settings?.watchChannelId) return;
      if (newState.channelId !== db.settings.watchChannelId) return;
      const userId = newState.member.id;
      const pendingRequests = await Request.find({ guildId, targetUserId: userId, status: 'pending' });
      if (!pendingRequests.length) return;
      for (const req of pendingRequests) {
        if (db.settings.dmToSubmitterOnJoin) {
          try {
            const submitter = await bot.users.fetch(req.submitterId);
            const msg = (db.settings.dmToSubmitterMessage || 'دخل {target} الروم المحدد!')
              .replace('{target}', newState.member.user.tag)
              .replace('{server}', db.guildName);
            await submitter.send(`📢 **إشعار كول-آب:** ${msg}`);
          } catch {}
        }
      }
    } catch (err) { console.error('VoiceState error:', err.message); }
  });

  bot.on(Events.InteractionCreate, async (interaction) => {
    try {
      const db = await DBClient.findOne({ guildId });
      if (!db) return;

      if (interaction.isButton() && interaction.customId === `callup_open_${guildId}`) {
        await handleOpenForm(interaction, db);
      }
      if (interaction.isButton() && interaction.customId.startsWith(`callup_approve_`)) {
        await handleApprove(interaction, db);
      }
      if (interaction.isButton() && interaction.customId.startsWith(`callup_reject_`)) {
        await handleReject(interaction, db);
      }
      if (interaction.isButton() && interaction.customId.startsWith(`callup_remind_person_`)) {
        await handleRemindPerson(interaction, db);
      }
      if (interaction.isButton() && interaction.customId.startsWith(`callup_remind_admin_`)) {
        await handleRemindAdmin(interaction, db);
      }
      if (interaction.isModalSubmit() && interaction.customId === `callup_modal_${guildId}`) {
        await handleModalSubmit(interaction, db);
      }
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

async function deployEmbed(guildId) {
  const bot = activeBots.get(guildId);
  if (!bot) return { success: false, error: 'البوت مو شغال' };
  const db = await DBClient.findOne({ guildId });
  if (!db?.settings?.embedChannelId) return { success: false, error: 'ما تم تحديد الروم' };
  try {
    const guild = bot.guilds.cache.get(guildId);
    const channel = guild?.channels.cache.get(db.settings.embedChannelId);
    if (!channel) return { success: false, error: 'الروم مو موجود' };
    const embed = new EmbedBuilder()
      .setTitle(db.settings.embedTitle || '📞 استدعاء')
      .setDescription(db.settings.embedDescription || 'اضغط الزر أدناه للاستدعاء')
      .setColor(db.settings.embedColor || '#5865F2')
      .setTimestamp();
    const btnStyle = { Primary: ButtonStyle.Primary, Secondary: ButtonStyle.Secondary, Success: ButtonStyle.Success, Danger: ButtonStyle.Danger }[db.settings.buttonColor] || ButtonStyle.Primary;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`callup_open_${guildId}`).setLabel(db.settings.buttonLabel || '📋 تقديم استدعاء').setStyle(btnStyle)
    );
    if (db.settings.embedMessageId) {
      try { const old = await channel.messages.fetch(db.settings.embedMessageId); await old.delete(); } catch {}
    }
    const msg = await channel.send({ embeds: [embed], components: [row] });
    await DBClient.findOneAndUpdate({ guildId }, { 'settings.embedMessageId': msg.id });
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
}

async function handleOpenForm(interaction, db) {
  const { settings, guildId } = db;
  const modal = new ModalBuilder().setCustomId(`callup_modal_${guildId}`).setTitle('📞 تقديم استدعاء');
  const components = [
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('target_user_id').setLabel('كوبي آيدي الشخص المستدعى').setStyle(TextInputStyle.Short).setPlaceholder('123456789012345678').setRequired(true)
    )
  ];
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

  const targetUserId = interaction.fields.getTextInputValue('target_user_id')?.trim();
  const reason = interaction.fields.fields.has('reason') ? interaction.fields.getTextInputValue('reason')?.trim() : '-';
  const evidence = interaction.fields.fields.has('evidence') ? interaction.fields.getTextInputValue('evidence')?.trim() : null;
  const custom1 = interaction.fields.fields.has('custom1') ? interaction.fields.getTextInputValue('custom1')?.trim() : null;
  const custom2 = interaction.fields.fields.has('custom2') ? interaction.fields.getTextInputValue('custom2')?.trim() : null;

  if (!/^\d{17,20}$/.test(targetUserId)) {
    return interaction.editReply({ content: '❌ آيدي الشخص غير صحيح!' });
  }

  // حساب الموعد النهائي من إعدادات الموقع
  const deadlineVal = settings.deadlineValue || 24;
  const deadlineUnit = settings.deadlineUnit || 'hours';
  const deadlineDate = calcDeadlineDate(deadlineVal, deadlineUnit);
  const deadlineText = formatDeadline(deadlineVal, deadlineUnit);

  let targetMember = null;
  let targetTag = targetUserId;
  try {
    targetMember = await interaction.guild.members.fetch(targetUserId);
    targetTag = targetMember.user.tag;
  } catch {}

  const request = new Request({
    guildId, submitterId: interaction.user.id, submitterTag: interaction.user.tag,
    targetUserId, targetTag, reason, evidence,
    deadline: deadlineText, deadlineDate,
    customField1: custom1, customField2: custom2,
  });
  await request.save();

  // DM للمستدعى
  if (settings.dmToTarget && targetMember) {
    try {
      const dmMsg = (settings.dmToTargetMessage || 'تم استدعاؤك في {server}. السبب: {reason}')
        .replace('{server}', db.guildName).replace('{reason}', reason).replace('{submitter}', interaction.user.tag);
      await targetMember.send(`📢 **استدعاء:** ${dmMsg}`);
    } catch {}
  }

  // إرسال اللوق
  if (settings.logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(settings.logChannelId);
    if (logChannel) {
      const labels = settings.logLabels || {};
      const logFields = settings.logFields || {};

      const embed = new EmbedBuilder()
        .setTitle('📞 تم تنفيذ الكول آب')
        .setColor(settings.embedColor || '#5865F2')
        .setTimestamp()
        .setFooter({ text: `ID: ${targetUserId}` });

      if (targetMember?.user?.displayAvatarURL) embed.setThumbnail(targetMember.user.displayAvatarURL());
      if (logFields.showSubmitter !== false) embed.addFields({ name: labels.submitter || 'تنفذ بواسطة', value: `<@${interaction.user.id}>`, inline: true });
      if (logFields.showTarget !== false) embed.addFields({ name: labels.target || 'المستدعى', value: `<@${targetUserId}>`, inline: true });
      if (logFields.showReason !== false) embed.addFields({ name: labels.reason || 'السبب', value: reason });
      // الدليل كرابط قابل للنقر
      if (evidence && logFields.showEvidence !== false) {
        const evidenceText = evidence.startsWith('http') ? `[${labels.evidence || 'الدليل'}](${evidence})` : evidence;
        embed.addFields({ name: labels.evidence || 'الدليل', value: evidenceText });
      }
      if (logFields.showDeadline !== false) embed.addFields({ name: labels.deadline || 'الموعد النهائي', value: `يبدأ من الآن — ${deadlineText}` });
      if (logFields.showRoleChange !== false) {
        const removeRole = settings.roleToRemove ? `إزالة <@&${settings.roleToRemove}>` : '-';
        const addRole = settings.roleToAdd ? `إضافة <@&${settings.roleToAdd}>` : '-';
        embed.addFields({ name: labels.roleChange || 'التغيير', value: `${removeRole}\n${addRole}` });
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

  // تغيير الرتبة
  if (targetMember) {
    try {
      if (settings.roleToRemove) await targetMember.roles.remove(settings.roleToRemove).catch(() => {});
      if (settings.roleToAdd) await targetMember.roles.add(settings.roleToAdd).catch(() => {});
    } catch {}
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
    if (db.settings.roleToAdd) await member.roles.remove(db.settings.roleToAdd).catch(() => {});
    if (db.settings.roleToRemove) await member.roles.add(db.settings.roleToRemove).catch(() => {});
  }
  await Request.findByIdAndUpdate(requestId, { status: 'approved', reviewerId: interaction.user.id, reviewedAt: new Date() });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('d1').setLabel('تذكير الشخص').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId('d2').setLabel('تذكير الإداري').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId('d3').setLabel('✅ تم إرجاع الرتبة').setStyle(ButtonStyle.Success).setDisabled(true),
    new ButtonBuilder().setCustomId('d4').setLabel('إرجاع بدون رتبة').setStyle(ButtonStyle.Danger).setDisabled(true),
  );
  await interaction.message.edit({ components: [row] });
}

async function handleReject(interaction, db) {
  const requestId = interaction.customId.replace('callup_reject_', '');
  await interaction.deferUpdate();
  await Request.findByIdAndUpdate(requestId, { status: 'rejected', reviewerId: interaction.user.id, reviewedAt: new Date() });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('d1').setLabel('تذكير الشخص').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId('d2').setLabel('تذكير الإداري').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId('d3').setLabel('إرجاع الرتبة').setStyle(ButtonStyle.Success).setDisabled(true),
    new ButtonBuilder().setCustomId('d4').setLabel('✅ إرجاع بدون رتبة').setStyle(ButtonStyle.Danger).setDisabled(true),
  );
  await interaction.message.edit({ components: [row] });
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

  // إرسال DM للإداري المحدد
  if (db.settings.deadlineAdminId) {
    try {
      const bot = activeBots.get(db.guildId);
      const admin = await bot.users.fetch(db.settings.deadlineAdminId);
      const msg = (db.settings.deadlineReminderMsg || 'تذكير: كول-آب {target} بانتظار المراجعة!')
        .replace('{target}', `<@${request?.targetUserId}>`)
        .replace('{reason}', request?.reason || '-')
        .replace('{deadline}', request?.deadline || '-');
      await admin.send(`🔔 **تذكير إداري:** ${msg}`);
    } catch {}
  }
  await interaction.editReply({ content: '✅ تم إرسال التذكير للإداري' });
}

// فحص المواعيد كل دقيقة
async function checkDeadlines() {
  try {
    const clients = await DBClient.find({ isActive: true, 'settings.deadlineReminderEnabled': true });
    for (const db of clients) {
      if (!db.settings.deadlineAdminId) continue;
      const bot = activeBots.get(db.guildId);
      if (!bot) continue;
      const expired = await Request.find({ guildId: db.guildId, status: 'pending', deadlineDate: { $lte: new Date() }, reminderSent: { $ne: true } });
      for (const req of expired) {
        try {
          const admin = await bot.users.fetch(db.settings.deadlineAdminId);
          const msg = (db.settings.deadlineReminderMsg || 'انتهى موعد كول-آب {target}! السبب: {reason}')
            .replace('{target}', `<@${req.targetUserId}>`)
            .replace('{reason}', req.reason)
            .replace('{deadline}', req.deadline || '-');
          await admin.send(`⏰ **انتهى الموعد:** ${msg}`);
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
