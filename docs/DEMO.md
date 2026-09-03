# Email Studio — Internal Demo Guide

**Audience:** Company director. Internal review only. No client is in the room.

**Format:** Live tool demo. This document is the presenter's script and notes. There are no slides.

**Purpose of the meeting:** Show what was built, show that it works, be clear about what is not finished, and agree the next steps.

---

## 1. How to use this document

- Section 3 is the live demo script. Follow it on screen.
- In the script, **CLICK** is what to do, **SHOW** is what appears, **SAY** is the one line to speak.
- Sections 4 to 7 are the honest status: what works, what is partly done, what is not built.
- Section 8 is the expected director questions with short answers.
- Section 9 is what is needed next.

---

## 2. Before you start: demo on the local machine

Run the demo on the local machine, not on the hosted Vercel URL, unless the storage fix has already been deployed and checked.

**Why.** The hosted version currently saves templates into a temporary folder that belongs to one short-lived server instance. That folder is wiped between requests. So a template created on the hosted site can disappear straight away and show "Template not found". This is a hosting storage problem, not a bug in the builder. A fix is being implemented right now that moves template storage to Vercel Blob, which is durable shared storage. Until that fix is deployed and verified, the local machine is the safe place to demo. Note that the current fix covers templates; saved reusable components still use local file storage.

**Quick pre-demo checklist**

- [ ] Local app is running and the workspace opens.
- [ ] Storage decision made: local machine, or hosted after the Blob fix is verified.
- [ ] One good Figma desktop frame URL is ready, with the matching mobile frame URL.
- [ ] One template that already contains a good Figma import is open in a second tab, as a backup.
- [ ] Figma token is configured, if the live import will be shown.
- [ ] Resend key and a test inbox are ready, if the test send will be shown.
- [ ] An earlier exported ZIP is on the desktop, as a backup for the export step.

---

## 3. Live demo script — 10 to 15 minutes

### Step 1 — Open the workspace

**CLICK:** Open the app. Select **Open Workspace**.

**SHOW:** The template gallery with search, sort, and a new template button.

**SAY:** "This is where all our email templates live."

### Step 2 — Create a new email

**CLICK:** **New template**.

**SHOW:** The editor opens. Components on the left, live email in the middle, settings on the right.

**SAY:** "I am starting from empty so you can see the whole process."

### Step 3 — Set the email basics

**CLICK:** Rename the template in the top bar. With nothing selected, set preview text, background colour, and email width on the right.

**SHOW:** Name and settings update.

**SAY:** "These are the campaign-level settings for the email."

### Step 4 — Add a ready-made block

**CLICK:** Search **Header** in the component list. Drag it into **Structure**. Change one property, such as the background colour.

**SHOW:** A working header appears in the live preview.

**SAY:** "We have a library of standard email sections. No HTML coding is needed."

### Step 5 — Import a real Figma design (main feature)

**CLICK:** **Import** → **Fetch from Figma**. Paste the desktop frame URL and the mobile frame URL. Keep **Design** mode. Click **Fetch from Figma**.

**SHOW:** The tool reads the real design and shows the file and frame details.

**SAY:** "This reads the approved design straight from Figma."

### Step 6 — Choose what stays editable

**CLICK:** Continue to build. In **Choose layers to flatten**, leave headings and buttons unchecked. Check one complex artwork group so it becomes an image.

**SHOW:** Each layer shows either Design or Image.

**SAY:** "Text and buttons stay editable. Difficult artwork becomes an image so it looks correct."

### Step 7 — Build and add it

**CLICK:** **Build React Email**. Look at the preview and any warnings. Click **Add to canvas**.

**SHOW:** The Figma design becomes real, editable email blocks.

**SAY:** "This is the biggest time saving. The design is now a working email, not a picture."

### Step 8 — Edit the imported design

**CLICK:** Click a heading or button directly in the preview. Change its text or colour. Switch to **Mobile** and change one thing for phones only.

**SHOW:** The change appears immediately in desktop and mobile.

**SAY:** "Content changes are made here, not by a developer editing HTML."

### Step 9 — Build out the email

