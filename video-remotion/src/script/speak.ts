// Caption text -> what the narrator (Piper TTS) says. Ported from video/build.mjs and extended for the
// 30 Sep parts. scripts/voice.ts refuses to synthesise a sentence that still contains a symbol the voice
// would silently drop (+ − Ω µ € →) or a 6-digit SKU, because "stripe to the − rail" must never come
// out as "stripe to the rail".
export const SPEAK: [RegExp, string][] = [
  [/\bUNO R4 WiFi\b/g, 'Uno R4 Wi-Fi'], [/\bUNO R4\b/g, 'Uno R4'], [/\bWiFi\b/g, 'Wi-Fi'],
  [/\b5V\b/g, 'five volt'], [/\b3\.3 volts\b/g, 'three point three volts'], [/\b2\.4 gigahertz\b/g, 'two point four gigahertz'],
  [/\bGND\b/g, 'G N D'], [/\bVCC\b/g, 'V C C'], [/\bLDRs\b/g, 'L D Rs'], [/\bLDR\b/g, 'L D R'], [/\bPIR\b/g, 'P I R'],
  [/\bMQTT\b/g, 'M Q T T'], [/\bIDE\b/g, 'I D E'], [/\bUSB-C\b/g, 'U S B C'], [/\bmicro-USB\b/g, 'micro U S B'],
  [/\bUSB\b/g, 'U S B'], [/\bLEDs\b/g, 'L E Ds'], [/\bLED\b/g, 'L E D'], [/\bIP\b/g, 'I P'], [/\bCE\b/g, 'C E'],
  [/\bA0\b/g, 'A zero'], [/\bA1\b/g, 'A one'], [/\bD0\b/g, 'D zero'], [/\bD1\b/g, 'D one'], [/\bD2\b/g, 'D two'], [/\bD3\b/g, 'D three'],
  [/\bDFR0534\b/g, 'D F R zero five three four'], [/\bArduinoMqttClient\b/g, 'Arduino M Q T T Client'],
  [/\barduino_secrets\.example\.h\b/g, 'arduino secrets dot example dot h'], [/\barduino_secrets\.h\b/g, 'arduino secrets dot h'],
  [/\brobin\.ino\b/g, 'robin dot ino'], [/\bface\.h\b/g, 'face dot h'], [/\blight_raw\b/g, 'light raw'], [/\bpir_raw\b/g, 'P I R raw'],
  [/\bmosquitto_sub\b/g, 'mosquitto sub'], [/\b01\.mp3\b/g, 'zero one dot M P 3'], [/\b13\.mp3\b/g, 'thirteen dot M P 3'],
  [/\baudio\/en\b/g, 'audio slash E N'], [/\baudio\/nl\b/g, 'audio slash N L'],
  [/\bSP\+/g, 'S P plus'], [/\bSP−/g, 'S P minus'],
  [/\bvol 15\b/g, 'vol fifteen'], [/\bvol 20\b/g, 'vol twenty'], [/\bsay 3\b/g, 'say three'], [/\b115200\b/g, 'one hundred fifteen thousand two hundred'],
  [/\b1023\b/g, 'ten twenty-three'], [/\b680\b/g, 'six hundred and eighty'], [/\b675\b/g, 'six hundred and seventy-five'],
  [/\b12 by 12\b/g, 'twelve by twelve'], [/\b23 to 24\b/g, 'twenty-three to twenty-four'],
];
export const speakify = (s: string) => SPEAK.reduce((r, [a, b]) => r.replace(a, b), s);

// Symbols Piper would drop or mangle. A spoken sentence must not contain any of them.
export const UNSPEAKABLE = /[+−Ω€µ→×≈≳]|\b\d{6}\b/;

export function sentences(text: string): string[] {
  const prot = text.replace(/\b(Mrs|Mr|Dr|e\.g|i\.e)\./g, '$1§').replace(/(\d)\.(\d)/g, '$1¤$2');
  return prot
    .split(/(?<=[.!?:])\s+(?=[A-Z0-9'"‘“(])/)
    .map((s) => s.replace(/§/g, '.').replace(/¤/g, '.').trim())
    .filter(Boolean);
}
