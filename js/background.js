(function(){
    function getScrollbarWidth() {
        var inner = document.createElement('p');  
        inner.style.width = "100%";  
        inner.style.height = "200px";  
      
        var outer = document.createElement('div');  
        outer.style.position = "absolute";  
        outer.style.top = "0px";  
        outer.style.left = "0px";  
        outer.style.visibility = "hidden";  
        outer.style.width = "200px";  
        outer.style.height = "150px";  
        outer.style.overflow = "hidden";  
        outer.appendChild (inner);  
      
        document.body.appendChild (outer);  
        var w1 = inner.offsetWidth;  
        outer.style.overflow = 'scroll';  
        var w2 = inner.offsetWidth;  
        if (w1 == w2) w2 = outer.clientWidth;  
      
        document.body.removeChild (outer);  
      
        return (w1 - w2); 
    }
    
    var canvas = $('<canvas />').appendTo(document.body)[0];
    var image = $('<img />').appendTo(document.body)[0];

    function removeVScrollbar(imageData, callback) {
        var ctx = canvas.getContext('2d');

        image.src = imageData;

        image.onload = function(){
            canvas.width = image.naturalWidth - getScrollbarWidth();
            canvas.height = image.naturalHeight;

            ctx.drawImage(image, 0, 0,
                          image.naturalWidth, image.naturalHeight);

            callback(canvas.toDataURL());
        }
    }


    var anim = new Animation(document.getElementById('img'), document.getElementById('canvas'), 11);

    browser.popupHeight = 400
    browser.popupWidth = 400

    function createGalleryClick(data) {
        window.latest_screenshot = data.srcUrl;        
        browser.tabs.create({ url: browser.extension.getURL('/edit_image.html?title='+data.srcUrl) });
    }

    function initContextMenu() { 
        if (browser.isChrome || browser.isFirefox) {
            browser.contextMenus.create({
                "title": "Upload to min.us", 
                "onclick" : createGalleryClick, 
                "contexts":["image"]
            });
        } else if(browser.isSafari) {
            function handleContextMenu(event) {    
                if (event.userInfo.nodeName === "IMG") {
                    event.contextMenu.appendContextMenuItem("context_menu_1", "Upload to Minus");
                }
            }
        
            safari.application.addEventListener("contextmenu", handleContextMenu, false); 
            
            safari.application.addEventListener("command", function(event) {
                if (event.command == "context_menu_1") {
                    createGalleryClick(event.userInfo);
                }
            }, false); 
        }
    }

    function uploadItem(binaryData, gallery_id, title){
        anim.start();

        Minus.uploadItem(gallery_id, title.slice(0,50)+".png", "image/png", binaryData, 
            function(resp){
                anim.stop();

                if (!resp.error)
                    browser.tabs.create({ url: "http://minus.com/m"+gallery_id });
                
                browser.postMessage({ method: "uploadComplete" });
            }
        );
    }

    browser.addMessageListener(function(msg, sender){
        switch (msg.method) {
            case 'takeScreenshot':
                anim.start();
                
                browser.tabs.getSelected(null, function(tab) {
                    browser.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
                        removeVScrollbar(dataUrl, function(imageData){
                            window.latest_screenshot = imageData;
                            anim.stop();

                            browser.tabs.create({ url: browser.extension.getURL('/edit_image.html?title='+tab.title) });
                            
                            browser.postMessage({ method: "screenshotComplete" });
                        });
                    });
                });
                break;

            case 'uploadScreenshot':
                var binaryData = atob(msg.imageData.replace(/^data\:image\/png\;base64\,/,''));
                
                if (msg.gallery == 'new') {
                    Minus.createGallery(function(gallery) {
                        uploadItem(binaryData, gallery.editor_id, msg.title);
                    });
                } else {
                    uploadItem(binaryData, msg.gallery, msg.title);
                }
                break;

            case 'setUsername':
                store.set('username', msg.username);

                browser.postMessage({ method: 'setUsername', username: msg.username });

                break;
        }
    });

    browser.onReady(function(){
        initContextMenu();
    });

    Minus.getUsername(function(resp) {
        if (!resp.error) {
            window.store.set('username', resp.username);
        } else {
            window.store.set('username', "");
        }
    });

    if (window.chrome) 
        chrome.tabs.onUpdated.addListener(function(tab) {
            if (tab.url && tab.url.match(/http:\/\/minus\.com/)) {
                chrome.tabs.executeScript(null, { file:"js/minus_auth.js" });
            }
        });
}());
