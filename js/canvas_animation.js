/**
 * Animates the canvas after loading the data from all the calendars. It
 * rotates the icon and defines the badge text and title.
 * @constructor
 */
function CanvasAnimation(canvas, image) {
  this.animationFrames_ = 36;  // The number of animation frames
  this.animationSpeed_ = 10;  // Time between each frame(in ms).
  this.canvas_ = canvas  // The canvas width + height.
  this.canvasContext_ = this.canvas_.getContext('2d');  // Canvas context.
  this.loggedInImage_ = image;
  this.rotation_ = 0;  //Keeps count of rotation angle of extension icon.
  this.w = this.canvas_.width;  // Setting canvas width.
  this.h = this.canvas_.height;  // Setting canvas height.
  this.RED = [208, 0, 24, 255];  //Badge color of extension icon in RGB format.
  this.BLUE = [0, 24, 208, 255];
  this.currentBadge_ = null;  // The text in the current badge.
};

/**
 * Flips the icon around and draws it.
 */
CanvasAnimation.prototype.animate = function() {
  this.rotation_ += (1 / this.animationFrames_);
  this.drawIconAtRotation();
  var self = this;
  if (this.rotation_ <= 1) {
    setTimeout(function() {
      self.animate();
    }, self.animationSpeed_);
  } else {
    this.drawFinal();
  }
};

/**
 * Renders the icon.
 */
CanvasAnimation.prototype.drawIconAtRotation = function() {
  this.canvasContext_.save();
  this.canvasContext_.clearRect(0, 0, this.w, this.h);
  this.canvasContext_.translate(Math.ceil(this.w / 2), Math.ceil(this.h / 2));
  this.canvasContext_.drawImage(this.loggedInImage_, -Math.ceil(this.w / 2), -Math.ceil(this.h / 2), 19, 19);
  this.canvasContext_.rotate(2 * Math.PI * this.getSector(this.rotation_));
  this.canvasContext_.drawImage(this.loggedInImage_, -Math.ceil(this.w / 2), -Math.ceil(this.h / 2), 19, 19);
  this.canvasContext_.restore();
  if (browser.isChrome) {
      browser.toolbarItem.setIcon(
          {imageData: this.canvasContext_.getImageData(0, 0, this.w, this.h)});
  } else if (browser.isFirefox) {
      browser.toolbarItem.setIcon({ imageData: this.canvas_.toDataURL("image/png") });
  }
};

/**
 * Calculates the sector which has to be traversed in a single call of animate
 * function(360/animationFrames_ = 360/36 = 10 radians).
 * @param {integer} sector angle to be rotated(in radians).
 * @return {integer} value in radian of the sector which it has to cover.
 */
CanvasAnimation.prototype.getSector = function(sector) {
  return (1 - Math.sin(Math.PI / 2 + sector * Math.PI)) / 2;
};

/**
 * Draws the event icon and determines the badge title and icon title.
 */
CanvasAnimation.prototype.drawFinal = function() {

    this.drawIconAtRotation();
    this.rotation_ = 0;
    if (working) {
        this.animate();
    }
    
  return;
};
