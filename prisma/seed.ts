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
        videoUrl: `https://example.com/videos/lesson-${l.id}.mp4`,
        duration: l.duration,
        sequenceOrder: l.order,
        descriptionUz: `${l.titleUz} — batafsil mashg\'ulot`,
        descriptionRu: `${l.titleRu} — детальная тренировка`,
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
    { id: 1, titleUz: 'Haftalik',   titleRu: 'Недельный',   days: 7,   price: 19000,  discountType: DiscountType.NONE,         discountPct: 0,  fixed: null    },
    { id: 2, titleUz: 'Oylik',       titleRu: 'Месячный',    days: 30,  price: 49000,  discountType: DiscountType.PERCENTAGE,   discountPct: 10, fixed: null    },
    { id: 3, titleUz: 'Choraklik',   titleRu: 'Квартальный', days: 90,  price: 129000, discountType: DiscountType.PERCENTAGE,   discountPct: 15, fixed: null    },
    { id: 4, titleUz: 'Yillik',      titleRu: 'Годовой',     days: 365, price: 490000, discountType: DiscountType.FIXED_PRICE,  discountPct: 0,  fixed: 390000  },
  ];

  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: p.id },
      update: {},
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
      },
    });
  }
  console.log(`✓ Subscription plans seeded (${plans.length})`);

  // One active subscription for first regular user
  const planMonthly = await prisma.subscriptionPlan.findUnique({ where: { id: 2 } });
  if (planMonthly) {
    const subStart = new Date();
    const subEnd = new Date(Date.now() + planMonthly.durationDays * 24 * 60 * 60 * 1000);
    await prisma.subscription.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        userId: users[0].id,
        startDate: subStart,
        endDate: subEnd,
        isActive: true,
        subscriptionsPlansId: planMonthly.id,
      },
    });
    console.log(`✓ Active subscription for ${users[0].firstName}`);
  }

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
