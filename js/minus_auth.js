browser.addMessageListener(function(){

});

var user = $('#minus_user').text().trim();

browser.onReady(function(){
    browser.postMessage({ method: "setUsername", username: user })
});
