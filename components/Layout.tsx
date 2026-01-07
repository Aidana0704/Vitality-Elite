
import React, { useState } from 'react';
import ChatAssistant from './ChatAssistant';
import { UserProfile, Language } from '../types';
import { translations } from '../translations';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profile: UserProfile;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, profile, language, setLanguage }) => {
  const t = translations[language];
  const [langOpen, setLangOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: '📊' },
    { id: 'tracker', label: t.tracker, icon: '📝' },
    { id: 'workout', label: t.workouts, icon: '🏃' },
    { id: 'meals', label: t.meals, icon: '🍱' },
    { id: 'gym', label: t.gyms, icon: '🏋️' },
    { id: 'profile', label: t.profile, icon: '👤' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="hidden md:flex flex-col w-64 bg-[#0d0d0d] border-r border-[#222] p-6 fixed h-full">
        <div className="mb-10 px-2">
          <h1 className="text-2xl font-bold tracking-tighter text-blue-500">VITALITY<span className="text-white">ELITE</span></h1>
          <p className="text-[8px] text-gray-500 mt-1 uppercase tracking-widest font-bold">Performance Lab</p>
        </div>
        
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-[#222]">
          <div className="flex items-center space-x-3 p-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold">
              {profile.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold">{profile.name}</p>
              <p className="text-[10px] text-green-500 uppercase font-bold tracking-wider">Elite Member</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 bg-[#0a0a0a] min-h-screen overflow-y-auto pb-24 md:pb-0">
        <header className="sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-[#222] px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-200 uppercase tracking-tight">{activeTab.replace('-', ' ')}</h2>
          <div className="flex items-center space-x-4">
            
            {/* Language Switcher */}
            <div className="relative">
              <button 
                onClick={() => setLangOpen(!langOpen)}
                className="bg-[#1a1a1a] border border-[#333] px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-all flex items-center space-x-2"
              >
                <span>🌐 {language.toUpperCase()}</span>
                <span className={`text-[8px] transition-transform ${langOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {langOpen && (
                <div className="absolute top-full right-0 mt-2 w-24 bg-[#111] border border-[#222] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {(['en', 'ru', 'es'] as Language[]).map(l => (
                    <button
                      key={l}
                      onClick={() => { setLanguage(l); setLangOpen(false); }}
                      className={`w-full px-4 py-2.5 text-xs font-bold text-left hover:bg-blue-600 hover:text-white transition-all ${language === l ? 'text-blue-500' : 'text-gray-400'}`}
                    >
                      {l === 'en' ? 'English' : l === 'ru' ? 'Русский' : 'Español'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-8 w-[1px] bg-[#222]"></div>
            <button className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-white transition-all">
              {t.today}: {new Date().toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric' })}
            </button>
          </div>
        </header>
        
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0d0d0d]/95 backdrop-blur-xl border-t border-[#222] flex justify-around p-4 z-50">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center space-y-1 ${
              activeTab === item.id ? 'text-blue-500' : 'text-gray-500'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[8px] uppercase font-bold tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      <ChatAssistant profile={profile} language={language} />
    </div>
  );
};

export default Layout;
