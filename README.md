# 🤖 Telegram Referral Bot

Telegram private kanalga a'zolar jalb qilish va referral tizimi bilan ishlaydigon bot.

## 📋 Imkoniyatlar

- ✅ Foydalanuvchi kanalda a'zo ekanligini tekshirish
- 🔗 Har bir foydalanuvchi uchun unikal referral link yaratish
- 📊 Referral statistikasi va ball tizimi
- 🏆 Top foydalanuvchilar reytingi
- 🎉 Yangi a'zo qo'shilganda avtomatik xabar

## 🚀 O'rnatish

### 1. Kerakli paketlarni o'rnating

```bash
npm install
```

### 2. Bot tokenini olish

1. Telegram'da [@BotFather](https://t.me/BotFather) ga o'ting
2. `/newbot` buyrug'ini yuboring
3. Bot nomi va username'ini kiriting
4. Olingan tokenni nusxalang

### 3. Kanal ID sini olish

1. Telegram'da [@getidsbot](https://t.me/getidsbot) ga o'ting
2. Botni kanalingizga qo'shing
3. Kanalda xabar yuboring
4. Bot sizga kanal ID sini beradi (masalan: `-1001234567890`)

### 4. `.env` faylini sozlash

`.env` faylini oching va ma'lumotlarni kiriting:

```env
BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
CHANNEL_ID=-1001234567890
```

### 5. Botni kanalga qo'shish

1. Botni private kanalingizga qo'shing
2. Botni **admin** qilib qo'shing
3. Quyidagi huquqlarni bering:
   - ✅ **Invite Users via Link** (Foydalanuvchilarni link orqali taklif qilish)

### 6. Botni ishga tushirish

```bash
npm start
```

## 📖 Foydalanish

### Foydalanuvchi uchun:

1. Botga `/start` yuboring
2. Agar kanalda a'zo bo'lmasangiz, avval kanalga qo'shiling
3. Bot sizga unikal referral link beradi
4. Linkni do'stlaringizga ulashing
5. Har bir do'stingiz link orqali qo'shilganda +1 ball olasiz

### Komandalar:

- `/start` - Botni boshlash va referral link olish
- `/stats` - O'z statistikangizni ko'rish
- `/top` - Top 10 foydalanuvchilar
- `/adminstats` - Umumiy statistika
- `/help` - Yordam

## 🔧 Qanday ishlaydi?

1. **A'zolik tekshiruvi**: Foydalanuvchi `/start` bosganda, bot uni kanalda a'zo ekanligini tekshiradi
2. **Link yaratish**: Agar a'zo bo'lsa, bot unga unikal invite link yaratadi
3. **Referral tracking**: Kimdir bu link orqali kanalga qo'shilsa:
   - Link egasiga +1 ball qo'shiladi
   - Link egasiga xabar yuboriladi
   - Statistika yangilanadi

## 💡 Muhim eslatmalar

- Bot **private kanal** uchun mo'ljallangan
- Bot kanalda **admin** bo'lishi shart
- **"Invite Users via Link"** huquqi bo'lishi kerak
- Foydalanuvchi o'z linkidan kirsa, ball qo'shilmaydi
- Statistika faqat bot ishlayotgan vaqtda saqlanadi

## 📊 Xususiyatlar

- **Unikal linklar**: Har bir foydalanuvchi uchun alohida link
- **Ball tizimi**: Har bir taklif uchun +1 ball
- **Reytings**: Top foydalanuvchilar ko'rsatiladi
- **Xabarlar**: Yangi a'zo qo'shilganda avtomatik xabar
- **Statistika**: Batafsil ma'lumotlar

## 🚀 Production uchun

Botni serverda doim ishlab turishi uchun:

### PM2 bilan

```bash
npm install -g pm2
pm2 start index.js --name referral-bot
pm2 save
pm2 startup
```

### Database qo'shish

Hozircha ma'lumotlar xotirada saqlanadi. Production uchun MongoDB yoki PostgreSQL qo'shing:

```bash
npm install mongodb
# yoki
npm install pg
```

## 📝 Keyingi qadamlar

- [ ] Database integratsiyasi (MongoDB/PostgreSQL)
- [ ] Admin panel
- [ ] Export statistika (Excel/CSV)
- [ ] Mukofotlar tizimi
- [ ] Foydalanuvchi profillari

## 🤝 Qo'llab-quvvatlash

Savollar yoki muammolar bo'lsa, issue oching.

## 📄 Litsenziya

ISC
