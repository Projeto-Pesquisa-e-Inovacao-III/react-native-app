import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { getStudentTrainingMetrics } from '@constants/schedule';
import StudentTrainingMetricsSection from '../StudentTrainingMetricsSection';

jest.mock('@constants/schedule', () => ({
  getStudentTrainingMetrics: jest.fn(),
}));

jest.mock('react-native-body-highlighter', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockBody({ side }: any) {
    return React.createElement(View, { testID: `body-${side}` });
  };
});

const mockMetrics = {
  alunoId: 10,
  periodoDias: 90,
  dataInicio: '2026-08-29',
  dataFim: '2026-11-27',
  totalTreinosConcluidos: 30,
  frequenciaSemanal: 2.3,
  maxTreinosGrupo: 10,
  distribuicaoMuscular: [
    { grupoMuscular: 'PEITO' as const, quantidade: 10, percentual: 33.3 },
  ],
};

async function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('StudentTrainingMetricsSection', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('shows loading indicator while fetching and then renders KPI and heatmap', async () => {
    let resolveFn!: (value: any) => void;
    (getStudentTrainingMetrics as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      }),
    );

    await renderWithQuery(
      <StudentTrainingMetricsSection alunoId={10} />,
    );

    expect(screen.getByTestId('training-metrics-loading')).toBeOnTheScreen();

    resolveFn({ data: mockMetrics });

    expect(await screen.findByText(/2,3\s+treinos\/sem/)).toBeOnTheScreen();
    expect(screen.getByText('Distribuição muscular')).toBeOnTheScreen();
  });

  it('shows error card with retry button and refetches on press', async () => {
    (getStudentTrainingMetrics as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ data: mockMetrics });

    await renderWithQuery(<StudentTrainingMetricsSection alunoId={10} />);

    expect(
      await screen.findByText('Não foi possível carregar as métricas de treino.'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Tentar novamente'));

    await waitFor(() => {
      expect(getStudentTrainingMetrics).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText(/2,3\s+treinos\/sem/)).toBeOnTheScreen();
  });

  it('starts collapsed and toggles expand/collapse when collapsible is true', async () => {
    (getStudentTrainingMetrics as jest.Mock).mockResolvedValue({
      data: mockMetrics,
    });

    await renderWithQuery(
      <StudentTrainingMetricsSection
        alunoId={10}
        collapsible
        defaultExpanded={false}
        compact
      />,
    );

    await waitFor(() => {
      expect(getStudentTrainingMetrics).toHaveBeenCalledWith(10, 90);
    });

    expect(screen.getByText('Métricas de treino (90 dias)')).toBeOnTheScreen();
    expect(screen.queryByText('Distribuição muscular')).toBeNull();

    await fireEvent.press(screen.getByText('Métricas de treino (90 dias)'));
    expect(await screen.findByText('Distribuição muscular')).toBeOnTheScreen();
    expect(screen.getByText(/2,3\s+treinos\/sem/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Métricas de treino (90 dias)'));
    expect(screen.queryByText('Distribuição muscular')).toBeNull();
  });
});
