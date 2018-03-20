import RCMManager from "./RCMManager";
import RCData from "./RCData";
import WikiData from "./WikiData";
import Utils from "./Utils";
import i18n from "./i18n";
import RC_TYPE from "./RC_TYPE";
import ConstantsApp from "./ConstantsApp";
import RCMWikiaDiscussionData from "./RCMWikiaDiscussionData";

let $ = (<any>window).jQuery;
let mw = (<any>window).mediaWiki;

//######################################
// #### Recent Change List ####
// * Contains one or more RCData objects. Formats list as needed.
//######################################
export default class RCList
{
	// Static Constants
	static readonly SEP = " . . ";
	
	// Storage
	readonly manager	: RCMManager;
	
	/***************************
	 * "Calculated" Data
	 ***************************/
	list				: RCData[]; // List of RCData this list contains. Should always be at least 1.
	// removeListeners		: (() => void)[]; // List of callbacks that will remove event listeners.
	htmlNode			: HTMLElement;
	
	// Properties
	get newest() : RCData { return this.list[0]; }
	get oldest() : RCData { return this.list[this.list.length-1]; }
	get date() : Date { return this.newest.date; }
	get wikiInfo() : WikiData { return this.newest.wikiInfo; }
	get type() : RC_TYPE { return this.newest.type; }
	
	// Constructor
	constructor(pManager:RCMManager) {
		this.manager = pManager;
		
		this.list			= [];
		// this.removeListeners= [];
	}
	
	dispose() : void {
		delete this.manager;
		
		for(let i=0; i < this.list.length; i++) {
			this.list[i].dispose();
			this.list[i] = null;
		}
		this.list = null;
		
		// // Remove event listeners.
		// for(let i=0; i < this.removeListeners.length; i++) {
		// 	this.removeListeners[i]();
		// 	this.removeListeners[i] = null;
		// }
		// this.removeListeners = null;
		
		this.htmlNode = null;
	}
	
	addRC(pNewRC:RCData) : RCList {
		this.list.push(pNewRC);
		this.list.sort((a, b) => { return b.date.valueOf() - a.date.valueOf(); }); // More efficent and dependable than doing it manually.
		return this; // Return self for chaining or whatnot.
	}
	
	// Removes and disposes
	removeRC(pRC:RCData) : void {
		var tDataInListI = this.list.indexOf(pRC);
		if(tDataInListI > -1) {
			this.list.splice(tDataInListI, 1)[0].dispose();
		} else {
			mw.log("[RCList](removeRC) Data did not exist in list, and thus could not be removed.", pRC);
		}
	}
	
	shouldGroupWith(pRC:RCData) : boolean {
		if(this.wikiInfo.servername == pRC.wikiInfo.servername
			&& this.type == pRC.type
			&& Utils.getMonth(this.date) == Utils.getMonth(pRC.date)
			&& Utils.getDate(this.date) == Utils.getDate(pRC.date)
		) {
			switch(this.type) {
				case RC_TYPE.LOG: {
					if(this.newest.logtype == pRC.logtype) { return true; }
					break;
				}
				default: {
					if(this.newest.uniqueID == pRC.uniqueID) { return true; }
					break;
				}
			}
		}
		return false;
	}
	
	// Returns a url that compares the edits of two RCs (can be the same one twice, since a RC has info on the current and previous edit).
	// If "pToRC" is null, it will link to newest edit.
	getLink(pRC:RCData, pDiff:string|number, pOldId:string|number) : string {
		return pRC.hrefFS + "curid=" + pRC.pageid + (pDiff||pDiff==0 ? "&diff="+pDiff : "") + (pOldId ? "&oldid="+pOldId : "");
	}
	
	// Returns a url that compares the edits of two RCs (can be the same one twice, since a RC has info on the current and previous edit).
	// If "pToRC" is null, it will link to newest edit.
	getDiffLink(pFromRC:RCData, pToRC:RCData) : string {
		return `${pFromRC.hrefFS}curid=${pFromRC.pageid}&diff=${pToRC ? pToRC.revid : 0}&oldid=${pFromRC.old_revid}`;
	}
	
	private _diffHist(pRC:RCData) : string {
		var diffLink = i18n('diff');
		if(pRC.isNewPage == false) {
			diffLink = "<a class='rc-diff-link' href='"+this.getDiffLink(pRC, pRC)+"'>"+diffLink+"</a>"+this.getAjaxDiffButton();
		}
		if(this.type == RC_TYPE.NORMAL && pRC.namespace == 6) {
			diffLink += this.getAjaxImageButton();
		}
		return `(${diffLink+i18n("pipe-separator")}<a class='rc-hist-link' href='${pRC.hrefFS}action=history'>${i18n('hist')}</a>)`;
	}
	
