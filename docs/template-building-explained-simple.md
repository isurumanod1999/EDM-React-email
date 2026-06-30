# Building Email Templates — Explained in Simple English

> This document explains, in plain language, the three ways we can build marketing emails (EDMs).
> It stays technical, but every technical word is explained so anyone on the team can follow.
>
> The three ways are:
> 1. **The current way** — hand-coding emails from a Handlebars template and cutting the design into images.
> 2. **React Email (the tool/framework) by hand** — developers write the email as small reusable code pieces.
> 3. **Our app** — paste a Figma link and it builds the email for you using React Email pieces.

---

## First, some words explained

- **EDM** = "Electronic Direct Mail" = a marketing email.
- **HTML** = the code that web pages and emails are made of.
- **Email client** = the app that opens the email (Gmail, Outlook, Apple Mail, etc.). Each one reads HTML a little differently, which is why emails are hard.
- **Outlook (desktop)** = the trickiest email client. It uses Microsoft Word to draw emails, so it ignores many modern web features.
- **Responsive** = the email changes layout to fit small phone screens vs big desktop screens.
- **Slicing** = cutting a design into image pieces (e.g. one big picture for the top "hero" area).
- **Figma** = the design tool where the campaign is designed.
- **Handlebars** = a system that fills in blanks in a template, like adding the customer's first name automatically.
- **Personalization tokens / merge fields** = the blanks Handlebars fills in (first name, unsubscribe link, etc.).
- **React Email** = a library of ready-made email building blocks (`Section`, `Row`, `Column`, `Text`, `Button`, `Image`, etc.) that produce email-safe HTML. Docs: https://react.email/docs/components
- **Deterministic** = same input always gives the same result (no guessing, no randomness).
- **Accessibility** = how well the email works for people using screen readers or other assistive tech.
- **Dark mode** = when the phone/email app shows a dark background; images with baked-in text can look broken here.

---

## Way 1 — The current way (Handlebars + cutting the design into images)

### How it works (step by step)
1. Designers make the campaign in **Figma**.
2. A developer **cuts the design into images** — usually one image per section, and often **two versions of each**: one for desktop and one for mobile.
3. The developer **pastes these images into a large, pre-built HTML template** by hand. This template is full of:
   - **Tables** (the old, reliable way to lay out emails),
   - hundreds of small **helper styles** (for font sizes, spacing, stacking on mobile),
   - and **special Outlook-only code** so it looks right in Outlook.
4. Each image is wrapped in a **link** that tracks clicks (the long URLs with `utm_...` in them).
5. **Personalization** is added with Handlebars blanks, like "Hello {{first name}}".
6. On a phone, the email **swaps the desktop image for the mobile image** automatically.
7. The team **tests it in many email clients** before sending.

### The good (Pros)
- **Looks exactly like the design.** Because each section is a picture, it can look perfect — even fancy effects.
- **Works great in Outlook.** The template has special Outlook code built in over years.
- **Full personalization.** First names, unsubscribe links, mirror page links, tracking IDs — all supported.
- **Reliable mobile layout.** The helper styles and image-swapping are well tested.
- **The team already knows it.**

### The not-so-good (Cons)
- **Slow and very manual.** Cutting images and hand-editing a big HTML file takes a long time.
- **Needs an expert.** Only an experienced email developer can do it well.
- **Easy to make mistakes.** Editing hundreds of lines of code by hand leads to small errors.
- **Too many images cause real problems:**
  - Text inside an image **can't be read by screen readers** (bad for accessibility).
  - If the email app **blocks images** (common at work), the email looks empty.
  - Images make the email **heavier and slower** to load.
  - Text in images **looks wrong in dark mode**.
  - **Changing one word means re-cutting the image** — a full design + developer round trip.
- **Hard to reuse.** Sections are copied between emails instead of shared, so fixes don't carry over.

### Best used when
The design must be pixel-perfect and the look matters more than editable text.

---

## Way 2 — React Email by hand (developers write code pieces, *not* using our app)

