import { PrismaClient, ConnectorStatus, LegalDocumentType, Language, Unit, FuelCategory } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Ensure roles
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
  const cashierRole = await prisma.role.upsert({
    where: { name: 'CASHIER' },
    update: {},
    create: { name: 'CASHIER' },
  });

  // Default admin
  const defaultAdminPhone = '+998900000001';
  const defaultAdminPassword = 'Admin123!';
  const existingAdmin = await prisma.user.findUnique({
    where: { phone: defaultAdminPhone },
  });
  if (!existingAdmin) {
    const hash = await bcrypt.hash(defaultAdminPassword, 12);
    await prisma.user.create({
      data: {
        phone: defaultAdminPhone,
        password: hash,
        isVerified: true,
        roleId: adminRole.id,
        firstName: 'Default',
        lastName: 'Admin',
      },
    });
    console.log('Default admin created');
  } else {
    console.log('Default admin already exists');
  }

  // Create a Test User for direct payments
  const testUserPhone = '+998901234567';
  const testUserPassword = 'User123!';
  let testUser = await prisma.user.findUnique({
    where: { phone: testUserPhone },
  });
  if (!testUser) {
    const hash = await bcrypt.hash(testUserPassword, 12);
    testUser = await prisma.user.create({
      data: {
        phone: testUserPhone,
        password: hash,
        isVerified: true,
        roleId: userRole.id,
        firstName: 'Test',
        lastName: 'User',
      },
    });
    console.log('Test user created');
  }

  // Seed Operators
  const operators = [
    {
      id: 1,
      title: 'Tok Bor',
      color: '#00A86B',
      contact: '+998 71 200 01 23',
      bankName: 'Ipoteka Bank',
      bankAccount: '20208000123456789001',
      bankMfo: '00444',
    },
    {
      id: 2,
      title: 'Megawatt Charging',
      color: '#2979FF',
      contact: '+998 90 123 45 67',
      bankName: 'Kapitalbank',
      bankAccount: '20208000987654321002',
      bankMfo: '01088',
    },
    {
      id: 3,
      title: 'UzCharge',
      color: '#2ECC71',
      contact: '+998 93 555 77 88',
      bankName: 'Asakabank',
      bankAccount: '20208000567890123403',
      bankMfo: '01155',
    },
    {
      id: 4,
      title: 'Silk Road Energy',
      color: '#FF6F00',
      contact: '+998 97 222 33 44',
      bankName: 'Hamkorbank',
      bankAccount: '20208000432109876504',
      bankMfo: '00083',
    },
  ];

  for (const op of operators) {
    await prisma.operator.upsert({
      where: { id: op.id },
      update: {
        title: op.title,
        color: op.color,
        contact: op.contact,
        bankName: op.bankName,
        bankAccount: op.bankAccount,
        bankMfo: op.bankMfo,
      },
      create: op,
    });
  }
  console.log('Operators seeded');

  // Seed Fuel Types
  const fuelTypes = [
    { name: 'AI-80', octane: '80', category: FuelCategory.PETROL, unit: Unit.LITRE, picture: 'https://sbhlbjekwivoppvmxyyk.supabase.co/storage/v1/object/public/fuel-types/ai-80.png' },
    { name: 'AI-92', octane: '92', category: FuelCategory.PETROL, unit: Unit.LITRE, picture: 'https://sbhlbjekwivoppvmxyyk.supabase.co/storage/v1/object/public/fuel-types/ai-92.png' },
    { name: 'AI-95', octane: '95', category: FuelCategory.PETROL, unit: Unit.LITRE, picture: 'https://sbhlbjekwivoppvmxyyk.supabase.co/storage/v1/object/public/fuel-types/ai-95.png' },
    { name: 'Methane', octane: 'High', category: FuelCategory.GAS, unit: Unit.M3, picture: 'https://sbhlbjekwivoppvmxyyk.supabase.co/storage/v1/object/public/fuel-types/methane.png' },
    { name: 'Propane', octane: 'High', category: FuelCategory.PROPANE, unit: Unit.LITRE, picture: 'https://sbhlbjekwivoppvmxyyk.supabase.co/storage/v1/object/public/fuel-types/propane.png' },
  ];

  const fuelTypeIds: Record<string, number> = {};
  for (const ft of fuelTypes) {
    const created = await prisma.fuelType.upsert({
      where: { name: ft.name },
      update: { octane: ft.octane, picture: ft.picture, unit: ft.unit, category: ft.category },
      create: { name: ft.name, octane: ft.octane, picture: ft.picture, unit: ft.unit, category: ft.category },
    });
    fuelTypeIds[ft.name] = created.id;
  }
  console.log('Fuel types seeded');

  // Seed Cars Catalog (Chevrolet specific models for Uzbekistan)
  const carCatalog = [
    { brand: 'Chevrolet', model: 'Gentra', year: 2023, imageUrl: 'https://sbhlbjekwivoppvmxyyk.supabase.co/storage/v1/object/public/cars/gentra.png' },
    { brand: 'Chevrolet', model: 'Nexia 3', year: 2022, imageUrl: 'https://sbhlbjekwivoppvmxyyk.supabase.co/storage/v1/object/public/cars/nexia3.png' },
    { brand: 'Chevrolet', model: 'Cobalt', year: 2023, imageUrl: 'https://sbhlbjekwivoppvmxyyk.supabase.co/storage/v1/object/public/cars/cobalt.png' },
    { brand: 'Chevrolet', model: 'Tracker', year: 2023, imageUrl: 'https://sbhlbjekwivoppvmxyyk.supabase.co/storage/v1/object/public/cars/tracker.png' },
    { brand: 'Chevrolet', model: 'Malibu', year: 2023, imageUrl: 'https://sbhlbjekwivoppvmxyyk.supabase.co/storage/v1/object/public/cars/malibu.png' },
    { brand: 'BYD', model: 'Song Plus', year: 2024, imageUrl: 'https://sbhlbjekwivoppvmxyyk.supabase.co/storage/v1/object/public/cars/byd_song.png' },
    { brand: 'Tesla', model: 'Model 3', year: 2023, imageUrl: 'https://sbhlbjekwivoppvmxyyk.supabase.co/storage/v1/object/public/cars/tesla_m3.png' },
  ];

  console.log('Seeding Cars Catalog...');
  for (const car of carCatalog) {
    await prisma.car.upsert({
      where: { brand_model_year: { brand: car.brand, model: car.model, year: car.year } },
      update: { imageUrl: car.imageUrl },
      create: { brand: car.brand, model: car.model, year: car.year, imageUrl: car.imageUrl },
    });
  }

  // Seed Fuel Stations
  const stations = [
    {
      id: 1, operatorId: 1, title: 'UNG Tashkent Central',
      address: 'Amir Temur Avenue 12, Tashkent', latitude: 41.3111, longitude: 69.2797,
      workingHours: '24/7',
      pumps: [
        { fuelPumpNumber: 1, fuels: [{ type: 'AI-80', price: 9500 }, { type: 'AI-92', price: 10500 }] },
        { fuelPumpNumber: 2, fuels: [{ type: 'AI-95', price: 12500 }] },
      ],
    },
    {
      id: 2, operatorId: 2, title: 'Mustang Fuel Hub',
      address: 'Chilonzor District 5, Tashkent', latitude: 41.2756, longitude: 69.2034,
      workingHours: '24/7',
      pumps: [
        { fuelPumpNumber: 1, fuels: [{ type: 'AI-92', price: 10800 }] },
      ],
    },
    {
      id: 3, operatorId: 3, title: 'EcoGaz Qoyliq',
      address: 'Qoyliq District, Tashkent', latitude: 41.2415, longitude: 69.3283,
      workingHours: '24/7',
      pumps: [
        { fuelPumpNumber: 1, fuels: [{ type: 'Methane', price: 3350 }] },
        { fuelPumpNumber: 2, fuels: [{ type: 'Methane', price: 3350 }] },
      ],
    },
    {
      id: 4, operatorId: 4, title: 'Propan Energy Sergeli',
      address: 'Sergeli District, Tashkent', latitude: 41.2222, longitude: 69.2311,
      workingHours: '08:00 - 22:00',
      pumps: [
        { fuelPumpNumber: 1, fuels: [{ type: 'Propane', price: 5500 }, { type: 'AI-80', price: 9500 }] },
      ],
    },
  ];

  for (const s of stations) {
    const { pumps, ...stationData } = s;

    const station = await prisma.fuelStation.upsert({
      where: { id: stationData.id },
      update: {
        title: stationData.title,
        address: stationData.address,
        latitude: stationData.latitude,
        longitude: stationData.longitude,
        workingHours: stationData.workingHours,
        operatorId: stationData.operatorId,
      },
      create: {
        id: stationData.id,
        title: stationData.title,
        address: stationData.address,
        latitude: stationData.latitude,
        longitude: stationData.longitude,
        workingHours: stationData.workingHours,
        operatorId: stationData.operatorId,
      },
    });

    for (const p of pumps) {
      const fuelPump = await prisma.fuelPump.upsert({
        where: { stationId_fuelPumpNumber: { stationId: station.id, fuelPumpNumber: p.fuelPumpNumber } },
        update: {},
        create: { stationId: station.id, fuelPumpNumber: p.fuelPumpNumber },
      });

      for (const f of p.fuels) {
        await prisma.fuelPumpFuel.deleteMany({
          where: { fuelPumpId: fuelPump.id, fuelTypeId: fuelTypeIds[f.type] }
        });
        await prisma.fuelPumpFuel.create({
          data: {
            fuelPumpId: fuelPump.id,
            fuelTypeId: fuelTypeIds[f.type],
            price: f.price,
          },
        });
      }
    }
  }
  console.log('Fuel stations seeded');

  // Seed default Cashier user and assign stations
  const defaultCashierPhone = '+998900000002';
  const defaultCashierPassword = 'Cashier123!';
  let cashierUser = await prisma.user.findUnique({
    where: { phone: defaultCashierPhone },
  });
  if (!cashierUser) {
    const hash = await bcrypt.hash(defaultCashierPassword, 12);
    cashierUser = await prisma.user.create({
      data: {
        phone: defaultCashierPhone,
        password: hash,
        isVerified: true,
        roleId: cashierRole.id,
        firstName: 'Default',
        lastName: 'Cashier',
        cashierStations: {
          connect: [
            { id: 1 },
            { id: 2 },
          ],
        },
      },
    });
    console.log('Default cashier created and assigned to stations 1 & 2');
  } else {
    console.log('Default cashier already exists');
  }

  if (testUser) {
    const dummyCard = await prisma.card.upsert({
      where: { token: 'card_dummy_token_123' },
      update: { last4: '4567' },
      create: {
        userId: testUser.id,
        token: 'card_dummy_token_123',
        last4: '4567',
        isActive: true,
      }
    });

    // Seed a UserCar for the test user
    const catalogCar = await prisma.car.findFirst({ where: { model: 'Gentra' } });
    if (catalogCar) {
      await prisma.userCar.upsert({
        where: { plateNumber: '01A777AA' },
        update: { userId: testUser.id, carId: catalogCar.id },
        create: {
          userId: testUser.id,
          carId: catalogCar.id,
          plateNumber: '01A777AA',
          vin: 'TEST_VIN_12345678',
          color: 'White',
        }
      });
    }
    console.log('Test user card and car seeded');
  }

  // ── Mock user 987654321 with test fuel sessions ──────────────────────────
  const mockUserPhone = '+998987654321';
  const mockUserPassword = 'User123!';
  let mockUser = await prisma.user.findUnique({ where: { phone: mockUserPhone } });
  if (!mockUser) {
    const hash = await bcrypt.hash(mockUserPassword, 12);
    mockUser = await prisma.user.create({
      data: {
        phone: mockUserPhone,
        password: hash,
        isVerified: true,
        roleId: userRole.id,
        firstName: 'Mirzo',
        lastName: 'Toshmatov',
      },
    });
    console.log('Mock user 987654321 created');
  } else {
    console.log('Mock user 987654321 already exists');
  }

  // Seed test fuel sessions for mock user (only if none exist)
  const existingSessions = await prisma.fuelSession.count({ where: { userId: mockUser.id } });
  if (existingSessions === 0) {
    // Resolve fuel type IDs
    const ai92 = await prisma.fuelType.findUnique({ where: { name: 'AI-92' } });
    const ai95 = await prisma.fuelType.findUnique({ where: { name: 'AI-95' } });
    const methane = await prisma.fuelType.findUnique({ where: { name: 'Methane' } });
    const propane = await prisma.fuelType.findUnique({ where: { name: 'Propane' } });

    // Station 1 – pump 1 (AI-80, AI-92), pump 2 (AI-95)
    // Station 3 – pump 1 & 2 (Methane)
    // Station 4 – pump 1 (Propane, AI-80)
    const pump1s1 = await prisma.fuelPump.findUnique({ where: { stationId_fuelPumpNumber: { stationId: 1, fuelPumpNumber: 1 } } }); // AI-92
    const pump2s1 = await prisma.fuelPump.findUnique({ where: { stationId_fuelPumpNumber: { stationId: 1, fuelPumpNumber: 2 } } }); // AI-95
    const pump1s3 = await prisma.fuelPump.findUnique({ where: { stationId_fuelPumpNumber: { stationId: 3, fuelPumpNumber: 1 } } }); // Methane
    const pump1s4 = await prisma.fuelPump.findUnique({ where: { stationId_fuelPumpNumber: { stationId: 4, fuelPumpNumber: 1 } } }); // Propane

    const now = new Date();
    const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

    const sessionsData: any[] = [];

    // Benzin (AI-92) sessions – 5 sessions
    if (ai92 && pump1s1) {
      sessionsData.push(
        { fuelTypeId: ai92.id, fuelPumpId: pump1s1.id, fuelStationId: 1, unit: 'LITRE', quantity: 30, pricePerUnit: 10500, startTime: daysAgo(2) },
        { fuelTypeId: ai92.id, fuelPumpId: pump1s1.id, fuelStationId: 1, unit: 'LITRE', quantity: 25, pricePerUnit: 10500, startTime: daysAgo(10) },
        { fuelTypeId: ai92.id, fuelPumpId: pump1s1.id, fuelStationId: 1, unit: 'LITRE', quantity: 20, pricePerUnit: 10500, startTime: daysAgo(20) },
      );
    }
    // Benzin (AI-95) sessions
    if (ai95 && pump2s1) {
      sessionsData.push(
        { fuelTypeId: ai95.id, fuelPumpId: pump2s1.id, fuelStationId: 1, unit: 'LITRE', quantity: 35, pricePerUnit: 12500, startTime: daysAgo(5) },
        { fuelTypeId: ai95.id, fuelPumpId: pump2s1.id, fuelStationId: 1, unit: 'LITRE', quantity: 15, pricePerUnit: 12500, startTime: daysAgo(15) },
      );
    }
    // Gaz (Methane) sessions
    if (methane && pump1s3) {
      sessionsData.push(
        { fuelTypeId: methane.id, fuelPumpId: pump1s3.id, fuelStationId: 3, unit: 'M3', quantity: 20, pricePerUnit: 3350, startTime: daysAgo(3) },
        { fuelTypeId: methane.id, fuelPumpId: pump1s3.id, fuelStationId: 3, unit: 'M3', quantity: 15, pricePerUnit: 3350, startTime: daysAgo(12) },
        { fuelTypeId: methane.id, fuelPumpId: pump1s3.id, fuelStationId: 3, unit: 'M3', quantity: 10, pricePerUnit: 3350, startTime: daysAgo(25) },
      );
    }
    // Propane sessions
    if (propane && pump1s4) {
      sessionsData.push(
        { fuelTypeId: propane.id, fuelPumpId: pump1s4.id, fuelStationId: 4, unit: 'LITRE', quantity: 40, pricePerUnit: 5500, startTime: daysAgo(7) },
        { fuelTypeId: propane.id, fuelPumpId: pump1s4.id, fuelStationId: 4, unit: 'LITRE', quantity: 30, pricePerUnit: 5500, startTime: daysAgo(18) },
      );
    }

    for (const sd of sessionsData) {
      await prisma.fuelSession.create({
        data: {
          userId: mockUser.id,
          fuelStationId: sd.fuelStationId,
          fuelPumpId: sd.fuelPumpId,
          fuelTypeId: sd.fuelTypeId,
          unit: sd.unit,
          quantity: sd.quantity,
          pricePerUnit: sd.pricePerUnit,
          totalAmount: sd.quantity * sd.pricePerUnit,
          status: 'COMPLETED',
          startTime: sd.startTime,
          endTime: new Date(sd.startTime.getTime() + 10 * 60 * 1000), // +10 min
        },
      });
    }
    console.log(`Mock user 987654321: ${sessionsData.length} fuel sessions created`);
  } else {
    console.log('Mock user 987654321 fuel sessions already exist');
  }

  // Seed Legal Documents

  console.log('Seeding Legal Documents...');

  // 1. Privacy Policy
  await prisma.legalDocument.deleteMany({ where: { type: LegalDocumentType.PRIVACY } });
  await prisma.legalDocument.create({
    data: {
      type: LegalDocumentType.PRIVACY,
      version: '1.1',
      isActive: true,
      translations: {
        create: [
          {
            language: Language.RU,
            title: "Политика конфиденциальности",
            content: "<p><b>1. Общие положения</b><br>Charge One уважает конфиденциальность пользователей и обязуется защищать персональные данные в соответствии с применимым законодательством.</p><p><b>2. Какие данные мы собираем</b><br>Мы можем собирать: номер телефона, имя, фамилию, дату рождения (по желанию), данные о зарядных сессиях, информацию об устройстве и использовании приложения.</p><p><b>3. Цели обработки данных</b><br>Данные используются для аутентификации, предоставления услуг, обработки платежей, улучшения сервиса и обеспечения безопасности.</p><p><b>4. Геолокация</b><br>Данные о местоположении используются только для отображения ближайших зарядных станций и навигации.</p><p><b>5. Камера</b><br>В текущей версии приложения камера не используется. В будущем может использоваться для сканирования QR-кодов.</p><p><b>6. Передача данных третьим лицам</b><br>Данные могут передаваться операторам зарядных станций, платежным провайдерам и техническим партнерам исключительно для предоставления услуг.</p><p><b>7. Хранение данных</b><br>Данные хранятся только в течение срока, необходимого для выполнения целей обработки или требований законодательства.</p><p><b>8. Безопасность</b><br>Мы применяем технические и организационные меры для защиты данных от несанкционированного доступа.</p><p><b>9. Права пользователя</b><br>Пользователь имеет право на доступ, исправление и удаление своих персональных данных.</p><p><b>10. Дети</b><br>Сервис не предназначен для лиц младше 13 лет.</p><p><b>11. Изменения политики</b><br>Мы можем обновлять данную Политику. Обновления публикуются в приложении.</p><p><b>12. Контакты</b><br>Email: ssupport@charge-one.uz</p>"
          },
          {
            language: Language.UZ,
            title: "Maxfiylik siyosati",
            content: "<p><b>1. Umumiy qoidalar</b><br>Charge One foydalanuvchilar maxfiyligini hurmat qiladi va shaxsiy ma'lumotlarni himoya qiladi.</p><p><b>2. Yig'iladigan ma'lumotlar</b><br>Telefon raqam, ism, familiya, tug‘ilgan sana (ixtiyoriy), zaryadlash ma'lumotlari, qurilma va ilova ishlatilishi haqidagi ma'lumotlar yig'ilishi mumkin.</p><p><b>3. Maqsadlar</b><br>Ma'lumotlar autentifikatsiya, xizmat ko‘rsatish, to‘lovlarni amalga oshirish va xavfsizlik uchun ishlatiladi.</p><p><b>4. Geolokatsiya</b><br>Faqat yaqin stansiyalarni ko‘rsatish uchun ishlatiladi.</p><p><b>5. Kamera</b><br>Hozir ishlatilmaydi, kelajakda QR kod uchun ishlatilishi mumkin.</p><p><b>6. Uchinchi tomon</b><br>Ma'lumotlar xizmat ko‘rsatish uchun hamkorlarga uzatilishi mumkin.</p><p><b>7. Saqlash</b><br>Ma'lumotlar zarur muddat davomida saqlanadi.</p><p><b>8. Xavfsizlik</b><br>Ma'lumotlar himoyalangan.</p><p><b>9. Foydalanuvchi huquqlari</b><br>Ko‘rish, o‘zgartirish va o‘chirish huquqi mavjud.</p><p><b>10. Bolalar</b><br>13 yoshgacha mo‘ljallanmagan.</p><p><b>11. O‘zgarishlar</b><br>Siyosat yangilanishi mumkin.</p><p><b>12. Aloqa</b><br>Email: support@charge-one.uz</p>"
          },
          {
            language: Language.EN,
            title: "Privacy Policy",
            content: "<p><b>1. General</b><br>Charge One respects user privacy and processes personal data in accordance with applicable laws.</p><p><b>2. Data We Collect</b><br>We may collect phone number, name, date of birth (optional), charging session data, device information, and usage data.</p><p><b>3. Purpose of Processing</b><br>Data is used for authentication, service delivery, payments, security, and service improvement.</p><p><b>4. Location</b><br>Used only to display nearby charging stations and navigation.</p><p><b>5. Camera</b><br>Not used currently. May be used for QR code scanning in the future.</p><p><b>6. Data Sharing</b><br>Data may be shared with station operators, payment providers, and technical partners.</p><p><b>7. Data Retention</b><br>Data is stored only as long as necessary.</p><p><b>8. Security</b><br>We implement measures to protect personal data.</p><p><b>9. User Rights</b><br>Users can access, correct, or delete their data.</p><p><b>10. Children</b><br>Not intended for users under 13.</p><p><b>11. Updates</b><br>This policy may be updated.</p><p><b>12. Contact</b><br>Email: support@charge-one.uz</p>"
          }
        ]
      }
    }
  });

  // 2. Terms of Service
  await prisma.legalDocument.deleteMany({ where: { type: LegalDocumentType.TERMS } });
  await prisma.legalDocument.create({
    data: {
      type: LegalDocumentType.TERMS,
      version: '1.1',
      isActive: true,
      translations: {
        create: [
          {
            language: Language.RU,
            title: "Пользовательское соглашение",
            content: "<p><b>1. Общие положения</b><br>Настоящее Пользовательское соглашение регулирует использование приложения Charge One. Используя приложение, пользователь соглашается с условиями данного соглашения.</p><p><b>2. Регистрация и аккаунт</b><br>Пользователь обязан предоставить достоверную информацию. Пользователь несет ответственность за безопасность своего аккаунта.</p><p><b>3. Описание сервиса</b><br>Charge One предоставляет доступ к сети зарядных станций электромобилей, управляемых третьими лицами.</p><p><b>4. Платежи</b><br>Все платежи осуществляются через сторонние платежные системы. Пользователь соглашается оплачивать все оказанные услуги.</p><p><b>5. Ограничение ответственности</b><br>Charge One не несет ответственности за перебои, ошибки или недоступность зарядных станций, управляемых третьими сторонами.</p><p><b>6. Отказ от гарантий</b><br>Сервис предоставляется «как есть» без каких-либо гарантий, явных или подразумеваемых.</p><p><b>7. Запрещенное использование</b><br>Пользователь обязуется не использовать сервис в незаконных целях или с нарушением законодательства.</p><p><b>8. Приостановка и прекращение</b><br>Мы оставляем за собой право ограничить или прекратить доступ пользователя при нарушении условий.</p><p><b>9. Интеллектуальная собственность</b><br>Все права на приложение принадлежат Charge One.</p><p><b>10. Изменения</b><br>Мы можем изменять условия в любое время. Продолжение использования означает согласие with changes.</p><p><b>11. Применимое право</b><br>Соглашение регулируется законодательством Республики Узбекистан.</p><p><b>12. Контакты</b><br>Email: support@charge-one.uz</p>"
          },
          {
            language: Language.UZ,
            title: "Foydalanuvchi kelishuvi",
            content: "<p><b>1. Umumiy qoidalar</b><br>Ushbu kelishuv Charge One ilovasidan foydalanishni tartibga soladi. Ilovadan foydalanish orqali foydalanuvchi ushbu shartlarga rozilik bildiradi.</p><p><b>2. Ro'yxatdan o'tish</b><br>Foydalanuvchi to‘g‘ri ma'lumot kiritishi shart va akkaunt xavfsizligi uchun javob beradi.</p><p><b>3. Xizmat tavsifi</b><br>Charge One uchinchi tomon tomonidan boshqariladigan zaryadlash stansiyalariga kirishni ta'minlaydi.</p><p><b>4. To‘lovlar</b><br>To‘lovlar tashqi to‘lov tizimlari orqali amalga oshiriladi.</p><p><b>5. Javobgarlikni cheklash</b><br>Charge One uchinchi tomon xizmatlaridagi nosozliklar uchun javobgar emas.</p><p><b>6. Kafolatdan voz kechish</b><br>Xizmat “qanday bo‘lsa, shunday” taqdim etiladi.</p><p><b>7. Taqiqlangan foydalanish</b><br>Noqonuniy foydalanish taqiqlanadi.</p><p><b>8. To‘xtatish</b><br>Qoidalar buzilganda xizmatdan foydalanish cheklanishi mumkin.</p><p><b>9. Intellektual mulk</b><br>Barcha huquqlar Charge One ga tegishli.</p><p><b>10. O‘zgarishlar</b><br>Kelishuv o‘zgartirilishi mumkin.</p><p><b>11. Qonunchilik</b><br>O‘zbekiston Respublikasini qonunchiligiga muvofiq tartibga solinadi.</p><p><b>12. Aloqa</b><br>Email: support@charge-one.uz</p>"
          },
          {
            language: Language.EN,
            title: "Terms of Service",
            content: "<p><b>1. General</b><br>These Terms govern the use of the Charge One application. By using the app, you agree to these Terms.</p><p><b>2. Account</b><br>Users must provide accurate information and are responsible for account security.</p><p><b>3. Service Description</b><br>Charge One provides access to EV charging stations operated by third parties.</p><p><b>4. Payments</b><br>Payments are processed via third-party providers. Users agree to pay for services.</p><p><b>5. Limitation of Liability</b><br>Charge One is not liable for failures or interruptions of third-party services.</p><p><b>6. Disclaimer</b><br>The service is provided “as is” without warranties of any kind.</p><p><b>7. Prohibited Use</b><br>Illegal use of the service is prohibited.</p><p><b>8. Suspension</b><br>We may suspend or terminate access for violations.</p><p><b>9. Intellectual Property</b><br>All rights belong to Charge One.</p><p><b>10. Changes</b><br>Terms may be updated at any time.</p><p><b>11. Governing Law</b><br>These Terms are governed by the laws of the Republic of Uzbekistan.</p><p><b>12. Contact</b><br>Email: support@charge-one.uz</p>"
          }
        ]
      }
    }
  });

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
