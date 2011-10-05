(function(){
    function reinitializePane() {        
        var pane = $("#galleries_container").data('jsp');
        if (pane)
            pane.reinitialise(); 
    }
    
    var current_page = 1;
    var total_pages;
    var timeline_type = window.store.get('timeline_type') || 'mine';
    
    $('#timeline a').live('click', function(){
        current_page = 1;
        timeline_type = $(this).data('timeline');
        window.store.set('timeline_type', timeline_type);

        updateTimeline();
    });

    function updateTimeline(skip_loader) {
        $('#timeline a.active').removeClass('active');
        $('#timeline a[data-timeline='+timeline_type+']').addClass('active');
        
        if (!skip_loader) 
            $('#my_galleries').html("<li class='loader'></li>");

        reinitializePane();

        updateGalleries();
    }

    var ICON_ARCHIVE = "../images/generic_file.png";

    function updateGalleries() {
        Minus.timeline(window.store.get('username'), timeline_type, current_page, function(resp) {
            total_pages = resp.pages;

            $("#my_galleries .loader").remove();

            var html = $('#galleries_template').tmpl({ galleries: resp.results });            

            if (current_page == 1) {
                $('#my_galleries').html(html);
            } else {
                $('#my_galleries').append(html);
            }

            $('#my_galleries').find('.items.date').timeago()            

            var loaded_images = 0;
            var imageLoaded = function() {
                loaded_images += 1;
                
                if (loaded_images == resp.results.length) {
                    if (current_page == 1) {
                        window.store.set('last_view', $('#my_galleries').html());
                    }

                    reinitializePane()
                }
            }
            
            $('#my_galleries .preview img').each(function(){
                var img = this;

                var img_preloader = new Image;
                var image = $(img).data('image');                                        
                
                if (!image)
                    return img_preloader.src = ICON_ARCHIVE;                

                img_preloader.src = $(img).data('image');
                    
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
                    .jScrollPane({
                        maintainPosition: true,
                        verticalDragMinHeight: 87,
                        verticalDragMaxHeight: 87
                    });
            }

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
                );

        });
    }

    browser.addMessageListener(function(msg, sender) {
        $('#header').removeClass('loading');

        if (msg.method == "screenshotComplete") {
            updateTimeline();
        } else {
            //updateUser();
        }
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

    function authUser() {
        var $form = $('#signin form.signin');    
        var form_data = $form.serializeArray();

        Minus.oauthToken(form_data[0].value, form_data[1].value, 
            function(resp) {                
                if (resp.error) {
                    $('#signin .error').html('Wrong user/password combination.');
                } else {
                    window.store.set('username', form_data[0].value);

                    console.log(form_data);

                    if (form_data[2]) {
                        window.store.set('access_token', resp.access_token);
                        window.store.set('refresh_token', resp.refresh_token);
                    } else {
                        window.store.remove('access_token');
                        window.store.remove('refresh_token');
                    }
                                
                    updateUser();
                     
                    $('#signin').hide();
                    $('#main_content').show();

                    $('body').css({ 'width': '380px' });
                }
            }
        );

        return false;
    }

    $('#signin form.signin').bind('submit', authUser);
    
    function registerUser() {
        var $form = $('#signin form.signup');    
        var form_data = $form.serializeArray();

        Minus.registerUser(form_data[0].value, form_data[1].value, form_data[2].value, 
            function(resp) {
                if (!resp.success) {
                    $('#signin .error').html(resp.username);
                } else {
                    $signin_form = $('#signin form.signin');

                    $signin_form.find('input[name=username]').val(form_data[0].value);
                    $signin_form.find('input[name=password]').val(form_data[1].value);

                    authUser();
                }
            }
        );

        return false;
    }

   
    $('#signin form.signup').bind('submit', registerUser);

    function updateUser() {
        var user = window.store.get('username');
        var token = window.store.get('access_token');        
        var skip_loader = window.store.get('last_view');
        
        if (token && user) { 
            Minus.setToken(token);

            Minus.activeUser(function(resp) {
                if (resp.invalid_token) {
                    Minus.refreshToken(window.store.get('refresh_token'),
                        function(refresh_resp) {
                            if (refresh_resp.error) {
                                $('body').css({ 'width': '542px' });
                                $('#main_content').hide();
                                $('#signin').show();
                            } else {
                                console.log(refresh_resp);

                                window.store.set('access_token', refresh_resp.access_token);
                                window.store.set('refresh_token', refresh_resp.refresh_token);

                                updateTimeline(skip_loader);
                            }
                        }
                    );
                } else {
                    updateTimeline(skip_loader);
                }
            });
            
            $('#user').attr('href','http://minus.com/'+user);
        } else {
            $('body').css({ 'width': '542px' });            
            $('#main_content').hide();
            $('#signin').show();
        }
    }

    function updateUI() {
        if (window.store.get('last_view')) {            
            $('#my_galleries').html(window.store.get('last_view'));
            $("#galleries_container")
                .jScrollPane({
                    maintainPosition: true,
                    verticalDragMinHeight: 87,
                    verticalDragMaxHeight: 87
                });

        }

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
    

    browser.onReady(function() {    
        setTimeout(updateUI, 0);
    });

}())
