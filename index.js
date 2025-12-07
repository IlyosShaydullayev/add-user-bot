require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// chat_member updatelarini olish uchun zarur
bot.telegram.setMyCommands([
  { command: 'start', description: 'Boshlash va link olish' },
  { command: 'stats', description: 'Statistikani ko\'rish' },
  { command: 'top', description: 'Top foydalanuvchilar' },
  { command: 'help', description: 'Yordam' }
]);

// Kanal ID (.env faylida saqlash kerak)
const CHANNEL_ID = process.env.CHANNEL_ID; // Masalan: -1001234567890

// Foydalanuvchilar va ularning linklari
const userLinks = new Map(); // userId -> {link, inviteCount, referrals: []}
const linkToUser = new Map(); // link -> userId

// Bot bilan birinchi marta bog'lanish
bot.start(async (ctx) => {
  try {
    const userId = ctx.from.id;
    const userName = ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : '');
    const userUsername = ctx.from.username ? `@${ctx.from.username}` : '';

    // 1. Kanalda a'zo ekanligini tekshirish
    let isMember = false;
    try {
      const member = await ctx.telegram.getChatMember(CHANNEL_ID, userId);
      isMember = ['member', 'administrator', 'creator'].includes(member.status);
    } catch (error) {
      console.error('Kanal tekshirishda xatolik:', error);
      return ctx.reply('❌ Xatolik yuz berdi. Botni to\'g\'ri sozlang va qayta urinib ko\'ring.');
    }

    // 2. Agar a'zo bo'lmasa - kanalga a'zo bo'lishni talab qilish
    if (!isMember) {
      return ctx.reply(
        '❌ Siz hali kanalimiz a\'zosi emassiz!\n\n' +
        '👉 Avval kanalga qo\'shiling, keyin qayta /start bosing.',
        Markup.inlineKeyboard([
          [Markup.button.url('📢 Kanalga qo\'shilish', `https://t.me/${CHANNEL_ID.replace('@', '')}`)],
          [Markup.button.callback('✅ A\'zo bo\'ldim, tekshirish', 'check_membership')]
        ])
      );
    }

    // 3. Agar a'zo bo'lsa va linkı yo'q bo'lsa - yangi link yaratish
    if (!userLinks.has(userId)) {
      try {
        // Unikal invite link yaratish
        const inviteLink = await ctx.telegram.createChatInviteLink(CHANNEL_ID, {
          name: `${userName} referral`,
          creates_join_request: false
        });

        // Foydalanuvchi ma'lumotlarini saqlash
        userLinks.set(userId, {
          link: inviteLink.invite_link,
          inviteCount: 0,
          referrals: [],
          userName: userName,
          userUsername: userUsername,
          createdAt: new Date()
        });

        linkToUser.set(inviteLink.invite_link, userId);

        // Linkni yuborish
        await ctx.reply(
          `✅ Xush kelibsiz, ${userName}!\n\n` +
          `🎉 Sizning shaxsiy referral linkingiz:\n` +
          `🔗 ${inviteLink.invite_link}\n\n` +
          `💡 Bu linkni do'stlaringizga ulashing!\n` +
          `👥 Har bir do'stingiz bu link orqali kanalga qo'shilganda sizga +1 ball beriladi.\n\n` +
          `📊 /stats - Statistikangizni ko'rish`
        );

        console.log(`✅ Yangi foydalanuvchi: ${userName} (${userId})`);

      } catch (error) {
        console.error('Link yaratishda xatolik:', error);
        return ctx.reply('❌ Link yaratishda xatolik yuz berdi. Bot kanalda admin ekanligini tekshiring!');
      }
    } else {
      // Agar link mavjud bo'lsa - mavjud linkni ko'rsatish
      const userData = userLinks.get(userId);
      await ctx.reply(
        `✅ Xush kelibsiz, ${userName}!\n\n` +
        `🔗 Sizning referral linkingiz:\n` +
        `${userData.link}\n\n` +
        `👥 Taklif qilganlar: ${userData.inviteCount} ta\n\n` +
        `📊 /stats - Batafsil statistika`
      );
    }

  } catch (error) {
    console.error('Start komandasi xatoligi:', error);
    ctx.reply('❌ Xatolik yuz berdi: ' + error.message);
  }
});

