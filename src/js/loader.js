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
	if(scriptDataExists(document)) {
		startLoad();
	} else {
		mw.log('[RecentChangesMultiple] No "rc-content-multiple" container(s) found.');
		// If none found, add a listener for any new content added (needed for VisualEditor)
		mw.hook('wikipage.content').add(onNewPageContent);
	}
	
	function onNewPageContent(pContent) {
		if(scriptDataExists(pContent[0])) {
			startLoad();
			// Main script loads additional tabs, only first one is needed to "start" the script.
			mw.hook('wikipage.content').remove(onNewPageContent);
		} else {
			// mw.log('[RecentChangesMultiple] No "rc-content-multiple" container found in new content.');
		}
	}
	
	// Check if the main script should be loaded
	function scriptDataExists(elem) {
		return elem.querySelector('.rc-content-multiple, #rc-content-multiple') != null;
	}
	
	function startLoad() {
		// Don't load this code twice on the same page
		if(module.loaded) {
			// mw.log("[RecentChangesMultiple] Script already loaded; exiting.");
			return;
		}
		// Mark script as loaded
		module.loaded = true;
		
		//######################################
		// Load the scripts
		//######################################
		window.importArticles({ type:'script', articles: [
			"u:dev:MediaWiki:RecentChangesMultiple/core.js"
		] });
	}
	
})(window.jQuery, document, window.mediaWiki, (window.dev = window.dev || {}).RecentChangesMultiple = dev.RecentChangesMultiple || {});
//</syntaxhighlight>
