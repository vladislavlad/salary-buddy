// Максимальная существующая последовательность за год + 1.
// count+1 приводил к коллизии после удаления: LocalStorageRepository.save
// заменяет запись с тем же ID, а не добавляет новую.
export function nextSequenceId(
  prefix: string,
  year: number,
  existingIds: readonly string[],
): string {
  const key = `${prefix}${year}:`;
  let maxSeq = 0;
  for (const id of existingIds) {
    if (!id.startsWith(key)) continue;
    const seq = Number(id.slice(key.length));
    if (Number.isInteger(seq) && seq > maxSeq) maxSeq = seq;
  }
  return `${key}${String(maxSeq + 1).padStart(2, "0")}`;
}
