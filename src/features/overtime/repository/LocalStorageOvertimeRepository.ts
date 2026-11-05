import { LocalStorageRepository } from "@/shared/repository/LocalStorageRepository";
import { OvertimeSchema, type Overtime } from "../model/overtime";

export class LocalStorageOvertimeRepository extends LocalStorageRepository<Overtime> {
  constructor() {
    super("salary-buddy-overtime", OvertimeSchema.array());
  }
}
