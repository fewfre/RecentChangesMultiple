//<syntaxhighlight lang="javascript">

//######################################
// General Helper Methods - STATIC
//######################################
(window.dev = window.dev || {}).RecentChangesMultiple = window.dev.RecentChangesMultiple || {};
(function($, document, mw, module) {
	"use strict";
	window.dev.RecentChangesMultiple.Utils = {
		// Allows forEach even on nodelists
		forEach: function(collection, callback, pScope) { if(collection != undefined) { Array.prototype.forEach.call(collection, callback, pScope); } },
		
		// http://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript
		pad: function(n, width, z) {//Number, max padding (ex:3 = 001), what to pad with (default 0)
			z = z || '0';
			n = n + '';
			return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
		},
		
		// http://stackoverflow.com/a/4673436/1411473
		formatString: function(format) {
			var args = Array.prototype.slice.call(arguments, 1);
			return format.replace(/{(\d+)}/g, function(match, number) {
				return typeof args[number] != 'undefined'
					? args[number]
					: match
				;
			});
		},
		
		// Creates a new HTML element (not jQuery) with specific attributes
		newElement: function(tag, attributes, parent) {
			var element = document.createElement(tag);
			if(attributes != undefined) {
				for(var key in attributes) {
					if(key == "style") {
						element.style.cssText = attributes[key];
					} else {
						element[key] = attributes[key];
					}
				}
			}
			if(parent != undefined) parent.appendChild(element);
			return element;
		},
		
		removeElement: function(pNode) {
			pNode.parentNode.removeChild(pNode);
		},
		
		addTextTo: function(pText, pNode) {
			pNode.appendChild( document.createTextNode(pText) );
		},
		
		elemIsVisible: function(elm) {
			var rect = elm.getBoundingClientRect();
			var viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
			return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
		},
		
		// Based on: http://stackoverflow.com/a/9229821
		uniq_fast_key: function(a, key) {
			var seen = {};
			var out = [];
			var len = a.length;
			var j = 0;
			for(var i = 0; i < len; i++) {
				var item = a[i];
				if(seen[item[key]] !== 1) {
					seen[item[key]] = 1;
					out[j++] = item;
				}
			}
			return out;
		},
		
		uniqID: function() {
			return "id"+(++module.uniqID);
		},
		
		getMinutes: function(pDate, timeZone)	{ return timeZone == "utc" ? pDate.getUTCMinutes() : pDate.getMinutes(); },
		getHours: function(pDate, timeZone)		{ return timeZone == "utc" ? pDate.getUTCHours() : pDate.getHours(); },
		getDate: function(pDate, timeZone)		{ return timeZone == "utc" ? pDate.getUTCDate() : pDate.getDate(); },
		getMonth: function(pDate, timeZone)		{ return timeZone == "utc" ? pDate.getUTCMonth() : pDate.getMonth(); },
		getYear: function(pDate, timeZone)		{ return timeZone == "utc" ? pDate.getUTCFullYear() : pDate.getFullYear(); },
		
		// Convert from MediaWiki time format to one Date object like.
		getTimestampForYYYYMMDDhhmmSS: function(pNum) {
			pNum = ""+pNum;
			return pNum.splice(0, 4) +"-"+ pNum.splice(0, 2) +"-"+ pNum.splice(0, 2) +"T"+  pNum.splice(0, 2) +":"+ pNum.splice(0, 2) +":"+ pNum.splice(0, 2);
		},
		
		escapeCharacters: function(pString) {
			return pString ? pString.replace(/"/g, '&quot;').replace(/'/g, '&apos;') : pString;
		},
		
		escapeCharactersLink: function(pString) {
			return pString ? pString.replace(/%/g, '%25').replace(/ /g, "_").replace(/"/g, '%22').replace(/'/g, '%27').replace(/\?/g, '%3F').replace(/\+/g, '%2B') : pString;
		},
		
		// UpperCaseFirstLetter
		ucfirst: function(s) { return s && s[0].toUpperCase() + s.slice(1); },
		
		// Assumes the file has already been checked to be in namespace 6
		isFileAudio: function(pTitle) {
			var tExt = null, audioExtensions = ["oga", "ogg", "ogv"]; // Audio extensions allowed by Wikia
			for(var i = 0; i < audioExtensions.length; i++) {
				tExt = "."+audioExtensions[i];
				if(pTitle.indexOf(tExt, pTitle.length - tExt.length) !== -1) { return true; } // If title ends with extension.
			}
			return false;
		},
		
		// http://phpjs.org/functions/version_compare/
		// Simulate PHP version_compare
		version_compare: function (v1, v2, operator) {
			//       discuss at: http://phpjs.org/functions/version_compare/
			//      original by: Philippe Jausions (http://pear.php.net/user/jausions)
			//      original by: Aidan Lister (http://aidanlister.com/)
			// reimplemented by: Kankrelune (http://www.webfaktory.info/)
			//      improved by: Brett Zamir (http://brett-zamir.me)
			//      improved by: Scott Baker
			//      improved by: Theriault
			//        example 1: version_compare('8.2.5rc', '8.2.5a');
			//        returns 1: 1
			//        example 2: version_compare('8.2.50', '8.2.52', '<');
			//        returns 2: true
			//        example 3: version_compare('5.3.0-dev', '5.3.0');
			//        returns 3: -1
			//        example 4: version_compare('4.1.0.52','4.01.0.51');
			//        returns 4: 1
			var i = 0, x = 0, compare = 0,
				// Leave as negatives so they can come before numerical versions
				vm = { 'dev': -6, 'alpha': -5, 'a': -5, 'beta': -4, 'b': -4, 'RC': -3, 'rc': -3, '#': -2, 'p': 1, 'pl': 1 },
				// Format version string to remove oddities.
				prepVersion = function(v) {
					v = ('' + v)
					.replace(/[_\-+]/g, '.');
					v = v.replace(/([^.\d]+)/g, '.$1.')
						.replace(/\.{2,}/g, '.');
					return (!v.length ? [-8] : v.split('.'));
				};
			// This converts a version component to a number.
			var numVersion = function(v) {
				return !v ? 0 : (isNaN(v) ? vm[v] || -7 : parseInt(v, 10));
			},
			v1 = prepVersion(v1);
			v2 = prepVersion(v2);
			x = Math.max(v1.length, v2.length);
			for (i = 0; i < x; i++) {
				if (v1[i] == v2[i]) { continue; }
				v1[i] = numVersion(v1[i]);
				v2[i] = numVersion(v2[i]);
				if (v1[i] < v2[i]) { compare = -1; break; }
				else if (v1[i] > v2[i]) { compare = 1; break; }
			}
			if (!operator) { return compare; }
			
			switch (operator) {
				case '>': case 'gt':			{ return (compare > 0); }
				case '>=': case 'ge':			{ return (compare >= 0); }
				case '<=': case 'le':			{ return (compare <= 0); }
				case '==': case '=': case 'eq':	{ return (compare === 0); }
				case '<>': case '!=': case 'ne':{ return (compare !== 0); }
				case '': case '<': case 'lt':	{ return (compare < 0); }
				default:						{ return null; }
			}
		},
	};
})(window.jQuery, document, window.mediaWiki, window.dev.RecentChangesMultiple);
//</syntaxhighlight>

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
		this.notificationsHideusers= null; // {array<string>} Don't send notifications when these users edit.
		this.notificationsEnabled= true; // {bool} Don't send notifications for this wiki.
		this.favicon			= null; // {string} full url of this wiki's favicon
		this.rcParamsBase		= null; // {object} Works the same as this.manager.rcParams but for only this wiki.
		this.rcParams			= null; // {object} Combination of this.rcParamsOriginal and this.manager.rcParams to get final result.
		this.username			= null; // {string} Username to user for this wiki.
		this.bgcolor			= null; // {string} A valid CSS color code.
		
		this.htmlName			= null; // {string} a unique identifier for this wiki. Just the server name with dashes for the dots.
		this.infoID				= null; // {string} element ID for the wiki's info banner.
		this.rcClass			= null; // {string} class name for this wiki's RC entries.
		
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
		this.statistics			= null; // {object} A data object with statistics about number of articles / files / users there are on the wiki.
		
		/***************************
		 * User Data
		 ***************************/
		this.needsUserData		= true; // {bool} check if the RCMManager should load the this user's account data for the wiki (detect what rights they have).
		this.canBlock			= false; // {bool} If the user has the "block" right on this wiki.
		this.canRollback		= true; // {bool} If the user has the "rollback" right on this wiki. Set to true by default so as to fetch extra necessary data first time around.
		
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
		this.htmlName = this.servername.replace(/(\.)/g, "-");
		
		this.isWikiaWiki = this.servername.indexOf(".wikia.") > -1;
		this.useOutdatedLogSystem = this.isWikiaWiki;
		
		if(this.servername.indexOf("/") > -1) {
			this.manager.resultCont.innerHTML = "<div style='color:red; padding:4px 5px; background:rgba(0,0,0,0.1);'>"+ i18n("rcm-error-linkformat", this.servername)+"</div>";
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
						this.hideusers.forEach(function(o,i,a){ a[i] = Utils.ucfirst(a[i].trim()); });
						break;
					}
					case "onlyshowusers": {
						this.onlyshowusers = tVal.replace("", " ").split(",");
						this.onlyshowusers.forEach(function(o,i,a){ a[i] = Utils.ucfirst(a[i].trim()); });
						break;
					}
					case "notifications_hideusers": {
						this.notificationsHideusers = tVal.replace("", " ").split(",");
						this.notificationsHideusers.forEach(function(o,i,a){ a[i] = Utils.ucfirst(a[i].trim()); });
						break;
					}
					case "notifications_enabled": {
						this.notificationsEnabled = tVal !== "false";
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
					case "bgcolor": {
						this.bgcolor = tVal;
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
		
		this.infoID = "wiki-"+this.htmlName;
		this.rcClass = "rc-entry-"+this.htmlName;
		
		// this.setupRcParams(); // Moved to manager
		
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
					// for (var tPageID in pQuery.pages) {
					// 	if(pQuery.pages[tPageID] && pQuery.pages[tPageID].ns == 6 && pQuery.pages[tPageID].title.split(":")[1] == "Favicon.ico") {
					// 		if(pQuery.pages[tPageID].imageinfo) { this.favicon = pQuery.pages[tPageID].imageinfo[0].url; }
					// 		break;
					// 	}
					// }
				}
			}
			
			this.namespaces = pQuery.namespaces || {};
			this.statistics = pQuery.statistics || {};
		}
		
		/***************************
		 * User Data
		 ***************************/
		if(this.needsUserData && !!pQuery.users){
			this.canBlock = false;
			this.canRollback = false;
			this.needsUserData = false;
			for(var i in pQuery.users[0].rights) {
				if(pQuery.users[0].rights[i] == "block") { this.canBlock = true; }
				else if(pQuery.users[0].rights[i] == "rollback") { this.canRollback = true; }
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
		this.rcParams = $.extend({}, this.manager.rcParamsBase); // Make a shallow copy
		if(Object.keys(this.manager.optionsNode.rcParams).length > 0) {
			this.rcParams = $.extend( this.rcParams, this.manager.optionsNode.rcParams );
		}
		if(this.rcParamsBase != null) {
			this.rcParams = $.extend( this.rcParams, this.rcParamsBase );
		}
		
		// if(this.rcParams == this.manager.rcParamsBase) {
		// 	this.rcParams = this.manager.rcParams; // The manager's RC params are valid if no changes more specific than it exist.
		// } else {
			this.rcParams.paramString = this.createRcParamsString(this.rcParams);
			this.rcParams = $.extend( this.manager.getDefaultRCParams(), this.rcParams );
		// }
	}
	
	// Get the string for use with Special:RecentChanges link for this wiki.
	// Don't pass in params with "default" values included, or the link will have them all specified.
	WikiData.prototype.createRcParamsString = function(pParams) {
		var tArray = [];
		$.each( pParams, function( tKey, tVal ) {
			if( tKey != "paramString" ) {
				if(tVal === true) { tVal="1"; }
				if(tVal === false) { tVal="0"; }
				tArray.push(tKey+"="+tVal);
			}
		});
		return tArray.join("&");
	}
	
	// Since both initListData and initSiteinfo can set the wiki's favicon, set default favicon if none set
	WikiData.prototype.getFaviconHTML = function(pOpenInfoBanner) {
		var html = "<img src='"+this.favicon+"' title='"+this.sitename+"' width='16' height='16' />";
		if(pOpenInfoBanner) { html = "<span class='rcm-favicon-goto-button' data-infoid='"+this.infoID+"'>"+html+"</span>"; }
		return html;
	}
	
	// Returns the url to the Api, which will return the Recent Changes for the wiki (as well as Siteinfo if needed)
	// https://www.mediawiki.org/wiki/API:RecentChanges
	WikiData.prototype.getApiUrl = function() {
		var tReturnText = this.scriptpath+"/api.php?action=query&format=json&continue="; // don't assume http:// or https://
		var tUrlList = [];
		var tMetaList = [];
		var tPropList = [];
		
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
		
		if(this.rcParams.namespace || this.rcParams.namespace === "0") {
			tReturnText += "&rcnamespace="+this.rcParams.namespace; // Already separated by "|"
		}
		
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
			tReturnText += "&siprop=" + ["general", "namespaces", "statistics"].join("|");
			
			/***************************
			 * Imageinfo Data - https://www.mediawiki.org/wiki/API:Imageinfo
			 * Get favicon url for wiki (needed for wikis below V1.23 [Added to siteinfo]) (Once per RCMManager)
			 ***************************/
			tPropList.push("imageinfo");
			tReturnText += "&iiprop=url&titles=File:Favicon.ico";
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
		if(tPropList.length > 0){ tReturnText += "&prop="+tPropList.join("|"); }
		tReturnText.replace(/ /g, "_");
		
		tUrlList = null;
		tMetaList = null;
		tPropList = null;
		tEndDate = null;
		
		if(module.debug) { console.log("http:"+tReturnText.replace("&format=json", "&format=jsonfm")); }
		return tReturnText;
	}
	
	return WikiData;
	
})(window.jQuery, document, window.mediaWiki, window.dev.RecentChangesMultiple, window.dev.RecentChangesMultiple.Utils);
//</syntaxhighlight>

//<syntaxhighlight lang="javascript">
/*
 *  TEXT - Custom text used in the script to explain what's happening. $1 means that the script will input a number / word / url here on the fly, and is expected / potentially important.
 *         This i18n is set depending on your local language (en if not available).
 *
 * https://github.com/Wikia/app/tree/808a769df6cf8524aa6defcab4f971367e3e3fd8/languages/messages
 * Search: /api.php?action=query&meta=allmessages&format=jsonfm&amfilter=searchterm
 * MESSAGES - This contains words used in the actual RC page. Only the English information is listed below, because the script prompts the server for those translations by looping through the IDs list in RC_TEXT.
 * 			 Since some languages depend on the English defaults for things (like "minoreditletter"), it's values are default (to avoid having to load english first).
 * 			 POTENTIAL ISSUES:
 * 			 	* Script cannot check proper use of "{{GENDER}}" (gender is hidden by external API calls for security), so just does male.
  * mediawiki.language.data - "mwLanguageData" can be found by finding [ mw.loader.implement("mediawiki.language.data ] in the page source. If not found may be cached, so visit page using a "private / incognito" window.
 */
