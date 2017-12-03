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
		mw.loader.using( 'mediawiki.util', 'mediawiki.user.options' ).done(()=>{
			ConstantsApp.init(pScriptConfig);
			
			$(document).ready($.proxy(this._ready, this));
			$(document).unload($.proxy(this._unload, this));
			
			$(window).focus($.proxy(this._onFocus, this));
		});
	}
	
	// Once all neccisary content is loaded, start the script.
	private _ready() : void {
		/***************************
		* Initial Param Parsing
		****************************/
		let tFirstWrapper = <HTMLElement>document.querySelector('.rc-content-multiple, #rc-content-multiple');
		let tDataset:any = tFirstWrapper.dataset;
		i18n.init(tDataset.lang);
		if(tDataset.localsystemmessages === "false") { ConstantsApp.useLocalSystemMessages = false; }
		// Set load delay (needed for scripts that load large numbers of wikis)
		if(tDataset.loaddelay) { ConstantsApp.loadDelay = tDataset.loaddelay; }
		if(tDataset.timezone) { ConstantsApp.timezone = tDataset.timezone.toLowerCase(); }
		// Unless specified, hide the rail to better replicate Special:RecentChanges
		if(tDataset.hiderail !== "false") { document.querySelector("body").className += " rcm-hiderail"; }
		tDataset = null;
		tFirstWrapper = null;
		
		/***************************
		* Preload
		****************************/
		// Load the css for module
		Utils.newElement("link", { rel:"stylesheet", type:"text/css", href:"/load.php?mode=articles&articles=u:dev:MediaWiki:RecentChangesMultiple/stylesheet.css&only=styles" }, document.head);
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
		this.rcParamsURL = {}; let tParam;
		["limit", "days"].forEach((key)=>{
			if((tParam = mw.util.getParamValue(key)) != null) {
				this.rcParamsURL[key] = parseInt(tParam);
			}
		});
		["hideminor", "hidebots", "hideanons", "hideliu", "hidemyself", "hideenhanced", "hidelogs"].forEach((key)=>{
			if((tParam = mw.util.getParamValue(key)) != null) {
				this.rcParamsURL[key] = tParam=="1";
			}
		});

		/***************************
		* Start App
		***************************/
		this._parsePage(document);

		/***************************
		* Listen for new Managers
		***************************/
		// Add additional Managers that are need from any "Tab view" loads.
		setTimeout(() => {
			// https://github.com/Wikia/app/blob/b03df0a89ed672697e9c130d529bf1eb25f49cda/extensions/wikia/TabView/js/TabView.js
			mw.hook('wikipage.content').add((pSection) => {
				// mw.log(pSection[0], pSection[0].classList.contains("tabBody"), pSection[0].innerHTML);
				if(pSection[0].classList && pSection[0].classList.contains("tabBody")) {
					if(pSection[0].querySelector('.rc-content-multiple, #rc-content-multiple')) {
						this._parsePage(pSection[0]);
					}
				}
			});
		}, 0);
	}
	
	private _parsePage(pCont:HTMLElement|Document) : void {
		let tWrappers = <HTMLElement[]><any>pCont.querySelectorAll('.rc-content-multiple, #rc-content-multiple');
		Utils.forEach(tWrappers, (pNode, pI, pArray) => {
			if((<any>pNode).rcm_wrapper_used) { mw.log("[Main](_parsePage) Wrapper already parsed; exiting."); return; }
			(<any>pNode).rcm_wrapper_used = true;
			let tRCMManager = new RCMManager(pNode, pI);
			this.rcmList.push( tRCMManager );
			// Don't init managers until all translation info is loaded.
			if(this.langLoaded) {
				tRCMManager.init();
			} else {
				tRCMManager.resultCont.innerHTML = `<center>${ConstantsApp.getLoaderLarge()}</center>`;
				this.onLangLoadCallbacks.push(() => { tRCMManager.init(); tRCMManager = null; });
			}
		});
		
		let refreshAllButton = <HTMLElement>pCont.querySelector(".rcm-refresh-all");
		if(refreshAllButton) {
			refreshAllButton.addEventListener("click", () => { this._refreshAllManagers(); });
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
		this.cancelBlinkWindowTitle();
		
		// Update "previously loaded" messages
		for(let i = 0; i < this.rcmList.length; i++) {
			this.rcmList[i].lastLoadDateTime = this.rcmList[i].lastLoadDateTimeActual;
		}
	}
	
	/***************************
	* Additional Loading
	****************************/
	// Replace all i18n.MESSAGES with that of the language specified.
	// TODO: Should probably have support to check if it ran into loading issues.
	private _loadLangMessages() : void {
		let tLangLoadAjaxPromises = [];

		// Loads the messages and updates the i18n with the new values (max messages that can be passed is 50)
		function tRCM_loadLangMessage(pMessages) {
			let tScriptPath = ConstantsApp.useLocalSystemMessages ? ConstantsApp.config.wgServer + ConstantsApp.config.wgScriptPath : "http://community.wikia.com";
			let url = `${tScriptPath}/api.php?action=query&format=json&meta=allmessages&amlang=${i18n.defaultLang}&ammessages=${pMessages}`;
			mw.log(url.replace("&format=json", "&format=jsonfm"));

			return $.ajax({ type: 'GET', dataType: 'jsonp', data: {}, url: url,
				success: (pData) => {
					if (typeof pData === 'undefined' || typeof pData.query === 'undefined') return; // Catch for wikis that restrict api access.
					$.each( (pData.query || {}).allmessages, (index, message) => {
						if( message.missing !== '' ) {
							i18n.MESSAGES[message.name] = message['*'];
						}
					});
				}
			});
		}

		// Loads messages in increments of 50.
		let tMessages = "", tNumLoading = 0;
		Object.keys(i18n.MESSAGES).forEach((key) => {
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
		$.when(...tLangLoadAjaxPromises)
		.done((pData) => {
			this._onAllLangeMessagesLoaded();
		})
		.fail((pData) => {
			if(this.numLangLoadErrors < 15) {
				this.numLangLoadErrors++;
				this._loadLangMessages();
			} else {
				mw.log("ERROR: "+JSON.stringify(pData));
				alert(`ERROR: RecentChanges text not loaded properly (${this.numLangLoadErrors} tries); defaulting to English.`);
				this._onAllLangeMessagesLoaded();
			}
		})
		;
	}
	
	private _onAllLangeMessagesLoaded() : void {
		this.langLoaded = true;
		for (let i = 0; i < this.onLangLoadCallbacks.length; i++) {
			this.onLangLoadCallbacks[i]();
		}
		this.onLangLoadCallbacks = [];
	}
	
	/***************************
	* Call to blink the window title (only while window doesn't have focus).
	****************************/
	private _blinkInterval:number;
	private _originalTitle:string;
	
	blinkWindowTitle(pTitle:string) : void {
		this.cancelBlinkWindowTitle();
		this._originalTitle = document.title;
		this._blinkInterval = setInterval(() => {
			document.title = document.title == this._originalTitle ? (pTitle+" - "+this._originalTitle) : this._originalTitle;
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
	}
}
// We want Main to be an instance class.
export default new Main();
