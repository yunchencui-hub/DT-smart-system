// voice.h - tiny driver for the DFRobot DFR0534 MP3 voice module (8 MB onboard flash).
//
// The module listens on a serial (UART) line at 9600 baud. Every command is one small packet:
//
//     0xAA  <command>  <data length>  <data bytes...>  <checksum>
//
// checksum = the lowest byte of the sum of ALL bytes before it (0xAA included).
// Source: DFR0534 datasheet + github.com/codingABI/DFR0534 (BSD-2 licensed reference).
//
// We only need three commands, so we write them ourselves instead of adding a library:
//   0x13 set volume, 0x08 play file by name (wildcards allowed), 0x04 stop.
#pragma once
#include <Arduino.h>

class Voice {
 public:
  explicit Voice(Stream &port) : _port(port) {}

  // 0 = mute ... 30 = max. The module starts at 20 after power-up.
  void setVolume(uint8_t level) {
    if (level > 30) level = 30;
    const uint8_t data[] = {level};
    send(0x13, data, sizeof(data));
  }

  // Plays the first audio file whose name starts with the 2-digit track number,
  // e.g. track 3 -> pattern "/03*" -> matches "/03.mp3" (or "/03.wav").
  // Playing by NAME (not by number) avoids the "file copy order" trap of this module.
  void playTrack(uint8_t track) {
    char pattern[10];
    snprintf(pattern, sizeof(pattern), "/%02u*", track);
    const uint8_t len = strlen(pattern);
    uint8_t data[1 + sizeof(pattern)];
    data[0] = DRIVE_FLASH;
    memcpy(data + 1, pattern, len);
    send(0x08, data, len + 1);
  }

  void stop() { send(0x04, nullptr, 0); }

 private:
  static const uint8_t DRIVE_FLASH = 0x02;  // 0x00 USB, 0x01 SD, 0x02 onboard flash

  void send(uint8_t command, const uint8_t *data, uint8_t len) {
    uint8_t checksum = 0xAA + command + len;
    _port.write((uint8_t)0xAA);
    _port.write(command);
    _port.write(len);
    for (uint8_t i = 0; i < len; i++) {
      _port.write(data[i]);
      checksum += data[i];
    }
    _port.write(checksum);
  }

  Stream &_port;
};
