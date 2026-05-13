# API Endpointlari

> Barcha endpointlar `/v1` prefiksiga ega. Javoblar `{ status_code, data }` envelope ichida, xatolar `{ error: { code, message } }` shaklida.

## Auth (Public)

| Method | Path | Vazifasi |
|---|---|---|
| POST | `/v1/auth/phone/request-otp` | Telefon raqamga OTP yuborish |
| POST | `/v1/auth/phone/verify-otp` | OTP'ni tasdiqlash, tokenlar olish |
| POST | `/v1/auth/email/register` | Email + parol bilan ro'yxatdan o'tish |
| POST | `/v1/auth/email/login` | Email + parol bilan kirish |
| POST | `/v1/auth/google` | Google idToken bilan kirish/ro'yxatdan o'tish (USER) |
| POST | `/v1/auth/refresh` | Access tokenni yangilash |
| POST | `/v1/auth/logout` | Barcha sessiyalarni tozalash (auth talab) |
| POST | `/v1/auth/password/forgot` | Parolni unutdim (email) |
| POST | `/v1/auth/password/reset` | Parolni tiklash (token bilan) |

## Admin Auth (Public, lekin STRICT)

| Method | Path | Vazifasi |
|---|---|---|
| POST | `/v1/admin/login` | Admin phone/email + password — faqat mavjud admin |
| POST | `/v1/admin/google` | Admin Google login — faqat mavjud admin |

## Foydalanuvchi profili

| Method | Path | Vazifasi |
|---|---|---|
| GET | `/v1/users/me` | Joriy user ma'lumotlari |
| PATCH | `/v1/users/me` | Profilni yangilash |

## Yosh toifalari

| Method | Path | Vazifasi |
|---|---|---|
| GET | `/v1/age-categories` | Public ro'yxat |
| GET | `/v1/age-categories/:id` | Bittasini olish |
| POST | `/v1/admin/age-categories` | Admin: yaratish |
| PATCH | `/v1/admin/age-categories/:id` | Admin: tahrirlash |
| DELETE | `/v1/admin/age-categories/:id` | Admin: o'chirish |

## Mashg'ulot toifalari

Xuddi yosh toifalari kabi (`/training-categories`, `/admin/training-categories`).

## Darslar

| Method | Path | Vazifasi |
|---|---|---|
| GET | `/v1/lessons?trainingCategoryId=&ageCategoryId=&search=` | Public katalog (lock flag bilan) |
| GET | `/v1/lessons/:id` | Dars + bloklar (paywall mantiqida) |
| POST | `/v1/admin/lessons` | Admin: yaratish |
| PATCH | `/v1/admin/lessons/:id` | Admin: tahrirlash |
| DELETE | `/v1/admin/lessons/:id` | Admin: o'chirish |
| POST | `/v1/admin/lessons/:id/blocks` | Admin: blok qo'shish |
| PATCH | `/v1/admin/blocks/:id` | Admin: blokni tahrirlash |
| DELETE | `/v1/admin/blocks/:id` | Admin: blokni o'chirish |

## Dars rivoji

| Method | Path | Vazifasi |
|---|---|---|
| GET | `/v1/me/lessons/progress` | Hamma darslar bo'yicha rivojlanish |
| GET | `/v1/me/lessons/:lessonId/progress` | Bir dars bo'yicha |
| PATCH | `/v1/me/lessons/:lessonId/progress` | Yangilash |

## Master-klasslar

| Method | Path | Vazifasi |
|---|---|---|
| GET | `/v1/masterclass-categories?search=` | Public |
| GET | `/v1/masterclass-categories/:id` | Bittasini olish |
| GET | `/v1/masterclasses?masterclassCategoryId=&search=` | Public |
| GET | `/v1/masterclasses/:id` | Bloklar bilan |
| POST/PATCH/DELETE | `/v1/admin/masterclass-categories[/...]` | Admin CRUD |
| POST/PATCH/DELETE | `/v1/admin/masterclasses[/...]` | Admin CRUD |
| POST | `/v1/admin/masterclasses/:id/blocks` | Blok qo'shish |
| PATCH/DELETE | `/v1/admin/masterclass-blocks/:id` | Blok tahrirlash/o'chirish |

## Kitoblar