### How it works (step by step)
1. Developers write the email as small **reusable code blocks** — for example a `HeroBanner`, a `ProductCard`, a `Footer`.
2. They use **React Email's ready-made blocks** (`Section`, `Row`, `Column`, `Text`, `Button`, `Image`, `Link`). These automatically turn into email-safe HTML, so developers don't have to hand-write tables.
3. They get a **live preview** while coding, so they see changes instantly.
4. The code is **saved in version control (git)**, so it can be reviewed and reused.

### The good (Pros)
- **Reusable building blocks.** Build a piece once, use it in many emails; fix it once, everywhere updates.
- **Real text (not images).** This means it's **accessible**, works in **dark mode**, can be **translated**, and **loads faster**. Changing a word is just editing text.
- **Modern, comfortable for developers.** Live preview, type checking, code review, testing.
- **Easy to maintain and grow** into a consistent set of email components.
- **Handles many email-client quirks for you**, because the library already includes those fixes.

### The not-so-good (Cons)
- **Still needs a developer** to build each email from the design.
- **Not pixel-perfect for fancy designs.** Overlapping art, gradients, and special text effects still have to become images.
- **Outlook still has limits.** Outlook desktop ignores the rules that restyle the email on mobile — this is a limit of email itself, not the library.
- **Personalization is manual.** The first-name/unsubscribe blanks must be added by hand.
- **Learning curve** for developers new to email.

### Best used when
You have developers and want clean, reusable, text-first templates that are easy to maintain.

---

## Way 3 — Our app (paste a Figma link, it builds the email)

### How it works (step by step)
1. You **paste a Figma link**. The app **downloads the design** (the structure, the text, the colors, and the images) directly from Figma. No guessing, no AI.
2. The app **reads the design and converts it into React Email blocks** using fixed rules:
   - A **row of items in Figma** becomes a `Row` with `Columns` (2 or 3 across).
   - A **stack of items** becomes stacked sections.
   - **Headings and body text** become real text.
   - **Emails and phone numbers** become clickable links (`mailto:` / `tel:`).
   - **Buttons** are detected, including **outline buttons** (white with a border) vs **filled buttons**.
   - **Colored banners, bordered boxes, and rounded cards** keep their background and border.
   - **Small icons** stay small (they used to get stretched — that's fixed).
   - **Complex picture areas** (like a price written on top of a car photo) are turned into **one image**, because that can't be live text in email.
   - **Mobile behavior is automatic:** matching cards stay side by side, while a picture-plus-text banner stacks on top of each other on phones.
3. The result is a template made of **only official React Email blocks**, ready to use and export.

### The good (Pros)
- **Very fast.** Design to a working draft in **minutes**, not hours or days.
- **Anyone can use it.** A designer or marketer can make a draft without an email developer.
- **Same result every time.** It's deterministic — the same design always builds the same way.
- **Built on React Email**, so it gets the benefits of Way 2: real text where possible, reusable, email-safe.
- **Already knows the common Nissan layouts:** hero banners, 2- and 3-column product/comparison cards, icon "benefits" rows, contact and call-to-action banners, social rows, and footers.
- **Less manual image cutting** — it exports the needed images for you.

### The not-so-good (Cons)
- **The design must be tidy.** It works best when the Figma file uses proper "auto layout" and **consistent layer names** (so it can match desktop to mobile). Messy or hand-positioned designs convert less accurately.
- **Fancy effects can't become live text.** Overlapping text on photos, gradients, and small vector icons are either turned into images or skipped (small icon symbols are dropped unless they're exported as images).
- **Links and personalization aren't in the design.** The tracking URLs and first-name/unsubscribe blanks must be **added by hand afterward**. The app can leave clearly-labeled placeholders so you know where they go.
- **Outlook still has the same mobile limits** as every email.
- **Unusual layouts can confuse the rules**, so rare cases may need a small code fix.
- **Setup needed** — a Figma access key (or the Figma desktop plugin) and well-prepared design files.
- **Not yet a full replacement** for every hand-tuned Outlook trick in the current template.

### Best used when
You want to go from a clean Figma design to a solid React Email **starting point fast**, then add the finishing touches (links, personalization, any tricky Outlook bits).

---

## Can we fix rendering bugs and get pixel-perfect? (important for the demo)

Emails look different in different apps **and** on different phones — e.g. Apple Mail might look right on iPhone 15/16/17 but break on 13/14, or work on a Pixel but not an iPhone, or work in Gmail but not Outlook. A common question is: *if something breaks in one app, can we fix it?*

