#!/usr/bin/env python3
"""Build the GroundSwell identity guide from the supplied source assets.

Requires reportlab, Pillow, and fontTools (for bundled variable fonts).
The logo/illustration files remain authoritative; this script never traces them.
"""
from __future__ import annotations

import argparse
import io
import math
from pathlib import Path
import re
import tempfile

from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.utils import ImageReader

BASE = Path(__file__).resolve().parent
WORK = BASE
PACKAGE = next((p for p in [BASE,*BASE.parents] if (p/'01_Logos').is_dir() and (p/'04_Fonts').is_dir()),BASE.parent/'GroundSwell_Brand_Package')
W, H = 900, 600
M = 48
C = {
    "ink": "#09131D", "navy": "#101E2D", "cyan": "#31C6CF",
    "tide": "#317B92", "amber": "#F2A33A", "cloud": "#F7FAFB",
    "slate": "#526271", "mist": "#E8EFF1", "tint": "#E7F5F5",
}


def register_fonts(package):
    static=WORK/'font-build'
    font_root=WORK/'fonts'
    if not static.is_dir():
        from fontTools.ttLib import TTFont as FontToolsFont
        from fontTools.varLib.instancer import instantiateVariableFont
        static=Path(tempfile.mkdtemp(prefix='groundswell-guide-fonts-'))
        font_root=package/'04_Fonts'
        for family,stem,weights in [('plus-jakarta-sans','PlusJakartaSans',[600,700,800]),('inter','Inter',[400,500,600])]:
            for weight in weights:
                f=FontToolsFont(font_root/family/f'{stem}-Variable.ttf')
                axes={a.axisTag: (weight if a.axisTag=='wght' else a.defaultValue) for a in f['fvar'].axes}
                f=instantiateVariableFont(f,axes,inplace=True)
                f.save(static/f'{stem}-{weight}.ttf')
    choices = {
        "PJS600": static / "PlusJakartaSans-600.ttf",
        "PJS700": static / "PlusJakartaSans-700.ttf",
        "PJS800": static / "PlusJakartaSans-800.ttf",
        "Inter": static / "Inter-400.ttf",
        "Inter500": static / "Inter-500.ttf",
        "Inter600": static / "Inter-600.ttf",
        "Mono": font_root / "ibm-plex-mono/IBMPlexMono-Regular.ttf",
        "Mono500": font_root / "ibm-plex-mono/IBMPlexMono-Medium.ttf",
    }
    for name, path in choices.items():
        if not path.exists():
            raise FileNotFoundError(path)
        pdfmetrics.registerFont(TTFont(name, str(path)))


def color(value):
    return HexColor(C.get(value, value))


def rgba(hex_value, alpha=1):
    h = C.get(hex_value, hex_value).lstrip("#")
    return Color(*(int(h[i:i+2], 16) / 255 for i in (0, 2, 4)), alpha=alpha)


def rgb(hex_value):
    h = C.get(hex_value, hex_value).lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def contrast(a, b):
    def lum(v):
        v = [x / 255 for x in rgb(v)]
        v = [x / 12.92 if x <= .04045 else ((x+.055)/1.055)**2.4 for x in v]
        return sum(x * w for x, w in zip(v, [.2126, .7152, .0722]))
    l1, l2 = sorted([lum(a), lum(b)])
    return (l2+.05)/(l1+.05)


