# Carousel Six-Card Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Trusted Partner and What We Do carousel slides balanced six-card grids without changing carousel motion or the restored main Services bento.

**Latest visual override:** The final carousel surfaces follow the user-supplied restored Services card reference: pure-white slide backgrounds with translucent navy service-style cards, Mist Gray/light text, and alternating Signal Cyan/Continuity Green accents. This supersedes the earlier shared-dark-surface/white-card steps without changing layout or behavior.

**Architecture:** Keep both slide definitions inside the existing `TrustBar.tsx` component and expose only nonvisual test identifiers. Add one truthful trust proof item, then apply the same responsive column rhythm and equal-height row contract to both grids. No new component abstraction is needed for two small, differently styled grids.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion, React Router, Vitest, Testing Library

## Global Constraints

- Trusted Partner gains `24/7 Support` with supporting text `Always available`.
- Both slides use two columns on small screens and three columns from the medium breakpoint upward.
- Small screens render `2 x 3`; medium and larger screens render `3 x 2`.
- Existing carousel viewport heights, motion, timing, controls, pause behavior, and reduced-motion behavior remain unchanged.
- All What We Do routes and card content remain unchanged.
- The restored `Services.tsx` bento and its motion must not be modified.
- All three carousel slides use the existing Your Stack dark surface as their background.
- Every proof, tool, and service card uses a white background, Current Navy text, the same border token, and the same card radius.
- Your Stack keeps all eight tools and its `4 x 2` desktop grid.
- Trusted Partner and What We Do keep their six-card `3 x 2` medium-and-desktop grids.
- Existing cyan and Tide Blue accents remain limited to icons and small signal details.
- Do not create a commit, push, publish, or deploy.

---

### Task 1: Lock the six-card layout contract in a failing test

**Files:**
- Modify: `src/components/TrustBarLayout.test.tsx:23-42`
- Test: `src/components/TrustBarLayout.test.tsx`

**Interfaces:**
- Consumes: `TrustBar` carousel pagination labels and existing `data-testid="carousel-viewport"` / `data-testid="trust-service-card"` selectors.
- Produces: Regression expectations for `trusted-proof-grid`, `trusted-proof-card`, and `services-slide-grid` selectors.

- [ ] **Step 1: Expand the layout test before changing the component**

Replace the single slide-only assertion with coverage for both requested slides:

```tsx
it('uses balanced six-card grids without changing the carousel height', async () => {
  render(
    <MemoryRouter>
      <TrustBar />
    </MemoryRouter>,
  );

  const viewport = screen.getByTestId('carousel-viewport');
  expect(viewport).toHaveAttribute('data-stable-height', 'true');
  expect(viewport).toHaveClass('h-[660px]', 'sm:h-[620px]', 'lg:h-[500px]');

  const trustedGrid = screen.getByTestId('trusted-proof-grid');
  expect(trustedGrid).toHaveClass('grid-cols-2', 'md:grid-cols-3');
  expect(screen.getAllByTestId('trusted-proof-card')).toHaveLength(6);
  expect(screen.getByText('24/7 Support')).toBeInTheDocument();
  expect(screen.getByText('Always available')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Go to slide 3' }));

  const cards = await waitFor(() => screen.getAllByTestId('trust-service-card'));
  const servicesGrid = screen.getByTestId('services-slide-grid');
  expect(servicesGrid).toHaveClass('grid-cols-2', 'md:grid-cols-3');
  expect(cards).toHaveLength(6);
  cards.forEach((card) => expect(card).toHaveClass('h-full'));
});
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run:

```powershell
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\vitest\vitest.mjs run src\components\TrustBarLayout.test.tsx --maxWorkers=1 --minWorkers=1
```

Expected: FAIL because `trusted-proof-grid`, `trusted-proof-card`, and `services-slide-grid` do not exist and the Trusted Partner slide contains five cards.

---

### Task 2: Implement the balanced Trusted Partner and What We Do grids

**Files:**
- Modify: `src/components/TrustBar.tsx:47-53`
- Modify: `src/components/TrustBar.tsx:90-111`
- Modify: `src/components/TrustBar.tsx:161-189`
- Test: `src/components/TrustBarLayout.test.tsx`

**Interfaces:**
- Consumes: Existing `TrustItem`, `iconMap`, `CheckCircle`, service definitions, carousel slides, and semantic New Wave IT CSS tokens.
- Produces: A six-item `defaultTrustItems` array plus stable selectors `trusted-proof-grid`, `trusted-proof-card`, and `services-slide-grid`.

- [ ] **Step 1: Add the sixth truthful proof item**

Append this item to `defaultTrustItems`:

```tsx
{ icon: 'CheckCircle', label: '24/7 Support', sub: 'Always available' },
```

- [ ] **Step 2: Normalize the Trusted Partner grid**

Change its grid and card markup to:

```tsx
<div
  data-testid="trusted-proof-grid"
  className="mb-7 grid grid-cols-2 auto-rows-[104px] gap-3 md:grid-cols-3"
