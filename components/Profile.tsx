
import React, { useState } from 'react';
import { UserProfile, Language, MembershipTier } from '../types';
import { translations } from '../translations';

interface ProfileProps {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  language: Language;
}

const Profile: React.FC<ProfileProps> = ({ profile, setProfile, language }) => {
  const t = translations[language];
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(profile);

  const handleSave = () => {
    setProfile(editedProfile);
    setIsEditing(false);
  };

  const getTierColor = (tier: MembershipTier = 'Standard') => {
    switch (tier) {
      case 'Platinum': return 'from-indigo-400 to-purple-600';
      case 'Founders': return 'from-amber-400 to-orange-600';
      case 'Elite': return 'from-blue-400 to-indigo-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700">
      {/* Membership Card */}
      <div className="relative group cursor-pointer perspective-1000">
        <div className={`relative bg-gradient-to-br ${getTierColor(profile.membershipTier)} p-1 rounded-[2.5rem] shadow-2xl transition-all duration-500 group-hover:scale-[1.01]`}>
          <div className="bg-black/90 backdrop-blur-3xl rounded-[2.4rem] p-8 md:p-12 flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden h-[350px] md:h-[280px]">
            {/* Holographic BG decoration */}
            <div className={`absolute -right-20 -top-20 w-80 h-80 bg-gradient-to-br ${getTierColor(profile.membershipTier)} opacity-10 blur-[80px] rounded-full`}></div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter mb-2">VITALITY<span className="text-blue-500">ELITE</span></h1>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mb-8">Performance Identity Card</p>
                
                <div className="space-y-1">
                  <p className="text-gray-300 text-lg font-bold tracking-tight uppercase">{profile.name}</p>
                  <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest">{profile.memberId}</p>
                </div>
              </div>
              
              <div className="flex space-x-8">
                <div>
                  <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest">{t.memberSince}</p>
                  <p className="text-white text-xs font-bold">{profile.memberSince || '2024'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest">{t.membershipLevel}</p>
                  <p className="text-blue-400 text-xs font-bold">{profile.membershipTier || 'Elite'}</p>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex flex-col items-end h-full justify-between mt-4 md:mt-0">
               <div className={`px-4 py-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl`}>
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-500">{t.biologicalStatus}</p>
                  <p className="text-xl font-black text-white italic">LVL {Math.floor(profile.age * 0.9)}</p>
               </div>

               <div className="text-right">
                  <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-1">Status</p>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-emerald-500 text-xs font-black uppercase tracking-widest">Active System</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Details Editor */}
        <div className="lg:col-span-8 bg-[#111] border border-[#222] p-8 md:p-10 rounded-[3rem] shadow-2xl">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{t.profile} Protocol</h3>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Configure user physiology parameters</p>
            </div>
            <button 
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                isEditing 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#222]'
              }`}
            >
              {isEditing ? t.saveChanges : t.editProfile}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Assigned Designation</label>
              <input 
                disabled={!isEditing}
                value={isEditing ? editedProfile.name : profile.name}
                onChange={(e) => setEditedProfile({...editedProfile, name: e.target.value})}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Primary Objective</label>
              <select 
                disabled={!isEditing}
                value={isEditing ? editedProfile.goal : profile.goal}
                onChange={(e) => setEditedProfile({...editedProfile, goal: e.target.value as any})}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-blue-500 disabled:opacity-50 appearance-none transition-all"
              >
                <option value="Muscle Gain">Muscle Gain</option>
                <option value="Weight Loss">Weight Loss</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Athletic Performance">Athletic Performance</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4 md:col-span-2">
               <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Age</label>
                <input 
                  type="number"
                  disabled={!isEditing}
                  value={isEditing ? editedProfile.age : profile.age}
                  onChange={(e) => setEditedProfile({...editedProfile, age: Number(e.target.value)})}
                  className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Weight (kg)</label>
                <input 
                  type="number"
                  disabled={!isEditing}
                  value={isEditing ? editedProfile.weight : profile.weight}
                  onChange={(e) => setEditedProfile({...editedProfile, weight: Number(e.target.value)})}
                  className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Height (cm)</label>
                <input 
                  type="number"
                  disabled={!isEditing}
                  value={isEditing ? editedProfile.height : profile.height}
                  onChange={(e) => setEditedProfile({...editedProfile, height: Number(e.target.value)})}
                  className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Location Node</label>
              <input 
                disabled={!isEditing}
                value={isEditing ? editedProfile.location : profile.location}
                onChange={(e) => setEditedProfile({...editedProfile, location: e.target.value})}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Sidebar Status */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[3rem] shadow-xl text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 text-white/5 text-8xl font-black select-none pointer-events-none">STRAT</div>
            <h4 className="text-xl font-black italic uppercase tracking-tighter mb-4">Strategic Pulse</h4>
            <div className="space-y-6 relative z-10">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Alignment</p>
                <div className="flex justify-between items-end">
                   <p className="text-2xl font-black italic">88%</p>
                   <p className="text-[10px] font-bold">Optimizing</p>
                </div>
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-[88%] shadow-[0_0_10px_white]"></div>
                </div>
              </div>
              
              <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                 <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Current Goal</p>
                 <p className="font-bold">{profile.goal}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] p-8 rounded-[3rem] space-y-6">
            <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">System Protocols</h4>
            <div className="space-y-4">
              <button 
                onClick={() => { localStorage.clear(); window.location.reload(); }}
                className="w-full text-left p-4 rounded-2xl border border-red-500/10 hover:bg-red-500/5 transition-all group"
              >
                <p className="text-[10px] font-black text-red-500/50 group-hover:text-red-500 uppercase tracking-widest">{t.purgeData}</p>
                <p className="text-[9px] text-gray-600 mt-1 font-bold">Clear all persistent storage and reset identity.</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
