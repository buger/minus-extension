function updateGalleries() {
    Minus.myGalleries(function(resp) {       
        var html = $('#galleries_template').tmpl({galleries: resp.galleries});

        $('#my_galleries').html(html);

        $('#my_galleries .share_link')
            .live('click', function() {            
                this.select();
            })
            .live('keydown', function(evt) {
                return false;
            })
            .live('mousemove', function(evt) {
                this.select();
            });

    });
}

browser.addMessageListener(function(msg, sender) {
    console.log("Received message", msg, sender);
});

$('#take_screenshot').live('click', function(){
    console.log('clicked!');

    browser.postMessage({ method: 'takeScreenshot' });
});

$(document).ready(function() {
    updateGalleries();
});