>
  {items.map((item, index) => {
    const Icon = iconMap[item.icon] || Shield;
    return (
      <div
        key={`${item.label}-${index}`}
        data-testid="trusted-proof-card"
        className="h-full rounded-md p-3 nw-panel-muted"
      >
        <div className="nw-icon-signal mb-3 h-8 w-8">
          <Icon size={16} />
        </div>
        <p className="truncate text-xs font-semibold text-brand-navy">{item.label}</p>
        <p className="mt-1 truncate text-[10px] text-[var(--nw-slate)]">{item.sub}</p>
      </div>
    );
  })}
</div>
```

Keep the existing icon and text children exactly as they are; only add selectors and normalize the column classes.

- [ ] **Step 3: Normalize the What We Do grid**

Update only the grid wrapper:

```tsx
<div
  data-testid="services-slide-grid"
  className="grid grid-cols-2 auto-rows-[124px] gap-3 sm:auto-rows-[132px] md:grid-cols-3 lg:auto-rows-[116px]"
>
```

Do not change the six service objects, links, card copy, or route slugs.

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```powershell
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\vitest\vitest.mjs run src\components\TrustBarLayout.test.tsx --maxWorkers=1 --minWorkers=1
```

Expected: PASS with one test and no failures.

---

### Task 3: Verify regressions and rendering constraints

**Files:**
- Verify: `src/components/TrustBar.tsx`
- Verify: `src/components/TrustBarLayout.test.tsx`
- Verify unchanged: `src/components/Services.tsx`
- Update after visual QA: `design-qa.md`

**Interfaces:**
- Consumes: The completed six-card layouts from Task 2 and the existing local preview at `http://127.0.0.1:4173/`.
- Produces: Fresh test, lint, build, source-diff, and browser evidence for handoff.

- [ ] **Step 1: Run the complete frontend test suite with one worker**

```powershell
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\vitest\vitest.mjs run --maxWorkers=1 --minWorkers=1
```

Expected: all frontend tests pass, including the main Services bento regression.

- [ ] **Step 2: Run targeted lint**

```powershell
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\eslint\bin\eslint.js src\components\TrustBar.tsx src\components\TrustBarLayout.test.tsx
```

Expected: exit code 0 with no lint errors.

- [ ] **Step 3: Build the production bundle**

```powershell
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\vite\bin\vite.js build
```

Expected: exit code 0 and a generated `dist` bundle. Existing bundle-size or Browserslist notices are warnings, not failures.

- [ ] **Step 4: Confirm the restored Services component is untouched**

```powershell
git diff -- src/components/Services.tsx
```

Expected: no new changes from this carousel task. Pre-existing Services changes may remain in the dirty worktree and must not be reverted.

- [ ] **Step 5: Check both slides in the selected browser**

At mobile and desktop widths, verify:

- Trusted Partner shows six cards as `2 x 3` on mobile and `3 x 2` from medium upward.
- What We Do shows six equal-height cards in the same column rhythm.
- Advancing among all three slides does not shift the page vertically.
- Hovering or focusing the carousel pauses auto-advance.
- All six service links remain usable.
- No text overlaps, clips unintentionally, or changes card height.

If the selected browser runtime remains unavailable, keep `design-qa.md` blocked and request permission before using standalone Playwright.

---

### Task 4: Lock the shared dark-surface and white-card contract in a failing test

**Files:**
- Modify: `src/components/TrustBarLayout.test.tsx`
- Test: `src/components/TrustBarLayout.test.tsx`

**Interfaces:**
- Consumes: Existing carousel pagination labels and card test selectors from Tasks 1 and 2.
- Produces: Stable selectors for `trusted-slide`, `tools-slide`, `services-slide`, `trust-tool-card`, and `partner-logo-tile`.

- [ ] **Step 1: Add a focused visual-contract test before changing the component**

Add this test beneath the six-card layout test:

