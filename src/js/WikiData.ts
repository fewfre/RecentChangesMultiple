import Global from "./Global";
import RCMManager from "./RCMManager";
import RCParams from "./types/RCParams";
import UserData from "./UserData";
import Utils from "./Utils";
import i18n from "./i18n";

let $ = window.jQuery;
let mw = window.mediaWiki;

interface CurrentUser {
	rights:{
		block:boolean, undelete:boolean, rollback:boolean,
		analytics:boolean,
		// abusefilter_view:boolean, abusefilter_log:boolean, abusefilter_log_detail:boolean, abusefilter_log_private:boolean
	}
}

//######################################
// #### Wiki Data ####
// * A data object to keep track of wiki data in an organized way, as well as also having convenience methods.
// * These should only be created once per wiki per RCMManager. No reason to re-create every refresh.
//######################################
export default class WikiData
{
	// Static Constants
	// What data is to be retrieved for each recent change.
	static readonly RC_PROPS = ["user", "flags", "title", "ids", "sizes", "timestamp", "loginfo", "parsedcomment", "comment"].join("|"); // patrolled
	
	// Storage
	manager					: RCMManager; // Keep track of what manager this data is attached to.
	
	/***************************
	* List Data - Data defined by "&attr=" style data on the url list elements.
	* ex: *dev.fandom.com &hideusers=Test
	****************************/
	servername				: string; // Base domain url (not http:// or other slashes). ex: dev.fandom.com
	scriptpath				: string; // Full url to script directory (EXcluding last "/"). ex: //test.wiki/w
	scriptdir				: string; // The subdirectory api.php is on (in relation to this.servername)
	firstSeperator			: string; // "?" unless it's a wiki that uses the "index.php?title=" format
	
	hideusers				: string[]; // These users are to have their RCs hidden for only this wiki.
	onlyshowusers			: string[]; // These users are to have ONLY their RCs shown for this wiki.
	notificationsHideusers	: string[]; // Don't send notifications when these users edit.
	notificationsEnabled	: boolean; // Don't send notifications for this wiki.
	
	favicon					: string; // Full url of this wiki's favicon
	rcParamsBase			: RCParams; // Works the same as this.manager.rcParams but for only this wiki.
	rcParams				: RCParams; // Combination of this.rcParamsOriginal and this.manager.rcParams to get final result.
	username				: string; // Username to user for this wiki.
	bgcolor					: string; // A valid CSS color code.
	
	htmlName				: string; // A unique identifier for this wiki. Just the server name with dashes for the dots.
	infoID					: string; // Element ID for the wiki's info banner.
	rcClass					: string; // Class name for this wiki's RC entries.
	hidden					: boolean; // If changes for this wiki should be displayed
	
	/***************************
	* Siteinfo Data
	****************************/
	needsSiteinfoData		: boolean; // Check if the RCMManager should load the Siteinfo for the wiki when it requests wiki info.
	server					: string; // Full url to base of the server (ex: //test.fandom.com)
	articlepath				: string; // Full url to wiki article directory (including last "/"). ex: //test.wiki/wiki/
	sitename				: string; // Name of the wiki
	mainpage				: string; // Main page for the wiki (not all wiki's redirect to main page if you link to domain)
	mwversion				: string; // MW version number. ex: MediaWiki 1.24.1
	langCode				: string; // Language code sent from siteinfo
	namespaces				: any[]; // A data object with all namespaces on the wiki by number = { "1":{ -data- } }
	statistics				: any; // A data object with statistics about number of articles / files / users there are on the wiki.
	
	usesWikiaDiscussions	: boolean; // To save on pointless requests that would timeout, if the first fetch fails then don't fetch them again. Undefined means it's not known yet.
	
	/***************************
	* User Data
	****************************/
	needsUserData			: boolean; // Check if the RCMManager should load the this user's account data for the wiki (detect what rights they have).
	user					: CurrentUser; // Data for the user using the script on this specific wiki.
	
	/***************************
	* All Users
	****************************/
	users					: { [username: string]: UserData }; // Map of user data. usernames stored with spaces, not _s
	usersNeeded				: string[]; // usernames stored with spaces, not _s
	