	// Calculates the size difference between the recent change(s), and returns formatted text to appear in HTML.
	private _diffSizeText(pToRC:RCData, pFromRC?:RCData) : string {
		var tDiffSize = pToRC.newlen - (pFromRC ? pFromRC : pToRC).oldlen;
		var tDiffSizeText = mw.language.convertNumber(tDiffSize);
		
		var html = "<strong class='{0}'>{1}</strong>";
		if(tDiffSize > 0) {
			return Utils.formatString(html, "mw-plusminus-pos", i18n('parentheses', "+"+tDiffSizeText));
		} else if(tDiffSize < 0) {
			// The negative is part of the number, so no reason to add it.
			return Utils.formatString(html, "mw-plusminus-neg", i18n('parentheses', tDiffSizeText));
		} else {
			return Utils.formatString(html, "mw-plusminus-null", i18n('parentheses', tDiffSizeText));
		}
	}
	
	// TODO: Convert to a Map once ES6 is used.
	private _contributorsCountText() : string {
		var contribs = {}, indx;
		this.list.forEach((rc:RCData) => {
			if(contribs.hasOwnProperty(rc.author)) {
				contribs[rc.author].count++;
			} else {
				contribs[rc.author] = { count:1, userEdited:rc.userEdited };
				contribs[rc.author].avatar = (rc.type == RC_TYPE.DISCUSSION ? (<RCMWikiaDiscussionData>rc).getAvatarImg() : "");
			}
		});
		
		var returnText = "[", total = 0, tLength = this.list.length;
		Object.keys(contribs).forEach((key) => {
			returnText += this._userPageLink(key, contribs[key].userEdited, contribs[key].avatar) + (contribs[key].count > 1 ? " ("+contribs[key].count+"&times;)" : "");
			total += contribs[key].count;
			if(total < tLength) { returnText += "; "; }
		}, this);
		return returnText + "]";
	}
	
	// For use with comments / normal pages
	private _changesText() : string {
		var returnText = i18n("nchanges", this.list.length);
		if(this.type == RC_TYPE.NORMAL && this.oldest.isNewPage == false) {
			returnText = "<a class='rc-changes-link' href='"+this.getDiffLink(this.oldest, this.newest)+"'>"+returnText+"</a>"+this.getAjaxDiffButton();
		}
		if(this.type == RC_TYPE.NORMAL && this.newest.namespace == 6) {
			returnText += this.getAjaxImageButton();
		}
		return returnText;
	}
	
	private _userPageLink(pUsername:string, pUserEdited:boolean, pAvatar:string) : string {
		if(pUserEdited) {
			return `${pAvatar}<a href='${this.wikiInfo.articlepath}User:${Utils.escapeCharactersLink(pUsername)}' class="${this.wikiInfo.getUserClass(pUsername)}" ${this.wikiInfo.getUserClassDataset(pUsername)}>${pUsername}</a>`;
		} else {
			return `<a class="rcm-useranon" href='${this.wikiInfo.articlepath}Special:Contributions/${Utils.escapeCharactersLink(pUsername)}'>${pUsername}</a>`;
		}
	}
	
	getExistingThreadTitle() : string {
		let tTitle = null;
		this.list.some((rc:RCData) => {
			if(rc.threadTitle) {
				tTitle = rc.threadTitle;
				return true;
			}
			return false;
		});
		return tTitle;
	}
	
	// Check each entry for "threadTitle", else return default text.
	getThreadTitle() : string {
		let tTitle = this.getExistingThreadTitle();
		let tReturnText = tTitle;
		if(this.manager.extraLoadingEnabled) {
			let tElemID = Utils.uniqID();
			tReturnText = "<span id='"+tElemID+"'><i>"+(tTitle ? tTitle : i18n('rcm-unknownthreadname'))+"</i></span>";
			
			// These ajax requests are done here to condense number of requests; title is only needed per list, not per RCData.
			if(this.type != RC_TYPE.DISCUSSION) {
				this.manager.secondaryWikiData.push({
					url: this.wikiInfo.scriptpath+"/api.php?action=query&format=json&prop=revisions&titles="+this.newest.uniqueID+"&rvprop=content",
					callback: (data) => {
						let tSpan = document.querySelector("#"+tElemID);
						// for(var tPageIndex in data.query.pages)
						// var tPage = data.query.pages[tPageIndex];
						var tPage = Utils.getFirstItemFromObject(data.query.pages);
						
						(<HTMLAnchorElement>tSpan.parentNode).href = this.wikiInfo.articlepath + "Thread:" + tPage.pageid;
						let tTitleData = /<ac_metadata title="(.*?)".*?>.*?<\/ac_metadata>/g.exec(tPage.revisions[0]["*"]);
						if(tTitleData != null) {
							tSpan.innerHTML = tTitleData[1];
						}
					}
				});
			} else {
				if(tTitle == null) {
					let tRC = <RCMWikiaDiscussionData>this.newest;
					this.manager.secondaryWikiData.push({
						// https://github.com/Wikia/app/blob/b03df0a89ed672697e9c130d529bf1eb25f49cda/lib/Swagger/src/Discussion/Api/ThreadsApi.php
						url: `//services.wikia.com/discussion/${this.wikiInfo.wikiaCityID}/threads/${tRC.threadId}`,
						dataType: "json",
						callback: (data) => {
							this.newest.threadTitle = data.title || (data.rawContent.slice(0, 35).trim()+"..."); // If no title, use part of original message.
							let tSpan:HTMLElement = <HTMLElement>document.querySelector("#"+tElemID);
							if(tSpan) {
								tSpan.innerHTML = this.newest.threadTitle;
								let tIcons = "";
								if(data.isLocked) { tIcons += ConstantsApp.getSymbol("rcm-lock"); }
								if(data.isReported) { tIcons += ConstantsApp.getSymbol("rcm-report"); }
								if(tIcons) { tSpan.parentNode.insertBefore(Utils.newElement("span", { innerHTML:tIcons }), tSpan); }
							}
						}
					});
				} else {
					tReturnText = tTitle;
				}
			}
		} else {
			if(tReturnText == null) {
				tReturnText = "<i>"+i18n('rcm-unknownthreadname')+"</i>";
			}
		}
		
		return tReturnText;
	}
	
