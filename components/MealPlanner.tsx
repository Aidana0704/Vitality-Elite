
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getMealPlan, generateMealImage, editMealImage } from '../services/geminiService';
import { UserProfile, DailyMealPlan, Meal, Language, PrepStrategy, ShoppingItem } from '../types';
import { translations } from '../translations';

// In-memory cache for generated images to persist during session
const SESSION_IMAGE_CACHE: Record<string, string> = {};

interface MealPlannerProps {
  profile: UserProfile;
  language: Language;
}

/**
 * Sub-component for individual Meal Images with lazy loading and AI generation
 */
const MealImage: React.FC<{
  mealName: string;
  existingUrl?: string;
  onImageLoaded: (url: string) => void;
  className?: string;
}> = React.memo(({ mealName, existingUrl, onImageLoaded, className = "w-full h-full" }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(existingUrl || SESSION_IMAGE_CACHE[mealName] || null);
  const [loading, setLoading] = useState(!existingUrl && !SESSION_IMAGE_CACHE[mealName]);
  const observerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Sync state with parent updates (crucial for edited images)
  useEffect(() => {
    if (existingUrl) {
      setImageUrl(existingUrl);
      setLoading(false);
    }
  }, [existingUrl]);

  useEffect(() => {
    if (imageUrl) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '100px' });
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [imageUrl]);

  useEffect(() => {
    if (!isVisible || imageUrl) return;
    let isMounted = true;
    const fetchImage = async () => {
      try {
        const url = await generateMealImage(mealName);
        if (isMounted) {
          SESSION_IMAGE_CACHE[mealName] = url;
          setImageUrl(url);
          onImageLoaded(url);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchImage();
    return () => { isMounted = false; };
  }, [isVisible, mealName, imageUrl, onImageLoaded]);

  if (loading) {
    return (
      <div ref={observerRef} className={`${className} bg-[#151515] flex items-center justify-center overflow-hidden relative`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
        <div className="w-4 h-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <div className="absolute bottom-2 left-0 right-0 text-center">
            <span className="text-[6px] font-black text-emerald-500/50 uppercase tracking-[0.3em]">Synthesizing Visual...</span>
        </div>
      </div>
    );
  }

  return imageUrl ? (
    <img src={imageUrl} alt={mealName} className={`${className} object-cover transition-opacity duration-700 ease-in`} loading="lazy" />
  ) : (
    <div ref={observerRef} className={`${className} bg-[#111] flex items-center justify-center text-gray-700`}>🍱</div>
  );
});

const MealPlanner: React.FC<MealPlannerProps> = ({ profile, language }) => {
  const t = translations[language];
  const [view, setView] = useState<'daily' | 'prep'>('daily');
  const [plans, setPlans] = useState<DailyMealPlan[]>(() => {
    const saved = localStorage.getItem('vitality_meal_plans');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [prepStrategy, setPrepStrategy] = useState<PrepStrategy | null>(() => {
    const saved = localStorage.getItem('vitality_prep_strategy');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [consumedMeals, setConsumedMeals] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('vitality_consumed_meals');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [shoppingChecked, setShoppingChecked] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('vitality_shopping_checked');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [loading, setLoading] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditingImage, setIsEditingImage] = useState(false);

  // Persistence Effects
  useEffect(() => { if (plans && plans.length > 0) localStorage.setItem('vitality_meal_plans', JSON.stringify(plans)); }, [plans]);
  useEffect(() => { if (prepStrategy) localStorage.setItem('vitality_prep_strategy', JSON.stringify(prepStrategy)); }, [prepStrategy]);
  useEffect(() => { localStorage.setItem('vitality_consumed_meals', JSON.stringify(consumedMeals)); }, [consumedMeals]);
  useEffect(() => { localStorage.setItem('vitality_shopping_checked', JSON.stringify(shoppingChecked)); }, [shoppingChecked]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await getMealPlan(profile, language);
      setPlans(data.days || []);
      setPrepStrategy(data.prepStrategy || null);
      setActiveDayIdx(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (!plans || plans.length === 0) fetchPlans(); 
  }, [language]);

  const toggleConsumed = (e: React.MouseEvent, mealName: string) => {
    e.stopPropagation();
    setConsumedMeals(prev => ({ ...prev, [mealName]: !prev[mealName] }));
  };

  const toggleShopping = (item: string) => {
    setShoppingChecked(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const updateMealImageInState = useCallback((mealName: string, url: string) => {
    // Also update global cache so all instances reflect the change
    SESSION_IMAGE_CACHE[mealName] = url;
    
    setPlans(prev => (prev || []).map(day => {
      const update = (m: Meal) => m && m.name === mealName ? { ...m, imageUrl: url } : m;
      return { 
        ...day, 
        breakfast: update(day.breakfast), 
        lunch: update(day.lunch), 
        dinner: update(day.dinner), 
        snacks: Array.isArray(day.snacks) ? day.snacks.map(update) : [] 
      };
    }));
  }, []);

  const handleEditImage = async (promptOverride?: string) => {
    const promptToUse = promptOverride || editPrompt;
    if (!selectedMeal?.imageUrl || !promptToUse.trim()) return;
    setIsEditingImage(true);
    try {
      const newUrl = await editMealImage(selectedMeal.imageUrl, promptToUse);
      updateMealImageInState(selectedMeal.name, newUrl);
      setSelectedMeal(prev => prev ? { ...prev, imageUrl: newUrl } : null);
      if (!promptOverride) setEditPrompt('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsEditingImage(false);
    }
  };

  const activeDay = plans ? plans[activeDayIdx] : null;
  const totals = useMemo(() => {
    if (!activeDay) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    const snacks = Array.isArray(activeDay.snacks) ? activeDay.snacks : [];
    const allMeals = [activeDay.breakfast, activeDay.lunch, activeDay.dinner, ...snacks];
    return allMeals.reduce((acc, meal) => {
      if (!meal) return acc;
      return {
        calories: acc.calories + (meal.calories || 0),
        protein: acc.protein + (meal.protein || 0),
        carbs: acc.carbs + (meal.carbs || 0),
        fats: acc.fats + (meal.fats || 0),
      };
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 });
  }, [activeDay]);

  const macroData = useMemo(() => [
    { name: 'Protein', value: totals.protein, color: '#10b981' },
    { name: 'Carbs', value: totals.carbs, color: '#3b82f6' },
    { name: 'Fats', value: totals.fats, color: '#f59e0b' }
  ], [totals]);

  const dailyFidelity = useMemo(() => {
    if (!activeDay) return 0;
    const snacks = Array.isArray(activeDay.snacks) ? activeDay.snacks : [];
    const allValidMeals = [activeDay.breakfast, activeDay.lunch, activeDay.dinner, ...snacks].filter(Boolean) as Meal[];
    if (allValidMeals.length === 0) return 0;
    const consumed = allValidMeals.filter(m => consumedMeals[m.name]).length;
    return Math.round((consumed / allValidMeals.length) * 100);
  }, [activeDay, consumedMeals]);

  const shoppingCategories = useMemo(() => {
    const list = prepStrategy?.shoppingList || [];
    return Array.from(new Set(list.map(i => i.category || 'Other')));
  }, [prepStrategy]);

  // Refined edit presets categorized by function
  const editCategories = [
    {
      title: '✨ Garnish & Toppings',
      presets: [
        { label: 'Fresh Herbs', prompt: 'Add a fresh herb garnish of micro-greens and a sprinkle of seeds' },
        { label: 'Sauce Drizzle', prompt: 'Add an elegant drizzle of balsamic glaze or professional sauce' },
        { label: 'Lemon/Lime', prompt: 'Add a fresh citrus wedge (lemon/lime) on the side' }
      ]
    },
    {
      title: '☀️ Lighting & Atmosphere',
      presets: [
        { label: 'Warm Glow', prompt: 'Change lighting to a warm, golden-hour natural sunlight' },
        { label: 'High Contrast', prompt: 'Moody, high-contrast professional food photography lighting' },
        { label: 'Clean White', prompt: 'Bright, clean studio lighting with pure white highlights' }
      ]
    },
    {
      title: '🖼️ Environmental Setting',
      presets: [
        { label: 'Rustic Wood', prompt: 'Change background to a rustic, weathered dark wood table' },
        { label: 'Dark Marble', prompt: 'Change background to an elegant dark charcoal marble surface' },
        { label: 'Minimalist', prompt: 'Clean white porcelain plate on a minimalist stone background' }
      ]
    }
  ];

  if (loading && (!plans || plans.length === 0)) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 bg-emerald-500/10 blur-xl animate-pulse rounded-full"></div>
      </div>
      <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Initializing Protocol Matrix...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h3 className="text-5xl font-black text-white italic uppercase tracking-tighter">Performance Fuel</h3>
          <div className="flex items-center space-x-3 mt-2">
             <span className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] ${loading ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`}></span>
             <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest italic">
                {loading ? 'Recalibrating Sequence...' : `${profile.goal} Optimized Protocol`}
             </p>
          </div>
        </div>

        <div className="flex bg-[#111] p-1.5 border border-[#222] rounded-[1.5rem] w-full md:w-auto overflow-hidden">
          <button 
            onClick={() => setView('daily')}
            className={`flex-1 md:flex-none px-10 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all ${
              view === 'daily' ? 'bg-white text-black shadow-xl' : 'text-gray-500 hover:text-white'
            }`}
          >
            Mission Briefing
          </button>
          <button 
            onClick={() => setView('prep')}
            className={`flex-1 md:flex-none px-10 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all ${
              view === 'prep' ? 'bg-white text-black shadow-xl' : 'text-gray-500 hover:text-white'
            }`}
          >
            Logistics Protocol
          </button>
        </div>
      </div>

      {view === 'daily' ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            <div className="xl:col-span-8 space-y-8">
              <div className="bg-[#111] border border-[#222] p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-full h-full bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                   <div className="flex space-x-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                     {(plans || []).map((p, i) => (
                       <button
                         key={i}
                         onClick={() => setActiveDayIdx(i)}
                         className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 ${
                           activeDayIdx === i 
                           ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20' 
                           : 'bg-black/40 border-white/5 text-gray-500 hover:text-white hover:border-emerald-500/30'
                         }`}
                       >
                         {p.day}
                       </button>
                     ))}
                   </div>
                   <button 
                    onClick={fetchPlans} 
                    disabled={loading}
                    className="bg-white/5 border border-white/10 hover:bg-emerald-600 hover:border-emerald-500 text-white px-6 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                   >
                     {loading ? 'Syncing...' : 'Refresh Sequence'}
                   </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                   {[
                     { label: 'AM Start', meal: activeDay?.breakfast, time: '07:30', icon: '⚡', intent: 'Kickstart' },
                     { label: 'Snack I', meal: (activeDay?.snacks || [])[0], time: '10:30', icon: '🍎', intent: 'Stabilize' },
                     { label: 'Peak Loading', meal: activeDay?.lunch, time: '13:00', icon: '🔋', intent: 'Fuel' },
                     { label: 'Snack II', meal: (activeDay?.snacks || [])[1], time: '16:00', icon: '🧬', intent: 'Repair' },
                     { label: 'System Recovery', meal: activeDay?.dinner, time: '19:30', icon: '🌙', intent: 'Anabolism' }
                   ].map((slot, i) => (
                     <div 
                        key={i} 
                        onClick={() => slot.meal && setSelectedMeal(slot.meal)}
                        className={`flex flex-col items-center text-center p-5 rounded-[2.5rem] border transition-all cursor-pointer group ${
                            slot.meal && consumedMeals[slot.meal.name]
                            ? 'bg-emerald-600/10 border-emerald-500/40 opacity-60'
                            : 'bg-black/40 border-white/5 hover:border-emerald-500/30'
                        }`}
                     >
                        <span className="text-3xl mb-3 group-hover:scale-110 transition-transform">{slot.icon}</span>
                        <p className="text-[7px] text-gray-500 font-black uppercase tracking-widest mb-1">{slot.time}</p>
                        <p className="text-[10px] font-black text-white uppercase italic tracking-tighter truncate w-full mb-1">{slot.meal?.name || '---'}</p>
                        <span className={`text-[6px] font-black uppercase tracking-[0.3em] ${slot.meal && consumedMeals[slot.meal.name] ? 'text-emerald-400' : 'text-emerald-500/50'}`}>
                           {slot.meal && consumedMeals[slot.meal.name] ? 'ABSORBED' : slot.intent}
                        </span>
                     </div>
                   ))}
                </div>
              </div>

              <div className="relative pl-12 md:pl-16 space-y-8 pb-10">
                  <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500 via-emerald-500/10 to-transparent"></div>
                  {[
                      { label: 'Initialization', meal: activeDay?.breakfast, icon: '⚡', time: '07:30', tag: 'Metabolic Start' },
                      { label: 'Sustenance I', meal: (activeDay?.snacks || [])[0], icon: '🍎', time: '10:30', tag: 'Recovery' },
                      { label: 'Peak Loading', meal: activeDay?.lunch, icon: '🔋', time: '13:00', tag: 'Fuel' },
                      { label: 'Sustenance II', meal: (activeDay?.snacks || [])[1], icon: '🧬', time: '16:00', tag: 'Repair' },
                      { label: 'System Restoration', meal: activeDay?.dinner, icon: '🌙', time: '19:30', tag: 'Anabolism' },
                  ].map((slot, i) => {
                      if (!slot.meal) return null;
                      const isConsumed = consumedMeals[slot.meal.name];
                      return (
                          <div key={i} className="relative group/slot">
                              <div className={`absolute -left-[3.7rem] md:-left-[4.4rem] top-8 w-12 h-12 rounded-full border-4 border-[#0a0a0a] flex items-center justify-center transition-all duration-500 z-10 ${
                                  isConsumed ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.8)]' : 'bg-[#1a1a1a] text-gray-500'
                              }`}>
                                  <span className="text-lg font-black">{isConsumed ? '✓' : slot.icon}</span>
                              </div>

                              <div 
                                  onClick={() => setSelectedMeal(slot.meal)}
                                  className={`group/card bg-[#111] border rounded-[3rem] overflow-hidden transition-all duration-500 flex flex-col md:flex-row relative cursor-pointer ${
                                      isConsumed ? 'border-emerald-500/40 opacity-70' : 'border-[#222] hover:border-emerald-500/40'
                                  }`}
                              >
                                  <div className="h-56 md:h-auto md:w-64 shrink-0 relative bg-[#0a0a0a]">
                                      <MealImage mealName={slot.meal.name} existingUrl={slot.meal.imageUrl} onImageLoaded={(url) => updateMealImageInState(slot.meal.name, url)} />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                                      <div className="absolute bottom-5 left-6"><p className="text-[12px] font-black text-emerald-400 uppercase tracking-widest">{slot.time}</p></div>
                                  </div>
                                  
                                  <div className="p-8 flex-1 flex flex-col justify-between">
                                      <div className="flex justify-between items-start mb-4">
                                          <div>
                                              <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.4em] mb-2">{slot.label} • {slot.tag}</p>
                                              <h4 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none group-hover/card:text-emerald-500 transition-colors">{slot.meal.name}</h4>
                                          </div>
                                          <button onClick={(e) => toggleConsumed(e, slot.meal.name)} className={`px-5 py-2 rounded-full text-[9px] font-black uppercase border transition-all ${
                                              isConsumed ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-black/40 border-white/10 text-gray-500 hover:text-white'
                                          }`}>
                                              {isConsumed ? 'Logged' : 'Log Intake'}
                                          </button>
                                      </div>

                                      <div className="flex items-center space-x-8">
                                          <div className="flex flex-col"><span className="text-[8px] text-gray-600 font-black uppercase mb-1">Energy</span><span className="text-md font-black text-white italic">{slot.meal.calories} kcal</span></div>
                                          <div className="flex flex-col"><span className="text-[8px] text-gray-600 font-black uppercase mb-1">Protein</span><span className="text-md font-black text-emerald-500 italic">{slot.meal.protein}g</span></div>
                                          <div className="flex flex-col"><span className="text-[8px] text-gray-600 font-black uppercase mb-1">Prep</span><span className="text-md font-black text-gray-400 italic">{slot.meal.prepTime || '15 min'}</span></div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
            </div>

            <div className="xl:col-span-4 space-y-8">
               <div className="bg-[#111] border border-[#222] rounded-[3rem] p-10 space-y-10 shadow-2xl relative overflow-hidden group">
                  <div className="absolute -right-10 -top-10 text-white/5 text-[10rem] font-black italic group-hover:text-emerald-500/5 transition-colors">BIO</div>
                  <div className="relative z-10 text-center">
                      <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] mb-8">Dynamic Load Analysis</h4>
                      <div className="h-64 w-full relative">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie data={macroData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                                      {macroData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                  </Pie>
                                  <Tooltip contentStyle={{ background: '#000', border: '1px solid #333', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }} />
                              </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-4xl font-black text-white italic">{totals.calories}</span>
                              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Kcal Target</span>
                          </div>
                      </div>
                  </div>

                  <div className="relative z-10 pt-10 border-t border-[#222]">
                      <div className="flex justify-between items-end mb-4">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Plan Fidelity</p>
                          <p className="text-xl font-black text-emerald-400 italic">{dailyFidelity}%</p>
                      </div>
                      <div className="h-2 w-full bg-black rounded-full overflow-hidden border border-white/5">
                          <div className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${dailyFidelity}%` }}></div>
                      </div>
                  </div>

                  <div className="relative z-10 pt-10 border-t border-[#222]">
                      <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6 flex items-center justify-between">Supplement Stack <span className="text-lg">💊</span></h5>
                      <div className="space-y-4">
                          {(activeDay?.supplementProtocol || []).map((supp, si) => (
                              <div key={si} className="flex justify-between items-center group/supp p-4 bg-black/40 rounded-3xl border border-transparent hover:border-emerald-500/20 transition-all">
                                  <div className="flex flex-col">
                                      <span className="text-[10px] text-emerald-400 font-black uppercase tracking-tight">{supp.product}</span>
                                      <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">{supp.purpose}</span>
                                  </div>
                                  <span className="text-[8px] bg-[#1a1a1a] text-gray-500 px-3 py-1.5 rounded-full font-black uppercase">{supp.timing}</span>
                              </div>
                          ))}
                      </div>
                  </div>
               </div>

               <div className="bg-emerald-600/5 border border-emerald-500/10 p-10 rounded-[3rem] relative overflow-hidden group">
                  <div className="absolute right-0 bottom-0 opacity-10 scale-150 grayscale group-hover:grayscale-0 transition-all duration-700">🌿</div>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-3 italic">Strategy Intelligence</p>
                  <p className="text-xs text-gray-400 leading-relaxed italic relative z-10">
                    "Consistent nutritional sequence is key. {loading ? 'Recalibrating protocols for maximum metabolic efficiency...' : 'Your current sequence is optimized for sustained glycogen loading.'}"
                  </p>
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in slide-in-from-bottom-8 duration-700">
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-[#111] border border-[#222] rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute -right-10 -top-10 text-white/5 text-[8rem] font-black italic">SHOP</div>
              <h4 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.5em] mb-10 relative z-10 italic">Inventory Requirements</h4>
              
              <div className="space-y-10 relative z-10 custom-scrollbar max-h-[70vh] pr-4">
                {shoppingCategories.map(cat => (
                  <div key={cat} className="space-y-4">
                    <h5 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] flex items-center">
                      <span className="w-6 h-[1px] bg-emerald-500/20 mr-3"></span>
                      {cat}
                    </h5>
                    <div className="space-y-2">
                      {(prepStrategy?.shoppingList || []).filter(i => (i.category || 'Other') === cat).map((item, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => toggleShopping(item.item)}
                          className={`flex items-center justify-between p-4 rounded-3xl border cursor-pointer transition-all ${
                            shoppingChecked[item.item] ? 'bg-emerald-500/10 border-emerald-500/40 opacity-50' : 'bg-black/40 border-white/5 hover:border-emerald-500/20'
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${
                              shoppingChecked[item.item] ? 'bg-emerald-500 border-emerald-500' : 'border-white/10 bg-transparent'
                            }`}>
                              {shoppingChecked[item.item] && <span className="text-[12px] text-white">✓</span>}
                            </div>
                            <span className="text-[11px] font-bold text-gray-300">{item.item}</span>
                          </div>
                          <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">{item.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-10">
            <div className="bg-[#111] border border-[#222] rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
               <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none scale-150 grayscale">🍱</div>
               <h4 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.5em] mb-12 italic">Batch-Prep Protocol</h4>
               
               <div className="space-y-12">
                  <div className="space-y-10">
                    {(prepStrategy?.batchPrepTasks || []).map((task, idx) => (
                      <div key={idx} className="flex space-x-8 group">
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm shadow-xl transition-transform group-hover:scale-110">
                            0{idx + 1}
                          </div>
                          {idx < ((prepStrategy?.batchPrepTasks || []).length - 1) && (
                            <div className="w-[1px] h-full bg-gradient-to-b from-emerald-500/20 to-transparent mt-4"></div>
                          )}
                        </div>
                        <div className="pb-4">
                          <p className="text-[14px] text-gray-300 leading-relaxed font-medium italic">"{task}"</p>
                          <div className="w-12 h-0.5 bg-emerald-500/20 mt-4 group-hover:w-full transition-all"></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-12 border-t border-white/5">
                    <h5 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em] mb-8 italic">Storage & Preservation Logic</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {(prepStrategy?.storageTips || []).map((tip, idx) => (
                        <div key={idx} className="bg-black/60 border border-white/5 p-8 rounded-[2.5rem] flex items-start space-x-5 hover:border-emerald-500/20 transition-all">
                          <span className="text-2xl mt-1">❄️</span>
                          <p className="text-[12px] text-gray-400 leading-relaxed font-bold italic">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
               </div>
            </div>

            <div className="bg-emerald-600/5 border border-emerald-500/10 p-10 rounded-[3rem] relative overflow-hidden flex items-center space-x-8 group">
               <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-4xl shadow-2xl group-hover:scale-110 transition-transform">💡</div>
               <div>
                  <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2 italic">Performance Edge</h4>
                  <p className="text-xs text-gray-400 leading-relaxed italic font-medium">
                    "Consistent preparation reduces metabolic friction. By automating your nutritional decisions through batch prep, you reclaim mental energy for your high-intensity training sessions."
                  </p>
               </div>
            </div>
          </div>
        </div>
      )}

      {selectedMeal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/98 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="bg-[#0a0a0a] border border-[#222] w-full max-w-7xl rounded-[4rem] overflow-hidden shadow-[0_0_120px_rgba(16,185,129,0.1)] flex flex-col md:grid md:grid-cols-12 max-h-[94vh]">
            <div className="md:col-span-5 relative h-80 md:h-auto overflow-hidden bg-black border-r border-[#222]">
              {isEditingImage ? (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-8 p-12">
                  <div className="w-20 h-20 border-2 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_30px_rgba(16,185,129,0.3)]"></div>
                  <div className="text-center">
                    <p className="text-[12px] text-emerald-500 font-black uppercase tracking-[0.5em] animate-pulse">Neural Aesthetic Tuning</p>
                    <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest mt-2">Reconstructing Visual Geometry...</p>
                  </div>
                </div>
              ) : selectedMeal.imageUrl ? (
                <img src={selectedMeal.imageUrl} alt={selectedMeal.name} className="w-full h-full object-cover transition-transform duration-1000 hover:scale-110" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-800 text-[11px] font-black uppercase tracking-[0.5em]">Frame Unavailable</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-90"></div>
              <button onClick={() => setSelectedMeal(null)} className="absolute top-10 right-10 w-14 h-14 bg-black/60 backdrop-blur-2xl rounded-full flex items-center justify-center text-white hover:bg-emerald-500 transition-all border border-white/10 z-20 group">
                <span className="group-hover:rotate-180 transition-transform duration-500 text-xl font-light">✕</span>
              </button>
              <div className="absolute bottom-12 left-12 right-12 z-10">
                <div className="inline-flex items-center space-x-2 bg-emerald-600 px-4 py-2 rounded-full text-[10px] font-black text-white uppercase tracking-widest mb-4 shadow-2xl italic"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span><span>Verified Protocol</span></div>
                <h3 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none mb-4">{selectedMeal.name}</h3>
                <div className="flex space-x-6 text-[11px] font-bold text-gray-500 uppercase tracking-widest italic"><span>{selectedMeal.calories} Total Kcal</span><span className="text-emerald-500">{selectedMeal.protein}g Bio-Available Protein</span></div>
              </div>
            </div>
            
            <div className="md:col-span-7 p-12 md:p-16 overflow-y-auto custom-scrollbar flex flex-col bg-[#0d0d0d]">
              {selectedMeal.herbalifeSubstitution && (
                <div className="mb-12 p-10 bg-gradient-to-br from-emerald-600/5 to-transparent border border-emerald-500/10 rounded-[3rem] relative overflow-hidden group">
                  <div className="absolute right-0 top-0 p-10 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity"><span className="text-[12rem] font-black italic">SWAP</span></div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-4 mb-8">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">🧬</div>
                      <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.5em] italic">Elite Efficiency Substitution</h4>
                    </div>
                    <h5 className="text-4xl font-black text-white mb-8 uppercase italic tracking-tight leading-none">{selectedMeal.herbalifeSubstitution.productName}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-3"><p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">Protocol Purpose</p><p className="text-sm text-gray-400 leading-relaxed font-medium italic">"{selectedMeal.herbalifeSubstitution.benefits}"</p></div>
                      <div className="space-y-3"><p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">Quick Mix Instructions</p><div className="bg-black/60 p-6 rounded-3xl border border-emerald-500/5"><p className="text-[12px] text-emerald-100/70 leading-relaxed font-bold italic">{selectedMeal.herbalifeSubstitution.instructions}</p></div></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                <div className="space-y-8">
                   <div>
                    <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] mb-8 italic flex items-center"><span className="w-8 h-[1px] bg-gray-800 mr-4"></span>Materials Matrix</h4>
                    <ul className="space-y-3">
                      {(selectedMeal.ingredients || []).map((ing, ii) => (
                        <li key={ii} className="text-[11px] text-gray-400 flex items-center space-x-4 bg-white/2 p-4 rounded-3xl border border-white/5 hover:border-emerald-500/20 transition-all">
                          <span className="w-2 h-2 bg-emerald-500/50 rounded-full"></span>
                          <span className="font-bold uppercase tracking-tight italic">{ing}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-12">
                  <div>
                    <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] mb-8 italic flex items-center"><span className="w-8 h-[1px] bg-gray-800 mr-4"></span>Preparation Protocol</h4>
                    <div className="bg-black/50 p-8 rounded-[2.5rem] border border-white/5 relative shadow-inner">
                        <span className="absolute top-4 right-6 text-[8px] opacity-20 font-black tracking-widest">{selectedMeal.prepTime || '15 MIN'}</span>
                        <p className="text-[13px] text-gray-400 leading-relaxed italic font-medium">{selectedMeal.prepInstructions}</p>
                    </div>
                  </div>

                  <div className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] space-y-8 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none"></div>
                    <div className="relative z-10">
                      <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.4em] italic mb-6">Visual Aesthetic Refinement</p>
                      
                      {/* Categorized Refinement Presets */}
                      <div className="space-y-6 mb-8">
                        {editCategories.map(cat => (
                          <div key={cat.title} className="space-y-3">
                            <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{cat.title}</p>
                            <div className="flex flex-wrap gap-2">
                              {cat.presets.map(preset => (
                                <button
                                  key={preset.label}
                                  disabled={isEditingImage}
                                  onClick={() => handleEditImage(preset.prompt)}
                                  className="px-4 py-2 bg-black/40 border border-white/10 hover:border-emerald-500/40 rounded-xl text-[9px] font-black uppercase text-gray-400 hover:text-white transition-all active:scale-95 disabled:opacity-30 flex items-center space-x-2"
                                >
                                  <span>{preset.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3">
                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Custom Modification Prompt</p>
                        <div className="flex space-x-3">
                          <input 
                            type="text" 
                            placeholder="e.g. 'Add extra steam', 'Brighter colors'..." 
                            value={editPrompt} 
                            onChange={(e) => setEditPrompt(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && handleEditImage()}
                            className="flex-1 bg-black border border-white/5 rounded-2xl px-5 py-4 text-[11px] text-white focus:outline-none focus:border-emerald-500/50 transition-all font-bold placeholder:text-gray-800" 
                          />
                          <button 
                            onClick={() => handleEditImage()} 
                            disabled={isEditingImage || !editPrompt.trim()} 
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white px-8 rounded-2xl text-[10px] font-black uppercase italic transition-all active:scale-95 shadow-xl shadow-emerald-600/20"
                          >
                            {isEditingImage ? 'Tuning...' : 'Synthesize'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer { 100% { transform: translate3d(100%, 0, 0); } }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0a0a0a; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #333; }
      `}</style>
    </div>
  );
};

export default MealPlanner;
