var {Cc, Ci, Cu} = require("chrome");
var data = require('self').data;	
var windows = require('windows');
var tabs = require('tabs');
var cm = require("context-menu");
var panel = require("panel");
var xulApp = require('xul-app');
var ss = require("simple-storage");
var storage = ss.storage;
var captureData = {};
var optionsPanel;
var popupPanel;

var mediator = Cc['@mozilla.org/appshell/window-mediator;1']
	.getService(Ci.nsIWindowMediator);
var AddonManager = Cu.import("resource://gre/modules/AddonManager.jsm").AddonManager;

function closePanel() {
	optionsPanel.hide();
}

function getTimeStamp() {
	var y, m, d, h, M, s; 
	var time = new Date();
	y = time.getFullYear();
	m = time.getMonth()+1;
	d = time.getDate();
	h = time.getHours();
	M = time.getMinutes();
	s = time.getSeconds();
	if (m < 10) m = '0' + m;
	if (d < 10) d = '0' + d;
	if (h < 10) h = '0' + h;
	if (M < 10) M = '0' + M;
	if (s < 10) s = '0' + s;
	return 	y + '-' + m + '-' + d + ' ' + h + '-' + M + '-' + s;
}


function capture(option) {
	var window = mediator.getMostRecentWindow("navigator:browser").gBrowser.contentWindow;
	var document = window.document;
	var html = document.documentElement;
	var w, h, x, y;
	switch(option) {
	case 'visible':
		x = 0;
		y = html.scrollTop;
		w = html.clientWidth;
		h = html.clientHeight;
		break;
	case 'full':
		x = y = 0;        
		w = html.scrollWidth;
		h = html.scrollHeight;
		break;
	}
	
	var canvas = document.createElement('canvas');
	canvas.width = w; 
	canvas.height = h; // need refinement
	canvas.style.display = 'none';
	document.body.appendChild(canvas);
	
	var ctx = canvas.getContext("2d");
	ctx.drawWindow(window, x, y, w, h, 'rgb(255, 255, 255)');
	
	captureData = {
		data: canvas.toDataURL(),
		taburl: window.location.href,
		tabtitle: document.title,
		w: w, h:h
	};	
    
    if (storage.data.edit_image) {
	    tabs.open({url: data.url('edit_image.html')});

        return false;
    } else {
        return true;
    }
}

function getCaptureData() {
	return captureData;
}

function createKeySet(doc) {
	var keyset = doc.createElement('keyset');
	var visibleKey = doc.createElement('key');
	
	visibleKey.setAttribute('id', 'visibleKey');
	visibleKey.setAttribute('modifiers', 'control shift');
	visibleKey.setAttribute('key', 'V');
	visibleKey.setAttribute('oncommand', 'capture(\'visible\')');
	
	keyset.appendChild(visibleKey);
	return keyset;
}

function createMenuPopup(doc) {
	var menupopup = doc.createElement('menupopup');
	var visibleItem = doc.createElement('menuitem');
	var entireItem = doc.createElement('menuitem');
	
    menupopup.setAttribute('class', 'minus-screenshot-menupopup');
	visibleItem.setAttribute('data-option', 'visible');
	entireItem.setAttribute('data-option', 'full');
	visibleItem.setAttribute('class', 'menuitem-iconic');
	entireItem.setAttribute('class', 'menuitem-iconic');
	visibleItem.setAttribute('label', 'Capture Visible Part');
	entireItem.setAttribute('label', 'Capture Full page');
	//visibleItem.setAttribute('image', data.url('img/visible.png'));
	//entireItem.setAttribute('image', data.url('img/entire.png'));
	visibleItem.setAttribute('key', 'visibleKey');
	
	var separator = doc.createElement('menuseparator');
	
	var options = doc.createElement('menuitem');
	options.setAttribute('data-option', 'options');
	options.setAttribute('label', 'Options');
	
	menupopup.appendChild(visibleItem);
	menupopup.appendChild(entireItem);
	menupopup.appendChild(separator);
	menupopup.appendChild(options);
	return menupopup;
}

function prepareKeys(doc, container) {
	//container.appendChild(createKeySet(doc));
	doc.addEventListener('keyup', function(e) {
		//console.log(e.keyCode);
	}, false);
}
// called by addToolbarButton and addContextMenu
function prepareMenu(doc, container, wrapper) { 
	container.appendChild(wrapper);
	wrapper.appendChild(createMenuPopup(doc));
	
	// maybe change to menupopup
	wrapper.addEventListener('mousedown', function(e) {
		var target = e.target; 
		// XULElement don't have parentElement property, so we use parentNode
		if (/minus-screenshot-menupopup/.test(target.parentNode.className) 
			&& e.which===1) {
			
			var action = target.getAttribute('data-option');
			if (action==='options') {
				optionsPanel.show();
			} else {
				if (storage.data.username) {
					capture(action);
				} else {
					showPopup();
				}
			}
		}	
	}, false);
}

var toolbarbutton;

function showPopup() {
	popupPanel.show(toolbarbutton);
}

