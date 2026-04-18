# Charge One Backend

Charge One is a comprehensive Enterprise Resource Planning (ERP) and EV Charging Station Management backend built with [NestJS](https://nestjs.com/). It provides robust APIs for managing charging stations, connectors, operators, user wallets, vehicle tracking, and real-time charging sessions.

## 🚀 Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) (Express under the hood)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: [Prisma](https://www.prisma.io/)
- **API Documentation**: Swagger (`/docs`)
- **Real-time Communication**: Socket.io
- **Additional Integrations**: Firebase Admin, MinIO (Object Storage), Telegraf, Weaviate.

---

## 📂 Project Structure

The project follows a modular monolithic architecture. Core business logic is separated into independent modules located in `src/modules`:

### Core Domain Modules
- **`operator`** & **`operator-payout`**: Management of charging station operators and their payouts.
- **`charging-station`**, **`station-pricing`**, **`discount`**, **`station-like`**: Management of EV charging stations, custom pricing, discounts, and user favorites.
- **`connector`** & **`connector-type`**: Hardware-level connection points and their physical port types.
- **`connector-status-log`** & **`charging-session`**: Telemetry for connector statuses and active user charging sessions.
- **`vehicle`**: EV vehicle definitions and users' associated cars.
- **`users`** & **`auth`**: User identity, role-based access control, and authentication (JWT, OTP).

### Finance & Billing Modules
- **`wallet`** & **`wallet-transaction`**: Virtual user wallets, top-ups, and balance tracking.
- **`payment`**: Transactions tied to charging sessions (integrates with Click/Payme).

### Supporting Modules
- **`notification`**: System and push notifications to user devices.
- **`legal`**: Management of legal documents (Terms, Privacy Policy) with multilingual support.
- **`prisma`**: Database connectivity using Prisma ORM.

---

## 🗄 Database Schema Overview

The central database consists of several interrelated entities carefully modeling an EV charging network:

1. **Entities & Roles**: `User` and `Role` management with tracking for verified status. Let users add their cars (`Car`, `UserCar`).
2. **Charging Infrastructure**: `Operator` owns multiple `ChargingStation`s. Each station has multiple `Connector`s of varying `ConnectorType`s (e.g., Type 2, CCS, CHAdeMO).
3. **Session & Live Status**: `ChargingSession` keeps track of active charges, linking a user, a connector, energy consumed (`energyKwh`), and calculated costs. `ConnectorStatusLog` logs availability.
4. **Economics**: `Wallet` linked to each user records internal `WalletTransaction`s (DEPOSIT, CHARGE, REFUND). `StationPricing` and `Discount` accurately calculate energy prices. `Payment` handles external top-ups, and `OperatorPayout` organizes the distribution of revenue back to station owners.

---

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL database
- Prisma CLI

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env` (refer to `.env.example`).
   - `DATABASE_URL` for PostgreSQL credentials.
   - App settings (`PORT`, `CORS_DOMAINS`, etc.)

3. Generate Prisma client & sync database schema:
```bash
npx prisma generate
npx prisma db push
```

4. Start the application:
```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run build
npm run start:prod
```

---

## 📖 API Documentation

The RESTful APIs are automatically documented using Swagger. Once the app is running, access the interactive docs at:

**`http://{host}:{port}/docs`**

Global API prefix is set to `/v1`. CORS is enabled and configured via environment variables. Request body limits are set to `10mb`.

## 📜 Scripts

| Command | Description |
|---|---|
| `npm run build` | Cleans `dist` and builds the Nest application |
| `npm run format` | Formats code using Prettier |
| `npm run start:dev` | Starts the app in watch mode |
| `npm run lint` | Lints the codebase using ESLint |
| `npm test` | Runs Jest unit tests |
