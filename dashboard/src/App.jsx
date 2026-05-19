import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from './firebase';
import { 
  Thermometer, 
  Droplets, 
  Scale, 
  Wind, 
  Activity, 
  AlertTriangle,
  Hexagon
} from 'lucide-react';
import './index.css';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(true); // Varsayılan olarak offline başlasın

  // Veri çekme işlemi
  useEffect(() => {
    const kovanRef = ref(database, 'kovan1/anlik');
    
    const unsubscribe = onValue(kovanRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setData(val);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Kesin (Gerçekçi) Çevrimiçi Kontrolü
  // Firebase'den gelen 'son_guncelleme' (timestamp) bilgisini baz alır.
  useEffect(() => {
    const watchdogInterval = setInterval(() => {
      if (data && data.son_guncelleme) {
        // Şu anki zaman ile verinin yazıldığı zamanı karşılaştır (15 saniye tolerans)
        const farkMs = Date.now() - data.son_guncelleme;
        if (farkMs > 15000) {
          setIsOffline(true);
        } else {
          setIsOffline(false);
        }
      } else {
        // Eğer veri var ama timestamp yoksa (eski veri kalıntısıysa) çevrimdışı say
        setIsOffline(true);
      }
    }, 1000); // Her saniye kontrol et

    return () => clearInterval(watchdogInterval);
  }, [data]);

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loader"></div>
        <p>Kovan Bağlantısı Kuruluyor...</p>
      </div>
    );
  }

  // Varsayılan değerler
  const hiveData = data || {
    sicaklik: 0,
    nem: 0,
    kilo: 0,
    rpm: 0,
    akustik: 0,
    fan_durum: false
  };

  const isStressAlert = hiveData.akustik > 600; // Örnek eşik değeri
  const isTempAlert = hiveData.sicaklik >= 35;

  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="header-title">
          <Hexagon size={40} />
          <span>BeeVoice IoT</span>
        </div>
        <div className={`status-badge ${isOffline ? 'offline' : ''}`}>
          <div className="status-dot"></div>
          {isOffline ? 'SİSTEM ÇEVRİMDIŞI' : 'SİSTEM AKTİF'}
        </div>
      </header>

      {(isStressAlert || isTempAlert) && !isOffline && (
        <div className="alert-banner">
          <AlertTriangle size={32} className="alert-icon" />
          <div className="alert-content">
            <h3>ACİL DURUM UYARISI</h3>
            <p>
              {isStressAlert && "Kovanda yüksek akustik stres tespit edildi! "}
              {isTempAlert && "Kovan içi sıcaklık kritik seviyede!"}
            </p>
          </div>
        </div>
      )}

      <div className="metrics-grid">
        {/* Sıcaklık */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">İç Sıcaklık</span>
            <Thermometer className="metric-icon" size={24} />
          </div>
          <div className="metric-value">
            {hiveData.sicaklik.toFixed(1)}
            <span className="metric-unit">°C</span>
          </div>
        </div>

        {/* Nem */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Bağıl Nem</span>
            <Droplets className="metric-icon" size={24} />
          </div>
          <div className="metric-value">
            {hiveData.nem.toFixed(1)}
            <span className="metric-unit">%</span>
          </div>
        </div>

        {/* Ağırlık */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Bal Rekoltesi (Ağırlık)</span>
            <Scale className="metric-icon" size={24} />
          </div>
          <div className="metric-value">
            {hiveData.kilo.toFixed(2)}
            <span className="metric-unit">kg</span>
          </div>
        </div>

        {/* Akustik Stres */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Akustik Aktivite</span>
            <Activity className="metric-icon" size={24} />
          </div>
          <div className="metric-value">
            {hiveData.akustik}
            <span className="metric-unit">/ 1023</span>
          </div>
        </div>
      </div>

      <div className="fan-indicator">
        <div className="fan-info">
          <Wind size={32} className={`fan-icon ${hiveData.fan_durum && !isOffline ? 'active' : ''}`} />
          <div className="fan-text">
            <h4>Otonom İklimlendirme (Fan)</h4>
            <p>
              {isOffline 
                ? 'Sistem çevrimdışı, fan durumu bilinmiyor' 
                : (hiveData.fan_durum ? 'Fan şu anda çalışıyor' : 'Sistem stabil, fan kapalı')}
            </p>
          </div>
        </div>
        <div className="fan-rpm">
          {hiveData.fan_durum && !isOffline ? `${hiveData.rpm} RPM` : '0 RPM'}
        </div>
      </div>
    </div>
  );
}

export default App;
