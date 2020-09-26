import Global from "./Global";
import RCMManager from "./RCMManager";
import WikiData from "./WikiData";
import Utils from "./Utils";
import i18n, {I18nKey} from "./i18n";
import RCData from "./RCData";
import TYPE from "./types/RC_TYPE";

let $ = window.jQuery;
let mw = window.mediaWiki;
	
//######################################
// #### Recent Change Data ####
// * A data object to keep track of RecentChanges data in an organized way, as well as also having convenience methods.
// * These should only ever be used in RCList.
//######################################
export default class RCDataLog extends RCData
{
	/***************************
	 * Situational Data - depends on the type, might not even be used, and may remain be unset.
	 ***************************/
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
		super(pWikiInfo, pManager);
	}
	
	/*override*/ dispose() : void {
		// @ts-ignore - It's read only, but we still want it deleted here
		delete this.manager;
		// @ts-ignore - It's read only, but we still want it deleted here
		delete this.wikiInfo;
		
		this.date = null;
		this.type = null;
	}
	
	initLog(pData:any, pLogDataArray:any[]) : this {
		this.type = TYPE.LOG;
		super.init(pData);
		
		this.log_info_0 = pData["0"];
		this.actionhidden = pData.actionhidden == "";
		this._initLog(pData, pLogDataArray);
		
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
		
		/////////////////////////////////////
		// Store important info for a log
		/////////////////////////////////////
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
					if(i18n.exists("block-log-flags-" + log_block_flags_arr[i])) {
						log_block_flags_arr[i] = i18n(<I18nKey>("block-log-flags-" + log_block_flags_arr[i]));
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
			case "protect": {
				if(this.wikiInfo.useOutdatedLogSystem == false) {
					if(!this.log_info_0 && tLogParams) {
						this.log_info_0 = tLogParams.description;
					}
				}
				break;
			}
		}
		
		tLogParams = null;
	}
	
	logTitleLink() : string {
		return `(<a class='rc-log-link' href='${this.wikiInfo.articlepath}Special:Log/${this.logtype}'>${this.logTitle()}</a>)`;
	}
	
	logTitle() : string {
		switch(this.logtype) {
			case "abusefilter"	: return i18n("abusefilter-log");
			case "block"		: return i18n("blocklogpage");
			case "chatban"		: return i18n("chat-chatban-log");
			case "delete"		: return i18n("dellogpage");
			case "import"		: return i18n("importlogpage");
			case "merge"		: return i18n("mergelog");
			case "move"			: return i18n("movelogpage");
			case "protect"		: return i18n("protectlogpage");
			case "upload"		: return i18n("uploadlogpage");
			case "useravatar"	: return i18n("useravatar-log");
			case "newusers"		: return i18n("newuserlogpage");
			case "renameuser"	: return i18n("userrenametool-logpage");
			case "rights"		: return i18n("rightslog");
			case "wikifeatures"	: return i18n("wikifeatures-log-name");
			default				: return this.logtype; // At least display it as a log.
		}
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
				tLogMessage += i18n(<I18nKey>("logentry-delete-"+this.logaction),
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
				tLogMessage += i18n(<I18nKey>("logentry-move-"+this.logaction+(this.log_move_noredirect || ""/*band-aid fix*/)),
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
				tLogMessage += i18n(<I18nKey>("logentry-newusers-"+this.logaction), this.userDetails(), undefined, "" );
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
				tLogMessage += i18n(<I18nKey>("chat-"+this.logaction+"-log-entry"), `<a href='${this.href}'>${this.titleNoNS}</a>`, tChatData[2], t$3 );
				tChatData = null;
				break;
			}
			// case "abusefilter": {
			// 	var tAbusePage = this.log_info_0.split("\n");
			// 	var tAbuseItem = tAbusePage.shift();
				
			// 	tLogMessage += this.userDetails()+" ";
			// 	switch(this.logaction) {
			// 		case "modify": {
			// 			tLogMessage += i18n("abusefilter-log-entry-modify",
			// 				`<a href='${this.href}'>${this.title}</a>`,
			// 				`<a href='${this.wikiInfo.articlepath}Special:AbuseFilter/history/${tAbusePage}/diff/prev/${tAbuseItem}'>${i18n("abusefilter-log-detailslink")}</a>`
			// 			);
			// 			break;
			// 		}
			// 	}
			// 	break;
			// }
		}
		if(tLogMessage == "") {
			tLogMessage += this.userDetails()+` ??? (${this.logtype} - ${this.logaction}) `;
		}
		tLogMessage += this.getSummary();
		if(this.wikiInfo.user.rights.undelete && this.logtype == "delete" && this.logaction == "delete") {
			tLogMessage += ` (<a href='${this.wikiInfo.articlepath}Special:Undelete${this.wikiInfo.firstSeperator}target=${this.hrefTitle}'>${i18n("undeletelink")}</a>)`;
		}
		return tLogMessage;
	}
	
	/*override*/ getNotificationTitle() : string {
		return this.logTitle()+(this.title ? ` - ${this.title}` : "");
	}
	
	getLogTimeStamp(pDate) : string {
		return RCData.getFullTimeStamp(pDate);
	}
}
