# Umay PCB Toolkit

Open-source PCB and electronics calculators for hardware design engineers, based on IPC rules and running entirely in the browser.

**Live:** https://ozguregemen.github.io/umay-pcb-toolkit/

## Calculators

| Area | Calculator | Method |
|---|---|---|
| Learn | **Learning path** | 13 lessons for beginners (design flow & IPC, stack-up, traces, spacing, vias, circuit basics, impedance, signal integrity, PCB antennas & NFC coils, PDN, thermal, DFM, glossary) with worked examples that open the calculators, quizzes, figures and progress tracking. |
| PCB & IPC | **Trace width & current** | IPC-2152 baseline-chart fit with copper, board-thickness and plane modifiers; IPC-2221. Solves width, current or temperature rise; etch factor, plating, current density, AC resistance; DC losses; side-by-side comparison. |
| | **Conductor spacing** | IPC-2221B Table 6-1 (B1–A7), > 500 V rule, inverse (spacing → voltage), mains-safety warning. |
| | **Via** | DC resistance, IPC-2221 current capacity, thermal resistance, parallel vias, Johnson L/C, impedance and rise-time degradation. |
| | **Pad & annular ring** | IPC-2221 land = a + 2b + c, IPC-2222 lead-to-hole rules, IPC-6012 class checks. |
| | **Fusing current** | Onderdonk (adiabatic) and Preece; trace or via; I²t. |
| | **IPC rules reference** | Classes, producibility levels, annular ring, plating, defects, copper thickness, bow & twist, dielectric. |
| Signal integrity | **Impedance** | Hammerstad–Jensen microstrip, Wheeler stripline, asymmetric stripline, embedded microstrip, CPWG, differential pairs (AN-905); synthesis (target Z → width), loss, delay; IPC-2141 comparison. |
| | **SI basics** | Bandwidth, knee frequency, critical length, wavelength, skin depth, skew. |
| | **Crosstalk** | Johnson / Brooks NEXT estimate, stripline, length factor, 3W rule, required gap. |
| Power & thermal | **PDN & decoupling** | Target impedance, bulk capacitance, R-L-C capacitor bank impedance plot, plane capacitance. |
| | **Thermal** | Junction temperature, θ chain, required heatsink, LDO dissipation. |
| | **Routing between pads** | Traces between BGA/connector pads, diagonal channel, dog-bone via size. |
| Signal integrity (more) | **Reflection & VSWR**, **RF attenuator** (Pi/T/bridged-T with standard values) | — |
| RF & antennas | **Planar spiral inductor** | Mohan 1999 (square, hex, octagon, circle), to-scale drawing; NFC/RFID/wireless-power resonance: tuning capacitor, skin-effect AC resistance, coil Q, damping resistor for a target Q. |
| | **PCB antenna** | Microstrip patch (Balanis transmission-line model: W, L, inset feed for 50 Ω, bandwidth, ground size) and quarter-wave monopole / IFA arm, with to-scale layout drawings. |
| Power (more) | **DC-DC buck/boost** | Inductor, output capacitor, duty, peak current (TI SLVA477/372). |
| Circuit basics | **Ohm's law**, **voltage divider** (incl. regulator feedback and tolerance analysis), **LED resistor**, **RC/RL/LC**, **E-series finder**, **colour & SMD codes**, **series/parallel**, **crystal load & PPM**, **555 timer** | Standard formulas with E-series value selection. |
| Tools | **Unit converter** | Length, copper weight, temperature, dBm/W/V, dB, AWG. |

See [docs/karsilastirma.md](docs/karsilastirma.md) for a comparison with Saturn PCB Toolkit, KiCad, Sierra Circuits, Polar, Rogers and others.

Every result shows its formula, sources and validity warnings, and most calculators draw a live schematic or to-scale cross-section that follows the inputs. Inputs live in the URL, so any calculation can be shared as a link, copied as a text summary or printed as a report. Turkish/English UI, light/dark theme, mm/mil preference, `Ctrl K` search, mobile layout.

See [docs/muhendislik-analizi.md](docs/muhendislik-analizi.md) for the engineering review: what was wrong in earlier versions, the methods used now, how they were validated, and known limitations.

> Results are engineering estimates. For critical designs, rely on the official IPC standards and your fabricator's rules.

## Project layout

```
index.html              App shell (no build step)
assets/                 Stylesheet and icon
src/app.js              Router (lazy-loads pages), sidebar, preferences
src/registry.js         Tool catalogue: ids, categories, search keywords
src/engine/             Pure calculation engine (no DOM) — easy to test and reuse
src/pages/              One module per calculator: strings (tr/en), fields, compute, render
src/ui/                 Form framework, formatting, icons, search palette, SVG chart
src/i18n.js             Core Turkish / English strings
tests/cases/            Engine tests (shared by Node and the browser runner)
docs/                   Engineering notes
.github/workflows/      Test + deploy to GitHub Pages
```

There is deliberately **no build step and no runtime dependency**: the site is plain HTML, CSS and native ES modules.

## Run locally

ES modules must be served over HTTP (opening `index.html` from disk will not work):

```sh
npm start                 # npx http-server on http://localhost:8080
# or
python -m http.server 8080
```

## Tests

```sh
npm test                  # Node ≥ 18, no dependencies
```

Or open `/tests/` in the browser. CI runs the tests on every push and pull request; the site is only deployed when they pass.

## Adding a calculator

1. `src/engine/<name>.js` — pure functions with JSDoc, units in the names (`widthMm`, `currentA`).
2. `tests/cases/<area>.js` — reference values computed by hand, with the arithmetic in a comment.
3. `src/pages/<name>.js` — `export default { id, strings: { tr, en }, sections, compute, render }`; see `src/pages/spacing.js` and the field reference at the top of `src/ui/calculator.js`.
4. Register it in `src/registry.js` and add `tool_<id>` / `tool_<id>_desc` to `src/i18n.js`.

## Deploy

GitHub Pages via Actions (**Settings → Pages → Source: GitHub Actions**). Every push to `main` runs the tests, then deploys. Hash routing and relative paths make it work under `/<repo>/` without configuration. Cloudflare Pages also works (no build command, output directory `/`).

---

## Türkçe

Umay PCB Toolkit; IPC kurallarına dayalı PCB hesaplarını (iz genişliği/akım, iletken aralığı, via, pad ve halka, eritme akımı, IPC kural özeti), sinyal bütünlüğü (empedans, temel SI, karışma), güç ve termal (PDN, bağlantı sıcaklığı) ve temel devre araçlarını tarayıcıda sunan açık kaynak bir araçtır. Her sonuçla formülü, kaynağı ve geçerlilik uyarıları gösterilir; girdiler bağlantıda saklanır, özet olarak kopyalanabilir veya rapor olarak yazdırılabilir.

Hesap mantığının denetimi, eski sürümlerdeki hatalar ve kullanılan yöntemler için: [docs/muhendislik-analizi.md](docs/muhendislik-analizi.md).

## License

[MIT](LICENSE)
