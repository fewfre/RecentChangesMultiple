import RCMManager from "./RCMManager";
import WikiData from "./WikiData";
import Global from "./Global";
import Utils from "./Utils";
import i18n, { I18nKey } from "./i18n";

let $ = window.jQuery;
let mw = window.mediaWiki;

//######################################
// #### Wiki Panel ####
// * Show the current loaded wikis, as well as any information pertaining to them.s
//######################################
export default class RCMWikiPanel
{
	// Storage
	manager			: RCMManager; // Keep track of what manager this data is attached to.
	root			: HTMLElement;
	
	/***************************
	 * HTML Elements/Nodes
	 ***************************/
	wikisNode		: HTMLElement; // Where info about all the wikis in the parent manager are listed
	infoNode		: HTMLElement; // Where info about the specific wiki shows up
	
	loadedNode		: HTMLElement;
	loadedListNode	: HTMLUListElement;
	hiddenNode		: HTMLElement;
	hiddenListNode	: HTMLUListElement;
	
	/***************************
	 * Storage
	 ***************************/
	singleWiki		: boolean; // If this panel's manager only contains one wiki.
	loadedWikis		: string[]; // List of ids for wikis that have finished loading
	
	// Constructor
	constructor(pManager:RCMManager) {
		this.manager = pManager;
		
		this.singleWiki = this.manager.chosenWikis.length == 1;
		this.loadedWikis = [];
	}
	
	dispose() : void {
		this.manager	= null;
		this.root		= null;
		
		this.wikisNode	= null;
		this.infoNode	= null;
		
		this.loadedNode	= null;
		this.loadedListNode	= null;
		this.hiddenNode	= null;
		this.hiddenListNode	= null;
		
		this.loadedWikis = null;
	}
	
	// Should only be called once.
	init(pElem:HTMLElement) : RCMWikiPanel {
		this.root = pElem;
		
		// For RCMs with only one wiki, we don't want to show a list
		if(!this.singleWiki) {
			// Hide initially as we don't want to show it while loading wiki data
			this.wikisNode = Utils.newElement("div", { style:"display:none;" }, this.root);
			
			this.loadedNode = Utils.newElement("span", { className:"loaded-wikis" }, this.wikisNode);
			this.loadedNode.innerHTML += `<span class="rcm-wikisloaded-title" title="${i18n('wikipanel-wikisloaded-tooltip')}">${i18n('wikipanel-wikisloaded')}</span>: `;
			this.loadedListNode = Utils.newElement("ul", { className:"rcm-wikis-list" }, this.loadedNode) as HTMLUListElement;
			
			this.hiddenNode = Utils.newElement("span", { className:"hidden-wikis", style:"display:none;" }, this.wikisNode);
			this.hiddenNode.innerHTML += `${i18n('abusefilter-history-hidden')}: `
			this.hiddenListNode = Utils.newElement("ul", { className:"rcm-wikis-list" }, this.hiddenNode) as HTMLUListElement;
			Utils.addTextTo(" ", this.hiddenNode);
			// Utils.newElement("a", { innerHTML:`(${i18n('show')})`, href:"#" }, this.hiddenNode).addEventListener("click", (e)=>{
			// 	e.preventDefault();
			// 	this.manager.chosenWikis.forEach(wiki=>{ wiki.hidden = false; });
			// 	this.manager.hardRefresh();
			// 	return false;
			// });
			Utils.newElement("button", { className:"rcm-btn rcm-btn-short", innerHTML:i18n('show') }, this.hiddenNode).addEventListener("click", (e)=>{
				e.preventDefault();
				this.manager.chosenWikis.forEach(wiki=>{ wiki.hidden = false; });
				this.manager.hardRefresh();
				return false;
			});
		}
		this.infoNode = Utils.newElement("div", { className:"rcm-wikis-info" }, this.root);
		
		return this;
	}
	
	onWikiDataLoaded() : void {
		if(!this.singleWiki) {
			this.wikisNode.style.display = "block";
		}
	}
	
	// Clear panel (on refresh) - don't need to clear it if only one wiki, as it never changes
	clear() : void {
		if(!this.singleWiki) {
			this.loadedListNode.innerHTML = "";
			this.hiddenListNode.innerHTML = "";
			this.hiddenNode.style.display = "none";
			this.infoNode.innerHTML = "";
			this.loadedWikis = [];
		}
	}
	
