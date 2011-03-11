function createDroppable() {        
    var container = document.createElement('div');
    container.innerHTML = "To start sharing, drag your files onto this page";
    container.className = "minus_ext_droppable";

    document.body.appendChild(container);
    
    $(container).droppable().draggable();
}

browser.addMessageListener(function(msg) {
    switch (msg.method) {
        default:
            break;
    }
});

$(document).ready(function() {
//    $('img').draggable({helper: "clone", cursor: "move"});

    //createDroppable();
});
