# FuelPay Admin Dashboard — Build Spec

Bu hujjat FuelPay backend API asosida **admin dashboard** (frontend) yaratish uchun to'liq texnik topshiriq. Claude Code yoki boshqa AI kod yordamchisi shu faylni o'qib, dashboardni yozishi mumkin.

## 1. Texnologiya stack (tavsiya)

- **Framework:** Next.js 14 (App Router) + TypeScript
- **UI:** shadcn/ui + TailwindCSS
- **State/Data:** TanStack Query (React Query) + Axios
- **Forms:** react-hook-form + zod
- **Charts:** recharts
- **Auth:** JWT (localStorage) + Axios interceptor
- **Icons:** lucide-react

## 2. Backend aloqasi

- **Base URL:** `${NEXT_PUBLIC_API_URL}/v1` (masalan `http://localhost:3000/v1`)
- **Swagger:** `/docs` — ishlab chiqishda DTO/response shakllarini shu yerdan tekshirish
- **Response shakli:** har bir javob `ResponseInterceptor` orqali o'raladi. Kutiladigan shakl odatda:
  ```json
  { "statusCode": 200, "message": "OK", "data": { ... } }
  ```
  Axios javobida har doim `res.data.data` dan foydalaning.
- **Auth:** `Authorization: Bearer <accessToken>` header. 401 bo'lsa `/v1/auth/refresh` ga `refreshToken` bilan POST qiling.
- **Rollar:** `ADMIN`, `CASHIER`, `USER`, `OPERATOR`. Dashboard asosan `ADMIN` uchun, ayrim sahifalar `CASHIER` uchun ochiq.

## 3. Autentifikatsiya oqimi

1. `POST /v1/admin/login` — body `{ phone, password }` (yoki `{ login, password }`, Swagger dan aniq shakl olinsin). Javobda `accessToken` va `refreshToken`.
2. Tokenlarni `localStorage` ga saqlang.
3. Axios instance `baseURL + /v1`, request interceptor — token qo'shadi; response interceptor — 401 da `POST /v1/auth/refresh` qilib qayta urinadi, muvaffaqiyatsiz bo'lsa `/login` ga yo'naltiradi.
4. `GET /v1/auth/me` — joriy foydalanuvchi ma'lumoti; `role !== 'ADMIN' && role !== 'CASHIER'` bo'lsa dashboardga kirgizmang.

## 4. Sahifalar ro'yxati (sidebar)

