
import React, { useState } from 'react';
import { HealthLog, Language } from '../types';
import { translations } from '../translations';

interface TrackerProps {
  onAddLog: (log: HealthLog) => void;
  language: Language;
}

const Tracker: React.FC<TrackerProps> = ({ onAddLog, language }) => {
  const t = translations[language];
  const [formData, setFormData] = useState({
    weight: '',
    caloriesConsumed: '',
    caloriesBurned: '',
    waterIntake: '',
    protein: '',
    carbs: '',
    fats: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog: HealthLog = {
      date: new Date().toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric' }),
      weight: parseFloat(formData.weight) || 0,
      caloriesConsumed: parseInt(formData.caloriesConsumed) || 0,
      caloriesBurned: parseInt(formData.caloriesBurned) || 0,
      waterIntake: parseInt(formData.waterIntake) || 0,
      protein: parseInt(formData.protein) || 0,
      carbs: parseInt(formData.carbs) || 0,
      fats: parseInt(formData.fats) || 0,
    };
    onAddLog(newLog);
    setFormData({ weight: '', caloriesConsumed: '', caloriesBurned: '', waterIntake: '', protein: '', carbs: '', fats: '' });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-[#111] border border-[#222] p-8 rounded-[2rem] shadow-2xl">
        <h3 className="text-2xl font-bold mb-6 text-white uppercase tracking-tighter">{t.tracker}</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t.currentWeight} (kg)</label>
              <input type="number" step="0.1" required value={formData.weight} onChange={(e) => setFormData({...formData, weight: e.target.value})} className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500" placeholder="0.0" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t.waterIntake} (ml)</label>
              <input type="number" required value={formData.waterIntake} onChange={(e) => setFormData({...formData, waterIntake: e.target.value})} className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-cyan-500" placeholder="2500" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t.intake} ({t.calories})</label>
              <input type="number" required value={formData.caloriesConsumed} onChange={(e) => setFormData({...formData, caloriesConsumed: e.target.value})} className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-orange-500" placeholder="2000" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t.protein} (g)</label>
              <input type="number" required value={formData.protein} onChange={(e) => setFormData({...formData, protein: e.target.value})} className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-400" placeholder="150" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t.carbs} (g)</label>
              <input type="number" required value={formData.carbs} onChange={(e) => setFormData({...formData, carbs: e.target.value})} className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-400" placeholder="250" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t.fats} (g)</label>
              <input type="number" required value={formData.fats} onChange={(e) => setFormData({...formData, fats: e.target.value})} className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-yellow-400" placeholder="70" />
            </div>
            <div className="space-y-2 lg:col-span-3">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t.burned} ({t.calories})</label>
              <input type="number" required value={formData.caloriesBurned} onChange={(e) => setFormData({...formData, caloriesBurned: e.target.value})} className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500" placeholder="500" />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-2xl transition-all shadow-lg active:scale-[0.98]">{t.updateStats}</button>
        </form>
      </div>
    </div>
  );
};

export default Tracker;
