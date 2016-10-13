//<syntaxhighlight lang="javascript">
/*
 * Script: RecentChangesMultiple
 * Author: Fewfre
 *
 * Uses ajax loading to view the Special:RecentChanges of multiple wikis all on one page.
 */

//######################################
// Main - Start script and store static values.
//######################################
(function($, document, mw, module, i18n, RCMManager, Utils){
	"use strict";

	// Double check that script can run; should always be true due to loader, but check is here just encase.
	if(document.querySelectorAll('.rc-content-multiple, #rc-content-multiple')[0] == undefined) { console.log("RecentChangesMultiple tried to run despite no data. Exiting."); return; }

	// Storage
	module.version = "1.2.9b";
	module.lastVersionDateString = "Thu Oct 13 2016 00:39:12 GMT-0400 (Eastern Standard Time)";
	module.debug = module.debug != undefined ? module.debug : false;
	
	module.AUTO_REFRESH_LOCAL_STORAGE_ID = "RecentChangesMultiple-autorefresh-" + mw.config.get("wgPageName");
	module.OPTIONS_SETTINGS_LOCAL_STORAGE_ID = "RecentChangesMultiple-saveoptionscookie-" + mw.config.get("wgPageName");
	module.FAVICON_BASE = module.FAVICON_BASE || "http://www.google.com/s2/favicons?domain="; // Fallback option (encase all other options are unavailable)
	module.LOADER_IMG = module.LOADER_IMG || "http://slot1.images.wikia.nocookie.net/__cb1421922474/common/skins/common/images/ajax.gif";
	module.NOTIFICATION_ICON = module.NOTIFICATION_ICON || "http://vignette1.wikia.nocookie.net/fewfre/images/4/44/RecentChangesMultiple_Notification_icon.png/revision/latest?cb=20161013043805";

	module.rcmList = [];
	module.uniqID = 0;
	module.langLoaded = false;
	module.onLangLoadCallbacks = [];
	module.numLangLoadErrors = 0;
	// Custom parameter defaults
	module.useLocalSystemMessages = true; // In miliseconds
	module.loadDelay = 10; // In miliseconds
	module.rcParamsURL = null; // See below

	// Should only be called once at the end of this script.
	module.start = function() {
		// Find module wrappers
		var tWrappers = document.querySelectorAll('.rc-content-multiple, #rc-content-multiple');

		/***************************
		 * Setup
		 ***************************/
		// Load the css for module
		Utils.newElement("link", { rel:"stylesheet", type:"text/css", href:"/load.php?mode=articles&articles=u:dev:RecentChangesMultiple/stylesheet.css&only=styles" }, document.head);

		var tDataset = tWrappers[0].dataset;

		i18n.init(tDataset.lang);

		// Set load delay (needed for scripts that load large numbers of wikis)
		if(tDataset.loaddelay) { module.loadDelay = tDataset.loaddelay; }
		if(tDataset.localsystemmessages === "false") { module.useLocalSystemMessages = false; }

		// Unless specified, hide the rail to better replicate Special:RecentChanges
		if(tDataset.hiderail !== "false") {
			document.querySelector("body").className += " rcm-hiderail";
		}

		module.loadLangMessages();

		tDataset = null;

		/***************************
		 * Get rcParams from url
		 ***************************/
		module.rcParamsURL = {};

		var tUrlVars = {}
		var parts = window.location.href.split("#")[0].replace( /[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value){tUrlVars[key] = value;} );
		for(var param in tUrlVars) {
			if(param == "limit" || param == "days") {
				module.rcParamsURL[param] = parseInt(tUrlVars[param]);
			}
			if(param == "hideminor" || param == "hidebots" || param == "hideanons" || param == "hideliu" || param == "hidemyself" || param == "hideenhanced" || param == "hidelogs") {
				module.rcParamsURL[param] = tUrlVars[param]=="1";
			}
			if(param == "debug") { module.debug = (tUrlVars[param]=="true"); }
		}

		/***************************
		 * Start App
		 ***************************/
		Utils.forEach(tWrappers, function tRCM_start_createRCMs(pNode, pI, pArray){
			module.rcmList.push( new RCMManager(pArray[pI], pI).init() );
		});

		tWrappers = null;

		// This does things like allow "fieldset" to collapse in RCMOptions
		mw.loader.load( 'mediawiki.special.recentchanges' );

		// // For Testing CSS
		// Utils.newElement("style", { innerHTML:""
		// 	+""
		// +"" }, document.body);

		var refreshAllButton = document.querySelector(".rcm-refresh-all");
		if(refreshAllButton) {
			refreshAllButton.addEventListener("click", function(){
				for(i = 0; i < module.rcmList.length; i++) {
					module.rcmList[i].refresh();
				}
			});
		}
	}

	module.unload = function() {
		// for(i = 0; i < module.rcmList.length; i++) {
		// 	// Something on things seems to lag the page.
		// 	// module.rcmList[i].dispose();
		// 	module.rcmList[i] = null;
		// }
		// module.rcmList = null;
		// i18n = null;
	}

	// Replace all RC_TEXT with that of the language specified.
	// TODO: Should probably have support to check if it ran into loading issues.
	module.loadLangMessages = function() {
		var tLangLoadAjaxPromises = [];

		// Loads the messages and updates the i18n with the new values (max messages that can be passed is 50)
		function tRCM_loadLangMessage(pMessages) {
			var tScriptPath = module.useLocalSystemMessages ? mw.config.get("wgServer") + mw.config.get('wgScriptPath') : "http://community.wikia.com";
			var url = tScriptPath + "/api.php?action=query&format=json&meta=allmessages&amlang="+i18n.defaultLang+"&ammessages="+pMessages;
			if(module.debug) { console.log(url.replace("&format=json", "&format=jsonfm")); }

			return $.ajax({ type: 'GET', dataType: 'jsonp', data: {}, url: url,
				success: function(pData){
					if (typeof pData === 'undefined' || typeof pData.query === 'undefined') return; // Catch for wikis that restrict api access.
					$.each( (pData.query || {}).allmessages, function( index, message ) {
						if( message.missing !== '' ) {
							i18n.MESSAGES[message.name] = message['*'];
						}
					});
				}
			});
		}

		// Loads messages in increments of 50.
		var tMessages = "", tNumLoading = 0;
		Object.keys(i18n.MESSAGES).forEach(function (key) {
			tMessages += (tNumLoading > 0 ? "|" : "")+key
			tNumLoading++;
			if(tNumLoading >= 50) {
				tLangLoadAjaxPromises.push(tRCM_loadLangMessage(tMessages));
				tMessages = "";
				tNumLoading = 0;
			}
		}, this);
		// Load last group of messages (if there are any)
		if(tMessages != "") {
			tLangLoadAjaxPromises.push(tRCM_loadLangMessage(tMessages));
		}

		// When loading of all translated messages is done (or one failed) do this.
		$.when.apply($, tLangLoadAjaxPromises)
		.done(function(pData){
			module.langLoaded = true;

			for (var i = 0; i < module.onLangLoadCallbacks.length; i++) {
				module.onLangLoadCallbacks[i]();
			}
			module.onLangLoadCallbacks = [];
		})
		.fail(function(pData){
			var tNumTries = 15;
			if(module.numLangLoadErrors < tNumTries) {
				module.numLangLoadErrors++;
				module.loadLangMessages();
			} else {
				console.log("ERROR: "+JSON.stringify(data));
				alert("ERROR: RecentChanges text not loaded properly ("+tNumTries+" tries); defaulting to English.");
				module.langLoaded = true;
				for (var i = 0; i < module.onLangLoadCallbacks.length; i++) {
					console.log(module.onLangLoadCallbacks[i]);
					module.onLangLoadCallbacks[i]();
				}
				module.onLangLoadCallbacks = [];
			}
		})
		;
	}
	
	/***************************
	* Call to blink the window title (only while window doesn't have focus).
	****************************/
	var _blinkInterval, _originalTitle;
	module.blinkWindowTitle = function(pTitle) {
		module.cancelBlinkWindowTitle();
		_originalTitle = document.title;
		_blinkInterval = setInterval(function(){
			document.title = document.title == _originalTitle ? (pTitle+" - "+_originalTitle) : _originalTitle;
			if(document.hasFocus()) { module.cancelBlinkWindowTitle(); }
		}, 1000);
	}
	module.cancelBlinkWindowTitle = function() {
		if(!_blinkInterval) { return; }
		clearInterval(_blinkInterval);
		_blinkInterval = null;
		document.title = _originalTitle;
	}
	
	/***************************
	* Manage Notifications
	****************************/
	var _notifications = [];
	module.addNotification = function(pTitle, pOptions) {
		if(Notification.permission !== "granted") { return; }
		pOptions = pOptions || {};
		pOptions.icon = pOptions.icon || module.NOTIFICATION_ICON;
		_notifications.push(new Notification(pTitle, pOptions));
		if(_notifications.length > 1) {
			_notifications.shift().close();
		}
	}
	
	$(window).focus(function(){
		// Remove all notifications
		for(var i = 0; i < _notifications.length; i++) {
			_notifications[i].close();
		}
		_notifications = [];
		
		// Update "previously loaded" messages
		for(var i = 0; i < module.rcmList.length; i++) {
			module.rcmList[i].lastLoadDateTime = module.rcmList[i].lastLoadDateTimeActual;
		}
	});

	$(document).ready(module.start);
	$(document).unload(module.unload);
})(window.jQuery, document, window.mediaWiki, window.dev.RecentChangesMultiple, window.dev.RecentChangesMultiple.i18n, window.dev.RecentChangesMultiple.RCMManager, window.dev.RecentChangesMultiple.Utils);
//</syntaxhighlight>
