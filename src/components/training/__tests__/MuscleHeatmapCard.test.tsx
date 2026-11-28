import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
  formatMuscleGroupLabel,
} from '@constants/muscleGroups';
import type { MuscleGroupKey } from '@models/trainingMetrics';
import MuscleHeatmapCard, {
  HEAT_COLORS,
  MUSCLE_GROUP_TO_SLUGS,
  SLUG_TO_MUSCLE_GROUP,
  getHeatLevel,
} from '../MuscleHeatmapCard';

jest.mock('react-native-body-highlighter', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');

  return function MockBody({ side, data, onBodyPartPress }: any) {
    return React.createElement(
      View,
      { testID: `body-${side}` },
      data.map((part: any) =>
        React.createElement(
          Pressable,
          {
            key: `${side}-${part.slug}`,
            testID: `body-${side}-${part.slug}`,
            onPress: () => onBodyPartPress?.(part),
          },
          React.createElement(Text, null, `${side}:${part.slug}:${part.color}`),
        ),
      ),
    );
  };
});

const ALL_MUSCLE_GROUPS: MuscleGroupKey[] = [
  'PEITO',
  'COSTAS',
  'TRAPEZIO',
  'BICEPS',
  'TRICEPS',
  'ANTEBRACO',
  'OMBRO',
  'ABDOMEN',
  'QUADRICEPS',
  'POSTERIOR',
  'GLUTEO',
  'PANTURRILHA',
];

describe('getHeatLevel', () => {
  it('returns 0 when quantidade or maxTreinosGrupo is 0', () => {
    expect(getHeatLevel(0, 10)).toBe(0);
    expect(getHeatLevel(5, 0)).toBe(0);
    expect(getHeatLevel(-1, 10)).toBe(0);
  });

  it('returns levels 1 to 4 proportionally to maxTreinosGrupo', () => {
    expect(getHeatLevel(1, 10)).toBe(1);   // 0.10 <= 0.25
    expect(getHeatLevel(2.5, 10)).toBe(1); // 0.25 <= 0.25
    expect(getHeatLevel(4, 10)).toBe(2);   // 0.40 <= 0.50
    expect(getHeatLevel(5, 10)).toBe(2);   // 0.50 <= 0.50
    expect(getHeatLevel(7, 10)).toBe(3);   // 0.70 <= 0.75
    expect(getHeatLevel(7.5, 10)).toBe(3); // 0.75 <= 0.75
    expect(getHeatLevel(8, 10)).toBe(4);   // 0.80 > 0.75
    expect(getHeatLevel(10, 10)).toBe(4);  // max
  });
});

describe('Muscle group mappings', () => {
  it('maps all 12 muscle groups to labels, options, and body-highlighter slugs', () => {
    expect(Object.keys(MUSCLE_GROUP_LABELS).sort()).toEqual([...ALL_MUSCLE_GROUPS].sort());
    expect(MUSCLE_GROUPS.map((g) => g.value).sort()).toEqual([...ALL_MUSCLE_GROUPS].sort());
    expect(Object.keys(MUSCLE_GROUP_TO_SLUGS).sort()).toEqual([...ALL_MUSCLE_GROUPS].sort());

    for (const group of ALL_MUSCLE_GROUPS) {
      const slugs = MUSCLE_GROUP_TO_SLUGS[group];
      expect(slugs.length).toBeGreaterThan(0);
      for (const slug of slugs) {
        expect(SLUG_TO_MUSCLE_GROUP[slug]).toBe(group);
      }
    }
  });

  it('formats known and unknown muscle group labels properly', () => {
    expect(formatMuscleGroupLabel('TRICEPS')).toBe('Tríceps');
    expect(formatMuscleGroupLabel('ABDOMEN')).toBe('Abdômen');
    expect(formatMuscleGroupLabel('OUTRO')).toBe('Outro');
  });
});

describe('MuscleHeatmapCard', () => {
  it('renders front and back views and displays selected muscle details on press', async () => {
    await render(
      <MuscleHeatmapCard
        maxTreinosGrupo={12}
        distribuicaoMuscular={[
          { grupoMuscular: 'PEITO', quantidade: 12, percentual: 18.8 },
          { grupoMuscular: 'COSTAS', quantidade: 6, percentual: 9.4 },
          { grupoMuscular: 'BICEPS', quantidade: 1, percentual: 1.6 },
        ]}
      />,
    );

    expect(screen.getByText('Distribuição muscular')).toBeOnTheScreen();
    expect(screen.getByText('Frente')).toBeOnTheScreen();
    expect(screen.getByText('Costas')).toBeOnTheScreen();
    expect(screen.getByText('Toque em um músculo para ver detalhes')).toBeOnTheScreen();

    // Check colors assigned based on heat level
    expect(screen.getByText(`front:chest:${HEAT_COLORS[4]}`)).toBeOnTheScreen();
    expect(screen.getByText(`back:upper-back:${HEAT_COLORS[2]}`)).toBeOnTheScreen();
    expect(screen.getByText(`front:biceps:${HEAT_COLORS[1]}`)).toBeOnTheScreen();
    expect(screen.getByText(`front:quadriceps:${HEAT_COLORS[0]}`)).toBeOnTheScreen();

    // Tap chest on front view
    await fireEvent.press(screen.getByTestId('body-front-chest'));
    expect(screen.getByText(/Peito/)).toBeOnTheScreen();
    expect(screen.getByText(/12 treinos \(18,8%\)/)).toBeOnTheScreen();

    // Tap singular muscle (biceps = 1 treino)
    await fireEvent.press(screen.getByTestId('body-front-biceps'));
    expect(screen.getByText(/Bíceps/)).toBeOnTheScreen();
    expect(screen.getByText(/1 treino \(1,6%\)/)).toBeOnTheScreen();

    // Tap upper-back on back view -> resolves to Costas
    await fireEvent.press(screen.getByTestId('body-back-upper-back'));
    expect(screen.getByText(/Costas\s*•\s*6 treinos \(9,4%\)/)).toBeOnTheScreen();
  });

  it('renders empty state when maxTreinosGrupo is 0', async () => {
    await render(
      <MuscleHeatmapCard
        maxTreinosGrupo={0}
        distribuicaoMuscular={[]}
      />,
    );

    expect(screen.getByText('Distribuição muscular')).toBeOnTheScreen();
    expect(
      screen.getByText('Nenhum treino concluído nos últimos 90 dias.'),
    ).toBeOnTheScreen();
  });
});
