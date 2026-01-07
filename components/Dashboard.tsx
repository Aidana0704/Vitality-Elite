
import React, { useMemo } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  RadialBarChart,
  RadialBar,
  Legend,
  PolarAngleAxis
} from 'recharts';
import { HealthLog, UserProfile, DailyWorkout, Language, DailyMealPlan, Meal } from '../types';
import { translations } from '../translations';

interface DashboardProps {
  logs: HealthLog[];
  profile: UserProfile;
  workoutPlan: DailyWorkout[];
  language: Language;
}

const Dashboard: React.FC<DashboardProps> = React.memo(({ logs, profile, workoutPlan, language }) => {
  const t = translations[language];

  const latestLog = useMemo(() => logs[logs.length - 1] || {
    weight: 0,
    caloriesConsumed: 0,
    caloriesBurned: 0,
    waterIntake: 0,
    protein: 0,
    carbs: 0,
    fats: 0
  }, [logs]);

  // Calculations for Adherence Score
  const integrityData = useMemo(() => {
    let mealPoints = 0;
    let workoutPoints = 0;
    
    // Meal Adherence
    try {
      const consumed = JSON.parse(localStorage.getItem('vitality_consumed_meals') || '{}');
      const plans: DailyMealPlan[] = JSON.parse(localStorage.getItem('vitality_meal_plans') || '[]');
      if (plans.length > 0) {
        const todayPlan = plans[0];
        const mealList = [todayPlan.breakfast, todayPlan.lunch, todayPlan.dinner, ...(todayPlan.snacks || [])];
        const completed = mealList.filter(m => consumed[m.name]).length;
        mealPoints = Math.round((completed / Math.max(1, mealList.length)) * 100);
      }
    } catch (e) {}

    // Workout Adherence
    try {
      const completedExercises = JSON.parse(localStorage.getItem('vitality_completed_exercises') || '{}');
      if (workoutPlan.length > 0) {
        const todayWorkout = workoutPlan[0];
        const completedCount = (todayWorkout.exercises || []).filter(ex => completedExercises[ex.name]).length;
        workoutPoints = Math.round((completedCount / Math.max(1, (todayWorkout.exercises || []).length)) * 100);
      }
    } catch (e) {}

    const total = Math.round((mealPoints + workoutPoints) / 2);
    return { mealPoints, workoutPoints, total };
  }, [workoutPlan]);

  const stats = useMemo(() => [
    { label: t.currentWeight, value: `${latestLog.weight} kg`, change: '-0.5kg', color: 'text-blue-500' },
    { label: t.netCalories, value: latestLog.caloriesConsumed - latestLog.caloriesBurned, change: t.today, color: 'text-orange-500' },
    { label: t.waterIntake, value: `${((latestLog.waterIntake || 0) / 1000).toFixed(1)}L`, target: '3.0L', color: 'text-cyan-500' },
    { label: t.streak, value: `${logs.length} Days`, change: '+2', color: 'text-green-500' },
  ], [latestLog, logs.length, t]);

  const goals = useMemo(() => {
    let p = profile.weight * 2, c = profile.weight * 3.5, f = profile.weight * 0.8;
    if (profile.goal === 'Weight Loss') { p *= 1.1; c *= 0.6; f *= 0.8; }
    else if (profile.goal === 'Muscle Gain') { p *= 1.25; c *= 1.4; f *= 1.2; }
    return { protein: Math.round(p), carbs: Math.round(c), fats: Math.round(f) };
  }, [profile.weight, profile.goal]);
  
  const macroData = useMemo(() => [
    { name: t.protein, value: latestLog.protein || 0, target: goals.protein, fill: '#3b82f6' },
    { name: t.carbs, value: latestLog.carbs || 0, target: goals.carbs, fill: '#22c55e' },
    { name: t.fats, value: latestLog.fats || 0, target: goals.fats, fill: '#eab308' },
  ], [latestLog, goals, t]);

  const integrityChartData = [{ value: integrityData.total }];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-[#111] border border-white/5 p-6 rounded-3xl hover:border-blue-500/30 transition-all group relative overflow-hidden bg-gradient-to-br from-[#111] to-[#0a0a0a]">
            <p className="text-[10px] text-gray-500 mb-2 uppercase font-black tracking-[0.2em]">{stat.label}</p>
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl font-black italic tracking-tighter ${stat.color}`}>{stat.value}</span>
              {stat.change && <span className="text-[8px] text-gray-400 font-black bg-white/5 px-2 py-0.5 rounded-full">{stat.change}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-8">
          {/* Main Analytics Hub */}
          <div className="bg-[#111] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 p-8 opacity-5 font-black text-8xl italic select-none">DATA</div>
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">{t.performanceFlux}</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Biometric Signal Tracking</p>
              </div>
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div><span className="text-[8px] text-gray-500 font-black uppercase">Intake</span></div>
                <div className="flex items-center space-x-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div><span className="text-[8px] text-gray-500 font-black uppercase">Weight</span></div>
              </div>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={logs}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#222" vertical={false} />
                  <XAxis dataKey="date" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ background: '#0a0a0a', border: '1px solid #333', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Bar yAxisId="left" dataKey="caloriesConsumed" name={t.intake} fill="#f97316" opacity={0.3} radius={[6, 6, 0, 0]} barSize={20} />
                  <Line yAxisId="left" type="monotone" dataKey="weight" name={t.currentWeight} stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Adherence Scoring */}
             <div className="bg-[#111] border border-white/5 p-8 rounded-[2.5rem] flex flex-col items-center justify-center relative group">
                <div className="absolute top-6 left-8">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">{t.fidelityScore}</h4>
                </div>
                <div className="h-64 w-64 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="75%" outerRadius="100%" barSize={12} data={integrityChartData} startAngle={90} endAngle={450}>
                      <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                      <RadialBar background dataKey="value" cornerRadius={30} fill={integrityData.total > 80 ? '#10b981' : '#3b82f6'} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black italic tracking-tighter text-white">{integrityData.total}%</span>
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">Protocol Sync</span>
                  </div>
                </div>
                <div className="w-full grid grid-cols-2 gap-4 mt-4">
                   <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                      <p className="text-[8px] text-gray-500 font-black uppercase mb-1">Nutrition</p>
                      <p className="text-lg font-black text-emerald-500 italic">{integrityData.mealPoints}%</p>
                   </div>
                   <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                      <p className="text-[8px] text-gray-500 font-black uppercase mb-1">Training</p>
                      <p className="text-lg font-black text-blue-500 italic">{integrityData.workoutPoints}%</p>
                   </div>
                </div>
             </div>

             {/* Bio-Active Focus */}
             <div className="bg-blue-600/5 border border-blue-500/10 p-8 rounded-[2.5rem] relative overflow-hidden group">
                <div className="absolute -right-6 -bottom-6 text-9xl grayscale opacity-5 group-hover:grayscale-0 group-hover:opacity-10 transition-all duration-700">🧬</div>
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic mb-6">{t.bioActive} Insights</h4>
                <div className="space-y-6 relative z-10">
                   <p className="text-sm text-gray-400 leading-relaxed italic">
                     "Based on your recent adherence flux, your metabolic recovery window is peaking. Focus on high-fidelity protein intake in the next 4 hours to maximize anabolic signaling."
                   </p>
                   <div className="pt-4 border-t border-white/5">
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Protocol Optimization</p>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-xl">🥗</div>
                        <div>
                          <p className="text-[10px] font-black text-white uppercase italic">Increased Hydration Cycle</p>
                          <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Target: +500ml Pre-Workout</p>
                        </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-8">
          <div className="bg-[#111] border border-white/5 p-8 rounded-[2.5rem] shadow-xl">
             <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-10 text-center">{t.macroSynergy}</h3>
             <div className="h-[250px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="100%" barSize={12} data={macroData}>
                   <RadialBar background dataKey="value" cornerRadius={20} />
                   <Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                 </RadialBarChart>
               </ResponsiveContainer>
             </div>
             <div className="mt-8 space-y-4">
                {macroData.map((m, i) => (
                  <div key={i} className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest italic">
                    <span className="text-gray-500">{m.name}</span>
                    <span className="text-white">{m.value}g / {m.target}g</span>
                  </div>
                ))}
             </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-950 to-black border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent)]"></div>
             <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] italic mb-6">{t.performanceNote}</h4>
             <p className="text-xs text-gray-400 leading-relaxed font-bold italic relative z-10">
               "System stability is optimal. Your current split for {profile.experienceLevel} level is yielding high force-output consistency. Stay the course on the evening recovery protocol."
             </p>
             <div className="mt-8 flex justify-end">
                <span className="text-[8px] font-black text-indigo-600 uppercase tracking-[0.5em] italic">Vitality AI Lab</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Dashboard;
