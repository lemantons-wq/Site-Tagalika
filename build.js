#!/usr/bin/env node
// Builds the static site into ./dist from content/*.json and ./static.
// Usage: node build.js     (no dependencies)
'use strict';
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const LANGS = ['en', 'pl'];        // first one is the default language, served at "/"
const DEFAULT = LANGS[0];
// false = ask search engines not to index the site (meta robots + X-Robots-Tag header).
// Set to true when the site should appear in Google.
const ALLOW_INDEXING = false;

const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', f), 'utf8'));
const company = read('company.json');
// Version the stylesheet URL by its content, so browsers never mix new pages with an old cached stylesheet
const cssVersion = crypto.createHash('sha1')
  .update(fs.readFileSync(path.join(ROOT, 'static', 'assets', 'css', 'style.css'))).digest('hex').slice(0, 10);
const T = Object.fromEntries(LANGS.map((l) => [l, read(`${l}.json`)]));

// ---- sanity check: both languages must list the same products ----
const slugs = (l) => T[l].productList.map((p) => p.slug).join(',');
for (const l of LANGS) {
  if (slugs(l) !== slugs(DEFAULT)) {
    throw new Error(`productList in ${l}.json must have the same slugs, in the same order, as ${DEFAULT}.json`);
  }
}

// ---- helpers ----
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // keep numbers and their units together: "22 kg", "50 m", "15–50 µm"
  .replace(/(\d) (kg|g\/m²|mm|m|µm)(?![\w])/g, '$1&nbsp;$2');
const fill = (s) => String(s).replace(/\{\{(\w+)\}\}/g, (m, k) => (k in company ? company[k] : m));
const t = (s) => esc(fill(s));
const base = (l) => (l === DEFAULT ? '' : `/${l}`);
const url = {
  home: (l) => `${base(l)}/`,
  product: (l, slug) => `${base(l)}/products/${slug}/`,
  privacy: (l) => `${base(l)}/privacy/`,
};
const digits = (s) => s.replace(/[^\d]/g, '');
// Phone and WhatsApp are optional: leave them empty ("") in company.json and they disappear from the site.
const hasPhone = Boolean(company.phone);
const hasWa = Boolean(company.whatsapp);
const tel = hasPhone ? `tel:+${digits(company.phone)}` : '';
const wa = (text) => `https://wa.me/${digits(company.whatsapp || '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
const mail = (subject, body) => {
  const q = [subject && `subject=${encodeURIComponent(subject)}`, body && `body=${encodeURIComponent(body)}`].filter(Boolean).join('&');
  return `mailto:${company.email}${q ? `?${q}` : ''}`;
};

// Company details as [label key, html value], skipping empty fields
const detailRows = () => [
  ['address', (company.address || []).map(esc).join('<br>')],
  ['regNo', esc(company.regNo || '')],
  ['vatEu', esc(company.vatEu || '')],
].filter(([, v]) => v);

const icon = {
  phone: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8z"/></svg>',
  mail: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v.4l8 5 8-5V7H4zm16 2.75-7.47 4.67a1 1 0 0 1-1.06 0L4 9.75V17h16V9.75z"/></svg>',
  chat: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.66 15l-1.3 4.27a.6.6 0 0 0 .74.74L7.05 20.7A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.25 14.78.9.9 0 0 0-.72-.1l-2.5.76.76-2.5a.9.9 0 0 0-.1-.72A8 8 0 0 1 12 4zm-3.2 4.3c-.25 0-.6.1-.9.45-.3.33-1.2 1.17-1.2 2.85s1.23 3.3 1.4 3.53c.17.23 2.4 3.67 5.83 5.15 2.86 1.13 3.44.9 4.06.85.62-.06 2-.82 2.28-1.6.28-.8.28-1.47.2-1.6-.09-.15-.31-.23-.65-.4-.34-.17-2-.99-2.3-1.1-.31-.12-.54-.17-.76.17-.23.34-.87 1.1-1.07 1.32-.2.23-.4.26-.73.09a9.2 9.2 0 0 1-2.7-1.67 10.2 10.2 0 0 1-1.87-2.33c-.2-.34 0-.52.15-.69.15-.15.34-.4.51-.6.17-.2.23-.34.34-.57.11-.22.06-.42-.03-.59-.08-.17-.74-1.85-1.04-2.52-.25-.57-.52-.58-.76-.59h-.65z"/></svg>',
  doc: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1.5V9h5.5L13 3.5zM8 12v2h8v-2H8zm0 4v2h8v-2H8z"/></svg>',
  check: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z"/></svg>',
  arrow: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 11.8 6.7l4.3 4.3H4v2h12.1l-4.3 4.3 1.4 1.4L20 12z"/></svg>',
  back: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.8 5.3 12.2 6.7 7.9 11H20v2H7.9l4.3 4.3-1.4 1.4L4 12z"/></svg>',
};
const logoMark = '<svg class="logo-mark" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#23574a"/><circle cx="16" cy="18" r="9.5" fill="none" stroke="#fff" stroke-width="3"/><circle cx="16" cy="18" r="3.2" fill="#d9b27c"/><path d="M16 27.5h16" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>';

// ---- layout ----
function page({ lang, title, description, body, altPath, current }) {
  const L = T[lang];
  const other = LANGS.map((l) => {
    const href = altPath(l);
    return l === lang
      ? `<span class="lang-active" aria-current="true">${esc(T[l].label)}</span>`
      : `<a href="${href}" hreflang="${l}" lang="${l}">${esc(T[l].label)}</a>`;
  }).join('<span class="lang-sep" aria-hidden="true">|</span>');
  const h = url.home(lang);
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t(title)}</title>
<meta name="description" content="${t(description)}">
<meta name="theme-color" content="#23574a">${ALLOW_INDEXING ? '' : '\n<meta name="robots" content="noindex, nofollow">'}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/css/style.css?v=${cssVersion}">
</head>
<body class="page-${current}">
<!--email_off--><!-- tells Cloudflare not to obfuscate e-mail addresses (its decoder script is blocked by our CSP) -->
<header class="site-header">
  <div class="container header-inner">
    <a class="logo" href="${h}">${logoMark}<span>${esc(company.brand)}</span></a>
    <nav class="main-nav" aria-label="${esc(L.nav.menu)}">
      <a href="${h}#about">${esc(L.nav.about)}</a>
      <a href="${h}#products">${esc(L.nav.products)}</a>
      <a href="${h}#contact">${esc(L.nav.contact)}</a>
    </nav>
    <div class="lang-switch">${other}</div>
  </div>
</header>
<main>
${body}
</main>
${footer(lang)}
<!--/email_off-->
</body>
</html>
`;
}

