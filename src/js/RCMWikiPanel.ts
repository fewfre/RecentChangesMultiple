import RCMManager from "./RCMManager";
import WikiData from "./WikiData";
import ConstantsApp from "./ConstantsApp";
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
	listNode		: HTMLElement;
	infoNode		: HTMLElement;
	
	/***************************
	 * Storage
	 ***************************/
	singleWiki		: boolean; // If this panel's manager only contains one wiki.
	count			: number;
	
	// Constructor
	constructor(pManager:RCMManager) {
		this.manager = pManager;
		
		this.singleWiki = this.manager.chosenWikis.length == 1;
		this.count = 0;
	}
	
	dispose() : void {
		this.manager	= null;
		this.root		= null;
		
		this.listNode	= null;
		this.infoNode	= null;
	}
	
	// Should only be called once.
	init(pElem:HTMLElement) : RCMWikiPanel {
		this.root = pElem;
		
		if(!this.singleWiki) this.listNode = Utils.newElement("span", { className:"rcm-wikis-list" }, this.root);
		this.infoNode = Utils.newElement("div", { className:"rcm-wikis-info" }, this.root);
		
		return this;
	}
	
	// Clear panel (on refresh).
	populate() : void {
		if(!this.singleWiki) {
			this.listNode.innerHTML = i18n('wikipanel-wikisloaded');
		}
	}
	
	// Clear panel (on refresh).
	clear() : void {
		if(!this.singleWiki) {
			this.listNode.innerHTML = "";
			this.infoNode.innerHTML = "";
		}
		this.count = 0;
	}
	
	// Clear panel (on refresh).
	addWiki(pWikiInfo:WikiData) : void {
		if(this.singleWiki) {
			if(!this.infoNode.innerHTML) this.onIconClick(pWikiInfo, null);
		} else {
			if(this.count > 0) {
				Utils.addTextTo(":", this.listNode);
			}
			let favicon = Utils.newElement("span", { id:pWikiInfo.infoID, className: "favicon", innerHTML: pWikiInfo.getFaviconHTML() }, this.listNode);
			favicon.addEventListener("click", (e) => { this.onIconClick(pWikiInfo, e); });
		}
		this.count++;
	}
	
	onIconClick(pWikiInfo:WikiData, e:MouseEvent) : void {
		let infoBanner = <HTMLElement>this.infoNode.querySelector(".banner-notification");
		// If already open for that wiki, then close it.
		if(infoBanner && (<any>infoBanner.dataset).wiki == pWikiInfo.servername && /*Not called via click()*/ e && (e.screenX != 0 && e.screenY != 0)) {
			this.closeInfo();
		} else {
			const tLink=(page:string, key:I18nKey)=>"<a href='"+pWikiInfo.articlepath+page+"'>"+i18n(key)+"</a>";
			const tLinkNum=(page:string, key:I18nKey, num:string|number)=>tLink(page, key)+`: <b>${num}</b>`;
			// Front page|Site name - RecentChanges - New pages – New files – Logs – Insights
			this.infoNode.innerHTML = ""+
			`<div class='banner-notification warn' data-wiki='${pWikiInfo.servername}'>`
			+ (this.singleWiki ? "" : "<button class='close wikia-chiclet-button'><img></button>")
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
				+ [
					tLink("Special:RecentChanges"+pWikiInfo.firstSeperator+pWikiInfo.rcParams.paramString, "recentchanges"),
					tLink("Special:NewPages", "newpages"),
					tLink("Special:NewFiles", "newimages"),
					tLink("Special:Log", "log"),
					pWikiInfo.isWikiaWiki && pWikiInfo.isLegacyWikiaWiki && tLink("Special:Insights", "insights"),
					pWikiInfo.isWikiaWiki && pWikiInfo.user.rights.analytics && tLink("Special:Analytics", "admindashboard-control-analytics-label"),
					tLink("Special:Random", "randompage"),
					pWikiInfo.usesWikiaDiscussions && "<a href='"+pWikiInfo.scriptpath+"/d'>"+i18n("discussions")+"</a>",
					
					
					// "<a href='"+pWikiInfo.articlepath+"Special:RecentChanges"+pWikiInfo.firstSeperator+pWikiInfo.rcParams.paramString+"'>"+i18n("recentchanges")+"</a>",
					// "<a href='"+pWikiInfo.articlepath+"Special:NewPages'>"+i18n("newpages")+"</a>",
					// "<a href='"+pWikiInfo.articlepath+"Special:NewFiles'>"+i18n("newimages")+"</a>",
					// "<a href='"+pWikiInfo.articlepath+"Special:Log'>"+i18n("log")+"</a>",
					// pWikiInfo.isWikiaWiki && pWikiInfo.isLegacyWikiaWiki && "<a href='"+pWikiInfo.articlepath+"Special:Insights'>"+i18n("insights")+"</a>",
					// pWikiInfo.isWikiaWiki && pWikiInfo.user.rights.analytics && "<a href='"+pWikiInfo.articlepath+"Special:Analytics'>"+i18n("admindashboard-control-analytics-label")+"</a>",
					// "<a href='"+pWikiInfo.articlepath+"Special:Random'>"+i18n("randompage")+"</a>",
					// pWikiInfo.usesWikiaDiscussions && "<a href='"+pWikiInfo.scriptpath+"/d'>"+i18n("discussions")+"</a>"
				].filter(o=>!!o).join(" - ")
			+ "</td>"
			+ "</tr>"
			// Now for the statistics
				+ "<tr>"
				+ "<td>"
				+ "<table class='wikitable center statisticstable' style='margin: 0;'>"
				+ "<tr>"
					+ `<td>${tLinkNum("Special:AllPages", (ConstantsApp.isUcpWiki ? "articles" : "awc-metrics-articles"), pWikiInfo.statistics.articles)}</td>`
					+ `<td>${tLinkNum("Special:ListFiles", "prefs-files", pWikiInfo.statistics.images)}</td>`
					+ `<td>${tLinkNum("Special:ListUsers", "group-user", pWikiInfo.statistics.activeusers)}</td>`
					+ `<td>${tLinkNum("Special:ListAdmins", "group-sysop", pWikiInfo.statistics.admins)}</td>`
					+ `<td>${tLinkNum("Special:Statistics", "edits", pWikiInfo.statistics.edits)}</td>`
				
					// + "<td><a href='"+pWikiInfo.articlepath+"Special:AllPages'>"+i18n(ConstantsApp.isUcpWiki ? "articles" : "awc-metrics-articles")+"</a>: <b>" + pWikiInfo.statistics.articles +"</b></td>"
					// + "<td><a href='"+pWikiInfo.articlepath+"Special:ListFiles'>"+i18n("prefs-files")+"</a>: <b>" + pWikiInfo.statistics.images +"</b></td>"
					// + "<td><a href='"+pWikiInfo.articlepath+"Special:ListUsers'>"+i18n("group-user")+"</a>: <b>" + pWikiInfo.statistics.activeusers +"</b></td>"
					// + "<td><a href='"+pWikiInfo.articlepath+"Special:ListAdmins'>"+i18n("group-sysop")+"</a>: <b>" + pWikiInfo.statistics.admins +"</b></td>"
					// + "<td><a href='"+pWikiInfo.articlepath+"Special:Statistics'>"+i18n("edits")+"</a>: <b>" + pWikiInfo.statistics.edits +"</b></td>"
				+ "</tr>"
				+ "</table>"
				+ "</td>"
				+ "</tr>"
			+ "</table>"
			+ "</div>";
			+ "</div>";
			if(!this.singleWiki) {
				this.infoNode.querySelector(".banner-notification .close").addEventListener("click", this.closeInfo.bind(this));
			}
		}
	}
	
	closeInfo() : void {
		$(this.infoNode.querySelector(".banner-notification")).animate({ height: "toggle", opacity: "toggle" }, 200, function(){
			$(this).remove();
		});
	}
	
	goToAndOpenInfo(e:Event) : void {
		let btn = <HTMLElement>document.querySelector("#"+(<any>(<HTMLElement>e.currentTarget).dataset).infoid);
		if(btn) {
			if(!Utils.elemIsVisible(btn)) {
				let tScrollOffset = ConstantsApp.config.skin == "oasis" ? -46 : 0;
				// $('html, body').animate({ scrollTop: $(btn).offset().top }, 0);
				$('html, body').scrollTop( $(btn).offset().top + tScrollOffset - 6 );
			}
			btn.click();
		}
	}
}