window.dev.RecentChangesMultiple.i18n = (function($, document, mw, module){
	"use strict";
	// Using a function as the base of this Singleton allows it to be called as a function directly for ease-of-use and conciseness.
	var i18n = function(pKey){
		arguments[0] = i18n.TEXT[pKey] || i18n.MESSAGES[pKey];
		if(arguments[0] == undefined) {
			console.log("[RecentChangesMultiple.i18n]() "+pKey+" is undefined.");
			// if(module.debug) { throw(pKey); }
			return pKey;
		}
		return i18n.wiki2html.apply(i18n, arguments);
	}
	i18n.defaultLang = "en";

	i18n.init = function(pLang/*optional*/) {
		// Set default lang for script
		i18n.defaultLang = pLang ? pLang.toLowerCase() : mw.config.get('wgUserLanguage'); // {string}
		// split("-") checks for the "default" form of a language encase the specialized version isn't available for TEXT (ex: zh and zh-tw)
		i18n.TEXT = $.extend(i18n.TEXT.en, i18n.TEXT[i18n.defaultLang] || i18n.TEXT[i18n.defaultLang.split("-")[0]]);
		mw.language.setData(mw.config.get('wgUserLanguage'), i18n.TEXT.mwLanguageData); // Gets mw.language.convertPlural() to work.
	}

	// Big thanks to wlb.wikia.com for translations.
	i18n.TEXT = {
		en: { // English (ENGLISH)
			// Errors
			'rcm-error-linkformat' : "'$1' is an incorrect format. Please do '''not''' include 'http://' or anything after the domain, including the first '/'.",
			'rcm-error-loading-syntaxhang' : "Error loading [$1] ($2 tries). Please correct syntax (or refresh script to try again).",
			'rcm-error-loading-connection' : "Error loading [$1] ($2 tries). Most likely a connection issue; refresh script to try again.",
			'rcm-error-trymoretimes' : "Try $1 more times",
			// Notifications
			'rcm-loading' : "Loading/Sorting...",
			'rcm-refresh' : "Refresh",
			'rcm-download-timestamp' : "Recent Changes downloaded at: $1",
			'rcm-download-changesadded' : " - [$1 Recent Changes added]",
			// Basics
			'rcm-wikisloaded' : "Wikis Loaded: ",
			'rcm-previouslyloaded' : "Previously loaded:",
			'rcm-nonewchanges' : "No new changes",
			'rcm-autorefresh' : "Auto Refresh",
			'rcm-autorefresh-tooltip' : "Automatically refreshes Recent Changes every $1 seconds",
			'rcm-footer' : "Version $1 by $2",
			// Options Panel
			'rcm-optionspanel-hideusersoverride': "data-hideusers overrides this.",
			'rcm-optionspanel-savewithcookie': "Save changes with cookie",
			// Modules
			'rcm-module-diff-title' : "Diff Viewer",
			'rcm-module-diff-open' : "Open diff",
			'rcm-module-diff-undo' : "Undo edit",
			// Other
			'rcm-unknownthreadname' : "thread", // If name of a wall/board thread is not found, this will take it's place.
			/***************************
			 * mediawiki.language.data - found by finding [ mw.loader.implement("mediawiki.language.data" ] in the page source. If not found may be cached, so visit page using a "private / incognito" window.
			 ***************************/
			mwLanguageData: {
				"digitTransformTable": null,
				"separatorTransformTable": null,
				"grammarForms": [],
				"pluralRules": ["i = 1 and v = 0 @integer 1"],
				"digitGroupingPattern": null,
				"fallbackLanguages": []
			},
		},
		be: { // Беларуская (BELARUSIAN) @author: Mix Gerder
			// Errors
			'rcm-error-linkformat' : "'$1' паказаны ў няздатным фармаце. Калі ласка, не выкарыстоўвайце элемент 'http://', не ўстаўляйце нічога пасля яго і першага '/'.",
			'rcm-error-loading-syntaxhang' : "Памылка пры загрузцы [$1] (спроб: $2) Калі ласка, выпраўце сінтаксіс (або абновіце скрыпт, каб паспрабаваць зноў).",
			'rcm-error-loading-connection' : "Памылка пры загрузцы [$1] (спроб: $2). Хутчэй за ўсе, гэта памылка з падключэннем, абновіце скрыпт, каб паспрабаваць зноў.",
			'rcm-error-trymoretimes' : "Паспрабуйце $1 раз(а)",
			// Notifications
			'rcm-loading' : "Загрузка/Сартаванне...",
			'rcm-refresh' : "Абнавіць",
			'rcm-download-timestamp' : "Апошнія змены ўзятыя з: $1",
			'rcm-download-changesadded' : " - [$1 апошніх дададзеных змяненняў]",
			// Basics
			'rcm-wikisloaded' : "Загружаныя вікі: ",
			'rcm-previouslyloaded' : "Раней загружаныя:",
			'rcm-nonewchanges' : "Няма новых зменаў",
			'rcm-autorefresh' : "Аўтаматычнае абнаўленне",
			'rcm-autorefresh-tooltip' : "Аўтаматычнае абнаўленне апошніх змяненняў кожныя $1 секунд",
			'rcm-footer' : "Версія $1, створаная $2",
			// Options Panel
			// 'rcm-optionspanel-hideusersoverride': "data-hideusers вызначаюцца так.",
			'rcm-optionspanel-savewithcookie': "Захаваць змены ў Cookie",
			// Modules
			'rcm-module-diff-title' : "Папярэдні прагляд змяненняў",
			'rcm-module-diff-open' : "Паказаць змены",
			'rcm-module-diff-undo' : "Адмяніць змены",
			// Other
			'rcm-unknownthreadname' : "тэма",
			/***************************
			 * mediawiki.language.data
			 ***************************/
			mwLanguageData: {
				"digitTransformTable": null ,
				"separatorTransformTable": {
					",": " ",
					".": ","
				},
				"grammarForms": {
					"родны": {
						"ВікіВіды": "ВікіВідаў",
						"ВікіКнігі": "ВікіКніг",
						"Вікікрыніцы": "Вікікрыніц",
						"ВікіНавіны": "ВікіНавін",
						"Вікіслоўнік": "Вікіслоўніка",
						"Вікіпедыя": "Вікіпедыі"
					},
					"вінавальны": {
						"Вікіпедыя": "Вікіпедыю"
					},
					"месны": {
						"ВікіВіды": "ВікіВідах",
						"ВікіКнігі": "ВікіКнігах",
						"Вікікрыніцы": "Вікікрыніцах",
						"ВікіНавіны": "ВікіНавінах",
						"Вікіслоўнік": "Вікіслоўніку",
						"Вікіпедыя": "Вікіпедыі"
					}
				},
				"pluralRules": [
				"n % 10 = 1 and n % 100 != 11 @integer 1, 21, 31, 41, 51, 61, 71, 81, 101, 1001, … @decimal 1.0, 21.0, 31.0, 41.0, 51.0, 61.0, 71.0, 81.0, 101.0, 1001.0, …", "n % 10 = 2..4 and n % 100 != 12..14 @integer 2~4, 22~24, 32~34, 42~44, 52~54, 62, 102, 1002, … @decimal 2.0, 3.0, 4.0, 22.0, 23.0, 24.0, 32.0, 33.0, 102.0, 1002.0, …", "n % 10 = 0 or n % 10 = 5..9 or n % 100 = 11..14 @integer 0, 5~19, 100, 1000, 10000, 100000, 1000000, … @decimal 0.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …"],
				"digitGroupingPattern": null ,
				"fallbackLanguages": ["en"]
			},
		},
		ca: { // Català (CATALAN) @author: Josep Maria Roca Peña
			// Errors
			'rcm-error-linkformat' : "'$1' és un format incorrecte. Si us plau, no afegeixis 'http://' o alguna cosa darrere del domini, incloent el primer '/'.",
			'rcm-error-loading-syntaxhang' : "Error de càrrega [$1] ($2 intents). Si us plau, corregeix les teves sintaxis (o recarrega el teu script i intenta-ho un altre cop).",
			'rcm-error-loading-connection' : "Error de càrrega [$1] ($2 intents). A causa d'un error de connexió, has de recarregar el teu script i intenta-ho un altre cop.",
			'rcm-error-trymoretimes' : "Intenta-ho $1 més vegades",
			// Notificacions
			'rcm-loading' : "Carregant/Classificant…",
			'rcm-refresh' : "Actualització",
			'rcm-download-timestamp' : "Canvis recents baixats a: $1",
			'rcm-download-changesadded' : " - [$1 Canvis recents afegits]",
			// Bàsics
			'rcm-wikisloaded' : "Wikis carregats: ",
			'rcm-previouslyloaded' : "Breument carregats:",
			'rcm-nonewchanges' : "No hi ha nous canvis",
			'rcm-autorefresh' : "Actualització automàtica",
			'rcm-autorefresh-tooltip' : "Recarrega automàticament els canvis recents cada $1 segons",
			'rcm-footer' : "Versió $1 de $2",
			// Panell d'opcions
			'rcm-optionspanel-hideusersoverride': "data-hideusers overrides this.",
			'rcm-optionspanel-savewithcookie': "Guarda els canvis pel cookie",
			// Mòduls
			'rcm-module-diff-title' : "Visualitzador de pàgina",
			'rcm-module-diff-open' : "Obre la pàgina",
			'rcm-module-diff-undo' : "Desfés el canvi",
			// Altres
			'rcm-unknownthreadname' : "tema",
			/***************************
			 * mediawiki.language.data
			 ***************************/
			mwLanguageData: {
				"digitTransformTable": null ,
				"separatorTransformTable": {
					",": ".",
					".": ","
				},
				"grammarForms": [],
				"pluralRules": ["i = 1 and v = 0 @integer 1"],
				"digitGroupingPattern": null ,
				"fallbackLanguages": ["en"]
			},
		},
		de: { // Deutsch (German) @author: Cyanide3, Dragon Rainbow
			'rcm-error-linkformat' : "'$1' ist ein fehlerhaftes Format. Bitte füge '''nicht''' 'http://' oder Weiteres nach der Domain ein. Dies gilt auch für das erste '/'.",
			'rcm-error-loading-syntaxhang' : "Ladefehler [$1] ($2 Versuche). Bitte korrigiere den Syntax (oder aktualisiere das Script, um es erneut zu versuchen).",
			'rcm-error-loading-connection' : "Ladefehler [$1] ($2 Versuche). Höchstwahrscheinlich ein Verbindungsproblem; Lade das Script neu, um es erneut zu versuchen.",
			'rcm-error-trymoretimes' : "Versuche $1 mehrmals",

			'rcm-loading' : "Lade/Sortiere...",
			'rcm-refresh' : "Aktualisieren",
			'rcm-download-timestamp' : "Letzte Veränderungen nach: $1",
			'rcm-download-changesadded' : " - [$1 Letzte Änderungen, die hinzugefügt wurden]",

			'rcm-wikisloaded' : "Geladene Wikis: ",
			'rcm-previouslyloaded' : "Bisher geladen:",
			'rcm-nonewchanges' : "Keine neuen Veränderungen",
			'rcm-autorefresh' : "Auto-Aktualisierung",
			'rcm-autorefresh-tooltip' : "Aktualisiert automatisch die letzten Veränderungen jede $1 Sekunden",
			'rcm-footer' : "Version $1 bis $2",

			'rcm-optionspanel-hideusersoverride': "data-hideusers überschreibt dies.",
			'rcm-optionspanel-savewithcookie': "Speicher Veränderungen mit Cookie",

			'rcm-module-diff-title' : "Anderer Viewer",
			'rcm-module-diff-open' : "Öffne Veränderung",
			'rcm-module-diff-undo' : "Rückgängig",

			'rcm-unknownthreadname' : "Thread",
			/***************************
			 * mediawiki.language.data
			 ***************************/
			mwLanguageData: {
				"digitTransformTable": null ,
				"separatorTransformTable": {
					",": ".",
					".": ","
				},
				"grammarForms": [],
				"pluralRules": ["i = 1 and v = 0 @integer 1"],
				"digitGroupingPattern": null ,
				"fallbackLanguages": ["en"]
			},
		},
		es: { // Español (SPANISH) @author: Paynekiller92
			// Errors
			'rcm-error-linkformat' : "'$1' es un formato incorrecto. Por favor '''no''' incluyas 'http://' o cualquier cosa después, incluyendo el primer '/'.",
			'rcm-error-loading-syntaxhang' : "Error cargando [$1] ($2 intentos). Por favor corrige la sintaxis (o recarga el script para intentarlo otra vez).",
			'rcm-error-loading-connection' : "Error cargando [$1] ($2 intentos). Seguramente sea un problema de conexión; recarga el script para intentarlo otra vez.",
			'rcm-error-trymoretimes' : "Inténtalo $1 veces más",
			// Notifications
			'rcm-loading' : "Cargando/Clasificando...",
			'rcm-refresh' : "Recargar",
			'rcm-download-timestamp' : "Cambios recientes descargados en: $1",
			'rcm-download-changesadded' : " - [$1 Cambios Recientes añadidos]",
			// Basics
			'rcm-wikisloaded' : "Wikis Cargados: ",
			'rcm-previouslyloaded' : "Previamente cargados:",
			'rcm-nonewchanges' : "No hay nuevos cambios",
			'rcm-autorefresh' : "Auto Recargar",
			'rcm-autorefresh-tooltip' : "Recarga los Cambios Recientes automáticamente cada $1 segundos",
			'rcm-footer' : "Versión $1 por $2",
			// Options Panel
			// 'rcm-optionspanel-hideusersoverride': "data-hideusers overrides this.",
			// 'rcm-optionspanel-savewithcookie': "Save changes with cookie",
			// Modules
			'rcm-module-diff-title' : "Visor de cambios",
			'rcm-module-diff-open' : "Abrir cambio",
			'rcm-module-diff-undo' : "Deshacer edición",
			// Other
			'rcm-unknownthreadname' : "hilo", // If name of a wall/board thread is not found, this will take it's place.
			/***************************
			 * mediawiki.language.data - found by finding [ mw.loader.implement("mediawiki.language.data" ] in the page source. If not found may be cached, so visit page using a "private / incognito" window.
			 ***************************/
			mwLanguageData: {
				"digitTransformTable": null,
				"separatorTransformTable": null,
				"grammarForms": [],
				"pluralRules": ["i = 1 and v = 0 @integer 1"],
				"digitGroupingPattern": null,
				"fallbackLanguages": []
			},
		},
		gl: { // Galego (GALICIAN) @author: Josep Maria Roca Peña
			// Erros
			'rcm-error-linkformat' : "'$1' é un formato incorrecto. Por favor, non tes que engadir 'http://' ou algunha cousa despois do dominio, incluíndo o primeiro '/'.",
			'rcm-error-loading-syntaxhang' : "Erro de carregamento [$1] ($2 tentativas). Por favor, corrixe as túas sintaxes (ou recarrega o teu script e téntao novamente).",
			'rcm-error-loading-connection' : "Erro de carregamento [$1] ($2 tentativas). Debido a un erro de conexión, tes de recarregar o teu script e téntao novamente.",
			'rcm-error-trymoretimes' : "Téntao $1 máis veces",
			// Notificacións
			'rcm-loading' : "A cargar/A clasificar…",
			'rcm-refresh' : "Actualización",
			'rcm-download-timestamp' : "Cambios recentes baixados en: $1",
			'rcm-download-changesadded' : " - [$1 Cambios recentes engadidos]",
			// Básicos
			'rcm-wikisloaded' : "Wikis cargados: ",
			'rcm-previouslyloaded' : "Brevemente cargados:",
			'rcm-nonewchanges' : "Non hai novos cambios",
			'rcm-autorefresh' : "Actualización automática",
			'rcm-autorefresh-tooltip' : "Recarregar automaticamente os cambios recentes cada $1 segundos",
			'rcm-footer' : "Versión $1 de $2",
			// Panel de opcións
			'rcm-optionspanel-hideusersoverride': "data-hideusers overrides this.",
			'rcm-optionspanel-savewithcookie': "Gardar cambios polo cookie",
			// Módulos
			'rcm-module-diff-title' : "Visualizador de páxina",
			'rcm-module-diff-open' : "Abrir páxina",
			'rcm-module-diff-undo' : "Desfacer cambio",
			// Outros
			'rcm-unknownthreadname' : "tópico",
			/***************************
			 * mediawiki.language.data
			 ***************************/
			mwLanguageData: {
				"digitTransformTable": null ,
				"separatorTransformTable": {
					",": ".",
					".": ","
				},
				"grammarForms": [],
				"pluralRules": ["i = 1 and v = 0 @integer 1"],
				"digitGroupingPattern": null ,
				"fallbackLanguages": ["pt", "en"]
			},
		},
		it: { // Italiano (ITALIAN) @author: Leviathan 89
			// Errori
			'rcm-errore-linkformat' : "'$1' non è in un formato corretto. Per favore, '''non''' includere 'http://' o qualsiasi altra cosa dopo il dominio, compreso la prima '/'.",
			'rcm-Errore-loading-syntaxhang' : "Errore caricando [$1] ($2 tentativi). Per favore, correggi la tua sintassi (o ricarica il tuo script per riprovare).",
			'rcm-Errore-loading-connection' : "Errore caricando [$1] ($2 tentativi). Quasi sicuramente si tratta di un problema di connessione; ricarica lo script per riprovare.",
			'rcm-Errore-trymoretimes' : "Prova $1 volte ancora",
			// Notifiche
			'rcm-loading' : "Caricando / Ordinando...",
			'rcm-refresh' : "Ricarica",
			'rcm-download-timestamp' : "Ultime Modifiche scaricate alle: $1",
			'rcm-download-changesadded' : " - [$1 Ultime Modifiche aggiunte]",
			// Base
			'rcm-wikisloaded' : "Wiki caricate:",
			'rcm-previouslyloaded' : "Precedentemente caricate:",
			'rcm-nonewchanges' : "Non ci sono nuove modifiche",
			'rcm-autorefresh' : "Aggiornamento automatico",
			'rcm-autorefresh-tooltip' : "Ricarica automaticamente le Ultime Modifihce ogni $1 secondi",
			'rcm-footer' : "Versione $1 ad opera di $2",
			// Opzioni
			'rcm-optionspanel-hideusersoverride': "data-hideusers sovrascrive questo.",
			'rcm-optionspanel-savewithcookie': "Salvare modifiche con un cookie",
			// Moduli
			'rcm-module-diff-title' : "Visualizzazione cambiamenti",
			'rcm-module-diff-open' : "Apri il confronto delle versioni",
			'rcm-module-diff-undo' : "Annulla modifica",
			// Altri
			'rcm-unknownthreadname' : "Conversazione",
			/***************************
			 * mediawiki.language.data
			 ***************************/
			mwLanguageData: {
				"digitTransformTable": null ,
				"separatorTransformTable": {
					",": " ",
					".": ","
				},
				"grammarForms": [],
				"pluralRules": ["i = 1 and v = 0 @integer 1"],
				"digitGroupingPattern": null ,
				"fallbackLanguages": ["en"]
			},
		},
		ja: { // 日本語 (JAPANESE) @author: [anonymous]
			'rcm-error-linkformat' : "'$1' は表記に誤りがあります。 'http://' や、'/'を含むドメイン名以降の部分を'''含めずに'''指定してください。",
			'rcm-error-loading-syntaxhang' : "($2回試しましたが) [$1]の読み込みに失敗しました。（再更新してみるか、）設定を修正してください。",
			'rcm-error-loading-connection' : "($2回試しましたが) [$1]の読み込みに失敗しました。接続に失敗した可能性があります。再更新してください。",
			'rcm-error-trymoretimes' : "もう$1回お試しください",

			'rcm-loading' : "読込・整列中...",
			'rcm-refresh' : "更新",
			'rcm-download-timestamp' : "$1時点の最近の更新を表示中",
			'rcm-download-changesadded' : " - [$1件の最近の更新が追加されました]",

			'rcm-wikisloaded' : "対象のWikiaコミュニティ: ",
			'rcm-previouslyloaded' : "前回との変更点:",
			'rcm-nonewchanges' : "新しい変更はありません",
			'rcm-autorefresh' : "自動更新",
			'rcm-autorefresh-tooltip' : "$1秒おきに情報を自動更新します",
			'rcm-footer' : "Version $1 (編集者は$2)",

			'rcm-optionspanel-hideusersoverride': "data-hideusersの設定によって無効にされています",
			'rcm-optionspanel-savewithcookie': "クッキーに変更を保存する",

			'rcm-module-diff-title' : "差分を表示",
			'rcm-module-diff-open' : "差分を別のページで表示",
			'rcm-module-diff-undo' : "編集を取り消す",

			'rcm-unknownthreadname' : "無題",
			/***************************
			 * mediawiki.language.data
			 ***************************/
			mwLanguageData: {
				"digitTransformTable": null ,
				"separatorTransformTable": null ,
				"grammarForms": [],
				"pluralRules": ["i = 1 and v = 0 @integer 1"],
				"digitGroupingPattern": null ,
				"fallbackLanguages": ["en"]
			},
		},
		nl: { // Nederlands (DUTCH) @author: Mainframe98
			'rcm-error-linkformat' : "'$1' is een onjuist formaat. Gelieve '''niet''' 'http://' of iets anders na het domein, inclusief de eerste '/' bij te voegen.",
			'rcm-error-loading-syntaxhang' : "Fout bij het laden van [$1] ($2 pogingen). Corrigeer de syntax (of ververs het script om opnieuw te proberen).",
			'rcm-error-loading-connection' : "Fout bij het laden van [$1] ($2 pogingen). Hoogstwaarschijnlijk een verbindingsprobleem; ververs het script om opnieuw te proberen.",
			'rcm-error-trymoretimes' : "Probeer het $1 keer meer",

			'rcm-loading' : "Laden/Sorteren...",
			'rcm-refresh' : "Verversen",
			'rcm-download-timestamp' : "Recente Wijzigingen gedownload van: $1",
			'rcm-download-changesadded' : " - [$1 Recente Wijzigingen toegevoegd]",

			'rcm-wikisloaded' : "Wiki's geladen: ",
			'rcm-previouslyloaded' : "Eerder geladen:",
			'rcm-nonewchanges' : "Geen nieuwe wijzigingen",
			'rcm-autorefresh' : "Auto Verversen",
			'rcm-autorefresh-tooltip' : "Automatisch Recente Wijzigingen elke $1 seconden verversen",
			'rcm-footer' : "Versie $1 door $2",

			'rcm-optionspanel-hideusersoverride': "data-hideusers overschrijft dit.",
			'rcm-optionspanel-savewithcookie': "Sla wijzigingen op met een cookie",

			'rcm-module-diff-title' : "Toon wijz",
			'rcm-module-diff-open' : "Open wijz",
			'rcm-module-diff-undo' : "Bewerking ongedaan maken",

			'rcm-unknownthreadname' : "draad",
			/***************************
			 * mediawiki.language.data - found by finding [ mw.loader.implement("mediawiki.language.data" ] in the page source. If not found may be cached, so visit page using a "private / incognito" window.
			 ***************************/
			mwLanguageData: {
				"digitTransformTable": null ,
				"separatorTransformTable": { ",": ".", ".": "," },
				"grammarForms": [],
				"pluralRules": ["i = 1 and v = 0 @integer 1"],
				"digitGroupingPattern": null,
				"fallbackLanguages": ["en"]
			},
		},
		oc: { // Occitan (OCCITAN) @author: Josep Maria Roca Peña
			// Errors
			'rcm-error-linkformat' : "'$1' es un format incorrècte. Se vos plai, apondètz pas 'http://' o quicòm darrièr del domeni, en comprenent lo primièr '/'.",
			'rcm-Error-loading-syntaxhang' : "Error de carga [$1] ($2 assages). Se vos plai, corregissètz las vòstras sintaxis (o recarga lo vòstre script e ensaja-o un autre còp).",
			'rcm-Error-loading-connection' : "Error de carga [$1] ($2 assages). A causa d'un error de connexion, te cal recargar lo tieu script e ensaja-o un autre còp.",
			'rcm-Error-trymoretimes' : "Ensaja-o $1 mai de còps",
			// Notificacions
			'rcm-loading' : "En cargant/En classificant…",
			'rcm-refresh' : "Actualizacion",
			'rcm-download-timestamp' : "Cambiaments recents davalats sus: $1",
			'rcm-download-changesadded' : " - [$1 Cambiaments recents apondis]",
			// Basics
			'rcm-wikisloaded' : "Wikis cargats: ",
			'rcm-previouslyloaded' : "Brèvament cargats:",
			'rcm-nonewchanges' : "I a pas de nòus cambiaments",
			'rcm-autorefresh' : "Actualizacion automatica",
			'rcm-autorefresh-tooltip' : "Recargatz automaticament los cambiaments recents cada $1 segon",
			'rcm-footer' : "Version $1 de $2",
			// Panèl d'opcions
			'rcm-optionspanel-hideusersoverride': "data-hideusers overrides this.",
			'rcm-optionspanel-savewithcookie': "Gardatz los cambiaments pel cookie",
			// Moduls
			'rcm-module-diff-title' : "Visualitzador de pagina",
			'rcm-module-diff-open' : "Dobrissètz la pagina",
			'rcm-module-diff-undo' : "Desfasètz lo cambiament",
			// Autras
			'rcm-unknownthreadname' : "tèma",
			/***************************
			 * mediawiki.language.data
			 ***************************/
			mwLanguageData: {
				"digitTransformTable": null ,
				"separatorTransformTable": {
					",": " ",
					".": ","
				},
				"grammarForms": [],
				"pluralRules": ["i = 1 and v = 0 @integer 1"],
				"digitGroupingPattern": null ,
				"fallbackLanguages": ["en"]
			},
		},
		pl: { // Polski (POLISH) - @author: Szynka013, Matik7
			// Errors
			'rcm-error-linkformat' : "'$1' to nieodpowiedni format. Proszę nie używać elementu 'http://', niczego po nim oraz pierwszego '/'.",
			'rcm-error-loading-syntaxhang' : "Błąd podczas wczytywania [$1] (prób: $2) Proszę poprawić syntax (lub odświeżyć skrypt by spróbować ponownie).",
			'rcm-error-loading-connection' : "Błąd podczas wczytywania [$1] (prób: $2). Najprawdopodobniej jest to błąd z połączeniem, odśwież skrypt by spróbować ponownie.",
			'rcm-error-trymoretimes' : "Spróbuj $1 razy",
			// Notifications
			'rcm-loading' : "Ładowanie/Sortowanie...",
			'rcm-refresh' : "Odśwież",
			'rcm-download-timestamp' : "Ostatnie zmiany pobrane o: $1",
			'rcm-download-changesadded' : " - [$1 dodanych ostatnich zmian]",
			// Basics
			'rcm-wikisloaded' : "Załadowane wiki: ",
			'rcm-previouslyloaded' : "Poprzednio załadowane:",
			'rcm-nonewchanges' : "Brak nowych zmian",
			'rcm-autorefresh' : "Automatyczne odświeżanie",
			'rcm-autorefresh-tooltip' : "Automatyczne odświeżanie ostatnich zmian co każde $1 sekund",
			'rcm-footer' : "Wersja $1 stworzona przez $2",
			// Options Panel
			// 'rcm-optionspanel-hideusersoverride': "data-hideusers overrides this.",
			'rcm-optionspanel-savewithcookie': "Zapisz zmiany w pamięci podręcznej",
			// Modules
			'rcm-module-diff-title' : "Podgląd zmian",
			'rcm-module-diff-open' : "Pokaż zmiany",
			'rcm-module-diff-undo' : "Cofnij zmiany",
			// Other
			'rcm-unknownthreadname' : "wątek", // If name of a wall/board thread is not found, this will take it's place.
			/***************************
			 * mediawiki.language.data - found by finding [ mw.loader.implement("mediawiki.language.data" ] in the page source. If not found may be cached, so visit page using a "private / incognito" window.
			 ***************************/
			mwLanguageData: {
				"digitTransformTable": null,
				"separatorTransformTable": {",": " ",".": ","},
				"grammarForms": [],
				"pluralRules": ["i = 1 and v = 0 @integer 1", "v = 0 and i % 10 = 2..4 and i % 100 != 12..14 @integer 2~4, 22~24, 32~34, 42~44, 52~54, 62, 102, 1002, …", "v = 0 and i != 1 and i % 10 = 0..1 or v = 0 and i % 10 = 5..9 or v = 0 and i % 100 = 12..14 @integer 0, 5~19, 100, 1000, 10000, 100000, 1000000, …"],
				"digitGroupingPattern": null,
				"fallbackLanguages": ["en"]
			},
		},
		pt: { // Português europeu (PORTUGUESE EUROPE) @author: Josep Maria Roca Peña
			// Erros
			'rcm-error-linkformat' : "'$1' é um formato incorrecto. Por favor, não tens de acrescentar 'http://' ou alguma coisa depois do domínio, incluindo o primeiro '/'.",
			'rcm-error-loading-syntaxhang' : "Erro de carregamento [$1] ($2 tentativas). Por favor, corrige as tuas sintaxes (ou recarrega o teu script e tenta novamente).",
			'rcm-error-loading-connection' : "Erro de carregamento [$1] ($2 tentativas). Devido a um erro de conexão, tens de recarregar o teu script e tenta novamente.",
			'rcm-error-trymoretimes' : "Tenta $1 mais vezes",
			// Notificações
			'rcm-loading' : "A carregar/A classificar…",
			'rcm-refresh' : "Actualização",
			'rcm-download-timestamp' : "Mudanças recentes baixadas em: $1",
			'rcm-download-changesadded' : " - [$1 Mudanças recentes acrescentadas]",
			// Básicos
			'rcm-wikisloaded' : "Wikis carregados: ",
			'rcm-previouslyloaded' : "Brevemente carregados:",
			'rcm-nonewchanges' : "Não há novas mudanças",
			'rcm-autorefresh' : "Actualização automática",
			'rcm-autorefresh-tooltip' : "Recarregar automaticamente as mudanças recentes a cada $1 segundos",
			'rcm-footer' : "Versão $1 de $2",
			// Painel de opções
			'rcm-optionspanel-hideusersoverride': "data-hideusers overrides this.",
			'rcm-optionspanel-savewithcookie': "Guardar mudanças pelo cookie",
			// Módulos
			'rcm-module-diff-title' : "Visualizador de página",
			'rcm-module-diff-open' : "Abrir página",
			'rcm-module-diff-undo' : "Desfazer mudança",
			// Outros
			'rcm-unknownthreadname' : "tópico",
			/***************************
			 * mediawiki.language.data
			 ***************************/
			mwLanguageData: {
				"digitTransformTable": null ,
				"separatorTransformTable": { ",": " ", ".": "," },
				"grammarForms": [],
				"pluralRules": ["n = 0..2 and n != 2 @integer 0, 1 @decimal 0.0, 1.0, 0.00, 1.00, 0.000, 1.000, 0.0000, 1.0000"],
				"digitGroupingPattern": null ,
				"fallbackLanguages": ["pt-br", "en"]
			},
		},
		"pt-br": { // Português brasileiro (PORTUGUESE BRAZIL) @author: DannielaServer
			// Erros
			'rcm-error-linkformat' : "'$1' é um formato incorreto. Por favor, não inclua 'http://' ou alguma coisa depois do domínio, incluindo a primeira '/'.",
			'rcm-error-loading-syntaxhang' : "Erro de carregamento [$1] ($2 tentativas). Por favor, corrija as suas sintaxes (ou recarregue o seu script para tentar novamente).",
			'rcm-error-loading-connection' : "Erro de carregamento [$1] ($2 tentativas). Devido a um erro de conexão,; recarregue o seu script e tente novamente.",
			'rcm-error-trymoretimes' : "Tente $1 mais vezes",
			// Notificações
			'rcm-loading' : "Carregando/Classificando...",
			'rcm-refresh' : "Refresh",
			'rcm-download-timestamp' : "Mudanças recentes baixadas em: $1",
			'rcm-download-changesadded' : " - [$1 Mudanças recentes adicionadas]",
			// Básicos
			'rcm-wikisloaded' : "Wikias carregadas: ",
			'rcm-previouslyloaded' : "Brevemente carregadas:",
			'rcm-nonewchanges' : "Não há novas mudanças",
			'rcm-autorefresh' : "Auto refresh para atualizar automaticamente",
			'rcm-autorefresh-tooltip' : "Recarregar automaticamente as mudanças recentes a cada $1 segundos",
			'rcm-footer' : "Versão $1 de $2",
			// Painel de opções
			'rcm-optionspanel-hideusersoverride': "data-hideusers o substitui",
			'rcm-optionspanel-savewithcookie': "Salvar mudanças pelo cookie",
			// Modulos
			'rcm-module-diff-title' : "Visualizador de página",
			'rcm-module-diff-open' : "Abrir página",
			'rcm-module-diff-undo' : "Desfazer mudança",
			// Outros
			'rcm-unknownthreadname' : "tópico",
			/***************************
			 * mediawiki.language.data - found by finding [ mw.loader.implement("mediawiki.language.data" ] in the page source. If not found may be cached, so visit page using a "private / incognito" window.
			 ***************************/
			mwLanguageData: {
				"digitTransformTable": null ,
				"separatorTransformTable": { ",": " ", ".": "," },
				"grammarForms": [],
				"pluralRules": ["n = 0..2 and n != 2 @integer 0, 1 @decimal 0.0, 1.0, 0.00, 1.00, 0.000, 1.000, 0.0000, 1.0000"],
				"digitGroupingPattern": null ,
				"fallbackLanguages": ["pt", "en"]
			},
		},
		ro: { // Română (ROMANIAN) @author: Josep Maria Roca Peña
			// Erori
			'rcm-eroare-linkformat' : "'$1' este un format incorect. Te rog să nu incluzi 'http://' sau oricare lucru după aceea, incluzând primul '/'.",
			'rcm-eroare-loading-syntaxhang' : "Eroare încărcând [$1] ($2 încercări). Te rog să corectezi sintaxele (sau reîncărca-ţi script-ul pentru a încerca din nou).",
			'rcm-eroare-loading-connection' : "Eroare încărcând [$1] ($2 încercări). Cu siguranţă, este o problemă de conexiune; reîncărca-ţi script-ul pentru a încerca din nou.",
			'rcm-eroare-trymoretimes' : "Încearcă-l mai mult de $1 ori",
			// Înştiinţări
			'rcm-loading' : "Încărcând/Clasificând…",
			'rcm-refresh' : "Reîncărcare",
			'rcm-download-timestamp' : "Schimburi recente descărcate pe: $1",
			'rcm-download-changesadded' : " - [$1 Schimburi recente adăugate]",
			// Bazici
			'rcm-wikisloaded' : "Wiki-uri încărcate: ",
			'rcm-previouslyloaded' : "În prealabil încărcate:",
			'rcm-nonewchanges' : "Nu există noi schimburi",
			'rcm-autorefresh' : "Actualizare automată",
			'rcm-autorefresh-tooltip' : "Reîncărcaţi schimburile recente în mod automat fiecare $1 secunde",
			'rcm-footer' : "Versiune $1 de $2",
			// Panou de opţiuni
			// 'rcm-optionspanel-hideusersoverride': "data-hideusers overrides this.",
			// 'rcm-optionspanel-savewithcookie': "Păstraţi schimburi dinspre cookie",
			// Module
			'rcm-module-diff-title' : "Vizualizatorul paginei",
			'rcm-module-diff-open' : "Deschideţi pagina",
			'rcm-module-diff-undo' : "Desfaceţi ediţia",
			// Mai mult
			'rcm-unknownthreadname' : "fir",
			/***************************
			 * mediawiki.language.data
			 ***************************/
			mwLanguageData: {
				"digitTransformTable": null ,
				"separatorTransformTable": { ",": ".", ".": "," },
				"grammarForms": [],
				"pluralRules": ["i = 1 and v = 0 @integer 1", "v != 0 or n = 0 or n != 1 and n % 100 = 1..19 @integer 0, 2~16, 101, 1001, … @decimal 0.0~1.5, 10.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …"],
				"digitGroupingPattern": null ,
				"fallbackLanguages": ["en"]
			},
		},
		ru: { // Русский (RUSSIAN) @author: Mix Gerder
			// Errors
			'rcm-error-linkformat' : "'$1' указан в неподходящем формате. Пожалуйста, не используйте элемент 'http://', не вставляйте ничего после него и первого '/'.",
			'rcm-error-loading-syntaxhang' : "Ошибка при загрузке [$1] (попыток: $2) Пожалуйста, исправьте синтаксис (или обновите скрипт, чтобы попытаться снова).",
			'rcm-error-loading-connection' : "Ошибка при загрузке [$1] (попыток: $2). Скорее всего, это ошибка с подключением, обновите скрипт, чтобы попробовать снова.",
			'rcm-error-trymoretimes' : "Попробуйте $1 раз(а)",
			// Notifications
			'rcm-loading' : "Загрузка/Сортировка...",
			'rcm-refresh' : "Обновить",
			'rcm-download-timestamp' : "Последние изменения взяты с: $1",
			'rcm-download-changesadded' : " - [$1 последних добавленных изменений]",
			// Basics
			'rcm-wikisloaded' : "Загруженные вики: ",
			'rcm-previouslyloaded' : "Ранее загруженные:",
			'rcm-nonewchanges' : "Нет новых изменений",
			'rcm-autorefresh' : "Автоматическое обновление",
			'rcm-autorefresh-tooltip' : "Автоматическое обновление последних изменений каждые $1 секунд",
			'rcm-footer' : "Версия $1, созданная $2",
			// Options Panel
			// 'rcm-optionspanel-hideusersoverride': "data-hideusers определяются так.",
			'rcm-optionspanel-savewithcookie': "Сохранить изменения в Cookie",
			// Modules
			'rcm-module-diff-title' : "Предварительный просмотр изменений",
			'rcm-module-diff-open' : "Показать изменения",
			'rcm-module-diff-undo' : "Отменить изменения",
			// Other
			'rcm-unknownthreadname' : "тема",
			/***************************
			 * mediawiki.language.data
			 ***************************/
			mwLanguageData: {
				"digitTransformTable": null ,
				"separatorTransformTable": { ",": " ", ".": "," },
				"grammarForms": [],
				"pluralRules": ["v = 0 and i % 10 = 1 and i % 100 != 11 @integer 1, 21, 31, 41, 51, 61, 71, 81, 101, 1001, …", "v = 0 and i % 10 = 2..4 and i % 100 != 12..14 @integer 2~4, 22~24, 32~34, 42~44, 52~54, 62, 102, 1002, …", "v = 0 and i % 10 = 0 or v = 0 and i % 10 = 5..9 or v = 0 and i % 100 = 11..14 @integer 0, 5~19, 100, 1000, 10000, 100000, 1000000, …"],
				"digitGroupingPattern": null ,
				"fallbackLanguages": ["en"]
			},
		},
		uk: { // Українська (UKRAINIAN) @author: Mix Gerder
			// Errors
			'rcm-error-linkformat' : "'$1' вказаний в невідповідному форматі. Будь ласка, не використовуйте елемент 'http://', не вставляйте нічого після нього і першого '/'.",
			'rcm-error-loading-syntaxhang' : "Помилка при завантаженні [$1] (спроб: $2) Будь ласка, виправте синтаксис (або поновіть скрипт, щоб спробувати знову).",
			'rcm-error-loading-connection' : "Помилка при завантаженні [$1] (спроб: $2). Швидше за все, це помилка з підключенням, поновіть скрипт, щоб спробувати знову.",
			'rcm-error-trymoretimes' : "Спробуйте $1 раз(а)",
			// Notifications
			'rcm-loading' : "Завантаження/Сортування...",
			'rcm-refresh' : "Оновити",
			'rcm-download-timestamp' : "Останні зміни взяті з: $1",
			'rcm-download-changesadded' : " - [$1 останніх доданих змін]",
			// Basics
			'rcm-wikisloaded' : "Завантажені вікі: ",
			'rcm-previouslyloaded' : "Раніше завантажені:",
			'rcm-nonewchanges' : "Немає нових змін",
			'rcm-autorefresh' : "Автоматичне оновлення",
			'rcm-autorefresh-tooltip' : "Автоматичне оновлення останніх змін кожні $1 секунд",
			'rcm-footer' : "Версія $1, що створена $2",
			// Options Panel
			// 'rcm-optionspanel-hideusersoverride': "data-hideusers визначаються так.",
			'rcm-optionspanel-savewithcookie': "Зберегти зміни в Cookie",
			// Modules
			'rcm-module-diff-title' : "Попередній перегляд змін",
			'rcm-module-diff-open' : "Показати зміни",
			'rcm-module-diff-undo' : "Скасувати зміни",
			// Other
			'rcm-unknownthreadname' : "тема",
			/***************************
			 * mediawiki.language.data
			 ***************************/
			mwLanguageData: {
				"digitTransformTable": null ,
				"separatorTransformTable": { ",": " ", ".": "," },
				"grammarForms": {
					"genitive": {
						"Вікіпедія": "Вікіпедії",
						"Вікісловник": "Вікісловника",
						"Вікісховище": "Вікісховища",
						"Вікіпідручник": "Вікіпідручника",
						"Вікіцитати": "Вікіцитат",
						"Вікіджерела": "Вікіджерел",
						"Вікіновини": "Вікіновин",
						"Вікідані": "Вікіданих",
						"Вікімандри": "Вікімандрів"
					},
					"dative": {
						"Вікіпедія": "Вікіпедії",
						"Вікісловник": "Вікісловнику",
						"Вікісховище": "Вікісховищу",
						"Вікіпідручник": "Вікіпідручнику",
						"Вікіцитати": "Вікіцитатам",
						"Вікіджерела": "Вікіджерелам",
						"Вікіновини": "Вікіновинам",
						"Вікідані": "Вікіданим",
						"Вікімандри": "Вікімандрам"
					},
					"accusative": {
						"Вікіпедія": "Вікіпедію",
						"Вікісловник": "Вікісловник",
						"Вікісховище": "Вікісховище",
						"Вікіпідручник": "Вікіпідручник",
						"Вікіцитати": "Вікіцитати",
						"Вікіджерела": "Вікіджерела",
						"Вікіновини": "Вікіновини",
						"Вікідані": "Вікідані",
						"Вікімандри": "Вікімандри"
					},
					"instrumental": {
						"Вікіпедія": "Вікіпедією",
						"Вікісловник": "Вікісловником",
						"Вікісховище": "Вікісховищем",
						"Вікіпідручник": "Вікіпідручником",
						"Вікіцитати": "Вікіцитатами",
						"Вікіджерела": "Вікіджерелами",
						"Вікіновини": "Вікіновинами",
						"Вікідані": "Вікіданими",
						"Вікімандри":
						"Вікімандрами"
					},
					"locative": {
						"Вікіпедія": "у Вікіпедії",
						"Вікісловник": "у Вікісловнику",
						"Вікісховище": "у Вікісховищі",
						"Вікіпідручник": "у Вікіпідручнику",
						"Вікіцитати": "у Вікіцитатах",
						"Вікіджерела": "у Вікіджерелах",
						"Вікіновини": "у Вікіновинах",
						"Вікідані": "у Вікіданих",
						"Вікімандри": "у Вікімандрах"
					},
					"vocative": {
						"Вікіпедія": "Вікіпедіє",
						"Вікісловник": "Вікісловнику",
						"Вікісховище": "Вікісховище",
						"Вікіпідручник": "Вікіпідручнику",
						"Вікіцитати": "Вікіцитати",
						"Вікіджерела": "Вікіджерела",
						"Вікіновини": "Вікіновини",
						"Вікідані": "Вікідані",
						"Вікімандри": "Вікімандри"
					}
				},
				"pluralRules": [
				"v = 0 and i % 10 = 1 and i % 100 != 11 @integer 1, 21, 31, 41, 51, 61, 71, 81, 101, 1001, …", "v = 0 and i % 10 = 2..4 and i % 100 != 12..14 @integer 2~4, 22~24, 32~34, 42~44, 52~54, 62, 102, 1002, …", "v = 0 and i % 10 = 0 or v = 0 and i % 10 = 5..9 or v = 0 and i % 100 = 11..14 @integer 0, 5~19, 100, 1000, 10000, 100000, 1000000, …"],
				"digitGroupingPattern": null ,
				"fallbackLanguages": ["ru", "en"]
			},
		},
		val: { // Valencià (VALENCIAN) @author: Josep Maria Roca Peña
			// Errors
			'rcm-error-linkformat' : "'$1' és un format incorrecte. Per favor, no afiggues 'http://' o alguna cosa darrere del domini, incloent el primer '/'.",
			'rcm-error-loading-syntaxhang' : "Error de càrrega [$1] ($2 intents). Per favor, corrig les tues sintaxis (o recarrega la tua script i intenta-ho un atre colp).",
			'rcm-error-loading-connection' : "Error de càrrega [$1] ($2 intents). Per un error de conexió, tens que recarregar la tua script i intenta-ho un atre colp.",
			'rcm-error-trymoretimes' : "Intenta-ho $1 més voltes",
			// Notificacions
			'rcm-loading' : "Carregant/Classificant…",
			'rcm-refresh' : "Actualisació",
			'rcm-download-timestamp' : "Canvis recents baixats a: ",
			'rcm-download-changesadded' : " - [$1 Canvis recents afegits]",
			// Bàsics
			'rcm-wikisloaded' : "Wikis carregats: ",
			'rcm-previouslyloaded' : "Breument carregats:",
			'rcm-nonewchanges' : "No hi ha nous canvis",
			'rcm-autorefresh' : "Actualisació automàtica",
			'rcm-autorefresh-tooltip' : "Recarregar automàticament els canvis recents cada $1 segons",
			'rcm-footer' : "Versió $1 de $2",
			// Panel d'opcions
			'rcm-optionspanel-hideusersoverride': "data-hideusers overrides this.",
			'rcm-optionspanel-savewithcookie': "Guardar els canvis pel cookie",
			// Mòduls
			'rcm-module-diff-title' : "Visualisador de pàgina",
			'rcm-module-diff-open' : "Obrir la pàgina",
			'rcm-module-diff-undo' : "Desfer el canvi",
			// Atres
			'rcm-unknownthreadname' : "tema",
			/***************************
			 * mediawiki.language.data
			 ***************************/
			mwLanguageData: {
				"digitTransformTable": null ,
				"separatorTransformTable": null ,
				"grammarForms": [],
				"pluralRules": ["i = 1 and v = 0 @integer 1"],
				"digitGroupingPattern": null ,
				"fallbackLanguages": ["en"]
			},
		},
		vi: { // Vietnamese @author: Dai ca superman
			'rcm-error-linkformat' : "'$1' không đúng định dạng. Xin đừng '''thêm''' 'http://' hay bất cứ ký tự gì trước tên miền trang, bao gồm dấu gạch chéo '/'.",
			'rcm-error-loading-syntaxhang' : "Lỗi tải [$1] ($2 lần thử). Hãy sửa lại đúng cú pháp (hoặc làm mới lại trang để thử lại.).",
			'rcm-error-loading-connection' : "Lỗi tải [$1] ($2 lần thử). Khả năng lớn đây là lỗi kết nối; làm mới lại trang để thử lại.",
			'rcm-error-trymoretimes' : "Thử thêm $1 lần nữa",

			'rcm-loading' : "Đang Tải/Đang Sắp Xếp...",
			'rcm-refresh' : "Làm mới",
			'rcm-download-timestamp' : "Thay Đổi Gần Đây đã được tải vào: $1",
			'rcm-download-changesadded' : " - [$1 Thay Đổi Gần Đây đã được thêm vào]",

			'rcm-wikisloaded' : "Các Wiki đã tải: ",
			'rcm-previouslyloaded' : "Đã tải trước đó:",
			'rcm-nonewchanges' : "Không có thay đổi nào mới",
			'rcm-autorefresh' : "Tự Động Làm Mới",
			'rcm-autorefresh-tooltip' : "Tự động làm mới trang Thay Đổi Gần Đây sau mỗi $1 giây",
			'rcm-footer' : "Phiên bản $1 bởi $2",

			'rcm-optionspanel-hideusersoverride': "data-hideusers đã loại trừ điều này.",
			'rcm-optionspanel-savewithcookie': "Lưu lại thiết đặt bằng cookie",

			'rcm-module-diff-title' : "Trình Xem Thay Đổi",
			'rcm-module-diff-open' : "Mở xem khác",
			'rcm-module-diff-undo' : "Lùi sửa",

			'rcm-unknownthreadname' : "luồng",
			/***************************
			 * mediawiki.language.data
			 ***************************/
			mwLanguageData: {
				"digitTransformTable": null ,
				"separatorTransformTable": {
					",": ".",
					".": ","
				},
				"grammarForms": [],
				"pluralRules": ["i = 1 and v = 0 @integer 1"],
				"digitGroupingPattern": null ,
				"fallbackLanguages": ["en"]
			},
		},
		zh: { // 中文 (CHINESE) @author: TsukiYaksha

			'rcm-error-linkformat' : "「$1」为错误格式。请'''不要'''在网域后加入「http://」或任何文字，包括第一个「/」字符。",
			'rcm-error-loading-syntaxhang' : "读取[$1]时发生错误（$2次尝试）。请更正语法（或刷新语法后再试一次）。",
			'rcm-error-loading-connection' : "读取[$1]时发生错误（$2次尝试）。极可能为联机问题。请刷新语法后再试一次。",
			'rcm-error-trymoretimes' : "请再试$1次",

			'rcm-loading' : "正在载入／整理中......",
			'rcm-refresh' : "刷新",
			'rcm-download-timestamp' : "最近更改于$1载入",
			'rcm-download-changesadded' : " - [已添加$1个最近更改内容]",

			'rcm-wikisloaded' : "已载入的维基：",
			'rcm-previouslyloaded' : "之前已加载：",
			'rcm-nonewchanges' : "无新更动",
			'rcm-autorefresh' : "自动刷新",
			'rcm-autorefresh-tooltip' : "每隔$1秒自动更新最近更改",
			'rcm-footer' : "由$2编辑的版本$1",

			'rcm-optionspanel-hideusersoverride': "以data-hideusers覆盖原有设定。",
			'rcm-optionspanel-savewithcookie': "使用cookie储存变动",

			'rcm-module-diff-title' : "差异查看器",
			'rcm-module-diff-open' : "开启差异",
			'rcm-module-diff-undo' : "复原编辑",

			'rcm-unknownthreadname' : "话题",
			/***************************
			 * mediawiki.language.data
			 ***************************/
			mwLanguageData: {
				"digitTransformTable": null ,
				"separatorTransformTable": null ,
				"grammarForms": [],
				"pluralRules": ["i = 1 and v = 0 @integer 1"],
				"digitGroupingPattern": null ,
				"fallbackLanguages": ["zh-hans", "en"]
			},
		},
		"zh-hant": { // 中文 (繁體) (CHINESE TRADITIONAL) @author: TsukiYaksha

			'rcm-error-linkformat' : "「$1」為錯誤格式。請'''不要'''在網域後加入「http://」或任何文字，包括第一個「/」字元。",
			'rcm-error-loading-syntaxhang' : "讀取[$1]時發生錯誤（$2 次嘗試）。請更正語法（或重新載入語法後再試一次）。",
			'rcm-error-loading-connection' : "讀取[$1]時發生錯誤（$2 次嘗試）。極可能為連線問題。請重新載入語法後再試一次。",
			'rcm-error-trymoretimes' : "請再試$1次",

			'rcm-loading' : "正在載入／整理中......",
			'rcm-refresh' : "重新整理",
			'rcm-download-timestamp' : "近期變動於$1載入",
			'rcm-download-changesadded' : " - [已新增$1個近期變動內容]",

			'rcm-wikisloaded' : "已載入的維基：",
			'rcm-previouslyloaded' : "之前已載入：",
			'rcm-nonewchanges' : "無新變更",
			'rcm-autorefresh' : "自動重整",
			'rcm-autorefresh-tooltip' : "每隔$1秒自動更新近期變動",
			'rcm-footer' : "由$2編輯的版本$1",

			'rcm-optionspanel-hideusersoverride': "以data-hideusers覆蓋原有設定。",
			'rcm-optionspanel-savewithcookie': "使用cookie儲存變動",

			'rcm-module-diff-title' : "差異檢視器",
			'rcm-module-diff-open' : "開啟差異",
			'rcm-module-diff-undo' : "復原編輯",

			'rcm-unknownthreadname' : "討論串",
			/***************************
			 * mediawiki.language.data
			 ***************************/
			mwLanguageData: {
				"digitTransformTable": null ,
				"separatorTransformTable": null ,
				"grammarForms": [],
				"pluralRules": ["i = 1 and v = 0 @integer 1"],
				"digitGroupingPattern": null ,
				"fallbackLanguages": ["zh-hans", "en"]
			},
		},
	};

	/*******************************************************************************
	 * DO NOT CHANGE THIS WHEN TRANSLATING
	 * MESSAGES is all text that is retrieved from the Wikia servers for any supported language.
	 * If it is necessary to overwrite a system message, simply add its key to the TEXT object with the new text for your language.
	 *******************************************************************************/
	i18n.MESSAGES = {
		/***************************
		 * Common Stuff
		 ***************************/
		// https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/languages/messages/MessagesEn.php
		'talkpagelinktext' : 'Talk', // L830 - "Talk" is more inter-wiki appropriate than "wall" (wall-message-wall-shorten)
		'cur' : 'cur', // L1492
		'last' : 'prev', // L1494
		'recentchanges-legend' : 'Recent changes options', // 2038
		'rclinks' : 'Show last $1 changes in last $2 days<br />$3', // 2054
		'rcshowhideminor'		: '$1 minor edits', // 2048
		'rcshowhidebots'		: '$1 bots', // 2049
		'rcshowhideliu'			: '$1 logged-in users', // 2050
		'rcshowhideanons'		: '$1 anonymous users', // 2051
		// 'rcshowhidepatr'		: '$1 patrolled edits', // 2052
		'rcshowhidemine'		: '$1 my edits', // 2053
		'rcshowhideenhanced'	: '$1 grouped recent changes',
		'rcshowhidelogs'		: '$1 logs',
		'diff' : 'diff', // L2055
		'hist' : 'hist', // L2056
		'hide' : 'Hide', // L2057
		'show' : 'Show', // L2058
		'minoreditletter' : 'm',
		'newpageletter' : 'N', // L2060
		'boteditletter' : 'b',
		'unpatrolledletter' : '!',
		'blocklink' : 'block', // L3150
		'contribslink' : 'contribs', // L3153
		'nchanges' : '$1 {{PLURAL:$1|change|changes}}', // L4650
		'rollbacklink' : 'rollback', // L2869
		// Tooltips
		'recentchanges-label-newpage' : 'This edit created a new page', // L2041
		'recentchanges-label-minor' : 'This is a minor edit',
		'recentchanges-label-bot' : 'This edit was performed by a bot',
		'recentchanges-label-unpatrolled' : 'This edit has not yet been patrolled',
		'rc-enhanced-expand' : 'Show details (requires JavaScript)', // L2070
		'rc-enhanced-hide' : 'Hide details', // L2071
		// "Extra" support - "# only translate this message to other languages if you have to change it"
		'semicolon-separator' : ';&#32;',
		'pipe-separator' : '&#32;|&#32;',
		'parentheses' : '($1)',
		// Revision deletion
		'rev-deleted-comment' : '(edit summary removed)',
		'rev-deleted-user' : '(username removed)',
		'rev-deleted-event' : '(log action removed)',
		// https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/extensions/wikia/ArticleComments/ArticleComments.i18n.php
		'article-comments-rc-comment' : 'Article comment (<span class="plainlinks">[$1 $2]</span>)',
		'article-comments-rc-comments' : 'Article comments ([[$1]])',
		'and' : '&#32;and',
		// Wiki Infobar
		'recentchanges' : 'Recent changes',
		'newpages' : 'New pages',
		'newimages' : 'New photos', // There is no text for "New Files"; this was closest I could find. Alts: prefs-files (Files), listfiles (File list), statistics-files (Uploaded files)
		'log' : 'Logs',
		'insights' : 'Insights',
		'randompage' : 'Random page',
		'group-sysop' : 'Administrators',
		'group-user' : 'Users',
		'prefs-files' : 'Files',
		'awc-metrics-articles' : 'Articles',
		'awc-metrics-edits' : 'Edits',
		'filedelete-success' : "'''$1''' has been deleted.",
		'shared_help_was_redirect' : 'This page is a redirect to $1',
		'specialvideos-btn-load-more' : 'Load More',
		'flags-edit-modal-close-button-text' : 'Close',
		'awc-metrics-images' : 'Images',
		'wikifeatures-promotion-new' : 'New',
		'wikiacuratedcontent-content-empty-section' : 'This section needs some items',
		'myhome-feed-edited-by' : 'edited by $1',
		'edit-summary' : 'Edit summary',
		
		/***************************
		 * Log Names - wgLogHeaders
		 ***************************/
		// https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/languages/messages/MessagesEn.php
		'blocklogpage'						: 'Block log', // L3157
		'dellogpage'						: 'Deletion log', // L2848
		'importlogpage'						: 'Import log',// L3422
		'mergelog'							: 'Merge log', // L1643
		'movelogpage'						: 'Move log', // L3285
		'protectlogpage'					: 'Protection log', // L2890
		'uploadlogpage'						: 'Upload log', // L2115
		'newuserlogpage'					: 'User creation log', // L2695
		'rightslog'							: 'User rights log', // L1991
		// ## Non-standard Mediawiki logs ##
		// https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/extensions/wikia/UserProfilePageV3/UserProfilePage.i18n.php
		'useravatar-log'					: 'User avatar log',
		// https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/extensions/wikia/UserRenameTool/SpecialRenameuser.i18n.php
		'userrenametool-logpage'			: 'User rename log',
		// ## Wiki Features ##
		// https://github.com/Wikia/app/blob/bf1e586c95224922577b6feea8293df341265a44/extensions/wikia/WikiFeatures/WikiFeatures.i18n.php
		'wikifeatures-log-name'				: 'Wiki Features log',
		// https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/extensions/wikia/Chat2/Chat.i18n.php
		'chat-chatban-log'					: 'Chat ban log',
		// https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/extensions/wikia/WikiaMaps/WikiaMaps.i18n.php
		'wikia-interactive-maps-log-name'	: 'Maps log',
		// ## Extensions ##
		// https://git.wikimedia.org/blob/mediawiki%2Fextensions%2FAbuseFilter/be09eabbdd591fb869b30cd4e77a286763cbe4e1/i18n%2Fen.json
		'abusefilter-log'					: 'Abuse filter log',

		/***************************
		 * Log Actions -
		 ***************************/
		// https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/languages/messages/MessagesEn.php
		// Block
		'blocklogentry'                   : 'blocked [[$1]] with an expiry time of $2 $3',
		'reblock-logentry'                : 'changed block settings for [[$1]] with an expiry time of $2 $3',
		'unblocklogentry'                 : 'unblocked $1',

		'block-log-flags-anononly'        : 'anonymous users only',
		'block-log-flags-nocreate'        : 'account creation disabled',
		'block-log-flags-noautoblock'     : 'autoblock disabled',
		'block-log-flags-noemail'         : 'e-mail blocked',
		'block-log-flags-nousertalk'      : 'cannot edit own talk page',
		'block-log-flags-angry-autoblock' : 'enhanced autoblock enabled',
		'block-log-flags-hiddenname'      : 'username hidden',
		// Delete
		'logentry-delete-delete'              : '$1 deleted page $3',
		'logentry-delete-restore'             : '$1 restored page $3',
		'logentry-delete-event'               : '$1 changed visibility of {{PLURAL:$5|a log event|$5 log events}} on $3: $4',
		'logentry-delete-revision'            : '$1 changed visibility of {{PLURAL:$5|a revision|$5 revisions}} on page $3: $4',
		'logentry-delete-event-legacy'        : '$1 changed visibility of log events on $3',
		'logentry-delete-revision-legacy'     : '$1 changed visibility of revisions on page $3',

		'revdelete-content-hid'               : 'content hidden',
		'revdelete-summary-hid'               : 'edit summary hidden',
		// Import
		'import-logentry-upload'           : 'imported [[$1]] by file upload',
		'import-logentry-interwiki'        : 'transwikied $1',
		// Merge
		'pagemerge-logentry'	: 'merged [[$1]] into [[$2]] (revisions up to $3)',
		// Move
		'logentry-move-move'                  : '$1 moved page $3 to $4',
		'logentry-move-move-noredirect'       : '$1 moved page $3 to $4 without leaving a redirect',
		'logentry-move-move_redir'            : '$1 moved page $3 to $4 over redirect',
		'logentry-move-move_redir-noredirect' : '$1 moved page $3 to $4 over a redirect without leaving a redirect',
		// Protect
		'protectedarticle'            : 'protected "[[$1]]"',
		'modifiedarticleprotection'   : 'changed protection level for "[[$1]]"',
		'unprotectedarticle'          : 'removed protection from "[[$1]]"',
		'movedarticleprotection'      : 'moved protection settings from "[[$2]]" to "[[$1]]"',
		// Upload
		'uploadedimage'               : 'uploaded "[[$1]]"',
		'overwroteimage'              : 'uploaded a new version of "[[$1]]"',
		// New User
		'logentry-newusers-newusers'          : '$1 created a user account',
		'logentry-newusers-create'            : '$1 created a user account',
		'logentry-newusers-create2'           : '$1 created a user account $3',
		'logentry-newusers-autocreate'        : 'Account $1 was created automatically',
		// Rights
		'rightslogentry'             : 'changed group membership for $1 from $2 to $3',
		'rightslogentry-autopromote' : 'was automatically promoted from $2 to $3',
		'rightsnone'                 : '(none)',
		// ## Non-standard Mediawiki logs ##
		// User Avatar - https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/extensions/wikia/UserProfilePageV3/UserProfilePage.i18n.php
		'blog-avatar-changed-log' : 'Added or changed avatar',
		'blog-avatar-removed-log' : "Removed $1's avatars",
		// User Rename - https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/extensions/wikia/UserRenameTool/SpecialRenameuser.i18n.php
		'userrenametool-success' : 'The user "$1" has been renamed to "$2".',
		// ## Wiki Features ##
		// Wiki Features - https://github.com/Wikia/app/blob/bf1e586c95224922577b6feea8293df341265a44/extensions/wikia/WikiFeatures/WikiFeatures.i18n.php

		// Chat - https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/extensions/wikia/Chat2/Chat.i18n.php
		'chat-chatbanadd-log-entry' : 'banned $1 from chat with an expiry time of $2, ends $3',
		'chat-chatbanremove-log-entry' : 'unbanned $1 from chat',
		'chat-chatbanchange-log-entry' : 'changed ban settings for $1 with an expiry time of $2, ends $3',
		// Maps - https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/extensions/wikia/WikiaMaps/WikiaMaps.i18n.php
		'logentry-maps-create_map' : '$1 created new map $3',
		'logentry-maps-update_map' : '$1 updated map $3',
		'logentry-maps-delete_map' : '$1 deleted map $3',
		'logentry-maps-undelete_map' : '$1 restored map $3',
		'logentry-maps-create_pin_type' : '$1 created new pin category for $3',
		'logentry-maps-update_pin_type' : '$1 updated pin category for $3',
		'logentry-maps-delete_pin_type' : '$1 deleted pin category for $3',
		'logentry-maps-create_pin' : '$1 created new pin for $3',
		'logentry-maps-update_pin' : '$1 updated pin for $3',
		'logentry-maps-delete_pin' : '$1 deleted pin for $3',
		// ## Extensions ##
		// Abuse Filter - https://git.wikimedia.org/blob/mediawiki%2Fextensions%2FAbuseFilter/be09eabbdd591fb869b30cd4e77a286763cbe4e1/i18n%2Fen.json
		"abusefilter-log-entry-modify" : "modified $1 ($2)",
		"abusefilter-log-detailslink" : "details",

		/***************************
		 * Wall - https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/extensions/wikia/Wall/Wall.i18n.php#L191
		 ***************************/
		'wall-recentchanges-edit'					: 'edited message',
		'wall-recentchanges-removed-thread'			: 'removed thread "[[$1|$2]]" from [[$3|$4\'s wall]]',
		'wall-recentchanges-removed-reply'			: 'removed reply from "[[$1|$2]]" from [[$3|$4\'s wall]]',
		'wall-recentchanges-restored-thread'		: 'restored thread "[[$1|$2]]" to [[$3|$4\'s wall]]',
		'wall-recentchanges-restored-reply'			: 'restored reply on "[[$1|$2]]" to [[$3|$4\'s wall]]',
		'wall-recentchanges-deleted-thread'			: 'deleted thread "[[$1|$2]]" from [[$3|$4\'s wall]]',
		'wall-recentchanges-deleted-reply'			: 'deleted reply from "[[$1|$2]]" from [[$3|$4\'s wall]]',
		'wall-recentchanges-closed-thread'			: 'closed thread "[[$1|$2]]" on [[$3|$4\'s wall]]',
		'wall-recentchanges-reopened-thread'		: 'reopened thread "[[$1|$2]]" on [[$3|$4\'s wall]]',
		'wall-recentchanges-thread-group'			: '$1 on [[$2|$3\'s wall]]',
		'wall-recentchanges-history-link'			: 'wall history',
		'wall-recentchanges-thread-history-link'	: 'thread history',

		/***************************
		 * Forum Boards - https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/extensions/wikia/Forum/Forum.i18n.php#L113
		 ***************************/
		'forum-recentchanges-edit'					: 'edited message',
		'forum-recentchanges-removed-thread'		: 'removed thread "[[$1|$2]]" from the [[$3|$4 Board]]',
		'forum-recentchanges-removed-reply'			: 'removed reply from "[[$1|$2]]" from the [[$3|$4 Board]]',
		'forum-recentchanges-restored-thread'		: 'restored thread "[[$1|$2]]" to the [[$3|$4 Board]]',
		'forum-recentchanges-restored-reply'		: 'restored reply on "[[$1|$2]]" to the [[$3|$4 Board]]',
		'forum-recentchanges-deleted-thread'		: 'deleted thread "[[$1|$2]]" from the [[$3|$4 Board]]',
		'forum-recentchanges-deleted-reply'			: 'deleted reply from "[[$1|$2]]" from the [[$3|$4 Board]]',
		'forum-recentchanges-thread-group'			: '$1 on the [[$2|$3 Board]]',
		'forum-recentchanges-history-link'			: 'board history',
		'forum-recentchanges-thread-history-link'	: 'thread history',
		'forum-recentchanges-closed-thread'			: 'closed thread "[[$1|$2]]" from [[$3|$4]]',
		'forum-recentchanges-reopened-thread'		: 'reopened thread "[[$1|$2]]" from [[$3|$4]]',
	};

	// http://download.remysharp.com/wiki2html.js
	i18n.wiki2html = function(pText) {
		if(pText == undefined) { console.log("ERROR: [RecentChangesMultiple] i18n.wiki2html was passed an undefined string"); return pText; };
		var args = Array.prototype.slice.call(arguments, 1); // Used for formatting string with $1

		return pText
			// bold
			.replace(/'''(.*?)'''/g, function (m, l) {
				return '<strong>' + l + '</strong>';
			})
			// italic
			.replace(/''(.*?)''/g, function (m, l) {
				return '<em>' + l + '</em>';
			})
			// normal link
			.replace(/[^\[](http[^\[\s]*)/g, function (m, l) {
				return '<a href="' + l + '">' + l + '</a>';
			})
			// format string by replacing wiki $1 string vars with text.
			.replace(/\$(\d+)/g, function(match, number) {
				return typeof args[number-1] != 'undefined' ? args[number-1]  : match ;
			})
			// internal link or image
			.replace(/\[\[(.*?)\]\]/g, function (m, l) {
				var p = l.split(/\|/);
				var link = p.shift();

				// if (link.match(/^Image:(.*)/)) {
				// 	// no support for images - since it looks up the source from the wiki db
				// 	return m;
				// } else {
					return '<a href="' + link + '">' + (p.length ? p.join('|') : link) + '</a>';
				// }
			})
			// external link
			.replace(/[\[](http:\/\/.*|\/\/.*)[!\]]/g, function (m, l) {
				var p = l.replace(/[\[\]]/g, '').split(/ /);
				var link = p.shift();
				return '<a href="' + link + '">' + (p.length ? p.join(' ') : link) + '</a>';
			})
			/*******************************************************************************
			 * https://doc.wikimedia.org/mediawiki-core/master/js/#!/api/mw.language
			 *******************************************************************************/
			// {{GENDER}} - cannot be checked by script, so just uses {{{1}}}/{{{2}}}
			.replace(/{{GENDER:(.*?)}}/g, function(m, l) {
				var p = l.split("|");
				var user = p.shift(); // Currently doesn't work, so this will just assume male.
				return mw.language.gender(user, p);
			})
			// {{PLURAL}} - only does default support
			.replace(/{{PLURAL:(.*?)}}/g, function(m, l) {
				var p = l.split("|");
				var num = p.shift();
				return mw.language.convertPlural(num, p);
			})
			// {{GRAMMAR}}
			.replace(/{{GRAMMAR:(.*?)}}/g, function(m, l) {
				var p = l.split("|");
				//var num = p.shift();
				return mw.language.convertGrammar(p[1], p[0]);
			})
		;
	};

	return i18n;
})(window.jQuery, document, window.mediaWiki, window.dev.RecentChangesMultiple);
//</syntaxhighlight>

//<syntaxhighlight lang="javascript">

//######################################
// #### Run-time Options ####
// * Custom version of RC "options" section, using url params to keep track of options.
//######################################
window.dev.RecentChangesMultiple.RCMOptions = (function($, document, mw, module, Utils, i18n){
	"use strict";
	
	function RCMOptions(pManager) {
		this.manager = pManager; // {RCMManager} Keep track of what manager this data is attached to.
		this.root = null;
		this.localStorageID = module.OPTIONS_SETTINGS_LOCAL_STORAGE_ID + "-" + pManager.modID.replace(".", ""),
		
		/***************************
		 * Data
		 ***************************/
		this.rcParams				= null;
		
		/***************************
		 * Fields
		 ***************************/
		this.settingsSaveCookieCheckbox		= null;
		
		this.limitField				= null;
		this.daysField				= null;
		
		this.minorEditsCheckbox		= null;
		this.botsCheckbox			= null;
		this.anonsCheckbox			= null;
		this.usersCheckbox			= null;
		this.myEditsCheckbox		= null;
		this.groupedChangesCheckbox	= null;
		this.logsCheckbox			= null;
	}
	
	RCMOptions.prototype.dispose = function() {
		this.removeEventListeners();
		
		this.manager = null;
		this.root = null;
		
		this.rcParams = null;
		this.limitField				= null;
		this.daysField				= null;
		
		this.minorEditsCheckbox		= null;
		this.botsCheckbox			= null;
		this.anonsCheckbox			= null;
		this.usersCheckbox			= null;
		this.myEditsCheckbox		= null;
		this.groupedChangesCheckbox	= null;
		this.logsCheckbox			= null;
	}
	
	RCMOptions.prototype.init = function(pElem) {
		this.root = pElem;
		this.rcParams = this.getSave();//$.extend({}, this.manager.rcParamsBase);
		this.manager.rcParams = $.extend(this.manager.rcParams, this.rcParams);
		
		if(module.langLoaded) {
			this._addElements();
		} else {
			var self = this;
			module.onLangLoadCallbacks.push(function(){ self._addElements(); });
		}
		
		return this;
	}
	
	RCMOptions.prototype._addElements = function() {
		var tFieldset = Utils.newElement("fieldset", { className:"rcoptions collapsible" }, this.root);
		Utils.newElement("legend", { innerHTML:i18n('recentchanges-legend') }, tFieldset);
		var tContent = Utils.newElement("div", { className:"rc-fieldset-content" }, tFieldset);
		
		/***************************
		 * RCMOptions settings
		 ***************************/
		var tSettingsPanel = Utils.newElement("aside", { className:"rcm-options-settings" }, tContent);
		tSettingsPanel.innerHTML = '<svg style="height:19px; vertical-align: top;" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"  viewBox="0 0 24 24" enable-background="new 0 0 24 24" xml:space="preserve"><path d="M20,14.5v-2.9l-1.8-0.3c-0.1-0.4-0.3-0.8-0.6-1.4l1.1-1.5l-2.1-2.1l-1.5,1.1c-0.5-0.3-1-0.5-1.4-0.6L13.5,5h-2.9l-0.3,1.8 C9.8,6.9,9.4,7.1,8.9,7.4L7.4,6.3L5.3,8.4l1,1.5c-0.3,0.5-0.4,0.9-0.6,1.4L4,11.5v2.9l1.8,0.3c0.1,0.5,0.3,0.9,0.6,1.4l-1,1.5 l2.1,2.1l1.5-1c0.4,0.2,0.9,0.4,1.4,0.6l0.3,1.8h3l0.3-1.8c0.5-0.1,0.9-0.3,1.4-0.6l1.5,1.1l2.1-2.1l-1.1-1.5c0.3-0.5,0.5-1,0.6-1.4 L20,14.5z M12,16c-1.7,0-3-1.3-3-3s1.3-3,3-3s3,1.3,3,3S13.7,16,12,16z" fill="currentColor" /></svg>';
		
		this.settingsSaveCookieCheckbox = Utils.newElement("input", { type:"checkbox" }, tSettingsPanel);
		Utils.addTextTo(i18n('rcm-optionspanel-savewithcookie'), tSettingsPanel);
		
		this.settingsSaveCookieCheckbox.checked = this.isSaveEnabled();//!$.isEmptyObject(this.rcParams);
		
		/***************************
		 * First line of choices (numbers)
		 ***************************/
		var tRow1Text = i18n('rclinks').split("<br />")[0].split("$3")[0].split(/\$1|\$2/);
		var tRow1 = Utils.newElement("div", {  }, tContent);
		
		Utils.addTextTo(tRow1Text[0], tRow1);
		this.limitField = Utils.newElement("select", {}, tRow1);
		Utils.addTextTo(tRow1Text[1], tRow1);
		this.daysField = Utils.newElement("select", {}, tRow1);
		Utils.addTextTo(tRow1Text[2]||"", tRow1);
		
		/***************************
		 * Second line of choices (checkboxes)
		 ***************************/
		var tRow2 = Utils.newElement("div", {  }, tContent);
		var t1Text = "";//i18n('show');
		
		this.minorEditsCheckbox = Utils.newElement("input", { type:"checkbox" }, tRow2);
		Utils.addTextTo(i18n('rcshowhideminor', t1Text), tRow2);
		
		Utils.addTextTo(" | ", tRow2);
		
		this.botsCheckbox = Utils.newElement("input", { type:"checkbox" }, tRow2);
		Utils.addTextTo(i18n('rcshowhidebots', t1Text), tRow2);
		
		Utils.addTextTo(" | ", tRow2);
		
		this.anonsCheckbox = Utils.newElement("input", { type:"checkbox" }, tRow2);
		Utils.addTextTo(i18n('rcshowhideanons', t1Text), tRow2);
		
		Utils.addTextTo(" | ", tRow2);
		
		this.usersCheckbox = Utils.newElement("input", { type:"checkbox" }, tRow2);
		Utils.addTextTo(i18n('rcshowhideliu', t1Text), tRow2);
		
		Utils.addTextTo(" | ", tRow2);
		
		this.myEditsCheckbox = Utils.newElement("input", { type:"checkbox" }, tRow2);
		Utils.addTextTo(i18n('rcshowhidemine', t1Text), tRow2);
		if(mw.config.get("wgUserName") && this.manager.hideusers.indexOf(mw.config.get("wgUserName")) != -1) {
			this.myEditsCheckbox.disabled = true;
			this.myEditsCheckbox.checked = false;
			this.myEditsCheckbox.title = i18n('rcm-optionspanel-hideusersoverride');
		}
		
		Utils.addTextTo(" | ", tRow2);
		
		this.groupedChangesCheckbox = Utils.newElement("input", { type:"checkbox" }, tRow2);
		Utils.addTextTo(i18n('rcshowhideenhanced', t1Text), tRow2);
		
		Utils.addTextTo(" | ", tRow2);
		
		this.logsCheckbox = Utils.newElement("input", { type:"checkbox" }, tRow2);
		Utils.addTextTo(i18n('rcshowhidelogs', t1Text), tRow2);
		
		/***************************
		 * Finish - make this work!
		 ***************************/
		this.addEventListeners();
		
		this.refresh();
		return this;
	}
	
	// Add / set the values of the fields.
	RCMOptions.prototype.refresh = function() {
		/***************************
		 * Limit - max changes returned
		 ***************************/
		this.limitField.innerHTML = "";
		var tLimit = this.manager.rcParams.limit;
		var tLimitValues = [25, 50, 75, 100, 200, 350, 500];
		for(var i = 0; i < tLimitValues.length; i++) {
			if(tLimit != tLimitValues[i] && tLimit < tLimitValues[i] && (i > 0 && tLimit > tLimitValues[i-1])) {
				Utils.newElement("option", { value:tLimit, innerHTML:tLimit, selected:"selected" }, this.limitField);
			}
			Utils.newElement("option", { value:tLimitValues[i], innerHTML:tLimitValues[i], selected:(tLimit == tLimitValues[i] ? "selected" : undefined) }, this.limitField);
		}
		if(tLimit > tLimitValues[tLimitValues.length-1]) {
			Utils.newElement("option", { value:tLimit, innerHTML:tLimit, selected:"selected" }, this.limitField);
		}
		
		/***************************
		 * Days - max changes returned up to _ days before
		 ***************************/
		this.daysField.innerHTML = "";
		var tDays = this.manager.rcParams.days;
		var tDayValues = [1, 3, 7, 14, 30];
		for(var i = 0; i < tDayValues.length; i++) {
			if(tDays != tDayValues[i] && tDays < tDayValues[i] && (i > 0 && tDays > tDayValues[i-1])) {
				Utils.newElement("option", { value:tDays, innerHTML:tDays, selected:"selected" }, this.daysField);
			}
			Utils.newElement("option", { value:tDayValues[i], innerHTML:tDayValues[i], selected:(tDays == tDayValues[i] ? "selected" : undefined) }, this.daysField);
		}
		if(tDays > tDayValues[tDayValues.length-1]) {
			Utils.newElement("option", { value:tDays, innerHTML:tDays, selected:"selected" }, this.daysField);
		}
		
		/***************************
		 * Checkboxes
		 ***************************/
		this.minorEditsCheckbox.checked = !this.manager.rcParams.hideminor;
		this.botsCheckbox.checked = !this.manager.rcParams.hidebots;
		this.anonsCheckbox.checked = !this.manager.rcParams.hideanons;
		this.usersCheckbox.checked = !this.manager.rcParams.hideliu;
		this.myEditsCheckbox.checked = !this.manager.rcParams.hidemyself;
		this.groupedChangesCheckbox.checked = !this.manager.rcParams.hideenhanced;
		this.logsCheckbox.checked = !this.manager.rcParams.hidelogs;
	}
	
	RCMOptions.prototype.addEventListeners = function() {
		this.settingsSaveCookieCheckbox.addEventListener("change", this._onChange_settingsSaveCookie.bind(this));
		
		this.limitField.addEventListener("change", this._onChange_limit.bind(this));
		this.daysField.addEventListener("change", this._onChange_days.bind(this));
		
		this.minorEditsCheckbox.addEventListener("change", this._onChange_hideminor.bind(this));
		this.botsCheckbox.addEventListener("change", this._onChange_hidebots.bind(this));
		this.anonsCheckbox.addEventListener("change", this._onChange_hideanons.bind(this));
		this.usersCheckbox.addEventListener("change", this._onChange_hideliu.bind(this));
		this.myEditsCheckbox.addEventListener("change", this._onChange_hidemyself.bind(this));
		this.groupedChangesCheckbox.addEventListener("change", this._onChange_hideenhanced.bind(this));
		this.logsCheckbox.addEventListener("change", this._onChange_hidelogs.bind(this));
	}
	
	RCMOptions.prototype.removeEventListeners = function() {
		this.settingsSaveCookieCheckbox.removeEventListener("change", this._onChange_settingsSaveCookie.bind(this));
		
		this.limitField.removeEventListener("change", this._onChange_limit);
		this.daysField.removeEventListener("change", this._onChange_days);
		
		this.minorEditsCheckbox.removeEventListener("change", this._onChange_hideminor);
		this.botsCheckbox.removeEventListener("change", this._onChange_hidebots);
		this.anonsCheckbox.removeEventListener("change", this._onChange_hideanons);
		this.usersCheckbox.removeEventListener("change", this._onChange_hideliu);
		this.myEditsCheckbox.removeEventListener("change", this._onChange_hidemyself);
		this.groupedChangesCheckbox.removeEventListener("change", this._onChange_hideenhanced);
		this.logsCheckbox.removeEventListener("change", this._onChange_hidelogs);
	}
	
	/***************************
	 * Events
	 ***************************/
	RCMOptions.prototype._onChange_limit = function(pEvent) {
		this.afterChangeNumber("limit", parseInt(pEvent.target.value));
	}
	
	RCMOptions.prototype._onChange_days = function(pEvent) {
		this.afterChangeNumber("days", parseInt(pEvent.target.value));
	}
	
	RCMOptions.prototype._onChange_hideminor = function(pEvent) {
		this.afterChangeBoolean("hideminor", !pEvent.target.checked);
	}
	
	RCMOptions.prototype._onChange_hidebots = function(pEvent) {
		this.afterChangeBoolean("hidebots", !pEvent.target.checked);
	}
	
	RCMOptions.prototype._onChange_hideanons = function(pEvent) {
		// Both "hideanons" and "hideliu" cannot be true
		if(pEvent.target.checked == false && this.usersCheckbox.checked == false) {
			this.manager.rcParams["hideliu"] = false;
			this.usersCheckbox.checked = true;
		}
		this.afterChangeBoolean("hideanons", !pEvent.target.checked);
	}
	
	RCMOptions.prototype._onChange_hideliu = function(pEvent) {
		// Both "hideanons" and "hideliu" cannot be true
		if(pEvent.target.checked == false && this.anonsCheckbox.checked == false) {
			this.manager.rcParams["hideanons"] = false;
			this.anonsCheckbox.checked = true;
		}
		this.afterChangeBoolean("hideliu", !pEvent.target.checked);
	}
	
	RCMOptions.prototype._onChange_hidemyself = function(pEvent) {
		this.afterChangeBoolean("hidemyself", !pEvent.target.checked);
	}
	
	RCMOptions.prototype._onChange_hideenhanced = function(pEvent) {
		this.afterChangeBoolean("hideenhanced", !pEvent.target.checked);
	}
	
	RCMOptions.prototype._onChange_hidelogs = function(pEvent) {
		this.afterChangeBoolean("hidelogs", !pEvent.target.checked);
	}
	
	RCMOptions.prototype._onChange_settingsSaveCookie = function(pEvent) {
		if(pEvent.target.checked) {
			this.save();
		} else {
			localStorage.removeItem(this.localStorageID);
		}
	}
	
	/***************************
	 * Helper Methods
	 ***************************/
	// Will add / edit the url param & script value with details entered.
	RCMOptions.prototype.afterChangeNumber = function(pKey, pVal) {
		this.rcParams[pKey] = pVal;
		this.manager.rcParams[pKey] = pVal;
		this.manager.refresh(true);
		this.save();
	}
	
	RCMOptions.prototype.afterChangeBoolean = function(pKey, pVal) {
		this.rcParams[pKey] = pVal;
		this.manager.rcParams[pKey] = pVal;
		this.manager.refresh(true);
		this.save();
	}
	
	RCMOptions.prototype.save = function() {
		if(this.settingsSaveCookieCheckbox.checked) {
			localStorage.setItem(this.localStorageID, JSON.stringify(this.rcParams));
		}
	}
	
	RCMOptions.prototype.getSave = function() {
		return localStorage.getItem(this.localStorageID)
			? JSON.parse(localStorage.getItem(this.localStorageID))
			: {}
			;
	}
	
	RCMOptions.prototype.isSaveEnabled = function() {
		return localStorage.getItem(this.localStorageID) != null;
	}
	
	return RCMOptions;
	
})(window.jQuery, document, window.mediaWiki, window.dev.RecentChangesMultiple, window.dev.RecentChangesMultiple.Utils, window.dev.RecentChangesMultiple.i18n);
//</syntaxhighlight>

//<syntaxhighlight lang="javascript">

//######################################
// #### Wiki Panel ####
// * Show the current loaded wikis, as well as any information pertaining to them.s
//######################################
window.dev.RecentChangesMultiple.RCMWikiPanel = (function($, document, mw, module, Utils, i18n){
	"use strict";
	
	// Constructor
	function RCMWikiPanel(pManager) {
		this.manager = pManager; // {RCMManager} Keep track of what manager this data is attached to.
		this.root = null;
		
		/***************************
		 * HTML Elements/Nodes
		 ***************************/
		this.listNode		= null; // {HTMLElement}
		this.infoNode		= null; // {HTMLElement}
		
		/***************************
		 * Storage
		 ***************************/
		this.singleWiki = this.manager.chosenWikis.length == 1; // If this panel's manager only contains one wiki.
	}
	
	RCMWikiPanel.prototype.dispose = function() {
		this.manager	= null;
		this.root		= null;
		
		this.listNode	= null;
		this.infoNode	= null;
	}
	
	// Should only be called once.
	RCMWikiPanel.prototype.init = function(pElem) {
		this.root = pElem;
		
		if(!this.singleWiki) this.listNode = Utils.newElement("span", { className:"rcm-wikis-list" }, this.root);
		this.infoNode = Utils.newElement("div", { className:"rcm-wikis-info" }, this.root);
		
		return this;
	}
	
	// Clear panel (on refresh).
	RCMWikiPanel.prototype.populate = function() {
		if(!this.singleWiki) {
			this.listNode.innerHTML = i18n('rcm-wikisloaded');
		}
	}
	
	// Clear panel (on refresh).
	RCMWikiPanel.prototype.clear = function() {
		if(!this.singleWiki) {
			this.listNode.innerHTML = "";
			this.infoNode.innerHTML = "";
		}
	}
	
	// Clear panel (on refresh).
	RCMWikiPanel.prototype.addWiki = function(pWikiInfo) {
		if(this.singleWiki) {
			if(!this.infoNode.innerHTML) this.onIconClick(pWikiInfo, {});
		} else {
			// this.listNode.innerHTML += Utils.formatString("<span class='favicon' href='{0}Special:RecentChanges{2}'>{1}</span>", pWikiInfo.articlepath, pWikiInfo.getFaviconHTML(), pWikiInfo.firstSeperator+pWikiInfo.rcParams.paramString);
			var favicon = Utils.newElement("span", { id:pWikiInfo.infoID, className: "favicon", innerHTML: pWikiInfo.getFaviconHTML() }, this.listNode);
			favicon.addEventListener("click", this.onIconClick.bind(this, pWikiInfo));
			
			if(this.manager.wikisLeftToLoad > 0) {
				Utils.addTextTo(":", this.listNode);
			}
		}
	}
	
	RCMWikiPanel.prototype.onIconClick = function(pWikiInfo, e) {
		var infoBanner = this.infoNode.querySelector(".banner-notification");
		// If already open for that wiki, then close it.
		if(infoBanner && infoBanner.dataset.wiki == pWikiInfo.servername && /*Not called via click()*/(e.screenX != 0 && e.screenY != 0)) {
			this.closeInfo();
		} else {
			// Front page|Site name - RecentChanges - New pages – New files – Logs – Insights
			this.infoNode.innerHTML = "<div class='banner-notification warn' data-wiki='"+pWikiInfo.servername+"'>"//notify
			+ (this.singleWiki ? "" : "<button class='close wikia-chiclet-button'><img></button>")
			+ "<div class='msg'>"
			+ "<table class='rcm-wiki-infotable'>"
			+ "<tr>"
			+ "<td rowspan='2' class='rcm-title-cell'>"
			+ pWikiInfo.getFaviconHTML()
			+ " "
			+ "<b><a href='"+pWikiInfo.articlepath+Utils.escapeCharactersLink(pWikiInfo.mainpage)+"'>"+pWikiInfo.sitename+"</a></b>"
			+ " : "
			+ "</td>"
			+ "<td>"
			+ "<a href='"+pWikiInfo.articlepath+"Special:RecentChanges"+pWikiInfo.firstSeperator+pWikiInfo.rcParams.paramString+"'>"+i18n("recentchanges")+"</a>"
			+ " - "
			+ "<a href='"+pWikiInfo.articlepath+"Special:NewPages'>"+i18n("newpages")+"</a>"
			+ " - "
			+ "<a href='"+pWikiInfo.articlepath+"Special:NewFiles'>"+i18n("newimages")+"</a>"
			+ " - "
			+ "<a href='"+pWikiInfo.articlepath+"Special:Log'>"+i18n("log")+"</a>"
			
			+ (pWikiInfo.isWikiaWiki ? " - <a href='"+pWikiInfo.articlepath+"Special:Insights'>"+i18n("insights")+"</a>" : "")
			+ " - "
			+ "<a href='"+pWikiInfo.articlepath+"Special:Random'>"+i18n("randompage")+"</a>"
			+ "</td>"
			+ "</tr>"
			// Now for the statistics
				+ "<tr>"
				+ "<td>"
				+ "<table class='wikitable center statisticstable' style='margin: 0;'>"
				+ "<tr>"
					+ "<td><a href='"+pWikiInfo.articlepath+"Special:AllPages'>"+i18n("awc-metrics-articles")+"</a>: <b>" + pWikiInfo.statistics.articles +"</b></td>"
					+ "<td><a href='"+pWikiInfo.articlepath+"Special:ListFiles'>"+i18n("prefs-files")+"</a>: <b>" + pWikiInfo.statistics.images +"</b></td>"
					+ "<td><a href='"+pWikiInfo.articlepath+"Special:ListUsers'>"+i18n("group-user")+"</a>: <b>" + pWikiInfo.statistics.activeusers +"</b></td>"
					+ "<td><a href='"+pWikiInfo.articlepath+"Special:ListAdmins'>"+i18n("group-sysop")+"</a>: <b>" + pWikiInfo.statistics.admins +"</b></td>"
					+ "<td><a href='"+pWikiInfo.articlepath+"Special:Statistics'>"+i18n("awc-metrics-edits")+"</a>: <b>" + pWikiInfo.statistics.edits +"</b></td>"
				+ "</tr>"
				+ "</table>"
				+ "</td>"
				+ "</tr>"
			+ "</table>"
			+ "</div>";
			+ "</div>";
			if(!this.singleWiki) {
				this.infoNode.querySelector(".banner-notification .close").addEventListener("click", this.closeInfo.bind(this));
			}
		}
	}
	
	RCMWikiPanel.prototype.closeInfo = function() {
		// $(infoBanner).hide(500, "linear", function() {
		$(this.infoNode.querySelector(".banner-notification")).animate({ height: "toggle", opacity: "toggle" }, 200, function(){
			$(this).remove();
		});
	}
	
	RCMWikiPanel.prototype.goToAndOpenInfo = function(e) {
		// console.log(e, e.currentTarget);
		// console.log(e.currentTarget.dataset.infoid);
		
		var btn = document.querySelector("#"+e.currentTarget.dataset.infoid);
		if(btn) {
			if(!Utils.elemIsVisible(btn)) {
				var tScrollOffset = mw.config.get("skin") == "oasis" ? -46 : 0;
				// $('html, body').animate({ scrollTop: $(btn).offset().top }, 0);
				$('html, body').scrollTop( $(btn).offset().top + tScrollOffset - 6 );
			}
			btn.click();
		}
	}
	
	return RCMWikiPanel;
	
})(window.jQuery, document, window.mediaWiki, window.dev.RecentChangesMultiple, window.dev.RecentChangesMultiple.Utils, window.dev.RecentChangesMultiple.i18n);
//</syntaxhighlight>
//<syntaxhighlight lang="javascript">
	
//######################################
// #### Modal Manager ####
// This is a STATIC class. This is a helper class for using Wikia modals, as RCM has some specific requirements.
//######################################
window.dev.RecentChangesMultiple.RCMModal = (function($, document, mw, module, Utils, i18n){
	"use strict";
	
	RCMModal.MODAL_ID = "rcm-modal";
	RCMModal.MODAL_CONTENT_ID = "rcm-modal-content";
	RCMModal.modal = null;
	
	// Constructor
	function RCMModal(pWikiInfo, pManager) {}
	
	// pData = { title:String, content:String, rcm_buttons:Array<{ value:String, event:String, callback:Event->Void, closeOnClick:Boolean=true }>, rcm_onModalShown:Void->Void, vars:Object }
	// 'vars' is same as `wikia.ui.factory` modal.
	RCMModal.showModal = function(pData) {
		// Re-open modal so that it gets re-positioned based on new content size.
		RCMModal.closeModal();
		
		// Prepare content for modal
		var tModalDataOptions = { type: "default", vars: $.extend({
			id: RCMModal.MODAL_ID,
			title: pData.title,
			content: '<div id="'+RCMModal.MODAL_CONTENT_ID+'">'+pData.content+'</div>', // style="max-height:'+(($(window).height() - 220) + "px")+';"
			size: 'auto',
			buttons: [],
		}, pData.vars) };
		var tModalData = tModalDataOptions.vars;
		
		tModalData.buttons.unshift({vars:{
			value: i18n('flags-edit-modal-close-button-text'),
			data: { key:"event", value:"close_button" },
		}});
		if(pData.rcm_buttons) {
			pData.rcm_buttons.forEach(function(o, i, a){
				tModalData.buttons.push({vars:{
					value: o.value,
					classes: [ 'normal', 'primary' ],
					data: { key:"event", value:o.event },
				}});
			});
		}
		
		createModalComponent(tModalDataOptions, function(modal) {
			// cancel - user clicked 'Cancel'
			modal.bind("close_button", function(e) { modal.trigger("close"); });
			if(pData.rcm_buttons) {
				pData.rcm_buttons.forEach(function(o, i, a){
					if(o.event && o.callback) {
						modal.bind(o.event, function(e){
							o.callback(e);
							if(o.closeOnClick !== false) { modal.trigger("close"); }
						});
					}
				});
			}
			
			// show modal
			modal.show();
			if(pData.rcm_onModalShown) {
				// setTimeout(pData.rcm_onModalShown, 100);
				pData.rcm_onModalShown();
			}
		});
	}
	
	function createModalComponent(pData, pCallback) {
		require(['wikia.ui.factory'], function(ui) {
			ui.init(['modal']).then(function(modal) {
				modal.createComponent(pData, function(obj){
					RCMModal.modal = obj;
					obj.bind("close", function(e) { RCMModal.modal = null; });
					pCallback(obj);
				});
			});
		});
	}
	
	// Give same title and buttons as showModal()
	RCMModal.showLoadingModal = function(pData) {
		// While we are waiting for results, open diff window to acknowledge user's input
		if (!RCMModal.isModalOpen()) {
			pData.content = "<div style='text-align:center; padding:10px;'><img src='"+module.LOADER_IMG+"'></div>";
			RCMModal.showModal(pData);
		}
	}

	RCMModal.isModalOpen = function() {
		return !!RCMModal.modal;
	}

	RCMModal.closeModal = function() {
		if(RCMModal.isModalOpen()) {
			RCMModal.modal.trigger("close");
		}
	}
	
	return RCMModal;

})(window.jQuery, document, window.mediaWiki, window.dev.RecentChangesMultiple, window.dev.RecentChangesMultiple.Utils, window.dev.RecentChangesMultiple.i18n);
//</syntaxhighlight>

//<syntaxhighlight lang="javascript">
	
//######################################
// #### Recent Change Data ####
// * A data object to keep track of RecentChanges data in an organized way, as well as also having convenience methods.
// * These should only ever be used in RCList.
//######################################
window.dev.RecentChangesMultiple.RCData = (function($, document, mw, module, Utils, i18n, RCMModal){
	"use strict";
	
	RCData.TYPE = Object.freeze({ NORMAL:"normalChange", LOG:"logChange", COMMENT:"commentType", WALL:"wallChange", BOARD:"boardChange", });
	
	// Constructor
	function RCData(pWikiInfo, pManager) {
		this.manager = pManager; // {RCMManager} Keep track of what manager this data is attached to.
		this.wikiInfo = pWikiInfo; // {WikiData} Keep track of what Wiki this data belongs to.
		
		/***************************
		 * Ajax Data - https://www.mediawiki.org/wiki/API:RecentChanges
		 ***************************/
		this.date				= null; // {Date} The DateTime this edit was made at.
		this.author				= null; // {string} The user or anon that made the edit.
		this.userEdited			= null; // {bool} Whether the author is a user vs an anon.
		this.userhidden			= null; // {bool} If the rc is marked "userhidden"
		this.title				= null; // {string} Title of the page. (without "/@comment"s). Includes namespace.
		this.namespace			= null; // {int} Namespace of the page edited.
		this.logtype			= null; // {string} What log fired
		this.logaction			= null; // {string} What the log did
		this.newlen				= null; // {int} New file size after edit
		this.oldlen				= null; // {int} Previous file size before edit
		this.summary			= null; // {string} Submit comment for the edit.
		
		this.pageid				= null; // {int} rc_cur_id - https://www.mediawiki.org/wiki/Manual:Recentchanges_table#rc_cur_id
		this.revid				= null; // {int} rc_this_oldid - https://www.mediawiki.org/wiki/Manual:Recentchanges_table#rc_this_oldid
		this.old_revid			= null; // {int} rc_last_oldid - https://www.mediawiki.org/wiki/Manual:Recentchanges_table#rc_last_oldid
		
		/***************************
		 * "Calculated" Data
		 ***************************/
		this.type				= null; // {enum<TYPE>} What kind of edit the RC is.
		this.isNewPage			= null; // {bool} If this edit created a new page
		this.isBotEdit			= null; // {bool} If this edit has been flaged as a bot edit.
		this.isMinorEdit		= null; // {bool} If this edit was flagged as minor.
		this.isPatrolled		= null; // {bool} If this page has been patrolled.
		this.titleNoNS			= null; // {string} Same as this.title, but with the namespace removed (if there is one)
		this.uniqueID			= null; // {string} A unique ID is primarily important for boards/walls, since they group by the first "/@comment" in the page name.
		this.hrefTitle			= null; // {string} Title of page, escaped for url (neccisary if page name as passed along an ajax call)
		this.href				= null; // {string} link the the page (no "&diff", etc) ex: http://test.wikia.com/wiki/Test
		this.hrefBasic			= null; // {string} Same as this.href, but with no "/@comment"s either.
		this.hrefFS				= null; // {string} Same as this.href, but followed by this.wikiInfo.firstSeperator.
		
		/***************************
		 * Situational Data - depends on the type, might even be used, and may remain be null.
		 ***************************/
		this.isSubComment		= null; // {bool} If the is a "reply" to a comment/board/wall (versus the original it replies too)
		this.isWallBoardAction	= null; // {bool} If an action was taken on a wall / board (instead of a "normal" edit)
		this.threadTitle		= null; // {string} The name of the thread if known (if a wall / board)
		this.log_info_0			= null; // {dynamic} Generic info passed for a rc/log
		this.actionhidden		= null; // {bool} If the rc is marked "actionhidden"
		
		/***************************
		 * Log Info - info for specific logs that require additional info via API:Logevents.
		 * THESE ARE USED, but not instantiated since no reason to take up the memory until used (since logs might not be present).
		 ***************************/
		// this.log_move_newTitle			= null; // {string} Name of new page after page moved.
		// this.log_move_noredirect		= null; // {string} If redirect is suppressed, should be "-noredirect" else ""
		// this.log_rights_oldgroups		= null; // {string} string of all groups separated by commas
		// this.log_rights_newgroups		= null; // {string} string of all groups separated by commas
		// this.log_delete_revisions_num	= null; // {int} Number of revisions
		// this.log_delete_new_bitmask		= null; // {string} action taken on visibility change
		// this.log_block_duration			= null; // {string} how long the block is for
		// this.log_block_flags			= null; // {string} string of block flags separated by commas
		// this.log_merge_destination		= null; // {string} title of the page being merged into.
		// this.log_merge_mergepoint		= null; // {string} timestamp the merge is up to.
	}
	
	RCData.prototype.dispose = function() {
		this.manager = null;
		this.wikiInfo = null;
		
		this.date = null;
		this.type = null;
	}
	
	RCData.prototype.init = function(pData, pLogDataArray) {
		this.date = new Date(pData.timestamp);
		this.userEdited = pData.user != "" && pData.anon != "";
		this.author = this.userEdited ? pData.user : (pData.anon ? pData.anon : pData.user);
		this.userhidden = pData.userhidden == "";
		this.title = Utils.escapeCharacters( pData.title.split("/@comment")[0] );
		this.namespace = pData.ns;
		this.logtype = pData.logtype;
		this.logaction = pData.logaction;
		this.newlen = pData.newlen;
		this.oldlen = pData.oldlen;
		if(pData.commenthidden != "") {
			this.summary = pData.parsedcomment; // De-wikified.
			this.summary = this.summary.replace("<a href=\"/", "<a href=\""+this.wikiInfo.server+"/"); // Make links point to correct wiki.
		} else {
			this.summary = '<span class="history-deleted">'+i18n("rev-deleted-comment")+'</span>';
		}
		
		this.pageid = pData.pageid;
		this.revid = pData.revid;
		this.old_revid = pData.old_revid;
		
		this.isNewPage = pData["new"] == "";
		this.isBotEdit = pData.bot == "";
		this.isMinorEdit = pData.minor == "";
		this.isPatrolled = pData.patrolled == "";
		this.titleNoNS = (this.namespace != 0 && this.title.indexOf(":") > -1) ? this.title.split(":")[1] : this.title;
		this.uniqueID = this.title; // By default; make change based on this.type.
		this.hrefTitle = Utils.escapeCharactersLink( pData.title );
		this.href = this.wikiInfo.articlepath + this.hrefTitle;
		this.hrefBasic = this.href.split("/@comment")[0];
		this.hrefFS	= this.href + this.wikiInfo.firstSeperator;
		
		// Figure out the type of edit this is.
		if(this.logtype && this.logtype != "0") { // It's a "real" log. "0" signifies a wall/board.
			this.type = RCData.TYPE.LOG;
			this.log_info_0 = pData["0"];
			
			this.actionhidden = pData.actionhidden == "";
			this._initLog(pData, pLogDataArray);
		}
		else if(pData.title.indexOf("/@comment") > -1) { // It's a comment / board / wall
			this.isSubComment = pData.title.indexOf("/@comment") != pData.title.lastIndexOf("/@comment"); // Check if it has more than one "/@comment"s
			if(/*Board Thread*/this.namespace == 2001) { this.type = RCData.TYPE.BOARD; }
			else if(/*Wall Thread*/this.namespace == 1201) { this.type = RCData.TYPE.WALL; }
			else { this.type = RCData.TYPE.COMMENT; }
			
			if(this.type == RCData.TYPE.BOARD || this.type == RCData.TYPE.WALL) {
				this.uniqueID = this.title + "/@comment" + pData.title.split("/@comment")[1]; // Walls/boards can have 2 /@comments, the first one is what we care about for lists.
				// var tAcMetaDataCheck = "&lt;ac_metadata title=\"";
				// var tAcMetaDataPos = this.summary.lastIndexOf(tAcMetaDataCheck);
				// if(tAcMetaDataPos > -1) { // Check for last encase some has a "ac_metadata" tag as part of their post for some reason
				// 	this.threadTitle = this.summaryDiffHTML.innerHTML.substring(tAcMetaDataPos+tAcMetaDataCheck.length, this.summary.length);
				// 	this.threadTitle = this.threadTitle.substring(0, this.threadTitle.indexOf("\""));
				// 	this.threadTitle = this.threadTitle.replace(/&amp;/g, "&");
					
				// 	this.summary = ""; // No summaries are shown in on Special:RecentChanges when "ac_metadata" is present (just works out that way)
				// }
				
				// https://github.com/Wikia/app/blob/10a9dff2fc80b8226456c21efc921b5361dd6432/extensions/wikia/Wall/WallHelper.class.php#L486
				// /<ac_metadata title="([^"]*)">(.*)<\/ac_metadata>/g
				
				if(this.isSubComment == false) {
					// If it's the parent wall / board, check for ac_metadata for title
					// tTitleData[1] returns title, tTitleData[0] return ac_metadata text string
					var tTitleData = /&lt;ac_metadata title=&quot;(.*?)&quot;&gt;.*?&lt;\/ac_metadata&gt;/g.exec(this.summary);
					// var tTitleData = /<ac_metadata title="(.*?)">.*?<\/ac_metadata>/g.exec(this.summary);
					if(tTitleData != null) {
						this.threadTitle = tTitleData[1];
						this.summary = this.summary.replace(tTitleData[0], "");
					}
				}
				
				this.isWallBoardAction = this.logtype=="0";
				
				// If a wall / board was edited, display a message saying so.
				if(this.isWallBoardAction == false && this.isNewPage == false && this.summary == "") {
					this.summary = this.type == RCData.TYPE.BOARD ? i18n("forum-recentchanges-edit") : i18n("wall-recentchanges-edit");
				}
			}
		}
		else { // else it's a normal freakin edit =p
			this.type = RCData.TYPE.NORMAL;
		}
		
		return this; // Return self for chaining or whatnot.
	}
	
	// If it's a log, init data if needed for that type.
	RCData.prototype._initLog = function(pRCData, pLogDataArray) {
		if(this.actionhidden) { return; }
		
		var tLogParams = null;
		// Get log params
		if(this.wikiInfo.useOutdatedLogSystem) {
			if(pLogDataArray == undefined) { return; }
			var i = -1;
			// Find log info that belong to this RC.
			for (var x = 0; x < pLogDataArray.length; x++) {
				if(pRCData.logid == pLogDataArray[x].logid) {// && pRCData.timestamp == pLogDataArray[x].timestamp) {
					i = x;
					break;
				}
			}
			if(i == -1) { return; }
			tLogParams = pLogDataArray[i];
		} else {
			tLogParams = pRCData.logparams;
		}
		
		// Remember important info for a log.
		switch(this.logtype) {
			case "move": {
				this.log_move_newTitle = "";
				this.log_move_noredirect = false;
				if(this.wikiInfo.useOutdatedLogSystem == false) {
					if(tLogParams) {
						this.log_move_newTitle = Utils.escapeCharacters( tLogParams.target_title );
						this.log_move_noredirect = tLogParams.suppressredirect=="";
						// target_ns
					}
				} else {
					tLogParams = tLogParams.move;
					if(tLogParams) {
						this.log_move_newTitle = Utils.escapeCharacters( tLogParams.new_title );
						this.log_move_noredirect = tLogParams.suppressedredirect=="";
						// new_ns
					}
				}
				// If true, add a flag for it.
				this.log_move_noredirect = this.log_move_noredirect ? "-noredirect" : "";
				break;
			}
			case "rights": {
				this.log_rights_oldgroups = "?";
				this.log_rights_newgroups = "?";
				if(this.wikiInfo.useOutdatedLogSystem == false) {
					if(tLogParams) {
						this.log_rights_oldgroups = tLogParams.oldgroups.length == 0 ? i18n("rightsnone") : tLogParams.oldgroups.join(", ");
						this.log_rights_newgroups = tLogParams.newgroups.length == 0 ? i18n("rightsnone") : tLogParams.newgroups.join(", ");
					}
				} else {
					tLogParams = tLogParams.rights;
					if(tLogParams) {
						this.log_rights_oldgroups = tLogParams.old == "" ? i18n("rightsnone") : tLogParams.old;
						this.log_rights_newgroups = tLogParams["new"] == "" ? i18n("rightsnone") : tLogParams["new"];
					}
				}
				break;
			}
			case "block": {
				// Assumes "block-log-flags" for: anononly, nocreate, noautoblock, noemail, nousertalk, autoblock, hiddenname
				this.log_block_duration = "?";
				this.log_block_flags = [];
				if(this.wikiInfo.useOutdatedLogSystem == false) {
					if(tLogParams) {
						this.log_block_duration = tLogParams.duration;
						this.log_block_flags = tLogParams.flags || [];
					}
				} else {
					tLogParams = tLogParams.block;
					if(tLogParams) {
						this.log_block_duration = tLogParams.duration;
						this.log_block_flags = tLogParams.flags.split(",");
					}
				}
				
				for (var i = 0; i < this.log_block_flags.length; i++) {
					// If we have a translation for flag, use it. otherwise, leave the flag id alone.
					if(i18n("block-log-flags-" + this.log_block_flags[i])) {
						this.log_block_flags[i] = i18n("block-log-flags-" + this.log_block_flags[i]);
					}
				}
				this.log_block_flags = "("+ this.log_block_flags.join(", ") +")";
				break;
			}
			case "delete": {
				this.log_delete_revisions_num = 1;
				this.log_delete_new_bitmask = "?";
				if(this.wikiInfo.useOutdatedLogSystem == false) {
					if(tLogParams) {
						this.log_delete_revisions_num = (tLogParams.ids || [1]).length;
						this.log_delete_new_bitmask = (tLogParams["new"] || {}).bitmask;
					}
				} else {
					// tLogParams = tLogParams.delete;
					// if(tLogParams) {
						
					// }
					if(this.log_info_0) {
						// this.log_delete_revisions_num = ????; // No clue how to get this; but haven't been able to find example of it being used, so meh.
						this.log_delete_new_bitmask = parseInt((this.log_info_0.split("\n")[3] || "=1").split("=")[1]);
					}
				}
				
				switch(this.log_delete_new_bitmask) {
					case 1: {
						this.log_delete_new_bitmask = i18n("revdelete-content-hid");
						break;
					}
					case 2: {
						this.log_delete_new_bitmask = i18n("revdelete-summary-hid"); // I'm assuming; couldn't actually find what "2" was.
						break;
					}
					case 3: {
						this.log_delete_new_bitmask = i18n("revdelete-content-hid") + i18n("and") + " " + i18n("revdelete-summary-hid");
						break;
					}
				}
				break;
			}
			case "merge": {
				this.log_merge_destination = "";
				this.log_merge_mergepoint = 0;
				if(this.wikiInfo.useOutdatedLogSystem == false) {
					if(tLogParams) {
						this.log_merge_destination = Utils.escapeCharacters( tLogParams.dest_title );
						this.log_merge_mergepoint = tLogParams.mergepoint;
						// dest_ns
					}
				} else {
					// tLogParams = tLogParams.merge;
					// if(tLogParams) {
						
					// }
					
					if(this.log_info_0 && pRCData["1"]) {
						this.log_merge_destination = Utils.escapeCharacters( this.log_info_0 );
						this.log_merge_mergepoint = Utils.getTimestampForYYYYMMDDhhmmSS(pRCData["1"]);
					}
				}
				break;
			}
		}
		
		tLogParams = null;
	};
	
	RCData.prototype.time = function() {
		return Utils.pad(Utils.getHours(this.date, this.manager.timezone),2)+":"+Utils.pad(Utils.getMinutes(this.date, this.manager.timezone),2);
	};
	
	RCData.prototype.userDetails = function() {
		if(this.userhidden) { return '<span class="history-deleted">'+i18n("rev-deleted-user")+'</span>'; }
		
		var blockText = this.wikiInfo.canBlock ? i18n("pipe-separator")+"<a href='{0}Special:Block/{1}'>"+i18n("blocklink")+"</a>" : "";
		if(this.userEdited) {
			return Utils.formatString("<span class='mw-usertoollinks'><a href='{0}User:{1}'>{2}</a> (<a href='{0}User_talk:{1}'>"+i18n("talkpagelinktext")+"</a>"+i18n("pipe-separator")+"<a href='{0}Special:Contributions/{1}'>"+i18n("contribslink")+"</a>"+blockText+")</span>", this.wikiInfo.articlepath, Utils.escapeCharactersLink(this.author), this.author);
		} else {
			return Utils.formatString("<span class='mw-usertoollinks'><a href='{0}Special:Contributions/{1}'>{2}</a> (<a href='{0}User_talk:{1}'>"+i18n("talkpagelinktext")+"</a>"+blockText+")</span>", this.wikiInfo.articlepath, Utils.escapeCharactersLink(this.author), this.author);
		}
	}
	
	RCData.prototype.logTitleText = function() {
		var logTemplate = "(<a class='rc-log-link' href='"+this.wikiInfo.articlepath+"Special:Log/{0}'>{1}</a>)";
		switch(this.logtype) {
			case "abusefilter"	:{ return Utils.formatString(logTemplate, this.logtype,	i18n("abusefilter-log")); }
			case "block"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n("blocklogpage")); }
			case "chatban"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n("chat-chatban-log")); }
			case "delete"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n("dellogpage")); }
			case "import"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n("importlogpage")); }
			case "maps"			:{ return Utils.formatString(logTemplate, this.logtype,	i18n("wikia-interactive-maps-log-name")); }
			case "merge"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n("mergelog")); }
			case "move"			:{ return Utils.formatString(logTemplate, this.logtype,	i18n("movelogpage")); }
			case "protect"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n("protectlogpage")); }
			case "upload"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n("uploadlogpage")); }
			case "useravatar"	:{ return Utils.formatString(logTemplate, this.logtype,	i18n("useravatar-log")); }
			case "newusers"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n("newuserlogpage")); }
			case "renameuser"	:{ return Utils.formatString(logTemplate, this.logtype,	i18n("userrenametool-logpage")); }
			case "rights"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n("rightslog")); }
			case "wikifeatures"	:{ return Utils.formatString(logTemplate, this.logtype,	i18n("wikifeatures-log-name")); }
			default				:{ return Utils.formatString(logTemplate, this.logtype,	this.logtype); } // At least display it as a log.
		}
		return "";
	}
	
	// Check each entry for "threadTitle", else return default text.
	RCData.prototype.getThreadTitle = function() {
		return this.threadTitle ? this.threadTitle :  "<i>"+i18n('rcm-unknownthreadname')+"</i>";
	}
	
	RCData.prototype.getSummary = function(pSummary) {
		if(this.summary == "" || this.summary == undefined) {
			return "";
		} else {
			this.summary = this.summary.trim();
			this.summary = this.summary.replace(/(\r\n|\n|\r)/gm, " ");
			return ' <span class="comment" dir="auto">('+this.summary+')</span>';
		}
	}
	
	// Returns text explaining what the log did. Also returns user details (since it's a part of some of their wiki text).
	// Some info is only present in the edit summary for some logtypes, so these parts won't be translated.
	RCData.prototype.logActionText = function() {
		var tLogMessage = "";
		
		if(this.actionhidden) {
			tLogMessage = '<span class="history-deleted">'+i18n("rev-deleted-event")+'</span>';
			tLogMessage += this.getSummary();
		}
		
		switch(this.logtype) {
			case "block": {
				tLogMessage += this.userDetails()+" ";
				switch(this.logaction) {
					case "block": { tLogMessage += i18n("blocklogentry",		this.href+"|"+this.titleNoNS, this.log_block_duration, this.log_block_flags ); break; }
					case "reblock": { tLogMessage += i18n("reblock-logentry",	this.href+"|"+this.titleNoNS, this.log_block_duration, this.log_block_flags ); break; }
					case "unblock": { tLogMessage += i18n("unblocklogentry",	this.titleNoNS ); break; }
				}
				break;
			}
			case "delete": {
				// logactions assumed: delete, restore, event, revision, event-legacy, revision-legacy
				tLogMessage += i18n("logentry-delete-"+this.logaction,
					this.userDetails(),
					undefined, // Cannot know gender of edit user
					"<a href='"+this.href+"'>"+this.title+"</a>",
					this.log_delete_new_bitmask,
					this.log_delete_revisions_num
				);
				break;
			}
			case "import": {
				tLogMessage += this.userDetails()+" ";
				switch(this.logaction) {
					case "upload": { tLogMessage += i18n("import-logentry-upload", this.href+"|"+this.title ); break; }
					case "interwiki": { tLogMessage += i18n("import-logentry-interwiki", this.title ); break; }
				}
				break;
			}
			case "merge": {
				tLogMessage += this.userDetails()+" ";
				// merged [[$1]] into [[$2]] (revisions up to $3)
				tLogMessage += i18n("import-logentry-upload",
					this.href + "|" + this.title,
					this.wikiInfo.articlepath+this.log_merge_destination + "|" + this.log_merge_destination,
					this.getLogTimeStamp(new Date(this.log_merge_mergepoint))
				);
				break;
			}
			case "move": {
				// logactions assumed: move, move-noredirect, move_redir, move_redir-noredirect
				tLogMessage += i18n("logentry-move-"+this.logaction+(this.log_move_noredirect || ""/*band-aid fix*/),
					this.userDetails(),
					undefined, // Don't know if male / female.
					"<a href='"+ this.hrefFS+"redirect=no" +"'>"+ this.title + "</a>",
					"<a href='"+ this.wikiInfo.articlepath+ Utils.escapeCharactersLink(this.log_move_newTitle) +"'>"+ this.log_move_newTitle + "</a>"
				);
				break;
			}
			case "protect": {
				tLogMessage += this.userDetails()+" ";
				var t$1 = this.href+"|"+this.title;
				switch(this.logaction) {
					case "protect": { tLogMessage += i18n("protectedarticle", t$1 ) + " "+this.log_info_0; break; }
					case "modify": { tLogMessage += i18n("modifiedarticleprotection", t$1 ) + " "+this.log_info_0; break; }
					case "unprotect": { tLogMessage += i18n("unprotectedarticle", t$1 ); break; }
					case "move_prot": { tLogMessage += i18n.wiki2html( i18n.MESSAGES["movedarticleprotection"].replace("[[$2]]", this.log_info_0), t$1 ); break; }
				}
				break;
			}
			case "upload": {
				tLogMessage += this.userDetails()+" ";
				switch(this.logaction) {
					case "upload": { tLogMessage += i18n("uploadedimage",		this.href+"|"+this.title ); break; }
					case "overwrite": { tLogMessage += i18n("overwroteimage",	this.href+"|"+this.title ); break; }
				}
				break;
			}
			case "newusers": {
				// logactions assumed: newusers, create, create2, autocreate (kinda sorta maybe)
				tLogMessage += i18n("logentry-newusers-"+this.logaction, this.userDetails(), undefined, "" );
				break;
			}
			case "rights": {
				tLogMessage += this.userDetails()+" ";
				switch(this.logaction) {
					case "rights": { tLogMessage += i18n("rightslogentry", "<a href='"+this.href + "'>" + this.title+"</a>", this.log_rights_oldgroups, this.log_rights_newgroups ); break; }
				}
				break;
			}
			case "useravatar": {
				tLogMessage += this.userDetails()+" ";
				switch(this.logaction) {
					case "avatar_chn": { tLogMessage += i18n("blog-avatar-changed-log"); break; } // 'Added or changed avatar'
					case "avatar_rem": { tLogMessage += i18n("blog-avatar-removed-log", "<a href='"+this.href+"'>"+this.title+"</a>"); break; } // "Removed $1's avatars"
				}
				break;
			}
			case "renameuser": {
				tLogMessage += this.userDetails()+" renameuser"; // Rest of the info is in the edit summary (so won't be translated by script).
				break;
			}
			case "wikifeatures": {
				tLogMessage += this.userDetails()+" wikifeatures"; // Rest of the info is in the edit summary (so won't be translated by script).
				break;
			}
			case "chatban": {
				var tChatData = this.log_info_0.split("\n");
				var t$3 = undefined;
				if(tChatData[3]) {
					t$3 = this.getLogTimeStamp(new Date(parseInt(tChatData[3])*1000));
				}
				
				tLogMessage += this.userDetails()+" ";
				// logaction assumed: chatbanadd, chatbanremove, chatbanchange
				tLogMessage += i18n("chat-"+this.logaction+"-log-entry", "<a href='"+this.href+"'>"+this.titleNoNS+"</a>", tChatData[2], t$3 );
				tChatData = null;
				break;
			}
			case "maps": {
				// logactions assumed: create_map, update_map, delete_map, undelete_map
				//						create_pin_type, update_pin_type, delete_pin_type
				//						create_pin, update_pin, delete_pin
				tLogMessage += i18n("logentry-maps-"+this.logaction, this.userDetails(), undefined, this.title );
				break;
			}
			case "abusefilter": {
				var tAbusePage = this.log_info_0.split("\n");
				var tAbuseItem = tAbusePage.shift();
				
				tLogMessage += this.userDetails()+" ";
				switch(this.logaction) {
					case "modify": {
						tLogMessage += i18n("abusefilter-log-entry-modify",
							"<a href='"+this.href + "'>" + this.title+"</a>",
							"<a href='"+this.wikiInfo.articlepath + "Special:AbuseFilter/history/" + tAbusePage + "/diff/prev/" + tAbuseItem + "'>" + i18n("abusefilter-log-detailslink") + "</a>"
						);
						break;
					}
				}
				break;
			}
		}
		if(tLogMessage == "") {
			tLogMessage += this.userDetails()+" ??? ("+this.logtype+" - "+this.logaction+") ";
		}
		tLogMessage += this.getSummary();
		return tLogMessage;
	}
	
	// Assumes it's a wall/board that has an action (will just return summary otherwise).
	RCData.prototype.wallBoardActionMessageWithSummary = function(pThreadTitle) {
		var tThreadTitle = pThreadTitle || this.getThreadTitle(); // Title is passed in due to it being found via ajax.
		var tLocalizedActionMessage = "";
		var tPrefix = this.type == RCData.TYPE.BOARD ? "forum-recentchanges" : "wall-recentchanges";
		var tMsgType = this.isSubComment ? "reply" : "thread";
		switch(this.logaction) {
			case "wall_remove":			tLocalizedActionMessage = tPrefix + "-removed-" + tMsgType; break;
			case "wall_admindelete":	tLocalizedActionMessage = tPrefix + "-deleted-" + tMsgType; break;
			case "wall_restore":		tLocalizedActionMessage = tPrefix + "-restored-" + tMsgType; break;
			case "wall_archive":		tLocalizedActionMessage = tPrefix + "-closed-thread"; break;
			case "wall_reopen":			tLocalizedActionMessage = tPrefix + "-reopened-thread"; break;
		}
		if(tLocalizedActionMessage != "") {
			return " "+i18n(tLocalizedActionMessage, this.href, tThreadTitle, this.getBoardWallParentLink(), this.titleNoNS) + this.getSummary();
		} else {
			return this.getSummary(); // Else not a wall/board action
		}
	}
	
	RCData.prototype.getBoardWallParentTitleWithNamespace = function() {
		if(this.type == RCData.TYPE.BOARD) {
			return "Board:" + this.titleNoNS;
		}
		else if(this.type == RCData.TYPE.WALL) {
			return "Message_Wall:" + this.titleNoNS;
		}
		else {
			if(module.debug) { console.log("This should not happen in getBoardWallParent()"); }
			return this.title;
		}
	}
	
	RCData.prototype.getBoardWallParentLink = function() {
		return this.wikiInfo.articlepath + this.getBoardWallParentTitleWithNamespace();
	}
	
	RCData.prototype.pageTitleTextLink = function() {
		if(this.type == RCData.TYPE.COMMENT) {
			return i18n("article-comments-rc-comment", this.href, this.titleNoNS);
		} else {
			return Utils.formatString("<a class='rc-pagetitle' href='{0}'>{1}</a>", this.href, this.title);
		}
	}
	
	RCData.prototype.wallBoardTitleText = function(pThreadTitle) {
		if(pThreadTitle == undefined) { pThreadTitle = this.getThreadTitle(); }
		if(this.type == RCData.TYPE.WALL) {
			return i18n("wall-recentchanges-thread-group",
				"<a href='"+this.href+"'>"+pThreadTitle+"</a>",
				this.getBoardWallParentLink(),
				this.titleNoNS
			);
		} else {
			return i18n("forum-recentchanges-thread-group",
				"<a href='"+this.href+"'>"+pThreadTitle+"</a>",
				this.getBoardWallParentLink(),
				this.titleNoNS
			);
		}
	}
	
	RCData.prototype.wallBoardHistoryLink = function() {
		var tLink = "", tText = "";
		if(this.type == RCData.TYPE.WALL) {
			tLink = this.wikiInfo.articlepath + Utils.escapeCharactersLink(this.getBoardWallParentTitleWithNamespace()) + this.wikiInfo.firstSeperator + "action=history";
			tText = this.isSubComment ? "wall-recentchanges-thread-history-link" : "wall-recentchanges-history-link";
		} else {
			tLink = this.wikiInfo.articlepath + Utils.escapeCharactersLink(this.getBoardWallParentTitleWithNamespace()) + this.wikiInfo.firstSeperator + "action=history";
			tText = this.isSubComment ? "forum-recentchanges-thread-history-link" : "forum-recentchanges-history-link";
		}
		return Utils.formatString("(<a href='{0}'>{1}</a>)", tLink, i18n(tText));
	}
	
	RCData.prototype.getLogTimeStamp = function(pDate) {
		return ""
			+ 			Utils.pad( Utils.getHours(pDate, this.manager.timezone), 2 )
			+ ":" +		Utils.pad( Utils.getMinutes(pDate, this.manager.timezone), 2 )
			+ ", " +	Utils.pad( Utils.getDate(pDate, this.manager.timezone), 2 )
			+ " " +		mw.config.get('wgMonthNames')[Utils.getMonth(pDate, this.manager.timezone)+1]
			+ " " +		Utils.getYear(pDate, this.manager.timezone)
		;
	}
	
	// STATIC - https://www.mediawiki.org/wiki/API:Revisions
	// Inspired by http://dev.wikia.com/wiki/AjaxDiff / http://dev.wikia.com/wiki/LastEdited
	RCData.previewDiff = function(pPageName, pageID, pAjaxUrl, pDiffLink, pUndoLink) {
		if(module.debug) { console.log("http:"+pAjaxUrl); console.log(pDiffLink); console.log(pUndoLink); }
		
		var tTitle = pPageName+" - "+i18n('rcm-module-diff-title');
		// Need to push separately since undo link -may- not exist (Wikia style forums sometimes).
		var tButtons = [];
		tButtons.push({
			value: i18n('rcm-module-diff-open'),
			event: "diff",
			callback: function(){ window.open(pDiffLink, '_blank'); },
		});
		if(pUndoLink != null) {
			tButtons.push({
				value: i18n('rcm-module-diff-undo'),
				event: "undo",
				callback: function(){ window.open(pUndoLink, '_blank'); },
			});
		}
		
		// Retrieve the diff table.
		// TODO - error support?
		$.ajax({ type: 'GET', dataType: 'jsonp', data: {}, url: pAjaxUrl,
			success: function(pData){
				var tPage = pData.query.pages[pageID];
				var tRevision = tPage.revisions[0];
				
				// if(module.debug) { console.log("Rollback: ", pRollbackLink, tRevision.rollbacktoken, tPage.lastrevid, tRevision.diff.to); }
				// if(pRollbackLink != null && tRevision.rollbacktoken && tPage.lastrevid == tRevision.diff.to) {
				// 	tButtons.splice(tButtons.length-2, 0, {
				// 		value: i18n('rollbacklink'),
				// 		event: "rollback",
				// 		callback: function(){ window.open(pRollbackLink+tRevision.rollbacktoken, '_blank'); },
				// 	});
				// }
				
				var tModalContent = ''
				+"<div id='rcm-diff-view'>"
				+"<table class='diff'>"
					+"<colgroup>"
						+"<col class='diff-marker'>"
						+"<col class='diff-content'>"
						+"<col class='diff-marker'>"
						+"<col class='diff-content'>"
					+"</colgroup>"
					+tRevision.diff["*"]
				+"</table>";
				+"</div>";
				RCMModal.showModal({ title:tTitle, content:tModalContent, rcm_buttons:tButtons });
			},
		});
		RCMModal.showLoadingModal({ title:tTitle, rcm_buttons:tButtons });
	}
	
	// STATIC - https://www.mediawiki.org/wiki/API:Imageinfo
	RCData.previewImages = function(pAjaxUrl, pImageNames, pArticlePath) {
		var tImagesInLog = pImageNames.slice();
		var size = 210; // (1000-~40[for internal wrapper width]) / 4 - (15 * 2 [padding])
		pAjaxUrl += "&iiurlwidth="+size+"&iiurlheight="+size;
		var tCurAjaxUrl = pAjaxUrl + "&titles="+tImagesInLog.splice(0, 50).join("|");
		
		if(module.debug) { console.log("http:"+tCurAjaxUrl.replace("&format=json", "&format=jsonfm"), pImageNames); }
		
		var tTitle = i18n("awc-metrics-images");
		// Need to push separately since undo link -may- not exist (Wikia style forums sometimes).
		var tButtons = [];
		
		var tGetGalleryItem = function (pPage) {
			var tPage = pPage, tPageTitleNoNS = null, tImage = null, tInvalidImage = null;
			
			if(tPage.imageinfo) { tImage = tPage.imageinfo[0]; }
			tPageTitleNoNS = tPage.title.indexOf(":") > -1 ? tPage.title.split(":")[1] : tPage.title;
			tInvalidImage = false;
			if(tPage.missing == "") {
				tInvalidImage = {
					thumbHref: pArticlePath+Utils.escapeCharactersLink(tPage.title),
					thumbText: i18n('filedelete-success', tPage.title),
					caption: tPageTitleNoNS
				};
			} else if(tImage == null) {
				tInvalidImage = {
					thumbHref: pArticlePath+Utils.escapeCharactersLink(tPage.title),
					thumbText: i18n('shared_help_was_redirect', tPage.title),
					caption: tPageTitleNoNS
				};
			} else if(Utils.isFileAudio(tPage.title)) {
				tInvalidImage = {
					thumbHref: tImage.url,
					thumbText: '<img src="/extensions/OggHandler/play.png" height="22" width="22"><br />'+tPage.title,
					caption: tPageTitleNoNS
				};
			} else if(tImage.thumburl == "" || (tImage.width == 0 && tImage.height == 0)) {
				tInvalidImage = {
					thumbHref: tImage.url,
					thumbText: tPage.title,
					caption: tPageTitleNoNS
				};
			}
			
			if(tInvalidImage !== false) {
				// Display text instead of image
				return '<div class="wikia-gallery-item">'
					+'<div class="thumb">'
					+'<div class="gallery-image-wrapper accent">'
					+'<a class="image-no-lightbox" href="'+tInvalidImage.thumbHref+'" target="_blank" style="height:'+size+'px; width:'+size+'px; line-height:inherit;">'
						+tInvalidImage.thumbText
					+'</a>'
					+'</div>'
					+'</div>'
					+'<div class="lightbox-caption" style="width:100%;">'
						+tInvalidImage.caption
					+'</div>'
				+'</div>';
			} else {
				tImage = tPage.imageinfo[0];
				var tOffsetY = size/2 - tImage.thumbheight/2;//0;
				// if(tImage.height < tImage.width || tImage.height < size) {
				// 	tOffsetY = size/2 - (tImage.height > size ? tImage.height/2*(size/tImage.width) : tImage.height/2);
				// }
				var tScaledWidth = tImage.thumbwidth;//size;
				// if(tImage.width < tImage.height && tImage.height > size) {
				// 	tScaledWidth = tImage.width * (size / tImage.height);
				// } else if(tImage.width < size) {
				// 	tScaledWidth = tImage.width;
				// }
				
				return '<div class="wikia-gallery-item">'//style="width:'+size+'px;"
					+'<div class="thumb">' // style="height:'+size+'px;"
						+'<div class="gallery-image-wrapper accent" style="position: relative; width:'+tScaledWidth+'px; top:'+tOffsetY+'px;">'
							+'<a class="image lightbox" href="'+tImage.url+'" target="_blank" style="width:'+tScaledWidth+'px;">'
								+'<img class="thumbimage" src="'+tImage.thumburl+'" alt="'+tPage.title+'">'
							+'</a>'
						+'</div>'
					+'</div>'
					+'<div class="lightbox-caption" style="width:100%;">'
						+'<a href="'+tImage.descriptionurl+'">'+tPageTitleNoNS+'</a>'
					+'</div>'
				+'</div>';
			}
		}
		
		var tAddLoadMoreButton = function () {
			if(tImagesInLog.length > 0) {
				if(module.debug) { console.log("Over 50 images to display; Extra images must be loaded later."); }
				var tModal = document.querySelector("#"+RCMModal.MODAL_CONTENT_ID);
				var tGallery = tModal.querySelector(".rcm-gallery");
				var tCont = Utils.newElement("center", { style:'margin-bottom: 8px;' }, tModal);
				var tButton = Utils.newElement("button", { innerHTML:i18n('specialvideos-btn-load-more') }, tCont);
				
				tButton.addEventListener("click", function(){
					tCurAjaxUrl = pAjaxUrl + "&titles="+tImagesInLog.splice(0, 50).join("|");
					if(module.debug) { console.log("http:"+tCurAjaxUrl.replace("&format=json", "&format=jsonfm")); }
					tCont.innerHTML = "<img src='"+module.LOADER_IMG+"' />";
					
					$.ajax({ type: 'GET', dataType: 'jsonp', data: {}, url: tCurAjaxUrl,
						success: function(pData){
							Utils.removeElement(tCont);
							for(var key in pData.query.pages) {
								tGallery.innerHTML += tGetGalleryItem(pData.query.pages[key]);
							}
							tAddLoadMoreButton();
						},
					});
				});
			}
		}
		
		// Retrieve the diff table.
		// TODO - error support?
		$.ajax({ type: 'GET', dataType: 'jsonp', data: {}, url: tCurAjaxUrl,
			success: function(pData){
				var tModalContent = ''
				+'<style>'
					+'.rcm-gallery .thumbimage { max-width: '+size+'px; max-height: '+size+'px; width: auto; height: auto; }'
					+'.rcm-gallery .wikia-gallery-item { width: '+size+'px; }'
					// +'.rcm-gallery .wikia-gallery-item .lightbox { width: '+size+'px; }'
					+'.rcm-gallery .thumb { height: '+size+'px; }'
					+'.rcm-gallery .image-no-lightbox { width: '+size+'px; }'
				+'</style>'
				+'<div class="rcm-gallery wikia-gallery wikia-gallery-caption-below wikia-gallery-position-center wikia-gallery-spacing-medium wikia-gallery-border-small wikia-gallery-captions-center wikia-gallery-caption-size-medium">'
					var tPage = null, tPageTitleNoNS = null, tImage = null, tInvalidImage = null;
					for(var key in pData.query.pages) {
						tModalContent += tGetGalleryItem(pData.query.pages[key]);
					}
				tModalContent += ''
				+'</div>';
				
				RCMModal.showModal({ title:tTitle, content:tModalContent, rcm_buttons:tButtons, rcm_onModalShown:tAddLoadMoreButton, });
				// setTimeout(function(){ tAddLoadMoreButton(); }, 100);
			},
		});
		RCMModal.showLoadingModal({ title:tTitle, rcm_buttons:tButtons });
	}
	
	return RCData;
	
})(window.jQuery, document, window.mediaWiki, window.dev.RecentChangesMultiple, window.dev.RecentChangesMultiple.Utils, window.dev.RecentChangesMultiple.i18n, window.dev.RecentChangesMultiple.RCMModal);
//</syntaxhighlight>