function footer(lang) {
  const L = T[lang];
  const lab = L.footer.labels;
  const rows = detailRows().map(([k, v]) => `<dt>${esc(lab[k])}</dt><dd>${v}</dd>`).join('');
  return `<footer class="site-footer">
  <div class="container footer-grid">
    <div>
      <div class="logo logo-light">${logoMark}<span>${esc(company.brand)}</span></div>
      <p class="footer-tagline">${t(L.footer.tagline)}</p>
    </div>
    <div>
      <h2>${esc(L.footer.details)}</h2>
      <p class="footer-legal">${esc(company.legalName)}</p>
      <dl class="footer-dl">${rows}</dl>
    </div>
    <div>
      <h2>${esc(L.footer.links)}</h2>
      <ul class="footer-links">
        <li><a href="${url.privacy(lang)}">${esc(L.footer.privacy)}</a></li>
        ${hasPhone ? `<li><a href="${tel}">${esc(company.phone)}</a></li>` : ''}
        <li><a href="${mail()}">${esc(company.email)}</a></li>
      </ul>
    </div>
  </div>
  <div class="container footer-bottom">© ${new Date().getFullYear()} ${esc(company.legalName)}. ${esc(L.footer.rights)}</div>
</footer>`;
}

const sectionHead = (eyebrow, title, intro) => `
  <p class="eyebrow">${esc(eyebrow)}</p>
  <h2 class="section-title">${esc(title)}</h2>
  ${intro ? `<p class="section-intro">${t(intro)}</p>` : ''}`;

function productCard(lang, p, small = false) {
  const L = T[lang];
  return `<a class="product-card${small ? ' product-card-small' : ''}" href="${url.product(lang, p.slug)}">
    <div class="product-img"><img src="/assets/img/${esc(p.image)}" alt="" width="800" height="600" loading="lazy"></div>
    <div class="product-body">
      <h3>${esc(p.name)}</h3>
      ${small ? '' : `<p>${t(p.short)}</p>`}
      <span class="more">${esc(L.products.more)} ${icon.arrow}</span>
    </div>
  </a>`;
}

