import RCMManager from "./RCMManager";
import ConstantsApp from "./ConstantsApp";
import Utils from "./Utils";
import i18n from "./i18n";

let Notification = (<any>window).Notification;
let $ = (<any>window).jQuery;
let mw = (<any>window).mediaWiki;

//######################################
// Main (instance class) - Start script and store values.
//######################################
class Main
{
	// Storage
	rcmList				: RCMManager[];
	langLoaded			: boolean;
	onLangLoadCallbacks	: (() => void)[];
	numLangLoadErrors	: number;
	// Custom parameter defaults
	rcParamsURL			: any; // See below
	
	// Singleton constructor
	constructor() {
		this.rcmList = [];
		this.langLoaded = false;
		this.onLangLoadCallbacks = [];
		this.numLangLoadErrors = 0;
	}
	
	// Should only be called once.
	init(pScriptConfig:any) : void {
		ConstantsApp.init(pScriptConfig);
		
		$(document).ready($.proxy(this._ready, this));
		$(document).unload($.proxy(this._unload, this));
		
		$(window).focus($.proxy(this._onFocus, this));
	}
	
	// Once all neccisary content is loaded, start the script.
	private _ready() : void {
		// Find module wrappers
		var tWrappers = <HTMLScriptElement[]><any>document.querySelectorAll('.rc-content-multiple, #rc-content-multiple');
		
		/***************************
		* Initial Param Parsing
		****************************/
		var tDataset:any = tWrappers[0].dataset;
		i18n.init(tDataset.lang);
		if(tDataset.localsystemmessages === "false") { ConstantsApp.useLocalSystemMessages = false; }
		// Set load delay (needed for scripts that load large numbers of wikis)
		if(tDataset.loaddelay) { ConstantsApp.loadDelay = tDataset.loaddelay; }
		// Unless specified, hide the rail to better replicate Special:RecentChanges
		if(tDataset.hiderail !== "false") { document.querySelector("body").className += " rcm-hiderail"; }
		tDataset = null;
		
		/***************************
		* Preload
		****************************/
		// Load the css for module
		Utils.newElement("link", { rel:"stylesheet", type:"text/css", href:"/load.php?mode=articles&articles=u:dev:RecentChangesMultiple/stylesheet.css&only=styles" }, document.head);
		this._loadLangMessages(); // Load Translations from Wiki database.
		
		// Misc Loading - https://www.mediawiki.org/wiki/ResourceLoader/Modules#mw.loader.load
		mw.loader.load([
			'mediawiki.special.recentchanges', // This does things like allow "fieldset" to collapse in RCMOptions
			'mediawiki.action.history.diff', // AjaxDiff css
		]);
		
		/***************************
		* Setup SVG symbols
		***************************/
		$("body").append($( ConstantsApp.initSymbols() ));

		/***************************
		* Get rcParams from url
		***************************/
		this.rcParamsURL = {};

		var tUrlVars = {}
		var parts = window.location.href.split("#")[0].replace( /[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value:string){tUrlVars[key] = value; return value;} );
		for(var param in tUrlVars) {
			if(param == "limit" || param == "days") {
				this.rcParamsURL[param] = parseInt(tUrlVars[param]);
			}
			else if(param == "hideminor" || param == "hidebots" || param == "hideanons" || param == "hideliu" || param == "hidemyself" || param == "hideenhanced" || param == "hidelogs") {
				this.rcParamsURL[param] = tUrlVars[param]=="1";
			}
			else if(param == "debug") { ConstantsApp.debug = (tUrlVars[param]=="true"); }
		}

		/***************************
		* Start App
		***************************/
		let self = this;
		Utils.forEach(tWrappers, function tRCM_start_createRCMs(pNode, pI, pArray){
			let tRCMManager = new RCMManager(pNode, pI);
			self.rcmList.push( tRCMManager );
			// Don't init managers until all translation info is loaded.
			if(self.langLoaded) {
				tRCMManager.init();
			} else {
				tRCMManager.resultCont.innerHTML = `<center>${ConstantsApp.getLoaderLarge()}</center>`;
				self.onLangLoadCallbacks.push(function(){ tRCMManager.init(); tRCMManager = null; });
			}
		});

		var refreshAllButton = document.querySelector(".rcm-refresh-all");
		if(refreshAllButton) {
			refreshAllButton.addEventListener("click", function(){ self._refreshAllManagers(); });
		}
		
		tWrappers = null;
	}
	
