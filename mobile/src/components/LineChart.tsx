import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop, Text as SvgText } from "react-native-svg";

import { palette } from "@/theme";
import type { TrendPoint } from "@/types";

type Props = {
  points: TrendPoint[];
  baseline?: number | null;
  height?: number;
  width?: number;
  stroke?: string;
  fillId?: string;
};

export function LineChart({
  points,
  baseline,
  height = 200,
  width = 320,
  stroke = palette.accent,
  fillId = "lineFill",
}: Props) {
  if (!points.length) {
    return (
      <View style={{ height, width, justifyContent: "center", alignItems: "center" }}>
        <Svg width={width} height={height}>
          <SvgText
            x={width / 2}
            y={height / 2}
            textAnchor="middle"
            fontSize={12}
            fill={palette.textMuted}
          >
            No data yet
          </SvgText>
        </Svg>
      </View>
    );
  }

  const padding = { top: 18, right: 12, bottom: 26, left: 40 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const values = points.map((p) => p.value);
  const allValues = baseline != null ? [...values, baseline] : values;
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const span = max - min || 1;
  const pad = span * 0.15;

  const x = (i: number) =>
    padding.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) =>
    padding.top + plotH - ((v - (min - pad)) / (span + 2 * pad)) * plotH;

  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(" ");

  const area = `${d} L ${x(points.length - 1).toFixed(1)} ${padding.top + plotH} L ${x(0).toFixed(
    1
  )} ${padding.top + plotH} Z`;

  const yTicks = [min - pad, (min + max) / 2, max + pad];

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={fillId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {yTicks.map((t, i) => (
        <Line
          key={i}
          x1={padding.left}
          x2={width - padding.right}
          y1={y(t)}
          y2={y(t)}
          stroke={palette.borderSoft}
          strokeDasharray="3 6"
        />
      ))}
      {yTicks.map((t, i) => (
        <SvgText
          key={`t-${i}`}
          x={padding.left - 8}
          y={y(t) + 4}
          textAnchor="end"
          fontSize={10}
          fill={palette.textSoft}
          fontWeight="600"
        >
          {Math.round(t)}
        </SvgText>
      ))}
      {baseline != null ? (
        <Line
          x1={padding.left}
          x2={width - padding.right}
          y1={y(baseline)}
          y2={y(baseline)}
          stroke={palette.textSoft}
          strokeDasharray="4 5"
          strokeOpacity={0.6}
        />
      ) : null}
      <Path d={area} fill={`url(#${fillId})`} />
      <Path d={d} stroke={stroke} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {points.map((p, i) =>
        i === points.length - 1 ? (
          <Circle
            key={i}
            cx={x(i)}
            cy={y(p.value)}
            r={6}
            fill={palette.surface}
            stroke={stroke}
            strokeWidth={3}
          />
        ) : null
      )}
    </Svg>
  );
}
