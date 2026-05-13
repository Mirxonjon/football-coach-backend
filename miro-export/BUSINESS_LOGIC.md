# Football Coach — Biznes Logika

> AI vositasi uchun: bu hujjat orqali siz ushbu loyihaning to'liq biznes mohiyatini, qoidalarini va o'zaro ta'sirlarini tushunishingiz mumkin. Diagramma, blok-sxema yoki vizualizatsiya yaratish uchun shu hujjatdan foydalaning.

---

## 1. Loyihaning maqsadi

**Football Coach** — O'zbekiston bozori uchun mo'ljallangan, yosh futbolchilar va ularni o'qitayotgan murabbiylar uchun raqamli ta'lim platformasi. Foydalanuvchilar:

- yosh toifalari bo'yicha tuzilgan video-darslarni ko'radilar,
- professional master-klasslarda qatnashadilar,
- futbol bo'yicha kitob va konspektlarni o'qiydilar,
- AI murabbiy bilan suhbatlashadilar,
- obuna sotib olib, premium kontentga ega bo'ladilar.

Daromad modeli: **obuna asosida (subscription)** + alohida kitob sotib olish.

---

## 2. Foydalanuvchi rollari

| Rol | Tavsifi | Imkoniyatlari |
|---|---|---|
| **USER** | Oddiy foydalanuvchi (murabbiy, futbolchi, ota-ona) | Bepul kontentni ko'radi, obuna sotib oladi, kitob sotib oladi, AI bilan gaplashadi |
| **ADMIN** | Tizim administratori | Barcha kontentni boshqaradi, foydalanuvchilarni nazorat qiladi, statistikani ko'radi |

**Muhim qoida:** USER → ADMIN avtomatik ko'tarilmaydi. Admin faqat boshqa admin tomonidan yoki seed orqali yaratiladi. Admin panel uchun alohida login endpointlari bor (`POST /v1/admin/login`, `POST /v1/admin/google`) — ular faqat mavjud admin'ni qabul qiladi va yangi user yaratmaydi.

---

## 3. Asosiy domen ob'ektlari (entity'lar)

### 3.1. User (Foydalanuvchi)
- `id`, `phone` (unique), `email`, `password` (hashed), `googleId`
- `firstName`, `lastName`, `birthDate`, `avatarUrl`
- `isVerified`, `isActive`, `roleId` (USER yoki ADMIN)
- 1-1: bitta saqlangan `Card`
- 1-N: `Subscription`, `WalletTransaction`, `UserBook`, `BookProgress`, `LessonProgress`, `Notification`, `AiChat`, `UserDevice` (push tokens), `Session` (refresh tokens)

### 3.2. Yosh va o'quv kontenti
**AgeCategory** (Yosh toifasi)
- `id`, `titleUz/Ru`, `minAge`, `maxAge`, `iconUrl`
- Misollar: U-10, U-12, U-15, U-18, Kattalar
- 1-N: `TrainingCategory`

