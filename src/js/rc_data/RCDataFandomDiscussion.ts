import Global from "../Global";
import RCMManager from "../RCMManager";
import WikiData from "../WikiData";
import { RCDataAbstract, RC_TYPE } from ".";
import Utils from "../Utils";
import i18n from "../i18n";
const { jQuery:$, mediaWiki:mw } = window;

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
	threadTitle		: string;
	forumId			: string;
	forumName		?: string; // name of the forum (may not be suitable for urls) - used on actual page
	forumPageName	?: string; // wiki's page for the wall/comment for use in links (not included by default; needs to be fetched separately)
	
	user_id			: string; // createdBy.id
	user_avatarUrl	: string // createdBy.avatarUrl
	
	isLocked		: string;
	isReported		: string;
	isReply			: boolean;
	action			: "new"|"reply";
	rawContent		: string;
	
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
		this.threadTitle = thread?.title ?? post.title;
		this.forumId = post.forumId;
		this.forumName = post.forumName;
		this.forumPageName = post.forumName;
		
		this.user_id = post.createdBy.id;
		this.user_avatarUrl = post.createdBy.avatarUrl ? post.createdBy.avatarUrl+"/scale-to-width-down/15" : post.createdBy.avatarUrl;
		
		this.isReply = post.isReply;
		this.isLocked = post.isLocked;
		this.isReported = post.isReported;
		this.action = post.position == 1 ? "new" : "reply";
		this.rawContent = post.rawContent;
		
		const jsonModel:JsonModelDataProps = JSON.parse(post.jsonModel);
		
		// Get summary; done two ways based on containerType
		if(post.rawContent) {
			this.summary = post.rawContent;
			if(this.summary.length > 100) { this.summary = this.summary.slice(0, 100).trim()+"..."; }
		} else {
			if(post.poll) {
				this.summary = `${Global.getWdsSymbol('rcm-disc-poll')} ${i18n('activity-social-activity-poll-placeholder')}`;
			}
			else if(post.jsonModel) { // for some reason I had a check to only allow ARTICLE_COMMENT running this; but sometimes wall needs to. and idr why I had the check - so removing it and hoping foe the best! sorry future me if this causes bugs.
				this.summary = this.jsonModelToSummary(jsonModel, 100);
			}
			else if(post.renderedContent) { // for some reason I had a check to only allow ARTICLE_COMMENT running this; but sometimes wall needs to. and idr why I had the check - so removing it and hoping foe the best! sorry future me if this causes bugs.
				this.summary = $(`<div>${post.renderedContent}</div>`).text();
				if(this.summary.length > 100) { this.summary = this.summary.slice(0, 100).trim()+"..."; }
			}
		}
		this.summaryUnparsed = this.summary;
		
		if(jsonModel || post.poll) {
			try {
				this.previewData = { jsonModel, attachments:post._embedded.attachments, poll:post.poll };
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
		else if(this.containerType == "ARTICLE_COMMENT") {
			if(!this.forumName || this.forumName == "Root Forum") {
				this.forumName = undefined;
				this.forumPageName = undefined;
			}
			if(!this.threadTitle) {
				if(thread?.firstPost?.jsonModel) {
					const jsonModel:JsonModelDataProps = JSON.parse(thread.firstPost.jsonModel);
					this.threadTitle = this.jsonModelToSummary(jsonModel, 65); // 100 used in actual one, but I prefer a shorter "title"
				}
				else if(thread?.firstPost?.renderedContent) {
					this.threadTitle = $(`<div>${thread?.firstPost?.renderedContent}</div>`).text();
					if(this.threadTitle.length > 65) { this.threadTitle = this.threadTitle.slice(0, 65).trim()+"..."; }
				}
			}
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
			case 'WALL': return `${wikiInfo.getPageUrl(`Message_Wall:${Utils.escapeCharactersUrl(this.forumPageName!)}`, { threadId, ...params })}${showReply ? `#${id}` : ''}`;
			case 'ARTICLE_COMMENT': return wikiInfo.getPageUrl(Utils.escapeCharactersUrl(this.forumPageName!), { commentId: threadId, ...showReply&&{ replyId: id }, ...params });
		}
	}
	
	getForumUrl() : string {
		const { wikiInfo } = this;
		switch(this.containerType) {
			case 'FORUM': return `${wikiInfo.scriptpath}/d/f?catId=${this.forumId}&sort=latest`;
			case 'WALL': return !this.forumPageName ? "#" : this.wikiInfo.getPageUrl(`Message_Wall:${this.forumPageName}`);
			case 'ARTICLE_COMMENT': return !this.forumPageName ? "#" : this.getUrl(undefined, false); // TODO: we currently group by thread, might be better to group by page? might have issues with RCList though, not sure
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
	
	jsonModelToSummary(jsonModel:JsonModelDataProps, maxLength:number) : string {
		const tJsonToSummary=(props:JsonModelDataProps):string => {
			if("content" in props && props.content) { return props.content.map(tJsonToSummary).join(" "); }
			else if(props.type == "text") { return props.text; }
			else if(props.type == "image") { return " ␚ "; } // use temp here, since html injected here won't play nice with string length
			return "";
		};
		
		let summary = tJsonToSummary(jsonModel).replace(/  /g, " ").trim();
		
		if(summary.length > maxLength) {
			summary = summary.slice(0, maxLength).trim()+"...";
		}
		// Replace the temp character from earlier here, after the length has been shortened
		summary = summary.replace(/␚/g, `${Global.getWdsSymbol('rcm-disc-image')} ${i18n('activity-social-activity-image-placeholder')}`);
		return summary;
	}
	
	discussionTitleText(ajaxIcon?:string, pIsHead:boolean=false) : string {
		ajaxIcon = this.previewData ? (ajaxIcon??"") : ""; // If no preview data, skip
		switch(this.containerType) {
			case "FORUM": {
				let tForumLink = `<a href="${this.getForumUrl()}">${this.forumName}</a>`;
				let tText = i18n.MESSAGES["wall-recentchanges-thread-group"].replace(/(\[\[.*\]\])/g, "$2"); // Replace internal link with a single non-link spot
				return i18n.wiki2html(tText, `<a href="${this.getUrl(undefined, pIsHead)}">${this.threadTitle}</a>${ajaxIcon}`, tForumLink);//+(pIsHead ? "" : this.getUpvoteCount())
			}
			case "WALL": {
				let tText = i18n.MESSAGES["wall-recentchanges-thread-group"].replace(/(\[\[.*\]\])/g, "$2"); // Replace internal link with a single non-link spot
				return i18n.wiki2html(tText,
					`<a href="${this.getUrl(undefined, pIsHead)}">${this.threadTitle}</a>${ajaxIcon}`,
					`<a href="${this.getForumUrl()}">${this.forumName}</a>`,
				);
			}
			case "ARTICLE_COMMENT": {
				return i18n(pIsHead ? "rc-comments" : "rc-comment", this.getCommentForumNameLink(pIsHead)+ajaxIcon);
			}
		}
		mw.log("(discussionTitleText) Unknown containerType:", this.containerType);
	}
	
	getCommentLink({ text, showReply=true }:{ text:string|"set-to-page-name", showReply?:boolean }) : string {
		this.updateFromOldCommentFetchDataIfNeeded();
		
		// If already loaded and saved
		if(this.forumPageName) { return `<a href='${this.getUrl(undefined, !showReply)}' title='${this.title}'>${text=="set-to-page-name" ? this.forumName : text}</a>`; }
		
		// Else name unknown and must be loaded
		let uniqID = Utils.uniqID();
		this.wikiInfo.discCommentPageNamesNeeded.push({ pageID:this.forumId, uniqID, cb:(articleData)=>{
			// Skip if it has been disposed
			if(!this || !this.date) { return; }
			
			this.updateDataFromCommentFetch(articleData);
			$(`.rcm${uniqID}`).attr("href", this.getUrl(undefined, !showReply));
			if(text == "set-to-page-name") {
				$(`.rcm${uniqID}`).text(this.forumName!);
			}
		} });
		
		this.fetchCommentFeedsAndPostsIfNeeded();
		
		return `<a class="rcm${uniqID}" href='${this.getUrl(undefined, !showReply)}' title='${this.title}'>${text=="set-to-page-name" ? null : text}</a>`;
	}
	
	getCommentForumNameLink(pIsHead:boolean=false) : string {
		this.updateFromOldCommentFetchDataIfNeeded();
		
		// If already loaded and saved
		if(this.forumName) { return `[${this.getUrl(undefined, pIsHead)} ${this.forumName}]`; }
		
		// Else name unknown and must be loaded
		let uniqID = Utils.uniqID();
		this.wikiInfo.discCommentPageNamesNeeded.push({ pageID:this.forumId, uniqID, cb:(articleData)=>{
			// Skip if it has been disposed
			if(!this || !this.date) { return; }
			
			this.updateDataFromCommentFetch(articleData);
			$(`.rcm${uniqID} a`).attr("href", this.getUrl(undefined, pIsHead)).text(this.forumName!);
		} });
		
		this.fetchCommentFeedsAndPostsIfNeeded();
		
		// Pass back temp url with an id to allow updating later
		return `<span class="rcm${uniqID}">[[#|${this.forumName}]]</span>`;
	}
	
	getCommentTimeLink() : string {
		this.updateFromOldCommentFetchDataIfNeeded();
		
		// If already loaded and saved
		if(this.forumPageName) { return `<a href='${this.href}' title='${this.title}'>${this.time()}</a>`; }
		
		// Else name unknown and must be loaded
		let uniqID = Utils.uniqID();
		this.wikiInfo.discCommentPageNamesNeeded.push({ pageID:this.forumId, uniqID, cb:(articleData)=>{
			// Skip if it has been disposed
			if(!this || !this.date) { return; }
			
			this.updateDataFromCommentFetch(articleData);
			$(`.rcm${uniqID}`).attr("href", this.href);
		} });
		
		this.fetchCommentFeedsAndPostsIfNeeded();
		
		return `<a class="rcm${uniqID}" href='${this.href}' title='${this.title}'>${this.time()}</a>`;
	}
	
	updateDataFromCommentFetch({ title, relativeUrl }) {
		this.forumName = title;
		this.forumPageName = title;
	}
	
	// If loaded but page not updated for some reason, then update values first
	updateFromOldCommentFetchDataIfNeeded() {
		if(!this.forumName && this.wikiInfo.discCommentPageNames.has(this.forumId)) {
			let articleData = this.wikiInfo.discCommentPageNames.get(this.forumId)!; // come on typescript, there's a has() check right there!
			this.updateDataFromCommentFetch(articleData);
		}
	}
	
	fetchCommentFeedsAndPostsIfNeeded() {
		// If secondary fetch not started for this wiki, then start one
		// To save on speed, we fetch as many as possible from a given wiki
		// (ids stored in discCommentPageNamesNeeded, and url generated when everything is fetched)
		if(this.wikiInfo.discCommentPageNamesNeeded.length === 1) {
			const wikiInfo = this.wikiInfo;
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
					wikiInfo.discCommentPageNamesNeeded.forEach((o)=>{
						if(data.articleNames[Number(o.pageID)]) {
							o.cb(data.articleNames[Number(o.pageID)]);
							wikiInfo.discCommentPageNames.set(o.pageID, data.articleNames[Number(o.pageID)])
						}
					});
					// List cleared of waiting items
					wikiInfo.discCommentPageNamesNeeded = [];
				}
			});
		}
	}
	
	actionText() : string {
		const userDetails = this.userDetails();
		let forumLink = `<a href="${this.getForumUrl()}">${this.forumPageName}</a>`;
		let threadLink = `<a href="${this.getUrl(undefined, true)}">${this.threadTitle}</a>`;
		let viewLink = " "+i18n('parentheses', `<a href="${this.getUrl()}">${i18n('socialactivity-view')}</a>`);
		const summary = i18n('quotation-marks', `<em>${this.summary}</em>`);
		switch(this.containerType) {
			default:
			case "FORUM": {
				switch(this.action) {
					case "new": return i18n('activity-social-activity-post-create', userDetails, threadLink, forumLink, summary)+viewLink;
					case "reply": return i18n('activity-social-activity-post-reply-create', userDetails, threadLink, forumLink, summary)+viewLink;
				}
			}
			case "WALL": {
				switch(this.action) {
					case "new": return i18n('activity-social-activity-message-create', userDetails, threadLink, forumLink, summary)+viewLink;
					case "reply": return i18n('activity-social-activity-message-reply-create', userDetails, threadLink, forumLink, summary)+viewLink;
				}
			}
			case "ARTICLE_COMMENT": {
				forumLink = this.getCommentLink({ text:"set-to-page-name", showReply:false });
				threadLink = this.getCommentLink({ text:this.threadTitle, showReply:false });
				viewLink = " "+i18n('parentheses', this.getCommentLink({ text:i18n('socialactivity-view') }));
				
				switch(this.action) {
					case "new": return i18n('activity-social-activity-comment-create', userDetails, forumLink, summary)+viewLink;
					case "reply": return i18n('activity-social-activity-comment-reply-create', userDetails, threadLink, forumLink, summary)+viewLink;
				}
			}
		}
		return "";
	}
	
	// getUpvoteCount() : string {
	// 	// Only forum-type discussions have upvotes
	// 	if(this.containerType != "FORUM") { return ""; }
	// 	return `<span class="rcm-upvotes"> (${Global.getSymbol("rcm-upvote-tiny")} ${this.upvoteCount})</span>`;
	// }
	
	getThreadStatusIcons() : string {
		return ""
			+ (this.isLocked ? Global.getSymbol("rcm-lock") : "")
			+ (this.isReported ? Global.getSymbol("rcm-report") : "")
		;
	}
	
	getThreadTypeIcon() : string {
		switch(this.containerType) {
			default:
			case "FORUM": return Global.getWdsSymbol('rcm-disc-comment'); // yes, 'comment' is the right icon
			case "WALL": return Global.getWdsSymbol('rcm-disc-envelope');
			case "ARTICLE_COMMENT": return Global.getWdsSymbol('rcm-disc-page'); // yes, 'page' is the right icon
		}
		return "";
	}
	
	getThreadActionIcon() : string {
		switch(this.action) {
			case "new": return this.getThreadTypeIcon();
			case "reply": return Global.getWdsSymbol('rcm-disc-reply');
		}
	}
	
	/* override */ getNotificationTitle() : string {
		switch(this.containerType) {
			case "FORUM": {
				return `${i18n('discussions')}: ${this.threadTitle} [${this.forumName}]`;
			}
			case "WALL": {
				return `${i18n('message-wall')}: ${this.threadTitle} [${this.forumName}]`;
			}
			case "ARTICLE_COMMENT": {
				return i18n("comments");
			}
		}
	}
}