| Method | Path | Vazifasi |
|---|---|---|
| GET | `/v1/book-categories?search=&categoryType=` | Public |
| GET | `/v1/books?categoryId=&search=&categoryType=` | Public |
| GET | `/v1/books/:id` | Bittasini olish |
| POST/PATCH/DELETE | `/v1/admin/book-categories[/:id]` | Admin |
| POST/PATCH/DELETE | `/v1/admin/books[/:id]` | Admin |
| GET | `/v1/me/books` | O'zining kitoblari |
| POST | `/v1/me/books/:bookId/purchase` | Sotib olish |
| GET | `/v1/me/books/:bookId/progress` | O'qish rivoji |
| PATCH | `/v1/me/books/:bookId/progress` | Yangilash |

## Obuna va to'lov

| Method | Path | Vazifasi |
|---|---|---|
| GET | `/v1/subscription-plans` | Aktiv tariflar |
| POST/PATCH/DELETE | `/v1/admin/subscription-plans[/:id]` | Admin tarif boshqaruvi |
| GET | `/v1/subscriptions/me` | Faol va arxiv obunalar |
| POST | `/v1/subscriptions/me { planId, cardId, autoPay }` | Sotib olish (Click charge) |
| PATCH | `/v1/subscriptions/me/auto-pay { enabled, cardId }` | Auto-pay yoqish/o'chirish |
| POST | `/v1/subscriptions/me/dev-activate/:planId` | DEV-only: to'lovsiz aktivlash |

## Kartalar (Click)

| Method | Path | Vazifasi |
|---|---|---|
| GET | `/v1/cards` | Saqlangan kartalar |
| POST | `/v1/cards/init { cardNumber, expireDate }` | Click'ga so'rov, SMS yuborish |
| POST | `/v1/cards/verify { cardId, smsCode }` | OTP tasdiqlash, tokenni yakunlash |
| DELETE | `/v1/cards/:id` | Kartani o'chirish |

## Wallet

| Method | Path | Vazifasi |
|---|---|---|
| GET | `/v1/wallet/transactions?page=&limit=` | To'lov tarixi |
| POST | `/v1/wallet/transactions/:id/confirm` | (admin/webhook) statusni belgilash |

## Bildirishnomalar

| Method | Path | Vazifasi |
|---|---|---|
| GET | `/v1/notifications?type=&unread=&cursor=&limit=` | Mening bildirishnomalarim |
| PATCH | `/v1/notifications/:id/read` | Bittasini o'qilgan deb belgilash |
| PATCH | `/v1/notifications/read-all` | Hammasini |
| POST | `/v1/devices` | FCM token ro'yxatdan o'tkazish |
| DELETE | `/v1/devices/:id` | FCM tokenni o'chirish |
| POST | `/v1/admin/notifications/send-user` | Admin: bir foydalanuvchiga |
| POST | `/v1/admin/notifications/send-many` | Admin: bir necha foydalanuvchiga |
| POST | `/v1/admin/notifications/broadcast` | Admin: hammaga |

## AI Chat

| Method | Path | Vazifasi |
|---|---|---|
| GET | `/v1/ai/chats` | Suhbatlar tarixi |
| POST | `/v1/ai/chats` | Yangi suhbat |
| GET | `/v1/ai/chats/:id` | Suhbat + xabarlar |
| POST | `/v1/ai/chats/:id/messages` | Yangi xabar yuborish |
| DELETE | `/v1/ai/chats/:id` | Suhbatni o'chirish |

## Statistika (Admin)

| Method | Path | Vazifasi |
|---|---|---|
| GET | `/v1/admin/stats/overview` | KPI: foydalanuvchilar, daromad, kutilayotgan |
| GET | `/v1/admin/stats/revenue?from=&to=` | Daromad trendi |
| GET | `/v1/admin/stats/users-growth?from=&to=` | Foydalanuvchilar o'sishi |
| GET | `/v1/admin/stats/subscriptions-by-plan` | Tariflar bo'yicha taqsim |
| GET | `/v1/admin/stats/notifications-summary` | Bildirishnoma statistikasi |
| GET | `/v1/admin/stats/top-lessons?limit=` | Top darslar |
| GET | `/v1/admin/stats/top-books?limit=` | Top kitoblar |

## Fayl yuklash (Admin)

| Method | Path | Vazifasi |
|---|---|---|
| POST | `/v1/admin/uploads/presign` | Presigned URL olish (R2) |
| DELETE | `/v1/admin/uploads/object` | Faylni o'chirish |

## Legal (foydalanish shartlari)

| Method | Path | Vazifasi |
|---|---|---|
| GET | `/v1/legal/public` | Public: aktiv foydalanish shartlari |
| GET/POST/PATCH/DELETE | `/v1/legal[/...]` | Admin boshqaruvi |

## Health

| Method | Path | Vazifasi |
|---|---|---|
| GET | `/v1/health` | Tirik yoki yo'qligini tekshirish |
