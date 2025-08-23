export function hero({ frontMatter = { hero: {} } }) {
  const h = frontMatter.hero;

  // Start section
  let html = `<header class="hero">`;

  // Headline
  if (h["primary-headline"]) {
    html += `<h1>${h["primary-headline"]}</h1>`;
  }

  // Subheadline
  if (h.subheadline) {
    html += `<p class="subheadline">${h.subheadline}</p>`;
  }

  // CTA
  if(h.cta?.primary) {
    const { label, href } = h.cta.primary;
    html += `<a href="${href}" class="btn btn-primary">${label}</a>`;
  }
  if(h.cta?.secondary) {
    const { label, href } = h.cta.primary;
    html += `<a href="${href}" class="btn btn-primary">${label}</a>`;
  }

  // Visual (hero image)
  const visual = h.visual?.image;
  if (visual?.src) {
    html += `
        <img class="hero-visual" src="${visual.src}" alt="${visual.alt || ""}" />
    `;
  }

  // Feature list
  if (h["feature-list"]?.feature?.length) {
    html += `<ul class="feature-list">`;
    h["feature-list"].feature.forEach((f) => {
      html += `<li>${f}</li>`;
    });
    html += `</ul>`;
  }

  // Testimonial
  if (h.testimonial?.quote) {
    html += `<div class="testimonial">`;
    html += `<blockquote>${h.testimonial.quote}</blockquote>`;
    if (h.testimonial.author) {
      html += `<cite>${h.testimonial.author}</cite>`;
    }
    html += `</div>`;
  }

  // Background image or video
  if (h.background?.image?.src) {
    html = html.replace(
      `<section`,
      `<section style="background-image: url('${h.background.image.src}')"`
    );
  } else if (h.background?.video?.src) {
    html += `<video class="background-video" autoplay muted loop src="${h.background.video.src}"></video>`;
  }

  // Branding (logo)
  if (h.logoImage) {
    html += `<img src="${h.logoImage}" alt="${h.logoAlt || "Logo"}" class="brand-logo" />`;
  }

  // Anchor
  if (h.anchor?.href) {
    html += `<a href="${h.anchor.href}" class="hero-anchor">${h.anchor.text || "Scroll down"}</a>`;
  }

  html += `</header>`;
  return html;
}

