# Foydalanuvchi va Tizim Oqimlari

> Mermaid sequence/flow diagrammalar. Miro AI yoki ChatGPT'ga shu hujjatni yuklab, "ushbu oqimlar uchun visual sequence diagram chizib ber" so'rovini bering.

---

## 1. Telefon OTP orqali kirish

```mermaid
sequenceDiagram
  participant U as Foydalanuvchi
  participant FE as Frontend
  participant BE as Backend
  participant SMS as SMS provayder

  U->>FE: Telefon raqamini kiritadi
  FE->>BE: POST /auth/phone/request-otp
  BE->>BE: Rate limit tekshiruvi
  BE->>SMS: 6-xonali kod yuborish
  BE-->>FE: { ttlSec }
  U->>FE: SMS dan kelgan kodni kiritadi
  FE->>BE: POST /auth/phone/verify-otp { phone, code }
  BE->>BE: Kod taqqoslanadi (xeshlangan)
  alt Birinchi marta
    BE->>BE: Yangi User yaratiladi (role=USER)
  end
  BE->>BE: Session yaratiladi (refresh xeshlangan)
  BE-->>FE: { accessToken, refreshToken, user }
  FE-->>U: Bosh ekranga o'tadi
```

---

## 2. Google bilan kirish (USER)

```mermaid
sequenceDiagram
  participant U as Foydalanuvchi
  participant FE as Frontend
  participant G as Google
  participant BE as Backend

  U->>FE: "Google bilan kirish" tugmasi
  FE->>G: OAuth flow
  G-->>FE: idToken
  FE->>BE: POST /auth/google { idToken }
  BE->>G: Tokenni tasdiqlash (audience=GOOGLE_CLIENT_ID)
  G-->>BE: { sub, email, name, picture }
  alt sub bo'yicha user bor
    BE->>BE: User topiladi
  else email bo'yicha bor
    BE->>BE: googleId bog'lanadi
  else hech qaysisi
    BE->>BE: Yangi USER yaratiladi
  end
  BE-->>FE: { accessToken, refreshToken, user }
```

---

## 3. Karta qo'shish (Click 2 bosqichli)

```mermaid
sequenceDiagram
  participant U as Foydalanuvchi
  participant FE as Frontend
  participant BE as Backend
  participant CK as Click.uz

  U->>FE: Karta raqami + amal qilish muddati
  FE->>BE: POST /cards/init { cardNumber, expireDate }
  BE->>CK: card_token/request
  CK-->>BE: { card_token (vaqtinchalik), phone_number }
  CK->>U: SMS bilan OTP (kartadagi telefon)
  BE->>BE: Card qator yaratiladi (token DB'da, isVerified=false)
  BE-->>FE: { cardId, phoneNumber, cardNumberMasked, expiresInSeconds }
  Note over FE,BE: Click token frontga chiqmaydi!

  U->>FE: SMS dan kelgan kodni kiritadi
  FE->>BE: POST /cards/verify { cardId, smsCode }
  BE->>BE: cardId bo'yicha qator topiladi (owner check)
  BE->>CK: card_token/verify (saqlangan token + sms)
  CK-->>BE: { card_token (doimiy), card_number masked }
  BE->>BE: Card yangilanadi (token=permanent, isVerified=true)
  BE-->>FE: { id, last4, isVerified: true }
```

---

## 4. Obuna sotib olish

```mermaid
sequenceDiagram
  participant U as Foydalanuvchi
  participant FE as Frontend
  participant BE as Backend
  participant CK as Click.uz

  U->>FE: Tarif tanlaydi (masalan, Oylik)
  FE->>BE: POST /subscriptions/me { planId, cardId, autoPay: true }
  BE->>BE: Plan topiladi, narx hisoblanadi (chegirma bilan)
  BE->>BE: Faol obuna mavjudligini tekshiradi
  BE->>BE: Card.isVerified=true bo'lishini tekshiradi
  BE->>CK: card_token/payment(amount, token)
  alt To'lov muvaffaqiyatli
    CK-->>BE: { payment_id, status=ok }
    BE->>BE: WalletTransaction (status=SUCCESS) yaratiladi
    BE->>BE: Subscription yaratiladi (isActive=true, endDate=now+durationDays)
    BE-->>FE: { subscription, transaction }
    FE-->>U: "Obuna faollashdi" + ko'nfett
  else Xato
    CK-->>BE: { error_code, error_note }
    BE-->>FE: 402 Payment Required + xato sababi
    FE-->>U: "Karta yetarli emas" / "Karta muddati o'tgan" / va h.k.
  end
```

---

## 5. Avtomatik yangilanish (cron, har kuni 02:00)