| # | Sahifa | Asosiy endpointlar | Kim uchun |
|---|--------|--------------------|-----------|
| 1 | **Overview** (bosh sahifa — KPI + charts) | `GET /v1/fuel-sessions/admin`, `GET /v1/fuel-sessions/cashier/stats`, agregatlar | ADMIN |
| 2 | **Admins / Cashiers** | `/v1/admin/*` | ADMIN |
| 3 | **Users** | `/v1/auth/me`, users list (agar mavjud bo'lmasa — sessiyalardan unique userlar) | ADMIN |
| 4 | **Fuel Stations** | `/v1/stations` | ADMIN |
| 5 | **Fuel Pumps** | `/v1/pumps`, `/v1/pumps/:id/qr-code` | ADMIN |
| 6 | **Pump Fuels** (pompa-yoqilg'i narxlari) | `/v1/pump-fuels` | ADMIN |
| 7 | **Fuel Types** | `/v1/fuel-types` | ADMIN |
| 8 | **Pump Status Logs** | `/v1/pump-status-logs` | ADMIN |
| 9 | **Fuel Sessions** (barcha sessiyalar) | `/v1/fuel-sessions/admin`, `/v1/fuel-sessions/admin/:id`, PATCH/DELETE admin | ADMIN |
| 10 | **Cashier Panel** (sessiya yaratish va boshqarish) | `POST /v1/fuel-sessions/cashier`, `POST /start`, `POST /stop/:id`, `GET /my-stats`, `GET /cashier/stats` | CASHIER |
| 11 | **Operators** | `/v1/operators` | ADMIN |
| 12 | **Operator Payouts** | `/v1/operator-payouts` | ADMIN |
| 13 | **Click Transactions** | `GET /v1/click/transactions` | ADMIN |
| 14 | **Notifications** (broadcast) | `POST /v1/notifications/broadcast`, `POST /send` | ADMIN |
| 15 | **Legal** (hujjatlar + tarjimalar) | `/v1/legal`, `/v1/legal/:id/translation` | ADMIN |
| 16 | **Telegram Settings** | `GET/PATCH /v1/telegram/settings` | ADMIN |
| 17 | **Vehicles / Cars** (agar kerak bo'lsa) | `/v1/cars` | ADMIN |

## 5. Endpoint referense (Controller fayllarga qarang)

Har bir CRUD sahifa uchun controller fayli manbadir. DTO/query/response shakllari shu fayllar + Swagger dan olinsin:

- Auth/Admin: [auth.controller.ts](src/modules/auth/auth.controller.ts), [admin.controller.ts](src/modules/auth/admin.controller.ts)
- Fuel Session: [fuel-session.controller.ts](src/modules/fuel-session/fuel-session.controller.ts)
- Fuel Station: [fuel-station.controller.ts](src/modules/fuel-station/fuel-station.controller.ts)
- Fuel Pump: [fuel-pump.controller.ts](src/modules/fuel-pump/fuel-pump.controller.ts)
- Pump Fuel: [fuel-pump-fuel.controller.ts](src/modules/fuel-pump-fuel/fuel-pump-fuel.controller.ts)
- Fuel Type: [fuel-type.controller.ts](src/modules/fuel-type/fuel-type.controller.ts)
- Pump Status Log: [fuel-pump-status-log.controller.ts](src/modules/fuel-pump-status-log/fuel-pump-status-log.controller.ts)
- Click: [click.controller.ts](src/modules/click/click.controller.ts)
- Operator: [operator.controller.ts](src/modules/operator/operator.controller.ts)
- Operator Payout: [operator-payout.controller.ts](src/modules/operator-payout/operator-payout.controller.ts)
- Notification: [notification.controller.ts](src/modules/notification/notification.controller.ts)
- Legal: [legal.controller.ts](src/modules/legal/legal.controller.ts)
- Telegram: [telegram.controller.ts](src/modules/telegram/telegram.controller.ts)
- Vehicle: [vehicle.controller.ts](src/modules/vehicle/vehicle.controller.ts)

### Muhim endpointlar (qisqacha)

**Admin auth** — [admin.controller.ts](src/modules/auth/admin.controller.ts)
- `POST /v1/admin/login`
- `POST /v1/admin/create` — yangi admin
- `POST /v1/admin/create-cashier`
- `PATCH /v1/admin/update-cashier/:id`
- `DELETE /v1/admin/delete-cashier/:id`
- `DELETE /v1/admin/delete-admin/:id`

**Fuel Sessions** — [fuel-session.controller.ts](src/modules/fuel-session/fuel-session.controller.ts)
- `GET /v1/fuel-sessions/admin` — admin ro'yxat (pagination + filter)
- `GET /v1/fuel-sessions/admin/:id`
- `PATCH /v1/fuel-sessions/admin/:id`
- `DELETE /v1/fuel-sessions/admin/:id`
- `GET /v1/fuel-sessions/cashier/stats` — kassir statistikasi
- `POST /v1/fuel-sessions/cashier` — kassir sessiya yaratadi
- `POST /v1/fuel-sessions/start` / `POST /v1/fuel-sessions/stop/:id`
- `POST /v1/fuel-sessions/pay-and-create` — atomik to'lov + sessiya
- `POST /v1/fuel-sessions/:id/confirm`
- `PATCH /v1/fuel-sessions/:id/status`

**Fuel Station / Pump / Pump-Fuel / Fuel-Type** — standart CRUD:
- `GET|POST /v1/stations`, `GET|PATCH|DELETE /v1/stations/:id`
- `GET|POST /v1/pumps`, `GET|PATCH|DELETE /v1/pumps/:id`, `GET /v1/pumps/:id/qr-code`, `GET /v1/pumps/scan/:qrCode`
- `GET|POST /v1/pump-fuels`, `GET|PATCH|DELETE /v1/pump-fuels/:id`
- `GET|POST /v1/fuel-types`, `GET|PATCH|DELETE /v1/fuel-types/:id`

**Operators / Payouts**
- `GET|POST /v1/operators`, `GET|PATCH|DELETE /v1/operators/:id`
- `GET|POST /v1/operator-payouts`, `GET|PATCH|DELETE /v1/operator-payouts/:id`

**Click**
- `GET /v1/click/transactions` — to'lovlar tarixi (admin sahifada)

**Notifications**
- `POST /v1/notifications/broadcast` — barchasiga
- `POST /v1/notifications/send` — bitta foydalanuvchiga

**Legal**
- `GET /v1/legal`, `POST`, `PATCH/:id`, `DELETE/:id`
- `POST /v1/legal/:id/translation`, `PATCH /v1/legal/translation/:id`, `DELETE ...`

**Telegram**
- `GET|PATCH /v1/telegram/settings`

## 6. Overview sahifa — KPI va chartlar

KPI kartalar:
- Jami sessiyalar (bugun / hafta / oy)
- Jami tushum (UZS) — `fuelSession.totalAmount` yig'indisi
- Faol pompalar soni (pump-status-log dan `status === ACTIVE`)
- Oxirgi 24 soatdagi Click tranzaksiyalari

Chartlar (recharts):
- **Line:** oxirgi 30 kun kunlik tushum
- **Bar:** stansiya bo'yicha sessiya soni (top 10)
- **Pie:** yoqilg'i turlari bo'yicha sotuv ulushi

> Agregatsiya uchun maxsus endpoint bo'lmasa — `GET /v1/fuel-sessions/admin?from=...&to=...` dan kelgan ro'yxatni frontendda groupBy qiling. Keyinchalik backendga `stats/overview` endpoint qo'shish tavsiya etiladi.

## 7. Loyiha skeleti

```
admin-dashboard/
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login/page.tsx
│  │  ├─ (dashboard)/
│  │  │  ├─ layout.tsx         # sidebar + header + auth guard
│  │  │  ├─ page.tsx           # Overview
│  │  │  ├─ stations/
│  │  │  ├─ pumps/
│  │  │  ├─ pump-fuels/
│  │  │  ├─ fuel-types/
│  │  │  ├─ sessions/
│  │  │  ├─ operators/
│  │  │  ├─ payouts/
│  │  │  ├─ click/
│  │  │  ├─ notifications/
│  │  │  ├─ legal/
│  │  │  ├─ telegram/
│  │  │  ├─ admins/
│  │  │  └─ cashiers/
│  │  └─ layout.tsx
│  ├─ lib/
│  │  ├─ api.ts                # axios instance + interceptors
│  │  ├─ auth.ts               # token helpers
│  │  └─ query-client.ts
│  ├─ hooks/
│  │  ├─ use-auth.ts
│  │  └─ use-<resource>.ts     # CRUD hooks har bir resurs uchun
│  ├─ components/
│  │  ├─ ui/                   # shadcn
│  │  ├─ data-table.tsx
│  │  ├─ page-header.tsx
│  │  └─ forms/
│  └─ types/
│     └─ api.ts                # Swagger'dan generate qiling yoki qo'lda yozing
├─ .env.local                  # NEXT_PUBLIC_API_URL=http://localhost:3000
└─ package.json
```

## 8. Umumiy komponentlar

- **DataTable** — TanStack Table asosida; props: `columns`, `query` (useQuery natijasi), `filters`, `onRowClick`. Server-side pagination (`page`, `limit`, `search`) URL query orqali.
- **ResourceForm** — react-hook-form + zod; create/edit uchun bitta forma.
- **ConfirmDialog** — delete uchun.
- **StatusBadge** — session/pump status ranglar bilan.
- **CurrencyCell** — `new Intl.NumberFormat('uz-UZ').format(v) + ' so'm'`.

## 9. Har bir CRUD sahifa uchun andaza

1. `useQuery` — ro'yxatni olish (`['resource', filters]`).
2. `useMutation` — create/update/delete; muvaffaqiyatda `queryClient.invalidateQueries`.
3. UI: `<PageHeader>` + "Create" tugmasi + `<DataTable>` + modal forma.
4. Xatoliklar — `toast.error(err.response?.data?.message)`.

## 10. Muhim qoidalar

- Har doim `res.data.data` dan o'qing (ResponseInterceptor shakli).
- Sanani backend ISO string qaytaradi — UI da `date-fns` bilan format qiling.
- Pul qiymatlari **so'm** da (Click `tiyin` da bo'lishi mumkin — Swaggerda tekshiring; agar shunday bo'lsa, UI da `/100` qiling).
- Rolga qarab sidebar elementlarini yashiring (`useAuth().role`).
- Barcha mutatsiyalardan keyin tegishli queryni invalidate qiling.
- `.env.local` ga `NEXT_PUBLIC_API_URL` qo'ying, kodda hech qachon hardcode qilmang.

## 11. Birinchi bosqich (MVP) tartibi

1. Next.js loyihani yarating, shadcn init, Tailwind sozlang.
2. `lib/api.ts` + auth interceptor + login sahifa.
3. Dashboard layout (sidebar + auth guard).
4. Overview (sodda KPI — birinchi navbatda mock, keyin sessiya aggregatsiyasi).
5. Fuel Stations CRUD — eng sodda resurs, andaza sifatida.
6. Pumps + Pump Fuels + Fuel Types.
7. Fuel Sessions (admin ro'yxat + detail + status o'zgartirish).
8. Qolgan sahifalar.
9. Cashier panel (alohida role).
10. Polish: loading skeletons, empty states, error boundaries.

---

**Eslatma Claude Code uchun:** Har bir endpoint DTO sini aniq bilish uchun mos `*.controller.ts` va `dto/` papkalariga qarang (`src/modules/<name>/dto/`). Swagger `/docs` orqali ham tekshirilsin. Response shakli bir xil emas deb taxmin qilmang — har bir endpointni alohida tekshiring.
