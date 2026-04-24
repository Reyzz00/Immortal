import Svg, { Circle, Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";

import { palette, scoreColor } from "@/theme";

type Props = {
  value: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
};

export function ScoreRing({ value, label, size = 200, strokeWidth = 16 }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const dash = (clamped / 100) * circumference;
  const color = scoreColor(clamped);

  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity="1" />
          <Stop offset="100%" stopColor={palette.accentDeep} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={palette.surfaceAlt}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="url(#ring)"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <SvgText
        x={size / 2}
        y={size / 2 + size * 0.03}
        textAnchor="middle"
        fontSize={size * 0.3}
        fontWeight="800"
        fill={palette.text}
      >
        {Math.round(clamped)}
      </SvgText>
      {label ? (
        <SvgText
          x={size / 2}
          y={size / 2 + size * 0.2}
          textAnchor="middle"
          fontSize={11}
          fill={palette.textMuted}
          fontWeight="600"
          letterSpacing={2}
        >
          {label}
        </SvgText>
      ) : null}
    </Svg>
  );
}