class Guide:
    def __init__(self, out, package=PACKAGE):
        self.package = package
        out.parent.mkdir(parents=True, exist_ok=True)
        self.c = canvas.Canvas(str(out), pagesize=(W,H), pageCompression=1)
        self.c.setTitle("GroundSwell - Brand Guide")
        self.c.setAuthor("GroundSwell / New Wave")
        self.c.setSubject("GroundSwell GS identity system, version 2, October 2026")
        self.page = 0
        self.cache = {}
        self.images_used = []

    def rect(self, x,y,w,h,fill,stroke=None,width=1):
        self.c.setFillColor(color(fill))
        self.c.setStrokeColor(color(stroke or fill))
        self.c.setLineWidth(width)
        self.c.rect(x,H-y-h,w,h,fill=1,stroke=int(stroke is not None))

    def line(self,x1,y1,x2,y2,stroke="mist",width=1,dash=None):
        self.c.saveState();self.c.setStrokeColor(color(stroke));self.c.setLineWidth(width)
        if dash:self.c.setDash(dash)
        self.c.line(x1,H-y1,x2,H-y2);self.c.restoreState()

    def text(self,s,x,y,size=14,font="Inter",fill="ink",align="left"):
        self.c.setFillColor(color(fill));self.c.setFont(font,size)
        # y is top of the em box, consistent across the guide.
        baseline = H-y-size*.8
        if align=="right":self.c.drawRightString(x,baseline,s)
        elif align=="center":self.c.drawCentredString(x,baseline,s)
        else:self.c.drawString(x,baseline,s)

    def lines(self,lines,x,y,size=42,font="PJS700",fill="ink",leading=None):
        leading=leading or size*1.12
        for i,s in enumerate(lines):self.text(s,x,y+i*leading,size,font,fill)
        return y+len(lines)*leading

    def para(self,s,x,y,width,size=13.2,font="Inter",fill="slate",leading=None):
        leading = leading or size*1.48
        rows=[]
        for part in s.split("\n"):
            words=part.split();current=""
            for word in words:
                test=(current+" "+word).strip()
                if pdfmetrics.stringWidth(test,font,size)>width and current:
                    rows.append(current);current=word
                else:current=test
            rows.append(current)
        for i,line in enumerate(rows):self.text(line,x,y+i*leading,size,font,fill)
        return y+len(rows)*leading

    def label(self,s,x,y,fill="slate",size=9.5):
        self.text(s.upper(),x,y,size,"Mono500",fill)

    def start(self,section,bg="cloud",dark=False):
        if self.page:self.c.showPage()
        self.page+=1
        self.rect(0,0,W,H,bg)
        fg="cloud" if dark else "slate"
        self.label("GroundSwell / Identity System",M,24,fg,8.4)
        self.label(section,W-M,24,fg,8.4) if False else None
        self.text(section.upper(),W-M,24,8.4,"Mono",fg,"right")
        self.line(M,H-35,W-M,H-35,"tide" if dark else "mist",.6)
        self.text("GroundSwell  /  October 2026",M,H-24,8.4,"Mono",fg)
        self.text(f"{self.page:02d} / 14",W-M,H-24,8.4,"Mono",fg,"right")

    def title(self,small,large,fill="ink"):
        self.label(small,M,66,"tide" if fill=="ink" else "cyan")
        return self.lines(large.split("\n"),M,92,38,"PJS700",fill,44)

    def find(self,pattern,required=True):
        hits=sorted(self.package.glob(pattern))
        if not hits and required:raise FileNotFoundError(f"No package asset matching {pattern}")
        return hits[0] if hits else None

    def img(self,path,x,y,w,h,trim=True,alpha=1):
        path=Path(path)
        key=(str(path),trim)
        if key not in self.cache:
            im=Image.open(path).convert("RGBA")
            if trim:
                box=im.getchannel("A").getbbox()
                if box:im=im.crop(box)
            self.cache[key]=im
        im=self.cache[key]
        scale=min(w/im.width,h/im.height)
        iw,ih=im.width*scale,im.height*scale
        self.c.saveState()
        if alpha!=1:self.c.setFillAlpha(alpha);self.c.setStrokeAlpha(alpha)
        self.c.drawImage(ImageReader(im),x+(w-iw)/2,H-y-(h-ih)/2-ih,iw,ih,mask="auto")
        self.c.restoreState()
        self.images_used.append(str(path))
        return x+(w-iw)/2,y+(h-ih)/2,iw,ih

    def logo(self,kind,x,y,w,h,alpha=1):
        return self.img(self.package/f"01_Logos/PNG/GroundSwell_{kind}.png",x,y,w,h,True,alpha)

    def mark_field(self,x,y,size=420,dark=True):
        name='GroundSwell_Contours_Dark_Transparent.png' if dark else 'GroundSwell_Contours_Light_Transparent.png'
        self.img(self.package/'02_Graphics'/name,x,y,size*16/9,size,False,.48)

    def finish(self):
        self.c.save()


