import Main from "./Main";
import RCMWikiPanel from "./RCMWikiPanel";
import RCMOptions from "./RCMOptions";
import Global from "./Global";
import RCMModal from "./RCMModal";
import WikiData from "./WikiData";
import { RCData, RCDataArticle, RCDataLog, RCDataFandomDiscussion } from "./rc_data";
import RCList from "./rc_data/RCList";
import RCParams from "./types/RCParams";
import Utils from "./Utils";
import i18n, { I18nKey } from "./i18n";
import RC_TYPE from "./types/RC_TYPE";

let $ = window.jQuery;
let mw = window.mediaWiki;

//######################################
// #### RCMManager - Module core ####
// * This is what actually parses a "rc-content-multiple" div, and loads the respective information.
// * Uses RCList to actually format the RecentChanges info.
//######################################
export default class RCMManager
{
	// Static Constants
	static LOADING_ERROR_RETRY_NUM_INC : number = 5;
	
	// Storage
	/***************************
	 * HTML Elements/Nodes
	 ***************************/
	modID			: string; // Keep track of elements on the page using this className (a "." is prepended to it in init())
	resultCont		: HTMLElement;
	statusNode		: HTMLElement;
	optionsNode		: RCMOptions;
	wikisNode		: RCMWikiPanel;
	resultsNode		: HTMLElement;
	footerNode		: HTMLElement;
	
	rcmNewChangesMarker		: HTMLElement;
	rcmNoNewChangesMarker	: HTMLElement;
	
	/***************************
	 * Data provided to script
	 ***************************/
	rcParamsBase			: any; // An object containing data about the RecentChange "params" sent in
	rcParams				: any; // Same as rcParamsBase as well as default values if not supplied
	
	autoRefreshTimeoutNum	: number // Number of milliseconds to wait before refreshing
	
	chosenWikis				: WikiData[]; // Wikis for the script to load
	hideusers				: string[]; // List of users to hide across whole RCMManager
	onlyshowusers			: string[]; // Only show these users' edits across whole RCMManager
	notificationsHideusers	: string[]; // Don't send notifications when these users edit.
	
	makeLinksAjax			: boolean; // Make the diff/gallery link behave as the ajax icons do.
	discNamespaces			: { FORUM:boolean, WALL:boolean, ARTICLE_COMMENT:boolean }; // What discussion namespaces (container types) to show
	discussionsEnabled		: boolean; // Whether to load Wikia discussions
	abuseLogsEnabled		: boolean; // Whether to allow wikis to load abuse filter logs (if wiki has them)
	
	/***************************
	 * Storage
	 ***************************/
	ajaxID						: number; // A unique ID for all ajax data for a given "load" (used to prevent previously requested data from mixing with currently requested data after "Refresh" is hit after a script error)
	autoRefreshTimeoutID		: number; // ID for the auto refresh timeout.
	autoRefreshEnabledDefault	: boolean; // Default value for auto refresh being enabled.
	autoRefreshEvenOnFocus		: boolean; // Whether or not script should keep auto refreshing even when page has focus.
	autoRefreshLocalStorageID	: string;
	
	rcData						: { data:RCData, list:RCList }[];
	recentChangesEntries		: RCList[]; // Array of either RecentChange/RecentChangeList objects.
	newRecentChangesEntries		: RCList[]; // Only the new / "dirty" RCLists
	ajaxCallbacks				: (()=>void)[]; // Array of functions that stores info retrieved from ajax, so that the script can run without worry of race conditions.
	erroredWikis				: { wikiInfo:WikiData, tries:number, id:number }[]; // Array of wikis that have errored more than expected times; kept in list to be tried more times should user wish
	
	extraLoadingEnabled			: boolean; // Turns extra loading on/off
	secondaryWikiData			: { url:string|(()=>string), callback:(any)=>void, dataType?:string, skipRefreshSanity?:boolean }[]; // Array of objects that are used to fill in blanks that cannot be retrieved on initial data calls (usually page-specific).
	
	flagWikiDataIsLoaded		: boolean; // Make sure certain actions can't be done by user until wiki data is retrieved.
	totalItemsToLoad			: number; // Total number of wikis to load.
	wikisLeftToLoad				: number; // Wikis left to load via ajax
	loadingErrorRetryNum		: number; // Number of tries to load a wiki before complaining (encase it's due to server, not invalid link)
	loadErrorTimeoutID			: number;
	itemsAdded					: number; // Number off items added to screen AFTER load.
	itemsToAddTotal				: number; // Total number if items to add to the screen
	isHardRefresh				: boolean;
	
	lastLoadDateTime			: Date; // The last time everything was loaded. This is also updated if window regains focus.
	lastLoadDateTimeActual		: Date; // Even if lastLoadDateTime hasn't been updated (due to auto refresh), this always has the actual last loaded date
	
	// Constructor
	constructor(pWrapper:HTMLElement|Element, pModID:string|number) {
		this.modID			= "rcm"+pModID;
		this.resultCont		= <HTMLElement>pWrapper;
		
		this.makeLinksAjax				= false;
		this.ajaxID						= 0;
		this.autoRefreshLocalStorageID	= Global.AUTO_REFRESH_LOCAL_STORAGE_ID + "-" + this.modID;
		this.extraLoadingEnabled		= true;
		this.flagWikiDataIsLoaded		= false;
		this.isHardRefresh				= true;
		
		this._parseWikiList();
		
		// Setup initial loading view
		this.resultCont.innerHTML = `<center>${Global.getLoaderLarge()}</center>`;
	}
	
