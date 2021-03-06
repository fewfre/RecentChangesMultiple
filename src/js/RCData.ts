import Global from "./Global";
import RCMManager from "./RCMManager";
import WikiData from "./WikiData";
import Utils from "./Utils";
import i18n, {I18nKey} from "./i18n";
import TYPE from "./types/RC_TYPE";

let $ = window.jQuery;
let mw = window.mediaWiki;
	
//######################################
// #### Recent Change Data ####
// * A data object to keep track of RecentChanges data in an organized way, as well as also having convenience methods.
// * These should only ever be used in RCList.
//######################################
export default class RCData
{
	// Storage
	readonly manager	: RCMManager; // Keep track of what manager this data is attached to.
	readonly wikiInfo	: WikiData; // Keep track of what Wiki this data belongs to.
	
	/***************************
	 * Ajax Data - https://www.mediawiki.org/wiki/API:RecentChanges
	 ***************************/
	date				: Date; // The DateTime this edit was made at.
	author				: string; // The user or anon that made the edit.
	userEdited			: boolean; // Whether the author is a user vs an anon.
	userhidden			: boolean; // If the rc is marked "userhidden"
	title				: string; // Title of the page. (without "/@comment"s). Includes namespace.
	namespace			: number; // Namespace of the page edited.
	logtype				: string; // What log fired
	logaction			: string; // What the log did
	newlen				: number; // New file size after edit
	oldlen				: number; // Previous file size before edit
	summary				: string; // Submit comment for the edit.
	unparsedComment		: string; // Submit comment for the edit without HTML tags.
	
	pageid				: number; // rc_cur_id - https://www.mediawiki.org/wiki/Manual:Recentchanges_table#rc_cur_id
	revid				: number; // rc_this_oldid - https://www.mediawiki.org/wiki/Manual:Recentchanges_table#rc_this_oldid
	old_revid			: number; // rc_last_oldid - https://www.mediawiki.org/wiki/Manual:Recentchanges_table#rc_last_oldid
	
	/***************************
	 * "Calculated" Data
	 ***************************/
	type				: TYPE; // What kind of edit the RC is.
	isNewPage			: boolean; // If this edit created a new page
	isBotEdit			: boolean; // If this edit has been flaged as a bot edit.
	isMinorEdit			: boolean; // If this edit was flagged as minor.
	isPatrolled			: boolean; // If this page has been patrolled.
	titleNoNS			: string; // Same as this.title, but with the namespace removed (if there is one)
	uniqueID			: string; // A unique ID is primarily important for boards/walls, since they group by the first "/@comment" in the page name.
	hrefTitle			: string; // Title of page, escaped for url (neccisary if page name as passed along an ajax call)
	href				: string; // link to the page (no "&diff", etc) ex: http://test.fandom.com/wiki/Test
	hrefBasic			: string; // Same as this.href, but with nos "/@comment"s either.
	hrefFS				: string; // Same as this.href, but followed by this.wikiInfo.firstSeperator.
	
	/***************************
	 * Situational Data - depends on the type, might not even be used, and may remain be unset.
	 ***************************/
	isSubComment		: boolean; // If the is a "reply" to a comment/board/wall (versus the original it replies too)
	isWallBoardAction	: boolean; // If an action was taken on a wall / board (instead of a "normal" edit)
	threadTitle			: string; // The name of the thread if known (if a wall / board)
	
	// Constructor
	constructor(pWikiInfo:WikiData, pManager:RCMManager) {
		this.manager = pManager;
		this.wikiInfo = pWikiInfo;
	}
	
	dispose() : void {
		// @ts-ignore - It's read only, but we still want it deleted here
		delete this.manager;
		// @ts-ignore - It's read only, but we still want it deleted here
		delete this.wikiInfo;
		
		this.date = null;
		this.type = null;
	}
	
