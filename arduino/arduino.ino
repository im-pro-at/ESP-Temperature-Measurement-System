/* 
 * Autor: im-pro
 * ESP8266 Community 3.0.1 
 *   Generic ESP8266 Module
 *     LED2
 *     US 115200
 *     CPU 80MH
 *     CF 26
 *     FS 512KN FS32k OTA230kb
 *     FM DOUT
 *     FF 40M
 *     RM dtr
 *     DP disable
 *     DL None
 *     IWIP v2 LOWER
 *     VT Flash
 *   
 * LIBS
 *   OneWire
 *   DallasTemperature
 *   
 */

#include <FS.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ESP8266WebServer.h>
#include <DNSServer.h>


#include <OneWire.h>
#include <DallasTemperature.h>

#define ONE_WIRE_BUS 2
#define TASTERLED 0

const char *myHostname = "sensor";

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

char ssid[64];
char wifipassword[64];
char website[64];
char webkey[64];

bool lastledstate=LOW;
unsigned long lastdatasent=0;

ESP8266WebServer server(80);

void setled(bool onoff){
  lastledstate=onoff;
  if(onoff){
    digitalWrite(TASTERLED,LOW);
    pinMode(TASTERLED,OUTPUT);
    digitalWrite(TASTERLED,LOW);
  }
  else{
    pinMode(TASTERLED,INPUT_PULLUP);
  }
}

bool getTaster(){
  bool state;
  pinMode(TASTERLED,INPUT_PULLUP);
  delay(1);
  state = digitalRead(TASTERLED);
  setled(lastledstate);
  return !state;
}

void error(int number){
  Serial.println();
  Serial.print("Blinking erro number: ");
  Serial.println(number);  
  setled(HIGH);
  delay(1000);
  setled(LOW);

  for(int i=0;i<number;i++){
    if(getTaster())
      setupmode();
    delay(500);
    setled(HIGH);
    delay(100);
    setled(LOW);
  }
  if(getTaster())
    setupmode();
  Serial.println("Restart ESP!");
  delay(1000);
  ESP.restart();
}

/*
 * NodeMCU URLEncode Decode Example
 * https://circuits4you.com
*/
 
String urlencode(String str)
{
    String encodedString="";
    char c;
    char code0;
    char code1;
    char code2;
    for (int i =0; i < str.length(); i++){
      c=str.charAt(i);
      if (c == ' '){
        encodedString+= '+';
      } else if (isalnum(c)){
        encodedString+=c;
      } else{
        code1=(c & 0xf)+'0';
        if ((c & 0xf) >9){
            code1=(c & 0xf) - 10 + 'A';
        }
        c=(c>>4)&0xf;
        code0=c+'0';
        if (c > 9){
            code0=c - 10 + 'A';
        }
        code2='\0';
        encodedString+='%';
        encodedString+=code0;
        encodedString+=code1;
      }
    }
    return encodedString;
    
}

void setupmode(){
  Serial.println("Enter Setupmode!");
    
  IPAddress AP_IP(192, 168, 111, 1);
  IPAddress AP_MASK(255, 255, 255, 0);

  DNSServer dnsServer;

  Serial.print("Start AP ... ");
  WiFi.mode(WIFI_OFF);
  delay(500);
  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(AP_IP, AP_IP, AP_MASK);
  WiFi.softAP("Sensor "+WiFi.macAddress());
  Serial.println("OK");
  
  Serial.print("Start DNS captive portal ... ");
  dnsServer.setErrorReplyCode(DNSReplyCode::NoError);
  dnsServer.start(53, "*", AP_IP);
  Serial.println("OK");
  
  Serial.print("Start Web server ... ");
  server.on("/", handleRoot);
  server.on("/save", handleSave);
  server.on("/generate_204", handleRoot);  
  server.on("/fwlink", handleRoot); 
  server.onNotFound(handleNotFound);
  server.begin();
  Serial.println("OK");
  
  unsigned long blink=millis();
  unsigned long timeout=millis();
  
  while(true){
    dnsServer.processNextRequest();
    server.handleClient();
    
    delay(1);
    
    if (millis()-blink>200){
      blink=millis();
      setled(!lastledstate);
    }
    
    if (WiFi.softAPgetStationNum()!=0){
      timeout=millis();
    }
    if (millis()-timeout>5*60*1000){
      Serial.println("Setup mode timeout!");
      Serial.println("Restart ESP!");
      delay(1000);
      ESP.restart();
    }

  }
}

