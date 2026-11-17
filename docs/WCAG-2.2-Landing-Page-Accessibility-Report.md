# WCAG 2.2 Level AA — Landing Page Accessibility Report

| | |
|---|---|
| **Scope** | The landing page `/[locale]` (`/en`, `/bn`): site header, hero + search, stats strip, quick links, featured innovations, categories, challenge banner, news, partners, footer, and the challenge popup that opens on it |
| **Standard** | WCAG 2.2, Level A + AA |
| **Constraint** | No change to design, layout, colours, branding or visual appearance |
| **Date** | 2026-11-17 (session 49) |
| **Environment** | Local dev (Next.js :3000, API :4000), Chrome, browser automation |
| **Outcome** | Every issue that could be fixed **without a visible change** is fixed and verified. The search placeholder contrast (1.4.3) was then fixed with one **approved** colour change (§1.1). **Full WCAG 2.2 AA conformance is _not_ claimed**: continuously running animations (2.2.2) were left as they are by decision, and real screen-reader / real-device testing has not been done. See [§6](#6-remaining-issues). |

---

## 1. What changed

All changes are semantic / ARIA / focus-behaviour only. The "visual fingerprint" comparison in §4.2 shows the rendered page is identical before and after.

| Area | Problem found | Fix (no visual change) | WCAG |
|---|---|---|---|
| **Challenge popup** (opens on page load) | Focus stayed on the page behind the modal; Tab moved through the hidden page (verified: 3×Tab landed on the header's "EN" button behind the overlay); dialog role was on the dimmed backdrop; no description | Focus moves to the dialog panel on open (panel `tabIndex=-1`, transparent outline — no ring is drawn); Tab / Shift+Tab are trapped inside and wrap; Escape closes; focus returns to the previously focused element; `role="dialog"` + `aria-modal` + `aria-labelledby` + `aria-describedby` on the panel; decorative icon/dot hidden | 2.1.1, 2.1.2, 2.4.3, 2.4.11, 4.1.2 |
| **Hero search** | Input had no label (placeholder only); the input had `focus:outline-none`, so keyboard focus on it was **invisible** | `role="search"` landmark with a translated name; input `aria-label` + `name="q"`; the pill shows the site's standard focus ring **only while the input has keyboard focus** (`has-[input:focus-visible]:ring-2`) | 1.3.1, 2.4.7, 3.3.2, 4.1.2 |
| **Headings** | h1 → h3 jump (quick-link cards had no h2); footer used h3 with no h2; the "Ecosystem partners" label wasn't a heading | Visually hidden h2 "Explore the repository" before the quick-link cards; footer column titles h3 → h2 and "Ecosystem partners" p → h2 **with the same classes** (Tailwind preflight resets heading size/weight, so they render identically) | 1.3.1, 2.4.6 |
| **Lists** | Card grids, category chips, partner logos were bare `div`s | `ul/li` (preflight removes list styling). Cards keep their grid sizing via `li.flex` + card `min-w-0 flex-1`; mobile-hidden category chips moved their `hidden sm:flex` to the `li` so no empty flex item is left | 1.3.1 |
| **Header nav** | No `aria-current`; English-only labels ("Main", "Toggle menu", "Language", logo `aria-label`) on the Bangla site; mobile menu not tied to its button; no Escape | `aria-current="page"` (desktop + mobile + logo on `/`); labels translated; logo link named by its translated `alt` (instead of an English `aria-label` over it); menu button `aria-controls="mobile-nav"`, mobile menu is a named `<nav>`; Escape closes it and returns focus to the button; icons hidden | 1.3.1, 2.4.3, 3.1.2, 4.1.2 |
| **Language switcher** | No selected state for AT; English group label; browser-default focus outline on navy | `aria-pressed`; translated group label; white focus ring with navy offset (focus-visible only) | 4.1.2, 2.4.7 |
| **Top bar / footer links** | Browser-default focus outline (low visibility on navy) | White ring + navy offset on `:focus-visible` only | 2.4.7 |
| **Footer** | Link columns not landmarks | `<nav aria-labelledby>` for Explore / Participate | 1.3.1, 2.4.1 |
| **Stats counters** | Count up from 0 only once scrolled into view — a screen reader reading ahead heard "0"; region label English-only; decorative pulse exposed | Real value in a visually hidden span, animated digits `aria-hidden`; translated label; pulse hidden | 1.3.1, 4.1.2, 3.1.2 |
| **Category chips** | Bare number ("Agriculture 6") | Visible number `aria-hidden` + hidden "(6 innovations / 6টি উদ্ভাবন)" | 2.4.4, 1.3.1 |
| **Language of parts** | On `/bn`, English database content (innovation titles/summaries, categories, organisations, stage labels, news dates, partner names, contact block, untranslated challenge text) was read with Bangla pronunciation | `lang="en"` added only where the text is actually Latin-script (new `lib/text-lang.ts` detects Bengali script, so Bangla typed into "English" fields is left alone). 41 elements marked on `/bn`; none needed on `/en` | 3.1.2 |
| **Focus under sticky header** | 118 px sticky header could cover a focused control | `main :is(a, button, input, select, textarea, [tabindex]) { scroll-margin-top: 9rem }` — only affects scroll-into-view | 2.4.11 |
| **Page title** | `/bn` title was English | Localised via `generateMetadata` (`জাতীয় উদ্ভাবন রিপোজিটরি \| বাংলাদেশ`) | 2.4.2, 3.1.1 |
| **Loading state** | Featured-innovation skeletons exposed as empty items | Skeletons `aria-hidden`, list `aria-busy`, hidden status "Loading featured innovations…" | 4.1.3 |
| **Motion** | framer-motion entrance animations ignored the OS "reduce motion" setting (CSS animations already respected it) | `<MotionConfig reducedMotion="user">` in `providers.tsx` — no change for anyone without that setting | 2.3.3 (AAA, bonus); helps 2.2.2 |
| **Decorative arrows / icons** | "→" read as "right arrow" inside link names | `aria-hidden` | 1.1.1 |

### 1.1 Approved visual change (2026-11-17)

The one deliberate visual change, approved by the product owner after the first report: the hero
search placeholder colour `#8494AC` (3.08:1) → **`#66768F` (4.61:1)**, same blue-grey hue, slightly
darker. Nothing else changed visually.

Skip link (`common.skipToContent`, first Tab stop) and `<main id="main-content">` were already added in the sign-in/registration work and are reused here.

### Files

| File | Change |
|---|---|
| `components/layout/site-header.tsx` | aria-current, translated labels, menu `aria-controls` + Escape, mobile `<nav>`, top-bar focus ring |
| `components/layout/locale-switcher.tsx` | aria-pressed, translated label, focus ring |
| `components/layout/site-footer.tsx` | h2 headings, `<nav>` columns, focus ring, `lang` on English-only text |
| `components/layout/challenge-popup.tsx` | Focus management, Tab trap, focus return, dialog semantics, `lang` |
| `components/home/hero.tsx` | Search landmark, label, focus indicator |
| `components/home/stats-strip.tsx`, `components/ui/animated-counter.tsx` | Translated label, real value for AT |
| `components/home/quick-links.tsx` | Hidden h2, list, hidden arrow |
| `components/home/featured-innovations.tsx`, `components/ui/innovation-card.tsx`, `components/ui/stage-pill.tsx` | List, loading status, `lang`, `className` prop on the card |
| `components/home/category-grid.tsx` | List, spoken counts |
| `components/home/challenge-banner.tsx`, `news-section.tsx`, `partners-strip.tsx` | Lists, headings, `lang`, hidden decoration |
| `app/[locale]/page.tsx` | Localised `<title>` |
| `app/[locale]/providers.tsx` | `MotionConfig reducedMotion="user"` |
| `app/globals.css` | `scroll-margin-top` for focusable controls in `<main>` |
| `lib/text-lang.ts` | **New** — `textLang(text, locale)` |
| `messages/en.json`, `bn.json` | 14 new strings (`common.*`, `home.*`) |

No API, database, layout or style-token changes.

---

## 2. WCAG 2.2 A/AA criteria — status on the landing page

✅ verified · ⚠ partially / open issue · ➖ not applicable · ❔ not verifiable with the available tools

| SC | Level | Title | Status | Notes |
|---|---|---|---|---|
| 1.1.1 | A | Non-text Content | ✅ | Logos have names (`alt`, translated for the home link); partner logos `alt` = partner name; decorative images (`alt=""`), hero graphic, icons and pulses hidden |
| 1.2.x | A/AA | Time-based media | ➖ | No audio/video on the page |
| 1.3.1 | A | Info and Relationships | ✅ | Landmarks (header, 2 navs, search, main, named sections, footer navs), heading outline without skips, lists |
| 1.3.2 | A | Meaningful Sequence | ✅ | DOM order = visual order |
| 1.3.3 | A | Sensory Characteristics | ✅ | No shape/position-only instructions |
| 1.3.4 | AA | Orientation | ✅ | No lock |
| 1.3.5 | AA | Identify Input Purpose | ➖ | Only a search field (not personal data) |
| 1.4.1 | A | Use of Color | ✅ | Active nav item also has a 2px underline bar; links are identifiable by position/shape |
| 1.4.3 | AA | Contrast (Minimum) | ✅ | All text ≥ 4.5:1 (lowest: placeholder `#66768F` 4.61:1 — was 3.08:1, fixed with the approved change in §1.1) |
| 1.4.4 | AA | Resize Text | ✅ / ❔ | Relative units; emulated with CSS zoom only |
| 1.4.5 | AA | Images of Text | ✅ | Only logos (exempt) |
| 1.4.10 | AA | Reflow | ❔ | See §4.4 — emulation can't apply phone breakpoints; real-device test needed |
| 1.4.11 | AA | Non-text Contrast | ✅ | Focus rings ≥ 3:1 (green 5.39:1 on white; white 15.5:1 on navy); search pill border navy; card borders are not needed to identify the controls (text is) |
| 1.4.12 | AA | Text Spacing | ✅ | No fixed-height text containers on the page (checked on the sign-in work with the same components/tokens) |
| 1.4.13 | AA | Content on Hover or Focus | ✅ | Only native `title` tooltip on the live-challenge mark |
| 2.1.1 | A | Keyboard | ✅ | Every control reachable and operable; popup and mobile menu operable incl. Escape |
| 2.1.2 | A | No Keyboard Trap | ✅ | Popup traps focus intentionally while open and releases on close/Escape |
| 2.1.4 | A | Character Key Shortcuts | ➖ | None |
| 2.2.1 | A | Timing Adjustable | ➖ | No time limits (the popup countdown is information, not a limit) |
| 2.2.2 | A | Pause, Stop, Hide | ⚠ | **Accepted as is (decision 2026-11-17):** hero "river" animation (26 s loop, infinite), pulsing "live" dots and the header sparkle run indefinitely with no on-page pause control. They stop when the OS "reduce motion" setting is on (CSS + framer-motion). The popup countdown can be hidden by closing the popup. Strictly, this criterion is not met |
| 2.3.1 | A | Three Flashes | ✅ | No flashing |
| 2.4.1 | A | Bypass Blocks | ✅ | Skip link (first Tab stop) + landmarks |
| 2.4.2 | A | Page Titled | ✅ | Localised title |
| 2.4.3 | A | Focus Order | ✅ | Logical; popup/menu focus management |
| 2.4.4 | AA* | Link Purpose (In Context) | ✅ / ⚠ | Purposes clear in context; but footer "Register as an innovator" links to `/register?role=mentor` (§6) |
| 2.4.5 | AA | Multiple Ways | ✅ | Nav, search, footer links |
| 2.4.6 | AA | Headings and Labels | ✅ | |
| 2.4.7 | AA | Focus Visible | ✅ | Every control shows a ring on keyboard focus (verified with screenshots; search input fixed) |
| 2.4.11 | AA | Focus Not Obscured (Minimum) | ✅ | `scroll-margin-top: 9rem` vs 118 px header; popup traps focus so nothing behind it gets focus |
| 2.5.1 | A | Pointer Gestures | ➖ | None |
| 2.5.2 | A | Pointer Cancellation | ✅ | Native links/buttons (activate on up-event) |
| 2.5.3 | A | Label in Name | ✅ | Accessible names start with the visible text |
| 2.5.4 | A | Motion Actuation | ➖ | None |
| 2.5.7 | AA | Dragging Movements | ➖ | None |
| 2.5.8 | AA | Target Size (Minimum) | ✅ | No failures after applying the spacing exception (smallest: language buttons 41×22 / 52×22 and top-bar link 65×16, each with ≥ 24 px clear spacing; inline text links exempt) |
| 3.1.1 | A | Language of Page | ✅ | `<html lang>` |
| 3.1.2 | AA | Language of Parts | ✅ | 41 parts marked on `/bn` (see §1) |
| 3.2.1 / 3.2.2 | A | On Focus / On Input | ✅ | No context change on focus/input (popup opens on page load, not on focus) |
| 3.2.3 / 3.2.4 | AA | Consistent Navigation / Identification | ✅ | Shared header/footer |
| 3.2.6 | A | Consistent Help | ✅ | Contact block in the same place in the footer on every page |
| 3.3.x | A/AA | Input assistance | ✅ / ➖ | Only the search field (labelled; no error states) |
| 4.1.2 | A | Name, Role, Value | ✅ | Names/states on every control (`aria-pressed`, `aria-expanded`, `aria-current`, dialog) |
| 4.1.3 | AA | Status Messages | ✅ | Loading status for featured innovations |

\* 2.4.4 is Level A.

---

## 3. How it was tested

| Method | Tool / approach |
|---|---|
| Source review | Every landing-page component, header, footer, popup, shared card/counter/pill |
| Contrast | WCAG relative-luminance formula for every colour pair the page uses (§4.3) |
| Automated in-page checks | A self-written checker (axe-core could not be loaded — injecting a CDN script was not permitted in this environment): programmatic labels, accessible names, image alt, unhidden decorative SVGs, duplicate ids, single h1, `lang`, title, input-border contrast, text contrast of every visible text node, target size **with the 2.5.8 spacing exception** |
| Structure | Heading outline + level-skip detection, landmark list, list semantics, `aria-current`, `lang` parts, unmarked Latin text on `/bn` |
| Visual regression | "Visual fingerprint": position, size, colour, font and background of every visible text run plus every image/SVG, captured **before any change** and after, compared exactly (§4.2) |
| Keyboard | Real Tab / Shift+Tab / Enter / Escape in Chrome: skip link, popup, nav, search, cards, language switch, mobile menu; focus rings checked on screenshots |
| Responsive | Desktop 1237 px viewport, real 691 px viewport (mobile header + menu), and CSS-zoom emulation of tablet (≈773 px) and phone (≈320–495 px) |
| Functional regression | Search submit, language switch, popup close/Escape, mobile menu, `tsc --noEmit` |
| Languages | Every check run on `/en` and `/bn` (fingerprints: en desktop/tablet/mobile, bn desktop/mobile) |

---

## 4. Results

### 4.1 Before → after (automated / structural)

| Check | Before | After |
|---|---|---|
| Unlabelled controls | 1 (hero search) | 0 |
| Target-size failures (with spacing exception) | 0 | 0 |
| Heading level skips | 2 (h1→h3 quick links; footer h3 with no h2) | 0 |
| Landmarks | header, nav "Main", main, 1 section, footer | + search, named quick-links section, 2 footer navs; all names translated on `/bn` |
| `aria-current` | 0 | Current page marked (home logo on `/`) |
| Popup: focus inside on open | ❌ (focus on `<body>`; Tab reached the header behind the overlay) | ✅ focus on dialog; Tab cycle **Close → View details → Maybe later → Close**, Shift+Tab reverse; Escape closes, page scroll unlocked |
| Mobile menu | No `aria-controls`, no Escape | `aria-expanded` true/false, named `<nav id="mobile-nav">`, Escape closes and focus returns to the button (tested at a real 691 px viewport) |
| `/bn` Latin text not marked `lang="en"` inside `<main>` | many (all DB content) | 0 outside the `aria-hidden` hero graphic |
| `/bn` title | English | `জাতীয় উদ্ভাবন রিপোজিটরি \| বাংলাদেশ` |
| Stats values exposed to AT before animation | "0" | real values (42, 20, 26, 6, 0) |
| Category link names | "Agriculture & Food Security 6" | "কৃষি ও খাদ্য নিরাপত্তা (6টি উদ্ভাবন)" / "Agriculture & Food Security (6 innovations)" |

### 4.2 Visual fingerprint (design unchanged)

| Capture | Visible items compared | Differences |
|---|---|---|
| `/en` desktop (1237 px) | 200 | **0** |
| `/en` tablet (zoom 1.6) | 200 | **0** |
| `/en` phone (zoom 2.5) | 202 | **0** |
| `/bn` desktop | 202 | **0** |
| `/bn` phone (zoom 2.5) | 202 | **0** |

Excluded by design: text that is visually hidden (skip link, pre-existing "(Open now)", new sr-only labels), the header's vertical position (sticky, depends on scroll), the "→" glyph's box (now a separate span — glyph position unchanged), and the twinkling sparkle's frame-dependent size. The first run **did** find a difference: in the cramped zoom-2.5 grid, the new `<li class="flex">` wrapper let quick-link cards grow past their column (`min-width: auto`). Fixed with `min-w-0`; re-run → 0 differences.

### 4.3 Contrast (computed)

| Pair | Ratio | |
|---|---|---|
| navy text / white | 15.53 | ✅ |
| slate body text / white · mist · hero bg | 6.48 · 5.94 · 6.29 | ✅ |
| nirgreen-deep eyebrows & CTAs / white · mist · hero bg | 5.39 · 4.95 · 5.23 | ✅ |
| white on nirgreen-deep (buttons) | 5.39 | ✅ |
| `#9DB3D6` · `#B9C7DE` · `#C7D4E8` · `#E4EBF5` on navy | 7.29 · 9.09 · 10.36 · 12.95 | ✅ |
| Stage pills (navy-2 / amber-deep / nirgreen-dark on tints) | 9.64 · 5.32 · 7.18 | ✅ |
| Popup countdown amber-deep on amber/20 | 5.24 | ✅ |
| Focus ring: green on white · white offset on navy | 5.39 · 15.53 | ✅ |
| Search placeholder `#66768F` / white (was `#8494AC` 3.08) | 4.61 | ✅ |

### 4.4 Keyboard & functional

| # | Scenario | Result |
|---|---|---|
| 1 | Page load: popup open, focus on dialog panel (no visible ring) | ✅ |
| 2 | Tab ×5 / Shift+Tab ×2 inside popup | ✅ stays inside, wraps both ways |
| 3 | Escape closes popup; body scroll restored | ✅ |
| 4 | First Tab after closing → "Skip to main content" | ✅ |
| 5 | Focus ring visible: Search button, "Explore innovations", quick-link card, FAQ nav link, বাংলা button, Dashboard link (screenshots) | ✅ |
| 6 | Search: type "agriculture" + Enter → `/repository?q=agriculture` | ✅ unchanged |
| 7 | Language switch by keyboard (বাংলা + Enter) → `/bn`, `lang=bn`, Bangla title, `aria-pressed` flips, labels "ভাষা" / "মেনু" | ✅ |
| 8 | Mobile menu at 691 px: open (`aria-expanded=true`, 7 links), Escape closes, focus back on button | ✅ |
| 9 | `tsc --noEmit` (web) | ✅ clean |
| 10 | Reflow at a 320 px equivalent (CSS zoom 2.16 on 691 px) | ❔ 18.75 px horizontal scroll — **identical with the old markup** (rebuilt in the page and re-measured), so not introduced by this work. Cause: CSS zoom keeps the 691 px media-query width, so the 3-column tablet grid is squeezed into 320 CSS px; a real phone / 400 % browser zoom gets the single-column layout. Needs a real-device check |

---

## 5. Notes for future work on the landing page

- Use `focus-ring` (or the navy-background variant `focus-visible:ring-white focus-visible:ring-offset-navy`) on every new control; never `outline-none` without a replacement.
- Database text shown on `/bn` → wrap with `lang={textLang(text, locale)}`.
- When wrapping grid/flex children for semantics, add `min-w-0` to the inner element so sizing doesn't change.
- New modals: reuse the popup's pattern (focus panel, trap Tab, Escape, restore focus).

---

## 6. Remaining issues

| # | Issue | WCAG | Why not fixed | Recommendation |
|---|---|---|---|---|
| 1 | ~~Hero search placeholder 3.08:1~~ | 1.4.3 | **Fixed 2026-11-17** — `#66768F` (4.61:1), approved | — |
| 2 | Infinite animations: hero flow lines, "live" pulse dots (stats, challenge banner, popup, header), header sparkle | 2.2.2 | **Decision 2026-11-17: keep as is.** They stop only for users with OS "reduce motion"; with no pause control the criterion is not strictly met | Revisit if a formal conformance claim is needed (pause control or ≤ 5 s loops) |
| 3 | Footer "Privacy · Terms · Accessibility" look like links (hover underline) but aren't; there is no accessibility statement page | — (best practice) | Needs content/pages | Create the pages and make these real links; publish this report's outcome as the accessibility statement |
| 4 | Footer "Register as an innovator" points to `/register?role=mentor` | 2.4.4 (label vs. destination) | Content bug, not a11y markup; the register page currently ignores `role` | Point it to `/register` |
| 5 | **Screen readers not tested** (NVDA/JAWS/VoiceOver/TalkBack) — only the browser accessibility tree | many | Tools unavailable here | Manual pass in both languages before claiming conformance |
| 6 | **No real phone/tablet tested**; the window couldn't go below ~690 px and CSS zoom doesn't apply phone breakpoints (§4.4 #10) | 1.4.10, 2.5.8, 1.3.4 | Tool limitation | Test on a real Android/iOS device and with 400 % browser zoom |
| 7 | axe-core / Lighthouse not run (CDN script injection not permitted) | — | Environment | Run axe DevTools or Lighthouse manually |
| 8 | Stats numbers use the browser's number format (`toLocaleString()`), not the page language | — | Visual text change | Optional: format with the page locale |
| 9 | Innovation cards always show English fields (`titleEn`, `summaryEn`, `category.nameEn`) on `/bn` | 3.1.2 handled with `lang` | Data/content | Show Bangla fields where they exist |
| 10 | After the popup is closed on page load, focus is on `<body>` (nothing was focused before it opened) — next Tab is the skip link | — | Acceptable behaviour | — |
