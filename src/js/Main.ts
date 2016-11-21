import RCMManager from "./RCMManager";
import ConstantsApp from "./ConstantsApp";
import Utils from "./Utils";
import i18n from "./i18n";

let Notification = (<any>window).Notification;
let $ = (<any>window).jQuery;
let mw = (<any>window).mediaWiki;

//######################################
// Main - Start script and store static values.
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
		 * Setup
		 ***************************/
		// Load the css for module
		Utils.newElement("link", { rel:"stylesheet", type:"text/css", href:"/load.php?mode=articles&articles=u:dev:RecentChangesMultiple/stylesheet.css&only=styles" }, document.head);
		
		var tDataset:any = tWrappers[0].dataset;

		i18n.init(tDataset.lang);

		// Set load delay (needed for scripts that load large numbers of wikis)
		if(tDataset.loaddelay) { ConstantsApp.loadDelay = tDataset.loaddelay; }
		if(tDataset.localsystemmessages === "false") { ConstantsApp.useLocalSystemMessages = false; }

		// Unless specified, hide the rail to better replicate Special:RecentChanges
		if(tDataset.hiderail !== "false") {
			document.querySelector("body").className += " rcm-hiderail";
		}

		this._loadLangMessages();

		tDataset = null;

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
			if(param == "hideminor" || param == "hidebots" || param == "hideanons" || param == "hideliu" || param == "hidemyself" || param == "hideenhanced" || param == "hidelogs") {
				this.rcParamsURL[param] = tUrlVars[param]=="1";
			}
			if(param == "debug") { ConstantsApp.debug = (tUrlVars[param]=="true"); }
		}

		/***************************
		 * Start App
		 ***************************/
		let self = this;
		Utils.forEach(tWrappers, function tRCM_start_createRCMs(pNode, pI, pArray){
			self.rcmList.push( new RCMManager(pNode, pI).init() );
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
			let self = this;
			refreshAllButton.addEventListener("click", function(){
				for(var i = 0; i < self.rcmList.length; i++) {
					self.rcmList[i].refresh();
				}
			});
		}
	}

	private _unload() : void {
		// for(i = 0; i < Main.rcmList.length; i++) {
		// 	// Something on things seems to lag the page.
		// 	// Main.rcmList[i].dispose();
		// 	Main.rcmList[i] = null;
		// }
		// Main.rcmList = null;
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

			for (var i = 0; i < self.onLangLoadCallbacks.length; i++) {
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
		for(var i = 0; i < this._notifications.length; i++) {
			this._notifications[i].close();
		}
		this._notifications = [];
		
		// Update "previously loaded" messages
		for(var i = 0; i < this.rcmList.length; i++) {
			this.rcmList[i].lastLoadDateTime = this.rcmList[i].lastLoadDateTimeActual;
		}
	}
}
export default new Main();
