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
    { subject: "Technical", score: technicalScore },
    { subject: "Communication", score: communicationScore },
    { subject: "Depth", score: depthScore },
    { subject: "Consistency", score: consistencyScore },
  ];

  return (
    <div className="h-80 rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.12)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
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