//<syntaxhighlight lang="javascript">

//######################################
// #### Recent Change List ####
// * Contains one or more RCData objects. Formats list as needed.
//######################################
window.dev.RecentChangesMultiple.RCList = (function($, document, mw, module, RCData, Utils, i18n){
	"use strict";
	
	// Static Constants
	var SEP = " . . ";
	
	// Constructor
	function RCList(pManager) {
		this.manager = pManager; // {RCMManager}
		
		/***************************
		 * "Calculated" Data
		 ***************************/
		this.list			= []; // {array<RCData>} List of RCData this list contains. Should always be at least 1.
		this.removeListeners= []; // {array<function>} List of callbacks that will remove event listeners.
		
		/***************************
		 * Properties
		 ***************************/
		Object.defineProperty(this, "newest", { get: function() { return this.list[0]; }, enumerable: true });
		Object.defineProperty(this, "oldest", { get: function() { return this.list[this.list.length-1]; }, enumerable: true });
		Object.defineProperty(this, "date", { get: function() { return this.newest.date; }, enumerable: true });
		Object.defineProperty(this, "wikiInfo", { get: function() { return this.newest.wikiInfo; }, enumerable: true });
		Object.defineProperty(this, "type", { get: function() { return this.newest.type; }, enumerable: true });
	}
	
	RCList.prototype.dispose = function() {
		this.manager = null;
		
		for(i=0; i < this.list.length; i++) {
			this.list[i].dispose();
			this.list[i] = null;
		}
		this.list = null;
		
		// Remove event listeners.
		for(i=0; i < this.removeListeners.length; i++) {
			this.removeListeners[i]();
			this.removeListeners[i] = null;
		}
		this.removeListeners = null;
	};
	
	RCList.prototype.addRC = function(pRC) {
		this.list.push(pRC);
		return this; // Return self for chaining or whatnot.
	};
	
	RCList.prototype.shouldGroupWith = function(pRC) {
		if(this.wikiInfo.servername == pRC.wikiInfo.servername
			&& this.type == pRC.type
			&& Utils.getMonth(this.date, this.manager.timezone) == Utils.getMonth(pRC.date, pRC.manager.timezone)
			&& Utils.getDate(this.date, this.manager.timezone) == Utils.getDate(pRC.date, pRC.manager.timezone)
		) {
			switch(this.type) {
				case RCData.TYPE.LOG: {
					if(this.newest.logtype == pRC.logtype) { return true; }
					break;
				}
				default: {
					if(this.newest.uniqueID == pRC.uniqueID) { return true; }
					break;
				}
			}
		}
		return false;
	};
	
	// Returns a url that compares the edits of two RCs (can be the same one twice, since a RC has info on the current and previous edit).
	// If "pToRC" is null, it will link to newest edit.
	RCList.prototype.getLink = function(pRC, pDiff, pOldId) {
		return pRC.hrefFS + "curid=" + pRC.pageid + (pDiff||pDiff==0 ? "&diff="+pDiff : "") + (pOldId ? "&oldid="+pOldId : "");
	};
	
	// Returns a url that compares the edits of two RCs (can be the same one twice, since a RC has info on the current and previous edit).
	// If "pToRC" is null, it will link to newest edit.
	RCList.prototype.getDiffLink = function(pFromRC, pToRC) {
		return Utils.formatString( "{0}curid={1}&diff={2}&oldid={3}", pFromRC.hrefFS , pFromRC.pageid , (pToRC ? pToRC.revid : 0) , pFromRC.old_revid );
	};
	
	RCList.prototype._diffHist = function(pRC) {
		var diffLink = i18n('diff');
		if(pRC.isNewPage == false) {
			diffLink = "<a class='rc-diff-link' href='"+this.getDiffLink(pRC, pRC)+"'>"+diffLink+"</a>"+this.getAjaxDiffButton();
		}
		if(this.type == RCData.TYPE.NORMAL && pRC.namespace == 6) {
			diffLink += this.getAjaxImageButton();
		}
		return "("+diffLink+i18n("pipe-separator")+"<a class='rc-hist-link' href='"+pRC.hrefFS+"action=history'>"+i18n('hist')+"</a>)";
	};
	
	// Calculates the size difference between the recent change(s), and returns formatted text to appear in HTML.
	RCList.prototype._diffSizeText = function(pToRC, pFromRC/*optional*/) {
		var tDiffSize = pToRC.newlen - (pFromRC ? pFromRC : pToRC).oldlen;
		var tDiffSizeText = mw.language.convertNumber(tDiffSize);
		
		// var html = "<strong class='{0}'>({1}{2})</strong>";
		var html = "<strong class='{0}'>{1}</strong>";
		if(tDiffSize > 0) {
			return Utils.formatString(html, "mw-plusminus-pos", i18n('parentheses', "+"+tDiffSizeText));
			// html = Utils.formatString(html, "mw-plusminus-pos", "+", tDiffSizeText);
		} else if(tDiffSize < 0) {
			return Utils.formatString(html, "mw-plusminus-neg", i18n('parentheses', tDiffSizeText));
			// html = Utils.formatString(html, "mw-plusminus-neg", "", tDiffSizeText); // The negative is part of the number, so no reason to add it.
		} else {
			return Utils.formatString(html, "mw-plusminus-null", i18n('parentheses', tDiffSizeText));
			// html = Utils.formatString(html, "mw-plusminus-null", "", tDiffSizeText);
		}
		// return html;
	};
	
	RCList.prototype._contributorsCountText = function() {
		var contribs = {}, indx;
		this.list.forEach(function(rc){
			if(contribs.hasOwnProperty(rc.author)) {
				contribs[rc.author].count++;
			} else {
				contribs[rc.author] = { count:1, userEdited:rc.userEdited };
			}
		});
		
		var returnText = "[", total = 0, tLength = this.list.length;
		Object.keys(contribs).forEach(function (key) {
			returnText += this._userPageLink(key, contribs[key].userEdited) + (contribs[key].count > 1 ? " ("+contribs[key].count+"&times;)" : "");
			total += contribs[key].count;
			if(total < tLength) { returnText += "; "; }
		}, this);
		return returnText + "]";
	};
	
	// For use with comments / normal pages
	RCList.prototype._changesText = function() {
		var returnText = i18n("nchanges", this.list.length);
		if(this.type == RCData.TYPE.NORMAL && this.oldest.isNewPage == false) {
			returnText = "<a class='rc-changes-link' href='"+this.getDiffLink(this.oldest, this.newest)+"'>"+returnText+"</a>"+this.getAjaxDiffButton();
		}
		if(this.type == RCData.TYPE.NORMAL && this.newest.namespace == 6) {
			returnText += this.getAjaxImageButton();
		}
		return returnText;
	};
	
	RCList.prototype._userPageLink = function(pUsername, pUserEdited) {
		if(pUserEdited) {
			return Utils.formatString("<a href='{0}User:{1}'>{2}</a>", this.wikiInfo.articlepath, Utils.escapeCharactersLink(pUsername), pUsername);
		} else {
			return Utils.formatString("<a href='{0}Special:Contributions/{1}'>{2}</a>", this.wikiInfo.articlepath, Utils.escapeCharactersLink(pUsername), pUsername);
		}
	};
	
	// Check each entry for "threadTitle", else return default text.
	RCList.prototype.getThreadTitle = function() {
		var tTitle = null;//"<i>"+i18n('rcm-unknownthreadname')+"</i>";
		this.list.some(function(rc){
			if(rc.threadTitle) {
				tTitle = rc.threadTitle;
				return true;
			}
			return false;
		});
		if(this.manager.extraLoadingEnabled) {
			var tElemID = Utils.uniqID();
			tTitle = "<span id='"+tElemID+"'><i>"+(tTitle ? tTitle : i18n('rcm-unknownthreadname'))+"</i></span>";
			
			var self = this;
			this.manager.secondaryWikiData.push({
				url: self.wikiInfo.scriptpath+"/api.php?action=query&format=json&prop=revisions&titles="+this.newest.uniqueID+"&rvprop=content",
				callback: function(data){
					var tSpan = document.querySelector("#"+tElemID);
					for(var tPageIndex in data.query.pages)
					
					tSpan.parentNode.href = self.wikiInfo.articlepath + "Thread:" + data.query.pages[tPageIndex].pageid;
					var tTitleData = /<ac_metadata title="(.*?)".*?>.*?<\/ac_metadata>/g.exec(data.query.pages[tPageIndex].revisions[0]["*"]);
					if(tTitleData != null) {
						tSpan.innerHTML = tTitleData[1];
					}
				}
			});
		} else {
			if(tTitle == null) {
				tTitle = "<i>"+i18n('rcm-unknownthreadname')+"</i>";
			}
		}
		
		return tTitle;
	};
	
	RCList.prototype.getAjaxDiffButton = function() {
		// https://commons.wikimedia.org/wiki/File:Columns_font_awesome.svg
		// inline SVG allows icon to use font color.
		return ' <span class="rcm-ajaxIcon rcm-ajaxDiff">'
			+'<svg width="15px" height="15px" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 -256 1792 1792" id="svg2" version="1.1" inkscape:version="0.48.3.1 r9886" sodipodi:docname="columns_font_awesome.svg">'
				+'<metadata id="metadata12">'
					+'<rdf:rdf>'
						+'<cc:work rdf:about="">'
							+'<dc:format>image/svg+xml</dc:format>'
							+'<dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"></dc:type>'
						+'</cc:work>'
					+'</rdf:rdf>'
				+'</metadata>'
				+'<defs id="defs10"></defs>'
				+'<sodipodi:namedview pagecolor="#ffffff" bordercolor="#666666" borderopacity="1" objecttolerance="10" gridtolerance="10" guidetolerance="10" inkscape:pageopacity="0" inkscape:pageshadow="2" inkscape:window-width="640" inkscape:window-height="480" id="namedview8" showgrid="false" inkscape:zoom="0.13169643" inkscape:cx="896" inkscape:cy="896" inkscape:window-x="0" inkscape:window-y="25" inkscape:window-maximized="0" inkscape:current-layer="svg2"></sodipodi:namedview>'
				+'<g transform="matrix(1,0,0,-1,68.338983,1277.8305)" id="g4">'
					+'<path d="M 160,0 H 768 V 1152 H 128 V 32 Q 128,19 137.5,9.5 147,0 160,0 z M 1536,32 V 1152 H 896 V 0 h 608 q 13,0 22.5,9.5 9.5,9.5 9.5,22.5 z m 128,1216 V 32 q 0,-66 -47,-113 -47,-47 -113,-47 H 160 Q 94,-128 47,-81 0,-34 0,32 v 1216 q 0,66 47,113 47,47 113,47 h 1344 q 66,0 113,-47 47,-47 47,-113 z" id="path6" inkscape:connector-curvature="0" style="fill:currentColor"></path>'
				+'</g>'
			+'</svg>'
		+'</span>';
		//<img src="//upload.wikimedia.org/wikipedia/commons/e/ed/Cog.png" />
	};
	
	RCList.prototype.getAjaxImageButton = function() {
		// <div>Icons made by <a href="http://www.flaticon.com/authors/dave-gandy" title="Dave Gandy">Dave Gandy</a> from <a href="http://www.flaticon.com" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></div>
		// inline SVG allows icon to use font color.
		return ' <span class="rcm-ajaxIcon rcm-ajaxImage">'
			+'<svg width="15px" height="15px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 548.176 548.176" style="enable-background:new 0 0 548.176 548.176;" xml:space="preserve">'
				+'<g>'
					+'<path style="fill:currentColor" d="M534.75,68.238c-8.945-8.945-19.694-13.417-32.261-13.417H45.681c-12.562,0-23.313,4.471-32.264,13.417 C4.471,77.185,0,87.936,0,100.499v347.173c0,12.566,4.471,23.318,13.417,32.264c8.951,8.946,19.702,13.419,32.264,13.419h456.815 c12.56,0,23.312-4.473,32.258-13.419c8.945-8.945,13.422-19.697,13.422-32.264V100.499 C548.176,87.936,543.699,77.185,534.75,68.238z M511.623,447.672c0,2.478-0.899,4.613-2.707,6.427 c-1.81,1.8-3.952,2.703-6.427,2.703H45.681c-2.473,0-4.615-0.903-6.423-2.703c-1.807-1.813-2.712-3.949-2.712-6.427V100.495 c0-2.474,0.902-4.611,2.712-6.423c1.809-1.803,3.951-2.708,6.423-2.708h456.815c2.471,0,4.613,0.905,6.42,2.708 c1.801,1.812,2.707,3.949,2.707,6.423V447.672L511.623,447.672z"/>'
					+'<path style="fill:currentColor" d="M127.91,237.541c15.229,0,28.171-5.327,38.831-15.987c10.657-10.66,15.987-23.601,15.987-38.826 c0-15.23-5.333-28.171-15.987-38.832c-10.66-10.656-23.603-15.986-38.831-15.986c-15.227,0-28.168,5.33-38.828,15.986 c-10.656,10.66-15.986,23.601-15.986,38.832c0,15.225,5.327,28.169,15.986,38.826C99.742,232.211,112.683,237.541,127.91,237.541z"/>'
					+'<polygon style="fill:currentColor" points="210.134,319.765 164.452,274.088 73.092,365.447 73.092,420.267 475.085,420.267 475.085,292.36 356.315,173.587"/>'
				+'</g>'
			+'</svg>'
		+'</span>';
		//<img src="//upload.wikimedia.org/wikipedia/commons/e/ed/Cog.png" />
	};
	
	// https://www.mediawiki.org/wiki/API:Revisions
	RCList.prototype.addPreviewDiffListener = function(pElem, pFromRC, pToRC) {
		if(pElem) {
			if(pToRC == undefined) { pToRC = pFromRC; }
			// Initializing here since "rc" may be nulled by the time the event is triggered.
			var pageName = pFromRC.title;
			var pageID = pFromRC.pageid;
			var ajaxLink = this.wikiInfo.scriptpath+"/api.php?action=query&format=json&prop=revisions|info&rvprop=size&rvdiffto="+pToRC.revid+"&revids="+pFromRC.old_revid;
			var diffLink = Utils.formatString( "{0}curid={1}&diff={2}&oldid={3}", pFromRC.hrefFS , pFromRC.pageid , pToRC.revid , pFromRC.old_revid );
			var undoLink = Utils.formatString( "{0}curid={1}&undo={2}&undoafter={3}&action=edit", pFromRC.hrefFS , pFromRC.pageid , pToRC.revid , pFromRC.old_revid );
			// var rollbackLink = null;
			// if(this.wikiInfo.canRollback) {
			// 	ajaxLink += "&rvtoken=rollback";
			// 	// Token provided upon results returned from ajaxLink.
			// 	rollbackLink = Utils.formatString( "{0}action=rollback&from={1}&token=", pFromRC.hrefFS , pFromRC.author );
			// }
			
			var tRCM_previewdiff = function(e) {
				e.preventDefault();
				RCData.previewDiff(pageName, pageID, ajaxLink, diffLink, undoLink);
			}
			pElem.addEventListener("click", tRCM_previewdiff);
			this.removeListeners.push(function(){ pElem.removeEventListener("click", tRCM_previewdiff); });
			
			pFromRC = null;
			pToRC = null;
		}
	};
	
	// https://www.mediawiki.org/wiki/API:Imageinfo
	RCList.prototype.addPreviewImageListener = function(pElem, pImageRCs) {
		if( Object.prototype.toString.call( pImageRCs ) !== '[object Array]' ) {
			pImageRCs = [ pImageRCs ];
		}
		if(pElem) {
			var tImageNames = [];
			for (var i = 0; i < pImageRCs.length; i++) {
				if(tImageNames.indexOf(pImageRCs[i].hrefTitle) < 0) {
					tImageNames.push(pImageRCs[i].hrefTitle);
				}
			}
			var ajaxLink = this.wikiInfo.scriptpath+"/api.php?action=query&prop=imageinfo&format=json&redirects&iiprop=url|size";
			var articlepath = this.wikiInfo.articlepath;
			
			var tRCM_previewdiff = function(e) {
				e.preventDefault();
				RCData.previewImages(ajaxLink, tImageNames, articlepath);
			}
			pElem.addEventListener("click", tRCM_previewdiff);
			this.removeListeners.push(function(){ pElem.removeEventListener("click", tRCM_previewdiff); });
			
			// tImageNames = null;
			pImageRCs = null;
		}
	};
	
	// RCList.prototype._addRollbackLink = function(pRC) {
	// 	if(this.extraLoadingEnabled == false) { return ""; }
		
	// 	var tRollback = Utils.newElement("span", { className:"mw-rollback-link" });
	// 	tRollback.appendChild(document.createTextNode(" "));
	// 	var tRollbackLink = Utils.newElement("a", { innerHTML:i18n("rollbacklink") }, tRollback);
	// 	tRollback.appendChild(document.createTextNode("]"));
		
	// 	// Initializing here since "rc" may be nulled by the time the event is triggered.
	// 	var tScriptDir = this.wikiInfo.scriptpath;
	// 	var tVersion = this.wikiInfo.mwversion;
	// 	var tPageName = this.title;
	// 	var tPageID = this.pageid;
	// 	var tRollbackLink = this.hrefFS+"action=rollback&from="+pRC.author+"&token=";
		
	// 	var tRCM_rollback = function(){
	// 		RCList.ajaxRollback(tScriptDir, tVersion, tPageName, tPageID, tRollbackLink);
	// 		tRollbackLink.removeEventListener("click", tRCM_rollback);
	// 	}
	// 	tRollbackLink.addEventListener("click", tRCM_rollback);
	// 	this.removeListeners.push(function(){ tRollbackLink.removeEventListener("click", tRCM_rollback); });
		
	// 	pRC = null;
		
	// 	return ;
	// }
	
	// Provide the <abbr> element appropriate to a given abbreviated flag with the appropriate class.
	// Returns a non-breaking space if flag not set.
	RCList.prototype._flag = function(pFlag, pRC, pEmpty) {
		var tI18nLetter = "", tI18nTooltip = "";
		switch(pFlag) {
			case "newpage":		{ if(pRC.isNewPage)		{ tI18nLetter="newpageletter";		tI18nTooltip="recentchanges-label-newpage";	} break; }
			case "minoredit":	{ if(pRC.isMinorEdit)	{ tI18nLetter="minoreditletter";	tI18nTooltip="recentchanges-label-minor";	} break; }
			case "botedit":		{ if(pRC.isBotEdit)		{ tI18nLetter="boteditletter";		tI18nTooltip="recentchanges-label-bot";		} break; }
			// case "unpatrolled":	{ if(pRC.zzzzzz)	{ tI18nLetter="unpatrolledletter"; tI18nTooltip="recentchanges-label-unpatrolled"; } }
		}
		if(tI18nLetter == "") { return pEmpty; }
		else {
			return "<abbr class='"+pFlag+"' title='"+i18n(tI18nTooltip)+"'>"+i18n(tI18nLetter)+"</abbr>";
		}
	};
	
	RCList.prototype._getFlags = function(pRC, pEmpty, pData) {
		pData = pData || {};
		return ""
			+this._flag("newpage", pRC, pEmpty)
			+(pData.ignoreminoredit ? pEmpty : this._flag("minoredit", pRC, pEmpty) )
			+this._flag("botedit", pRC, pEmpty)
			+pEmpty//this._flag("unpatrolled", this.oldest)
		;
	};
	
	RCList.prototype._showFavicon = function() {
		return this.manager.chosenWikis.length > 1;
	}
	
	RCList.prototype._getBackgroundClass = function() {
		return this._showFavicon() ? "rcm-tiled-favicon" : "";
	}
	
	// An RC that is NOT part of a "block" of related changes (logs, edits to same page, etc)
	RCList.prototype._toHTMLSingle = function(pRC) {
		if(this.list.length > 1) { return this._toHTMLBlock(); }
		
		var html = "";
		switch(pRC.type) {
			case RCData.TYPE.LOG: {
				html += pRC.logTitleText();
				if(pRC.logtype=="upload") { html += this.getAjaxImageButton(); }
				html += SEP;
				html += pRC.logActionText();
				break;
			}
			case RCData.TYPE.WALL:
			case RCData.TYPE.BOARD: {
				if(pRC.isWallBoardAction) {
					html += SEP;
					html += pRC.userDetails();
					html += pRC.wallBoardActionMessageWithSummary( this.getThreadTitle() );
				} else {
					html += pRC.wallBoardTitleText( this.getThreadTitle() );
					html += " "+this._diffHist(pRC);
					html += SEP;
					html += this._diffSizeText(pRC);
					html += SEP;
					html += pRC.userDetails();
					html += pRC.getSummary();
				}
				break;
			}
			case RCData.TYPE.COMMENT:
			case RCData.TYPE.NORMAL:
			default: {
				html += pRC.pageTitleTextLink();
				html += " "+this._diffHist(pRC);
				html += SEP;
				html += this._diffSizeText(pRC);
				html += SEP;
				html += pRC.userDetails();
				html += pRC.getSummary();
				// if(this.type == RCData.TYPE.NORMAL && this.isNewPage == false && this.wikiInfo.canRollback) {
				//  html += " [<a href='"+this.href+"action=rollback&from="+this.entry.author.name+"'>rollback</a>]";
				// }
				break;
			}
		}
		
		var tTable = Utils.newElement("table", { className:"mw-enhanced-rc "+pRC.wikiInfo.rcClass });
		Utils.newElement("caption", { className:this._getBackgroundClass() }, tTable); // Needed for CSS background.
		var tRow = Utils.newElement("tr", {}, tTable);
		if(this._showFavicon()) { Utils.newElement("td", { innerHTML:pRC.wikiInfo.getFaviconHTML(true) }, tRow); }
		Utils.newElement("td", { className:"mw-enhanced-rc", innerHTML:""
			+'<img src="http://slot1.images.wikia.nocookie.net/__cb1422546004/common/skins/common/images/Arr_.png" width="12" height="12" alt="&nbsp;" title="">'
			+this._getFlags(pRC, "&nbsp;")
			+"&nbsp;"
			+pRC.time()
			+"&nbsp;"
		}, tRow);
		Utils.newElement("td", { innerHTML:html }, tRow);
		
		this.addPreviewDiffListener(tTable.querySelector(".rcm-ajaxDiff"), pRC);
		this.addPreviewImageListener(tTable.querySelector(".rcm-ajaxImage"), pRC);
		if(this.manager.makeLinksAjax) {
			this.addPreviewDiffListener(tTable.querySelector(".rc-diff-link"), pRC);
			if(tTable.querySelector(".rcm-ajaxImage")) {
				this.addPreviewImageListener(tTable.querySelector(".rc-log-link"), pRC);
				this.addPreviewImageListener(tTable.querySelector(".rc-pagetitle"), pRC);
			}
		}
		
		return tTable;
	};
	
	// An RCList that IS a "block" of related changes (logs, edits to same page, etc)
	RCList.prototype._toHTMLBlock = function() {
		if(this.list.length == 1) { return this._toHTMLSingle(this.newest); }
		
		var tBlockHead = this._toHTMLBlockHead();
		for(var i=0; i < this.list.length; i++) {
			tBlockHead.querySelector("tbody").appendChild( this._toHTMLBlockLine(this.list[i]) );
		}
		// Make "blocks" collapsible - for this to work, make sure neither this NOR IT'S PARENT is modified via innerHTML after this has been added (to avoid event being "eaten").
		if($(tBlockHead).makeCollapsible) { $(tBlockHead).makeCollapsible(); }
		return tBlockHead;
	};
	
	// The first line of a RC "group"
	RCList.prototype._toHTMLBlockHead = function() {
		var html = "";
		switch(this.type) {
			case RCData.TYPE.LOG: {
				html += this.newest.logTitleText();
				if(this.newest.logtype=="upload") { html += this.getAjaxImageButton(); }
				break;
			}
			case RCData.TYPE.NORMAL: {
				html += "<a class='rc-pagetitle' href='"+this.newest.href+"'>"+this.newest.title+"</a>";
				html += " ("+this._changesText()+i18n("pipe-separator")+"<a href='"+this.newest.hrefFS+"action=history'>"+i18n("hist")+"</a>)";
				html += SEP
				html += this._diffSizeText(this.newest, this.oldest);
				break;
			}
			case RCData.TYPE.WALL: {
				html += this.newest.wallBoardTitleText( this.getThreadTitle() );
				html += " ("+this._changesText()+")";
				break;
			}
			case RCData.TYPE.BOARD: {
				html += this.newest.wallBoardTitleText( this.getThreadTitle() );
				html += " ("+this._changesText()+")";
				break;
			}
			case RCData.TYPE.COMMENT: {
				// Link to comments sections on main page. If in main namespace, add the namespace to the page (if requested, custom namespaces can have comments)
				html += i18n.wiki2html( i18n.MESSAGES["article-comments-rc-comments"].replace("$1", "$3|$1"), this.newest.titleNoNS, undefined, this.wikiInfo.articlepath+(this.newest.namespace==1 ? "" : this.wikiInfo.namespaces[String(this.newest.namespace-1)]["*"]+":")+this.newest.titleNoNS+"#WikiaArticleComments" );
				html += " ("+this._changesText()+")";
				// html += SEP
				// html += this._diffSizeText(this.newest, this.oldest);
				break;
			}
		}
		html += SEP;
		html += this._contributorsCountText();
		
		var tTable = Utils.newElement("table", { className:"mw-collapsible mw-enhanced-rc mw-collapsed "+this.newest.wikiInfo.rcClass }); // mw-made-collapsible
		Utils.newElement("caption", { className:this._getBackgroundClass() }, tTable); // Needed for CSS background.
		var tTbody = Utils.newElement("tbody", {}, tTable); // tbody is needed for $.makeCollapsible() to work.
		var tRow = Utils.newElement("tr", {}, tTbody);
		if(this._showFavicon()) { Utils.newElement("td", { innerHTML:this.newest.wikiInfo.getFaviconHTML(true) }, tRow); }
		var td1 = Utils.newElement("td", {}, tRow);
			Utils.newElement("span", { className:"mw-collapsible-toggle", innerHTML:''
				+'<span class="mw-rc-openarrow"><a title="'+i18n("rc-enhanced-expand")+'">'// href="#"
					+'<img width="12" height="12" title="'+i18n("rc-enhanced-expand")+'" alt="+" src="http://slot1.images.wikia.nocookie.net/__cb1422546004/common/skins/common/images/Arr_r.png">'
				+'</a></span>'
				+'<span class="mw-rc-closearrow"><a title="'+i18n("rc-enhanced-hide")+'">'// href="#"
						+'<img width="12" height="12" title="'+i18n("rc-enhanced-hide")+'" alt="-" src="http://slot1.images.wikia.nocookie.net/__cb1422546004/common/skins/common/images/Arr_d.png">'
				+'</a></span>' }, td1);
		Utils.newElement("td", { className:"mw-enhanced-rc", innerHTML:""
			+this._getFlags(this.oldest, "&nbsp;", { ignoreminoredit:true })
			+"&nbsp;"
			+this.newest.time()
			+"&nbsp;"
		}, tRow);
		Utils.newElement("td", { innerHTML:html }, tRow);
		
		this.addPreviewDiffListener(tTable.querySelector(".rcm-ajaxDiff"), this.oldest, this.newest);
		this.addPreviewImageListener(tTable.querySelector(".rcm-ajaxImage"), this.list);
		if(this.manager.makeLinksAjax) {
			this.addPreviewDiffListener(tTable.querySelector(".rc-diff-link, .rc-changes-link"), this.oldest, this.newest);
			if(tTable.querySelector(".rcm-ajaxImage")) {
				this.addPreviewImageListener(tTable.querySelector(".rc-log-link"), this.list);
				this.addPreviewImageListener(tTable.querySelector(".rc-pagetitle"), this.list);
			}
		}
		
		return tTable;
	};
	
	// The individual lines of a RC "group"
	RCList.prototype._toHTMLBlockLine = function(pRC) {
		var html = "";
		
		switch(pRC.type) {
			case RCData.TYPE.LOG: {
				html += "<span class='mw-enhanced-rc-time'>"+pRC.time()+"</span>"
				if(pRC.logtype=="upload") { html += this.getAjaxImageButton(); }
				html += SEP;
				html += pRC.logActionText();
				break;
			}
			case RCData.TYPE.WALL:
			case RCData.TYPE.BOARD: {
				if(pRC.isWallBoardAction) {
					html += "<span class='mw-enhanced-rc-time'>"+pRC.time()+"</span>"
					html += SEP;
					html += pRC.userDetails();
					html += pRC.wallBoardActionMessageWithSummary( this.getThreadTitle() );
				} else {
					html += "<span class='mw-enhanced-rc-time'><a href='"+pRC.href+"' title='"+pRC.title+"'>"+pRC.time()+"</a></span>";
					html += " (<a href='"+pRC.href+"'>"+i18n("cur")+"</a>";
					if(pRC.isNewPage == false) {
						html += i18n("pipe-separator")+"<a href='"+this.getDiffLink(pRC, pRC)+"'>"+i18n("last")+"</a>"+this.getAjaxDiffButton();
					}
					html += ")";
					html += SEP;
					html += this._diffSizeText(pRC);
					html += SEP;
					html += pRC.userDetails();
					html += pRC.getSummary();
				}
				break;
			}
			case RCData.TYPE.COMMENT:
			case RCData.TYPE.NORMAL: {
				html += "<span class='mw-enhanced-rc-time'><a href='"+this.getLink(pRC, null, pRC.revid)+"' title='"+pRC.title+"'>"+pRC.time()+"</a></span>"
				html += " (<a href='"+this.getLink(pRC, 0, pRC.revid)+"'>"+i18n("cur")+"</a>";
				if(pRC.isNewPage == false) {
					html += i18n("pipe-separator")+"<a href='"+this.getLink(pRC, pRC.revid, pRC.old_revid)+"'>"+i18n("last")+"</a>"+this.getAjaxDiffButton();
				}
				html += ")";
				html += SEP;
				html += this._diffSizeText(pRC);
				html += SEP;
				html += pRC.userDetails();
				html += pRC.getSummary();
				break;
			}
		}
		
		var tRow = Utils.newElement("tr", { style:"display: none;" });
		if(this._showFavicon()) { Utils.newElement("td", {}, tRow); } // Blank spot for where favicon would be on a normal table
		Utils.newElement("td", {}, tRow); // Blank spot for where collapsing arrow would be on the table
		Utils.newElement("td", { className:"mw-enhanced-rc", innerHTML:""
			+this._getFlags(pRC, "&nbsp;")
			+"&nbsp;"
		}, tRow);
		Utils.newElement("td", { className:"mw-enhanced-rc-nested", innerHTML:html }, tRow);
		
		this.addPreviewDiffListener(tRow.querySelector(".rcm-ajaxDiff"), pRC);
		this.addPreviewImageListener(tRow.querySelector(".rcm-ajaxImage"), pRC);
		if(this.manager.makeLinksAjax) { this.addPreviewDiffListener(tRow.querySelector(".rc-diff-link"), pRC); }
		
		return tRow;
	};
	
	RCList.prototype._toHTMLNonEnhanced = function(pRC, pIndex) {
		var html = "";
		switch(pRC.type) {
			case RCData.TYPE.LOG: {
				html += pRC.logTitleText();
				if(pRC.logtype=="upload") { html += this.getAjaxImageButton(); }
				html += i18n("semicolon-separator")+pRC.time();
				html += SEP;
				html += pRC.logActionText();
				break;
			}
			case RCData.TYPE.WALL:
			case RCData.TYPE.BOARD: {
				if(pRC.isWallBoardAction) {
					html += pRC.wallBoardHistoryLink();
					html += i18n("semicolon-separator")+pRC.time();
					html += SEP;
					html += pRC.userDetails();
					html += pRC.wallBoardActionMessageWithSummary( this.getThreadTitle() );
				} else {
					html += this._diffHist(pRC);
					html += SEP;
					html += this._getFlags(pRC, "")+" ";
					html += pRC.wallBoardTitleText();
					html += i18n("semicolon-separator")+pRC.time();
					html += SEP;
					html += this._diffSizeText(pRC);
					html += SEP;
					html += pRC.userDetails();
					html += pRC.getSummary();
				}
				break;
			}
			case RCData.TYPE.COMMENT:
			case RCData.TYPE.NORMAL:
			default: {
				html += this._diffHist(pRC);
				html += SEP;
				html += this._getFlags(pRC, "")+" ";
				html += pRC.pageTitleTextLink();
				html += i18n("semicolon-separator")+pRC.time();
				html += SEP;
				html += this._diffSizeText(pRC);
				html += SEP;
				html += pRC.userDetails();
				html += pRC.getSummary();
				break;
			}
		}
		
		var tLi = Utils.newElement("li", { className:(pIndex%2==0 ? "mw-line-even" : "mw-line-odd")+" "+pRC.wikiInfo.rcClass });
		Utils.newElement("div", { className:this._getBackgroundClass() }, tLi);;
		if(this._showFavicon()) { tLi.innerHTML += pRC.wikiInfo.getFaviconHTML(true); }
		tLi.innerHTML += html;
		
		this.addPreviewDiffListener(tLi.querySelector(".rcm-ajaxDiff"), pRC);
		this.addPreviewImageListener(tLi.querySelector(".rcm-ajaxImage"), pRC);
		if(this.manager.makeLinksAjax) {
			this.addPreviewDiffListener(tLi.querySelector(".rc-diff-link"), pRC);
			if(tLi.querySelector(".rcm-ajaxImage")) {
				this.addPreviewImageListener(tLi.querySelector(".rc-log-link"), pRC);
				this.addPreviewImageListener(tLi.querySelector(".rc-pagetitle"), pRC);
			}
		}
		
		return tLi;
	};
	
	RCList.prototype.toHTML = function(pIndex) {
		if(this.manager.rcParams.hideenhanced) {
			return this._toHTMLNonEnhanced(this.newest, pIndex);
		} else {
			if(this.list.length > 1) {
				return this._toHTMLBlock();
			} else {
				return this._toHTMLSingle(this.newest);
			}
		}
	};
	
	//######################################
	// Static methods
	//######################################
	// RCList.ajaxRollback = function(pScriptDir, pVersion, pPageName, pPageID, pRollbackLink) {
	// 	var tAPiUrl = pScriptDir+"/api.php?", isV1_24Plus = Utils.version_compare(pVersion, "1.24", ">=");
	// 	if(isV1_24Plus) {
	// 		tAPiUrl += "action=query&meta=tokens&type=rollback";
	// 	} else {
	// 		tAPiUrl += "action=query&prop=revisions&format=json&rvtoken=rollback&titles="+Utils.escapeCharactersLink(pPageName)
	// 	}
		
	// 	$.ajax({ type: 'GET', dataType: 'jsonp', data: {}, url:tAPiUrl,
	// 		success: function(pData) {
	// 			var tToken = "";
	// 			if(isV1_24Plus) {
	// 				tToken = pData.query.tokens.rollbacktoken;
	// 			} else {
	// 				tToken = pData.query.pages[pPageID].revisions[0].rollbacktoken;
	// 			}
	// 			console.log(pRollbackLink+tToken);
	// 		},
	// 		error: function(pData) {
				
	// 		},
	// 	});
	// }
	
	return RCList;
	
})(window.jQuery, document, window.mediaWiki, window.dev.RecentChangesMultiple, window.dev.RecentChangesMultiple.RCData, window.dev.RecentChangesMultiple.Utils, window.dev.RecentChangesMultiple.i18n);
//</syntaxhighlight>