**CLICK:** Add a **Text Block** and a **Footer**. Drag a block into a different position. Duplicate one block, then delete the copy.

**SHOW:** The email grows and reorders live.

**SAY:** "The full email is assembled from reusable sections."

### Step 10 — Save a reusable component

**CLICK:** On a finished block, click **Add to components**. Give it a name. Then add it back from the **Reusable** list.

**SHOW:** The saved block appears in the component list and can be inserted again.

**SAY:** "Once a section is approved, we save it and reuse it in future campaigns."

### Step 11 — Show the code view

**CLICK:** **Code**. Show the split code and preview view. Close it.

**SHOW:** The same email as controlled React Email code.

**SAY:** "Non-technical users stay in the visual editor. Developers still have a safe way in."

### Step 12 — Preview and test send

**CLICK:** Switch **Desktop** and **Mobile**. If Resend is ready, click **Send test** and send to your inbox.

**SHOW:** 700px desktop view, 360px mobile view, and a real received email.

**SAY:** "We can check both sizes here and send the real thing to a real inbox."

### Step 13 — Export the handover package

**CLICK:** **Save**, then **Export**. Open the ZIP if there is time.

**SHOW:** A ZIP with one HTML file and an `img` folder.

**SAY:** "This is what we hand over for delivery."

### Step 14 — Close with the honest position

**CLICK:** Go back to the preview.

**SAY:** "The build is much faster now. The remaining problem is Outlook on Windows, and every campaign still needs real inbox testing before it goes out."

### If something fails during the demo

- Figma fetch fails: open the backup template that already has an import.
- AI is unavailable: skip the AI suggestion step. It is optional and the import still works.
- Test send fails: show the exported HTML in a browser instead.
- Export is slow: show the ZIP exported before the meeting.

---

## 4. What is built and working

This is the honest inventory of what exists in the tool today.

### Templates and workspace

- Create, open, duplicate, and delete templates.
- Search templates by name or description. Sort by name or last update.
- Set name, description, category, inbox preview text, page background, content background, and email width between 320px and 800px.
- Save with a button or Ctrl+S. Auto-save runs after 45 seconds of changes.
- Warning before leaving with unsaved changes.
- Light and dark theme for the workspace. This does not control email dark mode.

**Value:** Campaign work is organised in one place and is hard to lose by accident.

### Visual builder

- Three-panel editor: components, live email, settings.
- Drag and drop to add blocks and reorder them. Also add by double-click or Enter key.
- Search the component list.
- 19 built-in email sections: Header, Section Title, Intro Copy, Promo Block, Call-to-Action Banner, Footer, Order Card, Two-Column Dual Call-to-Action, Two-Column Stacked Products, One-Column Product, Three-Column Icons, Hero Banner, Divider, Button Row, Image Block, Testimonial, Text Block, Spacer, Statistics Row.
- Select, duplicate, reorder, or remove any block.
- Edit text, rich text, images, alt text, links, sizes, colours, alignment, and spacing.
- Advanced mode for structured data such as product rows, statistics, and social links.
- Panels adapt on smaller screens.

**Value:** Standard campaign sections do not get rebuilt from scratch every time.

### Reusable components

- Save any configured block as a named reusable component.
- Insert independent copies. Editing one copy does not change the others.
- A reusable component cannot be deleted while a saved template still uses it.

**Value:** Approved brand sections become shared building blocks.

### Figma import

- Fetch a Figma frame from a URL through the Figma API.
- Support a desktop frame plus an optional mobile frame from the same file.
- Design mode: convert supported text, headings, buttons, images, rows, and sections into editable email content.
- Image mode: flatten the whole section into one PNG.
- Mixed mode: keep content editable and turn selected layers into images.
- Choose exactly which layers become images. Search layers by name, type, text, or ID.
- Automatic detection of icons and vector artwork for sharp 2x image export.
- Review the confidence, explanation, warnings, and preview before adding anything.
- Batch import: several frames at once, three running in parallel.

**Value:** This is the main speed gain. A design becomes an editable email instead of hand-coded HTML.

### Editing imported designs

