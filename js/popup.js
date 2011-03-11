function inputForShare(selector) {
    $(selector)
        .live('click', function() {            
            this.select();
        })
        .live('keydown', function(evt) {
            return false;
        })
        .live('mousemove', function(evt) {
            this.select();
        }); 
}

function updateGalleries() {
    Minus.myGalleries(function(resp) {               
        var html = $('#galleries_template').tmpl({galleries: resp.galleries});        

        $('#my_galleries').html(html);        

        $("#galleries_container").jScrollPane({
            maintainPosition: true
        }); 

        $('#galleries_header').html("Galleries ("+resp.galleries.length+")");

        if (false && resp.galleries[0]) {
            Minus.getItems(resp.galleries[0].reader_id, 
                function(gallery) {
                    if (gallery.ITEMS_GALLERY.length > 0) {
                        $('#latest_file').show()
                            .find('input')
                            .val(gallery.ITEMS_GALLERY[0])
                            .select()
                            .focus();
                        
                    }
                }
            );
        }
    });
}

browser.addMessageListener(function(msg, sender) {
    console.log("Received message", msg, sender);
});

$('#take_screenshot').live('click', function(){
    $('#loader').show();

    browser.postMessage({ method: 'takeScreenshot' });
});

$(document).ready(function() {
    updateGalleries();

    inputForShare("#latest_file input");    
});
