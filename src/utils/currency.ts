export function formatCurrencyInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';

  if (typeof value === 'number') {
    if (isNaN(value)) return '';
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const digits = value.replace(/\D/g, '');
  if (!digits) return '';

  const cents = parseInt(digits, 10);
  const floatVal = cents / 100;
  return floatVal.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseCurrencyToNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;

  const digits = value.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}
