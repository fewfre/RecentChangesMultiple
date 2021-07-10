import RCMManager from "./RCMManager";
import Global from "./Global";
import Utils from "./Utils";
import i18n, { legacyMessagesRemovedContent } from "./i18n";
import RCParams from "./types/RCParams";
import RCMModal from "./RCMModal";
import addMakeCollapsible from "./lib/makeCollapsible";

let $ = window.jQuery;
let mw = window.mediaWiki;
// @ts-ignore
let Notification = window.Notification;

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
		mw.loader.using(['mediawiki.util', 'mediawiki.language', 'mediawiki.user', 'user.options']).done(()=>{
			Global.init(pScriptConfig);
			
			// Needed due to UCP breaking default "debug" option, thus disabling mw.log messages
			if(Global.debug) {
				mw.log = <any>console.log;
			}
			
			$(document).ready($.proxy(this._ready, this));
			$(document).on("unload", $.proxy(this._unload, this));
			
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
		if(tDataset.localsystemmessages === "false") { Global.useLocalSystemMessages = false; }
		// Set load delay (needed for scripts that load large numbers of wikis)
		if(tDataset.loaddelay) { Global.loadDelay = tDataset.loaddelay; }
		if(tDataset.timezone) { Global.timezone = tDataset.timezone.toLowerCase(); }
		if(tDataset.timeformat) { Global.timeFormat = tDataset.timeformat.toLowerCase(); }
		// Unless specified, hide the rail to better replicate Special:RecentChanges
		if(tDataset.hiderail !== "false") { document.querySelector("body").className += " rcm-hiderail"; }
		tDataset = null;
		tFirstWrapper = null;
		
		/***************************
		* Preload
		****************************/
		let tLoadPromises = [];
		
		// Load the css for module
		Utils.newElement("link", { rel:"stylesheet", type:"text/css", href:"/load.php?mode=articles&articles=u:dev:MediaWiki:RecentChangesMultiple.css&only=styles" }, document.head);
		
		// Load dev helper scripts
		tLoadPromises[tLoadPromises.length] = this.importArticles({
			type: 'script',
			articles: [
				'u:dev:MediaWiki:I18n-js/code.js',
				'u:dev:MediaWiki:Modal.js',
			]
		});
		RCMModal.init();
		
		// Detect when all language loading is done - don't hold up script though, so user sees progress quicker
		// Load Translations from Wiki database.
		tLoadPromises[tLoadPromises.length] = this._loadLangMessages();
		// I18n-js loading
		tLoadPromises[tLoadPromises.length] = new Promise<void>((resolve)=>{
			mw.hook('dev.i18n').add(function () {
				// Convert version to a number
				let [,ma,mi,ch] = Global.version.match(/(\d*)\.(\d*)(\w*)/);
				ch = ch ? String("a".charCodeAt(0)-96) : "0";
				let versionAsNum = Number([ma,mi,ch].map(n=>Utils.pad(n, 3, "0")).join(""));
				
				window.dev.i18n.loadMessages("RecentChangesMultiple", { cacheVersion:versionAsNum, language:i18n.defaultLang, noCache:Global.debug }).done((devI18n) => {
					i18n.devI18n = devI18n;
					resolve();
				});
			});
		});
		
		// Misc Loading - https://www.mediawiki.org/wiki/ResourceLoader/Modules#mw.loader.load
		tLoadPromises[tLoadPromises.length] = mw.loader.using([
			'mediawiki.special.recentchanges', // This does things like allow "fieldset" to collapse in RCMOptions
			'mediawiki.special.changeslist',
			'mediawiki.special.changeslist.enhanced',
			
			'skin.oasis.recentChanges.css',
			
			...(Global.isUcpWiki ? ['ext.fandom.photoGallery.gallery.css'] : []),
			...(Global.isUcpWiki ? ["mediawiki.diff.styles", "skin.oasis.diff.css"] : ['mediawiki.action.history.diff']), // AjaxDiff css
		])
		.then(function(){
			// Fallback support for UCP wiki
			// if(!$.fn.makeCollapsible) {
				addMakeCollapsible();
			// }
		});
		
		/***************************
		* Setup SVG symbols
		***************************/
		$("body").append($( Global.initSymbols() ));

		/***************************
		* Get rcParams from url
		***************************/
		// Options from Special:Preferences > Under the Hood
		let tBaseUserValues:RCParams = {
			"days": mw.user.options.get("rcdays") || 7,
			"limit": mw.user.options.get("rclimit") || 50,
			"hideenhanced": ((mw.user.options.get("usenewrc")==1 ? "0" : "1") || 0)=="1",
			"hideminor": (mw.user.options.get("hideminor") || 0)=="1",
		};
		// Now modify base values with those in url
		this.rcParamsURL = tBaseUserValues; let tParam;
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
		// None of the stuff in this promise prevents _parsePage() from working,
		// So we allow script to continue and only stop the script later on to give user visual input.
		// Workaround (legacy only?) - Seems legacy wikis jQuery doesn't like promises? So make them Deferreds I guess...?
		tLoadPromises = tLoadPromises.map(p=>{ let d = $.Deferred(); p.then(d.resolve); return d; });
		let initDef = $.when(...tLoadPromises);
		this._start(initDef);
	}
	
	private _start(pInitDef:JQueryPromise<any>) : void {
		this._parsePage(document, pInitDef);

		/***************************
		* Listen for new Managers
		***************************/
		// Add additional Managers that are needed from new content added to that page (usually after a VisualEditor edit)
		setTimeout(() => {
			mw.hook('wikipage.content').add((pSection) => {
				if(pSection[0].querySelector('.rc-content-multiple, #rc-content-multiple')) {
					this._parsePage(pSection[0], pInitDef);
				}
			});
		}, 0);
	}
	
	private _parsePage(pCont:HTMLElement|Document, pInitDef:JQueryPromise<any>) : void {
		let tWrappers = <HTMLElement[]><any>pCont.querySelectorAll('.rc-content-multiple, #rc-content-multiple');
		Utils.forEach(tWrappers, (pNode, pI, pArray) => {
			if((<any>pNode).rcm_wrapper_used) { mw.log("[Main](_parsePage) Wrapper already parsed; exiting."); return; }
			(<any>pNode).rcm_wrapper_used = true;
			let tRCMManager = new RCMManager(pNode, pI);
			this.rcmList.push( tRCMManager );
			
			tRCMManager.resultCont.innerHTML = `<center>${Global.getLoaderLarge()}</center>`;
			// Don't init managers until all translation info is loaded.
			pInitDef.done(()=>{
				tRCMManager.init();
			});
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
	private _loadLangMessages() : Promise<void> {
		return new Promise((resolve, reject)=>{
			let tLangLoadAjaxPromises = [];
			let tMissing = [];

			// Loads the messages and updates the i18n with the new values (max messages that can be passed is 50)
			function tRCM_loadLangMessage(pMessages) {
				let tScriptPath = Global.useLocalSystemMessages ? Global.config.wgServer + Global.config.wgScriptPath : "//community.fandom.com";
				let url = `${tScriptPath}/api.php?action=query&format=json&meta=allmessages&amlang=${i18n.defaultLang}&ammessages=${pMessages}`;
				Utils.logUrl("", url);

				return $.when(
					// Normal
					$.ajax({ type: 'GET', dataType: 'jsonp', data: {}, url: url,
						success: (pData) => {
							if (typeof pData === 'undefined' || typeof pData.query === 'undefined') return; // Catch for wikis that restrict api access.
							$.each( (pData.query || {}).allmessages, (index, message) => {
								if( message.missing !== '' ) {
									i18n.MESSAGES[message.name] = message['*'];
								} else {
									if(legacyMessagesRemovedContent.indexOf(message.name) == -1)
										tMissing.push([message.name, i18n.MESSAGES[message.name]]);
								}
							});
						}
					}),
					// Manually fetch LEGACY messages, even on a UCP wiki.
					(!Global.isUcpWiki ? null : (()=>{
						// Whatever wiki that still uses the legacy system
						let legacyWikiPath = "//community.fandom.com";
						let legacyMessages = legacyMessagesRemovedContent;
						
						let url2 = `${legacyWikiPath}/api.php?action=query&format=json&meta=allmessages&amlang=${i18n.defaultLang}&ammessages=${legacyMessages.join("|")}`;
						Utils.logUrl("Legacy Messages", url2);
				
						return $.ajax({ type: 'GET', dataType: 'jsonp', data: {}, url: url2,
							success: (pData) => {
								if (typeof pData === 'undefined' || typeof pData.query === 'undefined') return; // Catch for wikis that restrict api access.
								$.each( (pData.query || {}).allmessages, (index, message) => {
									if( message.missing !== '' ) {
										i18n.MESSAGES[message.name] = message['*'];
									} else {
										tMissing.push([message.name, i18n.MESSAGES[message.name]]);
									}
								});
							}
						})
					})()),
				);
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
				resolve();
				if(tMissing.length > 0) {
					console.log("[RCM] missing messages: ", tMissing);
				}
			})
			.fail((pData) => {
				if(this.numLangLoadErrors < 15) {
					this.numLangLoadErrors++;
					this._loadLangMessages().then(resolve)["catch"](reject); // NEED to do ["catch"] as otherwise fandom throws a hissy fit
				} else {
					mw.log("ERROR: "+JSON.stringify(pData));
					alert(`ERROR: RecentChanges text not loaded properly (${this.numLangLoadErrors} tries); defaulting to English.`);
					resolve();
				}
			});
		});
	}
	
	/***************************
	* Call to blink the window title (only while window doesn't have focus).
	****************************/
	private _blinkInterval:number;
	private _originalTitle:string;
	
	blinkWindowTitle(pTitle:string) : void {
		this.cancelBlinkWindowTitle();
		this._originalTitle = document.title;
		this._blinkInterval = window.setInterval(() => {
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
		pOptions.icon = pOptions.icon || Global.NOTIFICATION_ICON;
		let tNotification = new Notification(pTitle, pOptions);
		this._notifications.push(tNotification);
		// Make sure on click it brings you back to page (needed for Chrome) https://stackoverflow.com/a/40964355/1411473
		tNotification.onclick = function () {
			parent.focus();
			window.focus(); //just in case, older browsers
			this.close();
		};
		tNotification = null;
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
	
	importArticles({ type, articles }:{ type:string, articles:string[] }) : Promise<any> {
		if(Global.isUcpWiki) {
			return window.importArticles({
				type: 'script',
				articles
			})
		} else {
			// On legacy wikis, importArticles doesn't have a way to know when it is finished
			return new Promise<void>((resolve)=>{
				$.when(...articles.map(name=>$.getScript(`/load.php?mode=articles&articles=${name}&only=scripts`))).done(function(){
					mw.hook('dev.i18n').add(function (i18n) {
						resolve();
					});
				});
			});
		}
	}
}
// We want Main to be an instance class.
export default new Main();