	refresh() {
		// For RCMs that only use a single wiki, we only want to show the wiki's info
		// and since it never changes, we don't need to refresh it past the first time
		if(this.singleWiki) {
			if(!this.infoNode.innerHTML) {
				this.onIconClick(this.manager.chosenWikis[0], null);
			}
			return;
		}// Else add the list
		
		this.loadedListNode.innerHTML = "";
		this.hiddenListNode.innerHTML = "";
		this.manager.chosenWikis.filter(w=>!w.needsSiteinfoData && (w.hidden || this.loadedWikis.indexOf(w.htmlName) > -1)).forEach(wiki=>{
			this._addWiki(wiki);
		});
		// If at least 1 wiki is hidden, then show it on the list
		this.hiddenNode.style.display = this.manager.chosenWikis.some(wiki=>wiki.hidden) ? "initial" : "none";
	}
	
	// Clear panel (on refresh).
	private _addWiki(pWikiInfo:WikiData) : void {
		const ul = pWikiInfo.hidden ? this.hiddenListNode : this.loadedListNode;
		// const li = Utils.newElement("li", null, ul);
		// const favicon = Utils.newElement("span", { id:pWikiInfo.infoID, className: "favicon", innerHTML: pWikiInfo.getFaviconHTML() }, li);
		const favicon = Utils.newElement("li", { id:pWikiInfo.infoID, className: "favicon", innerHTML: pWikiInfo.getFaviconHTML() }, ul);
		favicon.addEventListener("click", (e) => { this.onIconClick(pWikiInfo, e); });
	}
	
	onWikiLoaded(pWikiInfo:WikiData) : void {
		this.loadedWikis.push(pWikiInfo.htmlName);
		this.refresh();
	}
	
