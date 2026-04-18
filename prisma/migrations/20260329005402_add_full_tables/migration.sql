-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CLICK', 'PAYME', 'CARD');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('LITRE', 'M3', 'KWH', 'KG');

-- CreateEnum
CREATE TYPE "ConnectorStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISPENSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('TERMS', 'PRIVACY');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('UZ', 'RU', 'EN');

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "wasBorn" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "roleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "userId" INTEGER,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "attemptsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Car" (
    "id" SERIAL NOT NULL,
    "createdById" INTEGER,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCar" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "carId" INTEGER NOT NULL,
    "plateNumber" TEXT,
    "vin" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operator" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "color" TEXT,
    "contact" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "bankMfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelStation" (
    "id" SERIAL NOT NULL,
    "operatorId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "image" TEXT,
    "workingHours" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelPump" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "fuelPumpNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "ConnectorStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelPump_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "octane" TEXT,
    "unit" "Unit" NOT NULL DEFAULT 'LITRE',
    "picture" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelPumpStatusLog" (
    "id" SERIAL NOT NULL,
    "fuelPumpId" INTEGER NOT NULL,
    "status" "ConnectorStatus" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelPumpStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelPumpFuel" (
    "id" SERIAL NOT NULL,
    "fuelPumpId" INTEGER NOT NULL,
    "fuelTypeId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "nozzleNumber" INTEGER,
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelPumpFuel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "fuelStationId" INTEGER NOT NULL,
    "fuelPumpId" INTEGER NOT NULL,
    "fuelTypeId" INTEGER NOT NULL,
    "userCarId" INTEGER,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" "Unit" NOT NULL DEFAULT 'LITRE',
    "pricePerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING',
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentId" INTEGER,

    CONSTRAINT "FuelSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" SERIAL NOT NULL,
    "cardId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "userId" INTEGER NOT NULL,
    "provider" TEXT,
    "method" "PaymentMethod",
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorPayout" (
    "id" SERIAL NOT NULL,
    "operatorId" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "periodFrom" TIMESTAMP(3),
    "periodTo" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatorPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalDocument" (
    "id" SERIAL NOT NULL,
    "type" "LegalDocumentType" NOT NULL,
    "version" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalTranslation" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "language" "Language" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "LegalTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelStationLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "fuelStationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelStationLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDevice" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "deviceToken" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "OtpCode_phone_idx" ON "OtpCode"("phone");

-- CreateIndex
CREATE INDEX "OtpCode_userId_idx" ON "OtpCode"("userId");

-- CreateIndex
CREATE INDEX "RegistrationToken_userId_idx" ON "RegistrationToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "Car_brand_idx" ON "Car"("brand");

-- CreateIndex
CREATE INDEX "Car_model_idx" ON "Car"("model");

-- CreateIndex
CREATE INDEX "Car_year_idx" ON "Car"("year");

-- CreateIndex
CREATE INDEX "Car_createdById_idx" ON "Car"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Car_brand_model_year_key" ON "Car"("brand", "model", "year");

-- CreateIndex
CREATE UNIQUE INDEX "UserCar_plateNumber_key" ON "UserCar"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "UserCar_vin_key" ON "UserCar"("vin");

-- CreateIndex
CREATE INDEX "UserCar_userId_idx" ON "UserCar"("userId");

-- CreateIndex
CREATE INDEX "UserCar_carId_idx" ON "UserCar"("carId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Operator_title_idx" ON "Operator"("title");

-- CreateIndex
CREATE INDEX "FuelStation_operatorId_idx" ON "FuelStation"("operatorId");

-- CreateIndex
CREATE INDEX "FuelPump_stationId_idx" ON "FuelPump"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "FuelPump_stationId_fuelPumpNumber_key" ON "FuelPump"("stationId", "fuelPumpNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FuelType_name_key" ON "FuelType"("name");

-- CreateIndex
CREATE INDEX "FuelPumpStatusLog_fuelPumpId_idx" ON "FuelPumpStatusLog"("fuelPumpId");

-- CreateIndex
CREATE INDEX "FuelPumpFuel_fuelPumpId_idx" ON "FuelPumpFuel"("fuelPumpId");

-- CreateIndex
CREATE INDEX "FuelPumpFuel_fuelTypeId_idx" ON "FuelPumpFuel"("fuelTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "FuelSession_paymentId_key" ON "FuelSession"("paymentId");

-- CreateIndex
CREATE INDEX "FuelSession_userId_idx" ON "FuelSession"("userId");

-- CreateIndex
CREATE INDEX "FuelSession_fuelStationId_idx" ON "FuelSession"("fuelStationId");

-- CreateIndex
CREATE INDEX "FuelSession_fuelPumpId_idx" ON "FuelSession"("fuelPumpId");

-- CreateIndex
CREATE INDEX "FuelSession_fuelTypeId_idx" ON "FuelSession"("fuelTypeId");

-- CreateIndex
CREATE INDEX "FuelSession_userCarId_idx" ON "FuelSession"("userCarId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_externalId_key" ON "PaymentTransaction"("externalId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_userId_idx" ON "PaymentTransaction"("userId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_cardId_idx" ON "PaymentTransaction"("cardId");

-- CreateIndex
CREATE INDEX "OperatorPayout_operatorId_idx" ON "OperatorPayout"("operatorId");

-- CreateIndex
CREATE INDEX "LegalDocument_type_idx" ON "LegalDocument"("type");

-- CreateIndex
CREATE INDEX "LegalTranslation_language_idx" ON "LegalTranslation"("language");

-- CreateIndex
CREATE UNIQUE INDEX "LegalTranslation_documentId_language_key" ON "LegalTranslation"("documentId", "language");

-- CreateIndex
CREATE INDEX "FuelStationLike_fuelStationId_idx" ON "FuelStationLike"("fuelStationId");

-- CreateIndex
CREATE INDEX "FuelStationLike_userId_idx" ON "FuelStationLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FuelStationLike_userId_fuelStationId_key" ON "FuelStationLike"("userId", "fuelStationId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDevice_deviceToken_key" ON "UserDevice"("deviceToken");

-- CreateIndex
CREATE UNIQUE INDEX "Card_userId_key" ON "Card"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_token_key" ON "Card"("token");

-- CreateIndex
CREATE INDEX "Card_userId_idx" ON "Card"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationToken" ADD CONSTRAINT "RegistrationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCar" ADD CONSTRAINT "UserCar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCar" ADD CONSTRAINT "UserCar_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelStation" ADD CONSTRAINT "FuelStation_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelPump" ADD CONSTRAINT "FuelPump_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "FuelStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelPumpStatusLog" ADD CONSTRAINT "FuelPumpStatusLog_fuelPumpId_fkey" FOREIGN KEY ("fuelPumpId") REFERENCES "FuelPump"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelPumpFuel" ADD CONSTRAINT "FuelPumpFuel_fuelPumpId_fkey" FOREIGN KEY ("fuelPumpId") REFERENCES "FuelPump"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelPumpFuel" ADD CONSTRAINT "FuelPumpFuel_fuelTypeId_fkey" FOREIGN KEY ("fuelTypeId") REFERENCES "FuelType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelSession" ADD CONSTRAINT "FuelSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelSession" ADD CONSTRAINT "FuelSession_fuelStationId_fkey" FOREIGN KEY ("fuelStationId") REFERENCES "FuelStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelSession" ADD CONSTRAINT "FuelSession_fuelPumpId_fkey" FOREIGN KEY ("fuelPumpId") REFERENCES "FuelPump"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelSession" ADD CONSTRAINT "FuelSession_fuelTypeId_fkey" FOREIGN KEY ("fuelTypeId") REFERENCES "FuelType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelSession" ADD CONSTRAINT "FuelSession_userCarId_fkey" FOREIGN KEY ("userCarId") REFERENCES "UserCar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelSession" ADD CONSTRAINT "FuelSession_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PaymentTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorPayout" ADD CONSTRAINT "OperatorPayout_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalTranslation" ADD CONSTRAINT "LegalTranslation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelStationLike" ADD CONSTRAINT "FuelStationLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelStationLike" ADD CONSTRAINT "FuelStationLike_fuelStationId_fkey" FOREIGN KEY ("fuelStationId") REFERENCES "FuelStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDevice" ADD CONSTRAINT "UserDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
