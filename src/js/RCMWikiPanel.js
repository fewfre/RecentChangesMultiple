//<syntaxhighlight lang="javascript">

//######################################
// #### Wiki Panel ####
// * Show the current loaded wikis, as well as any information pertaining to them.s
//######################################
window.dev.RecentChangesMultiple.RCMWikiPanel = (function($, document, mw, module, Utils, i18n){
	"use strict";
	
	// Constructor
	function RCMWikiPanel(pManager) {
		this.manager = pManager; // {RCMManager} Keep track of what manager this data is attached to.
		this.root = null;
		
		/***************************
		 * HTML Elements/Nodes
		 ***************************/
		this.listNode		= null; // {HTMLElement}
		this.infoNode		= null; // {HTMLElement}
		
		/***************************
		 * Storage
		 ***************************/
		this.singleWiki = this.manager.chosenWikis.length == 1; // If this panel's manager only contains one wiki.
	}
	
	RCMWikiPanel.prototype.dispose = function() {
		this.manager	= null;
		this.root		= null;
		
		this.listNode	= null;
		this.infoNode	= null;
	}
	
	// Should only be called once.
	RCMWikiPanel.prototype.init = function(pElem) {
		this.root = pElem;
		
		if(!this.singleWiki) this.listNode = Utils.newElement("span", { className:"rcm-wikis-list" }, this.root);
		this.infoNode = Utils.newElement("div", { className:"rcm-wikis-info" }, this.root);
		
		return this;
	}
	
	// Clear panel (on refresh).
	RCMWikiPanel.prototype.populate = function() {
		if(!this.singleWiki) {
			this.listNode.innerHTML = i18n('rcm-wikisloaded');
		}
	}
	
	// Clear panel (on refresh).
	RCMWikiPanel.prototype.clear = function() {
		if(!this.singleWiki) {
			this.listNode.innerHTML = "";
			this.infoNode.innerHTML = "";
		}
	}
	
	// Clear panel (on refresh).
	RCMWikiPanel.prototype.addWiki = function(pWikiInfo) {
		if(this.singleWiki) {
			if(!this.infoNode.innerHTML) this.onIconClick(pWikiInfo, {});
		} else {
			// this.listNode.innerHTML += Utils.formatString("<span class='favicon' href='{0}Special:RecentChanges{2}'>{1}</span>", pWikiInfo.articlepath, pWikiInfo.getFaviconHTML(), pWikiInfo.firstSeperator+pWikiInfo.rcParams.paramString);
			var favicon = Utils.newElement("span", { id:pWikiInfo.infoID, className: "favicon", innerHTML: pWikiInfo.getFaviconHTML() }, this.listNode);
			favicon.addEventListener("click", this.onIconClick.bind(this, pWikiInfo));
			
			if(this.manager.wikisLeftToLoad > 0) {
				Utils.addTextTo(":", this.listNode);
			}
		}
	}
	
	RCMWikiPanel.prototype.onIconClick = function(pWikiInfo, e) {
		var infoBanner = this.infoNode.querySelector(".banner-notification");
		// If already open for that wiki, then close it.
		if(infoBanner && infoBanner.dataset.wiki == pWikiInfo.servername && /*Not called via click()*/(e.screenX != 0 && e.screenY != 0)) {
			this.closeInfo();
		} else {
			// Front page|Site name - RecentChanges - New pages – New files – Logs – Insights
			this.infoNode.innerHTML = "<div class='banner-notification warn' data-wiki='"+pWikiInfo.servername+"'>"//notify
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
			+ "<a href='"+pWikiInfo.articlepath+"Special:RecentChanges"+pWikiInfo.firstSeperator+pWikiInfo.rcParams.paramString+"'>"+i18n("recentchanges")+"</a>"
			+ " - "
			+ "<a href='"+pWikiInfo.articlepath+"Special:NewPages'>"+i18n("newpages")+"</a>"
			+ " - "
			+ "<a href='"+pWikiInfo.articlepath+"Special:NewFiles'>"+i18n("newimages")+"</a>"
			+ " - "
			+ "<a href='"+pWikiInfo.articlepath+"Special:Log'>"+i18n("log")+"</a>"
			
			+ (pWikiInfo.isWikiaWiki ? " - <a href='"+pWikiInfo.articlepath+"Special:Insights'>"+i18n("insights")+"</a>" : "")
			+ " - "
			+ "<a href='"+pWikiInfo.articlepath+"Special:Random'>"+i18n("randompage")+"</a>"
			+ "</td>"
			+ "</tr>"
			// Now for the statistics
				+ "<tr>"
				+ "<td>"
				+ "<table class='wikitable center statisticstable' style='margin: 0;'>"
				+ "<tr>"
					+ "<td><a href='"+pWikiInfo.articlepath+"Special:AllPages'>"+i18n("awc-metrics-articles")+"</a>: <b>" + pWikiInfo.statistics.articles +"</b></td>"
					+ "<td><a href='"+pWikiInfo.articlepath+"Special:ListFiles'>"+i18n("prefs-files")+"</a>: <b>" + pWikiInfo.statistics.images +"</b></td>"
					+ "<td><a href='"+pWikiInfo.articlepath+"Special:ListUsers'>"+i18n("group-user")+"</a>: <b>" + pWikiInfo.statistics.activeusers +"</b></td>"
					+ "<td><a href='"+pWikiInfo.articlepath+"Special:ListAdmins'>"+i18n("group-sysop")+"</a>: <b>" + pWikiInfo.statistics.admins +"</b></td>"
					+ "<td><a href='"+pWikiInfo.articlepath+"Special:Statistics'>"+i18n("awc-metrics-edits")+"</a>: <b>" + pWikiInfo.statistics.edits +"</b></td>"
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
	
	RCMWikiPanel.prototype.closeInfo = function() {
		// $(infoBanner).hide(500, "linear", function() {
		$(this.infoNode.querySelector(".banner-notification")).animate({ height: "toggle", opacity: "toggle" }, 200, function(){
			$(this).remove();
		});
	}
	
	RCMWikiPanel.prototype.goToAndOpenInfo = function(e) {
		// console.log(e, e.currentTarget);
		// console.log(e.currentTarget.dataset.infoid);
		
		var btn = document.querySelector("#"+e.currentTarget.dataset.infoid);
		if(btn) {
			if(!Utils.elemIsVisible(btn)) {
				var tScrollOffset = mw.config.get("skin") == "oasis" ? -46 : 0;
				// $('html, body').animate({ scrollTop: $(btn).offset().top }, 0);
				$('html, body').scrollTop( $(btn).offset().top + tScrollOffset - 6 );
			}
			btn.click();
		}
	}
	
	return RCMWikiPanel;
	
})(window.jQuery, document, window.mediaWiki, window.dev.RecentChangesMultiple, window.dev.RecentChangesMultiple.Utils, window.dev.RecentChangesMultiple.i18n);
//</syntaxhighlight>