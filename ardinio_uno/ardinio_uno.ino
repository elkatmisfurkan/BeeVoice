// ==============================================================================
// BEEVOICE IOT - UNO İÇİN SAF REST API MİMARİSİ (v7.3 Bİ-DİRECTİONAL)
// Çözülenler: HTTP Header Tampon Taşması (Buffer Overflow) ve Çöp Veri Filtreleme
// ==============================================================================

#include <SoftwareSerial.h>
#include <DHT.h>
#include "HX711.h"

#define DATABASE_HOST "beevoice-35c4b-default-rtdb.europe-west1.firebasedatabase.app"
#define DATABASE_SECRET "t3czGPDuvrZlT7pOBB3LWoJXjW6zdGl4LuLShlmT"
#define WIFI_SSID "Mobil"
#define WIFI_PASSWORD "13131313"

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

void firebaseSenkronizeEt(float t, float h, float k, int r, int s, bool fan) {
  while(espSerial.available()) espSerial.read();

  espSerial.println("AT+CIPSTART=\"SSL\",\"" DATABASE_HOST "\",443");
  delay(2500); 
  
  // 1. GET İSTEĞİ (HTTP/1.0 İLE KİRİLİĞİ ÖNLÜYORUZ)
  String getReq = "GET /kovan1/kontrol.json?auth=" DATABASE_SECRET " HTTP/1.0\r\nHost: " DATABASE_HOST "\r\n\r\n";
  espSerial.print(F("AT+CIPSEND="));
  espSerial.println(getReq.length());
  delay(500);
  espSerial.print(getReq);
  
  // ÇÖP VERİ FİLTRESİ: HTTP Header'larını atla, doğrudan JSON verisine in
  espSerial.setTimeout(3000);
  if (espSerial.find("\r\n\r\n")) { 
    String json = espSerial.readStringUntil('}'); 
    json += "}"; 
    
    // String temizliği
    json.replace(" ", "");
    json.replace("\"", "");
    json.replace("\n", "");
    json.replace("\r", "");
    
    if (json.indexOf("otonom:1") != -1) otonomMod = true;
    else if (json.indexOf("otonom:0") != -1) otonomMod = false;
    
    int fIdx = json.indexOf("fan:");
    if (fIdx != -1) manuelFanHiz = json.substring(fIdx + 4).toInt();
    
    int bIdx = json.indexOf("buzzer:");
    if (bIdx != -1) manuelBuzzer = (json.substring(bIdx + 7).toInt() == 1);
  }

  // GET Verisine göre fanı anında güncelle (Sadece Otonom kapalıysa)
  if (!otonomMod) {
    analogWrite(FAN_PWM_PIN, manuelFanHiz);
    fan = (manuelFanHiz > 0);
  }

  // 2. PUT İSTEĞİ (Telemetri Verilerini Buluta Bas)
  String data = "{\"sicaklik\":" + String(t) + ",\"nem\":" + String(h) + ",\"kilo\":" + String(k) + ",\"rpm\":" + String(r) + ",\"akustik\":" + String(s) + ",\"fan_durum\":" + (fan ? String("true") : String("false")) + "}";
  String putReq = "PUT /kovan1/anlik.json?auth=" DATABASE_SECRET " HTTP/1.1\r\nHost: " DATABASE_HOST "\r\nConnection: close\r\nContent-Type: application/json\r\nContent-Length: ";
  putReq += String(data.length()) + "\r\n\r\n" + data;

  espSerial.print(F("AT+CIPSEND="));
  espSerial.println(putReq.length());
  delay(500);
  espSerial.print(putReq);
  
  delay(1000);
  espSerial.println(F("AT+CIPCLOSE"));
}

void setup() {
    espSerial.begin(115200);
    
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
        
        if (otonomMod) {
            if (t >= 35.0) { analogWrite(FAN_PWM_PIN, 255); fanAktif = true; } 
            else if (t >= 30.0 && t < 35.0) { analogWrite(FAN_PWM_PIN, 127); fanAktif = true; } 
            else { analogWrite(FAN_PWM_PIN, 0); fanAktif = false; }
        }

        firebaseSenkronizeEt(t, h, k, r, anlikSes, fanAktif);
    }
}