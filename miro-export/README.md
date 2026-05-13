# Football Coach Backend — Eksport Paketi

Bu papka loyihaning biznes-logikasini AI yordamida diagramma va vizualizatsiya yaratuvchi vositalar (Miro AI, Eraser.io, Whimsical AI, ChatGPT, Claude va h.k.) o'qishi uchun tayyorlangan.

## Qanday ishlatish

1. Bu papkadagi **barcha fayllarni** AI vositangizga yuklang yoki kontekstga qo'shing.
2. So'rov bering: "Ushbu loyihaning ER-diagrammasi / use-case diagrammasi / sequence diagrammasi / business flow diagrammasini chizib ber".
3. Agar Miro AI'ga yuklayotgan bo'lsangiz, ishchi bo'shliqqa quyidagilarni so'rang:
   - Domen modeli (entity-relationship)
   - Foydalanuvchi safari (user journey)
   - To'lov flow
   - Auth flow
   - Admin panel arxitekturasi

## Fayllar

| Fayl | Mazmuni |
|---|---|
| `README.md` | Ushbu hujjat — kirish |
| `BUSINESS_LOGIC.md` | **Asosiy hujjat** — barcha biznes logika, foydalanuvchi safarlari, oqimlar |
| `ER_DIAGRAM.md` | Mermaid sintaksisidagi ER-diagramma + jadvallar tavsifi |
| `API_ROUTES.md` | Barcha REST endpointlari ro'yxati va vazifasi |
| `USER_FLOWS.md` | Foydalanuvchi va admin oqimlari (sequence/journey diagrammalari) |
| **`SCHEMA.md`** | **Prisma schema markdown ichida** — AI vositalari `.prisma` o'qiy olmasa shuni ishlating |
| **`PACKAGE.md`** | **package.json markdown ichida** — texnologiya stack tavsifi bilan |
| `schema.prisma` | Asl Prisma schema fayli (raw nusxa, IDE uchun) |
| `package.json` | Asl package.json fayli (raw nusxa, IDE uchun) |

> **Diqqat:** Miro AI, ChatGPT, Claude va boshqa ko'pchilik AI vositalari `.prisma` va `.json` kengaytmalarini o'qiy olmaydi — **ular `.md` fayllarini ko'rishi mumkin**. Shuning uchun `SCHEMA.md` va `PACKAGE.md` faylllaridan foydalaning. Asl fayllar IDE va versiya nazorati uchun qoldirilgan.

## Loyiha haqida qisqacha

**Football Coach** — futbol murabbiylari, yosh futbolchilar va ularning ota-onalari uchun ikki tilli (O'zbekcha + Ruscha) ta'lim platformasi. NestJS + Prisma + PostgreSQL backend, Click.uz orqali to'lov, Google + telefon OTP autentifikatsiya, Firebase push-bildirishnomalar.

**Asosiy modullar:**
- Auth (telefon OTP, email parol, Google OAuth, alohida admin login)
- Subscription tariflari (Haftalik/Oylik/Choraklik/Yillik) + auto-pay
- Lessons (yosh toifasi → mashg'ulot toifasi → dars → bloklar)
- Masterclasses (kategoriya → master-klass → bloklar)
- Books / Konspekts (sotib olish + o'qish progress)
- AI Chat (futbol murabbiyligi bo'yicha AI-yordamchi)
- Notifications (in-app + Firebase push)
- Cards (Click.uz kartani saqlash, auto-pay)
- Wallet (to'lov tarixi)
- Admin panel uchun statistika va analitika
