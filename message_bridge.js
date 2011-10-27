self.on('message', function(msg) {    
    var bridge = document.getElementById('ff_message_bridge');

    if (!bridge) return;
    
    var _m = document.createElement('textarea');
    _m.className = 'to_page';

    var message = typeof(msg.message) == "string" ? msg.message : JSON.stringify(msg.message);
    _m.innerHTML = message;
    bridge.appendChild(_m);
});

self.postMessage({ method: "bridge_init" });

function checkMessages() {
    var bridge = document.getElementById('ff_message_bridge');

    if (!bridge) return;

    var messages = bridge.querySelectorAll('.from_page');    
    var length = messages.length;

    if (length > 0) {
        for(var i=0; i<length; i++) {
            var msg = messages[i].innerHTML;
            
            self.postMessage(JSON.parse(msg));
            
            bridge.removeChild(messages[i])
        }
    }
    
    try {
        setTimeout(checkMessages, 50);
    } catch(e) {
        // Catche error, when page is closed
    }
}
checkMessages();
