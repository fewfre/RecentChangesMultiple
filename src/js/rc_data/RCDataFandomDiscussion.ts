import Global from "../Global";
import RCMManager from "../RCMManager";
import RCMModal from "../RCMModal";
import WikiData from "../WikiData";
import { RCDataAbstract, RC_TYPE } from ".";
import Utils from "../Utils";
import i18n from "../i18n";

let $ = window.jQuery;
let mw = window.mediaWiki;

export type JsonModelDataProps = 
	// Content types
	  { type:'doc', content:JsonModelDataProps[] }
	| { type:'paragraph', content?:JsonModelDataProps[] }
	| { type:'code_block', content?:JsonModelDataProps[] }
	// Lists
	| { type:'orderedList', content?:JsonModelDataProps[], attrs:{ createdWith:unknown } }
	| { type:'bulletList', content?:JsonModelDataProps[], attrs:{ createdWith:unknown } }
	| { type:'listItem', content?:JsonModelDataProps[] }
	// Actual data
	| { type:'image', attrs:{ id:number } }
	| { type:'text', text:string, marks?:JsonModelMarkProps[] }
	| { type:'openGraph', attrs:{ id:number, url:string, wasAddedWithInlineLink:boolean } }
;
export type JsonModelMarkProps = 
	  { type:'strong' }
	| { type:'em' }
	| { type:'link', attrs:{ href:string, title:string } }
;
export type PollProps = {
	id: number,
	question: string,
	totalVotes: number,
	answers: { id:number, text:string, position:number, votes:number, image?: { url:string, width:number, height:number, mediaType:string } }[],
};

//######################################
// #### Recent Change Data ####
// * A data object to keep track of RecentChanges data in an organized way, as well as also having convenience methods.
// * These should only ever be used in RCList.
//######################################
export default class RCDataFandomDiscussion extends RCDataAbstract
{
	// Sometimes user data needs to be manually fetched; when it is it is stored in here to avoid having to fetch it again
	static users	: { [id:string]: { name:string, avatarUrl:string, loadIndex?:string } } = {};
	
	// Storage
	type			: RC_TYPE.DISCUSSION;
	containerType	: "ARTICLE_COMMENT" | "FORUM" | "WALL";
	id				: string; // id uniq to this post, not the whole thread - mostly used for replies
	threadId		: string;
	forumId			: string;
	forumName		: string; // name of the forum (may not be suitable for urls) - used on actual page
	forumPageName	: string; // wiki's page for the wall/comment for use in links (not included by default; needs to be fetched separately)
	
	user_id			: string; // createdBy.id
	user_avatarUrl	: string // createdBy.avatarUrl
	
	isLocked		: string;
	isReported		: string;
	isReply			: boolean;
	upvoteCount		: number;
	rawContent		: string;
	
	threadTitle		: string; // The name of the thread if known
	previewData		: { jsonModel:JsonModelDataProps, attachments:any[], poll?:PollProps }; // Preview
	
