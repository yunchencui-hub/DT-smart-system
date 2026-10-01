// Render settings for `npx remotion render` / `npx remotion studio`.
// The scenes are designed at 1280x720 CSS px; --scale 1.5 gives a sharp 1920x1080 video.
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setScale(1.5);
Config.setCrf(20);
Config.setConcurrency(Number(process.env.REMOTION_CONCURRENCY ?? 3));
// Optional: use an existing Chrome/Chromium headless shell instead of Remotion's download.
if (process.env.REMOTION_BROWSER) Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
