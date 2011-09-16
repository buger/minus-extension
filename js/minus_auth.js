browser.addMessageListener(function(){

});

try {
    var user = document.getElementById('nav_username_display').innerHTML;
} catch(e) {
    var user = "";
}

browser.onReady(function(){    
    browser.postMessage({ method: "setUsername", username: user })
});
