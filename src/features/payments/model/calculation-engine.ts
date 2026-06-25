// Публичный фасад движка расчёта выплат. Реализация разнесена по ./calculation/*.
export { calculateAll, grossFromNet } from "./calculation";
export type { CalculateAllInput, RawEvent } from "./calculation/types";
