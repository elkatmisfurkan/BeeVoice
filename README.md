# 🐝 BeeVoice IoT - Akıllı Kovan İzleme Sistemi

![BeeVoice Dashboard](https://img.shields.io/badge/UI-React_Vite-61DAFB?style=for-the-badge&logo=react)
![Backend](https://img.shields.io/badge/Backend-Firebase_RTDB-FFCA28?style=for-the-badge&logo=firebase)
![Hardware](https://img.shields.io/badge/Hardware-Arduino_Uno_|_ESP8266-00979D?style=for-the-badge&logo=arduino)

BeeVoice, endüstriyel standartlarda geliştirilmiş, **%100 Otonom** çalışan bir akıllı arı kovanı ekosistemidir. Ağır ve donanımı yoran kütüphaneler yerine, mikrokontrolcünün (Arduino Uno) donanımsal sınırlarını zorlayan **Saf (Baremetal) REST API** mimarisi kullanılarak geliştirilmiştir. 

## 🚀 Proje Vizyonu
Sistem, arıların stres seviyelerini, bal verimini ve kovan içi iklimlendirmeyi saniyesi saniyesine izler. İnsan müdahalesine gerek kalmadan, kovan içi sıcaklık veya nem kritik seviyelere ulaştığında kendi kendini soğutur. Arıların yüksek ses (akustik anomali) çıkardığı stres durumlarında donanımsal alarmlar üretir.

## ⚙️ Donanım Özellikleri (v9.0 Gözlemci Modu)
- **Saf HTTP İletişimi:** RAM düşmanı kütüphaneler (`FirebaseArduino` vb.) kullanılmadan, doğrudan ESP8266 AT Komutları ve SSL tüneli ile milisaniyelik veri aktarımı.
- **Akustik Stres Tespiti:** Kovan içi ses referans değeri (kalibrasyon) alınarak, arı vızıltısındaki ani yükselişler (stres/anomali) tespit edilir ve uyarı verilir.
- **Otonom İklimlendirme:** 
  - Sıcaklık **35°C**'yi aşarsa acil soğutma (%100 Fan).
  - Sıcaklık **30°C - 35°C** arasındaysa normal soğutma (%50 Fan).
  - Nem **%65** üzerine çıkarsa nem tahliyesi (%30 Fan - *Nefes/Üfleme Testi*).
- **Ağırlık Ölçümü:** HX711 Loadcell entegrasyonu ile anlık bal rekoltesi takibi.

## 💻 Yazılım & Web Paneli Özellikleri
- **Modern UI:** Tailwind CSS ve Lucide Icons ile tasarlanmış "Dark/Industrial" estetiğe sahip arayüz.
- **Gerçek Zamanlı Telemetri:** Firebase Realtime Database ile `onValue` dinleyicileri üzerinden sıfır gecikmeli veri akışı.
- **Durum Analizi:** Akustik aktivite seviyesi 1023 baremi üzerinden yüzdelik bar ile görselleştirilir. Kovan risk altındaysa UI üzerinde "Pulse" (kalp atışı) efektiyle acil durum uyarısı belirir.
- **Bağlantı Takibi (Watchdog):** Arduino'dan gelen son veri paketi (timestamp) baz alınarak, donanımın o an internete bağlı olup olmadığı hesaplanır (ONLINE/OFFLINE).

## 🛠️ Kurulum

### 1. Donanım (Arduino)
Kullanılan Pin Haritası:
- `D2`: DHT11 (Sıcaklık/Nem)
- `D3`: Fan Tacho (Devir Okuma)
- `D4`: Buzzer (Alarm)
- `D5 & D6`: HX711 (Ağırlık / DT & SCK)
- `D8 & D9`: ESP8266 (RX/TX - SoftwareSerial)
- `D10`: PWM Fan Kontrolü
- `A0`: Mikrofon (Ses/Akustik)

`ardinio_uno.ino` dosyasındaki Wi-Fi ve Firebase kimlik bilgilerinizi girip karta yükleyin.

### 2. Web Paneli (React)
```bash
cd dashboard
npm install
npm run dev
```

## 📝 Lisans
Bu proje açık kaynak kodlu olarak geliştirilmiştir. Arıları korumak ve teknolojiyi doğayla buluşturmak isteyen herkes tarafından geliştirilebilir.
