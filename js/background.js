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
    canvasAnimation.animate();

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
    var parent_menu = chrome.contextMenus.create({
        "title": "Upload to min.us", 
        "onclick" : createGalleryClick, 
        "contexts":["image"]
    });
}

initContextMenu();


browser.addMessageListener(function(msg, sender){
    switch (msg.method) {
        case 'takeScreenshot':
            working = true;
            canvasAnimation.animate();
            
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

