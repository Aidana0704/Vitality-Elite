
import React, { useState, useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import { getGymRecommendations } from '../services/geminiService';
import { Gym, Language } from '../types';

interface GymFinderProps {
  userLocation: string;
  goal: string;
  language: Language;
}

const AMENITY_MAP: Record<string, string> = {
  'Pool': '🏊',
  'Sauna': '🧖',
  'Yoga': '🧘',
  'CrossFit': '🏋️',
  'Personal Training': '👤',
  'Spa': '💆',
  'Childcare': '👶',
  'Juice Bar': '🥤',
  'Weights': '💪',
  'Cardio': '🏃',
  'Boxing': '🥊',
  'Steam Room': '🌫️',
  'Basketball': '🏀',
  'Tennis': '🎾',
  'Locker Room': '🔒',
  'Showers': '🚿',
  'Parking': '🅿️',
  'WiFi': '📶',
};

const AMENITY_OPTIONS = Object.keys(AMENITY_MAP).slice(0, 8); // Top 8 for filter toggles

const getAmenityIcon = (amenity: string): string => {
  if (!amenity) return '✨';
  const match = Object.keys(AMENITY_MAP).find(key => 
    amenity.toLowerCase().includes(key.toLowerCase())
  );
  return match ? AMENITY_MAP[match] : '✨';
};

const GymFinder: React.FC<GymFinderProps> = ({ userLocation, goal, language }) => {
  const [location, setLocation] = useState(userLocation || '');
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number, longitude: number } | undefined>();
  const [activeGymIdx, setActiveGymIdx] = useState<number | null>(null);
  const [hoveredGymIdx, setHoveredGymIdx] = useState<number | null>(null);
  
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const mapContainerId = "strategic-venue-map";

  // Filters
  const [minRating, setMinRating] = useState(0);
  const [maxDistance, setMaxDistance] = useState(25);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Initial Geolocation and Map Init
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setUserCoords(coords);
          if (mapRef.current) {
            mapRef.current.setView([coords.latitude, coords.longitude], 13);
          }
        },
        (error) => console.warn("Geolocation permission denied", error)
      );
    }

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerId, {
        zoomControl: false,
        attributionControl: false
      }).setView([37.7749, -122.4194], 12);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapRef.current);

      markerLayerGroupRef.current = L.layerGroup().addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Markers when gyms, active selection, or hover state changes
  useEffect(() => {
    if (!mapRef.current || !markerLayerGroupRef.current) return;

    markerLayerGroupRef.current.clearLayers();

    filteredGyms.forEach((gym, idx) => {
      if (gym.lat && gym.lng) {
        const isActive = activeGymIdx === idx;
        const isHovered = hoveredGymIdx === idx;
        
        const pulseClass = isActive || isHovered 
          ? 'bg-blue-400 scale-150 shadow-[0_0_20px_rgba(59,130,246,1)]' 
          : 'bg-blue-600';

        const icon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="marker-pulse transition-all duration-300 ${pulseClass}"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const marker = L.marker([gym.lat, gym.lng], { icon })
          .on('click', () => {
            setActiveGymIdx(idx);
            const element = document.getElementById(`gym-card-${idx}`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          })
          .on('mouseover', () => {
            setHoveredGymIdx(idx);
          })
          .on('mouseout', () => {
            setHoveredGymIdx(null);
          });
        
        marker.addTo(markerLayerGroupRef.current!);
      }
    });
  }, [gyms, activeGymIdx, hoveredGymIdx, minRating, maxDistance, selectedAmenities]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) return;
    setLoading(true);
    setActiveGymIdx(null);
    setHoveredGymIdx(null);
    try {
      const data = await getGymRecommendations(location, goal, language, userCoords);
      setGyms(data || []);
      
      if (mapRef.current && data && data.length > 0) {
        const bounds = L.latLngBounds([]);
        data.forEach(g => {
          if (g.lat && g.lng) bounds.extend([g.lat, g.lng]);
        });
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity) 
        : [...prev, amenity]
    );
  };

  const filteredGyms = useMemo(() => {
    return (gyms || []).filter(gym => {
      const matchesRating = gym.rating >= minRating;
      const gymDist = gym.distance ?? 0;
      const matchesDistance = maxDistance >= 50 ? true : gymDist <= maxDistance;
      const matchesAmenities = selectedAmenities.length === 0 || 
        selectedAmenities.every(a => (gym.amenities || []).some(ga => ga.toLowerCase().includes(a.toLowerCase())));
      return matchesRating && matchesDistance && matchesAmenities;
    });
  }, [gyms, minRating, maxDistance, selectedAmenities]);

  const focusGym = (gym: Gym, idx: number) => {
    setActiveGymIdx(idx);
    if (mapRef.current && gym.lat && gym.lng) {
      mapRef.current.setView([gym.lat, gym.lng], 15, { animate: true });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in duration-700">
      <div className="bg-gradient-to-br from-blue-600 via-blue-800 to-indigo-950 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 text-white/5 text-[12rem] font-black select-none pointer-events-none leading-none">VENUES</div>
        <div className="relative z-10">
          <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">Elite Training Venues</h3>
          <p className="text-blue-100/70 mb-8 max-w-xl text-sm font-medium">Discover premium high-performance centers tailored to your physiological profile and primary objectives.</p>
          
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1 relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl">📍</span>
              <input 
                type="text" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter City, Zip, or Neighborhood..." 
                className="w-full bg-white/10 border border-white/20 rounded-[1.5rem] pl-14 pr-6 py-5 text-white placeholder-blue-200 focus:outline-none focus:ring-4 focus:ring-white/10 transition-all backdrop-blur-xl font-medium"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="bg-white text-blue-900 px-12 py-5 rounded-[1.5rem] font-black uppercase italic tracking-widest hover:bg-blue-50 transition-all disabled:opacity-50 shadow-2xl shadow-blue-900/40 flex items-center justify-center space-x-3 active:scale-95"
            >
              {loading && <div className="w-5 h-5 border-2 border-blue-900/20 border-t-blue-900 rounded-full animate-spin"></div>}
              <span>{loading ? 'Locating...' : 'Locate Gyms'}</span>
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[700px]">
        {/* Left Side: Map */}
        <div className="lg:col-span-7 h-[500px] lg:h-auto flex flex-col space-y-4">
          <div className="flex items-center justify-between px-4">
             <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Strategic Venue Map</h4>
             <div className="flex items-center space-x-2">
               <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
               <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Grounding Active</span>
             </div>
          </div>
          <div id={mapContainerId} className="flex-1 border border-[#222] shadow-2xl z-10 overflow-hidden relative group rounded-[2.5rem]">
             <div className="absolute top-6 left-6 z-[1000] flex flex-col space-y-2 pointer-events-none">
                <div className="bg-[#111]/80 backdrop-blur-md border border-[#222] p-2 rounded-xl flex items-center space-x-2">
                   <div className={`w-3 h-3 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(59,130,246,1)] ${hoveredGymIdx !== null ? 'animate-ping' : ''}`}></div>
                   <span className="text-[9px] font-bold text-white uppercase">{hoveredGymIdx !== null ? 'Target Tracking' : 'Location Pulse'}</span>
                </div>
             </div>
             {filteredGyms.length === 0 && !loading && (
               <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-[500] flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-[#111] border border-[#222] rounded-3xl flex items-center justify-center mb-4 shadow-2xl">
                    <span className="text-2xl">🔎</span>
                  </div>
                  <p className="text-white font-black uppercase tracking-tighter italic text-xl">System Standby</p>
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-2">Enter location to initialize venue triangulation</p>
               </div>
             )}
          </div>
        </div>

        {/* Right Side: Results & Filters */}
        <div className="lg:col-span-5 flex flex-col space-y-6 overflow-hidden">
          <div className="bg-[#111] border border-[#222] p-6 rounded-[2.5rem] space-y-6 shadow-xl">
            <div className="flex flex-col space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Protocol Rating</label>
                  <select 
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="block w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-bold"
                  >
                    <option value={0}>Any Quality</option>
                    <option value={4}>4.0+ Stars</option>
                    <option value={4.5}>4.5+ Elite</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Radius (mi)</label>
                    <input 
                      type="number"
                      min="1"
                      max="100"
                      value={maxDistance}
                      onChange={(e) => setMaxDistance(Math.min(100, Math.max(1, Number(e.target.value))))}
                      className="w-12 bg-transparent text-right text-[10px] font-black text-blue-500 focus:outline-none border-b border-transparent hover:border-blue-500/30 transition-all"
                    />
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    step="1"
                    value={maxDistance > 50 ? 50 : maxDistance}
                    onChange={(e) => setMaxDistance(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#222] rounded-lg appearance-none cursor-pointer accent-blue-600 mt-3"
                  />
                  <div className="flex justify-between text-[7px] font-bold text-gray-600 uppercase mt-1">
                    <span>1mi</span>
                    <span>25mi</span>
                    <span>50mi+</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Specialized Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {AMENITY_OPTIONS.map(amenity => (
                    <button
                      key={amenity}
                      onClick={() => toggleAmenity(amenity)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border flex items-center space-x-1.5 ${
                        selectedAmenities.includes(amenity)
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20'
                        : 'bg-[#0a0a0a] border-[#222] text-gray-500 hover:border-blue-500/30'
                      }`}
                    >
                      <span>{AMENITY_MAP[amenity]}</span>
                      <span>{amenity}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar max-h-[600px] lg:max-h-none">
            {filteredGyms.map((gym, idx) => (
              <div 
                key={idx} 
                id={`gym-card-${idx}`}
                onMouseEnter={() => setHoveredGymIdx(idx)}
                onMouseLeave={() => setHoveredGymIdx(null)}
                onClick={() => focusGym(gym, idx)}
                className={`bg-[#111] border rounded-[2rem] p-6 cursor-pointer transition-all flex flex-col shadow-lg relative ${
                  activeGymIdx === idx || hoveredGymIdx === idx 
                    ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.15)] bg-[#151515]' 
                    : 'border-[#222] hover:border-blue-500/30'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border transition-all ${
                    activeGymIdx === idx || hoveredGymIdx === idx
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-blue-600/10 text-blue-400 border-blue-500/20'
                  }`}>
                    {gym.distance ? `${gym.distance.toFixed(1)} miles away` : 'Triangulating...'}
                  </div>
                  <div className="flex items-center space-x-1.5 text-orange-500 font-black text-xs">
                    <span className="text-sm">★</span>
                    <span>{gym.rating}</span>
                  </div>
                </div>
                
                <h4 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">{gym.name}</h4>
                <p className="text-[10px] text-gray-500 mb-4 font-bold uppercase tracking-wider">📍 {gym.address}</p>
                
                <p className="text-xs text-gray-400 mb-6 leading-relaxed italic">
                  "{gym.highlights}"
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {(gym.amenities || []).map((a, i) => (
                    <div key={i} className="flex items-center space-x-1.5 bg-white/5 text-gray-400 px-2 py-1.5 rounded-lg border border-white/5 transition-colors hover:border-white/10">
                      <span className="text-xs">{getAmenityIcon(a)}</span>
                      <span className="text-[8px] font-black uppercase tracking-tighter whitespace-nowrap">
                        {a}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-6 border-t border-[#222] flex gap-3">
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gym.name + " " + gym.address)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-4 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                  >
                    Open Navigation
                  </a>
                  {gym.groundingLinks?.[0] && (
                    <a 
                      href={gym.groundingLinks[0].uri}
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-14 h-14 bg-[#1a1a1a] border border-[#222] rounded-xl flex items-center justify-center text-xl hover:bg-[#222] transition-all"
                      title="Direct Protocol Source"
                    >
                      🔗
                    </a>
                  )}
                </div>
              </div>
            ))}

            {filteredGyms.length === 0 && !loading && gyms.length > 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[#111] border border-[#222] rounded-[2rem]">
                 <span className="text-4xl mb-4">🔍</span>
                 <p className="text-xs font-black text-gray-500 uppercase tracking-widest">No matching venues found in current sector.</p>
              </div>
            )}
            
            {loading && (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-[#111] border border-[#222] p-6 rounded-[2rem] h-48 animate-pulse flex flex-col justify-between">
                    <div className="h-4 bg-[#222] rounded w-1/3"></div>
                    <div className="space-y-2">
                      <div className="h-6 bg-[#222] rounded w-3/4"></div>
                      <div className="h-4 bg-[#222] rounded w-1/2"></div>
                    </div>
                    <div className="h-10 bg-[#222] rounded w-full"></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GymFinder;
