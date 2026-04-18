import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { NotificationService } from '@/modules/notification/notification.service';
import { CreateFuelSessionDto } from '@/types/fuel-session/create-fuel-session.dto';
import { UpdateFuelSessionDto } from '@/types/fuel-session/update-fuel-session.dto';
import { FilterFuelSessionDto } from '@/types/fuel-session/filter-fuel-session.dto';
import { SessionStatus, PaymentStatus } from '@prisma/client';
import { PayAndCreateSessionDto } from '@/types/fuel-session/pay-and-create-session.dto';
import { OcppServer } from '../ocpp/ocpp.server';
import { RemoteStartSessionDto } from '@/types/fuel-session/remote-start-session.dto';
import { ClickService } from '../click/click.service';
import { CashierStatsFilterDto } from '@/types/fuel-session/cashier-stats-filter.dto';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class FuelSessionService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    @Inject(forwardRef(() => OcppServer))
    private ocppServer: OcppServer,
    private clickService: ClickService,
    private telegramService: TelegramService
  ) { }

  public async processAutoPayment(sessionId: number) {
    const session = await this.prisma.fuelSession.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });

    if (!session || session.paymentId || session.totalAmount <= 0) return;

    try {
      const result = await this.clickService.payWithToken(session.userId, undefined, session.totalAmount);
      if (result.success) {
        await this.prisma.fuelSession.update({
          where: { id: sessionId },
          data: { paymentId: result.transactionId }
        });

        // Trigger Telegram notification
        const sessionWithDetails = await this.prisma.fuelSession.findUnique({
          where: { id: sessionId },
          include: {
            fuelType: { select: { name: true } },
            fuelPump: { select: { fuelPumpNumber: true } }
          }
        });
        await this.telegramService.notifyStationCashiers(session.fuelStationId, {
          amount: session.totalAmount,
          transactionId: result.transactionId?.toString() || session.id.toString(),
          fuelName: sessionWithDetails?.fuelType?.name || 'Yoqilg\'i',
          pumpNum: sessionWithDetails?.fuelPump?.fuelPumpNumber || 0
        });
      }
    } catch (e) {
      console.error(`Automatic payment failed for session ${sessionId}: ${e.message}`);
    }
  }
  async createForUser(userId: number, dto: CreateFuelSessionDto) {
    let status = dto.status ?? SessionStatus.PENDING;

    // 1. If paymentId is provided, verify it
    if (dto.paymentId) {
      const transaction = await this.prisma.paymentTransaction.findUnique({
        where: { id: dto.paymentId },
      });

      if (!transaction) {
        throw new BadRequestException('To\'lov ma\'lumotlari topilmadi (Payment not found)');
      }

      if (transaction.userId !== userId) {
        throw new ForbiddenException('Ushbu to\'lov sizga tegishli emas (Payment does not belong to you)');
      }

      if (transaction.status !== PaymentStatus.SUCCESS) {
        throw new BadRequestException('To\'lov hali tasdiqlanmagan (Payment not successful)');
      }

      // Check if this payment is already linked to another session
      const existingSession = await this.prisma.fuelSession.findFirst({
        where: { paymentId: dto.paymentId },
      });

      if (existingSession) {
        throw new BadRequestException('Ushbu to\'lov allaqachon ishlatilgan (Payment already used)');
      }

      // If valid, set status directly to CONFIRMED (Accepted)
      status = SessionStatus.CONFIRMED;
    }

    const session = await this.prisma.fuelSession.create({
      data: {
        userId,
        fuelStationId: dto.fuelStationId,
        fuelPumpId: dto.fuelPumpId,
        fuelTypeId: dto.fuelTypeId,
        quantity: dto.quantity ?? 0,
        unit: dto.unit,
        pricePerUnit: dto.pricePerUnit ?? 0,
        totalAmount: dto.totalAmount ?? 0,
        paymentId: dto.paymentId,
        status,
        startTime: dto.startTime ? new Date(dto.startTime) : new Date(),
      },
      include: {
        fuelType: { select: { name: true } },
        fuelPump: { select: { fuelPumpNumber: true } }
      }
    });

    if (status === SessionStatus.CONFIRMED) {
      this.telegramService.notifyStationCashiers(session.fuelStationId, {
        amount: session.totalAmount,
        transactionId: session.paymentId?.toString() || session.id.toString(),
        fuelName: session.fuelType?.name || 'Yoqilg\'i',
        pumpNum: session.fuelPump?.fuelPumpNumber || 0
      }).catch(err => console.error('Telegram notification failed:', err));
    }

    return session;
  }

  /**
   * Single atomic endpoint: charges the user's saved Click card AND creates
   * the fuel session in one request. The session row is created in PENDING
   * state BEFORE the Click API call, so the paymentId can never be orphaned
   * by a network failure — it always has a session to attach to.
   */
  async payAndCreate(userId: number, dto: PayAndCreateSessionDto) {
    // 1. Charge the saved Click card FIRST.
    let payResult: { success: boolean; transactionId?: number };
    try {
      payResult = await this.clickService.payWithToken(userId, dto.cardId, dto.amount);
    } catch (e) {
      throw new BadRequestException(`To'lov amalga oshmadi: ${e?.message ?? 'unknown'}`);
    }

    if (!payResult?.success || !payResult.transactionId) {
      throw new BadRequestException('To\'lov amalga oshmadi');
    }

    // 2. Payment succeeded — create the session already bound to this paymentId.
    const confirmed = await this.prisma.fuelSession.create({
      data: {
        userId,
        fuelStationId: dto.fuelStationId,
        fuelPumpId: dto.fuelPumpId,
        fuelTypeId: dto.fuelTypeId,
        quantity: dto.quantity ?? 0,
        unit: dto.unit,
        pricePerUnit: dto.pricePerUnit ?? 0,
        totalAmount: dto.amount,
        paymentId: payResult.transactionId,
        status: SessionStatus.CONFIRMED,
        startTime: new Date(),
      },
      include: {
        fuelType: { select: { name: true } },
        fuelPump: { select: { fuelPumpNumber: true } },
        fuelStation: { select: { id: true, title: true, address: true } },
      },
    });

    // 4. Fire-and-forget cashier notification.
    this.telegramService.notifyStationCashiers(confirmed.fuelStationId, {
      amount: confirmed.totalAmount,
      transactionId: confirmed.paymentId?.toString() || confirmed.id.toString(),
      fuelName: confirmed.fuelType?.name || 'Yoqilg\'i',
      pumpNum: confirmed.fuelPump?.fuelPumpNumber || 0,
    }).catch(err => console.error('Telegram notification failed:', err));

    return {
      success: true,
      paymentId: payResult.transactionId,
      session: confirmed,
    };
  }

  async adminCreate(dto: CreateFuelSessionDto) {
    if (!dto.userId)
      throw new ForbiddenException('userId is required for admin create');
    return this.prisma.fuelSession.create({
      data: {
        userId: dto.userId,
        fuelStationId: dto.fuelStationId,
        fuelPumpId: dto.fuelPumpId,
        fuelTypeId: dto.fuelTypeId,
        quantity: dto.quantity ?? 0,
        unit: dto.unit,
        pricePerUnit: dto.pricePerUnit ?? 0,
        totalAmount: dto.totalAmount ?? 0,
        paymentId: dto.paymentId,
        status: dto.status ?? SessionStatus.PENDING,
        startTime: dto.startTime ? new Date(dto.startTime) : new Date(),
      },
    });
  }
  async findAllForUser(userId: number, query: FilterFuelSessionDto) {
    const { page = 1, limit = 10, status, from, to } = query;
    const where: any = { userId };
    if (status) where.status = status;

    if (from || to) {
      where.startTime = {};
      if (from) where.startTime.gte = new Date(from);
      if (to) where.startTime.lte = new Date(to);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.fuelSession.findMany({
        where,
        orderBy: { startTime: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.fuelSession.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async adminFindAll(query: FilterFuelSessionDto) {
    const {
      page = 1,
      limit = 10,
      status,
      userId,
      fuelStationId,
      fuelPumpId,
      fuelTypeId,
      from,
      to,
    } = query;
    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (fuelStationId) where.fuelStationId = fuelStationId;
    if (fuelPumpId) where.fuelPumpId = fuelPumpId;
    if (fuelTypeId) where.fuelTypeId = fuelTypeId;

    if (from || to) {
      where.startTime = {};
      if (from) where.startTime.gte = new Date(from);
      if (to) where.startTime.lte = new Date(to);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.fuelSession.findMany({
        where,
        orderBy: { startTime: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.fuelSession.count({ where }),
    ]);
    return { items, total, page, limit };
  }
  async findOneForUser(userId: number, id: number) {
    const item = await this.prisma.fuelSession.findUnique({
      where: { id },
    });
    if (!item || item.userId !== userId)
      throw new NotFoundException('Session not found');
    return item;
  }

  async adminFindOne(id: number) {
    const item = await this.prisma.fuelSession.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('Session not found');
    return item;
  }

  async adminUpdate(id: number, dto: UpdateFuelSessionDto) {
    const existing = await this.adminFindOne(id);
    const updated = await this.prisma.fuelSession.update({
      where: { id },
      data: {
        fuelStationId: dto.fuelStationId,
        fuelPumpId: dto.fuelPumpId,
        fuelTypeId: dto.fuelTypeId,
        quantity: dto.quantity,
        unit: dto.unit,
        pricePerUnit: dto.pricePerUnit,
        totalAmount: dto.totalAmount,
        paymentId: dto.paymentId,
        status: dto.status,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      },
    });

    if (existing.status !== updated.status && updated.status === SessionStatus.COMPLETED) {
      this.processAutoPayment(updated.id); // Background trigger
      try {
        await this.notificationService.sendToUser(updated.userId, {
          title: 'Fueling Completed',
          body: 'Sizning yoqilg\'i quyish jarayoni yakunlandi',
          type: 'FUEL_SESSION_COMPLETED',
          data: { sessionId: updated.id },
        });
      } catch (e) {
        // ignore notification errors
      }
    }

    return updated;
  }

  async adminRemove(id: number) {
    await this.adminFindOne(id);
    await this.prisma.fuelSession.delete({ where: { id } });
    return { success: true };
  }

  async getUserStats(userId: number) {
    // Fetch all COMPLETED sessions for the user, newest first
    const sessions = await this.prisma.fuelSession.findMany({
      where: { userId, status: SessionStatus.COMPLETED },
      orderBy: { startTime: 'desc' },
      include: {
        fuelType: { select: { name: true, unit: true, category: true } },
        fuelStation: { select: { id: true, title: true, address: true } },
      },
    });

    // Aggregate by unit (raw)
    const totalByUnit: Record<string, number> = {};
    // Aggregate by fuel category
    const totalByCategory: Record<string, { quantity: number; unit: string }> = {};
    // Aggregate by fuel type name
    const totalByFuelType: Record<string, { quantity: number; unit: string; totalAmount: number }> = {};
    // Total money spent
    let totalAmount = 0;

    for (const s of sessions) {
      const unit = s.fuelType?.unit ?? s.unit ?? 'LITRE';
      const category = s.fuelType?.category ?? 'PETROL';
      const typeName = s.fuelType?.name ?? 'Unknown';

      // raw by unit
      totalByUnit[unit] = (totalByUnit[unit] ?? 0) + s.quantity;

      // by category with its unit
      if (!totalByCategory[category]) {
        totalByCategory[category] = { quantity: 0, unit };
      }
      totalByCategory[category].quantity += s.quantity;

      // by fuel type name
      if (!totalByFuelType[typeName]) {
        totalByFuelType[typeName] = { quantity: 0, unit, totalAmount: 0 };
      }
      totalByFuelType[typeName].quantity += s.quantity;
      totalByFuelType[typeName].totalAmount += s.totalAmount;

      totalAmount += s.totalAmount;
    }

    return {
      sessionCount: sessions.length,
      totalAmount,
      // PETROL category: AI-80, AI-92, AI-95 — LITRE
      totalPetrolLitres: totalByCategory['PETROL']?.quantity ?? 0,
      // GAS category: Methane — M3
      totalGasM3: totalByCategory['GAS']?.quantity ?? 0,
      // PROPANE category: Propane — LITRE (separate from petrol)
      totalPropaneLitres: totalByCategory['PROPANE']?.quantity ?? 0,
      // ELECTRICITY category: — KWH
      totalKwh: totalByCategory['ELECTRICITY']?.quantity ?? 0,
      byUnit: totalByUnit,
      byCategory: Object.fromEntries(
        Object.entries(totalByCategory).map(([cat, val]) => [
          cat,
          { quantity: val.quantity, unit: val.unit },
        ]),
      ),
      byFuelType: totalByFuelType,
      // individual sessions — where, when, how much
      sessions: sessions.map((s) => ({
        id: s.id,
        station: s.fuelStation
          ? { id: s.fuelStation.id, title: s.fuelStation.title, address: s.fuelStation.address }
          : null,
        fuelType: s.fuelType?.name ?? null,
        category: s.fuelType?.category ?? null,
        quantity: s.quantity,
        unit: s.fuelType?.unit ?? s.unit,
        pricePerUnit: s.pricePerUnit,
        totalAmount: s.totalAmount,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    };
  }



  async confirmSession(id: number, paymentId?: number) {
    const session = await this.adminFindOne(id);
    if (session.status !== SessionStatus.PENDING) {
      throw new ForbiddenException('Only PENDING sessions can be confirmed');
    }

    const updated = await this.prisma.fuelSession.update({
      where: { id },
      data: {
        status: SessionStatus.CONFIRMED,
        paymentId: paymentId ?? session.paymentId,
      },
    });

    if (!updated.paymentId) {
        this.processAutoPayment(updated.id);
    }

    return updated;
  }

  async remoteStartSession(userId: number, dto: RemoteStartSessionDto) {
    const fuelPump = await this.prisma.fuelPump.findUnique({
      where: { id: dto.fuelPumpId },
    });

    if (!fuelPump) throw new NotFoundException('Fuel pump not found');

    const stationId = fuelPump.stationId;

    // Pre-create the session
    const session = await this.prisma.fuelSession.create({
      data: {
        fuelStationId: stationId,
        fuelPumpId: fuelPump.id,
        fuelTypeId: 1, // Placeholder: default fuel type (e.g., AI-80 or first found)
        userId,
        userCarId: dto.userCarId ?? null,
        status: SessionStatus.DISPENSING,
        quantity: 0,
        totalAmount: 0,
        startTime: new Date(),
      },
    });

    try {
      await this.ocppServer.sendCallToStation(stationId, 'RemoteStartTransaction', {
        connectorId: fuelPump.fuelPumpNumber,
        idTag: userId.toString()
      });

      return {
        success: true,
        sessionId: session.id,
        message: 'Remote start command dispatched via OCPP',
      };
    } catch (e) {
      await this.prisma.fuelSession.delete({ where: { id: session.id } }).catch(() => { });
      throw new ForbiddenException(`Failed to connect to station: ${e.message}`);
    }
  }

  async remoteStopSession(userId: number, sessionId: number) {
    const session = await this.prisma.fuelSession.findUnique({
      where: { id: sessionId },
      include: { fuelPump: true }
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException('Not your session');

    const stationId = session.fuelPump.stationId;

    try {
      await this.ocppServer.sendCallToStation(stationId, 'RemoteStopTransaction', {
        transactionId: session.id
      });

      return {
        success: true,
        sessionId: session.id,
        message: 'Remote stop command dispatched via OCPP'
      };
    } catch (e) {
      throw new ForbiddenException(`Failed to connect to station: ${e.message}`);
    }
  }

  async updateStatus(id: number, status: SessionStatus) {
    const session = await this.adminFindOne(id);

    if (status === SessionStatus.DISPENSING) {
      if (session.status !== SessionStatus.CONFIRMED) {
        throw new BadRequestException('Faqat tasdiqlangan seanslarni yoqilg\'i quyish bosqichiga o\'tkazish mumkin (Only CONFIRMED sessions can be moved to DISPENSING)');
      }
    }

    if (status === SessionStatus.CANCELLED) {
      if (session.status === SessionStatus.COMPLETED) {
        throw new BadRequestException('Yakunlangan seansni bekor qilib bo\'lmaydi (Completed session cannot be cancelled)');
      }
    }

    return this.prisma.fuelSession.update({
      where: { id },
      data: { status },
    });
  }

  async getCashierStats(userId: number, filter: CashierStatsFilterDto) {
    const { from, to, fuelStationId } = filter;

    // 1. Get stations assigned to this cashier
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { cashierStations: { select: { id: true } } }
    });

    const assignedStationIds = user?.cashierStations.map(s => s.id) || [];
    
    // 2. Filter by specific station if requested, else use all assigned
    let targetStationIds = assignedStationIds;
    if (fuelStationId) {
      if (!assignedStationIds.includes(Number(fuelStationId))) {
        throw new ForbiddenException('You are not assigned to this station');
      }
      targetStationIds = [Number(fuelStationId)];
    }

    if (targetStationIds.length === 0) {
      return { totalRevenue: 0, totalVolume: 0, sessionCount: 0, message: 'No stations assigned' };
    }

    // 3. Define the query scope
    const where: any = {
      fuelStationId: { in: targetStationIds },
      status: SessionStatus.COMPLETED
    };

    if (from || to) {
      where.startTime = {};
      if (from) where.startTime.gte = new Date(from);
      if (to) where.startTime.lte = new Date(to);
    } else {
      // Default to last 30 days if no range provided
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.startTime = { gte: thirtyDaysAgo };
    }

    // 4. Fetch the data
    const sessions = await this.prisma.fuelSession.findMany({
      where,
      include: {
        fuelType: { select: { name: true, unit: true, category: true } },
        fuelPump: { select: { fuelPumpNumber: true } },
        payment: { select: { provider: true, method: true } },
        user: { select: { id: true, phone: true, firstName: true, lastName: true } }
      },
      orderBy: { startTime: 'desc' }
    });

    // 5. Initial stats
    let totalRevenue = 0;
    const totalByUnit: Record<string, number> = {}; // e.g. { LITRE: 240, M3: 45 }
    const byFuelType: Record<string, { quantity: number; amount: number; unit: string }> = {};
    const byPump: Record<string, { quantity: number; amount: number; count: number }> = {};
    const dailySales: Record<string, { amount: number; quantity: number }> = {};
    const peakHours: Record<number, number> = {}; // Hour (0-23) -> Count
    const topCustomers: Record<number, { amount: number; count: number; name: string; phone: string }> = {};
    const paymentMethods: Record<string, { amount: number; count: number }> = {};

    for (const s of sessions) {
      totalRevenue += s.totalAmount;

      const unit = s.fuelType?.unit || s.unit;
      totalByUnit[unit] = (totalByUnit[unit] || 0) + s.quantity;

      // Group by Fuel Type
      const fuelName = s.fuelType?.name || 'Unknown';
      const fuelUnit = s.fuelType?.unit || s.unit;
      if (!byFuelType[fuelName]) byFuelType[fuelName] = { quantity: 0, amount: 0, unit: fuelUnit };
      byFuelType[fuelName].quantity += s.quantity;
      byFuelType[fuelName].amount += s.totalAmount;

      // Group by Pump
      const pumpNum = s.fuelPump?.fuelPumpNumber || 0;
      const pumpLabel = `Pump ${pumpNum}`;
      if (!byPump[pumpLabel]) byPump[pumpLabel] = { quantity: 0, amount: 0, count: 0 };
      byPump[pumpLabel].quantity += s.quantity;
      byPump[pumpLabel].amount += s.totalAmount;
      byPump[pumpLabel].count += 1;

      // Daily Sales
      const dateKey = s.startTime.toISOString().split('T')[0];
      if (!dailySales[dateKey]) dailySales[dateKey] = { amount: 0, quantity: 0 };
      dailySales[dateKey].amount += s.totalAmount;
      dailySales[dateKey].quantity += s.quantity;

      // Peak Hours
      const hour = s.startTime.getHours();
      peakHours[hour] = (peakHours[hour] || 0) + 1;

      // Top Customers
      const cid = s.userId;
      if (!topCustomers[cid]) {
        topCustomers[cid] = { 
          amount: 0, 
          count: 0, 
          name: `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() || 'User',
          phone: s.user.phone
        };
      }
      topCustomers[cid].amount += s.totalAmount;
      topCustomers[cid].count += 1;

      // Payment Methods
      const methodLabel = s.payment?.provider || s.payment?.method || 'OTHER';
      if (!paymentMethods[methodLabel]) paymentMethods[methodLabel] = { amount: 0, count: 0 };
      paymentMethods[methodLabel].amount += s.totalAmount;
      paymentMethods[methodLabel].count += 1;
    }

    return {
      overview: {
        totalRevenue,
        totalByUnit,  // e.g. { LITRE: 240.5, M3: 45.3 }
        sessionCount: sessions.length,
        averageCheck: sessions.length > 0 ? totalRevenue / sessions.length : 0,
      },
      byFuelType,
      byPump,
      dailySales: Object.entries(dailySales).map(([date, val]) => ({ date, ...val })).sort((a, b) => a.date.localeCompare(b.date)),
      peakHours: Object.entries(peakHours).map(([hour, count]) => ({ hour: parseInt(hour), count })).sort((a, b) => a.hour - b.hour),
      topCustomers: Object.values(topCustomers).sort((a, b) => b.amount - a.amount).slice(0, 5),
      paymentMethods,
    };
  }
}
