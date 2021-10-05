import RCMManager from "../RCMManager";
import WikiData from "../WikiData";
import Utils from "../Utils";
import i18n from "../i18n";
import { RCDataAbstract, RC_TYPE } from ".";
// const { jQuery:$, mediaWiki:mw } = window;
	
//######################################
// #### Recent Change Data ####
// * A data object to keep track of RecentChanges data in an organized way, as well as also having convenience methods.
// * These should only ever be used in RCList.
//######################################
export default class RCDataArticle extends RCDataAbstract
{
	// Storage
	readonly manager	: RCMManager; // Keep track of what manager this data is attached to.
	readonly wikiInfo	: WikiData; // Keep track of what Wiki this data belongs to.
	
	/***************************
	 * Storage - https://www.mediawiki.org/wiki/API:RecentChanges
	 ***************************/
	type				: RC_TYPE.NORMAL; // What kind of edit the RC is.
	userhidden			: boolean; // If the rc is marked "userhidden"
	newlen				: number; // New file size after edit
	oldlen				: number; // Previous file size before edit
	
	pageid				: number; // rc_cur_id - https://www.mediawiki.org/wiki/Manual:Recentchanges_table#rc_cur_id
	revid				: number; // rc_this_oldid - https://www.mediawiki.org/wiki/Manual:Recentchanges_table#rc_this_oldid
	old_revid			: number; // rc_last_oldid - https://www.mediawiki.org/wiki/Manual:Recentchanges_table#rc_last_oldid
	
	// Constructor
	constructor(pWikiInfo:WikiData, pManager:RCMManager, pData:any) {
		const isUser = pData.user != "" && pData.anon != "";
		super(pWikiInfo, pManager, {
			title: pData.title,
			date: new Date(pData.timestamp),
			author: isUser ? pData.user : (pData.anon ? pData.anon : pData.user),
			isUser,
			namespace: pData.ns,
			groupWithID: pData.title,
			
			isNewPage: pData["new"] == "",
			isBotEdit: pData.bot == "",
			isMinorEdit: pData.minor == "",
			isPatrolled: pData.patrolled == "",
			
		});
		this.type = RC_TYPE.NORMAL;
		
		this.userhidden = pData.userhidden == "";
		this.newlen = pData.newlen;
		this.oldlen = pData.oldlen;
		this.summary = RCDataArticle.tweakParsedComment(pData.parsedcomment, pData.commenthidden == "", this.wikiInfo);
		this.summaryUnparsed = pData.comment;
		
		this.pageid = pData.pageid;
		this.revid = pData.revid;
		this.old_revid = pData.old_revid;
	}
	
	/*override*/ dispose() : void {
		super.dispose();
	}
	
	/*override*/ getUrl(params?:{ [key:string]:string|number }) : string {
		return this.wikiInfo.getPageUrl(this.titleUrlEscaped, params);
	}
	
	/*override*/ userDetails() : string {
		return RCDataArticle.formatUserDetails(this.wikiInfo, this.author, this.userhidden, this.userEdited);
	}
	