	init(pData:any) : this {
		if(!pData.title) { pData.title = ""; } // Small fix to prevent weird errors if title doesn't exist
		this.date = new Date(pData.timestamp);
		this.userEdited = pData.user != "" && pData.anon != "";
		this.author = this.userEdited ? pData.user : (pData.anon ? pData.anon : pData.user);
		this.userhidden = pData.userhidden == "";
		this.title = Utils.escapeCharacters( pData.title.split("/@comment")[0] );
		this.namespace = pData.ns;
		this.logtype = pData.logtype;
		this.logaction = pData.logaction;
		this.newlen = pData.newlen;
		this.oldlen = pData.oldlen;
		// if(pData.commenthidden != "") {
		// 	this.summary = pData.parsedcomment; // De-wikified.
		// 	this.summary = this.summary.replace("<a href=\"/", "<a href=\""+this.wikiInfo.server+"/"); // Make links point to correct wiki.
		// } else {
		// 	this.summary = '<span class="history-deleted">'+i18n("rev-deleted-comment")+'</span>';
		// }
		this.summary = RCData.formatParsedComment(pData.parsedcomment, pData.commenthidden == "", this.wikiInfo);
		this.unparsedComment = pData.comment;
		
		this.pageid = pData.pageid;
		this.revid = pData.revid;
		this.old_revid = pData.old_revid;
		
		this.isNewPage = pData["new"] == "";
		this.isBotEdit = pData.bot == "";
		this.isMinorEdit = pData.minor == "";
		this.isPatrolled = pData.patrolled == "";
		this.titleNoNS = (this.namespace != 0 && this.title.indexOf(":") > -1) ? this.title.split(/:(.+)/)[1] : this.title; // Regex only matches first ":"
		this.uniqueID = this.title; // By default; make change based on this.type.
		this.hrefTitle = Utils.escapeCharactersLink( pData.title );
		this.href = this.wikiInfo.articlepath + this.hrefTitle;
		this.hrefBasic = this.href.split("/@comment")[0];
		this.hrefFS	= this.href + this.wikiInfo.firstSeperator;
		
		// Figure out the type of edit this is.
		if(this.type == TYPE.LOG || (this.logtype && this.logtype != "0")) { // It's a "real" log. "0" signifies a wall/board.
			// Handled by child class
		}
		else if(pData.title.indexOf("/@comment") > -1) { // It's a comment / board / wall
			this.isSubComment = pData.title.indexOf("/@comment") != pData.title.lastIndexOf("/@comment"); // Check if it has more than one "/@comment"s
			if(/*Board Thread*/this.namespace == 2001) { this.type = TYPE.BOARD; }
			else if(/*Wall Thread*/this.namespace == 1201) { this.type = TYPE.WALL; }
			else { this.type = TYPE.COMMENT; }
			
			if(this.type == TYPE.BOARD || this.type == TYPE.WALL) {
				this.uniqueID = Utils.escapeCharactersLink( pData.title.split("/@comment")[0] + "/@comment" + pData.title.split("/@comment")[1] ); // Walls/boards can have 2 /@comments, the first one is what we care about for lists.
				// var tAcMetaDataCheck = "&lt;ac_metadata title=\"";
				// var tAcMetaDataPos = this.summary.lastIndexOf(tAcMetaDataCheck);
				// if(tAcMetaDataPos > -1) { // Check for last encase some has a "ac_metadata" tag as part of their post for some reason
				// 	this.threadTitle = this.summaryDiffHTML.innerHTML.substring(tAcMetaDataPos+tAcMetaDataCheck.length, this.summary.length);
				// 	this.threadTitle = this.threadTitle.substring(0, this.threadTitle.indexOf("\""));
				// 	this.threadTitle = this.threadTitle.replace(/&amp;/g, "&");
					
				// 	this.summary = ""; // No summaries are shown in on Special:RecentChanges when "ac_metadata" is present (just works out that way)
				// }
				
				// https://github.com/Wikia/app/blob/10a9dff2fc80b8226456c21efc921b5361dd6432/extensions/wikia/Wall/WallHelper.class.php#L486
				// /<ac_metadata title="([^"]*)">(.*)<\/ac_metadata>/g
				
				if(this.isSubComment == false) {
					// If it's the parent wall / board, check for ac_metadata for title
					// tTitleData[1] returns title, tTitleData[0] return ac_metadata text string
					var tTitleData = /&lt;ac_metadata title=&quot;(.*?)&quot;&gt;.*?&lt;\/ac_metadata&gt;/g.exec(this.summary);
					// var tTitleData = /<ac_metadata title="(.*?)">.*?<\/ac_metadata>/g.exec(this.summary);
					if(tTitleData != null) {
						this.threadTitle = tTitleData[1];
						this.summary = this.summary.replace(tTitleData[0], "");
					}
				}
				
				this.isWallBoardAction = this.logtype=="0";
				
				// If a wall / board was edited, display a message saying so.
				if(this.isWallBoardAction == false && this.isNewPage == false && this.summary == "") {
					this.summary = this.type == TYPE.BOARD ? i18n("forum-recentchanges-edit") : i18n("wall-recentchanges-edit");
				}
			}
		}
		else { // else it's a normal freakin edit =p
			this.type = TYPE.NORMAL;
		}
		
		return this; // Return self for chaining or whatnot.
	}
	
	time() : string {
		return Utils.formatWikiTimeStampTimeOnly(this.date, true);
		// return Utils.pad(Utils.getHours(this.date),2)+":"+Utils.pad(Utils.getMinutes(this.date),2);
	}
	
