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
	containerType	: "ARTICLE_COMMENT" | "FORUM" | "WALL";
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
	
	/*override*/ init(pData:any) : this {
		this.type = TYPE.DISCUSSION;
		this.containerType = "FORUM";
		try {
			this.containerType = pData._embedded.thread[0].containerType || "FORUM";
		} catch(e){}
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
		
		// Get summary; done two ways based on containerType
		this.summary = pData.rawContent;
		if(this.containerType == "ARTICLE_COMMENT" && !this.summary && pData.jsonModel) {
			let jsonModel:{ type:string, content:{ type:string, text:string }[] }[] = JSON.parse(pData.jsonModel).content;
			this.summary = !jsonModel ? "" : jsonModel.map(d=>d.type=="paragraph" && d.content ? d.content.map(td=>td.text || "") : "").join(" ").replace(/  /, " ");
		}
		if(this.summary.length > 175) {
			this.summary = `"${this.summary}"`; // Add quotes around it just to drive home it is a quote
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
		this.threadHref = `${this.wikiInfo.scriptpath}/d/p/${this.threadId}`;
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
		
		let blockText = this.wikiInfo.user.rights.block ? i18n("pipe-separator")+"<a href='{0}Special:Block/{1}'>"+i18n("blocklink")+"</a>" : "";
		// if(this.userEdited) {
		// 	return Utils.formatString("<span class='mw-usertoollinks'><a href='{0}User:{1}'>{2}</a> (<a href='{0}User_talk:{1}'>"+i18n("talkpagelinktext")+"</a>"+i18n("pipe-separator")+"<a href='{0}Special:Contributions/{1}'>"+i18n("contribslink")+"</a>"+blockText+")</span>", this.wikiInfo.articlepath, Utils.escapeCharactersLink(this.author), this.author);
		// } else {
		// 	return Utils.formatString("<span class='mw-usertoollinks'><a href='{0}Special:Contributions/{1}'>{2}</a> (<a href='{0}User_talk:{1}'>"+i18n("talkpagelinktext")+"</a>"+blockText+")</span>", this.wikiInfo.articlepath, Utils.escapeCharactersLink(this.author), this.author);
		// }
		let tUserContribsLink = `${this.wikiInfo.scriptpath}/d/u/${this.user_id}`;
		return Utils.formatString(""
			+"<span class='mw-usertoollinks'>"
				+this.getAvatarImg()+`<a href='{0}User:{1}' class='${this.wikiInfo.getUserClass(this.author)}' ${this.wikiInfo.getUserClassDataset(this.author)}>{2}</a>`
				+" (<a href='{0}User_talk:{1}'>"+i18n("talkpagelinktext")+"</a>"
				+i18n("pipe-separator")
				+`<a href='${tUserContribsLink}'>${i18n("contribslink")}</a>`
				+blockText+")"
			+"</span>",
		this.wikiInfo.articlepath, Utils.escapeCharactersLink(this.author), this.author);
	}
	
	getAvatarImg() : string {
		return this.user_avatarUrl
		? `<span class="rcm-avatar"><a href="${this.wikiInfo.articlepath}User:${Utils.escapeCharactersLink(this.author)}"><img src='${this.user_avatarUrl}' width="15" height="15" /></a> </span>`
		: "";
	}
	
	discussionTitleText(pThreadTitle?:string, pIsHead:boolean=false) : string {
		switch(this.containerType) {
			case "FORUM": {
				if(pThreadTitle == undefined) { pThreadTitle = this.getThreadTitle(); }
				let tForumLink = `<a href="${this.wikiInfo.scriptpath}/d/f?catId=${this.forumId}&sort=latest">${this.forumName}</a>`;
				let tText = i18n.MESSAGES["wall-recentchanges-thread-group"];
				// tText = tText.replace(/(\[\[.*\]\])/g, tForumLink);
				tText = tText.replace(/(\[\[.*\]\])/g, "RCM_DISC_BOARD"); // Don't replace with actual content right away, to avoid wiki2html being run on it
				tText = i18n.wiki2html(tText, `<a href="${pIsHead ? this.threadHref : this.href}">${pThreadTitle}</a>`+(pIsHead ? "" : this.getUpvoteCount()));
				tText = tText.replace("RCM_DISC_BOARD", tForumLink);
				return tText;
			}
			case "WALL": {
				if(pThreadTitle == undefined) { pThreadTitle = this.getThreadTitle(); }
				let tForumLink = `<a href="${this.wikiInfo.scriptpath}/d/f?catId=${this.forumId}&sort=latest">${this.forumName}</a>`;
				let tText = i18n.MESSAGES["wall-recentchanges-thread-group"];
				// tText = tText.replace(/(\[\[.*\]\])/g, tForumLink);
				tText = tText.replace(/(\[\[.*\]\])/g, "RCM_DISC_BOARD"); // Don't replace with actual content right away, to avoid wiki2html being run on it
				tText = i18n.wiki2html(tText, `<a href="${pIsHead ? this.threadHref : this.href}">${pThreadTitle}</a>`+(pIsHead ? "" : this.getUpvoteCount()));
				tText = tText.replace("RCM_DISC_BOARD", tForumLink);
				return tText;
			}
			case "ARTICLE_COMMENT": {
				let tUrl = `${this.wikiInfo.scriptpath}/d/f?catId=${this.forumId}&sort=latest`;
				let tPagename = this.forumName;
				
				return i18n("article-comments-rc-comment", tUrl, tPagename);
			}
		}
		mw.log("(discussionTitleText) Unknown containerType:", this.containerType);
	}
	
	getUpvoteCount() : string {
		// Only forum-type discussions have upvotes
		if(this.containerType != "FORUM") { return ""; }
		return `<span class="rcm-upvotes"> (${ConstantsApp.getSymbol("rcm-upvote-tiny")} ${this.upvoteCount})</span>`;
	}
	
	getThreadStatusIcons() : string {
		return ""
			+ (this.isLocked ? ConstantsApp.getSymbol("rcm-lock") : "")
			+ (this.isReported ? ConstantsApp.getSymbol("rcm-report") : "")
		;
	}
	
	// Fetch data that may not be passed (like thread title)
	handleSecondaryLoad(pElemID:string) {
		this.manager.secondaryWikiData.push({
			// https://github.com/Wikia/app/blob/b03df0a89ed672697e9c130d529bf1eb25f49cda/lib/Swagger/src/Discussion/Api/ThreadsApi.php
			url: `https://services.fandom.com/discussion/${this.wikiInfo.wikiaCityID}/threads/${this.threadId}`,
			dataType: "json",
			callback: (data) => {
				this.threadTitle = data.title || (data.rawContent.slice(0, 35).trim()+"..."); // If no title, use part of original message.
				let tSpan:HTMLElement = document.getElementById(pElemID);
				if(tSpan) {
					tSpan.innerHTML = this.threadTitle;
					let tIcons = "";
					if(data.isLocked) { tIcons += ConstantsApp.getSymbol("rcm-lock"); }
					if(data.isReported) { tIcons += ConstantsApp.getSymbol("rcm-report"); }
					if(tIcons) { tSpan.parentNode.insertBefore(Utils.newElement("span", { innerHTML:tIcons }), tSpan); }
				}
			}
		});
	}
}
