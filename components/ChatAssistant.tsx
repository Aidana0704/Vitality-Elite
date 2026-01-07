
import React, { useState, useRef, useEffect } from 'react';
import { Chat, GenerateContentResponse } from '@google/genai';
import { createChatSession } from '../services/chatService';
import { UserProfile, Language } from '../types';
import { translations } from '../translations';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatAssistantProps {
  profile: UserProfile;
  language: Language;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ profile, language }) => {
  const t = translations[language];
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current = createChatSession(profile, language);
    setMessages([
      { role: 'model', text: language === 'ru' ? `Добро пожаловать в лабораторию, ${profile.name}. Как мы оптимизируем вашу стратегию ${profile.goal} сегодня?` : language === 'es' ? `Bienvenido al laboratorio, ${profile.name}. ¿Cómo optimizamos tu estrategia para ${profile.goal} hoy?` : `Welcome to the Lab, ${profile.name}. How can I optimize your ${profile.goal} strategy today?` }
    ]);
  }, [profile, language]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !chatRef.current || isTyping) return;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInputValue('');
    setIsTyping(true);

    try {
      const result = await chatRef.current.sendMessageStream({ message: text });
      let fullText = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]);
      for await (const chunk of result) {
        fullText += (chunk as GenerateContentResponse).text;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = fullText;
          return newMessages;
        });
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Connection error." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-24 md:bottom-8 right-6 z-50 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all">
        <span className="text-2xl">{isOpen ? '✕' : '🦾'}</span>
      </button>

      {isOpen && (
        <div className="fixed bottom-40 md:bottom-24 right-6 z-50 w-[calc(100vw-3rem)] md:w-[400px] h-[500px] bg-[#111]/95 backdrop-blur-2xl border border-[#222] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="p-5 border-b border-[#222] bg-blue-600/10 flex items-center space-x-3">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">AI</div>
             <h4 className="text-xs font-black text-white uppercase tracking-widest">{t.aiAssistant}</h4>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-[#1a1a1a] border border-[#222] text-gray-300'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="p-4 bg-[#0d0d0d] border-t border-[#222] flex space-x-2">
            <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={t.askAnything} className="flex-1 bg-[#1a1a1a] border border-[#222] text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500" />
            <button type="submit" disabled={isTyping} className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white disabled:opacity-50">➔</button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;