	// Constructor
	constructor(pWikiInfo:WikiData, pManager:RCMManager, post:any) {
		const thread = post._embedded.thread[0];
		let date = new Date(0); date.setUTCSeconds((post.modificationDate || post.creationDate).epochSecond);
		super(pWikiInfo, pManager, {
			title: post.title ?? thread.title,
			date,
			author: post.createdBy.name ?? post.creatorIp.replace("/",""),
			isUser: !!post.createdBy.name,
			groupWithID: post.threadId,
			namespace: -5234, // Has no namespace. This should probably be unique
		});
		this.type = RC_TYPE.DISCUSSION;
		
		this.containerType = thread.containerType || "FORUM";
		this.id = post.id;
		this.threadId = post.threadId;
		this.forumId = post.forumId;
		this.forumName = post.forumName;
		this.forumPageName = null; // not used on "FORUM"; set further down for other types
		
		this.user_id = post.createdBy.id;
		this.user_avatarUrl = post.createdBy.avatarUrl ? post.createdBy.avatarUrl+"/scale-to-width-down/15" : post.createdBy.avatarUrl;
		
		this.isReply = post.isReply;
		this.isLocked = post.isLocked;
		this.isReported = post.isReported;
		this.upvoteCount = post.upvoteCount;
		this.rawContent = post.rawContent;
		
		this.threadTitle = thread ? (thread.title || post.title) : post.title;
		
		// Get summary; done two ways based on containerType
		this.summary = post.rawContent;
		if(this.containerType == "ARTICLE_COMMENT" && !this.summary && post.jsonModel) {
			let jsonModel:{ type:string, content:{ type:string, text:string }[] }[] = JSON.parse(post.jsonModel).content;
			this.summary = !jsonModel || jsonModel.length===0 ? "" : jsonModel.map(d=>d.type=="paragraph" && d.content ? d.content.map(td=>td.text || "") : "").join(" ").replace(/  /, " ");
		}
		if(this.summary.length > 175) {
			this.summary = `"${this.summary}"`; // Add quotes around it just to drive home it is a quote
			this.summary = this.summary.slice(0, 175)+"...";
		}
		this.summaryUnparsed = this.summary;
		
		if(post.jsonModel || post.poll) {
			try {
				this.previewData = { jsonModel:JSON.parse(post.jsonModel), attachments:post._embedded.attachments, poll:post.poll };
			} catch(e){};
		}
		
		// If it's a wall discussion, then we need to set the wall's owner as the forum page
		if(this.containerType == "WALL") {
			if(this.forumName) this.forumPageName = this.forumName.replace(" Message Wall", ""); // Temp way; can't be relied upon since they may translate it for other languages eventually
			if(RCDataFandomDiscussion.users[post.forumId]) {
				this.forumPageName = RCDataFandomDiscussion.users[post.forumId].name;
			}
		}
		// This is a fake page name, so if we see it we want to treat it as unknown
		else if(this.containerType == "ARTICLE_COMMENT" && this.forumName == "Root Forum") {
			this.forumName = null;
		}
	}
	
	/*override*/ dispose() : void {
		super.dispose();
	}
	
	/*override*/ getUrl(params?:{ [key:string]:string|number }, ignoreReply:boolean=false) : string {
		const { threadId, id, isReply, wikiInfo } = this;
		const showReply = isReply && !ignoreReply;
		switch(this.containerType) {
			case 'FORUM': return `${wikiInfo.scriptpath}/d/p/${threadId}${showReply ? `/r/${id}` : ''}${params ? '?'+$.param(params) : ''}`;
			case 'WALL': return `${wikiInfo.getPageUrl(`Message_Wall:${Utils.escapeCharactersUrl(this.forumPageName)}`, { threadId, ...params })}${showReply ? `#${id}` : ''}`;
			case 'ARTICLE_COMMENT': return wikiInfo.getPageUrl(Utils.escapeCharactersUrl(this.forumPageName), { commentId: threadId, ...showReply&&{ replyId: id }, ...params });
		}
	}
	
	getForumUrl() : string {
		const { wikiInfo } = this;
		switch(this.containerType) {
			case 'FORUM': return `${wikiInfo.scriptpath}/d/f?catId=${this.forumId}&sort=latest`;
			case 'WALL': return !this.forumPageName ? "#" : this.wikiInfo.getPageUrl(`Message_Wall:${this.forumPageName}`);
			case 'ARTICLE_COMMENT': return !this.forumPageName ? "#" : this.getUrl(null, false); // TODO: we currently group by thread, might be better to group by page? might have issues with RCList though, not sure
		}
	}
	
	/*override*/ userDetails() : string {
		// if(this.userhidden) { return '<span class="history-deleted">'+i18n("rev-deleted-user")+'</span>'; }
		
		const articlepath = this.wikiInfo.articlepath, author = Utils.escapeCharactersUrl(this.author), authorNotUrlSafe = this.author;
		
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
		? `<span class="rcm-avatar"><a href="${this.wikiInfo.articlepath}User:${Utils.escapeCharactersUrl(pAuthor||"")}"><img src='${pAvatarUrl}' width="15" height="15" /></a> </span>`
		: "";
	}
	
