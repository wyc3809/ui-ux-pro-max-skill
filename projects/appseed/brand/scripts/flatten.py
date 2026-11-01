"""Drop the alpha channel (App Store icons and Play feature graphics must be opaque)."""
import sys
from PIL import Image
for p in sys.argv[1:]:
    im = Image.open(p)
    if im.mode != "RGB":
        bg = Image.new("RGB", im.size, (8, 8, 10))
        bg.paste(im, mask=im.split()[-1] if im.mode in ("RGBA", "LA") else None)
        bg.save(p, optimize=True)
