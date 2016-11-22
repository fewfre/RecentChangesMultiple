import ConstantsApp from "./ConstantsApp";
import RCMManager from "./RCMManager";
import RCMModal from "./RCMModal";
import WikiData from "./WikiData";
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
	href				: string; // link to the page (no "&diff", etc) ex: http://test.wikia.com/wiki/Test
	hrefBasic			: string; // Same as this.href, but with nos "/@comment"s either.
	hrefFS				: string; // Same as this.href, but followed by this.wikiInfo.firstSeperator.
	
	/***************************
	 * Situational Data - depends on the type, might not even be used, and may remain be unset.
	 ***************************/
	isSubComment		: boolean; // If the is a "reply" to a comment/board/wall (versus the original it replies too)
	isWallBoardAction	: boolean; // If an action was taken on a wall / board (instead of a "normal" edit)
	threadTitle			: string; // The name of the thread if known (if a wall / board)
	log_info_0			: any; // Generic info passed for a rc/log
	actionhidden		: boolean; // If the rc is marked "actionhidden"
	
	/***************************
	 * Log Info - info for specific logs that require additional info via API:Logevents.
	 * THESE ARE USED, but not instantiated since no reason to take up the memory until used (since logs might not be present).
	 ***************************/
	log_move_newTitle			: string; // Name of new page after page moved.
	log_move_noredirect			: string; // If redirect is suppressed, should be "-noredirect" else ""
	log_rights_oldgroups		: string; // string of all groups separated by commas
	log_rights_newgroups		: string; // string of all groups separated by commas
	log_delete_revisions_num	: number; // Number of revisions
	log_delete_new_bitmask		: string; // action taken on visibility change
	log_block_duration			: string; // how long the block is for
	log_block_flags				: string; // string of block flags separated by commas
	log_merge_destination		: string; // title of the page being merged into.
	log_merge_mergepoint		: string; // timestamp the merge is up to.
	
	// Constructor
	constructor(pWikiInfo:WikiData, pManager:RCMManager) {
		this.manager = pManager;
		this.wikiInfo = pWikiInfo;
	}
	
	dispose() : void {
		delete this.manager;
		delete this.wikiInfo;
		
		this.date = null;
		this.type = null;
	}
	
	init(pData:any, pLogDataArray:any[]) : RCData {
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
		this.titleNoNS = (this.namespace != 0 && this.title.indexOf(":") > -1) ? this.title.split(":")[1] : this.title;
		this.uniqueID = this.title; // By default; make change based on this.type.
		this.hrefTitle = Utils.escapeCharactersLink( pData.title );
		this.href = this.wikiInfo.articlepath + this.hrefTitle;
		this.hrefBasic = this.href.split("/@comment")[0];
		this.hrefFS	= this.href + this.wikiInfo.firstSeperator;
		
		// Figure out the type of edit this is.
		if(this.logtype && this.logtype != "0") { // It's a "real" log. "0" signifies a wall/board.
			this.type = TYPE.LOG;
			this.log_info_0 = pData["0"];
			
			this.actionhidden = pData.actionhidden == "";
			this._initLog(pData, pLogDataArray);
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
	
	// If it's a log, init data if needed for that type.
	private _initLog(pRCData:any, pLogDataArray:any[]) : void {
		if(this.actionhidden) { return; }
		
		var tLogParams = null;
		// Get log params
		if(this.wikiInfo.useOutdatedLogSystem) {
			if(pLogDataArray == undefined) { return; }
			var i = -1;
			// Find log info that belong to this RC.
			for (var x = 0; x < pLogDataArray.length; x++) {
				if(pRCData.logid == pLogDataArray[x].logid) {// && pRCData.timestamp == pLogDataArray[x].timestamp) {
					i = x;
					break;
				}
			}
			if(i == -1) { return; }
			tLogParams = pLogDataArray[i];
		} else {
			tLogParams = pRCData.logparams;
		}
		
		// Remember important info for a log.
		switch(this.logtype) {
			case "move": {
				this.log_move_newTitle = "";
				let is_log_move_noredirect = false;
				if(this.wikiInfo.useOutdatedLogSystem == false) {
					if(tLogParams) {
						this.log_move_newTitle = Utils.escapeCharacters( tLogParams.target_title );
						is_log_move_noredirect = tLogParams.suppressredirect=="";
						// target_ns
					}
				} else {
					tLogParams = tLogParams.move;
					if(tLogParams) {
						this.log_move_newTitle = Utils.escapeCharacters( tLogParams.new_title );
						is_log_move_noredirect = tLogParams.suppressedredirect=="";
						// new_ns
					}
				}
				// If true, add a flag for it.
				this.log_move_noredirect = is_log_move_noredirect ? "-noredirect" : "";
				break;
			}
			case "rights": {
				this.log_rights_oldgroups = "?";
				this.log_rights_newgroups = "?";
				if(this.wikiInfo.useOutdatedLogSystem == false) {
					if(tLogParams) {
						this.log_rights_oldgroups = tLogParams.oldgroups.length == 0 ? i18n("rightsnone") : tLogParams.oldgroups.join(", ");
						this.log_rights_newgroups = tLogParams.newgroups.length == 0 ? i18n("rightsnone") : tLogParams.newgroups.join(", ");
					}
				} else {
					tLogParams = tLogParams.rights;
					if(tLogParams) {
						this.log_rights_oldgroups = tLogParams.old == "" ? i18n("rightsnone") : tLogParams.old;
						this.log_rights_newgroups = tLogParams["new"] == "" ? i18n("rightsnone") : tLogParams["new"];
					}
				}
				break;
			}
			case "block": {
				// Assumes "block-log-flags" for: anononly, nocreate, noautoblock, noemail, nousertalk, autoblock, hiddenname
				this.log_block_duration = "?";
				let log_block_flags_arr = [];
				if(this.wikiInfo.useOutdatedLogSystem == false) {
					if(tLogParams) {
						this.log_block_duration = tLogParams.duration;
						log_block_flags_arr = tLogParams.flags || [];
					}
				} else {
					tLogParams = tLogParams.block;
					if(tLogParams) {
						this.log_block_duration = tLogParams.duration;
						log_block_flags_arr = tLogParams.flags.split(",");
					}
				}
				
				for (var i = 0; i < log_block_flags_arr.length; i++) {
					// If we have a translation for flag, use it. otherwise, leave the flag id alone.
					if(i18n("block-log-flags-" + log_block_flags_arr[i])) {
						log_block_flags_arr[i] = i18n("block-log-flags-" + log_block_flags_arr[i]);
					}
				}
				this.log_block_flags = "("+ log_block_flags_arr.join(", ") +")";
				log_block_flags_arr = null;
				break;
			}
			case "delete": {
				this.log_delete_revisions_num = 1;
				let log_delete_new_bitmask_id:string|number = "?";
				if(this.wikiInfo.useOutdatedLogSystem == false) {
					if(tLogParams) {
						this.log_delete_revisions_num = (tLogParams.ids || [1]).length;
						log_delete_new_bitmask_id = (tLogParams["new"] || {}).bitmask;
					}
				} else {
					// tLogParams = tLogParams.delete;
					// if(tLogParams) {
						
					// }
					if(this.log_info_0) {
						// this.log_delete_revisions_num = ????; // No clue how to get this; but haven't been able to find example of it being used, so meh.
						log_delete_new_bitmask_id = parseInt((this.log_info_0.split("\n")[3] || "=1").split("=")[1]);
					}
				}
				
				switch(log_delete_new_bitmask_id) {
					case 1: {
						this.log_delete_new_bitmask = i18n("revdelete-content-hid");
						break;
					}
					case 2: {
						this.log_delete_new_bitmask = i18n("revdelete-summary-hid"); // I'm assuming; couldn't actually find what "2" was.
						break;
					}
					case 3: {
						this.log_delete_new_bitmask = i18n("revdelete-content-hid") + i18n("and") + " " + i18n("revdelete-summary-hid");
						break;
					}
				}
				break;
			}
			case "merge": {
				this.log_merge_destination = "";
				this.log_merge_mergepoint = "0";
				if(this.wikiInfo.useOutdatedLogSystem == false) {
					if(tLogParams) {
						this.log_merge_destination = Utils.escapeCharacters( tLogParams.dest_title );
						this.log_merge_mergepoint = tLogParams.mergepoint;
						// dest_ns
					}
				} else {
					// tLogParams = tLogParams.merge;
					// if(tLogParams) {
						
					// }
					
					if(this.log_info_0 && pRCData["1"]) {
						this.log_merge_destination = Utils.escapeCharacters( this.log_info_0 );
						this.log_merge_mergepoint = Utils.getTimestampForYYYYMMDDhhmmSS(pRCData["1"]);
					}
				}
				break;
			}
		}
		
		tLogParams = null;
	}
	
	time() : string {
		return Utils.pad(Utils.getHours(this.date, this.manager.timezone),2)+":"+Utils.pad(Utils.getMinutes(this.date, this.manager.timezone),2);
	}
	
	userDetails() : string {
		// if(this.userhidden) { return '<span class="history-deleted">'+i18n("rev-deleted-user")+'</span>'; }
		//
		// var blockText = this.wikiInfo.canBlock ? i18n("pipe-separator")+"<a href='{0}Special:Block/{1}'>"+i18n("blocklink")+"</a>" : "";
		// if(this.userEdited) {
		// 	return Utils.formatString("<span class='mw-usertoollinks'><a href='{0}User:{1}'>{2}</a> (<a href='{0}User_talk:{1}'>"+i18n("talkpagelinktext")+"</a>"+i18n("pipe-separator")+"<a href='{0}Special:Contributions/{1}'>"+i18n("contribslink")+"</a>"+blockText+")</span>", this.wikiInfo.articlepath, Utils.escapeCharactersLink(this.author), this.author);
		// } else {
		// 	return Utils.formatString("<span class='mw-usertoollinks'><a href='{0}Special:Contributions/{1}'>{2}</a> (<a href='{0}User_talk:{1}'>"+i18n("talkpagelinktext")+"</a>"+blockText+")</span>", this.wikiInfo.articlepath, Utils.escapeCharactersLink(this.author), this.author);
		// }
		return RCData.formatUserDetails(this.wikiInfo, this.author, this.userhidden, this.userEdited);
	}
	
	static formatUserDetails(pWikiInfo:WikiData, pAuthor:string, pUserHidden:boolean, pUserEdited:boolean) : string {
		if(pUserHidden) { return '<span class="history-deleted">'+i18n("rev-deleted-user")+'</span>'; }
		
		var blockText = pWikiInfo.canBlock ? i18n("pipe-separator")+"<a href='{0}Special:Block/{1}'>"+i18n("blocklink")+"</a>" : "";
		if(pUserEdited) {
			return Utils.formatString("<span class='mw-usertoollinks'><a href='{0}User:{1}'>{2}</a> (<a href='{0}User_talk:{1}'>"+i18n("talkpagelinktext")+"</a>"+i18n("pipe-separator")+"<a href='{0}Special:Contributions/{1}'>"+i18n("contribslink")+"</a>"+blockText+")</span>", pWikiInfo.articlepath, Utils.escapeCharactersLink(pAuthor), pAuthor);
		} else {
			return Utils.formatString("<span class='mw-usertoollinks'><a href='{0}Special:Contributions/{1}'>{2}</a> (<a href='{0}User_talk:{1}'>"+i18n("talkpagelinktext")+"</a>"+blockText+")</span>", pWikiInfo.articlepath, Utils.escapeCharactersLink(pAuthor), pAuthor);
		}
	}
	
	logTitleText() : string {
		var logTemplate = "(<a class='rc-log-link' href='"+this.wikiInfo.articlepath+"Special:Log/{0}'>{1}</a>)";
		switch(this.logtype) {
			case "abusefilter"	:{ return Utils.formatString(logTemplate, this.logtype,	i18n("abusefilter-log")); }
			case "block"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n("blocklogpage")); }
			case "chatban"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n("chat-chatban-log")); }
			case "delete"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n("dellogpage")); }
			case "import"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n("importlogpage")); }
			case "maps"			:{ return Utils.formatString(logTemplate, this.logtype,	i18n("wikia-interactive-maps-log-name")); }
			case "merge"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n("mergelog")); }
			case "move"			:{ return Utils.formatString(logTemplate, this.logtype,	i18n("movelogpage")); }
			case "protect"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n("protectlogpage")); }
			case "upload"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n("uploadlogpage")); }
			case "useravatar"	:{ return Utils.formatString(logTemplate, this.logtype,	i18n("useravatar-log")); }
			case "newusers"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n("newuserlogpage")); }
			case "renameuser"	:{ return Utils.formatString(logTemplate, this.logtype,	i18n("userrenametool-logpage")); }
			case "rights"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n("rightslog")); }
			case "wikifeatures"	:{ return Utils.formatString(logTemplate, this.logtype,	i18n("wikifeatures-log-name")); }
			default				:{ return Utils.formatString(logTemplate, this.logtype,	this.logtype); } // At least display it as a log.
		}
		// return "";
	}
	
	// Check each entry for "threadTitle", else return default text.
	getThreadTitle() : string {
		return this.threadTitle ? this.threadTitle :  "<i>"+i18n('rcm-unknownthreadname')+"</i>";
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
			pParsedComment = pParsedComment.replace("<a href=\"/", "<a href=\""+pWikiInfo.server+"/"); // Make links point to correct wiki.
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
	
	// Returns text explaining what the log did. Also returns user details (since it's a part of some of their wiki text).
	// Some info is only present in the edit summary for some logtypes, so these parts won't be translated.
	logActionText() : string {
		var tLogMessage = "";
		
		if(this.actionhidden) {
			tLogMessage = `<span class="history-deleted">${i18n("rev-deleted-event")}</span>`;
			tLogMessage += this.getSummary();
		}
		
		switch(this.logtype) {
			case "block": {
				tLogMessage += this.userDetails()+" ";
				switch(this.logaction) {
					case "block": { tLogMessage += i18n("blocklogentry",		this.href+"|"+this.titleNoNS, this.log_block_duration, this.log_block_flags ); break; }
					case "reblock": { tLogMessage += i18n("reblock-logentry",	this.href+"|"+this.titleNoNS, this.log_block_duration, this.log_block_flags ); break; }
					case "unblock": { tLogMessage += i18n("unblocklogentry",	this.titleNoNS ); break; }
				}
				break;
			}
			case "delete": {
				// logactions assumed: delete, restore, event, revision, event-legacy, revision-legacy
				tLogMessage += i18n("logentry-delete-"+this.logaction,
					this.userDetails(),
					undefined, // Cannot know gender of edit user
					`<a href='${this.href}'>${this.title}</a>`,
					this.log_delete_new_bitmask,
					this.log_delete_revisions_num
				);
				break;
			}
			case "import": {
				tLogMessage += this.userDetails()+" ";
				switch(this.logaction) {
					case "upload": { tLogMessage += i18n("import-logentry-upload", this.href+"|"+this.title ); break; }
					case "interwiki": { tLogMessage += i18n("import-logentry-interwiki", this.title ); break; }
				}
				break;
			}
			case "merge": {
				tLogMessage += this.userDetails()+" ";
				// merged [[$1]] into [[$2]] (revisions up to $3)
				tLogMessage += i18n("import-logentry-upload",
					this.href + "|" + this.title,
					this.wikiInfo.articlepath+this.log_merge_destination + "|" + this.log_merge_destination,
					this.getLogTimeStamp(new Date(this.log_merge_mergepoint))
				);
				break;
			}
			case "move": {
				// logactions assumed: move, move-noredirect, move_redir, move_redir-noredirect
				tLogMessage += i18n("logentry-move-"+this.logaction+(this.log_move_noredirect || ""/*band-aid fix*/),
					this.userDetails(),
					undefined, // Don't know if male / female.
					`<a href='${this.hrefFS}redirect=no'>${this.title}</a>`,
					`<a href='${this.wikiInfo.articlepath + Utils.escapeCharactersLink(this.log_move_newTitle)}'>${this.log_move_newTitle}</a>`
				);
				break;
			}
			case "protect": {
				tLogMessage += this.userDetails()+" ";
				var t$1 = this.href+"|"+this.title;
				switch(this.logaction) {
					case "protect": { tLogMessage += i18n("protectedarticle", t$1 ) + " "+this.log_info_0; break; }
					case "modify": { tLogMessage += i18n("modifiedarticleprotection", t$1 ) + " "+this.log_info_0; break; }
					case "unprotect": { tLogMessage += i18n("unprotectedarticle", t$1 ); break; }
					case "move_prot": { tLogMessage += i18n.wiki2html( i18n.MESSAGES["movedarticleprotection"].replace("[[$2]]", this.log_info_0), t$1 ); break; }
				}
				break;
			}
			case "upload": {
				tLogMessage += this.userDetails()+" ";
				switch(this.logaction) {
					case "upload": { tLogMessage += i18n("uploadedimage",		this.href+"|"+this.title ); break; }
					case "overwrite": { tLogMessage += i18n("overwroteimage",	this.href+"|"+this.title ); break; }
				}
				break;
			}
			case "newusers": {
				// logactions assumed: newusers, create, create2, autocreate (kinda sorta maybe)
				tLogMessage += i18n("logentry-newusers-"+this.logaction, this.userDetails(), undefined, "" );
				break;
			}
			case "rights": {
				tLogMessage += this.userDetails()+" ";
				switch(this.logaction) {
					case "rights": { tLogMessage += i18n("rightslogentry", `<a href='${this.href}'>${this.title}</a>`, this.log_rights_oldgroups, this.log_rights_newgroups ); break; }
				}
				break;
			}
			case "useravatar": {
				tLogMessage += this.userDetails()+" ";
				switch(this.logaction) {
					case "avatar_chn": { tLogMessage += i18n("blog-avatar-changed-log"); break; } // 'Added or changed avatar'
					case "avatar_rem": { tLogMessage += i18n("blog-avatar-removed-log", `<a href='${this.href}'>${this.title}</a>`); break; } // "Removed $1's avatars"
				}
				break;
			}
			case "renameuser": {
				tLogMessage += this.userDetails()+" renameuser"; // Rest of the info is in the edit summary (so won't be translated by script).
				break;
			}
			case "wikifeatures": {
				tLogMessage += this.userDetails()+" wikifeatures"; // Rest of the info is in the edit summary (so won't be translated by script).
				break;
			}
			case "chatban": {
				var tChatData = this.log_info_0.split("\n");
				var t$3 = undefined;
				if(tChatData[3]) {
					t$3 = this.getLogTimeStamp(new Date(parseInt(tChatData[3])*1000));
				}
				
				tLogMessage += this.userDetails()+" ";
				// logaction assumed: chatbanadd, chatbanremove, chatbanchange
				tLogMessage += i18n("chat-"+this.logaction+"-log-entry", `<a href='${this.href}'>${this.titleNoNS}</a>`, tChatData[2], t$3 );
				tChatData = null;
				break;
			}
			case "maps": {
				// logactions assumed: create_map, update_map, delete_map, undelete_map
				//						create_pin_type, update_pin_type, delete_pin_type
				//						create_pin, update_pin, delete_pin
				tLogMessage += i18n("logentry-maps-"+this.logaction, this.userDetails(), undefined, this.title );
				break;
			}
			case "abusefilter": {
				var tAbusePage = this.log_info_0.split("\n");
				var tAbuseItem = tAbusePage.shift();
				
				tLogMessage += this.userDetails()+" ";
				switch(this.logaction) {
					case "modify": {
						tLogMessage += i18n("abusefilter-log-entry-modify",
							`<a href='${this.href}'>${this.title}</a>`,
							`<a href='${this.wikiInfo.articlepath}Special:AbuseFilter/history/${tAbusePage}/diff/prev/${tAbuseItem}'>${i18n("abusefilter-log-detailslink")}</a>`
						);
						break;
					}
				}
				break;
			}
		}
		if(tLogMessage == "") {
			tLogMessage += this.userDetails()+` ??? (${this.logtype} - ${this.logaction}) `;
		}
		tLogMessage += this.getSummary();
		return tLogMessage;
	}
	
	// Assumes it's a wall/board that has an action (will just return summary otherwise).
	wallBoardActionMessageWithSummary(pThreadTitle?:string) : string {
		var tThreadTitle = pThreadTitle || this.getThreadTitle(); // Title is passed in due to it being found via ajax.
		var tLocalizedActionMessage = "";
		var tPrefix = this.type == TYPE.BOARD ? "forum-recentchanges" : "wall-recentchanges";
		var tMsgType = this.isSubComment ? "reply" : "thread";
		switch(this.logaction) {
			case "wall_remove":			tLocalizedActionMessage = tPrefix + "-removed-" + tMsgType; break;
			case "wall_admindelete":	tLocalizedActionMessage = tPrefix + "-deleted-" + tMsgType; break;
			case "wall_restore":		tLocalizedActionMessage = tPrefix + "-restored-" + tMsgType; break;
			case "wall_archive":		tLocalizedActionMessage = tPrefix + "-closed-thread"; break;
			case "wall_reopen":			tLocalizedActionMessage = tPrefix + "-reopened-thread"; break;
		}
		if(tLocalizedActionMessage != "") {
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
			if(ConstantsApp.debug) { console.log("This should not happen in getBoardWallParent()"); }
			return this.title;
		}
	}
	
	getBoardWallParentLink() : string {
		return this.wikiInfo.articlepath + this.getBoardWallParentTitleWithNamespace();
	}
	
	pageTitleTextLink() : string {
		if(this.type == TYPE.COMMENT) {
			return i18n("article-comments-rc-comment", this.href, this.titleNoNS);
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
	
	wallBoardHistoryLink() : string {
		var tLink = "", tText = "";
		if(this.type == TYPE.WALL) {
			tLink = this.wikiInfo.articlepath + Utils.escapeCharactersLink(this.getBoardWallParentTitleWithNamespace()) + this.wikiInfo.firstSeperator + "action=history";
			tText = this.isSubComment ? "wall-recentchanges-thread-history-link" : "wall-recentchanges-history-link";
		} else {
			tLink = this.wikiInfo.articlepath + Utils.escapeCharactersLink(this.getBoardWallParentTitleWithNamespace()) + this.wikiInfo.firstSeperator + "action=history";
			tText = this.isSubComment ? "forum-recentchanges-thread-history-link" : "forum-recentchanges-history-link";
		}
		return `(<a href='${tLink}'>${i18n(tText)}</a>)`;
	}
	
	getLogTimeStamp(pDate) : string {
		// return ""
		// 	+ 			Utils.pad( Utils.getHours(pDate, this.manager.timezone), 2 )
		// 	+ ":" +		Utils.pad( Utils.getMinutes(pDate, this.manager.timezone), 2 )
		// 	+ ", " +	Utils.pad( Utils.getDate(pDate, this.manager.timezone), 2 )
		// 	+ " " +		mw.config.get('wgMonthNames')[Utils.getMonth(pDate, this.manager.timezone)+1]
		// 	+ " " +		Utils.getYear(pDate, this.manager.timezone)
		// ;
		return RCData.getFullTimeStamp(pDate, this.manager.timezone);
	}
	
	static getFullTimeStamp(pDate:Date, pTimezone:string) : string {
		return ""
			+ 			Utils.pad( Utils.getHours(pDate, pTimezone), 2 )
			+ ":" +		Utils.pad( Utils.getMinutes(pDate, pTimezone), 2 )
			+ ", " +	Utils.pad( Utils.getDate(pDate, pTimezone), 2 )
			+ " " +		mw.config.get('wgMonthNames')[Utils.getMonth(pDate, pTimezone)+1]
			+ " " +		Utils.getYear(pDate, pTimezone)
		;
	}
	
	// STATIC - https://www.mediawiki.org/wiki/API:Revisions
	// Inspired by http://dev.wikia.com/wiki/AjaxDiff / http://dev.wikia.com/wiki/LastEdited
	static previewDiff(pPageName:string, pageID:string|number, pAjaxUrl:string, pDiffLink:string, pUndoLink:string, pDiffTableInfo:any) : void {
		if(ConstantsApp.debug) { console.log(`http:${pAjaxUrl}`); console.log(pDiffLink); console.log(pUndoLink); }
		
		var tTitle = `${pPageName} - ${i18n('rcm-module-diff-title')}`;
		// Need to push separately since undo link -may- not exist (Wikia style forums sometimes).
		var tButtons = [];
		tButtons.push({
			value: i18n('rcm-module-diff-open'),
			event: "diff",
			callback: function(){ window.open(pDiffLink, '_blank'); },
		});
		if(pUndoLink != null) {
			tButtons.push({
				value: i18n('rcm-module-diff-undo'),
				event: "undo",
				callback: function(){ window.open(pUndoLink, '_blank'); },
			});
		}
		
		RCMModal.showLoadingModal({ title:tTitle, rcm_buttons:tButtons }, function(){
			// Retrieve the diff table.
			// TODO - error support?
			$.ajax({ type: 'GET', dataType: 'jsonp', data: {}, url: pAjaxUrl,
				success: function(pData){
					var tPage = pData.query.pages[pageID];
					var tRevision = tPage.revisions[0];
					
					// if(module.debug) { console.log("Rollback: ", pRollbackLink, tRevision.rollbacktoken, tPage.lastrevid, tRevision.diff.to); }
					// if(pRollbackLink != null && tRevision.rollbacktoken && tPage.lastrevid == tRevision.diff.to) {
					// 	tButtons.splice(tButtons.length-2, 0, {
					// 		value: i18n('rollbacklink'),
					// 		event: "rollback",
					// 		callback: function(){ window.open(pRollbackLink+tRevision.rollbacktoken, '_blank'); },
					// 	});
					// }
					
					var tOMinor = tRevision.minor == "" ? `<abbr class="minoredit">${i18n('minoreditletter')}</abbr> ` : "";
					var tNMinor = pDiffTableInfo.newRev.minor ? `<abbr class="minoredit">${i18n('minoreditletter')}</abbr> ` : "";
					// TODO: Find out if new revision is most recent, and have timestamp message show the "most recent revision" message. Also make edit button not have "oldid" in the url.
					var tModalContent = ''
					+"<div id='rcm-diff-view'>"
					+"<table class='diff'>"
						+"<colgroup>"
							+"<col class='diff-marker'>"
							+"<col class='diff-content'>"
							+"<col class='diff-marker'>"
							+"<col class='diff-content'>"
						+"</colgroup>"
						+"<tbody>"
							+"<tr class='diff-header' valign='top'>"
								+"<td class='diff-otitle' colspan='2'>"
									+"<div class='mw-diff-otitle1'>"
										+"<strong>"
											+"<a href='"+pDiffTableInfo.hrefFS+"oldid="+tRevision.diff.from+"' data-action='revision-link-before'>"+i18n('revisionasof', RCData.getFullTimeStamp(new Date(tRevision.timestamp), pDiffTableInfo.wikiInfo.manager.timezone))+"</a>"
											+" <span class='mw-rev-head-action'>"
												+`(<a href="${pDiffTableInfo.hrefFS}oldid=${tRevision.diff.from}&action=edit" data-action="edit-revision-before">${i18n('editold')}</a>)`
											+"</span>"
										+"</strong>"
									+"</div>"
									+"<div class='mw-diff-otitle2'>"+RCData.formatUserDetails(pDiffTableInfo.wikiInfo, tRevision.user, tRevision.userhidden == "", tRevision.anon != "")+"</div>"
									+"<div class='mw-diff-otitle3'>"+tOMinor+RCData.formatSummary(RCData.formatParsedComment(tRevision.parsedcomment, tRevision.commenthidden == "", pDiffTableInfo.wikiInfo))+"</div>"
									// +"<div class='mw-diff-otitle4'></div>"
								+"</td>"
								+"<td class='diff-ntitle' colspan='2'>"
									+"<div class='mw-diff-ntitle1'>"
										+"<strong>"
											+"<a href='"+pDiffTableInfo.hrefFS+"oldid="+tRevision.diff.to+"' data-action='revision-link-after'>"+i18n('revisionasof', RCData.getFullTimeStamp(pDiffTableInfo.newRev.date, pDiffTableInfo.wikiInfo.manager.timezone))+"</a>"
											+" <span class='mw-rev-head-action'>"
												+`(<a href="${pDiffTableInfo.hrefFS}oldid=${tRevision.diff.to}&action=edit" data-action="edit-revision-after">${i18n('editold')}</a>)`
											+"</span>"
											+"<span class='mw-rev-head-action'>"
												+`(<a href="${pDiffTableInfo.hrefFS}action=edit&undoafter=${tRevision.diff.to}&undo=${tRevision.diff.to}" data-action="undo">${i18n('editundo')}</a>)`
											+"</span>"
										+"</strong>"
									+"</div>"
									+"<div class='mw-diff-ntitle2'>"+pDiffTableInfo.newRev.user+"</div>"
									+"<div class='mw-diff-ntitle3'>"+tNMinor+pDiffTableInfo.newRev.summary+"</div>"
									// +"<div class='mw-diff-ntitle4'></div>"
								+"</td>"
							+"</tr>"
							+tRevision.diff["*"]
						+"</tbody>"
					+"</table>";
					+"</div>";
					// RCMModal.showModal({ title:tTitle, content:tModalContent, rcm_buttons:tButtons });
					RCMModal.setModalContent(tModalContent);
				},
			});
		});
	}
	
	// STATIC - https://www.mediawiki.org/wiki/API:Imageinfo
	static previewImages(pAjaxUrl:string, pImageNames:string[], pArticlePath:string) : void {
		var tImagesInLog = pImageNames.slice();
		var size = 210; // (1000-~40[for internal wrapper width]) / 4 - (15 * 2 [padding])
		pAjaxUrl += "&iiurlwidth="+size+"&iiurlheight="+size;
		var tCurAjaxUrl = pAjaxUrl + "&titles="+tImagesInLog.splice(0, 50).join("|");
		
		if(ConstantsApp.debug) { console.log("http:"+tCurAjaxUrl.replace("&format=json", "&format=jsonfm"), pImageNames); }
		
		var tTitle = i18n("awc-metrics-images");
		// Need to push separately since undo link -may- not exist (Wikia style forums sometimes).
		var tButtons = [];
		
		var tGetGalleryItem = function (pPage) {
			var tPage = pPage, tPageTitleNoNS = null, tImage = null, tInvalidImage:any|boolean = null;
			
			if(tPage.imageinfo) { tImage = tPage.imageinfo[0]; }
			tPageTitleNoNS = tPage.title.indexOf(":") > -1 ? tPage.title.split(":")[1] : tPage.title;
			tInvalidImage = false;
			if(tPage.missing == "") {
				tInvalidImage = {
					thumbHref: pArticlePath+Utils.escapeCharactersLink(tPage.title),
					thumbText: i18n('filedelete-success', tPage.title),
					caption: tPageTitleNoNS
				};
			} else if(tImage == null) {
				tInvalidImage = {
					thumbHref: pArticlePath+Utils.escapeCharactersLink(tPage.title),
					thumbText: i18n('shared_help_was_redirect', tPage.title),
					caption: tPageTitleNoNS
				};
			} else if(Utils.isFileAudio(tPage.title)) {
				tInvalidImage = {
					thumbHref: tImage.url,
					thumbText: '<img src="/extensions/OggHandler/play.png" height="22" width="22"><br />'+tPage.title,
					caption: tPageTitleNoNS
				};
			} else if(tImage.thumburl == "" || (tImage.width == 0 && tImage.height == 0)) {
				tInvalidImage = {
					thumbHref: tImage.url,
					thumbText: tPage.title,
					caption: tPageTitleNoNS
				};
			}
			
			if(tInvalidImage !== false) {
				// Display text instead of image
				return '<div class="wikia-gallery-item">'
					+'<div class="thumb">'
					+'<div class="gallery-image-wrapper accent">'
					+'<a class="image-no-lightbox" href="'+tInvalidImage.thumbHref+'" target="_blank" style="height:'+size+'px; width:'+size+'px; line-height:inherit;">'
						+tInvalidImage.thumbText
					+'</a>'
					+'</div>'
					+'</div>'
					+'<div class="lightbox-caption" style="width:100%;">'
						+tInvalidImage.caption
					+'</div>'
				+'</div>';
			} else {
				tImage = tPage.imageinfo[0];
				var tOffsetY = size/2 - tImage.thumbheight/2;//0;
				// if(tImage.height < tImage.width || tImage.height < size) {
				// 	tOffsetY = size/2 - (tImage.height > size ? tImage.height/2*(size/tImage.width) : tImage.height/2);
				// }
				var tScaledWidth = tImage.thumbwidth;//size;
				// if(tImage.width < tImage.height && tImage.height > size) {
				// 	tScaledWidth = tImage.width * (size / tImage.height);
				// } else if(tImage.width < size) {
				// 	tScaledWidth = tImage.width;
				// }
				
				return '<div class="wikia-gallery-item">'//style="width:'+size+'px;"
					+'<div class="thumb">' // style="height:'+size+'px;"
						+'<div class="gallery-image-wrapper accent" style="position: relative; width:'+tScaledWidth+'px; top:'+tOffsetY+'px;">'
							+'<a class="image lightbox" href="'+tImage.url+'" target="_blank" style="width:'+tScaledWidth+'px;">'
								+'<img class="thumbimage" src="'+tImage.thumburl+'" alt="'+tPage.title+'">'
							+'</a>'
						+'</div>'
					+'</div>'
					+'<div class="lightbox-caption" style="width:100%;">'
						+'<a href="'+tImage.descriptionurl+'">'+tPageTitleNoNS+'</a>'
					+'</div>'
				+'</div>';
			}
		}
		
		var tAddLoadMoreButton = function () {
			if(tImagesInLog.length > 0) {
				if(ConstantsApp.debug) { console.log("Over 50 images to display; Extra images must be loaded later."); }
				var tModal = document.querySelector("#"+RCMModal.MODAL_CONTENT_ID);
				var tGallery = tModal.querySelector(".rcm-gallery");
				var tCont = Utils.newElement("center", { style:'margin-bottom: 8px;' }, tModal);
				var tButton = Utils.newElement("button", { innerHTML:i18n('specialvideos-btn-load-more') }, tCont);
				
				tButton.addEventListener("click", function(){
					tCurAjaxUrl = pAjaxUrl + "&titles="+tImagesInLog.splice(0, 50).join("|");
					if(ConstantsApp.debug) { console.log("http:"+tCurAjaxUrl.replace("&format=json", "&format=jsonfm")); }
					tCont.innerHTML = "<img src='"+ConstantsApp.LOADER_IMG+"' />";
					
					$.ajax({ type: 'GET', dataType: 'jsonp', data: {}, url: tCurAjaxUrl,
						success: function(pData){
							Utils.removeElement(tCont);
							for(var key in pData.query.pages) {
								tGallery.innerHTML += tGetGalleryItem(pData.query.pages[key]);
							}
							tAddLoadMoreButton();
						},
					});
				});
			}
		}
		
		RCMModal.showLoadingModal({ title:tTitle, rcm_buttons:tButtons }, function(){
			// Retrieve the diff table.
			// TODO - error support?
			$.ajax({ type: 'GET', dataType: 'jsonp', data: {}, url: tCurAjaxUrl,
				success: function(pData){
					var tModalContent = ''
					+'<style>'
						+'.rcm-gallery .thumbimage { max-width: '+size+'px; max-height: '+size+'px; width: auto; height: auto; }'
						+'.rcm-gallery .wikia-gallery-item { width: '+size+'px; }'
						// +'.rcm-gallery .wikia-gallery-item .lightbox { width: '+size+'px; }'
						+'.rcm-gallery .thumb { height: '+size+'px; }'
						+'.rcm-gallery .image-no-lightbox { width: '+size+'px; }'
					+'</style>'
					+'<div class="rcm-gallery wikia-gallery wikia-gallery-caption-below wikia-gallery-position-center wikia-gallery-spacing-medium wikia-gallery-border-small wikia-gallery-captions-center wikia-gallery-caption-size-medium">'
						var tPage = null, tPageTitleNoNS = null, tImage = null, tInvalidImage = null;
						for(var key in pData.query.pages) {
							tModalContent += tGetGalleryItem(pData.query.pages[key]);
						}
					tModalContent += ''
					+'</div>';
					
					// RCMModal.showModal({ title:tTitle, content:tModalContent, rcm_buttons:tButtons, rcm_onModalShown:tAddLoadMoreButton, });
					RCMModal.setModalContent(tModalContent);
					tAddLoadMoreButton();
				},
			});
		});
	}
	
	static previewPage(pAjaxUrl, pPageName:string, pPageHref:string, pServerLink:string) : void {
		if(ConstantsApp.debug) { console.log(`http:${pAjaxUrl}`); }
		
		var tTitle = `${pPageName}`;
		// Need to push separately since undo link -may- not exist (Wikia style forums sometimes).
		var tButtons = [];
		tButtons.push({
			value: i18n('wikiaPhotoGallery-conflict-view'),
			event: "diff",
			callback: function(){ window.open(pPageHref, '_blank'); },
		});
		
		RCMModal.showLoadingModal({ title:tTitle, rcm_buttons:tButtons }, function(){
			// Retrieve the diff table.
			// TODO - error support?
			$.ajax({ type: 'GET', dataType: 'jsonp', data: {}, url: pAjaxUrl,
				success: function(pData){
					var tContentText = pData.parse.text["*"];
					
					var tModalContent = ''
					+"<div class='ArticlePreview'>"
					+"<div class='ArticlePreviewInner'>"
					+"<div class='WikiaArticle'>"
					+"<div id='mw-content-text'>"
						+ tContentText
					+"</div>"
					+"</div>"
					+"</div>"
					+"</div>";
					RCMModal.setModalContent(tModalContent);
					let tCont:HTMLElement = <HTMLElement>document.querySelector("#"+RCMModal.MODAL_CONTENT_ID+" #mw-content-text");
					if((<any>tCont).attachShadow) {
						tCont = (<any>tCont).attachShadow({ mode:"open" });
						let tPreviewHead = Utils.newElement("div", { innerHTML:pData.parse.headhtml["*"] });
						let tCurPageHead = <HTMLElement>document.querySelector("head").cloneNode(true);
						Utils.forEach(tPreviewHead.querySelectorAll("link[rel=stylesheet]"), function(o, i, a){
							tCont.innerHTML += "<style> @import url("+o.href+"); </style>";//o.outerHTML;
						});
						// Prevent warnings from poping up about shadow dom not supporting <link>.
						Utils.forEach(tPreviewHead.querySelectorAll("link"), function(o, i, a){ Utils.removeElement(o); });
						
						// Also do it for current head
						Utils.forEach(tCurPageHead.querySelectorAll("link[rel=stylesheet]"), function(o, i, a){
							tCont.innerHTML += "<style> @import url("+o.href+"); </style>";//o.outerHTML;
						});
						Utils.forEach(tCurPageHead.querySelectorAll("link"), function(o, i, a){ Utils.removeElement(o); });
						
						tCont.innerHTML += tCurPageHead.innerHTML;
						tCont.innerHTML += tPreviewHead.innerHTML;
						tCont.innerHTML += tContentText;
					}
					else if("scoped" in document.createElement("style")) {
						let tPreviewHead = Utils.newElement("div", { innerHTML:pData.parse.headhtml["*"] });
						Utils.forEach(tPreviewHead.querySelectorAll("link[rel=stylesheet]"), function(o, i, a){
							tCont.innerHTML += "<style> @import url("+o.href+"); </style>";//o.outerHTML;
						});
					}
					Utils.forEach(tCont.querySelectorAll("a[href^='/']"), function(o, i, a){
						o.href = pServerLink + o.getAttribute("href");
					});
				},
			});
		});
	}
}
