# نظام متكامل للمراسلات والسكرابر

هذا المشروع هو واجهة برمجة تطبيقات متكاملة (API) تجمع بين وظائف روبوت WhatsApp ونظام استخراج البيانات من المواقع (Scraper) وخدمة تيليجرام (Telegram).

## المميزات

### خدمة روبوت WhatsApp

-   مصادقة وإنشاء رمز QR للاتصال بـ WhatsApp
-   إرسال واستقبال رسائل النصوص، الصور، الملفات، الملصقات
-   الحصول على قائمة المحادثات ورسائل المحادثة

### خدمة استخراج البيانات (Scraper)

-   استخراج بيانات السيارات من موقع IAAI
-   استخراج تفاصيل المركبات المحددة
-   واجهة برمجة تطبيقات RESTful سهلة الاستخدام

### خدمة تيليجرام (Telegram)

-   تهيئة واتصال حساب تيليجرام باستخدام GramJS
-   دعم حفظ الجلسة واستعادتها
-   إرسال رسائل نصية ووسائط متعددة
-   الحصول على قائمة المحادثات والتحديثات

## البدء السريع

### المتطلبات

-   Node.js v14 أو أحدث
-   NPM v6 أو أحدث

### التثبيت

1. قم بتنزيل المشروع:

```bash
git clone <repository-url>
cd <project-folder>
```

2. قم بتثبيت التبعيات:

```bash
npm install
```

3. تشغيل الخادم:

```bash
npm start
```

## استخدام واجهة برمجة التطبيقات (API)

عند تشغيل الخادم، سيكون متاحًا على المنفذ 3000 بشكل افتراضي: `http://localhost:3000`

### نقاط النهاية لروبوت WhatsApp

#### المصادقة والاتصال

-   **تهيئة الروبوت**: `POST /auth/init`
    -   يبدأ عملية الاتصال وينشئ رمز QR للمسح
-   **الحصول على رمز QR**: `GET /auth/qrcode`
    -   يعيد رمز QR كـ JSON أو صورة
-   **صورة رمز QR المباشرة**: `GET /auth/qrcode.png`
    -   يعيد رمز QR كصورة PNG
-   **حالة الاتصال**: `GET /auth/status`
    -   يعيد حالة اتصال روبوت WhatsApp
-   **تسجيل الخروج**: `POST /auth/logout`
    -   يغلق الجلسة الحالية

#### الرسائل

-   **إرسال رسائل**: `POST /messages/send`
    -   يرسل رسائل متنوعة (نص، صور، ملفات، موقع)
-   **الحصول على المحادثات**: `GET /messages/chats`
    -   يعيد قائمة بجميع المحادثات
-   **الحصول على رسائل محادثة**: `GET /messages/messages/:chatId`
    -   يعيد جميع الرسائل في محادثة محددة

### نقاط النهاية لخدمة استخراج البيانات

-   **استخراج بيانات البحث**: `GET /scrape/iaai`
    -   يستخرج نتائج البحث من IAAI
-   **استخراج تفاصيل المركبة**: `GET /scrape/vehicle/:id`
    -   يستخرج تفاصيل مركبة محددة من IAAI حسب المعرّف (ID)

### نقاط النهاية لتيليجرام

-   **بدء عملية التهيئة**: `POST /telegram/start-init`

    -   يبدأ عملية الاتصال بحساب تيليجرام ويطلب رمز التحقق
    -   المتطلبات:
        ```json
        {
        	"apiId": "YOUR_API_ID",
        	"apiHash": "YOUR_API_HASH",
        	"phoneNumber": "+971XXXXXXXXX"
        }
        ```
    -   الاستجابة:
        ```json
        {
        	"status": "success",
        	"message": "Code sent successfully",
        	"phoneCodeHash": "HASH_FROM_TELEGRAM",
        	"phoneNumber": "+971XXXXXXXXX"
        }
        ```

-   **إكمال عملية التهيئة**: `POST /telegram/complete-init`

    -   يكمل عملية الاتصال باستخدام رمز التحقق
    -   المتطلبات:
        ```json
        {
        	"phoneNumber": "+971XXXXXXXXX",
        	"phoneCode": "12345",
        	"phoneCodeHash": "HASH_FROM_PREVIOUS_STEP"
        }
        ```
    -   الاستجابة:
        ```json
        {
        	"status": "success",
        	"message": "Telegram client initialized successfully",
        	"session": "SESSION_STRING_FOR_FUTURE_USE"
        }
        ```