	static formatUserDetails(pWikiInfo:WikiData, pAuthor:string, pUserHidden:boolean, pUserEdited:boolean) : string {
		if(pUserHidden) { return '<span class="history-deleted">'+i18n("rev-deleted-user")+'</span>'; }
		
		const authorUrlEscaped = Utils.escapeCharactersUrl(pAuthor);
		let userLink:string, userTools:string[] = [];
		
		if(pUserEdited) {
			userLink = `<a href="${pWikiInfo.getPageUrl(`User:${authorUrlEscaped}`)}" class="${pWikiInfo.getUserClass(pAuthor)}" ${pWikiInfo.getUserClassDataset(pAuthor)}>${pAuthor}</a>`;
			
			userTools.push(`<a href="${pWikiInfo.getPageUrl(`User_talk:${authorUrlEscaped}`)}">${i18n("talkpagelinktext")}</a>`);
			userTools.push(`<a href="${pWikiInfo.getPageUrl(`Special:Contributions/${authorUrlEscaped}`)}">${i18n("contribslink")}</a>`);
		} else {
			userLink = `<a href="${pWikiInfo.getPageUrl(`Special:Contributions/${authorUrlEscaped}`)}" class='rcm-useranon'>${pAuthor}</a>`;
			
			// Normal mediawiki wikis let you talk to anons; fandom does not, so don't add talk link unless not a fandom wiki
			if(!pWikiInfo.isWikiaWiki) {
				userTools.push(`<a href="${pWikiInfo.getPageUrl(`User_talk:${authorUrlEscaped}`)}">${i18n("talkpagelinktext")}</a>`);
			}
		}
		
		if(pWikiInfo.user.rights.block) {
			userTools.push(`<a href="${pWikiInfo.getPageUrl(`Special:Block/${authorUrlEscaped}`)}">${i18n("blocklink")}</a>`);
		}
		
		const userToolsString = userTools.length === 0 ? "" : " "+i18n('parentheses-start')+userTools.join(i18n("pipe-separator"))+i18n('parentheses-end');
		return `<span class='mw-usertoollinks'>${userLink}${userToolsString}</span>`;
		
		// var blockText = pWikiInfo.user.rights.block ? i18n("pipe-separator")+"<a href='{0}Special:Block/{1}'>"+i18n("blocklink")+"</a>" : "";
		// if(pUserEdited) {
		// 	return Utils.formatString("<span class='mw-usertoollinks'><a href='{0}User:{1}' class='"+pWikiInfo.getUserClass(pAuthor)+"' "+pWikiInfo.getUserClassDataset(pAuthor)+">{2}</a> (<a href='{0}User_talk:{1}'>"+i18n("talkpagelinktext")+"</a>"+i18n("pipe-separator")+"<a href='{0}Special:Contributions/{1}'>"+i18n("contribslink")+"</a>"+blockText+")</span>", pWikiInfo.articlepath, Utils.escapeCharactersUrl(pAuthor), pAuthor);
		// } else {
		// 	return Utils.formatString("<span class='mw-usertoollinks'><a class='rcm-useranon' href='{0}Special:Contributions/{1}'>{2}</a> (<a href='{0}User_talk:{1}'>"+i18n("talkpagelinktext")+"</a>"+blockText+")</span>", pWikiInfo.articlepath, Utils.escapeCharactersUrl(pAuthor), pAuthor);
		// }
	}
	
	static tweakParsedComment(pParsedComment:string, pDeleted:boolean, pWikiInfo:WikiData) : string {
		if(!pDeleted) {
			pParsedComment = pParsedComment?.replace(/<a href="\//g, "<a href=\""+pWikiInfo.server+"/"); // Make links point to correct wiki.
		} else {
			pParsedComment = `<span class="history-deleted">${i18n("rev-deleted-comment")}</span>`;
		}
		return pParsedComment?.trim().replace(/(\r\n|\n|\r)/gm, " ");
	}
	
	/*override*/ getNotificationTitle() : string {
		return this.title;
	}
	
	pageTitleTextLink() : string {
		return `<a class='rc-pagetitle' href='${this.href}'>${this.title}</a>`;
	}
	
	/**
	 * Returns a URL that compares the edits of two RCs (can be the same one twice, since a RC has info on the current and previous edit).
	 * 
	 * @param pToRC If undefined, it will link to newest edit.
	 * @returns URL to diff
	*/
	getRcCompareDiffUrl(pToRC?:RCDataArticle) : string {
		return this.getUrl({
			curid	: this.pageid,
			diff	: pToRC?.revid || 0,
			oldid	: this.old_revid,
		});
	}
	
	/**
	 * Returns a URL to current revision, unless extra params are passed in to view diff
	 * @param diff if 0 it compares to most recent revision
	 * @param oldid 
	 * @returns URL to revision or diff
	*/
	getRcRevisionUrl(diff?:string|number, oldid?:string|number) : string {
		return this.getUrl({
			curid:	this.pageid,
			...(diff||diff==0) && { diff },
			...oldid && { oldid },
		});
	}
}
