import { useEffect, useMemo, useState } from 'react';

type Goal = 'lose_easy' | 'lose_fast' | 'maintain' | 'energy' | 'muscle';
type TrackingMode = 'flexible' | 'strict';

type FoodLog = {
  id: string;
  text: string;
  estimate: number;
  createdAt: string;
};

type ProgressEntry = {
  date: string;
  weight?: number;
  consistency: boolean;
};

type PlanItem = {
  breakfast: string;
  lunch: string;
  dinner: string;
  snack: string;
};

const GOAL_META: Record<Goal, { label: string; copy: string }> = {
  lose_easy: {
    label: 'Lose fat (easy)',
    copy: 'Gentle fat-loss pace that leaves room for social meals and steady habits.',
  },
  lose_fast: {
    label: 'Lose fat (fast)',
    copy: 'A stronger fat-loss push for short periods while still protecting energy.',
  },
  maintain: {
    label: 'Maintain weight',
    copy: 'Stay steady while building consistency and reducing food stress.',
  },
  energy: {
    label: 'Gain energy / feel better',
    copy: 'Eat enough to feel focused, less foggy, and more stable through the day.',
  },
  muscle: {
    label: 'Build muscle',
    copy: 'Fuel training and recovery with a slight surplus and simple meal rhythm.',
  },
};

const FOOD_LIBRARY: Array<{ keywords: string[]; calories: number }> = [
  { keywords: ['mcdonald', 'meal', 'combo'], calories: 950 },
  { keywords: ['school lunch', 'cafeteria'], calories: 700 },
  { keywords: ['pizza', 'slice'], calories: 285 },
  { keywords: ['chicken rice bowl', 'rice bowl'], calories: 620 },
  { keywords: ['burrito'], calories: 760 },
  { keywords: ['salad'], calories: 420 },
  { keywords: ['protein shake'], calories: 250 },
  { keywords: ['sushi'], calories: 520 },
  { keywords: ['sandwich'], calories: 540 },
];

const PLAN_LIBRARY: Record<Goal, PlanItem[]> = {
  lose_easy: [
    {
      breakfast: 'Greek yogurt + berries + granola handful',
      lunch: 'Chicken wrap + apple',
      dinner: 'Salmon rice bowl + veggies',
      snack: 'Protein bar or fruit',
    },
  ],
  lose_fast: [
    {
      breakfast: 'Egg scramble + toast',
      lunch: 'Turkey sandwich + carrots',
      dinner: 'Lean beef stir-fry + rice',
      snack: 'Cottage cheese + fruit',
    },
  ],
  maintain: [
    {
      breakfast: 'Oatmeal + banana + peanut butter',
      lunch: 'Burrito bowl',
      dinner: 'Pasta + chicken + side salad',
      snack: 'Trail mix handful',
    },
  ],
  energy: [
    {
      breakfast: 'Bagel + eggs + fruit',
      lunch: 'Chicken rice bowl',
      dinner: 'Sweet potato, chicken, avocado plate',
      snack: 'Yogurt + honey',
    },
  ],
  muscle: [
    {
      breakfast: 'Overnight oats + protein + banana',
      lunch: 'Double-protein burrito bowl',
      dinner: 'Steak bowl with rice and beans',
      snack: 'Protein shake + nuts',
    },
  ],
};

const defaultProgress: ProgressEntry[] = [];

function getCalorieRange(weight: number, goal: Goal): { min: number; max: number; target: number } {
  const base = weight * 14;

  switch (goal) {
    case 'lose_easy':
      return { min: base - 300, max: base - 200, target: base - 250 };
    case 'lose_fast':
      return { min: base - 600, max: base - 400, target: base - 500 };
    case 'maintain':
      return { min: base - 100, max: base + 100, target: base };
    case 'energy':
      return { min: base, max: base + 200, target: base + 100 };
    case 'muscle':
      return { min: base + 200, max: base + 400, target: base + 300 };
    default:
      return { min: base - 100, max: base + 100, target: base };
  }
}

function estimateCaloriesFromText(foodText: string): number {
  const input = foodText.toLowerCase();
  const numberMatch = input.match(/(\d+)\s*(slice|slices|piece|pieces|taco|tacos|burger|burgers)/);

  const keywordHit = FOOD_LIBRARY.find((item) =>
    item.keywords.some((keyword) => input.includes(keyword)),
  );

  let estimate = keywordHit?.calories ?? 550;

  if (numberMatch) {
    const qty = Number(numberMatch[1]);
    if (input.includes('pizza') && qty > 0) {
      estimate = qty * 285;
    } else {
      estimate = Math.round(estimate * Math.max(1, qty * 0.8));
    }
  }

  return Math.max(150, Math.round(estimate));
}

