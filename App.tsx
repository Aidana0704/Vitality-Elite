
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Tracker from './components/Tracker';
import MealPlanner from './components/MealPlanner';
import GymFinder from './components/GymFinder';
import WorkoutPlanner from './components/WorkoutPlanner';
import Profile from './components/Profile';
import { UserProfile, HealthLog, DailyWorkout, Language } from './types';
import { translations } from './translations';

const STORAGE_KEYS = {
  PROFILE: 'vitality_profile',
  LOGS: 'vitality_logs',
  WORKOUT: 'vitality_workout',
  LANGUAGE: 'vitality_lang'
};

const INITIAL_PROFILE: UserProfile = {
  name: 'John Doe',
  age: 28,
  weight: 85,
  height: 182,
  goal: 'Muscle Gain',
  activityLevel: 'Active',
  dietaryPreference: 'High Protein, No Seafood',
  location: 'San Francisco, CA',
  membershipTier: 'Elite',
  memberSince: '2024',
  memberId: 'VE-992-LAB'
};

const INITIAL_LOGS: HealthLog[] = [
  { date: 'Oct 20', weight: 86.5, caloriesConsumed: 2800, caloriesBurned: 400, waterIntake: 2200, protein: 180, carbs: 320, fats: 80 },
  { date: 'Oct 21', weight: 86.2, caloriesConsumed: 2650, caloriesBurned: 550, waterIntake: 2500, protein: 175, carbs: 290, fats: 75 },
  { date: 'Oct 22', weight: 86.0, caloriesConsumed: 2900, caloriesBurned: 600, waterIntake: 2800, protein: 190, carbs: 340, fats: 85 },
  { date: 'Oct 23', weight: 85.8, caloriesConsumed: 2700, caloriesBurned: 450, waterIntake: 3000, protein: 185, carbs: 300, fats: 70 },
  { date: 'Oct 24', weight: 85.4, caloriesConsumed: 3100, caloriesBurned: 700, waterIntake: 3200, protein: 210, carbs: 360, fats: 90 },
  { date: 'Oct 25', weight: 85.1, caloriesConsumed: 2850, caloriesBurned: 500, waterIntake: 2900, protein: 180, carbs: 320, fats: 80 },
  { date: 'Today', weight: 85.0, caloriesConsumed: 2950, caloriesBurned: 650, waterIntake: 3100, protein: 195, carbs: 330, fats: 85 },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isKeySelected, setIsKeySelected] = useState<boolean>(true);
  
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return saved ? JSON.parse(saved) : INITIAL_PROFILE;
    } catch { return INITIAL_PROFILE; }
  });
  
  const [logs, setLogs] = useState<HealthLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
      return saved ? JSON.parse(saved) : INITIAL_LOGS;
    } catch { return INITIAL_LOGS; }
  });
  
  const [workoutPlan, setWorkoutPlan] = useState<DailyWorkout[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WORKOUT);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem(STORAGE_KEYS.LANGUAGE) as Language) || 'en';
  });

  useEffect(() => {
    const checkKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        setIsKeySelected(hasKey);
      }
    };
    checkKey();

    const handleReset = () => setIsKeySelected(false);
    window.addEventListener('aistudio:reset-key', handleReset);
    return () => window.removeEventListener('aistudio:reset-key', handleReset);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    if (workoutPlan.length > 0) {
      localStorage.setItem(STORAGE_KEYS.WORKOUT, JSON.stringify(workoutPlan));
    }
  }, [workoutPlan]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
  }, [language]);
  
  const t = translations[language];

  const handleAuthorize = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      setIsKeySelected(true);
    }
  };

  const addLog = useCallback((newLog: HealthLog) => {
    setLogs(prev => {
      const filtered = prev.filter(l => l.date !== 'Today');
      return [...filtered, newLog];
    });
    setProfile(prev => ({ ...prev, weight: newLog.weight }));
    setActiveTab('dashboard');
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard logs={logs} profile={profile} workoutPlan={workoutPlan} language={language} />;
      case 'tracker':
        return <Tracker onAddLog={addLog} language={language} />;
      case 'workout':
        return <WorkoutPlanner profile={profile} onPlanGenerated={setWorkoutPlan} language={language} />;
      case 'meals':
        return <MealPlanner profile={profile} language={language} />;
      case 'gym':
        return <GymFinder userLocation={profile.location || ''} goal={profile.goal} language={language} />;
      case 'profile':
        return <Profile profile={profile} setProfile={setProfile} language={language} />;
      default:
        return <Dashboard logs={logs} profile={profile} workoutPlan={workoutPlan} language={language} />;
    }
  };

  if (!isKeySelected) {
    return (
      <div className="fixed inset-0 z-[999] bg-[#050505] flex items-center justify-center p-6 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#3b82f6_0%,transparent_70%)]"></div>
        <div className="max-w-xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-block p-5 rounded-3xl bg-blue-600/10 border border-blue-500/20 mb-4 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
            <span className="text-4xl">🔐</span>
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-tight">{t.authTitle}</h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">{t.authDesc}</p>
          <div className="pt-8 flex flex-col items-center space-y-5">
            <button 
              onClick={handleAuthorize}
              className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-2xl font-black uppercase italic tracking-widest transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-blue-600/20"
            >
              {t.authAction}
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              className="text-[9px] font-black text-gray-600 uppercase tracking-widest hover:text-blue-400 transition-colors"
            >
              View Billing Guidelines
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      profile={profile} 
      language={language} 
      setLanguage={setLanguage}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
