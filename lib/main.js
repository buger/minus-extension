var self = require('self');		
var tabs = require('tabs');
var pageMod = require('page-mod');
var ui = require('ui');
var request = require('request');
var ss = require("simple-storage");
var cm = require("context-menu");
var storage = ss.storage;
var data = self.data;
var captureData;

var xhr = require('xhr');
var {Cc, Ci, Cu} = require("chrome");
var mediator = Cc['@mozilla.org/appshell/window-mediator;1']
	.getService(Ci.nsIWindowMediator);
var wnd = mediator.getMostRecentWindow("navigator:browser").wrappedJSObject;


function createGallery(callback) {
    request.Request({
        url: "http://minus.com/api/v2/users/"+storage.data.username+"/folders?bearer_token="+storage.data.access_token,

        content: { 'name': 'New Folder' },

        onComplete: function(resp) {
            callback(resp.json);
        }
    }).post();
}

function hashToQueryString(hash) {
    var params = [];

    for (key in hash) {
        if (hash.hasOwnProperty(key)) {
            params.push(key + "=" + hash[key]);
        }
    }

    return params.join('&');
}
 
function uploadItem(id, filename, mime, base64Data, callback) {
    if (base64Data.match(/^data\:/))
        var binaryData = wnd.atob(base64Data.replace(/^data\:image\/png\;base64\,/,''));
    else
        var binaryData = base64Data;

    filename = encodeURIComponent(filename.replace(/^\./,'Untitled')).slice(0,50) + ".png";

    var params = hashToQueryString({ 'bearer_token': storage.data.access_token });

    var boundary = '---------------------------';
    boundary += Math.floor(Math.random()*32768);
    boundary += Math.floor(Math.random()*32768);
    boundary += Math.floor(Math.random()*32768);

    var data = '--' + boundary + "\r\n";
    data += 'Content-Disposition: form-data; name="file"; filename="' + filename + '"';

    if (mime)
        data += "\r\n" + 'Content-Type: ' + mime;

    data += "\r\n";
    data += "\r\n";
    data += binaryData;
    data += "\r\n";
    data += "\r\n" + '--' + boundary + "\r\n";

    data += 'Content-Disposition: form-data; name="caption"';
    data += "\r\n";
    data += "\r\n";
    data += filename;
    data += "\r\n" + '--' + boundary + "\r\n";
    data += 'Content-Disposition: form-data; name="filename"';
    data += "\r\n";
    data += "\r\n";
    data += filename
    data += "\r\n" + '--' + boundary + '--'
    data += "\r\n";

    
    var url = "http://minus.com/api/v2/folders/"+id+"/files?"+params;

    var request;

    request = new xhr.XMLHttpRequest();
    request.open("POST", url, true);

    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            console.log("Status:", id, request.status, url, request.responseText);

            callback(id);
        }
    }
    request.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + boundary);
    
    request.sendAsBinary(data);    
}


// Download image data
function uploadImageFromUrl(url) {
    ui.startToolbarAnimation();

    var ioserv = Components.classes["@mozilla.org/network/io-service;1"]
               .getService(Components.interfaces.nsIIOService); 
    var channel = ioserv.newChannel(url, 0, null); 
    var stream = channel.open(); 

    if (channel instanceof Components.interfaces.nsIHttpChannel && channel.responseStatus != 200) { 
        return ""; 
    }

    var bstream = Components.classes["@mozilla.org/binaryinputstream;1"] 
                .createInstance(Components.interfaces.nsIBinaryInputStream); 
    bstream.setInputStream(stream); 

    var size = 0; 
    var file_data = ""; 
    while(size = bstream.available()) { 
        file_data += bstream.readBytes(size);
    } 

    createGallery(function (gallery) {
        uploadItem(gallery.id, url, null, file_data, function(){
            tabs.open({ url: 'http://minus.com/m'+ gallery.id });

            ui.stopToolbarAnimation();            
        })
    })
}


function extend(destination, source) {
    for (var property in source) {
        if (source.hasOwnProperty(property)) {
            destination[property] = source[property];
        }
    }
    return destination;
}

var workers = [];

function broadcastMessage(msg) {
    for (var i=0; i<workers.length; i++) {
        workers[i].postMessage(msg); 
    }
}

