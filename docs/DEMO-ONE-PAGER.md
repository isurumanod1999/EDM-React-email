# Email Studio — Demo Cheat Sheet

**For:** Company director. Internal review. Present the live tool and use this page as notes.

**Before you start:** Demo on the local machine. The hosted Vercel version currently loses new templates.

---

## What this tool is

Email Studio is an internal web tool for building marketing emails. It turns a Figma design into an editable email instead of hand-coded HTML. The user edits the content, checks desktop and mobile views, sends a test to a real inbox, and downloads the final HTML with its images. It removes most of the slow layout coding work.

---

## What I built

**Templates**
- Create, open, duplicate, delete, search, and sort templates.
- Save manually or by auto-save. Warning before losing unsaved work.

**Visual builder**
- 19 ready-made email sections: header, hero, product rows, buttons, footer, and more.
- Drag to add and reorder. Edit text, images, links, colours, spacing.
- Save any section as a reusable component for future campaigns.

**Figma import (main feature)**
- Paste a desktop frame link, plus an optional mobile frame link.
- Text and buttons stay editable. Chosen layers become images when the design is too complex for email HTML.
- Batch mode imports several frames at once.

**AI (optional)**
- Screenshot to email blocks. Suggests which layers should be images.
- Works with local Ollama or Google Gemini. Results always need review.

**Preview, test, export**
- Live desktop (700px) and mobile (360px) preview.
- Send a real test email through Resend.
- Export one ZIP with the HTML and image folder.
- Code view for developers, with the visual builder protected from broken edits.

---

## Live demo steps

1. **Open the workspace** — say: "This is where all our templates live."
2. **Click New template** — say: "I am starting from empty so you see the whole process."
3. **Set name, preview text, width** — say: "These are the campaign-level settings."
4. **Drag in a Header block, change a colour** — say: "Standard sections, no coding needed."
5. **Import → Fetch from Figma, paste the frame URL** — say: "This reads the approved design straight from Figma."
6. **Choose which layers become images** — say: "Text stays editable. Difficult artwork becomes an image."
7. **Build, then Add to canvas** — say: "The design is now a working email, not a picture. This is the big time saving."
8. **Click a heading in the preview and edit it, then switch to Mobile** — say: "Content changes happen here, not in code."
9. **Add a Text Block and Footer, reorder them** — say: "The full email is assembled from reusable sections."
10. **Save a block as a reusable component** — say: "Approved sections get reused in future campaigns."
11. **Switch Desktop / Mobile, then Send test** — say: "We check both sizes and send the real thing to a real inbox."
12. **Save, then Export the ZIP** — say: "This is what we hand over. The build is much faster now, but every campaign still needs real inbox testing."

**If something fails:** open the backup template that already has a Figma import, and show the ZIP exported before the meeting.

---

## Honest limits

- **Outlook on Windows.** Real inbox testing showed a duplicated logo, wrongly sized images, and extra spacing. Apple Mail and Gmail web were correct. This is the main open problem. Every export still needs real inbox testing.
- **Excel URL tagging.** Fully built, but project notes mark it as not production-ready. Matching was unreliable on a real campaign sheet. URLs are still added manually.
- **Hosted version.** On Vercel, new templates are written to a temporary folder that is wiped between requests, so they can vanish with "Template not found". A fix moving storage to Vercel Blob is being implemented now. Until it is deployed and verified, use the local machine.
- **Not built:** no login or user separation, no database (Postgres), no cloud asset storage (S3), no multi-user editing, no version history or recycle bin.
- **Complex layouts.** Some two- and three-column designs need manual correction. Carousel, colour picker, and hotspot cannot be built as editable email components.

---

## Likely questions

**How much time does it save?** Roughly half the layout build time. One component went from about 2 hours to about 30 minutes. A full template targets 2–3 hours instead of 4.5–6. URL work is not faster yet.

**Does it really work or is it a prototype?** It works end to end. A full template was built, exported, and sent to QA. It is not a finished product — no login, no database.

**What is the biggest risk?** Outlook on Windows. Until that is fixed, it is best for drafting and for Gmail and Apple Mail audiences.

**Can the team use it now?** Yes, internally on a local machine. It cannot be opened to outside users because there is no login.

**Can two people work on it together?** No. Templates are local files with no locking or conflict handling.

**What if someone deletes something?** It is gone. There is no version history or recycle bin. That is a real gap.

**What is left to do?** Fix Outlook, finish the hosted storage fix, harden Excel tagging, then add login, database, cloud storage, and version history.

**What would it take before a client could use it?** Four things: acceptable Outlook rendering, login and separate client workspaces, real database and cloud storage with backups, and an AI data policy decision.

**Is design data safe?** The Figma token stays server-side. But there is no login, so it must stay internal. Gemini sends design images to Google; local Ollama keeps it in-house. This needs a decision.

**What does it cost?** No licence cost. Cost depends on hosting, Resend volume, and whether we use Gemini (paid per use) or Ollama (free, needs a capable machine).

---

## What I need from you

1. **AI policy** — Gemini, Ollama, or both. This decides whether design data leaves our environment.
2. **Priority** — fix Outlook first, or build login and database first. Outlook is recommended, because it decides whether the output is usable at all.
3. **Scope** — does this stay an internal drafting tool, or become a client-facing product?
