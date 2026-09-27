// Copy this file to "arduino_secrets.h" (same folder) and fill in your own values.
// arduino_secrets.h is in .gitignore, so your WiFi password never ends up on GitHub.

#define SECRET_WIFI_SSID  "MyPhoneHotspot"   // 2.4 GHz network! (eduroam will NOT work)
#define SECRET_WIFI_PASS  "hotspot-password"

// IP address of the laptop that runs Mosquitto (Windows: `ipconfig`, macOS: `ipconfig getifaddr en0`)
#define SECRET_MQTT_HOST  "192.168.1.23"
#define SECRET_MQTT_PORT  1883

// Optional: leave empty ("") when the broker allows anonymous clients
#define SECRET_MQTT_USER  ""
#define SECRET_MQTT_PASS  ""

// Unique name of this robot; used in the MQTT topics: robin/<DEVICE_ID>/...
#define SECRET_DEVICE_ID  "robin-01"
