// Convert gif to sprite:
//   montage logo_anim.gif -tile x1 -geometry '1x1+0+0<' -alpha On -background "rgba(0, 0, 0, 0.0)" -quality 100 loading_1.png

var Animation = function(image, canvas, frames){  
  var ctx = canvas.getContext('2d');
  
  var frame = 0;
 
  var change_icon = function(){
    if (browser.isChrome) {
      browser.toolbarItem.setIcon({ imageData: ctx.getImageData(0, 0, canvas.width, canvas.height) });
    } else if (browser.isFirefox) {
      browser.toolbarItem.setIcon({ imageData: canvas.toDataURL("image/png") });
    }
  };
 
  var draw = function(){
     ctx.save()

     ctx.clearRect(0, 0, canvas.width, canvas.height);         
     ctx.scale(canvas.height/image.naturalHeight,canvas.height/image.naturalHeight);
     ctx.drawImage(image, -frame*image.naturalHeight, 0);

     change_icon();

     ctx.restore();
    
     frame += 1;
    
    if (frame > frames) {
      frame = 0;
    }
  };
  
  var self = this;
  
  return {
    start: function(){
      clearInterval(self.timer);
      self.timer = setInterval(draw, 50); 
    },
    
    stop: function(){
      clearInterval(self.timer);
      
      if (store.get('icon_type') == 'bw') {
        browser.toolbarItem.setIcon({ path: "images/logo_small_bw.png" });
      } else {
        browser.toolbarItem.setIcon({ path: "images/logo_small.png" });
      }

      frame = 0;
      draw();
    }
  };
};
