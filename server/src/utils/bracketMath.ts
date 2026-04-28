/** Ближайшая степень двойки ≥ n (для размера сетки на выбывание). */
export function getNextPowerOfTwo(n: number): number {
  if (n <= 0) {
    throw new Error('Количество команд должно быть положительным');
  }
  return Math.pow(2, Math.ceil(Math.log2(n)));
}
