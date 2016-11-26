import Main from "./Main";
import RCMWikiPanel from "./RCMWikiPanel";
import RCMOptions from "./RCMOptions";
import ConstantsApp from "./ConstantsApp";
import RCMModal from "./RCMModal";
import WikiData from "./WikiData";
import RCData from "./RCData";
import RCMWikiaDiscussionData from "./RCMWikiaDiscussionData";
import RCList from "./RCList";
import RCParams from "./RCParams";
import Utils from "./Utils";
import i18n from "./i18n";

let Notification = (<any>window).Notification;
let $ = (<any>window).jQuery;
let mw = (<any>window).mediaWiki;

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
	
	/***************************
	 * Data provided to script
	 ***************************/
	rcParamsBase			: any; // An object containing data about the RecentChange "params" sent in
	rcParams				: any; // Same as rcParamsBase as well as default values if not supplied
	
	timezone				: string;
	autoRefreshTimeoutNum	: number // Number of milliseconds to wait before refreshing
	
	chosenWikis				: any[]; // Wikis for the script to load
	hideusers				: string[]; // List of users to hide across whole RCMManager
	onlyshowusers			: string[]; // Only show these users' edits across whole RCMManager
	notificationsHideusers	: string[]; // Don't send notifications when these users edit.
	
	makeLinksAjax			: boolean; // Make the diff/gallery link behave as the ajax icons do.
	discussionsEnabled		: boolean; // Whether to load Wikia discussions
	
	/***************************
	 * Storage
	 ***************************/
	ajaxID						: number; // A unique ID for all ajax data for a given "load" (used to prevent previously requested data from mixing with currently requested data after "Refresh" is hit after a script error)
	autoRefreshTimeoutID		: number; // ID for the auto refresh timeout.
	autoRefreshEnabledDefault	: boolean; // Default value for auto refresh being enabled.
	autoRefreshLocalStorageID	: string;
	
	recentChangesEntries		: any[]; // Array of either RecentChange/RecentChangeList objects.
	ajaxCallbacks				: any[]; // Array of functions that stores info retrieved from ajax, so that the script can run without worry of race conditions.
	erroredWikis				: any[]; // Array of wikis that have errored more than expected times; kept in list to be tried more times should user wish
	
	extraLoadingEnabled			: boolean; // Turns extra loading on/off
	// { url:String, callback:function }
	secondaryWikiData			: { url:string, callback:(any)=>void, dataType?:string }[]; // Array of objects that are used to fill in blanks that cannot be retrieved on initial data calls (usually page-specific).
	
	totalItemsToLoad			: number; // Total number of wikis to load.
	wikisLeftToLoad				: number; // Wikis left to load via ajax
	loadingErrorRetryNum		: number; // Number of tries to load a wiki before complaining (encase it's due to server, not invalid link)
	loadErrorTimeoutID			: number;
	itemsAdded					: number; // Number off items added to screen AFTER load.
	itemsToAddTotal				: number; // Total number if items to add to the screen
	rcm_style_for_rc_bg_added	: boolean; // Once wiki data is retrieved, add wiki-specific css if it hasn't been added already.
	
	lastLoadDateTime			: Date; // The last time everything was loaded.
	lastLoadDateTimeActual		: Date; // Even if lastLoadDateTime hasn't been updated (due to auto refresh), this always has the actual last loaded date
	
	// Constructor
	constructor(pWrapper:HTMLElement|Element, pModID:string|number) {
		this.modID			= "rcm"+pModID;
		this.resultCont		= <HTMLElement>pWrapper;
		
		this.makeLinksAjax				= false;
		this.ajaxID						= 0;
		this.autoRefreshLocalStorageID	= ConstantsApp.AUTO_REFRESH_LOCAL_STORAGE_ID + "-" + this.modID;
		this.extraLoadingEnabled		= true;
		this.rcm_style_for_rc_bg_added	= false;
		
		this._parseWikiList();
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
	
	// Should only be called once per RCMManager.
	private _parseWikiList() : void {
		/***************************
		* Data provided to script
		***************************/
		var tDataset = <any>this.resultCont.dataset;
		
		this.rcParamsBase = $.extend( {}, Main.rcParamsURL, this.parseRCParams(tDataset.params, "&", "=") );
		this.rcParams = $.extend( this.getDefaultRCParams(), this.rcParamsBase );
		
		this.timezone = tDataset.timezone ? tDataset.timezone.toLowerCase() : 'utc'; // {string}
		this.autoRefreshTimeoutNum = (tDataset.autorefresh ? parseInt(tDataset.autorefresh) : 60) * 1000; // {int} number of milliseconds to wait before refreshing.
		
		this.discussionsEnabled = tDataset.discussionsEnabled === "true";
		
		// List of users to hide across whole RCMManager
		this.hideusers = []; // {array}
		if(tDataset.hideusers) { this.hideusers = tDataset.hideusers.replace(/_/g, " ").split(","); }
		// if(this.rcParams.hidemyself) {
		// 	var tUsername = ConstantsApp.username;
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
		this.chosenWikis = Utils.uniq_fast_key(this.chosenWikis, "servername");
		
		tDataset = null;
		this.resultCont.innerHTML = "";
	}
	
	// Adds core elements. Should only be called once per RCMManager.
	init() : RCMManager {
		this.resultCont.innerHTML = "";
		this.resultCont.className += " "+this.modID;
		this.modID = "."+this.modID;
		
		/***************************
		* HTML Elements/Nodes
		***************************/
		this.optionsNode	= new RCMOptions(this).init(Utils.newElement("div", { className:"rcm-options" }, this.resultCont));
		this.statusNode		= Utils.newElement("div", { className:"rcm-status" }, this.resultCont);
		this.wikisNode		= new RCMWikiPanel(this).init(Utils.newElement("div", { className:"rcm-wikis" }, this.resultCont));
		this.resultsNode	= Utils.newElement("div", { className:"rcm-results rc-conntent" }, this.resultCont);
		this.footerNode		= Utils.newElement("div", { className:"rcm-footer" }, this.resultCont);
		
		/***************************
		* Setup
		***************************/
		// Footer never changes, so set here
		var tEndNewMessageDate = new Date(ConstantsApp.lastVersionDateString); tEndNewMessageDate.setDate(tEndNewMessageDate.getDate() + 3);
		var tNewVersion = tEndNewMessageDate > new Date() ? '<sup class="rcm-new-version">'+i18n("wikifeatures-promotion-new")+'</sup>' : "";
		this.footerNode.innerHTML = "[<a href='http://dev.wikia.com/wiki/RecentChangesMultiple'>RecentChangesMultiple</a>] " + i18n('rcm-footer', "<a href='https://github.com/fewfre/RecentChangesMultiple/blob/master/changelog'>"+ConstantsApp.version+"</a>"+tNewVersion, "<img src='http://fewfre.com/images/rcm_avatar.jpg' height='14' /> <a href='http://fewfre.wikia.com/wiki/Fewfre_Wiki'>Fewfre</a>");
		
		$( this.resultsNode ).on("click", ".rcm-favicon-goto-button", this.wikisNode.goToAndOpenInfo);
		
		// Now start the app
		// this._start(true);
		this._startWikiDataLoad();
		
		return this;
	};
	
	/***************************
	* Setup WikiData classes - Various wiki data needs to be loaded before the script can properly run.
	***************************/
	private _startWikiDataLoad() : void {
		var self = this;
		
		this.erroredWikis = [];
		
		this.ajaxID++;
		this.loadingErrorRetryNum = RCMManager.LOADING_ERROR_RETRY_NUM_INC;
		
		if(this.chosenWikis.length > 0) {
			Utils.forEach(this.chosenWikis, function(tWikiData:WikiData, i:number){
				self._loadWikiData(tWikiData, 0, self.ajaxID, (i+1) * ConstantsApp.loadDelay);
			});
			this.totalItemsToLoad = this.chosenWikis.length;
			this.wikisLeftToLoad = this.totalItemsToLoad;
			this.statusNode.innerHTML = ConstantsApp.getLoader()+" "+i18n('app-loading')+" (<span class='rcm-load-perc'>0%</span>)";
		} else {
			// If the RCM has no wikis listed, there is nothing to run, and the user should be informed.
			Utils.removeElement(this.statusNode);
			Utils.removeElement(this.wikisNode.root);
			this.resultsNode.innerHTML = "<div class='banner-notification error center'>"+i18n("wikiacuratedcontent-content-empty-section")+"</div>";
		}
	}
	
	private _loadWikiData(pWikiData:WikiData, pTries:number, pID:number, pDelayNum:number=0) : void {
		var self = this;
		
		++pTries;
		
		// A timeout is used instead of loading 1 at a time to save time, as it allows some loading overlap.
		// A timeout is needed since Wikia wikis share a "request overload" detector, which can block your account from making more requests for awhile.
		setTimeout(function(){
			$.ajax({
				type: 'GET',
				dataType: 'jsonp',
				data: {},
				timeout: 15000, // Error out after 15s
				url: pWikiData.getWikiDataApiUrl(),
				success: function(data){ self._onWikiDataLoaded(data, pWikiData, pTries, pID, null); },
				error: function(data, status){ self._onWikiDataLoaded(null, pWikiData, pTries, pID, status); },
			});
		}, pDelayNum);
	}
	
	private _onWikiDataLoaded(pData, pWikiData:WikiData, pTries:number, pID:number, pFailStatus) : void {
		var self = this;
		
		// Make sure this isn't something loaded before the script was last refreshed.
		if(pID != this.ajaxID) { return; }
		
		// Make sure results are valid
		if(!!pData && pData.error && pData.query == null) {
			this.statusNode.innerHTML = "<div class='rcm-error'><div>ERROR: "+pWikiData.servername+"</div>"+JSON.stringify(pData.error)+"</div>";
			throw "Wiki returned error";
		}
		else if(pFailStatus == "timeout") {
			this._handleWikiDataLoadError(pWikiData, pTries, pID, "rcm-error-loading-syntaxhang", 1);
			return;
		}
		else if(pData == null || pData.query == null || pData.query.general == null) {
			console.log("Error loading "+pWikiData.servername+" ("+pTries+"/"+this.loadingErrorRetryNum+" tries)");
			//console.log(pData);
			if(pTries < this.loadingErrorRetryNum) {
				this._loadWikiData(pWikiData, pTries, pID, 0);
			} else {
				if(this.erroredWikis.length === 0) {
					var tMessage = pFailStatus==null ? "rcm-error-loading-syntaxhang" : "rcm-error-loading-connection";
					this._handleWikiDataLoadError(pWikiData, pTries, pID, tMessage, RCMManager.LOADING_ERROR_RETRY_NUM_INC);
				} else {
					this.erroredWikis.push({wikiInfo:pWikiData, tries:pTries, id:pID});
					this.statusNode.querySelector(".errored-wiki").innerHTML += ", "+pWikiData.servername;
				}
			}
			return;
		}
		
		if(pData && pData.warning) { console.log("WARNING: ", pData.warning); }
		
		// Store wiki-data retrieved that's needed before wiki parsing
		pWikiData.initAfterLoad(pData.query);
		
		this.wikisLeftToLoad--;
		document.querySelector(this.modID+" .rcm-load-perc").innerHTML = this.calcLoadPercent() + "%";//.toFixed(3) + "%";
		if(this.wikisLeftToLoad <= 0) {
			this._start(true);
		}
	}
	
	private _handleWikiDataLoadError(pWikiData:WikiData, pTries:number, pID:number, pErrorMessage:string, pInc:number) : void {
		var self = this;
		this.statusNode.innerHTML = "<div class='rcm-error'>"+i18n(pErrorMessage, "<span class='errored-wiki'>"+pWikiData.servername+"</span>", pTries)+"</div>";
		var tHandler = function(pEvent){
			self.loadingErrorRetryNum += pInc;
			if(pEvent) { pEvent.target.removeEventListener("click", tHandler); }
			tHandler = null;
			
			self.erroredWikis.forEach(function(obj){
				// console.log(obj);
				self._loadWikiData(obj.wikiInfo, obj.tries, obj.id);
			});
			self.erroredWikis = [];
			self.statusNode.innerHTML = ConstantsApp.getLoader()+" "+i18n('rcm-loading')+" (<span class='rcm-load-perc'>"+self.calcLoadPercent()+"%</span>)";
		};
		Utils.newElement("button", { innerHTML:i18n("rcm-error-trymoretimes", pInc) }, self.statusNode).addEventListener("click", tHandler);
		self.erroredWikis.push({wikiInfo:pWikiData, tries:pTries, id:pID});
	}
	
	/***************************
	* Discussion Loading
	***************************/
	private _startDiscussionLoading(pID:number) : void {
		if(!this.discussionsEnabled) { return; }
		var self = this;
		
		this.ajaxCallbacks = [];
		this.loadingErrorRetryNum = RCMManager.LOADING_ERROR_RETRY_NUM_INC;
		
		this.totalItemsToLoad = 0;
		Utils.forEach(this.chosenWikis, function(tWikiData:WikiData, i:number){
			if(tWikiData.usesWikiaDiscussions !== false) {
				self.totalItemsToLoad++;
				self._loadWikiaDiscussions(tWikiData, 0, pID, self.totalItemsToLoad * ConstantsApp.loadDelay);
			}
		});
		// If no discussions are being loaded, skip it and tell manager to not even bother in the future.
		if(this.totalItemsToLoad <= 0) {
			this.discussionsEnabled = false;
			this.rcmChunkStart();
			return;
		}
		this.wikisLeftToLoad = this.totalItemsToLoad;
		this.statusNode.innerHTML = ConstantsApp.getLoader()+" "+i18n('embeddable-discussions-loading')+" (<span class='rcm-load-perc'>0%</span>)";
	}
	
	private _loadWikiaDiscussions(pWikiData:WikiData, pTries:number, pID:number, pDelayNum:number=0) : void {
		var self = this;
		++pTries;
		
		var tLimit = pWikiData.rcParams.limit < 50 ? pWikiData.rcParams.limit : 50; // 50 is the limit, but fetch less if there are less.
		// https://github.com/Wikia/app/blob/b03df0a89ed672697e9c130d529bf1eb25f49cda/lib/Swagger/src/Discussion/Api/PostsApi.php
		var tURL = `https://services.wikia.com/discussion/${pWikiData.wikiaCityID}/posts?limit=${tLimit}&page=0&responseGroup=small&reported=false&viewableOnly=${!pWikiData.canBlock}`;
		if(ConstantsApp.debug) { console.log("[RCMManager](_loadWikiaDiscussions) "+tURL); }
		$.ajax({ type: 'GET', dataType: 'json', data: {},
			timeout: 15000, // Error out after 15s
			url: tURL,
			success: function(data){ self._onWikiDiscussionLoaded(data, pWikiData, pTries, pID, null); },
			error: function(data, status){ self._onWikiDiscussionLoaded(data, pWikiData, pTries, pID, status); },
		});
	}
	
	private _onWikiDiscussionLoaded(pData, pWikiData:WikiData, pTries:number, pID:number, pFailStatus) : void {
		let self = this;
		// Make sure this isn't something loaded before the script was last refreshed.
		if(pID != this.ajaxID) { return; }
		
		if(pFailStatus == null && pData && pData["_embedded"] && pData["_embedded"]["doc:posts"]) {
			pWikiData.usesWikiaDiscussions = true;
			this.ajaxCallbacks.push(function(){
				self._parseWikiDiscussions(pData["_embedded"]["doc:posts"], pWikiData);
			});
			if(this.ajaxCallbacks.length === 1) { this.ajaxCallbacks[0](); }
		} else {
			if(pWikiData.usesWikiaDiscussions === true) {
				console.log("Error loading "+pWikiData.servername+" ("+pTries+"/"+this.loadingErrorRetryNum+" tries)");
				//console.log(pData);
				if(pTries < this.loadingErrorRetryNum && pFailStatus == "timeout") {
					this._loadWikiaDiscussions(pWikiData, pTries, pID, 0);
					return;
				} else {
					// Don't do any fancy error catching. just fail.
					this._onDiscussionParsingFinished(pWikiData);
				}
			} else {
				if(pFailStatus != "timeout") {
					if(ConstantsApp.debug) { console.log("[RCMManager](loadWikiDiscussions) "+pWikiData.servername+" has no discussions."); }
					pWikiData.usesWikiaDiscussions = false;
				}
				this._onDiscussionParsingFinished(pWikiData);
			}
		}
	}
	
	private _parseWikiDiscussions(pData, pWikiData:WikiData) : void {
		var self = this;
		
		// Check if wiki doesn't have any recent changes
		if(pData.length <= 0) {
			this._onDiscussionParsingFinished(pWikiData);
			return;
		}
		
		// A sort is needed since they are sorted by creation, not last edit.
		pData.sort(function(a, b){
			return (a.modificationDate || a.creationDate).epochSecond < (b.modificationDate || b.creationDate).epochSecond ? 1 : -1;
		});
		var tNewRC, tDate, tChangeAdded;
		// Add each entry from the wiki to the list in a sorted order
		pData.forEach(function tRCM_parseWiki_parseRCData(pRCData){
			let tUser = pRCData.createdBy.name;
			// Skip if user is hidden for whole script or specific wiki
			if(tUser && self.hideusers.indexOf(tUser) > -1 || (pWikiData.hideusers && pWikiData.hideusers.indexOf(tUser) > -1)) { return; }
			// Skip if user is NOT a specified user to show for whole script or specific wiki
			if(tUser && (self.onlyshowusers.length != 0 && self.onlyshowusers.indexOf(tUser) == -1)) { return; }
			if(tUser && (pWikiData.onlyshowusers != undefined && pWikiData.onlyshowusers.indexOf(tUser) == -1)) { return; }
			// If hideself set
			if(pWikiData.rcParams.hidemyself && ConstantsApp.username == tUser) { return; }
			// Skip if goes past the RC "changes in last _ days" value.
			if((pRCData.modificationDate || pRCData.creationDate).epochSecond < Math.round(pWikiData.getEndDate().getTime() / 1000)) { return; }
			
			self.itemsToAddTotal++;
			tNewRC = new RCMWikiaDiscussionData( pWikiData, self );
			tNewRC.init(pRCData);
			tChangeAdded = false;
			self.recentChangesEntries.every(function tRCM_parseWiki_checkIfShouldGroup(pRCList:RCList, i:number){
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
		
		if(ConstantsApp.debug) { console.log("Discussions:", pWikiData.servername, pData); }
		
		this._onDiscussionParsingFinished(pWikiData);
	}
	
	private _onDiscussionParsingFinished(pWikiData:WikiData) : void {
		this.wikisLeftToLoad--;
		document.querySelector(this.modID+" .rcm-load-perc").innerHTML = this.calcLoadPercent() + "%";//.toFixed(3) + "%";
		if(this.wikisLeftToLoad > 0) {
			// Parse / wait for next wiki
			this.ajaxCallbacks.shift();
			if(this.ajaxCallbacks.length > 0){ this.ajaxCallbacks[0](); }
		} else {
			this.rcmChunkStart();
		}
	}
	
	/***************************
	* Main RecentChanges loading methods
	***************************/
	private _start(pUpdateParams:boolean=false) : void {
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
		
		Utils.forEach(this.chosenWikis, function(tWikiData:WikiData, i:number){
			if(pUpdateParams) { tWikiData.setupRcParams(); } // Encase it was changed via RCMOptions
			self._loadWiki(tWikiData, 0, self.ajaxID, (i+1) * ConstantsApp.loadDelay);
		});
		this.totalItemsToLoad = this.chosenWikis.length;
		this.wikisLeftToLoad = this.totalItemsToLoad;
		this.statusNode.innerHTML = ConstantsApp.getLoader()+" "+i18n('rcm-loading')+" (<span class='rcm-load-perc'>0%</span>)";
	};
	
	refresh(pUpdateParams:boolean=false) : void {
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
	private _loadWiki(pWikiData:WikiData, pTries:number, pID:number, pDelayNum:number=0) : void {
		var self = this;
		++pTries;
		
		// A timeout is used instead of loading 1 at a time to save time, as it allows some loading overlap.
		// A timeout is needed since Wikia wikis share a "request overload" detector, which can block your account from making more requests for awhile.
		setTimeout(function(){
			$.ajax({ type: 'GET', dataType: 'jsonp', data: {},
				timeout: 15000, // Error out after 15s
				url: pWikiData.getApiUrl(),
				success: function(data){ self._onWikiLoaded(data, pWikiData, pTries, pID, null); },
				error: function(data, status){ self._onWikiLoaded(null, pWikiData, pTries, pID, status); },
			});
		}, pDelayNum);
	};
	
	/* Called after a wiki is loaded; will add it to queue, and run it if no other callbacks running. */
	private _onWikiLoaded(pData, pWikiData:WikiData, pTries:number, pID:number, pFailStatus) : void {
		var self = this;
		
		// Make sure this isn't something loaded before the script was last refreshed.
		if(pID != this.ajaxID) { return; }
		
		// Make sure results are valid
		if(!!pData && pData.error && pData.query == null) {
			this.statusNode.innerHTML = "<div class='rcm-error'><div>ERROR: "+pWikiData.servername+"</div>"+JSON.stringify(pData.error)+"</div>";
			throw "Wiki returned error";
		}
		else if(pFailStatus == "timeout") {
			this._handleWikiLoadError(pWikiData, pTries, pID, "rcm-error-loading-syntaxhang", 1);
			return;
		}
		else if(pData == null || pData.query == null || pData.query.recentchanges == null) {
			console.log("Error loading "+pWikiData.servername+" ("+pTries+"/"+this.loadingErrorRetryNum+" tries)");
			//console.log(pData);
			if(pTries < this.loadingErrorRetryNum) {
				this._loadWiki(pWikiData, pTries, pID, 0);
			} else {
				if(this.erroredWikis.length === 0) {
					var tMessage = pFailStatus==null ? "rcm-error-loading-syntaxhang" : "rcm-error-loading-connection";
					this._handleWikiLoadError(pWikiData, pTries, pID, tMessage, RCMManager.LOADING_ERROR_RETRY_NUM_INC);
				} else {
					this.erroredWikis.push({wikiInfo:pWikiData, tries:pTries, id:pID});
					this.statusNode.querySelector(".errored-wiki").innerHTML += ", "+pWikiData.servername;
				}
				//throw "Refresh";
			}
			return;
		}
		
		if(pData && pData.warning) { console.log("WARNING: ", pData.warning); }
		
		// Store wiki-data retrieved that's needed before wiki parsing
		// pWikiData.initAfterLoad(pData.query);
		
		this.ajaxCallbacks.push(function(){
			self._parseWiki(pData.query.recentchanges, pData.query.logevents, pWikiData);
		});
		if(this.ajaxCallbacks.length === 1) { this.ajaxCallbacks[0](); }
	};
	
	private _handleWikiLoadError(pWikiData:WikiData, pTries:number, pID:number, pErrorMessage:string, pInc:number) : void {
		var self = this;
		clearTimeout(this.loadErrorTimeoutID); this.loadErrorTimeoutID = null;
		this.statusNode.innerHTML = "<div class='rcm-error'>"+i18n(pErrorMessage, "<span class='errored-wiki'>"+pWikiData.servername+"</span>", pTries)+"</div>";
		this.addRefreshButtonTo(this.statusNode);
		var tHandler = function(pEvent){
			clearTimeout(self.loadErrorTimeoutID); self.loadErrorTimeoutID = null;
			self.loadingErrorRetryNum += pInc;
			if(pEvent) { pEvent.target.removeEventListener("click", tHandler); }
			tHandler = null;
			
			self.erroredWikis.forEach(function(obj){
				// console.log(obj);
				self._loadWiki(obj.wikiInfo, obj.tries, obj.id);
			});
			self.erroredWikis = [];
			self.statusNode.innerHTML = ConstantsApp.getLoader()+" "+i18n('rcm-loading')+" (<span class='rcm-load-perc'>"+self.calcLoadPercent()+"%</span>)";
		};
		Utils.newElement("button", { innerHTML:i18n("rcm-error-trymoretimes", pInc) }, self.statusNode).addEventListener("click", tHandler);
		self.erroredWikis.push({wikiInfo:pWikiData, tries:pTries, id:pID});
		if(this.isAutoRefreshEnabled()) { this.loadErrorTimeoutID = setTimeout(function(){ if(tHandler) { tHandler(null); } }, 20000); }
	};
	
	/* Check wiki data one at a time, either as it's returned, or after the current data is done being processed. */
	private _parseWiki(pData, pLogData, pWikiData:WikiData) : void {
		var self = this;
		
		// Check if wiki doesn't have any recent changes
		if(pData.length <= 0) {
			this._onWikiParsingFinished(pWikiData);
			return;
		}
		
		if(ConstantsApp.debug) { console.log(pWikiData.servername, pData); }
		
		var tNewRC, tDate, tChangeAdded;
		// Add each entry from the wiki to the list in a sorted order
		pData.forEach(function tRCM_parseWiki_parseRCData(pRCData){
			// Skip if user is hidden for whole script or specific wiki
			if(pRCData.user && self.hideusers.indexOf(pRCData.user) > -1 || (pWikiData.hideusers && pWikiData.hideusers.indexOf(pRCData.user) > -1)) { return; }
			// Skip if user is NOT a specified user to show for whole script or specific wiki
			if(pRCData.user && (self.onlyshowusers.length != 0 && self.onlyshowusers.indexOf(pRCData.user) == -1)) { return; }
			if(pRCData.user && (pWikiData.onlyshowusers != undefined && pWikiData.onlyshowusers.indexOf(pRCData.user) == -1)) { return; }
			
			self.itemsToAddTotal++;
			tNewRC = new RCData( pWikiData, self ).init(pRCData, pLogData);
			tChangeAdded = false;
			self.recentChangesEntries.every(function tRCM_parseWiki_checkIfShouldGroup(pRCList:RCList, i:number){
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
		
		this._onWikiParsingFinished(pWikiData);
	};
	
	// After a wiki is loaded, check if ALL wikis are loaded; if so add results; if not, load the next wiki, or wait for next wiki to return data.
	private _onWikiParsingFinished(pWikiData:WikiData) : void {
		this.wikisLeftToLoad--;
		this.wikisNode.addWiki(pWikiData);
		document.querySelector(this.modID+" .rcm-load-perc").innerHTML = this.calcLoadPercent() + "%";//.toFixed(3) + "%";
		if(this.wikisLeftToLoad > 0) {
			// Parse / wait for next wiki
			this.ajaxCallbacks.shift();
			if(this.ajaxCallbacks.length > 0){ this.ajaxCallbacks[0](); }
		} else {
			if(this.discussionsEnabled) {
				this._startDiscussionLoading(this.ajaxID);
			} else {
				this.rcmChunkStart();
			}
		}
	};
	
	/***************************
	* Display Results
	***************************/
	// All wikis are loaded
	rcmChunkStart() : void {
		var tDate:Date = new Date();
		this.statusNode.innerHTML = i18n('rcm-download-timestamp', "<b><tt>"+Utils.pad(Utils.getHours(tDate, this.timezone),2)+":"+Utils.pad(Utils.getMinutes(tDate, this.timezone),2)+"</tt></b>");
		this.statusNode.innerHTML += "<span class='rcm-content-loading'>"+i18n('rcm-download-changesadded', "<span class='rcm-content-loading-num'>0</span> / "+this.itemsToAddTotal)+"</span>"
		this.resultsNode.innerHTML = "";
		
		// Add some run-time CSS classes
		if(!this.rcm_style_for_rc_bg_added) {
			this.rcm_style_for_rc_bg_added = true;
			var tCSS = "";
			Utils.forEach(this.chosenWikis, function(wikiInfo:WikiData){
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
					Main.blinkWindowTitle(i18n("wikifeatures-promotion-new")+"! "+i18n("nchanges", tNumNewChanges));
					var tEditSummary = !tMostRecentEntry.unparsedComment ? "" : "\n"+i18n("edit-summary")+": "+tMostRecentEntry.unparsedComment;
					Main.addNotification(i18n("nchanges", tNumNewChanges)+" - "+tMostRecentEntry.wikiInfo.sitename + (tNumNewChangesWiki != tNumNewChanges ? " ("+i18n("nchanges", tNumNewChangesWiki)+")" : ""), {
						body:tMostRecentEntry.title+"\n"+Utils.ucfirst(i18n("myhome-feed-edited-by", tMostRecentEntry.author)) + tEditSummary
					});
				}
				tMostRecentEntry = null;
			}
		}
		this.rcmChunk(0, 99, 99, null, this.ajaxID);
	}
	
	// Add a single change at a time, with a timeout before the next one to prevents script from locking up browser.
	rcmChunk(pIndex:number, pLastDay:number, pLastMonth:number, pContainer:HTMLElement, pID:number) : void {
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
			document.querySelector(this.modID+" .rcm-content-loading-num").innerHTML = this.itemsAdded.toString();
			// Only do a timeout every few changes (timeout to prevent browser potentially locking up, only every few to prevent it taking longer than necessary)
			if(pIndex%5 == 0) {
				setTimeout(function(){ self.rcmChunk(pIndex, pLastDay, pLastMonth, pContainer, pID); });
			} else {
				self.rcmChunk(pIndex, pLastDay, pLastMonth, pContainer, pID);
			}
		}
		else { this.finishScript(); }
	};
	
	finishScript() : void {
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
		
		((<any>window).ajaxCallAgain || []).forEach(function(cb){ cb(); });
		
		// Secondary info
		if(this.extraLoadingEnabled) {
			this._loadExtraInfo(this.ajaxID);
		}
	};
	
	startAutoRefresh() : void {
		if(!this.isAutoRefreshEnabled()) { return; }
		
		var self = this;
		this.autoRefreshTimeoutID = setTimeout(function(){
			if(RCMModal.isModalOpen()) { self.startAutoRefresh(); return; }
			self.refresh();
		}, this.autoRefreshTimeoutNum);
	};
		
	private _loadExtraInfo(pID:number) : void {
		if(pID != this.ajaxID) { return; }
		if(this.secondaryWikiData.length == 0) { if(ConstantsApp.debug){ console.log("[RCMManager](_loadExtraInfo) All loading finished."); } return; }
		var self = this;
		
		var tUrl = this.secondaryWikiData[0].url;
		var tCallback = this.secondaryWikiData[0].callback;
		var tDataType = this.secondaryWikiData[0].dataType || "jsonp";
		this.secondaryWikiData.splice(0, 1);
		
		$.ajax({
			type: 'GET',
			dataType: tDataType,
			data: {},
			url: tUrl,
			success: function(){ if(pID != self.ajaxID) { return; } tCallback.apply(this, arguments); },//tCallback,
			// error: function(data){ self.onWikiLoaded(null, pWikiData, pTries, pID, true); },
		});
		
		setTimeout(function(){ self._loadExtraInfo(pID); }, ConstantsApp.loadDelay);
	}
	
	/***************************
	* Specific Helper Methods
	***************************/
	addRefreshButtonTo(pParent:HTMLElement) : void {
		var self = this;
		
		pParent.appendChild(document.createTextNode(" "));
		
		Utils.newElement("button", { innerHTML:i18n('rcm-refresh') }, pParent).addEventListener("click", function tHandler(e){
			e.target.removeEventListener("click", tHandler);
			self.refresh();
		});
	};
	
	addAutoRefreshInputTo(pParent:HTMLElement) : void {
		var self = this;
		
		pParent.appendChild(document.createTextNode(" "));
		
		var autoRefresh = Utils.newElement("span", { className:"rcm-autoRefresh" }, pParent);
		Utils.newElement("label", { htmlFor:"rcm-autoRefresh-checkbox", innerHTML:i18n('rcm-autorefresh'), title:i18n('rcm-autorefresh-tooltip', Math.floor(self.autoRefreshTimeoutNum/1000)) }, autoRefresh);
		var checkBox:HTMLInputElement = <HTMLInputElement>Utils.newElement("input", { className:"rcm-autoRefresh-checkbox", type:"checkbox" }, autoRefresh);
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
				paramStringArray.push(tRcParamsDataSplit[0]+"="+tRcParamsDataSplit[1]);
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
			namespace	: null,
		};
	}
}