	onIconClick(pWikiInfo:WikiData, e:MouseEvent) : void {
		let infoBanner = <HTMLElement>this.infoNode.querySelector(".rcm-wiki-info-banner");
		// If already open for that wiki, then close it.
		if(infoBanner && (<any>infoBanner.dataset).wiki == pWikiInfo.servername && /*Not called via click()*/ e && (e.screenX != 0 && e.screenY != 0)) {
			this.closeInfo();
		} else {
			const tLink=(page:string, key:I18nKey)=>`<a href='${pWikiInfo.getPageUrl(page)}'>${i18n(key)}</a>`;
			const tLinkNum=(page:string, key:I18nKey, num:string|number)=>tLink(page, key)+`: <b>${num}</b>`;
			
			///////////////////////////////
			// Wiki Links
			///////////////////////////////
			// Front page|Site name - RecentChanges - New pages – New files – Logs – Insights
			const wikiLinksList = [
				tLink("Special:RecentChanges"+pWikiInfo.firstSeperator+pWikiInfo.rcParams.paramString, "recentchanges"),
				pWikiInfo.isWikiaWiki && tLink("Special:SocialActivity", "socialactivity-page-title"),
				tLink("Special:NewPages", "newpages"),
				tLink("Special:NewFiles", "newimages"),
				tLink("Special:Log", "log"),
				pWikiInfo.isWikiaWiki && pWikiInfo.user.rights.analytics && tLink("Special:Analytics", "admindashboard-control-analytics-label"),
				tLink("Special:Random", "randompage"),
				pWikiInfo.usesWikiaDiscussions && "<a href='"+pWikiInfo.scriptpath+"/d'>"+i18n("discussions")+"</a>",
			].filter(o=>!!o);
			
			const buttons = [];
			if(!this.singleWiki) {
				if(!pWikiInfo.hidden) {
					buttons.push(`<button id="rcm-hide-cur-wiki" class="rcm-btn rcm-btn-short">${i18n('hide')}</button>`);
					buttons.push(`<button id="rcm-showonly-cur-wiki" class="rcm-btn rcm-btn-short">${i18n('wikipanel-showonly')}</button>`);
				} else {
					buttons.push(`<button id="rcm-show-cur-wiki" class="rcm-btn rcm-btn-short">${i18n('show')}</button>`);
					buttons.push(`<button id="rcm-showonly-cur-wiki" class="rcm-btn rcm-btn-short">${i18n('wikipanel-showonly')}</button>`);
				}
			}
			
			///////////////////////////////
			// Wiki Statistics
			///////////////////////////////
			let statsHTML = ""
			+ "<table class='wikitable center statisticstable' style='margin: 0;'>"
			+ "<tr>"
				+ `<td>${tLinkNum("Special:AllPages", "articles", pWikiInfo.statistics.articles)}</td>`
				+ `<td>${tLinkNum("Special:ListFiles", "prefs-files", pWikiInfo.statistics.images)}</td>`
				+ `<td>${tLinkNum("Special:ListUsers", "statistics-users-active", pWikiInfo.statistics.activeusers)}</td>`
				+ `<td>${tLinkNum("Special:ListAdmins", "group-sysop", pWikiInfo.statistics.admins)}</td>`
				+ `<td>${tLinkNum("Special:Statistics", "edits", pWikiInfo.statistics.edits)}</td>`
			+ "</tr>"
			+ "</table>";
			
			///////////////////////////////
			// Add to page
			///////////////////////////////
			const siteLink = `<a href='${pWikiInfo.articlepath+Utils.escapeCharactersUrl(pWikiInfo.mainpage)}'>${pWikiInfo.sitename}</a>`;
			let html = ""
			+ "<table class='rcm-wiki-infotable'>"
			+ "<tr>"
				+ `<td rowspan='2' class='rcm-favicon-cell'>${pWikiInfo.getFaviconHTML(false, 32)}</td>`
				+ `<td class="rcm-titlelinks-cell">`
					+ `<div class="rcm-wiki-title"><b>${siteLink}</b></div>`
					+ `<div class="rcm-links">${wikiLinksList.join(" • ")}</div>`
					+ (buttons.length > 0 ? `<div class="rcm-buttons">${buttons.join(" ")}</div>` : "")
				+`</td>`
			+ "</tr>"
			// Now for the statistics
			+ "<tr>"
				+ `<td>${statsHTML}</td>`
			+ "</tr>"
			+ "</table>";
			
			this.addBanner(html, !this.singleWiki, `data-wiki='${pWikiInfo.servername}'`);
			
			// Add events
			
			$("#rcm-hide-cur-wiki").on("click", ()=>{
				pWikiInfo.hidden = true;
				this.manager.hardRefresh();
			});
			
			$("#rcm-showonly-cur-wiki").on("click", ()=>{
				this.manager.chosenWikis.forEach(wiki=>{ wiki.hidden = true; });
				pWikiInfo.hidden = false;
				this.manager.hardRefresh();
			});
			
			$("#rcm-show-cur-wiki").on("click", ()=>{
				pWikiInfo.hidden = false;
				this.manager.hardRefresh();
			});
		}
	}
	
	private addBanner(contents:string, addCloseButton:boolean, params:string="") {
		var html = [
			`<div class='rcm-wiki-info-banner banner-notification' ${params}>`,
				(addCloseButton ? "<button class='close wikia-chiclet-button'></button>" : ""),
				`<div class='msg'>${contents}</div>`,
			"</div>",
		].filter(o=>!!o).join("");
		
		this.infoNode.innerHTML = html;
		if(addCloseButton) {
			this.infoNode.querySelector(".rcm-wiki-info-banner .close").addEventListener("click", this.closeInfo.bind(this));
		}
	}
	
	closeInfo() : void {
		$(this.infoNode.querySelector(".rcm-wiki-info-banner")).animate({ height: "toggle", opacity: "toggle" }, 200, function(){
			$(this).remove();
		});
	}
	
	goToAndOpenInfo(e:Event) : void {
		let btn = <HTMLElement>document.querySelector("#"+(<any>(<HTMLElement>e.currentTarget).dataset).infoid);
		if(btn) {
			if(!Utils.elemIsVisible(btn)) {
				let tScrollOffset = Global.config.skin == "oasis" ? -46 : 0;
				// $('html, body').animate({ scrollTop: $(btn).offset().top }, 0);
				$('html, body').scrollTop( $(btn).offset().top + tScrollOffset - 6 );
			}
			btn.click();
		}
	}
}
