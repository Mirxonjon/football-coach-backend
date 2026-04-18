# SCHEMA — Target Prisma Models (authoritative)

> This is the contract. `prisma/schema.prisma` must match this document. If ambiguity arises, Sage decides and this file is updated first.

## Conventions

- Primary keys: `id Int @id @default(autoincrement())` unless noted.
- Timestamps: every model gets `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`.
- Soft-delete is **not** used. Use booleans like `isActive` where the source diagram shows them.
- Naming: fields are `camelCase`, models are `PascalCase`, enums are `PascalCase`, SQL table names follow Prisma defaults.
- Indexing: every foreign key column gets an `@@index`. Unique business keys get `@@unique`.

## Enums

```prisma
enum DiscountType {
  NONE
  PERCENTAGE
  FIXED_PRICE
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
}

enum NotificationType {
  SYSTEM
  LESSON
  BOOK
  SUBSCRIPTION
  AI_CHAT
}

enum BlockType {
  TITLE
  TEXT
  VIDEO
  IMAGE
  FILE
  HINT
}

enum BookCategoryType {
  BOOK
  KONSPEKT
}

enum AiMessageRole {
  user
  assistant
}
```

## Models

### Role
```
id         Int     @id @default(autoincrement())
name       String  @unique            // "USER" | "ADMIN"
users      User[]
createdAt  DateTime @default(now())
updatedAt  DateTime @updatedAt
```

### User
```
id             Int      @id @default(autoincrement())
phone          String   @unique
email          String?  @unique
password       String?                     // bcrypt hash; null when only phone+OTP
firstName      String?
lastName       String?
birthDate      DateTime?
googleId       String?  @unique
avatarUrl      String?
isVerified     Boolean  @default(false)
isActive       Boolean  @default(true)
roleId         Int
role           Role     @relation(fields: [roleId], references: [id])

sessions       Session[]
otpCodes       OtpCode[]
cards          Card[]
walletTx       WalletTransaction[]
subscriptions  Subscription[]
userBooks      UserBook[]
bookProgress   BookProgress[]
notifications  Notification[]
devices        UserDevice[]
aiChats        AiChat[]
aiRateLimits   AiRateLimit[]

createdAt      DateTime @default(now())
updatedAt      DateTime @updatedAt

@@index([roleId])
```

### Session
```
id            Int      @id @default(autoincrement())
userId        Int
user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
refreshToken  String                       // hashed (bcrypt or argon2)
ipAddress     String?
userAgent     String?
expiresAt     DateTime
createdAt     DateTime @default(now())
updatedAt     DateTime @updatedAt

@@index([userId])
@@index([expiresAt])
```

### OtpCode
```
id         Int      @id @default(autoincrement())
code       String                           // hashed
userId     Int?
user       User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
email      String?
phone      String?
expiresAt  DateTime
isUsed     Boolean  @default(false)
createdAt  DateTime @default(now())
updatedAt  DateTime @updatedAt

@@index([userId])
@@index([phone])
@@index([email])
```

### UserDevice
```
id           Int      @id @default(autoincrement())
userId       Int
user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
fcmToken     String   @unique
deviceType   String   @db.VarChar(20)       // "ios" | "android" | "web"
lastActive   DateTime @default(now())
createdAt    DateTime @default(now())
updatedAt    DateTime @updatedAt

@@index([userId])
```

### Notification
```
id           Int              @id @default(autoincrement())
userId       Int
user         User             @relation(fields: [userId], references: [id], onDelete: Cascade)
type         NotificationType
titleUz      String           @db.VarChar(200)
titleRu      String           @db.VarChar(200)
messageUz    String
messageRu    String
relatedId    Int?                              // e.g. bookId / lessonId / subscriptionId depending on type
isRead       Boolean          @default(false)
createdAt    DateTime         @default(now())
updatedAt    DateTime         @updatedAt

@@index([userId])
@@index([type])
@@index([isRead])
```

### Card
```
id         Int      @id
userId     Int      @unique
user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
token      String                                // provider token, never raw PAN
last4      String   @db.VarChar(4)
isActive   Boolean  @default(true)
createdAt  DateTime @default(now())
updatedAt  DateTime @updatedAt

walletTx   WalletTransaction[]
```