-   **تهيئة باستخدام جلسة سابقة**: `POST /telegram/init-session`

    -   يتصل بتيليجرام باستخدام بيانات جلسة سابقة
    -   المتطلبات: `apiId`, `apiHash`, `session`

-   **إرسال رسالة نصية**: `POST /telegram/send`

    -   يرسل رسالة نصية إلى مستخدم أو مجموعة
    -   المتطلبات: `username`, `text`

-   **إرسال وسائط**: `POST /telegram/sendMedia`

    -   يرسل صورة أو ملف إلى مستخدم أو مجموعة
    -   المتطلبات: `username`, `mediaUrl`, `caption` (اختياري)

-   **الحصول على المحادثات**: `GET /telegram/dialogs`

    -   يعيد قائمة بجميع المحادثات النشطة

-   **الحصول على جهات الاتصال**: `GET /telegram/contacts`

    -   يعيد قائمة بجميع جهات الاتصال في حسابك
    -   يتضمن معلومات مثل الاسم، رقم الهاتف، اسم المستخدم

-   **الحصول على رسائل الدردشة**: `GET /telegram/chat/:username`

    -   يعيد رسائل الدردشة مع مستخدم أو مجموعة محددة
    -   المعلمات الاختيارية:
        -   `limit`: عدد الرسائل (الافتراضي: 50)
        -   `offset`: ترتيب بداية الرسائل (الافتراضي: 0)

-   **حالة الاتصال**: `GET /telegram/status`

    -   يعيد حالة اتصال العميل بتيليجرام

-   **تسجيل الخروج**: `POST /telegram/logout`
    -   يقوم بتسجيل الخروج وإزالة بيانات الجلسة

-   **حالة الاتصال التفصيلية**: `GET /telegram/connection-status`
    -   يعيد حالة الاتصال الفعلية مع تيليجرام بشكل مفصل
    -   الاستجابة:
        ```json
        {
            "status": "connected" | "not_connected" | "disconnected",
            "connected": true | false,
            "authorized": true | false,
            "message": "Telegram client is connected and authorized"
        }
        ```

## أمثلة للاستخدام

### اتصال WhatsApp

1. إرسال طلب إلى `POST /auth/init`
2. مسح رمز QR الناتج باستخدام تطبيق WhatsApp
3. انتظر الاتصال والتأكد من حالة الاتصال عبر `GET /auth/status`

### إرسال رسالة نصية عبر WhatsApp

```javascript
fetch("http://localhost:3000/messages/send", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		to: "971XXXXXXXXX@c.us",
		messages: [{ type: "text", body: "مرحبا بالعالم!" }],
	}),
});
```

### استخراج بيانات السيارات

```javascript
fetch("http://localhost:3000/scrape/iaai")
	.then((response) => response.json())
	.then((data) => console.log(data));
```

### استخراج تفاصيل مركبة محددة

```javascript
fetch("http://localhost:3000/scrape/vehicle/123456~US")
	.then((response) => response.json())
	.then((data) => console.log(data));
```

### تهيئة حساب تيليجرام (الطريقة الجديدة)

1. بدء عملية التهيئة:

```javascript
// طلب رمز التحقق
fetch("http://localhost:3000/telegram/start-init", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		apiId: "YOUR_API_ID",
		apiHash: "YOUR_API_HASH",
		phoneNumber: "+971XXXXXXXXX",
	}),
})
	.then((response) => response.json())
	.then((data) => {
		// احفظ phoneCodeHash لاستخدامه في الخطوة التالية
		console.log("تم إرسال رمز التحقق:", data);
	});
```

2. إكمال عملية التهيئة:

```javascript
// إدخال رمز التحقق
fetch("http://localhost:3000/telegram/complete-init", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		phoneNumber: "+971XXXXXXXXX",
		phoneCode: "12345", // الرمز الذي تلقيته على هاتفك
		phoneCodeHash: "HASH_FROM_PREVIOUS_STEP",
	}),
})
	.then((response) => response.json())
	.then((data) => {
		// احفظ session string لإعادة الاتصال لاحقاً
		console.log("تم الاتصال بنجاح:", data);
	});
```

