# Umay PCB Toolkit

Open-source PCB design calculators based on IPC rules, running entirely in the browser.

**Live:** https://ozguregemen.github.io/umay-pcb-toolkit/

| Calculator | Method |
|---|---|
| **Trace width** | IPC-2221 curve fit, and an IPC-2152 correction-factor model (airflow, altitude, conformal coating, pulsed current, copper thickness, nearby copper plane) with per-class safety margin. Optional DC analysis: resistance, voltage drop, power loss. |
| **Impedance** | IPC-2141 closed-form equations: microstrip, symmetric stripline, edge-coupled differential microstrip / stripline, propagation delay. |
| **Conductor spacing** | IPC-2221 Table 6-1 (B1–A7), including the per-volt rule above 500 V. |
| **Via** | Barrel DC resistance at temperature, voltage drop, power loss, thermal resistance, aspect ratio, IPC-2221-based current capacity estimate. |

Every result shows its formula, intermediate values and validity warnings. Inputs are stored in the URL, so any calculation can be shared as a link. Turkish and English UI, light and dark theme.

> Results are engineering estimates. For critical designs, rely on the official IPC standards and your fabricator's rules.

## Project layout

```
index.html              App shell (no build step)
assets/                 Stylesheet and icon
src/engine/             Pure calculation engine (no DOM) — easy to test and reuse
src/pages/              One module per calculator (fields, compute, render)
src/ui/                 Generic form/URL/result helpers and number formatting
src/i18n.js             Turkish / English strings
tests/cases.js          Engine test cases (shared by Node and the browser)
tests/index.html        Browser test runner (also linked from the app footer)
.github/workflows/      Test + deploy to GitHub Pages
```

There is deliberately **no build step and no runtime dependency**: the site is plain HTML, CSS and native ES modules, so the repository *is* the website.

## Run locally

ES modules need to be served over HTTP (opening `index.html` from disk will not work). Any static server is fine:

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

## Deploy

### GitHub Pages (default)

1. Push this repository to GitHub (branch `main`).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Every push to `main` runs `.github/workflows/pages.yml`: tests, then deploy.

The app uses hash routing (`#/trace`, `#/via`, …) and relative paths, so it works under the `/<repo>/` sub-path without configuration.

### Cloudflare Pages (optional)

Connect the repository in Cloudflare Pages with **framework preset: None**, **build command: empty**, **output directory: `/`**. Useful if you want a custom domain with Cloudflare's CDN; it is not required.

## Contributing

- Keep `src/engine/` free of DOM code; add a test case to `tests/cases.js` for every formula change, with the reference value and its source in a comment.
- Add every new UI string to both `tr` and `en` in `src/i18n.js`.
- New calculator: create `src/engine/<name>.js`, `src/pages/<name>.js` (see existing pages for the `sections / compute / render` shape) and register it in `src/app.js`.

## Background

This is the web successor of the earlier C# / Avalonia desktop prototype. The calculation engine was ported from that code and extended (impedance structures, via thermal/capacity, validity warnings, corrected voltage-band lookup for spacing).

---

## Türkçe

Umay PCB Toolkit; iz genişliği (IPC-2221 / IPC-2152), empedans (IPC-2141), iletken aralığı (IPC-2221 Tablo 6-1) ve via hesaplarını tarayıcıda yapan açık kaynak bir araçtır. Kurulum ve derleme adımı yoktur; depo doğrudan web sitesidir.

- **Yerelde çalıştırma:** `npm start` veya `python -m http.server 8080`, ardından `http://localhost:8080`.
- **Test:** `npm test` ya da tarayıcıda `/tests/`.
- **Yayınlama:** GitHub'da depo ayarlarından *Settings → Pages → Source: GitHub Actions* seçin; `main` dalına yapılan her push testleri çalıştırır ve geçerse siteyi yayınlar.

Sonuçlar mühendislik tahminleridir; kritik tasarımlarda resmi IPC standartlarını ve üreticinizin kurallarını esas alın.

## License

[MIT](LICENSE)
