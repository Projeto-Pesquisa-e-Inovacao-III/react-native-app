import { formatCurrencyInput, parseCurrencyToNumber } from '../currency';

describe('package creation payload & formatting', () => {
  test('correctly validates and prepares payload for backend', () => {
    const rawInput = {
      name: '  Pacote Hipertrofia  ',
      subtitle: '  Treino individualizado  ',
      priceText: 'R$ 2.400,00',
      deadlineText: '12',
      quantityText: '12',
      benefits: ['Treino personalizado', '', '  Acompanhamento mensal  '],
      type: 'PRESENCIAL',
    };

    const numPrice = parseCurrencyToNumber(rawInput.priceText);
    const numDeadline = Number(rawInput.deadlineText);
    const filteredBenefits = rawInput.benefits
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    const payload = {
      titulo: rawInput.name.trim(),
      subtitulo: rawInput.subtitle.trim(),
      descricao: rawInput.subtitle.trim(),
      tipoAula: rawInput.type,
      preco: numPrice,
      duracaoMes: numDeadline,
      quantidadeAula: Number(rawInput.quantityText),
      beneficios: filteredBenefits.map((valor) => ({ valor })),
      tipoProduto: 'PACOTE',
      status: 'ATIVO',
      periodo: numDeadline === 1 ? '1 mês' : `${numDeadline} meses`,
    };

    expect(payload.preco).toBe(2400);
    expect(typeof payload.preco).toBe('number');
    expect(payload.duracaoMes).toBe(12);
    expect(payload.periodo).toBe('12 meses');
    expect(payload.status).toBe('ATIVO');
    expect(payload.beneficios).toHaveLength(2);
    expect(payload.beneficios[0].valor).toBe('Treino personalizado');
    expect(payload.beneficios[1].valor).toBe('Acompanhamento mensal');
  });

  test('validates 1 month period singular label', () => {
    const numDeadline = 1;
    const periodo = numDeadline === 1 ? '1 mês' : `${numDeadline} meses`;
    expect(periodo).toBe('1 mês');
  });

  test('handles decimal price formatting correctly', () => {
    const typed = '240050';
    const formatted = formatCurrencyInput(typed);
    expect(formatted).toBe('2.400,50');

    const parsed = parseCurrencyToNumber(formatted);
    expect(parsed).toBe(2400.5);
  });

  test('validates price limit of 9999', () => {
    expect(parseCurrencyToNumber('9.999,00')).toBe(9999);
    expect(parseCurrencyToNumber('9.999,00') <= 9999).toBe(true);
    expect(parseCurrencyToNumber('9.999,01') > 9999).toBe(true);
    expect(parseCurrencyToNumber('10.000,00') > 9999).toBe(true);
  });
});
