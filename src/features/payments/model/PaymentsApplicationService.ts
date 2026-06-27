import type { Repository } from "@/shared/repository/Repository";
import type {
  Bonus,
  CalendarData,
  Payment,
  SalaryCalculationSettings,
  SickLeave,
  SickLeaveSettings,
  SurchargeChange,
  Vacation,
} from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";
import { calculateAll } from "@/features/payments/model/calculation-engine";

export interface PaymentCalculationInput {
  settings: SalaryCalculationSettings;
  bonuses: Bonus[];
  surcharges: SurchargeChange[];
  vacations: Vacation[];
  sickLeaves: SickLeave[];
  sickLeaveSettings: SickLeaveSettings;
  calendars: Map<number, CalendarData>;
}

function paymentsEqual(a: Payment[], b: Payment[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const pa = a[i]!;
    const pb = b[i]!;
    if (
      pa.id !== pb.id ||
      pa.gross !== pb.gross ||
      pa.ndfl !== pb.ndfl ||
      pa.net !== pb.net ||
      pa.yearToDateGross !== pb.yearToDateGross ||
      pa.fact !== pb.fact ||
      !pa.date.equals(pb.date)
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Накладывает fact из existing на пересчитанные платежи: если для sourceId
 * в existing есть факт — сохраняем его.
 */
function mergeFacts(computed: Payment[], existing: Payment[]): Payment[] {
  const factBySource = new Map<string, number>();
  for (const p of existing) {
    if (p.fact !== undefined) factBySource.set(p.sourceId, p.fact);
  }

  return computed.map((cp) => {
    const fact = factBySource.get(cp.sourceId);
    return fact !== undefined ? { ...cp, fact } : cp;
  });
}

export class PaymentsApplicationService {
  constructor(
    private readonly paymentsRepository: Repository<Payment, string>,
  ) {}

  /** Возвращает сохранённые платежи без пересчёта. */
  getSaved(): Promise<Payment[]> {
    return this.paymentsRepository.findAll();
  }

  /** Пересчитывает выплаты и сохраняет результат. */
  async recalculate(input: PaymentCalculationInput): Promise<Payment[]> {
    const existing = await this.paymentsRepository.findAll();

    // Source-данные ещё не загружены — не перезаписываем репозиторий.
    if (input.settings.salaryChanges.length === 0) return existing;

    const recalculated = mergeFacts(this.compute(input, existing), existing);
    if (!paymentsEqual(existing, recalculated)) {
      await this.paymentsRepository.saveAll(recalculated);
    }
    return recalculated;
  }

  /**
   * Устанавливает факт на платеже и пересчитывает от его даты.
   */
  async setFact(
    paymentId: string,
    factGross?: number,
    input?: PaymentCalculationInput,
  ): Promise<Payment[]> {
    const allPayments = await this.paymentsRepository.findAll();

    const target = allPayments.find((p) => p.id === paymentId);
    if (!target) return allPayments;

    const updated = allPayments.map((p) =>
      p.id === paymentId ? { ...p, fact: factGross } : p,
    );

    // Без input — только сохраняем факт, без пересчёта.
    if (!input) {
      await this.paymentsRepository.saveAll(updated);
      return updated;
    }

    // Пересчитываем от даты платежа с обновлёнными фактами.
    const recalculated = mergeFacts(
      this.compute(input, updated, target.date),
      updated,
    );
    await this.paymentsRepository.saveAll(recalculated);
    return recalculated;
  }

  private compute(
    input: PaymentCalculationInput,
    existingPayments: Payment[],
    recalcFrom?: LocalDate,
  ): Payment[] {
    return calculateAll({
      ...input,
      calendarsByYear: input.calendars,
      existingPayments,
      recalcFrom,
    });
  }
}
