"""Generate Android launcher + notification icons from src/icons/icon-512.png."""
import os
from PIL import Image
base='android/app/src/main/res'
src=Image.open('src/icons/icon-512.png').convert('RGBA')
mask=Image.open('src/icons/icon-maskable-512.png').convert('RGBA')
sizes={'mdpi':48,'hdpi':72,'xhdpi':96,'xxhdpi':144,'xxxhdpi':192}
for d,s in sizes.items():
    os.makedirs(f'{base}/mipmap-{d}',exist_ok=True)
    for name in ('ic_launcher','ic_launcher_round'):
        src.resize((s,s),Image.LANCZOS).save(f'{base}/mipmap-{d}/{name}.png')
    fg=int(s*108/48)
    mask.resize((fg,fg),Image.LANCZOS).save(f'{base}/mipmap-{d}/ic_launcher_foreground.png')
    os.makedirs(f'{base}/drawable-{d}',exist_ok=True)
    n=int(s*24/48); w=Image.new('RGBA',(n,n),(0,0,0,0))
    a=src.resize((n,n),Image.LANCZOS).convert('L').point(lambda v:255 if v>60 else 0)
    w.putalpha(a); wh=Image.new('RGBA',(n,n),(255,255,255,255)); wh.putalpha(a)
    wh.save(f'{base}/drawable-{d}/ic_stat_icon.png')
# remove adaptive-icon xml so the PNG launcher icons are used on every Android version
for d in ('mipmap-anydpi-v26','mipmap-anydpi-v33'):
    p=f'{base}/{d}'
    if os.path.isdir(p):
        for f in os.listdir(p): os.remove(os.path.join(p,f))
print('icons generated')