function formatDateLabel(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

const STORAGE_KEY = 'smartcal-v1';

function App() {
  const [name, setName] = useState('');
  const [weight, setWeight] = useState(160);
  const [goal, setGoal] = useState<Goal>('lose_easy');
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('flexible');
  const [foodInput, setFoodInput] = useState('');
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [progress, setProgress] = useState<ProgressEntry[]>(defaultProgress);
  const [weightInput, setWeightInput] = useState('');
  const [dailyPlan, setDailyPlan] = useState<PlanItem | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) return;

    try {
      const parsed = JSON.parse(cached) as Partial<{
        name: string;
        weight: number;
        goal: Goal;
        trackingMode: TrackingMode;
        foodLogs: FoodLog[];
        progress: ProgressEntry[];
        dailyPlan: PlanItem | null;
      }>;

      if (parsed.name) setName(parsed.name);
      if (parsed.weight) setWeight(parsed.weight);
      if (parsed.goal) setGoal(parsed.goal);
      if (parsed.trackingMode) setTrackingMode(parsed.trackingMode);
      if (parsed.foodLogs) setFoodLogs(parsed.foodLogs);
      if (parsed.progress) setProgress(parsed.progress);
      if (parsed.dailyPlan) setDailyPlan(parsed.dailyPlan);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        name,
        weight,
        goal,
        trackingMode,
        foodLogs,
        progress,
        dailyPlan,
      }),
    );
  }, [name, weight, goal, trackingMode, foodLogs, progress, dailyPlan]);

  const calorieRange = useMemo(() => getCalorieRange(weight, goal), [weight, goal]);
  const consumed = useMemo(() => foodLogs.reduce((acc, log) => acc + log.estimate, 0), [foodLogs]);
  const remaining = calorieRange.target - consumed;

  const weeklyConsistency = useMemo(() => {
    const last7 = progress.slice(-7);
    return last7.filter((entry) => entry.consistency).length;
  }, [progress]);

  const trendText = useMemo(() => {
    const weighted = progress.filter((entry) => typeof entry.weight === 'number');
    if (weighted.length < 2) return 'Not enough data yet — add optional weekly weigh-ins.';
    const first = weighted[0].weight ?? 0;
    const last = weighted[weighted.length - 1].weight ?? 0;
    const diff = Number((last - first).toFixed(1));

    if (diff === 0) return 'Weight is steady this period.';
    if (diff < 0) return `Down ${Math.abs(diff)} lb in your logged trend.`;
    return `Up ${diff} lb in your logged trend.`;
  }, [progress]);

  function addFoodLog() {
    if (!foodInput.trim()) return;
    const estimate = estimateCaloriesFromText(foodInput);
    const entry: FoodLog = {
      id: crypto.randomUUID(),
      text: foodInput.trim(),
      estimate,
      createdAt: new Date().toISOString(),
    };

    setFoodLogs((prev) => [entry, ...prev].slice(0, 30));
    setFoodInput('');
  }

  function addProgressCheckpoint() {
    const numericWeight = Number(weightInput);
    const entry: ProgressEntry = {
      date: new Date().toISOString(),
      consistency: true,
      weight: Number.isFinite(numericWeight) && numericWeight > 0 ? numericWeight : undefined,
    };

    setProgress((prev) => [...prev, entry].slice(-30));
    setWeightInput('');
  }

  function generatePlan() {
    const [plan] = PLAN_LIBRARY[goal];
    if (!plan) return;

    if (trackingMode === 'strict') {
      setDailyPlan(plan);
      return;
    }

    setDailyPlan({
      ...plan,
      snack: `${plan.snack} (optional based on hunger)`,
    });
  }

  const statusMessage =
    trackingMode === 'strict'
      ? remaining >= 0
        ? `You are ${remaining} calories under target.`
        : `You are ${Math.abs(remaining)} calories over target.`
      : consumed <= calorieRange.max
      ? 'You are on track — consistency beats perfection.'
      : 'Slightly over today. No stress: adjust lightly tomorrow.';

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="eyebrow">SmartCal</p>
        <h1>The calorie coach for real life.</h1>
        <p>
          No macro obsession. No guilt streaks. Just simple targets, food estimates, and weekly momentum
          for beginners.
        </p>
      </header>

      <main className="grid">
        <section className="card">
          <h2>1) Goal-Based Calorie Mode</h2>
          <label>
            First name (optional)
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex" />
          </label>
          <label>
            Weight (lb)
            <input
              type="number"
              value={weight}
              min={80}
              max={400}
              onChange={(event) => setWeight(Number(event.target.value))}
            />
          </label>
          <label>
            Goal
            <select value={goal} onChange={(event) => setGoal(event.target.value as Goal)}>
              {Object.entries(GOAL_META).map(([value, info]) => (
                <option key={value} value={value}>
                  {info.label}
                </option>
              ))}
            </select>
          </label>

          <div className="surface">
            <strong>
              {trackingMode === 'flexible'
                ? `${Math.round(calorieRange.min)}–${Math.round(calorieRange.max)} cal/day`
                : `${Math.round(calorieRange.target)} cal/day`}
            </strong>
            <p>{GOAL_META[goal].copy}</p>
          </div>
        </section>

        <section className="card">
          <h2>2) Real-Life Food Input</h2>
          <p className="muted">Type what you actually ate: “school lunch”, “2 slices pizza”, “chicken rice bowl”.</p>
          <div className="row">
            <input
              value={foodInput}
              onChange={(event) => setFoodInput(event.target.value)}
              placeholder="e.g. McDonald’s meal"
            />
            <button onClick={addFoodLog}>Estimate</button>
          </div>

          <div className="surface">
            <p>
              Today estimate:{' '}
              <strong>
                {trackingMode === 'strict'
                  ? `${consumed} cal`
                  : `${Math.max(0, consumed - 120)}–${consumed + 120} cal`}
              </strong>
            </p>
            <p>{statusMessage}</p>
          </div>

          <ul className="list">
            {foodLogs.map((log) => (
              <li key={log.id}>
                <span>{log.text}</span>
                <strong>~{log.estimate} cal</strong>
              </li>
            ))}
            {foodLogs.length === 0 && <li className="muted">No meals logged yet.</li>}
          </ul>
        </section>

        <section className="card">
          <h2>3) Stress-Free Mode</h2>
          <div className="toggle-wrap">
            <button
              className={trackingMode === 'flexible' ? 'active' : ''}
              onClick={() => setTrackingMode('flexible')}
            >
              Flexible tracking ✅
            </button>
            <button
              className={trackingMode === 'strict' ? 'active' : ''}
              onClick={() => setTrackingMode('strict')}
            >
              Strict tracking
            </button>
          </div>
          <p className="muted">
            Flexible mode is default: ranges + coaching language to reduce all-or-nothing thinking.
          </p>
        </section>

        <section className="card">
          <h2>4) One-Click Daily Plan</h2>
          <p className="muted">Simple meal structure from your goal and tracking style.</p>
          <button onClick={generatePlan}>Generate today’s simple plan</button>
          {dailyPlan && (
            <div className="surface">
              <p>
                <strong>Breakfast:</strong> {dailyPlan.breakfast}
              </p>
              <p>
                <strong>Lunch:</strong> {dailyPlan.lunch}
              </p>
              <p>
                <strong>Dinner:</strong> {dailyPlan.dinner}
              </p>
              <p>
                <strong>Snack:</strong> {dailyPlan.snack}
              </p>
            </div>
          )}
        </section>

        <section className="card">
          <h2>5) Progress Without Obsession</h2>
          <p className="muted">Track weekly consistency and optional weigh-ins only.</p>
          <div className="row">
            <input
              type="number"
              value={weightInput}
              placeholder="Optional weight"
              onChange={(event) => setWeightInput(event.target.value)}
            />
            <button onClick={addProgressCheckpoint}>Log weekly check-in</button>
          </div>

          <div className="surface">
            <p>
              <strong>{weeklyConsistency} / 7</strong> consistent days this week
            </p>
            <p>{trendText}</p>
          </div>

          <ul className="list compact">
            {progress
              .slice()
              .reverse()
              .map((entry, index) => (
                <li key={`${entry.date}-${index}`}>
                  <span>{formatDateLabel(entry.date)}</span>
                  <span>{entry.weight ? `${entry.weight} lb` : 'Consistency check'}</span>
                </li>
              ))}
            {progress.length === 0 && <li className="muted">No weekly check-ins yet.</li>}
          </ul>
        </section>

        <section className="card pricing">
          <h2>Monetization: simple and fair</h2>
          <div className="price-grid">
            <article>
              <h3>Free</h3>
              <p>Goal mode + calorie target + stress-free logging.</p>
            </article>
            <article>
              <h3>SmartCal Plus — $7/mo</h3>
              <p>Unlimited AI food estimates, auto daily plans, and deeper weekly insights.</p>
            </article>
          </div>
        </section>
      </main>

      <footer>
        Built for {name || 'real people'} who want progress without burnout.
      </footer>
    </div>
  );
}

export default App;