	getAjaxDiffButton() : string {
		return ` <span class="rcm-ajaxIcon rcm-ajaxDiff">${ConstantsApp.getSymbol("rcm-columns")}</span>`;
	}
	
	getAjaxImageButton() : string {
		return ` <span class="rcm-ajaxIcon rcm-ajaxImage">${ConstantsApp.getSymbol("rcm-picture")}</span>`;
	}
	
	getAjaxPagePreviewButton() : string {
		return ` <span class="rcm-ajaxIcon rcm-ajaxPage">${ConstantsApp.getSymbol("rcm-preview")}</span>`;
	}
	
	// https://www.mediawiki.org/wiki/API:Revisions
	addPreviewDiffListener(pElem:HTMLElement|Element, pFromRC:RCData, pToRC?:RCData) : void {
		if(pElem) {
			if(pToRC == undefined) { pToRC = pFromRC; }
			// Initializing here since "rc" may be nulled by the time the event is triggered.
			var pageName = pFromRC.title;
			var pageID = pFromRC.pageid;
			var ajaxLink = this.wikiInfo.scriptpath+`/api.php?action=query&format=json&prop=revisions|info&rvprop=size|user|parsedcomment|timestamp|flags&rvdiffto=${pToRC.revid}&revids=${pFromRC.old_revid}`;
			var diffLink = `${pFromRC.hrefFS}curid=${pFromRC.pageid}&diff=${pToRC.revid}&oldid=${pFromRC.old_revid}`;
			var undoLink = `${pFromRC.hrefFS}curid=${pFromRC.pageid}&undo=${pToRC.revid}&undoafter=${pFromRC.old_revid}&action=edit`;
			// var rollbackLink = null;
			// if(this.wikiInfo.user.hasRollbackRight) {
			// 	ajaxLink += "&rvtoken=rollback";
			// 	// Token provided upon results returned from ajaxLink.
			// 	rollbackLink = Utils.formatString( "{0}action=rollback&from={1}&token=", pFromRC.hrefFS , pFromRC.author );
			// }
			var diffTableInfo = {
				wikiInfo: pFromRC.wikiInfo,
				hrefFS: pFromRC.hrefFS,
				newRev:{ user:pToRC.userDetails(), summary:pToRC.getSummary(), date:pToRC.date, minor:pToRC.isMinorEdit },
			};
			
			this._addAjaxClickListener(pElem, () => { RCData.previewDiff(pageName, pageID, ajaxLink, diffLink, undoLink, diffTableInfo); });
			
			pFromRC = null;
			pToRC = null;
		}
	}
	
	// https://www.mediawiki.org/wiki/API:Imageinfo
	addPreviewImageListener(pElem:HTMLElement|Element, pImageRCs:RCData|RCData[]) : void {
		if( Object.prototype.toString.call( pImageRCs ) !== '[object Array]' ) {
			pImageRCs = [ pImageRCs as RCData ];
		}
		pImageRCs = <RCData[]>pImageRCs;
		if(pElem) {
			var tImageNames = [];
			for (var i = 0; i < pImageRCs.length; i++) {
				if(tImageNames.indexOf(pImageRCs[i].hrefTitle) < 0) {
					tImageNames.push(pImageRCs[i].hrefTitle);
				}
			}
			var ajaxLink = this.wikiInfo.scriptpath+"/api.php?action=query&prop=imageinfo&format=json&redirects&iiprop=url|size";
			var articlepath = this.wikiInfo.articlepath;
			
			this._addAjaxClickListener(pElem, () => { RCData.previewImages(ajaxLink, tImageNames, articlepath); });
			
			// tImageNames = null;
			pImageRCs = null;
		}
	}
	
