import React from 'react';
import { render, screen } from '@testing-library/react-native';

import WeeklyFrequencyKpiCard from '../WeeklyFrequencyKpiCard';

describe('WeeklyFrequencyKpiCard', () => {
  it('formats weekly frequency in pt-BR and renders default 90-day subtitle', async () => {
    await render(<WeeklyFrequencyKpiCard frequenciaSemanal={2.5} />);

    expect(screen.getByText('FREQUÊNCIA SEMANAL')).toBeOnTheScreen();
    expect(screen.getByText(/2,5\s+treinos\/sem/)).toBeOnTheScreen();
    expect(screen.getByText('Últimos 90 dias')).toBeOnTheScreen();
  });

  it('renders 0,0 treinos/sem when frequency is zero and respects custom periodoDias', async () => {
    await render(<WeeklyFrequencyKpiCard frequenciaSemanal={0} periodoDias={30} />);

    expect(screen.getByText(/0,0\s+treinos\/sem/)).toBeOnTheScreen();
    expect(screen.getByText('Últimos 30 dias')).toBeOnTheScreen();
  });
});
