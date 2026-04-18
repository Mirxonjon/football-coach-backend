import { PrismaClient, DiscountType, BookCategoryType, BlockType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
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
  console.log('Roles seeded');

  const adminPhone = '+998900000000';
  const existing = await prisma.user.findUnique({ where: { phone: adminPhone } });
  if (!existing) {
    const hash = await bcrypt.hash('Admin123!', 12);
    await prisma.user.create({
      data: {
        phone: adminPhone,
        password: hash,
        isVerified: true,
        roleId: adminRole.id,
        firstName: 'Admin',
        lastName: 'Coach',
      },
    });
    console.log('Admin user created');
  }

  const ageCategories = await Promise.all([
    prisma.ageCategory.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, titleUz: 'U-12', titleRu: 'U-12', minAge: 8, maxAge: 12 },
    }),
    prisma.ageCategory.upsert({
      where: { id: 2 },
      update: {},
      create: { id: 2, titleUz: 'U-15', titleRu: 'U-15', minAge: 13, maxAge: 15 },
    }),
    prisma.ageCategory.upsert({
      where: { id: 3 },
      update: {},
      create: { id: 3, titleUz: 'U-18', titleRu: 'U-18', minAge: 16, maxAge: 18 },
    }),
  ]);
  console.log('Age categories seeded');

  const tc1 = await prisma.trainingCategory.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      titleUz: 'Asosiy dribling',
      titleRu: 'Базовый дриблинг',
      ageCategoriesId: ageCategories[0].id,
      descriptionUz: 'Dribling asoslari mashqlari',
      descriptionRu: 'Упражнения по основам дриблинга',
    },
  });
  const tc2 = await prisma.trainingCategory.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      titleUz: 'Pas berish asoslari',
      titleRu: 'Основы передач',
      ageCategoriesId: ageCategories[0].id,
      descriptionUz: 'Pas berish texnikasi mashqlari',
      descriptionRu: 'Упражнения по технике передач',
    },
  });
  console.log('Training categories seeded');

  const lesson = await prisma.trainingLesson.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      trainingCategoryId: tc1.id,
      titleUz: '1-dars: To\'p bilan yugurishlar',
      titleRu: 'Урок 1: Бег с мячом',
    },
  });

  const blocks: { type: BlockType; uz: string; ru: string; duration?: number }[] = [
    { type: 'TITLE', uz: 'To\'p bilan yugurish mashqlari', ru: 'Упражнения по бегу с мячом' },
    { type: 'TEXT', uz: 'Bu darsda to\'p bilan yugurish texnikasini o\'rganamiz', ru: 'В этом уроке изучаем технику бега с мячом' },
    { type: 'VIDEO', uz: 'https://example.com/video.mp4', ru: 'https://example.com/video.mp4', duration: 120 },
    { type: 'IMAGE', uz: 'https://example.com/tactic.png', ru: 'https://example.com/tactic.png' },
    { type: 'HINT', uz: 'To\'pni oyoq uchi bilan suring', ru: 'Ведите мяч носком стопы' },
  ];
  for (let i = 0; i < blocks.length; i++) {
    await prisma.lessonBlock.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        id: i + 1,
        lessonId: lesson.id,
        blockType: blocks[i].type,
        contentUz: blocks[i].uz,
        contentRu: blocks[i].ru,
        sequenceOrder: i + 1,
        duration: blocks[i].duration,
      },
    });
  }
  console.log('Training lesson with blocks seeded');

  await prisma.subscriptionPlan.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      titleUz: 'Oylik obuna',
      titleRu: 'Месячная подписка',
      descriptionUz: '30 kunlik to\'liq kirish',
      descriptionRu: 'Полный доступ на 30 дней',
      durationDays: 30,
      basePrice: 49000,
      discountType: DiscountType.PERCENTAGE,
      discountPercent: 10,
    },
  });
  await prisma.subscriptionPlan.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      titleUz: 'Yillik obuna',
      titleRu: 'Годовая подписка',
      descriptionUz: '365 kunlik to\'liq kirish',
      descriptionRu: 'Полный доступ на 365 дней',
      durationDays: 365,
      basePrice: 490000,
      discountType: DiscountType.FIXED_PRICE,
      fixedDiscountPrice: 390000,
    },
  });
  console.log('Subscription plans seeded');

  const bookCat = await prisma.bookCategory.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, titleUz: 'Futbol kitoblari', titleRu: 'Футбольные книги', categoryType: BookCategoryType.BOOK },
  });
  const konspektCat = await prisma.bookCategory.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, titleUz: 'Konspektlar', titleRu: 'Конспекты', categoryType: BookCategoryType.KONSPEKT },
  });

  await prisma.book.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      bookCategoryId: bookCat.id,
      titleUz: 'Futbol taktikasi asoslari',
      titleRu: 'Основы футбольной тактики',
      fileUrl: '/books/tactics-basics.pdf',
      basePrice: 35000,
      descriptionUz: 'Futbol taktikasi bo\'yicha qo\'llanma',
      descriptionRu: 'Руководство по футбольной тактике',
    },
  });
  await prisma.book.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      bookCategoryId: konspektCat.id,
      titleUz: 'U-12 mashg\'ulot konspekti',
      titleRu: 'Конспект тренировки U-12',
      fileUrl: '/books/u12-konspekt.pdf',
      basePrice: 15000,
      descriptionUz: 'U-12 yoshdagilar uchun mashg\'ulot rejasi',
      descriptionRu: 'План тренировки для возрастной группы U-12',
    },
  });
  console.log('Book categories and books seeded');

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