function getPopup() {
	return popupPanel;
}

function showOptions() {
	optionsPanel.show();	
}

function addToolbarButton(doc) {
	var addonBar = doc.getElementById("nav-bar");
	if (!addonBar) return;
	
    toolbarbutton = doc.createElement("toolbarbutton"); 	
	
	var id = toolbarbutton.id = 'minus-screenshot-toolbarbutton';
	toolbarbutton.setAttribute('type', 'panel');
	toolbarbutton.setAttribute('class', 'toolbarbutton-1 chromeclass-toolbar-additional');
	toolbarbutton.setAttribute('image', data.url('images/logo16.png'));
	toolbarbutton.setAttribute('orient', 'horizontal');
	toolbarbutton.setAttribute('label', 'Minus - Share simply');
	
	doc.defaultView.addEventListener("aftercustomization", function() {
		var as = doc.getElementById(id);
		storage.customize = {
			parent: as ? as.parentNode.id : null,
			next: as ? as.nextSibling.id : null
		};
	}, false);
	
	//prepareKeys(doc, addonBar);
	//prepareMenu(doc, addonBar, toolbarbutton);
    
	addonBar.appendChild(toolbarbutton);
    
    toolbarbutton.onclick = function(evt) {
        showPopup();
    }

	doc.getElementById("navigator-toolbox").palette.appendChild(toolbarbutton);
	
	var parent = storage.customize.parent;
	var next = storage.customize.next;
	if (parent) doc.getElementById(parent).insertItem(id, doc.getElementById(next), null, false);
}

function startToolbarAnimation() {
    var win = mediator.getMostRecentWindow("navigator:browser");
    var toolbarbutton = win.document.getElementById('minus-screenshot-toolbarbutton');

	toolbarbutton.setAttribute('image', data.url('images/logo16_anim.gif'));
}

function stopToolbarAnimation() {
    var win = mediator.getMostRecentWindow("navigator:browser");
    var toolbarbutton = win.document.getElementById('minus-screenshot-toolbarbutton');

	toolbarbutton.setAttribute('image', data.url('images/logo16.png'));
}


function isPlatform(operationSystem){
    var win = mediator.getMostRecentWindow("navigator:browser");

    return win.navigator.userAgent.toLowerCase().indexOf(operationSystem) > -1;
}

function addShortcuts(win) {
	win.addEventListener('keyup', function(e) {
        // Send compose key like Ctrl + Alt + alphabetical-key to background.
        if ((e.ctrlKey && e.altKey && !isPlatform('mac') ||
             e.metaKey && e.altKey && isPlatform('mac')) &&
             e.which > 64 && e.which < 91) 
        {
			var menu = storage.options.shortcuts;

			switch(String.fromCharCode(e.which)) {
			// why the key is lowercase afte save it?
			case menu.visible.key.toUpperCase():
			    capture('visible');
				break;
			case menu.entire.key.toUpperCase():
				capture('full');
				break;
			}
		}
	}, false);
}

function addUI(win) {
	win = win || mediator.getMostRecentWindow("navigator:browser");
	var doc = win.document;
	
	addToolbarButton(doc);
	addShortcuts(win);
}
function removeUI(win) {
	var doc = win.document;
	
	var addonBar = doc.getElementById("nav-bar");
	var button = doc.getElementById("minus-screenshot-toolbarbutton");
	if (button) addonBar.removeChild(button);
}

function addAll() {
	var enumerator = mediator.getEnumerator(null);
	while(enumerator.hasMoreElements()) {
		addUI(enumerator.getNext());
	}
}
function removeAll() {
	var enumerator = mediator.getEnumerator(null);
	while(enumerator.hasMoreElements()) {
		removeUI(enumerator.getNext());
	}
}

var popup_width = 100, popup_height = 100;
function resizePopup(width, height) {
    if (popupPanel.isShowing) {            
        popupPanel.resize(width, height);
    } else {
        popupPanel.width = width;
        popupPanel.height = height;

        popup_width = width;
        popup_height = height;
    }
}

function init(capture) {
    popupPanel = panel.Panel({
	  	contentURL: data.url("popup.html"),
		width: 100, height: 100
	});

	AddonManager.addAddonListener({
		onDisabled: function(addon) {
			if (addon.id==='jid0-IqTRXaCOez4eRl9nE76oWp1G2iE@jetpack') {
				removeAll();
			}	
		}
	});
	windows.browserWindows.on('open', function(window) {
		addUI(null);
	});	
	removeAll();
	addAll();
	
	optionsPanel = panel.Panel({
	  	contentURL: data.url("options.html"),
		width: 700, height: 450
	});
}

exports.init = init;
exports.getCaptureData = getCaptureData;
exports.capture = capture;
exports.closePanel = closePanel;
exports.startToolbarAnimation = startToolbarAnimation;
exports.stopToolbarAnimation = stopToolbarAnimation;
exports.resizePopup = resizePopup;
exports.showPopup = showPopup;
exports.getPopup = getPopup;
exports.showOptions = showOptions;