	// https://www.mediawiki.org/wiki/API:Parsing_wikitext#parse
	addPreviewPageListener(pElem:HTMLElement|Element, pRC:RCData) : void {
		if(pElem) {
			// Initializing here since "rc" may be nulled by the time the event is triggered.
			let ajaxLink = this.wikiInfo.scriptpath+`/api.php?action=parse&format=json&pageid=${pRC.pageid}&prop=text|headhtml&disabletoc=true`;
			var pageName = pRC.title;
			let pageHref = pRC.href;
			if(pRC.type == RC_TYPE.WALL || pRC.type == RC_TYPE.BOARD || pRC.type == RC_TYPE.COMMENT) {
				// TODO: This isn't -exactly- true, but it gives better results than just linking to the href (as of writing this).
				pageHref = this.wikiInfo.articlepath + "Thread:" + pRC.pageid
			}
			let serverLink = this.wikiInfo.server;
			
			this._addAjaxClickListener(pElem, () => { RCData.previewPage(ajaxLink, pageName, pageHref, serverLink); });
		}
	}
	
	private _addAjaxClickListener(pElem:HTMLElement|Element, pCallback:()=>void) : void {
		let tRCM_AjaxIconClickHandler = (e:MouseEvent) => {
			e.preventDefault();
			pCallback();
		}
		pElem.addEventListener("click", tRCM_AjaxIconClickHandler);
		// this.removeListeners.push(() => { pElem.removeEventListener("click", tRCM_AjaxIconClickHandler); });
	}
	
	// private _addRollbackLink(pRC) {
	// 	if(this.extraLoadingEnabled == false) { return ""; }
		
	// 	var tRollback = Utils.newElement("span", { className:"mw-rollback-link" });
	// 	tRollback.appendChild(document.createTextNode(" "));
	// 	var tRollbackLink = Utils.newElement("a", { innerHTML:i18n("rollbacklink") }, tRollback);
	// 	tRollback.appendChild(document.createTextNode("]"));
		
	// 	// Initializing here since "rc" may be nulled by the time the event is triggered.
	// 	var tScriptDir = this.wikiInfo.scriptpath;
	// 	var tVersion = this.wikiInfo.mwversion;
	// 	var tPageName = this.title;
	// 	var tPageID = this.pageid;
	// 	var tRollbackLink = this.hrefFS+"action=rollback&from="+pRC.author+"&token=";
		
	// 	var tRCM_rollback = () => {
	// 		RCList.ajaxRollback(tScriptDir, tVersion, tPageName, tPageID, tRollbackLink);
	// 		tRollbackLink.removeEventListener("click", tRCM_rollback);
	// 	}
	// 	tRollbackLink.addEventListener("click", tRCM_rollback);
	// 	this.removeListeners.push(() => { tRollbackLink.removeEventListener("click", tRCM_rollback); });
		
	// 	pRC = null;
		
	// 	return ;
	// }
	
	// Provide the <abbr> element appropriate to a given abbreviated flag with the appropriate class.
	// Returns a non-breaking space if flag not set.
	private _flag(pFlag:string, pRC:RCData, pEmpty:string) : string {
		var tI18nLetter = "", tI18nTooltip = "";
		switch(pFlag) {
			case "newpage":		{ if(pRC.isNewPage)		{ tI18nLetter="newpageletter";		tI18nTooltip="recentchanges-label-newpage";	} break; }
			case "minoredit":	{ if(pRC.isMinorEdit)	{ tI18nLetter="minoreditletter";	tI18nTooltip="recentchanges-label-minor";	} break; }
			case "botedit":		{ if(pRC.isBotEdit)		{ tI18nLetter="boteditletter";		tI18nTooltip="recentchanges-label-bot";		} break; }
			// case "unpatrolled":	{ if(pRC.zzzzzz)	{ tI18nLetter="unpatrolledletter"; tI18nTooltip="recentchanges-label-unpatrolled"; } }
		}
		if(tI18nLetter == "") { return pEmpty; }
		else {
			return `<abbr class="${pFlag}" title="${i18n(tI18nTooltip)}">${i18n(tI18nLetter)}</abbr>`;
		}
	}
	
	private _getFlags(pRC:RCData, pEmpty:string, pData?:any) : string {
		pData = pData || {};
		return ""
			+this._flag("newpage", pRC, pEmpty)
			+(pData.ignoreminoredit ? pEmpty : this._flag("minoredit", pRC, pEmpty) )
			+this._flag("botedit", pRC, pEmpty)
			+pEmpty//this._flag("unpatrolled", this.oldest)
		;
	}
	
