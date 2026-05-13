import { PrismaClient, DiscountType, BookCategoryType, BlockType, NotificationType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ═══════════════════════════════════════════════════════════════
  // 1. ROLES
  // ═══════════════════════════════════════════════════════════════
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });
  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: { name: 'USER' },
  });
  console.log('✓ Roles seeded (ADMIN, USER)');

  // ═══════════════════════════════════════════════════════════════
  // 2. USERS (1 admin + 5 regular)
  // ═══════════════════════════════════════════════════════════════
  const pwd = await bcrypt.hash('Admin123!', 12);

  const admin = await prisma.user.upsert({
    where: { phone: '+998900000000' },
    update: {},
    create: {
      phone: '+998900000000',
      email: 'admin@football-coach.uz',
      password: pwd,
      firstName: 'Bosh',
      lastName: 'Admin',
      isVerified: true,
      isActive: true,
      roleId: adminRole.id,
    },
  });

  const userPwd = await bcrypt.hash('User123!', 12);
  const users = await Promise.all(
    [
      { phone: '+998901111111', firstName: 'Bekzod',  lastName: 'Karimov',   email: 'bekzod@test.uz' },
      { phone: '+998902222222', firstName: 'Aziz',    lastName: 'Rustamov',  email: 'aziz@test.uz' },
      { phone: '+998903333333', firstName: 'Javohir', lastName: 'Olimov',    email: 'javohir@test.uz' },
      { phone: '+998904444444', firstName: 'Sardor',  lastName: 'Mirzayev',  email: 'sardor@test.uz' },
      { phone: '+998905555555', firstName: 'Otabek',  lastName: 'Yusupov',   email: 'otabek@test.uz' },
    ].map((u) =>
      prisma.user.upsert({
        where: { phone: u.phone },
        update: {},
        create: {
          ...u,
          password: userPwd,
          isVerified: true,
          isActive: true,
          roleId: userRole.id,
        },
      }),
    ),
  );
  console.log(`✓ Users seeded (1 admin + ${users.length} users)`);

  // ═══════════════════════════════════════════════════════════════
  // 3. AGE CATEGORIES
  // ═══════════════════════════════════════════════════════════════
  const ageCategories = await Promise.all(
    [
      { id: 1, titleUz: 'U-10', titleRu: 'U-10', minAge: 6,  maxAge: 10 },
      { id: 2, titleUz: 'U-12', titleRu: 'U-12', minAge: 8,  maxAge: 12 },
      { id: 3, titleUz: 'U-15', titleRu: 'U-15', minAge: 13, maxAge: 15 },
      { id: 4, titleUz: 'U-18', titleRu: 'U-18', minAge: 16, maxAge: 18 },
      { id: 5, titleUz: 'Kattalar', titleRu: 'Взрослые', minAge: 19, maxAge: 99 },
    ].map((a) =>
      prisma.ageCategory.upsert({
        where: { id: a.id },
        update: {},
        create: a,
      }),
    ),
  );
  console.log(`✓ Age categories seeded (${ageCategories.length})`);

  // ═══════════════════════════════════════════════════════════════
  // 4. TRAINING CATEGORIES
  // ═══════════════════════════════════════════════════════════════
  const trainingCats = [
    { id: 1, titleUz: 'Asosiy dribling',      titleRu: 'Базовый дриблинг',            age: 2, descUz: 'Top bilan yugurish va boshqarish mashqlari',       descRu: 'Упражнения по ведению мяча' },
    { id: 2, titleUz: 'Pas berish asoslari',  titleRu: 'Основы передач',               age: 2, descUz: 'Qisqa va uzoq masofaga pas berish',                   descRu: 'Передачи на короткие и длинные дистанции' },
    { id: 3, titleUz: 'Darvozaga zarba',      titleRu: 'Удары по воротам',             age: 3, descUz: 'Turli pozitsiyalardan zarba berish',                   descRu: 'Удары из разных позиций' },
    { id: 4, titleUz: 'Taktik mashq',         titleRu: 'Тактические упражнения',       age: 3, descUz: 'Jamoaviy harakat va pozitsiya',                         descRu: 'Командные действия и позиционная игра' },
    { id: 5, titleUz: 'Jismoniy tayyorgarlik', titleRu: 'Физическая подготовка',       age: 4, descUz: 'Chidamlilik, tezlik va kuch mashqlari',                descRu: 'Упражнения на выносливость, скорость и силу' },
    { id: 6, titleUz: 'Himoya mahorati',      titleRu: 'Оборонительные навыки',        age: 4, descUz: 'To\'pni olish va raqibni bloklash',                    descRu: 'Отбор мяча и блокировка соперника' },
    { id: 7, titleUz: 'Kichkintoylar uchun',  titleRu: 'Для малышей',                  age: 1, descUz: 'Qiziqarli o\'yinlar va asosiy ko\'nikmalar',          descRu: 'Весёлые игры и базовые навыки' },
  ];

  const createdCats = await Promise.all(
    trainingCats.map((c) =>
      prisma.trainingCategory.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id: c.id,
          titleUz: c.titleUz,
          titleRu: c.titleRu,
          ageCategoriesId: c.age,
          descriptionUz: c.descUz,
          descriptionRu: c.descRu,
        },
      }),
    ),
  );
  console.log(`✓ Training categories seeded (${createdCats.length})`);

  // ═══════════════════════════════════════════════════════════════
  // 5. TRAINING LESSONS + BLOCKS
  // ═══════════════════════════════════════════════════════════════
  const lessons = [
    { id: 1,  catId: 1, titleUz: 'To\'p bilan yugurish',            titleRu: 'Бег с мячом',                    order: 1, duration: 900  },
    { id: 2,  catId: 1, titleUz: 'Konuslar orasida dribling',       titleRu: 'Дриблинг между конусами',        order: 2, duration: 1200 },
    { id: 3,  catId: 1, titleUz: 'Yo\'nalishni o\'zgartirish',      titleRu: 'Смена направления',              order: 3, duration: 900  },
    { id: 4,  catId: 2, titleUz: 'Qisqa pas (5-10m)',               titleRu: 'Короткая передача (5-10м)',      order: 1, duration: 1200 },
    { id: 5,  catId: 2, titleUz: 'Uzoq pas (20m+)',                 titleRu: 'Длинная передача (20м+)',        order: 2, duration: 1500 },
    { id: 6,  catId: 3, titleUz: 'Oyoqning ichki tarafi bilan',     titleRu: 'Удар внутренней частью стопы',   order: 1, duration: 900  },
    { id: 7,  catId: 3, titleUz: 'Penalti zarbasi',                 titleRu: 'Пенальти',                       order: 2, duration: 600  },
    { id: 8,  catId: 4, titleUz: '4-4-2 sxemasi',                   titleRu: 'Схема 4-4-2',                    order: 1, duration: 1800 },
    { id: 9,  catId: 5, titleUz: 'Chidamlilik mashqi',              titleRu: 'Тренировка выносливости',         order: 1, duration: 2400 },
    { id: 10, catId: 6, titleUz: 'Himoyada pozitsiya',              titleRu: 'Позиция в защите',               order: 1, duration: 1200 },
  ];

  const blockTypes: BlockType[] = ['TITLE', 'TEXT', 'VIDEO', 'IMAGE', 'FILE', 'HINT'];
  const blockContent: Record<BlockType, { uz: string; ru: string }> = {
    TITLE:  { uz: 'Dars sarlavhasi',                       ru: 'Заголовок урока' },
    TEXT:   { uz: 'Mashg\'ulotning batafsil tavsifi va ko\'rsatmalari', ru: 'Подробное описание и инструкции' },
    VIDEO:  { uz: 'https://example.com/lesson-video.mp4',  ru: 'https://example.com/lesson-video.mp4' },
    IMAGE:  { uz: 'https://example.com/lesson-diagram.png', ru: 'https://example.com/lesson-diagram.png' },
    FILE:   { uz: '/files/lesson-plan.pdf',                ru: '/files/lesson-plan.pdf' },
    HINT:   { uz: 'Muhim maslahat: pozitsiyaga e\'tibor bering', ru: 'Важный совет: обратите внимание на позицию' },
  };

  let blockId = 0;
  for (const l of lessons) {
    await prisma.trainingLesson.upsert({
      where: { id: l.id },
      update: {},
      create: {
        id: l.id,
        trainingCategoryId: l.catId,
        titleUz: l.titleUz,
        titleRu: l.titleRu,
      },
    });

    for (let i = 0; i < blockTypes.length; i++) {
      blockId++;
      const bt = blockTypes[i];
      await prisma.lessonBlock.upsert({
        where: { id: blockId },
        update: {},
        create: {
          id: blockId,
          lessonId: l.id,
          blockType: bt,
          contentUz: blockContent[bt].uz,
          contentRu: blockContent[bt].ru,
          sequenceOrder: i + 1,
          duration: bt === 'VIDEO' ? 120 + i * 30 : null,
        },
      });
    }
  }
  console.log(`✓ Training lessons seeded (${lessons.length}) with ${blockId} blocks`);

  // ═══════════════════════════════════════════════════════════════
  // 6. SUBSCRIPTION PLANS
  // ═══════════════════════════════════════════════════════════════
  const plans = [
    {
      id: 1, titleUz: 'Haftalik', titleRu: 'Недельный', days: 7, price: 19000,
      discountType: DiscountType.NONE, discountPct: 0, fixed: null,
      features: [
        { uz: 'Barcha bepul darslarga kirish',          ru: 'Доступ ко всем бесплатным урокам' },
        { uz: 'Bitta yosh kategoriyasi',                 ru: 'Одна возрастная категория' },
        { uz: 'Asosiy mashqlar to‘plami',                ru: 'Базовый набор упражнений' },
        { uz: 'Mobil va veb ilova',                      ru: 'Мобильное и веб‑приложение' },
      ],
    },
    {
      id: 2, titleUz: 'Oylik', titleRu: 'Месячный', days: 30, price: 49000,
      discountType: DiscountType.PERCENTAGE, discountPct: 10, fixed: null,
      features: [
        { uz: 'Haftalik rejadagi hammasi', ru: 'Всё, что входит в Недельный', highlight: true },
        { uz: 'Barcha pullik darslar',                    ru: 'Все платные уроки' },
        { uz: 'Barcha yosh kategoriyalari',               ru: 'Все возрастные категории' },
        { uz: 'HD video sifati',                          ru: 'HD‑качество видео' },
        { uz: 'Treninglarni yuklab olish',                ru: 'Скачивание тренировок' },
      ],
    },
    {
      id: 3, titleUz: 'Choraklik', titleRu: 'Квартальный', days: 90, price: 129000,
      discountType: DiscountType.PERCENTAGE, discountPct: 15, fixed: null,
      features: [
        { uz: 'Oylik rejadagi hammasi', ru: 'Всё, что входит в Месячный', highlight: true },
        { uz: 'Master‑classlarga kirish',                 ru: 'Доступ к мастер‑классам' },
        { uz: 'Trener bilan oylik konsultatsiya',         ru: 'Ежемесячная консультация с тренером' },
        { uz: 'Yangi darslarga erta kirish',              ru: 'Ранний доступ к новым урокам' },
      ],
    },
    {
      id: 4, titleUz: 'Yillik', titleRu: 'Годовой', days: 365, price: 490000,
      discountType: DiscountType.FIXED_PRICE, discountPct: 0, fixed: 390000,
      features: [
        { uz: 'Choraklik rejadagi hammasi', ru: 'Всё, что входит в Квартальный', highlight: true },
        { uz: 'Barcha master‑classlar (cheksiz)',         ru: 'Все мастер‑классы (безлимит)' },
        { uz: 'Barcha kitob va konspektlar bepul',        ru: 'Все книги и конспекты бесплатно' },
        { uz: 'Yopiq Telegram hamjamiyat',                ru: 'Закрытое Telegram‑сообщество' },
        { uz: 'Shaxsiy o‘sish hisoboti (oy / chorak)',    ru: 'Персональный отчёт о прогрессе (месяц / квартал)' },
        { uz: 'Premium qo‘llab‑quvvatlash 24/7',          ru: 'Премиум‑поддержка 24/7' },
      ],
    },
    {
      id: 5, titleUz: 'Bepul sinov', titleRu: 'Бесплатный пробный', days: 7, price: 0,
      discountType: DiscountType.NONE, discountPct: 0, fixed: null,
      features: [
        { uz: '7 kun davomida bepul kirish',              ru: '7 дней бесплатного доступа' },
        { uz: 'Bepul darslarni ko‘rish',                  ru: 'Просмотр бесплатных уроков' },
        { uz: 'Bitta yosh kategoriyasi',                  ru: 'Одна возрастная категория' },
        { uz: 'Reklama bilan',                            ru: 'С рекламой' },
        { uz: 'Yuklab olish imkoni yo‘q',                 ru: 'Без возможности скачивания' },
      ],
    },
    {
      id: 6, titleUz: 'Pro Oylik', titleRu: 'Pro Месячный', days: 30, price: 99000,
      discountType: DiscountType.PERCENTAGE, discountPct: 20, fixed: null,
      features: [
        { uz: 'Oylik rejadagi hammasi',                   ru: 'Всё, что входит в Месячный', highlight: true },
        { uz: 'Master‑classlarga to‘liq kirish',          ru: 'Полный доступ к мастер‑классам' },
        { uz: '4K video sifati',                          ru: '4K‑качество видео' },
        { uz: 'Trener bilan haftalik konsultatsiya',      ru: 'Еженедельная консультация с тренером' },
        { uz: 'AI yordamchi (cheksiz savollar)',          ru: 'AI‑ассистент (безлимит вопросов)' },
        { uz: 'Reklama yo‘q',                             ru: 'Без рекламы' },
      ],
    },
    {
      id: 7, titleUz: 'Premium Yillik', titleRu: 'Premium Годовой', days: 365, price: 990000,
      discountType: DiscountType.FIXED_PRICE, discountPct: 0, fixed: 790000,
      features: [
        { uz: 'Yillik rejadagi hammasi',                  ru: 'Всё, что входит в Годовой', highlight: true },
        { uz: 'Pro Oylik darajasidagi hamma narsa',       ru: 'Всё уровня Pro Месячный' },
        { uz: 'Shaxsiy trener (oyda 4 ta sessiya)',       ru: 'Персональный тренер (4 сессии в месяц)' },
        { uz: 'Premium master‑classlar (yopiq seriyalar)', ru: 'Премиум мастер‑классы (закрытые серии)' },
        { uz: 'Yopiq voqealar va onlayn vebinarlar',      ru: 'Закрытые мероприятия и онлайн‑вебинары' },
        { uz: 'Sertifikat va doimiy darajalanish',        ru: 'Сертификат и постоянная градация' },
        { uz: 'Family rejimi (3 ta foydalanuvchi)',       ru: 'Семейный режим (3 пользователя)' },
        { uz: 'Tezkor qo‘llab‑quvvatlash (5 daqiqada)',   ru: 'Молниеносная поддержка (5 минут)' },
      ],
    },
  ];

  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: p.id },
      update: { features: p.features },
      create: {
        id: p.id,
        titleUz: p.titleUz,
        titleRu: p.titleRu,
        descriptionUz: `${p.days} kunlik to'liq kirish rejasi`,
        descriptionRu: `Полный доступ на ${p.days} дней`,
        durationDays: p.days,
        basePrice: p.price,
        discountType: p.discountType,
        discountPercent: p.discountPct,
        fixedDiscountPrice: p.fixed,
        isActive: true,
        features: p.features,
      },
    });
  }
  console.log(`✓ Subscription plans seeded (${plans.length})`);

  // ─── Subscriptions mock data ───────────────────────────────────
  // We seed a variety of states so the admin & user UIs have realistic data:
  //   user[0] — active monthly + autoPay ON         (id 1)
  //   user[1] — active yearly  + autoPay OFF        (id 2)
  //   user[2] — active weekly  + autoPay ON         (id 3)
  //   user[2] — old expired weekly (history)        (id 4)
  //   user[3] — expired monthly (history)           (id 5)
  //   user[4] — active quarterly + autoPay OFF      (id 6)
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const planById = new Map<number, { id: number; durationDays: number }>();
  for (const p of plans) {
    planById.set(p.id, { id: p.id, durationDays: p.days });
  }

  const subscriptionMocks = [
    { id: 1, userIdx: 0, planId: 2, startedDaysAgo: 5,   isActive: true,  autoPay: true  }, // Oylik, faol
    { id: 2, userIdx: 1, planId: 4, startedDaysAgo: 30,  isActive: true,  autoPay: false }, // Yillik, faol
    { id: 3, userIdx: 2, planId: 1, startedDaysAgo: 2,   isActive: true,  autoPay: true  }, // Haftalik, faol
    { id: 4, userIdx: 2, planId: 1, startedDaysAgo: 60,  isActive: false, autoPay: false }, // Eski haftalik
    { id: 5, userIdx: 3, planId: 2, startedDaysAgo: 90,  isActive: false, autoPay: false }, // Eski oylik
    { id: 6, userIdx: 4, planId: 3, startedDaysAgo: 10,  isActive: true,  autoPay: false }, // Choraklik, faol
  ];

  for (const s of subscriptionMocks) {
    const plan = planById.get(s.planId)!;
    const user = users[s.userIdx];
    if (!user) continue;
    const start = new Date(now - s.startedDaysAgo * dayMs);
    const end = new Date(start.getTime() + plan.durationDays * dayMs);
    await prisma.subscription.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        userId: user.id,
        startDate: start,
        endDate: end,
        isActive: s.isActive,
        autoPay: s.autoPay,
        subscriptionsPlansId: plan.id,
      },
    });
  }
  console.log(`✓ Subscriptions seeded (${subscriptionMocks.length})`);

  // ─── Wallet transactions for those subscriptions ────────────────
  // One SUCCESS row per subscription so users see purchase history.
  // Plus one FAILED row for user[0] (realistic error noise).
  const txMocks = [
    { id: 1, userIdx: 0, planId: 2, amount: 44100,  status: 'SUCCESS' as const, daysAgo: 5,  errorCode: null,                    errorMessage: null },
    { id: 2, userIdx: 1, planId: 4, amount: 390000, status: 'SUCCESS' as const, daysAgo: 30, errorCode: null,                    errorMessage: null },
    { id: 3, userIdx: 2, planId: 1, amount: 19000,  status: 'SUCCESS' as const, daysAgo: 2,  errorCode: null,                    errorMessage: null },
    { id: 4, userIdx: 2, planId: 1, amount: 19000,  status: 'SUCCESS' as const, daysAgo: 60, errorCode: null,                    errorMessage: null },
    { id: 5, userIdx: 3, planId: 2, amount: 44100,  status: 'SUCCESS' as const, daysAgo: 90, errorCode: null,                    errorMessage: null },
    { id: 6, userIdx: 4, planId: 3, amount: 109650, status: 'SUCCESS' as const, daysAgo: 10, errorCode: null,                    errorMessage: null },
    { id: 7, userIdx: 0, planId: 2, amount: 44100,  status: 'FAILED'  as const, daysAgo: 1,  errorCode: 'insufficient_funds',    errorMessage: 'Kartada yetarli mablag\' yo\'q' },
  ];

  for (const t of txMocks) {
    const user = users[t.userIdx];
    if (!user) continue;
    await prisma.walletTransaction.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        userId: user.id,
        amount: t.amount,
        provider: 'click',
        status: t.status,
        subscriptionsPlansId: t.planId,
        externalId: t.status === 'SUCCESS' ? `mock_click_tx_${t.id}` : null,
        errorCode: t.errorCode,
        errorMessage: t.errorMessage,
        createdAt: new Date(now - t.daysAgo * dayMs),
      },
    });
  }
  console.log(`✓ Wallet transactions seeded (${txMocks.length})`);

  // ═══════════════════════════════════════════════════════════════
  // 7. BOOK CATEGORIES + BOOKS
  // ═══════════════════════════════════════════════════════════════
  const bookCats = [
    { id: 1, titleUz: 'Futbol kitoblari',    titleRu: 'Футбольные книги',     type: BookCategoryType.BOOK },
    { id: 2, titleUz: 'Konspektlar',         titleRu: 'Конспекты',            type: BookCategoryType.KONSPEKT },
    { id: 3, titleUz: 'Taktika qo\'llanmalari', titleRu: 'Руководства по тактике', type: BookCategoryType.BOOK },
  ];
  for (const bc of bookCats) {
    await prisma.bookCategory.upsert({
      where: { id: bc.id },
      update: {},
      create: {
        id: bc.id,
        titleUz: bc.titleUz,
        titleRu: bc.titleRu,
        categoryType: bc.type,
      },
    });
  }
  console.log(`✓ Book categories seeded (${bookCats.length})`);

  const books = [
    { id: 1, catId: 1, titleUz: 'Futbol taktikasi asoslari',        titleRu: 'Основы футбольной тактики',         price: 35000, cover: '/covers/tactics.jpg' },
    { id: 2, catId: 1, titleUz: 'Zamonaviy futbol tayyorgarligi',   titleRu: 'Современная футбольная подготовка', price: 45000, cover: '/covers/modern.jpg'  },
    { id: 3, catId: 2, titleUz: 'U-12 mashg\'ulot konspekti',       titleRu: 'Конспект тренировки U-12',          price: 15000, cover: '/covers/u12.jpg'     },
    { id: 4, catId: 2, titleUz: 'U-15 mashg\'ulot konspekti',       titleRu: 'Конспект тренировки U-15',          price: 18000, cover: '/covers/u15.jpg'     },
    { id: 5, catId: 3, titleUz: '4-3-3 sxemasi bo\'yicha qo\'llanma', titleRu: 'Руководство по схеме 4-3-3',      price: 25000, cover: '/covers/433.jpg'     },
    { id: 6, catId: 3, titleUz: 'Pressing taktikasi',               titleRu: 'Тактика прессинга',                 price: 28000, cover: '/covers/press.jpg'   },
  ];
  for (const b of books) {
    await prisma.book.upsert({
      where: { id: b.id },
      update: {},
      create: {
        id: b.id,
        bookCategoryId: b.catId,
        titleUz: b.titleUz,
        titleRu: b.titleRu,
        fileUrl: `/books/book-${b.id}.pdf`,
        basePrice: b.price,
        discountType: DiscountType.NONE,
        discountPercent: 0,
        coverImageUrl: b.cover,
        descriptionUz: `${b.titleUz} — batafsil tavsif va mashg'ulotlar`,
        descriptionRu: `${b.titleRu} — детальное описание и упражнения`,
      },
    });
  }
  console.log(`✓ Books seeded (${books.length})`);

  // One purchased book + progress for the first regular user
  await prisma.userBook.upsert({
    where: { userId_bookId: { userId: users[0].id, bookId: 1 } },
    update: {},
    create: {
      userId: users[0].id,
      bookId: 1,
      isActive: true,
    },
  });
  await prisma.bookProgress.upsert({
    where: { userId_bookId: { userId: users[0].id, bookId: 1 } },
    update: {},
    create: {
      userId: users[0].id,
      bookId: 1,
      lastPageRead: 12,
      isCompleted: false,
    },
  });
  console.log(`✓ Sample user book + progress for ${users[0].firstName}`);

  // One active lesson progress for first regular user (lesson #1, middle of blocks)
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: users[0].id, lessonId: 1 } },
    update: {},
    create: {
      userId: users[0].id,
      lessonId: 1,
      lastBlockSequence: 3,
      isCompleted: false,
    },
  });
  console.log(`✓ Sample lesson progress for ${users[0].firstName} (lesson #1, block 3/6)`);

  // ═══════════════════════════════════════════════════════════════
  // 8. NOTIFICATIONS (sample)
  // ═══════════════════════════════════════════════════════════════
  const notifications = [
    { userId: users[0].id, type: NotificationType.SYSTEM,       titleUz: 'Xush kelibsiz!',          titleRu: 'Добро пожаловать!',       msgUz: 'Football Coach ilovasiga xush kelibsiz.',      msgRu: 'Добро пожаловать в приложение Football Coach.' },
    { userId: users[0].id, type: NotificationType.SUBSCRIPTION, titleUz: 'Obuna faollashdi',        titleRu: 'Подписка активирована',   msgUz: 'Oylik obunangiz muvaffaqiyatli faollashdi.',    msgRu: 'Месячная подписка успешно активирована.' },
    { userId: users[0].id, type: NotificationType.LESSON,       titleUz: 'Yangi dars',              titleRu: 'Новый урок',              msgUz: 'U-12 kategoriyasida yangi dars mavjud.',       msgRu: 'В категории U-12 доступен новый урок.' },
    { userId: users[1].id, type: NotificationType.BOOK,         titleUz: 'Yangi kitob',             titleRu: 'Новая книга',             msgUz: 'Futbol taktikasi asoslari kitobi chiqdi.',     msgRu: 'Вышла книга Основы футбольной тактики.' },
    { userId: users[2].id, type: NotificationType.AI_CHAT,      titleUz: 'AI javob berdi',          titleRu: 'AI ответил',              msgUz: 'AI murabbiyingiz savolingizga javob berdi.',    msgRu: 'Ваш AI-тренер ответил на вопрос.' },
  ];
  let nid = 0;
  for (const n of notifications) {
    nid++;
    await prisma.notification.upsert({
      where: { id: nid },
      update: {},
      create: {
        id: nid,
        userId: n.userId,
        type: n.type,
        titleUz: n.titleUz,
        titleRu: n.titleRu,
        messageUz: n.msgUz,
        messageRu: n.msgRu,
        isRead: false,
      },
    });
  }
  console.log(`✓ Notifications seeded (${notifications.length})`);

  // ═══════════════════════════════════════════════════════════════
  // 8b. MASTERCLASS CATEGORIES + MASTERCLASSES + BLOCKS
  // ═══════════════════════════════════════════════════════════════
  const mcCats = [
    {
      id: 1,
      titleUz: "Dribling mahorati",
      titleRu: "Мастерство дриблинга",
      descriptionUz: "Top bilan ishlash va raqib yonidan o'tish bo'yicha master-klasslar",
      descriptionRu: "Мастер-классы по работе с мячом и обыгрыванию соперника",
      imageUrl: "/masterclass/dribbling.jpg",
    },
    {
      id: 2,
      titleUz: "Pas berish san'ati",
      titleRu: "Искусство передач",
      descriptionUz: "Aniq va tezkor paslar orqali o'yinni boshqarish",
      descriptionRu: "Контроль игры через точные и быстрые передачи",
      imageUrl: "/masterclass/passing.jpg",
    },
    {
      id: 3,
      titleUz: "Darvoza oldida",
      titleRu: "У ворот",
      descriptionUz: "Gol urish mahorati: zarbalar, pozitsiya va ruhiyat",
      descriptionRu: "Мастерство забивания: удары, позиция и психология",
      imageUrl: "/masterclass/finishing.jpg",
    },
    {
      id: 4,
      titleUz: "Taktik fikrlash",
      titleRu: "Тактическое мышление",
      descriptionUz: "Maydonni o'qish va to'g'ri qaror qabul qilish",
      descriptionRu: "Чтение поля и принятие правильных решений",
      imageUrl: "/masterclass/tactics.jpg",
    },
  ];

  for (const c of mcCats) {
    await prisma.masterclassCategory.upsert({
      where: { id: c.id },
      update: {},
      create: c,
    });
  }
  console.log(`✓ Masterclass categories seeded (${mcCats.length})`);

  const masterclasses = [
    { id: 1, catId: 1, titleUz: "Messi stili dribling", titleRu: "Дриблинг в стиле Месси" },
    { id: 2, catId: 1, titleUz: "Tor maydonda top boshqarish", titleRu: "Контроль мяча в узком пространстве" },
    { id: 3, catId: 1, titleUz: "Stepover va elastico", titleRu: "Степовер и эластико" },
    { id: 4, catId: 2, titleUz: "Xavierning uzun paslari", titleRu: "Длинные передачи Хави" },
    { id: 5, catId: 2, titleUz: "Bir tegishli pas", titleRu: "Передача в одно касание" },
    { id: 6, catId: 3, titleUz: "Ronaldo-style erkin zarba", titleRu: "Штрафной в стиле Роналду" },
    { id: 7, catId: 3, titleUz: "Boshiga oshirilgan top", titleRu: "Удар головой с навеса" },
    { id: 8, catId: 3, titleUz: "Penalti psixologiyasi", titleRu: "Психология пенальти" },
    { id: 9, catId: 4, titleUz: "Pep Guardiola pressing", titleRu: "Прессинг Пепа Гвардиолы" },
    { id: 10, catId: 4, titleUz: "4-3-3 dan 3-5-2 ga o'tish", titleRu: "Переход с 4-3-3 на 3-5-2" },
  ];

  const mcBlockTypes: BlockType[] = ['TITLE', 'TEXT', 'VIDEO', 'IMAGE', 'HINT'];
  const mcBlockContent: Record<BlockType, { uz: string; ru: string }> = {
    TITLE: {
      uz: "Master-klass bosqichi",
      ru: "Этап мастер-класса",
    },
    TEXT: {
      uz: "Ushbu master-klassda siz real o'yin sharoitida qo'llaniladigan texnika va yondashuvni o'rganasiz.",
      ru: "В этом мастер-классе вы изучите технику и подход, применяемые в реальных игровых условиях.",
    },
    VIDEO: {
      uz: "https://example.com/masterclass-demo.mp4",
      ru: "https://example.com/masterclass-demo.mp4",
    },
    IMAGE: {
      uz: "https://example.com/masterclass-diagram.png",
      ru: "https://example.com/masterclass-diagram.png",
    },
    FILE: {
      uz: "/files/masterclass-guide.pdf",
      ru: "/files/masterclass-guide.pdf",
    },
    HINT: {
      uz: "Eslatma: mashqni sekin sur'atda boshlang, keyin tezlikni oshiring.",
      ru: "Совет: начните упражнение в медленном темпе, затем увеличьте скорость.",
    },
  };

  let mcBlockId = 0;
  for (const m of masterclasses) {
    await prisma.masterclass.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        masterclassCategoryId: m.catId,
        titleUz: m.titleUz,
        titleRu: m.titleRu,
      },
    });

    for (let i = 0; i < mcBlockTypes.length; i++) {
      mcBlockId++;
      const bt = mcBlockTypes[i];
      await prisma.masterclassBlock.upsert({
        where: { id: mcBlockId },
        update: {},
        create: {
          id: mcBlockId,
          masterclassId: m.id,
          blockType: bt,
          contentUz: mcBlockContent[bt].uz,
          contentRu: mcBlockContent[bt].ru,
          sequenceOrder: i + 1,
          duration: bt === 'VIDEO' ? 180 + i * 30 : null,
        },
      });
    }
  }
  console.log(
    `✓ Masterclasses seeded (${masterclasses.length}) with ${mcBlockId} blocks`,
  );

  // ═══════════════════════════════════════════════════════════════
  // 9. LEGAL DOCUMENTS (Privacy / Terms / Offer / Requisites)
  // ═══════════════════════════════════════════════════════════════
  const legalDocs = [
    {
      id: 1,
      type: 'PRIVACY_POLICY' as const,
      titleUz: 'Maxfiylik siyosati',
      titleRu: 'Политика конфиденциальности',
      contentUz:
        '# Maxfiylik siyosati\n\nUshbu hujjat ilovamiz foydalanuvchilarining shaxsiy ma\'lumotlari qanday yig\'ilishi, saqlanishi va ishlatilishini tushuntiradi.\n\n## 1. Yig\'iladigan ma\'lumotlar\n- Ism, telefon, email\n- Yosh va shahar\n- To\'lov tarixi (kartalar to\'liq raqamlari saqlanmaydi)\n\n## 2. Foydalanish maqsadi\n- Xizmatlarni taqdim etish\n- Xavfsizlikni ta\'minlash\n- Statistika va sifatni oshirish\n\n## 3. Aloqa\nSavollar uchun: support@football-coach.uz',
      contentRu:
        '# Политика конфиденциальности\n\nДанный документ описывает, как собираются, хранятся и используются персональные данные пользователей нашего приложения.\n\n## 1. Собираемые данные\n- Имя, телефон, email\n- Возраст и город\n- История платежей (полные номера карт не сохраняются)\n\n## 2. Цели использования\n- Предоставление сервиса\n- Обеспечение безопасности\n- Аналитика и улучшение качества\n\n## 3. Контакты\nВопросы: support@football-coach.uz',
    },
    {
      id: 2,
      type: 'TERMS_OF_SERVICE' as const,
      titleUz: 'Foydalanuvchi shartnomasi',
      titleRu: 'Пользовательское соглашение',
      contentUz:
        '# Foydalanuvchi shartnomasi\n\n## 1. Umumiy qoidalar\nUshbu shartnoma platformadan foydalanish qoidalarini belgilaydi.\n\n## 2. Ro\'yxatdan o\'tish\nFoydalanuvchi to\'g\'ri ma\'lumot kiritishi shart.\n\n## 3. Kontent va mualliflik\nBarcha video va matn materiallari himoyalangan. Ularni qayta tarqatish taqiqlanadi.\n\n## 4. Hisobni cheklash\nQoida buzilgan taqdirda hisob bloklanadi.',
      contentRu:
        '# Пользовательское соглашение\n\n## 1. Общие положения\nДанное соглашение определяет правила использования платформы.\n\n## 2. Регистрация\nПользователь обязан указывать достоверные данные.\n\n## 3. Контент и авторские права\nВсе видео и текстовые материалы защищены. Их распространение запрещено.\n\n## 4. Ограничение учётной записи\nПри нарушении правил аккаунт блокируется.',
    },
    {
      id: 3,
      type: 'OFFER_AGREEMENT' as const,
      titleUz: 'Ommaviy oferta shartnomasi',
      titleRu: 'Договор оферты',
      contentUz:
        '# Ommaviy oferta\n\n## 1. Shartnoma predmeti\nIjrochi (Football Coach) Buyurtmachiga (foydalanuvchi) ta\'lim platformasiga obuna xizmatini taqdim etadi.\n\n## 2. Narx va to\'lov\nObuna narxlari saytda ko\'rsatilgan. To\'lov Click.uz orqali amalga oshiriladi.\n\n## 3. Pulni qaytarish\nObuna faollashtirilgandan so\'ng pul qaytarilmaydi.\n\n## 4. Mas\'uliyat\nIjrochi xizmatning sifatli ishlashini kafolatlaydi.',
      contentRu:
        '# Публичная оферта\n\n## 1. Предмет договора\nИсполнитель (Football Coach) предоставляет Заказчику (пользователю) услугу подписки на образовательную платформу.\n\n## 2. Стоимость и оплата\nСтоимость подписок указана на сайте. Оплата производится через Click.uz.\n\n## 3. Возврат средств\nПосле активации подписки средства не возвращаются.\n\n## 4. Ответственность\nИсполнитель гарантирует качественную работу сервиса.',
    },
    {
      id: 4,
      type: 'REQUISITES' as const,
      titleUz: 'Rekvizitlar',
      titleRu: 'Реквизиты',
      contentUz:
        '# Kompaniya rekvizitlari\n\n**Tashkilot nomi:** "Football Coach" MChJ\n**STIR:** 123456789\n**Manzil:** Toshkent sh., Yunusobod tumani\n**Bank:** Asaka Bank\n**Hisob raqami:** 2020 8000 1234 5678 9012\n**MFO:** 00450\n**Email:** info@football-coach.uz\n**Telefon:** +998 90 000 00 00',
      contentRu:
        '# Реквизиты компании\n\n**Наименование:** ООО "Football Coach"\n**ИНН:** 123456789\n**Адрес:** г. Ташкент, Юнусабадский район\n**Банк:** Асака Банк\n**Расчётный счёт:** 2020 8000 1234 5678 9012\n**МФО:** 00450\n**Email:** info@football-coach.uz\n**Телефон:** +998 90 000 00 00',
    },
  ];

  for (const d of legalDocs) {
    await prisma.legalDocument.upsert({
      where: { id: d.id },
      update: {
        titleUz: d.titleUz,
        titleRu: d.titleRu,
        contentUz: d.contentUz,
        contentRu: d.contentRu,
      },
      create: {
        id: d.id,
        type: d.type,
        version: 1,
        titleUz: d.titleUz,
        titleRu: d.titleRu,
        contentUz: d.contentUz,
        contentRu: d.contentRu,
        isActive: true,
      },
    });
  }
  console.log(`✓ Legal documents seeded (${legalDocs.length})`);

  // ═══════════════════════════════════════════════════════════════
  // 10. SYNC AUTOINCREMENT SEQUENCES
  // ───────────────────────────────────────────────────────────────
  // The seed inserts explicit `id` values through upserts, which does NOT
  // advance Postgres sequences. Without this step, the next real
  // `prisma.<model>.create()` call picks sequence value 1, collides with a
  // row from this seed, and throws "Unique constraint failed on the (not
  // available)" (primary key). We resync every owned sequence to
  // MAX(id)+1 so production-shaped writes work immediately after seeding.
  // ═══════════════════════════════════════════════════════════════
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN
        SELECT
          s.oid      AS seq_oid,
          t.oid      AS tbl_oid,
          a.attname  AS col_name
        FROM pg_class s
        JOIN pg_depend d    ON d.objid = s.oid AND d.deptype = 'a'
        JOIN pg_class t     ON t.oid = d.refobjid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
        JOIN pg_namespace n ON n.oid = s.relnamespace
        WHERE s.relkind = 'S'
          AND t.relkind = 'r'
          AND n.nspname = 'public'
      LOOP
        EXECUTE format(
          'SELECT setval(%L::regclass, COALESCE((SELECT MAX(%I) FROM %s), 0) + 1, false)',
          r.seq_oid::regclass::text,
          r.col_name,
          r.tbl_oid::regclass::text
        );
      END LOOP;
    END $$;
  `);
  console.log('✓ Autoincrement sequences resynced');

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  SEED COMPLETED SUCCESSFULLY');
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('  Login credentials:');
  console.log('    Admin: +998900000000 / Admin123!');
  console.log('    Users: +998901111111 ... 5555555 / User123!');
  console.log('');
  console.log('  Seeded:');
  console.log('    • 2 roles (ADMIN, USER)');
  console.log('    • 6 users (1 admin + 5 regular)');
  console.log('    • 5 age categories (U-10, U-12, U-15, U-18, Adults)');
  console.log('    • 7 training categories');
  console.log(`    • 10 lessons with ${blockId} blocks`);
  console.log('    • 4 subscription plans (Weekly, Monthly, Quarterly, Yearly)');
  console.log('    • 1 active subscription');
  console.log('    • 3 book categories');
  console.log('    • 6 books');
  console.log('    • 1 user book + progress');
  console.log('    • 5 notifications');
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
