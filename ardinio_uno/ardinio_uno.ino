// ==============================================================================
// BEEVOICE IOT - OTONOM TELEMETRİ MİMARİSİ (v9.0 GÖZLEMCİ MODU)
// Donanım: Arduino Uno + ESP8266
// Konsept: %100 Otonom Yapay Zeka - Sadece Veri İletimi
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

void firebaseGonder(float t, float h, float k, int r, int s, bool fan) {
  while(espSerial.available()) espSerial.read(); // Tamponu temizle

  espSerial.println("AT+CIPSTART=\"SSL\",\"" DATABASE_HOST "\",443");
  if(!espSerial.find("OK")) { 
    delay(1000); 
    return; 
  }
  
  String data = "{\"sicaklik\":" + String(t) + ",\"nem\":" + String(h) + ",\"kilo\":" + String(k) + ",\"rpm\":" + String(r) + ",\"akustik\":" + String(s) + ",\"fan_durum\":" + (fan ? String("true") : String("false")) + ",\"son_guncelleme\":{\".sv\":\"timestamp\"}}";
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
    
    // SADECE AKUSTİK ANOMALİ YÖNETİMİ (Arıların yüksek ses stresi)
    if (abs(anlikSes - sesReferans) >= 40) digitalWrite(BUZZER_PIN, HIGH); 
    else digitalWrite(BUZZER_PIN, LOW);

    // TELEMETRİ GÖNDERİMİ (5 Saniyede Bir)
    if (suankiZaman - oncekiZaman >= telemetriPeriyodu) {
        oncekiZaman = suankiZaman;

        float t = dht.readTemperature();
        float h = dht.readHumidity();
        float k = scale.is_ready() ? abs(scale.get_units(3)) : 0.0;

        detachInterrupt(digitalPinToInterrupt(FAN_TACH_PIN));
        int r = (palzSayisi / 2) * (60000 / telemetriPeriyodu); 
        palzSayisi = 0;
        attachInterrupt(digitalPinToInterrupt(FAN_TACH_PIN), fanPalzSay, RISING);

        bool fanAktif = false;
        
        // %100 OTONOM İKLİMLENDİRME 
        if (t >= 35.0) { 
            analogWrite(FAN_PWM_PIN, 255); // Aşırı Sıcak: Tam güç soğutma
            fanAktif = true; 
        } 
        else if (t >= 30.0 && t < 35.0) { 
            analogWrite(FAN_PWM_PIN, 127); // Sıcak: Normal soğutma
            fanAktif = true; 
        } 
        else if (h >= 65.0) { 
            // NEFES TESTİ: Sensöre üflendiğinde nem anında %70-80'lere fırlar.
            // Fan düşük devirde (%30) dönerek neme "hafif bir tepki" verir.
            analogWrite(FAN_PWM_PIN, 80); 
            fanAktif = true; 
        }
        else { 
            analogWrite(FAN_PWM_PIN, 0); // Kovan stabil: Fan kapalı
            fanAktif = false; 
        }

        firebaseGonder(t, h, k, r, anlikSes, fanAktif);
    }
}