	private _showFavicon() : boolean {
		return this.manager.chosenWikis.length > 1;
	}
	
	private _getBackgroundClass() : string {
		return this._showFavicon() ? "rcm-tiled-favicon" : "";
	}
	
	// An RC that is NOT part of a "block" of related changes (logs, edits to same page, etc)
	private _toHTMLSingle(pRC:RCData) : HTMLElement {
		if(this.list.length > 1) { return this._toHTMLBlock(); }
		
		var html = "";
		switch(pRC.type) {
			case RC_TYPE.LOG: {
				html += pRC.logTitleLink();
				if(pRC.logtype=="upload") { html += this.getAjaxImageButton(); }
				html += RCList.SEP;
				html += pRC.logActionText();
				break;
			}
			case RC_TYPE.WALL:
			case RC_TYPE.BOARD: {
				if(pRC.isWallBoardAction) {
					html += RCList.SEP;
					html += pRC.userDetails();
					html += pRC.wallBoardActionMessageWithSummary( this.getThreadTitle() );
				} else {
					html += pRC.wallBoardTitleText( this.getThreadTitle() );
					html += this.getAjaxPagePreviewButton();
					html += " "+this._diffHist(pRC);
					html += RCList.SEP;
					html += this._diffSizeText(pRC);
					html += RCList.SEP;
					html += pRC.userDetails();
					html += pRC.getSummary();
				}
				break;
			}
			case RC_TYPE.DISCUSSION: {
				let tRC = <RCMWikiaDiscussionData>pRC;
				html += tRC.getThreadStatusIcons();
				html += tRC.discusssionTitleText( this.getThreadTitle() );
				html += RCList.SEP;
				html += tRC.userDetails();
				html += tRC.getSummary();
				break;
			}
			case RC_TYPE.COMMENT:
			case RC_TYPE.NORMAL:
			default: {
				html += pRC.pageTitleTextLink();
				html += this.getAjaxPagePreviewButton();
				html += " "+this._diffHist(pRC);
				html += RCList.SEP;
				html += this._diffSizeText(pRC);
				html += RCList.SEP;
				html += pRC.userDetails();
				html += pRC.getSummary();
				// if(this.type == RC_TYPE.NORMAL && this.isNewPage == false && this.wikiInfo.user.hasRollbackRight) {
				//  html += " [<a href='"+this.href+"action=rollback&from="+this.entry.author.name+"'>rollback</a>]";
				// }
				break;
			}
		}
		
		var tTable = Utils.newElement("table", { className:"mw-enhanced-rc "+pRC.wikiInfo.rcClass+" "+pRC.getNSClass() });
		Utils.newElement("caption", { className:this._getBackgroundClass() }, tTable); // Needed for CSS background.
		var tRow = Utils.newElement("tr", {}, tTable);
		if(this._showFavicon()) { Utils.newElement("td", { innerHTML:pRC.wikiInfo.getFaviconHTML(true) }, tRow); }
		Utils.newElement("td", { className:"mw-enhanced-rc", innerHTML:""
			+'<img src="//images.wikia.nocookie.net/__cb1422546004/common/skins/common/images/Arr_.png" width="12" height="12" alt="&nbsp;" title="">'
			+this._getFlags(pRC, "&nbsp;")
			+"&nbsp;"
			+pRC.time()
			+"&nbsp;"
		}, tRow);
		Utils.newElement("td", { innerHTML:html }, tRow);
		
		this.addPreviewDiffListener(tTable.querySelector(".rcm-ajaxDiff"), pRC);
		this.addPreviewImageListener(tTable.querySelector(".rcm-ajaxImage"), pRC);
		this.addPreviewPageListener(tTable.querySelector(".rcm-ajaxPage"), pRC);
		if(this.manager.makeLinksAjax) {
			this.addPreviewDiffListener(tTable.querySelector(".rc-diff-link"), pRC);
			if(tTable.querySelector(".rcm-ajaxImage")) {
				this.addPreviewImageListener(tTable.querySelector(".rc-log-link"), pRC);
				this.addPreviewImageListener(tTable.querySelector(".rc-pagetitle"), pRC);
			}
		}
		
		return <HTMLElement>tTable;
	}
	
	// An RCList that IS a "block" of related changes (logs, edits to same page, etc)
	private _toHTMLBlock() : HTMLElement {
		if(this.list.length == 1) { return <HTMLElement>this._toHTMLSingle(this.newest); }
		
		var tBlockHead = this._toHTMLBlockHead();
		for(var i=0; i < this.list.length; i++) {
			tBlockHead.querySelector("tbody").appendChild( this._toHTMLBlockLine(this.list[i]) );
		}
		// Make "blocks" collapsible - for this to work, make sure neither this NOR IT'S PARENT is modified via innerHTML after this has been added (to avoid event being "eaten").
		if($(tBlockHead).makeCollapsible) { $(tBlockHead).makeCollapsible(); }
		return <HTMLElement>tBlockHead;
	}
	
