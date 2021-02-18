import Global from "./Global";
import RCMManager from "./RCMManager";
import RCMModal from "./RCMModal";
import WikiData from "./WikiData";
import RCData from "./RCData";
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
export default class RCDataFandomDiscussion extends RCData
{
	// Sometimes user data needs to be manually fetched; when it is it is stored in here to avoid having to fetch it again
	static users	: { [id:string]: { name:string, avatarUrl:string, loadIndex?:string } } = {};
	
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
	isReply			: boolean;
	
	threadHref		: string;
	forumPage		: string; // wiki's page for the wall/comment for use in links (not included by default; needs to be fetched seperately)
	
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
		let embeddedThread:any = null;
		try {
			embeddedThread = pData._embedded.thread[0];
			this.containerType = embeddedThread.containerType || "FORUM";
		} catch(e){}
		this.date = new Date(0); /*Epoch*/ this.date.setUTCSeconds((pData.modificationDate || pData.creationDate).epochSecond);
		this.userEdited = true;
		this.author = pData.createdBy.name;
		if(!this.author && pData.creatorIp) {
			this.author = pData.creatorIp.replace("/","");
			this.userEdited = false;
		}
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
			this.summary = !jsonModel || jsonModel.length===0 ? "" : jsonModel.map(d=>d.type=="paragraph" && d.content ? d.content.map(td=>td.text || "") : "").join(" ").replace(/  /, " ");
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
		this.isReply = pData.isReply;
		this.threadHref = `${this.wikiInfo.scriptpath}/d/p/${this.threadId}`;
		this.href = this.threadHref + (pData.isReply ? `/r/${pData.id}` : "");
		this.hrefBasic = this.href;
		this.hrefFS	= this.href + this.wikiInfo.firstSeperator;
		
		this.threadTitle = embeddedThread ? (embeddedThread.title || pData.title) : pData.title;
		
		// Discussion-specific
		this.user_id = pData.createdBy.id;
		this.user_avatarUrl = pData.createdBy.avatarUrl ? pData.createdBy.avatarUrl+"/scale-to-width-down/15" : pData.createdBy.avatarUrl;
		this.upvoteCount = pData.upvoteCount;
		this.forumName = pData.forumName;
		this.rawContent = pData.rawContent;
		this.isLocked = pData.isLocked;
		this.isReported = pData.isReported;
		
		// If it's a wall discussion, then we need to set the wall's owner as the forum page
		if(this.containerType == "WALL") {
			if(this.forumName) this.forumPage = this.forumName.replace(" Message Wall", ""); // Temp way; kind be relied upon since they may translate it for other languages eventually
			if(RCDataFandomDiscussion.users[pData.forumId]) {
				this.forumPage = RCDataFandomDiscussion.users[pData.forumId].name;
			}
		}
		// This is a fake page name, so if we see it we want to treat it as unknown
		else if(this.containerType == "ARTICLE_COMMENT" && this.forumName == "Root Forum") {
			this.forumName = null;
		}
		
