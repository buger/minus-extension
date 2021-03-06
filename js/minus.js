(function(window, undefined) {     
    var API_KEY = 'fcebde22e53231ef95aa7238ef8dad';
    var API_SECRET = 'b7b508ce60e4026292de30afd7cdce';
    var API_TOKEN, API_USER;

    var emptyFunc = function(){};

    function clone(obj){
        if(obj == null || typeof(obj) != 'object')
            return obj;

        var temp = obj.constructor(); // changed

        for(var key in obj)
            temp[key] = clone(obj[key]);

        return temp;
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
    
    if (XMLHttpRequest && !XMLHttpRequest.prototype.sendAsBinary) { 
        XMLHttpRequest.prototype.sendAsBinary = function(datastr) {
            if (window.chrome) {
                if (window.BlobBuilder) {
                    var bb = new BlobBuilder();
                } else {
                    var bb = new window.WebKitBlobBuilder();
                }

                var data = new ArrayBuffer(datastr.length);
                var ui8a = new Uint8Array(data, 0);
                for (var i=0; i<datastr.length; i++) {
                        ui8a[i] = (datastr.charCodeAt(i) & 0xff);
                }
                bb.append(data);
                var blob = bb.getBlob();
                this.send(blob);
            } else {                                
                return this.send(ords);
                
                function byteValue(x) {
                    return x.charCodeAt(0) & 0xff;
                }
                var ords = Array.prototype.map.call(datastr, byteValue);               
                
                var ui8a = new Uint8Array(ords);

                this.send(ui8a.buffer);
            }
        }
    }

    function Ajax(url, options) { 
        if (!options) options = {};
        if (!options.params) options.params = {};
        if (!options.method) options.method = 'GET';

        var xhr = function() {
            if (typeof XMLHttpRequest === 'undefined') {
                XMLHttpRequest = function() {
                    try { return new ActiveXObject("Msxml2.XMLHTTP.6.0"); }
                        catch(e) {}
                    try { return new ActiveXObject("Msxml2.XMLHTTP.3.0"); }
                        catch(e) {}
                    try { return new ActiveXObject("Msxml2.XMLHTTP"); }
                        catch(e) {}
                    try { return new ActiveXObject("Microsoft.XMLHTTP"); }
                        catch(e) {}
                    throw new Error("This browser does not support XMLHttpRequest.");
                };
            }

            return new XMLHttpRequest();
        }();           
        
        if (API_TOKEN && url.match(/minus.com/))
            options.params['bearer_token'] = API_TOKEN;

        if (options.binaryData || options.method === "GET" && options.params) {
            
            if (hashToQueryString(options.params))
                url += (url.match(/\?/) ? "&" : "?") + hashToQueryString(options.params);
        }
        
        xhr.open(options.method, url, true);  

        xhr.onreadystatechange = function(){
            if (xhr.readyState == 4) {
                                
                console.log(url, xhr.status, xhr);

                // Parse response if it contains JSON string
                var response = xhr.responseText[0] === '{' ? (function(){
                                                                 return window.JSON && window.JSON.parse ?
                                                                    window.JSON.parse(xhr.responseText) :
                                                                    (new Function("return "+xhr.responseText))()
                                                             }()) :
                                                             xhr.responseText;

                if (xhr.status == 200) {
                    (options.onSuccess || emptyFunc)(response, xhr);
                } else {
                    (options.onError || emptyFunc)(response, xhr);
                }
            }
        }
        
        // Setting Request headers
        if (!options.headers) options.headers = {};        

        if (!options.headers["Content-Type"] && options.method === "POST") {
            options.headers["Content-Type"] = "application/x-www-form-urlencoded";
        }

        for (key in options.headers) {
            if (options.headers.hasOwnProperty(key)) {
                xhr.setRequestHeader(key, options.headers[key]);
            }
        }
        
        if (options.mime_type) xhr.overrideMimeType(options.mime_type);        

        if (options.onProgress) {
            upload = xhr.upload;
            upload.addEventListener("progress", function (ev) {
                if (ev.lengthComputable) {
                    options.onProgress((ev.loaded / ev.total) * 100);
                }
            }, false);
        }
        
        // Sending data
        if (options.method === "POST" && (options.params || options.binaryData)) {
            if (options.binaryData) {
                xhr.sendAsBinary(options.binaryData);
            } else {
                xhr.send(hashToQueryString(options.params));
            }
        } else {
            xhr.send(null);
        }

        return xhr;
    };


    var Minus = {
        prefix: 'http://minus.com/api/v2/'
    }   

    Minus.Ajax = Ajax;

    Minus.callMethod = function(method, options) {        
        if (options == undefined) {
            options = {}
        }

        var new_options = clone(options);

        new_options.onSuccess = function(resp, xhr){
            console.log("Method '%s' called succesefully", method, options, resp);
            
            (options.onSuccess || emptyFunc)(resp, xhr);        
        }

        new_options.onError = function(resp, xhr){
            console.log("Error while calling method '%s'", method, options);

            (options.onError || emptyFunc)(resp, xhr);        
        }

        return new Ajax(this.prefix + method, new_options);
    }

    Minus.createGallery = function(name, callback) {
        if (!name)
            name = "New Folder";

        this.callMethod('users/'+API_USER+"/folders", {
            method: "POST",
            params: {'name': name},
            onSuccess: callback,
            onError: function(resp) {
                callback({ error: "api_error", message: "Error while calling API method 'CreateGallery'" });
            }
        });
    }

    Minus.uploadItem = function(id, filename, mime, binaryData, callback, onProgress) {
                        
        filename = filename.replace(/\?.*/, '');
        
        if (!filename.match(/\.(gif|jpg|png)/)) {
            filename = filename + "." + mime.split('/')[1];
        }

        filename = filename.replace(/^\./,'Untitled');
    
        var boundary = '---------------------------';
        boundary += Math.floor(Math.random()*32768);
        boundary += Math.floor(Math.random()*32768);
        boundary += Math.floor(Math.random()*32768);

        var data = '--' + boundary + "\r\n";
        data += 'Content-Disposition: form-data; name="file"; filename="' + filename + '"' + "\r\n";
        data += 'Content-Type: ' + mime + "\r\n\r\n";
        data += binaryData;
        data += "\r\n" + '--' + boundary + "\r\n";

        data += 'Content-Disposition: form-data; name="caption"\r\n';        
        data += 'Content-Transfer-Encoding: quoted-printable\r\n';
        data += 'Content-Type: text/plain; charset=UTF-8\r\n'
        data += "\r\n";
        data += filename;
        data += "\r\n" + '--' + boundary + "\r\n";
        data += 'Content-Disposition: form-data; name="filename"\r\n';
        data += 'Content-Transfer-Encoding: quoted-printable\r\n';
        data += 'Content-Type: text/plain; charset=UTF-8\r\n';
        data += "\r\n";
        data += filename
        data += "\r\n" + '--' + boundary + '--'
        data += "\r\n";

        this.callMethod('folders/'+id+'/files', {
            method: "POST",
            headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
            binaryData: data,            
            onSuccess: callback,
            onError: function(resp) {
                callback({ error: "api_error", message: "Error while calling API method 'UploadItem'" });
            },

            onProgress: onProgress
        });
    }
    
    // Firefox version
    function getImageFromURL(url) { 
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

      return file_data; 
    }

    Minus.getFileHeader = function(url, callback) {
        var head = new Ajax(url, {
            method: "HEAD",

            onSuccess: function() {
                callback({
                    size: parseInt(head.getResponseHeader('Content-Length')),                  
                    mime: head.getResponseHeader("Content-Type")
                });
            }
        });
    }

    Minus.uploadItemFromURL = function(url, editor_id, callback, progress) {
        if (!callback)
            callback = emptyFunc;
        
        var filename = url.substring(url.lastIndexOf("/")+1);

        Minus.getFileHeader(url, function(headers){                           
            if (navigator.userAgent.match('Firefox') != undefined) {
                var bData = getImageFromURL(url);
                Minus.uploadItem(editor_id, filename, headers.mime, bData, callback);
            } else {
                var data = new Ajax(url, {
                    mime_type: 'text/plain; charset=x-user-defined',
                    onSuccess: function() {
                        Minus.uploadItem(editor_id, filename, headers.mime, data.responseText, callback, progress);
                    }
                });
            }
        });
    }

    Minus.timeline = function(username, type, page, callback) {
        if (!page)
            page = 1;
        
        this.callMethod('users/'+username+'/folders', {
            params: { page: page },
            onSuccess: function(resp) {
                for (var i=0; i<resp.results.length; i++) {
                    resp.results[i].creator_name = resp.results[i].creator.match(/\w+$/)[0];

                    resp.results[i].time_ago = new Date(new Date() - resp.results[i].last_updated_ago*1000).toISOString();
                }

                callback(resp);
            },
            onError: function(resp) {                
                callback({ error: "api_error", message: "Error while calling API method 'MyGalleries'" });
            }
        });
    }

    Minus.activeUser = function(callback) {
        this.callMethod('activeuser', {
            onSuccess: function(resp) {
                Minus.setUser(resp.username);

                callback(resp);
            },
            onError: callback
        });
    }

    Minus.registerUser = function(username, password, email, callback) {
        var params = {
            'username': username,
            'password1': password,
            'password2': password,
            'email': email
        }

        new Ajax("https://minus.com/api/login/register", {
            method: "POST",

            params: params,

            onSuccess: function(response) {
                callback(response);
            },

            onError: function(response) {
                callback({ success: false });
            }
        });        
    }


    Minus.oauthToken = function(username, password, callback) {
        var params = {
            'grant_type': 'password',
            'client_id': API_KEY,
            'client_secret': API_SECRET,
            'scope': 'read_all modify_all upload_new',
            'username': username.trim(),
            'password': password.trim()
        }

        new Ajax("https://minus.com/oauth/token", {
            params: params,

            onSuccess: function(response) {
                Minus.setToken(response.access_token);

                callback(response);
            },

            onError: function(response) {
                callback({ error: 'not_logged' });
            }
        });
    }
    
    Minus.refreshToken = function(refresh_token, callback) {
        var params = {
            'grant_type': 'refresh_token',
            'client_id': API_KEY,
            'client_secret': API_SECRET,
            'refresh_token': refresh_token,
            'scope': 'read_all modify_all upload_new'
        }

        new Ajax("https://minus.com/oauth/token", {
            params: params,

            onSuccess: function(response) {
                Minus.setToken(response.access_token);

                callback(response);
            },

            onError: function(response) {
                callback({ error: 'wrong_token' });
            }
        });               
    }

    Minus.setToken = function(token) {
        API_TOKEN = token;
    }

    Minus.setUser = function(user) {
        API_USER = user;
    }

    // Make it Global
    window.Minus = Minus;
}(window));
