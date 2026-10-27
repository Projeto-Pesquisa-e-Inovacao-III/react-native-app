import { formatCurrencyInput, parseCurrencyToNumber } from '../currency';

describe('currency utilities', () => {
  test('formatCurrencyInput formats digits progressively as BRL currency', () => {
    expect(formatCurrencyInput('')).toBe('');
    expect(formatCurrencyInput(null)).toBe('');
    expect(formatCurrencyInput(undefined)).toBe('');
    expect(formatCurrencyInput('1')).toBe('0,01');
    expect(formatCurrencyInput('15')).toBe('0,15');
    expect(formatCurrencyInput('150')).toBe('1,50');
    expect(formatCurrencyInput('1500')).toBe('15,00');
    expect(formatCurrencyInput('15000')).toBe('150,00');
    expect(formatCurrencyInput('150000')).toBe('1.500,00');
  });

  test('formatCurrencyInput filters out invalid non-numeric characters', () => {
    expect(formatCurrencyInput('abc')).toBe('');
    expect(formatCurrencyInput('R$ 150,00')).toBe('150,00');
    expect(formatCurrencyInput('150-a-00!')).toBe('150,00');
  });

  test('formatCurrencyInput formats numeric inputs properly', () => {
    expect(formatCurrencyInput(2400)).toBe('2.400,00');
    expect(formatCurrencyInput(150.5)).toBe('150,50');
    expect(formatCurrencyInput(0)).toBe('0,00');
  });

  test('parseCurrencyToNumber converts formatted currency to number float for backend', () => {
    expect(parseCurrencyToNumber('')).toBe(0);
    expect(parseCurrencyToNumber(null)).toBe(0);
    expect(parseCurrencyToNumber('0,01')).toBe(0.01);
    expect(parseCurrencyToNumber('150,00')).toBe(150);
    expect(parseCurrencyToNumber('1.500,50')).toBe(1500.5);
    expect(parseCurrencyToNumber('R$ 2.400,00')).toBe(2400);
    expect(parseCurrencyToNumber(2400)).toBe(2400);
  });
});