boolean isIp(String str) {
  for (size_t i = 0; i < str.length(); i++) {
    int c = str.charAt(i);
    if (c != '.' && (c < '0' || c > '9')) {
      return false;
    }
  }
  return true;
}

String toStringIp(IPAddress ip) {
  String res = "";
  for (int i = 0; i < 3; i++) {
    res += String((ip >> (8 * i)) & 0xFF) + ".";
  }
  res += String(((ip >> 8 * 3)) & 0xFF);
  return res;
}

boolean captivePortal() {
  if (!isIp(server.hostHeader()) && server.hostHeader() != (String(myHostname) + ".local")) {
    Serial.println("Request redirected to captive portal");
    server.sendHeader("Location", String("http://") + toStringIp(server.client().localIP()), true);
    server.send(302, "text/plain", "");
    server.client().stop();
    return true;
  }
  return false;
}

void handleRoot() {
  if (captivePortal()) {
    return;
  }
  Serial.println("RootRequest");
  server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  server.sendHeader("Pragma", "no-cache");
  server.sendHeader("Expires", "-1");

  String Page;
  Page += String(F(
    R"=====(
      <!DOCTYPE html>
        <html lang='en'>
          <head>
            <script>
    )====="));
  Page += "var MAC=\""+WiFi.macAddress()+"\";\n";;
  Serial.print("Scan Wifi ... ");
  int n = WiFi.scanNetworks();
  Serial.println("OK");
  Page += "var SSIDs=[";
  for (int i = 0; i < n; i++) {
    Page += String("  \""+WiFi.SSID(i) +"\",");
  }
  Page += "];\n";
  Page += "var ssid=\""+String(ssid)+"\";\n";
  Page += "var password=\""+String(wifipassword)+"\";\n";
  Page += "var website=\""+String(website)+"\";\n";
  Page += "var webkey=\""+String(webkey)+"\";\n";
  Page += String(F(
    R"=====(
            </script>
            <link rel="icon" href="data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAACMuAAAjLgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAExMTABISEhcMDAw5AAAACQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABsbGwAaGhpRFRUVpAAAABEBAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcHBwAGhoaWBYWFrAAAAASAQEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHBwcABoaGlgWFhawAAAAEQEBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwcHAAaGhpYFhYWsAAAABIBAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcHBwAGxsbWBYWFq0AAAAQAQEBAAAAAAAAAAAAAAAAAAAAAAAAAAAPAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAFAAAACBASFToREhVgAAAABwEBAQAAAAAAAAAAAAAAAAAAAAAAAAAAggAAADgAAAAiAAAAIgAAABKeZwAPpmwAf5tlAKGcZgCiflMAdQAAAA8AAAAQAAAAHAAAABwAAAAbAAAADAAAAIIAAACwAAAAqgAAAKoAAABNsXMAHcuEANvMhQD/zYYA/6dtALcAAAAdAAAAegAAAKgAAACnAAAAmwAAADUAAACYAAAAvAAAAL8AAAC+AAAAU7J0ABzLhADazIUA/82GAP+nbQC2AAAAHgAAAI0AAAC/AAAAvgAAALAAAAA6AAAASQAAAHIAAAByAAAAcQAAAC++fAAYy4QAyMyFAOzMhQDtr3IAnwAAABQAAABfAAAAfgAAAH0AAABzAAAAIQAAAAAAAAAAAAAAAAAAAADBfgAA248ABJRhADFvSABObUcAUHZNACoAAAABAAAAAAAAAAEAAAABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABEAAAAnwAAAJ8AAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUwAAALoAAAC6AAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFIAAAC6AAAAuQAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAArwAAAK4AAAAzAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/x8AAP8fAAD/HwAA/x8AAP8fAAD/HwAAPB8AAAAAAAAAAAAAAAAAAAAAAAD4EQAA/D8AAPw/AAD8PwAA/D8AAA==">
            <meta charset="UTF-8">
            <style>
              h1
              {
                text-align: center;
              }
              p
              {
                margin: 0px;
              }
              input[type=text], select {
                width: 100%;
                padding: 12px 20px;
                margin: 8px 0;
                display: inline-block;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-sizing: border-box;
              }

              button {
                width: 100%;
                background-color: #4CAF50;
                color: white;
                padding: 14px 20px;
                margin: 8px 0;
                border: none;
                border-radius: 4px;
                cursor: pointer;
              }

              button:hover {
                background-color: #45a049;
              }

              div {
                border-radius: 5px;
                background-color: #f2f2f2;
                padding: 20px;
              }
              
              
            </style>
          </head>
          <body>
            <h1 id="header">Sensor settings for</h1>
            <div>
              <h4>WiFi configuration:</h4>
              <p>SSID:</p>
              <select id="ssid"></select> 
              <input type="text" id='otherssid'/>
              <p>Password: </p>
              <input type="text" id='password'/>
              <h4>Server configuration:</h4>
              <p>Website: (z.b temp.im-pro.at)</p>
              <input type="text" id='website'/>
              <p>Webkey: </p>
              <input type="text" id='webkey'/>
              <button id="submit">Submit and restart</button>
            </div>
            <script>
              document.querySelector("#header").append(" "+MAC.replaceAll(":","")+":");
              SSIDs.push("");
              SSIDs.forEach(function(ssid){        
                var option = document.createElement("option");
                if (ssid=="")
                  option.text = "Other";
                else
                  option.text = ssid;
                option.value = ssid;
                document.querySelector("#ssid").appendChild(option);
              });
              document.querySelector("#ssid").addEventListener('change', (event) => {
                console.log("ssid change "+document.querySelector("#ssid").value);
                if(document.querySelector("#ssid").value=="")
                  document.querySelector("#otherssid").style.display="block";
                else
                  document.querySelector("#otherssid").style.display="none";
              });
              if(ssid!=""){
                if (SSIDs.includes(ssid))
                  document.querySelector("#ssid").value=ssid;
                else
                  document.querySelector("#ssid").value="";
                  document.querySelector("#otherssid").value=ssid;
              }
              document.querySelector("#ssid").dispatchEvent(new Event('change'));
              document.querySelector("#password").value=password;
              document.querySelector("#website").value=website;
              document.querySelector("#webkey").value=webkey;
              
              const formData = new FormData();
              document.querySelector("#submit").addEventListener('click', (event) => {
                console.log("Submit");
                var config="";
                if(document.querySelector("#ssid").value==""){
                  if(document.querySelector("#otherssid").value==""){
                    alert("SSID cannot be empty!");
                    return;
                  }
                  formData.append('ssid', document.querySelector("#otherssid").value);
                }
                else{
                  formData.append('ssid', document.querySelector("#ssid").value);
                }
                formData.append('password', document.querySelector("#password").value);
                formData.append('website', document.querySelector("#website").value);
                if(document.querySelector("#website").value==""){
                  alert("Website cannot be empty!");
                  return;
                }
                formData.append('webkey', document.querySelector("#webkey").value);
                if(document.querySelector("#webkey").value==""){
                  alert("Webkey cannot be empty!");
                  return;
                }

                document.querySelectorAll("select,input,button").forEach(function(e){
                  e.disabled=true;
                });

                fetch('save', {
                  method: 'PUT',
                  body: formData
                })
                .then(response => response.text())
                .then(result => {
                  document.querySelectorAll("select,input,button").forEach(function(e){
                    e.disabled=false;
                  });
                  alert("Settings Saved! \nSensor will restart now!");
                })
                .catch(error => {
                  document.querySelectorAll("select,input,button").forEach(function(e){
                    e.disabled=false;
                  });
                  alert("Could not save the settings!");
                });                
              });
            </script>
          </body>
    )====="));
    
  server.send(200, "text/html", Page);
}


void handleSave() {
  Serial.println("Save Request:");
  Serial.println(server.arg("config"));

  SPIFFS.remove("/config.txt");
  File f = SPIFFS.open("/config.txt", "w");
  f.println(server.arg("ssid"));
  f.println(server.arg("password"));
  f.println(server.arg("website"));
  f.println(server.arg("webkey"));
  f.close();
  
  server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  server.sendHeader("Pragma", "no-cache");
  server.sendHeader("Expires", "-1");
  server.send(200, "text/plain", String(F("Saved!\n\n")));
  
  Serial.println("Restart ESP!");
  delay(1000);
  ESP.restart();
}


void handleNotFound() {
  if (captivePortal()) {
    return;
  }
  String message = F("File Not Found\n\n");
  message += F("URI: ");
  message += server.uri();
  message += F("\nMethod: ");
  message += (server.method() == HTTP_GET) ? "GET" : "POST";
  message += F("\nArguments: ");
  message += server.args();
  message += F("\n");

  for (uint8_t i = 0; i < server.args(); i++) {
    message += String(F(" ")) + server.argName(i) + F(": ") + server.arg(i) + F("\n");
  }
  server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  server.sendHeader("Pragma", "no-cache");
  server.sendHeader("Expires", "-1");
  server.send(404, "text/plain", message);
  Serial.println(message);
}

void setup() {
  Serial.begin(115200);
  delay(10);
  Serial.println();
  Serial.print("Mount SPIFFS ... ");
  if(!SPIFFS.begin())
  {
    SPIFFS.format();
    error(1);
  }
  Serial.println("OK");

  ssid[0]=0;
  wifipassword[0]=0;
  website[0]=0;
  webkey[0]=0;
  
  Serial.println("Load Configuration: ");
  File file = SPIFFS.open("/config.txt", "r");
  if (!file)
    error(2);
  if (!file.available())
    error(2);
  ssid[file.readBytesUntil('\n', ssid, sizeof(ssid))-1]=0;
  Serial.print("  SSID: ");
  Serial.println(ssid);
  if (!file.available())
    error(2);
  wifipassword[file.readBytesUntil('\n', wifipassword, sizeof(wifipassword))-1]=0;
  Serial.print("  WiFiPassword: ");
  Serial.println(wifipassword);
  if (!file.available())
    error(2);
  website[file.readBytesUntil('\n', website, sizeof(website))-1]=0;
  Serial.print("  Website: ");
  Serial.println(website);
  if (!file.available())
    error(2);
  webkey[file.readBytesUntil('\n', webkey, sizeof(webkey))-1]=0;
  Serial.print("  Webkey: ");
  Serial.println(webkey);

  Serial.print("Connect to WiFi ");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, wifipassword);
  for (int i=0;i<60;i++){
    delay(500);
    Serial.print(".");
    if (WiFi.status() == WL_CONNECTED)
      break;
    if(getTaster())
      setupmode();
  }
  if (WiFi.status() != WL_CONNECTED)
    error(3);
  Serial.println("OK");

  Serial.print("init sensor lib ... ");
  sensors.begin();
  Serial.println("OK");
}

void loop() {
  if(getTaster())
    setupmode();
  
  if (WiFi.status() != WL_CONNECTED)
    error(3);

  if (millis()-lastdatasent>60000)
  {
    lastdatasent=millis();

    Serial.print("Read temperature ... ");
    sensors.requestTemperatures();
    float tempC = sensors.getTempCByIndex(0);
    if(tempC == DEVICE_DISCONNECTED_C) 
      error(4);
    Serial.println("DONE");
    Serial.print("Temperature: ");
    Serial.print(tempC);
    Serial.println(" °C");
    
    WiFiClient client;
    HTTPClient http;

    Serial.print("Build request String ... ");
    String request="http://";
    request=request+website;
    request=request+"/php/?event=newtemp&key=";
    request=request+urlencode(webkey);
    request=request+"&mac=";
    request=request+WiFi.macAddress();
    request=request+"&temp=";
    request=request+tempC;
    Serial.println("OK");
    Serial.print("Request: ");
    Serial.println(request);
    
    Serial.print("DNSlookup website ... ");
    if (!http.begin(client, request))
      error(5);
    Serial.println("OK");
    Serial.print("Connect to website ... ");
    int responscode=http.GET();
    if (responscode<=0)
      error(5);
    if (responscode!=200)
      error(6);
    Serial.println("OK");
    String respons = http.getString();

    Serial.print("Respons: ");
    Serial.println(respons);
    if (respons!="OK"){
      if (respons=="E0")
        error(7);
      if (respons=="E1")
        error(8);
      if (respons=="E2")
        error(9);
    }
    Serial.print("Close connection ... ");
    http.end();
    Serial.println("OK");
  }
}