function contactCards(lang) {
  const L = T[lang];
  const C = L.contact;
  const lab = L.footer.labels;
  const cards = [];
  cards.push(`<a class="contact-card" href="${mail()}">
      <span class="contact-icon">${icon.mail}</span>
      <span class="contact-label">${esc(C.email)}</span>
      <span class="contact-value">${esc(company.email)}</span>
      <span class="contact-action">${esc(C.emailAction)} ${icon.arrow}</span>
    </a>`);
  if (hasPhone) {
    cards.push(`<a class="contact-card" href="${tel}">
      <span class="contact-icon">${icon.phone}</span>
      <span class="contact-label">${esc(C.phone)}</span>
      <span class="contact-value">${esc(company.phone)}</span>
    </a>`);
  }
  if (hasWa) {
    cards.push(`<a class="contact-card" href="${wa()}" target="_blank" rel="noopener noreferrer">
      <span class="contact-icon">${icon.chat}</span>
      <span class="contact-label">${esc(C.whatsapp)}</span>
      <span class="contact-value">${esc(company.whatsapp)}</span>
      <span class="contact-action">${esc(C.whatsappAction)} ${icon.arrow}</span>
    </a>`);
  }
  cards.push(`<div class="contact-card contact-card-static">
      <span class="contact-icon">${icon.doc}</span>
      <span class="contact-label">${esc(L.footer.details)}</span>
      <span class="contact-value">${esc(company.legalName)}</span>
      <dl class="contact-dl">${detailRows().map(([k, v]) => `<dt>${esc(lab[k])}</dt><dd>${v}</dd>`).join('')}</dl>
    </div>`);
  return `<div class="contact-grid contact-grid-${cards.length}">
    ${cards.join('\n    ')}
  </div>`;
}

// ---- pages ----
function homePage(lang) {
  const L = T[lang];
  const body = `
<section class="hero">
  <div class="container hero-inner">
    <div class="hero-text">
      <p class="eyebrow">${esc(L.hero.eyebrow)}</p>
      <h1>${t(L.hero.title)}</h1>
      <p class="hero-lead">${t(L.hero.text)}</p>
      <div class="btn-row">
        <a class="btn btn-primary" href="#products">${esc(L.hero.cta)} ${icon.arrow}</a>
        <a class="btn btn-ghost" href="#contact">${esc(L.hero.cta2)}</a>
      </div>
    </div>
    <div class="hero-art"><img src="/assets/img/hero.svg" alt="" width="900" height="720"></div>
  </div>
</section>

<section id="about" class="section">
  <div class="container about-grid">
    <div>
      ${sectionHead(L.about.eyebrow, L.about.title)}
      ${L.about.paragraphs.map((p) => `<p>${t(p)}</p>`).join('\n      ')}
    </div>
    <ul class="points">
      ${L.about.points.map((p) => `<li><span class="point-icon">${icon.check}</span><div><h3>${esc(p.title)}</h3><p>${t(p.text)}</p></div></li>`).join('\n      ')}
    </ul>
  </div>
</section>

<section id="products" class="section section-tint">
  <div class="container">
    ${sectionHead(L.products.eyebrow, L.products.title, L.products.intro)}
    <div class="product-grid">
      ${L.productList.map((p) => productCard(lang, p)).join('\n      ')}
    </div>
  </div>
</section>

<section id="contact" class="section">
  <div class="container">
    ${sectionHead(L.contact.eyebrow, L.contact.title, L.contact.intro)}
    ${contactCards(lang)}
  </div>
</section>`;
  return page({
    lang, current: 'home', title: L.meta.title, description: L.meta.description, body,
    altPath: url.home,
  });
}

