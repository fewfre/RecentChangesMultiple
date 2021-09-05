import RCMManager from "../RCMManager";
import WikiData from "../WikiData";
import Utils from "../Utils";
import i18n, { I18nKey } from "../i18n";
import Global from "../Global";
import {previewDiff,previewDiscussionHTML,previewImages,previewPage} from "../GlobalModal";
import { RCData, RCDataArticle, RCDataLog, RCDataFandomDiscussion, RC_TYPE } from ".";

let $ = window.jQuery;
let mw = window.mediaWiki;

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
	
	// Constructor
	constructor(pManager:RCMManager) {
		this.manager = pManager;
		
		this.list			= [];
		// this.removeListeners= [];
	}
	
	dispose() : void {
		// @ts-ignore - It's read only, but we still want it deleted here
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
		return this.wikiInfo.scriptpath == pRC.wikiInfo.scriptpath
			&& this.newest.type == pRC.type
			&& this.newest.groupWithID == pRC.groupWithID
			&& Utils.getMonth(this.date) == Utils.getMonth(pRC.date)
			&& Utils.getDate(this.date) == Utils.getDate(pRC.date)
		;
	}
	
	private _diffHist(pRC:RCDataArticle) : string {
		var diffLink = i18n('diff');
		if(pRC.editFlags.newpage == false) {
			diffLink = `<a class='rc-diff-link' href='${pRC.getRcCompareDiffUrl(pRC)}'>${diffLink}</a>`+this.getAjaxDiffButton();
		}
		if(pRC.namespace == 6) {
			diffLink += this.getAjaxImageButton();
		}
		return `${i18n('parentheses-start')}${diffLink}${i18n("pipe-separator")}<a class='rc-hist-link' href='${pRC.getUrl({ action:'history' })}'>${i18n('hist')}</a>${i18n('parentheses-end')}`;
	}
	
	// Calculates the size difference between the recent change(s), and returns formatted text to appear in HTML.
	private _diffSizeText(pToRC:RCDataArticle, pFromRC?:RCDataArticle) : string {
		var tDiffSize = pToRC.newlen - (pFromRC ?? pToRC).oldlen;
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
		const contribs = this.list.reduce((map, rc) => {
			if(map.has(rc.author)) {
				map.get(rc.author).count++;
			} else {
				map.set(rc.author, { count:1, anon:!rc.userEdited, avatar:(rc.type == RC_TYPE.DISCUSSION ? rc.getCreatorAvatarImg() : "") });
			}
			return map;
		}, new Map<string, { count:number, anon:boolean, avatar:string }>());
		
		const contribLinks:string[] = [];
		contribs.forEach(({ count, anon, avatar }, key) => {
			contribLinks.push(this._userPageLink(key, !anon, avatar) + (count > 1 ? " "+i18n('parentheses', i18n('ntimes', count)) : ""));
		});
		
		return i18n('brackets', contribLinks.join(i18n('semicolon-separator')));
	}
	
	private _userPageLink(pUsername:string, pUserEdited:boolean, pAvatar:string) : string {
		if(pUserEdited) {
			return `${pAvatar}<a href='${this.wikiInfo.getPageUrl(`User:${Utils.escapeCharactersUrl(pUsername)}`)}' class="${this.wikiInfo.getUserClass(pUsername)}" ${this.wikiInfo.getUserClassDataset(pUsername)}>${pUsername}</a>`;
		} else {
			return `<a class="rcm-useranon" href='${this.wikiInfo.getPageUrl(`Special:Contributions/${Utils.escapeCharactersUrl(pUsername)}`)}'>${pUsername}</a>`;
		}
	}
	
	getExistingThreadTitle() : string {
		let tTitle = null;
		this.list.some((rc:RCDataFandomDiscussion) => {
			if(rc.threadTitle) {
				tTitle = rc.threadTitle;
				return true;
			}
			return false;
		});
		return tTitle;
	}
	
	// Check each entry for "threadTitle", else return default text.
	// DEPRECIATED? - thread title is now always included
	getThreadTitle() : string {
		let tTitle = this.getExistingThreadTitle();
		let tReturnText = tTitle;
		if(this.manager.extraLoadingEnabled) {
			let tElemID = Utils.uniqID();
			tReturnText = `<span id='${tElemID}'><i>${tTitle ? tTitle : i18n('unknownthreadname')}</i></span>`;
			
			if(tTitle == null) {
				// (<RCDataFandomDiscussion>this.newest).handleSecondaryLoad(tElemID);
			} else {
				tReturnText = tTitle;
			}
		} else {
			if(tReturnText == null) {
				tReturnText = `<i>${i18n('unknownthreadname')}</i>`;
			}
		}
		
		return tReturnText;
	}
	
	getAjaxDiffButton() : string {
		return ` <span class="rcm-ajaxIcon rcm-ajaxDiff">${Global.getSymbol("rcm-columns")}</span>`;
	}
	
	getAjaxImageButton() : string {
		return ` <span class="rcm-ajaxIcon rcm-ajaxImage">${Global.getSymbol("rcm-picture")}</span>`;
	}
	
	getAjaxPagePreviewButton() : string {
		return ` <span class="rcm-ajaxIcon rcm-ajaxPage">${Global.getSymbol("rcm-preview")}</span>`;
	}
	
	// https://www.mediawiki.org/wiki/API:Revisions
	addPreviewDiffListener(pElem:HTMLElement|Element, pFromRC:RCData, pToRC?:RCData) : void {
		if(!pElem) { return; }
		if(pToRC == undefined) { pToRC = pFromRC; }
		// Only apply listener if normal RC (in theory no other types should have an element that triggers this, but this is mostly for type checking)
		if(pFromRC.type != RC_TYPE.NORMAL || pToRC.type != RC_TYPE.NORMAL) { return; }
		
		// Initializing here since "rc" may be nulled by the time the event is triggered.
		var pageName = pFromRC.title;
		var pageID = pFromRC.pageid;
		var ajaxLink = this.wikiInfo.getApiUrl({
			action:'query', format:'json', prop:'revisions|info', rvprop:'size|user|parsedcomment|timestamp|flags',
			rvdiffto:pToRC.revid, revids:pFromRC.old_revid
		});
		// // TODO: other way to get diff link is depreciated - but since fandom doesn't currently support "timestamp", can't switch to new way yet
		// var ajaxLink = this.wikiInfo.getApiUrl({
		// 	action:'compare', format:'json', prop:'diff|ids|title|size|user|parsedcomment|timestamp',
		// 	torev:pToRC.revid, fromrev:pFromRC.old_revid
		// });
		const diffLink = pFromRC.getUrl({ curid:pFromRC.pageid, diff:pToRC.revid, oldid:pFromRC.old_revid });
		const undoLink = pFromRC.getUrl({ curid:pFromRC.pageid, undo:pToRC.revid, undoafter:pFromRC.old_revid, action:'edit' });
		// var rollbackLink = null;
		// if(this.wikiInfo.user.rights.rollback) {
		// 	ajaxLink += "&meta=tokens&type=rollback";
		// 	// Token provided upon results returned from ajaxLink.
		// 	rollbackLink = pFromRC.getUrl({ action:'rollback', from:pFromRC.author, token:'' });
		// }
		var diffTableInfo = {
			wikiInfo: pFromRC.wikiInfo,
			titleUrlEscaped: pFromRC.titleUrlEscaped,
			newRev:{ user:pToRC.userDetails(), summary:pToRC.getSummary(), date:pToRC.date, minor:pToRC.editFlags.minoredit },
		};
		
		this._addAjaxClickListener(pElem, () => { previewDiff(pageName, pageID, ajaxLink, diffLink, undoLink, diffTableInfo); });
		
		pFromRC = null;
		pToRC = null;
	}
	
	// https://www.mediawiki.org/wiki/API:Imageinfo
	addPreviewImageListener(pElem:HTMLElement|Element, pImageRCs:RCData|RCData[]) : void {
		if(!pElem) { return; }
		
		// Discussions won't have an element that triggers this, so safe to ignore them
		const imageRCs = <(RCDataArticle|RCDataLog)[]>(Array.isArray(pImageRCs) ? pImageRCs : [ pImageRCs ]);
		var tImageNames = imageRCs.map(rc=>rc.titleUrlEscaped).filter((name,pos,arr)=>arr.indexOf(name)==pos);
		
		var ajaxLink = this.wikiInfo.getApiUrl({ action:'query', format:'json', prop:'imageinfo', iiprop:'url|size', redirects:'1' });
		var articlepath = this.wikiInfo.articlepath;
		
		this._addAjaxClickListener(pElem, () => { previewImages(ajaxLink, tImageNames, articlepath); });
	}
	
	// https://www.mediawiki.org/wiki/API:Parsing_wikitext#parse
	addPreviewPageListener(pElem:HTMLElement|Element, pRC:RCData) : void {
		if(!pElem) { return; }
		
		switch(pRC.type) {
			case RC_TYPE.DISCUSSION: {
				this._addAjaxClickListener(pElem, () => {
					// Since there's no ajax, we don't need to worry about the RC being deleted between click and modal opening, so we can pass it right in
					previewDiscussionHTML(pRC as RCDataFandomDiscussion);
				});
				
				break;
			}
			case RC_TYPE.NORMAL: {
				// Initializing here since "rc" may be nulled by the time the event is triggered.
				const ajaxLink = this.wikiInfo.getApiUrl({ action:'parse', format:'json', pageid:pRC.pageid, prop:'text|headhtml', disabletoc:'true' });
				const pageName = pRC.title;
				const pageHref = pRC.href;
				const serverLink = this.wikiInfo.server;
				
				this._addAjaxClickListener(pElem, () => { previewPage(ajaxLink, pageName, pageHref, serverLink); });
				break;
			}
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
	
	static readonly FLAG_INFO_MAP = {
		newpage:     { letter:"newpageletter",     tooltip:"recentchanges-label-newpage" } as { letter:I18nKey, tooltip:I18nKey },
		minoredit:   { letter:"minoreditletter",   tooltip:"recentchanges-label-minor" } as { letter:I18nKey, tooltip:I18nKey },
		botedit:     { letter:"boteditletter",     tooltip:"recentchanges-label-bot" } as { letter:I18nKey, tooltip:I18nKey },
		// unpatrolled: { letter:"unpatrolledletter", tooltip:"recentchanges-label-unpatrolled" } as { letter:I18nKey, tooltip:I18nKey },
	}
	
	// Provide the <abbr> element appropriate to a given abbreviated flag with the appropriate class.
	// Returns a non-breaking space if flag not set.
	private _flag(pFlag:keyof typeof RCList.FLAG_INFO_MAP, pRC:RCData, pEmpty:string) : string {
		if(!pRC.editFlags[pFlag]) { return pEmpty; }
		const { letter, tooltip } = RCList.FLAG_INFO_MAP[pFlag];
		return `<abbr class="${pFlag}" title="${i18n(tooltip)}">${i18n(letter)}</abbr>`;
	}
	
	private _getFlags(pRC:RCData, pEmpty:string, pData?:{ ignoreminoredit:boolean }) : string {
		return [
			this._flag("newpage", pRC, pEmpty),
			(pData?.ignoreminoredit ? pEmpty : this._flag("minoredit", pRC, pEmpty) ),
			this._flag("botedit", pRC, pEmpty),
			pEmpty//this._flag("unpatrolled", this.oldest),
		].join("");
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
				let tRC = <RCDataLog>pRC;
				html += tRC.logTitleLink();
				if(tRC.logtype=="upload") { html += this.getAjaxImageButton(); }
				html += RCList.SEP;
				html += tRC.logActionText();
				break;
			}
			case RC_TYPE.DISCUSSION: {
				let tRC = <RCDataFandomDiscussion>pRC;
				html += tRC.getThreadStatusIcons();
				html += tRC.discussionTitleText( tRC.containerType != "ARTICLE_COMMENT" ? this.getThreadTitle() : "unused" );
				if((this.newest as RCDataFandomDiscussion).previewData) html += this.getAjaxPagePreviewButton();
				html += RCList.SEP;
				html += tRC.userDetails();
				html += tRC.getSummary();
				break;
			}
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
				// if(this.type == RC_TYPE.NORMAL && this.isNewPage == false && this.wikiInfo.user.rights.rollback) {
				//  html += " [<a href='"+this.href+"action=rollback&from="+this.entry.author.name+"'>rollback</a>]";
				// }
				break;
			}
		}
		
		var tTable = Utils.newElement("table", { className:`mw-enhanced-rc ${pRC.wikiInfo.rcClass} ${pRC.getNSClass()}` });
		Utils.newElement("caption", { className:this._getBackgroundClass() }, tTable); // Needed for CSS background.
		var tRow = Utils.newElement("tr", {}, tTable);
		if(this._showFavicon()) { Utils.newElement("td", { innerHTML:pRC.wikiInfo.getFaviconHTML(true) }, tRow); }
		Utils.newElement("td", { className:"mw-enhanced-rc", innerHTML:""
			+'<span class="rcm-arr none">&nbsp;</span>'
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
		if($(tBlockHead).makeCollapsibleRCM) { $(tBlockHead).makeCollapsibleRCM(); }
		return <HTMLElement>tBlockHead;
	}
	
	// The first line of a RC "group"
	private _toHTMLBlockHead() : HTMLElement {
		var html = "";
		switch(this.newest.type) {
			case RC_TYPE.LOG: {
				html += this.newest.logTitleLink();
				if(this.newest.logtype=="upload") { html += this.getAjaxImageButton(); }
				break;
			}
			case RC_TYPE.NORMAL: {
				html += `<a class='rc-pagetitle' href='${this.newest.href}'>${this.newest.title}</a>`;
				html += this.getAjaxPagePreviewButton();
				html += " "+i18n('parentheses-start');
				html += this.oldest.editFlags.newpage == false
					? `<a class='rc-changes-link' href='${(this.oldest as RCDataArticle).getRcCompareDiffUrl(this.newest)}'>${i18n("nchanges", this.list.length)}</a>`+this.getAjaxDiffButton()
					: i18n("nchanges", this.list.length);
				if(this.newest.namespace == 6) {
					html += this.getAjaxImageButton();
				}
				html += i18n("pipe-separator");
				html += `<a href='${this.newest.getUrl({ action:'history' })}'>${i18n("hist")}</a>`;
				html += i18n('parentheses-end');
				html += RCList.SEP
				html += this._diffSizeText(this.newest, this.oldest as RCDataArticle);
				break;
			}
			case RC_TYPE.DISCUSSION: {
				html += this.newest.discussionTitleText( this.getThreadTitle(), true );
				html += " "+i18n('parentheses-start');
				html += i18n("nchanges", this.list.length);
				html += i18n('parentheses-end');
				break;
			}
		}
		html += RCList.SEP;
		html += this._contributorsCountText();
		
		var tTable = Utils.newElement("table", { className:"rcmmw-collapsible mw-enhanced-rc rcmmw-collapsed "+this.newest.wikiInfo.rcClass+" "+this.newest.getNSClass() }); // mw-made-collapsible
		Utils.newElement("caption", { className:this._getBackgroundClass() }, tTable); // Needed for CSS background.
		var tTbody = Utils.newElement("tbody", {}, tTable); // tbody is needed for $.makeCollapsible() to work.
		var tRow = Utils.newElement("tr", {}, tTbody);
		if(this._showFavicon()) { Utils.newElement("td", { innerHTML:this.newest.wikiInfo.getFaviconHTML(true) }, tRow); }
		var td1 = Utils.newElement("td", {}, tRow);
			Utils.newElement("span", { className:"rcmmw-collapsible-toggle", innerHTML:''
				+'<span class="mw-rc-openarrow"><a title="'+i18n("rc-enhanced-expand")+'">'// href="#"
					+'<span class="rcm-arr" title="'+i18n("rc-enhanced-expand")+'">+</span>'
				+'</a></span>'
				+'<span class="mw-rc-closearrow"><a title="'+i18n("rc-enhanced-hide")+'">'// href="#"
					+'<span class="rcm-arr" title="'+i18n("rc-enhanced-hide")+'">-</span>'
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
				html += "<span class='mw-enhanced-rc-time'>"+pRC.time()+"</span>";
				if(pRC.logtype=="upload") { html += this.getAjaxImageButton(); }
				html += RCList.SEP;
				html += pRC.logActionText();
				break;
			}
			case RC_TYPE.DISCUSSION: {
				if(pRC.containerType == "ARTICLE_COMMENT") {
					html += `<span class='mw-enhanced-rc-time'>${pRC.getCommentTimeLink()}</span>`;
				} else {
					html += `<span class='mw-enhanced-rc-time'><a href='${pRC.href}' title='${pRC.title}'>${pRC.time()}</a></span>`;
				}
				if(pRC.previewData) html += this.getAjaxPagePreviewButton();
				html += pRC.getThreadStatusIcons();
				html += pRC.getUpvoteCount();
				html += RCList.SEP;
				html += pRC.userDetails();
				html += pRC.getSummary();
				break;
			}
			case RC_TYPE.NORMAL: {
				html += `<span class='mw-enhanced-rc-time'><a href='${pRC.getRcRevisionUrl(null, pRC.revid)}' title='${pRC.title}'>${pRC.time()}</a></span>`;
				let diffs = [
					`<a href='${pRC.getRcRevisionUrl(0, pRC.revid)}'>${i18n("cur")}</a>`,
					pRC.editFlags.newpage == false ? `<a href='${pRC.getRcRevisionUrl(pRC.revid, pRC.old_revid)}'>${i18n("last")}</a>`+this.getAjaxDiffButton() : i18n("last"),
				].filter(o=>!!o);
				html += ` ${i18n('parentheses', diffs.join(i18n("pipe-separator")))}`;
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
			case RC_TYPE.DISCUSSION: {
				html += pRC.getThreadStatusIcons();
				html += pRC.discussionTitleText( this.getThreadTitle() );
				html += i18n("semicolon-separator")+pRC.time();
				html += RCList.SEP;
				html += pRC.userDetails();
				html += pRC.getSummary();
				break;
			}
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
	// 		tAPiUrl += "action=query&prop=revisions&format=json&rvtoken=rollback&titles="+Utils.escapeCharactersUrl(pPageName)
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