	private _refreshAllManagers() : void {
		for(let i = 0; i < this.rcmList.length; i++) {
			this.rcmList[i].refresh();
		}
	}

	private _unload() : void {
		// for(let i = 0; i < this.rcmList.length; i++) {
		// 	// Something on things seems to lag the page.
		// 	// this.rcmList[i].dispose();
		// 	this.rcmList[i] = null;
		// }
		// this.rcmList = null;
		// i18n = null;
	}
	
	/***************************
	* Events
	****************************/
	private _onFocus() : void {
		this.clearNotifications();
	}
	
	/***************************
	* Additional Loading
	****************************/
	// Replace all RC_TEXT with that of the language specified.
	// TODO: Should probably have support to check if it ran into loading issues.
	private _loadLangMessages() : void {
		var tLangLoadAjaxPromises = [];

		// Loads the messages and updates the i18n with the new values (max messages that can be passed is 50)
		function tRCM_loadLangMessage(pMessages) {
			var tScriptPath = ConstantsApp.useLocalSystemMessages ? mw.config.get("wgServer") + mw.config.get('wgScriptPath') : "http://community.wikia.com";
			var url = `${tScriptPath}/api.php?action=query&format=json&meta=allmessages&amlang=${i18n.defaultLang}&ammessages=${pMessages}`;
			if(ConstantsApp.debug) { console.log(url.replace("&format=json", "&format=jsonfm")); }

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
		
		let self = this;
		// When loading of all translated messages is done (or one failed) do this.
		$.when.apply($, tLangLoadAjaxPromises)
		.done(function(pData){
			self.langLoaded = true;

			for (let i = 0; i < self.onLangLoadCallbacks.length; i++) {
				self.onLangLoadCallbacks[i]();
			}
			self.onLangLoadCallbacks = [];
		})
		.fail(function(pData){
			var tNumTries = 15;
			if(self.numLangLoadErrors < tNumTries) {
				self.numLangLoadErrors++;
				self._loadLangMessages();
			} else {
				console.log("ERROR: "+JSON.stringify(pData));
				alert(`ERROR: RecentChanges text not loaded properly (${tNumTries} tries); defaulting to English.`);
				self.langLoaded = true;
				for (var i = 0; i < self.onLangLoadCallbacks.length; i++) {
					console.log(self.onLangLoadCallbacks[i]);
					self.onLangLoadCallbacks[i]();
				}
				self.onLangLoadCallbacks = [];
			}
		})
		;
	}
	
	/***************************
	* Call to blink the window title (only while window doesn't have focus).
	****************************/
	private _blinkInterval:number;
	private _originalTitle:string;
	
	blinkWindowTitle(pTitle:string) : void {
		this.cancelBlinkWindowTitle();
		this._originalTitle = document.title;
		let self = this;
		this._blinkInterval = setTimeout(function(){
			document.title = document.title == self._originalTitle ? (pTitle+" - "+self._originalTitle) : self._originalTitle;
			if(document.hasFocus()) { self.cancelBlinkWindowTitle(); }
		}, 1000);
	}
	cancelBlinkWindowTitle() : void {
		if(!this._blinkInterval) { return; }
		clearInterval(this._blinkInterval);
		this._blinkInterval = null;
		document.title = this._originalTitle;
	}
	
	/***************************
	* Manage Notifications
	****************************/
	private _notifications = [];
	
	addNotification(pTitle:string, pOptions:{ icon?:string, body?:string }) : void {
		if(Notification.permission !== "granted") { return; }
		pOptions = pOptions || {};
		pOptions.icon = pOptions.icon || ConstantsApp.NOTIFICATION_ICON;
		this._notifications.push(new Notification(pTitle, pOptions));
		if(this._notifications.length > 1) {
			this._notifications.shift().close();
		}
	}
	clearNotifications() : void {
		// Remove all notifications
		for(let i = 0; i < this._notifications.length; i++) {
			this._notifications[i].close();
		}
		this._notifications = [];
		
		// Update "previously loaded" messages
		for(let i = 0; i < this.rcmList.length; i++) {
			this.rcmList[i].lastLoadDateTime = this.rcmList[i].lastLoadDateTimeActual;
		}
	}
}
// We want Main to be an instance class.
export default new Main();
