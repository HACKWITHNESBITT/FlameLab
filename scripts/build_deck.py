"""Build the FlameLab hackathon pitch deck (7 slides, 16:9 PPTX).

Usage: .venv/bin/python scripts/build_deck.py [output.pptx]
Shots: docs/deck/*.png (regenerate app shots with the frontend e2e suite;
live SI shots need MODEL_API_KEY on a dev server).

Brand: void #05070C, panel #0A0E16, edge #212B40, ink #DFE4EE,
muted #9AA4B5, signal #2BFFA3, warn #F5B32B, Lato type.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "docs" / "deck"
OUT = ROOT / "FlameLab-pitch-deck.pptx"

SW, SH = Inches(13.333), Inches(7.5)
MARGIN = Inches(0.6)
CONTENT_W = SW - 2 * MARGIN

VOID = RGBColor(0x05, 0x07, 0x0C)
PANEL = RGBColor(0x0A, 0x0E, 0x16)
EDGE = RGBColor(0x21, 0x2B, 0x40)
INK = RGBColor(0xDF, 0xE4, 0xEE)
MUTED = RGBColor(0x9A, 0xA4, 0xB5)
SIGNAL = RGBColor(0x2B, 0xFF, 0xA3)
WARN = RGBColor(0xF5, 0xB3, 0x2B)
LINK = RGBColor(0x7C, 0xC4, 0xFF)

SANS = "Lato"


def spaced(run, val: int = 80) -> None:
    """Letter-spacing for kickers (spc is 1/100 pt)."""
    run._r.get_or_add_rPr().set("spc", str(val))


def base_slide(prs: Presentation, num: int):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = VOID
    footer(slide, num)
    return slide


def footer(slide, num: int) -> None:
    box = slide.shapes.add_textbox(MARGIN, SH - Inches(0.45), CONTENT_W, Inches(0.3))
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT
    r = p.add_run()
    r.text = f"FLAMELAB  ·  SI-POWERED FIRE-SAFETY INSIGHTS{' ' * 8}{num:02d} / 07"
    r.font.size = Pt(9)
    r.font.name = SANS
    r.font.color.rgb = MUTED


def heading(slide, kicker: str, title: str, top: float = 0.45) -> float:
    """Kicker + title block. Returns the y below it."""
    box = slide.shapes.add_textbox(MARGIN, Inches(top), CONTENT_W, Inches(1.4))
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.space_after = Pt(2)
    r = p.add_run()
    r.text = kicker.upper()
    r.font.size = Pt(12)
    r.font.bold = True
    r.font.name = SANS
    r.font.color.rgb = MUTED
    spaced(r)
    p = tf.add_paragraph()
    r = p.add_run()
    r.text = title
    r.font.size = Pt(32)
    r.font.bold = True
    r.font.name = SANS
    r.font.color.rgb = INK
    return top + 1.35


def body_text(slide, text: str, left: float, top: float, width: float,
              size: int = 16, color=INK, bold: bool = False, height: float = 1.0):
    box = slide.shapes.add_textbox(Inches(left), Inches(top), Inches(width), Inches(height))
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    r = p.add_run()
    r.text = text
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.name = SANS
    r.font.color.rgb = color
    return box


def bullets(slide, items: list, left: float, top: float, width: float,
            size: int = 15, gap: int = 8, height: float = 3.0):
    """Items are (text, color) or plain text (ink)."""
    box = slide.shapes.add_textbox(Inches(left), Inches(top), Inches(width), Inches(height))
    tf = box.text_frame
    tf.word_wrap = True
    first = True
    for item in items:
        text, color = item if isinstance(item, tuple) else (item, INK)
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.space_after = Pt(gap)
        p.level = 0
        r = p.add_run()
        r.text = text
        r.font.size = Pt(size)
        r.font.name = SANS
        r.font.color.rgb = color
    return box


def panel(slide, left: float, top: float, width: float, height: float):
    shp = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(left), Inches(top),
                                 Inches(width), Inches(height))
    shp.fill.solid()
    shp.fill.fore_color.rgb = PANEL
    shp.line.color.rgb = EDGE
    shp.line.width = Pt(1)
    shp.shadow.inherit = False
    ticks(slide, Inches(left), Inches(top), Inches(width), Inches(height))
    return shp


def ticks(slide, left, top, width, height, size=Inches(0.14), th=Pt(2.25)) -> None:
    boxes = [
        (left, top, size, th), (left, top, th, size),
        (left + width - size, top, size, th), (left + width - th, top, th, size),
        (left, top + height - th, size, th), (left, top + height - size, th, size),
        (left + width - size, top + height - th, size, th),
        (left + width - th, top + height - size, th, size),
    ]
    for x, y, w, h in boxes:
        s = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
        s.fill.solid()
        s.fill.fore_color.rgb = SIGNAL
        s.line.fill.background()
        s.shadow.inherit = False


def shot(slide, name: str, left: float, top: float, width: float):
    """Framed screenshot (native aspect) with corner ticks. Returns bottom y."""
    with Image.open(SHOTS / name) as im:
        iw, ih = im.size
    height = width * ih / iw
    pic = slide.shapes.add_picture(str(SHOTS / name), Inches(left), Inches(top),
                                   width=Inches(width), height=Inches(height))
    pic.line.color.rgb = EDGE
    pic.line.width = Pt(1)
    ticks(slide, Inches(left), Inches(top), Inches(width), Inches(height))
    return top + height


def caption(slide, text: str, left: float, top: float, width: float) -> None:
    body_text(slide, text, left, top, width, size=11, color=MUTED, height=0.6)


def s01_title(prs: Presentation) -> None:
    slide = base_slide(prs, 1)
    panel(slide, 0.6, 1.0, 12.133, 4.9)
    box = slide.shapes.add_textbox(Inches(1.1), Inches(1.5), Inches(11.1), Inches(3.9))
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = "SI-POWERED FIRE-SAFETY DASHBOARD"
    r.font.size = Pt(13)
    r.font.bold = True
    r.font.name = SANS
    r.font.color.rgb = MUTED
    spaced(r, 120)
    p = tf.add_paragraph()
    p.alignment = PP_ALIGN.CENTER
    p.space_before = Pt(10)
    r = p.add_run()
    r.text = "FLAMELAB"
    r.font.size = Pt(72)
    r.font.bold = True
    r.font.name = SANS
    r.font.color.rgb = SIGNAL
    p = tf.add_paragraph()
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = "Which fire research matters for your atmosphere?"
    r.font.size = Pt(22)
    r.font.name = SANS
    r.font.color.rgb = INK
    p = tf.add_paragraph()
    p.alignment = PP_ALIGN.CENTER
    p.space_before = Pt(10)
    r = p.add_run()
    r.text = ("Rank, summarize, and interpret NASA's microgravity combustion research — "
              "with every claim traced to its record.")
    r.font.size = Pt(14)
    r.font.name = SANS
    r.font.color.rgb = MUTED
    body_text(slide, "Live demo inside  ·  all screenshots from the working app",
              0.6, 6.25, 12.133, size=12, color=MUTED)


def s02_problem(prs: Presentation) -> None:
    slide = base_slide(prs, 2)
    y = heading(slide, "The problem", "Decades of fire data. Nowhere to ask.")
    bullets(slide, [
        "NASA has studied flames in microgravity for decades — BASS, Saffire, FLEX, SAME, DAFT and more.",
        "Moon and Mars missions fly different atmospheres. Engineers must know which old results still apply.",
        "Today that means hunting across investigations, hand-comparing test conditions, trusting memory.",
        ("Volume makes results hard to find, compare, and understand — exactly when they matter most.", WARN),
    ], 0.6, y + 0.2, 11.5, size=17, gap=12, height=4.5)


def feature_card(slide, left: float, title: str, body: str) -> None:
    panel(slide, left, 2.35, 3.85, 3.9)
    body_text(slide, title, left + 0.3, 2.65, 3.25, size=19, color=SIGNAL, bold=True, height=0.6)
    body_text(slide, body, left + 0.3, 3.3, 3.25, size=14, height=2.6)


def s03_solution(prs: Presentation) -> None:
    slide = base_slide(prs, 3)
    heading(slide, "The solution", "FlameLab: ask the archive, get cited answers.")
    feature_card(slide, 0.6, "RANK",
                 "Deterministic 7-factor scoring per target atmosphere, with prevention, "
                 "detection, and suppression lenses. Every score carries its breakdown.")
    feature_card(slide, 4.74, "SUMMARIZE",
                 "Verified SI summaries of each investigation. Every sentence cited to a "
                 "record field — unverified text is dropped, never shown.")
    feature_card(slide, 8.88, "INTERPRET",
                 "Ask questions, compare runs, map test conditions, export modeling data. "
                 "Gaps are stated outright, never filled in.")
    body_text(slide, "Principle: missing data is shown as missing. Unverified text is never displayed.",
              0.6, 6.45, 12.133, size=12, color=MUTED)


def s04_demo(prs: Presentation) -> None:
    slide = base_slide(prs, 4)
    y = heading(slide, "Demo", "Ranked shortlists. Cited evidence.")
    b1 = shot(slide, "rank.png", 0.6, y + 0.15, 5.95)
    caption(slide, "Moon-base ranking: breakdowns, flags, visible assumptions.",
            0.6, b1 + 0.08, 5.95)
    b2 = shot(slide, "live-detail.png", 6.78, y + 0.15, 5.95)
    caption(slide, "Live SI summary: cited findings, verified badge.",
            6.78, b2 + 0.08, 5.95)
    body_text(slide, "Every score explained · every claim traced to its record.",
              0.6, 6.15, 12.133, size=12, color=MUTED)


def step_box(slide, left: float, title: str, body: str) -> None:
    panel(slide, left, 2.0, 2.7, 1.4)
    body_text(slide, title, left + 0.2, 2.12, 2.3, size=13, color=SIGNAL, bold=True, height=0.4)
    body_text(slide, body, left + 0.2, 2.55, 2.3, size=11, color=MUTED, height=0.75)


def s05_trust(prs: Presentation) -> None:
    slide = base_slide(prs, 5)
    heading(slide, "Trust", "SI you can verify — or it stays silent.")
    steps = [
        ("1 · RETRIEVE", "Keyword + structured retrieval with a coverage gate."),
        ("2 · GENERATE", "Structured JSON: findings, interpretation, gaps."),
        ("3 · VERIFY", "Record exists? Field resolves? Numbers match?"),
        ("4 · FAIL CLOSED", "Failures dropped and audit-logged. Never shown."),
    ]
    for i, (title, body) in enumerate(steps):
        step_box(slide, 0.6 + i * 3.05, title, body)
        if i < 3:
            body_text(slide, "→", 3.32 + i * 3.05, 2.35, 0.35, size=22, color=MUTED, height=0.5)
    bullets(slide, [
        "21-case evaluation set: coverage, gap, trap, scope, procedure, comparison.",
        "Bar: zero unsupported claims before every release.",
        "Every answer audit-logged with sources and verdict.",
        ("Ask about Mars gravity and it tells you what it doesn't know.", WARN),
        "Safety unknowns stay visible — crew procedures deferred to mission authorities.",
    ], 0.6, 3.7, 6.3, size=13, gap=6, height=3.0)
    bottom = shot(slide, "live-ask.png", 7.35, 3.7, 5.2)
    caption(slide, "Honest refusal: the data gap is named, nothing is invented.",
            7.35, bottom + 0.08, 5.2)


def s06_visuals(prs: Presentation) -> None:
    slide = base_slide(prs, 6)
    y = heading(slide, "Demo", "See the conditions, compare the evidence.")
    b1 = shot(slide, "conditions.png", 0.6, y + 0.15, 5.95)
    caption(slide, "Oxygen–airflow map with target zones; missing ranges listed as gaps.",
            0.6, b1 + 0.08, 5.95)
    b2 = shot(slide, "radar.png", 6.78, y + 0.15, 5.95)
    caption(slide, "Factor radar overlays three investigations; unevaluated factors gap.",
            6.78, b2 + 0.08, 5.95)


def chip(slide, left: float, top: float, number: str, label: str) -> None:
    panel(slide, left, top, 2.9, 1.1)
    num = slide.shapes.add_textbox(Inches(left), Inches(top + 0.08), Inches(2.9), Inches(0.55))
    num.text_frame.word_wrap = True
    p = num.text_frame.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = number
    r.font.size = Pt(26)
    r.font.bold = True
    r.font.name = SANS
    r.font.color.rgb = SIGNAL
    box = slide.shapes.add_textbox(Inches(left), Inches(top + 0.58), Inches(2.9), Inches(0.45))
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = label
    r.font.size = Pt(11)
    r.font.name = SANS
    r.font.color.rgb = MUTED


TEAM = [
    ("Clinton Otieno", "xtremeart.netlify.app"),
    ("Odinga Valery", "portfolio-odinga-valery.vercel.app"),
    ("Flovian Owiti", "floviano-witi.netlify.app"),
    ("Victor Kimutai", "victor-kimutai.onrender.com"),
    ("Ian Ochieng", "iochieng1.github.io/My-blog/"),
    ("Francis Messo", "messo.me"),
]


def member_row(slide, left: float, top: float, name: str, url: str) -> None:
    box = slide.shapes.add_textbox(Inches(left), Inches(top), Inches(5.6), Inches(0.7))
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    r = p.add_run()
    r.text = name
    r.font.size = Pt(15)
    r.font.bold = True
    r.font.name = SANS
    r.font.color.rgb = INK
    p = tf.add_paragraph()
    r = p.add_run()
    r.text = url
    r.font.size = Pt(12)
    r.font.name = SANS
    r.font.color.rgb = LINK
    r.font.underline = True
    r.hyperlink.address = "https://" + url


def s07_team(prs: Presentation) -> None:
    slide = base_slide(prs, 7)
    heading(slide, "Team & next", "Team FlameLab — thank you.")
    for i, (name, url) in enumerate(TEAM):
        member_row(slide, 0.6 + (i // 3) * 6.3, 2.0 + (i % 3) * 0.75, name, url)
    stats = [("11", "curated investigations"), ("7", "atmospheres"),
             ("7", "scoring factors"), ("21", "eval cases")]
    for i, (number, label) in enumerate(stats):
        chip(slide, 0.6 + i * 3.05, 4.4, number, label)
    box = slide.shapes.add_textbox(MARGIN, Inches(5.65), CONTENT_W, Inches(0.4))
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = "Next: ACME · CFI · SPICE · SLICE records, expert weight review, demo deployment."
    r.font.size = Pt(12)
    r.font.name = SANS
    r.font.color.rgb = MUTED
    box = slide.shapes.add_textbox(MARGIN, Inches(6.05), CONTENT_W, Inches(0.6))
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = "Live demo next."
    r.font.size = Pt(20)
    r.font.bold = True
    r.font.name = SANS
    r.font.color.rgb = SIGNAL


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT
    for name in ("rank.png", "live-detail.png", "live-ask.png", "conditions.png",
                 "radar.png"):
        if not (SHOTS / name).exists():
            raise SystemExit(f"missing shot: {SHOTS / name}")
    prs = Presentation()
    prs.slide_width = SW
    prs.slide_height = SH
    for i, build in enumerate(
        [s01_title, s02_problem, s03_solution, s04_demo, s05_trust,
         s06_visuals, s07_team], start=1):
        build(prs)
        if len(prs.slides) != i:
            raise AssertionError(f"slide {i} did not append exactly once")
    prs.save(out)
    print(f"wrote {out} ({out.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