	discussionTitleText(pThreadTitle?:string, pIsHead:boolean=false) : string {
		switch(this.containerType) {
			case "FORUM": {
				if(pThreadTitle == undefined) { pThreadTitle = this.getThreadTitle(); }
				let tForumLink = `<a href="${this.getForumUrl()}">${this.forumName}</a>`;
				let tText = i18n.MESSAGES["wall-recentchanges-thread-group"].replace(/(\[\[.*\]\])/g, "$2"); // Replace internal link with a single non-link spot
				return i18n.wiki2html(tText, `<a href="${this.getUrl(null, pIsHead)}">${pThreadTitle}</a>`+(pIsHead ? "" : this.getUpvoteCount()), tForumLink);
			}
			case "WALL": {
				if(pThreadTitle == undefined) { pThreadTitle = this.getThreadTitle(); }
				let tText = i18n.MESSAGES["wall-recentchanges-thread-group"].replace(/(\[\[.*\]\])/g, "$2"); // Replace internal link with a single non-link spot
				return i18n.wiki2html(tText,
					`<a href="${this.getUrl(null, pIsHead)}">${pThreadTitle}</a>`,
					`<a href="${this.getForumUrl()}">${this.forumName}</a>`,
				);
			}
			case "ARTICLE_COMMENT": {
				return i18n(pIsHead ? "rc-comments" : "rc-comment", this.getCommentForumNameLink());
			}
		}
		mw.log("(discussionTitleText) Unknown containerType:", this.containerType);
	}
	
	// Check each entry for "threadTitle", else return default text.
	getThreadTitle() : string {
		return this.threadTitle || `<i>${i18n('unknownthreadname')}</i>`;
	}
	
	getCommentForumNameLink(pIsHead:boolean=false) : string {
		// If already loaded and saved
		if(this.forumName) { return `[${this.getUrl(null, pIsHead)} ${this.forumName}]`; }
		
		const tSetDataAfterLoad = (title, relativeUrl)=>{
			this.forumName = title;
			this.forumPageName = title;
		}
		
		// If loaded but page not updated for some reason
		if(this.wikiInfo.discCommentPageNames.has(this.forumId)) {
			let { title, relativeUrl } = this.wikiInfo.discCommentPageNames.get(this.forumId);
			tSetDataAfterLoad(title, relativeUrl);
			return `[${this.getUrl(null, pIsHead)} ${this.forumName}]`;
		}
		
		// Else name unknown and must be loaded
		let uniqID = Utils.uniqID();
		this.wikiInfo.discCommentPageNamesNeeded.push({ pageID:this.forumId, uniqID, cb:({ title, relativeUrl })=>{
			// Skip if it has been disposed
			if(!this || !this.date) { return; }
			
			tSetDataAfterLoad(title, relativeUrl);
			$(`.rcm${uniqID} a`).attr("href", this.getUrl(null, pIsHead)).text(this.forumName);
		} });
		
		// If secondary fetch not start for this wiki, then start one
		// To save on speed, we fetch as many as possible from a given wiki
		// (ids stored in discCommentPageNamesNeeded, and url generated when everything is fetched)
		if(this.wikiInfo.discCommentPageNamesNeeded.length === 1) {
			this.manager.secondaryWikiData.push({
				url: ()=>{
					let ids = this.wikiInfo.discCommentPageNamesNeeded.map(o=>o.pageID).filter((o,i,a)=>a.indexOf(o)==i).join(",");
					let url = `${this.wikiInfo.scriptpath}/wikia.php?controller=FeedsAndPosts&method=getArticleNamesAndUsernames&stablePageIds=${ids}&format=json`;
					Utils.logUrl("(getCommentForumNameLink)", url);
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
	
	/* override */ getNotificationTitle() : string {
		return this.title;
	}
}
