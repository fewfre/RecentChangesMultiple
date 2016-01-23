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
	
	// Statics
	module.version = "1.2.3";
	module.debug = module.debug != undefined ? module.debug : false;
	module.FAVICON_BASE = module.FAVICON_BASE || "http://www.google.com/s2/favicons?domain="; // Fallback option (encase all other options are unavailable)
	module.AUTO_REFRESH_LOCAL_STORAGE_ID = "RecentChangesMultiple-autorefresh-" + mw.config.get("wgPageName");
	module.OPTIONS_SETTINGS_LOCAL_STORAGE_ID = "RecentChangesMultiple-saveoptionscookie-" + mw.config.get("wgPageName");
	module.LOADER_IMG = module.LOADER_IMG || "http://slot1.images.wikia.nocookie.net/__cb1421922474/common/skins/common/images/ajax.gif";
	
	module.rcmList = [];
	module.uniqID = 0;
	module.langLoaded = false;
	module.onLangLoadCallbacks = [];
	module.numLangLoadErrors = 0;
	// Custom parameter defaults
	module.loadDelay = 10; // In miliseconds
	module.defaultLang = "en"; // See below
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
		
		// Set default lang for script
		module.defaultLang = tDataset.lang ? tDataset.lang.toLowerCase() : mw.config.get('wgUserLanguage'); // {string}
		i18n.TEXT = $.extend(i18n.TEXT.en, i18n.TEXT[module.defaultLang]);
		mw.language.setData(mw.config.get('wgUserLanguage'), i18n.TEXT.mwLanguageData); // Lets mw.language.convertPlural() to work.
		
		// Set load delay (needed for scripts that load large numbers of wikis)
		if(tDataset.loaddelay) { module.loadDelay = tDataset.loaddelay; }
		
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
	}
	
	module.unload = function() {
		for(i = 0; i < module.rcmList.length; i++) {
			module.rcmList[i].dispose();
			module.rcmList[i] = null;
		}
		module.rcmList = null;
		i18n = null;
	}
	
	// Replace all RC_TEXT with that of the language specified.
	// TODO: Should probably have support to check if it ran into loading issues.
	module.loadLangMessages = function() {
		var tLangLoadAjaxPromises = [];
		
		// Loads the messages and updates the i18n with the new values (max messages that can be passed is 50)
		function tRCM_loadLangMessage(pMessages) {
			var url = mw.config.get("wgServer") + mw.config.get('wgScriptPath') + "/api.php?action=query&format=json&meta=allmessages&amlang="+module.defaultLang+"&ammessages="+pMessages;
			if(module.debug) { console.log(url.replace("&format=json", "&format=jsonfm")); }
			
			return $.ajax({ type: 'GET', dataType: 'jsonp', data: {}, url: url,
				success: function(pData){
					$.each( (pData.query || {}).allmessages, function( index, message ) {
						if( message.missing !== '' ) {
							i18n.RC_TEXT[message.name] = message['*'];
						}
					});
				}
			});
		}
		
		// Loads messages in increments of 50.
		var tMessages = "", tNumLoading = 0;
		Object.keys(i18n.RC_TEXT).forEach(function (key) {
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

	$(document).ready(module.start);
	$(document).unload(module.unload);
})(window.jQuery, document, window.mediaWiki, window.dev.RecentChangesMultiple, window.dev.RecentChangesMultiple.i18n, window.dev.RecentChangesMultiple.RCMManager, window.dev.RecentChangesMultiple.Utils);
//</syntaxhighlight>