```tsx
it('uses a dark slide surface and white cards throughout the carousel', async () => {
  render(
    <MemoryRouter>
      <TrustBar />
    </MemoryRouter>,
  );

  expect(screen.getByTestId('trusted-slide')).toHaveClass('nw-surface-dark');
  screen.getAllByTestId('trusted-proof-card').forEach((card) => {
    expect(card).toHaveClass('rounded-md', 'border', 'bg-[var(--nw-pure-white)]');
  });
  expect(screen.getAllByTestId('partner-logo-tile')).toHaveLength(6);

  fireEvent.click(screen.getByRole('button', { name: 'Go to slide 2' }));
  const toolCards = await waitFor(() => screen.getAllByTestId('trust-tool-card'));
  expect(screen.getByTestId('tools-slide')).toHaveClass('nw-surface-dark');
  expect(toolCards).toHaveLength(8);
  toolCards.forEach((card) => {
    expect(card).toHaveClass('rounded-md', 'border', 'bg-[var(--nw-pure-white)]');
  });

  fireEvent.click(screen.getByRole('button', { name: 'Go to slide 3' }));
  const serviceCards = await waitFor(() => screen.getAllByTestId('trust-service-card'));
  expect(screen.getByTestId('services-slide')).toHaveClass('nw-surface-dark');
  serviceCards.forEach((card) => {
    expect(card).toHaveClass('rounded-md', 'border', 'bg-[var(--nw-pure-white)]');
  });
});
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

```powershell
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\vitest\vitest.mjs run src\components\TrustBarLayout.test.tsx --maxWorkers=1 --minWorkers=1
```

Expected: FAIL because the new slide selectors and white-card classes do not exist.

---

### Task 5: Apply the shared dark surface and white card language

**Files:**
- Modify: `src/components/TrustBar.tsx`
- Test: `src/components/TrustBarLayout.test.tsx`

**Interfaces:**
- Consumes: Existing semantic New Wave IT tokens, slide grids, content arrays, routes, and selectors.
- Produces: `LIGHT_CARD_CLASS` plus consistently themed Trusted Partner, Your Stack, and What We Do slides.

- [ ] **Step 1: Define the shared white-card shell**

Add near the carousel constants:

```tsx
const LIGHT_CARD_CLASS = 'h-full min-w-0 rounded-md border border-[var(--nw-mist-gray)] bg-[var(--nw-pure-white)] text-brand-navy';
```

- [ ] **Step 2: Convert Trusted Partner to the shared dark surface**

- Add `data-testid="trusted-slide"` to the slide wrapper and replace `nw-surface` with `nw-surface-dark`.
- Set the kicker to `text-[var(--nw-signal-cyan)]` and the heading to `text-[var(--nw-cloud-white)]`.
- Compose each proof card class as ```${LIGHT_CARD_CLASS} p-3```.
- Wrap each partner logo in a `data-testid="partner-logo-tile"` element with `rounded-md bg-[var(--nw-pure-white)] px-3 py-2` so dark logo text remains readable on the dark slide.

- [ ] **Step 3: Convert Your Stack cards to the shared white shell**

- Add `data-testid="tools-slide"` to the existing dark wrapper.
- Add `data-testid="tools-slide-grid"` to the tools grid while preserving `grid-cols-2` and `lg:grid-cols-4`.
- Add `data-testid="trust-tool-card"` to each of the eight cards.
- Compose each tool card from `LIGHT_CARD_CLASS` plus its existing flex, gap, and padding classes.
- Remove the inline dark card background and Slate border.
- Use Cloud White for the icon tile, Current Navy for the tool name, and Slate for the role copy.
- Keep all eight tools and the existing `lg:grid-cols-4` grid.

- [ ] **Step 4: Convert What We Do to the shared dark surface**

- Add `data-testid="services-slide"` and replace `nw-surface` with `nw-surface-dark`.
- Set the kicker to Signal Cyan and the heading to Cloud White.
- Compose every service link from `LIGHT_CARD_CLASS` plus its existing layout, padding, focus, and hover classes.
- Remove `nw-panel-muted`; retain the Cloud White icon tile, Current Navy title, Slate description, and all routes.

- [ ] **Step 5: Run the focused tests and verify they pass**

```powershell
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\vitest\vitest.mjs run src\components\TrustBarLayout.test.tsx --maxWorkers=1 --minWorkers=1
```

Expected: PASS with two tests and no failures.

---

### Task 6: Re-run the carousel verification gate

**Files:**
- Verify: `src/components/TrustBar.tsx`
- Verify: `src/components/TrustBarLayout.test.tsx`
- Verify unchanged: `src/components/Services.tsx`
- Update after browser QA: `design-qa.md`

**Interfaces:**
- Consumes: The completed theme unification from Task 5 and the existing local preview.
- Produces: Fresh automated and visual evidence for the complete carousel treatment.

- [ ] **Step 1: Run all frontend tests with one worker**

```powershell
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\vitest\vitest.mjs run --maxWorkers=1 --minWorkers=1
```

Expected: all frontend tests pass, including both TrustBar layout tests and the main Services bento regression.

- [ ] **Step 2: Run targeted lint and the production build**

```powershell
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\eslint\bin\eslint.js src\components\TrustBar.tsx src\components\TrustBarLayout.test.tsx
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\vite\bin\vite.js build
```

Expected: both commands exit 0. Existing Browserslist and bundle-size notices remain non-blocking warnings.

- [ ] **Step 3: Check all three slides in the selected browser**

Verify mobile and desktop widths, all dark backgrounds, white cards, readable partner logos, equal card geometry, stable carousel height, hover/focus pause behavior, and all six service links. If the in-app browser remains unavailable, do not use standalone Playwright without explicit user authorization and keep visual QA blocked.
