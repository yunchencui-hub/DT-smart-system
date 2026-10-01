// Local fonts (SIL OFL 1.1, see public/fonts/LICENSE-*.txt). loadFont() holds the render until they are ready.
import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

const nunito = [400, 600, 700, 800, 900];
for (const w of nunito) loadFont({ family: 'Nunito', url: staticFile(`fonts/nunito-${w}.woff2`), weight: String(w) });
for (const w of [400, 700]) loadFont({ family: 'JetBrains Mono', url: staticFile(`fonts/jetbrains-mono-${w}.woff2`), weight: String(w) });
