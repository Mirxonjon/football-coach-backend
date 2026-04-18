import { PrismaClient, DiscountType, BlockType, BookCategoryType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ── Roles ──────────────────────────────────────────────────────────────
  console.log('Upserting roles...');
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

  // ── Admin user ─────────────────────────────────────────────────────────
  const adminPhone = '+998900000000';
  const adminHash = await bcrypt.hash('Admin123!', 12);
  await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {},
    create: {
      phone: adminPhone,
      password: adminHash,
      firstName: 'Admin',
      lastName: 'Coach',
      isVerified: true,
      roleId: adminRole.id,
    },
  });
  console.log('Admin user upserted');

  // ── Age Categories ─────────────────────────────────────────────────────
  const ageCats = [
    { titleUz: 'U-12', titleRu: 'U-12', minAge: 8, maxAge: 12 },
    { titleUz: 'U-15', titleRu: 'U-15', minAge: 13, maxAge: 15 },
    { titleUz: 'U-18', titleRu: 'U-18', minAge: 16, maxAge: 18 },
  ];

  const ageMap: Record<string, number> = {};
  for (const ac of ageCats) {
    const existing = await prisma.ageCategory.findFirst({
      where: { titleUz: ac.titleUz },
    });
    if (existing) {
      ageMap[ac.titleUz] = existing.id;
    } else {
      const created = await prisma.ageCategory.create({ data: ac });
      ageMap[ac.titleUz] = created.id;
    }
  }
  console.log('Age categories upserted');

  // ── Training Categories (under U-12) ──────────────────────────────────
  const trainingCats = [
    {
      titleUz: 'Asosiy dribbling',
      titleRu: 'Базовый дриблинг',
      descriptionUz: 'U-12 yoshdagi bolalar uchun dribbling mashqlari',
      descriptionRu: 'Упражнения по дриблингу для детей U-12',
      ageCategoriesId: ageMap['U-12'],
    },
    {
      titleUz: 'Pas asoslari',
      titleRu: 'Основы паса',
      descriptionUz: 'U-12 yoshdagi bolalar uchun pas mashqlari',
      descriptionRu: 'Упражнения по пасу для детей U-12',
      ageCategoriesId: ageMap['U-12'],
    },
  ];

  const trainingCatIds: number[] = [];
  for (const tc of trainingCats) {
    const existing = await prisma.trainingCategory.findFirst({
      where: { titleUz: tc.titleUz, ageCategoriesId: tc.ageCategoriesId },
    });
    if (existing) {
      trainingCatIds.push(existing.id);
    } else {
      const created = await prisma.trainingCategory.create({ data: tc });
      trainingCatIds.push(created.id);
    }
  }
  console.log('Training categories upserted');

  // ── Training Lesson with blocks (one of each BlockType) ───────────────
  const lessonExists = await prisma.trainingLesson.findFirst({
    where: { titleUz: 'Dribbling mashg\'uloti #1' },
  });
  if (!lessonExists) {
    await prisma.trainingLesson.create({
      data: {
        trainingCategoryId: trainingCatIds[0],
        titleUz: 'Dribbling mashg\'uloti #1',
        titleRu: 'Тренировка дриблинга #1',
        descriptionUz: 'Birinchi dribbling mashg\'uloti',
        descriptionRu: 'Первая тренировка по дриблингу',
        sequenceOrder: 1,
        duration: 3600,
        lessonBlocks: {
          create: [
            { blockType: BlockType.TITLE, contentUz: 'Kirish', contentRu: 'Введение', sequenceOrder: 1 },
            { blockType: BlockType.TEXT, contentUz: 'Bu mashg\'ulotda dribbling texnikasi o\'rganiladi.', contentRu: 'В этом занятии изучается техника дриблинга.', sequenceOrder: 2 },
            { blockType: BlockType.VIDEO, contentUz: 'https://example.com/video.mp4', contentRu: 'https://example.com/video.mp4', duration: 120, sequenceOrder: 3 },
            { blockType: BlockType.IMAGE, contentUz: 'https://example.com/image.png', contentRu: 'https://example.com/image.png', sequenceOrder: 4 },
            { blockType: BlockType.FILE, contentUz: 'https://example.com/plan.pdf', contentRu: 'https://example.com/plan.pdf', sequenceOrder: 5 },
            { blockType: BlockType.HINT, contentUz: 'Oyoq uchini ishlating!', contentRu: 'Используйте носок!', sequenceOrder: 6 },
          ],
        },
      },
    });
    console.log('Training lesson with blocks created');
  } else {
    console.log('Training lesson already exists');
  }

  // ── Subscription Plans ─────────────────────────────────────────────────
  const plans = [
    {
      titleUz: 'Oylik obuna',
      titleRu: 'Месячная подписка',
      descriptionUz: 'Oylik obuna 10% chegirma bilan',
      descriptionRu: 'Месячная подписка со скидкой 10%',
      durationDays: 30,
      discountType: DiscountType.PERCENTAGE,
      basePrice: 100000,
      discountPercent: 10,
    },
    {
      titleUz: 'Yillik obuna',
      titleRu: 'Годовая подписка',
      descriptionUz: 'Yillik obuna belgilangan narxda',
      descriptionRu: 'Годовая подписка по фиксированной цене',
      durationDays: 365,
      discountType: DiscountType.FIXED_PRICE,
      basePrice: 1000000,
      discountPercent: 0,
      fixedDiscountPrice: 800000,
    },
  ];

  for (const plan of plans) {
    const existing = await prisma.subscriptionPlan.findFirst({
      where: { titleUz: plan.titleUz },
    });
    if (!existing) {
      await prisma.subscriptionPlan.create({ data: plan });
    }
  }
  console.log('Subscription plans upserted');

  // ── Book Categories ────────────────────────────────────────────────────
  const bookCats = [
    { titleUz: 'Futbol kitoblari', titleRu: 'Книги о футболе', categoryType: BookCategoryType.BOOK },
    { titleUz: 'Konspektlar', titleRu: 'Конспекты', categoryType: BookCategoryType.KONSPEKT },
  ];

  const bookCatMap: Record<string, number> = {};
  for (const bc of bookCats) {
    const existing = await prisma.bookCategory.findFirst({
      where: { titleUz: bc.titleUz },
    });
    if (existing) {
      bookCatMap[bc.categoryType] = existing.id;
    } else {
      const created = await prisma.bookCategory.create({ data: bc });
      bookCatMap[bc.categoryType] = created.id;
    }
  }
  console.log('Book categories upserted');

  // ── Books (one per category) ───────────────────────────────────────────
  const books = [
    {
      bookCategoryId: bookCatMap['BOOK'],
      titleUz: 'Futbol taktikasi',
      titleRu: 'Тактика футбола',
      fileUrl: '/books/football-tactics.pdf',
      basePrice: 50000,
      descriptionUz: 'Futbol taktikasi haqida kitob',
      descriptionRu: 'Книга о тактике футбола',
    },
    {
      bookCategoryId: bookCatMap['KONSPEKT'],
      titleUz: 'Mashg\'ulot konspekti',
      titleRu: 'Конспект тренировки',
      fileUrl: '/books/training-notes.pdf',
      basePrice: 30000,
      descriptionUz: 'Mashg\'ulot rejasi konspekti',
      descriptionRu: 'Конспект плана тренировок',
    },
  ];

  for (const book of books) {
    const existing = await prisma.book.findFirst({
      where: { titleUz: book.titleUz },
    });
    if (!existing) {
      await prisma.book.create({ data: book });
    }
  }
  console.log('Books upserted');

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
