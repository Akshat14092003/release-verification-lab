# Fieldwork image prompts - Gemini app

Generate these in the Gemini app using your Pro plan. These are original, fictional products.
Create one image per prompt. Download the full-size image, rather than taking a screenshot.

## Shared style

Paste this before each product prompt, or keep all requests in one Gemini conversation:

> Create premium e-commerce photography for Fieldwork, a fictional minimal lifestyle shop.
> Keep all images visually consistent: soft daylight from upper left, warm ivory seamless studio
> background, sage/forest greens, terracotta and warm neutral colors, realistic materials, gentle
> contact shadows, restrained editorial styling. Show the complete product with generous margins.
> Photorealistic photography, no vector illustration or cartoon. No text, branding, logos,
> watermarks, hands, people, packaging, labels, or price tags. Do not generate a webpage or collage.

## 1. Everyday journal

Filename: **journal.jpg**. Shape: **square, 1:1**.

> One closed sage-green linen-covered hardcover journal, subtly rounded corners, cream page
> edges, no writing on the cover. A single natural wood pencil rests neatly beside it.
> Elevated three-quarter camera angle, slightly diagonal arrangement. Both journal and pencil
> fully visible, centered with at least 15 percent clear space around them. Fine fabric texture,
> realistic paper edges, soft light from upper left. Product fills roughly 65 percent of the frame.
> Warm ivory studio background. Use the shared Fieldwork photographic style.

## 2. Studio headphones

Filename: **headphones.jpg**. Shape: **square, 1:1**.

> One pair of premium unbranded over-ear headphones in matte deep forest green, with thick soft
> ear cushions and a padded curved headband. Upright three-quarter view, both earcups and the
> complete headband clearly visible, realistic symmetric construction, no cables or stand.
> Centered with at least 15 percent clear space around the product. Gentle contact shadow on
> a warm ivory studio background. Match the journal photo's lighting, camera quality, and scale.

## 3. Ceramic mug

Filename: **mug.jpg**. Shape: **square, 1:1**.

> One terracotta ceramic mug with a rounded cylindrical body, thick comfortable handle on the
> right, warm clay exterior and slightly lighter glazed inner rim. Empty mug, no liquid, no steam,
> no saucer. Three-quarter view slightly from above so the rim is visible. Realistic fine ceramic
> texture and a coherent circular handle. Entire mug visible, centered with at least 15 percent
> clear space around it. Warm ivory studio background. Match the other Fieldwork product photos.

## 4. Arc desk lamp

Filename: **lamp.jpg**. Shape: **square, 1:1**.

> One elegant sage-green metal desk lamp with a gently angled slender stem, a simple conical
> shade tilted toward the left, and a stable low round base. Show the entire lamp, from shade
> to base, in a realistic three-quarter view. No cord, furniture, or other props. Shade, stem and
> base must connect plausibly. Centered with at least 15 percent clear space around it. Soft
> contact shadow on a warm ivory studio background. Match the other Fieldwork product photos.

## 5. Collection / login hero

Filename: **collection-hero.jpg**. Shape: **landscape, 3:2**.

Attach the four finished product images as references to this request:

> Create a premium editorial still-life photograph using these four reference products. Preserve
> their exact colors, materials, silhouettes and proportions: sage linen journal and wood pencil,
> forest-green over-ear headphones, terracotta mug, sage metal desk lamp. Arrange them naturally
> on a pale warm stone desk in a quiet sunlit studio. Lamp behind, journal and pencil in the
> foreground, headphones and mug to either side. Subtle olive wall, soft afternoon light from
> upper left, gentle architectural shadows, tactile materials. Spacious balanced composition;
> all four products recognizable and no product cut off. Photorealistic, calm, sophisticated,
> cohesive with the individual product shots. No extra products, people, hands, text, signage,
> labels, branding, logos, watermarks, interface elements or collage layout. Landscape 3:2.

## Send the files back

Attach the five downloaded images in chat, or place them in:

```text
D:\Akshat\Projects\release-verification-lab\public\images\
```

PNG or WebP downloads are also fine; keep the same base filenames and their real extensions.
Do not rename a PNG to .jpg. The integration step will optimize the files, add responsive sizing
and alt text, and update product, hero, login, offer, cart and checkout views together.

## Imported assets - 2026-11-01

The user supplied all five Gemini-app images. They are now connected to catalogue cards,
product pages, offers, cart, checkout, the collection hero and desktop login story.

- Products use 320, 640 and 1280-pixel WebP variants; the collection uses 640, 1280 and 1920 pixels.
- The source bundle was 32,230,796 bytes. All 15 responsive variants total 507,452 bytes.
- Source aspect ratios and visible Gemini marks are preserved. Product views use contain sizing.
- Responsive srcset/sizes selects an appropriate file. Main hero/detail images load eagerly;
  product cards and basket thumbnails use lazy loading. All images have descriptive alt text.
- Original files remain unchanged in Downloads; local working copies are gitignored.

The images are synthetic catalogue artwork, supplied by the user from Gemini, for a fictional shop.

## Dark variants - 2026-11-05

The user supplied matching `journal-dark.jpg`, `headphones-dark.jpg`, `mug-dark.jpg`,
`lamp-dark.jpg` and `collection-hero-dark.jpg`, preserving product colours against navy
backgrounds. The 31,873,071-byte source bundle becomes 15 responsive WebP files totalling
459,788 bytes, using the same width variants as the light set.

Native `picture` sources select these assets for dark mode. The theme control and saved
preference override the system setting, including images inserted by inline cart updates.
Without JavaScript, source media follows the system colour scheme. Light assets stay intact;
photos are not inverted or tinted. The collection variant appears on Home and desktop login.
Original downloads and visible artwork marks are preserved.
