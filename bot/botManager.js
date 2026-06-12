const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, Events } = require('discord.js');
const { Client: DBClient, Request } = require('../shared/models');

// خزن كل البوتات النشطة
const activeBots = new Map(); // guildId -> Discord Client

// ===== تشغيل بوت لعميل معين =====
async function startBot(clientData) {
  const guildId = clientData.guildId;

  // إذا البوت شغال، وقفه أول
  if (activeBots.has(guildId)) {
    await stopBot(guildId);
  }

  const bot = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
    ]
  });

  bot.once(Events.ClientReady, async (readyClient) => {
    console.log(`✅ Bot ready for guild: ${guildId} | Tag: ${readyClient.user.tag}`);
    
    // تحديث اسم السيرفر في DB
    const guild = readyClient.guilds.cache.get(guildId);
    if (guild) {
      await DBClient.findOneAndUpdate({ guildId }, { guildName: guild.name });
    }
  });

  // ===== معالجة الأزرار =====
  bot.on(Events.InteractionCreate, async (interaction) => {
    try {
      // زر فتح الفورم
      if (interaction.isButton() && interaction.customId === `coopup_open_${guildId}`) {
        await handleOpenForm(interaction, clientData);
      }

      // تأكيد الطلب من الموديريتور
      if (interaction.isButton() && interaction.customId.startsWith(`coopup_approve_`)) {
        await handleApprove(interaction, clientData);
      }

      // رفض الطلب
      if (interaction.isButton() && interaction.customId.startsWith(`coopup_reject_`)) {
        await handleReject(interaction, clientData);
      }

      // استقبال الفورم المرسل
      if (interaction.isModalSubmit() && interaction.customId === `coopup_modal_${guildId}`) {
        await handleModalSubmit(interaction, clientData);
      }

    } catch (err) {
      console.error(`Bot error [${guildId}]:`, err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ صار خطأ، حاول مرة ثانية.', ephemeral: true });
      }
    }
  });

  try {
    await bot.login(clientData.botToken);
    activeBots.set(guildId, bot);
    return { success: true };
  } catch (err) {
    console.error(`Failed to start bot for ${guildId}:`, err.message);
    return { success: false, error: err.message };
  }
}

// ===== إيقاف البوت =====
async function stopBot(guildId) {
  if (activeBots.has(guildId)) {
    const bot = activeBots.get(guildId);
    bot.destroy();
    activeBots.delete(guildId);
    console.log(`🛑 Bot stopped for guild: ${guildId}`);
  }
}

// ===== نشر الإمبيد في الروم =====
async function deployEmbed(guildId) {
  const bot = activeBots.get(guildId);
  if (!bot) return { success: false, error: 'البوت مو شغال' };

  const clientData = await DBClient.findOne({ guildId });
  if (!clientData) return { success: false, error: 'العميل مو موجود' };

  const { settings } = clientData;
  if (!settings.embedChannelId) return { success: false, error: 'ما تم تحديد الروم' };

  try {
    const guild = bot.guilds.cache.get(guildId);
    if (!guild) return { success: false, error: 'البوت مو في السيرفر' };

    const channel = guild.channels.cache.get(settings.embedChannelId);
    if (!channel) return { success: false, error: 'الروم مو موجود' };

    const embed = new EmbedBuilder()
      .setTitle(settings.embedTitle || '🛡️ طلب كوب-آب')
      .setDescription(settings.embedDescription || 'اضغط الزر أدناه لتقديم طلب كوب-آب')
      .setColor(settings.embedColor || '#5865F2')
      .setTimestamp()
      .setFooter({ text: 'نظام الكوب-آب' });

    const buttonStyle = {
      'Primary': ButtonStyle.Primary,
      'Secondary': ButtonStyle.Secondary,
      'Success': ButtonStyle.Success,
      'Danger': ButtonStyle.Danger,
    }[settings.buttonColor] || ButtonStyle.Primary;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`coopup_open_${guildId}`)
        .setLabel(settings.buttonLabel || '📋 تقديم طلب')
        .setStyle(buttonStyle)
    );

    // حذف الإمبيد القديم إذا موجود
    if (settings.embedMessageId) {
      try {
        const oldMsg = await channel.messages.fetch(settings.embedMessageId);
        await oldMsg.delete();
      } catch {}
    }

    const msg = await channel.send({ embeds: [embed], components: [row] });

    // حفظ ID الرسالة
    await DBClient.findOneAndUpdate(
      { guildId },
      { 'settings.embedMessageId': msg.id }
    );

    return { success: true, messageId: msg.id };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ===== فتح الفورم =====
