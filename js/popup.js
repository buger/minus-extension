browser.addMessageListener(function(msg, sender) {

});

$('take_screenshot').live('click', function(){
    browser.postMessage({ method: 'takeScreenshot' });
});