// edit
pageMod.PageMod({
	include: 'resource://*',
	contentScriptWhen: 'ready',
	contentScriptFile: [data.url("message_bridge.js")],

	onAttach: function(worker) {
        workers.push(worker);

		worker.on('message', function(msg) {
            console.log('LaLa Received message', msg.method);

            var reply = {}

			switch(msg.method) {
                case 'takeScreenshot':
                    if (ui.capture(msg.captureType)) {
                        console.log('Starting upload');

                        ui.startToolbarAnimation();

                        var callback = function(gallery_id) {
                            tabs.open({url: 'http://minus.com/m'+ gallery_id});                        
                            ui.stopToolbarAnimation();
                        }

                        captureData = ui.getCaptureData();

                        createGallery(function(gallery) {
                            console.log("Gallery:", JSON.stringify(gallery));

                            uploadItem(gallery.id, (captureData.tabtitle||"untitled"), "image/png", captureData.data, callback);
                        });
                    }
                    break;

                case 'getCaptureData':
                    reply = null;

                    captureData = ui.getCaptureData();
                    worker.postMessage({ 'message': { reply:true,  __id: msg.__id, response: captureData }});
                    break;

                case 'uploadScreenshot':
                    reply = null;
                    
                    ui.startToolbarAnimation();

                    var callback = function(gallery_id) {
                        tabs.open('http://minus.com/m'+ gallery_id);                        
                        worker.tab.close();
                        ui.stopToolbarAnimation();
                    }

                    if (!msg.gallery) {                        
                        createGallery(function(gallery) {
                            uploadItem(gallery.id, msg.title + ".png", "image/png", msg.imageData, callback);
                        });
                    } else {
                        uploadItem(msg.gallery, msg.title + ".png", "image/png", msg.imageData, callback);
                    }
                    break;

                case 'getSettings':
                    reply['settings'] = storage.options;

                    break;

                case 'updateSettings':
                    storage.options.shortcuts.visible.key = msg.settings.hotkey_visible;
                    storage.options.shortcuts.entire.key = msg.settings.hotkey_entire;

                    break;

                case 'popupResize':
                    console.log(msg.width, msg.height);
                    ui.resizePopup(msg.width, msg.height);
                    break;
                
                case 'updateStorage':
                    if (!storage.data)
                        storage.data = {};
                    
                    extend(storage.data, msg.data);

                    worker.postMessage({ 
                        'message': { 
                            reply:true,  
                            __id: msg.__id, 
                            response: storage.data
                        }
                    });
                    break;

                case 'activeTab':
                    worker.postMessage({ 
                        'message': { 
                            reply:true,  
                            __id: msg.__id, 
                            response: {
                                url: tabs.activeTab.url,
                                title: tabs.activeTab.title
                            }
                        }
                    });

                    break;

                case '_ajax':
                    console.log('received ajax message', JSON.stringify(msg));

                    reply = null;

                    var request = new xhr.XMLHttpRequest();
                    request.open(msg.httpOptions.method, msg.httpOptions.url, true);

                    request.onreadystatechange = function () {
                        if (request.readyState == 4) {                            
                            worker.postMessage({ 
                                'message': { 
                                    reply:true,  
                                    __id: msg.__id, 
                                    response: {
                                        status: 200,
                                        responseText: (request.responseText || "")
                                    }
                                }
                            });
                        }
                    }

                    if (msg.httpOptions.headers)
                        for (header in msg.httpOptions.headers) {
                            request.setRequestHeader(header, msg.httpOptions.headers[header]);
                        }

                    request.send(msg.httpOptions.data);

                    break;
			}

            if (reply)
                console.log("Sending reply", JSON.stringify(reply), msg.method);

                if (reply.url) {
                    request.Request({
                        url: reply.url, 
                        onComplete: function(response) {
                            console.log("response!", response.json, reply.url);

                            worker.postMessage({ 'message': { reply:true,  __id: msg.__id, response: response.json }});
                        }
                    }).get();                   
                } else {
                    worker.postMessage({ message: { reply:true, __id: msg.__id, response: reply }});
                }
		}); 
	}
});	

// options
function initOptions() {
	storage.options = {
		format:'png',
		shortcuts:{
			"visible":{"enable":false,"key":"V"},
			"entire":{"enable":false,"key":"H"}
		}
	};
}

function initCustomize() {
	storage.customize = {
		parent:'nav-bar',
		next:null
	};
}

function addContextMenu() {    
    cm.Item({
        label: "Upload to Minus",
        context: cm.SelectorContext("img"),
        contentScript: 
            'self.on("click", function (node, data) {' +
            '  self.postMessage(node.src);' +
            '});',

        onMessage: function (imgSrc) {
            var window = mediator.getMostRecentWindow("navigator:browser").gBrowser.contentWindow;
            var document = window.document;            
            
            if (storage.data.username)
                uploadImageFromUrl(imgSrc);
            else
                ui.showPopup();
        }
    });


    cm.Menu({
        label: "Minus",
        contentScript: 'self.on("click", function (node, data) {' +
                 '  self.postMessage(data)' +
                 '});',
        onMessage: function(msg) {
            if (msg === 'visible' || msg === 'full') {
                    if (storage.data.username)
                        ui.capture(msg);
                    else
                        ui.showPopup();
            } else if (msg === 'options') {
                ui.showOptions();
            }
        },
        items: [                        
            cm.Item({ 
                label: "Capture Visible Part", 
                data: "visible" }),
            cm.Item({ 
                label: "Capture Full Page", 
                data: "full",
            }),
            cm.Item({ 
                label: "Options", 
                data: "options",
            })
        ]
    })
}

addContextMenu()

if (!storage.options) initOptions();
if (!storage.customize) initCustomize();
ui.init();

ui.getPopup().on('show', function(){
    broadcastMessage({ message: { method:'popupOpen' } });
});