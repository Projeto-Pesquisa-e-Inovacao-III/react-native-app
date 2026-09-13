import { useState } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { DashboardSeriesPoint } from "src/models/dashboard";
import { formatNumber } from "src/utils/formatacao";

type ChartProps = {
  title: string;
  legend: string;
  data: DashboardSeriesPoint[];
  type: "bar" | "line";
  color?: string;
};

function getNiceTickStep(maxValue: number) {
  const roughStep = Math.max(maxValue, 1) / 5;
  const magnitude = Math.max(1, 10 ** Math.floor(Math.log10(roughStep)));
  const normalizedStep = roughStep / magnitude;
  const multiplier = normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10;

  return multiplier * magnitude;
}

function EmptyChart({ title }: { title: string }) {
  return (
    <View style={styles.emptyChart}>
      <Text style={styles.chartTitle}>{title}</Text>
      <Text style={styles.mutedText}>Nenhum dado encontrado.</Text>
    </View>
  );
}

export default function DashboardChart({ title, data, type, color = "#0f172a" }: ChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [cardWidth, setCardWidth] = useState(0);
  const fallbackWidth = Math.min(Math.max(screenWidth - 64, 1), 688);
  const width = Math.max((cardWidth || fallbackWidth) - 32, 1);
  const height = 230;
  const plotWidth = Math.max(width - 54, 1);
  const plotHeight = 150;
  const left = 42;
  const top = 26;
  const dataMaxValue = Math.max(...data.map((point) => point.value), 1);
  const tickStep = getNiceTickStep(dataMaxValue);
  const tickCount = Math.ceil(dataMaxValue / tickStep);
  const maxValue = tickCount * tickStep;
  const lineInset = Math.min(28, plotWidth / 4);
  const linePlotWidth = Math.max(plotWidth - lineInset * 2, 1);
  const step = data.length > 1 ? linePlotWidth / (data.length - 1) : linePlotWidth;
  const barStep = plotWidth / Math.max(data.length, 1);
  const barWidth = Math.max(1, Math.min(32, barStep * 0.62));
  const points = data.map((point, index) => ({
    ...point,
    x: data.length > 1 ? left + lineInset + index * step : left + lineInset + linePlotWidth / 2,
    y: top + plotHeight - (point.value / maxValue) * plotHeight,
  }));
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const labels = points
    .map((point, index) => ({ point, index }))
    .filter(({ index }) => data.length <= 7 || index % 2 === 0);
  const yTicks = Array.from({ length: tickCount + 1 }, (_, index) => index / tickCount);

  if (data.length === 0) return <EmptyChart title={title} />;

  return (
    <View
      style={styles.chartCard}
      onLayout={({ nativeEvent }) => {
        const nextWidth = Math.round(nativeEvent.layout.width);
        if (nextWidth !== cardWidth) setCardWidth(nextWidth);
      }}
    >
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{title}</Text>
      </View>
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        accessibilityLabel={title}
      >
        {yTicks.map((ratio) => {
          const y = top + plotHeight * ratio;
          return <Line key={ratio} x1={left} x2={width - 12} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
        })}
        {type === "bar"
          ? points.map((point, index) => (
              <Rect
                key={`${point.month}-${point.x}`}
                x={left + index * barStep + (barStep - barWidth) / 2}
                y={point.y}
                width={barWidth}
                height={Math.max(0, top + plotHeight - point.y)}
                rx="4"
                fill={color}
              />
            ))
          : <>
              <Path d={linePath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((point) => <Circle key={`${point.month}-${point.x}`} cx={point.x} cy={point.y} r="4" fill="#ffffff" stroke={color} strokeWidth="2" />)}
            </>}
        {yTicks.map((ratio) => {
          const y = top + plotHeight * ratio;
          return (
            <SvgText key={`y-label-${ratio}`} x="4" y={y + 4} fill="#64748b" fontSize="10">
              {formatNumber(maxValue * (1 - ratio))}
            </SvgText>
          );
        })}
        {labels.map(({ point, index }) => (
          <SvgText
            key={`label-${point.month}-${index}`}
            x={type === "bar" ? left + index * barStep + barStep / 2 : point.x}
            y={height - 16}
            fill="#64748b"
            fontSize="10"
            textAnchor="middle"
          >
            {point.month.slice(0, 3)}
          </SvgText>
        ))}
      </Svg>
      <Text style={styles.axisLabel}>Meses</Text>
    </View>
  );
}

const styles = StyleSheet.create({
    emptyChart: {
      backgroundColor: "#ffffff",
      borderRadius: 14,
      minHeight: 120,
      padding: 16,
      justifyContent: "center",
      gap: 10
    },
    mutedText: {
      color: "#64748b",
      fontSize: 14
    },
    chartCard: {
      backgroundColor: "#ffffff",
      borderRadius: 14,
      padding: 16,
      boxShadow: "0px 4px 10px rgba(15, 23, 42, 0.07)",
      elevation: 2,
      overflow: "hidden"
    },
    chartHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4
    },
    chartTitle: {
      color: "#0f172a",
      fontSize: 17,
      fontWeight: "800"
    },
    axisLabel: {
      alignSelf: "center",
      color: "#64748b",
      fontSize: 12,
      paddingTop: 5
    },
});