	/***************************
	* Comment Page Names - are loaded via secondary data, so cache to avoid needless refetching
	****************************/
	discCommentPageNames	: Map<string, { title:string, relativeUrl:string }>;
	discCommentPageNamesNeeded : Array<{ pageID:string, uniqID:string, cb:(data:{ title:string, relativeUrl:string })=>void }>;
	
	// /***************************
	// * AbuseFilter
	// ****************************/
	// abuseFilterFilters		: { [id: number]: { description:string, private:boolean } };
	// needsAbuseFilterFilters	: boolean;
	
	/***************************
	* Other
	****************************/
	isWikiaWiki				: boolean; // Is this wiki a wikia wiki
	isLegacyWikiaWiki		: boolean; // Old system using outdated mediawiki version - pre UCP
	useOutdatedLogSystem	: boolean; // Newer mediawikis return "logparams". older wikis (aka, Wikia as of July 2015) needs to have them retrieved separately.
	
	/***************************
	* Dynamic Data
	****************************/
	lastChangeDate			: Date;
	lastDiscussionDate		: Date;
	resultsCount			: number;
	discussionsCount		: number;
	
	// Constructor
	constructor(pManager:RCMManager) {
		this.manager = pManager;
		
		this.notificationsEnabled	= true;
		this.needsSiteinfoData		= true;
		this.needsUserData			= true;
		// Set rollback to true by default so as to fetch extra necessary data first time around.
		this.user					= { rights:{
			block:false, undelete:false, rollback:true,
			analytics: false,
			// abusefilter_view:false, abusefilter_log:false, abusefilter_log_detail:false, abusefilter_log_private:false,
		} };
		this.isWikiaWiki			= true;
		this.isLegacyWikiaWiki		= true;
		this.useOutdatedLogSystem	= false;
		
		this.users					= {};
		this.usersNeeded			= [];
		
		this.discCommentPageNames	= new Map();
		this.discCommentPageNamesNeeded = [];
		
		// this.abuseFilterFilters		= {};
		// this.needsAbuseFilterFilters = true;
		
		this.hidden = false;
		
		// Initial values set in setupRcParams() due to needing "days" value.
		this.lastChangeDate			= null;
		this.lastDiscussionDate		= null;
		this.resultsCount			= 0;
		this.discussionsCount		= 0;
	}
	
	dispose() : void {
		this.manager = null;
		
		this.hideusers = null;
		this.onlyshowusers = null;
		this.rcParamsBase = null;
		this.rcParams = null;
		
		this.namespaces = null;
		this.user = null;
		
		this.lastChangeDate = null;
		this.lastDiscussionDate = null;
	}
	// misc todo - fix discussions not using lang code - only when scriptdir used?
	
