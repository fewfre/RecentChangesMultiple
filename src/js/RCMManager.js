//<syntaxhighlight lang="javascript">

//######################################
// #### RCMManager - Module core ####
// * This is what actually parses a "rc-content-multiple" div, and loads the respective information.
// * Uses RCList to actually format the RecentChanges info.
//######################################
window.dev.RecentChangesMultiple.RCMManager = (function($, document, mw, module, RCData, RCList, WikiData, RCMOptions, Utils, i18n){
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
		this.wikisNode		= null; // {HTMLElement}
		this.wikisNodeList	= null; // {HTMLElement}
		this.wikisNodeInfo	= null; // {HTMLElement}
		this.resultsNode	= null; // {HTMLElement}
		this.footerNode		= null; // {HTMLElement}
		
		/***************************
		 * Data provided to script
		 ***************************/
		this.rcParamsBase			= null; // {object} and object containing data about the RecentChange "params" sent in
		this.rcParams				= null; // {object} Same as this.rcParamsBase as well as default values if not supplied.
		
		this.defaultLang			= null; // {string}
		this.timezone				= null; // {string}
		this.autoRefreshTimeoutNum	= null; // {int} number of milliseconds to wait before refreshing.
		
		this.hideusers				= null; // {array} List of users to hide across whole RCMManager
		this.onlyshowusers			= null; // {array} Only show these users' edits across whole RCMManager
		this.chosenWikis			= null; // {array<WikiData>} Wikis for the script to load
		
		/***************************
		 * Storage
		 ***************************/
		this.ajaxID					= 0;    // {int} A unique ID for all ajax data for a given "load" (used to prevent previously requested data from mixing with currently requested data after "Refresh" is hit after a script error)
		this.autoRefreshTimeoutID	= null; // {int} ID for the auto refresh timeout.
		
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
	};
	
	RCMManager.prototype.dispose = function() {
		this.resultCont		= null;
		this.statusNode		= null;
		this.wikisNode		= null;
		this.wikisNodeList	= null;
		this.wikisNodeInfo	= null;
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
		this.hideusers.forEach(function(o,i,a){ a[i] = a[i].trim(); });
		
		// Only show these users' edits across whole RCMManager
		this.onlyshowusers = []; // {array}
		if(tDataset.onlyshowusers) { this.onlyshowusers = tDataset.onlyshowusers.replace(/_/g, " ").split(","); }
		this.onlyshowusers.forEach(function(o,i,a){ a[i] = a[i].trim(); });
		
		this.extraLoadingEnabled = tDataset.extraLoadingEnabled == "false" ? false : true;
		
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
		this.wikisNode		= Utils.newElement("div", { className:"rcm-wikis" }, this.resultCont);
		this.resultsNode	= Utils.newElement("div", { className:"rcm-results rc-conntent" }, this.resultCont);
		this.footerNode		= Utils.newElement("div", { className:"rcm-footer" }, this.resultCont);
		
		/***************************
		 * Setup
		 ***************************/
		// Footer never changes, so set here
		this.footerNode.innerHTML = "[<a href='http://dev.wikia.com/wiki/RecentChangesMultiple'>RecentChangesMultiple</a>] " + Utils.formatString(i18n.TEXT.footer, module.version, "<img src='http://fewfre.com/images/rcm_avatar.jpg' height='14' /> <a href='http://fewfre.wikia.com/wiki/Fewfre_Wiki'>Fewfre</a>");
		
		$( this.resultsNode ).on("click", ".rcm-favicon-goto-button", this.onGoToWikiInfo);
		
		// Now start the app
		this._start(true);
		
		return this;
	};
	
	/* pUpdateParams : Bool - optional (default: false) */
	RCMManager.prototype._start = function(pUpdateParams) {
		var self = this;
		
		clearTimeout(this.autoRefreshTimeoutID);
		this.wikisNode.innerHTML = i18n.TEXT.wikisLoaded;
		this.wikisNodeList	= Utils.newElement("span", { className:"rcm-wikis-list" }, this.wikisNode);
		this.wikisNodeInfo	= Utils.newElement("div", { className:"rcm-wikis-info" }, this.wikisNode);
		
		this.recentChangesEntries = [];
		this.ajaxCallbacks = [];
		this.erroredWikis = [];
		this.secondaryWikiData = [];
		
		this.ajaxID++;
		this.loadingErrorRetryNum = RCMManager.LOADING_ERROR_RETRY_NUM_INC;
		this.itemsAdded = this.itemsToAddTotal = 0;
		
		this.totalWikisToLoad = 0;
		Utils.forEach(this.chosenWikis, function(wikiInfo){
			if(pUpdateParams) { wikiInfo.setupRcParams(); } // Encase it was changed via RCMOptions
			self.totalWikisToLoad++;
			self.loadWiki(wikiInfo, 0, self.ajaxID, self.totalWikisToLoad * module.loadDelay);
		});
		//this.totalWikisToLoad = this.chosenWikis.length;
		this.wikisLeftToLoad = this.totalWikisToLoad;
		this.statusNode.innerHTML = "<img src='"+module.LOADER_IMG+"' /> "+i18n.TEXT.loading+" (<span class='rcm-load-perc'>0%</span>)";
	};
	
	/* pUpdateParams : Bool - optional (default: false) */
	RCMManager.prototype.refresh = function(pUpdateParams) {
		this.statusNode.innerHTML = "";
		this.wikisNode.innerHTML = "";
		this.resultsNode.innerHTML = "";
		this.wikisNodeList = null;
		
		if(this.recentChangesEntries != null) {
			for (var i = 0; i < this.recentChangesEntries.length; i++) {
				this.recentChangesEntries[i].dispose();
				this.recentChangesEntries[i] = null;
			}
			this.recentChangesEntries = null;
		}
		this.ajaxCallbacks = null;
		this.secondaryWikiData = null;
		
		RCData.closeDiff();
		
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
			this.statusNode.innerHTML = "<div class='rcm-error'>"+Utils.formatString(i18n.TEXT.errorLoadingSyntaxHang, "<span class='errored-wiki'>"+pWikiInfo.servername+"</span>", pTries)+"</div>";
			Utils.newElement("button", { innerHTML:Utils.formatString(i18n.TEXT.tryMoreTimes, 1) }, self.statusNode).addEventListener("click",
				function tHandler(pData){
					pData.target.removeEventListener("click", tHandler);
					
					self.erroredWikis.forEach(function(obj){
						console.log(obj);
						self.loadWiki(obj.wikiInfo, obj.tries, obj.id);
					});
					self.erroredWikis = [];
					self.statusNode.innerHTML = "<img src='"+module.LOADER_IMG+"' /> "+i18n.TEXT.loading+" (<span class='rcm-load-perc'>"+self.calcLoadPercent()+"%</span>)";
				}
			);
			self.erroredWikis.push({wikiInfo:pWikiInfo, tries:pTries, id:pID});
			return;
		}
		else if(pData == null || pData.query == null || pData.query.recentchanges == null) {
			console.log("Error loading "+pWikiInfo.servername+" ("+pTries+"/"+this.loadingErrorRetryNum+" tries)");
			//console.log(pData);
			if(pTries < this.loadingErrorRetryNum) {
				this.loadWiki(pWikiInfo, pTries, pID, 0);
			} else {
				if(this.erroredWikis.length === 0) {
					this.statusNode.innerHTML = "<div class='rcm-error'>"+Utils.formatString((pFailStatus==null ? i18n.TEXT.errorLoadingSyntaxHang : i18n.TEXT.errorLoadingConnection), "<span class='errored-wiki'>"+pWikiInfo.servername+"</span>", pTries)+"</div>";
					this.addRefreshButtonTo(this.statusNode);
					Utils.newElement("button", { innerHTML:Utils.formatString(i18n.TEXT.tryMoreTimes, RCMManager.LOADING_ERROR_RETRY_NUM_INC) }, self.statusNode).addEventListener("click",
						function tHandler(pData){
							self.loadingErrorRetryNum += RCMManager.LOADING_ERROR_RETRY_NUM_INC;
							pData.target.removeEventListener("click", tHandler);
							
							self.erroredWikis.forEach(function(obj){
								console.log(obj);
								self.loadWiki(obj.wikiInfo, obj.tries, obj.id);
							});
							self.erroredWikis = [];
							self.statusNode.innerHTML = "<img src='"+module.LOADER_IMG+"' /> "+i18n.TEXT.loading+" (<span class='rcm-load-perc'>"+self.calcLoadPercent()+"%</span>)";
						}
					);
					self.erroredWikis.push({wikiInfo:pWikiInfo, tries:pTries, id:pID});
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
		this.addWikiIcon(pWikiInfo);
		document.querySelector(this.modID+" .rcm-load-perc").innerHTML = this.calcLoadPercent() + "%";//.toFixed(3) + "%";
		if(this.wikisLeftToLoad > 0) {
			// Parse / wait for next wiki
			Utils.addTextTo(":", this.wikisNodeList);
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
		this.statusNode.innerHTML = Utils.formatString(i18n.TEXT.timeStamp, "<b><tt>"+Utils.pad(Utils.getHours(tDate, this.timezone),2)+":"+Utils.pad(Utils.getMinutes(tDate, this.timezone),2)+"</tt></b>");
		this.statusNode.innerHTML += "<span class='rcm-content-loading'>"+Utils.formatString(i18n.TEXT.changesAdded, "<span class='rcm-content-loading-num'>0</span> / "+this.itemsToAddTotal)+"</span>"
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
		if(this.lastLoadDateTime != null && this.recentChangesEntries[0].date < this.lastLoadDateTime) {
			Utils.newElement("div", { className:"rcm-noNewChanges", innerHTML:"<strong>"+i18n.TEXT.noNewChanges+"</strong>" }, this.resultsNode);
		}
		this.rcmChunk(0, 99, 99, null, this.ajaxID);
	}
	
	// Add a single change at a time, with a timeout before the next one to prevents script from locking up browser.
	RCMManager.prototype.rcmChunk = function(pIndex, pLastDay, pLastMonth, pContainer, pID) {
		if(pID != this.ajaxID) { return; } // If the script is refreshed (by auto refresh) while entries are adding, stop adding old entries.
		var self = this;
		
		var date = this.recentChangesEntries[pIndex].date;
		// Add new date grouping if necessary.
		if(Utils.getDate(date, this.timezone) != pLastDay || Utils.getMonth(date, this.timezone) != pLastMonth) {
			pLastDay = Utils.getDate(date, this.timezone);
			pLastMonth = Utils.getMonth(date, this.timezone);
			Utils.newElement("h4", { innerHTML:pLastDay+" "+mw.config.get('wgMonthNames')[pLastMonth+1]+" "+Utils.getYear(date, this.timezone) }, this.resultsNode);
			
			pContainer = this.rcParams.hideenhanced==false ? Utils.newElement("div", {  }, this.resultsNode) : Utils.newElement("ul", { className:"special" }, this.resultsNode);
		}
		// Show at what point new changes start at.
		if(this.lastLoadDateTime != null && pIndex-1 >= 0 && date < this.lastLoadDateTime && this.recentChangesEntries[pIndex-1].date > this.lastLoadDateTime) {
			Utils.newElement("div", { className:"rcm-previouslyLoaded", innerHTML:"<strong>"+i18n.TEXT.previouslyLoaded+"</strong>" }, pContainer);
		}
		
		// Add to page
		pContainer.appendChild(this.recentChangesEntries[pIndex].toHTML(pIndex));
		this.itemsAdded += this.recentChangesEntries[pIndex].list.length;
		
		if(++pIndex < this.recentChangesEntries.length) {
			document.querySelector(this.modID+" .rcm-content-loading-num").innerHTML = this.itemsAdded;
			// Only do a timeout ever few changes (timeout to prevent browser potentially locking up, only every few to prevent it taking longer than necessary)
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
		this.lastLoadDateTime = new Date();
		
		// Removing this all remove event handlers
		// for (var i = 0; i < this.recentChangesEntries.length; i++) {
		// 	this.recentChangesEntries[i].dispose();
		// 	this.recentChangesEntries[i] = null;
		// }
		// this.recentChangesEntries = null;
		
		if(document.querySelector(this.modID+" .rcm-autoRefresh-checkbox").checked) {
			var self = this;
			this.autoRefreshTimeoutID = setTimeout(function(){ self.refresh(); }, this.autoRefreshTimeoutNum);
		}
		
		//$( "#rc-content-multiple .mw-collapsible" ).each(function(){ $(this).makeCollapsible(); });
		
		(window.ajaxCallAgain || []).forEach(function(cb){ cb(); });
		
		// Secondary info
		if(this.extraLoadingEnabled) {
			this.loadExtraInfo(this.ajaxID);
		}
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
		
		Utils.newElement("button", { innerHTML:i18n.TEXT.refresh }, pParent).addEventListener("click", function tHandler(e){
			e.target.removeEventListener("click", tHandler);
			self.refresh();
		});
	};
	
	RCMManager.prototype.addAutoRefreshInputTo = function(pParent) {
		var self = this;
		
		pParent.appendChild(document.createTextNode(" "));
		
		var autoRefresh = Utils.newElement("span", { className:"rcm-autoRefresh" }, pParent);
		Utils.newElement("label", { htmlFor:"rcm-autoRefresh-checkbox", innerHTML:i18n.TEXT.autoRefresh, title:Utils.formatString(i18n.TEXT.autoRefreshTooltip, Math.floor(self.autoRefreshTimeoutNum/1000)) }, autoRefresh);
		var checkBox = Utils.newElement("input", { className:"rcm-autoRefresh-checkbox", type:"checkbox" }, autoRefresh);
		checkBox.checked = (localStorage.getItem(module.AUTO_REFRESH_LOCAL_STORAGE_ID) == "true");
		
		checkBox.addEventListener("click", function tHandler(e){
			if(document.querySelector(self.modID+" .rcm-autoRefresh-checkbox").checked) {
				localStorage.setItem(module.AUTO_REFRESH_LOCAL_STORAGE_ID, true);
				self.refresh();
			} else {
				localStorage.setItem(module.AUTO_REFRESH_LOCAL_STORAGE_ID, false);
				clearTimeout(self.autoRefreshTimeoutID);
			}
		});
	};
	
	RCMManager.prototype.calcLoadPercent = function() {
		return Math.round((this.totalWikisToLoad - this.wikisLeftToLoad) / this.totalWikisToLoad * 100);
	};
	
	RCMManager.prototype.addWikiIcon = function(pWikiInfo) {
		var self = this;
		// this.wikisNodeList.innerHTML += Utils.formatString("<span class='favicon' href='{0}Special:RecentChanges{2}'>{1}</span>", pWikiInfo.articlepath, pWikiInfo.getFaviconHTML(), pWikiInfo.firstSeperator+pWikiInfo.rcParams.paramString);
		var favicon = Utils.newElement("span", { id:pWikiInfo.infoID, className: "favicon", innerHTML: pWikiInfo.getFaviconHTML() }, this.wikisNodeList);
		favicon.addEventListener("click", function(e){
			var infoBanner = self.wikisNodeInfo.querySelector(".banner-notification");
			// If already open for that wiki, then close it.
			if(infoBanner && infoBanner.dataset.wiki == pWikiInfo.servername && /*Not called via click()*/(e.screenX != 0 && e.screenY != 0)) {
				self.closeWikiInfoBanner();
			} else {
				// Front page|Site name - RecentChanges - New pages – New files – Logs – Insights
				self.wikisNodeInfo.innerHTML = "<div class='banner-notification warn' data-wiki='"+pWikiInfo.servername+"'>"//notify
				+ "<button class='close wikia-chiclet-button'><img></button>"
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
				+ "<a href='"+pWikiInfo.articlepath+"Special:RecentChanges"+pWikiInfo.firstSeperator+pWikiInfo.rcParams.paramString+"'>"+i18n.RC_TEXT["recentchanges"]+"</a>"
				+ " - "
				+ "<a href='"+pWikiInfo.articlepath+"Special:NewPages'>"+i18n.RC_TEXT["newpages"]+"</a>"
				+ " - "
				+ "<a href='"+pWikiInfo.articlepath+"Special:NewFiles'>"+i18n.RC_TEXT["newimages"]+"</a>"
				+ " - "
				+ "<a href='"+pWikiInfo.articlepath+"Special:Log'>"+i18n.RC_TEXT["log"]+"</a>"
				
				+ (pWikiInfo.isWikiaWiki ? " - <a href='"+pWikiInfo.articlepath+"Special:Insights'>"+i18n.RC_TEXT["insights"]+"</a>" : "")
				+ " - "
				+ "<a href='"+pWikiInfo.articlepath+"Special:Random'>"+i18n.RC_TEXT["randompage"]+"</a>"
				+ "</td>"
				+ "</tr>"
				// Now for the statistics
					+ "<tr>"
					+ "<td>"
					+ "<table class='wikitable center statisticstable' style='margin: 0;'>"
					+ "<tr>"
						+ "<td><a href='"+pWikiInfo.articlepath+"Special:AllPages'>"+i18n.RC_TEXT["awc-metrics-articles"]+"</a>: <b>" + pWikiInfo.statistics.articles +"</b></td>"
						+ "<td><a href='"+pWikiInfo.articlepath+"Special:ListFiles'>"+i18n.RC_TEXT["prefs-files"]+"</a>: <b>" + pWikiInfo.statistics.images +"</b></td>"
						+ "<td><a href='"+pWikiInfo.articlepath+"Special:ListUsers'>"+i18n.RC_TEXT["group-user"]+"</a>: <b>" + pWikiInfo.statistics.activeusers +"</b></td>"
						+ "<td><a href='"+pWikiInfo.articlepath+"Special:ListAdmins'>"+i18n.RC_TEXT["group-sysop"]+"</a>: <b>" + pWikiInfo.statistics.admins +"</b></td>"
						+ "<td><a href='"+pWikiInfo.articlepath+"Special:Statistics'>"+i18n.RC_TEXT["awc-metrics-edits"]+"</a>: <b>" + pWikiInfo.statistics.edits +"</b></td>"
					+ "</tr>"
					+ "</table>"
					+ "</td>"
					+ "</tr>"
				+ "</table>"
				+ "</div>";
				+ "</div>";
				self.wikisNodeInfo.querySelector(".banner-notification .close").addEventListener("click", self.closeWikiInfoBanner.bind(self));
			}
		});
	};
	
	// RCMManager.prototype.addWikiIconOld = function(pWikiInfo) {
	// 	var self = this;
	// 	// this.wikisNodeList.innerHTML += Utils.formatString("<span class='favicon' href='{0}Special:RecentChanges{2}'>{1}</span>", pWikiInfo.articlepath, pWikiInfo.getFaviconHTML(), pWikiInfo.firstSeperator+pWikiInfo.rcParams.paramString);
	// 	var favicon = Utils.newElement("span", { className: "favicon", innerHTML: pWikiInfo.getFaviconHTML() }, this.wikisNodeList);
	// 	favicon.addEventListener("click", function(){
	// 		var infoBanner = self.wikisNodeInfo.querySelector(".banner-notification");
	// 		// If already open for that wiki, then close it.
	// 		if(infoBanner && infoBanner.dataset.wiki == pWikiInfo.servername) {
	// 			self.closeWikiInfoBanner();
	// 		} else {
	// 			// Front page|Site name - RecentChanges - New pages – New files – Logs – Insights
	// 			self.wikisNodeInfo.innerHTML = "<div class='banner-notification warn' data-wiki='"+pWikiInfo.servername+"'>"//notify
	// 			+ "<button class='close wikia-chiclet-button'><img></button>"
	// 			+ "<div class='msg'>"
	// 			+ pWikiInfo.getFaviconHTML()
	// 			+ " "
	// 			+ "<b><a href='"+pWikiInfo.articlepath+pWikiInfo.mainpage.replace(/ /g, "_")+"'>"+pWikiInfo.sitename+"</a></b>"
	// 			+ " : "
	// 			+ "<a href='"+pWikiInfo.articlepath+"Special:RecentChanges"+pWikiInfo.firstSeperator+pWikiInfo.rcParams.paramString+"'>"+i18n.RC_TEXT["recentchanges"]+"</a>"
	// 			+ " - "
	// 			+ "<a href='"+pWikiInfo.articlepath+"Special:NewPages'>"+i18n.RC_TEXT["newpages"]+"</a>"
	// 			+ " - "
	// 			+ "<a href='"+pWikiInfo.articlepath+"Special:NewFiles'>"+i18n.RC_TEXT["newimages"]+"</a>"
	// 			+ " - "
	// 			+ "<a href='"+pWikiInfo.articlepath+"Special:Log'>"+i18n.RC_TEXT["log"]+"</a>"
				
	// 			+ (pWikiInfo.isWikiaWiki ? " - <a href='"+pWikiInfo.articlepath+"Special:Insights'>"+i18n.RC_TEXT["insights"]+"</a>" : "")
	// 			+ " - "
	// 			+ "<a href='"+pWikiInfo.articlepath+"Special:Random'>"+i18n.RC_TEXT["randompage"]+"</a>"
	// 			+ "</div>";
	// 			+ "</div>";
	// 			self.wikisNodeInfo.querySelector(".banner-notification .close").addEventListener("click", self.closeWikiInfoBanner.bind(self));
	// 		}
	// 	});
	// };
	
	RCMManager.prototype.closeWikiInfoBanner = function() {
		// $(infoBanner).hide(500, "linear", function() {
		$(this.wikisNodeInfo.querySelector(".banner-notification")).animate({ height: "toggle", opacity: "toggle" }, 200, function(){
			$(this).remove();
		});
	};
	
	RCMManager.prototype.onGoToWikiInfo = function(e) {
		// console.log(e, e.currentTarget);
		// console.log(e.currentTarget.dataset.infoid);
		
		var btn = document.querySelector("#"+e.currentTarget.dataset.infoid);
		if(btn) {
			var tScrollOffset = mw.config.get("skin") == "oasis" ? -46 : 0;
			// $('html, body').animate({ scrollTop: $(btn).offset().top }, 0);
			$('html, body').scrollTop( $(btn).offset().top + tScrollOffset - 6 );
			btn.click();
		}
	};
	
	// take a "&" seperated list of RC params, and returns a Object with settings.
	// NOTE: Script does not currently support: "from" and "namespace" (or related fields)
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
	, window.dev.RecentChangesMultiple.Utils
	, window.dev.RecentChangesMultiple.i18n
);
//</syntaxhighlight>