### WalletTransaction
```
id                    Int             @id @default(autoincrement())
cardId                Int?
card                  Card?           @relation(fields: [cardId], references: [id])
userId                Int
user                  User            @relation(fields: [userId], references: [id])
amount                Float
subscriptionsPlansId  Int?
subscriptionsPlan     SubscriptionPlan? @relation(fields: [subscriptionsPlansId], references: [id])
provider              String?                        // "click" | "payme" | "internal"
status                PaymentStatus   @default(PENDING)
externalId            String?                        // provider transaction id
errorCode             String?
errorMessage          String?
createdAt             DateTime        @default(now())
updatedAt             DateTime        @updatedAt

@@index([userId])
@@index([cardId])
@@index([subscriptionsPlansId])
@@index([status])
@@index([externalId])
```

### SubscriptionPlan
```
id                   Int           @id @default(autoincrement())
titleUz              String        @db.VarChar(100)
titleRu              String        @db.VarChar(100)
descriptionUz        String
descriptionRu        String
durationDays         Int
discountType         DiscountType  @default(NONE)
basePrice            Float
discountPercent      Int           @default(0)
fixedDiscountPrice   Float?
isActive             Boolean       @default(true)

subscriptions        Subscription[]
walletTx             WalletTransaction[]

createdAt            DateTime      @default(now())
updatedAt            DateTime      @updatedAt

@@index([isActive])
```

### Subscription
```
id                    Int                @id @default(autoincrement())
userId                Int
user                  User               @relation(fields: [userId], references: [id], onDelete: Cascade)
startDate             DateTime
endDate               DateTime
isActive              Boolean            @default(true)
subscriptionsPlansId  Int
subscriptionsPlan     SubscriptionPlan   @relation(fields: [subscriptionsPlansId], references: [id])

createdAt             DateTime           @default(now())
updatedAt             DateTime           @updatedAt

@@index([userId])
@@index([subscriptionsPlansId])
@@index([isActive])
```

### BookCategory
```
id            Int              @id @default(autoincrement())
titleUz       String           @db.VarChar(200)
titleRu       String           @db.VarChar(200)
categoryType  BookCategoryType                            // "BOOK" | "KONSPEKT"
books         Book[]
createdAt     DateTime         @default(now())
updatedAt     DateTime         @updatedAt
```

### Book
```
id                   Int          @id @default(autoincrement())
bookCategoryId       Int
bookCategory         BookCategory @relation(fields: [bookCategoryId], references: [id])
titleUz              String       @db.VarChar(200)
titleRu              String       @db.VarChar(200)
fileUrl              String                                // MinIO path
basePrice            Float
discountType         DiscountType @default(NONE)
discountPercent      Int          @default(0)
fixedDiscountPrice   Float?
coverImageUrl        String?
descriptionRu        String
descriptionUz        String
tacticHintImg        String?

userBooks            UserBook[]
bookProgress         BookProgress[]

createdAt            DateTime     @default(now())
updatedAt            DateTime     @updatedAt

@@index([bookCategoryId])
```

### UserBook
```
id             Int      @id @default(autoincrement())
userId         Int
user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
bookId         Int
book           Book     @relation(fields: [bookId], references: [id])
transactionId  Int?                                         // WalletTransaction.id — optional if given free
acquiredAt     DateTime @default(now())
isActive       Boolean  @default(true)
createdAt      DateTime @default(now())
updatedAt      DateTime @updatedAt

@@unique([userId, bookId])
@@index([userId])
@@index([bookId])
```

### BookProgress
```
id            Int      @id @default(autoincrement())
userId        Int
user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
bookId        Int
book          Book     @relation(fields: [bookId], references: [id])
lastPageRead  Int      @default(0)
isCompleted   Boolean  @default(false)
createdAt     DateTime @default(now())
updatedAt     DateTime @updatedAt

@@unique([userId, bookId])
@@index([userId])
@@index([bookId])
```

### AgeCategory
```
id          Int      @id @default(autoincrement())
titleUz     String   @db.VarChar(200)
titleRu     String   @db.VarChar(200)
minAge      Int
maxAge      Int
iconUrl     String?
trainingCategories TrainingCategory[]
createdAt   DateTime @default(now())
updatedAt   DateTime @updatedAt
```

