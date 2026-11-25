# Tagalika — сайт-визитка (EN / PL)

Статический сайт без форм, cookie и внешних скриптов. Английский язык открывается по адресу `/`, польский по `/pl/`.

## Где что править

| Что | Файл |
|---|---|
| Тексты на английском | `content/en.json` |
| Тексты на польском | `content/pl.json` |
| Телефон, e-mail, WhatsApp, реквизиты (общие для обоих языков) | `content/company.json` |
| Цвета и оформление | `static/assets/css/style.css` |
| Картинки продукции | `static/assets/img/` |

- В `company.json`: название, рег. номер, VAT, e-mail и адрес (`address` — список строк, пока пустой). Поля `phone` и `whatsapp` сейчас пустые (`""`), поэтому телефона и WhatsApp на сайте нет. Если вписать номер, кнопки и карточки появятся сами.
- В текстах можно подставлять поля из `company.json`: `{{legalName}}`, `{{email}}`, `{{brand}}`.
- Товары перечислены в `productList`. Чтобы добавить товар, добавьте блок в **оба** файла (`en.json` и `pl.json`) с одинаковым `slug` и в том же порядке. Для каждого товара создаётся своя страница `/products/<slug>/`.
- Картинки — иллюстрации, нарисованные генератором `tools/draw_images.py` (`python3 tools/draw_images.py`). Чтобы поставить настоящее фото, положите его в `static/assets/img/` и укажите имя файла в поле `image` у товара (лучше формат 4:3, например 1200×900, JPG или WebP).

## Сборка и просмотр

```bash
node build.js
```

Готовый сайт появляется в папке `dist/`. Посмотреть локально:

```bash
python3 -m http.server 8080 -d dist
```

После этого откройте http://localhost:8080.

## Cloudflare Pages

Workers & Pages → Create → Pages → Connect to Git → выбрать этот репозиторий:

- **Build command:** `node build.js`
- **Build output directory:** `dist`

Заголовки безопасности задаются в `static/_headers`.

## Индексация поисковиками

Сейчас индексация **выключена**: в каждой странице стоит `noindex`, и Cloudflare отдаёт заголовок `X-Robots-Tag: noindex`. Чтобы включить её, поменяйте в начале `build.js` значение `ALLOW_INDEXING = false` на `true`.