- Click any element in the preview to select and edit it.
- Layer list to browse, duplicate, or delete imported elements.
- Separate desktop and mobile values for text, button labels, colours, font sizes, and spacing. Mobile applies at 600px and below.
- Controls for headings, rich text, links, buttons, images, spacing, dividers, backgrounds, alignment, and corner radius.

**Value:** Imported designs are adjusted in the tool, not sent back to Figma or to a developer.

### AI assistance (optional)

- Screenshot to email: upload a desktop screenshot, and optionally a mobile one, to get suggested blocks.
- AI suggestions for which Figma layers should become images.
- Two providers are supported: local Ollama, and Google Gemini. If Gemini hits its usage limit, it falls back to local Ollama.

**Value:** Useful when clean Figma data is not available. It is a helper, not a decision maker. Every AI result must be reviewed.

### Code view

- View the email as controlled React Email code.
- Split code and preview view, or code only. Adjustable font size, wrapping, and formatting.
- Valid code edits update the visual email. Invalid code stays in the editor and does not break the saved email.
- Only supported email components and simple values are accepted. It does not run general JavaScript.

**Value:** A fast path for developers without giving up the safety of the visual builder.

### Preview and testing

- Live preview updates shortly after each change, with retry if a render fails.
- Desktop view up to 700px and mobile view at 360px.
- Send the current email to one or more real addresses through Resend, with a custom subject.

**Value:** Problems are found during the build, not after handover. A test send is not final approval.

### Export

- Download one ZIP with the rendered HTML file and an `img` folder.
- Local images are copied in. Reachable web images are downloaded and re-pointed to the local folder.
- File names are cleaned from the template name.

**Value:** Delivery gets one clean, portable package.

---

## 5. What is partly done

Be plain about these. Do not present them as finished.

### Excel tagging for links

The workflow is built end to end: upload an `.xlsx` file with `FINAL URL`, `URL Label`, and optional `Alt Text`, match rows to buttons, text, and images, review and rematch, then apply and save. There is also a desktop and mobile pass or fail checklist, which only lasts for the current browser session.

**Honest status:** Project notes mark this as not production-ready. The automatic matching and panel reliability were not good enough on a real campaign sheet. Links are still added and checked manually today. It needs a hardening round before the team relies on it.

### Outlook on Windows rendering

The tool produces valid email HTML and it has been tested in real inboxes.

**Honest status:** In the recorded Email on Acid test, Apple Mail and Gmail on the web looked correct, and most of the email worked in Gmail on Android. Outlook on Windows did not. It showed a duplicated logo, wrongly sized or cropped images, and extra spacing. This is the main open technical problem. Workarounds today are flattening the problem section to an image, or using the existing proven email path for Outlook-critical campaigns.

### Complex layouts

Standard and well-structured designs convert well.

**Honest status:** Some two-column and three-column layouts still need manual correction after import. Carousel, colour selector, and hotspot interactions cannot be produced as editable email components at all. Those need a static or image-based alternative.

### Hosted deployment

The app runs on Vercel.

**Honest status:** Hosted template storage is being fixed right now, as described in section 2. Until Vercel Blob storage is deployed and verified, hosted templates do not survive. Local use is unaffected.

---

## 6. What is not built

Nothing below exists in the product today. Do not imply otherwise.

- **Login and permissions.** There is no user account, role, or ownership. Enforced authentication mode deliberately refuses all requests because there is no identity system behind it. The app must not be exposed publicly in this state.
- **Database storage.** PostgreSQL is not implemented. The setting exists but the code explicitly reports that it is not available in this phase. Templates and reusable components are files.
- **Cloud asset storage (S3).** Not implemented. The same "not available in this phase" message applies. Uploaded images are stored locally.
- **Multi-user editing.** No collaboration, no locking, no conflict handling. Two people editing at once is not safe.
- **Version history.** No revision history, no restore, no recycle bin, no audit log.
- **Automatic cleanup.** Unused uploaded images are not removed automatically.
- **Inbox certification inside the tool.** Real client rendering is not checked in the app. That still needs Email on Acid or manual device testing.
- **Customer data personalisation.** The tool applies links and alt text. It does not connect to a customer database or send individual personalised emails to a list.

---

## 7. Time saved

