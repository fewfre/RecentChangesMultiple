//<syntaxhighlight lang="javascript">
/****************************
 * Script loader
 * Loads and then starts the script. This loader prevents the whole script from being downloaded until it's needed.
 ***************************/
(function($, document, mw, module){
	"use strict";
	
	//######################################
	// Pre-script checks - make sure script hasn't already been loaded, and make sure it needs to run.
	//######################################
	// Find RCM container, and exit if not found (needed for script to function)
	if(document.querySelectorAll('.rc-content-multiple, #rc-content-multiple')[0] == undefined) { console.log('No "Recent Changes Multiple" container found; exiting.'); return; }
	
	// Don't create/run this code twice on the same page
	if(module.loaded) { console.log("Script already loaded; exiting."); return; }
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
	
})(window.jQuery, document, window.mediaWiki, (window.dev = window.dev || {}).RecentChangesMultiple = dev.RecentChangesMultiple || {});
//</syntaxhighlight>