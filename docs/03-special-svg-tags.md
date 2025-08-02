# 03 – Special SVG Tags (`<icon>` & `<logo>`)

Kobra Kreator lets authors embed SVGs with two custom elements:

* `<icon src="…" />`
* `<logo src="…" />`

During the build, these tags are **replaced with the raw SVG markup** found in
`src-svg/` so you can style or animate the graphic via CSS/JS just like any
inline SVG.

---

## Why not just `<img>`?

| Use case                            | `<img>` | `<icon>/<logo>` |
| ----------------------------------- | ------- | --------------- |
| Purely decorative illustration      | ✅       | ⚠️ Overkill     |
| Need to change fill/stroke with CSS | ❌       | ✅               |
| Apply hover animation via JS        | ❌       | ✅               |
| Manipulate SVG paths individually   | ❌       | ✅               |

Choosing the right tag keeps pages lighter and build times faster.

---

## Authoring rules

1. **Only one attribute** – `src` is required; no `class`, `id`, `aria-*`, etc.<br>

   <!-- TODO: discuss whether `class` passthrough should be allowed for styling the outer `<svg>`. -->
2. **`src` is relative to site’s `src-svg/`** folder. Sub‑directories are OK:

   ```html
   <icon src="controls/play.svg" />
   <logo src="product-suite/super-logo.svg" />
   ```
3. **Self‑closing tag** – Write as `<icon … />`, **not** `<icon></icon>`.
4. **Case‑sensitive file match** – On case‑sensitive file systems, `check.svg`
   ≠ `Check.svg`.

---

## Replacement algorithm (build step)

```text
For each HTML file →
  Parse DOM → find <icon|logo src="..." /> nodes →
    Resolve absolute path: /src/<site>/src-svg/<src> →
    Read file → inject its textContent in place of the node →
    Remove original custom element.
```

*If the file is missing, the build logs an **error** and skips replacement.*

<!-- TODO: confirm whether we should fail the whole page or leave the <icon> tag untouched on error. -->

---

## Styling after replacement

```html
<!-- author code -->
<h1><icon src="ui/check.svg" /> Completed</h1>
```

during build →

```html
<h1>
  <svg viewBox="0 0 24 24" class="icon--check"><path …/></svg>
  Completed
</h1>
```

Because the SVG is now in the DOM, you can target it:

```css
.icon--check {
  width: 1em;
  height: 1em;
  fill: currentColor;
}
```

<!-- TODO: document auto‑injected `class="icon--<basename>"` convention once decided. -->

---

## Accessibility tips

* **Icons used purely for decoration** should include `aria-hidden="true"` once
  inlined.

  <!-- TODO: decide if the build should auto‑add `aria-hidden` when the element has no accessible text nearby. -->
* For meaningful graphics, ensure you provide visible text (e.g. button label)
  or `aria-label` on the wrapping element.

---

## Watching & rebuild triggers

* When **any** file under `src-svg/` changes, Kobra Kreator re-renders every
  HTML page that references that SVG. The dependency map is cached for speed.

---

### Next → [04-front-matter](04-front-matter.md)

