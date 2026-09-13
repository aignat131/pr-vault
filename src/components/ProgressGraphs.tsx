'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { getClientDb } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useExercises } from '@/context/ExercisesContext';
import { categoryStyle } from '@/lib/utils';
import type { PRHistoryEntry, PRRecord, ExerciseCategory } from '@/types';

const categoryColors: Record<ExerciseCategory, string> = {
  reps: '#34d399',    // emerald-400
  static: '#22d3ee',  // cyan-400
  weighted: '#fbbf24', // amber-400
};

function formatShortDate(ts: { seconds: number }): string {
  const d = new Date(ts.seconds * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface ChartProps {
  points: { score: number; date: { seconds: number } }[];
  category: ExerciseCategory;
  unit: string;
}

function MiniChart({ points, category, unit }: ChartProps) {
  if (points.length === 0) return null;

  const color = categoryColors[category];

  if (points.length === 1) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <div
          className="mb-2 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}20` }}
        >
          <span className="text-lg font-black" style={{ color }}>{points[0].score}</span>
        </div>
        <p className="text-[10px] text-white/30">
          {formatShortDate(points[0].date)} &middot; {points[0].score} {unit}
        </p>
        <p className="mt-2 text-xs text-white/25">Keep training to see progress!</p>
      </div>
    );
  }

  // Chart dimensions
  const W = 280;
  const H = 120;
  const padX = 36;
  const padY = 20;
  const chartW = W - padX * 2;
  const chartH = H - padY * 2;

  const scores = points.map((p) => p.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const scoreRange = maxScore - minScore || 1;

  const coords = points.map((p, i) => ({
    x: padX + (i / (points.length - 1)) * chartW,
    y: padY + chartH - ((p.score - minScore) / scoreRange) * chartH,
  }));

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ');

  // Grid lines (3 horizontal)
  const gridLines = [0, 0.5, 1].map((frac) => padY + chartH - frac * chartH);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {gridLines.map((y, i) => (
        <line
          key={i}
          x1={padX}
          y1={y}
          x2={W - padX}
          y2={y}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="4,4"
        />
      ))}

      {/* Y-axis labels */}
      <text x={padX - 4} y={padY + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="9">
        {maxScore}
      </text>
      <text x={padX - 4} y={padY + chartH + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="9">
        {minScore}
      </text>

      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Area fill */}
      <polygon
        points={`${coords[0].x},${padY + chartH} ${polyline} ${coords[coords.length - 1].x},${padY + chartH}`}
        fill={`${color}`}
        opacity="0.08"
      />

      {/* Data points */}
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="3" fill={color} />
      ))}

      {/* X-axis date labels (first and last) */}
      <text x={coords[0].x} y={H - 2} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8">
        {formatShortDate(points[0].date)}
      </text>
      <text x={coords[coords.length - 1].x} y={H - 2} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8">
        {formatShortDate(points[points.length - 1].date)}
      </text>
    </svg>
  );
}

interface ProgressGraphsProps {
  records: PRRecord[];
}

export default function ProgressGraphs({ records }: ProgressGraphsProps) {
  const { user } = useAuth();
  const exercises = useExercises();
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<PRHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  // Only show exercises with PRs
  const exercisesWithPRs = exercises.filter((e) =>
    records.some((r) => r.exerciseId === e.id),
  );

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const q = query(
        collection(getClientDb(), 'pr_history'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'asc'),
      );
      const snap = await getDocs(q);
      setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PRHistoryEntry));
    } catch (err) {
      console.error('[Progress] Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (expanded && history.length === 0) {
      fetchHistory();
    }
  }, [expanded, fetchHistory, history.length]);

  // Set default selected exercise
  useEffect(() => {
    if (!selectedExerciseId && exercisesWithPRs.length > 0) {
      setSelectedExerciseId(exercisesWithPRs[0].id);
    }
  }, [exercisesWithPRs, selectedExerciseId]);

  if (exercisesWithPRs.length === 0) return null;

  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId);
  const style = selectedExercise ? categoryStyle[selectedExercise.category] : null;

  // Build chart data: history entries + current PR as the latest point
  const historyPoints = history
    .filter((h) => h.exerciseId === selectedExerciseId)
    .map((h) => ({
      score: h.score,
      date: h.createdAt as unknown as { seconds: number },
    }));

  // If no history exists, use the current PR as the sole data point
  const currentPR = records.find((r) => r.exerciseId === selectedExerciseId);
  if (historyPoints.length === 0 && currentPR) {
    historyPoints.push({
      score: currentPR.score,
      date: currentPR.createdAt as unknown as { seconds: number },
    });
  }

  const unitLabel = selectedExercise?.category === 'reps' ? 'reps' : selectedExercise?.category === 'static' ? 'sec' : 'kg';

  return (
    <section className="px-5 md:px-8 mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between mb-3"
      >
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/50">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          Progress
        </h3>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-white/30" />
        ) : (
          <ChevronDown className="h-4 w-4 text-white/30" />
        )}
      </button>

      {expanded && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          {/* Exercise pills */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-4 -mx-1 px-1">
            {exercisesWithPRs.map((ex) => {
              const exStyle = categoryStyle[ex.category];
              const isActive = selectedExerciseId === ex.id;
              return (
                <button
                  key={ex.id}
                  onClick={() => setSelectedExerciseId(ex.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
                    isActive
                      ? `${exStyle.badge}`
                      : 'bg-white/[0.04] text-white/30 hover:bg-white/[0.08] hover:text-white/50'
                  }`}
                >
                  {ex.name}
                </button>
              );
            })}
          </div>

          {/* Chart */}
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            </div>
          ) : (
            <MiniChart
              points={historyPoints}
              category={selectedExercise?.category ?? 'reps'}
              unit={unitLabel}
            />
          )}
        </div>
      )}
    </section>
  );
}