	// The first line of a RC "group"
	private _toHTMLBlockHead() : HTMLElement {
		var html = "";
		switch(this.type) {
			case RC_TYPE.LOG: {
				html += this.newest.logTitleLink();
				if(this.newest.logtype=="upload") { html += this.getAjaxImageButton(); }
				break;
			}
			case RC_TYPE.NORMAL: {
				html += "<a class='rc-pagetitle' href='"+this.newest.href+"'>"+this.newest.title+"</a>";
				html += this.getAjaxPagePreviewButton();
				html += " ("+this._changesText()+i18n("pipe-separator")+"<a href='"+this.newest.hrefFS+"action=history'>"+i18n("hist")+"</a>)";
				html += RCList.SEP
				html += this._diffSizeText(this.newest, this.oldest);
				break;
			}
			case RC_TYPE.WALL: {
				html += this.newest.wallBoardTitleText( this.getThreadTitle() );
				html += " ("+this._changesText()+")";
				break;
			}
			case RC_TYPE.BOARD: {
				html += this.newest.wallBoardTitleText( this.getThreadTitle() );
				html += " ("+this._changesText()+")";
				break;
			}
			case RC_TYPE.DISCUSSION: {
				html += (<RCMWikiaDiscussionData>this.newest).discusssionTitleText( this.getThreadTitle(), true );
				html += " ("+this._changesText()+")";
				break;
			}
			case RC_TYPE.COMMENT: {
				// Link to comments sections on main page. If in main namespace, add the namespace to the page (if requested, custom namespaces can have comments)
				let tNameSpaceText = this.newest.namespace==1 ? "" : this.wikiInfo.namespaces[String(this.newest.namespace-1)]["*"]+":";
				html += i18n.wiki2html( i18n.MESSAGES["article-comments-rc-comments"].replace("$1", "$3|$1"), tNameSpaceText+this.newest.titleNoNS, undefined, this.wikiInfo.articlepath + tNameSpaceText + this.newest.titleNoNS+"#WikiaArticleComments" );
				html += " ("+this._changesText()+")";
				// html += SEP
				// html += this._diffSizeText(this.newest, this.oldest);
				break;
			}
		}
		html += RCList.SEP;
		html += this._contributorsCountText();
		
		var tTable = Utils.newElement("table", { className:"mw-collapsible mw-enhanced-rc mw-collapsed "+this.newest.wikiInfo.rcClass+" "+this.newest.getNSClass() }); // mw-made-collapsible
		Utils.newElement("caption", { className:this._getBackgroundClass() }, tTable); // Needed for CSS background.
		var tTbody = Utils.newElement("tbody", {}, tTable); // tbody is needed for $.makeCollapsible() to work.
		var tRow = Utils.newElement("tr", {}, tTbody);
		if(this._showFavicon()) { Utils.newElement("td", { innerHTML:this.newest.wikiInfo.getFaviconHTML(true) }, tRow); }
		var td1 = Utils.newElement("td", {}, tRow);
			Utils.newElement("span", { className:"mw-collapsible-toggle", innerHTML:''
				+'<span class="mw-rc-openarrow"><a title="'+i18n("rc-enhanced-expand")+'">'// href="#"
					+'<img width="12" height="12" title="'+i18n("rc-enhanced-expand")+'" alt="+" src="//images.wikia.nocookie.net/__cb1422546004/common/skins/common/images/Arr_r.png">'
				+'</a></span>'
				+'<span class="mw-rc-closearrow"><a title="'+i18n("rc-enhanced-hide")+'">'// href="#"
						+'<img width="12" height="12" title="'+i18n("rc-enhanced-hide")+'" alt="-" src="//images.wikia.nocookie.net/__cb1422546004/common/skins/common/images/Arr_d.png">'
				+'</a></span>' }, td1);
		Utils.newElement("td", { className:"mw-enhanced-rc", innerHTML:""
			+this._getFlags(this.oldest, "&nbsp;", { ignoreminoredit:true })
			+"&nbsp;"
			+this.newest.time()
			+"&nbsp;"
		}, tRow);
		Utils.newElement("td", { innerHTML:html }, tRow);
		
		this.addPreviewDiffListener(tTable.querySelector(".rcm-ajaxDiff"), this.oldest, this.newest);
		this.addPreviewImageListener(tTable.querySelector(".rcm-ajaxImage"), this.list);
		this.addPreviewPageListener(tTable.querySelector(".rcm-ajaxPage"), this.newest);
		if(this.manager.makeLinksAjax) {
			this.addPreviewDiffListener(tTable.querySelector(".rc-diff-link, .rc-changes-link"), this.oldest, this.newest);
			if(tTable.querySelector(".rcm-ajaxImage")) {
				this.addPreviewImageListener(tTable.querySelector(".rc-log-link"), this.list);
				this.addPreviewImageListener(tTable.querySelector(".rc-pagetitle"), this.list);
			}
		}
		
		return <HTMLElement>tTable;
	}
	
