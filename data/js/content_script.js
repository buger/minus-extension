if (!$('html').attr('minus_screen_capture_injected'))
{
$('html').attr('minus_screen_capture_injected', true);

var saved_scroll;
var scroll_position;

(function($){

    $.fn.disableSelection = function() {
        return this.each(function() {           
            $(this).attr('unselectable', 'on')
                   .css({
                       '-moz-user-select':'none',
                       '-webkit-user-select':'none',
                       'user-select':'none'
                   })
                   .each(function() {
                       this.onselectstart = function() { return false; };
                   });
        });
    };

})(jQuery);

function initializeDrag(){                  
    var template = [
        '<div id="minus_drag_area" class="yui3-cssreset" style="display: none">',
        '<div class="shadow top"></div>',
        '<div class="shadow bottom"></div>',
        '<div class="shadow left"></div>',
        '<div class="shadow right"></div>',

        '<div class="area">',
            '<div class="container"></div>',
            '<div class="size"></div>',
            '<div class="cancel minus_button">Cancel</div>',
            '<div class="ok">Capture</div>',

            '<div class="drag tl"></div>',
            '<div class="drag tr"></div>',
            '<div class="drag bl"></div>',
            '<div class="drag br"></div>',

            '<div class="drag t"></div>',
            '<div class="drag r"></div>',
            '<div class="drag b"></div>',
            '<div class="drag l"></div>',
        '</div>',
    '</div>'].join('');            

    var container = $(template).appendTo(document.body);        
    container.css({ visibility: "hidden" });
    container.show();
    
    console.log('initializing drag');

    container.find('*').disableSelection();

    container.css({ width: document.width, height:document.height });

    var draggable = container.find('.area');
    draggable.css({ left: (document.width/2 - 150), top: (document.body.scrollTop+200) });

    var shadow_top = container.find('.shadow.top')[0],
        shadow_left = container.find('.shadow.left')[0],
        shadow_right = container.find('.shadow.right')[0],
        shadow_bottom = container.find('.shadow.bottom')[0],

        drag_t = container.find('.drag.t')[0],
        drag_b = container.find('.drag.b')[0],
        drag_r = container.find('.drag.r')[0],
        drag_l = container.find('.drag.l')[0];

    function updateShadow(){
        var offset = draggable.offset(),
            height = draggable.height(),
            width  = draggable.width();

        shadow_top.style.width = (offset.left + width) + 'px';
        shadow_top.style.height = offset.top + 'px';

        shadow_left.style.width = offset.left + 'px';
        shadow_left.style.height = (document.height - offset.top) + 'px';
        shadow_left.style.top = offset.top + 'px';

        shadow_right.style.width = (document.width - offset.left - width) + 'px';
        shadow_right.style.height = document.height + 'px';
        shadow_right.style.left = (offset.left + width) + 'px';

        shadow_bottom.style.width = width + 'px';
        shadow_bottom.style.height = (document.height - offset.top - height) + 'px';
        shadow_bottom.style.left = offset.left + 'px';
        shadow_bottom.style.top = (offset.top + height) + 'px';
        
        drag_t.style.left = (draggable.width()/2 - 3) + 'px';
        drag_b.style.left = (draggable.width()/2 - 3) + 'px';

        drag_r.style.top = (draggable.height()/2 - 3) + 'px';
        drag_l.style.top = (draggable.height()/2 - 3) + 'px';
    }                

    updateShadow();

    function updateSizes() {
        draggable.find('.size').html(draggable.width() + " X " + draggable.height());
    }

    updateSizes();

    var self = this;

    draggable.bind('mousedown', function(evt){
        self.minus_draggable_area = $(evt.target);                    

        self.position = draggable.position();
        self.position.right = self.position.left + draggable.width();
        self.position.bottom = self.position.top + draggable.height();

        self.start_x = evt.pageX;
        self.start_y = evt.pageY;                    
    });

    $(window.document).bind('mousemove', function(evt){
        if (self.minus_draggable_area) {
            var match = self.minus_draggable_area[0].className.match(/drag (\w+)/);

            if (match) {
                var area = self.minus_draggable_area.parent();

                var diff_x = self.start_x - evt.pageX;
                var diff_y = self.start_y - evt.pageY;
                
                switch (match[1]) {
                    case 'tl':                                    
                        area.css({
                            top: evt.pageY,
                            left: evt.pageX,

                            width: self.position.right - evt.pageX,
                            height: self.position.bottom - evt.pageY
                        });
                        
                        break;

                    case 'tr':
                        area.css({
                            top: evt.pageY,

                            width: evt.pageX - self.position.left,
                            height: self.position.bottom - evt.pageY
                        });

                        break;

                    case 'bl':
                        area.css({
                            left: evt.pageX,

                            width: self.position.right - evt.pageX,
                            height: evt.pageY - self.position.top
                        });

                        break;

                    case 'br':
                        area.css({
                            width: evt.pageX - self.position.left,
                            height: evt.pageY - self.position.top
                        });
                        break;

                    case 't':
                        area.css({
                            top: evt.pageY,
                            height: self.position.bottom - evt.pageY
                        });
                        break;                                   

                    case 'l':
                        area.css({
                            left: evt.pageX,
                            width: self.position.right - evt.pageX,
                        });
                        break;   

                    case 'r':
                        area.css({
                            width: evt.pageX - self.position.left,
                        });
                        break;   

                    case 'b':
                        area.css({
                            height: evt.pageY - self.position.top
                        });
                        break;   
                }
                
                self.start_x = evt.pageX;
                self.start_y = evt.pageY;

                updateShadow();   
                updateSizes();
            } else {
                var el = self.minus_draggable_area[0];

                el.style.left = (el.offsetLeft - self.start_x + evt.pageX) + 'px';
                el.style.top = (el.offsetTop - self.start_y + evt.pageY) + 'px';                

                self.start_x = evt.pageX;
                self.start_y = evt.pageY;

                updateShadow();
            }
        }
    });
    
    $(window.document).bind('mouseup', function(evt){
        delete self.minus_draggable_area;
    });

    draggable.find('.ok').bind('click', function(){ 
        container.css({ visibility: "hidden" });
        
        setTimeout(function(){
            browser.postMessage({ 
                method:'takeScreenshot', 
                captureType:'region', 
                finished: true,

                bounds: {
                    top: draggable[0].offsetTop - document.body.scrollTop,
                    left: draggable[0].offsetLeft - document.body.scrollLeft,
                    width: draggable.width(),
                    height: draggable.height()
                }
            });
        
            container.remove();
        }, 100);
    });
    
    draggable.find('.cancel').bind('click', function(){                    
        container.remove();    
    });
    
    container.css({ visibility: "visible" });
}


function resetScroll() {
    saved_scroll = document.body.scrollTop; 
    scroll_position = 0;
    // scroll to top
    window.scrollTo(0,0);
    
    setTimeout(function(){
        browser.postMessage({ method:"takeScreenshot", captureType:"scroll" });
    }, 100);
}

function restoreScroll() {
    window.scrollTo(0, saved_scroll);
}

function scrollPage() { 
    console.log('scrolling page');

    var displayHeight = document.documentElement.clientHeight;    

    // If end of the page
    if ((displayHeight + document.body.scrollTop) >= document.body.scrollHeight) {
        console.log('finished');

        browser.postMessage({ method:"takeScreenshot", captureType:"scroll", finished: true });

        restoreScroll();
    } else {
        scroll_position = scroll_position + displayHeight;
        
        var old_scroll_top = document.body.scrollTop;

        window.scrollTo(0, scroll_position);
        
        (function(scroll){
            setTimeout(function(){
                browser.postMessage({ 
                    method:"takeScreenshot", 
                    captureType:"scroll", 
                    heightFix: (displayHeight - (document.body.scrollTop - scroll)) 
                });
            }, 100);
        })(old_scroll_top);
    }
}

var settings = {};

$(document).bind('keydown', function (event) {
    var isMac = browser.isPlatform('mac');
    var keyCode = event.keyCode;
    
    // Send compose key like Ctrl + Alt + alphabetical-key to background.
    if ((event.ctrlKey && event.altKey && !isMac ||
          event.metaKey && event.altKey && isMac) &&
        keyCode > 64 && keyCode < 91) 
    {
        var charcode = String.fromCharCode(keyCode).toUpperCase(); 

        console.log(charcode, settings)
        
        if (settings[charcode]) {
            browser.postMessage({ method: 'takeScreenshot', captureType: settings[charcode] });
        }
     }
});


browser.addMessageListener(function(msg) {
    console.log('received message', msg);

    switch (msg.method) {
        case "scroll":
            if (msg.initial) {
                resetScroll();
            } else {
                scrollPage();
            }
            
            break;
        case "region":
            initializeDrag();

            break;       

        case "updateSettings":
            settings = msg.settings;
            break;

        default:
            break;
    }
});

browser.onReady(function(){
    browser.postMessage({ method: "updateSettings" });
});

}