	userDetails() : string {
		// if(this.userhidden) { return '<span class="history-deleted">'+i18n("rev-deleted-user")+'</span>'; }
		//
		// var blockText = this.wikiInfo.user.rights.block ? i18n("pipe-separator")+"<a href='{0}Special:Block/{1}'>"+i18n("blocklink")+"</a>" : "";
		// if(this.userEdited) {
		// 	return Utils.formatString("<span class='mw-usertoollinks'><a href='{0}User:{1}'>{2}</a> (<a href='{0}User_talk:{1}'>"+i18n("talkpagelinktext")+"</a>"+i18n("pipe-separator")+"<a href='{0}Special:Contributions/{1}'>"+i18n("contribslink")+"</a>"+blockText+")</span>", this.wikiInfo.articlepath, Utils.escapeCharactersLink(this.author), this.author);
		// } else {
		// 	return Utils.formatString("<span class='mw-usertoollinks'><a href='{0}Special:Contributions/{1}'>{2}</a> (<a href='{0}User_talk:{1}'>"+i18n("talkpagelinktext")+"</a>"+blockText+")</span>", this.wikiInfo.articlepath, Utils.escapeCharactersLink(this.author), this.author);
		// }
		return RCData.formatUserDetails(this.wikiInfo, this.author, this.userhidden, this.userEdited);
	}
	
	static formatUserDetails(pWikiInfo:WikiData, pAuthor:string, pUserHidden:boolean, pUserEdited:boolean) : string {
		if(pUserHidden) { return '<span class="history-deleted">'+i18n("rev-deleted-user")+'</span>'; }
		
		var blockText = pWikiInfo.user.rights.block ? i18n("pipe-separator")+"<a href='{0}Special:Block/{1}'>"+i18n("blocklink")+"</a>" : "";
		if(pUserEdited) {
			return Utils.formatString("<span class='mw-usertoollinks'><a href='{0}User:{1}' class='"+pWikiInfo.getUserClass(pAuthor)+"' "+pWikiInfo.getUserClassDataset(pAuthor)+">{2}</a> (<a href='{0}User_talk:{1}'>"+i18n("talkpagelinktext")+"</a>"+i18n("pipe-separator")+"<a href='{0}Special:Contributions/{1}'>"+i18n("contribslink")+"</a>"+blockText+")</span>", pWikiInfo.articlepath, Utils.escapeCharactersLink(pAuthor), pAuthor);
		} else {
			return Utils.formatString("<span class='mw-usertoollinks'><a class='rcm-useranon' href='{0}Special:Contributions/{1}'>{2}</a> (<a href='{0}User_talk:{1}'>"+i18n("talkpagelinktext")+"</a>"+blockText+")</span>", pWikiInfo.articlepath, Utils.escapeCharactersLink(pAuthor), pAuthor);
		}
	}
	
	// Check each entry for "threadTitle", else return default text.
	getThreadTitle() : string {
		return this.threadTitle ? this.threadTitle :  "<i>"+i18n('unknownthreadname')+"</i>";
	}
	
	getSummary() : string {
		// if(this.summary == "" || this.summary == undefined) {
		// 	return "";
		// } else {
		// 	this.summary = this.summary.trim();
		// 	this.summary = this.summary.replace(/(\r\n|\n|\r)/gm, " ");
		// 	return ' <span class="comment" dir="auto">('+this.summary+')</span>';
		// }
		return RCData.formatSummary(this.summary);
	}
	
	static formatSummary(pSummary:string) : string {
		if(pSummary == "" || pSummary == undefined) {
			return "";
		} else {
			return ` <span class="comment" dir="auto">(${pSummary})</span>`;
		}
	}
	
	static formatParsedComment(pParsedComment:string, pDeleted:boolean, pWikiInfo:WikiData) : string {
		if(!pDeleted) {
			// pParsedComment = pParsedComment.replace("<a href=\"/", "<a href=\""+pWikiInfo.server+"/"); // Make links point to correct wiki.
			pParsedComment = pParsedComment.replace(/<a href="\//g, "<a href=\""+pWikiInfo.server+"/"); // Make links point to correct wiki.
		} else {
			pParsedComment = `<span class="history-deleted">${i18n("rev-deleted-comment")}</span>`;
		}
		
		if(pParsedComment == "" || pParsedComment == undefined) {
			// pParsedComment = "";
		} else {
			pParsedComment = pParsedComment.trim();
			pParsedComment = pParsedComment.replace(/(\r\n|\n|\r)/gm, " ");
		}
		return pParsedComment;
	}
	