	// The individual lines of a RC "group"
	private _toHTMLBlockLine(pRC:RCData) : HTMLElement {
		var html = "";
		
		switch(pRC.type) {
			case RC_TYPE.LOG: {
				html += "<span class='mw-enhanced-rc-time'>"+pRC.time()+"</span>"
				if(pRC.logtype=="upload") { html += this.getAjaxImageButton(); }
				html += RCList.SEP;
				html += pRC.logActionText();
				break;
			}
			case RC_TYPE.WALL:
			case RC_TYPE.BOARD: {
				if(pRC.isWallBoardAction) {
					html += "<span class='mw-enhanced-rc-time'>"+pRC.time()+"</span>"
					html += RCList.SEP;
					html += pRC.userDetails();
					html += pRC.wallBoardActionMessageWithSummary( this.getThreadTitle() );
				} else {
					html += "<span class='mw-enhanced-rc-time'><a href='"+pRC.href+"' title='"+pRC.title+"'>"+pRC.time()+"</a></span>";
					html += " (<a href='"+pRC.href+"'>"+i18n("cur")+"</a>";
					html += this.getAjaxPagePreviewButton();
					if(pRC.isNewPage == false) {
						html += i18n("pipe-separator")+"<a href='"+this.getDiffLink(pRC, pRC)+"'>"+i18n("last")+"</a>"+this.getAjaxDiffButton();
					}
					html += ")";
					html += RCList.SEP;
					html += this._diffSizeText(pRC);
					html += RCList.SEP;
					html += pRC.userDetails();
					html += pRC.getSummary();
				}
				break;
			}
			case RC_TYPE.DISCUSSION: {
				let tRC = <RCMWikiaDiscussionData>pRC;
				html += "<span class='mw-enhanced-rc-time'><a href='"+tRC.href+"' title='"+tRC.title+"'>"+tRC.time()+"</a></span>";
				html += tRC.getThreadStatusIcons();
				html += tRC.getUpvoteCount();
				html += RCList.SEP;
				html += pRC.userDetails();
				html += pRC.getSummary();
				break;
			}
			case RC_TYPE.COMMENT:
			case RC_TYPE.NORMAL: {
				html += "<span class='mw-enhanced-rc-time'><a href='"+this.getLink(pRC, null, pRC.revid)+"' title='"+pRC.title+"'>"+pRC.time()+"</a></span>"
				html += " (<a href='"+this.getLink(pRC, 0, pRC.revid)+"'>"+i18n("cur")+"</a>";
				if(pRC.type == RC_TYPE.COMMENT) {
					html += this.getAjaxPagePreviewButton();
				}
				if(pRC.isNewPage == false) {
					html += i18n("pipe-separator")+"<a href='"+this.getLink(pRC, pRC.revid, pRC.old_revid)+"'>"+i18n("last")+"</a>"+this.getAjaxDiffButton();
				}
				html += ")";
				html += RCList.SEP;
				html += this._diffSizeText(pRC);
				html += RCList.SEP;
				html += pRC.userDetails();
				html += pRC.getSummary();
				break;
			}
		}
		
		var tRow = Utils.newElement("tr", { style:"display: none;" });
		if(this._showFavicon()) { Utils.newElement("td", {}, tRow); } // Blank spot for where favicon would be on a normal table
		Utils.newElement("td", {}, tRow); // Blank spot for where collapsing arrow would be on the table
		Utils.newElement("td", { className:"mw-enhanced-rc", innerHTML:""
			+this._getFlags(pRC, "&nbsp;")
			+"&nbsp;"
		}, tRow);
		Utils.newElement("td", { className:"mw-enhanced-rc-nested", innerHTML:html }, tRow);
		
		this.addPreviewDiffListener(tRow.querySelector(".rcm-ajaxDiff"), pRC);
		this.addPreviewImageListener(tRow.querySelector(".rcm-ajaxImage"), pRC);
		this.addPreviewPageListener(tRow.querySelector(".rcm-ajaxPage"), pRC);
		if(this.manager.makeLinksAjax) { this.addPreviewDiffListener(tRow.querySelector(".rc-diff-link"), pRC); }
		
		return <HTMLElement>tRow;
	}
	
