﻿(function(window){
    function joinArgs(args) {
        var result = [], length = args.length, i;

        for (i = 0; i < length; i++) {
            if (args[i] !== undefined) {
                if (typeof (args[i]) === 'object') {
                    try {
                        result.push(JSON.stringify(args[i]));
                    } catch (e) {
                        result.push(args[i].toString());
                    }
                } else {
                    result.push(args[i].toString());
                }
            }
        }
        
        return result.join(', ');
    }

    if (window.opera) {
        window.console = {};
        

        
        function getErrorObject() {
            try { throw new Error(''); } catch (err) { return err; }
        }

        function fn() { 
            var err = getErrorObject();
            var caller_line = err.stack.split("\n")[2].replace('@', '\n');
            var index = caller_line.indexOf("at ");        

            opera.postError(joinArgs(arguments)+': ' + caller_line);         
        };

        ['log', 'debug', 'info', 'warn', 'error', 'assert', 'dir', 'dirxml', 'group', 'groupEnd',
         'time', 'timeEnd', 'count', 'trace', 'profile', 'profileEnd'].forEach(function(name) {
            window.console[name] = fn;
        });
    }



    Array.prototype.unique = function() {
        var r = new Array(), i, x;    
        o:for (i = 0, n = this.length; i < n; i++) {
            for(x = 0, y = r.length; x < y; x++) {
                if(r[x]==this[i])
                {
                    continue o;
                }
            }
            
            r[r.length] = this[i];
        }
        return r;
    }

    if (navigator.userAgent.match('Firefox') !== undefined) {
        window.console = {
            log: function() {
                browser.postMessage({ _api: true, method: "log", message: joinArgs(arguments) });
            }
        }
    }

    var browser = {
        isChrome: typeof(window.chrome) === "object",
        isOpera:  typeof(window.opera) === "object",
        isSafari: typeof(window.safari) === "object",
        isFirefox: navigator.userAgent.match('Firefox') !== undefined,

        _o_toolbarButton: null,

        toolbarItem: {        
            setText: function(text) {            
                if (browser.isChrome) {
                    chrome.browserAction.setBadgeText({text: text});
                } else if (browser.isOpera && browser._o_toolbarButton) {
                    browser._o_toolbarButton.badge.textContent = text;
                }
            },

            setTitle: function(title) {
                if (browser.isChrome) {
                    chrome.browserAction.setTitle({title: title});
                } else if (browser.isOpera && browser._o_toolbarButton) {
                    browser._o_toolbarButton.title = title;
                }
            },

            setIcon: function(options){
                if (browser.isChrome) {
                    chrome.browserAction.setIcon(options);
                } else {
                    browser.postMessage({ method: "setIcon", _api: true, imageData: options.imageData });
                }
            },

            setBackgroundColor: function(color) {
                if (browser.isChrome) {
                    chrome.browserAction.setBadgeBackgroundColor({color: color}) //blue            
                } else if (browser.isOpera && browser._o_toolbarButton) {
                    browser._o_toolbarButton.badge.backgroundColor = 'rgba('+color.join(',')+')';
                }
            }
        },

        tabs: {
            create: function(options) {
                if (browser.isChrome) {
                    chrome.tabs.create(options);                    
                } else if (browser.isSafari) {
                    var tab = safari.application.activeBrowserWindow.openTab();
                    tab.url = options.url;
                } else if (browser.isFirefox) {
                    browser.postMessage({ method: "createTab", _api: true, url: options.url }, null, function(msg){
                        callback(msg.response);
                    })                    
                }
            },

            getSelected: function(windowID, callback) {
                if (browser.isChrome) {
                    chrome.tabs.getSelected(windowID, callback);
                } else if (browser.isSafari) {
                    callback(safari.application.activeBrowserWindow.activeTab)
                } else if (browser.isFirefox) {
                    browser.postMessage({ method: "activeTab", _api: true }, null, function(msg){
                        callback(msg.response);
                    })
                }
            },

            postMessage: function(tab, message) {               
                var connection = browser._getConnectionByTab(tab);                

                if (connection) {
                    browser.postMessage(message, connection);
                }
            },

            captureVisibleTab: function(windowID, options, callback) {
                if (browser.isChrome) {
                    chrome.tabs.captureVisibleTab(windowID, options, callback);
                } else if (browser.isSafari) {
                    callback(safari.application.activeBrowserWindow.activeTab.visibleContentsAsDataURL());
                } else if (browser.isFirefox) {
                    browser.postMessage({ _api:true, method: "captureVisibleTab" }, null, function(msg) {
                        callback(msg.response);
                    });
                }
            },

            _getConnectionByTab: function(tab) {
                browser._connected_ports.forEach(function(port) {
                    if (browser.isChrome) {
                        if (port.tab._tabId === tab._tabId) {
                            return port;
                        }
                    }
                });
            }
        },     

        contextMenus: {
            create: function(options) {
                if (browser.isChrome) {
                    chrome.contextMenus.create(options)
                } else if (browser.isFirefox) {
                    browser.postMessage({ _api:true, method: "createContextMenus", event_listener: true, options: options }, null, function(msg) {
                        console.log('calling on click');
                        if (options.onclick)
                            options.onclick(msg.response);
                    });
                }
            }
        },

        extension: {
            getURL: function(url) {
                if (!url) {
                    url = "/";
                }

                if (url[0] != "/") { 
                    url = "/" + url;
                }

                return browser.isChrome ? chrome.extension.getURL(url) : 
                       browser.isSafari ? safari.extension.baseURI.slice(0, -1) :
                       browser.isOpera  ? "widget://" + document.location.host + url : url;
            }
        },

        isBackgroundPage: null,
        page_type: null,

        getPageType: function(){   
            if (browser.page_type)
                return browser.page_type;

            if (browser.isChrome) {
                try {
                    browser.page_type = chrome.extension.getBackgroundPage() == window ? 'background' : 'script';
                } catch(e) {
                    page_type = 'script';
                }
            } else if (browser.isOpera) {
                browser.page_type = opera.extension.broadcastMessage ? 'background' : 
                                    window.isContentScript ? 'injected' : 
                                    'popup';
            } else if (browser.isSafari) {
                browser.page_type = safari.extension.globalPage ? 'background' : 'script';
            }

            if (browser.page_type == 'background') {
                browser.isBackgroundPage = true;

                console.log("Background page");
            }

            return browser.page_type;        
        },    
        
        _isNetworkInitialized: false,
        _onReadyCallback: null,    

        onReady: function(callback) {
            if (callback) {
                browser._onReadyCallback = callback;
                
                console.log("Network initialized:", browser._isNetworkInitialized);

                if (browser._isNetworkInitialized) {
                    console.log("Calling onReady callback", browser._isNetworkInitialized);
                    browser._onReadyCallback();
                }
            } else {             
                browser._isNetworkInitialized = true;

                if (browser._onReadyCallback) {
                    console.log("Calling onReady callback", browser._isNetworkInitialized);
                    browser._onReadyCallback();
                }
            }
        },
        
        getRecourcesForPage: function(url) {
            var scripts = [], styles = [];
            var content_scripts = browser.config.content_scripts;

            content_scripts.forEach(function(script) {
                var origin_matches = false;
                script.matches.forEach(function(match) {
                    if (origin_matches) {
                        return;
                    }

                    // Converting Chrome regexp to Javascript format:
                    //     http://*.last.fm/* -> ^http://.*\.last\.fm/.*
                    var rg = new RegExp('^'+match.replace(/\./, "\\.").replace('*','.*'));

                    if (rg.test(url)) {
                        origin_matches = true;
                        
                        console.log('Site: ', url, ' matches following expression: ', match);
                    }                                
                });
                
                if (origin_matches) {
                    if (script.js) {
                        script.js.forEach(function(js) {
                            scripts.push('/'+js);
                        });                                            
                    }

                    if (script.css) {
                        script.css.forEach(function(css) {
                            styles.push('/'+css);
                        });
                    }
                }
            });

            var scripts = scripts.unique();

            for (var i=0; i<scripts.length; i++) {
                scripts[i] = browser._files_cache[scripts[i]];                            
            }

            
            var styles = styles.unique();

            for (var i=0; i<styles.length; i++) {
                styles[i] = browser._files_cache[styles[i]];
            }    
            
            return { styles: styles, scripts: scripts };
        },

        connected_ports: [],

        addMessageListener: function(listener) {
            if (!listener) return;        

            if (browser.isChrome) {
                browser._c_addMessageListener(listener);
            } else if (browser.isOpera) {
                browser._o_addMessageListener(listener);    
            } else if (browser.isSafari) {
                browser._s_addMessageListener(listener);
            } else if (browser.isFirefox) {
                browser._f_addMessageListener(listener);
            }
        },

        _c_addMessageListener: function(listener) {
            if (browser.isBackgroundPage) {
                chrome.extension.onConnect.addListener(function(port) {
                    console.log("Port connected:", port.name, port);

                    browser.connected_ports.push(port);

                    port.onMessage.addListener(function(message) {
                        listener(message, port);
                    });

                    port.onDisconnect.addListener(function() {
                        for (var i=0; i<browser.connected_ports.length; i++) {
                            console.log('Port disconnected', browser.connected_ports[i].portId_, port.portId_);

                            if (browser.connected_ports[i].portId_ == port.portId_) {
                                browser.connected_ports.splice(i, 1);

                                break;
                            }
                        }
                    });                
                });
            } else {
                if (browser.connected_ports.length == 0) {
                    var port = chrome.extension.connect();
                    browser.connected_ports.push(port);
                } else {
                    port = browser.connected_ports[0];
                }
                
                port.onMessage.addListener(function(message){
                    listener(message, port);
                });
            }
            
            browser.onReady();
        },
        

        //Call stack for Opera and Safari
        _listeners: [],
        
        _listener_initialized: false,
        
        _f_message_in: null,
        _f_message_out: null,

        _f_addMessageListener: function(listener) {
            browser._listeners.push(listener);
            
            if (browser._listener_initialized) {
                return;
            } else {
                browser._listener_initialized = true;
            }
                        
            function waitForDispatcher() {
                browser._f_message_bridge = document.getElementById('ff_message_bridge');

                if (!browser._f_message_bridge)
                    return setTimeout(waitForDispatcher, 50);

                if (document.body.className.match(/background/)) {
                    browser.page_type = "background";
                    browser.isBackgroundPage = true;

                    console.log("I Am background page!");
                } else if (document.body.className.match(/popup/)) {
                    browser.page_type = "popup";

                    document.addEventListener('click', function(evt) {
                        if (evt.target.nodeName == 'A' && evt.target.target == "_blank") {
                            if (evt && evt.preventDefault)
                                evt.preventDefault();

                            evt.stopPropagation();
                            evt.returnValue = false;

                            browser.tabs.create({ url:evt.target.href });

                            return false;
                        }
                    }, false);
                }

                setInterval(function(){
                    var messages = browser._f_message_bridge.querySelectorAll('.to_page');    
                    var length = messages.length;

                    if (length > 0) {
                        for(var i=0; i<length; i++) {
                            var msg = messages[i].innerHTML;                            
                            msg = msg[0] == '{' ? JSON.parse(msg) : msg;
                            browser._f_message_bridge.removeChild(messages[i]);

                            browser._listeners.forEach(function(fn) {
                                fn(msg, browser);                
                            })
                        }
                    }
                }, 50);

                browser.onReady();

                console.log("Document:", document.body.className, browser.page_type);
        
                if (browser.page_type == "popup") {
                    var l = function (evt) {
                        if (evt === undefined || evt.target.parentNode.id != "ff_message_bridge") {
                            console.log("Sending resize message");

                            browser.postMessage({
                                _api: true,
                                method: 'popupResize', 
                                width: document.body.offsetWidth,
                                height: document.body.offsetHeight
                            });
                        }
                    }
                    
                    l();
                    document.addEventListener('DOMContentLoaded', l, false);
                    document.addEventListener('DOMNodeInserted', l, false);
                    document.addEventListener('DOMNodeRemoved', l, false);
                }
            };

            waitForDispatcher();            
        },
        
        _s_addMessageListener: function(listener) {
            browser._listeners.push(listener);
            
            if (browser._listener_initialized) {
                return;
            } else {
                browser._listener_initialized = true;
            }
            
            if (browser.isBackgroundPage) {               
                safari.application.addEventListener("message", function(event) {
                    var sender = event.target.page ? event.target.page : event.target.tab;
                                        
                    if (event.name == "_message") {
                        console.log("Received message", event, browser.isBackgroundPage);
                        
                        if (event.message.method == "loadRecources") {
                            var recources = browser.getRecourcesForPage(event.target.url);                        
                            
                            sender.dispatchMessage("_message", {
                                method: 'loadRecources',
                                scripts: recources.scripts,
                                styles: recources.styles
                            });                    
                        } else {
                            browser._listeners.forEach(function(fn) {
                                fn(event.message, sender);                
                            });                 
                        }
                    } else if (event.name == "connect") {
                        console.log("Script connected to background page: ", event.target);
                        
                        browser.connected_ports.push(event.target.page ? event.target.page : event.target.tab);
                        
                        sender.dispatchMessage("connected");
                    }                
                }, false);                       
                
                safari.application.addEventListener("command", function(event) {
                    console.log("Received command", event);
                    
                    if (event.command == "toggle_popup") {
                        safari.application.activeBrowserWindow.activeTab.page.dispatchMessage("toggle_popup", {popup_url: browser.config.browser_action.popup});
                    }
                }, false);                        
                
                browser.onReady();
            } else {
                safari.self.addEventListener("message", function(event) {
                    if (event.name == "_message") {
                        browser._listeners.forEach(function(fn) {
                            fn(event.message, event.source);
                        }); 
                    } else if (event.name == "connected") {   
                        console.log("Connected to background page");
                        
                        browser.onReady();                                
                    }                
                }, false);                
                
                // In page is iframe (safair popup emulation), don't initialize it two times
                if (window.top == window) {            
                    browser.connected_ports.push(safari.self.tab);
                    safari.self.tab.dispatchMessage("connect");
                } else {
                    browser.onReady();
                    
                    var listener = function () {
                        window.top.postMessage({
                            method: 'popup_resize', 
                            width: document.body.offsetWidth,
                            height: document.body.offsetHeight
                        }, '*');
                    }
                                        
                    document.addEventListener('DOMNodeInserted', listener, false);
                    document.addEventListener('DOMNodeRemoved', listener, false);
                }
            }		
        },

        _background_page: null,	
        
        _o_addMessageListener: function(listener) {
            browser._listeners.push(listener);
            
            if (browser._listener_initialized) {
                return;
            } else {
                browser._listener_initialized = true;
            }
            
            // if background page
            if (browser.isBackgroundPage) {                
                opera.extension.onconnect = function(event){
                    event.source.postMessage({
                        method: 'connected', 
                        source:'background', 
                        config: browser.config, 
                        extension_url: browser.extension_url
                    });
                    opera.postError("sent message to popup");
                }
                
                opera.extension.onmessage = function(event) {
                    console.log("Background::Received message: ", JSON.stringify(event.data));
                     
                    if (typeof(event.data) == 'object' && event.data.method == 'loadRecources') {                    
                        var recources = browser.getRecourcesForPage(event.origin);

                        console.log("Recources:", recources);

                        event.source.postMessage({
                            method: 'loadRecources',
                            scripts: recources.scripts,
                            styles: recources.styles
                        });
                    } else if (typeof(event.data) == 'object' && event.data.method == 'popupSize') {
                        if (browser._o_toolbarButton) {
                            browser._o_toolbarButton.popup.height = event.data.height;
                            browser._o_toolbarButton.popup.width = event.data.width;
                        }
                    } else {
                        browser._listeners.forEach(function(fn) {
                            fn(event.data, event.source);
                        });
                    }
                }
                
                browser.onReady();
            } else {
                opera.extension.onmessage = function(event) {                        
                    console.log("Script::Received message: ", JSON.stringify(event.data));
                    if (typeof(event.data) == 'object' && event.data.method == 'connected' && event.data.source == 'background') {
                        browser._background_page = event.source;
                        browser.config = event.data.config;
                        
                        browser.onReady();
                    } else {
                        browser._listeners.forEach(function(fn) {
                            fn(event.data, event.source);
                        });
                    }
                }
                if (browser.getPageType() === "popup") {
                    function listener() {
                        if (document.body.previousClientHeight !== document.body.clientHeight ||
                            document.body.previousClientWidth  !== document.body.clientWidth) {
                            browser.postMessage({ method: 'popupSize', width: document.body.clientWidth, height: document.body.clientHeight });

                            document.body.previousClientHeight = document.body.clientHeight;
                            document.body.previousClientWidth = document.body.clientWidth;
                        }
                    }
                    
                    document.addEventListener('DOMNodeInserted', listener, false);
                    document.addEventListener('DOMNodeRemoved', listener, false);
                }
            }	
        },

        postMessage: function(message, dest, callback) {
            if (dest && !browser.isFirefox) {
                message.__id = new Date().getTime();

                console.log("Posting message ", message, " to ", dest);
            
                browser.isSafari ? dest.dispatchMessage("_method", message) : dest.postMessage(message);            
            } else {
                browser.broadcastMessage(message, callback);
            }
        },

        broadcastMessage: function(message, callback) {
            message.__id = new Date().getTime();

            if (browser.isChrome) {
                var length = browser.connected_ports.length;

                for(var i=0; i<length; i++) {
                    browser.connected_ports[i].postMessage(message);
                }
            } else if (browser.isOpera) {
                if (browser.isBackgroundPage) {
                    opera.extension.broadcastMessage(message);
                } else {
                    browser._background_page.postMessage(message);
                }
            } else if (browser.isSafari) {
                if (browser.isBackgroundPage) {
                    var length = browser.connected_ports.length;

                    for(var i=0; i<length; i++) {
                        browser.connected_ports[i].dispatchMessage("_message", message);
                    }                
                } else {
                    safari.self.tab.dispatchMessage("_message", message);
                }
            } else if (browser.isFirefox) {
                if (!browser._f_message_bridge)
                    return setTimeout(function(){ browser.broadcastMessage(message) }, 50);
                
                if (callback) {
                    console.log("Adding message listener", message);

                    if (!message.event_listener)
                        message.reply = true;

                    var l = function(_msg, _sender) {
                        if (_msg.__id === message.__id) {
                            callback(_msg, _sender);

                            if (!message.event_listener) {
                                console.log("Deleting message listener:", _msg);
                                var idx = browser._listeners.indexOf(l);                            
                                browser._listeners.splice(idx, 1);
                            }
                        }
                    }              
                    
                    browser.addMessageListener(l);
                }

                var _m = document.createElement('textarea');
                _m.className = 'from_page';
                _m.innerHTML = typeof(message) == "string" ? message : JSON.stringify(message);
                browser._f_message_bridge.appendChild(_m);                                
            }
        },

        _files_cache: [],

        _readLocalFile: function(file, callback){
            if (browser._files_cache[file]) {
                if (browser._files_cache[file] != 'loading' && callback) {
                    callback(browser._files_cache[file]);
                }
                
                return;
            } else {
                browser._files_cache[file] = 'loading'
            }

            if (browser.isOpera) {
                browser.extension_url = "widget://" + document.location.host;
            } else if (browser.isChrome) {
                browser.extension_url = chrome.extension.getURL("/");
            } else if (browser.isSafari) {
                browser.extension_url = safari.extension.baseURI.slice(0, -1);
            }

            var xhr = new XMLHttpRequest();
            xhr.open('GET', browser.extension_url + file, true);
            xhr.send(null);

            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4){
                    browser._files_cache[file] = xhr.responseText;
                    
                    console.log("Caching file " + file);

                    if (callback) {
                        callback(xhr.responseText);
                    }
                }
            }
        },

        loadConfiguration: function(callback){
            browser._readLocalFile("/manifest.json", function(response){
                browser.config = JSON.parse(response);
                console.log("Browser configuration:", browser.config);

                callback.call();
            });
        },    

        // Used for Opera and Safari
        _cacheMediaFiles: function(){
            var content_scripts = browser.config.content_scripts;

            for(var i=0; i<content_scripts.length; i++) {
                if (content_scripts[i].js) {
                    for(var j=0; j<content_scripts[i].js.length; j++) {
                        browser._readLocalFile('/'+content_scripts[i].js[j]);
                    }
                }
                
                if (content_scripts[i].css) {
                    for(var c=0; c<content_scripts[i].css.length; c++) {                
                        browser._readLocalFile('/'+content_scripts[i].css[c]);
                    }
                }
            }
        },
            
        _initializePopup: function() {
            if (!browser.isOpera) return;
            
            if (browser.config.browser_action) {
                var ToolbarUIItemProperties = {
                    disabled: false,
                    title: browser.config.browser_action.default_title,
                    icon: browser.config.browser_action.default_icon,
                    popup: {
                        href: browser.config.browser_action.popup,
                        height: 100
                    },

                    badge: {
                        display: "block",
                        color: "white",
                        backgroundColor: "rgba(211, 0, 4, 1)"
                    }
                };

                var theButton = opera.contexts.toolbar.createItem(ToolbarUIItemProperties);
                opera.contexts.toolbar.addItem(theButton);

                browser._o_toolbarButton = theButton;
            }
        }
    }
    
    browser.getPageType();

    if (browser.isBackgroundPage) {
        setTimeout(function() {
            browser.loadConfiguration(function() {
                if (browser.isOpera) {
                    browser._initializePopup();
                    browser._cacheMediaFiles();
                } else if (browser.isSafari) {
                    browser._cacheMediaFiles();
                }
            });
        }, 100);
    }

    document.getElementsByTagName('html')[0].className += " " + (function(){         
        return browser.isChrome ? "chrome" :
               browser.isSafari ? "safari" :
               browser.isOpera ? "opera" :
               "";
    }())
    
    window.browser = browser;
}(window));                    
