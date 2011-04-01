browser.addMessageListener(function(){

});

var user = $('#menu_me_link').text().trim();

browser.onReady(function(){
    browser.postMessage({ method: "setUsername", username: user })
});
