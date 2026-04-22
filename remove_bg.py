from PIL import Image
import sys

def remove_white_bg(inpath, outpath, threshold=220):
    img = Image.open(inpath).convert("RGBA")
    data = img.getdata()
    new_data = []
    for item in data:
        # If pixel is close to white, make transparent
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    img.putdata(new_data)
    img.save(outpath, "PNG")
    print(f"Saved: {outpath} ({img.size[0]}x{img.size[1]})")

base = '/Users/murt/.openclaw/workspace/brish-marko-game/sprites/'
for name in ['brish', 'marko', 'brish-car', 'marko-car']:
    remove_white_bg(base + name + '.png', base + name + '-transparent.png')
    print(f"  {name} done")
