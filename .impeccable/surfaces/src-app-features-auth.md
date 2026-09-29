---
version: 2
slug: "src-app-features-auth"
primary_target: "src/app/features/auth"
related_targets: []
---

# Surface brief: Auth screens (get started, login, register, forgot password)

**Scope:** `src/app/features/auth` holds the app's first real screens. They also set the app-wide visual world, and DESIGN.md is written from this build.
**Mode:** Operate: the visitor completes a task (get started, log in, register, reset a password). It opens with a Get Started moment.
**Audience:** passengers and tricycle drivers in Papaya; many drivers are older. They use the app outdoors in bright sun, with one hand, on low-end Android phones. Readability for older users is a hard requirement.
**Pinned by the user (2026-09-29):** the user's own mockup look (canon, not re-rolled). That means clean white screens, orange buttons, a map-first app, the tricycle + papaya-leaf logo, and a Get Started page before login. On top of that, the older-user rules stay: big text, strong contrast, big buttons, Taglish.
**Superseded:** v1 "TODA terminal sign" (seed 4ee2868e), replaced by the user's mockup.
**Unresolved:** the logo exists only in an AI-generated mockup, so it is recreated here as an authored SVG. The real town name for copy is still unconfirmed.

## Direction contract

THESIS: A calm, bright, white ride app that a 60-year-old driver can read in the sun. Papaya orange carries the one next action on every screen, papaya-leaf green marks the brand and success, and everything else is white space and big black text.

OWN-WORLD: White ground (#FFFFFF) with a warm off-white field surface (#F7F3EE). Deep papaya orange (#C2410C, pressed #9A3412) carries white text at 5.2:1 on every primary button and link; bright papaya (#F57C00) appears only inside the logo artwork, never behind text. Leaf green (#2E7D32) is used for the "HatidGo" half of the wordmark, success notices and the selected-state check. Ink is #1C1714 and soft ink #5A4F47 (7.9:1). Errors are #B42318 and always carry an icon. There is one family, Atkinson Hyperlegible Next: 800 for the wordmark and headings, 700 for labels and buttons, 400 for reading text, never below 16px, with an 18px root. Components are soft rounded rectangles (16px radius) and full-width buttons at least 60px tall. States are always shown by a mark as well as color.

STORY: A passenger or an older driver opens the app and sees the tricycle logo and the name. They press one big orange "Magsimula" button, or "May account na ako", and then fill in large, calm fields with plain Taglish labels that never disappear. There is nothing to learn.

FIRST VIEWPORT: Get Started, on a portrait phone. The upper area is white with a soft papaya-tint disc behind the tricycle + leaf logo (about 168dp), the wordmark "Papaya" (orange) "HatidGo" (green) at about 40px/800, and the line "Tricycle sa Papaya, isang tap lang." In the thumb zone at the bottom are the full-width orange "Magsimula" button (leading to register, where the role is chosen) and the outlined "May account na ako" button (leading to login). Signature moment: the logo settles in once on first open (a 500ms rise and fade, ease-out), instantly under reduced motion.

FORM: The user's mockup (canon, pinned by the user), rebuilt accessibly: contrast-checked orange, big type, big targets, Taglish.

FINISH: work that is unreviewed and undocumented is unfinished. This build ends with the finish review, the verdict and DESIGN.md.