async function handleOpenForm(interaction, clientData) {
  const { settings, guildId } = clientData;

  const modal = new ModalBuilder()
    .setCustomId(`coopup_modal_${guildId}`)
    .setTitle('📋 طلب كوب-آب');

  const components = [];

  // آيدي الشخص (ثابت دايماً)
  if (settings.formFields?.userId !== false) {
    components.push(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('target_user_id')
          .setLabel('كوبي آيدي الشخص المستهدف')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('مثال: 123456789012345678')
          .setRequired(true)
      )
    );
  }

  // السبب
  if (settings.formFields?.reason !== false) {
    components.push(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('السبب')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('اكتب السبب هنا...')
          .setRequired(true)
      )
    );
  }

  // الدليل
  if (settings.formFields?.evidence !== false) {
    components.push(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('evidence')
          .setLabel('الدليل (رابط)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('https://...')
          .setRequired(false)
      )
    );
  }

  // حقل مخصص 1
  if (settings.formFields?.customField1) {
    components.push(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('custom_field_1')
          .setLabel(settings.formFields.customField1)
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      )
    );
  }

  // حقل مخصص 2
  if (settings.formFields?.customField2) {
    components.push(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('custom_field_2')
          .setLabel(settings.formFields.customField2)
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      )
    );
  }

  modal.addComponents(...components);
  await interaction.showModal(modal);
}

// ===== معالجة إرسال الفورم =====
async function handleModalSubmit(interaction, clientData) {
  const { settings, guildId } = clientData;

  await interaction.deferReply({ ephemeral: true });

  const targetUserId = interaction.fields.getTextInputValue('target_user_id')?.trim();
  const reason = interaction.fields.getTextInputValue('reason')?.trim();
  const evidence = interaction.fields.getTextInputValue('evidence')?.trim() || null;
  const customField1 = settings.formFields?.customField1 
    ? interaction.fields.getTextInputValue('custom_field_1')?.trim() 
    : null;
  const customField2 = settings.formFields?.customField2
    ? interaction.fields.getTextInputValue('custom_field_2')?.trim()
    : null;

  // تحقق من صحة الآيدي
  if (!/^\d{17,20}$/.test(targetUserId)) {
    return interaction.editReply({ content: '❌ آيدي الشخص غير صحيح! يجب أن يكون رقماً فقط.' });
  }

  // حفظ الطلب في DB
  const request = new Request({
    guildId,
    submitterId: interaction.user.id,
    submitterTag: interaction.user.tag,
    targetUserId,
    reason,
    evidence,
    customField1,
    customField2,
  });
  await request.save();

  // إرسال إلى روم الطلبات
  if (settings.formSubmitChannelId) {
    const submitChannel = interaction.guild.channels.cache.get(settings.formSubmitChannelId);
    if (submitChannel) {
      const requestEmbed = new EmbedBuilder()
        .setTitle('📬 طلب كوب-آب جديد')
        .setColor('#FFA500')
        .addFields(
          { name: '👤 مقدم الطلب', value: `<@${interaction.user.id}> (${interaction.user.id})`, inline: true },
          { name: '🎯 الشخص المستهدف', value: `<@${targetUserId}> (${targetUserId})`, inline: true },
          { name: '📝 السبب', value: reason },
        )
        .setTimestamp()
        .setFooter({ text: `طلب #${request._id}` });

      if (evidence) requestEmbed.addFields({ name: '🔗 الدليل', value: evidence });
      if (customField1 && settings.formFields?.customField1) {
        requestEmbed.addFields({ name: settings.formFields.customField1, value: customField1 });
      }
      if (customField2 && settings.formFields?.customField2) {
        requestEmbed.addFields({ name: settings.formFields.customField2, value: customField2 });
      }

      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`coopup_approve_${request._id}`)
          .setLabel('✅ موافقة')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`coopup_reject_${request._id}`)
          .setLabel('❌ رفض')
          .setStyle(ButtonStyle.Danger),
      );

      await submitChannel.send({ embeds: [requestEmbed], components: [actionRow] });
    }
  }

  await interaction.editReply({ content: '✅ تم إرسال طلبك بنجاح! سيتم مراجعته قريباً.' });
}

