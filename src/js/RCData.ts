import Global from "./Global";
import RCMManager from "./RCMManager";
import WikiData from "./WikiData";
import Utils from "./Utils";
import i18n from "./i18n";
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
	title				: string; // Title of the page. Includes namespace.
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
	uniqueID			: string; // A unique ID is primarily important for boards/walls/comments, since they group by the parent comment.
	hrefTitle			: string; // Title of page, escaped for url (neccisary if page name as passed along an ajax call)
	href				: string; // link to the page (no "&diff", etc) ex: http://test.fandom.com/wiki/Test
	hrefFS				: string; // Same as this.href, but followed by this.wikiInfo.firstSeperator.
	
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
		this.title = Utils.escapeCharacters(pData.title);
		this.namespace = pData.ns;
		this.logtype = pData.logtype;
		this.logaction = pData.logaction;
		this.newlen = pData.newlen;
		this.oldlen = pData.oldlen;
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
		this.hrefTitle = Utils.escapeCharactersLink(pData.title);
		this.href = this.wikiInfo.getUrl(this.hrefTitle);
		this.hrefFS	= this.href + this.wikiInfo.firstSeperator;
		
		// Figure out the type of edit this is.
		if(this.type == TYPE.LOG || (this.logtype && this.logtype != "0")) { // It's a "real" log. "0" signifies a wall/board.
			// Handled by child class
		} else { // else it's a normal freakin edit =p
			this.type = TYPE.NORMAL;
		}
		
		return this; // Return self for chaining or whatnot.
	}
	
	time() : string {
		return Utils.formatWikiTimeStampTimeOnly(this.date, true);
		// return Utils.pad(Utils.getHours(this.date),2)+":"+Utils.pad(Utils.getMinutes(this.date),2);
	}
	
	userDetails() : string {
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
	
	getSummary() : string {
		return RCData.formatSummary(this.summary);
	}
	
	static formatSummary(pSummary:string) : string {
		if(pSummary == "" || pSummary == undefined) {
			return "";
		}
		return ` <span class="comment" dir="auto">(${pSummary})</span>`;
	}
	
	static formatParsedComment(pParsedComment:string, pDeleted:boolean, pWikiInfo:WikiData) : string {
		if(!pDeleted) {
			pParsedComment = pParsedComment?.replace(/<a href="\//g, "<a href=\""+pWikiInfo.server+"/"); // Make links point to correct wiki.
		} else {
			pParsedComment = `<span class="history-deleted">${i18n("rev-deleted-comment")}</span>`;
		}
		return pParsedComment?.trim().replace(/(\r\n|\n|\r)/gm, " ");
	}
	
	// Used for browser Notification title
	getNotificationTitle() : string {
		return this.title;
	}
	
	pageTitleTextLink() : string {
		return `<a class='rc-pagetitle' href='${this.href}'>${this.title}</a>`;
	}
	
	getNSClass() : string {
		return "rc-entry-ns-"+this.namespace;
	}
	
	static getFullTimeStamp(pDate:Date) : string {
		return Utils.formatWikiTimeStamp(pDate);
	}
	
	shouldBeRemoved(pDate:Date) : boolean {
		// First remove items past "days" (needs to be done first since it can change number allowed by "limit").
		if(this.date.getSeconds() < pDate.getSeconds()-(this.wikiInfo.rcParams.days * 86400)) { // days*24*60*60 = days->seconds)
			return true;
		}
		// Next start checking if enough items are listed for the wiki to go past it's "limit".
		// We have different things to check because some things use different api calls (normal RCs, discussions, and abuse logs)
		switch(this.getRemovalType()) {
			case "normal": return this.wikiInfo.resultsCount > this.wikiInfo.rcParams.limit;
			case "discussion": return this.wikiInfo.discussionsCount > Math.min(this.wikiInfo.rcParams.limit, 50);
			case "abuselog": return this.wikiInfo.abuseLogCount > this.wikiInfo.rcParams.limit;
		}
	}
	
	getRemovalType() {
		if(this.type == TYPE.DISCUSSION) { return "discussion"; }
		else if(this.type == TYPE.LOG && this.logtype=="abuse") { return "abuselog"; }
		else { return "normal"; }
	}
}