// A'zolikni tekshirish callback
bot.action('check_membership', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    
    const userId = ctx.from.id;
    const member = await ctx.telegram.getChatMember(CHANNEL_ID, userId);
    const isMember = ['member', 'administrator', 'creator'].includes(member.status);

    if (isMember) {
      await ctx.deleteMessage();
      // /start komandasini qayta ishga tushirish
      ctx.startPayload = '';
      return bot.handleUpdate({
        update_id: ctx.update.update_id,
        message: {
          message_id: ctx.update.callback_query.message.message_id,
          from: ctx.from,
          chat: ctx.chat,
          date: Date.now(),
          text: '/start'
        }
      });
    } else {
      await ctx.answerCbQuery('❌ Siz hali kanalga qo\'shilmadingiz!', { show_alert: true });
    }
  } catch (error) {
    console.error('Callback xatoligi:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi');
  }
});

// Statistika
bot.command('stats', (ctx) => {
  try {
    const userId = ctx.from.id;
    
    if (!userLinks.has(userId)) {
      return ctx.reply('❌ Siz hali ro\'yxatdan o\'tmagansiz.\n\n/start bosing.');
    }

    const userData = userLinks.get(userId);
    let message = '📊 Sizning statistikangiz:\n\n';
    message += `🔗 Sizning linkingiz:\n${userData.link}\n\n`;
    message += `👥 Siz taklif qilgan a'zolar: ${userData.inviteCount} ta\n`;
    message += `⭐ Ballingiz: ${userData.inviteCount} ball\n\n`;

    if (userData.referrals.length > 0) {
      message += `📋 So'nggi 10 ta taklif qilganlaringiz:\n`;
      userData.referrals.slice(-10).reverse().forEach((ref, index) => {
        const name = ref.name;
        const date = new Date(ref.joinedAt).toLocaleString('uz-UZ', { 
          day: '2-digit', 
          month: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        message += `${index + 1}. ${name} - ${date}\n`;
      });
    }

    ctx.reply(message);

  } catch (error) {
    console.error('Stats xatoligi:', error);
    ctx.reply('❌ Xatolik yuz berdi');
  }
});

// Top foydalanuvchilar
bot.command('top', (ctx) => {
  try {
    if (userLinks.size === 0) {
      return ctx.reply('📊 Hozircha foydalanuvchilar yo\'q.');
    }

    // Foydalanuvchilarni ball bo'yicha saralash
    const topUsers = Array.from(userLinks.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.inviteCount - a.inviteCount)
      .slice(0, 10);

    let message = '🏆 TOP 10 Foydalanuvchilar:\n\n';
    
    topUsers.forEach((user, index) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      message += `${emoji} ${user.userName} - ${user.inviteCount} ball\n`;
    });

    ctx.reply(message);

  } catch (error) {
    console.error('Top xatoligi:', error);
    ctx.reply('❌ Xatolik yuz berdi');
  }
});

// Admin statistikasi
bot.command('adminstats', (ctx) => {
  try {
    let message = '📊 Umumiy statistika:\n\n';
    message += `👥 Jami foydalanuvchilar: ${userLinks.size} ta\n`;
    
    let totalInvites = 0;
    userLinks.forEach(data => {
      totalInvites += data.inviteCount;
    });
    
    message += `🔗 Jami taklif qilinganlar: ${totalInvites} ta\n`;

    ctx.reply(message);

  } catch (error) {
    console.error('Admin stats xatoligi:', error);
    ctx.reply('❌ Xatolik yuz berdi');
  }
});

// Yangi a'zo qo'shilganda
bot.on('chat_member', async (ctx) => {
  try {
    const update = ctx.chatMember;
    
    console.log('📥 Chat member update:', JSON.stringify(update, null, 2));
    
    // Faqat bizning kanalimiz uchun
    if (update.chat.id.toString() !== CHANNEL_ID.toString()) {
      console.log(`⚠️ Boshqa kanal: ${update.chat.id}`);
      return;
    }

    const oldStatus = update.old_chat_member.status;
    const newStatus = update.new_chat_member.status;
    
    console.log(`👤 Status o'zgarishi: ${oldStatus} -> ${newStatus}`);
    
    // Yangi a'zo qo'shilganini tekshirish
    if ((oldStatus === 'left' || oldStatus === 'kicked') && 
        (newStatus === 'member' || newStatus === 'administrator')) {
      
      const newUser = update.new_chat_member.user;
      const newUserId = newUser.id;
      const newUserName = newUser.first_name + (newUser.last_name ? ' ' + newUser.last_name : '');

      console.log(`✅ Yangi a'zo: ${newUserName} (${newUserId})`);

      // Invite link orqali qo'shilganligini tekshirish
      if (update.invite_link) {
        const inviteLink = update.invite_link.invite_link;
        
        console.log(`🔗 Invite link: ${inviteLink}`);
        
        // Bu linkni kim yaratgan?
        if (linkToUser.has(inviteLink)) {
          const referrerId = linkToUser.get(inviteLink);
          
          console.log(`👤 Link egasi: ${referrerId}`);
          
          // O'zini o'zi taklif qilishini oldini olish
          if (referrerId === newUserId) {
            console.log(`⚠️ ${newUserName} o'z linkidan kirdi`);
            return;
          }
          
          const referrerData = userLinks.get(referrerId);
          
          if (referrerData) {
            // Takrorlanmaslik uchun tekshirish
            if (!referrerData.referrals.find(r => r.userId === newUserId)) {
              // Ball qo'shish
              referrerData.inviteCount++;
              referrerData.referrals.push({
                userId: newUserId,
                name: newUserName,
                joinedAt: new Date()
              });
              
              userLinks.set(referrerId, referrerData);
              
              console.log(`✅✅✅ ${referrerData.userName} ga +1 ball qo'shildi! Jami: ${referrerData.inviteCount}`);
              
              // Referrerga xabar yuborish
              try {
                await ctx.telegram.sendMessage(
                  referrerId,
                  `🎉 Tabriklaymiz!\n\n` +
                  `👤 ${newUserName} sizning linkingiz orqali kanalga qo'shildi!\n\n` +
                  `⭐ Sizning ballingiz: ${referrerData.inviteCount}\n\n` +
                  `📊 /stats - Statistikani ko'rish`
                );
                console.log(`📨 Xabar yuborildi: ${referrerId}`);
              } catch (msgError) {
                console.error('❌ Xabar yuborishda xatolik:', msgError);
              }
            } else {
              console.log(`⚠️ Bu foydalanuvchi allaqachon hisobga olingan: ${newUserId}`);
            }
          } else {
            console.log(`⚠️ Referrer ma'lumotlari topilmadi: ${referrerId}`);
          }
        } else {
          console.log(`⚠️ Link egasi topilmadi: ${inviteLink}`);
        }
      } else {
        console.log(`⚠️ Invite link ma'lumoti yo'q`);
      }
    } else {
      console.log(`ℹ️ Status o'zgarishi: ${oldStatus} -> ${newStatus} (yangi a'zo emas)`);
    }
  } catch (error) {
    console.error('Chat member update xatoligi:', error);
  }
});

// Help
bot.command('help', (ctx) => {
  ctx.reply(
    '📖 Bot buyruqlari:\n\n' +
    '/start - Boshlash va link olish\n' +
    '/stats - Sizning statistikangiz\n' +
    '/top - TOP 10 foydalanuvchilar\n' +
    '/adminstats - Umumiy statistika\n' +
    '/help - Yordam\n\n' +
    '💡 Qanday ishlaydi:\n' +
    '1. Botga /start bosing\n' +
    '2. Kanalga a\'zo bo\'ling\n' +
    '3. Sizga unikal referral link beriladi\n' +
    '4. Linkni do\'stlaringizga ulashing\n' +
    '5. Har bir do\'stingiz uchun +1 ball oling!'
  );
});

// Xatoliklarni ushlash
bot.catch((err, ctx) => {
  console.error('Bot xatoligi:', err);
});

// Botni ishga tushirish
bot.launch({
  allowedUpdates: ['message', 'callback_query', 'chat_member']
})
  .then(() => {
    console.log('✅ Referral bot ishga tushdi!');
    console.log(`📢 Kanal ID: ${CHANNEL_ID}`);
    console.log('⚙️ Chat member updates yoqildi');
  })
  .catch((err) => {
    console.error('❌ Botni ishga tushirishda xatolik:', err);
  });

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
