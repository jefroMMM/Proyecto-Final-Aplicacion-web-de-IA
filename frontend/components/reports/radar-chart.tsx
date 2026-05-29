"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadarChart,
  ResponsiveContainer,
} from "recharts";

interface RadarChartProps {
  technicalScore: number;
  communicationScore: number;
  depthScore: number;
  consistencyScore: number;
}

export function RadarChart({
  technicalScore,
  communicationScore,
  depthScore,
  consistencyScore,
}: RadarChartProps) {
  const data = [
    { subject: "Técnico", score: technicalScore },
    { subject: "Comunicación", score: communicationScore },
    { subject: "Profundidad", score: depthScore },
    { subject: "Consistencia", score: consistencyScore },
  ];

  return (
    <div className="h-80 rounded-lg border border-border bg-muted/20 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart data={data}>
          <PolarGrid stroke="rgba(71,85,105,0.22)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(51,65,85,0.82)", fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            dataKey="score"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.28}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
