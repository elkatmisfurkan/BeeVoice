// ==============================================================================
// BEEVOICE IOT - UNO İÇİN SAF REST API MİMARİSİ (v8.0 KURŞUN GEÇİRMEZ)
// Donanım: Arduino Uno + ESP8266 (D8, D9)
// Optimizasyonlar: AT Komut Senkronizasyonu ('>' ve 'OK' Bekleme)
// ==============================================================================

#include <SoftwareSerial.h>
#include <DHT.h>
#include "HX711.h"

// --- AĞ VE BULUT KİMLİKLERİ ---
#define DATABASE_HOST "beevoice-35c4b-default-rtdb.europe-west1.firebasedatabase.app"
#define DATABASE_SECRET "t3czGPDuvrZlT7pOBB3LWoJXjW6zdGl4LuLShlmT"
#define WIFI_SSID "Mobil"
#define WIFI_PASSWORD "13131313"

// --- UNO PİN HARİTASI ---
#define DHTPIN 2
#define FAN_TACH_PIN 3
#define BUZZER_PIN 4
#define DT_PIN 5
#define SCK_PIN 6
#define FAN_PWM_PIN 10
#define SES_PIN A0

SoftwareSerial espSerial(8, 9);
DHT dht(DHTPIN, DHT11);
HX711 scale;

float agirlikBoleni = -22000.0;
int sesReferans = 512;
unsigned long oncekiZaman = 0;
const long telemetriPeriyodu = 5000; 

volatile unsigned int palzSayisi = 0;
void fanPalzSay() { palzSayisi++; }

bool otonomMod = true;
int manuelFanHiz = 0;
bool manuelBuzzer = false;
bool isGetCycle = false;

void wifiBaglan() {
  espSerial.println(F("ATE0")); 
  delay(500);
  espSerial.println(F("AT+CWMODE=1"));
  delay(500);
  espSerial.println(F("AT+CIPMUX=0")); 
  delay(500);
  espSerial.println(F("AT+CIPSSLSIZE=4096")); 
  delay(500);
  espSerial.println("AT+CWJAP=\"" WIFI_SSID "\",\"" WIFI_PASSWORD "\"");
  delay(6000); 
}

void firebaseKontrolAl() {
  while(espSerial.available()) espSerial.read(); // Tamponu temizle

  espSerial.println("AT+CIPSTART=\"SSL\",\"" DATABASE_HOST "\",443");
  // SSL bağlantısının kurulması için ESP8266'nın OK veya ERROR dönmesini bekle (Timeout 5 sn)
  if(!espSerial.find("OK")) { 
    delay(1000); 
    return; // Bağlantı koptuysa pas geç, sistemi kilitleme
  } 
  
  String req = "GET /kovan1/kontrol.json?auth=" DATABASE_SECRET " HTTP/1.1\r\nHost: " DATABASE_HOST "\r\nConnection: close\r\n\r\n";
  espSerial.print(F("AT+CIPSEND="));
  espSerial.println(req.length());
  
  // ESP8266 veri kabul etmeye hazır olduğunda '>' işareti gönderir. Onu beklemeden string yollarsak veri bozulur!
  if(espSerial.find(">")) {
    espSerial.print(req);
    
    long t = millis();
    while(millis() - t < 3000) {
      if (espSerial.find("{")) { 
        String json = espSerial.readStringUntil('}');
        json.replace(" ", "");   // Boşlukları sil
        json.replace("\"", "");  // Tırnakları sil
        
        if (json.indexOf("otonom:1") != -1) otonomMod = true;
        else if (json.indexOf("otonom:0") != -1) otonomMod = false;
        
        int fIdx = json.indexOf("fan:");
        if (fIdx != -1) manuelFanHiz = json.substring(fIdx + 4).toInt();
        
        int bIdx = json.indexOf("buzzer:");
        if (bIdx != -1) manuelBuzzer = (json.substring(bIdx + 7).toInt() == 1);
        break;
      }
    }
  }
  
  espSerial.println(F("AT+CIPCLOSE"));
  delay(1000);
}