**The key point to make clear:** React Email is **just code** — you can fully customize it. It is **not** a locked box. Anything an email developer fixes by hand in the current way can also be done in React Email: custom styles, special Outlook code, "bulletproof" buttons, image fallbacks, and even raw HTML when needed. So "we can't customize React Email" is **not true**.

**But here is the honest part (where the current way still wins):**
- The special **Outlook-only code** (`<!--[if mso]>`) is a bit awkward in React Email — it needs a small helper or an extra step. It works, but it's not as direct as typing it into raw HTML.
- **Our app's output is clean but not pre-hardened.** It does not automatically add all the Outlook/device fix-up tricks your current master template has built up over the years. For a tricky bug, a developer still has to fix the generated code (or we add the fix into the app once).
- **Re-building overwrites manual fixes.** If you hand-fix the app's output and then re-import from Figma, your fixes are lost — unless we put the fix inside the app itself (fix once, applies to all).
- **Pixel-perfect:** the current way gets this by turning everything into images. React Email and our app **can also be pixel-perfect** by using images for those sections (our app already turns complex art into images). The difference is they prefer real text when they can, which is better for accessibility.

**Simple takeaway for the demo:** The current way's strength is the **years of fix-up tricks baked into its template**. React Email *can* do all of that too — it just doesn't have *your* tricks yet. If we add those proven fixes into React Email (or into our app) **one time**, every future email gets them automatically. So you keep the app's speed **and** the current way's reliability.

---

## Quick comparison (simple words)

| Question | Current way | React Email by hand | Our app |
|---|---|---|---|
| How fast to a first draft? | Slow | Medium | **Fast** |
| Who can do it? | Email expert | Developer | **Almost anyone** |
| Looks exactly like the design? | **Yes, perfect** | Mostly | Mostly (depends on the design) |
| Is the text real (not pictures)? | Mostly pictures | **Yes** | Mostly yes |
| Good for accessibility & dark mode? | Weak | **Strong** | Strong |
| Best in Outlook? | **Best** | Good | Good |
| Easy to reuse & maintain? | Hard | **Easy** | Easy |
| First names / unsubscribe built in? | **Yes** | Added by hand | Added by hand |

---

## One more option: "JSX Email" (good to know for the demo)

Besides React Email, there is a similar framework called **JSX Email**. It's also code-based (like React Email) but adds extra developer tools — for example a **built-in checker** that warns you when something won't work in certain email apps. It's a good fit for developer/software teams.

For us, the important point is: **our app produces React Email**, so JSX Email is just the main "other framework" in the same space — useful to mention, but not what our tool uses.

## A note on sending (ESP / Adobe Campaign)

The emails are actually sent through a platform like **Adobe Campaign** (an "ESP" — Email Service Provider). The current Handlebars way fits these platforms naturally, because its personalization blanks (first name, unsubscribe, etc.) are exactly what those platforms expect. React Email, JSX Email, and our app all need an extra step to turn the design into the final HTML and add those blanks — which is the manual finishing step the team already does.

## How they fit together (the smart way to work)

You don't have to pick only one. A good flow is:

1. **Design tidily in Figma** (proper auto-layout, clear layer names, repeated cards as components).
2. **Use our app to build the first version fast.**
3. **Open it in React Email and finish it** — add the real tracking links and personalization, and fix anything the rules misread.
4. **Add the Outlook hardening** from the current template for campaigns that must be flawless everywhere.
5. **Test in all email clients, then send.**

This way you get the **speed** of the app, the **easy maintenance** of React Email, and the **perfect look and Outlook support** of the current way where it matters most.

---

## One-paragraph summary

The **current way** gives the best-looking, most Outlook-proof emails, but it is slow, needs an expert, and relies on images that hurt accessibility and make small edits painful. **React Email by hand** gives clean, reusable, text-first emails that are easy to maintain, but still needs a developer for each one. **Our app** is the fastest: it turns a tidy Figma design into a React Email template in minutes and anyone can use it — you just add the links and personalization afterward and polish any tricky parts. The best results come from combining all three: build fast with the app, maintain with React Email, and harden with the current template's Outlook know-how.
