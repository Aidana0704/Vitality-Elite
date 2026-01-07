
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
  Legend
} from 'recharts';
import { HealthLog, UserProfile, DailyWorkout, Language, DailyMealPlan } from '../types';
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

  // Fetch the meal plan from local storage to show on the dashboard
  const dailyPlan: DailyMealPlan | null = useMemo(() => {
    try {
      const saved = localStorage.getItem('vitality_meal_plans');
      if (saved) {
        const plans = JSON.parse(saved);
        // Ensure plans is an array before accessing the first element
        return Array.isArray(plans) && plans.length > 0 ? plans[0] : null;
      }
    } catch (e) {
      console.error("Failed to load plans for dashboard", e);
    }
    return null;
  }, []);

  const calorieDiff = useMemo(() => latestLog.caloriesConsumed - latestLog.caloriesBurned, [latestLog]);
  
  const stats = useMemo(() => [
    { label: t.currentWeight, value: `${latestLog.weight} kg`, change: '-0.5kg', color: 'text-blue-500' },
    { label: t.netCalories, value: calorieDiff, change: t.today, color: 'text-orange-500' },
    { label: t.waterIntake, value: `${((latestLog.waterIntake || 0) / 1000).toFixed(1)}L`, target: '3.0L', color: 'text-cyan-500' },
    { label: t.streak, value: `${logs.length} Days`, change: '+2', color: 'text-green-500' },
  ], [latestLog, calorieDiff, logs.length, t]);

  const goals = useMemo(() => {
    let protein = profile.weight * 2;
    let carbs = profile.weight * 3.5;
    let fats = profile.weight * 0.8;

    if (profile.goal === 'Weight Loss') {
      protein = profile.weight * 2.2;
      carbs = profile.weight * 2;
      fats = profile.weight * 0.6;
    } else if (profile.goal === 'Muscle Gain') {
      protein = profile.weight * 2.5;
      carbs = profile.weight * 5;
      fats = profile.weight * 1;
    } else if (profile.goal === 'Athletic Performance') {
      protein = profile.weight * 2;
      carbs = profile.weight * 6;
      fats = profile.weight * 0.9;
    }

    return { protein: Math.round(protein), carbs: Math.round(carbs), fats: Math.round(fats) };
  }, [profile.weight, profile.goal]);
  
  const macroData = useMemo(() => [
    { name: t.protein, value: latestLog.protein || 0, target: goals.protein, fill: '#3b82f6' },
    { name: t.carbs, value: latestLog.carbs || 0, target: goals.carbs, fill: '#22c55e' },
    { name: t.fats, value: latestLog.fats || 0, target: goals.fats, fill: '#eab308' },
  ], [latestLog, goals, t]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a1a] border border-[#333] p-3 rounded-lg shadow-xl backdrop-blur-md">
          <p className="text-gray-400 text-[10px] mb-1 uppercase tracking-widest">{label}</p>
          {payload.map((p: any, i: number) => (
             <p key={i} className="text-sm font-bold" style={{ color: p.color }}>
               {p.name}: {p.value}
             </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-[#111] border border-[#222] p-5 rounded-2xl hover:border-blue-500/30 transition-all group overflow-hidden bg-gradient-to-br from-[#111] to-[#0a0a0a]">
            <p className="text-[10px] text-gray-500 mb-1 uppercase font-bold tracking-widest">{stat.label}</p>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-black ${stat.color}`}>{stat.value}</span>
              {stat.change && <span className="text-[9px] text-gray-500 font-bold bg-[#1a1a1a] px-2 py-0.5 rounded-full border border-white/5">{stat.change}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          {/* Main Performance Chart */}
          <div className="bg-[#111] border border-[#222] p-6 rounded-[2rem] shadow-2xl">
            <div className="flex items-center justify-between mb-8 px-2">
              <h3 className="text-lg font-bold text-gray-200 uppercase tracking-tighter">{t.performanceFlux}</h3>
              <div className="flex space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Intake</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Weight</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                <ComposedChart data={logs}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="date" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar yAxisId="left" dataKey="caloriesConsumed" name={t.intake} fill="#f97316" opacity={0.4} radius={[4, 4, 0, 0]} barSize={16} />
                  <Line yAxisId="left" type="monotone" dataKey="weight" name={t.currentWeight} stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0, fill: '#fff' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Nutrition Protocol Preview - Optimized for clear daily plan view */}
          <div className="bg-[#111] border border-[#222] p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-8 opacity-5 pointer-events-none">
              <span className="text-8xl font-black italic">FUEL</span>
            </div>
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em]">Active Nutrition Protocol</h3>
                {dailyPlan && <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest italic">{dailyPlan.day} Execution</span>}
              </div>

              {dailyPlan ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { label: 'Breakfast', meal: dailyPlan.breakfast, time: '07:30', icon: '☀️' },
                    { label: 'Snack I', meal: dailyPlan.snacks?.[0], time: '10:30', icon: '🍎' },
                    { label: 'Lunch', meal: dailyPlan.lunch, time: '13:00', icon: '中午' },
                    { label: 'Snack II', meal: dailyPlan.snacks?.[1], time: '16:00', icon: '☕' },
                    { label: 'Dinner', meal: dailyPlan.dinner, time: '19:30', icon: '🌙' }
                  ].map((item, i) => (
                    <div key={i} className="bg-black/40 p-4 rounded-3xl border border-white/5 hover:border-emerald-500/40 transition-all flex flex-col justify-between h-32 group/item">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[7px] text-gray-600 font-black uppercase tracking-widest">{item.time}</p>
                          <span className="text-xs grayscale group-hover/item:grayscale-0 transition-all">{item.icon}</span>
                        </div>
                        <p className="text-[10px] font-black text-white uppercase italic truncate">{item.meal?.name || 'Protocol Standby'}</p>
                      </div>
                      <div className="flex items-center justify-between text-[8px] font-bold text-gray-500 uppercase mt-2">
                        <span>{item.meal?.calories || 0} kcal</span>
                        <span className="text-emerald-500">{item.meal?.protein || 0}g P</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center bg-black/20 rounded-[2rem] border border-dashed border-[#333] flex flex-col items-center justify-center">
                   <div className="w-12 h-12 bg-[#111] rounded-2xl flex items-center justify-center mb-4 shadow-xl">
                      <span className="text-2xl">🍱</span>
                   </div>
                   <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Nutritional Matrix Offline</p>
                   <p className="text-[8px] text-gray-600 font-bold uppercase tracking-[0.2em] mt-3 italic max-w-xs leading-relaxed">
                     Visit the Meal Plan sector to generate your high-fidelity dietary itinerary and prep strategy.
                   </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <div className="bg-[#111] border border-[#222] p-6 rounded-[2rem] shadow-xl">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 text-center">{t.macroSynergy}</h3>
             <div className="h-[200px] w-full min-h-[200px]">
               <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                 <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="100%" barSize={10} data={macroData}>
                   <RadialBar background dataKey="value" cornerRadius={20} />
                   <Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                 </RadialBarChart>
               </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-[#111] border border-[#222] p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
            <div className="absolute -left-4 top-0 h-full w-1 bg-gradient-to-b from-blue-500 via-emerald-500 to-indigo-500"></div>
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-8 italic">Strategy Synergy Analysis</h3>
            <div className="space-y-6">
              {macroData.map((macro, idx) => {
                const percentage = Math.min(100, Math.round((macro.value / (macro.target || 1)) * 100));
                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-gray-300">{macro.name}</span>
                        <span className="text-[7px] text-gray-600 font-black uppercase tracking-widest">Protocol Alignment</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-500 font-bold">
                          <span className="text-white font-black">{macro.value}g</span> / {macro.target}g
                        </span>
                        <p className={`text-[8px] font-black uppercase ${percentage >= 90 ? 'text-emerald-500' : 'text-blue-500'}`}>{percentage}% Optimized</p>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-black rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(0,0,0,0.3)]" 
                        style={{ width: `${percentage}%`, backgroundColor: macro.fill }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Dashboard;