	private _toHTMLNonEnhanced(pRC:RCData, pIndex:number) : HTMLElement {
		var html = "";
		switch(pRC.type) {
			case RC_TYPE.LOG: {
				html += pRC.logTitleLink();
				if(pRC.logtype=="upload") { html += this.getAjaxImageButton(); }
				html += i18n("semicolon-separator")+pRC.time();
				html += RCList.SEP;
				html += pRC.logActionText();
				break;
			}
			case RC_TYPE.WALL:
			case RC_TYPE.BOARD: {
				if(pRC.isWallBoardAction) {
					html += pRC.wallBoardHistoryLink();
					html += i18n("semicolon-separator")+pRC.time();
					html += RCList.SEP;
					html += pRC.userDetails();
					html += pRC.wallBoardActionMessageWithSummary( this.getThreadTitle() );
				} else {
					html += this._diffHist(pRC);
					html += RCList.SEP;
					html += this._getFlags(pRC, "")+" ";
					html += pRC.wallBoardTitleText( this.getThreadTitle() );
					html += this.getAjaxPagePreviewButton();
					html += i18n("semicolon-separator")+pRC.time();
					html += RCList.SEP;
					html += this._diffSizeText(pRC);
					html += RCList.SEP;
					html += pRC.userDetails();
					html += pRC.getSummary();
				}
				break;
			}
			case RC_TYPE.DISCUSSION: {
				let tRC = <RCMWikiaDiscussionData>pRC;
				html += tRC.getThreadStatusIcons();
				html += tRC.discusssionTitleText( this.getThreadTitle() );
				html += i18n("semicolon-separator")+pRC.time();
				html += RCList.SEP;
				html += tRC.userDetails();
				html += tRC.getSummary();
				break;
			}
			case RC_TYPE.COMMENT:
			case RC_TYPE.NORMAL:
			default: {
				html += this._diffHist(pRC);
				html += RCList.SEP;
				html += this._getFlags(pRC, "")+" ";
				html += pRC.pageTitleTextLink();
				html += this.getAjaxPagePreviewButton();
				html += i18n("semicolon-separator")+pRC.time();
				html += RCList.SEP;
				html += this._diffSizeText(pRC);
				html += RCList.SEP;
				html += pRC.userDetails();
				html += pRC.getSummary();
				break;
			}
		}
		
		var tLi = Utils.newElement("li", { className:(pIndex%2==0 ? "mw-line-even" : "mw-line-odd")+" "+pRC.wikiInfo.rcClass+" "+pRC.getNSClass() });
		Utils.newElement("div", { className:this._getBackgroundClass() }, tLi);;
		if(this._showFavicon()) { tLi.innerHTML += pRC.wikiInfo.getFaviconHTML(true)+" "; }
		tLi.innerHTML += html;
		
		this.addPreviewDiffListener(tLi.querySelector(".rcm-ajaxDiff"), pRC);
		this.addPreviewImageListener(tLi.querySelector(".rcm-ajaxImage"), pRC);
		this.addPreviewPageListener(tLi.querySelector(".rcm-ajaxPage"), pRC);
		if(this.manager.makeLinksAjax) {
			this.addPreviewDiffListener(tLi.querySelector(".rc-diff-link"), pRC);
			if(tLi.querySelector(".rcm-ajaxImage")) {
				this.addPreviewImageListener(tLi.querySelector(".rc-log-link"), pRC);
				this.addPreviewImageListener(tLi.querySelector(".rc-pagetitle"), pRC);
			}
		}
		
		return <HTMLElement>tLi;
	}
	
	toHTML(pIndex:number) : HTMLElement {
		if(this.manager.rcParams.hideenhanced) {
			return this.htmlNode = this._toHTMLNonEnhanced(this.newest, pIndex);
		} else {
			if(this.list.length > 1) {
				return this.htmlNode = this._toHTMLBlock();
			} else {
				return this.htmlNode = this._toHTMLSingle(this.newest);
			}
		}
	}
	
	//######################################
	// Static methods
	//######################################
	// static ajaxRollback(pScriptDir, pVersion, pPageName, pPageID, pRollbackLink) {
	// 	var tAPiUrl = pScriptDir+"/api.php?", isV1_24Plus = Utils.version_compare(pVersion, "1.24", ">=");
	// 	if(isV1_24Plus) {
	// 		tAPiUrl += "action=query&meta=tokens&type=rollback";
	// 	} else {
	// 		tAPiUrl += "action=query&prop=revisions&format=json&rvtoken=rollback&titles="+Utils.escapeCharactersLink(pPageName)
	// 	}
		
	// 	$.ajax({ type: 'GET', dataType: 'jsonp', data: {}, url:tAPiUrl,
	// 		success: (pData) => {
	// 			var tToken = "";
	// 			if(isV1_24Plus) {
	// 				tToken = pData.query.tokens.rollbacktoken;
	// 			} else {
	// 				tToken = pData.query.pages[pPageID].revisions[0].rollbacktoken;
	// 			}
	// 			mw.log(pRollbackLink+tToken);
	// 		},
	// 		error: (pData) => {
				
	// 		},
	// 	});
	// }
}