```mermaid
flowchart TD
  Start([Cron 02:00]) --> A[24 soat ichida tugaydigan<br>autoPay=true obunalarni topish]
  A --> B{Har bir obuna<br>uchun}
  B --> C[Cardni olish]
  C --> D{Card<br>aktiv va<br>tasdiqlangan?}
  D -- Yo'q --> E[Push: Karta topilmadi]
  D -- Ha --> F[Click charge amount]
  F --> G{Muvaffaqiyatli?}
  G -- Ha --> H[endDate += durationDays<br>WalletTx SUCCESS<br>Push: Yangilandi]
  G -- Yo'q --> I[lastRenewalAttemptAt yangilanadi<br>WalletTx FAILED<br>Push: To'lov amalga oshmadi]

  Start --> J[Eslatma bloki]
  J --> K{3 kun qolgan<br>autoPay=false?}
  K -- Ha --> L[Push 3 kun + lastExpiryNoticeDay=3]
  J --> M{1 kun qolgan<br>autoPay=false<br>noticeDay != 1?}
  M -- Ha --> N[Push 1 kun + lastExpiryNoticeDay=1]
```

---

## 6. Pullik kontentga kirish (paywall)

```mermaid
flowchart TD
  R[GET /lessons/:id] --> A[Lesson + bloklar yuklanadi]
  A --> B{User ADMIN?}
  B -- Ha --> Z[To'liq kontent qaytariladi]
  B -- Yo'q --> C{Lesson.isFree?}
  C -- Ha --> Z
  C -- Yo'q --> D{Faol obunasi bormi?<br>isActive=true && endDate>=now}
  D -- Ha --> Z
  D -- Yo'q --> E{Har bir blok}
  E --> F{Block.isFree?}
  F -- Ha --> G[Blok to'liq qaytariladi]
  F -- Yo'q --> H[contentUz=null<br>contentRu=null<br>isLocked=true]
  G & H --> Y[Frontga: lesson + qisman bloklar]
```

---

## 7. Admin panel kontent yaratish

```mermaid
sequenceDiagram
  participant A as Admin
  participant FE as Admin Panel
  participant BE as Backend
  participant R2 as Cloudflare R2

  A->>FE: "Yangi dars" tugmasi
  FE->>FE: UZ + RU sarlavha kiritish dialogi
  FE->>BE: POST /admin/lessons { titleUz, titleRu, trainingCategoryId, isFree }
  BE->>BE: TrainingCategory mavjudligini tekshiradi
  BE-->>FE: Yaratilgan dars

  A->>FE: "Video blok qo'shish"
  A->>FE: Video faylni tanlash
  FE->>BE: POST /admin/uploads/presign
  BE->>R2: Presigned URL generatsiyasi
  BE-->>FE: { uploadUrl, publicUrl }
  FE->>R2: PUT video.mp4
  FE->>BE: POST /admin/lessons/:id/blocks { blockType: VIDEO, contentUz/Ru: publicUrl, ... }
  BE-->>FE: Yaratilgan blok
```

---

## 8. AI chat suhbati

```mermaid
sequenceDiagram
  participant U as Foydalanuvchi
  participant FE as Frontend
  participant BE as Backend
  participant AI as OpenAI / RAG

  U->>FE: "Yangi suhbat"
  FE->>BE: POST /ai/chats
  BE-->>FE: { chatId }

  U->>FE: Savol yozadi
  FE->>BE: POST /ai/chats/:id/messages { text }
  BE->>BE: Foydalanuvchi xabari saqlanadi (role=user)
  BE->>AI: Streaming so'rov
  AI-->>BE: Javob
  BE->>BE: Javob saqlanadi (role=assistant)
  BE-->>FE: { message }
  FE-->>U: AI javobini ko'rsatish
```

---

## 9. Push bildirishnomalar

```mermaid
flowchart LR
  E[Hodisa: subscription expiring,<br>auto-pay success/fail,<br>admin broadcast, etc.] --> N[NotificationService]
  N --> DB[(Notification yozuvi<br>DB ga saqlanadi)]
  N --> FCM[Firebase Cloud Messaging]
  FCM --> A[Android/iOS qurilmalari]
  FCM --> W[Web Push]
  DB --> UI[GET /notifications<br>foydalanuvchi inboxida]
```

---

## 10. Idempotent seed va sequence sync

```mermaid
flowchart TD
  S[npm run prisma:seed] --> A[Roles upsert]
  A --> B[Users upsert]
  B --> C[AgeCategory upsert]
  C --> D[TrainingCategory upsert]
  D --> E[TrainingLesson + LessonBlock upsert]
  E --> F[SubscriptionPlan upsert]
  F --> G[BookCategory + Book upsert]
  G --> H[Notification upsert]
  H --> I[MasterclassCategory + Masterclass + Block upsert]
  I --> Z[/Sync ALL sequences:<br>setval to MAX id+1/]
  Z --> Done([Real data kelganda<br>collision bo'lmaydi])
```
