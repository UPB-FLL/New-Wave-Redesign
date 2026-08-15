import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const COLORS = {
  deep: "#09131D",
  navy: "#101E2D",
  cyan: "#31C6CF",
  green: "#62BE68",
  tide: "#317B92",
  cloud: "#F7FAFB",
  mist: "#E8EFF1",
  slate: "#526271",
  white: "#FFFFFF",
};

const FONT = {
  display: "Plus Jakarta Sans",
  body: "Inter",
  technical: "IBM Plex Mono",
};

const LAYOUT_POSITIONS = {
  Title: { title: [84, 166, 600, 176], body: [84, 370, 540, 118], content: [84, 526, 430, 42] },
  Section: { title: [84, 200, 610, 150], body: [84, 376, 560, 104], content: [84, 528, 430, 40] },
  Content: { title: [84, 132, 570, 82], body: [84, 256, 570, 250], content: [714, 230, 396, 240] },
  Comparison: { title: [84, 118, 720, 72], body: [84, 258, 440, 222], content: [706, 258, 440, 222] },
  Process: { title: [84, 122, 760, 72], body: [84, 224, 1000, 60], content: [84, 340, 1028, 166] },
  Quote: { title: [152, 206, 948, 182], body: [152, 444, 860, 62], content: [152, 542, 520, 42] },
  Metric: { title: [84, 122, 760, 72], body: [84, 236, 470, 284], content: [656, 258, 416, 196] },
  Closing: { title: [84, 200, 606, 158], body: [84, 400, 540, 84], content: [84, 544, 540, 38] },
};

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required ${name}.`);
  return value;
}

async function writeBlob(filePath, blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await fs.writeFile(filePath, bytes);
}

async function readImageBytes(imagePath) {
  const bytes = await fs.readFile(imagePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function noLine() {
  return { style: "solid", fill: "none", width: 0 };
}

function addRect(slide, name, position, fill, line = noLine()) {
  return slide.shapes.add({ geometry: "rect", name, position, fill, line });
}

function addText(slide, name, text, position, style) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name,
    position,
    fill: "none",
    line: noLine(),
  });
  shape.text = text;
  shape.text.style = {
    wrap: "square",
    autoFit: "shrinkText",
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
    ...style,
  };
  return shape;
}

async function addImage(slide, name, bytes, alt, position, fit = "contain") {
  return slide.images.add({
    blob: bytes,
    contentType: "image/png",
    alt,
    fit,
    position,
    geometry: "rect",
    name,
  });
}

function createLayouts(presentation) {
  const layouts = new Map();
  for (const [name, geometry] of Object.entries(LAYOUT_POSITIONS)) {
    const layout = presentation.layouts.add(name);
    const [titleLeft, titleTop, titleWidth, titleHeight] = geometry.title;
    const [bodyLeft, bodyTop, bodyWidth, bodyHeight] = geometry.body;
    const [contentLeft, contentTop, contentWidth, contentHeight] = geometry.content;
    layout.placeholders.add({
      type: "title",
      index: 0,
      geometry: "textbox",
      position: { left: titleLeft, top: titleTop, width: titleWidth, height: titleHeight },
      text: "",
      fill: "none",
      line: noLine(),
    });
    layout.placeholders.add({
      type: "body",
      index: 1,
      geometry: "textbox",
      position: { left: bodyLeft, top: bodyTop, width: bodyWidth, height: bodyHeight },
      text: "",
      fill: "none",
      line: noLine(),
    });
    layout.placeholders.add({
      type: "content",
      index: 2,
      geometry: "textbox",
      position: { left: contentLeft, top: contentTop, width: contentWidth, height: contentHeight },
      text: "",
      fill: "none",
      line: noLine(),
    });
    layouts.set(name, layout);
  }
  return layouts;
}

async function addHeader(slide, logo, label, page, tone = "light") {
  const dark = tone === "dark";
  if (dark) {
    addRect(slide, `logo-backdrop-${page}`, { left: 84, top: 58, width: 208, height: 48 }, COLORS.cloud);
  }
  await addImage(
    slide,
    `canonical-logo-${page}`,
    logo,
    "New Wave IT logo",
    { left: 96, top: dark ? 67 : 62, width: 178, height: 34 },
  );
  addText(
    slide,
    `section-label-${page}`,
    label,
    { left: 854, top: 72, width: 258, height: 22 },
    { fontSize: 13, typeface: FONT.technical, color: dark ? COLORS.cyan : COLORS.tide, alignment: "right", bold: true },
  );
  addText(
    slide,
    `page-number-${page}`,
    `0${page}`,
    { left: 1132, top: 72, width: 44, height: 22 },
    { fontSize: 13, typeface: FONT.technical, color: dark ? COLORS.white : COLORS.slate, alignment: "right", bold: true },
  );
}

function addFooter(slide, page, tone = "light") {
  const dark = tone === "dark";
  addRect(slide, `footer-rule-${page}`, { left: 84, top: 652, width: 1112, height: 2 }, COLORS.cyan);
  addText(
    slide,
    `footer-copy-${page}`,
    "NEW WAVE IT  /  PRESENTATION TEMPLATE",
    { left: 84, top: 668, width: 480, height: 20 },
    { fontSize: 11, typeface: FONT.technical, color: dark ? COLORS.cloud : COLORS.slate, bold: true },
  );
  addText(
    slide,
    `footer-site-${page}`,
    "newwaveit.com",
    { left: 912, top: 668, width: 284, height: 20 },
    { fontSize: 11, typeface: FONT.technical, color: dark ? COLORS.cloud : COLORS.slate, alignment: "right" },
  );
}

function titleStyle(color = COLORS.navy, size = 48) {
  return { fontSize: size, typeface: FONT.display, bold: true, color, lineSpacing: 1.04 };
}

function bodyStyle(color = COLORS.slate, size = 22) {
  return { fontSize: size, typeface: FONT.body, color, lineSpacing: 1.24 };
}

function note(slide, text) {
  slide.speakerNotes.textFrame.setText(`Editable template guidance\n${text}\n\n[Sources]\n- Internal approved New Wave IT brand reference package.`);
}

function templateText(slide, layout, type, name, text, style) {
  const [left, top, width, height] = LAYOUT_POSITIONS[layout][type];
  return addText(slide, name, text, { left, top, width, height }, style);
}

async function buildDeck() {
  const output = requiredEnv("PRESENTATION_OUTPUT");
  const renders = requiredEnv("PRESENTATION_RENDER_DIR");
  const logoPath = requiredEnv("PRESENTATION_LOGO");
  const patternPath = requiredEnv("PRESENTATION_PATTERN");
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.mkdir(renders, { recursive: true });

  const logo = await readImageBytes(logoPath);
  const pattern = await readImageBytes(patternPath);
  const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });
  presentation.theme.colorScheme = {
    name: "New Wave IT",
    themeColors: {
      accent1: COLORS.cyan,
      accent2: COLORS.green,
      accent3: COLORS.tide,
      accent4: COLORS.slate,
      accent5: COLORS.mist,
      accent6: COLORS.cloud,
      bg1: COLORS.cloud,
      bg2: COLORS.mist,
      tx1: COLORS.navy,
      tx2: COLORS.slate,
      dk1: COLORS.deep,
      dk2: COLORS.navy,
      lt1: COLORS.white,
      lt2: COLORS.cloud,
      hlink: COLORS.tide,
      folHlink: COLORS.cyan,
    },
  };
  createLayouts(presentation);

  let slide = presentation.slides.add({ layout: "Title" });
  slide.background.fill = COLORS.deep;
  addRect(slide, "title-pattern-panel", { left: 760, top: 0, width: 520, height: 720 }, COLORS.navy);
  await addImage(slide, "title-current-field", pattern, "Current field pattern", { left: 650, top: 128, width: 630, height: 470 }, "cover");
  await addHeader(slide, logo, "PRESENTATION SYSTEM", 1, "dark");
  templateText(slide, "Title", "title", "title-copy-1", "Technology that keeps business moving.", titleStyle(COLORS.white, 55));
  templateText(slide, "Title", "body", "body-copy-1", "A practical 16:9 system for clear conversations, decisions, and follow-through.", bodyStyle(COLORS.cloud, 25));
  templateText(slide, "Title", "content", "content-copy-1", "FORT LAUDERDALE  /  SOUTH FLORIDA", { fontSize: 13, typeface: FONT.technical, color: COLORS.cyan, bold: true });
  addFooter(slide, 1, "dark");
  note(slide, "Replace the title, supporting line, and local context. Retain the current-field image as a quiet edge treatment, not a text background.");

  slide = presentation.slides.add({ layout: "Section" });
  slide.background.fill = COLORS.cloud;
  addRect(slide, "section-panel", { left: 782, top: 0, width: 498, height: 720 }, COLORS.navy);
  await addImage(slide, "section-current-field", pattern, "Current field pattern", { left: 730, top: 148, width: 550, height: 410 }, "cover");
  await addHeader(slide, logo, "SECTION", 2);
  templateText(slide, "Section", "title", "title-copy-2", "Start with the work that needs to keep moving.", titleStyle(COLORS.navy, 49));
  templateText(slide, "Section", "body", "body-copy-2", "Use a section slide to frame the decision, the audience, or the next part of the conversation.", bodyStyle(COLORS.slate, 23));
  templateText(slide, "Section", "content", "content-copy-2", "01  /  CONTEXT", { fontSize: 14, typeface: FONT.technical, color: COLORS.tide, bold: true });
  addFooter(slide, 2);
  note(slide, "Use this layout between major themes. Keep the section title to two lines or fewer and leave the pattern field free of text.");

  slide = presentation.slides.add({ layout: "Content" });
  slide.background.fill = COLORS.cloud;
  await addHeader(slide, logo, "CONTENT", 3);
  templateText(slide, "Content", "title", "title-copy-3", "Make the operational point, then make the next step obvious.", titleStyle(COLORS.navy, 41));
  templateText(slide, "Content", "body", "body-copy-3", "- Name the decision or service context.\n- Explain what changes for the team.\n- Give the audience one clear next move.", bodyStyle(COLORS.slate, 22));
  addRect(slide, "content-field-backdrop", { left: 714, top: 218, width: 430, height: 280 }, COLORS.deep);
  await addImage(slide, "content-current-field", pattern, "Current field pattern", { left: 714, top: 218, width: 430, height: 280 }, "cover");
  templateText(slide, "Content", "content", "content-copy-3", "KEEP THE SIGNAL CLEAR", { fontSize: 17, typeface: FONT.technical, color: COLORS.white, bold: true, alignment: "center", verticalAlignment: "middle" });
  addFooter(slide, 3);
  note(slide, "Use the body placeholder for up to three concise points. Replace the right-side pattern only with approved local brand imagery or a relevant, credited visual.");

  slide = presentation.slides.add({ layout: "Comparison" });
  slide.background.fill = COLORS.cloud;
  await addHeader(slide, logo, "COMPARISON", 4);
  templateText(slide, "Comparison", "title", "title-copy-4", "Compare the choices without losing the operating context.", titleStyle(COLORS.navy, 40));
  addRect(slide, "comparison-left-surface", { left: 84, top: 222, width: 504, height: 292 }, COLORS.mist);
  addRect(slide, "comparison-right-surface", { left: 676, top: 222, width: 504, height: 292 }, COLORS.deep);
  templateText(slide, "Comparison", "body", "body-copy-4", "CURRENT STATE\n\nDescribe the present constraint, risk, or source of friction in a few direct lines.", { fontSize: 22, typeface: FONT.body, color: COLORS.navy, lineSpacing: 1.25 });
  templateText(slide, "Comparison", "content", "content-copy-4", "INTENDED STATE\n\nDescribe the clearer operating condition and the decision needed to reach it.", { fontSize: 22, typeface: FONT.body, color: COLORS.white, lineSpacing: 1.25 });
  addRect(slide, "comparison-cyan-rule", { left: 632, top: 240, width: 4, height: 254 }, COLORS.cyan);
  addFooter(slide, 4);
  note(slide, "Use this for two grounded options or before-and-after operating states. Avoid a dense scorecard or fabricated performance comparisons.");

  slide = presentation.slides.add({ layout: "Process" });
  slide.background.fill = COLORS.cloud;
  await addHeader(slide, logo, "PROCESS", 5);
  templateText(slide, "Process", "title", "title-copy-5", "Show the sequence that keeps decisions moving.", titleStyle(COLORS.navy, 41));
  templateText(slide, "Process", "body", "body-copy-5", "Use a simple four-step flow when the audience needs to see ownership, order, and the moment a decision is required.", bodyStyle(COLORS.slate, 20));
  addRect(slide, "process-rule", { left: 156, top: 416, width: 900, height: 4 }, COLORS.mist);
  const processSteps = [
    ["01", "Clarify", "The operating need"],
    ["02", "Coordinate", "People and systems"],
    ["03", "Decide", "The next practical move"],
    ["04", "Follow through", "The shared record"],
  ];
  for (let index = 0; index < processSteps.length; index += 1) {
    const [number, heading, copy] = processSteps[index];
    const left = 116 + index * 262;
    addRect(slide, `process-node-${index}`, { left, top: 384, width: 64, height: 64 }, index === 2 ? COLORS.green : COLORS.cyan);
    addText(slide, `process-number-${index}`, number, { left, top: 404, width: 64, height: 22 }, { fontSize: 16, typeface: FONT.technical, color: COLORS.navy, bold: true, alignment: "center" });
    addText(slide, `process-heading-${index}`, heading, { left: left - 10, top: 476, width: 166, height: 28 }, { fontSize: 20, typeface: FONT.display, color: COLORS.navy, bold: true, alignment: "center" });
    addText(slide, `process-copy-${index}`, copy, { left: left - 18, top: 516, width: 182, height: 48 }, { fontSize: 16, typeface: FONT.body, color: COLORS.slate, alignment: "center" });
  }
  templateText(slide, "Process", "content", "content-copy-5", "", bodyStyle(COLORS.slate, 16));
  addFooter(slide, 5);
  note(slide, "Replace each step with concise verbs and a short outcome. Use green only to mark a clearly positive or healthy state, not a general accent.");

  slide = presentation.slides.add({ layout: "Quote" });
  slide.background.fill = COLORS.deep;
  await addHeader(slide, logo, "QUOTE", 6, "dark");
  addRect(slide, "quote-cyan-rule", { left: 84, top: 214, width: 6, height: 252 }, COLORS.cyan);
  templateText(slide, "Quote", "title", "title-copy-6", "Technology that keeps business moving.", titleStyle(COLORS.white, 50));
  templateText(slide, "Quote", "body", "body-copy-6", "Use the quote layout for an approved positioning line, a verified customer statement, or a properly attributed point of view.", bodyStyle(COLORS.cloud, 21));
  templateText(slide, "Quote", "content", "content-copy-6", "NEW WAVE IT  /  BRAND PRINCIPLE", { fontSize: 14, typeface: FONT.technical, color: COLORS.cyan, bold: true });
  addFooter(slide, 6, "dark");
  note(slide, "Keep quotation content verified and attributed. This sample uses the approved New Wave IT positioning line, not a customer claim.");

  slide = presentation.slides.add({ layout: "Metric" });
  slide.background.fill = COLORS.cloud;
  await addHeader(slide, logo, "METRIC", 7);
  templateText(slide, "Metric", "title", "title-copy-7", "Give one meaningful number the room can act on.", titleStyle(COLORS.navy, 40));
  addRect(slide, "metric-side-panel", { left: 626, top: 228, width: 486, height: 250 }, COLORS.navy);
  templateText(slide, "Metric", "body", "body-copy-7", "01\n\nONE CLEAR NEXT STEP", { fontSize: 51, typeface: FONT.display, color: COLORS.navy, bold: true, lineSpacing: 1.05 });
  templateText(slide, "Metric", "content", "content-copy-7", "Use a verified number, then state exactly why it matters and what decision it supports. Do not invent service levels, customer outcomes, or performance guarantees.", { fontSize: 21, typeface: FONT.body, color: COLORS.white, lineSpacing: 1.24, verticalAlignment: "middle" });
  addFooter(slide, 7);
  note(slide, "Replace 01 with a verified metric or a clearly labeled planning number. Keep its source in speaker notes when it is externally sourced.");

  slide = presentation.slides.add({ layout: "Closing" });
  slide.background.fill = COLORS.cloud;
  addRect(slide, "closing-panel", { left: 742, top: 0, width: 538, height: 720 }, COLORS.deep);
  await addImage(slide, "closing-current-field", pattern, "Current field pattern", { left: 670, top: 142, width: 610, height: 450 }, "cover");
  await addHeader(slide, logo, "CLOSING", 8);
  templateText(slide, "Closing", "title", "title-copy-8", "Keep the conversation connected to the work.", titleStyle(COLORS.navy, 48));
  templateText(slide, "Closing", "body", "body-copy-8", "New Wave IT helps organizations in Fort Lauderdale and South Florida keep technology practical, clear, and accountable.", bodyStyle(COLORS.slate, 22));
  templateText(slide, "Closing", "content", "content-copy-8", "newwaveit.com  /  support@newwaveitfl.com", { fontSize: 15, typeface: FONT.technical, color: COLORS.tide, bold: true });
  addFooter(slide, 8);
  note(slide, "Use the closing slide to restate the practical next move. Replace the audience-specific support line without changing the approved web address or support inbox.");

  slide = presentation.slides.add({ layout: "Content" });
  slide.background.fill = COLORS.cloud;
  await addHeader(slide, logo, "INTERNAL REFERENCE", 9);
  templateText(slide, "Content", "title", "title-copy-9", "Internal reference: keep the system consistent.", titleStyle(COLORS.navy, 34));
  templateText(slide, "Content", "body", "body-copy-9", "TYPE\nDisplay: Plus Jakarta Sans\nBody: Inter\nTechnical: IBM Plex Mono\n\nSPACING\n8 / 16 / 24 / 32 / 48", { fontSize: 18, typeface: FONT.body, color: COLORS.slate, lineSpacing: 1.18 });
  addRect(slide, "reference-navy", { left: 710, top: 244, width: 76, height: 62 }, COLORS.navy);
  addRect(slide, "reference-cyan", { left: 796, top: 244, width: 76, height: 62 }, COLORS.cyan);
  addRect(slide, "reference-green", { left: 882, top: 244, width: 76, height: 62 }, COLORS.green);
  addRect(slide, "reference-tide", { left: 968, top: 244, width: 76, height: 62 }, COLORS.tide);
  addText(slide, "reference-palette", "PALETTE\nNavy  Cyan  Green  Tide\n\nLOGO RULE\nUse the canonical mark. Do not redraw it, add effects, or place white body copy on cyan or green.\n\nLAYOUTS\nTitle  /  Section  /  Content  /  Comparison\nProcess  /  Quote  /  Metric  /  Closing", { left: 710, top: 330, width: 406, height: 250 }, { fontSize: 16, typeface: FONT.technical, color: COLORS.navy, lineSpacing: 1.18 });
  templateText(slide, "Content", "content", "content-copy-9", "", bodyStyle(COLORS.slate, 16));
  addFooter(slide, 9);
  note(slide, "This internal reference slide is hidden in slideshow mode. Use it to preserve color, typography, spacing, logo, and layout rules when duplicating slides.");

  for (let index = 0; index < presentation.slides.items.length; index += 1) {
    const current = presentation.slides.items[index];
    await writeBlob(path.join(renders, `slide-${index + 1}.png`), await presentation.export({ slide: current, format: "png", scale: 1 }));
  }
  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(output);
}

buildDeck()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
