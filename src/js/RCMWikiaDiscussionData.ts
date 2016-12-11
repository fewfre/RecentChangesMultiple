import ConstantsApp from "./ConstantsApp";
import RCMManager from "./RCMManager";
import RCMModal from "./RCMModal";
import WikiData from "./WikiData";
import RCData from "./RCData";
import Utils from "./Utils";
import i18n from "./i18n";
import TYPE from "./RC_TYPE";

let $ = (<any>window).jQuery;
let mw = (<any>window).mediaWiki;
	
//######################################
// #### Recent Change Data ####
// * A data object to keep track of RecentChanges data in an organized way, as well as also having convenience methods.
// * These should only ever be used in RCList.
//######################################
export default class RCMWikiaDiscussionData extends RCData
{
	// Storage
	user_id			: string; // createdBy.id
	user_avatarUrl	: string // createdBy.avatarUrl
	upvoteCount		: number;
	forumName		: string;
	forumId			: string;
	threadId		: string;
	isLocked		: string;
	isReported		: string;
	rawContent		: string;
	
	threadHref		: string;
	
	// Constructor
	constructor(pWikiInfo:WikiData, pManager:RCMManager) {
		super(pWikiInfo, pManager);
	}
	
	/*override*/ dispose() : void {
		super.dispose();
	}
	
	/*override*/ init(pData:any) : RCData {
		this.type = TYPE.DISCUSSION;
		this.date = new Date(0); /*Epoch*/ this.date.setUTCSeconds((pData.modificationDate || pData.creationDate).epochSecond);
		this.userEdited = true; // Currently anons cannot edit
		this.author = pData.createdBy.name;
		this.userhidden = false;//pData.userhidden == "";
		this.title = pData.title;//Utils.escapeCharacters( pData.title.split("/@comment")[0] );
		this.namespace = -5234; // Has no namespace. This should probably be unique
		// this.logtype = pData.logtype;
		// this.logaction = pData.logaction;
		// this.newlen = pData.newlen;
		// this.oldlen = pData.oldlen;
		this.summary = pData.rawContent;
		if(this.summary.length > 175) {
			this.summary = this.summary.slice(0, 175)+"...";
		}
		this.unparsedComment = this.summary;
		
		this.forumId = pData.forumId;
		this.threadId = pData.threadId;
		this.pageid = pData.id;//pData.pageid;
		// this.revid = pData.revid;
		// this.old_revid = pData.old_revid;
		
		this.isNewPage = pData.modificationDate == null;//pData["new"] == "";
		this.isBotEdit = false;//pData.bot == "";
		this.isMinorEdit = false//pData.minor == "";
		this.isPatrolled = false;//pData.patrolled == "";
		this.titleNoNS = this.title;//(this.namespace != 0 && this.title.indexOf(":") > -1) ? this.title.split(":")[1] : this.title;
		this.uniqueID = pData.threadId; // By default; make change based on this.type.
		this.hrefTitle = Utils.escapeCharactersLink( pData.title );
		this.threadHref = `//${this.wikiInfo.servername}/d/p/${this.threadId}`;
		this.href = this.threadHref + (pData.isReply ? `#reply-${pData.id}` : "");
		this.hrefBasic = this.href;
		this.hrefFS	= this.href + this.wikiInfo.firstSeperator;
		
		this.threadTitle = pData.title;
		
		// Discussion-specific
		this.user_id = pData.createdBy.id;
		this.user_avatarUrl = pData.createdBy.avatarUrl ? pData.createdBy.avatarUrl.replace("/scale-to-width-down/100", "/scale-to-width-down/15") : pData.createdBy.avatarUrl;
		this.upvoteCount = pData.upvoteCount;
		this.forumName = pData.forumName;
		this.rawContent = pData.rawContent;
		this.isLocked = pData.isLocked;
		this.isReported = pData.isReported;
		
		return null; // Return self for chaining or whatnot.
	}
	
	/*override*/ userDetails() : string {
		if(this.userhidden) { return '<span class="history-deleted">'+i18n("rev-deleted-user")+'</span>'; }
		
		let blockText = this.wikiInfo.canBlock ? i18n("pipe-separator")+"<a href='{0}Special:Block/{1}'>"+i18n("blocklink")+"</a>" : "";
		// if(this.userEdited) {
		// 	return Utils.formatString("<span class='mw-usertoollinks'><a href='{0}User:{1}'>{2}</a> (<a href='{0}User_talk:{1}'>"+i18n("talkpagelinktext")+"</a>"+i18n("pipe-separator")+"<a href='{0}Special:Contributions/{1}'>"+i18n("contribslink")+"</a>"+blockText+")</span>", this.wikiInfo.articlepath, Utils.escapeCharactersLink(this.author), this.author);
		// } else {
		// 	return Utils.formatString("<span class='mw-usertoollinks'><a href='{0}Special:Contributions/{1}'>{2}</a> (<a href='{0}User_talk:{1}'>"+i18n("talkpagelinktext")+"</a>"+blockText+")</span>", this.wikiInfo.articlepath, Utils.escapeCharactersLink(this.author), this.author);
		// }
		let tUserContribsLink = `//${this.wikiInfo.servername}/d/u/${this.user_id}`;
		return Utils.formatString(""
			+"<span class='mw-usertoollinks'>"
				+this.getAvatarImg()+"<a href='{0}User:{1}'>{2}</a>"
				+" (<a href='{0}User_talk:{1}'>"+i18n("talkpagelinktext")+"</a>"
				+i18n("pipe-separator")
				+"<a href='"+tUserContribsLink+"'>"+i18n("contribslink")+"</a>"
				+blockText+")"
			+"</span>",
		this.wikiInfo.articlepath, Utils.escapeCharactersLink(this.author), this.author);
	}
	
	getAvatarImg() : string {
		return this.user_avatarUrl
		? `<span class="rcm-avatar"><a href="${this.wikiInfo.articlepath}User:${Utils.escapeCharactersLink(this.author)}"><img src='${this.user_avatarUrl}' /></a> </span>`
		: "";
	}
	
	discusssionTitleText(pThreadTitle?:string, pIsHead:boolean=false) : string {
		if(pThreadTitle == undefined) { pThreadTitle = this.getThreadTitle(); }
		let tForumLink = `<a href="//${this.wikiInfo.servername}/d/f?catId=${this.forumId}&sort=latest">${this.forumName}</a>`;
		let tText = i18n.MESSAGES["wall-recentchanges-thread-group"];
		tText = tText.replace(/(\[\[.*\]\])/g, tForumLink);
		tText = i18n.wiki2html(tText, `<a href="${pIsHead ? this.threadHref : this.href}">${pThreadTitle}</a>`+(pIsHead ? "" : this.getUpvoteCount()));
		return tText;
	}
	
	getUpvoteCount() : string {
		return `<span class="rcm-upvotes"> (${ConstantsApp.getSymbol("rcm-upvote-tiny")} ${this.upvoteCount})</span>`;
	}
	
	getThreadStatusIcons() : string {
		return ""
			+ (this.isLocked ? ConstantsApp.getSymbol("rcm-lock") : "")
			+ (this.isReported ? ConstantsApp.getSymbol("rcm-report") : "")
		;
	}
}
