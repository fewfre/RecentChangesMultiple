import Main from "./Main";
import Global from "./Global";
import i18n, { I18nKey } from "./i18n";
import WikiData from "./WikiData";
import { RCData, RCDataArticle, RCDataLog, RCDataFandomDiscussion, RCList } from "./rc_data";
import RCParams from "./types/RCParams";
import RCMWikiPanel from "./RCMWikiPanel";
import RCMOptions from "./RCMOptions";
import Utils from "./Utils";
import RCMModal from "./RCMModal";
import MultiLoader from "./MultiLoader";
const { jQuery:$, mediaWiki:mw } = window;

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
	
	rcmNewChangesMarker		: HTMLElement|null;
	rcmNoNewChangesMarker	: HTMLElement|null;
	
	/***************************
	 * Data provided to script
	 ***************************/
	rcParamsBase			: Partial<RCParams>; // An object containing data about the RecentChange "params" sent in
	rcParams				: RCParams; // Same as rcParamsBase as well as default values if not supplied
	
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
	
	rcData						: { data:RCData, list?:RCList }[];
	recentChangesEntries		: RCList[]; // Array of either RecentChange/RecentChangeList objects.
	newRecentChangesEntries		: RCList[]; // Only the new / "dirty" RCLists
	
	extraLoadingEnabled			: boolean; // Turns extra loading on/off
	secondaryWikiData			: { url:string|(()=>string), callback:(...params)=>void, dataType?:string, skipRefreshSanity?:boolean }[]; // Array of objects that are used to fill in blanks that cannot be retrieved on initial data calls (usually page-specific).
	
	currentMultiLoader			: MultiLoader<WikiData>; // Current multiLoader - needed encase errored wikis need to be retried
	flagWikiDataIsLoaded		: boolean; // Make sure certain actions can't be done by user until wiki data is retrieved.
	loadErrorTimeoutID			: number;
	
	itemsAdded					: number; // Number off items added to screen AFTER load.
	itemsToAddTotal				: number; // Total number if items to add to the screen
	isHardRefresh				: boolean;
	
	lastLoadDateTime			: Date|null; // The last time everything was loaded. This is also updated if window regains focus.
	lastLoadDateTimeActual		: Date|null; // Even if lastLoadDateTime hasn't been updated (due to auto refresh), this always has the actual last loaded date
	
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
	
	// dispose() : void {
	// 	this.resultCont		= null;
	// 	this.optionsNode.dispose();
	// 	this.optionsNode	= null;
	// 	this.statusNode		= null;
	// 	this.wikisNode.dispose();
	// 	this.wikisNode		= null;
	// 	this.resultsNode	= null;
	// 	this.footerNode		= null;
		
	// 	this.rcmNewChangesMarker		= null;
	// 	this.rcmNoNewChangesMarker		= null;
		
	// 	this.hideusers		= null;
	// 	this.onlyshowusers	= null;
		
	// 	this.rcData = null;
	// 	this.newRecentChangesEntries = null;
	// 	if(this.recentChangesEntries) {
	// 		for (var i = 0; i < this.recentChangesEntries.length; i++) {
	// 			this.recentChangesEntries[i].dispose();
	// 			this.recentChangesEntries[i] = null;
	// 		}
	// 		this.recentChangesEntries = null;
	// 	}
	// 	this.secondaryWikiData	= null;
		
	// 	this.lastLoadDateTime	= null;
	// };
	
	// Should only be called once per RCMManager.
	private _parseWikiList() : void {
		/***************************
		* Data provided to script
		***************************/
		var tDataset = this.resultCont.dataset;
		
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
		this.optionsNode	= new RCMOptions(this, Utils.newElement("div", { className:"rcm-options" }, this.resultCont));
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
	* Loading - Shared
	***************************/
	private _addErroredWikiAfterToManyRetries(pWikiData:WikiData, pTries:number, pID:number, pFailStatus:string|undefined,
		pHandleErrorCallback:(pWikiData:WikiData, pTries:number, pID:number, pMessage:I18nKey, pInc:number)=>void
	) : void {
		if(this.currentMultiLoader.ErroredItems.length === 1 || !this.statusNode.querySelector(".errored-wiki")) {
			let tMessage:I18nKey = pFailStatus==null ? "error-loading-syntaxhang" : "error-loading-connection";
			pHandleErrorCallback(pWikiData, pTries, pID, tMessage, RCMManager.LOADING_ERROR_RETRY_NUM_INC);
		} else {
			this.statusNode.querySelector(".errored-wiki")!.innerHTML += ", "+mw.html.escape(pWikiData.servername);
		}
	}
	
	private setupStatusLoadingMode(loadingText:I18nKey) : void {
		this.statusNode.innerHTML = [
			`<div class="rcm-status-alerts-cont"></div>`,
			`<div class="rcm-status-loading-cont">${Global.getLoader()} ${i18n(loadingText)} (<span class='rcm-load-perc'>0%</span>)</div>`,
		].join("");
	}
	
	// Expects a whole number between 0-100
	private _updateLoadingPercent=(perc:number)=>{
		$(this.modID+" .rcm-load-perc").html(`${perc}%`);//.toFixed(3) + "%";
	}
	
	/***************************
	* Setup WikiData classes - Various wiki data needs to be loaded before the script can properly run.
	* These should only be called at the begining of the script; once data is retrieved, does not need to be loaded again.
	***************************/
	private _startWikiDataLoad() : void {
		this.ajaxID++;
		
		if(this.chosenWikis.length > 0) {
			this.setupStatusLoadingMode('status-loading');
			this._loadWikiDataFromList(this.chosenWikis);
		} else {
			// If the RCM has no wikis listed, there is nothing to run, and the user should be informed.
			Utils.removeElement(this.statusNode);
			Utils.removeElement(this.wikisNode.root);
			this.resultsNode.innerHTML = `<div class='banner-notification error center'>${i18n("expand_templates_input_missing")}</div>`;
		}
	}
	
	private _loadWikiDataFromList(list:WikiData[]) : void {
		const loader = this.currentMultiLoader = new MultiLoader<WikiData>(this);
		loader.multiLoad({
			list,
			buildUrl: (w)=>w.buildWikiDataApiUrl(),
			dataType: 'jsonp',
			maxTries: RCMManager.LOADING_ERROR_RETRY_NUM_INC,
			onProgress: this._updateLoadingPercent,
			onSingleLoadFinished: (data, wikiData)=>{
				if(data && data.warning) { mw.log("WARNING: ", data.warning); }
				wikiData.initAfterLoad(data.query); // Store wiki-data retrieved that's needed before wiki parsing
			},
			onCheckInvalid:(data)=>{
				if(data?.error && !data?.query) {
					console.error(data.error, data, data.query == null);
					return { id:"api-error", halt:true, error:data.error }; // Wiki gave an error, end it now
				}
				else if(!data?.query?.general) {
					return { id:"parse-error" }; // Soft error, keep trying
				}
				return false;
			},
			onSingleError: (info, wikiData)=>{
				const ajaxID = loader.AjaxID;
				switch(info.id) {
					case "timeout": {
						this._handleWikiDataLoadError(wikiData, info.tries, ajaxID, "error-loading-syntaxhang", 1);
						break;
					}
					case "max-tries": {
						this._addErroredWikiAfterToManyRetries(wikiData, info.tries, ajaxID, info.status, this._handleWikiDataLoadError);
						break;
					}
					case "unknown": {
						this.statusNode.innerHTML = `<div class='rcm-error'><div>ERROR: ${mw.html.escape(wikiData.servername)}</div>${JSON.stringify(info.error)}</div>`;
						throw "Wiki returned error";
						break;
					}
				}
			},
		})
		.then(this._onAllWikiDataParsed);
	}
	
	private _handleWikiDataLoadError=(pWikiData:WikiData, pTries:number, pID:number, pErrorMessage:I18nKey, pInc:number) : void => {
		const errorCont = $("<div>").appendTo($(this.statusNode).find(".rcm-status-alerts-cont"));
		let string = `<div class='rcm-error'>${i18n(pErrorMessage, `[<span class='errored-wiki'>${mw.html.escape(pWikiData.servername)}</span>]`, pTries)}</div>`;
		if(pErrorMessage == "error-loading-syntaxhang" && 'https:' == document.location.protocol) {
			string += `<div class='rcm-error'>${i18n("error-loading-http")}</div>`;
		}
		errorCont.html(string);
		
		// Retry Button
		$(`<button class="rcm-btn">${i18n("error-trymoretimes", pInc)}</button>`).appendTo(errorCont).on("click", ()=>{
			this.currentMultiLoader.retry(pInc);
			errorCont.remove();
		});
		// Add space
		errorCont.append(" ");
		// Remove Button
		$(`<button class="rcm-btn">${i18n("ooui-item-remove", pInc)}</button>`).appendTo(errorCont).on("click", ()=>{
			this.currentMultiLoader.ErroredItems.forEach((e)=>{
				this.chosenWikis.splice(this.chosenWikis.indexOf(e.item), 1);
			});
			this.currentMultiLoader.removeAllErroredWikis();
			errorCont.remove();
		});
	}
	
	// Should only be called once.
	private _onAllWikiDataParsed=() : void => {
		this.flagWikiDataIsLoaded = true;
		// Add some run-time CSS classes
		mw.util.addCSS( this.chosenWikis.map(w=>w.getWikiRuntimeCSS()).join('\n') );
		
		// Update wiki section now that everything is loaded
		this.wikisNode.onWikiDataLoaded();
		
		// If at least one wiki on this list has abuse filters enabled, then show the toggle
		this.optionsNode.toggleAbuseLogsFilterVisiblity( this.chosenWikis.some(w=>w.wikiUsesAbuseLogs) );
		
		this._start(true);
	}
	
	/***************************
	* Main manager state methods
	***************************/
	private _start(pUpdateParams:boolean=false) : void {
		clearTimeout(this.autoRefreshTimeoutID);
		this.wikisNode.clear();
		
		this.newRecentChangesEntries = [];
		this.secondaryWikiData = [];
		
		this.ajaxID++;
		this.itemsAdded = this.itemsToAddTotal = 0;
		
		const wikis = this.chosenWikis.filter(w=>!w.hidden);
		// This happens if someone hides all wikis
		if(wikis.length == 0) {
			Utils.newElement("div", { className:"rcm-noNewChanges", innerHTML:"<strong>"+i18n('nonewchanges')+"</strong>" }, this.resultsNode);
			this.wikisNode.refresh();
			return;
		}
		
		if(pUpdateParams) {
			wikis.forEach(wiki => wiki.setupRcParams());
		}
		
		this.setupStatusLoadingMode('status-loading-sorting');
		
		this._loadRecentChangesFromList(wikis);
	}
	
	// Refresh and add new changes to top
	refresh(pUpdateParams:boolean=false) : void {
		if(this.chosenWikis.length == 0 || !this.flagWikiDataIsLoaded) { return; }
		this.isHardRefresh = false;
		this.statusNode.innerHTML = "";
		// this.resultsNode.innerHTML = "";
		
		// Remove except if auto refresh is on, window doesn't have focus, and the window wasn't clicked and then lost focus again (by checking lastLoadDateTime)
		if(this.rcmNewChangesMarker && (!this.isAutoRefreshEnabled() || (document.hasFocus() || this.lastLoadDateTime! >= this.recentChangesEntries[0].date))) {
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
				// @ts-ignore - yah yah, shouldn't be null; I'd rather it be null then a memory leak tyvm
				this.recentChangesEntries[i] = null;
			}
		}
		this.recentChangesEntries = [];
		
		RCMModal.closeModal();
		
		this._start(pUpdateParams);
	}
	
	/***************************
	* Discussion Loading
	***************************/
	private _startDiscussionLoading(pID:number) : void {
		if(!this.discussionsEnabled) { return; }
		
		const wikis = this.chosenWikis.filter(w=>!w.hidden).filter(w=>w.usesWikiaDiscussions !== false);
		// If no discussions are being loaded, skip it and tell manager to not even bother in the future.
		if(wikis.length <= 0) {
			this.discussionsEnabled = false;
			this.rcmChunkStart();
			return;
		}
		
		this.setupStatusLoadingMode('status-discussions-loading');
		this._loadDiscussionsFromList(wikis);
	}
	
	private _loadDiscussionsFromList(list:WikiData[]) : void {
		const loader = this.currentMultiLoader = new MultiLoader<WikiData>(this);
		loader.multiLoad({
			list,
			buildUrl: (w)=>w.buildWikiDiscussionUrl(),
			dataType: 'json',
			maxTries: RCMManager.LOADING_ERROR_RETRY_NUM_INC,
			onProgress: this._updateLoadingPercent,
			onSingleLoadFinished: (data, wikiData)=>{
				if(data && data.warning) { mw.log("WARNING: ", data.warning); }
				
				// Make sure it wasn't disabled during validity check
				if(wikiData.usesWikiaDiscussions !== false) {
					// If success, then we know this wiki uses discussions!
					wikiData.usesWikiaDiscussions = true;
					this._parseWikiDiscussions(data?.["_embedded"]?.["doc:posts"], wikiData);
				}
			},
			onCheckInvalid:(data, wikiData)=>{
				if(data?.error) {
					console.error(data.error, data);
					return { id:"api-error", halt:true, error:`[${data.status}] ${data.error} - ${data.details}` }; // Wiki gave an error, end it now
				}
				else if(!data?.["_embedded"]?.["doc:posts"]) {
					// Error type changes based on if we know discussions are used on this wiki
					if(wikiData.usesWikiaDiscussions === true) {
						return { id:"parse-error" }; // Soft error, keep trying
					} else {
						// If we aren't sure that discussions exist, don't bother checking more; just turn it off and say success
						mw.log("[RCMManager](loadWikiDiscussions) "+wikiData.servername+" has no discussions.");
						wikiData.usesWikiaDiscussions = false;
						return false;
					}
				}
				return false;
			},
			onSingleError: (info, wikiData, errorData)=>{
				switch(info.id) {
					case "timeout":
					case "max-tries": {
						// Don't do any fancy error catching. just ignore / move on
						errorData.remove();
						break;
					}
					case "unknown": {
						this.statusNode.innerHTML = `<div class='rcm-error'><div>ERROR: ${mw.html.escape(wikiData.servername)}</div>${JSON.stringify(info.error)}</div>`;
						throw "Wiki returned error";
						break;
					}
				}
			},
		})
		.then(this._onAllDiscussionsParsed);
	}
	
	private _parseWikiDiscussions(pData:any[], pWikiData:WikiData) : void {
		// Check if wiki doesn't have any recent changes
		if(!pData || pData.length <= 0) {
			return;
		}
		
		// A sort is needed since they are sorted by creation, not last edit.
		pData.sort((a, b) => {
			return (a.modificationDate || a.creationDate).epochSecond < (b.modificationDate || b.creationDate).epochSecond ? 1 : -1;
		});
		pWikiData.updateLastDiscussionDate(Utils.getFirstItemFromObject(pData));
		var tNewRC:RCDataFandomDiscussion;
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
	}
	
	private _onAllDiscussionsParsed=() : void => {
		this.rcmChunkStart();
	}
	
	/***************************
	* Main RecentChanges loading methods
	***************************/
	private _loadRecentChangesFromList(list:WikiData[]) : void {
		const loader = this.currentMultiLoader = new MultiLoader<WikiData>(this);
		loader.multiLoad({
			list,
			buildUrl: (w)=>w.buildApiUrl(),
			dataType: 'jsonp',
			maxTries: RCMManager.LOADING_ERROR_RETRY_NUM_INC,
			onProgress: this._updateLoadingPercent,
			onSingleLoadFinished: (data, wikiData)=>{
				if(data && data.warning) { mw.log("WARNING: ", data.warning); }
				wikiData.initAbuseFilterFilters(data.query);
				this._parseWikiAbuseLog(data.query?.abuselog, wikiData);
				this._parseWiki(data.query?.recentchanges, wikiData);
				this.wikisNode.onWikiLoaded(wikiData);
			},
			onCheckInvalid:(data, pWikiData)=>{
				if(data?.error && !data?.query) {
					console.error(data.error, data, data.query == null);
					return { id:"api-error", halt:true, error:data.error }; // Wiki gave an error, end it now
				}
				// Make sure results are valid - ignore if this feature is turned off (we obviously don't care if results aren't returned)
				else if(!data?.query?.recentchanges && !pWikiData.skipLoadingNormalRcDueToFilters()) {
					return { id:"parse-error" }; // Soft error, keep trying
				}
				return false;
			},
			onSingleError: (info, wikiData)=>{
				const ajaxID = loader.AjaxID;
				switch(info.id) {
					case "timeout": {
						this._handleWikiLoadError(wikiData, info.tries, ajaxID, "error-loading-syntaxhang", 1);
						break;
					}
					case "max-tries": {
						this._addErroredWikiAfterToManyRetries(wikiData, info.tries, ajaxID, info.status, this._handleWikiLoadError);
						break;
					}
					case "unknown": {
						this.statusNode.innerHTML = `<div class='rcm-error'><div>ERROR: ${mw.html.escape(wikiData.servername)}</div>${JSON.stringify(info.error)}</div>`;
						throw "Wiki returned error";
						break;
					}
				}
			},
		})
		.then(this._onAllWikisParsed);
	}
	
	private _handleWikiLoadError=(pWikiData:WikiData, pTries:number, pID:number, pErrorMessage:I18nKey, pInc:number) : void => {
		clearTimeout(this.loadErrorTimeoutID); this.loadErrorTimeoutID = 0;
		
		const errorCont = $("<div>").appendTo($(this.statusNode).find(".rcm-status-alerts-cont"));
		errorCont.html(`<div class='rcm-error'>${i18n(pErrorMessage, `[<span class='errored-wiki'>${mw.html.escape(pWikiData.servername)}</span>]`, pTries)}</div>`);
		
		this.addRefreshButtonTo(errorCont[0]);
		errorCont.append(" ");
		
		// Retry Button
		const retry = ()=>{
			clearTimeout(this.loadErrorTimeoutID); this.loadErrorTimeoutID = 0;
			
			this.currentMultiLoader.retry(pInc);
			errorCont.remove();
		};
		$(`<button class="rcm-btn">${i18n("error-trymoretimes", pInc)}</button>`).appendTo(errorCont).on("click", retry);
		
		if(this.isAutoRefreshEnabled()) { this.loadErrorTimeoutID = window.setTimeout(() => { retry?.(); }, 20000); }
	}
	
	/* Check wiki data one at a time, either as it's returned, or after the current data is done being processed. */
	private _parseWiki(pData, pWikiData:WikiData) : void {
		// Check if wiki doesn't have any recent changes
		if(!pData || pData.length <= 0) {
			return;
		}
		
		mw.log(pWikiData.servername, pData);
		
		pWikiData.updateLastChangeDate(Utils.getFirstItemFromObject(pData));
		let tNewRC;
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
	};
	
	private _parseWikiAbuseLog(pLogs, pWikiData:WikiData) : void {
		// Check if wiki doesn't have any abuse logs
		if(!pLogs || pLogs.length <= 0) {
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
	
	private _onAllWikisParsed=() : void => {
		if(this.discussionsEnabled) {
			this._startDiscussionLoading(this.ajaxID);
		} else {
			this.rcmChunkStart();
		}
	}
	
	/***************************
	* General RCData Management methods
	***************************/
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
	
	// TODO: Make it more efficient if using hideenhanced by ignoring some calls.
	private _addRCDataToList(pNewRC:RCData) : void {
		let tNewRcCombo:{ data:RCData, list?:RCList } = { data:pNewRC };
		this.rcData.push( tNewRcCombo ); // Just push it in, we'll sort it in rcmChunkStart use array.sort (less intensive than doing it manually).
		
		let tResultsIsEmpty = this.resultsNode.innerHTML == "", tNewList:RCList|undefined, tNoChangeAdded:boolean;
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
			if(pRCList.date > this.lastLoadDateTimeActual! || tResultsIsEmpty) {
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
				let tRcSection = this.resultsNode.querySelector("div, ul")!;
				this.rcmNewChangesMarker = <HTMLElement>tRcSection.insertBefore(Utils.newElement("div", { className:"rcm-previouslyLoaded", innerHTML:"<strong>"+i18n('previouslyloaded')+"</strong>" }), tRcSection.firstChild);
			}
			
			if(this.lastLoadDateTimeActual != null && this.isAutoRefreshEnabled() && !document.hasFocus()) {
				if(this.recentChangesEntries[0].date > this.lastLoadDateTimeActual) {
					this.notifyUserOfChange();
				}
			}
		}
		this.rcmChunk(0, 99, 99, undefined, this.ajaxID);
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
		let data:RCData, list:RCList|undefined, tDirtyLists:RCList[] = [], tWikiI:number;
		// Remove all old RCDatas, and mark changed lists as "dirty"
		for(let i = this.rcData.length-1; i >= 0; i--) {
			({ data, list } = this.rcData[i]);
			if((tWikiI = tWikisToCheck.indexOf(data.wikiInfo)) == -1) { continue; }
			// First remove items past "days" (needs to be done first since it can change number allowed by "limit")
			if(data.shouldBeRemoved(pDate)) {
				switch(data.getRemovalType()) {
					case "normal": data.wikiInfo.resultsCount--; break;
					case "discussion": data.wikiInfo.discussionsCount--; break;
					case "abuselog": data.wikiInfo.abuseLogCount--; break;
				}
				// if(this.rcData[i].data != list.list[list.list.length-1]) {
				// 	mw.log("MISMATCH:", list.list.indexOf(data), list.list.length-1, this.rcData[i].data.wikiInfo, this.rcData[i] , list.list[list.list.length-1], list.list);
				// }
				this.rcData.splice(i, 1);
				list?.removeRC(data);
				//tRcCombo.list.list.pop().dispose(); // The last item in a list -should- always be the one we care about
				// Mark changed lists as dirty. Edit / remove them after encase multiple datas were removed.
				if(!!list && (this.rcParams.hideenhanced || tDirtyLists.indexOf(list) == -1)) { tDirtyLists.push(list); }
			} else if(data.wikiInfo.resultsCount <= data.wikiInfo.rcParams.limit
				&& data.wikiInfo.discussionsCount <= Math.min(data.wikiInfo.rcParams.limit, 50)
				&& data.wikiInfo.abuseLogCount <= data.wikiInfo.rcParams.limit
				) {
				// Stop checking a specific wiki, and if all have been checked exit (for efficency when dealing with high numbers of results).
				tWikisToCheck.splice(tWikiI, 1);
				if(tWikisToCheck.length == 0) { break; }
			}
		}
		
		// Now remove or update dirty lists.
		let tOldNode:HTMLElement, tListI:number;
		tDirtyLists.forEach((pRCList:RCList) => {
			tListI = this.recentChangesEntries.indexOf(pRCList);
			if(tListI > -1) {
				if(pRCList.list.length <= 0) {
					if(pRCList.htmlNode) { Utils.removeElement(pRCList.htmlNode); }
					this.recentChangesEntries[tListI].dispose();
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
				if(this.recentChangesEntries[i].date > this.lastLoadDateTime!) {
					for(let j = 0; j < this.recentChangesEntries[i].list.length; j++) {
						if(this.recentChangesEntries[i].list[j].date > this.lastLoadDateTime!) {
							tNumNewChanges++;
							if(this.recentChangesEntries[i].wikiInfo.scriptpath == tMostRecentEntry.wikiInfo.scriptpath) { tNumNewChangesWiki++; }
						} else { break; }
					}
				} else { break; }
			}
			Main.blinkWindowTitle(i18n("notification-new")+" "+i18n("nchanges", tNumNewChanges));
			let tEditTitle = tMostRecentEntry.getNotificationTitle();
			
			// Get each line of the notification
			let bodyContents:string[] = [];
			if(tEditTitle) bodyContents.push(tEditTitle);
			bodyContents.push( i18n("notification-edited-by", tMostRecentEntry.author) );
			if(tMostRecentEntry.summaryUnparsed) bodyContents.push( i18n("notification-edit-summary", tMostRecentEntry.summaryUnparsed) );
			
			Main.addNotification(i18n("nchanges", tNumNewChanges)+" - "+tMostRecentEntry.wikiInfo.sitename + (tNumNewChangesWiki != tNumNewChanges ? ` (${tNumNewChangesWiki})` : ""), {
				body: bodyContents.join("\n")
			});
		}
	}
	
	// Add a single change at a time, with a timeout before the next one to prevents script from locking up browser.
	rcmChunk(pIndex:number, pLastDay:number, pLastMonth:number, pContainer:HTMLElement|undefined, pID:number) : void {
		if(pID != this.ajaxID) { return; } // If the script is refreshed (by auto refresh) while entries are adding, stop adding old entries.
		
		if(this.newRecentChangesEntries.length == 0) { this.finishScript(); return; }
		
		let date = this.newRecentChangesEntries[pIndex].date, tAddToTopOfExistingContainer = false;
		// Add new date grouping if necessary.
		if(Utils.getDate(date) != pLastDay || Utils.getMonth(date) != pLastMonth || !pContainer) { // !pContainer check is because we let it be undefined for the first time it's called
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
			}
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
				pContainer.firstChild?.parentNode?.insertBefore(tRcNode, pContainer.firstChild);
			} else {
				// pContainer.insertBefore(tRcNode, this.rcmNewChangesMarker); // Kinda hacky but doesn't occassionally fail.
				if(this.newRecentChangesEntries[pIndex-1].htmlNode.parentNode != pContainer) {
					pContainer.appendChild(tRcNode);
				} else {
					Utils.insertAfter(tRcNode, this.newRecentChangesEntries[pIndex-1].htmlNode);
				}
			}
		} else {
			pContainer.appendChild(this.newRecentChangesEntries[pIndex].toHTML(pIndex));
		}
		this.itemsAdded += this.newRecentChangesEntries[pIndex].list.length;
		
		if(++pIndex < this.newRecentChangesEntries.length) {
			$(this.modID+" .rcm-content-loading-num").html( this.itemsAdded.toString() );
			// Only do a timeout every few changes (timeout is to prevent browser potentially locking up, only every few to prevent it taking longer than necessary)
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
		
		let { url, dataType="jsonp", callback:tCallback, skipRefreshSanity } = this.secondaryWikiData.shift()!;
		if(typeof url === "function") url = url();
		
		let tries = 0, retryDelay = 0, MAX_TRIES = 10;
		const tDoLoad=() => {
			$.ajax({ type: 'GET', url:url as string, dataType, data: {} })
			.then((...pArgs) => {
				// Don't run result if script already moved on
				if(!skipRefreshSanity && pID != this.ajaxID) { return; }
				tCallback(...pArgs);
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
		pParent.appendChild(document.createTextNode(" "));
		$(`<button class="rcm-btn">${i18n("status-refresh")}</button>`).appendTo(pParent).on("click", ()=>{
			this.refresh();
		});
		
		// let self = this;
		// Utils.newElement("button", { className:"rcm-btn", innerHTML:i18n('status-refresh') }, pParent).addEventListener("click", function tHandler(e){
		// 	e.target.removeEventListener("click", tHandler);
		// 	self.refresh();
		// });
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
				localStorage.setItem(self.autoRefreshLocalStorageID, 'true');
				self.refresh();
				Notification.requestPermission();
			} else {
				localStorage.setItem(self.autoRefreshLocalStorageID, 'false');
				clearTimeout(self.autoRefreshTimeoutID);
			}
		});
	};
	
	isAutoRefreshEnabled() : boolean {
		return localStorage.getItem(this.autoRefreshLocalStorageID) == "true" || this.autoRefreshEnabledDefault;
	}
	
	// take a "&" seperated list of RC params, and returns a Object with settings.
	// NOTE: Script does not currently support: "from" and "namespace" related fields (like invert)
	parseRCParams(pData:string|undefined, pExplodeOn:string, pSplitOn:string) : Partial<RCParams> {
		var tRcParams:Partial<RCParams> = {};
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
			namespace	: undefined,
		};
	}
}