void firebaseGonder(float t, float h, float k, int r, int s, bool fan) {
  while(espSerial.available()) espSerial.read();

  espSerial.println("AT+CIPSTART=\"SSL\",\"" DATABASE_HOST "\",443");
  if(!espSerial.find("OK")) { 
    delay(1000); 
    return; 
  }
  
  String data = "{\"sicaklik\":" + String(t) + ",\"nem\":" + String(h) + ",\"kilo\":" + String(k) + ",\"rpm\":" + String(r) + ",\"akustik\":" + String(s) + ",\"fan_durum\":" + (fan ? String("true") : String("false")) + "}";
  String req = "PUT /kovan1/anlik.json?auth=" DATABASE_SECRET " HTTP/1.1\r\nHost: " DATABASE_HOST "\r\nConnection: close\r\nContent-Type: application/json\r\nContent-Length: ";
  req += String(data.length()) + "\r\n\r\n" + data;

  espSerial.print(F("AT+CIPSEND="));
  espSerial.println(req.length());
  
  if(espSerial.find(">")) {
    espSerial.print(req);
    delay(1000); // Ağda iletilmesi için bekle
  }
  
  espSerial.println(F("AT+CIPCLOSE"));
  delay(1000);
}

void setup() {
    espSerial.begin(115200);
    // Çok ÖNEMLİ: SSL bağlantısı (CIPSTART) bazen 3-4 saniye sürer. find() komutunun erken pes etmemesi için timeout süresini 5 saniyeye çıkarıyoruz.
    espSerial.setTimeout(5000); 
    
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
    pinMode(FAN_PWM_PIN, OUTPUT);
    analogWrite(FAN_PWM_PIN, 0);
    
    pinMode(FAN_TACH_PIN, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(FAN_TACH_PIN), fanPalzSay, RISING);

    dht.begin();
    scale.begin(DT_PIN, SCK_PIN);
    scale.set_scale(agirlikBoleni);
    scale.tare(); 

    long toplam = 0;
    for(int i = 0; i < 50; i++) { 
        toplam += analogRead(SES_PIN); 
        delay(10); 
    }
    sesReferans = toplam / 50;

    wifiBaglan();
}

void loop() {
    unsigned long suankiZaman = millis();
    int anlikSes = analogRead(SES_PIN);
    
    // ANOMALİ VEYA MANUEL BUZZER YÖNETİMİ
    if (!otonomMod && manuelBuzzer) digitalWrite(BUZZER_PIN, HIGH);
    else if (otonomMod && abs(anlikSes - sesReferans) >= 40) digitalWrite(BUZZER_PIN, HIGH); 
    else digitalWrite(BUZZER_PIN, LOW);

    // DÖNÜŞÜMLÜ İLETİŞİM (5 saniyede bir GET veya PUT)
    if (suankiZaman - oncekiZaman >= telemetriPeriyodu) {
        oncekiZaman = suankiZaman;

        if (isGetCycle) {
            firebaseKontrolAl();
            
            // GET Verisine göre fanı anında güncelle (Sadece Otonom kapalıysa)
            if (!otonomMod) {
                analogWrite(FAN_PWM_PIN, manuelFanHiz);
            }
        } else {
            float t = dht.readTemperature();
            float h = dht.readHumidity();
            float k = scale.is_ready() ? abs(scale.get_units(3)) : 0.0;

            detachInterrupt(digitalPinToInterrupt(FAN_TACH_PIN));
            int r = (palzSayisi / 2) * (60000 / telemetriPeriyodu); 
            palzSayisi = 0;
            attachInterrupt(digitalPinToInterrupt(FAN_TACH_PIN), fanPalzSay, RISING);

            bool fanAktif = false;
            
            // OTONOM İKLİMLENDİRME 
            if (otonomMod) {
                if (t >= 35.0) { analogWrite(FAN_PWM_PIN, 255); fanAktif = true; } 
                else if (t >= 30.0 && t < 35.0) { analogWrite(FAN_PWM_PIN, 127); fanAktif = true; } 
                else { analogWrite(FAN_PWM_PIN, 0); fanAktif = false; }
            } else {
                analogWrite(FAN_PWM_PIN, manuelFanHiz);
                fanAktif = (manuelFanHiz > 0);
            }

            firebaseGonder(t, h, k, r, anlikSes, fanAktif);
        }
        
        isGetCycle = !isGetCycle; // Sırayı değiştir
    }
}