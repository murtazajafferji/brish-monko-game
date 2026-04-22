from PIL import Image

# Load the sprite sheet
src = '/Users/murt/.openclaw/workspace/brish-marko-game/sprites/brish-spritesheet.jpg'
out_dir = '/Users/murt/.openclaw/workspace/brish-marko-game/sprites/'

img = Image.open(src)
w, h = img.size
print(f"Sprite sheet: {w}x{h}")

# 4x2 grid
cols, rows = 4, 2
fw = w // cols
fh = h // rows
print(f"Frame size: {fw}x{fh}")

# Extract each frame and remove black background -> transparent
frames = []
labels = ['idle', 'walk1', 'walk2', 'walk3', 'jump', 'fall', 'punch-windup', 'punch-strike']

for row in range(rows):
    for col in range(cols):
        idx = row * cols + col
        x1 = col * fw
        y1 = row * fh
        frame = img.crop((x1, y1, x1 + fw, y1 + fh)).convert("RGBA")
        
        # Remove black background (threshold)
        data = frame.getdata()
        new_data = []
        for pixel in data:
            r, g, b, a = pixel
            # If pixel is very dark (black background), make transparent
            if r < 35 and g < 35 and b < 35:
                new_data.append((0, 0, 0, 0))
            else:
                new_data.append(pixel)
        frame.putdata(new_data)
        
        name = labels[idx] if idx < len(labels) else f'frame{idx}'
        path = f'{out_dir}brish-{name}.png'
        frame.save(path, 'PNG')
        frames.append(path)
        print(f"  Saved: brish-{name}.png")

# Also create a single strip sprite sheet (all frames in a row) for the game engine
strip = Image.new('RGBA', (fw * len(frames), fh), (0, 0, 0, 0))
for i, fpath in enumerate(frames):
    f = Image.open(fpath)
    strip.paste(f, (i * fw, 0))

strip_path = f'{out_dir}brish-strip.png'
strip.save(strip_path, 'PNG')
print(f"\nStrip sprite sheet: {strip_path} ({strip.size[0]}x{strip.size[1]})")