### TrainingCategory
```
id              Int          @id @default(autoincrement())
titleUz         String       @db.VarChar(200)
titleRu         String       @db.VarChar(200)
ageCategoriesId Int
ageCategory     AgeCategory  @relation(fields: [ageCategoriesId], references: [id])
descriptionUz   String
descriptionRu   String
imageUrl        String?

trainingLessons TrainingLesson[]

createdAt       DateTime     @default(now())
updatedAt       DateTime     @updatedAt

@@index([ageCategoriesId])
```

### TrainingLesson
```
id                    Int               @id @default(autoincrement())
trainingCategoryId    Int
trainingCategory      TrainingCategory  @relation(fields: [trainingCategoryId], references: [id])
titleUz               String            @db.VarChar(200)
titleRu               String            @db.VarChar(200)
videoUrl              String?
duration              Int?                                      // seconds
sequenceOrder         Int
descriptionRu         String
descriptionUz         String
tacticHintImg         String?

lessonBlocks          LessonBlock[]

createdAt             DateTime          @default(now())
updatedAt             DateTime          @updatedAt

@@index([trainingCategoryId])
@@index([sequenceOrder])
```

### LessonBlock
```
id              Int            @id @default(autoincrement())
lessonId        Int
lesson          TrainingLesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)
blockType       BlockType                                    // TITLE | TEXT | VIDEO | IMAGE | FILE | HINT
contentUz       String
contentRu       String
duration        Int?                                         // seconds for VIDEO
sequenceOrder   Int

createdAt       DateTime       @default(now())
updatedAt       DateTime       @updatedAt

@@index([lessonId])
@@index([sequenceOrder])
```

### AiChat
```
id         Int         @id @default(autoincrement())
userId     Int
user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
title      String      @db.VarChar(200)
messages   AiMessage[]
createdAt  DateTime    @default(now())
updatedAt  DateTime    @updatedAt

@@index([userId])
```

### AiMessage
```
id           Int         @id @default(autoincrement())
chatId       Int
chat         AiChat      @relation(fields: [chatId], references: [id], onDelete: Cascade)
role         AiMessageRole                                    // user | assistant
messageText  String
images       AiMessageImage[]
createdAt    DateTime    @default(now())
updatedAt    DateTime    @updatedAt

@@index([chatId])
```

### AiMessageImage
```
id          Int       @id @default(autoincrement())
messageId   Int
message     AiMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)
imageUrl    String
createdAt   DateTime  @default(now())
updatedAt   DateTime  @updatedAt

@@index([messageId])
```

### AiRateLimit
```
id               Int      @id @default(autoincrement())
userId           Int
user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
ipAddress        String   @db.VarChar(45)
requestCount     Int      @default(0)
lastRequest      DateTime @default(now())
createdAt        DateTime @default(now())
updatedAt        DateTime @updatedAt

@@unique([userId, ipAddress])
@@index([userId])
@@index([ipAddress])
```

## Relationship summary

- One **User** has many Sessions, OtpCodes, Cards, WalletTransactions, Subscriptions, UserBooks, BookProgress, Notifications, UserDevices, AiChats, AiRateLimits — all cascade on delete.
- One **SubscriptionPlan** has many Subscriptions and many WalletTransactions.
- One **BookCategory** has many Books; one **Book** has many UserBooks and many BookProgress rows (unique per user+book).
- One **AgeCategory** has many TrainingCategories.
- One **TrainingCategory** has many TrainingLessons.
- One **TrainingLesson** has many LessonBlocks (cascade delete).
- One **AiChat** has many AiMessages (cascade delete); each AiMessage has many AiMessageImages (cascade delete).

## Seed data (minimum viable)

See `prisma/seed.ts` TODO in `03_MIGRATION_PLAN.md` Phase 3.

- Roles: `USER`, `ADMIN`.
- One admin user (phone `+998900000000`, password hashed).
- 3 age categories: `U-12` (8-12), `U-15` (13-15), `U-18` (16-18).
- 2 training categories under `U-12`: "Basic Dribbling", "Passing Fundamentals".
- 1 training lesson with one of each BlockType.
- 2 subscription plans: "Monthly" (30 days, PERCENTAGE 10%), "Yearly" (365 days, FIXED_PRICE).
- 1 book category each of BOOK and KONSPEKT, 1 book in each.
