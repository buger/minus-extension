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
        if (!resp.galleries)
            return false 

        if (resp.galleries.length === 0) {
            $('#my_galleries span').html(' ');
        } else {
            $("#galleries_container").remove()

            $("<div id='galleries_container'><div id='my_galleries'></div></div").insertAfter($("#latest_file"));

            var html = $('#galleries_template').tmpl({galleries: resp.galleries});        
            $('#my_galleries').html(html);        

            var pane = $("#galleries_container").data('jsp');
            if (pane) {
                pane.reinitialise(); 
            } else {
                $("#galleries_container").jScrollPane({
                    maintainPosition: true
                }); 
            }
        }

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
    $('#loader').hide();

    updateUI();
});

browser.onReady(function(){
  
});


$('#take_screenshot').live('click', function(){
    $('#loader').show();

    browser.postMessage({ method: 'takeScreenshot' });
});

function updateUI() {
    updateGalleries();

    var user = window.store.get('username');

    if (user && user != "") {
        $('#user').html(user)        
            .attr('href','u/'+user+'/pref');
        
        $('#galleries_header').css({ right: '60px' });

        $('#signout').show();
    } else {
        $('#user').html('Sign In')
            .attr('href','http://min.us');

        $('#galleries_header').css({ right: '5px' });
        
        $('#signout').hide();
    }
}

$(document).ready(function() {
    updateUI();
});