function productPage(lang, p) {
  const L = T[lang];
  const P = L.products;
  const msg = `${P.inquiryMessage}${p.name}`;
  const others = L.productList.filter((x) => x.slug !== p.slug);
  const body = `
<section class="section product-page">
  <div class="container">
    <a class="back-link" href="${url.home(lang)}#products">${icon.back} ${esc(P.back)}</a>
    <article class="product-hero">
      <div class="product-hero-img"><img src="/assets/img/${esc(p.image)}" alt="" width="800" height="600"></div>
      <div class="product-hero-text">
        <p class="eyebrow">${esc(P.eyebrow)}</p>
        <h1>${esc(p.name)}</h1>
        ${p.intro.map((x) => `<p>${t(x)}</p>`).join('\n        ')}
        <h2 class="small-title">${esc(P.features)}</h2>
        <ul class="checklist">
          ${p.features.map((f) => `<li>${icon.check}<span>${t(f)}</span></li>`).join('\n          ')}
        </ul>
      </div>
    </article>

    <div class="product-details">
      <div class="specs">
        <h2 class="small-title">${esc(P.specs)}</h2>
        <table>
          <tbody>
            ${p.specs.map(([k, v]) => `<tr><th scope="row">${t(k)}</th><td>${t(v)}</td></tr>`).join('\n            ')}
          </tbody>
        </table>
        <p class="note">${t(P.specsNote)}</p>
      </div>
      <aside class="inquiry">
        <h2>${esc(P.inquiryTitle)}</h2>
        <p>${t(P.inquiryText)}</p>
        <div class="inquiry-actions">
          <a class="btn btn-light" href="${mail(p.name, msg)}">${icon.mail} ${esc(L.contact.emailAction)}</a>
          ${hasWa ? `<a class="btn btn-light" href="${wa(msg)}" target="_blank" rel="noopener noreferrer">${icon.chat} WhatsApp</a>` : ''}
          ${hasPhone ? `<a class="btn btn-outline-light" href="${tel}">${icon.phone} ${esc(company.phone)}</a>` : ''}
          <span class="inquiry-email">${esc(company.email)}</span>
        </div>
      </aside>
    </div>

    <h2 class="small-title other-title">${esc(P.other)}</h2>
    <div class="product-grid product-grid-small">
      ${others.map((o) => productCard(lang, o, true)).join('\n      ')}
    </div>
  </div>
</section>`;
  return page({
    lang, current: 'product', title: `${p.name} — ${company.brand}`, description: p.short, body,
    altPath: (l) => url.product(l, p.slug),
  });
}

function privacyPage(lang) {
  const L = T[lang];
  const P = L.privacy;
  const body = `
<section class="section">
  <div class="container narrow">
    <h1>${esc(P.title)}</h1>
    <p class="section-intro">${t(P.intro)}</p>
    ${P.sections.map((s) => `<h2 class="small-title">${t(s.title)}</h2>\n    ${s.paragraphs.map((x) => `<p>${t(x)}</p>`).join('\n    ')}`).join('\n    ')}
  </div>
</section>`;
  return page({
    lang, current: 'privacy', title: `${P.title} — ${company.brand}`, description: P.intro, body,
    altPath: url.privacy,
  });
}

function notFoundPage(lang) {
  const N = T[lang].notFound;
  const body = `
<section class="section">
  <div class="container narrow center">
    <h1>${esc(N.title)}</h1>
    <p>${esc(N.text)}</p>
    <p><a class="btn btn-primary" href="${url.home(lang)}">${esc(N.back)}</a></p>
  </div>
</section>`;
  return page({ lang, current: 'notfound', title: `${N.title} — ${company.brand}`, description: N.text, body, altPath: url.home });
}

// ---- write ----
function write(rel, html) {
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'static'), DIST, { recursive: true });

if (!ALLOW_INDEXING) {
  const h = path.join(DIST, '_headers');
  const rules = fs.readFileSync(h, 'utf8').replace('/*\n', '/*\n  X-Robots-Tag: noindex, nofollow\n');
  fs.writeFileSync(h, rules);
}

let count = 0;
for (const lang of LANGS) {
  const dir = base(lang).replace(/^\//, '');
  write(path.join(dir, 'index.html'), homePage(lang)); count++;
  // Cloudflare Pages serves the nearest 404.html, so each language gets its own
  write(path.join(dir, '404.html'), notFoundPage(lang)); count++;
  write(path.join(dir, 'privacy', 'index.html'), privacyPage(lang)); count++;
  for (const p of T[lang].productList) {
    write(path.join(dir, 'products', p.slug, 'index.html'), productPage(lang, p)); count++;
  }
}
console.log(`Built ${count} pages into dist/`);
