(function(){
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

    function reinitializePane() {        
        var pane = $("#galleries_container").data('jsp');
        if (pane)
            pane.reinitialise(); 
    }
    
    var current_page = 1;
    var total_pages;
    var timeline_type = window.store.get('timeline_type') || 'history';
    
    $('#timeline a').live('click', function(){
        current_page = 1;
        timeline_type = $(this).data('timeline');
        window.store.set('timeline_type', timeline_type);

        updateTimeline();
    });

    function updateTimeline() {
        $('#timeline a.active').removeClass('active');
        $('#timeline a[data-timeline='+timeline_type+']').addClass('active');
        
        $('#my_galleries').html("<li class='loader'></li>");

        reinitializePane();

        updateGalleries();
    }

    var ICON_ARCHIVE = "http://minus.com/smedia/minus/images/file_icons/generic_archive.png";

    function updateGalleries() {
        Minus.timeline(timeline_type, current_page, function(resp) {
            total_pages = resp.total_pages;

            $("#my_galleries .loader").remove();

            var html = $('#galleries_template').tmpl({galleries: resp.galleries});        
            $('#my_galleries').append(html);

            var loaded_images = 0;
            var imageLoaded = function() {
                loaded_images += 1;
                
                if (loaded_images == resp.galleries.length) {
                    reinitializePane()
                }
            }
            
            $('#my_galleries .preview img').each(function(){
                var img = this;

                var img_preloader = new Image;
                var image = $(img).data('image');                                        
                
                if (!image)
                    return img_preloader.src = ICON_ARCHIVE;                

                img_preloader.src = "http://k.min.us/k" + $(img).data('image');
                    
                img_preloader.onload = function(){
                    if (img_preloader.naturalHeight == 0) {                            
                        img.src = ICON_ARCHIVE;
                    } else {                        
                        img.src = img_preloader.src; 
                    }

                    imageLoaded();
                }

                img_preloader.onerror = function(){
                    img.src = ICON_ARCHIVE;

                    imageLoaded();
                }
            });

            var pane = $("#galleries_container").data('jsp');

            if (pane) {
                pane.reinitialise(); 
            } else {
                $("#galleries_container")
                    .unbind('jsp-scroll-y')
                    .bind(                    
                        'jsp-scroll-y',
                        function(event, scrollPositionX, isAtLeft, isAtRight) {
                            // Load next page
                            if (isAtRight) {
                                if (current_page < total_pages) {
                                    current_page += 1;

                                    $('#my_galleries').append("<li class='loader'></li>");

                                    updateGalleries(current_page);
                                }
                                
                                reinitializePane();
                            }
                        }
                    )
                    .jScrollPane({
                        maintainPosition: true
                    });
            }

        });
    }

    browser.addMessageListener(function(msg, sender) {
        $('#header').removeClass('loading');

        if (msg.method == "screenshotComplete") {
            updateTimeline();
        } else {
            updateUser();
        }
    });

    browser.onReady(function(){
      
    });


    $('#take_screenshot').live('click', function(){
        var parent = $(this).parent();

        if (!parent.hasClass('loading')) {
            var screenshot_type = parent.find('li').data('screenshot-type');

            if (screenshot_type) {
                parent.addClass('loading');
            
                browser.postMessage({ method: 'takeScreenshot', captureType: screenshot_type });
            
                if (screenshot_type == 'region') {
                    setTimeout(window.close, 100);
                }
            }
        }
    });
    
    $('#header .more li[data-screenshot-type]').live('click', function(){
        if (!$('#header').hasClass('loading')) {
            $('#header').addClass('loading');
            
            browser.postMessage({ method: 'takeScreenshot', captureType: $(this).data('screenshot-type') });

            if ($(this).data('screenshot-type') == 'region')
                setTimeout(window.close, 100);
        }
    });

    $('#header .more').hover( 
        function(){
            clearInterval(this.timer);
            $(this).addClass('hover')
                .find('div').show();   
        },
        function(){
            var self = $(this);

            this.timer = setTimeout(function(){
                self.removeClass('hover')
                    .find('div').hide();
            }, 500);
        }
    );

    function updateUser() {
        var user = window.store.get('username');

        if (user && user != "") {
            $('#user').html(user)        
                .attr('href','http://minus.com/'+user);
        } else {
            $('#signin').show();

            $('#user').html('Sign In')
                .attr('href','http://minus.com');
        }
    }

    function updateUI() {
        updateTimeline();
        updateUser();

        browser.tabs.getSelected(null, function(tab) {
            if (window.store.get('edit_image') == undefined)
                window.store.set('edit_image', true);

            $('#edit_image').attr('checked', window.store.get('edit_image'))
            
            $('#edit_image').bind('change', function(){
                window.store.set('edit_image', this.checked);
            });

            $('#header *[data-screenshot-type]').each(function(){
                var hotkey = store.get('hotkey_'+$(this).data('screenshot-type'));

                if (hotkey) hotkey = (browser.isPlatform('mac') ? 'Cmd' : 'Ctrl') + "+Alt+" + hotkey;
                
                $(this).find('span').html(hotkey);
            });

            if (tab.url.match('https://') || tab.url.match('chrome://') || tab.url.match("file://")) {
                $('#header *[data-screenshot-type=full], #header *[data-screenshot-type=region]').remove();
            }
            
            if (tab.url.match('chrome://newtab') || tab.url.match('chrome://extensions')) {
                $('#header *[data-screenshot-type]').remove();
                $('#take_screenshot').html('Not available for this page')
                    .parent().find('.more').hide();
            }
        });
    }

    $(document).ready(function() {    
        setTimeout(updateUI, 0);
    });

}())
