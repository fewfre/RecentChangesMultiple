//<syntaxhighlight lang="javascript">

//######################################
// #### Wiki Data ####
// * A data object to keep track of wiki data in an organized way, as well as also having convenience methods.
// * These should only be created once per wiki per RCMManager. No reason to re-create every refresh.
//######################################
window.dev.RecentChangesMultiple.WikiData = (function($, document, mw, module, Utils){
	"use strict";
	
	// Static Constants
	// What data is to be retrieved for each recent change.
	WikiData.RC_PROPS = ["user", "flags", "title", "ids", "sizes", "timestamp", "loginfo", "parsedcomment"].join("|"); // patrolled
	
	// Constructor
	function WikiData(pManager) {
		this.manager = pManager; // {RCMManager} Keep track of what manager this data is attached to.
		
		/***************************
		 * List Data - Data defined by "&attr=" style data on the url list elements.
		 * ex: *dev.wikia.com &hideusers=Test
		 ***************************/
		this.servername			= null; // {string} Base domain url (not http:// or other slashes). ex: dev.wikia.com
		this.scriptpath			= null; // {string} full url to script directory (EXcluding last "/"). ex: //test.wiki/w
		this.scriptdir			= null; // {string} The subdirectory api.php is on (in relation to this.servername)
		this.firstSeperator		= null; // {char} "?" unless it's a wiki that uses the "index.php?title=" format
		
		this.hideusers			= null; // {array<string>} These users are to have their RCs hidden for only this wiki.
		this.onlyshowusers		= null; // {array<string>} These users are to have ONLY their RCs shown for this wiki.
		this.favicon			= null; // {string} full url of this wiki's favicon
		this.rcParamsBase		= null; // {object} Works the same as this.manager.rcParams but for only this wiki.
		this.rcParams			= null; // {object} Combination of this.rcParamsOriginal and this.manager.rcParams to get final result.
		this.username			= null; // {string} Username to user for this wiki.
		
		/***************************
		 * Siteinfo Data
		 ***************************/
		this.needsSiteinfoData	= true; // {bool} check if the RCMManager should load the Siteinfo for the wiki when it requests wiki info.
		this.server				= null; // {string} full url to base of the server (ex: //test.wikia.com)
		this.articlepath		= null; // {string} full url to wiki article directory (including last "/"). ex: //test.wiki/wiki/
		this.sitename			= null; // {string} Name of the wiki
		this.mainpage			= null; // {string} Main page for the wiki (not all wiki's redirect to main page if you link to domain)
		this.mwversion			= null; // {string} MW version number. ex: MediaWiki 1.24.1
		this.namespaces			= null; // {array<object>} A data object with all namespaces on the wiki by number = { "1":{ -data- } }
		
		/***************************
		 * User Data
		 ***************************/
		this.needsUserData		= true; // {bool} check if the RCMManager should load the this user's account data for the wiki (detect what rights they have).
		this.canBlock			= false; // {bool} If the user has the "block" right on this wiki.
		// this.canRollback		= false; // {bool} If the user has the "rollback" right on this wiki.
		
		this.isWikiaWiki		= true; // {bool} Is this wiki a wikia wiki
		this.useOutdatedLogSystem = false; // {bool} Newer mediawikis return "logparams". older wikis (aka, Wikia as of July 2015) need to have them retrieved separately.
	}
	
	WikiData.prototype.dispose = function() {
		this.manager = null;
		
		this.hideusers = null;
		this.onlyshowusers = null;
		this.rcParamsBase = null;
		this.rcParams = null;
		
		this.namespaces = null;
	}
	
	// Parses LI element data to be able to retrieve information for the respective wiki.
	WikiData.prototype.initListData = function(pNode) {
		var self = this;
		
		var tWikiDataRaw = pNode.textContent.replace(/(\r\n|\n|\r)/gm, "").trim().split("&"); // Need to check for new lines due to how wikis create lists.
		//console.log(tWikiDataRaw);
		
		// Some default values
		this.servername = tWikiDataRaw[0];
		this.scriptdir = "";
		this.firstSeperator = "?";
		
		this.isWikiaWiki = this.servername.indexOf(".wikia.") > -1;
		this.useOutdatedLogSystem = this.isWikiaWiki;
		
		if(this.servername.indexOf("/") > -1) {
			this.manager.resultCont.innerHTML = "<div style='color:red; padding:4px 5px; background:rgba(0,0,0,0.1);'>"+ Utils.formatString(i18n.TEXT.incorrectFormatLink, this.servername)+"</div>";
			throw "Incorrect format";
		}
		
		var tWikiDataSplit, tKey, tVal; // Split of raw data
		for(var i = 1; i < tWikiDataRaw.length; i++) {
			tWikiDataSplit = tWikiDataRaw[i].split("=");
			if(tWikiDataSplit.length > 1) {
				tKey = tWikiDataSplit[0];
				tVal = tWikiDataSplit[1];
				switch(tKey) {
					case "params": {
						this.rcParamsBase = this.manager.parseRCParams(tVal, ",", ":");
						break;
					}
					case "hideusers": {
						this.hideusers = tVal.replace("", " ").split(",");
						this.hideusers.forEach(function(o,i){ self.hideusers[i] = self.hideusers[i].trim(); });
						break;
					}
					case "onlyshowusers": {
						this.onlyshowusers = tVal.replace("", " ").split(",");
						this.onlyshowusers.forEach(function(o,i){ self.onlyshowusers[i] = self.onlyshowusers[i].trim(); });
						break;
					}
					case "scriptdir": {
						this.scriptdir = tVal;
						// Add / remove slashes as needed (encase added incorrectly).
						if(this.scriptdir[0] != "/") { this.scriptdir = "/"+this.scriptdir; }
						if(this.scriptdir[this.scriptdir.length-1] == "/") { this.scriptdir = this.scriptdir.slice(0, -1); }
						break;
					}
					case "favicon": {
						this.favicon = tVal;
						if(this.favicon.indexOf(".") > -1) {
							this.favicon = "//"+this.favicon;
						} else {
							// [depreciated]
							this.favicon = "http://vignette3.wikia.nocookie.net/"+this.favicon+"/images/6/64/Favicon.ico"
						}
						break;
					}
					case "username": {
						this.username = tVal;
						break;
					}
					default: {
						// For sanity's sake, this shouldn't actually be used (so that it's obvious what the script is assuming will be passed in).
						this[tKey] = tVal;
						break;
					}
				}
			}
		}
		
		if(!this.username && this.isWikiaWiki && mw.config.get("wgUserName")) {
			this.username = mw.config.get("wgUserName");
		}
		
		this.scriptpath =  "//"+this.servername+this.scriptdir;
		
		this.setupRcParams();
		
		tKey = null;
		tVal = null;
		tWikiDataRaw = null;
		tWikiDataSplit = null;
		
		return this; // Return self for chaining or whatnot.
	}
	
	// If Siteinfo / user data / other 1-off fetches are needed (first pass only), the information is stored in this object
	WikiData.prototype.initAfterLoad = function(pQuery) {
		/***************************
		 * Siteinfo Data
		 ***************************/
		if(this.needsSiteinfoData && !!pQuery.general){
			this.needsSiteinfoData = false;
			
			this.server = pQuery.general.server || ("//" + this.servername);
			this.articlepath = this.server + pQuery.general.articlepath.replace("$1", "");
			if(this.articlepath.indexOf("?") > -1) { this.firstSeperator = "&"; }
			this.sitename = pQuery.general.sitename;
			this.mainpage = pQuery.general.mainpage;
			this.mwversion = pQuery.general.generator;
			
			if(this.favicon == null) {
				// Requires MediaWiki V1.23+
				if(pQuery.general.favicon) {
					this.favicon = pQuery.general.favicon;
					// It SHOULD be an absoule link, but encase it isn't... (at least one case found where it wasn't)
					if(this.favicon.indexOf("http") != 0 && this.favicon.indexOf("//") != 0) { this.favicon = this.server + "/" + this.favicon; }
				}
				// Should work for all Wikia wikis
				else if(!!pQuery.pages) {
					var tPageID;
					for (tPageID in pQuery.pages) break; // A trick to get the one (and only) page entry in the object
					if(pQuery.pages[tPageID] && pQuery.pages[tPageID].imageinfo) {
						this.favicon = pQuery.pages[tPageID].imageinfo[0].url;
					}
				}
			}
			
			this.namespaces = pQuery.namespaces || {};
		}
		
		/***************************
		 * User Data
		 ***************************/
		if(this.needsUserData && !!pQuery.users){
			this.needsUserData = false;
			for(var i in pQuery.users[0].rights) { 
				if(pQuery.users[0].rights[i] == "block") { this.canBlock = true; }
				// else if(pQuery.users[0].rights[i] == "rollback") { this.canRollback = true; }
			}
		}
		
		/***************************
		 * Favicon fallback - may not be needed now with "pQuery.pages" backup.
		 ***************************/
		if(this.favicon == null) {
			this.favicon = module.FAVICON_BASE+this.servername;
		}
	}
	
	WikiData.prototype.setupRcParams = function() {
		var self = this;
		if(this.rcParamsBase != null) {
			this.rcParams = $.extend( this.manager.rcParamsBase, this.rcParamsBase );
			
			this.rcParams.paramString = [];
			$.each( this.rcParams, function( tKey, tVal ) {
				if( tKey != "paramString" ) {
					if(tVal === true) { tVal="1"; }
					if(tVal === false) { tVal="0"; }
					self.rcParams.paramString.push(tKey+"="+tVal);
				}
			});
			this.rcParams.paramString = this.rcParams.paramString.join("&");
			
			this.rcParams = $.extend( this.manager.getDefaultRCParams(), this.rcParams );
		} else {
			this.rcParams = this.manager.rcParams;
		}
		self = null;
	}
	
	// Since both initListData and initSiteinfo can set the wiki's favicon, set default favicon if none set
	WikiData.prototype.getFaviconHTML = function() {
		return "<img src='"+this.favicon+"' title='"+this.sitename+"' width='16' height='16' />"; // Return self for chaining or whatnot.
	}
	
	// Returns the url to the Api, which will return the Recent Changes for the wiki (as well as Siteinfo if needed)
	// https://www.mediawiki.org/wiki/API:RecentChanges
	WikiData.prototype.getApiUrl = function() {
		var tReturnText = this.scriptpath+"/api.php?action=query&format=json&continue="; // don't assume http:// or https://
		var tUrlList = [];
		var tMetaList = [];
		
		// Get results up to this time stamp.
		var tEndDate = new Date();//this.rcParams.from ? new Date(this.rcParams.from) : new Date();
		tEndDate.setDate( tEndDate.getDate() - this.rcParams.days );
		
		/***************************
		 * Recent Changes Data - https://www.mediawiki.org/wiki/API:RecentChanges
		 ***************************/
		tUrlList.push("recentchanges");
		tReturnText += "&rcprop="+WikiData.RC_PROPS; // What data to retrieve.
		
		// How many results to retrieve
		tReturnText += "&rclimit="+this.rcParams.limit;
		tReturnText += "&rcend="+tEndDate.toISOString();
		
		var tRcShow = [];
		if(this.rcParams.hideminor) { tRcShow.push("!minor"); }
		if(this.rcParams.hidebots) { tRcShow.push("!bot"); }
		if(this.rcParams.hideanons) { tRcShow.push("!anon"); }
		if(this.rcParams.hideliu) { tRcShow.push("anon"); } // Hide users
		tReturnText += "&rcshow="+tRcShow.join("|");
		tRcShow = null;
		
		var tRcType = ["edit", "new"]; // external
		if(this.rcParams.hidelogs == false) { tRcType.push("log"); }
		tReturnText += "&rctype="+tRcType.join("|");
		tRcType = null;
		
		// Only one user can be excluded like this (so any additional ones will still have to be done manually), but might as well take advantage of it.
		var tUser = null;
		if(this.rcParams.hidemyself && this.username) {
			tUser = this.username;
		} else if(this.manager.hideusers.length > 0) {
			tUser = this.manager.hideusers[0];
		} else if(this.hideusers) {
			tUser = this.hideusers[0];
		}
		if(tUser != null) { tReturnText += "&rcexcludeuser="+tUser; }
		
		/***************************
		 * Log Event Data - https://www.mediawiki.org/wiki/API:Logevents
		 * Get info for logs that don't return all necessary info through "Recent Changes" api.
		 * To avoid a second loading sequence, we load logs up to same limit / timestamp at "Recent Changes" api (since it's the best we can assume).
		 ***************************/
		if(this.useOutdatedLogSystem) {
			tUrlList.push("logevents");
			tReturnText += "&leprop=" + ["details", "user", "title", "timestamp", "type", "ids"].join("|");
			tReturnText += "&letype=" + ["rights", "move", "delete", "block", "merge"].join("|");
			
			// How many results to retrieve
			tReturnText += "&lelimit="+this.rcParams.limit;
			tReturnText += "&leend="+tEndDate.toISOString();
		}
		
		/***************************
		 * Siteinfo Data - https://www.mediawiki.org/wiki/API:Siteinfo
		 * Get the site info (Once per RCMManager)
		 ***************************/
		if(this.needsSiteinfoData) {
			tMetaList.push("siteinfo");
			tReturnText += "&siprop=" + ["general", "namespaces"].join("|");
			
			/***************************
			 * Imageinfo Data - https://www.mediawiki.org/wiki/API:Imageinfo
			 * Get favicon url for wiki (needed for wikis below V1.23 [Added to siteinfo]) (Once per RCMManager)
			 ***************************/
			tReturnText += "&prop=imageinfo&iiprop=url&titles=File:Favicon.ico";
		}
		
		/***************************
		 * User Data - https://www.mediawiki.org/wiki/API:Users
		 * If user logged in / set, get info for this wiki (Once per RCMManager)
		 ***************************/
		if(this.needsUserData && this.username) {
			tUrlList.push("users");
			tReturnText += "&ususers="+this.username+"&usprop=rights";
		}
		else if(this.needsUserData) {
			this.needsUserData = false;
		}
		
		/***************************
		 * Finish building url
		 ***************************/
		tReturnText += "&list="+tUrlList.join("|");
		if(tMetaList.length > 0){ tReturnText += "&meta="+tMetaList.join("|"); }
		tReturnText.replace(" ", "_");
		
		tUrlList = null;
		tMetaList = null;
		tEndDate = null;
		
		if(module.debug) { console.log(tReturnText.replace("&format=json", "&format=jsonfm")); }
		return tReturnText;
	}
	
	return WikiData;
	
})(window.jQuery, document, window.mediaWiki, window.dev.RecentChangesMultiple, window.dev.RecentChangesMultiple.Utils);
//</syntaxhighlight>