	// Parses LI element data to be able to retrieve information for the respective wiki.
	initListData(pNode) : WikiData {
		// var tWikiDataRaw = pNode.textContent.replace(/(\r\n|\n|\r)/gm, "").trim().split("&"); // Need to check for new lines due to how wikis create lists.
		var [tWikiDataRawUrl, ...tWikiDataRaw] = pNode.textContent.trim().replace(/(\r\n|\n|\r)/gm, "\n").split(/[&\n]/).map(s => s.trim()).filter(s => !!s); // Need to check for new lines due to how wikis create lists.
		// mw.log(tWikiDataRawUrl, tWikiDataRaw);
		
		// todo - remove /s form URL, and add to scriptdir; if scriptdir is UserData, add it to URL, not replace.
		// todo - but still make sure the scriptdir is used when domain is complained about in errors and such?
		// Some default values
		this.servername = tWikiDataRawUrl.replace(/^https?\:\/\//, "").replace(/(\/$)/g, "");
		this.scriptdir = "";
		this.firstSeperator = "?";
		this.htmlName = this.servername.replace(/([\.\/])/g, "-");
		
		this.isWikiaWiki = (this.servername.indexOf(".wikia.") > -1) || (this.servername.indexOf(".fandom.") > -1);
		this.isLegacyWikiaWiki = this.isWikiaWiki;
		this.useOutdatedLogSystem = this.isWikiaWiki;
		
		// todo - allow / - consequences?
		// if(this.servername.indexOf("/") > -1) {
		// 	// Old message: 'rcm-error-linkformat' : "'$1' is an incorrect format. Please do '''not''' include 'http://' or anything after the domain, including the first '/'.",
		// 	this.manager.resultCont.innerHTML = `<div style='color:red; padding:4px 5px; background:rgba(0,0,0,0.1);'>${ i18n("rcm-error-linkformat", this.servername) }</div>`;
		// 	throw "Incorrect format";
		// }
		
		var tWikiDataSplit, tKey, tVal; // Split of raw data
		for(var i = 0; i < tWikiDataRaw.length; i++) {
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
						this.hideusers.forEach((o,i,a) => { a[i] = Utils.ucfirst(a[i].trim()); });
						break;
					}
					case "onlyshowusers": {
						this.onlyshowusers = tVal.replace("", " ").split(",");
						this.onlyshowusers.forEach((o,i,a) => { a[i] = Utils.ucfirst(a[i].trim()); });
						break;
					}
					case "notifications_hideusers": {
						this.notificationsHideusers = tVal.replace("", " ").split(",");
						this.notificationsHideusers.forEach((o,i,a) => { a[i] = Utils.ucfirst(a[i].trim()); });
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
							this.favicon = "//vignette.wikia.nocookie.net/"+this.favicon+"/images/6/64/Favicon.ico"
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
		
		if(!this.username && this.isWikiaWiki && Global.username) {
			this.username = Global.username;
		}
		
		this.scriptpath =  `//${this.servername}${this.scriptdir}`;
		
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
	initAfterLoad(pQuery) : WikiData {
		/***************************
		 * Siteinfo Data
		 ***************************/
		if(this.needsSiteinfoData && !!pQuery.general){
			this.needsSiteinfoData = false;
			
			this.server = pQuery.general.server || ("//" + this.servername);
			this.articlepath = this.server + pQuery.general.articlepath.replace("$1", "");
			if(this.articlepath.indexOf("?") > -1) { this.firstSeperator = "&"; }
			this.scriptpath =  `${this.server}${pQuery.general.scriptpath}`; // Re-set with info directly from siteinfo
			this.sitename = pQuery.general.sitename;
			this.mainpage = pQuery.general.mainpage;
			this.mwversion = pQuery.general.generator;
			this.langCode = pQuery.general.lang;
			
			// For wikia/fandom wikis, check if it is a UCP wiki (updated mediawiki version). If it is old, then also use old log system; otherwise use default
			if(this.isWikiaWiki) {
				this.isLegacyWikiaWiki = this.mwversion == "MediaWiki 1.19.24";
				this.useOutdatedLogSystem = this.isLegacyWikiaWiki;
			}
			
			if(this.favicon == null) {
				// Requires MediaWiki V1.23+  -- currently has to be hardcoded off for UCP wikis as well, since it shows wrong favicon for this setting
				if(pQuery.general.favicon && !this.isWikiaWiki) {
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
			
			if(!!pQuery.variables) {
				// This is only for Wikia wikis. Other wikis can ignore this.
				let wgCityIdObj = $.grep(pQuery.variables, function(o:any){ return o.id === "wgCityId" })[0];
				if(!wgCityIdObj) {
					// Don't bother checking for discussions if it's not a wikia wiki
					this.usesWikiaDiscussions = false;
				}
			}
		}
		
		/***************************
		 * User Data
		 ***************************/
		if(this.needsUserData && !!pQuery.users){
			this.needsUserData = false;
			// this.user.rights.block = false;
			// this.user.rights.undelete = false;
			// this.user.rights.rollback = false;
			// for(var i in pQuery.users[0].rights) {
			// 	if(pQuery.users[0].rights[i] == "block") { this.user.rights.block = true; }
			// 	if(pQuery.users[0].rights[i] == "undelete") { this.user.rights.undelete = true; }
			// 	else if(pQuery.users[0].rights[i] == "rollback") { this.user.rights.rollback = true; }
			// }
			let tRightList = pQuery.users[0].rights;
			this.user.rights = {
				block:		tRightList.indexOf("block") > -1,
				undelete:	tRightList.indexOf("undelete") > -1,
				rollback:	tRightList.indexOf("rollback") > -1,
				analytics:	tRightList.indexOf("analytics") > -1,
				
				// abusefilter_view:			tRightList.indexOf("abusefilter-view") > -1,
				// abusefilter_log:			tRightList.indexOf("abusefilter-log") > -1,
				// abusefilter_log_detail:		tRightList.indexOf("abusefilter-log-detail") > -1,
				// abusefilter_log_private:	tRightList.indexOf("abusefilter-log-private") > -1,
			};
		}
		
		/***************************
		 * Favicon fallback - may not be needed now with "pQuery.pages" backup.
		 ***************************/
		if(this.favicon == null) {
			this.favicon = Global.FAVICON_BASE+this.scriptpath;
		}
		
		return this;
	}
	
	// initAbuseFilterFilters(pQuery) : this {
	// 	if(this.needsAbuseFilterFilters && !!pQuery.abusefilters){
	// 		this.needsAbuseFilterFilters = false;
	// 		this.abuseFilterFilters = {};
	// 		let tFilter;
	// 		for (let i = 0; i < pQuery.abusefilters.length; i++) {
	// 			tFilter = pQuery.abusefilters[i];
	// 			this.abuseFilterFilters[tFilter.id] = { description:tFilter.description, private:tFilter.private==="" };
	// 		}
	// 	}
		
	// 	return this;
	// }
	
	setupRcParams() : void {
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
		
		if(!this.lastChangeDate) {
			this.lastChangeDate = this.getEndDate();
			this.lastDiscussionDate = this.getEndDate();
		}
	}
	
	// Get the string for use with Special:RecentChanges link for this wiki.
	// Don't pass in params with "default" values included, or the link will have them all specified.
	createRcParamsString(pParams) : string {
		var tArray = [];
		$.each( pParams, function( tKey:string, tVal ) {
			if( tKey != "paramString" ) {
				if(tVal === true) { tVal="1"; }
				if(tVal === false) { tVal="0"; }
				tArray.push(tKey+"="+tVal);
			}
		});
		return tArray.join("&");
	}
	
	// Since both initListData and initSiteinfo can set the wiki's favicon, set default favicon if none set
	getFaviconHTML(pOpenInfoBanner:boolean=false, pSize:number=16) : string {
		let html = `<img src='${this.favicon}' title='${this.sitename}' width='${pSize}' height='${pSize}' />`;
		if(pOpenInfoBanner) { html = `<span class='rcm-favicon-goto-button' data-infoid='${this.infoID}'>${html}</span>`; }
		return html;
	}
	
	getEndDate() : Date {
		let tDate = new Date();//this.rcParams.from ? new Date(this.rcParams.from) : new Date();
		tDate.setDate( tDate.getDate() - this.rcParams.days );
		return tDate;
	}
	
	// Get user CSS classes as a string.
	getUserClass(pUser:string) : string {
		if(this.manager.extraLoadingEnabled && pUser) {
			pUser = pUser.replace(/_/g, " ");
			if(this.users[pUser]) {
				return this.users[pUser].getClassNames();
			} else {
				if(this.usersNeeded.indexOf(pUser) == -1) this.usersNeeded.push(pUser);
				return "rcm-user-needed";
			}
		}
		return "";
	}
	// Get the correspondering dataset for user class.
	getUserClassDataset(pUser:string) : string {
		if(!pUser) { return ""; }
		return `data-username=\"${pUser.replace(/"/g, "&quot;")}\"`;
	}
	
	checkForSecondaryLoading() : void {
		const MAX = 50, loops = Math.ceil(this.usersNeeded.length/MAX);
		for (let i = 0; i < loops; i++) {
			let url = UserData.getUsersApiUrl(this.usersNeeded.slice(i*MAX, (i+1)*MAX), this.scriptpath);
			this.checkForSecondaryLoading_doUsersLoad(url);
		}
	}
	
	checkForSecondaryLoading_doUsersLoad(pUrl:any) : void {
		this.manager.secondaryWikiData.push({
			url: pUrl,
			callback: (data) => {
				if(!data.query || !data.query.users) { return; }
				data.query.users.forEach((user, i)=>{
					let username = user.name;
					if(user.invalid === "" || user.missing === "") { Utils.removeFromArray(this.usersNeeded, username); return; }
					// Keep track of data for future use.
					this.users[username] = new UserData(this, this.manager).init(user);
					Utils.removeFromArray(this.usersNeeded, username);
					// Update data on the page.
					let tNeededClass = "rcm-user-needed";
					let tUserNodes = this.manager.resultsNode.querySelectorAll(`.${this.rcClass} .${tNeededClass}[data-username="${username.replace(/"/g, '&quot;')}"]`);
					// loop through them and add classes
					Utils.forEach(tUserNodes, (pUserNode)=>{
						pUserNode.className += " "+this.users[username].getClassNames();
						pUserNode.classList.remove(tNeededClass);
					});
					// TODO: Add classes directly to anchor? or always put a wrapper and add "username" class?
				});
			}
		});
	}
	
	updateLastChangeDate(pData:any) : void {
		if(new Date(pData.timestamp) < this.lastChangeDate) { return; }
		this.lastChangeDate = new Date(pData.timestamp);
		// Add 1 millisecond to avoid getting this change again.
		this.lastChangeDate.setSeconds(this.lastChangeDate.getSeconds()+1);
		this.lastChangeDate.setMilliseconds(1);
		//this.lastChangeDate.setMilliseconds(this.lastChangeDate.getMilliseconds()+1001);
	}
	
	updateLastDiscussionDate(pData:any) : void {
		let tSecond = (pData.modificationDate || pData.creationDate).epochSecond;
		this.lastDiscussionDate = new Date(0);
		// Add 1 millisecond to avoid getting this change again.
		this.lastDiscussionDate.setUTCSeconds(tSecond);
		this.lastDiscussionDate.setUTCMilliseconds(1);
	}
	
	// For retrieving 1-off wiki specific info (some of which is required to know before fetching changes)
	getWikiDataApiUrl() : string {
		if(!this.needsSiteinfoData || !this.needsUserData) { return null; }
		let params = {}, tUrlList = [], tMetaList = [], tPropList = [];
		
		/***************************
		* Siteinfo Data - https://www.mediawiki.org/wiki/API:Siteinfo
		* Get the site info (Once per RCMManager)
		***************************/
		tMetaList.push("siteinfo");
		params["siprop"] = ["general", "namespaces", "statistics", "variables"].join("|");
		
		/***************************
		* Imageinfo Data - https://www.mediawiki.org/wiki/API:Imageinfo
		* Get favicon url for wiki (needed for wikis below V1.23 [Added to siteinfo at that point]) (Once per RCMManager)
		***************************/
		tPropList.push("imageinfo");
		params["iiprop"] = "url";
		params["titles"] = "File:Favicon.ico";
		
		/***************************
		* User Data - https://www.mediawiki.org/wiki/API:Users
		* If user logged in / set, get info for this wiki (Once per RCMManager)
		***************************/
		if(this.username) {
			tUrlList.push("users");
			params["ususers"] = this.username;
			params["usprop"] = "rights";
		} else {
			this.needsUserData = false;
		}
		
		/***************************
		* Finish building url
		***************************/
		if(tUrlList.length > 0){ params["list"] = tUrlList.join("|"); }
		if(tMetaList.length > 0){ params["meta"] = tMetaList.join("|"); }
		if(tPropList.length > 0){ params["prop"] = tPropList.join("|"); }
		
		var tReturnText = "https:"+this.scriptpath+"/api.php?action=query&format=json&continue=&"+Utils.objectToUrlQueryData(params);
		tReturnText.replace(/ /g, "_");
		
		tMetaList = null;
		tPropList = null;
		
		Utils.logUrl("[WikiData](getWikiDataApiUrl)", tReturnText);
		return tReturnText;
	}
	
	// Gets URL for the Wikia discussions API;
	// https://github.com/Wikia/app/blob/b03df0a89ed672697e9c130d529bf1eb25f49cda/lib/Swagger/src/Discussion/Api/PostsApi.php
	getWikiDiscussionUrl() : string {
		// Get results up to this time stamp.
		var tEndDate = this.lastDiscussionDate;//this.getEndDate();

		var tLimit = this.rcParams.limit < 50 ? this.rcParams.limit : 50; // 50 is the limit, but fetch less if there are less.
		
		let params = {
			limit: tLimit,
			page: 0,
			since: tEndDate.toISOString(),
			responseGroup: "small",
			reported: "false",
			viewableOnly: !this.user.rights.block,
		};
		// var tReturnText = `https://services.fandom.com/discussion/${this.wikiaCityID}/posts?${Utils.objectToUrlQueryData(params)}`;
		var tReturnText = `${this.scriptpath}/wikia.php?controller=DiscussionPost&method=getPosts&${Utils.objectToUrlQueryData(params)}`;
		mw.log(`[WikiData](getWikiDiscussionUrl) ${this.servername} - ${tReturnText}`);
		return tReturnText;
	}
	
	// Returns the url to the Api, which will return the Recent Changes for the wiki (as well as Siteinfo if needed)
	// https://www.mediawiki.org/wiki/API:RecentChanges
	getApiUrl() : string {
		let params = {}, tUrlList = [], tMetaList = [], tPropList = [];
		
		// Get results up to this time stamp.
		let tEndDate = this.lastChangeDate;//this.getEndDate();
		
		/***************************
		* Recent Changes Data - https://www.mediawiki.org/wiki/API:RecentChanges
		***************************/
		tUrlList.push("recentchanges");
		params["rcprop"] = WikiData.RC_PROPS; // What data to retrieve.
		
		// How many results to retrieve
		params["rclimit"] = this.rcParams.limit;
		params["rcend"] = tEndDate.toISOString();
		
		var tRcShow = [];
		if(this.rcParams.hideminor) { tRcShow.push("!minor"); }
		if(this.rcParams.hidebots) { tRcShow.push("!bot"); }
		if(this.rcParams.hideanons) { tRcShow.push("!anon"); }
		if(this.rcParams.hideliu) { tRcShow.push("anon"); } // Hide users
		params["rcshow"] = tRcShow.join("|");
		tRcShow = null;
		
		var tRcType = ["edit", "new"]; // external
		if(this.rcParams.hidelogs == false) { tRcType.push("log"); }
		params["rctype"] = tRcType.join("|");
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
		if(tUser != null) { params["rcexcludeuser"] = tUser; }
		
		if(this.rcParams.namespace || this.rcParams.namespace === "0") {
			params["rcnamespace"] = this.rcParams.namespace; // Already separated by "|"
		}
		
		/***************************
		* Log Event Data - https://www.mediawiki.org/wiki/API:Logevents
		* Get info for logs that don't return all necessary info through "Recent Changes" api.
		* To avoid a second loading sequence, we load logs up to same limit / timestamp at "Recent Changes" api (since it's the best we can assume).
		***************************/
		if(this.useOutdatedLogSystem && this.rcParams.hidelogs == false) {
			tUrlList.push("logevents");
			params["leprop"] = ["details", "user", "title", "timestamp", "type", "ids"].join("|");
			params["letype"] = ["rights", "move", "delete", "block", "merge"].join("|");
			
			// How many results to retrieve
			params["lelimit"] = this.rcParams.limit;
			params["leend"] = tEndDate.toISOString();
		}
		
		// /***************************
		// * Abuse Filter Filter List Data - https://www.mediawiki.org/wiki/Extension:AbuseFilter
		// * Each wiki has it's own list of abuse filters
		// ***************************/
		// // Checking for both rights should assure this wiki has logs the user can potentially see.
		// mw.log("[WikiData](getApiUrl) Abuse filter: ", this.rcParams.hidelogs == false , this.user.rights , this.user.rights.abusefilter_log , this.user.rights.abusefilter_view);
		// if(true/*TODO*/ && this.rcParams.hidelogs == false && this.user.rights.abusefilter_log && this.user.rights.abusefilter_view) {
		// 	if(this.needsAbuseFilterFilters) {
		// 		tUrlList.push("abusefilters");
		// 		params["abflimit"] = 500;
		// 		params["abfshow"] = "enabled";
		// 		params["abfprop"] = "id|description|private";//|actions
		// 	}
		// 	tUrlList.push("abuselog");
		// 	params["afllimit"] = this.rcParams.limit;
		// 	params["aflend"] = tEndDate.toISOString();
		// 	params["aflprop"] = "ids|user|title|action|result|timestamp";
		// }
		
		/***************************
		* Finish building url
		***************************/
		params["list"] = tUrlList.join("|");
		if(tMetaList.length > 0){ params["meta"] = tMetaList.join("|"); }
		if(tPropList.length > 0){ params["prop"] = tPropList.join("|"); }
		
		
		let tReturnText = this.scriptpath+"/api.php?action=query&format=json&continue=&"+Utils.objectToUrlQueryData(params);
		tReturnText.replace(/ /g, "_");
		
		tUrlList = null;
		tMetaList = null;
		tPropList = null;
		tEndDate = null;
		
		Utils.logUrl("[WikiData](getApiUrl)", tReturnText);
		return tReturnText;
	}
}