	dispose() : void {
		this.resultCont		= null;
		this.optionsNode.dispose();
		this.optionsNode	= null;
		this.statusNode		= null;
		this.wikisNode.dispose();
		this.wikisNode		= null;
		this.resultsNode	= null;
		this.footerNode		= null;
		
		this.rcmNewChangesMarker		= null;
		this.rcmNoNewChangesMarker		= null;
		
		this.hideusers		= null;
		this.onlyshowusers	= null;
		
		this.rcData = null;
		this.newRecentChangesEntries = null;
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
	
	// Should only be called once per RCMManager.
	private _parseWikiList() : void {
		/***************************
		* Data provided to script
		***************************/
		var tDataset = <any>this.resultCont.dataset;
		
		this.rcParamsBase = $.extend( {}, Main.rcParamsURL, this.parseRCParams(tDataset.params, "&", "=") );
		this.rcParams = $.extend( this.getDefaultRCParams(), this.rcParamsBase );
		
		this.autoRefreshEnabledDefault = tDataset.autorefreshEnabled == "true" ? true : false;
		this.autoRefreshTimeoutNum = (tDataset.autorefresh ? parseInt(tDataset.autorefresh) : 60) * 1000; // {int} number of milliseconds to wait before refreshing.
		this.autoRefreshEvenOnFocus = tDataset.autorefreshEvenonfocus == "false" ? false : true;
		
		// Check discussion / social activity related fields
		const socialStatus = tDataset.discussionsEnabled;
		const socialEnabled = this.discussionsEnabled = socialStatus !== "false";
		this.discNamespaces = { FORUM:socialEnabled, WALL:socialEnabled, ARTICLE_COMMENT:socialEnabled };
		// Check if specific discussion types were specified
		if(socialEnabled && socialStatus && socialStatus !== "true" && socialStatus !== "false") {
			let dns = (socialStatus as string).split(",").map(s=>s.trim());
			this.discNamespaces.FORUM = dns.indexOf("FORUM") != -1;
			this.discNamespaces.WALL = dns.indexOf("WALL") != -1;
			this.discNamespaces.ARTICLE_COMMENT = dns.indexOf("ARTICLE_COMMENT") != -1;
		}
		
		this.abuseLogsEnabled = tDataset.abuselogsEnabled == "true";
		
		const splitNames = (str?:string) => str?.replace(/_/g, " ").split(",") ?? [];
		const sanitiseNames = user => Utils.ucfirst(user.trim());
		
		// List of users to hide across whole RCMManager
		this.hideusers = splitNames(tDataset.hideusers).map(sanitiseNames);
		this.notificationsHideusers = splitNames(tDataset.notificationsHideusers).map(sanitiseNames);
		
		// Only show these users' edits across whole RCMManager
		this.onlyshowusers = splitNames(tDataset.onlyshowusers).map(sanitiseNames);
		
		this.extraLoadingEnabled = tDataset.extraLoadingEnabled == "false" ? false : true;
		this.makeLinksAjax = tDataset.ajaxlinks == "true" ? true : false;
		
		// Wikis for the script to load
		this.chosenWikis = $(this.resultCont).find(">ul>li").toArray().map((pNode)=>new WikiData(this).initListData(pNode));
		// Remove duplicates
		this.chosenWikis = Utils.uniq_fast_key(this.chosenWikis, "scriptpath"); //todo - mke sure this now also checks /fr/ and such
		
		tDataset = null;
		this.resultCont.innerHTML = "";
	}
	
	// Adds core elements. Should only be called once per RCMManager.
	init() : RCMManager {
		this.resultCont.innerHTML = "";
		this.resultCont.className += " "+this.modID;
		this.modID = "."+this.modID;
		this.rcData = [];
		this.recentChangesEntries = [];
		
		/***************************
		* HTML Elements/Nodes
		***************************/
		this.optionsNode	= new RCMOptions(this).init(Utils.newElement("div", { className:"rcm-options" }, this.resultCont));
		this.statusNode		= Utils.newElement("div", { className:"rcm-status" }, this.resultCont);
		this.wikisNode		= new RCMWikiPanel(this).init(Utils.newElement("div", { className:"rcm-wikis" }, this.resultCont));
		Global.showUpdateMessage(this.resultCont);
		this.resultsNode	= Utils.newElement("div", { className:"rcm-results rc-conntent" }, this.resultCont);
		this.footerNode		= Utils.newElement("div", { className:"rcm-footer" }, this.resultCont);
		
		/***************************
		* Setup
		***************************/
		// Footer never changes, so set here
		let tEndNewMessageDate = new Date(Global.lastVersionDateString); tEndNewMessageDate.setDate(tEndNewMessageDate.getDate() + 3);
		let tNewVersion = tEndNewMessageDate > new Date() ? '<sup class="rcm-new-version">'+i18n("notification-new")+'</sup>' : "";
		
		this.footerNode.innerHTML = "[<a href='//dev.fandom.com/wiki/RecentChangesMultiple'>RecentChangesMultiple</a>] " + i18n('footer', "[https://github.com/fewfre/RecentChangesMultiple/blob/master/changelog "+Global.version+"]VERSION", "REPLACE")
			.replace("VERSION", tNewVersion)
			.replace("REPLACE", `<img src='https://fewfre.com/images/avatar.jpg?tag=rcm&pref=${encodeURIComponent(window.location.href.split("#")[0])}' width='14' height='14' /> <a href='https://fewfre.fandom.com/wiki/Fewfre_Wiki'>Fewfre</a>`);
		
		$( this.resultsNode ).on("click", ".rcm-favicon-goto-button", this.wikisNode.goToAndOpenInfo);
		
		// Now start the app
		this._startWikiDataLoad();
		
		return this;
	};
	
	/***************************
	* Loading
	***************************/
	private _load(pWikiData:WikiData, pUrl:string, pDataType:string, pTries:number, pID:number,
				pCallback:(pData:any, pWikiData:WikiData, pTries:number, pID:number, pStatus:any)=>void, pDelayNum:number=0) : void {
		++pTries;
		// A timeout is used instead of loading 1 at a time to save time, as it allows some loading overlap.
		// A timeout is needed since Wikia wikis share a "request overload" detector, which can block your account from making more requests for awhile.
		setTimeout(() => {
			$.ajax({ type: 'GET', dataType: pDataType, data: {},
				timeout: 15000, // Error out after 15s
				url: pUrl,
				success: (data) => { pCallback(data, pWikiData, pTries, pID, null); },
				error: (data, status) => { pCallback(null, pWikiData, pTries, pID, status); },
			});
		}, pDelayNum);
	}
	// private _loadP(pUrl:string, pDataType:string, tries:number, delay:number=0) : Promise<{ data:any, tries:number }> {
	// 	const id = this.ajaxID;
	// 	return new Promise((resolve, reject)=>{
	// 		++tries;
	// 		// A timeout is used instead of loading 1 at a time to save time, as it allows some loading overlap.
	// 		// A timeout is needed since Wikia wikis share a "request overload" detector, which can block your account from making more requests for awhile.
	// 		setTimeout(() => {
	// 			$.ajax({ type: 'GET', dataType: pDataType, data: {},
	// 				timeout: 15000, // Error out after 15s
	// 				url: pUrl,
	// 				success: (data) => {
	// 					// Make sure this isn't something loaded before the script was last refreshed.
	// 					if(id != this.ajaxID) { return; }
	// 					resolve({ data, tries });
	// 				},
	// 				error: (data, status) => {
	// 					// Make sure this isn't something loaded before the script was last refreshed.
	// 					if(id != this.ajaxID) { return; }
	// 					reject({ tries, status });
	// 				},
	// 			});
	// 		}, delay);
	// 	});
	// }
	
	private _retryOrError(pWikiData:WikiData, pTries:number, pID:number, pFailStatus:string,
						pLoadCallback:(pWikiData:WikiData, pTries:number, pID:number, pDelayNum?:number)=>void,
						pHandleErrorCallback:(pWikiData:WikiData, pTries:number, pID:number, pMessage:string, pInc:number)=>void) : void {
		mw.log("Error loading "+pWikiData.servername+" ("+pTries+"/"+this.loadingErrorRetryNum+" tries)");
		if(pTries < this.loadingErrorRetryNum) {
			pLoadCallback(pWikiData, pTries, pID, 0);
		} else {
			if(this.erroredWikis.length === 0) {
				let tMessage = pFailStatus==null ? "error-loading-syntaxhang" : "error-loading-connection";
				pHandleErrorCallback(pWikiData, pTries, pID, tMessage, RCMManager.LOADING_ERROR_RETRY_NUM_INC);
			} else {
				this.erroredWikis.push({wikiInfo:pWikiData, tries:pTries, id:pID});
				this.statusNode.querySelector(".errored-wiki").innerHTML += ", "+pWikiData.servername;
			}
		}
	}
	
	// After a wiki is loaded, check if ALL wikis are loaded
	// If so add results; if not, load the next wiki, or wait for next wiki to return data.
	private _onParsingFinished(pCallback:()=>void) : void {
		this.wikisLeftToLoad--;
		document.querySelector(this.modID+" .rcm-load-perc").innerHTML = this.calcLoadPercent() + "%";//.toFixed(3) + "%";
		if(this.wikisLeftToLoad > 0) {
			if(this.ajaxCallbacks.length > 0) {
				this.ajaxCallbacks.shift();
				// Parse next wiki in queue (if there is one), or wait for next wiki.
				if(this.ajaxCallbacks.length > 0){ setTimeout(() => { this.ajaxCallbacks[0](); }, 0); }
			}
		} else {
			pCallback();
		}
	}
	
	/***************************
	* Setup WikiData classes - Various wiki data needs to be loaded before the script can properly run.
	* These should only be called at the begining of the script; once data is retrieved, does not need to be loaded again.
	***************************/
	private _startWikiDataLoad() : void {
		this.erroredWikis = [];
		this.ajaxCallbacks = [];
		
		this.ajaxID++;
		this.loadingErrorRetryNum = RCMManager.LOADING_ERROR_RETRY_NUM_INC;
		
		if(this.chosenWikis.length > 0) {
			this.chosenWikis.forEach((tWikiData, i) => {
				this._loadWikiData(tWikiData, 0, this.ajaxID, (i+1) * Global.loadDelay);
			});
			this.totalItemsToLoad = this.chosenWikis.length;
			this.wikisLeftToLoad = this.totalItemsToLoad;
			this.statusNode.innerHTML = Global.getLoader()+" "+i18n('status-loading')+" (<span class='rcm-load-perc'>0%</span>)";
		} else {
			// If the RCM has no wikis listed, there is nothing to run, and the user should be informed.
			Utils.removeElement(this.statusNode);
			Utils.removeElement(this.wikisNode.root);
			this.resultsNode.innerHTML = `<div class='banner-notification error center'>${i18n("expand_templates_input_missing")}</div>`;
		}
	}
	
	private _loadWikiData(pWikiData:WikiData, pTries:number, pID:number, pDelayNum:number=0) : void {
		this._load(pWikiData, pWikiData.buildWikiDataApiUrl(), 'jsonp', pTries, pID, this._onWikiDataLoaded.bind(this), pDelayNum);
	}
	
	private _onWikiDataLoaded(pData, pWikiData:WikiData, pTries:number, pID:number, pFailStatus) : void {
		// Make sure this isn't something loaded before the script was last refreshed.
		if(pID != this.ajaxID) { return; }
		
		// Make sure results are valid
		if(!!pData && pData.error && pData.query == null) {
			console.error(pData , pData.error , pData.query == null);
			this.statusNode.innerHTML = `<div class='rcm-error'><div>ERROR: ${pWikiData.servername}</div>${JSON.stringify(pData.error)}</div>`;
			throw "Wiki returned error";
		}
		else if(pFailStatus == "timeout") {
			this._handleWikiDataLoadError(pWikiData, pTries, pID, "error-loading-syntaxhang", 1);
			return;
		}
		else if(!pData?.query?.general) {
			// mw.log("Error loading "+pWikiData.servername+" ("+pTries+"/"+this.loadingErrorRetryNum+" tries)");
			// //mw.log(pData);
			// if(pTries < this.loadingErrorRetryNum) {
			// 	this._loadWikiData(pWikiData, pTries, pID, 0);
			// } else {
			// 	if(this.erroredWikis.length === 0) {
			// 		var tMessage = pFailStatus==null ? "error-loading-syntaxhang" : "error-loading-connection";
			// 		this._handleWikiDataLoadError(pWikiData, pTries, pID, tMessage, RCMManager.LOADING_ERROR_RETRY_NUM_INC);
			// 	} else {
			// 		this.erroredWikis.push({wikiInfo:pWikiData, tries:pTries, id:pID});
			// 		this.statusNode.querySelector(".errored-wiki").innerHTML += ", "+pWikiData.servername;
			// 	}
			// }
			this._retryOrError(pWikiData, pTries, pID, pFailStatus, this._loadWikiData.bind(this), this._handleWikiDataLoadError.bind(this));
			return;
		}
		
		if(pData && pData.warning) { mw.log("WARNING: ", pData.warning); }
		
		// Store wiki-data retrieved that's needed before wiki parsing
		pWikiData.initAfterLoad(pData.query);
		
		this._onWikiDataParsingFinished(pWikiData);
	}
	
	private _handleWikiDataLoadError(pWikiData:WikiData, pTries:number, pID:number, pErrorMessage:I18nKey, pInc:number) : void {
		this.statusNode.innerHTML = "<div class='rcm-error'>"+i18n(pErrorMessage, "[<span class='errored-wiki'>"+pWikiData.servername+"</span>]", pTries)+"</div>";
		if(pErrorMessage == "error-loading-syntaxhang" && 'https:' == document.location.protocol) {
			this.statusNode.innerHTML += "<div class='rcm-error'>"+i18n("error-loading-http")+"</div>";
		}
		let tHandler = (pEvent:MouseEvent) => {
			this.loadingErrorRetryNum += pInc;
			if(pEvent) { pEvent.target.removeEventListener("click", tHandler); }
			tHandler = null;
			
			this.erroredWikis.forEach((obj) => {
				// mw.log(obj);
				this._loadWikiData(obj.wikiInfo, obj.tries, obj.id);
			});
			this.erroredWikis = [];
			this.statusNode.innerHTML = Global.getLoader()+" "+i18n('status-loading-sorting')+" (<span class='rcm-load-perc'>"+this.calcLoadPercent()+"%</span>)";
		};
		Utils.newElement("button", { className:"rcm-btn", innerHTML:i18n("error-trymoretimes", pInc) }, this.statusNode).addEventListener("click", tHandler);
		let tHandlerRemove = (pEvent:MouseEvent) => {
			if(pEvent) { pEvent.target.removeEventListener("click", tHandlerRemove); }
			tHandlerRemove = null;
			
			this.chosenWikis.splice(this.chosenWikis.indexOf(pWikiData), 1);
			this.statusNode.innerHTML = Global.getLoader()+" "+i18n('status-loading-sorting')+" (<span class='rcm-load-perc'>"+this.calcLoadPercent()+"%</span>)";
			this._onWikiDataParsingFinished(null);
		};
		Utils.addTextTo(" ", this.statusNode);
		Utils.newElement("button", { className:"rcm-btn", innerHTML:i18n("ooui-item-remove") }, this.statusNode).addEventListener("click", tHandlerRemove);
		this.erroredWikis.push({wikiInfo:pWikiData, tries:pTries, id:pID});
	}
	
	private _onWikiDataParsingFinished(pWikiData:WikiData) : void {
		this._onParsingFinished(() => { this._onAllWikiDataParsed(); });
	}
	
	// Should only be called once.
	private _onAllWikiDataParsed() : void {
		this.flagWikiDataIsLoaded = true;
		// Add some run-time CSS classes
		let tCSS = "";
		this.chosenWikis.forEach((wikiInfo:WikiData) => {
			// bgcolor should be used if specified, otherwise tile favicon as background. But not both.
			tCSS += `\n.${wikiInfo.rcClass} .rcm-tiled-favicon {`
				+(wikiInfo.bgcolor != null ? `background: ${wikiInfo.bgcolor};` : `background-image: url(${wikiInfo.favicon});`)
			+" }";
		});
		mw.util.addCSS(tCSS);
		
		this.wikisNode.onWikiDataLoaded();
		
		// If at least one wiki on this list has abuse filters enabled, then show the toggle
		this.optionsNode.toggleAbuseLogsFilterVisiblity( this.chosenWikis.some(w=>w.wikiUsesAbuseLogs) );
		
		this._start(true);
	}
	
	/***************************
	* Discussion Loading
	***************************/
	private _startDiscussionLoading(pID:number) : void {
		if(!this.discussionsEnabled) { return; }
		
		this.ajaxCallbacks = [];
		this.loadingErrorRetryNum = RCMManager.LOADING_ERROR_RETRY_NUM_INC;
		
		this.totalItemsToLoad = 0;
		const wikis = this.chosenWikis.filter(w=>!w.hidden);
		wikis.forEach((tWikiData:WikiData, i:number) => {
			if(tWikiData.usesWikiaDiscussions !== false) {
				this.totalItemsToLoad++;
				this._loadWikiaDiscussions(tWikiData, 0, pID, this.totalItemsToLoad * Global.loadDelay);
			}
		});
		// If no discussions are being loaded, skip it and tell manager to not even bother in the future.
		if(this.totalItemsToLoad <= 0) {
			this.discussionsEnabled = false;
			this.rcmChunkStart();
			return;
		}
		this.wikisLeftToLoad = this.totalItemsToLoad;
		this.statusNode.innerHTML = Global.getLoader()+" "+i18n('status-discussions-loading')+" (<span class='rcm-load-perc'>0%</span>)";
	}
	
	private _loadWikiaDiscussions(pWikiData:WikiData, pTries:number, pID:number, pDelayNum:number=0) : void {
		this._load(pWikiData, pWikiData.buildWikiDiscussionUrl(), 'json', pTries, pID, this._onWikiDiscussionLoaded.bind(this), pDelayNum);
	}
	
	private _onWikiDiscussionLoaded(pData, pWikiData:WikiData, pTries:number, pID:number, pFailStatus) : void {
		// Make sure this isn't something loaded before the script was last refreshed.
		if(pID != this.ajaxID) { return; }
		
		if(pFailStatus == null && pData?.["_embedded"]?.["doc:posts"]) {
			pWikiData.usesWikiaDiscussions = true;
			this.ajaxCallbacks.push(() => {
				this._parseWikiDiscussions(pData["_embedded"]["doc:posts"], pWikiData);
			});
			if(this.ajaxCallbacks.length === 1) { this.ajaxCallbacks[0](); }
		} else {
			if(pWikiData.usesWikiaDiscussions === true) {
				mw.log("Error loading "+pWikiData.servername+" ("+pTries+"/"+this.loadingErrorRetryNum+" tries)");
				//mw.log(pData);
				if(pTries < this.loadingErrorRetryNum && pFailStatus == "timeout") {
					this._loadWikiaDiscussions(pWikiData, pTries, pID, 0);
				} else {
					// Don't do any fancy error catching. just fail.
					this._onDiscussionParsingFinished(pWikiData);
				}
				return;
			} else {
				if(pFailStatus != "timeout") {
					mw.log("[RCMManager](loadWikiDiscussions) "+pWikiData.servername+" has no discussions.");
					pWikiData.usesWikiaDiscussions = false;
				}
				this._onDiscussionParsingFinished(pWikiData);
			}
		}
	}
	
	private _parseWikiDiscussions(pData:any[], pWikiData:WikiData) : void {
		// Check if wiki doesn't have any recent changes
		if(pData.length <= 0) {
			this._onDiscussionParsingFinished(pWikiData);
			return;
		}
		
		// A sort is needed since they are sorted by creation, not last edit.
		pData.sort((a, b) => {
			return (a.modificationDate || a.creationDate).epochSecond < (b.modificationDate || b.creationDate).epochSecond ? 1 : -1;
		});
		pWikiData.updateLastDiscussionDate(Utils.getFirstItemFromObject(pData));
		var tNewRC:RCDataFandomDiscussion, tDate, tChangeAdded;
		// Add each entry from the wiki to the list in a sorted order
		pData.forEach((pRCData) => {
			/////// Filters ///////
			const tUser = pRCData.createdBy.name;
			if(this._changeShouldBePrunedBasedOnOptions(tUser, !!tUser, pWikiData)) { return; }
			try {
				// Skip if goes past the RC "changes in last _ days" value.
				if((pRCData.modificationDate || pRCData.creationDate).epochSecond < Math.round(pWikiData.getEndDate().getTime() / 1000)) { return; }
				
				// Skip if discussion type is one user doesn't want
				const containerType = pRCData._embedded.thread[0].containerType;
				if(!this.discNamespaces[ containerType ]) { return; }
			} catch(e){}
			
			/////// Create RC ///////
			this.itemsToAddTotal++;
			tNewRC = new RCDataFandomDiscussion(pWikiData, this, pRCData);
			this._addRCDataToList(tNewRC);
			pWikiData.discussionsCount++;
		});
		
		mw.log("Discussions:", pWikiData.servername, pData);
		
		this._onDiscussionParsingFinished(pWikiData);
	}
	
	private _onDiscussionParsingFinished(pWikiData:WikiData) : void {
		this._onParsingFinished(() => { this.rcmChunkStart() });
	}
	
	/***************************
	* Main RecentChanges loading methods
	***************************/
	private _start(pUpdateParams:boolean=false) : void {
		clearTimeout(this.autoRefreshTimeoutID);
		this.wikisNode.clear();
		
		this.newRecentChangesEntries = [];
		this.ajaxCallbacks = [];
		this.erroredWikis = [];
		this.secondaryWikiData = [];
		
		this.ajaxID++;
		this.loadingErrorRetryNum = RCMManager.LOADING_ERROR_RETRY_NUM_INC;
		this.itemsAdded = this.itemsToAddTotal = 0;
		
		const wikis = this.chosenWikis.filter(w=>!w.hidden);
		// This happens if someone hides all wikis
		if(wikis.length == 0) {
			Utils.newElement("div", { className:"rcm-noNewChanges", innerHTML:"<strong>"+i18n('nonewchanges')+"</strong>" }, this.resultsNode);
			this.wikisNode.refresh();
			return;
		}
		
		wikis.forEach((tWikiData:WikiData, i:number) => {
			if(pUpdateParams) { tWikiData.setupRcParams(); } // Encase it was changed via RCMOptions
			this._loadWiki(tWikiData, 0, this.ajaxID, (i+1) * Global.loadDelay);
		});
		this.totalItemsToLoad = wikis.length;
		this.wikisLeftToLoad = this.totalItemsToLoad;
		this.statusNode.innerHTML = Global.getLoader()+" "+i18n('status-loading-sorting')+" (<span class='rcm-load-perc'>0%</span>)";
	}
	
	// Refresh and add new changes to top
	refresh(pUpdateParams:boolean=false) : void {
		if(this.chosenWikis.length == 0 || !this.flagWikiDataIsLoaded) { return; }
		this.isHardRefresh = false;
		this.statusNode.innerHTML = "";
		// this.resultsNode.innerHTML = "";
		
		// Remove except if auto refresh is on, window doesn't have focus, and the window wasn't clicked and then lost focus again (by checking lastLoadDateTime)
		if(this.rcmNewChangesMarker && (!this.isAutoRefreshEnabled() || (document.hasFocus() || this.lastLoadDateTime >= this.recentChangesEntries[0].date))) {
			Utils.removeElement(this.rcmNewChangesMarker);
			this.rcmNewChangesMarker = null;
		}
		
		if(this.rcmNoNewChangesMarker) { Utils.removeElement(this.rcmNoNewChangesMarker); this.rcmNoNewChangesMarker = null; }
		
		// if(this.recentChangesEntries != null) {
		// 	for (var i = 0; i < this.recentChangesEntries.length; i++) {
		// 		this.recentChangesEntries[i].dispose();
		// 		this.recentChangesEntries[i] = null;
		// 	}
		// 	this.recentChangesEntries = null;
		// }
		this.ajaxCallbacks = null;
		this.secondaryWikiData = null;
		
		RCMModal.closeModal();
		
		this._start(pUpdateParams);
	}
	
	// Refresh and fetch all data again.
	hardRefresh(pUpdateParams:boolean=false) : void {
		if(this.chosenWikis.length == 0 || !this.flagWikiDataIsLoaded) { return; }
		this.isHardRefresh = true;
		this.statusNode.innerHTML = "";
		this.resultsNode.innerHTML = "";
		this.rcmNewChangesMarker = null;
		this.rcmNoNewChangesMarker = null;
		
		this.chosenWikis.forEach((tWikiData:WikiData) => {
			tWikiData.lastChangeDate = tWikiData.getEndDate();
			tWikiData.lastDiscussionDate = tWikiData.getEndDate();
			tWikiData.lastAbuseLogDate = tWikiData.getEndDate();
			tWikiData.resultsCount = 0;
			tWikiData.discussionsCount = 0;
			tWikiData.abuseLogCount = 0;
			// Need to clear them as otherwise they won't be attempted again
			tWikiData.discCommentPageNamesNeeded = [];
		});
		
		// if(this.rcData != null) {
		// 	for (var i = 0; i < this.rcData.length; i++) {
		// 		this.rcData[i].list.dispose();
		// 		this.rcData[i] = null;
		// 	}
		// 	this.rcData = null;
		// }
		
		this.rcData = [];
		
		if(this.recentChangesEntries != null) {
			for (var i = 0; i < this.recentChangesEntries.length; i++) {
				this.recentChangesEntries[i].dispose();
				this.recentChangesEntries[i] = null;
			}
			this.recentChangesEntries = null;
		}
		this.recentChangesEntries = [];
		this.ajaxCallbacks = null;
		this.secondaryWikiData = null;
		
		RCMModal.closeModal();
		
		this._start(pUpdateParams);
	}
	
	// Separate method so that it can be reused if the loading failed
	private _loadWiki(pWikiData:WikiData, pTries:number, pID:number, pDelayNum:number=0) : void {
		this._load(pWikiData, pWikiData.buildApiUrl(), 'jsonp', pTries, pID, this._onWikiLoaded.bind(this), pDelayNum);
	}
	
	/* Called after a wiki is loaded; will add it to queue, and run it if no other callbacks running. */
	private _onWikiLoaded(pData, pWikiData:WikiData, pTries:number, pID:number, pFailStatus) : void {
		// Make sure this isn't something loaded before the script was last refreshed.
		if(pID != this.ajaxID) { return; }
		
		// Make sure results are valid
		if(!!pData && pData.error && pData.query == null) {
			this.statusNode.innerHTML = "<div class='rcm-error'><div>ERROR: "+pWikiData.servername+"</div>"+JSON.stringify(pData.error)+"</div>";
			this.addRefreshButtonTo(this.statusNode);
			throw "Wiki returned error";
		}
		else if(pFailStatus == "timeout") {
			this._handleWikiLoadError(pWikiData, pTries, pID, "error-loading-syntaxhang", 1);
			return;
		}
		else if(pData?.query?.recentchanges == null && !pWikiData.skipLoadingNormalRcDueToFilters()) {
			this._retryOrError(pWikiData, pTries, pID, pFailStatus, this._loadWiki.bind(this), this._handleWikiLoadError.bind(this));
			return;
		}
		
		if(pData && pData.warning) { mw.log("WARNING: ", pData.warning); }
		
		// Store wiki-data retrieved that's needed before wiki parsing
		// pWikiData.initAfterLoad(pData.query);
		
		this.ajaxCallbacks.push(() => {
			pWikiData.initAbuseFilterFilters(pData.query);
			this._parseWikiAbuseLog(pData.query?.abuselog, pWikiData);
			this._parseWiki(pData.query?.recentchanges, pWikiData);
		});
		// Directly call next callback if this is the only one in it. Otherwise let script handle it.
		if(this.ajaxCallbacks.length === 1) { this.ajaxCallbacks[0](); }
	}
	
	private _handleWikiLoadError(pWikiData:WikiData, pTries:number, pID:number, pErrorMessage:I18nKey, pInc:number) : void {
		clearTimeout(this.loadErrorTimeoutID); this.loadErrorTimeoutID = null;
		this.statusNode.innerHTML = "<div class='rcm-error'>"+i18n(pErrorMessage, "[<span class='errored-wiki'>"+pWikiData.servername+"</span>]", pTries)+"</div>";
		this.addRefreshButtonTo(this.statusNode);
		let tHandler = (pEvent) => {
			clearTimeout(this.loadErrorTimeoutID); this.loadErrorTimeoutID = null;
			this.loadingErrorRetryNum += pInc;
			if(pEvent) { pEvent.target.removeEventListener("click", tHandler); }
			tHandler = null;
			
			this.erroredWikis.forEach((obj) => {
				// mw.log(obj);
				this._loadWiki(obj.wikiInfo, obj.tries, obj.id);
			});
			this.erroredWikis = [];
			this.statusNode.innerHTML = Global.getLoader()+" "+i18n('status-loading-sorting')+" (<span class='rcm-load-perc'>"+this.calcLoadPercent()+"%</span>)";
		};
		Utils.newElement("button", { className:"rcm-btn", innerHTML:i18n("error-trymoretimes", pInc) }, this.statusNode).addEventListener("click", tHandler);
		this.erroredWikis.push({wikiInfo:pWikiData, tries:pTries, id:pID});
		if(this.isAutoRefreshEnabled()) { this.loadErrorTimeoutID = window.setTimeout(() => { if(tHandler) { tHandler(null); } }, 20000); }
	}
	
	/* Check wiki data one at a time, either as it's returned, or after the current data is done being processed. */
	private _parseWiki(pData, pWikiData:WikiData) : void {
		// Check if wiki doesn't have any recent changes
		if(!pData || pData.length <= 0) {
			this._onWikiParsingFinished(pWikiData);
			return;
		}
		
		mw.log(pWikiData.servername, pData);
		
		pWikiData.updateLastChangeDate(Utils.getFirstItemFromObject(pData));
		let tNewRC, tDate, tChangeAdded;
		// Add each entry from the wiki to the list in a sorted order
		pData.forEach((pRCData) => {
			const userEdited = pData.user != "" && pData.anon != "";
			if(this._changeShouldBePrunedBasedOnOptions(pRCData.user, userEdited, pWikiData)) { return; }
			
			this.itemsToAddTotal++;
			if(pRCData.logtype && pRCData.logtype != "0") { // It's a "real" log. "0" signifies a wall/board.)
				tNewRC = new RCDataLog(pWikiData, this, pRCData);
			} else {
				tNewRC = new RCDataArticle( pWikiData, this, pRCData);
			}
			this._addRCDataToList(tNewRC);
			pWikiData.resultsCount++;
		});
		
		this._onWikiParsingFinished(pWikiData);
	};
	
	private _changeShouldBePrunedBasedOnOptions(pUser:string, pUserEdited:boolean, pWikiData:WikiData) : boolean {
		// Check if edits belonging to current user should be hidden (for normal RC this is handled by rcexcludeuser, but still needed for other RC types)
		if(Global.username && pUser && pWikiData.rcParams.hidemyself && Global.username == pUser) { return true; }
		// Skip if user is hidden for whole script or specific wiki
		if(pUser && this.hideusers.indexOf(pUser) > -1 || (pWikiData.hideusers && pWikiData.hideusers.indexOf(pUser) > -1)) { return true; }
		// Skip if user is NOT a specified user to show for whole script or specific wiki
		if(pUser && (this.onlyshowusers.length != 0 && this.onlyshowusers.indexOf(pUser) == -1)) { return true; }
		if(pUser && (pWikiData.onlyshowusers != undefined && pWikiData.onlyshowusers.indexOf(pUser) == -1)) { return true; }
		
		// Skip if anon post && we don't want anon
		if(pWikiData.rcParams.hideanons && !pUserEdited) { return true; }
		// Skip if user post && we don't want user posts
		else if(pWikiData.rcParams.hideliu && pUserEdited) { return true; }
		
		return false;
	}
	
	private _parseWikiAbuseLog(pLogs, pWikiData:WikiData) : void {
		// Check if wiki doesn't have any logs
		if(!pLogs || pLogs.length <= 0) {
			// this._onWikiParsingFinished(pWikiData);
			return;
		}
		
		pWikiData.updateLastAbuseLogDate(Utils.getFirstItemFromObject(pLogs));
		// Add each entry from the wiki to the list in a sorted order
		pLogs.forEach((pLogData) => {
			pLogData = RCDataLog.abuseLogDataToNormalLogFormat(pLogData);
			const userEdited = pLogData.anon != "";
			if(this._changeShouldBePrunedBasedOnOptions(pLogData.user, userEdited, pWikiData)) { return; }
			
			this.itemsToAddTotal++;
			this._addRCDataToList( new RCDataLog(pWikiData, this, pLogData) );
			pWikiData.abuseLogCount++;
		});
	}
	
	// TODO: Make it more efficient if using hideenhanced by ignoring some calls.
	private _addRCDataToList(pNewRC:RCData) : void {
		let tNewRcCombo = { data:pNewRC, list:null };
		this.rcData.push( tNewRcCombo ); // Just push it in, we'll sort it in rcmChunkStart use array.sort (less intensive than doing it manually).
		
		let tResultsIsEmpty = this.resultsNode.innerHTML == "", tNewList:RCList, tNoChangeAdded:boolean;
		if(this.rcParams.hideenhanced) {
			tNoChangeAdded = true; // No reason to do fancy stuff, we'll just call array.sort in rcmChunkStart
		}
		else if(tResultsIsEmpty) {
			tNoChangeAdded = this.recentChangesEntries.every((pRCList:RCList, i:number) => {
				// No reason to check further for groupings than anything older than self (would be end of the list anyways, if not for other wiki entries)
				if(pNewRC.date > pRCList.date) {
					this.recentChangesEntries.splice(i, 0, tNewList = new RCList(this).addRC(pNewRC));
					return false;
				} else if(pRCList.shouldGroupWith(pNewRC)) {
					tNewList = pRCList.addRC(pNewRC);
					return false;
				}
				return true;
			});
		} else {
			let tIndexToAddAt:number = -1, tNewTimeStamp = Utils.formatWikiTimeStamp(pNewRC.date, false);
			tNoChangeAdded = this.recentChangesEntries.every((pRCList:RCList, i:number) => {
				// No reason to check further for groupings than anything older than self (would be end of the list anyways, if not for other wiki entries)
				// If results in not empty, then we do want to keep checking (by setting tIndexToAddAt) since previous groupings have already been made.
				if(tIndexToAddAt == -1 && pNewRC.date > pRCList.date) {
					// if(tResultsIsEmpty) {
					// 	this.recentChangesEntries.splice(i, 0, tNewList = new RCList(this).addRC(pNewRC));
					// 	return false;
					// } else {
						tIndexToAddAt = i;
						// Encase the grouping is the first thing on the list
						if(pRCList.shouldGroupWith(pNewRC)) {
							tNewList = pRCList.addRC(pNewRC);
							// this.recentChangesEntries.splice(i, 1); // i is higher than tIndexToAddAt, so removing it won't mess up order.
							// this.recentChangesEntries.splice(tIndexToAddAt, 0, pRCList);
							return false;
						}
					// }
				} else {
					if(pRCList.shouldGroupWith(pNewRC)) {
						tNewList = pRCList.addRC(pNewRC);
						if(tIndexToAddAt > -1) {
							this.recentChangesEntries.splice(i, 1); // i is higher than tIndexToAddAt, so removing it won't mess up order.
							this.recentChangesEntries.splice(tIndexToAddAt, 0, pRCList);
						}
						return false;
					}
					// If tIndexToAddAt is set no reason to keep checking if it literally can not match (due to being the next day).
					else if(tIndexToAddAt > -1 && tNewTimeStamp != Utils.formatWikiTimeStamp(pRCList.date, false)) {
						this.recentChangesEntries.splice(tIndexToAddAt, 0, tNewList = new RCList(this).addRC(pNewRC));
						return false;
					}
				}
				return true;
			});
		}
		if(tNoChangeAdded) {
			this.recentChangesEntries.push( tNewList = new RCList(this).addRC(pNewRC) );
		}
		tNewRcCombo.list = tNewList;
	}
	
	// /* Check wiki data one at a time, either as it's returned, or after the current data is done being processed. */
	// private _parseWikiOld(pData, pLogData, pWikiData:WikiData) : void {
	// 	// Check if wiki doesn't have any recent changes
	// 	if(pData.length <= 0) {
	// 		this._onWikiParsingFinished(pWikiData);
	// 		return;
	// 	}
	//
	// 	mw.log(pWikiData.servername, pData);
	//
	// 	var tNewRC, tDate, tChangeAdded;
	// 	// Add each entry from the wiki to the list in a sorted order
	// 	pData.forEach((pRCData) => {
	// 		// Skip if user is hidden for whole script or specific wiki
	// 		if(pRCData.user && this.hideusers.indexOf(pRCData.user) > -1 || (pWikiData.hideusers && pWikiData.hideusers.indexOf(pRCData.user) > -1)) { return; }
	// 		// Skip if user is NOT a specified user to show for whole script or specific wiki
	// 		if(pRCData.user && (this.onlyshowusers.length != 0 && this.onlyshowusers.indexOf(pRCData.user) == -1)) { return; }
	// 		if(pRCData.user && (pWikiData.onlyshowusers != undefined && pWikiData.onlyshowusers.indexOf(pRCData.user) == -1)) { return; }
	//
	// 		this.itemsToAddTotal++;
	// 		tNewRC = new RCData( pWikiData, this ).init(pRCData, pLogData);
	// 		tChangeAdded = false;
	// 		this.recentChangesEntries.every((pRCList:RCList, i:number) => {
	// 			if(tNewRC.date > pRCList.date) {
	// 				this.recentChangesEntries.splice(i, 0, new RCList(this).addRC(tNewRC));
	// 				tChangeAdded = true;
	// 				return false;
	// 			} else {
	// 				if(this.rcParams.hideenhanced == false && pRCList.shouldGroupWith(tNewRC)) {
	// 					pRCList.addRC(tNewRC);
	// 					tChangeAdded = true;
	// 					return false;
	// 				}
	// 			}
	// 			return true;
	// 		});
	// 		if(!tChangeAdded || this.recentChangesEntries.length == 0) { this.recentChangesEntries.push( new RCList(this).addRC(tNewRC) ); }
	// 	});
	//
	// 	this._onWikiParsingFinished(pWikiData);
	// };
	
	// After a wiki is loaded, check if ALL wikis are loaded; if so add results; if not, load the next wiki, or wait for next wiki to return data.
	private _onWikiParsingFinished(pWikiData:WikiData) : void {
		this.wikisNode.onWikiLoaded(pWikiData);
		this._onParsingFinished(() => { this._onAllWikisParsed() });
	}
	
	private _onAllWikisParsed() : void {
		if(this.discussionsEnabled) {
			this._startDiscussionLoading(this.ajaxID);
		} else {
			this.rcmChunkStart();
		}
	}
	
	/***************************
	* Display Results
	***************************/
	// All wikis are loaded
	rcmChunkStart() : void {
		let tDate:Date = new Date();
		this.statusNode.innerHTML = i18n('status-timestamp', "<b><tt>"+Utils.pad(Utils.getHours(tDate),2)+":"+Utils.pad(Utils.getMinutes(tDate),2)+"</tt></b>");
		this.statusNode.innerHTML += "<span class='rcm-content-loading'> – ["+i18n('status-changesadded', "<span class='rcm-content-loading-num'>0</span> / "+this.itemsToAddTotal)+"]</span>"
		
		// Using array sort after as it's more efficient than doing it manually.
		this.rcData.sort((a, b) => { return b.data.date.valueOf() - a.data.date.valueOf(); });
		if(this.rcParams.hideenhanced) { this.recentChangesEntries.sort((a, b) => { return b.date.valueOf() - a.date.valueOf(); }); }
		
		this.removeOldResults(tDate);
		
		// New changes to add to page
		this.newRecentChangesEntries = [];
		let tResultsIsEmpty = this.resultsNode.innerHTML == "";
		this.recentChangesEntries.every((pRCList:RCList, i) => {
			if(pRCList.date > this.lastLoadDateTimeActual || tResultsIsEmpty) {
				this.newRecentChangesEntries.push(pRCList);
				return true;
			}
			return false;
		});
		
		// Remove except if auto refresh is on, window doesn't have focus, and the window wasn't clicked and then lost focus again (by checking lastLoadDateTime)
		// if(this.rcmNewChangesMarker && (!this.isAutoRefreshEnabled() || (document.hasFocus() || this.recentChangesEntries[0].date < this.lastLoadDateTime))) {
		// 	Utils.removeElement(this.rcmNewChangesMarker);
		// 	this.rcmNewChangesMarker = null;
		// }
		
		// Remove this before laoding starts.
		// if(this.rcmNoNewChangesMarker) { Utils.removeElement(this.rcmNoNewChangesMarker); this.rcmNoNewChangesMarker = null; }
		
		if(this.recentChangesEntries.length == 0 || (this.lastLoadDateTime != null && this.recentChangesEntries[0].date <= this.lastLoadDateTime)) {
			if(!this.rcmNewChangesMarker) this.rcmNoNewChangesMarker = <HTMLElement>this.resultsNode.insertBefore(Utils.newElement("div", { className:"rcm-noNewChanges", innerHTML:"<strong>"+i18n('nonewchanges')+"</strong>" }), this.resultsNode.firstChild);
		}
		else {
			if(!this.rcmNewChangesMarker && this.newRecentChangesEntries.length > 0 && this.lastLoadDateTime != null && this.resultsNode.innerHTML != "") {
				let tRcSection = this.resultsNode.querySelector("div, ul");
				this.rcmNewChangesMarker = <HTMLElement>tRcSection.insertBefore(Utils.newElement("div", { className:"rcm-previouslyLoaded", innerHTML:"<strong>"+i18n('previouslyloaded')+"</strong>" }), tRcSection.firstChild);
				tRcSection = null;
			}
			
			if(this.lastLoadDateTimeActual != null && this.isAutoRefreshEnabled() && !document.hasFocus()) {
				if(this.recentChangesEntries[0].date > this.lastLoadDateTimeActual) {
					this.notifyUserOfChange();
				}
			}
		}
		this.rcmChunk(0, 99, 99, null, this.ajaxID);
	}
	// // All wikis are loaded
	// rcmChunkStartOld() : void {
	// 	let tDate:Date = new Date();
	// 	this.statusNode.innerHTML = i18n('status-timestamp', "<b><tt>"+Utils.pad(Utils.getHours(tDate),2)+":"+Utils.pad(Utils.getMinutes(tDate),2)+"</tt></b>");
	// 	this.statusNode.innerHTML += "<span class='rcm-content-loading'>"+i18n('status-changesadded', "<span class='rcm-content-loading-num'>0</span> / "+this.itemsToAddTotal)+"</span>"
	// 	this.resultsNode.innerHTML = "";
	//
	// 	// mw.log(this.recentChangesEntries);
	// 	if(this.recentChangesEntries.length == 0 || (this.lastLoadDateTime != null && this.recentChangesEntries[0].date <= this.lastLoadDateTime)) {
	// 		Utils.newElement("div", { className:"rcm-noNewChanges", innerHTML:"<strong>"+i18n('nonewchanges')+"</strong>" }, this.resultsNode);
	// 	}
	// 	else if(this.lastLoadDateTimeActual != null && this.isAutoRefreshEnabled() && !document.hasFocus()) {
	// 		if(this.recentChangesEntries[0].date > this.lastLoadDateTimeActual) {
	// 			this.notifyUserOfChange();
	// 		}
	// 	}
	// 	this.rcmChunk(0, 99, 99, null, this.ajaxID);
	// }
	
	// Remove old items past "limit" and "days"
	// All need to be looped through since grouped changes can cause older results to be at the top.
	removeOldResults(pDate:Date) : void {
		if(this.resultsNode.innerHTML == "") { return; }
		let tWikisToCheck:WikiData[] = this.chosenWikis.slice(0);
		let tRcCombo:{ data:RCData, list:RCList }, tDirtyLists:RCList[] = [], tWikiI:number;
		// Remove all old RCDatas, and mark changed lists as "dirty"
		for(let i = this.rcData.length-1; i >= 0; i--) { tRcCombo = this.rcData[i];
			if((tWikiI = tWikisToCheck.indexOf(tRcCombo.data.wikiInfo)) == -1) { continue; }
			// First remove items past "days" (needs to be done first since it can change number allowed by "limit")
			if(tRcCombo.data.shouldBeRemoved(pDate)) {
				switch(tRcCombo.data.getRemovalType()) {
					case "normal": tRcCombo.data.wikiInfo.resultsCount--; break;
					case "discussion": tRcCombo.data.wikiInfo.discussionsCount--; break;
					case "abuselog": tRcCombo.data.wikiInfo.abuseLogCount--; break;
				}
				// if(this.rcData[i].data != tRcCombo.list.list[tRcCombo.list.list.length-1]) {
				// 	mw.log("MISMATCH:", tRcCombo.list.list.indexOf(tRcCombo.data), tRcCombo.list.list.length-1, this.rcData[i].data.wikiInfo, this.rcData[i] , tRcCombo.list.list[tRcCombo.list.list.length-1], tRcCombo.list.list);
				// }
				this.rcData[i] = null;
				this.rcData.splice(i, 1);
				tRcCombo.list.removeRC(tRcCombo.data);
				//tRcCombo.list.list.pop().dispose(); // The last item in a list -should- always be the one we care about
				// Mark changed lists as dirty. Edit / remove them after encase multiple datas were removed.
				if(this.rcParams.hideenhanced || tDirtyLists.indexOf(tRcCombo.list) == -1) { tDirtyLists.push(tRcCombo.list); }
				tRcCombo.data == null; tRcCombo.list = null;
			} else if(tRcCombo.data.wikiInfo.resultsCount <= tRcCombo.data.wikiInfo.rcParams.limit
				&& tRcCombo.data.wikiInfo.discussionsCount <= Math.min(tRcCombo.data.wikiInfo.rcParams.limit, 50)
				&& tRcCombo.data.wikiInfo.abuseLogCount <= tRcCombo.data.wikiInfo.rcParams.limit
				) {
				// Stop checking a specific wiki, and if all have been checked exit (for efficency when dealing with high numbers of results).
				tWikisToCheck.splice(tWikiI, 1);
				if(tWikisToCheck.length == 0) { break; }
			}
		}
		tRcCombo = null; tWikisToCheck = null;
		
		// Now remove or update dirty lists.
		let tNewRCList:RCList, tOldNode:HTMLElement, tListI:number;
		tDirtyLists.forEach((pRCList:RCList) => {
			tListI = this.recentChangesEntries.indexOf(pRCList);
			if(tListI > -1) {
				if(pRCList.list.length <= 0) {
					if(pRCList.htmlNode) { Utils.removeElement(pRCList.htmlNode); }
					this.recentChangesEntries[tListI].dispose();
					this.recentChangesEntries[tListI] = null;
					this.recentChangesEntries.splice(tListI, 1);
				} else {
					if(pRCList.htmlNode) {
						tOldNode = pRCList.htmlNode;
						Utils.insertAfter(pRCList.toHTML(tListI), tOldNode);
						Utils.removeElement(tOldNode);
					}
				}
			} else {
				console.warn("[RCMManager](removeOldResults) Failed to remove old list.");
			}
		});
		tNewRCList = null; tOldNode = null; tDirtyLists = null;
		
		// If there are any blank rc sections left over from removed items, remove them.
		Utils.forEach(this.resultsNode.querySelectorAll(".rcm-rc-cont"), (o) => {
			if(o.innerHTML == "") {
				Utils.removeElement(o.previousSibling);
				Utils.removeElement(o);
			}
		});
		
		
		
		// // First remove items past "days" (needs to be done first since it can change number allowed by "limit")
		// let tRCList:RCList, tNewRCList:RCList, tOldNode:HTMLElement, tDirty:boolean;
		// for(let i = this.recentChangesEntries.length-1; i >= 0; i--) { tRCList = this.recentChangesEntries[i];
		// 	tDirty = false;
		// 	// Loop through all in list encase more than one is to old.
		// 	do {
		// 		if(tRCList.type != RC_TYPE.DISCUSSION) {
		// 			tDirty = true;
		// 			tRCList.wikiInfo.resultsCount--;
		// 			tRCList.list.pop().dispose();
		// 		} else {
		// 			tRCList.wikiInfo.discussionsCount--;
		// 			// TODO: Discussions
		// 			break;
		// 		}
		// TODO: abuseLogCount--;
		// 	} while(tRCList.list.length > 0 && tRCList.oldest.shouldBeRemoved(pDate));
		// 	if(tDirty) {
		// 		if(tRCList.list.length <= 0) {
		// 			if(tRCList.htmlNode) { Utils.removeElement(tRCList.htmlNode); }
		// 			this.recentChangesEntries[i].dispose();
		// 			this.recentChangesEntries[i] = null;
		// 			this.recentChangesEntries.splice(i, 1);
		// 		} else {
		// 			if(tRCList.htmlNode) {
		// 				tOldNode = tRCList.htmlNode;
		// 				Utils.insertAfter(tRCList.toHTML(i), tOldNode);
		// 				Utils.removeElement(tOldNode);
		// 			}
		// 		}
		// 	}
		// }
		// tRCList = null; tNewRCList = null; tOldNode = null;
	}
	
	notifyUserOfChange() {
		let tMostRecentEntry = this.recentChangesEntries[0].newest;
		// Skip if user is hidden for whole script or specific wiki
		let tDontNotify = this.notificationsHideusers.indexOf(tMostRecentEntry.author) > -1 || (tMostRecentEntry.wikiInfo.notificationsHideusers && tMostRecentEntry.wikiInfo.notificationsHideusers.indexOf(tMostRecentEntry.author) > -1) || !tMostRecentEntry.wikiInfo.notificationsEnabled;
		if(!tDontNotify) {
			// Find number of changes since page last visited.
			let tNumNewChanges = 0, tNumNewChangesWiki = 0;
			for(let i = 0; i < this.recentChangesEntries.length; i++) {
				if(this.recentChangesEntries[i].date > this.lastLoadDateTime) {
					for(let j = 0; j < this.recentChangesEntries[i].list.length; j++) {
						if(this.recentChangesEntries[i].list[j].date > this.lastLoadDateTime) {
							tNumNewChanges++;
							if(this.recentChangesEntries[i].wikiInfo.scriptpath == tMostRecentEntry.wikiInfo.scriptpath) { tNumNewChangesWiki++; }
						} else { break; }
					}
				} else { break; }
			}
			Main.blinkWindowTitle(i18n("notification-new")+" "+i18n("nchanges", tNumNewChanges));
			let tEditTitle = tMostRecentEntry.getNotificationTitle();
			if(tEditTitle == null) {
				tEditTitle = this.recentChangesEntries[0].getExistingThreadTitle();
				tEditTitle = tEditTitle ? i18n('discussions')+" - "+tEditTitle : i18n('discussions');
			}
			
			// Get each line of the notification
			let bodyContents = [];
			if(tEditTitle) bodyContents.push(tEditTitle);
			bodyContents.push( i18n("notification-edited-by", tMostRecentEntry.author) );
			if(tMostRecentEntry.summaryUnparsed) bodyContents.push( i18n("notification-edit-summary", tMostRecentEntry.summaryUnparsed) );
			
			Main.addNotification(i18n("nchanges", tNumNewChanges)+" - "+tMostRecentEntry.wikiInfo.sitename + (tNumNewChangesWiki != tNumNewChanges ? ` (${tNumNewChangesWiki})` : ""), {
				body: bodyContents.join("\n")
			});
		}
		tMostRecentEntry = null;
	}
	
	// Add a single change at a time, with a timeout before the next one to prevents script from locking up browser.
	rcmChunk(pIndex:number, pLastDay:number, pLastMonth:number, pContainer:HTMLElement, pID:number) : void {
		if(pID != this.ajaxID) { return; } // If the script is refreshed (by auto refresh) while entries are adding, stop adding old entries.
		
		if(this.newRecentChangesEntries.length == 0) { this.finishScript(); return; }
		
		let date = this.newRecentChangesEntries[pIndex].date, tAddToTopOfExistingContainer = false;
		// Add new date grouping if necessary.
		if(Utils.getDate(date) != pLastDay || Utils.getMonth(date) != pLastMonth) {
			pLastDay = Utils.getDate(date);
			pLastMonth = Utils.getMonth(date);
			let tTimestamp = Utils.formatWikiTimeStamp(date, false);
			let tNewContainer:HTMLElement;
			// Re-use existing container if there is one
			if(tNewContainer = <HTMLElement>this.resultsNode.querySelector(`[data-timestamp="${tTimestamp}"]`)) {
				pContainer = tNewContainer;
				tAddToTopOfExistingContainer = true;
			} else {
				let tNewHeading = Utils.newElement("h4", { innerHTML:tTimestamp });
				tNewContainer = this.rcParams.hideenhanced==false ? Utils.newElement("div", { className:"rcm-rc-cont" }) : Utils.newElement("ul", { className:"special rcm-rc-cont" });
				tNewContainer.dataset["timestamp"] = tTimestamp;
				if(!pContainer) {
					if(this.isHardRefresh) {
						this.resultsNode.appendChild(tNewHeading);
						this.resultsNode.appendChild(tNewContainer);
					} else {
						// Utils.prependChild(tNewContainer, this.resultsNode);
						Utils.prependChild(tNewHeading, this.resultsNode);
						Utils.insertAfter(tNewContainer, tNewHeading);
						// this.resultsNode.insertBefore(tNewContainer, this.resultsNode.firstChild);
						// this.resultsNode.insertBefore(tNewHeading, this.resultsNode.firstChild);
					}
				} else {
					Utils.insertAfter(tNewHeading, pContainer);
					Utils.insertAfter(tNewContainer, tNewHeading);
				}
				pContainer = tNewContainer;
				tNewHeading = null;
			}
			tNewContainer = null;
		}
		// // Show at what point new changes start at.
		// if(this.lastLoadDateTime != null && pIndex-1 >= 0 && date <= this.lastLoadDateTime && this.newRecentChangesEntries[pIndex-1].date > this.lastLoadDateTime) {
		// 	this.rcmNewChangesMarker = Utils.newElement("div", { className:"rcm-previouslyLoaded", innerHTML:"<strong>"+i18n('previouslyloaded')+"</strong>" }, pContainer);
		// }
		
		// Add to page
		if(this.rcmNewChangesMarker) {
			if(this.newRecentChangesEntries[pIndex].htmlNode) { Utils.removeElement(this.newRecentChangesEntries[pIndex].htmlNode); }
			let tRcNode = this.newRecentChangesEntries[pIndex].toHTML(pIndex);
			if(pContainer.innerHTML == "") {
				pContainer.appendChild(tRcNode);
			}
			else if(tAddToTopOfExistingContainer || pIndex == 0) {
				// pContainer.insertBefore(tRcNode, pContainer.firstChild); // For some odd reason this sometimes says pContainer.firstChild is not a child of pContainer
				pContainer.firstChild.parentNode.insertBefore(tRcNode, pContainer.firstChild);
			} else {
				// pContainer.insertBefore(tRcNode, this.rcmNewChangesMarker); // Kinda hacky but doesn't occassionally fail.
				if(this.newRecentChangesEntries[pIndex-1].htmlNode.parentNode != pContainer) {
					pContainer.appendChild(tRcNode);
				} else {
					Utils.insertAfter(tRcNode, this.newRecentChangesEntries[pIndex-1].htmlNode);
				}
			}
			tRcNode = null;
		} else {
			pContainer.appendChild(this.newRecentChangesEntries[pIndex].toHTML(pIndex));
		}
		this.itemsAdded += this.newRecentChangesEntries[pIndex].list.length;
		
		if(++pIndex < this.newRecentChangesEntries.length) {
			document.querySelector(this.modID+" .rcm-content-loading-num").innerHTML = this.itemsAdded.toString();
			// Only do a timeout every few changes (timeout to prevent browser potentially locking up, only every few to prevent it taking longer than necessary)
			if(pIndex%5 == 0) {
				setTimeout(() => { this.rcmChunk(pIndex, pLastDay, pLastMonth, pContainer, pID); });
			} else {
				this.rcmChunk(pIndex, pLastDay, pLastMonth, pContainer, pID);
			}
		}
		else { this.finishScript(); }
	};
	
	// // Add a single change at a time, with a timeout before the next one to prevents script from locking up browser.
	// rcmChunkOld(pIndex:number, pLastDay:number, pLastMonth:number, pContainer:HTMLElement, pID:number) : void {
	// 	if(pID != this.ajaxID) { return; } // If the script is refreshed (by auto refresh) while entries are adding, stop adding old entries.
	//
	// 	if(this.recentChangesEntries.length == 0) { this.finishScript(); return; }
	//
	// 	var date = this.recentChangesEntries[pIndex].date;
	// 	// Add new date grouping if necessary.
	// 	if(Utils.getDate(date) != pLastDay || Utils.getMonth(date) != pLastMonth) {
	// 		pLastDay = Utils.getDate(date);
	// 		pLastMonth = Utils.getMonth(date);
	// 		Utils.newElement("h4", { innerHTML:Utils.formatWikiTimeStamp(date, false) }, this.resultsNode);
	//
	// 		pContainer = this.rcParams.hideenhanced==false ? Utils.newElement("div", {  }, this.resultsNode) : Utils.newElement("ul", { className:"special" }, this.resultsNode);
	// 	}
	// 	// Show at what point new changes start at.
	// 	if(this.lastLoadDateTime != null && pIndex-1 >= 0 && date <= this.lastLoadDateTime && this.recentChangesEntries[pIndex-1].date > this.lastLoadDateTime) {
	// 		this.rcmNewChangesMarker = Utils.newElement("div", { className:"rcm-previouslyLoaded", innerHTML:"<strong>"+i18n('previouslyloaded')+"</strong>" }, pContainer);
	// 	}
	//
	// 	// Add to page
	// 	pContainer.appendChild(this.recentChangesEntries[pIndex].toHTML(pIndex));
	// 	this.itemsAdded += this.recentChangesEntries[pIndex].list.length;
	//
	// 	if(++pIndex < this.recentChangesEntries.length) {
	// 		document.querySelector(this.modID+" .rcm-content-loading-num").innerHTML = this.itemsAdded.toString();
	// 		// Only do a timeout every few changes (timeout to prevent browser potentially locking up, only every few to prevent it taking longer than necessary)
	// 		if(pIndex%5 == 0) {
	// 			setTimeout(() => { this.rcmChunk(pIndex, pLastDay, pLastMonth, pContainer, pID); });
	// 		} else {
	// 			this.rcmChunk(pIndex, pLastDay, pLastMonth, pContainer, pID);
	// 		}
	// 	}
	// 	else { this.finishScript(); }
	// };
	
	finishScript() : void {
		Utils.removeElement(document.querySelector(this.modID+" .rcm-content-loading"));
		this.addRefreshButtonTo(this.statusNode);
		this.addAutoRefreshInputTo(this.statusNode);
		// If auto-refresh is on and window doesn't have focus, then don't update the position of "previously loaded" message.
		if (this.lastLoadDateTime == null || !this.isAutoRefreshEnabled() || document.hasFocus()) {
			this.lastLoadDateTime = this.recentChangesEntries.length > 0 ? this.recentChangesEntries[0].date : null;//new Date();
		}
		this.lastLoadDateTimeActual = this.recentChangesEntries.length > 0 ? this.recentChangesEntries[0].date : null;//new Date();
		
		// Removing this all remove event handlers
		// for (var i = 0; i < this.recentChangesEntries.length; i++) {
		// 	this.recentChangesEntries[i].dispose();
		// 	this.recentChangesEntries[i] = null;
		// }
		// this.recentChangesEntries = null;
		
		this.startAutoRefresh();
		
		//$( "#rc-content-multiple .mw-collapsible" ).each(function(){ $(this).makeCollapsible(); });
		
		(window.ajaxCallAgain || []).forEach((cb) => { cb(); });
		
		// Secondary info
		if(this.extraLoadingEnabled) {
			// Check here instead of adding as they come up to condense calls.
			this.chosenWikis.forEach(function(wd){ wd.checkForSecondaryLoading(); });
			
			this._loadExtraInfo(this.ajaxID);
		}
	};
	
	startAutoRefresh() : void {
		if(!this.isAutoRefreshEnabled()) { return; }
		
		this.autoRefreshTimeoutID = window.setTimeout(() => {
			if(RCMModal.isModalOpen() || (this.autoRefreshEvenOnFocus == false && document.hasFocus())) { this.startAutoRefresh(); return; }
			this.refresh();
		}, this.autoRefreshTimeoutNum);
	};
		
	private _loadExtraInfo(pID:number) : void {
		if(pID != this.ajaxID) { return; }
		if(this.secondaryWikiData.length == 0) { mw.log("[RCMManager](_loadExtraInfo) All loading finished."); return; }
		
		let { url, dataType="jsonp", callback:tCallback, skipRefreshSanity } = this.secondaryWikiData.shift();
		if(typeof url === "function") url = url();
		
		let tries = 0, retryDelay = 0, MAX_TRIES = 10;
		const tDoLoad=() => {
			$.ajax({ type: 'GET', url:url as string, dataType, data: {} })
			.then((...pArgs) => {
				// Don't run result if script already moved on
				if(!skipRefreshSanity && pID != this.ajaxID) { return; }
				tCallback.apply(this, pArgs);
			})
			.fail(()=>{
				// Don't run result if script already moved on, or if to many tries
				tries++;
				if((!skipRefreshSanity && pID != this.ajaxID) || tries >= MAX_TRIES) { return; }
				setTimeout(tDoLoad, retryDelay);
				retryDelay = Math.min(tries*10, 60)*1000;
			});
		};
		tDoLoad();
		
		setTimeout(() => { this._loadExtraInfo(pID); }, Global.loadDelay);
	}
	
	/***************************
	* Specific Helper Methods
	***************************/
	addRefreshButtonTo(pParent:HTMLElement) : void {
		let self = this;
		
		pParent.appendChild(document.createTextNode(" "));
		
		Utils.newElement("button", { className:"rcm-btn", innerHTML:i18n('status-refresh') }, pParent).addEventListener("click", function tHandler(e){
			e.target.removeEventListener("click", tHandler);
			self.refresh();
		});
	};
	
	addAutoRefreshInputTo(pParent:HTMLElement) : void {
		let self = this;
		
		pParent.appendChild(document.createTextNode(" "));
		
		let autoRefresh = Utils.newElement("span", { className:"rcm-autoRefresh" }, pParent);
		Utils.newElement("label", { htmlFor:"rcm-autoRefresh-checkbox", innerHTML:i18n('autorefresh'), title:i18n('autorefresh-tooltip', Math.floor(self.autoRefreshTimeoutNum/1000)) }, autoRefresh);
		let checkBox:HTMLInputElement = <HTMLInputElement>Utils.newElement("input", { className:"rcm-autoRefresh-checkbox", type:"checkbox" }, autoRefresh);
		checkBox.checked = this.isAutoRefreshEnabled();
		
		checkBox.addEventListener("click", function tHandler(e){
			if((<HTMLInputElement>document.querySelector(self.modID+" .rcm-autoRefresh-checkbox")).checked) {
				localStorage.setItem(self.autoRefreshLocalStorageID, true.toString());
				self.refresh();
				Notification.requestPermission();
			} else {
				localStorage.setItem(self.autoRefreshLocalStorageID, false.toString());
				clearTimeout(self.autoRefreshTimeoutID);
			}
		});
	};
	
	isAutoRefreshEnabled() : boolean {
		return localStorage.getItem(this.autoRefreshLocalStorageID) == "true" || this.autoRefreshEnabledDefault;
	}
	
	calcLoadPercent() : number {
		return Math.round((this.totalItemsToLoad - this.wikisLeftToLoad) / this.totalItemsToLoad * 100);
	};
	
	// take a "&" seperated list of RC params, and returns a Object with settings.
	// NOTE: Script does not currently support: "from" and "namespace" related fields (like invert)
	parseRCParams(pData:string, pExplodeOn:string, pSplitOn:string) : RCParams {
		var tRcParams:RCParams = {};
		var paramStringArray:string[] = [];
		
		if(!pData) { return tRcParams; }
		var tRcParamsRawData = pData.split(pExplodeOn);
		var tRcParamsDataSplit, key, val; // Split of raw data
		for(var i = 0; i < tRcParamsRawData.length; i++) {
			tRcParamsDataSplit = tRcParamsRawData[i].split(pSplitOn);
			if(tRcParamsDataSplit.length > 1) {
				[ key, val ] = tRcParamsDataSplit;
				if(key == "limit" && val) {
					tRcParams["limit"] = parseInt( val );
				}
				else if(key == "days" && val) {
					tRcParams["days"] = parseInt( val );
				}
				else if(key == "namespace" && (val || val === "0")) {
					tRcParams["namespace"] = val;
				}
				// else if(key == "from" && val) {
				// 	tRcParams["from"] = val;
				// }
				// Check all the true / false ones
				else if(val) {
					tRcParams[key] = val=="1";
				}
				paramStringArray.push(key+"="+val);
			}
		}
		tRcParams.paramString = paramStringArray.join("&");
		paramStringArray = null;
		
		return tRcParams;
	}
	
	getDefaultRCParams() : RCParams {
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
			hidenewpages: false,
			hidepageedits: false,
			namespace	: null,
		};
	}
}