// ===== الموافقة على الطلب =====
async function handleApprove(interaction, clientData) {
  const { settings, guildId } = clientData;
  const requestId = interaction.customId.replace('coopup_approve_', '');

  await interaction.deferUpdate();

  const request = await Request.findById(requestId);
  if (!request || request.status !== 'pending') {
    return interaction.followUp({ content: '❌ هذا الطلب تمت معالجته مسبقاً.', ephemeral: true });
  }

  try {
    const guild = interaction.guild;
    const member = await guild.members.fetch(request.targetUserId).catch(() => null);

    if (!member) {
      return interaction.followUp({ content: '❌ العضو مو موجود في السيرفر.', ephemeral: true });
    }

    // شيل الرتبة القديمة وأعطيه رتبة جديدة
    if (settings.roleToRemove && member.roles.cache.has(settings.roleToRemove)) {
      await member.roles.remove(settings.roleToRemove);
    }
    if (settings.roleToAdd) {
      await member.roles.add(settings.roleToAdd);
    }

    // تحديث الطلب
    await Request.findByIdAndUpdate(requestId, {
      status: 'approved',
      reviewerId: interaction.user.id,
      reviewerTag: interaction.user.tag,
      reviewedAt: new Date(),
    });

    // تعطيل الأزرار
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`done_approve`).setLabel('✅ تم الموافقة').setStyle(ButtonStyle.Success).setDisabled(true),
      new ButtonBuilder().setCustomId(`done_reject`).setLabel('❌ رفض').setStyle(ButtonStyle.Danger).setDisabled(true),
    );
    await interaction.message.edit({ components: [disabledRow] });

    // إرسال لوق
    await sendLog(interaction, clientData, request, 'approved');

  } catch (err) {
    console.error('Approve error:', err);
    await interaction.followUp({ content: `❌ خطأ: ${err.message}`, ephemeral: true });
  }
}

// ===== رفض الطلب =====
async function handleReject(interaction, clientData) {
  const requestId = interaction.customId.replace('coopup_reject_', '');

  await Request.findByIdAndUpdate(requestId, {
    status: 'rejected',
    reviewerId: interaction.user.id,
    reviewerTag: interaction.user.tag,
    reviewedAt: new Date(),
  });

  const disabledRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`done_approve`).setLabel('✅ موافقة').setStyle(ButtonStyle.Success).setDisabled(true),
    new ButtonBuilder().setCustomId(`done_reject`).setLabel('❌ تم الرفض').setStyle(ButtonStyle.Danger).setDisabled(true),
  );
  await interaction.message.edit({ components: [disabledRow] });

  const request = await Request.findById(requestId);
  await sendLog(interaction, clientData, request, 'rejected');
  await interaction.deferUpdate();
}

// ===== إرسال اللوق =====
async function sendLog(interaction, clientData, request, status) {
  const { settings } = clientData;
  if (!settings.logChannelId) return;

  const logChannel = interaction.guild.channels.cache.get(settings.logChannelId);
  if (!logChannel) return;

  const color = status === 'approved' ? '#00FF00' : '#FF0000';
  const statusText = status === 'approved' ? '✅ موافق عليه' : '❌ مرفوض';

  const logEmbed = new EmbedBuilder()
    .setTitle(`📋 لوق طلب - ${statusText}`)
    .setColor(color)
    .addFields(
      { name: '👤 مقدم الطلب', value: `<@${request.submitterId}> (${request.submitterId})`, inline: true },
      { name: '🎯 المستهدف', value: `<@${request.targetUserId}> (${request.targetUserId})`, inline: true },
      { name: '👮 المراجع', value: `<@${interaction.user.id}>`, inline: true },
      { name: '📝 السبب', value: request.reason },
    )
    .setTimestamp()
    .setFooter({ text: `طلب #${request._id}` });

  if (request.evidence) logEmbed.addFields({ name: '🔗 الدليل', value: request.evidence });

  await logChannel.send({ embeds: [logEmbed] });
}

// ===== تشغيل كل البوتات النشطة عند بدء التشغيل =====
async function startAllBots() {
  const clients = await DBClient.find({ isActive: true });
  console.log(`🚀 Starting ${clients.length} bots...`);

  for (const clientData of clients) {
    await startBot(clientData);
    // تأخير بسيط بين كل بوت وثاني
    await new Promise(r => setTimeout(r, 1000));
  }
}

module.exports = { startBot, stopBot, deployEmbed, startAllBots, activeBots };
