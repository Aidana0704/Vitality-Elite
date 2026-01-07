
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  const steps = [
    "Initialization",
    "Compute Request",
    "Synthesis",
    "Refinement",
    "Finalization"
  ];

  const getCurrentStep = () => {
    if (progress.includes("Simulation")) return 0;
    if (progress.includes("Compute")) return 1;
    if (progress.includes("Synthesis") || progress.includes("Mapping")) return 2;
    if (progress.includes("Refining") || progress.includes("Atmospheric")) return 3;
    if (progress.includes("Finalizing") || progress.includes("Complete")) return 4;
    return 2;
  };

  const activeStep = getCurrentStep();

  return (
    <div className="w-full h-full flex flex-col items-center justify-center space-y-8 p-12 bg-[#050505] relative overflow-hidden group">
      {/* Dynamic Background */}
      <div className="absolute inset-0 opacity-20">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_70%)] animate-pulse"></div>
         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
      </div>

      {/* Main Tech Spinner */}
      <div className="relative">
        <div className="w-32 h-32 border-4 border-blue-500/5 border-t-blue-500 rounded-full animate-spin transition-all duration-1000"></div>
        <div className="absolute inset-0 w-32 h-32 border-4 border-emerald-500/5 border-b-emerald-500 rounded-full animate-[spin_3s_linear_infinite_reverse]"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full blur-2xl animate-pulse"></div>
          <div className="relative flex flex-col items-center">
             <span className="text-blue-500 text-xs font-black animate-pulse uppercase tracking-[0.2em]">{Math.floor(Math.random() * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="text-center space-y-6 max-w-md relative z-10">
        <div className="space-y-1">
          <h5 className="text-white font-black text-2xl tracking-tighter uppercase italic drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
            {progress}
          </h5>
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.4em] font-black">Neural Pipeline Active</p>
        </div>

        {/* Multi-step indicator */}
        <div className="flex justify-between w-full max-w-xs mx-auto mb-2">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center space-y-2">
              <div className={`w-2 h-2 rounded-full transition-all duration-700 ${
                i <= activeStep ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]' : 'bg-white/5'
              }`}></div>
            </div>
          ))}
        </div>

        {/* Progress Bar Container */}
        <div className="space-y-3">
          <div className="w-72 h-1.5 bg-black/50 rounded-full overflow-hidden mx-auto border border-white/10 p-[1px]">
            <div className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-[loading_120s_ease-in-out_forwards]"></div>
          </div>
          <div className="flex justify-between items-center px-2">
            <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Veo 3.1 Pro Engine</p>
            <p className="text-[8px] text-orange-500/70 font-black uppercase tracking-widest animate-pulse">Wait Time: ~60s</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer { 100% { transform: translate3d(100%, 0, 0); } }
        @keyframes loading { 
          0% { width: 5%; } 
          20% { width: 15%; }
          40% { width: 45%; }
          60% { width: 65%; }
          80% { width: 85%; }
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
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('vitality_completed_exercises') || '{}'); } catch { return {}; }
  });
  const [loading, setLoading] = useState(false);
  const [activeDay, setActiveDay] = useState<number>(0);
  const [isDemoVisible, setIsDemoVisible] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoProgressMsg, setVideoProgressMsg] = useState("");
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    localStorage.setItem('vitality_completed_exercises', JSON.stringify(completedExercises));
  }, [completedExercises]);

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
    if (!workouts || workouts.length === 0) fetchWorkouts();
  }, [language]);

  const toggleComplete = (exerciseName: string) => {
    setCompletedExercises(prev => ({ ...prev, [exerciseName]: !prev[exerciseName] }));
  };

  const handleOpenDemo = async (exercise: Exercise) => {
    setActiveExercise(exercise);
    setIsDemoVisible(true);
    if (VIDEO_CACHE[exercise.name]) {
      setCurrentVideoUrl(VIDEO_CACHE[exercise.name]);
      setVideoLoading(false);
      return;
    }
    setVideoLoading(true);
    setVideoProgressMsg("Initializing Simulation Lab...");
    try {
      const url = await getExerciseVideo(exercise.name, (msg) => setVideoProgressMsg(msg));
      VIDEO_CACHE[exercise.name] = url;
      setCurrentVideoUrl(url);
    } catch (err) { 
      console.error(err);
      setVideoProgressMsg("Network Protocol Error. Please Retry.");
    } finally { setVideoLoading(false); }
  };

  if (loading && (!workouts || workouts.length === 0)) return (
    <div className="flex flex-col items-center justify-center py-40 space-y-6">
      <div className="w-16 h-16 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
      <p className="text-gray-500 font-black uppercase tracking-[0.4em] animate-pulse">Architecting Elite Protocol...</p>
    </div>
  );

  const currentWorkout = workouts ? workouts[activeDay] : null;
  const currentProgress = currentWorkout ? Math.round(((currentWorkout.exercises || []).filter(ex => completedExercises[ex.name]).length / Math.max(1, (currentWorkout.exercises || []).length)) * 100) : 0;

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h3 className="text-5xl font-black text-white italic uppercase tracking-tighter">AI Training Lab</h3>
          <div className="flex items-center space-x-3 mt-2">
             <span className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] ${loading ? 'bg-orange-500 animate-pulse' : 'bg-blue-500'}`}></span>
             <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest italic">
               {loading ? 'Recalculating Load Distribution...' : `${profile.experienceLevel} Rank Protocol`}
             </p>
          </div>
        </div>
        <button 
          onClick={fetchWorkouts} 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase italic tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-2xl shadow-blue-600/20"
        >
          {loading ? 'Generating...' : t.regenerate}
        </button>
      </div>

      {workouts && workouts.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
          <div className="xl:col-span-4 space-y-4">
            <div className="bg-[#111] border border-white/5 p-8 rounded-[3rem] shadow-xl">
               <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] mb-8 italic">Mission Log</h4>
               <div className="space-y-3">
                 {workouts.map((workout, idx) => (
                   <button 
                     key={idx} 
                     onClick={() => setActiveDay(idx)} 
                     className={`w-full text-left p-6 rounded-[2rem] border transition-all duration-500 group relative overflow-hidden ${activeDay === idx ? 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-600/20' : 'bg-black/40 border-white/5 text-gray-500 hover:border-blue-500/30'}`}
                   >
                     <div className="relative z-10 flex items-center justify-between">
                       <div>
                         <p className="font-black text-lg italic tracking-tighter uppercase leading-none mb-1">{workout.dayTitle}</p>
                         <p className={`text-[8px] font-black uppercase tracking-widest ${activeDay === idx ? 'text-blue-100/70' : 'text-gray-600'}`}>{workout.focus}</p>
                       </div>
                       {activeDay === idx && <span className="text-xs">➔</span>}
                     </div>
                   </button>
                 ))}
               </div>
            </div>

            <div className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-white/5 p-8 rounded-[3rem] shadow-xl text-center">
               <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">Today's Load Progress</p>
               <div className="relative h-4 bg-black rounded-full overflow-hidden border border-white/5 mb-3">
                  <div className="h-full bg-blue-600 transition-all duration-1000 shadow-[0_0_15px_rgba(59,130,246,0.5)]" style={{ width: `${currentProgress}%` }}></div>
               </div>
               <p className="text-[2rem] font-black italic tracking-tighter text-white">{currentProgress}%</p>
               <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Protocol Fidelity</p>
            </div>
          </div>

          <div className="xl:col-span-8 space-y-8">
            {currentWorkout && (
              <div className="bg-[#111] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="p-10 border-b border-white/5 bg-gradient-to-r from-[#111] to-[#1a1a1a] flex justify-between items-end">
                  <div>
                    <h4 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">{currentWorkout.dayTitle}</h4>
                    <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.3em] italic">{currentWorkout.focus} Focus Node</p>
                  </div>
                  <div className="bg-black/60 px-5 py-2.5 rounded-2xl border border-white/5">
                     <span className="text-gray-500 text-[8px] font-black uppercase tracking-widest mr-3">Est. Window</span>
                     <span className="text-white text-[11px] font-black uppercase italic">{currentWorkout.estimatedDuration}</span>
                  </div>
                </div>
                <div className="p-10 space-y-6">
                  {(currentWorkout.exercises || []).map((ex, exIdx) => (
                    <div 
                      key={exIdx} 
                      className={`group bg-black/40 border rounded-[2.5rem] p-8 flex flex-col transition-all duration-500 ${
                        completedExercises[ex.name] ? 'border-emerald-500/40 opacity-70' : 'border-white/5 hover:border-blue-500/30'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start gap-8">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-4">
                            <button 
                              onClick={() => toggleComplete(ex.name)}
                              className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all ${
                                completedExercises[ex.name] ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'border-white/10 hover:border-blue-500/50'
                              }`}
                            >
                              {completedExercises[ex.name] && <span className="text-white font-black text-sm">✓</span>}
                            </button>
                            <h5 className="text-2xl font-black text-gray-200 italic tracking-tighter uppercase">{ex.name}</h5>
                            <button 
                              onClick={() => handleOpenDemo(ex)} 
                              className="bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all"
                            >
                              🎥 Demo Form
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-6">
                            {(ex.targetMuscles || []).map((m, mi) => <MuscleGroupIcon key={mi} muscle={m} />)}
                          </div>
                          <div className="space-y-4">
                            <p className="text-[13px] text-gray-400 leading-relaxed font-medium italic">"{ex.description}"</p>
                            <div className="p-4 bg-black/60 rounded-2xl border border-white/5 border-l-4 border-l-blue-500">
                               <p className="text-[12px] text-gray-300 italic"><span className="text-blue-500 font-black not-italic mr-2 uppercase text-[10px] tracking-widest">{t.coachCue}:</span>{ex.coachingCue}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-4 shrink-0 md:pt-2">
                          <div className="bg-[#1a1a1a] px-6 py-4 rounded-[1.5rem] border border-white/5 text-center min-w-[90px] shadow-xl">
                            <p className="text-[9px] text-gray-500 font-black uppercase mb-1 tracking-widest">{t.sets}</p>
                            <p className="text-3xl font-black text-white italic tracking-tighter leading-none">{ex.sets}</p>
                          </div>
                          <div className="bg-[#1a1a1a] px-6 py-4 rounded-[1.5rem] border border-white/5 text-center min-w-[90px] shadow-xl">
                            <p className="text-[9px] text-gray-500 font-black uppercase mb-1 tracking-widest">{t.reps}</p>
                            <p className="text-3xl font-black text-white italic tracking-tighter leading-none">{ex.reps}</p>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/98 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-6xl rounded-[4rem] overflow-hidden shadow-[0_0_120px_rgba(59,130,246,0.15)] flex flex-col md:flex-row max-h-[90vh]">
            
            {/* Simulation Viewport */}
            <div className="flex-1 bg-black relative flex flex-col min-h-[400px]">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#0d0d0d] absolute top-0 left-0 right-0 z-20">
                <div>
                  <h4 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none mb-1">Elite Form Laboratory</h4>
                  <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">{activeExercise?.name} Analysis</p>
                </div>
                <button 
                  onClick={() => { setIsDemoVisible(false); setCurrentVideoUrl(null); setVideoLoading(false); }} 
                  className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center text-gray-400 hover:bg-blue-600 hover:text-white transition-all duration-500"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 flex items-center justify-center relative pt-24 pb-12">
                {videoLoading ? (
                  <VideoSkeletonLoader progress={videoProgressMsg} />
                ) : currentVideoUrl ? (
                  <div className="relative w-full h-full max-w-4xl px-8 flex items-center justify-center">
                    {/* Simulation Brackets */}
                    <div className="absolute top-4 left-12 w-8 h-8 border-t-2 border-l-2 border-blue-500 animate-pulse"></div>
                    <div className="absolute top-4 right-12 w-8 h-8 border-t-2 border-r-2 border-blue-500 animate-pulse"></div>
                    <div className="absolute bottom-4 left-12 w-8 h-8 border-b-2 border-l-2 border-blue-500 animate-pulse"></div>
                    <div className="absolute bottom-4 right-12 w-8 h-8 border-b-2 border-r-2 border-blue-500 animate-pulse"></div>
                    
                    <video src={currentVideoUrl} controls autoPlay loop className="w-full h-full object-contain rounded-2xl shadow-[0_0_50px_rgba(59,130,246,0.1)]" />
                  </div>
                ) : (
                  <div className="text-red-500 font-black italic uppercase tracking-widest">Protocol Error: Stream Sync Failed</div>
                )}
              </div>

              <div className="p-8 bg-[#0d0d0d] border-t border-white/5 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Live Bio-Visual Feedback Active</p>
                </div>
              </div>
            </div>

            {/* Analysis Panel */}
            <div className="w-full md:w-80 bg-[#0d0d0d] border-l border-white/5 p-8 flex flex-col justify-between overflow-y-auto custom-scrollbar">
              <div className="space-y-8">
                <div>
                  <h5 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Biomechanical Cues</h5>
                  <div className="p-4 bg-black/40 rounded-2xl border border-blue-500/20 italic text-[13px] text-gray-300 leading-relaxed font-bold">
                    "{activeExercise?.coachingCue}"
                  </div>
                </div>

                <div>
                  <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Focus Target</h5>
                  <div className="flex flex-wrap gap-2">
                    {activeExercise?.targetMuscles.map(m => (
                      <span key={m} className="px-3 py-1 bg-blue-600/10 text-blue-400 rounded-lg text-[9px] font-black uppercase border border-blue-500/20">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Protocol Specs</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black p-3 rounded-xl border border-white/5 text-center">
                      <p className="text-[8px] text-gray-600 font-black uppercase mb-1">Sets</p>
                      <p className="text-xl font-black text-white italic">{activeExercise?.sets}</p>
                    </div>
                    <div className="bg-black p-3 rounded-xl border border-white/5 text-center">
                      <p className="text-[8px] text-gray-600 font-black uppercase mb-1">Reps</p>
                      <p className="text-xl font-black text-white italic">{activeExercise?.reps}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 mt-8 border-t border-white/5">
                <button 
                  onClick={() => { setIsDemoVisible(false); setCurrentVideoUrl(null); }}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest italic transition-all active:scale-95 shadow-xl shadow-blue-600/20"
                >
                  Confirm Technique
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutPlanner;