**TrainingCategory** (Mashg'ulot toifasi)
- `id`, `titleUz/Ru`, `descriptionUz/Ru`, `imageUrl`, `ageCategoriesId` (FK)
- Misollar: "Asosiy dribling" (U-12 uchun), "Pas berish" (U-15 uchun)
- 1-N: `TrainingLesson`

**TrainingLesson** (Dars)
- `id`, `titleUz/Ru`, `trainingCategoryId` (FK), **`isFree`** (bepul preview uchun)
- 1-N: `LessonBlock`, `LessonProgress`

**LessonBlock** (Dars bloki)
- `id`, `lessonId` (FK), `blockType` (TITLE/TEXT/VIDEO/IMAGE/FILE/HINT)
- `contentUz/Ru` (matn yoki URL), `duration` (soniya), `sequenceOrder`, **`isFree`**
- Bir darsda bir nechta blok ketma-ket bo'ladi

**LessonProgress** (Foydalanuvchining dars rivoji)
- `userId` + `lessonId` (unique), `lastBlockSequence`, `isCompleted`

### 3.3. Master-klasslar
**MasterclassCategory** → **Masterclass** → **MasterclassBlock**
- Strukturasi darslar bilan bir xil, lekin alohida domen — premium kontent

### 3.4. Kitoblar
**BookCategory** (`BOOK` yoki `KONSPEKT` turi)
- 1-N: `Book`

**Book**
- `titleUz/Ru`, `fileUrl` (PDF), `coverImageUrl`, `basePrice`
- `discountType` (NONE/PERCENTAGE/FIXED_PRICE), `discountPercent`, `fixedDiscountPrice`

**UserBook** (Sotib olingan kitob) — `userId` + `bookId` unique
**BookProgress** — qaysi sahifagacha o'qigan

### 3.5. Obuna va to'lov
**SubscriptionPlan** (Tarif)
- `titleUz/Ru`, `descriptionUz/Ru`, `durationDays`, `basePrice`, `discountType/Percent/fixedPrice`, `isActive`
- Misol: Haftalik (7 kun, 19000 UZS), Oylik (30 kun, 49000 UZS, 10% chegirma), Choraklik (90 kun, 15% chegirma), Yillik (365 kun, qat'iy 390000 UZS)

**Subscription** (Foydalanuvchi obunasi)
- `userId`, `subscriptionsPlansId`, `startDate`, `endDate`, `isActive`
- **`autoPay`** (avtomatik yangilanish), **`cardId`** (qaysi karta bilan)
- `lastRenewalAttemptAt`, `lastExpiryNoticeDay` (3 kun yoki 1 kun ogohlantirish dedup uchun)

**Card** (Saqlangan karta)
- Foydalanuvchiga 1 ta karta. `provider="click"`, `token` (Click card_token, server-side, frontga chiqmaydi)
- `cardNumber` (masked), `last4`, `expireDate` (MMYY), `phoneNumber`, `isVerified`

**WalletTransaction** (To'lov tarixi)
- `userId`, `cardId`, `subscriptionsPlansId`, `amount`, `provider` (click/dev), `status` (PENDING/SUCCESS/FAILED), `externalId`, `errorCode/Message`

### 3.6. AI Chat
**AiChat** → **AiMessage** (`role`: user/assistant) → **AiMessageImage**

### 3.7. Bildirishnomalar
**Notification** — `userId`, `type` (SYSTEM/LESSON/BOOK/SUBSCRIPTION/AI_CHAT), `titleUz/Ru`, `messageUz/Ru`, `isRead`, `relatedId`
**UserDevice** — Firebase push tokenlari saqlanadi

### 3.8. Texnik ob'ektlar
- **Role** (USER, ADMIN)
- **Session** — refresh token uchun (har bir login bir session)
- **OtpCode** — telefon OTP uchun
- **Legal** — foydalanish shartlari, maxfiylik siyosati (UZ/RU tarjimalari bilan)

---

## 4. Foydalanuvchi safarlari (User Journeys)

### 4.1. Ro'yxatdan o'tish va kirish
**3 variant:**
1. **Telefon + OTP:** `POST /v1/auth/phone/request-otp` → SMS keladi → `POST /v1/auth/phone/verify-otp` → tokenlar qaytadi
2. **Email + parol:** `POST /v1/auth/email/register` (ro'yxat) yoki `POST /v1/auth/email/login`
3. **Google OAuth:** front Google'dan idToken oladi → `POST /v1/auth/google` → backend Google bilan tasdiqlaydi → user yaratiladi yoki topiladi

**Natija:** `accessToken` (15 daqiqa) + `refreshToken` (30 kun) + `user`. Refresh `POST /v1/auth/refresh` orqali yangilanadi.

### 4.2. Bepul kontentni ko'rish (obunasiz)
- `GET /v1/lessons` — barcha darslar ro'yxati. **Har bir darsda `isLocked` bayrog'i hisoblanadi:** `true` agar foydalanuvchi obunasiz va dars bepul emas.
- `GET /v1/lessons/:id` — agar dars bepul yoki foydalanuvchi obunachi → to'liq bloklar. Aks holda `isFree` bo'lmagan bloklar **`contentUz/Ru: null`** bilan qaytadi va `isLocked: true` belgilanadi (preview tarmog'i).

### 4.3. Karta qo'shish (2 bosqich, Click.uz orqali)
**Bosqich 1 — `POST /v1/cards/init { cardNumber, expireDate }`:**
1. Click `card_token/request` chaqiriladi
2. Click vaqtinchalik `card_token` qaytaradi va kartadagi telefonga SMS OTP yuboradi
3. Backend `Card` qatorini `isVerified=false` holatda saqlaydi (token DB'da qoladi)
4. Frontga **faqat `cardId`** qaytadi (Click tokeni hech qachon frontga chiqmaydi — xavfsizlik)

**Bosqich 2 — `POST /v1/cards/verify { cardId, smsCode }`:**
1. Backend o'zining `cardId` bo'yicha qatorni topadi
2. Click `card_token/verify` chaqiriladi (server saqlangan token + foydalanuvchi yuborgan SMS)
3. Click yaroqli token qaytarsa → `Card.isVerified=true`, `cardNumber` masklangan ko'rinishda saqlanadi

### 4.4. Obuna sotib olish
**`POST /v1/subscriptions/me { planId, cardId, autoPay }`:**
1. Plan topiladi, narx hisoblanadi (chegirma bilan)
2. Foydalanuvchining karta tasdiqlanganligi tekshiriladi
3. **Click `card_token/payment`** chaqiriladi — pul yechiladi
4. Muvaffaqiyatli bo'lsa: `Subscription` yaratiladi (`isActive=true`, `endDate=now+durationDays`), `WalletTransaction(status=SUCCESS)` yoziladi
5. Xato bo'lsa: `402 Payment Required` qaytadi, hech narsa yaratilmaydi

### 4.5. Avtomatik yangilanish (auto-pay) — har kuni 02:00 cron
Cron `subscription.cron.ts` ichida:
1. **Yangilanish bloki:** `endDate` keyingi 24 soat ichida + `autoPay=true` obunalarni topadi → saqlangan karta tokenini olib `click.charge()` qiladi → muvaffaqiyat bo'lsa `endDate += durationDays`, "Obuna yangilandi" push yuboradi → xato bo'lsa "Avto-to'lov amalga oshmadi" push
2. **Eslatma bloki:** `autoPay=false` foydalanuvchilar uchun:
   - 3 kun qolgan: "Obuna 3 kundan keyin tugaydi" push (+ `lastExpiryNoticeDay=3`)
   - 1 kun qolgan: "Obuna ertaga tugaydi" push (+ `lastExpiryNoticeDay=1`)
   - `lastExpiryNoticeDay` dedup uchun — bir holat uchun bir marta yuboradi

### 4.6. Pullik kontentdan foydalanish
- Foydalanuvchi `GET /v1/lessons/:id` chaqiradi
- Service `hasPaidAccess(userId)` ni hisoblaydi — admin yoki faol obuna bor-yo'qligini tekshiradi
- Bepul bloklar har doim ko'rinadi
- Pullik bloklar `contentUz/Ru: null, isLocked: true` bilan qaytadi → frontda "Obuna oling" CTA chiqaradi

### 4.7. Kitob sotib olish va o'qish
- `GET /v1/books` (filter bilan) → katalog
- `POST /v1/me/books/:bookId/purchase` → `UserBook` yaratiladi (hozir to'lov flow alohida — kelajakda Click bilan birlashtirish kerak)
- `GET /v1/me/books/:bookId/progress` / `PATCH .../progress` — qaysi sahifagacha o'qiganini saqlash

### 4.8. AI murabbiy bilan suhbat
- `POST /v1/ai/chats` — yangi chat ochish
- `POST /v1/ai/chats/:id/messages { text }` — savol yuborish, AI javobi qaytadi (OpenAI yoki RAG backend)
- `GET /v1/ai/chats` — eski suhbatlar tarixi

### 4.9. Profil va sozlamalar
- `GET /v1/users/me` — joriy foydalanuvchi ma'lumotlari
- `PATCH /v1/users/me` — yangilash
- `POST /v1/devices` / `DELETE /v1/devices/:id` — push notification qurilmalari
- `GET /v1/notifications?type=&unread=` — bildirishnomalar ro'yxati
- `PATCH /v1/subscriptions/me/auto-pay { enabled, cardId }` — auto-pay yoqish/o'chirish

---

## 5. Admin paneli flow

### 5.1. Admin login
- `POST /v1/admin/login { phone yoki email, password }` — STRICT, faqat mavjud ADMIN
- `POST /v1/admin/google { idToken }` — Google bilan, faqat allaqachon admin bo'lgan akkaunt
- Oddiy USER admin paneliga kira olmaydi (`401 Admin access required` yoki `401 Admin account not found`)

### 5.2. Kontent boshqaruvi (CRUD)
Admin barcha asosiy domenlar uchun CRUD endpointlariga ega:
- `/admin/age-categories` — yosh toifalari
- `/admin/training-categories` — mashg'ulot toifalari
- `/admin/lessons` + `/admin/lessons/:id/blocks` — darslar va bloklar
- `/admin/masterclass-categories` + `/admin/masterclasses` + `/admin/masterclasses/:id/blocks`
- `/admin/book-categories` + `/admin/books`
- `/admin/notifications/*` — bildirishnomalar yuborish (bir kishi/ko'p kishi/hammaga)
- `/admin/uploads/*` — Cloudflare R2 ga fayl yuklash (rasm, video, PDF)
- `/admin/stats/*` — statistika (daromad, foydalanuvchilar o'sishi, tariflar bo'yicha taqsim, top darslar/kitoblar)

### 5.3. Tahrirlashda til ustuvorligi
- Har bir kontent obyekti UZ va RU sarlavha hamda tavsifga ega
- Admin panel UZ tilida `titleUz` qalin, RU tilida `titleRu` qalin ko'rinadi
- "Tarjima" tugmasi UZ↔RU avto-tarjima qiladi (frontend yordamchisi)

---

## 6. To'lov va xavfsizlik qoidalari

### 6.1. PCI-DSS muvofiqligi
- Kartaning xom raqami (PAN), CVV — **hech qachon** DB'da saqlanmaydi
- Click `card_token` faqat backend DB'da, frontga chiqmaydi
- Front faqat `cardId`, `last4`, masklangan PAN, telefon raqamini ko'radi

### 6.2. Click integratsiyasi
- 4 ta asosiy chaqiriq: `card_token/request`, `card_token/verify`, `card_token/payment`, `card_token/{token} DELETE`
- Imzo: `Auth: <merchant_user_id>:sha1(timestamp+secret_key):<timestamp>`
- Xato kodlari foydalanuvchiga aniq ko'rsatiladi (kartada mablag' yetarli emas, kartaning muddati o'tgan, va h.k.)

### 6.3. Auth xavfsizligi
- Refresh token DB'da bcrypt-hash qilingan (har bir session uchun alohida)
- JWT secret env'dan keladi
- Har bir muvaffaqiyatli/muvaffaqiyatsiz urinish loglanadi (`[GOOGLE] ✓ login userId=X email=...`)
- Logout barcha sessiyalarni tozalaydi
- ADMIN endpointlari `RolesGuard` orqali himoyalangan

### 6.4. Subscription gate
- Pullik kontent `hasPaidAccess(userId)` orqali tekshiriladi
- Adminlar har doim o'tadi (bypass)
- Faol obunasi bor (`isActive=true && endDate >= now`) USER ham o'tadi
- Bepul kontent (`isFree=true`) hech qanday tekshiruvsiz ko'rsatiladi

---

## 7. Texnologiya stack

- **Backend:** NestJS 10 + TypeScript
- **DB:** PostgreSQL + Prisma ORM
- **Auth:** Passport JWT, google-auth-library, bcryptjs
- **To'lov:** Click.uz (custom HTTP klient)
- **Push:** Firebase Admin SDK
- **Faylar:** Cloudflare R2 (S3-compatible)
- **AI:** OpenAI SDK + ixtiyoriy RAG backend
- **Bildirishnoma cron:** `@nestjs/schedule`
- **Validatsiya:** class-validator + class-transformer
- **Hujjat:** Swagger (`/docs`)

---

## 8. Asosiy biznes qoidalari (qisqacha)

1. **Bir foydalanuvchi — bir karta** (Card.userId @unique). Yangi karta qo'shish uchun avval eskini o'chirish kerak.
2. **Bir vaqtda faqat bitta faol obuna**. Sotib olishda mavjud faol obuna bo'lsa `409 Conflict`.
3. **Bepul preview**: lesson va block darajasida mustaqil — to'liq bepul dars yoki obunali darsdagi bepul intro video.
4. **Auto-pay** faqat Card.isVerified=true bo'lsa yoqiladi.
5. **Notifikatsiya dedup**: 3 va 1 kunlik eslatmalar `lastExpiryNoticeDay` orqali — bir kunda bir marta yuboriladi.
6. **Idempotent seed**: `prisma db seed` qayta-qayta ishlaydi, sequence'larni `MAX(id)+1` ga sinxronlaydi.
7. **NODE_ENV=production** da `dev-activate` test endpointi avtomatik o'chadi.
8. **Til**: barcha ko'rinadigan matn maydonlari `titleUz/Ru`, `descriptionUz/Ru`, `contentUz/Ru` juftliklari bilan keladi.

---

## 9. Diagramma yaratish uchun yo'nalishlar

Bu hujjatdan AI yordamida quyidagi diagrammalarni yaratish mumkin:

| Diagramma turi | Manba |
|---|---|
| **ER-diagramma** | `schema.prisma` + 3-bo'lim |
| **Use-case** | 4 va 5-bo'limlar (foydalanuvchi va admin oqimlari) |
| **Sequence** | 4.3 (karta qo'shish), 4.4 (obuna sotib olish), 4.5 (auto-pay cron) |
| **State diagramma** | Subscription holatlari, Card.isVerified, WalletTransaction.status |
| **Architecture** | 7-bo'lim (texnologiya stack) + module ro'yxati |
| **User journey map** | 4-bo'lim ketma-ketligi |
