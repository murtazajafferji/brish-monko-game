from PIL import Image

img = Image.open('/Users/murt/.openclaw/workspace/brish-marko-game/sprites/characters-sheet.jpg')
out = '/Users/murt/.openclaw/workspace/brish-marko-game/sprites/'

# Characters sheet is 964x1280
# Top row: Brish (left), Marko (middle), levels preview (right)
# Bottom row: round enemy (left), turtle enemy (middle)

# Brish - top left area
brish = img.crop((0, 0, 320, 640))
brish.save(out + 'brish.png')

# Marko - top middle
marko = img.crop((320, 0, 640, 640))
marko.save(out + 'marko.png')

# Round enemy - bottom left
enemy1 = img.crop((0, 640, 320, 1100))
enemy1.save(out + 'enemy-round.png')

# Turtle enemy - bottom middle  
enemy2 = img.crop((320, 640, 700, 1100))
enemy2.save(out + 'enemy-turtle.png')

print("Sprites extracted!")
for name in ['brish.png', 'marko.png', 'enemy-round.png', 'enemy-turtle.png']:
    i = Image.open(out + name)
    print(f"  {name}: {i.size}")
