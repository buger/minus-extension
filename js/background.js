browser.popupHeight = 400
browser.popupWidth = 300

var working = false;
var canvasAnimation = new CanvasAnimation(document.getElementById('canvas_icon'), document.getElementById('minus_image'));

function chooseGalleryClick(data) {
    console.log("Old Gallery click", data);

    //temporary
    createGalleryClick(data);
}

function createGalleryClick(data) {
    working = true;
    if (browser.isChrome) {
        canvasAnimation.animate();
    }

    Minus.createGallery(function(gallery) {
        Minus.uploadItemFromURL(data.srcUrl, gallery.editor_id, 
            function(file){
                browser.tabs.create({ url: "http://min.us/m"+gallery.editor_id });

                working = false;
            }
        );
    });
}


function initContextMenu() { 
    if (browser.isChrome) {
        chrome.contextMenus.create({
            "title": "Upload to min.us", 
            "onclick" : createGalleryClick, 
            "contexts":["image"]
        });
    } else if(browser.isSafari) {
        function handleContextMenu(event) {    
            if (event.userInfo.nodeName === "IMG") {
                event.contextMenu.appendContextMenuItem("context_menu_1", "Upload to Min.us");
            }
        }
    
        safari.application.addEventListener("contextmenu", handleContextMenu, false); 
        
        safari.application.addEventListener("command", function(event) {
            if (event.command == "context_menu_1") {
                createGalleryClick(event.userInfo);
            }
        }, false); 
    }

        
    /*
    chrome.contextMenus.create({
        "title" : "Add To Album", 
        "parentId" : parent_menu, 
        "onclick" : chooseGalleryClick, 
        "contexts" : ["all"]
    });

    chrome.contextMenus.create({
        "title" : "Upload To New Album", 
        "parentId" : parent_menu, 
        "contexts" : ["all"]
    });
    */
}

initContextMenu();


browser.addMessageListener(function(msg, sender){
    switch (msg.method) {
        case 'takeScreenshot':
            working = true;
            
            if (browser.isChrome) {
                canvasAnimation.animate();
            }

            browser.tabs.getSelected(null, function(tab) {
                browser.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
                    var binaryData = atob(dataUrl.replace(/^data\:image\/png\;base64\,/,''));
                    
                    Minus.createGallery(function(gallery) {
                        Minus.uploadItem(gallery.editor_id, tab.title+".png", "image/png", binaryData, 
                            function(resp){
                                working = false;

                                if (!resp.error)
                                    browser.tabs.create({ url: "http://min.us/m"+gallery.editor_id });
                            }
                        );
                    });
                });
            });
            break;

        case 'setUsername':
            window.localStorage['username'] = msg.username;

            break;
    }
});

browser.onReady(function(){
});

Minus.getUsername(function(resp) {
    if (!resp.error) {
        window.localStorage['username'] = resp.username;
    } else {
        window.localStorage['username'] = "";
    }
});

chrome.tabs.onUpdated.addListener(function(tab) {
    if (tab.url && tab.url.match(/http:\/\/min\.us/)) {
        chrome.tabs.executeScript(null, { file:"js/minus_auth.js" });
    }
});

