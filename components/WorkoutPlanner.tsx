
import React, { useState, useEffect, useCallback } from 'react';
import { getWorkoutPlan, getExerciseVideo } from '../services/geminiService';
import { UserProfile, DailyWorkout, Exercise, Language } from '../types';
import { translations } from '../translations';

// Session-level cache for video URLs to prevent re-generating expensive Veo videos
const VIDEO_CACHE: Record<string, string> = {};

interface WorkoutPlannerProps {
  profile: UserProfile;
  language: Language;
  onPlanGenerated?: (plan: DailyWorkout[]) => void;
}

const MuscleGroupIcon: React.FC<{ muscle: string }> = ({ muscle }) => {
  return (
    <div className="flex items-center space-x-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
      <span className="text-[10px] font-black uppercase text-blue-500">{muscle}</span>
    </div>
  );
};

const VideoSkeletonLoader: React.FC<{ progress: string }> = ({ progress }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center space-y-8 p-12 bg-[#050505] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
      
      <div className="relative">
        <div className="w-24 h-24 border-2 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-blue-500/20 rounded-full animate-pulse blur-xl"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,1)]"></div>
        </div>
      </div>

      <div className="text-center space-y-4 max-w-md relative z-10">
        <h5 className="text-white font-black text-xl tracking-tighter uppercase italic">{progress}</h5>
        <div className="w-64 h-1 bg-[#1a1a1a] rounded-full overflow-hidden mx-auto border border-white/5">
          <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-[progress_15s_ease-in-out_infinite]"></div>
        </div>
        <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">Powered by Veo Generative AI</p>
        <p className="text-[8px] text-orange-500 font-bold uppercase tracking-widest animate-pulse">Note: High-fidelity video synthesis can take up to 2 minutes.</p>
      </div>

      <style>{`
        @keyframes shimmer {
          100% { transform: translate3d(100%, 0, 0); }
        }
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 95%; }
        }
      `}</style>
    </div>
  );
};

