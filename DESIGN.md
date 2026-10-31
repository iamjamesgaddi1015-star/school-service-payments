---
version: alpha
name: Service ledger
description: A quiet, practical collection book for a personal school service.
colors:
  primary: '#164B43'
  background: '#F8F9F6'
  surface: '#FFFFFF'
  text: '#153E36'
  muted: '#586C64'
  border: '#E0E7E1'
  accent: '#E9BC54'
  success: '#22604D'
  warning: '#84531A'
  danger: '#A23B35'
typography:
  sans:
    fontFamily: "'Instrument Sans', 'Segoe UI', Arial, sans-serif"
  display:
    fontFamily: "'Instrument Sans', 'Segoe UI', Arial, sans-serif"
  mono:
    fontFamily: "'Instrument Sans', 'Segoe UI', Arial, sans-serif"
rounded:
  DEFAULT: '10px'
  sm: '7px'
  lg: '18px'
spacing:
  section-gap: '22px'
  page-max: '1510px'
components:
  button: {}
  card: {}
  dialog: {}
  table: {}
  input: {}
---

# Service ledger Design System

## Overview

### Creative North Star

A school-run operator's collection notebook: dependable green cover, a yellow marker against the collected balance, and tidy rows that make follow-ups easy. This is a working ledger, so useful numbers lead the page.

### Product context and register

- Audience: one owner monitoring students and collections on a laptop or tablet.
- Target context: the user's personal school service; PHP reflects their Philippine context. No Japanese-market requirements.
- Locale: English UI, en-PH amounts and display dates, Asia/Manila date boundaries. Platform-owned date/month picker language is accepted.
- Register: product. Familiar labels and compact tables take precedence over decoration.
- Signature: pale green collected balance, gold current-month cash bar, and a generated school-route illustration on the sign-in screen.
- Restraint: no dashboard hero, gradients, animated counters, or remote image requests.
- Anti-references: banking dashboards implying online account connections; school portals implying shared student login.
- Token ownership: runtime `src/styles.css :root` is canonical. This document mirrors its semantic roles; update both together. No generated theme adapter.

## Colors

Primary green owns the main action and collection progress. Navigation uses a neutral selected surface. Yellow identifies the current cash-received month, never body text on white. Text, muted text, borders and surfaces use the named frontmatter roles. Status badges include text and a dot; color alone does not carry meaning. Success background is #E7F3EC, warning background #FFF3D9, and danger background #FCECE9. Focus is a visible #BC831C outline. Light theme only; forced colors restore system-operable borders and scrollbars.

## Typography

Self-hosted Instrument Sans carries headings, interface and tabular financial figures. Two local WOFF2 weights (400 and 600) avoid third-party font requests; system sans is the fallback. Body is 16px/1.5, page headings 25–32px, financial totals 24–36px and secondary captions 12–13px. Amounts retain exact centavos and full values in scrolling tables. The font's OFL license is included in assets/FONT-LICENSE.txt.

## Layout

Desktop: 232px navigation, 65px topbar, 38px page padding, 1510px maximum content width. Four metric columns share 16px gaps; activity and payment progress share a two-column row. At 800px navigation becomes a horizontally scrolling top strip and metrics become two columns. At 600px dashboard panels stack. Tables own horizontal overflow and a maximum 620px vertical region; document/forms scroll naturally. Dialogs fit the visual viewport and scroll internally. Signed-out users see a centered 1120px split illustration/form composition, stacked on phones; private navigation stays hidden until sign-in.

## Elevation & Depth

Flat surfaces and light borders provide hierarchy. Shadows are reserved for dialogs and toast feedback. No glass, blur or elevated static cards. The private workspace remains visually quiet.

## Shapes

10px panels, 7px controls, 18px dialogs, 6px status tags. Round avatars use initials as a recognition aid, with the student's name always next to them. Dividers align to table rows.

## Components

### Foundational visual states

All actions have hover, focus-visible, pressed and disabled states. Form errors use the danger role, associated error text, and invalid input borders. Selected navigation uses a pale neutral field with dark text. Cloud saves disable the submit button through the transaction without changing geometry. No simulated loaders or skeletons.

### Buttons and actions

Primary solid green: add, create and record. Outline: exports and secondary actions. Ghost: edit and archive. Solid danger is reserved for final void/restore confirmation. Controls target 44px height, compact table actions 36px. Text labels remain visible.

### Navigation and data display

Five navigation routes use the same header, tables, actions and notification owner. Ten records per page; counts and next/previous remain visible. Search, status filters and due/name sorting operate locally. The dashboard highlights five earliest open balances. Collection charts include an accessible description of every plotted value.

### Forms and overlays

Shared form/field helpers and one native HTML dialog own all mutations. Native selects and date/month fields intentionally accept platform popup geometry and locale. No custom calendar/listbox. One status toast is deduplicated. Persistent storage/import errors stay in the page or form. No browser alert/confirm/prompt.

### Iconography

Small Unicode utility marks supplement mandatory text labels. Decorative symbols are hidden from assistive technology. Icon-only close/pagination/search-clear buttons have accessible names.

### Motion

Only 150ms button feedback and a 1px pressed state. Reduced motion removes transitions. No continuous motion.

### Content and data visualization

Plain action verbs: Add student, Create monthly charges, Record payment, Void payment, Archive student. Cash received by payment date is explicitly separate from collections attributed to a service month. Chart values and progress come from ledger data; empty ledgers display zero with setup guidance.

## Do's and Don'ts

- Do keep amount, due date and status together.
- Do keep financial records when archiving a student.
- Don't imply cloud synchronization or payment processing.
- Don't shrink table values to fit a phone; preserve horizontal scrolling.

## Cloud extension · 2026-10-21

The green notebook identity is retained. The shared dialog/form/button system owns asynchronous cloud mutations: submission disables actions without changing geometry and uses aria-busy; errors retain form input. Financial data stays hidden until authentication and initial loading succeed. Vercel hosting replaces the original local-only runtime; this supersedes original statements implying no shared account.

## Imagegen redesign · 2026-10-29

User requested a new imagegen-led design and implementation. The updated tokens and layouts above supersede the original green-card styling. Refresh, Sign out and sync status now share the top bar. The sign-in screen uses locally generated decorative artwork, not a photograph of an actual service. All charts, tables and financial values remain live DOM derived from ledger records; the concept's invented figures and route columns were not imported into the product. Native date/month/select behavior remains OS-owned. Shared helpers in src/app.js and src/styles.css continue to own forms, dialogs, tables and feedback. The imagegen concept takes priority over the dealt Achromatic ledger sheet where they differ in brand color. Source tokens remain canonical; no theme adapter was added. See REDESIGN.md for prompts, evidence and rollback.