These are working observations recorded during the project. They are not guaranteed figures.

| Work item | Before | Now |
| --- | --- | --- |
| Building one simpler component | About 2 to 2.5 hours | About 25 to 30 minutes |
| Full template layout | About 4.5 to 6 hours | Target of about 2 to 3 hours |
| Adding and checking URLs | Manual | Still manual, because tagging is not production-ready |

The real saving depends on the quality of the Figma file, how complex the design is, and how many inbox fix rounds are needed. Outlook fixing can take back part of the saving on a difficult campaign.

---

## 8. Director questions and honest answers

### How much time does this actually save per email?

Roughly half the layout build time on a normal campaign, based on the figures in section 7. A simple component drops from around two hours to around half an hour. The saving shrinks when the design is complex or when Outlook needs fixing. URL work is not yet faster, because tagging is not production-ready.

### Does it actually work, or is it a prototype?

The build, edit, preview, test send, and export path works end to end. A full template was built with it, exported, and sent to QA. So it is real working software, not a mock-up. It is not a finished product: there is no login, no database, and no multi-user support.

### What is the biggest risk?

Outlook on Windows. Real testing showed duplicated and wrongly sized images and extra spacing. Until that is fixed or worked around, the tool is best for drafting and for campaigns where Apple Mail and Gmail are the main audience. Outlook-critical work should still use the existing proven path or use flattened images.

### Can the team use it today?

Yes, internally, on a local machine, for building and exporting drafts. It cannot be opened to outside users because there is no login and no user separation.

### Can several people work on it at once?

Not safely. Templates are files on one machine and there is no locking or conflict handling. That is platform work that has not been started.

### What happens if someone deletes something by mistake?

There is no recycle bin and no version history. Deleted templates are gone. That is a real gap and should be on the roadmap before wider team use.

### What is left to finish?

In priority order: fix Outlook rendering, finish the hosted storage fix, harden the Excel tagging workflow, then add login, database storage, cloud asset storage, and version history.

### What would it take before a client could use it?

Four things at minimum. First, Outlook rendering must be acceptable or a clear workaround must be agreed. Second, login, permissions, and separate client workspaces must exist. Third, storage must move to a real database and cloud asset storage with backups. Fourth, a data policy decision on AI, because using Google Gemini means design images can leave our environment. Local Ollama keeps that processing internal.

### Is client design data safe right now?

The Figma token stays on the server and is never sent to the browser. But the app has no login, so it must stay internal. Figma debug files can contain design structure. If Gemini is used, design images go to Google. If Ollama is used, AI stays on our machine. This needs a policy decision before any client-facing use.

### What does it cost to run?

The tool itself has no licence cost. Running cost depends on hosting, Figma access, Resend email volume, and whether we use Gemini or local Ollama. Gemini is charged per use. Ollama is free but needs a capable machine. A proper cost figure needs the hosting and usage decisions first.

### Should we keep investing in this?

The build speed gain is real and measured. The main open question is Outlook. A short focused effort on Outlook hardening plus a real inbox re-test would tell us whether this replaces the current path or stays a drafting tool. That is a small, bounded piece of work with a clear answer at the end.

---

## 9. What is needed next

### Immediate, this week

1. Finish and verify the Vercel Blob storage fix so the hosted version keeps templates.
2. Run a focused Outlook on Windows fix round on the known problem sections.
3. Re-test the exported HTML in real inboxes and record the result.

### Decisions needed from the director

1. **AI provider policy.** Google Gemini, local Ollama, or both. This affects whether design data leaves our environment.
2. **Hosting.** Where this runs, and whether it stays internal only for now.
3. **Priority.** Fix Outlook first, or add login and database storage first. Outlook is recommended, because it decides whether the output is usable at all.
4. **Scope.** Whether this remains an internal drafting tool, or becomes a product we put in front of clients. The second option needs the four items listed in section 8.

### Larger work, if we continue

- Login, permissions, and separate workspaces per team or client.
- Database storage and cloud asset storage, with backups.
- Version history, restore, and an audit trail.
- Hardened Excel tagging so URL work also becomes faster.
- Better handling of complex multi-column layouts.
