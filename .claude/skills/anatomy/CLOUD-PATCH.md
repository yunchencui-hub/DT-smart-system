# Local patch: Anatomy for Claude Code cloud sessions

Build: `e9488296a44211c42701ff71705b7901470ec78f+cloud.3`

This copy of Anatomy is upstream [`wheresryan22/anatomy`](https://github.com/wheresryan22/anatomy) at commit
`e9488296a44211c42701ff71705b7901470ec78f`, plus the two changes below. The setup script reads the build
line above to tell whether this exact build is installed.

## 1. Chrome lookup finds the cloud's Chromium

Claude Code cloud sessions keep Chromium at `/opt/pw-browsers` and set
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, but have no `/usr/bin/chromium`. Upstream never looks
there, so every browser check stopped with `No Chrome found. Set CHROME_PATH ...`.

`chromePath()` in `scripts/capture.mjs`, `scripts/drive.mjs` and `scripts/turn-check.mjs`
(`scripts/lines.mjs` goes through `drive.mjs`) gets the same nine lines, just before its final
`return candidates.find(...)`:

```js
if (!candidates.some((path) => existsSync(path))) {
  for (const root of [process.env.PLAYWRIGHT_BROWSERS_PATH, "/opt/pw-browsers"]) {
    if (!root || root === "0") continue;
    try {
      const base = resolve(root);
      for (const dir of readdirSync(base).sort().reverse()) for (const sub of ["chrome-linux64/chrome", "chrome-linux/chrome"]) candidates.push(join(base, dir, sub));
    } catch {}
  }
}
```

The new lines run only when none of upstream's own candidates exists: `CHROME_PATH`, the system
Chrome paths and every `ms-playwright` cache. So wherever upstream finds a browser, nothing changes,
not even the files it touches. When upstream finds nothing, the lines look in `$PLAYWRIGHT_BROWSERS_PATH`
and then `/opt/pw-browsers`. Everything that could fail (a missing, unreadable or malformed directory,
a relative path in a deleted working directory) is inside `try`, so the scan never throws. The value
`0` (Playwright's "browsers inside node_modules") is ignored. No upstream line and no import changed.

## 2. Shorter `description` in SKILL.md

Anthropic's support article on custom skills caps the `description` at 200 characters, while the
claude.com skills docs and the Agent Skills spec allow 1,024. The upstream description (971
characters) was replaced by a 192-character one that fits both, so the claude.ai upload is accepted
either way. Only this frontmatter line changed. The original was:

> Build crafted, highly detailed, interactive isometric SVG figures that explain a technical idea as a real physical object (a test rig, a dial gauge, a cabinet of drawers, a plotter, a lock), with many small precise solid parts, four-tone shading, correct painter's order, a framed card with title, hint and live readout, and calm eased motion. Use this whenever someone wants an isometric illustration, an explanatory diagram or figure for docs, a blog post, a landing page or an article, a "Linear-style" or "premium" technical drawing, an interactive explainer, or an SVG that shows how a system, algorithm or component works, even if they never say "isometric". Works framework-free (TypeScript/JS that writes SVG and HTML) and in React/Next.js, and can add realistic WebGL shaders (fire, exhaust, water, caustics, lamp light) that live inside the drawing in the same isometric perspective. Also publishes a finished figure to the Anatomy community gallery when asked.

## Use one copy only

Claude Code picks a skill by name and gives no warning when two copies share it. A personal copy
(`~/.claude/skills/anatomy`) hides a project copy (`.claude/skills/anatomy` in the repo or a parent
folder). Either one takes the name `anatomy` from the claude.ai upload, which then shows only as
`anthropic-skills:anatomy`, and Claude uses the local copy. An old clone made from upstream's README,
a repo that commits an older `.claude/skills/anatomy`, or an older build from the setup script
therefore replaces this one silently, and the checks go back to `No Chrome found`.

Install by one route: the claude.ai upload with no other copy (every project), the cloud setup script
(every session of one cloud environment; its personal copy wins over project copies and the upload),
or this folder committed to a project's `.claude/skills/anatomy` (that project only, nothing to set up). To list every copy and its build, run this
from the project folder:

```sh
d=$PWD; set -- /etc/claude-code/.claude/skills/anatomy "$HOME/.claude/skills/anatomy" "$HOME"/.claude/skills/synced/*/anatomy; while :; do set -- "$@" "${d%/}/.claude/skills/anatomy"; [ "$d" = / ] && break; d=$(dirname "$d"); done; for s; do [ -f "$s/SKILL.md" ] && echo "$s: $(grep -osm1 'Build: `[^`]*`' "$s/CLOUD-PATCH.md" || echo 'NO CLOUD-PATCH.md (unpatched upstream)')"; done; true
```

Every line should show this file's build. Delete any copy marked `NO CLOUD-PATCH.md` or showing an
older build.

## Packaging

The claude.ai upload ZIP leaves out the repository's developer-only files (`.git`, `.github/` with CI
and README images, `.gitattributes`); the skill uses none of them, so README images show as broken
links. The cloud setup script installs a git checkout and keeps them.

## Known limits in cloud sessions (upstream behaviour, not changed)

- Chromium aborts with `Chrome exited before startup: SIGTRAP` when `TMPDIR` is a long path: its
  socket path must stay under 108 characters. Run the checks with `TMPDIR` unset (the default `/tmp`).
- Cloud containers have no GPU, so WebGL runs in software (SwiftShader). Figures and shaders render
  correctly, but `turn-check.mjs --perf` timings are far above the budgets in `references/3d.md` and
  say nothing about real devices.
- A Chrome profile folder (`/tmp/iso-capture-*`, `/tmp/iso-drive-*`, `/tmp/turn-check-*`, about
  1.5 MB) is sometimes left behind when Chrome is still writing at shutdown. The container is
  temporary, so this only matters in very long sessions.
- Chromium folders are picked by reverse string order, so `chromium-999` would beat `chromium-1194`.
  Cloud images ship a single version, so this does not arise there.
- In a synced install the skill folder is `~/.claude/skills/synced/<id>/anatomy`. Building an example
  writes its HTML next to its `build.mjs` there; a later sync may replace those files, which is harmless.

## Updating

To move to a newer upstream commit, review it, re-apply the two changes above, bump the build line,
and update both the commit and the build in the setup script, then rebuild the ZIP. Drop change 1 if
upstream starts reading `PLAYWRIGHT_BROWSERS_PATH` itself.