		return null; // Return self for chaining or whatnot.
	}
	
	/*override*/ userDetails() : string {
		if(this.userhidden) { return '<span class="history-deleted">'+i18n("rev-deleted-user")+'</span>'; }
		
		const articlepath = this.wikiInfo.articlepath, author = Utils.escapeCharactersLink(this.author), authorNotUrlSafe = this.author;
		
		// Links that appear between the ()s
		const toolLinks = [
			`<a href='${articlepath}User_talk:${author}'>${i18n("talkpagelinktext")}</a>`,
		];
		// If user isn't anon then add contributions link, as it's not needed for anon users as their name itself links to contributions
		if(this.userEdited) {
			// For discussion posts link to discussion contributions, but since walls/comments are part of wiki, list to wiki contribs
			let tUserContribsLink = this.containerType === "FORUM" ? `${this.wikiInfo.scriptpath}/d/u/${this.user_id}` : `${this.wikiInfo.articlepath}Special:Contributions/${this.author}`;
			toolLinks.push(`<a href='${tUserContribsLink}'>${i18n("contribslink")}</a>`);
		}
		// Only add block link for users that can use it
		if(this.wikiInfo.user.rights.block) {
			toolLinks.push(`<a href='${articlepath}Special:Block/${author}'>${i18n("blocklink")}</a>`);
		}
		
		return [
		"<span class='mw-usertoollinks'>",
			this.getCreatorAvatarImg(),
			`<a href='${articlepath}${this.userEdited ? "User:" : "Special:Contributions/"}${author}' class='${this.wikiInfo.getUserClass(this.author)}' ${this.wikiInfo.getUserClassDataset(this.author)}>${authorNotUrlSafe}</a>`,
			` (${toolLinks.join(i18n("pipe-separator"))})`,
		"</span>",
		].join("");
	}
	
	getCreatorAvatarImg() : string {
		return this.makeAvatarImg(this.author, this.user_avatarUrl);
	}
	
	makeAvatarImg(pAuthor:string, pAvatarUrl:string) : string {
		return pAvatarUrl
		? `<span class="rcm-avatar"><a href="${this.wikiInfo.articlepath}User:${Utils.escapeCharactersLink(pAuthor||"")}"><img src='${pAvatarUrl}' width="15" height="15" /></a> </span>`
		: "";
	}
	
	discussionTitleText(pThreadTitle?:string, pIsHead:boolean=false) : string {
		switch(this.containerType) {
			case "FORUM": {
				if(pThreadTitle == undefined) { pThreadTitle = this.getThreadTitle(); }
				let tForumLink = `<a href="${this.wikiInfo.scriptpath}/d/f?catId=${this.forumId}&sort=latest">${this.forumName}</a>`;
				let tText = i18n.MESSAGES["wall-recentchanges-thread-group"].replace(/(\[\[.*\]\])/g, "$2"); // Replace internal link with a single non-link spot
				return i18n.wiki2html(tText, `<a href="${pIsHead ? this.threadHref : this.href}">${pThreadTitle}</a>`+(pIsHead ? "" : this.getUpvoteCount()), tForumLink);
			}
			case "WALL": {
				if(pThreadTitle == undefined) { pThreadTitle = this.getThreadTitle(); }
				let tThreadUrl = !this.forumPage ? (pIsHead ? this.threadHref : this.href) : `${this.wikiInfo.articlepath}Message_Wall:${this.forumPage}?threadId=${this.threadId}`;
				let tForumUrl = !this.forumPage ? "#" : `${this.wikiInfo.articlepath}Message_Wall:${this.forumPage}`;
				
				let tText = i18n.MESSAGES["wall-recentchanges-thread-group"].replace(/(\[\[.*\]\])/g, "$2"); // Replace internal link with a single non-link spot
				return i18n.wiki2html(tText,
					`<a href="${tThreadUrl}">${pThreadTitle}</a>`,
					`<a href="${tForumUrl}">${this.forumName}</a>`,
				);
			}
			case "ARTICLE_COMMENT": {
				return i18n(pIsHead ? "rc-comments" : "rc-comment", this.getCommentForumNameLink());
			}
		}
		mw.log("(discussionTitleText) Unknown containerType:", this.containerType);
	}
	
	getCommentForumNameLink() : string {
		// If already loaded and saved
		if(this.forumName) { return `[${this.href} ${this.forumName}]`; }
		
		const tSetDataAfterLoad = (title, relativeUrl)=>{
			this.forumName = title;
			// relativeUrl is already encoded
			this.threadHref = this.wikiInfo.server+relativeUrl+`?commentId=${this.threadId}`;
			if(this.isReply) {
				this.threadHref += `&replyId=${this.pageid}`
			}
			this.href = this.threadHref;
		}
		
		// If loaded but page not updated for some reason
		if(this.wikiInfo.discCommentPageNames.has(this.forumId)) {
			let { title, relativeUrl } = this.wikiInfo.discCommentPageNames.get(this.forumId);
			tSetDataAfterLoad(title, relativeUrl);
			return `[${this.href} ${this.forumName}]`;
		}
		
		// Else name unknown and must be loaded
		let uniqID = Utils.uniqID();
		this.wikiInfo.discCommentPageNamesNeeded.push({ pageID:this.forumId, uniqID, cb:({ title, relativeUrl })=>{
			// Skip if it has been disposed
			if(!this || !this.date) { return; }
			
			tSetDataAfterLoad(title, relativeUrl);
			$(`.rcm${uniqID} a`).attr("href", this.href).text(this.forumName);
		} });
		
		// If secondary fetch not start for this wiki, then start one
		// To save on speed, we fetch as many as possible from a given wiki
		// (ids stored in discCommentPageNamesNeeded, and url generated when everything is fetched)
		if(this.wikiInfo.discCommentPageNamesNeeded.length === 1) {
			this.manager.secondaryWikiData.push({
				url: ()=>{
					let ids = this.wikiInfo.discCommentPageNamesNeeded.map(o=>o.pageID).filter((o,i,a)=>a.indexOf(o)==i).join(",");
					// let url = `${this.wikiInfo.scriptpath}/wikia.php?controller=FeedsAndPosts&method=getArticleNamesAndUsernames&stablePageIds=${ids}&format=json`;
					let url = `https://projects.fewfre.com/rcm/fandomCommentsGetArticleNames.php?wiki=${this.wikiInfo.scriptpath}&stablePageIds=${ids}`;
					Utils.logUrl("(getCommentForumNameLink)", url);
					// url = `${Global.PROXY}${url.split("//")[1]}`;
					return url;
				},
				dataType: "json",
				skipRefreshSanity: true,
				callback: (data) => {
					// Pass data to all waiting items
					this.wikiInfo.discCommentPageNamesNeeded.forEach((o)=>{
						if(data.articleNames[Number(o.pageID)]) {
							o.cb(data.articleNames[Number(o.pageID)]);
							this.wikiInfo.discCommentPageNames.set(o.pageID, data.articleNames[Number(o.pageID)])
						}
					});
					// List cleared of waiting items
					this.wikiInfo.discCommentPageNamesNeeded = [];
				}
			});
		}
		// Pass back temp url with an id to allow updating later
		return `<span class="rcm${uniqID}">[[#|${this.forumName}]]</span>`;
	}
	
	getUpvoteCount() : string {
		// Only forum-type discussions have upvotes
		if(this.containerType != "FORUM") { return ""; }
		return `<span class="rcm-upvotes"> (${Global.getSymbol("rcm-upvote-tiny")} ${this.upvoteCount})</span>`;
	}
	
	getThreadStatusIcons() : string {
		return ""
			+ (this.isLocked ? Global.getSymbol("rcm-lock") : "")
			+ (this.isReported ? Global.getSymbol("rcm-report") : "")
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
					if(data.isLocked) { tIcons += Global.getSymbol("rcm-lock"); }
					if(data.isReported) { tIcons += Global.getSymbol("rcm-report"); }
					if(tIcons) { tSpan.parentNode.insertBefore(Utils.newElement("span", { innerHTML:tIcons }), tSpan); }
				}
			}
		});
	}
}
