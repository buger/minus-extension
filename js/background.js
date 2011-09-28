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

    browser.popupHeight = 400;
    browser.popupWidth = 400;

    function createGalleryClick(data) {
        // Gif file editing is forbided
        if (store.get('edit_image') && !data.srcUrl.match("\.gif")) {
            window.latest_screenshot = data.srcUrl;        
            browser.tabs.create({ url: browser.extension.getURL('/edit_image.html?title='+data.srcUrl) });
        } else {
            uploadScreenshot(data.srcUrl, '', data.srcUrl);
        }
    }

    function captureFromMenu(captureType) {
        listener({ method: 'takeScreenshot', captureType: captureType });
    }

    function initContextMenu() { 
        if (browser.isChrome || browser.isFirefox) {
            browser.contextMenus.create({
                "title": "Upload to min.us", 
                "onclick" : createGalleryClick, 
                "contexts":["image"]
            });

            browser.contextMenus.create({
                "title": "Capture Visible Part of Page", 
                "onclick" : function(){ captureFromMenu('visible') }
            });

            browser.contextMenus.create({
                "title": "Capture Selected Area", 
                "onclick" : function(){ captureFromMenu('region') },
                "documentUrlPatterns": ["http://*/*"]
            });
            
            browser.contextMenus.create({
                "title": "Capture Entire Page", 
                "onclick" : function(){ captureFromMenu('full') },
                "documentUrlPatterns": ["http://*/*"]
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

    function uploadItem(binaryData, gallery_id, title, onProgress){
        anim.start();

        Minus.uploadItem(gallery_id, title.slice(0,50)+".png", "image/png", binaryData, 
            function(resp){
                anim.stop();

                browser.toolbarItem.setText('');
                
                console.log('resp');

                if (!resp.error)
                    browser.tabs.create({ url: "http://minus.com/m"+gallery_id });
                
                browser.postMessage({ method: "uploadComplete" });
            },

            onProgress
        );
    }

    function uploadScreenshot(base64Data, gallery_id, title) {
        Minus.setUser(window.store.get('username'));
        Minus.setToken(window.store.get('access_token'));

        var onProgress = function(progress) {
            console.log('updating progress');

            var percent = parseInt(progress)+'%';
            browser.toolbarItem.setText(percent);

            browser.postMessage({ method:"uploadProgress", progress: progress });
        }

        function upload() {
            var binaryData = atob(base64Data.replace(/^data\:image\/png\;base64\,/,''));
            
            if (!gallery_id) {
                Minus.createGallery(null, function(gallery) {
                    uploadItem(binaryData, gallery.id, title, onProgress);
                });
            } else {
                uploadItem(binaryData, gallery_id, title, onProgress);
            }
        }

        if (base64Data.slice(0,4) == 'data') {
            upload();
        } else {
            anim.start();

            Minus.createGallery(null, function(gallery) {
                Minus.uploadItemFromURL(base64Data, gallery.id, function(resp){
                    anim.stop();

                    browser.toolbarItem.setText('');
                    
                    if (!resp.error)
                        browser.tabs.create({ url: "http://minus.com/m"+gallery.id });
                    
                    browser.postMessage({ method: "uploadComplete" });
                }, onProgress);
            });
        }
    }

    function captureVisible(callback) {
        browser.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
            callback(dataUrl);
        });
    }

    function concatImages(image_data_array, callback) {
        if (!$.isArray(image_data_array))
            return false;

        var images = [], 
            image, 
            loaded_images = 0, 
            total_height = 0, 
            total_width = 0,
            concated_height = 0;

        var canvas = $('<canvas/>').appendTo(document.body);

        var imageLoaded = function() {
            total_width = this.naturalWidth;
            total_height = total_height + this.naturalHeight;

            loaded_images += 1;

            // All images loaded
            if (loaded_images == image_data_array.length) {
                canvas[0].width = total_width;
                canvas[0].height = total_height;
                ctx = canvas[0].getContext('2d');                

                for (var i=0; i<images.length; i++) {
                    ctx.drawImage(images[i], 0, concated_height);

                    concated_height += images[i].naturalHeight;
                }

                callback(canvas[0].toDataURL());

                canvas.remove();
                $(this).remove();
            }
        };

        for (var i=0; i<image_data_array.length; i++) {
            image = new Image;
            image.src = image_data_array[i];
            image.onload = imageLoaded; 

            images.push(image);
        }
    }

    function cropHeight(heightFix, imageData, callback) {
        if (!heightFix)
            return callback(imageData);

        var canvas = $('<canvas />').appendTo(document.body);
        ctx = canvas[0].getContext('2d');

        var image = new Image;
        image.src = imageData;
        image.onload = function(){
            canvas[0].width = image.naturalWidth;
            canvas[0].height = image.naturalHeight - heightFix;

            ctx.drawImage(image, 0, -heightFix);
            callback(canvas[0].toDataURL());

            canvas.remove();
        }
    }

    function cropImage(bounds, imageData, callback) {
        var canvas = $('<canvas />').appendTo(document.body);
        ctx = canvas[0].getContext('2d');

        var image = new Image;
        image.src = imageData;
        image.onload = function(){
            canvas[0].width = bounds.width;
            canvas[0].height = bounds.height;

            ctx.drawImage(image, bounds.left, bounds.top, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
            callback(canvas[0].toDataURL());

            canvas.remove()
        }
    }

    function updateSettings(receiver) {
        if (store.get('icon_type') == 'bw') {
            browser.toolbarItem.setIcon({ path: "images/logo_small_bw.png" });
        } else {
            browser.toolbarItem.setIcon({ path: "images/logo_small.png" });
        }

        var settings = {};
        settings[store.get('hotkey_visible')||'V'] = 'visible';
        settings[store.get('hotkey_region')||'R'] = 'region';        
        settings[store.get('hotkey_full')||'H'] = 'full';        

        console.log(receiver);
    
        browser.postMessage({ method: 'updateSettings', settings: settings }, receiver);
    }

    var listener = function(msg, sender, sendResponse) {
        console.log('Received message', msg);

        switch (msg.method) {
            case 'takeScreenshot':                                    
                anim.start();

                browser.tabs.getSelected(null, function(tab) {
                    switch (msg.captureType) {
                        case 'visible':
                            captureVisible(function(dataUrl){
                                removeVScrollbar(dataUrl, function(imageData){
                                    window.latest_screenshot = imageData;
                                    
                                    if (store.get('edit_image')) {
                                        anim.stop();

                                        browser.postMessage({ method: "screenshotComplete" });
                                        browser.tabs.create({ url: browser.extension.getURL('/edit_image.html?title='+encodeURIComponent(tab.title)) });
                                    } else {
                                        uploadScreenshot(imageData, '', tab.title)
                                    }
                                });
                            });

                            break;
                        case 'full':
                            window.latest_screenshot = [];
                            browser.postMessage({ method: "scroll", initial: true }, tab);                            
                            break;

                        case 'scroll':
                            captureVisible(function(imageData){
                                if (msg.finished) {
                                    concatImages(window.latest_screenshot, function(image){
                                        removeVScrollbar(image, function(imageData){
                                            window.latest_screenshot = imageData;
                                            
                                            if (store.get('edit_image')) {
                                                anim.stop();
                            
                                                browser.tabs.create({ url: browser.extension.getURL('/edit_image.html?title='+tab.title) });
                                                browser.postMessage({ method: "screenshotComplete" });                                  
                                            } else {
                                                uploadScreenshot(imageData, '', tab.title)
                                            }
                                        });
                                    });
                                } else {                        
                                    cropHeight(msg.heightFix, imageData, function(image){ 
                                        window.latest_screenshot.push(image);

                                        browser.postMessage({ method: "scroll" }, tab);
                                    });
                                }
                            }); 
                            break;

                        case 'region':
                            anim.stop();

                            if (msg.finished) {
                                captureVisible(function(imageData) {     
                                    cropImage(msg.bounds, imageData, function(image){
                                        window.latest_screenshot = image;
                                        
                                        if (store.get('edit_image')) {
                                            browser.tabs.create({ url: browser.extension.getURL('/edit_image.html?title='+tab.title) });
                                            browser.postMessage({ method: "screenshotComplete" });
                                        } else {
                                            uploadScreenshot(image, '', tab.title)
                                        }
                                    });
                                });
                            } else {
                                browser.postMessage({ method: 'region' }, tab); 
                            }
                            break;
                    }
                });
                break;

            case 'uploadScreenshot':
                uploadScreenshot(msg.imageData, msg.gallery, msg.title); 

                break;

            case 'setUsername':
                store.set('username', msg.username);

                browser.postMessage({ method: 'setUsername', username: msg.username });

                break;

            case 'updateSettings':
                updateSettings(msg.global ? undefined : sender.tab);

                break;

            case 'timeline':
                Minus.timeline(msg.username, msg.timeline, msg.page, 
                    function(resp) {
                        sendResponse(resp);
                    }
                );

                break;

            case '_ajax':
                var xhr;                
                var send = function() { 
                    console.log('sending response', sendResponse);

                    sendResponse({
                        status: xhr.status,
                        responseText: xhr.responseText,
                        responseHeaders: xhr.getAllResponseHeaders() 
                    });
                };

                xhr = new Minus.Ajax(msg.httpOptions.url, {                    
                    method: msg.httpOptions.method,                    
                    headers: msg.httpOptions.headers,
                    binaryData: msg.httpOptions.binary ? msg.httpOptions.data : null,
                    params: msg.httpOptions.binary ? null : msg.httpOptions.data,

                    onSuccess: send,
                    onError: send
                });
        }
    }

    browser.addMessageListener(listener);

    function executeInExistingTabs(){
        chrome.windows.getAll(null, function(wins) {
            for (var j = 0; j < wins.length; ++j) {
                chrome.tabs.getAllInWindow(wins[j].id, function(tabs) {
                    for (var i = 0; i < tabs.length; ++i) {
                        if (tabs[i].url.match('chrome://') || tabs[i].url.match('chrome-devtools://'))
                            continue;

                        try {                           
                        chrome.tabs.executeScript(tabs[i].id, { file: 'js/jquery.min.js' }); 
                        chrome.tabs.executeScript(tabs[i].id, { file: 'js/browser_api.js' }); 
                        chrome.tabs.executeScript(tabs[i].id, { file: 'js/content_script.js' }); 
                        
                        chrome.tabs.insertCSS(tabs[i].id, { file: 'css/reset-context-min.css' }); 
                        chrome.tabs.insertCSS(tabs[i].id, { file: 'css/page.css' }); 
                        } catch(e) {}
                    }
                });
            }
        });
    }

    browser.onReady(function(){
        initContextMenu();
        executeInExistingTabs();
        updateSettings();
    });

}());
