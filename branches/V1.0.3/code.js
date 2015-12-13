//<syntaxhighlight lang="javascript">
/*
 * Script: RecentChangesMultiple
 * Author: Fewfre
 *
 * Uses ajax loading of atom feeds to show the RecentChanges of multiple wikis all on one page.
 *
 * TERTIARY / OTHER / MAYBE?
 *Use "WikiaRss.js" instead of YQL?
 *Display wikis as they are loaded? (semi pain to do, but cool?)
 * * if not: Add option to show all currently loaded wikis when not all wikis can be loaded.
 *Add support for "rollback" if possible to create the uniq id for it
 */

(function($, document, mw){
	"use strict";
	
	//######################################
	// Pre-script checks
	//######################################
	var module = (window.dev = window.dev || {}).RecentChangesMultiple = window.dev.RecentChangesMultiple || {};
	
	// Don't create/run this code twice on the same page
	if(module.loaded) { console.log("Script already loaded; exiting."); return; }
	// Find rcm container, and exit if not found (needed for everything else)
	if(document.querySelector('#rc-content-multiple') == undefined) { console.log('No "Recent Changes Multiple" container found; exiting.'); return; }
	// Mark script as loaded
	module.loaded = true;
	
	// BACKUP for mobile / Mercury skin - only meant to prevent script from crashing
	mw = mw || {
		config: {
			get: function(pStr){
				return {
					"wgUserName":"_",
					"wgMonthNames":Object.freeze([null, "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]),
					"wgUserLanguage":"en",
				}[pStr];
			}
		}
	};
	
	//######################################
	// Constants
	//######################################
	module.version = "1.0.3";
	module.debug = module.debug != undefined ? module.debug : false;
	var FAVICON_BASE = "http://www.google.com/s2/favicons?domain=";
	var AUTO_REFRESH_LOCAL_STORAGE_ID = "RecentChangesMultiple-autorefresh";
	var IP_REGEX = /^(([1-9]?\d|1\d\d|25[0-5]|2[0-4]\d)\.){3}([1-9]?\d|1\d\d|25[0-5]|2[0-4]\d)$/; // http://stackoverflow.com/a/19498244/1411473
	/*
	 * TEXT - Custom text used in the script to explain what's happening. {#} means that the script will input a number / word / url here on the fly, and is expected / potentially important.
	 *        This i18n is set depending on your local language (en if not available).
	 * RC_TEXT - This contains words used in the actual RC List, same rules as above. Also depends on local language (en if not available). Specific text found in Special:RecentChanges.
	 * PARSE - all the VERY precise text parsing that is requires to properly format RCs. Script can run without support, but will be weird.
	 *         Depends on the &lang= for a specific wiki (uses local language by default). Even if &lang= is set to something different than local, &lang= is ONLY used for parsing.
	 * None of these will translate the RCs themselves (as I hope is obvious), but aims at translating the text / parsing for various languages
	 */
	var i18n = {
		TEXT: {
			en: { // ENGLISH
				// Errors
				incorrectFormatLink : "'{0}' is an incorrect format. Please do not include 'http://' or anything after or including the first '/'.",
				errorLoadingSyntaxHang : "Error loading [{0}] ({1} tries). Please correct syntax (or refresh script to try again).",
				errorLoadingConnection : "Error loading [{0}] ({1} tries). Most likely a connection issue; refresh script to try again.",
				tryMoreTimes : "Try {0} more times",
				// Notifications
				loading : "Loading/Sorting...",
				refresh : "Refresh",
				timeStamp : "Recent Changes downloaded at: {0}",
				changesAdded : " - [{0} Recent Changes added]",
				// Basics
				wikisLoaded : "Wikis Loaded: ",
				previouslyLoaded : "Previously loaded:",
				autoRefresh : "Auto Refresh",
				autoRefreshTooltip : "Automatically refreshes Recent Changes every {0} seconds",
				footer : "Version {0} by {1}",
				// Diff Module
				diffModuleTitle : "Diff Viewer",
				diffModuleOpen : "Open diff",
				diffModuleUndo : "Undo edit",
				diffModuleClose : "Close",
			},
			pl: { // Polski (POLISH) - @author: Szynka013, Matik7
				// Errors
				incorrectFormatLink : "'{0}' to nieodpowiedni format. Proszę nie używać elementu 'http://', niczego po nim oraz pierwszego '/'.",
				errorLoadingSyntaxHang : "Błąd podczas wczytywania [{0}] (prób: {1}) Proszę poprawić syntax (lub odświeżyć skrypt by spróbować ponownie).",
				errorLoadingConnection : "Błąd podczas wczytywania [{0}] (prób: {1}). Najprawdopodobniej jest to błąd z połączeniem, odśwież skrypt by spróbować ponownie.",
				tryMoreTimes : "Spróbuj {0} razy",
				// Notifications
				loading : "Ładowanie/Sortowanie...",
				refresh : "Odśwież",
				timeStamp : "Ostatnie zmiany pobrane o: {0}",
				changesAdded : " - [{0} dodanych ostatnich zmian]",
				// Basics
				wikisLoaded : "Załadowane wiki: ",
				previouslyLoaded : "Poprzednio załadowane:",
				autoRefresh : "Automatyczne odświeżanie",
				autoRefreshTooltip : "Automatyczne odświeżanie ostatnich zmian co każde {0} sekund",
				footer : "Wersja {0} stworzona przez {1}",
				// Diff Module
				diffModuleTitle : "Podgląd zmian",
				diffModuleOpen : "Pokaż zmiany",
				diffModuleUndo : "Cofnij zmiany",
				diffModuleClose : "Zamknij",
			},
		},
		RC_TEXT: {
			en: { // ENGLISH
				comment : "Comment", // Comment (PAGENAME)
				comments : "Comments", // Comments (PAGENAME) (numChanges)
				numChanges : "{0} changes",
				cur : "cur",
				prev : "prev",
				hist : "hist",
				diff : "diff",
				block : "block",
				wall : "wall",
				contribs : "contribs",
				thread : "thread",
				usersWall : "{0}'s wall",
				onUsernamesWall : "{0} on {1}{2}'s wall", // {1} is start of link, {2} is page name.
				threadOnTheBoard : "{0} on the {1}{2} Board", // {1} is start of link, {2} is page name.
				editCreatedNewPageTooltip : "This edit created a new page",
				showDetailsTooltip : "Show details (requires JavaScript)",
				hideDetailsTooltip : "Hide details",
				// Logs
				logAbuseFilter : "Abuse Filter log",
				logBlock : "Block log",
				logChatBan : "Chat ban log",
				logDeletion : "Deletion log",
				logImport : "Import log",
				logMaps : "Maps log",
				logMerge : "Merge log",
				logMoved : "Move log",
				logProtection : "Protection log",
				logUpload : "Upload log",
				logUserAvatar : "User avatar log",
				logUserCreation : "User creation log",
				logUserRename : "User rename log",
				logUserRights : "User rights log",
				logWikiFeatures : "Wiki Features log",
				// Wall
				wallArchive : "closed {0} on {1}",
				wallRemove : "removed {0} from {1}",
				wallDelete : "deleted {0} from {1}",
				wallRestore : "restored {0} to {1}",
				wallReopen : "reopened {0} on {1}",
				// Boards
				boardArchive : "closed {0} from {1}",
				boardRemove : "removed {0} from the {1}",
				boardDelete : "deleted {0} from {1}",
				boardRestore : "restored {0} to {1}",
				boardReopen : "reopened {0} from {1}",
				// Custom Text - Does not appear in the real Special:RecentChangesMultiple
				noValidDiffSizeTooltip : "Difference table not included, size difference cannot be found for this edit.", // Custom tooltip for when diff size cannot be displayed
				logAddingCategories : "<i>Categories Added</i> log", // Custom: This is not a real log, but an optional one used by the script. <i> optional helps distinct it since is doesn't link to log page.
				addedCategoriesTo : "added categories to", // Custom feature of RCM
			},
			pl: { // Polski (POLISH)
				comment : "Komentarz", // Comment (PAGENAME)
				comments : "Komentarze", // Comments (PAGENAME) (numChanges)
				numChanges : "{0} zmian(y)",
				cur : "różn.",
				prev : "poprz.",
				hist : "hist.",
				diff : "różn.",
				block : "blokady",
				wall : "tablica",
				contribs : "wkład",
				thread : "wątek",
				usersWall : "tablicy użytkownika {0}",
				onUsernamesWall : "{0} na {1}tablicy użytkownika {2}", // {1} is start of link, {2} is page name.
				threadOnTheBoard : "{0} na {1}subforum {2}", // {1} is start of link, {2} is page name.
				editCreatedNewPageTooltip : "W tej edycji utworzono nową stronę",
				showDetailsTooltip : "Pokaż szczegóły (wymagany JavaScript)",
				hideDetailsTooltip : "Ukryj szczegóły",
				// Logs
				logAbuseFilter : "Rejestr filtru nadużyć",
				logBlock : "Historia blokad",
				logChatBan : "Rejestr blokad na czacie",
				logDeletion : "Usunięte",
				logImport : "Rejestr importu",
				logMaps : "Mapy",
				logMerge : "Scalone",
				logMoved : "Przeniesione",
				logProtection : "Zabezpieczone",
				logUpload : "Przesłane",
				logUserAvatar : "Awatary",
				logUserCreation : "Nowi użytkownicy",
				logUserRename : "Zmiany nazw użytkowników",
				logUserRights : "Uprawnienia",
				logWikiFeatures : "Rejestr Rozszerzeń Wiki",
				// Wall
				wallArchive : "zamknął/zamknęła {0} on {1}",
				wallRemove : "usunął/usunęła wątek {0} z {1}",
				wallDelete : "skasował(a) {0} z {1}",
				wallRestore : "przywrócił(a) odpowiedź w {0} na {1}",
				wallReopen : "reaktywował(a) wątek {0} w {1}",
				// Boards
				boardArchive : "zamknął/zamknęła wątek {0} w {1}",
				boardRemove : "usunął/usunęła wątek z {0} na {1}",
				boardDelete : "skasował(a) wątek {0} z {1}",
				boardRestore : "przywrócił(a) wątek {0} na {1}",
				boardReopen : "reaktywował(a) wątek {0} w {1}",
				// Custom Text - Does not appear in the real Special:RecentChangesMultiple
				/*UNKNOWN*/noValidDiffSizeTooltip : "Difference table not included, size difference cannot be found for this edit.", // Custom tooltip for when diff size cannot be displayed
				/*UNKNOWN*/logAddingCategories : "<i>Categories Added</i> log", // Custom: This is not a real log, but an optional one used by the script. <i> optional helps distinct it since is doesn't link to log page.
				addedCategoriesTo : "dodano kategorie do", // Custom feature of RCM
			},
		},
		PARSE: {
			en: { // ENGLISH
				newPageText : "Created page with \"", // Detect New Pages
				addCategories : "Adding categories", // Detect category added (if feature is on)
				// Namespaces
				nameSpaceThread : "Thread",
				namespaceBoardThread : "Board Thread", // Detect Board Thread vs Message Wall. This text is the "namespace" shown on the atom feed.
				// A dictionary of text used in atom summaries that signify log type.
				logs: {
					ABUSE_FILTER    :["</a> modified <a"],
					BLOCK           :["</a> blocked <a", "</a> changed block settings for <a", "</a> unblocked <a"],
					CHAT_BAN        :["</a> banned <a", "</a> unbanned <a", "</a> changed ban settings for <a"],
					DELETION        :["</a> deleted page <a", "</a> restored page <a"],
					IMPORT          :["</a> imported <a"],
					MAPS            :["</a> created new map <a", "</a> deleted map <a",
										"</a> created new pin category for <a", "</a> updated pin category for <a", "</a> deleted pin category for <a",
										"</a> created new pin for <a", "</a> updated pin for <a", "</a> deleted pin for <a"
									],
					MERGE           :["</a> merged <a"],
					MOVED           :["</a> moved page <a"],
					PROTECTION      :[" protected \"", " changed protection level for \"", " moved protection settings from \"", " removed protection from \""],
					UPLOAD          :["</a> uploaded \"", "</a> uploaded a new version of \""],
					USER_AVATAR     :["</a> User avatar added or updated"],
					USER_CREATION   :["</a> created a user account"],
					USER_RENAME     :["</a> renameuser The user \""],
					USER_RIGHTS     :["</a> changed group membership for <a"],
					WIKI_FEATURES   :["</a> wikifeatures set extension option: "],
				},
			},
			fr: { // Français (FRENCH)
				newPageText : "Page créée avec «", // Detect New Pages
				addCategories : "Ajout de catégories", // Detect category added (if feature is on)
				// Namespaces
				nameSpaceThread : "Fil",
				namespaceBoardThread : "Fil de forum", // Detect Board Thread vs Message Wall. This text is the "namespace" shown on the atom feed.
				// A dictionary of text used in atom summaries that signify log type.
				logs: {
					ABUSE_FILTER    :["</a> a modifié <a"],
					BLOCK           :["</a> a bloqué <a", "</a> a modifié les paramètres du blocage de <a", "</a> a débloqué <a"],
					CHAT_BAN        :["</a> a banni <a", "</a> a levé le bannissement du tchat de <a", "</a> a modifié les paramètres de bannissement pour <a"],
					DELETION        :["</a> a supprimé la page <a", "</a> a restauré la page <a"],
					IMPORT          :["</a> a importé <a"],
					MAPS            :["</a> a créé la carte <a", "</a> a supprimé la carte <a",
										"</a> a créé une catégorie pour <a", "</a> a mis à jour une catégorie de <a", "</a> a supprimé une catégorie de <a",
										"</a> a créé un marqueur pour <a", "</a> a mis à jour un marqueur de <a", "</a> a supprimé un marqueur de <a"
									],
					MERGE           :["</a> a fusionné <a"],
					MOVED           :["</a> a renommé la page <a"],
					PROTECTION      :[" a protégé «", " a modifié le niveau de protection de «", " a supprimé la protection de «", " a déplacé les paramètres de protection depuis «"],
					UPLOAD          :["</a> a importé «", "</a> a importé une nouvelle version de «"],
					USER_AVATAR     :["</a> a ajouté ou modifié son avatar"],
					USER_CREATION   :["</a> a créé un compte utilisateur"],
					USER_RENAME     :["</a> renameuser L’utilisateur «"],
					USER_RIGHTS     :["</a> a modifié les droits de l’utilisateur <a"],
					WIKI_FEATURES   :["</a> wikifeatures set extension option: "],
				},
			},
			pl: { // Polski (POLISH)
				newPageText : "Dodano nową stronę „", // Detect New Pages
				addCategories : "Dodawanie kategorii", // Detect category added (if feature is on)
				// Namespaces
				nameSpaceThread : "Wątek",
				namespaceBoardThread : "Wątek forum", // Detect Board Thread vs Message Wall. This text is the "namespace" shown on the atom feed.
				// A dictionary of text used in atom summaries that signify log type.
				logs: {
					ABUSE_FILTER    :["</a> zmodyfikował filtr <a"],
					BLOCK           :["</a> zablokował <a", "</a> zmienił ustawienia blokady dla <a", "</a> odblokował <a"],
					CHAT_BAN        :["</a> zablokował(a) <a", "</a> odblokował(a) użytkownika <a", "</a> zmienił(a) ustawienia blokady użytkownika <a"],
					DELETION        :["</a> usunął stronę <a", "</a> odtworzył stronę <a"],
					IMPORT          :["</a> zaimportował <a"],
					MAPS            :["</a> stworzył mapę <a", "</a> usunął mapę <a",
										"</a> stworzył kategorię punktów dla mapy <a", "</a> zaktualizował kategorię punktów dla mapy <a", "</a> usunął kategorię punktów dla mapy <a",
										"</a> stworzył nowy punkt na mapie <a", "</a> zaktualizował punkt na mapie <a", "</a> usunął punkt na mapie <a"
									],
					MERGE           :["</a> scalił stronę <a"],
					MOVED           :["</a> przeniósł stronę <a"],
					PROTECTION      :[" zabezpieczył „", " zmienił poziom zabezpieczenia „", " przeniósł ustawienia zabezpieczeń z „", " odbezpieczył „"],
					UPLOAD          :["</a> przesłał <a", "</a> przesłał(a) nową wersję pliku „"],
					USER_AVATAR     :["</a> zmiana lub dodanie avatara"],
					USER_CREATION   :["</a> utworzył konto użytkownika"],
					USER_RENAME     :["</a> renameuser Nazwa użytkownika „"],
					USER_RIGHTS     :["</a> zmienił przynależność <a"],
					WIKI_FEATURES   :["</a> wikifeatures set extension option: "],
				},
			},
			de: { // Deutsch (GERMAN)
				newPageText : "Die Seite wurde neu angelegt: „", // Detect New Pages
				addCategories : "Kategorien hinzufügen", // Detect category added (if feature is on)
				// Namespaces
				nameSpaceThread : "Diskussionsfaden",
				namespaceBoardThread : "Forum-Diskussionsfaden", // Detect Board Thread vs Message Wall. This text is the "namespace" shown on the atom feed.
				// A dictionary of text used in atom summaries that signify log type.
				logs: {
					ABUSE_FILTER    :["</a> änderte <a"],
					BLOCK           :["</a> sperrte „<a", "</a> änderte die Sperre von „<a", "</a> hob die Sperre von „<a"],
					CHAT_BAN        :["</a> verbannte <a", "</a> entbannte <a", "</a> änderte Chat-Bann von <a"],
					DELETION        :["</a> löschte Seite <a", "</a> stellte Seite <a"],
					IMPORT          :["</a> importierte <a"],
					MAPS            :["</a> Neue Karte <a", "</a> Karte <a",
										"</a> Neue Marker-Kategorie für <a", "</a> Marker-Kategorie auf <a", "</a> Marker-Kategorie für <a",
										"</a> Neuen Marker für <a", "</a> Marker auf Karte <a", "</a> Marker für <a"
									],
					MERGE           :["</a> vereinigte <a"],
					MOVED           :["</a> verschob Seite <a"],
					PROTECTION      :[" schützte „", " änderte den Schutz von „", " übertrug den Seitenschutz von „", " hob den Schutz von „"],
					UPLOAD          :["</a> lud „", "</a> lud eine neue Version von „"],
					USER_AVATAR     :["</a> hat einen Avatar hinzugefügt oder geändert"],
					USER_CREATION   :["</a> erstellte ein Benutzerkonto"],
					USER_RENAME     :["</a> renameuser Der Benutzer „"],
					USER_RIGHTS     :["</a> änderte die Benutzerrechte für „<a"],
					WIKI_FEATURES   :["</a> wikifeatures set extension option: "],
				},
			}
		},
	}
	
	// Namespaces
	var gApp, gUtils, gHelper;
	
	module.refresh = function() { gApp.refresh(); } // Encase it needs to be accessed outside the script for some reason.
	
	//######################################
	// Initialization
	//######################################
	gApp = {
		LOADING_ERROR_RETRY_NUM_INC: 5, // {int}
		
		// HTML Elements/Nodes
		resultCont: null, // {HTMLElement}
		statusNode: null, // {HTMLElement}
		wikisNode: null, // {HTMLElement}
		resultsNode: null, // {HTMLElement}
		footerNode: null, // {HTMLElement}
		
		// Data about the info supplied for the script to use.
		timezone: null, // {string}
		hideusers: null, // {array}
		onlyshowusers: null, // {array}
		userrights: null, // {object}
		chosenWikis: null, // {array}
		
		recentChangesEntries: null, // {array} Array of either RecentChange/RecentChangeList objects.
		ajaxCallbacks: null, // {array} Array of functions that stores info retrieved from ajax, so that the script can run without worry of race conditions.
		wikisLeftToLoad: null, // {int} Wikis left to load via ajax
		totalWikisToLoad: null, // {int} Totally wikis there are to load (use for "% left")
		loadingErrorRetryNum: null, // {int} Number of tries to load a wiki before complaining (encase it's due to server, not invalid link)
		erroredWikis: null, // {array} Array of wikis that have errored more than expected times; kept in list to be tried more times should user wish
		ajaxID: null, // {int} A unique ID for all ajax data for a given "load" (used to prevent previously requested data from mixing with currently requested data after "Refresh" is hit after a script error)
		itemsAdded: null, // {int} Number off items added to screen AFTER load.
		itemsToAddTotal: null, // {int} Total number if items to add to the screen
		lastLoadDateTime: null, // {Date} the last time everything was loaded.
		autoRefreshTimeoutID: null, // {int} ID for the auto refresh timeout.
		autoRefreshTimeoutNum: 60000, // {int} number of milliseconds to wait before refreshing.
		
		init: function() {
			gApp.resultCont = document.querySelector('#rc-content-multiple');
			
			gApp.defaultLang = gApp.resultCont.dataset.lang ? gApp.resultCont.dataset.lang.toLowerCase() : mw.config.get('wgUserLanguage');
			i18n.TEXT = $.extend(i18n.TEXT.en, i18n.TEXT[gApp.defaultLang]);
			i18n.RC_TEXT = $.extend(i18n.RC_TEXT.en, i18n.RC_TEXT[gApp.defaultLang]);
			
			gApp.timezone = gApp.resultCont.dataset.timezone ? gApp.resultCont.dataset.timezone.toLowerCase() : 'utc';
			
			gApp.autoRefreshTimeoutNum = (gApp.resultCont.dataset.autorefresh ? parseInt(gApp.resultCont.dataset.autorefresh) : 60) * 1000;
			
			gApp.groupCategoryAdded = gApp.resultCont.dataset.groupaddcategories === "true";
			
			gApp.hideusers = [];
			if(gApp.resultCont.dataset.hideusers) { gApp.hideusers = gApp.resultCont.dataset.hideusers.replace("_", " ").split(","); }
			if(gApp.resultCont.dataset.params && gApp.resultCont.dataset.params.indexOf("hidemyself=") > -1 && gApp.resultCont.dataset.params.split("hidemyself=")[1][0] == "1") {
				var tUsername = mw.config.get("wgUserName"); if(tUsername) { gApp.hideusers.push(tUsername); }
			}
			gApp.hideusers.forEach(function(o,i,a){ a[i] = a[i].trim(); });
			
			gApp.onlyshowusers = [];
			if(gApp.resultCont.dataset.onlyshowusers) { gApp.onlyshowusers = gApp.resultCont.dataset.onlyshowusers.replace("_", " ").split(","); }
			gApp.onlyshowusers.forEach(function(o,i,a){ a[i] = a[i].trim(); });
			
			gApp.userrights = { admin:false, rollback:false };
			if(gApp.resultCont.dataset.userrights) {
				gApp.userrights.admin = gApp.resultCont.dataset.userrights.indexOf("admin") > -1;
				gApp.userrights.rollback = gApp.resultCont.dataset.userrights.indexOf("rollback") > -1;
			}
			
			gApp.chosenWikis = [];
			gUtils.forEach(gApp.resultCont.querySelectorAll("li"), function(node){
				var tWikiData = node.textContent.replace(/(\r\n|\n|\r)/gm, "").split("&"), tWikiDataSplit; // Need to check for new lines due to how wikis create lists.
				var tWikiObj = { url:tWikiData[0], subdir:"/wiki/", firstSeperator:"?" };
				if(tWikiObj.url.indexOf("/") > -1) {
					gApp.resultCont.innerHTML = "<div style='color:red; padding:4px 5px; background:rgba(0,0,0,0.1);'>"+ gUtils.formatString(i18n.TEXT.incorrectFormatLink, tWikiObj.url)+"</div>";
					throw "Incorrect format";
				}
				for(var i = 1; i < tWikiData.length; i++) {
					tWikiDataSplit = tWikiData[i].split("=");
					if(tWikiDataSplit.length > 1) {
						if(tWikiDataSplit[0] == "hideusers") {
							tWikiObj["hideusers"] = tWikiDataSplit[1].replace("", " ").split(",");
							tWikiObj["hideusers"].forEach(function(o,i){ tWikiObj["hideusers"][i] = tWikiObj["hideusers"][i].trim(); });
						} else if(tWikiDataSplit[0] == "onlyshowusers") {
							tWikiObj["onlyshowusers"] = tWikiDataSplit[1].replace("", " ").split(",");
							tWikiObj["onlyshowusers"].forEach(function(o,i){ tWikiObj["onlyshowusers"][i] = tWikiObj["onlyshowusers"][i].trim(); });
						} else if(tWikiDataSplit[0] == "subdir") {
							var indexphptitle = "";
							if(tWikiDataSplit[1].indexOf("--indexphptitle") > -1) {
								indexphptitle = "index.php?title=";
								tWikiObj.firstSeperator = "&";
								tWikiDataSplit[1] = tWikiDataSplit[1].replace("--indexphptitle", "");
							}
							if(tWikiDataSplit[1] == "root") {
								tWikiObj["subdir"] = "/";
							} else if(tWikiDataSplit[1] == "") {
								// skip
							} else {
								tWikiObj["subdir"] = "/"+tWikiDataSplit[1]+"/";
							}
							tWikiObj["subdir"] += indexphptitle;
						} else if(tWikiDataSplit[0] == "userrights") {
							tWikiObj["userrights"] = { admin:false, rollback:false };
							tWikiObj["userrights"].admin = tWikiDataSplit[1].indexOf("admin") > -1;
							tWikiObj["userrights"].rollback = tWikiDataSplit[1].indexOf("rollback") > -1;
						} else if(tWikiDataSplit[0] == "lang") {
							if(i18n.PARSE[ tWikiDataSplit[1] ] != undefined) {
								tWikiObj["lang"] = tWikiDataSplit[1];
							}
						} else {
							tWikiObj[tWikiDataSplit[0]] = tWikiDataSplit[1];
						}
					}
				}
				// If &lang= is not set, attempt to detect the wiki based on the subdomain (ex: "fr.") if the language is supported.
				if(tWikiObj.lang == undefined) {
					tWikiObj.lang = "en";
					if(i18n.PARSE[gApp.defaultLang] != undefined) {
						tWikiObj.lang = gApp.defaultLang;
					}
					Object.keys(i18n.PARSE).some(function (key) {
						if(tWikiObj.url.indexOf(key+".") == 0) {
							tWikiObj.lang = key;
							return true;
						}
						return false;
					});
				}
				gApp.chosenWikis.push(tWikiObj);
			});
			
			gApp.ajaxID = 0;
			gApp.resultCont.innerHTML = "";
			gApp.statusNode = gUtils.newElement("div", { id:"rcm-status" }, gApp.resultCont);
			gApp.wikisNode = gUtils.newElement("div", { id:"rcm-wikis" }, gApp.resultCont);
			gApp._showUpdateMessage();
			gApp.resultsNode = gUtils.newElement("div", { id:"rcm-results", className:"rc-conntent" }, gApp.resultCont);
			gApp.footerNode = gUtils.newElement("div", { id:"rcm-footer" }, gApp.resultCont);
			
			gUtils.newElement("link", { rel:"stylesheet", type:"text/css", href:"/load.php?mode=articles&articles=u:dev:RecentChangesMultiple/stylesheet.css&only=styles" }, document.head);
			
			if(gApp.resultCont.dataset.hiderail !== "false") {
				var tRail;
				if(tRail = document.querySelector("#WikiaRail")) {
					tRail.style.visibility = "hidden";
					document.querySelector("#WikiaMainContentContainer").style.marginRight = "0";
					document.querySelector("#WikiaMainContent").style.width = "100%";
				} else if(tRail = document.querySelector("#recentWikiActivity")) {
					tRail.style.display = "none";
				}
			}
			
			gApp.footerNode.innerHTML = "[<a href='http://dev.wikia.com/wiki/RecentChangesMultiple'>RecentChangesMultiple</a>] " + gUtils.formatString(i18n.TEXT.footer, module.version, "<a href='http://fewfre.wikia.com/wiki/Fewfre_Wiki'>Fewfre</a>");
			
			gApp.start();
		},
		
		_showUpdateMessage: function() {
			// Stop showing in a month or two, but also remember dismissal via localStorage.
			if( new Date("2015-10-15T00:00:00.000Z") > new Date() && (localStorage.getItem("rcm-v1.1.0-hide") != "true") ) {
				var tMessage = gUtils.newElement("div", { className:"rcm-update-message", innerHTML:""
					+"RecentChangesMultiple has gone through a major rewrite."
					+" See changes <a href='http://dev.wikia.com/wiki/RecentChangesMultiple#26_July_2015_-_MediaWiki_API_rewrite_-_V1.1.0'>here</a>."
					+"<br />To use the updated version (recommended), modify your JS import to use code.2.js."
					+"<br />All Wikia wikis should work with update, although other wikis may require the use of '&scriptdir'."
					+"<br />This version (code.js) of the script is depreciated, and will no longer be supported, but may be used if desired. "
				}, gApp.resultCont);
				tMessage.style.cssText = "border:5px double red; padding:2px 6px;";
				
				var tButton = gUtils.newElement("button", { innerHTML:"Dismiss Message" }, tMessage);
				tButton.addEventListener("click", function tRCM_dismissNotice(){
					gUtils.removeElement(tMessage);
					tButton.removeEventListener("click", tRCM_dismissNotice);
					localStorage.setItem("rcm-v1.1.0-hide", "true");
				});
				tButton.style.cssText = "float:right;";
			}
		},
		
		start: function() {
			clearTimeout(gApp.autoRefreshTimeoutID);
			gApp.wikisNode.innerHTML = i18n.TEXT.wikisLoaded;
			
			gApp.recentChangesEntries = [];
			gApp.ajaxCallbacks = [];
			gApp.erroredWikis = [];
			
			gApp.ajaxID++;
			gApp.loadingErrorRetryNum = gApp.LOADING_ERROR_RETRY_NUM_INC;
			gApp.itemsAdded = gApp.itemsToAddTotal = 0;
			
			gUtils.forEach(gApp.chosenWikis, function(wikiInfo){
				gApp.loadWiki(wikiInfo, 0, gApp.ajaxID);
			});
			gApp.totalWikisToLoad = gApp.chosenWikis.length;
			gApp.wikisLeftToLoad = gApp.totalWikisToLoad;
			gApp.statusNode.innerHTML = "<img src='http://slot1.images.wikia.nocookie.net/__cb1421922474/common/skins/common/images/ajax.gif' /> "+i18n.TEXT.loading+" (<span id='rcm-load-perc'>0%</span>)";
		},
		
		refresh: function() {
			gApp.statusNode.innerHTML = "";
			gApp.wikisNode.innerHTML = "";
			gApp.resultsNode.innerHTML = "";
			
			for (var i = 0; i < gApp.recentChangesEntries.length; i++) {
				gApp.recentChangesEntries[i].dispose();
				gApp.recentChangesEntries[i] = null;
			}
			gApp.recentChangesEntries = null;
			gApp.ajaxCallbacks = null;
			
			gApp.start();
		},
		
		// Separate method so that it can be reused if the loading failed
		loadWiki: function(pWikiInfo, pTries, pID) {
			++pTries;
			//console.log("http://"+pWikiInfo.url+pWikiInfo.subdir+"Special:RecentChanges"+pWikiInfo.firstSeperator+"feed=atom&action=purge");
			var url = "http://"+pWikiInfo.url+pWikiInfo.subdir+"Special:RecentChanges"+pWikiInfo.firstSeperator+"feed=atom&action=purge";
			//console.log('http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent('select * from xml where url="'+url+'"') + '&format=json');
			$.getJSON('http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent('select * from xml where url="'+url+'"') + '&format=json', function(data){
				gApp.onWikiLoaded(data, pWikiInfo, pTries, pID, null);
			})
			.fail(function() {
				gApp.onWikiLoaded(null, pWikiInfo, pTries, pID, true);
			});
			
			// JSSnippetsStack.push({
			//  dependencies: ["/extensions/wikia/WikiaRSS/js/WikiaRss.js"],
			//  callback: function(options) {
			//      $.nirvana.sendRequest({
			//          controller: 'WikiaRssExternalController',
			//          method: 'getRssFeeds',
			//          type: 'GET',
			//          format: 'json',
			//          data: {
			//              options: options
			//          },
			//          callback: function (data) {
			//                  console.log(data);
			//              if (data.status == true) {
			//                  console.log(data.html);
			//              } else {
			//                  console.log("loadWiki - error! "+options.url + " --- "+data.error);
			//              }
			//          },
			//          onErrorCallback: function (jqXHR, textStatus, errorThrown) {
			//              console.log("loadWiki - error! "+options.url + " --- "+options.ajaxErrorMsg);
			//          }
			//      });
			//  },
			//  id: "WikiaRss.init",
			//  options: {
			//      "url": "http://"+pWikiInfo.url+pWikiInfo.subdir+"Special:RecentChanges"+pWikiInfo.firstSeperator+"feed=rss&action=purge",
			//      "charset": null,
			//      "maxheads": 5,
			//      "short": false,
			//      "reverse": false,
			//      "dateFormat": false,
			//      "highlight": [],
			//      "filter": [],
			//      "filterout": [],
			//      "nojs": false,
			//      "ajaxErrorMsg": "An error occurred while fetching RSS data. Try again or change your <rss> tag data."
			//  }
			// });
		},
		
		/* Called after a wiki is loaded; will add it to queue, and run it if no other callbacks running. */
		onWikiLoaded: function(e, pWikiInfo, pTries, pID, pFail) {
			if(pID != gApp.ajaxID) return;
			// Make sure results are valid
			if(e == null || e.query.results == null) {
				console.log("Error loading "+pWikiInfo.url+" ("+pTries+"/"+gApp.loadingErrorRetryNum+" tries)");
				//console.log(e);
				if(pTries < gApp.loadingErrorRetryNum) {
					gApp.loadWiki(pWikiInfo, pTries, pID);
				} else {
					if(gApp.erroredWikis.length === 0) {
						gApp.statusNode.innerHTML = "<div class='rcm-error'>"+gUtils.formatString((pFail!=true ? i18n.TEXT.errorLoadingSyntaxHang : i18n.TEXT.errorLoadingConnection), "<span class='errored-wiki'>"+pWikiInfo.url+"</span>", pTries)+"</div>";
						gApp.addRefreshButtonTo(gApp.statusNode);
						gUtils.newElement("button", { innerHTML:gUtils.formatString(i18n.TEXT.tryMoreTimes, gApp.LOADING_ERROR_RETRY_NUM_INC) }, gApp.statusNode)
						.addEventListener("click", function tHandler(e){
							gApp.loadingErrorRetryNum += gApp.LOADING_ERROR_RETRY_NUM_INC;
							e.target.removeEventListener("click", tHandler);
							
							gApp.erroredWikis.forEach(function(obj){
								console.log(obj);
								gApp.loadWiki(obj.wikiInfo, obj.tries, obj.id);
							});
							gApp.erroredWikis = [];
							gApp.statusNode.innerHTML = "<img src='http://slot1.images.wikia.nocookie.net/__cb1421922474/common/skins/common/images/ajax.gif' /> "+i18n.TEXT.loading+" (<span id='rcm-load-perc'>"+gApp.calcLoadPercent()+"%</span>)";
						});
						gApp.erroredWikis.push({wikiInfo:pWikiInfo, tries:pTries, id:pID});
					} else {
						gApp.erroredWikis.push({wikiInfo:pWikiInfo, tries:pTries, id:pID});
						gApp.statusNode.querySelector(".errored-wiki").innerHTML += ", "+pWikiInfo.url;
					}
					//throw "Refresh";
				}
				return;
			}
			
			gApp.ajaxCallbacks.push(function(){
				gApp.parseWiki(e, pWikiInfo, pTries);
			});
			if(gApp.ajaxCallbacks.length === 1) { gApp.ajaxCallbacks[0](); }
		},
		
		/* Check wiki data one at a time, either as it's returned, or after the current data is done being processed. */
		parseWiki: function(e, pWikiInfo, pTries) {
			// Calc stuff that only needs to be calced once for every wiki, that every entry needs to know of.
			var tFavicon = gApp.getWikiFavicon(pWikiInfo);
			
			// Check if wiki doesn't have any recent changes
			if(e.query.results.feed === undefined || e.query.results.feed.entry === undefined) {
				if(e.query.results.feed == undefined) console.log(e.query.results);
				gApp.onWikiParsingFinished(pWikiInfo, tFavicon);
				return;
			}
			
			if(e.query.results.feed.entry instanceof Array === false) e.query.results.feed.entry = [e.query.results.feed.entry];
			// console.log(e.query.results.feed.entry);
			var tNewRC, tDate, tChangeAdded;
			// Add each entry from gApp wiki to the list in a sorted order.
			e.query.results.feed.entry.forEach(function(entry){
				// Skip if user is hidden for whole script or specific wiki
				if(gApp.hideusers.indexOf(entry.author.name) > -1 || (pWikiInfo.hideusers && pWikiInfo.hideusers.indexOf(entry.author.name) > -1)) { return; }
				// Skip if user is NOT a specified user to show for whole script or specific wiki
				if((gApp.onlyshowusers.length != 0 && gApp.onlyshowusers.indexOf(entry.author.name) == -1)) { return; }
				if((pWikiInfo.onlyshowusers != undefined && pWikiInfo.onlyshowusers.indexOf(entry.author.name) == -1)) { return; }
				
				gApp.itemsToAddTotal++;
				tDate = new Date(entry.updated);
				tNewRC = new RecentChange( entry, tDate, pWikiInfo, tFavicon );
				tChangeAdded = false;
				gApp.recentChangesEntries.every(function(obj, i){
					if(tDate > obj.date) {
						gApp.recentChangesEntries.splice(i, 0, tNewRC);
						tChangeAdded = true;
						return false;
					} else {
						if(tNewRC.shouldGroupWith(obj)) {
							if(obj.class_name === RecentChangeList.CLASS_NAME) {
								obj.list.push(tNewRC); // Should always be older
							} else { // if(obj.class_name == "RecentChange")
								// Create new list with the current nodes, replacing the current value's spot on the list
								gApp.recentChangesEntries[i] = new RecentChangeList(obj, tNewRC);
							}
							tChangeAdded = true;
							return false;
						}
					}
					return true;
				});
				if(!tChangeAdded || gApp.recentChangesEntries.length == 0) { gApp.recentChangesEntries.push(tNewRC); }
			});
			
			gApp.onWikiParsingFinished(pWikiInfo, tFavicon);
		},
		
		// After a wiki is loaded, check if ALL wikis are loaded; if so add results; if not, load the next wiki, or wait for next wiki to return data.
		onWikiParsingFinished: function(pWikiInfo, pFavicon) {
			gApp.wikisLeftToLoad--;
			gApp.wikisNode.innerHTML += gUtils.formatString("<a href='http://{0}Special:RecentChanges{2}'>{1}</a>:", pWikiInfo.url+pWikiInfo.subdir, pFavicon.image, (gApp.resultCont.dataset.params ? pWikiInfo.firstSeperator + gApp.resultCont.dataset.params : ""));
			document.querySelector("#rcm-load-perc").innerHTML = gApp.calcLoadPercent() + "%";//.toFixed(3) + "%";
			if(gApp.wikisLeftToLoad > 0) {
				// Parse / wait for next wiki
				gApp.ajaxCallbacks.shift();
				if(gApp.ajaxCallbacks.length > 0){ gApp.ajaxCallbacks[0](); }
			} else {
				// All wikis are loaded
				gApp.wikisNode.innerHTML = gApp.wikisNode.innerHTML.substring(0, gApp.wikisNode.innerHTML.length-1);
				
				var tDate = new Date();
				gApp.statusNode.innerHTML = gUtils.formatString(i18n.TEXT.timeStamp, "<b><tt>"+gUtils.pad(gUtils.getHours(tDate),2)+":"+gUtils.pad(gUtils.getMinutes(tDate),2)+"</tt></b>");
				gApp.statusNode.innerHTML += "<span id='rcm-content-loading'>"+gUtils.formatString(i18n.TEXT.changesAdded, "<span id='rcm-content-loading-num'>0</span> / "+gApp.itemsToAddTotal)+"</span>"
				gApp.resultsNode.innerHTML = "";
				
				// console.log(gApp.recentChangesEntries);
				gApp.rcmChunk(0, 99, 99);
			}
		},
		
		// Add a single change at a time, with a timeout before the next one to prevents script from locking up browser.
		rcmChunk: function(pIndex, pLastDay, pLastMonth) {
			var date = gApp.recentChangesEntries[pIndex].date;
			if(gUtils.getDate(date) != pLastDay || gUtils.getMonth(date) != pLastMonth) {
				pLastDay = gUtils.getDate(date);
				pLastMonth = gUtils.getMonth(date);
				gUtils.newElement("h4", { innerHTML:pLastDay+" "+mw.config.get('wgMonthNames')[pLastMonth+1]+" "+gUtils.getYear(date) }, gApp.resultsNode);
			}
			
			if(gApp.lastLoadDateTime != null && pIndex-1 >= 0 && date < gApp.lastLoadDateTime && gApp.recentChangesEntries[pIndex-1].date > gApp.lastLoadDateTime) {
				gUtils.newElement("div", { className:"rcm-previouslyLoaded", innerHTML:"<strong>"+i18n.TEXT.previouslyLoaded+"</strong>" }, gApp.resultsNode);
			}
			
			// Add to page
			gApp.resultsNode.appendChild(gApp.recentChangesEntries[pIndex].toHTML());
			if(gApp.recentChangesEntries[pIndex].class_name == RecentChangeList.CLASS_NAME) {
				gApp.itemsAdded += gApp.recentChangesEntries[pIndex].list.length;
				
				// For this to work, make sure "gApp.resultsNode.innerHTML" isn't modified after this has been added (to avoid event being "eaten").
				if($(gApp.resultsNode.lastChild).makeCollapsible) { $(gApp.resultsNode.lastChild).makeCollapsible(); }
			} else {
				gApp.itemsAdded++;
			}
			
			if(++pIndex < gApp.recentChangesEntries.length) { document.querySelector("#rcm-content-loading-num").innerHTML = gApp.itemsAdded; setTimeout(function(){ gApp.rcmChunk(pIndex, pLastDay, pLastMonth); }); }
			else { gApp.finishScript(); }
		},
		
		finishScript: function() {
			gUtils.removeElement(document.querySelector("#rcm-content-loading"));
			gApp.addRefreshButtonTo(gApp.statusNode);
			gApp.addAutoRefreshInputTo(gApp.statusNode);
			gApp.lastLoadDateTime = new Date();
			
			if(document.querySelector("#rcm-autoRefresh-checkbox").checked) {
				gApp.autoRefreshTimeoutID = setTimeout(gApp.refresh, gApp.autoRefreshTimeoutNum);
			}
			
			//$( "#rc-content-multiple .mw-collapsible" ).each(function(){ $(this).makeCollapsible(); });
			
			(window.ajaxCallAgain || []).forEach(function(cb){ cb(); });
		},
		
		//######################################
		// Specific Helper Methods
		//######################################
		addRefreshButtonTo: function(pParent) {
			pParent.appendChild(document.createTextNode(" "));
			
			gUtils.newElement("button", { innerHTML:i18n.TEXT.refresh }, pParent).addEventListener("click", function tHandler(e){
				e.target.removeEventListener("click", tHandler);
				gApp.refresh();
			});
		},
		
		addAutoRefreshInputTo: function(pParent) {
			pParent.appendChild(document.createTextNode(" "));
			
			var autoRefresh = gUtils.newElement("span", { id:"rcm-autoRefresh" }, pParent);
			gUtils.newElement("label", { htmlFor:"rcm-autoRefresh-checkbox", innerHTML:i18n.TEXT.autoRefresh, title:gUtils.formatString(i18n.TEXT.autoRefreshTooltip, Math.floor(gApp.autoRefreshTimeoutNum/1000)) }, autoRefresh);
			var checkBox = gUtils.newElement("input", { id:"rcm-autoRefresh-checkbox", type:"checkbox" }, autoRefresh);
			checkBox.checked = (localStorage.getItem(AUTO_REFRESH_LOCAL_STORAGE_ID) == "true");
			checkBox.addEventListener("click", function tHandler(e){
				if(document.querySelector("#rcm-autoRefresh-checkbox").checked) {
					localStorage.setItem(AUTO_REFRESH_LOCAL_STORAGE_ID, true);
					gApp.refresh();
				} else {
					localStorage.setItem(AUTO_REFRESH_LOCAL_STORAGE_ID, false);
					clearTimeout(gApp.autoRefreshTimeoutID);
				}
			});
		},
		
		calcLoadPercent: function() {
			return Math.round((gApp.totalWikisToLoad - gApp.wikisLeftToLoad) / gApp.totalWikisToLoad * 100);
		},
		
		getWikiFavicon: function(pWikiInfo) {
			var tFavicon = {url:"", image:"<img src='{0}' width='16' height='16' />"};
			if(pWikiInfo.favicon) {
				if(pWikiInfo.favicon.indexOf(".") > -1) {
					tFavicon.url = "//"+pWikiInfo.favicon;
				} else {
					tFavicon.url = "http://vignette3.wikia.nocookie.net/"+pWikiInfo.favicon+"/images/6/64/Favicon.ico"
				}
			} else if(pWikiInfo.url.indexOf(".wikia.") > -1 && pWikiInfo.url.split(".wikia.")[0].indexOf(".") <= -1) {
				tFavicon.url = "http://vignette3.wikia.nocookie.net/"+pWikiInfo.url.split(".wikia.")[0]+"/images/6/64/Favicon.ico"
			} else {
				tFavicon.url = FAVICON_BASE+pWikiInfo.url;
			}
			tFavicon.image = gUtils.formatString(tFavicon.image, tFavicon.url);
			return tFavicon;
		},
	};
	
	//######################################
	// Specific Helper Methods
	//######################################
	gHelper = {
		// Returns if user right "exists"
		checkUserRight: function(pUserRight, pRC) {
			if(pRC.wikiInfo.userrights) {
				return pRC.wikiInfo.userrights[pUserRight];
			}
			return gApp.userrights[pUserRight];
		},
		
		sizeDiffText: function(pSizeDiff, pNoSummary) {
			var html = "<strong class='{0}'>({1}{2})</strong>";
			if(pSizeDiff > 0) {
				html = gUtils.formatString(html, "mw-plusminus-pos", "+", pSizeDiff);
			} else if(pSizeDiff < 0) {
				html = gUtils.formatString(html, "mw-plusminus-neg", "", pSizeDiff);
			} else {
				var val = (pNoSummary ? "<abbr title='"+i18n.RC_TEXT.noValidDiffSizeTooltip+"'>N/A</abbr>" : pSizeDiff);
				html = gUtils.formatString(html, "mw-plusminus-null", "", val);
			}
			return html;
		},
		
		// Taken from http://dev.wikia.com/wiki/AjaxDiff
		previewDiff: function(pPageName, pContent, pDiffLink, pUndoLink) {
			if ($('#DiffView').length == 0) {
				var ajaxform = ''
					+'<form method="" name="" class="WikiaForm ">'
						+'<div id="DiffView" style="width:975px; border:3px solid black; word-wrap: break-word;"/>'
					+'</form>';
				var tButtons = [];
				tButtons.push({
					message: i18n.TEXT.diffModuleOpen,
					handler: function () { window.open(pDiffLink, '_blank'); $('#page-viewer').closeModal(); }
				});
				if(pUndoLink != null) {
					tButtons.push({
						message: i18n.TEXT.diffModuleUndo,
						handler: function () { window.open(pUndoLink, '_blank'); $('#page-viewer').closeModal(); }
					});
				}
				tButtons.push({
					message: i18n.TEXT.diffModuleClose,
					handler: function () { $('#page-viewer').closeModal(); }
				});
				$.showCustomModal(pPageName+" - "+i18n.TEXT.diffModuleTitle, ajaxform, {
					id: 'page-viewer',
					width: 1000,
					buttons: tButtons
				});
			}
			$('#DiffView').html(pContent);
		},
	};
	
	//######################################
	// Objects
	//######################################
//{REGION Classes
	// Base class that doesn't want to work.
	/*var RecentChangeBase = (function()
	{
		function RecentChangeBase() {
			
		}
		
		RecentChangeBase.prototype.toHTML = function() {
			console.log("Override me!");
			return gUtils.newElement("table");
		}
		
		RecentChangeBase.prototype.dispose = function() {
			console.log("Override me!");
		}
		
		// Return if this wiki is marked with this privelege.
		RecentChangeBase.prototype.checkPrivilege = function(pPrivilege) {
			return true;
		}
		
		// Get the text for the size diff
		RecentChangeBase.prototype.sizeDiffText = function(pSizeDiff, pNoSummary) {
			var html = "<strong class='{0}'>({1}{2})</strong>";
			if(pSizeDiff > 0) {
				html = gUtils.formatString(html, "mw-plusminus-pos", "+", pSizeDiff);
			} else if(pSizeDiff < 0) {
				html = gUtils.formatString(html, "mw-plusminus-neg", "", pSizeDiff);
			} else {
				var val = (pNoSummary ? "<abbr title='Differance table not included, size differance cannot be found for this edit.'>N/A</abbr>" : pSizeDiff);
				html = gUtils.formatString(html, "mw-plusminus-null", "", val);
			}
			return html;
		}
		
		return RecentChangeBase;
	});*/
	
	// ### RecentChange ### //
	// Holds all info about a single change
	var RecentChange = (function()
	{
		function RecentChange(pEntry, pDate, pWikiInfo, pFavicon) {
			this.class_name = RecentChange.CLASS_NAME;
			this.entry = pEntry;
			this.date = pDate;
			this.wikiInfo = pWikiInfo;
			this.href = "http://"+this.wikiInfo.url+this.wikiInfo.subdir; // link up to the point of the page name
			this.hrefNormal = this.entry.link.href.split("diff=")[0]; // Includes page name // can't split on ?diff= / &diff=, since some wikis that use the /dir/ format still return strinks in the index.php?title= format
			this.favicon = pFavicon;
			this.summaryDiffHTML = gUtils.newElement("div", { innerHTML:this.entry.summary.content });
			gUtils.forEach(this.summaryDiffHTML.querySelector("p").querySelectorAll("a"), function(elem){ elem.href = "http://"+pWikiInfo.url+elem.getAttribute("href"); });
			this.summaryText = this.summaryDiffHTML.querySelector("p").innerHTML;
			this.noSummary = false;
			
			// Check if the entry is part of a log
			this.logType = RecentChange.LOG_TYPE.NONE; // Default
			Object.keys(this.i18nPARSE("logs")).some(function (key) {
				if(gUtils.stringContainsAtLeastOneSubstringInArray(this.summaryText, this.i18nPARSE("logs")[key])) {
					this.logType = RecentChange.LOG_TYPE[key];
					return true;
				}
				return false;
			}, this);
			
			this.pageName = this.entry.title; // Page name including namespace
			this.uniqueID = this.pageName; // A unique ID is primarily important for "comments", since the atom feed doesn't display specific title.
			
			// Find out the type of change this is
			if(this.logType != RecentChange.LOG_TYPE.NONE) {
				this.type = RecentChange.TYPE.LOG;
			}
			else if(this.entry.title.indexOf("/@comment") > -1) {
				this.pageName = this.entry.title.split("/@comment")[0];
				this.uniqueID = this.pageName+"/@comment"+this.entry.title.split("/@comment")[1]; // "Comments" can have 2 /@comments, the first one is what we care about.
				//if(this.entry.link.href.indexOf("diff=") == -1) {
				if(this.pageName.indexOf(this.i18nPARSE("nameSpaceThread")+":") > -1 || this.pageName.indexOf(this.i18nPARSE("namespaceBoardThread")+":") > -1) {
					// Wall / Board
					this.type = (this.pageName.split(":")[0] == this.i18nPARSE("namespaceBoardThread") ? RecentChange.TYPE.BOARD : RecentChange.TYPE.WALL);
					
					// Check for thread title
					var tAcMetaDataCheck = "&lt;ac_metadata title=\"";
					var tAcMetaDataPos = this.summaryDiffHTML.innerHTML.lastIndexOf(tAcMetaDataCheck);
					if(tAcMetaDataPos > -1) { // Check for last encase some has a "ac_metadata" tag as part of their post for some reason
						this.threadTitle = this.summaryDiffHTML.innerHTML.substring(tAcMetaDataPos+tAcMetaDataCheck.length, this.summaryDiffHTML.innerHTML.length);
						this.threadTitle = this.threadTitle.substring(0, this.threadTitle.indexOf("\""));
						this.threadTitle = this.threadTitle.replace(/&amp;/g, "&");
						
						this.summaryText = ""; // No summaries are shown in on Special:RecentChanges when "ac_metadata" is present (just works out that way)
					}
					
					// If no diff=, then it's something like "restored / removed reply" on a board/wall thread.
					this.isWallBoardAction = this.entry.link.href.indexOf("diff=") == -1;
				} else {
					// Article Comment
					this.type = RecentChange.TYPE.COMMENT; // A "comment" can be a article comment, message wall post, or forum post.
					
					// If no diff=, then it's something like "restored / removed reply" on a board/wall thread.
					this.isWallBoardAction = this.entry.link.href.indexOf("diff=") == -1;
				}
			}
			else {
				this.type = RecentChange.TYPE.NORMAL;
				if(gApp.groupCategoryAdded ? (this.summaryText == this.i18nPARSE("addCategories")) : false) {
					this.type = RecentChange.TYPE.LOG;
					this.logType = RecentChange.ADDING_CATEGORIES_LOG;
				}
			}
			
			//this.isNewPage = gUtils.stringContainsAtLeastOneSubstringInArray(this.summaryText, [ this.i18nPARSE("newPageText") ]);
			this.isNewPage = this.summaryText.indexOf( this.i18nPARSE("newPageText") ) > -1;
			this.sizeDiff = this.calcSizeDiff();
		}
		//RecentChange.prototype = Object.create(RecentChangeBase.prototype);
		
		//## Constants ##
		RecentChange.CLASS_NAME = "RecentChange";
		var SEP = " . . ";
		
		RecentChange.TYPE = Object.freeze({NORMAL:"normalChange", COMMENT:"commentType", LOG:"logChange", WALL:"wallChange", BOARD:"boardChange", });
		RecentChange.LOG_TYPE = Object.freeze({
			NONE:"notALog",
			ABUSE_FILTER:"abuseFilter",
			BLOCK:"blockedUser",
			CHAT_BAN:"chatBan",
			DELETION:"deletedPage",
			IMPORT:"importPage",
			MAPS:"maps",
			MERGE:"mergePage",
			MOVED:"pageMoved",
			// PATROL not used
			PROTECTION:"pageProtectionChanged",
			UPLOAD:"uploadedFile",
			USER_AVATAR:"userAvatar",
			USER_CREATION:"userCreated",
			USER_RENAME:"userRenamed",
			USER_RIGHTS:"userRightsChanged",
			WIKI_FEATURES:"wikiFeatures"
		});
		RecentChange.ADDING_CATEGORIES_LOG = "addingCategories";
		
		//## Methods ##
		RecentChange.prototype.toHTML = function() {
			var html = "";
			switch(this.type) {
				case RecentChange.TYPE.LOG: {
					switch(this.logType) {
						case RecentChange.ADDING_CATEGORIES_LOG: {
							html += this.logTypeText();
							html += SEP;
							html += this.userDetails();
							html += " "+i18n.RC_TEXT.addedCategoriesTo+" ";
							html += this._pageTitleText();
							break;
						}
						default: {
							html += this.logTypeText();
							html += SEP;
							html += this.summaryWithUserDetails();
							break;
						}
					}
					break;
				}
				case RecentChange.TYPE.WALL: {
					if(this.isWallBoardAction) {
							html += SEP;
						//html += this.summaryWithUserDetails();
						html += this.userDetails();
						html += " "+this.wallBoardActionMessageWithSummary();
					} else {
						html += gUtils.formatString(i18n.RC_TEXT.onUsernamesWall,
							"<a href='"+this.hrefNormal+"'>"+this.getThreadTitle()+"</a>",
							"<a href='"+this.getBoardWallParentLink()+"'>",
							this.pageNameWithoutNamespace()
						) + "</a> ";
						html += this._diffHist();
						html += SEP;
						html += gHelper.sizeDiffText(this.sizeDiff, this.noSummary);
						html += SEP;
						html += this.userDetails();
						if(this.summaryText != "") { html += " <i>("+this.summaryText+")</i>"; }
					}
					break;
				}
				case RecentChange.TYPE.BOARD: {
					if(this.isWallBoardAction) {
							html += SEP;
						//html += this.summaryWithUserDetails();
						html += this.userDetails();
						html += " "+this.wallBoardActionMessageWithSummary();
					} else {
						html += gUtils.formatString(i18n.RC_TEXT.threadOnTheBoard,
							"<a href='"+this.hrefNormal+"'>"+this.getThreadTitle()+"</a>",
							"<a href='"+this.getBoardWallParentLink()+"'>",
							this.pageNameWithoutNamespace()
						) + "</a>";
						html += this._diffHist();
						html += SEP;
						html += gHelper.sizeDiffText(this.sizeDiff, this.noSummary);
						html += SEP;
						html += this.userDetails();
						if(this.summaryText != "") { html += " <i>("+this.summaryText+")</i>"; }
					}
					break;
				}
				case RecentChange.TYPE.COMMENT:
				case RecentChange.TYPE.NORMAL:
				default: {
					if(this.type == RecentChange.TYPE.COMMENT && this.isWallBoardAction) {
						if(module.debug) { console.log("Issue displaying "+this.pageName+"; most likely an undetected wall/forum thread, due to language not being defined in PARSE"); }
						
						html += "<span class='mw-enhanced-rc-time'>"+this.time()+"</span>"
						html += SEP;
						//html += this.summaryWithUserDetails();
						html += this.userDetails();
						html += " "+this.wallBoardActionMessageWithSummary();
					} else {
						html += this._pageTitleText();
						html += SEP;
						html += gHelper.sizeDiffText(this.sizeDiff, this.noSummary);
						html += SEP;
						html += this.userDetails();
						if(this.summaryText != "") { html += " <i>("+this.summaryText+")</i>"; }
						// if(this.type == RecentChange.TYPE.NORMAL && this.isNewPage == false && gHelper.checkUserRight("rollback", this)) {
						//  html += " [<a href='"+this.hrefNormal+"action=rollback&from="+this.entry.author.name+"'>rollback</a>]";
						// }
					}
					break;
				}
			}
			
			var tTable = gUtils.newElement("table", { className:"mw-enhanced-rc" });
			gUtils.newElement("caption", {}, tTable).style.cssText = "background-image:url("+this.favicon.url+")";
			var tRow = gUtils.newElement("tr", {}, tTable);
			gUtils.newElement("td", { innerHTML:this.favicon.image }, tRow);
			gUtils.newElement("td", { className:"mw-enhanced-rc", innerHTML:""
				+'<img src="http://slot1.images.wikia.nocookie.net/__cb1422546004/common/skins/common/images/Arr_.png" width="12" height="12" alt="&nbsp;" title="">'
				+(this.isNewPage ? '<abbr class="newpage" title="'+i18n.RC_TEXT.editCreatedNewPageTooltip+'">N</abbr>' : '&nbsp;')
				+"&nbsp;"
				+"&nbsp;"
				+"&nbsp;"
				+"&nbsp;"
				+this.time()
				+"&nbsp;"
			}, tRow);
			gUtils.newElement("td", { innerHTML:html }, tRow);
			
			this.addPreviewDiffListener(tTable.querySelector(".rcm-ajaxDiff"), this);
			
			return tTable;
		};
		
		RecentChange.prototype.toHTMLRow = function() {
			var html = "";
			
			switch(this.type) {
				case RecentChange.TYPE.NORMAL: {
					if(this.entry.link.href.indexOf("diff=") <= -1) {
						if(module.debug) { console.log("Issue displaying "+this.pageName+"; most likely an undetected change type, due to something uncommon / unchecked case in other language."); }
						
						html += "<span class='mw-enhanced-rc-time'><a href='"+this.hrefNormal+"' title='"+this.pageName+"'>"+this.time()+"</a></span>"
						html += SEP;
						html += this.userDetails();
						if(this.summaryText != "") { html += " <i>("+this.summaryText+")</i>"; }
						break;
					}
					var hrefParamas = (this.entry.link.href.split("diff=")[1]).split("&");
					var diffNum = hrefParamas[0];
					var oldNum = hrefParamas[1].replace("oldid=","");
					
					
					html += "<span class='mw-enhanced-rc-time'><a href='"+this.hrefNormal+"oldid="+diffNum+"' title='"+this.pageName+"'>"+this.time()+"</a></span>"
					html += " (<a href='"+this.hrefNormal+"diff=0&oldid="+diffNum+"'>"+i18n.RC_TEXT.cur+"</a>";
					if(!this.isNewPage) { html += " | <a href='"+this.entry.link.href+"'>"+i18n.RC_TEXT.prev+"</a>"+this.getAjaxDiffButton(); }
					html += ")";
					html += SEP;
					html += gHelper.sizeDiffText(this.sizeDiff, this.noSummary);
					html += SEP;
					html += this.userDetails();
					if(this.summaryText != "") { html += " <i>("+this.summaryText+")</i>"; }
					break;
				}
				case RecentChange.TYPE.WALL:
				case RecentChange.TYPE.BOARD: {
					if(this.isWallBoardAction) {
						html += "<span class='mw-enhanced-rc-time'>"+this.time()+"</span>"
						html += SEP;
						//html += this.summaryWithUserDetails();
						html += this.userDetails();
						html += " "+this.wallBoardActionMessageWithSummary();
						break;
					} else {
						// Fall through to Comment behavior
					}
				}
				case RecentChange.TYPE.COMMENT: {
					if(this.isWallBoardAction == false) {
						var hrefParamas = (this.entry.link.href.split("diff=")[1]).split("&");
						var diffNum = hrefParamas[0];
						var oldNum = hrefParamas[1].replace("oldid=","");
						
						html += "<span class='mw-enhanced-rc-time'>"+this.time()+"</span>"
						html += " (<a href='"+this.hrefNormal+"diff=0&oldid="+diffNum+"'>"+i18n.RC_TEXT.cur+"</a>";
						if(!this.isNewPage) { html += " | <a href='"+this.entry.link.href+"'>"+i18n.RC_TEXT.prev+"</a>"+this.getAjaxDiffButton(); }
						html += ")";
						html += SEP;
						html += gHelper.sizeDiffText(this.sizeDiff, this.noSummary);
						html += SEP;
						html += this.userDetails();
						if(this.summaryText != "") { html += " <i>("+this.summaryText+")</i>"; }
					} else {
						if(module.debug) { console.log("Issue displaying "+this.pageName+"; most likely an undetected wall/forum thread, due to language not being defined in PARSE"); }
						
						html += "<span class='mw-enhanced-rc-time'>"+this.time()+"</span>"
						html += SEP;
						//html += this.summaryWithUserDetails();
						html += this.userDetails();
						html += " "+this.wallBoardActionMessageWithSummary();
					}
					break;
				}
				case RecentChange.TYPE.LOG: {
					switch(this.logType) {
						case RecentChange.ADDING_CATEGORIES_LOG: {
							html += "<span class='mw-enhanced-rc-time'>"+this.time()+"</span>"
							html += SEP;
							html += this.userDetails();
							html += " "+i18n.RC_TEXT.addedCategoriesTo+" ";
							html += this._pageTitleText();
							break;
						}
						default: {
							html += "<span class='mw-enhanced-rc-time'>"+this.time()+"</span>"
							html += SEP;
							html += this.summaryWithUserDetails();
							break;
						}
					}
					break;
				}
			}
			
			var tRow = gUtils.newElement("tr", {});
			gUtils.newElement("td", {}, tRow); // Blank spot for where favicon would be on a normal table
			gUtils.newElement("td", {}, tRow); // Blank spot for where collapsing arrow would be on the table
			gUtils.newElement("td", { className:"mw-enhanced-rc", innerHTML:""
				+(this.isNewPage ? '<abbr class="newpage" title="'+i18n.RC_TEXT.editCreatedNewPageTooltip+'">N</abbr>' : '&nbsp;')
				+"&nbsp;"
				+"&nbsp;"
				+"&nbsp;"
				+"&nbsp;"
			}, tRow);
			gUtils.newElement("td", { className:"mw-enhanced-rc-nested", innerHTML:html }, tRow);
			
			this.addPreviewDiffListener(tRow.querySelector(".rcm-ajaxDiff"), this);
			
			return tRow;
		}
		
		RecentChange.prototype.time = function() {
			return gUtils.pad(gUtils.getHours(this.date),2)+":"+gUtils.pad(gUtils.getMinutes(this.date),2);
		};
		
		RecentChange.prototype.calcSizeDiff = function() {
			if(this.type == RecentChange.TYPE.LOG) { return 0; }
			
			var charDiff = 0;
			if(this.summaryDiffHTML.querySelector("table.diff") != undefined) {
				var charCountOld = 0, charCountNew = 0;
				var changes = this.summaryDiffHTML.querySelectorAll(".diff-marker");
				gUtils.forEach(changes, function(diffMarker){
					var myDiff = diffMarker.nextElementSibling;
					var myDiffChanges = myDiff.querySelectorAll(".diffchange");
					
					if(diffMarker.innerHTML == "&nbsp;") { return; }
					else if(diffMarker.innerHTML == "−") {
						if(myDiffChanges.length > 0) {
							gUtils.forEach(myDiffChanges, function(diff){
								charCountOld += diff.textContent.length;
							});
						} else {
							var diff = myDiff.querySelector("div");
							if(diff == null) return;
							if(myDiff.nextElementSibling.className != "diff-empty") return; // nothing changed on this line, ignore
							charCountOld += diff.textContent.length;
						}
					}
					else if(diffMarker.innerHTML == "+") {
						if(diffMarker.previousElementSibling.className == "diff-empty") charCountNew++; // New line, add extra character
						if(myDiffChanges.length > 0) {
							gUtils.forEach(myDiffChanges, function(diff){
								charCountNew += diff.textContent.length;
							});
						} else {
							var diff = myDiff.querySelector("div");
							if(diff == null) return;
							if(diffMarker.previousElementSibling.className != "diff-empty") return; // nothing changed on this line, ignore
							charCountNew += diff.textContent.length;
						}
					}
				});
				charDiff = charCountNew - charCountOld;
			} else {
				var diff;
				//console.log(diff);
				if((diff = this.summaryDiffHTML.querySelector("div")) != null) {
					charDiff = diff.textContent.length;
				} else if((diff = this.summaryDiffHTML.querySelector("span[dir=auto]")) != null) {
					//console.log(this.entry.title);
					//console.log(this.summaryDiffHTML);
					this.noSummary = true;
					return 0; // 
				} else {
					//console.log(this.entry.title);
					//console.log(this.summaryDiffHTML);
					return 0; // None of the above; possibly in error, but may be a "valid" reason.
				}
				
			}
			return charDiff;
		}
		
		RecentChange.prototype._pageTitleText = function() {
			var titleLink = "<a href='{0}'>{1}</a>";
			var tPageName = this.pageName;
			if(this.type == RecentChange.TYPE.COMMENT) { // && this.isNewPage) { <-- cannot figure out why I had this
				titleLink = i18n.RC_TEXT.comment+" ("+titleLink+")";
				tPageName = this.pageNameWithoutNamespace();
			}
			return gUtils.formatString(titleLink, this.hrefNormal, tPageName) +" "+ this._diffHist();
		}
		
		RecentChange.prototype._diffHist = function() {
			var diffLink = i18n.RC_TEXT.diff;
			if(this.isNewPage == false) { diffLink = "<a href='"+this.entry.link.href+"'>"+diffLink+"</a>"+this.getAjaxDiffButton(); }
			return "("+diffLink+" | <a href='"+this.hrefNormal+"action=history'>"+i18n.RC_TEXT.hist+"</a>)";
		}
		
		RecentChange.prototype.userDetails = function() {
			var username = this.entry.author.name;
			var blockText = gHelper.checkUserRight("admin", this) ? " | <a href='{0}Special:Block/{1}'>"+i18n.RC_TEXT.block+"</a>" : "";
			if(!IP_REGEX.test(username)) {
				return gUtils.formatString("<a href='{0}User:{1}'>{1}</a> (<a href='{0}User_talk:{1}'>"+i18n.RC_TEXT.wall+"</a> | <a href='{0}Special:Contributions/{1}'>"+i18n.RC_TEXT.contribs+"</a>"+blockText+")", this.href, username);
			} else {
				return gUtils.formatString("<a href='{0}Special:Contributions/{1}'>{1}</a> (<a href='{0}User_talk:{1}'>"+i18n.RC_TEXT.wall+"</a>"+blockText+")", this.href, username);
			}
		}
		
		// Meant for summaries that START with a username link
		RecentChange.prototype.summaryWithUserDetails = function() {
			// summary, plus everything after the username link
			return this.userDetails() + this.summaryText.slice(this.summaryText.indexOf("</a>")+4);
		}
		
		RecentChange.prototype.logTypeText = function() {
			var logTemplate = "(<a href='"+this.href+"Special:Log/{0}'>{1}</a>)";
			switch(this.logType) {
				case RecentChange.LOG_TYPE.ABUSE_FILTER     :{ return gUtils.formatString(logTemplate, "abusefilter",	i18n.RC_TEXT.logAbuseFilter); }
				case RecentChange.LOG_TYPE.BLOCK            :{ return gUtils.formatString(logTemplate, "block",			i18n.RC_TEXT.logBlock); }
				case RecentChange.LOG_TYPE.CHAT_BAN         :{ return gUtils.formatString(logTemplate, "chatban",		i18n.RC_TEXT.logChatBan); }
				case RecentChange.LOG_TYPE.DELETION         :{ return gUtils.formatString(logTemplate, "delete",		i18n.RC_TEXT.logDeletion); }
				case RecentChange.LOG_TYPE.IMPORT           :{ return gUtils.formatString(logTemplate, "import",		i18n.RC_TEXT.logImport); }
				case RecentChange.LOG_TYPE.MAPS             :{ return gUtils.formatString(logTemplate, "maps",			i18n.RC_TEXT.logMaps); }
				case RecentChange.LOG_TYPE.MERGE            :{ return gUtils.formatString(logTemplate, "merge",			i18n.RC_TEXT.logMerge); }
				case RecentChange.LOG_TYPE.MOVED            :{ return gUtils.formatString(logTemplate, "move",			i18n.RC_TEXT.logMoved); }
				case RecentChange.LOG_TYPE.PROTECTION       :{ return gUtils.formatString(logTemplate, "protect",		i18n.RC_TEXT.logProtection); }
				case RecentChange.LOG_TYPE.UPLOAD           :{ return gUtils.formatString(logTemplate, "upload",		i18n.RC_TEXT.logUpload); }
				case RecentChange.LOG_TYPE.USER_AVATAR      :{ return gUtils.formatString(logTemplate, "useravatar",	i18n.RC_TEXT.logUserAvatar); }
				case RecentChange.LOG_TYPE.USER_CREATION    :{ return gUtils.formatString(logTemplate, "newusers",		i18n.RC_TEXT.logUserCreation); }
				case RecentChange.LOG_TYPE.USER_RENAME      :{ return gUtils.formatString(logTemplate, "renameuser",	i18n.RC_TEXT.logUserRename); }
				case RecentChange.LOG_TYPE.USER_RIGHTS      :{ return gUtils.formatString(logTemplate, "rights",		i18n.RC_TEXT.logUserRights); }
				case RecentChange.LOG_TYPE.WIKI_FEATURES    :{ return gUtils.formatString(logTemplate, "wikifeatures",	i18n.RC_TEXT.logWikiFeatures); }
				case RecentChange.ADDING_CATEGORIES_LOG     :{ return "("+i18n.RC_TEXT.logAddingCategories+")"; }
				case RecentChange.LOG_TYPE.NONE:
				default: {
					// nothing
				}
			}
			return "";
		}
		
		RecentChange.prototype.wallBoardActionMessageWithSummary = function() {
			var text = this.summaryText.slice(this.summaryText.indexOf("</a>")+4);
			
			function tWallBoardActionText(pRC, pAction, pActionText) {
				var tReturnText = "";
				var tPageNameNoNS = pRC.pageNameWithoutNamespace();
				if(pRC.type == RecentChange.TYPE.BOARD) {
					tReturnText = gUtils.formatString("<a href='{0}'>{1}</a>", pRC.getBoardWallParentLink(), tPageNameNoNS);
				} else {
					tReturnText = gUtils.formatString("<a href='{0}'>{1}</a>", pRC.getBoardWallParentLink(), gUtils.formatString(i18n.RC_TEXT.usersWall, tPageNameNoNS) );
				}
				// tReturnText += gUtils.formatString( pActionText, "<a href='"+pRC.hrefNormal+"'>"+pRC.getThreadTitle()+"</a>", " "+this.getBoardWallParentLink() );
				
				tReturnText = gUtils.formatString(pActionText, "<a href='"+pRC.hrefNormal+"'>"+pRC.getThreadTitle()+"</a>", tReturnText);
				
				var summaryText = text.split(pAction)[1];
				if(summaryText != "") { tReturnText += " <i>("+summaryText.trim()+")</i>"; }
				return tReturnText;
			}
			
			var tAction = null;
			function tContainBoardWallText(pText) { return text.indexOf(tAction=pText) > -1; }
			// switch(tAction) {
			     if(tContainBoardWallText("wall_archive"))		{ return tWallBoardActionText(this, tAction, (this.type == RecentChange.TYPE.BOARD ? i18n.RC_TEXT.boardArchive : i18n.RC_TEXT.wallArchive)); }
			else if(tContainBoardWallText("wall_remove"))		{ return tWallBoardActionText(this, tAction, (this.type == RecentChange.TYPE.BOARD ? i18n.RC_TEXT.boardRemove : i18n.RC_TEXT.wallRemove)); }
			else if(tContainBoardWallText("wall_admindelete"))	{ return tWallBoardActionText(this, tAction, (this.type == RecentChange.TYPE.BOARD ? i18n.RC_TEXT.boardDelete : i18n.RC_TEXT.wallDelete)); }
			else if(tContainBoardWallText("wall_restore"))		{ return tWallBoardActionText(this, tAction, (this.type == RecentChange.TYPE.BOARD ? i18n.RC_TEXT.boardRestore : i18n.RC_TEXT.wallRestore)); }
			else if(tContainBoardWallText("wall_reopen"))		{ return tWallBoardActionText(this, tAction, (this.type == RecentChange.TYPE.BOARD ? i18n.RC_TEXT.boardReopen : i18n.RC_TEXT.wallReopen)); }
			// }
			return "";
		}
		
		RecentChange.prototype.getBoardWallParentLink = function() {
			if(this.type == RecentChange.TYPE.BOARD) {
				return this.href + "Board:" + this.pageNameWithoutNamespace();
			}
			else if(this.type == RecentChange.TYPE.WALL) {
				return this.href + "Message_Wall:" + this.pageNameWithoutNamespace();
			}
			else {
				if(module.debug) { console.log("This should not happen in getBoardWallParentLink()"); }
				return this.href;
			}
		}
		
		RecentChange.prototype.shouldGroupWith = function(pRC) {
			if(this.wikiInfo.url == pRC.wikiInfo.url && this.type == pRC.type && gUtils.getMonth(this.date) == gUtils.getMonth(pRC.date) && gUtils.getDate(this.date) == gUtils.getDate(pRC.date)) {
				switch(this.type) {
					case RecentChange.TYPE.NORMAL: {
						if(this.uniqueID == pRC.uniqueID) { return true; }
						break;
					}
					case RecentChange.TYPE.COMMENT: {
						if(this.pageName == pRC.pageName) { return true; }
						break;
					}
					case RecentChange.TYPE.WALL:
					case RecentChange.TYPE.BOARD: {
						if(this.uniqueID == pRC.uniqueID) { return true; }
						break;
					}
					case RecentChange.TYPE.LOG: {
						if(this.logType == pRC.logType) { return true; }
						break;
					}
				}
			}
			return false;
		}
		
		// This method should only be used when it's 100% known that a page has a namespace.
		// This script cannot tell if a colon signifies a namespace or not, but instead just returns the text after any colon.
		RecentChange.prototype.pageNameWithoutNamespace = function() {
			return this.pageName.indexOf(":") > -1 ? this.pageName.split(":")[1] : this.pageName;
		}
		
		// Check each entry for "threadTitle", else return default text.
		RecentChange.prototype.getThreadTitle = function() {
			return this.threadTitle ? this.threadTitle :  "<i>"+i18n.RC_TEXT.thread+"</i>";
		}
		
		// https://commons.wikimedia.org/wiki/File:Columns_font_awesome.svg
		RecentChange.prototype.getAjaxDiffButton = function() {
			if(this.summaryDiffHTML.querySelector("table.diff") == undefined) {
				return "";
			}
			return ' <span class="rcm-ajaxDiff">'
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
		}
		
		RecentChange.prototype.addPreviewDiffListener = function(pElem) {
			if(pElem) {
				// Initializing here since "this" will be nulled by the time the event is triggered.
				var pageName = this.pageName;
				var summaryDiffHTML = this.summaryDiffHTML;
				var hrefNormal = this.hrefNormal;
				var diffLink = this.entry.link.href;
				var undoLink = this.entry.link.href;
				if(this.type == RecentChange.TYPE.NORMAL || this.logType == RecentChange.ADDING_CATEGORIES_LOG) {
					undoLink = undoLink.replace("oldid=", "undoafter=");
					undoLink = undoLink.replace("diff=", "undo=");
					undoLink += "&action=edit";
				} else {
					undoLink = null;
				}
				
				pElem.addEventListener("click", function() {
					gHelper.previewDiff(pageName, summaryDiffHTML, diffLink, undoLink);
				});
			}
		}
		
		RecentChange.prototype.i18nPARSE = function(pStr) {
			return i18n.PARSE[this.wikiInfo.lang][pStr];
		}
		
		RecentChange.prototype.dispose = function() {
			this.entry = null;
			this.date = null;
			this.wikiInfo = null;
			this.summaryDiffHTML = null;
		}
		
		return RecentChange;
	})();
	
	// ### RecentChangeList ### //
	// Holds grouped changes, be they logs or same-page edits.
	var RecentChangeList = (function()
	{
		function RecentChangeList(pRC1, pRC2) {
			this.class_name = RecentChangeList.CLASS_NAME;
			this.list = [pRC1, pRC2];
			
			Object.defineProperty(this, "newest", { get: function() { return this.list[0]; }, enumerable: true });
			Object.defineProperty(this, "oldest", { get: function() { return this.list[this.list.length-1]; }, enumerable: true });
			Object.defineProperty(this, "date", { get: function() { return this.newest.date; }, enumerable: true });
			Object.defineProperty(this, "uniqueID", { get: function() { return this.newest.uniqueID; }, enumerable: true });
			Object.defineProperty(this, "pageName", { get: function() { return this.newest.pageName; }, enumerable: true });
			Object.defineProperty(this, "wikiInfo", { get: function() { return this.newest.wikiInfo; }, enumerable: true });
			Object.defineProperty(this, "logType", { get: function() { return this.newest.logType; }, enumerable: true });
			Object.defineProperty(this, "type", { get: function() { return this.newest.type; }, enumerable: true });
		}
		//RecentChangeList.prototype = Object.create(RecentChangeBase.prototype);
		
		//## Constants ##
		RecentChangeList.CLASS_NAME = "RecentChangeList";
		var SEP = " . . ";
		
		//## Methods ##
		RecentChangeList.prototype.toHTML = function() {
			var html = "";
			switch(this.type) {
				case RecentChange.TYPE.LOG: {
					html += this.newest.logTypeText();
					break;
				}
				case RecentChange.TYPE.NORMAL: {
					html += "<a href='"+this.newest.hrefNormal+"'>"+this.newest.pageName+"</a>";
					html += " ("+this.changesText()+" | <a href='"+this.newest.hrefNormal+"action=history'>"+i18n.RC_TEXT.hist+"</a>)";
					html += SEP
					html += gHelper.sizeDiffText(this.totalDiff(), false);
					html += SEP;
					break;
				}
				case RecentChange.TYPE.WALL: {
					html += gUtils.formatString(i18n.RC_TEXT.onUsernamesWall,
						"<a href='"+this.newest.hrefNormal+"'>"+this.getThreadTitle()+"</a>",
						"<a href='"+this.newest.getBoardWallParentLink()+"'>",
						this.newest.pageNameWithoutNamespace()
					) + "</a>";
					html += " ("+this.changesText()+")";
					break;
				}
				case RecentChange.TYPE.BOARD: {
					html += gUtils.formatString(i18n.RC_TEXT.threadOnTheBoard,
						"<a href='"+this.newest.hrefNormal+"'>"+this.getThreadTitle()+"</a>",
						"<a href='"+this.newest.getBoardWallParentLink()+"'>",
						this.newest.pageNameWithoutNamespace()
					) + "</a>";
					html += " ("+this.changesText()+")";
					break;
				}
				case RecentChange.TYPE.COMMENT: {
					html += i18n.RC_TEXT.comments+" (<a href='"+this.newest.hrefNormal+"'>"+this.newest.pageNameWithoutNamespace()+"</a>)";
					html += " ("+this.changesText()+")";
					html += SEP
					html += gHelper.sizeDiffText(this.totalDiff(), false);
					html += SEP;
					break;
				}
			}
			html += SEP;
			html += this._contributorsCountText();
			
			var tTable = gUtils.newElement("table", { className:"mw-collapsible mw-enhanced-rc mw-collapsed" }); // mw-made-collapsible
			gUtils.newElement("caption", {}, tTable).style.cssText = "background-image:url("+this.newest.favicon.url+")";
			var tTbody = gUtils.newElement("tbody", {}, tTable); // tbody is needed for $.makeCollapsible() to work.
			var tRow = gUtils.newElement("tr", {}, tTbody);
			gUtils.newElement("td", { innerHTML:this.newest.favicon.image }, tRow);
			var td1 = gUtils.newElement("td", {}, tRow);
				gUtils.newElement("span", { className:"mw-collapsible-toggle", innerHTML:''
					+'<span class="mw-rc-openarrow"><a title="'+i18n.RC_TEXT.showDetailsTooltip+'" href="#">'
						+'<img width="12" height="12" title="'+i18n.RC_TEXT.showDetailsTooltip+'" alt="+" src="http://slot1.images.wikia.nocookie.net/__cb1422546004/common/skins/common/images/Arr_r.png">'
					+'</a></span>'
					+'<span class="mw-rc-closearrow"><a title="'+i18n.RC_TEXT.hideDetailsTooltip+'" href="#">'
							+'<img width="12" height="12" title="'+i18n.RC_TEXT.hideDetailsTooltip+'" alt="-" src="http://slot1.images.wikia.nocookie.net/__cb1422546004/common/skins/common/images/Arr_d.png">'
					+'</a></span>' }, td1);
			gUtils.newElement("td", { className:"mw-enhanced-rc", innerHTML:""
				+(this.oldest.isNewPage ? '<abbr class="newpage" title="'+i18n.RC_TEXT.editCreatedNewPageTooltip+'">N</abbr>' : '&nbsp;')
				+"&nbsp;"
				+"&nbsp;"
				+"&nbsp;"
				+"&nbsp;"
				+this.newest.time()
				+"&nbsp;"
			}, tRow);
			gUtils.newElement("td", { innerHTML:html }, tRow);
			
			this.list.forEach(function(rc){
				tTbody.appendChild(rc.toHTMLRow());
			});
			
			return tTable;
		}
		
		RecentChangeList.prototype._contributorsCountText = function() {
			var contribs = {}, indx;
			this.list.forEach(function(rc){
				if(contribs.hasOwnProperty(rc.entry.author.name)) {
					contribs[rc.entry.author.name]++;
				} else {
					contribs[rc.entry.author.name] = 1;
				}
			});
			
			var returnText = "[", total = 0, tLength = this.list.length;
			Object.keys(contribs).forEach(function (key) {
				returnText += this._userPageLink(key) + (contribs[key] > 1 ? " ("+contribs[key]+"&times;)" : "");
				total += contribs[key];
				if(total < tLength) { returnText += "; "; }
			}, this);
			return returnText + "]";
		}
		
		// For use with comments / normal pages
		RecentChangeList.prototype.changesText = function() {
			var returnText = gUtils.formatString(i18n.RC_TEXT.numChanges, this.list.length);
			if(this.type == RecentChange.TYPE.NORMAL) {
				if(this.newest.entry == undefined) console.log(this.newest);
				var diffNum1, oldNum1, diffNum2, oldNum2;
				if(this.newest.entry.link.href.indexOf("diff=") > -1) {
					var hrefParamas = (this.newest.entry.link.href.split("diff=")[1]).split("&");
					diffNum1 = hrefParamas[0]; oldNum1 = hrefParamas[1].replace("oldid=","");
				}
				if(this.oldest.isNewPage == false) {
					if(this.oldest.entry.link.href.indexOf("diff=") > -1) {
						var hrefParamas = (this.oldest.entry.link.href.split("diff=")[1]).split("&");
						diffNum2 = hrefParamas[0]; oldNum2 = hrefParamas[1].replace("oldid=","");
					}
				} else {
					diffNum2 = oldNum2 = 0;
				}
				returnText = "<a href='"+this.newest.hrefNormal+"diff="+diffNum1+"&oldid="+oldNum2+"'>"+returnText+"</a>";
			}
			// The use case of comments/threads having a "diff" link (as a RCList) are rare enough not to bother with, since they'd have to be the same post,
			// edited by two differant people (since atom feeds combine edits by same person), without any other posts on the "thread" edited, and with no new posts.
			return returnText;
		}
		
		RecentChangeList.prototype._userPageLink = function(pUsername) {
			if(!IP_REGEX.test(pUsername)) {
				return gUtils.formatString("<a href='{0}User:{1}'>{1}</a>", this.list[0].href, pUsername);
			} else {
				return gUtils.formatString("<a href='{0}Special:Contributions/{1}'>{1}</a>", this.list[0].href, pUsername);
			}
		}
		
		RecentChangeList.prototype.totalDiff = function() {
			var total = 0;
			this.list.forEach(function(rc){ total += rc.sizeDiff; });
			return total;
		}
		
		// Check each entry for "threadTitle", else return default text.
		RecentChangeList.prototype.getThreadTitle = function() {
			var tTitle = "<i>"+i18n.RC_TEXT.thread+"</i>";
			this.list.some(function(rc){
				if(rc.threadTitle) {
					tTitle = rc.threadTitle;
					return true;
				}
				return false;
			});
			return tTitle;
		}
		
		RecentChangeList.prototype.dispose = function() {
			for (var i = 0; i < this.list.length; i++) {
				this.list[i].dispose();
				this.list[i] = null;
			};
		}
		
		return RecentChangeList;
	})();
//}END Classes
	
	//######################################
	// General Helper Methods
	//######################################
	var gUtils = {
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
				for(var key in attributes)
					element[key] = attributes[key];
			}
			if(parent != undefined) parent.appendChild(element);
			return element;
		},
		
		removeElement: function(pNode) {
			pNode.parentNode.removeChild(pNode);
		},
		
		// http://stackoverflow.com/a/5582621/1411473
		stringContainsAtLeastOneSubstringInArray: function(pString, pSubstringsArray) {
			return pSubstringsArray.some(function(v) { return pString.indexOf(v) >= 0; });
		},
		
		getMinutes: function(pDate) { return gApp.timezone == "utc" ? pDate.getUTCMinutes() : pDate.getMinutes(); },
		getHours: function(pDate) { return gApp.timezone == "utc" ? pDate.getUTCHours() : pDate.getHours(); },
		getDate: function(pDate) { return gApp.timezone == "utc" ? pDate.getUTCDate() : pDate.getDate(); },
		getMonth: function(pDate) { return gApp.timezone == "utc" ? pDate.getUTCMonth() : pDate.getMonth(); },
		getYear: function(pDate) { return gApp.timezone == "utc" ? pDate.getUTCFullYear() : pDate.getFullYear(); },
	};
	
	$(document).ready(gApp.init);
})(jQuery, document, window.mediaWiki);
//</syntaxhighlight>