# My First Project

This tutorial walks you through creating your first site for **Kobra Kreator**. Each section introduces a new concept so you can discover features gradually.

---

## 1. Prepare the workspace

1. [Install Deno](https://deno.land/manual/getting_started/installation) if it isn't already.
2. Clone the repository and enter the folder:

```bash
 git clone https://github.com/KobraRocks/kobra-kreator.git
 cd kobra-kreator
```

---

## 2. Create the project folder

1. Inside the repo, create a folder for your site under `src/`:

```bash
mkdir -p src/my-project
```

2. Add a `config.json` that tells the generator where to place the build output:

```json
# /src/my-project/config.json
{
  "distantDirectory": "./dist/my-project"
}
```

This JSON file is required for every site. The `distantDirectory` path can be absolute or relative.

---

## 3. Add a basic page

1. Create `src/my-project/index.html` with front matter and some body content:

```html
title = "Hello, world"
#---#
<body>
  <h1>Welcome!</h1>
</body>
```

2. Run the generator to see the result:

```bash
deno run -A --import-map=import_map.json main.js
```

Open `dist/my-project/index.html` in your browser to view the page.

---

## 4. Sprinkle in styles and scripts

1. Add a stylesheet at `src/my-project/styles.css`:

```css
body { font-family: sans-serif; }
```

2. Create a JavaScript module at `src/my-project/js/main.js`:

```javascript
/**
 * Logs a greeting in the browser console.
 */
export function greet() {
  console.log("Greetings from Kobra Kreator!");
}
```

3. Update `index.html` to load them:

```html
title = "Hello, world"
css = ["styles.css"]
[scripts]
modules = ["/js/main.js"]
#---#
<body>
  <h1>Welcome!</h1>
</body>
```

Kobra Kreator automatically watch and implement changes. If it is stopped then run the generator again and refresh the page to see the changes.

---

## 5. Build navigation with multiple pages

1. Create a second page at `src/my-project/about.html`:

```html
title = "About"
[links.nav]
label = "About"
#---#
<body>
  <h1>About this site</h1>
</body>
```

2. Run the generator. A `links.json` file is created automatically and now contains navigation information for both pages.

3. Add a navigation template by creating `templates/nav/default.js` if it doesn't exist and rendering the `links.json` data. Check the docs for details.

Now you can switch between pages using the generated navigation.

---

## 6. Expand with sections and assets

1. Add a blog post in `src/my-project/blog/first-post.html` to explore nested folders.
2. Drop images or other assets inside `src/my-project/media/` – the generator copies them to the build output.
3. Store raw SVG icons under `src/my-project/src-svg/` and reference them with `<icon src="path/to/icon.svg"></icon>` in your pages.

Each new file type unlocks more generator features and mirrors real-world scenarios.

---

## 7. Watch mode for live development

During development you can rebuild automatically:

```bash
deno run -A --import-map=import_map.json main.js --watch
```

Editing files under `src/my-project` now triggers instant rebuilds.

---

## Where to go next

You've created a fully functional project and explored the core features of Kobra Kreator. Dive into the [docs](../docs) for deeper explanations, or try extending your project with custom templates and more complex assets.

