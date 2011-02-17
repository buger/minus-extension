function chooseGalleryClick(data) {
    console.log("Old Gallery click", data);

    //temporary
    createGalleryClick(data);
}

function createGalleryClick(data) {
    console.log(data);

    Minus.createGallery(function(gallery) {
        browser.tabs.getCurrent(function(tab){
          
        });

        Minus.uploadItemFromURL(data.srcUrl, gallery.editor_id, 
            function(file){
                browser.tabs.create({ url: "http://min.us/m"+gallery.editor_id });
            }
        );
    });
}


function initContextMenu() { 
    var parent_menu = chrome.contextMenus.create({
        "title": "Upload to min.us", 
        "contexts":["image"]
    });

    chrome.contextMenus.create({
        "title" : "Add To Album", 
        "parentId" : parent_menu, 
        "onclick" : chooseGalleryClick, 
        "contexts" : ["all"]
    });

    chrome.contextMenus.create({
        "title" : "Upload To New Album", 
        "parentId" : parent_menu, 
        "onclick" : createGalleryClick, 
        "contexts" : ["all"]
    });
}

initContextMenu();
