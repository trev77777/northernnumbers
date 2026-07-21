from PIL import Image, ImageDraw
from pathlib import Path
import re

RED = (213, 43, 30, 255)

def leaf(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    s = size * 0.44
    cx, cy = size / 2, size / 2 - size * 0.04
    def p(nx, ny):
        return (cx + nx * s, cy + ny * s)
    draw.polygon([
        p(0, -1), p(.22, -0.55), p(.6, -0.7), p(.42, -0.3), p(1.05, 0),
        p(.55, .22), p(.28, .12), p(.18, .62), p(-.18, .62), p(-.28, .12),
        p(-.55, .22), p(-1.05, 0), p(-.42, -0.3), p(-.6, -0.7), p(-.22, -0.55)
    ], fill=RED)
    draw.rectangle([
        cx - size * .07, cy + s * .6,
        cx + size * .07, cy + s * .95
    ], fill=RED)
    return img

root = Path.cwd()
leaf(32).save(root / 'favicon-32x32.png')
leaf(16).save(root / 'favicon-16x16.png')
imgs = [leaf(s) for s in [16, 32, 48]]
imgs[0].save(root / 'favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)], append_images=imgs[1:])

link_re = re.compile(r'(?is)<link[^>]+rel\s*=\s*["\'](?:shortcut icon|icon)["\'][^>]*>')
html_files = list(root.rglob('*.html'))
if not html_files:
    raise SystemExit('No HTML files found')

for path in html_files:
    rel = path.parent.relative_to(root)
    if rel == Path('.'):
        prefix = '/'
    else:
        prefix = '../' * len(rel.parts)
    block = (
        f'  <link rel="icon" type="image/png" sizes="32x32" href="{prefix}favicon-32x32.png" />\n'
        f'  <link rel="icon" type="image/png" sizes="16x16" href="{prefix}favicon-16x16.png" />\n'
        f'  <link rel="icon" type="image/x-icon" href="{prefix}favicon.ico" />'
    )
    text = path.read_text(encoding='utf-8')
    m = re.search(r'</head\s*>', text, flags=re.IGNORECASE)
    if not m:
        continue
    before = text[:m.start()]
    after = text[m.start():]
    before = link_re.sub('', before)
    new_text = before.rstrip() + '\n' + block + '\n' + after
    if new_text != text:
        path.write_text(new_text, encoding='utf-8')

print('favicon update complete')
