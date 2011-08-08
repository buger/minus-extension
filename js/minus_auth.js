browser.addMessageListener(function(){

});

var match = document.getElementById('nav_cont').innerHTML.match(/\/u\/(.*)\/pref"/);
var user = match ? match[1] : "";

browser.onReady(function(){    
    browser.postMessage({ method: "setUsername", username: user })
});
