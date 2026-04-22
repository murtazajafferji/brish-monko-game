from PIL import Image

base = '/Users/murt/.openclaw/workspace/brish-monko-game/sprites/'

for hero in ['brish', 'monko']:
    src = f'{base}{hero}-strip.png'
    img = Image.open(src).convert("RGBA")
    w, h = img.size
    data = list(img.getdata())
    new_data = []
    for r, g, b, a in data:
        # Remove black and near-black background
        if r < 40 and g < 40 and b < 40:
            new_data.append((0, 0, 0, 0))
        # Also remove white/light gray paper background  
        elif r > 215 and g > 215 and b > 215:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append((r, g, b, a))
    img.putdata(new_data)
    img.save(src, 'PNG')
    print(f"Fixed transparency: {src} ({w}x{h})")

    # Also fix individual frames
    for i, label in enumerate(['idle', 'walk1', 'walk2', 'walk3', 'jump', 'fall',
                                'punch-windup' if hero == 'brish' else 'magic-windup',
                                'punch-strike' if hero == 'brish' else 'magic-cast']):
        frame_path = f'{base}{hero}-{label}.png'
        try:
            frame = Image.open(frame_path).convert("RGBA")
            fd = list(frame.getdata())
            nd = [(0,0,0,0) if (r<40 and g<40 and b<40) or (r>215 and g>215 and b>215) else (r,g,b,a) for r,g,b,a in fd]
            frame.putdata(nd)
            frame.save(frame_path, 'PNG')
        except FileNotFoundError:
            pass
