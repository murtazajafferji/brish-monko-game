export default class Player {
  WALK_ANIMATION_TIMER = 200;
  walkAnimationTimer = this.WALK_ANIMATION_TIMER;
  runImages = [];

  jumpPressed = false;
  jumpInProgress = false;
  falling = false;
  JUMP_SPEED = 0.6;
  GRAVITY = 0.4;

  constructor(ctx, width, height, minJumpHeight, maxJumpHeight, scaleRatio, hero = 'brish') {
    this.ctx = ctx;
    this.canvas = ctx.canvas;
    this.width = width;
    this.height = height;
    this.minJumpHeight = minJumpHeight;
    this.maxJumpHeight = maxJumpHeight;
    this.scaleRatio = scaleRatio;
    this.hero = hero;

    this.x = 10 * scaleRatio;
    this.y = this.canvas.height - this.height - 1.5 * scaleRatio;
    this.yStandingPosition = this.y;

    this.standingStillImage = new Image();
    this.standingStillImage.src = `images/${hero}_idle.png`;
    this.image = this.standingStillImage;

    this.jumpImage = new Image();
    this.jumpImage.src = `images/${hero}_jump.png`;

    const runImage1 = new Image();
    runImage1.src = `images/${hero}_walk1.png`;
    const runImage2 = new Image();
    runImage2.src = `images/${hero}_walk2.png`;
    const runImage3 = new Image();
    runImage3.src = `images/${hero}_walk3.png`;

    this.runImages.push(runImage1);
    this.runImages.push(runImage2);
    this.runImages.push(runImage3);
    this.runIndex = 0;

    // keyboard
    window.removeEventListener("keydown", this.keydown);
    window.removeEventListener("keyup", this.keyup);
    window.addEventListener("keydown", this.keydown);
    window.addEventListener("keyup", this.keyup);

    // touch
    window.removeEventListener("touchstart", this.touchstart);
    window.removeEventListener("touchend", this.touchend);
    window.addEventListener("touchstart", this.touchstart);
    window.addEventListener("touchend", this.touchend);
  }

  touchstart = () => { this.jumpPressed = true; };
  touchend = () => { this.jumpPressed = false; };
  keydown = (event) => { if (event.code === "Space") this.jumpPressed = true; };
  keyup = (event) => { if (event.code === "Space") this.jumpPressed = false; };

  update(gameSpeed, frameTimeDelta) {
    this.run(gameSpeed, frameTimeDelta);
    if (this.jumpInProgress) {
      this.image = this.jumpImage;
    }
    this.jump(frameTimeDelta);
  }

  jump(frameTimeDelta) {
    if (this.jumpPressed) {
      this.jumpInProgress = true;
    }

    if (this.jumpInProgress && !this.falling) {
      if (
        this.y > this.canvas.height - this.minJumpHeight ||
        (this.y > this.canvas.height - this.maxJumpHeight && this.jumpPressed)
      ) {
        this.y -= this.JUMP_SPEED * frameTimeDelta * this.scaleRatio;
      } else {
        this.falling = true;
      }
    } else {
      if (this.y < this.yStandingPosition) {
        this.y += this.GRAVITY * frameTimeDelta * this.scaleRatio;
        if (this.y + this.height > this.canvas.height) {
          this.y = this.yStandingPosition;
        }
      } else {
        this.falling = false;
        this.jumpInProgress = false;
      }
    }
  }

  run(gameSpeed, frameTimeDelta) {
    if (this.walkAnimationTimer <= 0) {
      this.runIndex = (this.runIndex + 1) % this.runImages.length;
      this.image = this.runImages[this.runIndex];
      this.walkAnimationTimer = this.WALK_ANIMATION_TIMER;
    }
    this.walkAnimationTimer -= frameTimeDelta * gameSpeed;
  }

  draw() {
    this.ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
  }
}
