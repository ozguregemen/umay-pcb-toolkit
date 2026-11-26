# Contributing to Umay PCB Toolkit

Thank you for helping. Issues and pull requests are welcome in **Turkish or English**. A Turkish summary is at the end ([Türkçe özet](#türkçe-özet)).

## Ways to help

| What | How |
|---|---|
| **A result looks wrong** (the most valuable report) | Open a *Wrong result* issue. Press **Link** in the calculator and paste it, so the inputs come with it; say what you expected and where that value comes from (standard, datasheet, another tool, a measurement). |
| A bug or a display problem | Open a *Bug* issue with the steps, your browser and a screenshot. |
| An idea for a calculator, lesson or feature | Open a *Suggestion* issue. For a calculator, name the method and its source. |
| A better translation | Edit the strings directly (see below); both languages are in the same file as the page. |
| Fabricator capability data | `src/engine/fabs.js`, with the source URL and the date you read it. |

## Ground rules

1. **Every formula cites its source** — a standard, a textbook or a vendor application note — in the result (`steps(items, { note, refs })`, or `formulaBlock(lines, noteKey, refs)` on older pages) and in the test that checks it. Calculators show the calculation with `steps()`: each step is the formula in symbols, the same formula with the reader's numbers, and the result (notation in `src/ui/math.js`). The steps must mirror what the engine computes; `node tools/dump-steps.mjs <page-id> --all` prints them as text for checking by hand, and the tests re-evaluate the numbers of every step.
2. **No copyrighted material.** Do not paste text, tables or figures from IPC standards, books or application notes. Formulas and individual values are fine when cited; explain in your own words.
3. **No build step and no runtime dependency.** The site is plain HTML, CSS and native ES modules; keep it that way.
4. **Turkish and English together.** Every string exists in both languages; the tests fail when one is missing.
5. **The engine is pure.** Functions in `src/engine/` take numbers and return numbers (no DOM, no formatting), with the unit in the name: `widthMm`, `currentA`, `fHz`.
6. **Plain numbers in SVG geometry.** Never pass a coordinate or size through `fmt()`, `fixed()` or `si()`: in Turkish they write a decimal comma and the drawing breaks. Use them for labels only.
7. **Results are estimates.** State the range in which a method is valid and warn outside it, instead of printing a number that looks exact.

## Set up

```sh
git clone https://github.com/<you>/umay-pcb-toolkit
cd umay-pcb-toolkit
npm start                  # http://localhost:8080 (or: python -m http.server 8080)
npm test                   # Node 18 or newer, no dependencies
```

The same tests run in the browser at `/tests/`. There is nothing to install and nothing to build.

## Adding a calculator

1. `src/engine/<name>.js` — the calculation, as pure functions with JSDoc.
2. `tests/cases/<area>.js` — reference values worked out by hand or taken from the source, with the arithmetic in a comment.
3. `src/pages/<name>.js` — `export default { id, strings: { tr, en }, sections, compute, render, diagram? }`. `src/pages/spacing.js` is a short example; the field reference is at the top of `src/ui/calculator.js`; draw with the helpers in `src/ui/svg.js`.
4. `src/registry.js` — add the tool (id, category, icon, search keywords) and `tool_<id>` / `tool_<id>_desc` in `src/i18n.js`.
5. If a lesson covers the topic, add the tool id to that lesson's `tools` list in `src/learn/index.js`.

The integrity tests then check the rest: names in both languages, an icon, a cited source in the default result, a diagram that renders in both languages.

## Adding or editing a lesson

- A lesson is `src/learn/lessons/<id>.js` with `export default { figures?, body: { tr, en } }`. The Markdown subset (callouts, quizzes, calculator buttons, figures) is described at the top of `src/learn/markdown.js`.
- Register it in `LESSONS` in `src/learn/index.js` and add `lesson_<id>` / `lesson_<id>_desc` to `src/i18n.js`.
- Keep the same sections, figures and calculator buttons in both languages. A button such as `[[calc:trace?I=3&dT=10|Open the calculator]]` is checked by the tests: the tool and every parameter must exist.
- Numbers quoted in the text should be the ones the linked calculator shows.

## Pull requests

- One topic per pull request, branched from `main`.
- `npm test` must pass. CI runs it on every pull request, and the site is deployed only when it passes.
- Say what changed and how you checked it: the reference value and its source for a calculation, a screenshot for a visual change (light and dark theme; phone width if the layout changed).
- Write commit messages as a short English sentence in the imperative ("Add coupled-inductor calculator").

## Licence

By contributing you agree that your contribution is licensed under the [MIT licence](LICENSE) of the project.

---

## Türkçe özet

Katkılarınız için teşekkürler. Issue ve pull request'leri **Türkçe ya da İngilizce** yazabilirsiniz.

- **Bir sonuç yanlış görünüyorsa** (en değerli bildirim): hesaplayıcıdaki **Bağlantı** düğmesiyle girdileri içeren bağlantıyı kopyalayıp *Yanlış sonuç* şablonuyla bildirin; beklediğiniz değeri ve kaynağını (standart, veri sayfası, başka bir araç, ölçüm) yazın.
- **Hata ya da görüntü sorunu:** adımları, tarayıcınızı ve bir ekran görüntüsünü ekleyin.
- **Öneri:** yeni bir hesaplayıcı için yöntemi ve kaynağını belirtin.

Kod katkısında uyulacak kurallar:

1. Her formül kaynağını gösterir (sonuçtaki formül bloğunda ve testte).
2. Telifli içerik eklenmez: IPC standartlarından, kitaplardan ya da uygulama notlarından metin, tablo veya şekil kopyalamayın; kendi cümlelerinizle anlatıp kaynağı belirtin.
3. Derleme adımı ve çalışma zamanı bağımlılığı yoktur; düz HTML, CSS ve ES modülleri.
4. Her metin Türkçe ve İngilizce birlikte eklenir; biri eksikse testler başarısız olur.
5. `src/engine/` içindeki işlevler saftır: sayı alır, sayı döndürür; birim adın içindedir (`widthMm`, `currentA`).
6. SVG geometrisinde düz sayı kullanılır; `fmt()`, `fixed()`, `si()` yalnızca etiketler içindir (Türkçede ondalık virgül çizimi bozar).
7. Sonuçlar tahmindir: yöntemin geçerli olduğu aralığı belirtin, dışında uyarı verin.

Yerelde çalıştırma: `npm start` (ya da `python -m http.server 8080`), testler: `npm test` ya da tarayıcıda `/tests/`. Pull request göndermeden önce testlerin geçtiğinden emin olun; ne değiştiğini ve nasıl doğruladığınızı yazın.
