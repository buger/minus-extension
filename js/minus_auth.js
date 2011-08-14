browser.addMessageListener(function(){

});

var user = document.getElementById('nav_username_display').innerHTML;

browser.onReady(function(){    
    browser.postMessage({ method: "setUsername", username: user })
});
