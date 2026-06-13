const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, Events } = require('discord.js');
const { Client: DBClient, Request } = require('../shared/models');

const activeBots = new Map();

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

  // مراقبة دخول الروم (Voice State)
  bot.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    try {
      if (oldState.guildId !== guildId) return;
      const db = await DBClient.findOne({ guildId });
      if (!db?.settings?.watchChannelId) return;
      if (newState.channelId !== db.settings.watchChannelId) return;

      // شخص دخل الروم المحدد
      const userId = newState.member.id;
      const pendingRequests = await Request.find({ guildId, targetUserId: userId, status: 'pending' });
      if (!pendingRequests.length) return;

      for (const req of pendingRequests) {
        // أرسل رسالة للمستدعي
        if (db.settings.dmToSubmitterOnJoin) {
          try {
            const submitter = await bot.users.fetch(req.submitterId);
            const msg = (db.settings.dmToSubmitterMessage || 'دخل {target} الروم المحدد!')
              .replace('{target}', `<@${userId}>`)
              .replace('{server}', db.guildName);
            await submitter.send(`📢 **إشعار كول-آب:** ${msg}`);
          } catch {}
        }
      }
    } catch (err) {
      console.error('VoiceState error:', err.message);
    }
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
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ صار خطأ، حاول مرة ثانية.', ephemeral: true });
        }
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

    const btnStyle = {
      'Primary': ButtonStyle.Primary, 'Secondary': ButtonStyle.Secondary,
      'Success': ButtonStyle.Success, 'Danger': ButtonStyle.Danger,
    }[db.settings.buttonColor] || ButtonStyle.Primary;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`callup_open_${guildId}`)
        .setLabel(db.settings.buttonLabel || '📋 تقديم استدعاء')
        .setStyle(btnStyle)
    );

    if (db.settings.embedMessageId) {
      try {
        const old = await channel.messages.fetch(db.settings.embedMessageId);
        await old.delete();
      } catch {}
    }

    const msg = await channel.send({ embeds: [embed], components: [row] });
    await DBClient.findOneAndUpdate({ guildId }, { 'settings.embedMessageId': msg.id });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleOpenForm(interaction, db) {
  const { settings, guildId } = db;
  const modal = new ModalBuilder()
    .setCustomId(`callup_modal_${guildId}`)
    .setTitle('📞 تقديم استدعاء');

  const components = [
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('target_user_id')
        .setLabel('كوبي آيدي الشخص المستدعى')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('123456789012345678')
        .setRequired(true)
    )
  ];

  if (settings.formFields?.reason !== false) {
    components.push(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('reason')
        .setLabel(settings.logLabels?.reason || 'السبب')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
    ));
  }

  if (settings.formFields?.evidence !== false) {
    components.push(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('evidence')
        .setLabel(settings.logLabels?.evidence || 'الدليل (رابط)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
    ));
  }

  if (settings.formFields?.deadline !== false) {
    components.push(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('deadline')
        .setLabel('الموعد النهائي')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`مثال: بعد 24 ساعة أو يبدأ عند دخول الروم`)
        .setRequired(false)
    ));
  }

  if (settings.formFields?.customField1) {
    components.push(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('custom1')
        .setLabel(settings.formFields.customField1)
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
    ));
  }

  modal.addComponents(...components.slice(0, 5));
  await interaction.showModal(modal);
}

