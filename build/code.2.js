//<syntaxhighlight lang="javascript">
/****************************
 * Script loader
 * Loads and then starts the script.
 * This loader prevents the whole script from being downloaded until it's needed.
 * It also prevents the main script from being loaded twice.
 ***************************/
(function($, document, mw, module){
	"use strict";
	
	//######################################
	// Pre-script load check: - make sure script hasn't already been started.
	//######################################
	// Don't create/run this code twice on the same page
	if(module.loaderInited) {
		console.log("[RecentChangesMultiple] Script already started; exiting.");
		return;
	}
	// Mark script as started
	module.loaderInited = true;
	
	//######################################
	// Pre-script load check: Find RCM container(s), and only continue loading if one is found (needed for script to function)
	//######################################
	if(document.querySelector('.rc-content-multiple, #rc-content-multiple')) {
		startLoad();
	} else {
		if(document.querySelector('[id^=flytabs_]')) {
			mw.log('[RecentChangesMultiple] No "rc-content-multiple" container(s) found; waiting for Tab Views to load.');
			mw.hook('wikipage.content').add(checkSectionHooked);
		} else {
			mw.log('[RecentChangesMultiple] No "rc-content-multiple" container(s) found.');
		}
	}
	
	function checkSectionHooked(pSection) {
		// If page has at least one "Tab view" wait for it to finish.
		if(pSection[0].classList && pSection[0].classList.contains("tabBody")) {
			if(pSection[0].querySelector('.rc-content-multiple, #rc-content-multiple')) {
				startLoad(pSection[0]);
				// Main script loads additional tabs, only first one is needed to "start" the script.
				mw.hook('wikipage.content').remove(checkSectionHooked);
			} else {
				mw.log('[RecentChangesMultiple] No "rc-content-multiple" container found in tab.');
				return;
			}
		}
	}
	
	function startLoad(pCont) {
		// Don't load this code twice on the same page
		if(module.loaded) {
			// mw.log("[RecentChangesMultiple] Script already loaded; exiting.");
			return;
		}
		// Mark script as loaded
		module.loaded = true;
		
		//######################################
		// Create script list
		//######################################
		var scripts = [
			"u:dev:MediaWiki:RecentChangesMultiple/core.js"
		];
		
		//######################################
		// Load the scripts
		//######################################
		window.importArticles({ type:'script', articles: scripts });
	}
	
})(window.jQuery, document, window.mediaWiki, (window.dev = window.dev || {}).RecentChangesMultiple = dev.RecentChangesMultiple || {});
//</syntaxhighlight>