def build(out,package):
    register_fonts(package);g=Guide(out,package)

    # 01 - Cover
    g.start("Brand guide / Version 2","ink",True)
    g.mark_field(570,286,165)
    g.label("A New Wave identity",M,105,"cyan",10)
    g.logo("Primary_Reverse",M,158,755,112)
    g.lines(["Built to", "move people."],M,320,59,"PJS700","cloud",64)
    g.label("Brand. Social. Digital.",570,458,"amber",11)
    g.para("Momentum made visible.",570,484,250,15,"Inter","cloud")

    # 02 - Idea and architecture
    g.start("01 / The idea")
    g.title("The organizing idea","Momentum\nmade visible.")
    g.para("A groundswell begins below the surface and builds into something people can feel. The identity turns that build into a visual language: connected currents, generous space, and a clear upward lift.",M,224,350,15)
    g.label("Positioning",M,369,"tide")
    g.para("GroundSwell brings brand, content, websites, and growth marketing into one connected system for small businesses.",M,392,350,15,"Inter500","ink")
    g.rect(470,95,382,385,"tint")
    g.label("Brand architecture",498,121,"tide")
    g.text("New Wave IT",498,164,25,"PJS700")
    g.text("Parent brand",498,200,12,"Inter","slate")
    g.line(513,230,513,268,"tide",1.4)
    g.logo("Primary_Color",498,289,320,48)
    g.text("Brand. Social. Digital.",498,360,17,"PJS600","tide")
    g.para("The proposed new name for New Wave's existing Social Engineering growth division.",498,400,300,12.8)
    g.para("Use the endorsed lockup in first introductions, proposals, and partnership materials. Use the primary logo wherever GroundSwell is already understood.",M,502,788,11.5)

    # 03 - Family
    g.start("02 / The logo family")
    g.title("One identity, several fits","A consistent first impression.")
    g.rect(M,165,505,170,"tint")
    g.logo("Primary_Color",77,208,447,68)
    g.label("Primary / light backgrounds",67,309,"slate",8.4)
    g.rect(570,165,282,170,"ink")
    g.logo("Stacked_Reverse",598,186,226,117)
    g.label("Stacked / compact spaces",589,309,"cloud",8.4)
    g.rect(M,353,505,157,"ink")
    g.logo("Endorsed_Reverse",80,387,440,77)
    g.label("Endorsed / parent connection",67,484,"cloud",8.4)
    g.rect(570,353,282,157,"tint")
    g.logo("Mark_Color",611,370,200,95)
    g.label("GS / avatars and compact use",589,484,"slate",8.4)
    g.para("Choose the exported artwork for each background. Preserve its spacing and proportions.",M,528,798,11.2)

    # 04 - Anatomy and lineage
    g.start("03 / Symbol and wordmark","ink",True)
    g.title("A connection you can see","Our initials.\nOur current.","cloud")
    g.logo("Mark_Reverse",75,237,220,150)
    g.img(package/'02_Graphics/GroundSwell_Heritage_Wave_Color.png',75,424,59,62)
    g.label("Heritage wave",152,430,"cyan",9)
    g.para("Original New Wave\ndivision mark.",152,451,172,11.4,"Inter","cloud",16)
    g.line(355,231,355,488,"tide",1)
    g.label("The GS monogram",390,235,"cyan")
    g.para("Bold G and S initials are joined by the exact upper crest from New Wave: Social Engineering. A transparent cut keeps the cyan current distinct as it passes through both letters.",390,259,410,15,"Inter","cloud")
    g.label("The wordmark",390,377,"amber")
    g.para("GroundSwell is custom-set in Plus Jakarta Sans with fixed spacing and capitalization. The capital G and S make the name easy to scan. The exported vector artwork is the master.",390,401,410,15,"Inter","cloud")
    g.logo("Wordmark_Reverse",M,504,247,30)
    g.text("Capital G. Capital S. One word.",390,516,12,"Mono","cyan")

    # 05 - Clearspace and optical size
    g.start("04 / Space and scale")
    g.title("Give the identity room","Keep the current clear.")
    # Outline geometric diagram around the actual visible artwork.
    g.rect(M,174,504,258,"tint")
    x,y,w,h=g.logo("Primary_Color",103,262,394,66)
    # Measure the visible monogram before the first gap to the wordmark.
    # GS is slightly shorter than the wordmark, so the full logo height would
    # overstate the stated half-symbol-height unit.
    alpha=Image.open(package/'01_Logos/PNG/GroundSwell_Primary_Color.png').convert('RGBA').getchannel('A')
    full_box=alpha.getbbox()
    split=next((i for i in range(full_box[0],full_box[2]) if alpha.crop((i,0,i+1,alpha.height)).getbbox() is None),full_box[2])
    symbol_box=alpha.crop((0,0,split,alpha.height)).getbbox()
    symbol_ratio=(symbol_box[3]-symbol_box[1])/(full_box[3]-full_box[1])
    xspace=h*symbol_ratio*.5
    g.c.saveState();g.c.setStrokeColor(color("tide"));g.c.setLineWidth(.8);g.c.setDash(3,3)
    g.c.rect(x-xspace,H-(y-xspace)-(h+2*xspace),w+2*xspace,h+2*xspace,fill=0,stroke=1);g.c.restoreState()
    g.line(x,y-12,x,y-35,"tide",.6);g.line(x-xspace,y-12,x-xspace,y-35,"tide",.6)
    g.text("x",x-xspace/2,y-46,13,"Mono500","tide","center")
    g.para("Minimum clear space: x = half the visible GS symbol height. Keep this space around every complete logo.",72,376,457,12.5)
    g.label("Digital minimums",590,182,"tide")
    rows=[("Primary logo","220 px wide"),("Endorsed logo","300 px wide"),("Standard GS monogram","32 px wide minimum"),("Compact GS monogram","24-32 px wide"),("Micro GS / solid","16 px wide")]
    for i,(a,b) in enumerate(rows):
        yy=218+i*46
        g.text(a,590,yy,13,"Inter500")
        g.text(b,590,yy+21,12,"Mono","tide")
        if i<4:g.line(590,yy+40,852,yy+40,"mist",.7)
    g.label("Print",M,462,"tide")
    g.para("Start at 38 mm wide for the primary logo and 58 mm for the endorsed lockup. Check a proof at final size; stock, ink, and production method change fine-detail reproduction.",M,487,489,12.8)
    g.para("At tiny sizes, use the supplied micro GS. Use the standalone monogram for avatars and favicons; keep the full wordmark for larger placements.",590,465,262,12.8)

    # 06 - Motif
    g.start("05 / The swelling effect","ink",True)
    g.label("The motion language",M,67,"cyan")
    g.lines(["Build the swell."],M,97,48,"PJS700","cloud")
    g.mark_field(422,150,330)
    g.logo("Mark_Reverse",555,249,120,120)
    g.para("The inherited New Wave upper wave scales into a rising contour field. The same current cuts through GS, linking the monogram, motion, and backgrounds without redrawing the source curve.",M,203,322,15,"Inter","cloud")
    instructions=[("01","Scale uniformly.","Keep both axes equal. The source curve stays intact."),("02","Let space build.","Use controlled echoes and one clear focal point."),("03","Keep text quiet.","Place copy in a clear area, away from busy crossings.")]
    for i,(n,a,b) in enumerate(instructions):
        yy=325+i*64
        g.text(n,M,yy,10,"Mono500","amber")
        g.text(a,83,yy-1,14,"Inter600","cloud")
        g.para(b,83,yy+20,288,11.4,"Inter","cloud",15)
    g.label("Decorative fields may crop at the edge. Logos may not.",425,520,"cyan",8.4)

    # 07 - Color
    g.start("06 / Color")
    g.title("Ocean depth. Visible energy.","A palette that carries momentum.")
    swatches=[("Deep Current","ink"),("Signal Cyan","cyan"),("Tide Blue","tide"),("Amber","amber"),("Cloud","cloud"),("Slate","slate")]
    sw=124;gap=12
    for i,(name,key) in enumerate(swatches):
        x=M+i*(sw+gap)
        g.rect(x,172,sw,115,key,"mist" if key=="cloud" else None)
        g.text(name,x,306,11.2,"Inter600")
        g.text(C[key],x,326,10.3,"Mono","tide")
        g.text("RGB "+" / ".join(map(str,rgb(key))),x,346,8.2,"Mono","slate")
    g.line(M,385,W-M,385,"mist")
    g.label("Recommended text pairs / contrast ratio",M,408,"tide")
    pairs=[("cloud","ink","Cloud on Deep Current"),("ink","cyan","Deep Current on Cyan"),("ink","amber","Deep Current on Amber"),("slate","cloud","Slate on Cloud")]
    for i,(fg,bg,label) in enumerate(pairs):
        x=M+i*204
        g.rect(x,438,192,55,bg,"mist" if bg=="cloud" else None)
        g.text("Aa",x+13,446,26,"PJS700",fg)
        g.text(f"{contrast(fg,bg):.2f}:1",x+178,455,12,"Mono500",fg,"right")
        g.para(label,x,505,194,9.6,"Inter","slate",12)
    g.text("Ratios calculated from the sRGB values above. All four pairs meet 4.5:1 for normal text.",M,541,9.4,"Inter","slate")

    # 08 - Typography
    g.start("07 / Typography")
    g.title("Character in the headline. Clarity everywhere.","Type with a clear job.")
    g.text("Aa",M,178,121,"PJS700")
    g.label("Plus Jakarta Sans",M,320,"tide",11)
    g.para("Headlines and the logo foundation. Use 600-800 weights with tight, deliberate spacing.",M,348,285,13)
    g.text("Built to move people.",389,181,33,"PJS700")
    g.text("Headline / 40-64 px / 1.08-1.15 line height",389,231,10,"Mono","tide")
    g.line(389,264,852,264,"mist")
    g.text("A connected system for growth.",389,288,21,"Inter600")
    g.para("Inter gives service details, proposals, and digital experiences a direct, readable voice. Start body copy at 16-18 px with a 1.5 line height.",389,330,455,14.3)
    g.text("Inter / 400-600",389,407,10,"Mono","tide")
    g.line(389,435,852,435,"mist")
    g.text("01 / MOMENTUM / 2026",389,458,20,"Mono500","tide")
    g.text("IBM Plex Mono / labels, data, navigation details",389,494,10,"Mono","slate")
    g.para("These are existing open-source typefaces. The GroundSwell wordmark is a custom-set logo, not a new font family. Use the supplied artwork for the logo.",M,450,285,11.8)

    # 09 - Icons
    g.start("08 / The custom icon family")
    g.title("A shared visual rhythm","Twelve tools. One language.")
    icon_files=[]
    for pattern in ["03_Icons/PNG_256/color/*.png","02_Icons/PNG/*Color*.png","02_Icons/PNG/*.png","**/Icons/PNG/*.png","**/icons/*.png"]:
        icon_files=sorted(package.glob(pattern))
        if len(icon_files)>=12:break
    if len(icon_files)<12:
        # Final render is deliberately strict; never ship a partial icon plate.
        raise FileNotFoundError("The 12 custom icon PNGs are required for the guide")
    # Prefer the base 12 files; variants are shown only once.
    seen=set();unique=[]
    for f in icon_files:
        k=re.sub(r"[_-](color|cyan|navy|white|dark|light|256|512|1024)$","",f.stem,flags=re.I)
        if k not in seen:unique.append(f);seen.add(k)
    icon_files=unique[:12]
    for i,f in enumerate(icon_files):
        col=i%4;row=i//4;x=M+col*204;y=168+row*111
        if col:g.line(x-12,y+5,x-12,y+87,"mist",.7)
        g.img(f,x+5,y,55,55)
        label=f.stem
        label=re.sub(r"^(GroundSwell[_-])?(Icon[_-])?\d*[_-]?","",label,flags=re.I)
        label=re.sub(r"[_-](color|cyan|navy|white|dark|light|256|512|1024)$","",label,flags=re.I)
        label=label.replace("_"," ").replace("-"," ").strip().title()
        g.text(label,x+5,y+69,11.1,"Inter500")
    g.line(M,509,W-M,509,"mist")
    g.para("Use the individual SVGs at 24-48 px or larger. Keep stroke weight, rounded ends, and accent placement consistent. Icons support a label; the logo identifies the company.",M,526,798,11.5)

    # 10 - Social templates
    g.start("09 / Social applications")
    g.title("A system that travels","Recognizable at every ratio.")
    social=package/'05_Templates/Social'
    g.img(social/'GroundSwell_Square_1080.png',M,178,286,286,False)
    g.img(social/'GroundSwell_Story_1080x1920.png',356,178,161,286,False)
    g.label("Square / 1:1",M,481,"tide",9)
    g.label("Story / 9:16",356,481,"tide",9)
    g.label("Composition rules",570,182,"tide")
    yy=216
    for n,title,body in [
        ('01','One clear message.','Lead with a short, useful statement. Let the logo anchor the layout.'),
        ('02','Keep the focal point safe.','Keep essential content away from outer edges and interface overlays.'),
        ('03','Use a repeatable system.','Carry the same type, color balance, and swell motif across formats.'),
    ]:
        g.text(n,570,yy,10,"Mono500","tide");g.text(title,603,yy-1,13.5,"Inter600")
        end=g.para(body,603,yy+23,245,12.2)
        yy=end+24
    g.para("The supplied templates are starting layouts. Replace the message, retain the hierarchy, and use the supplied logo files.",M,519,782,11.6)

    # 11 - Application philosophy / applications
    g.start("10 / Applications","ink",True)
    g.title("From first impression to everyday work","Make the system useful.","cloud")
    g.img(package/'05_Templates/Stationery/GroundSwell_Business_Card_Front.png',M,180,388,233,False)
    g.img(package/'05_Templates/Stationery/GroundSwell_Business_Card_Back.png',456,180,396,233,False)
    g.label('Business card / front',M,432,'cyan',9)
    g.label('Business card / reverse',456,432,'cyan',9)
    g.para('Proposals, decks, invoices, and email share the same essentials: a deliberate headline, readable body type, restrained color, and the supplied logo.',M,468,385,13.5,'Inter','cloud')
    g.para('The card uses the existing division URL. Add any other contact details only after approval. Use the endorsed logo for formal introductions.',456,468,385,13.5,'Inter','cloud')

    # 12 - Voice
    g.start("11 / Voice and copy")
    g.title("Useful words. Clear intent.","Sound like a capable partner.")
    g.label('Brand line',M,173,'tide')
    g.text('Built to move people.',M,201,36,'PJS700')
    g.label('Descriptor',M,270,'tide')
    g.text('Brand. Social. Digital.',M,295,24,'PJS600')
    g.label('Ready-to-use bio',M,354,'tide')
    g.para('Brand, social, and digital, working together. GroundSwell brings clear ideas and connected execution to your next stage of growth. By New Wave.',M,382,394,17,'Inter500','ink',25)
    g.rect(484,173,368,335,'tint')
    g.label('Voice principles',509,198,'tide')
    for yy,head,body in [
        (238,'Confident','Say what the work does. Make the next step easy to understand.'),
        (324,'Specific','Name the audience, task, channel, or outcome. Replace empty hype with detail.'),
        (410,'Human','Use direct language. Write like a thoughtful person, with energy and restraint.'),
    ]:
        g.text(head,509,yy,18,'PJS700')
        g.para(body,509,yy+30,313,12.5)
    g.text('Suggested call to action: Start a conversation.',M,526,12,'Mono','tide')

    # 13 - Practical production
    g.start('12 / Production rules')
    g.title('The handoff standard','Use the right file for the job.')
    rows=[
        ('SVG','Master artwork','Use the GS lockup or monogram as the primary identity. Keep the original wave as a heritage graphic. Outlined shapes stay editable.'),
        ('PNG','Transparent export','Presentations, social publishing, documents, and quick placement. Preserve the original aspect ratio.'),
        ('PDF','Sharing and review','The guide communicates usage rules. Production artwork stays in the source logo and template folders.'),
        ('TTF / WOFF2','Desktop and web type','Install the TTF files for design tools. Use WOFF2 and the supplied CSS for web implementation.'),
    ]
    for i,(ext,head,body) in enumerate(rows):
        yy=175+i*83
        g.text(ext,M,yy+3,19,'Mono500','tide')
        g.text(head,235,yy,16,'PJS700')
        g.para(body,235,yy+27,605,12.5)
        if i<3:g.line(M,yy+69,W-M,yy+69,'mist',.7)
    g.line(M,510,W-M,510,'mist')
    g.para('Avoid stretching, recoloring individual strokes, adding shadows, outlining the wordmark, or placing the full logo over busy imagery. For print, confirm bleed, color conversion, and final proof with the producer.',M,525,800,11.2)

    # 14 - Asset map and sources
    g.start('13 / Asset map and sources')
    g.title('Everything has a place','Ready for the next application.')
    g.label('Package map',M,176,'tide')
    # This list is derived from final folder names so the guide remains truthful.
    dirs=[p for p in sorted(package.iterdir()) if p.is_dir() and not p.name.startswith('.')]
    yy=207
    for d in dirs[:9]:
        title=d.name.replace('_',' ')
        g.text(title,M,yy,12,'Mono500','ink');yy+=31
    g.label('Identity sources',476,176,'tide')
    g.para('The GS monogram uses the exact New Wave upper crest. The original three-current division mark stays in the package as a heritage graphic and source reference.',476,204,363,12.8)
    sources=[
        ('Parent identity','https://www.newwaveitfl.com/'),
        ('Division and services','https://www.newwaveitfl.com/social-engineering'),
        ('Parent logo','https://www.newwaveitfl.com/brand/logos/new-wave-it-horizontal-on-light.svg'),
        ('Inherited division mark','https://www.newwaveitfl.com/brand/social-engineering/logos/nwse-mark_fullcolor-light.svg'),
    ]
    yy=279
    for label,url in sources:
        g.text(label,476,yy,11.5,'Inter600','tide')
        g.c.linkURL(url,(476,H-yy-15,839,H-yy+1),relative=0,thickness=0)
        yy+=27
    g.para('Typeface license files and source URLs are included with the font package. The three families are licensed under the SIL Open Font License; retain their notices when redistributing the font files.',476,400,363,11.8)
    g.line(M,496,W-M,496,'mist')
    g.para('GS identity revision / Version 2 / 22 October 2026. GroundSwell is the requested name for New Wave\'s growth division. The GS monogram incorporates the inherited New Wave upper crest. Tagline, composition, and application examples remain proposed creative work.',M,514,797,10.7)

    assert g.page==14,g.page
    g.finish()
    print(f'Created {out} ({g.page} pages)')
    print(f'Used {len(set(g.images_used))} source PNG assets')
    return out


if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--package',type=Path,default=PACKAGE)
    p.add_argument('--output',type=Path,default=PACKAGE/'00_Start_Here/GroundSwell_Brand_Guide.pdf')
    a=p.parse_args();build(a.output,a.package)
