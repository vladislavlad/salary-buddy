import type {
  Salary,
  Bonus,
  Vacation,
  SurchargeChange,
  Payment,
  SickLeave,
  SickLeaveSettings,
} from "@/shared/types";
import {
  bonusRepository,
  salaryRepository,
  surchargeRepository,
  vacationRepository,
  salaryPaymentSettingsRepository,
  paymentsRepository,
  sickLeaveRepository,
  sickLeaveSettingsRepository,
} from "@/app/repositories";

/** Очищает все ключи Salary Buddy из localStorage. */
export async function clearAll(): Promise<void> {
  await Promise.all([
    salaryRepository.clear(),
    bonusRepository.clear(),
    surchargeRepository.clear(),
    vacationRepository.clear(),
    salaryPaymentSettingsRepository.clear(),
    paymentsRepository.clear(),
    sickLeaveRepository.clear(),
    sickLeaveSettingsRepository.clear(),
  ]);
}

// --- SalaryPaymentSettings helpers ---

export async function loadSalaryPaymentSettings() {
  return salaryPaymentSettingsRepository.get();
}

export async function saveSalaryPaymentSettings(settings: NonNullable<Awaited<ReturnType<typeof loadSalaryPaymentSettings>>>) {
  await salaryPaymentSettingsRepository.save(settings);
}

// --- Array-based entity helpers (delegate to repositories) ---

export async function loadSalaries(): Promise<Salary[]> {
  return salaryRepository.findAll();
}

export async function saveSalaries(salaries: Salary[]): Promise<void> {
  await salaryRepository.saveAll(salaries);
}

export async function loadBonuses(): Promise<Bonus[]> {
  return bonusRepository.findAll();
}

export async function saveBonuses(bonuses: Bonus[]): Promise<void> {
  await bonusRepository.saveAll(bonuses);
}

export async function loadVacations(): Promise<Vacation[]> {
  return vacationRepository.findAll();
}

export async function saveVacations(vacations: Vacation[]): Promise<void> {
  await vacationRepository.saveAll(vacations);
}

export async function loadSurcharges(): Promise<SurchargeChange[]> {
  return surchargeRepository.findAll();
}

export async function saveSurcharges(surcharges: SurchargeChange[]): Promise<void> {
  await surchargeRepository.saveAll(surcharges);
}

export async function loadPayments(): Promise<Payment[]> {
  return paymentsRepository.findAll();
}

export async function savePayments(payments: Payment[]): Promise<void> {
  await paymentsRepository.saveAll(payments);
}

export async function loadSickLeaves(): Promise<SickLeave[]> {
  return sickLeaveRepository.findAll();
}

export async function saveSickLeaves(sickLeaves: SickLeave[]): Promise<void> {
  await sickLeaveRepository.saveAll(sickLeaves);
}

export async function loadSickLeaveSettings(): Promise<SickLeaveSettings | undefined> {
  const result = await sickLeaveSettingsRepository.get();
  return result ?? undefined;
}

export async function saveSickLeaveSettings(settings: SickLeaveSettings): Promise<void> {
  await sickLeaveSettingsRepository.save(settings);
}