//<syntaxhighlight lang="javascript">

//######################################
// #### RCMManager - Module core ####
// * This is what actually parses a "rc-content-multiple" div, and loads the respective information.
// * Uses RCList to actually format the RecentChanges info.
//######################################
window.dev.RecentChangesMultiple.RCMManager = (function($, document, mw, module, RCData, RCList, WikiData, RCMOptions, RCMWikiPanel, Utils, i18n, RCMModal){
	"use strict";

	// Static Constants
	RCMManager.LOADING_ERROR_RETRY_NUM_INC = 5;
	
	// Constructor
	function RCMManager(pWrapper, pModID) {
		/***************************
		 * HTML Elements/Nodes
		 ***************************/
		this.modID			= "rcm"+pModID; // {string} - keep track of elements on the page using this className (a "." is prepended to it in init())
		this.resultCont		= pWrapper; // {HTMLElement}
		this.statusNode		= null; // {HTMLElement}
		this.optionsNode	= null; // {RCMOptions}
		this.wikisNode		= null; // {RCMWikiPanel}
		this.resultsNode	= null; // {HTMLElement}
		this.footerNode		= null; // {HTMLElement}
		
		/***************************
		 * Data provided to script
		 ***************************/
		this.rcParamsBase			= null; // {object} and object containing data about the RecentChange "params" sent in
		this.rcParams				= null; // {object} Same as this.rcParamsBase as well as default values if not supplied.
		
		this.timezone				= null; // {string}
		this.autoRefreshTimeoutNum	= null; // {int} number of milliseconds to wait before refreshing.
		
		this.chosenWikis			= null; // {array<WikiData>} Wikis for the script to load
		this.hideusers				= null; // {array} List of users to hide across whole RCMManager
		this.onlyshowusers			= null; // {array} Only show these users' edits across whole RCMManager
		this.notificationsHideusers	= null; // {array} Don't send notifications when these users edit.
		
		this.makeLinksAjax			= false; // {bool} Make the diff/gallery link behave as the ajax icons do.
		
		/***************************
		 * Storage
		 ***************************/
		this.ajaxID					= 0;    // {int} A unique ID for all ajax data for a given "load" (used to prevent previously requested data from mixing with currently requested data after "Refresh" is hit after a script error)
		this.autoRefreshTimeoutID	= null; // {int} ID for the auto refresh timeout.
		this.autoRefreshEnabledDefault	= null; // {bool} Default value for auto refresh being enabled.
		this.autoRefreshLocalStorageID = module.AUTO_REFRESH_LOCAL_STORAGE_ID + "-" + this.modID;
		
		this.recentChangesEntries	= null; // {array} Array of either RecentChange/RecentChangeList objects.
		this.ajaxCallbacks			= null; // {array} Array of functions that stores info retrieved from ajax, so that the script can run without worry of race conditions.
		this.erroredWikis			= null; // {array} Array of wikis that have errored more than expected times; kept in list to be tried more times should user wish
		
		this.extraLoadingEnabled	= true; // {bool} Turns extra loading on/off
		// { url:String, callback:function }
		this.secondaryWikiData		= null; // {array} Array of objects that are used to fill in blanks that cannot be retrieved on initial data calls (usually page-specific).
		
		this.wikisLeftToLoad		= null; // {int} Wikis left to load via ajax
		this.totalWikisToLoad		= null; // {int} Total wikis there are to load (use for "% left")
		this.loadingErrorRetryNum	= null; // {int} Number of tries to load a wiki before complaining (encase it's due to server, not invalid link)
		this.itemsAdded				= null; // {int} Number off items added to screen AFTER load.
		this.itemsToAddTotal		= null; // {int} Total number if items to add to the screen
		
		this.lastLoadDateTime		= null; // {Date} the last time everything was loaded.
		this.lastLoadDateTimeActual	= null; // {Date} Even if lastLoadDateTime hasn't been updated (due to auto refresh), this always has the actual last loaded date
	};
	
	RCMManager.prototype.dispose = function() {
		this.resultCont		= null;
		this.optionsNode.dispose();
		this.optionsNode	= null;
		this.statusNode		= null;
		this.wikisNode.dispose();
		this.wikisNode		= null;
		this.resultsNode	= null;
		this.footerNode		= null;
		
		this.hideusers		= null;
		this.onlyshowusers	= null;
		
		if(this.recentChangesEntries) {
			for (var i = 0; i < this.recentChangesEntries.length; i++) {
				this.recentChangesEntries[i].dispose();
				this.recentChangesEntries[i] = null;
			}
			this.recentChangesEntries = null;
		}
		this.ajaxCallbacks		= null;
		this.erroredWikis		= null;
		this.secondaryWikiData	= null;
		
		this.lastLoadDateTime	= null;
	};
	
	// Should only be called once per object.
	RCMManager.prototype.init = function() {
		/***************************
		 * Data provided to script
		 ***************************/
		var tDataset = this.resultCont.dataset;
		
		this.rcParamsBase = $.extend( {}, module.rcParamsURL, this.parseRCParams(tDataset.params, "&", "=") );
		this.rcParams = $.extend( this.getDefaultRCParams(), this.rcParamsBase );
		
		this.timezone = tDataset.timezone ? tDataset.timezone.toLowerCase() : 'utc'; // {string}
		this.autoRefreshTimeoutNum = (tDataset.autorefresh ? parseInt(tDataset.autorefresh) : 60) * 1000; // {int} number of milliseconds to wait before refreshing.
		
		// List of users to hide across whole RCMManager
		this.hideusers = []; // {array}
		if(tDataset.hideusers) { this.hideusers = tDataset.hideusers.replace(/_/g, " ").split(","); }
		// if(this.rcParams.hidemyself) {
		// 	var tUsername = mw.config.get("wgUserName");
		// 	if(tUsername) { this.hideusers.push(tUsername); }
		// }
		this.hideusers.forEach(function(o,i,a){ a[i] = Utils.ucfirst(a[i].trim()); });
		
		this.notificationsHideusers = [];
		if(tDataset.notificationsHideusers) { this.notificationsHideusers = tDataset.notificationsHideusers.replace(/_/g, " ").split(","); }
		this.notificationsHideusers.forEach(function(o,i,a){ a[i] = Utils.ucfirst(a[i].trim()); });
		
		// Only show these users' edits across whole RCMManager
		this.onlyshowusers = []; // {array}
		if(tDataset.onlyshowusers) { this.onlyshowusers = tDataset.onlyshowusers.replace(/_/g, " ").split(","); }
		this.onlyshowusers.forEach(function(o,i,a){ a[i] = Utils.ucfirst(a[i].trim()); });
		
		this.extraLoadingEnabled = tDataset.extraLoadingEnabled == "false" ? false : true;
		this.makeLinksAjax = tDataset.ajaxlinks == "true" ? true : false;
		
		this.autoRefreshEnabledDefault = tDataset.autorefreshEnabled == "true" ? true : false;
		// Wikis for the script to load
		this.chosenWikis = []; // {array}
		var self = this;
		//Utils.forEach(this.resultCont.querySelectorAll("li"), function(pNode){ self.setupWikiData(pNode, self) });
		Utils.forEach(this.resultCont.querySelectorAll("li"), function(pNode){
			self.chosenWikis.push( new WikiData(self).initListData(pNode) );
		});
		
		// Remove duplicates
		self.chosenWikis = Utils.uniq_fast_key(self.chosenWikis, "servername");
		
		tDataset = null;
		
		/***************************
		 * HTML Elements/Nodes
		 ***************************/
		this.resultCont.className += " "+this.modID;
		this.modID = "."+this.modID;
		this.resultCont.innerHTML = "";
		this.optionsNode	= new RCMOptions(this).init(Utils.newElement("div", { className:"rcm-options" }, this.resultCont));
		this.statusNode		= Utils.newElement("div", { className:"rcm-status" }, this.resultCont);
		this.wikisNode		= new RCMWikiPanel(this).init(Utils.newElement("div", { className:"rcm-wikis" }, this.resultCont));
		this.resultsNode	= Utils.newElement("div", { className:"rcm-results rc-conntent" }, this.resultCont);
		this.footerNode		= Utils.newElement("div", { className:"rcm-footer" }, this.resultCont);
		
		/***************************
		 * Setup
		 ***************************/
		// Footer never changes, so set here
		var tEndNewMessageDate = new Date(module.lastVersionDateString); tEndNewMessageDate.setDate(tEndNewMessageDate.getDate() + 3);
		var tNewVersion = tEndNewMessageDate > new Date() ? '<sup class="rcm-new-version">'+i18n("wikifeatures-promotion-new")+'</sup>' : "";
		this.footerNode.innerHTML = "[<a href='http://dev.wikia.com/wiki/RecentChangesMultiple'>RecentChangesMultiple</a>] " + i18n('rcm-footer', "<a href='https://github.com/fewfre/RecentChangesMultiple/blob/master/changelog'>"+module.version+"</a>"+tNewVersion, "<img src='http://fewfre.com/images/rcm_avatar.jpg' height='14' /> <a href='http://fewfre.wikia.com/wiki/Fewfre_Wiki'>Fewfre</a>");
		
		$( this.resultsNode ).on("click", ".rcm-favicon-goto-button", this.wikisNode.goToAndOpenInfo);
		
		// Now start the app
		this._start(true);
		
		return this;
	};
	
	/* pUpdateParams : Bool - optional (default: false) */
	RCMManager.prototype._start = function(pUpdateParams) {
		var self = this;
		
		clearTimeout(this.autoRefreshTimeoutID);
		this.wikisNode.populate();
		
		this.recentChangesEntries = [];
		this.ajaxCallbacks = [];
		this.erroredWikis = [];
		this.secondaryWikiData = [];
		
		this.ajaxID++;
		this.loadingErrorRetryNum = RCMManager.LOADING_ERROR_RETRY_NUM_INC;
		this.itemsAdded = this.itemsToAddTotal = 0;
		
		if(this.chosenWikis.length > 0) {
			this.totalWikisToLoad = 0;
			Utils.forEach(this.chosenWikis, function(wikiInfo){
				if(pUpdateParams) { wikiInfo.setupRcParams(); } // Encase it was changed via RCMOptions
				self.totalWikisToLoad++;
				self.loadWiki(wikiInfo, 0, self.ajaxID, self.totalWikisToLoad * module.loadDelay);
			});
			//this.totalWikisToLoad = this.chosenWikis.length;
			this.wikisLeftToLoad = this.totalWikisToLoad;
			this.statusNode.innerHTML = "<img src='"+module.LOADER_IMG+"' /> "+i18n('rcm-loading')+" (<span class='rcm-load-perc'>0%</span>)";
		} else {
			Utils.removeElement(this.statusNode);
			Utils.removeElement(this.wikisNode.root);
			this.resultsNode.innerHTML = "<div class='banner-notification error center'>"+i18n("wikiacuratedcontent-content-empty-section")+"</div>";
		}
	};
	
	/* pUpdateParams : Bool - optional (default: false) */
	RCMManager.prototype.refresh = function(pUpdateParams) {
		if(this.chosenWikis.length == 0) { return; }
		this.statusNode.innerHTML = "";
		this.resultsNode.innerHTML = "";
		this.wikisNode.clear();
		
		if(this.recentChangesEntries != null) {
			for (var i = 0; i < this.recentChangesEntries.length; i++) {
				this.recentChangesEntries[i].dispose();
				this.recentChangesEntries[i] = null;
			}
			this.recentChangesEntries = null;
		}
		this.ajaxCallbacks = null;
		this.secondaryWikiData = null;
		
		RCMModal.closeModal();
		
		this._start(pUpdateParams);
	};
	
	// Separate method so that it can be reused if the loading failed
	RCMManager.prototype.loadWiki = function(pWikiInfo, pTries, pID, pDelayNum) {
		var self = this;
		
		++pTries;
		
		setTimeout(function(){
			$.ajax({
				type: 'GET',
				dataType: 'jsonp',
				data: {},
				timeout: 15000, // Error out after 15s
				url: pWikiInfo.getApiUrl(),
				success: function(data){ self.onWikiLoaded(data, pWikiInfo, pTries, pID, null); },
				error: function(data, status){ self.onWikiLoaded(null, pWikiInfo, pTries, pID, status); },
			});
		}, pDelayNum);
	};
	
	/* Called after a wiki is loaded; will add it to queue, and run it if no other callbacks running. */
	RCMManager.prototype.onWikiLoaded = function(pData, pWikiInfo, pTries, pID, pFailStatus) {
		var self = this;
		
		// Make sure this isn't something loaded before the script was last refreshed.
		if(pID != this.ajaxID) { return; }
		
		// Make sure results are valid
		if(!!pData && pData.error && pData.query == null) {
			this.statusNode.innerHTML = "<div class='rcm-error'><div>ERROR: "+pWikiInfo.servername+"</div>"+JSON.stringify(pData.error)+"</div>";
			throw "Wiki returned error";
		}
		else if(pFailStatus == "timeout") {
			this.handleWikiLoadError(pWikiInfo, pTries, pID, "rcm-error-loading-syntaxhang", 1);
		
			// clearTimeout(this.loadErrorTimeoutID); this.loadErrorTimeoutID = null;
			// this.statusNode.innerHTML = "<div class='rcm-error'>"+i18n("rcm-error-loading-syntaxhang", "<span class='errored-wiki'>"+pWikiInfo.servername+"</span>", pTries)+"</div>";
			// var tHandler = function(pData){
			// 	clearTimeout(self.loadErrorTimeoutID); self.loadErrorTimeoutID = null;
			// 	if(pData) pData.target.removeEventListener("click", tHandler);
			// 	tHandler = null;
			//
			// 	self.erroredWikis.forEach(function(obj){
			// 		console.log(obj);
			// 		self.loadWiki(obj.wikiInfo, obj.tries, obj.id);
			// 	});
			// 	self.erroredWikis = [];
			// 	self.statusNode.innerHTML = "<img src='"+module.LOADER_IMG+"' /> "+i18n('rcm-loading')+" (<span class='rcm-load-perc'>"+self.calcLoadPercent()+"%</span>)";
			// };
			// Utils.newElement("button", { innerHTML:i18n("rcm-error-trymoretimes", 1) }, self.statusNode).addEventListener("click", tHandler);
			// self.erroredWikis.push({wikiInfo:pWikiInfo, tries:pTries, id:pID});
			// if(this.isAutoRefreshEnabled()) { this.loadErrorTimeoutID = setTimeout(function(){ if(tHandler) { tHandler(); } }, 20000); }
			return;
		}
		else if(pData == null || pData.query == null || pData.query.recentchanges == null) {
			console.log("Error loading "+pWikiInfo.servername+" ("+pTries+"/"+this.loadingErrorRetryNum+" tries)");
			//console.log(pData);
			if(pTries < this.loadingErrorRetryNum) {
				this.loadWiki(pWikiInfo, pTries, pID, 0);
			} else {
				if(this.erroredWikis.length === 0) {
					var tMessage = pFailStatus==null ? "rcm-error-loading-syntaxhang" : "rcm-error-loading-connection";
					this.handleWikiLoadError(pWikiInfo, pTries, pID, tMessage, RCMManager.LOADING_ERROR_RETRY_NUM_INC);
					
					// clearTimeout(this.loadErrorTimeoutID); this.loadErrorTimeoutID = null;
					// this.statusNode.innerHTML = "<div class='rcm-error'>"+i18n((pFailStatus==null ? "rcm-error-loading-syntaxhang" : "rcm-error-loading-connection"), "<span class='errored-wiki'>"+pWikiInfo.servername+"</span>", pTries)+"</div>";
					// this.addRefreshButtonTo(this.statusNode);
					// var tHandler = function(pData){
					// 	clearTimeout(self.loadErrorTimeoutID); self.loadErrorTimeoutID = null;
					// 	self.loadingErrorRetryNum += RCMManager.LOADING_ERROR_RETRY_NUM_INC;
					// 	if(pData) pData.target.removeEventListener("click", tHandler);
					// 	tHandler = null;
					//
					// 	self.erroredWikis.forEach(function(obj){
					// 		console.log(obj);
					// 		self.loadWiki(obj.wikiInfo, obj.tries, obj.id);
					// 	});
					// 	self.erroredWikis = [];
					// 	self.statusNode.innerHTML = "<img src='"+module.LOADER_IMG+"' /> "+i18n('rcm-loading')+" (<span class='rcm-load-perc'>"+self.calcLoadPercent()+"%</span>)";
					// };
					// Utils.newElement("button", { innerHTML:i18n("rcm-error-trymoretimes", RCMManager.LOADING_ERROR_RETRY_NUM_INC) }, self.statusNode).addEventListener("click", tHandler);
					// self.erroredWikis.push({wikiInfo:pWikiInfo, tries:pTries, id:pID});
					// if(this.isAutoRefreshEnabled()) { this.loadErrorTimeoutID = setTimeout(function(){ if(tHandler) { tHandler(); } }, 20000); }
				} else {
					this.erroredWikis.push({wikiInfo:pWikiInfo, tries:pTries, id:pID});
					this.statusNode.querySelector(".errored-wiki").innerHTML += ", "+pWikiInfo.servername;
				}
				//throw "Refresh";
			}
			return;
		}
		
		if(pData && pData.warning) { console.log("WARNING: ", pData.warning); }
		
		// Store wiki-data retrieved that's needed before wiki parsing
		pWikiInfo.initAfterLoad(pData.query);
		
		this.ajaxCallbacks.push(function(){
			self.parseWiki(pData.query.recentchanges, pData.query.logevents, pWikiInfo, pTries);
		});
		if(this.ajaxCallbacks.length === 1) { this.ajaxCallbacks[0](); }
	};
	
	RCMManager.prototype.handleWikiLoadError = function(pWikiInfo, pTries, pID, pErrorMessage, pInc) {
		clearTimeout(this.loadErrorTimeoutID); this.loadErrorTimeoutID = null;
		this.statusNode.innerHTML = "<div class='rcm-error'>"+i18n(pErrorMessage, "<span class='errored-wiki'>"+pWikiInfo.servername+"</span>", pTries)+"</div>";
		this.addRefreshButtonTo(this.statusNode);
		var tHandler = function(pEvent){
			clearTimeout(self.loadErrorTimeoutID); self.loadErrorTimeoutID = null;
			self.loadingErrorRetryNum += pInc;
			if(pEvent) { pEvent.target.removeEventListener("click", tHandler); }
			tHandler = null;
			
			self.erroredWikis.forEach(function(obj){
				console.log(obj);
				self.loadWiki(obj.wikiInfo, obj.tries, obj.id);
			});
			self.erroredWikis = [];
			self.statusNode.innerHTML = "<img src='"+module.LOADER_IMG+"' /> "+i18n('rcm-loading')+" (<span class='rcm-load-perc'>"+self.calcLoadPercent()+"%</span>)";
		};
		Utils.newElement("button", { innerHTML:i18n("rcm-error-trymoretimes", pInc) }, self.statusNode).addEventListener("click", tHandler);
		self.erroredWikis.push({wikiInfo:pWikiInfo, tries:pTries, id:pID});
		if(this.isAutoRefreshEnabled()) { this.loadErrorTimeoutID = setTimeout(function(){ if(tHandler) { tHandler(); } }, 20000); }
	};
	
	/* Check wiki data one at a time, either as it's returned, or after the current data is done being processed. */
	RCMManager.prototype.parseWiki = function(pData, pLogData, pWikiInfo, pTries) {
		var self = this;
		
		// Check if wiki doesn't have any recent changes
		if(pData.length < 0) {
			this.onWikiParsingFinished(pWikiInfo);
			return;
		}
		
		if(module.debug) { console.log(pWikiInfo.servername, pData); }
		
		var tNewRC, tDate, tChangeAdded;
		// Add each entry from the wiki to the list in a sorted order
		pData.forEach(function tRCM_parseWiki_parseRCData(pRCData){
			// Skip if user is hidden for whole script or specific wiki
			if(pRCData.user && self.hideusers.indexOf(pRCData.user) > -1 || (pWikiInfo.hideusers && pWikiInfo.hideusers.indexOf(pRCData.user) > -1)) { return; }
			// Skip if user is NOT a specified user to show for whole script or specific wiki
			if(pRCData.user && (self.onlyshowusers.length != 0 && self.onlyshowusers.indexOf(pRCData.user) == -1)) { return; }
			if(pRCData.user && (pWikiInfo.onlyshowusers != undefined && pWikiInfo.onlyshowusers.indexOf(pRCData.user) == -1)) { return; }
			
			self.itemsToAddTotal++;
			tNewRC = new RCData( pWikiInfo, self ).init(pRCData, pLogData);
			tChangeAdded = false;
			self.recentChangesEntries.every(function tRCM_parseWiki_checkIfShouldGroup(pRCList, i){
				if(tNewRC.date > pRCList.date) {
					self.recentChangesEntries.splice(i, 0, new RCList(self).addRC(tNewRC));
					tChangeAdded = true;
					return false;
				} else {
					if(self.rcParams.hideenhanced == false && pRCList.shouldGroupWith(tNewRC)) {
						pRCList.addRC(tNewRC);
						tChangeAdded = true;
						return false;
					}
				}
				return true;
			});
			if(!tChangeAdded || self.recentChangesEntries.length == 0) { self.recentChangesEntries.push( new RCList(self).addRC(tNewRC) ); }
		});
		
		this.onWikiParsingFinished(pWikiInfo);
	};
	
	// After a wiki is loaded, check if ALL wikis are loaded; if so add results; if not, load the next wiki, or wait for next wiki to return data.
	RCMManager.prototype.onWikiParsingFinished = function(pWikiInfo) {
		this.wikisLeftToLoad--;
		this.wikisNode.addWiki(pWikiInfo);
		document.querySelector(this.modID+" .rcm-load-perc").innerHTML = this.calcLoadPercent() + "%";//.toFixed(3) + "%";
		if(this.wikisLeftToLoad > 0) {
			// Parse / wait for next wiki
			this.ajaxCallbacks.shift();
			if(this.ajaxCallbacks.length > 0){ this.ajaxCallbacks[0](); }
		} else {
			if(module.langLoaded) {
				this.rcmChunkStart();
			} else {
				var self = this;
				module.onLangLoadCallbacks.push(function(){ self.rcmChunkStart(); });
			}
		}
	};
	
	// All wikis are loaded
	RCMManager.prototype.rcmChunkStart = function() {
		var tDate = new Date();
		this.statusNode.innerHTML = i18n('rcm-download-timestamp', "<b><tt>"+Utils.pad(Utils.getHours(tDate, this.timezone),2)+":"+Utils.pad(Utils.getMinutes(tDate, this.timezone),2)+"</tt></b>");
		this.statusNode.innerHTML += "<span class='rcm-content-loading'>"+i18n('rcm-download-changesadded', "<span class='rcm-content-loading-num'>0</span> / "+this.itemsToAddTotal)+"</span>"
		this.resultsNode.innerHTML = "";
		
		// Add some run-time CSS classes
		if(!this.rcm_style_for_rc_bg_added) {
			this.rcm_style_for_rc_bg_added = true;
			var tCSS = "";
			Utils.forEach(this.chosenWikis, function(wikiInfo){
				// bgcolor should be used if specified, otherwise tile favicon as background. But not both.
				tCSS += "\n."+wikiInfo.rcClass+" .rcm-tiled-favicon {"
					+(wikiInfo.bgcolor != null ? "background: "+ wikiInfo.bgcolor +";" : "background-image: url("+ wikiInfo.favicon +");")
				+" }";
			});
			mw.util.addCSS(tCSS);
		}
		
		// console.log(this.recentChangesEntries);
		if(this.recentChangesEntries.length == 0 || (this.lastLoadDateTime != null && this.recentChangesEntries[0].date <= this.lastLoadDateTime)) {
			Utils.newElement("div", { className:"rcm-noNewChanges", innerHTML:"<strong>"+i18n('rcm-nonewchanges')+"</strong>" }, this.resultsNode);
		}
		else if(this.lastLoadDateTimeActual != null && this.isAutoRefreshEnabled() && !document.hasFocus()) {
			if(this.recentChangesEntries[0].date > this.lastLoadDateTimeActual) {
				var tMostRecentEntry = this.recentChangesEntries[0].newest;
				// Skip if user is hidden for whole script or specific wiki
				var tDontNotify = this.notificationsHideusers.indexOf(tMostRecentEntry.author) > -1 || (tMostRecentEntry.wikiInfo.notificationsHideusers && tMostRecentEntry.wikiInfo.notificationsHideusers.indexOf(tMostRecentEntry.author) > -1) || !tMostRecentEntry.wikiInfo.notificationsEnabled;
				if(!tDontNotify) {
					module.blinkWindowTitle(i18n("wikifeatures-promotion-new")+"!");
					var tNumNewChanges = 0, tNumNewChangesWiki = 0;
					for(var i = 0; i < this.recentChangesEntries.length; i++) {
						if(this.recentChangesEntries[i].date > this.lastLoadDateTime) {
							for(var j = 0; j < this.recentChangesEntries[i].list.length; j++) {
								if(this.recentChangesEntries[i].list[j].date > this.lastLoadDateTime) {
									tNumNewChanges++;
									if(this.recentChangesEntries[i].wikiInfo.servername == tMostRecentEntry.wikiInfo.servername) { tNumNewChangesWiki++; }
								} else { break; }
							}
						} else { break; }
					}
					var tEditSummary = !tMostRecentEntry.summary ? "" : "\n"+i18n("edit-summary")+": "+tMostRecentEntry.summary;
					module.addNotification(i18n("nchanges", tNumNewChanges)+" - "+tMostRecentEntry.wikiInfo.sitename + (tNumNewChangesWiki != tNumNewChanges ? " ("+i18n("nchanges", tNumNewChangesWiki)+")" : ""), {
						body:tMostRecentEntry.title+"\n"+Utils.ucfirst(i18n("myhome-feed-edited-by", tMostRecentEntry.author)) + tEditSummary
					});
				}
				tMostRecentEntry = null;
			}
		}
		this.rcmChunk(0, 99, 99, null, this.ajaxID);
	}
	
	// Add a single change at a time, with a timeout before the next one to prevents script from locking up browser.
	RCMManager.prototype.rcmChunk = function(pIndex, pLastDay, pLastMonth, pContainer, pID) {
		if(pID != this.ajaxID) { return; } // If the script is refreshed (by auto refresh) while entries are adding, stop adding old entries.
		var self = this;
		
		if(this.recentChangesEntries.length == 0) { this.finishScript(); return; }
		
		var date = this.recentChangesEntries[pIndex].date;
		// Add new date grouping if necessary.
		if(Utils.getDate(date, this.timezone) != pLastDay || Utils.getMonth(date, this.timezone) != pLastMonth) {
			pLastDay = Utils.getDate(date, this.timezone);
			pLastMonth = Utils.getMonth(date, this.timezone);
			Utils.newElement("h4", { innerHTML:pLastDay+" "+mw.config.get('wgMonthNames')[pLastMonth+1]+" "+Utils.getYear(date, this.timezone) }, this.resultsNode);
			
			pContainer = this.rcParams.hideenhanced==false ? Utils.newElement("div", {  }, this.resultsNode) : Utils.newElement("ul", { className:"special" }, this.resultsNode);
		}
		// Show at what point new changes start at.
		if(this.lastLoadDateTime != null && pIndex-1 >= 0 && date <= this.lastLoadDateTime && this.recentChangesEntries[pIndex-1].date > this.lastLoadDateTime) {
			Utils.newElement("div", { className:"rcm-previouslyLoaded", innerHTML:"<strong>"+i18n('rcm-previouslyloaded')+"</strong>" }, pContainer);
		}
		
		// Add to page
		pContainer.appendChild(this.recentChangesEntries[pIndex].toHTML(pIndex));
		this.itemsAdded += this.recentChangesEntries[pIndex].list.length;
		
		if(++pIndex < this.recentChangesEntries.length) {
			document.querySelector(this.modID+" .rcm-content-loading-num").innerHTML = this.itemsAdded;
			// Only do a timeout every few changes (timeout to prevent browser potentially locking up, only every few to prevent it taking longer than necessary)
			if(pIndex%5 == 0) {
				setTimeout(function(){ self.rcmChunk(pIndex, pLastDay, pLastMonth, pContainer, pID); });
			} else {
				self.rcmChunk(pIndex, pLastDay, pLastMonth, pContainer, pID);
			}
		}
		else { this.finishScript(); }
	};
	
	RCMManager.prototype.finishScript = function() {
		Utils.removeElement(document.querySelector(this.modID+" .rcm-content-loading"));
		this.addRefreshButtonTo(this.statusNode);
		this.addAutoRefreshInputTo(this.statusNode);
		// If auto-refresh is on and window doesn't have focus, then don't update the position of "previously loaded" message.
		if (this.lastLoadDateTime == null || !this.isAutoRefreshEnabled() || document.hasFocus()) {
			this.lastLoadDateTime = this.recentChangesEntries[0].date;//new Date();
		}
		this.lastLoadDateTimeActual = this.recentChangesEntries[0].date;//new Date();
		
		// Removing this all remove event handlers
		// for (var i = 0; i < this.recentChangesEntries.length; i++) {
		// 	this.recentChangesEntries[i].dispose();
		// 	this.recentChangesEntries[i] = null;
		// }
		// this.recentChangesEntries = null;
		
		this.startAutoRefresh();
		
		//$( "#rc-content-multiple .mw-collapsible" ).each(function(){ $(this).makeCollapsible(); });
		
		(window.ajaxCallAgain || []).forEach(function(cb){ cb(); });
		
		// Secondary info
		if(this.extraLoadingEnabled) {
			this.loadExtraInfo(this.ajaxID);
		}
	};
	
	RCMManager.prototype.startAutoRefresh = function(pID) {
		if(!this.isAutoRefreshEnabled()) { return; }
		
		var self = this;
		this.autoRefreshTimeoutID = setTimeout(function(){
			if(RCMModal.isModalOpen()) { self.startAutoRefresh(); return; }
			self.refresh();
		}, this.autoRefreshTimeoutNum);
	};
		
	RCMManager.prototype.loadExtraInfo = function(pID) {
		if(pID != this.ajaxID) { return; }
		if(this.secondaryWikiData.length == 0) { if(module.debug){ console.log("[RCMManager](loadExtraInfo) All loading finished."); } return; }
		var self = this;
		
		var tUrl = this.secondaryWikiData[0].url;
		var tCallback = this.secondaryWikiData[0].callback;
		this.secondaryWikiData.splice(0, 1);
		
		$.ajax({
			type: 'GET',
			dataType: 'jsonp',
			data: {},
			url: tUrl,
			success: function(){ if(pID != self.ajaxID) { return; } tCallback.apply(this, arguments); },//tCallback,
			// error: function(data){ self.onWikiLoaded(null, pWikiInfo, pTries, pID, true); },
		});
		
		setTimeout(function(){ self.loadExtraInfo(pID); }, module.loadDelay);
	}
	
	//######################################
	// Specific Helper Methods
	//######################################
	RCMManager.prototype.addRefreshButtonTo = function(pParent) {
		var self = this;
		
		pParent.appendChild(document.createTextNode(" "));
		
		Utils.newElement("button", { innerHTML:i18n('rcm-refresh') }, pParent).addEventListener("click", function tHandler(e){
			e.target.removeEventListener("click", tHandler);
			self.refresh();
		});
	};
	
	RCMManager.prototype.addAutoRefreshInputTo = function(pParent) {
		var self = this;
		
		pParent.appendChild(document.createTextNode(" "));
		
		var autoRefresh = Utils.newElement("span", { className:"rcm-autoRefresh" }, pParent);
		Utils.newElement("label", { htmlFor:"rcm-autoRefresh-checkbox", innerHTML:i18n('rcm-autorefresh'), title:i18n('rcm-autorefresh-tooltip', Math.floor(self.autoRefreshTimeoutNum/1000)) }, autoRefresh);
		var checkBox = Utils.newElement("input", { className:"rcm-autoRefresh-checkbox", type:"checkbox" }, autoRefresh);
		checkBox.checked = this.isAutoRefreshEnabled();
		
		checkBox.addEventListener("click", function tHandler(e){
			if(document.querySelector(self.modID+" .rcm-autoRefresh-checkbox").checked) {
				localStorage.setItem(self.autoRefreshLocalStorageID, true);
				self.refresh();
				Notification.requestPermission();
			} else {
				localStorage.setItem(self.autoRefreshLocalStorageID, false);
				clearTimeout(self.autoRefreshTimeoutID);
			}
		});
	};
	
	RCMManager.prototype.isAutoRefreshEnabled = function() {
		return localStorage.getItem(this.autoRefreshLocalStorageID) == "true" || this.autoRefreshEnabledDefault;
	}
	
	RCMManager.prototype.calcLoadPercent = function() {
		return Math.round((this.totalWikisToLoad - this.wikisLeftToLoad) / this.totalWikisToLoad * 100);
	};
	
	// take a "&" seperated list of RC params, and returns a Object with settings.
	// NOTE: Script does not currently support: "from" and "namespace" related fields (like invert)
	RCMManager.prototype.parseRCParams = function(pData, pExplodeOn, pSplitOn) {
		var tRcParams = {};
		tRcParams.paramString = [];
		
		if(!pData) { return tRcParams; }
		var tRcParamsRawData = pData.split(pExplodeOn);
		var tRcParamsDataSplit; // Split of raw data
		for(var i = 0; i < tRcParamsRawData.length; i++) {
			tRcParamsDataSplit = tRcParamsRawData[i].split(pSplitOn);
			if(tRcParamsDataSplit.length > 1) {
				if(tRcParamsDataSplit[0] == "limit" && tRcParamsDataSplit[1]) {
					tRcParams["limit"] = parseInt( tRcParamsDataSplit[1] );
				}
				else if(tRcParamsDataSplit[0] == "days" && tRcParamsDataSplit[1]) {
					tRcParams["days"] = parseInt( tRcParamsDataSplit[1] );
				}
				else if(tRcParamsDataSplit[0] == "namespace" && (tRcParamsDataSplit[1] || tRcParamsDataSplit[1] === "0")) {
					tRcParams["namespace"] = tRcParamsDataSplit[1];
				}
				// else if(tRcParamsDataSplit[0] == "from" && tRcParamsDataSplit[1]) {
				// 	tRcParams["from"] = tRcParamsDataSplit[1];
				// }
				// Check all the true / false ones
				else if(tRcParamsDataSplit[1]) {
					tRcParams[tRcParamsDataSplit[0]] = tRcParamsDataSplit[1]=="1";
				}
				tRcParams.paramString.push(tRcParamsDataSplit[0]+"="+tRcParamsDataSplit[1]);
			}
		}
		tRcParams.paramString = tRcParams.paramString.join("&");
		
		return tRcParams;
	}
	
	RCMManager.prototype.getDefaultRCParams = function() {
		return {
			paramString	: "", // Complete list of params.
			limit		: 50,
			days		: 7,
			hideminor	: false,
			hidebots	: true,
			hideanons	: false,
			hideliu		: false,
			hidemyself	: false,
			hideenhanced: false,
			hidelogs	: false,
			namespace	: null,
		};
	}
	
	return RCMManager;
		
})(window.jQuery
	, document
	, window.mediaWiki
	, window.dev.RecentChangesMultiple
	, window.dev.RecentChangesMultiple.RCData
	, window.dev.RecentChangesMultiple.RCList
	, window.dev.RecentChangesMultiple.WikiData
	, window.dev.RecentChangesMultiple.RCMOptions
	, window.dev.RecentChangesMultiple.RCMWikiPanel
	, window.dev.RecentChangesMultiple.Utils
	, window.dev.RecentChangesMultiple.i18n
	, window.dev.RecentChangesMultiple.RCMModal
);
//</syntaxhighlight>

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
	module.version = "1.2.9d";
	module.lastVersionDateString = "Thu Oct 15 2016 00:39:12 GMT-0400 (Eastern Standard Time)";
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