3. إعادة الاتصال باستخدام الجلسة المحفوظة:

```javascript
fetch("http://localhost:3000/telegram/init-session", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		apiId: "YOUR_API_ID",
		apiHash: "YOUR_API_HASH",
		session: "YOUR_SAVED_SESSION_STRING",
	}),
});
```

### إرسال رسالة نصية عبر تيليجرام

```javascript
fetch("http://localhost:3000/telegram/send", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		username: "username_or_phone",
		text: "مرحبا بالعالم!",
	}),
});
```

### إرسال صورة عبر تيليجرام

```javascript
fetch("http://localhost:3000/telegram/sendMedia", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		username: "username_or_phone",
		mediaUrl: "https://example.com/image.jpg",
		caption: "وصف الصورة",
	}),
});
```

### الحصول على جهات الاتصال

```javascript
fetch("http://localhost:3000/telegram/contacts")
	.then((response) => response.json())
	.then((data) => console.log(data.contacts));
```

### الحصول على رسائل الدردشة

```javascript
// الحصول على آخر 50 رسالة
fetch("http://localhost:3000/telegram/chat/username")
	.then((response) => response.json())
	.then((data) => console.log(data.messages));

// الحصول على 100 رسالة مع ترتيب محدد
fetch("http://localhost:3000/telegram/chat/username?limit=100&offset=50")
	.then((response) => response.json())
	.then((data) => console.log(data.messages));
```

### مثال للحصول على حالة الاتصال التفصيلية

```javascript
fetch("http://localhost:3000/telegram/connection-status")
    .then(response => response.json())
    .then(data => console.log(data));
```

## الحصول على API ID و API Hash لتيليجرام

1. قم بزيارة https://my.telegram.org/auth
2. سجل الدخول باستخدام رقم هاتفك
3. انتقل إلى "API development tools"
4. أنشئ تطبيقًا جديدًا
5. ستحصل على API ID (رقم) و API Hash (سلسلة حروف)

## ملاحظات هامة

-   تأكد من أن لديك اتصال إنترنت مستقر عند استخدام أي من الخدمات
-   قد تختلف نتائج السكرابر مع مرور الوقت نظرًا لتغييرات في موقع IAAI
-   تحتاج إلى مسح رمز QR من جديد إذا أعدت تشغيل خادم WhatsApp
-   احتفظ بـ API ID و API Hash لتيليجرام في مكان آمن
-   يمكنك حفظ سلسلة الجلسة (session string) لتيليجرام لإعادة الاتصال دون الحاجة لرمز التحقق
-   لا تشارك بيانات الجلسة أو API Hash مع أي شخص

## الأخطاء الشائعة وحلولها

### 1. خطأ في العثور على المستخدم

```json
{
	"status": "error",
	"message": "Failed to send media",
	"error": "Cannot find any entity corresponding to \"<number>\""
}
```

**السبب**:

-   محاولة إرسال رسالة إلى رقم هاتف غير موجود في جهات اتصالك
-   استخدام رقم هاتف بدلاً من اسم المستخدم دون التنسيق الصحيح

**الحل**:

1. تأكد من أن المستخدم موجود في جهات اتصالك أولاً
2. استخدم اسم المستخدم (username) بدلاً من رقم الهاتف
3. إذا كنت تريد استخدام رقم الهاتف، اتبع الخطوات التالية:
    - أضف المستخدم إلى جهات اتصالك أولاً
    - استخدم التنسيق الدولي للرقم (مثال: "+971XXXXXXXXX")
    - تأكد من أن المستخدم لديه حساب تيليجرام نشط

### كيفية إضافة جهة اتصال جديدة:

1. استخدم نقطة النهاية `GET /telegram/contacts` للتحقق من جهات الاتصال الحالية
2. أضف المستخدم إلى جهات اتصالك في تطبيق تيليجرام
3. حاول إرسال الرسالة مرة أخرى

### أفضل الممارسات:

-   استخدم دائماً اسم المستخدم (username) عند الإمكان
-   تحقق من وجود المستخدم قبل محاولة إرسال الرسائل
-   احتفظ بقائمة محدثة لجهات الاتصال الخاصة بك