const WorkoutPlanner: React.FC<WorkoutPlannerProps> = ({ profile, language, onPlanGenerated }) => {
  const t = translations[language];
  const [workouts, setWorkouts] = useState<DailyWorkout[]>(() => {
    const saved = localStorage.getItem('vitality_workout');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [activeDay, setActiveDay] = useState<number>(0);
  const [isDemoVisible, setIsDemoVisible] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoProgressMsg, setVideoProgressMsg] = useState("");
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [activeExerciseName, setActiveExerciseName] = useState("");

  const fetchWorkouts = async () => {
    setLoading(true);
    try {
      const data = await getWorkoutPlan(profile, language);
      setWorkouts(data || []);
      if (onPlanGenerated) onPlanGenerated(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Background refresh logic: only force loader if there's no data.
    if (!workouts || workouts.length === 0) fetchWorkouts();
  }, [language]);

  const handleOpenDemo = async (exerciseName: string) => {
    setActiveExerciseName(exerciseName);
    setIsDemoVisible(true);

    if (VIDEO_CACHE[exerciseName]) {
      setCurrentVideoUrl(VIDEO_CACHE[exerciseName]);
      setVideoLoading(false);
      return;
    }

    setVideoLoading(true);
    setVideoProgressMsg("Initializing Elite Visualization Engine...");
    
    try {
      const url = await getExerciseVideo(exerciseName, (msg) => {
        setVideoProgressMsg(msg);
      });
      VIDEO_CACHE[exerciseName] = url;
      setCurrentVideoUrl(url);
    } catch (err) {
      console.error(err);
    } finally {
      setVideoLoading(false);
    }
  };

  if (loading && (!workouts || workouts.length === 0)) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
      <div className="w-16 h-16 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
      <p className="text-gray-500 font-bold uppercase tracking-widest animate-pulse">Architecting Elite Protocol...</p>
    </div>
  );

  const currentWorkout = workouts ? workouts[activeDay] : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">AI Training Lab</h3>
          <div className="flex items-center space-x-2 mt-1">
             <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-orange-500 animate-pulse' : 'bg-blue-500'}`}></span>
             <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">
               {loading ? 'Recalculating Load Distribution...' : 'Science-Backed Performance'}
             </p>
          </div>
        </div>
        <button 
          onClick={fetchWorkouts} 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Generating...' : t.regenerate}
        </button>
      </div>

      {workouts && workouts.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="xl:col-span-1 space-y-3">
            {workouts.map((workout, idx) => (
              <button key={idx} onClick={() => setActiveDay(idx)} className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 ${activeDay === idx ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/10' : 'bg-[#111] border-[#222] text-gray-500 hover:border-blue-500/30'}`}>
                <p className="font-bold text-lg">{workout.dayTitle}</p>
                <p className="text-xs uppercase tracking-widest opacity-70 font-bold">{workout.focus}</p>
              </button>
            ))}
          </div>

          <div className="xl:col-span-3 space-y-6">
            {currentWorkout && (
              <div className="bg-[#111] border border-[#222] rounded-[2rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-[#222] bg-gradient-to-r from-[#111] to-[#1a1a1a]">
                  <h4 className="text-2xl font-bold text-white mb-1">{currentWorkout.dayTitle}</h4>
                  <p className="text-blue-500 text-xs font-bold uppercase tracking-widest">{currentWorkout.focus}</p>
                </div>
                <div className="p-8 space-y-4">
                  {(currentWorkout.exercises || []).map((ex, exIdx) => (
                    <div key={exIdx} className="group bg-[#0d0d0d] border border-[#222] rounded-2xl p-6 flex flex-col hover:border-blue-500/40 transition-all">
                      <div className="flex flex-col md:flex-row md:items-start gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h5 className="text-lg font-bold text-gray-200">{ex.name}</h5>
                            <button 
                              onClick={() => handleOpenDemo(ex.name)} 
                              className="bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all"
                            >
                              🎥 {t.viewForm}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {(ex.targetMuscles || []).map((m, mi) => <MuscleGroupIcon key={mi} muscle={m} />)}
                          </div>
                          <div className="space-y-4">
                            <p className="text-xs text-gray-300 leading-relaxed font-medium">{ex.description}</p>
                            <p className="text-sm text-gray-400 italic"><span className="text-blue-500 font-bold not-italic mr-2">{t.coachCue}:</span>"{ex.coachingCue}"</p>
                          </div>
                        </div>
                        <div className="flex space-x-4 shrink-0 md:pt-1">
                          <div className="bg-[#1a1a1a] px-4 py-2 rounded-xl border border-[#222] text-center min-w-[70px]">
                            <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">{t.sets}</p>
                            <p className="text-xl font-bold text-white">{ex.sets}</p>
                          </div>
                          <div className="bg-[#1a1a1a] px-4 py-2 rounded-xl border border-[#222] text-center min-w-[70px]">
                            <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">{t.reps}</p>
                            <p className="text-xl font-bold text-white">{ex.reps}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isDemoVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-[#111] border border-[#222] w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[#222] flex justify-between items-center bg-[#111]">
              <div>
                <h4 className="text-xl font-bold text-white uppercase tracking-tighter italic">Elite Form Laboratory</h4>
                <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">{activeExerciseName}</p>
              </div>
              <button 
                onClick={() => { setIsDemoVisible(false); setCurrentVideoUrl(null); setVideoLoading(false); }} 
                className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center text-gray-400 hover:text-white transition-all"
              >
                ✕
              </button>
            </div>
            
            <div className="aspect-video bg-black flex items-center justify-center relative">
              {videoLoading ? (
                <VideoSkeletonLoader progress={videoProgressMsg} />
              ) : currentVideoUrl ? (
                <video src={currentVideoUrl} controls autoPlay loop className="w-full h-full object-contain" />
              ) : (
                <div className="text-red-500 font-bold">Failed to load demonstration.</div>
              )}
            </div>

            <div className="p-6 bg-[#0d0d0d] border-t border-[#222] flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Live Bio-Visual Stream</p>
              </div>
              <button 
                onClick={() => { setIsDemoVisible(false); setCurrentVideoUrl(null); }}
                className="px-6 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-white rounded-xl text-xs font-bold transition-all"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutPlanner;