	// Assumes it's a wall/board that has an action (will just return summary otherwise).
	wallBoardActionMessageWithSummary(pThreadTitle?:string) : string {
		var tThreadTitle = pThreadTitle || this.getThreadTitle(); // Title is passed in due to it being found via ajax.
		var tLocalizedActionMessage:any;
		var tPrefix = this.type == TYPE.BOARD ? "forum-recentchanges" : "wall-recentchanges";
		var tMsgType = this.isSubComment ? "reply" : "thread";
		switch(this.logaction) {
			case "wall_remove":			tLocalizedActionMessage = tPrefix + "-removed-" + tMsgType; break;
			case "wall_admindelete":	tLocalizedActionMessage = tPrefix + "-deleted-" + tMsgType; break;
			case "wall_restore":		tLocalizedActionMessage = tPrefix + "-restored-" + tMsgType; break;
			case "wall_archive":		tLocalizedActionMessage = tPrefix + "-closed-thread"; break;
			case "wall_reopen":			tLocalizedActionMessage = tPrefix + "-reopened-thread"; break;
		}
		if(tLocalizedActionMessage) {
			return " "+i18n(tLocalizedActionMessage, this.href, tThreadTitle, this.getBoardWallParentLink(), this.titleNoNS) + this.getSummary();
		} else {
			return this.getSummary(); // Else not a wall/board action
		}
	}
	
	getBoardWallParentTitleWithNamespace() : string {
		if(this.type == TYPE.BOARD) {
			return "Board:" + this.titleNoNS;
		}
		else if(this.type == TYPE.WALL) {
			return "Message_Wall:" + this.titleNoNS;
		}
		else {
			mw.log("This should not happen in getBoardWallParent()");
			return this.title;
		}
	}
	
	getBoardWallParentLink() : string {
		return this.wikiInfo.articlepath + this.getBoardWallParentTitleWithNamespace();
	}
	
	// Used for browser Notification title
	getNotificationTitle() : string {
		return this.title;
	}
	
	pageTitleTextLink() : string {
		if(this.type == TYPE.COMMENT) {
			let tNameSpaceText = this.namespace==1 ? "" : this.wikiInfo.namespaces[String(this.namespace-1)]["*"]+":";
			return i18n("rc-comment", `[${this.href} ${tNameSpaceText+this.titleNoNS}]`);
		} else {
			return `<a class='rc-pagetitle' href='${this.href}'>${this.title}</a>`;
		}
	}
	
	wallBoardTitleText(pThreadTitle?:string) : string {
		if(pThreadTitle == undefined) { pThreadTitle = this.getThreadTitle(); }
		if(this.type == TYPE.WALL) {
			return i18n("wall-recentchanges-thread-group",
				`<a href='${this.href}'>${pThreadTitle}</a>`,
				this.getBoardWallParentLink(),
				this.titleNoNS
			);
		} else {
			return i18n("forum-recentchanges-thread-group",
				`<a href='${this.href}'>${pThreadTitle}</a>`,
				this.getBoardWallParentLink(),
				this.titleNoNS
			);
		}
	}
	
	getNSClass() : string {
		return "rc-entry-ns-"+this.namespace;
	}
	
	wallBoardHistoryLink() : string {
		var tLink = "", tText:I18nKey;
		if(this.type == TYPE.WALL) {
			tLink = this.wikiInfo.articlepath + Utils.escapeCharactersLink(this.getBoardWallParentTitleWithNamespace()) + this.wikiInfo.firstSeperator + "action=history";
			tText = this.isSubComment ? "wall-recentchanges-thread-history-link" : "wall-recentchanges-history-link";
		} else {
			tLink = this.wikiInfo.articlepath + Utils.escapeCharactersLink(this.getBoardWallParentTitleWithNamespace()) + this.wikiInfo.firstSeperator + "action=history";
			tText = this.isSubComment ? "forum-recentchanges-thread-history-link" : "forum-recentchanges-history-link";
		}
		return `(<a href='${tLink}'>${i18n(tText)}</a>)`;
	}
	
	static getFullTimeStamp(pDate:Date) : string {
		return Utils.formatWikiTimeStamp(pDate);
	}
	
	shouldBeRemoved(pDate:Date) : boolean {
		// First remove items past "days" (needs to be done first since it can change number allowed by "limit").
		// Then start checking if enough items are listed for the wiki to go past it's "limit".
		return this.date.getSeconds() < pDate.getSeconds()-(this.wikiInfo.rcParams.days * 86400) // days*24*60*60 = days->seconds
			|| this.type != TYPE.DISCUSSION && this.wikiInfo.resultsCount > this.wikiInfo.rcParams.limit
			|| this.type == TYPE.DISCUSSION && this.wikiInfo.discussionsCount > Math.min(this.wikiInfo.rcParams.limit, 50)
			;
		// return this.date.getSeconds() < pDate.getSeconds()-(this.wikiInfo.rcParams.days * 86400); // days*24*60*60 = days->seconds
	}
}
