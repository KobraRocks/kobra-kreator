# Kobra Kreator
Is a static content generator engine for website (HTML, CSS, js) implemented with Deno.

## Structure
A `/src/` folder at the root of Kobra Kreator, contains subfolders for each website.
```
/src/
|__my-domain.com/
|__|__src-svg/
|__|__media/
|__|__|__images/
|__|__|__videos/
|__|__|__audio/
|__|__|__pdf/
|__|__js/
|__|__blog/
|__|__|__/post-a.html
|__|__config.json
|__|__index.html
|__|__styles.css
|__|__index.css
|__|__links.json
|__another.domain.com/
/templates/
|__/head/
|__|__default.js
|__|__blog.js
|__/footer/
|__|__default.js
|__/nav/
|__|__default.js
```

* Each website folder contains some static files HTML, CSS, javascript and media files.
* Each template serves to create dynamic head, footer and nav

### src-svg
Contains the source code for svg used in html documents.
A parser parse the HTML document for tags like `<icon src="icon-name.svg" />` or `<logo src="logo-name.svg" />`, then replace the icon or logo instances by the appropriate svg code.
The `src` attributes indicates to look in `/src/my-domain.com/src-svg/` folder;
The special tags won't have any other attributes than `src`.

**When to use those special html tags?**
When you need to have full control over the svg with css or javascript, otherwise it is recommended to use the default `<img src="my-drawing.svg" />` html tag

## Anatomy of an HTML page
An HTML page is separated in two parts:
* front matter (TOML)
* html code

separator: #---#

```html
title="My super product"
description="The super product description"
css = ["styles.css", "super-product.css"]

[templates]
head = "default"
nav = "default"
footer ="default"

[scripts]
modules = [".js", "/js/slides.js"]
inline = ["form.inline.js"]

[links]
[links.nav]
subLevel = "company"
label = "test"
[links.footer]
column = ["company"]
label = "test"
#---#
<logo src="super-product-logo.svg" />
<h1><icon src="check.svg" /> My Super Product<h1>
<p>content...</p>

```
### frontMatter
`title =""` -> use for the content of HTML title tag `<title>`
`description =""` -> use for the meta desctiprion
`css = [""]` -> array of css file to attach to the document via link tags
* relative path to the site root or external (e.g. CDN)
`templates.head = ""` -> the js template to use to render the head

IF EXIST
`templates.nav = ""` --> if provided, the js template to use to render the nav
`templates.footer = ""` --> if provided, the js template to use to render the footer

IF EXIST
`scripts.modules = [""]` --> an array of script to attach to the document to be typed as modules
* relative path to the site root or external (e.g. CDN)
`scripts.inline = [""]` --> an array of script to attach to the document as inline scriptlike in `<script scr="my-inline-script.js">`
* relative path to the site root or external (e.g. CDN)

IF exist
`links.nav.topLevel = true` --> add the link in links.json to `{ nav: []}`
`links.nav.subLevel = "example"` --> add the link in links.json to `{ nav: [{ example: [] }]}`
`links.nav.label = ""` --> label to use for the link
`links.footer.column = "example"` --> add the link in links.json to `{ footer: [{ example: []}]}`
`links.footer.label = ""` --> label to use for the link  

### Templates 
Each template module must export a render function
```javascript

export function render({ frontMatter: {}, links: {} }) {
    return "";
}
```

Modules for nav or footer will require the 

### Rendering an HTML page
1. parse the file to extract frontMatter (TOML) and HTML
2. update `links.json` to add the page in the appropriate link collection (nav, footer...)
    * if links are mentioned in frontMatter then update links.json 
3. use frontMatter to render the head templates
  * all sites chared the same templates folder
4. use frontMatter to render the nav template if specified
  * all sites chared the same templates folder
5. use frontMatter to render the footer template if specified
  * all sites chared the same templates folder
6. use frontMatter to render the scripts, modules first then inline scripts at the end of the document before closing `</body>` tag
7. assemble the html head + nav + content + footer + scripts
8. Parse html to replace any specific tags with proper html code (like `<icon />`)
    * `/src-svg/` can have sub-directories, they will be included in the `src="/subdir/my-icon.svg"`
9. Save the output html document in the distant folder provided in `/src/my-domain.com/config.json`
  * One `config.json` per website
  * the distant folder is an absolute path
  * separators `/` or `\` should be normalized

### Config
/src/my-domain.com/config.json
```json
{
    "distantDirectory": ""
}
```

### links
/src/my-domain.com/links.json
```json
{
    "nav": [
        {"topLevel": true, "href": "", "label": ""}
        {"subLevel": "", "href": "", "label": ""}
    ],
    "footer": [
        {"column": "", "href": "", "label": ""}
    ]
}
```

## Triggers
use `Deno.watchFs` to monitor `/src/` and `/templates/` file changes
the main script should be run before starting editing files in `/src/` and `/templates/`
`deno run --allow-all main.js` -> start monitoring file change.


### Events to monitor
**WARNING** depending on which editore the user relies, it can create many event for the same file.
* 'create' IF the previous event was 'create' then ignore
* 'modify' IF the previous event was 'create' or 'modify' then ignore
* 'remove' IF the previous event was 'remove' then ignore 

### Files to monitor
* '.html'
* '.js'
* '.css'
* '.svg'
* '.mp4'
* '.jpg'
* '.png'
* '.webm'
* '.webp'
* '.ico'

### Rendering Triggers
* **When an html page changes** -> render HTML
* **When a javascript template changes** render each `.html` page using the template for each domain
* **When a svg file in `/src-svg/` changes** render each `.html` using the svg file

### File copying Triggers
A file copy always respect the folder tree from the website folder in `/src/`.
Preserve original tree relative to website root.

* **When a CSS files changes** -> copy to the distant folder
* **When a JS files changes** -> copy to the distant folder
* **When a file in `/media/` changes** -> copy to the distant folder
  * supported media files [".svg", ".mp4", ".jpg", ".png", ".webm", ".webp", ".pdf", ".ttf", ".otf"]

## Parsers
Use:
* `import { DOMParser } from "jsr:@b-fuze/deno-dom";`
* `import * as TOMLParser from "jsr:@std/toml";`




