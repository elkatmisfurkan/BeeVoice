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
  Settings,
  Volume2,
  VolumeX,
  Power,
  Sliders,
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

  const [kontrol, setKontrol] = useState({
    otonom: 1,
    fan: 0,
    buzzer: 0
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

    // Control panel listener
    const kontrolRef = ref(database, 'kovan1/kontrol');
    const unsubscribeKontrol = onValue(kontrolRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setKontrol({
          otonom: val.otonom !== undefined ? val.otonom : 1,
          fan: val.fan !== undefined ? val.fan : 0,
          buzzer: val.buzzer !== undefined ? val.buzzer : 0
        });
      }
    });

    return () => {
      unsubscribeData();
      unsubscribeKontrol();
    };
  }, []);

  const updateKontrol = async (newKontrol) => {
    const updated = { ...kontrol, ...newKontrol };
    setKontrol(updated); // Arayüzü anında güncelle (Optimistic UI)
    
    // Modern fetch() API ile PATCH metodu kullanarak veriyi güncelle
    try {
      await fetch('https://beevoice-35c4b-default-rtdb.europe-west1.firebasedatabase.app/kovan1/kontrol.json?auth=t3czGPDuvrZlT7pOBB3LWoJXjW6zdGl4LuLShlmT', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newKontrol)
      });
    } catch (error) {
      console.error('Firebase Güncelleme Hatası:', error);
    }
  };

  // Calculate Akustik Percentage (0-1023 to 0-100%)
  const akustikPercent = Math.min(100, Math.max(0, (data.akustik / 1023) * 100));
  const isAkustikHigh = akustikPercent > 60;

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

        {/* Cihaz Kontrol Paneli */}
        <div className="glass-panel p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-500/20 rounded-xl">
              <Settings className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Sistem Kontrolü</h2>
              <p className="text-sm text-slate-400">Manuel donanım yönetimi</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Otonom Toggle */}
            <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700 flex flex-col justify-between hover:bg-slate-800/50 transition-colors">
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-300 font-medium">Otonom Mod</span>
                <button 
                  onClick={() => updateKontrol({ otonom: kontrol.otonom === 1 ? 0 : 1 })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${kontrol.otonom === 1 ? 'bg-indigo-500' : 'bg-slate-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${kontrol.otonom === 1 ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Açık olduğunda sistem sıcaklığa ve sese göre fanı ve buzzer'ı kendisi otomatik olarak yönetir.
              </p>
            </div>

            {/* Fan Speed */}
            <div className={`bg-slate-900/50 p-5 rounded-2xl border border-slate-700 flex flex-col justify-between transition-all duration-300 ${kontrol.otonom === 1 ? 'opacity-40 pointer-events-none' : 'hover:bg-slate-800/50'}`}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-300 font-medium flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-teal-400" /> Fan Hızı
                </span>
                <span className="text-teal-400 font-bold bg-teal-500/10 px-2 py-1 rounded-lg text-sm">
                  {Math.round((kontrol.fan / 255) * 100)}%
                </span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="255" 
                value={kontrol.fan}
                onChange={(e) => updateKontrol({ fan: parseInt(e.target.value) })}
                className="w-full accent-teal-500 cursor-pointer h-2 bg-slate-700 rounded-lg appearance-none"
              />
              <p className="text-xs text-slate-500 mt-4">Fanın çalışma hızını (PWM) ayarlar.</p>
            </div>

            {/* Buzzer */}
            <div className={`bg-slate-900/50 p-5 rounded-2xl border border-slate-700 flex flex-col justify-between transition-all duration-300 ${kontrol.otonom === 1 ? 'opacity-40 pointer-events-none' : 'hover:bg-slate-800/50'}`}>
               <div className="flex justify-between items-center mb-4">
                <span className="text-slate-300 font-medium flex items-center gap-2">
                  {kontrol.buzzer === 1 ? <Volume2 className="w-4 h-4 text-rose-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />} Buzzer Alarmı
                </span>
                <button 
                  onClick={() => updateKontrol({ buzzer: kontrol.buzzer === 1 ? 0 : 1 })}
                  className={`p-2 rounded-lg transition-all focus:outline-none ${kontrol.buzzer === 1 ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'}`}
                >
                  <Power className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-auto leading-relaxed">
                Manuel olarak kovan içi uyarı sesini (Buzzer) açıp kapatmanızı sağlar.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
