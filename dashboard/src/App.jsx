import React, { useState, useEffect } from 'react';
import { database, ref, onValue, set } from './firebase';
import { 
  Thermometer, 
  Droplets, 
  Scale, 
  Fan, 
  Activity, 
  Wifi, 
  WifiOff,
  Hexagon,
  Clock
} from 'lucide-react';

function App() {
  const [data, setData] = useState({
    sicaklik: 0,
    nem: 0,
    kilo: 0,
    rpm: 0,
    akustik: 0,
    fan_durum: false,
    son_gorulme: 0
  });

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Current time updater for online status check (runs every second)
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Data listener
    const kovanRef = ref(database, 'kovan1/anlik');
    const unsubscribeData = onValue(kovanRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setData({
          sicaklik: val.sicaklik !== undefined ? val.sicaklik : 0,
          nem: val.nem !== undefined ? val.nem : 0,
          kilo: val.kilo !== undefined ? val.kilo : 0,
          rpm: val.rpm !== undefined ? val.rpm : 0,
          akustik: val.akustik !== undefined ? val.akustik : 0,
          fan_durum: val.fan_durum !== undefined ? val.fan_durum : false,
          son_gorulme: Date.now() // React tarafında anlık saat atanır
        });
      }
    });

    return () => {
      unsubscribeData();
    };
  }, []);

  // Real Connection Status based on timestamp from Arduino
  const isConnected = data.son_gorulme > 0 && (now - data.son_gorulme < 15000); // 15 seconds slack
  
  const lastSeenDate = new Date(data.son_gorulme);
  const lastSeenString = data.son_gorulme > 0 
    ? lastSeenDate.toLocaleTimeString() 
    : 'Bilinmiyor';

  return (
    <div className="min-h-screen p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="glass-panel p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent/20 rounded-xl">
              <Hexagon className="w-8 h-8 text-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-accent to-orange-400 bg-clip-text text-transparent">
                BeeVoice
              </h1>
              <p className="text-slate-400 text-sm font-medium">Akıllı Kovan Takip Sistemi</p>
            </div>
          </div>
          
          <div className="flex items-center flex-wrap gap-4 md:gap-4 justify-center">
            {/* Last Seen */}
            <div className="flex items-center gap-2 py-2 px-4 rounded-full border bg-slate-900/50 border-slate-700 text-slate-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-semibold">
                Son Görülme: <span className="text-slate-200">{lastSeenString}</span>
              </span>
            </div>

            {/* Connection Status */}
            <div className={`flex items-center gap-2 py-2 px-4 rounded-full border ${isConnected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
              {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span className="text-sm font-bold tracking-wide">
                {isConnected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </header>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          
          {/* Temperature */}
          <div className="glass-card flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
              <Thermometer className="w-24 h-24 text-orange-500" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-orange-500/20 rounded-lg">
                <Thermometer className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-slate-400 font-medium">Sıcaklık</h3>
            </div>
            <div className="mt-auto">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">{Number(data.sicaklik).toFixed(1)}</span>
                <span className="text-xl text-orange-400 font-medium">°C</span>
              </div>
            </div>
          </div>

          {/* Humidity */}
          <div className="glass-card flex flex-col relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
              <Droplets className="w-24 h-24 text-blue-500" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-500/20 rounded-lg">
                <Droplets className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-slate-400 font-medium">Nem</h3>
            </div>
            <div className="mt-auto">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">{Number(data.nem).toFixed(1)}</span>
                <span className="text-xl text-blue-400 font-medium">%</span>
              </div>
            </div>
          </div>

          {/* Weight */}
          <div className="glass-card flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
              <Scale className="w-24 h-24 text-amber-500" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-amber-500/20 rounded-lg">
                <Scale className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-slate-400 font-medium">Ağırlık</h3>
            </div>
            <div className="mt-auto">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">{Number(data.kilo).toFixed(2)}</span>
                <span className="text-xl text-amber-400 font-medium">kg</span>
              </div>
            </div>
          </div>

          {/* RPM */}
          <div className="glass-card flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
              <Fan className="w-24 h-24 text-teal-500" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-500/20 rounded-lg">
                  <Fan className={`w-6 h-6 text-teal-400 ${data.fan_durum ? 'animate-spin' : ''}`} style={{ animationDuration: '2s' }} />
                </div>
                <h3 className="text-slate-400 font-medium">Fan Hızı</h3>
              </div>
              {/* Status Badge inside Card */}
              <div className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs font-semibold">
                {data.fan_durum ? <span className="text-teal-400">Aktif</span> : <span className="text-slate-500">Kapalı</span>}
              </div>
            </div>
            <div className="mt-auto">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">{data.rpm}</span>
                <span className="text-xl text-teal-400 font-medium">RPM</span>
              </div>
            </div>
          </div>

        </div>

        {/* Acoustic Activity Section */}
        <div className="glass-panel p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Activity className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Akustik Aktivite</h2>
                <p className="text-sm text-slate-400">Kovan içi ses yoğunluğu</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-white">{data.akustik}</span>
              <span className="text-sm text-slate-400 ml-1">/ 1023</span>
            </div>
          </div>

          <div className="relative h-6 bg-slate-900 rounded-full overflow-hidden border border-slate-700/50 shadow-inner">
            <div 
              className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out flex items-center justify-end pr-2
                ${isAkustikHigh 
                  ? 'bg-gradient-to-r from-orange-500 to-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]' 
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]'}`}
              style={{ width: `${akustikPercent}%` }}
            >
            </div>
          </div>
          
          <div className="flex justify-between mt-3 text-xs font-semibold tracking-wider text-slate-500">
            <span>0%</span>
            <span>{akustikPercent.toFixed(1)}%</span>
            <span>100%</span>
          </div>
          
          {isAkustikHigh && (
            <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 animate-pulse">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
              <p className="text-rose-400 text-sm font-semibold tracking-wide">UYARI: Kovanda yüksek ses (akustik anomali) tespit edildi.</p>
            </div>
          )}
        </div>



      </div>
    </div>
  );
}

export default App;
