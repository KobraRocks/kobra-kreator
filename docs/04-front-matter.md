# 04 – Front‑Matter (TOML)

Every HTML page starts with a **TOML block** delimited by the literal separator string `#---#`.
The generator parses this front‑matter to decide which assets to attach, which
templates to render, and how to update `links.json`.

```html
<title="My page">
#---# <-- build reads until this marker
<html>
  … content …
</html>
```

<!-- TODO: confirm whether leading newline before the first key is allowed. -->

---

## Field reference

| Key                     | Type      | Required | Purpose / rules                                                                          |
| ----------------------- | --------- | -------- | ---------------------------------------------------------------------------------------- |
| `title`                 | string    | ✅        | Sets `<title>` content.                                                                  |
| `description`           | string    | ⬜        | Injected as `<meta name="description">`.                                                 |
| `css`                   | string\[] | ⬜        | Extra stylesheets. Relative to site root **or** absolute URL (CDN).                      |
| `[templates].head`      | string    | ✅        | File name under `templates/head/` (without extension).                                   |
| `[templates].nav`       | string    | ⬜        | File name under `templates/nav/`.                                                        |
| `[templates].footer`    | string    | ⬜        | File name under `templates/footer/`.                                                     |
| `[scripts].modules`     | string\[] | ⬜        | Added as `<script type="module" src="…">` *before* inline scripts.                       |
| `[scripts].inline`      | string\[] | ⬜        | **Filename** to inline (**not** external URL)       |
| `[links].nav.topLevel`  | bool      | ⬜        | If `true`, add to `links.json.nav` (top level).                                          |
| `[links].nav.subLevel`  | string    | ⬜        | Name of submenu bucket to append under.                                                  |
| `[links].nav.label`     | string    | ⬜        | Text shown in menu. Defaults to `title` if omitted. |
| `[links].footer.column` | string    | ⬜        | Column bucket in `links.json.footer`.                                                    |
| `[links].footer.label`  | string    | ⬜        | Link text in footer.                                                                     |

> **Validation** – Unknown keys log a warning but do **not** stop the build.
> This keeps old pages working if new fields are added later.

---

## Minimal example

```toml
# in /src/my-site.com/about.html

title = "About us"

[templates]
head = "default"

#---#
<section class="hero">…</section>
```

---

## Full example

```toml
# front‑matter begins

title = "Super Product"
description = "The super product description"
css = ["styles.css", "product.css", "https://cdn.example.com/animate.min.css"]

[templates]
head = "default"
nav  = "default"
footer = "default"

[scripts]
modules = ["/js/slides.js"]
inline  = ["form.inline.js"]

[links]
  [links.nav]
  topLevel = true
  label = "Products"

  [links.footer]
  column = "company"
  label = "Products"
#---#
<main>…</main>
```

---

## Processing order

1. **Parse TOML → JS object.** Invalid TOML throws a build error.
2. **Update** `links.json` if any `links.*` keys present.
3. **Template selection** – resolve `head.js`, `nav.js`, `footer.js`.
4. **Inject CSS & scripts** – module scripts before inline scripts.
5. **Render** assembled HTML page.

---

## Gotchas & best practices

* Keep file paths **relative** to the site root so sites remain portable.
* Avoid leading `./` in `css` and `scripts` lists; just write `"styles.css"`.
* Use **CDN URLs** only for assets you trust; the build does not verify HTTPS
  certificates or sub‑resource integrity.
* Remember that `scripts.inline` embeds the **file’s contents**, not a `<script src>` tag.

  <!-- TODO: builder flag to switch between inline vs external link? -->

---

### Next → [05-templates-api](05-templates-api.md)

