# 🛡️ CoopBot System

نظام كوب-آب متكامل للديسكورد - يدعم سيرفرات متعددة مع داشبورد لكل عميل.

---

## 🗂️ هيكل المشروع

```
coopbot/
├── index.js              # نقطة الدخول الرئيسية (Express server)
├── package.json
├── railway.json          # إعدادات Railway
├── .env.example          # مثال على متغيرات البيئة
├── bot/
│   └── botManager.js     # مدير البوتات المتعددة
├── dashboard/
│   └── routes.js         # API routes للداشبورد
├── admin/
│   └── routes.js         # API routes للوحة الأدمن
├── shared/
│   └── models.js         # MongoDB models
└── public/
    ├── index.html        # داشبورد العميل
    └── admin.html        # لوحة الأدمن
```

---

## 🚀 الإعداد على Railway

### 1. إنشاء Discord Application
1. اذهب إلى https://discord.com/developers/applications
2. أنشئ Application جديد لكل عميل
3. اذهب إلى Bot → أنشئ Bot → انسخ التوكن
4. فعّل: `Server Members Intent` + `Message Content Intent`
5. أضف البوت للسيرفر بالصلاحيات التالية:
   - `Manage Roles`
   - `Send Messages`
   - `Use Application Commands`

### 2. إنشاء MongoDB Atlas
1. أنشئ حساب على https://mongodb.com/atlas
2. أنشئ Cluster مجاني
3. احصل على Connection String

### 3. Deploy على Railway
1. ارفع المشروع على GitHub
2. اذهب إلى https://railway.app
3. New Project → Deploy from GitHub
4. أضف المتغيرات في Environment Variables:

```
MONGODB_URI=mongodb+srv://...
SESSION_SECRET=random_long_string_here
ADMIN_PASSWORD=your_secure_admin_password
PORT=3000
```

---

## 📖 طريقة الاستخدام

### للأدمن (أنت):
1. اذهب إلى `https://your-domain.up.railway.app/admin`
2. أدخل `ADMIN_PASSWORD`
3. أضف عميل جديد:
   - **Guild ID**: آيدي سيرفر الديسكورد
   - **Bot Token**: توكن البوت المخصص للعميل
   - **كلمة مرور**: كلمة مرور العميل لداشبورده
4. البوت يشتغل تلقائياً

### للعميل (المشتري):
1. اذهب إلى `https://your-domain.up.railway.app`
2. أدخل Guild ID وكلمة المرور
3. اضبط الإعدادات:
   - **روم الإمبيد**: روم يحط فيه الرسالة الثابتة
   - **الرتب**: الرتبة اللي تنشال والرتبة اللي تنحط
   - **روم الطلبات**: روم يجي فيه كل طلب
   - **روم اللوق**: روم يسجل فيه كل العمليات
4. اضغط "نشر الإمبيد" وخلاص!

---

## ⚙️ كيف يشتغل البوت؟

```
المستخدم يضغط زر الإمبيد
    ↓
يظهر Modal (فورم) فيه:
  - كوبي آيدي الشخص المستهدف
  - السبب
  - الدليل (رابط)
  - حقول مخصصة (اختياري)
    ↓
الطلب يروح لروم الطلبات (Embed + أزرار موافقة/رفض)
    ↓
الموديريتور يوافق → البوت يشيل الرتبة القديمة ويحط الجديدة
    ↓
يتسجل اللوق في روم اللوق
```

---

## 🔧 استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| البوت مو نشط | تحقق من التوكن في لوحة الأدمن → أعد التشغيل |
| ما يقدر يغير الرتب | تأكد أن رتبة البوت أعلى من الرتب المستهدفة |
| الإمبيد ما ينشر | تأكد أن البوت عنده صلاحية `Send Messages` في الروم |
| خطأ في MongoDB | تحقق من `MONGODB_URI` وأن الـ IP مسموح |

---

## 💡 ملاحظات مهمة

- كل عميل يحتاج **بوت منفصل** (Application + Token مختلف)
- البوت يحتاج يكون في السيرفر **قبل** إضافته من الأدمن
- رتبة البوت لازم تكون **أعلى** من الرتب اللي يغيرها
- السيرفر يحفظ كل الطلبات في MongoDB تلقائياً