async function handleModalSubmit(interaction, db) {
  const { settings, guildId } = db;
  await interaction.deferReply({ ephemeral: true });

  const targetUserId = interaction.fields.getTextInputValue('target_user_id')?.trim();
  const reason = interaction.fields.getTextInputValue('reason')?.trim() || '-';
  const evidence = interaction.fields.fields.has('evidence') ? interaction.fields.getTextInputValue('evidence')?.trim() : null;
  const deadline = interaction.fields.fields.has('deadline') ? interaction.fields.getTextInputValue('deadline')?.trim() : null;
  const custom1 = interaction.fields.fields.has('custom1') ? interaction.fields.getTextInputValue('custom1')?.trim() : null;

  if (!/^\d{17,20}$/.test(targetUserId)) {
    return interaction.editReply({ content: '❌ آيدي الشخص غير صحيح!' });
  }

  // جلب معلومات المستدعى
  let targetMember = null;
  let targetTag = targetUserId;
  try {
    targetMember = await interaction.guild.members.fetch(targetUserId);
    targetTag = targetMember.user.tag;
  } catch {}

  const request = new Request({
    guildId, submitterId: interaction.user.id, submitterTag: interaction.user.tag,
    targetUserId, targetTag, reason, evidence, deadline, customField1: custom1,
  });
  await request.save();

  // إرسال DM للمستدعى
  if (settings.dmToTarget && targetMember) {
    try {
      const dmMsg = (settings.dmToTargetMessage || 'تم استدعاؤك في {server}. السبب: {reason}')
        .replace('{server}', db.guildName)
        .replace('{reason}', reason)
        .replace('{submitter}', interaction.user.tag);
      await targetMember.send(`📢 **استدعاء:** ${dmMsg}`);
    } catch {}
  }

  // إرسال للوق
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

      if (logFields.showSubmitter !== false) {
        embed.addFields({ name: labels.submitter || 'تنفذ بواسطة', value: `<@${interaction.user.id}>`, inline: true });
      }
      if (logFields.showTarget !== false) {
        embed.addFields({ name: labels.target || 'المستدعى', value: `<@${targetUserId}>`, inline: true });
      }
      if (logFields.showReason !== false) {
        embed.addFields({ name: labels.reason || 'السبب', value: reason });
      }
      if (evidence && logFields.showEvidence !== false) {
        embed.addFields({ name: labels.evidence || 'الدليل', value: evidence });
      }
      if (deadline && logFields.showDeadline !== false) {
        embed.addFields({ name: labels.deadline || 'الموعد النهائي', value: deadline });
      }
      if (logFields.showRoleChange !== false) {
        const removeRole = settings.roleToRemove ? `إزالة <@&${settings.roleToRemove}>` : '-';
        const addRole = settings.roleToAdd ? `إضافة <@&${settings.roleToAdd}>` : '-';
        embed.addFields({ name: labels.roleChange || 'التغيير', value: `${removeRole}\n${addRole}` });
      }
      if (custom1 && settings.formFields?.customField1) {
        embed.addFields({ name: settings.formFields.customField1, value: custom1 });
      }

      // إضافة صورة المستدعى إن وجدت
      if (targetMember?.user?.displayAvatarURL) {
        embed.setThumbnail(targetMember.user.displayAvatarURL());
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`callup_remind_person_${request._id}`).setLabel('تذكير الشخص').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`callup_remind_admin_${request._id}`).setLabel('تذكير الإداري').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`callup_approve_${request._id}`).setLabel('إرجاع الرتبة').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`callup_reject_${request._id}`).setLabel('إرجاع بدون رتبة').setStyle(ButtonStyle.Danger),
      );

      await logChannel.send({ embeds: [embed], components: [row] });
    }
  }

  // تغيير الرتبة تلقائياً
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

  const guild = interaction.guild;
  const member = await guild.members.fetch(request.targetUserId).catch(() => null);

  if (member) {
    if (db.settings.roleToAdd) await member.roles.remove(db.settings.roleToAdd).catch(() => {});
    if (db.settings.roleToRemove) await member.roles.add(db.settings.roleToRemove).catch(() => {});
  }

  await Request.findByIdAndUpdate(requestId, { status: 'approved', reviewerId: interaction.user.id, reviewedAt: new Date() });

  const disabledRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('d1').setLabel('تذكير الشخص').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId('d2').setLabel('تذكير الإداري').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId('d3').setLabel('✅ تم إرجاع الرتبة').setStyle(ButtonStyle.Success).setDisabled(true),
    new ButtonBuilder().setCustomId('d4').setLabel('إرجاع بدون رتبة').setStyle(ButtonStyle.Danger).setDisabled(true),
  );
  await interaction.message.edit({ components: [disabledRow] });
}

async function handleReject(interaction, db) {
  const requestId = interaction.customId.replace('callup_reject_', '');
  await interaction.deferUpdate();
  await Request.findByIdAndUpdate(requestId, { status: 'rejected', reviewerId: interaction.user.id, reviewedAt: new Date() });

  const disabledRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('d1').setLabel('تذكير الشخص').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId('d2').setLabel('تذكير الإداري').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId('d3').setLabel('إرجاع الرتبة').setStyle(ButtonStyle.Success).setDisabled(true),
    new ButtonBuilder().setCustomId('d4').setLabel('✅ إرجاع بدون رتبة').setStyle(ButtonStyle.Danger).setDisabled(true),
  );
  await interaction.message.edit({ components: [disabledRow] });
}

async function handleRemindPerson(interaction, db) {
  const requestId = interaction.customId.replace('callup_remind_person_', '');
  await interaction.deferReply({ ephemeral: true });
  const request = await Request.findById(requestId);
  if (!request) return interaction.editReply({ content: '❌ الطلب مو موجود' });

  try {
    const member = await interaction.guild.members.fetch(request.targetUserId);
    await member.send(`🔔 **تذكير:** أنت مستدعى في سيرفر **${db.guildName}**. السبب: ${request.reason}`);
    await interaction.editReply({ content: '✅ تم إرسال التذكير للشخص' });
  } catch {
    await interaction.editReply({ content: '❌ ما قدرت أرسل رسالة للشخص (ربما أوقف الـ DMs)' });
  }
}

async function handleRemindAdmin(interaction, db) {
  const requestId = interaction.customId.replace('callup_remind_admin_', '');
  await interaction.deferReply({ ephemeral: true });

  if (db.settings.formSubmitChannelId) {
    const ch = interaction.guild.channels.cache.get(db.settings.formSubmitChannelId);
    if (ch) await ch.send(`🔔 **تذكير إداري:** طلب كول-آب بانتظار المراجعة! المسؤول: <@${interaction.user.id}>`);
  }
  await interaction.editReply({ content: '✅ تم إرسال التذكير' });
}

async function startAllBots() {
  const clients = await DBClient.find({ isActive: true });
  console.log(`🚀 Starting ${clients.length} bots...`);
  for (const c of clients) {
    await startBot(c);
    await new Promise(r => setTimeout(r, 1000));
  }
}

module.exports = { startBot, stopBot, deployEmbed, startAllBots, activeBots };
