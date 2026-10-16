import { BreadboardScene, Delivery, Extras, PinMap, Rules, Software, Title, Wires } from './getready';
import { Step1, Step2a, Step2b, Step2c, Step3a, Step3b, Step3c, Step3d, Step3e, Step4a, Step4b, Step4c, Step4d } from './steps14';
import { Step5a, Step5b, Step5c, Step5d, Step5e, Step5f, Step5g, Step5h } from './step5';
import { Next, Recap, Step6, Step7, Step8a, Step8b, Troubleshoot } from './steps68';
import type { SceneFC } from './util';

// scene id (src/script/scenes.ts) -> component
export const SCENE_COMPONENTS: Record<string, SceneFC> = {
  title: Title, delivery: Delivery, extras: Extras, wires: Wires, software: Software, rules: Rules, breadboard: BreadboardScene, pinmap: PinMap,
  step1: Step1, step2a: Step2a, step2b: Step2b, step2c: Step2c,
  step3a: Step3a, step3b: Step3b, step3c: Step3c, step3d: Step3d, step3e: Step3e,
  step4a: Step4a, step4b: Step4b, step4c: Step4c, step4d: Step4d,
  step5a: Step5a, step5b: Step5b, step5c: Step5c, step5d: Step5d, step5e: Step5e, step5f: Step5f, step5g: Step5g, step5h: Step5h,
  step6: Step6, step7: Step7, step8a: Step8a, step8b: Step8b,
  recap: Recap, troubleshoot: Troubleshoot, next: Next,
};
