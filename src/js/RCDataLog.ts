import RCMManager from "./RCMManager";
import WikiData from "./WikiData";
import Utils from "./Utils";
import i18n, {I18nKey} from "./i18n";
import RCData from "./RCData";
import TYPE from "./types/RC_TYPE";

// TODO:
// https://github.com/Wikia/app/blob/9ece43e540fbd5e351534b2041b9edef045a8d72/includes/wikia/VariablesBase.php#L5575
// https://github.com/Wikia/app/blob/1e4ea22073c29ec97beeccda86d068915366d0c5/includes/logging/LogFormatter.php
	
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
	logParams:
		{ type:"abuse",
			result: string, // what happened as a result of this filter being triggered - separated by commas
			filter: string, // filter description
			filter_id: string,
		}
		| { type:"abusefilter",
			newId:string, // filter id
			historyId:number, // history id for that filter change
		}
		| { type:"block",
			duration:string, // how long the block is for
			flags:string, // string of block flags separated by commas
		}
		// Depreciated (fandom removed chat)
		| { type:"chatban" }
		| { type:"contentmodel",
			oldmodel: string, // name of old model type
			newmodel: string, // name of new model type
		}
		| { type:"delete",
			revisions_num:number, // Number of revisions
			new_bitmask:string, // action taken on visibility change
		}
		| { type:"import" }
		| { type:"merge",
			destination:string, // title of the page being merged into.
			mergepoint:string, // timestamp the merge is up to.
		}
		| { type:"move",
			newTitle:string, // Name of new page after page moved.
			noredirect:string, // If redirect is suppressed, should be "-noredirect" else ""
		}
		| { type:"protect" }
		| { type:"upload" }
		| { type:"useravatar" }
		| { type:"newusers" }
		| { type:"renameuser" }
		| { type:"rights",
			oldgroups:string, // string of all groups separated by commas
			newgroups:string, // string of all groups separated by commas
		}
		| { type:"wikifeatures" }
	;
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
	protected _initLog(pRCData:any, pLogDataArray:any[]) : void {
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
		
		// @ts-ignore
		this.logParams = { type:this.logtype };
		
		/////////////////////////////////////
		// Store important info for a log
		/////////////////////////////////////
		switch(this.logParams.type) {
			case "move": {
				let log_move_newTitle = "";
				let is_log_move_noredirect = false;
				if(this.wikiInfo.useOutdatedLogSystem == false) {
					if(tLogParams) {
						log_move_newTitle = Utils.escapeCharacters( tLogParams.target_title );
						is_log_move_noredirect = tLogParams.suppressredirect=="";
						// target_ns
					}
				} else {
					tLogParams = tLogParams.move;
					if(tLogParams) {
						log_move_newTitle = Utils.escapeCharacters( tLogParams.new_title );
						is_log_move_noredirect = tLogParams.suppressedredirect=="";
						// new_ns
					}
				}
				// If true, add a flag for it.
				// this.log_move_noredirect = is_log_move_noredirect ? "-noredirect" : "";
				
				this.logParams = {
					type:"move",
					noredirect: is_log_move_noredirect ? "-noredirect" : "",
					newTitle: log_move_newTitle,
				};
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
			// Depreciated (fandom removed chat)
			case "chatban": {
				if(this.wikiInfo.useOutdatedLogSystem == false) {
					if(!this.log_info_0 && tLogParams) {
						this.log_info_0 = [ tLogParams["0"],tLogParams["1"],tLogParams["2"],tLogParams["3"],tLogParams["4"] ].join("\n");
					}
				}
				break;
			}
			case "abusefilter": {
				this.logParams = {
					type: "abusefilter",
					historyId: tLogParams.historyId,
					newId: tLogParams.newId,
				};
				break;
			}
			case "abuse": {
				this.logParams = {
					type: "abuse",
					result: pRCData.result,
					filter: pRCData.filter,
					filter_id: pRCData.filter_id,
				};
				break;
			}
			case "contentmodel": {
				this.logParams = {
					type:"contentmodel",
					oldmodel: tLogParams.oldmodel,
					newmodel: tLogParams.newmodel,
				};
				break;
			}
		}
		
		tLogParams = null;
	}
	
	logTitleLink() : string {
		const logPage = this.logtype === "abuse" ? "Special:AbuseLog" : `Special:Log/${this.logtype}`;
		return `(<a class='rc-log-link' href='${this.wikiInfo.articlepath}${logPage}'>${this.logTitle()}</a>)`;
	}
	
	logTitle() : string {
		switch(this.logtype) {
			case "abuse"		: return i18n("abuselog");
			case "abusefilter"	: return i18n("abusefilter-log");
			case "block"		: return i18n("blocklogpage");
			// Depreciated (fandom removed chat)
			case "chatban"		: return i18n("chat-chatban-log");
			case "contentmodel"	: return i18n("log-name-contentmodel");
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
		let tLogMessage = "";
		
		if(this.actionhidden) {
			tLogMessage = `<span class="history-deleted">${i18n("rev-deleted-event")}</span>`;
			tLogMessage += this.getSummary();
		}
		
		switch(this.logParams.type) {
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
				tLogMessage += i18n(<I18nKey>("logentry-move-"+this.logaction+(this.logParams.noredirect || ""/*band-aid fix*/)),
					this.userDetails(),
					undefined, // Don't know if male / female.
					`<a href='${this.hrefFS}redirect=no'>${this.title}</a>`,
					`<a href='${this.wikiInfo.articlepath + Utils.escapeCharactersLink(this.logParams.newTitle)}'>${this.logParams.newTitle}</a>`
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
			// Depreciated (fandom removed chat)
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
			case "abusefilter": {
				const { newId:filterId, historyId } = this.logParams;
				
				// If a filter is modified, re-grab the filter data
				this.wikiInfo.needsAbuseFilterFilters = true;
				
				switch(this.logaction) {
					case "create":
					case "modify":
					{
						// logaction assumed: create, modify
						tLogMessage += i18n("abusefilter-logentry-"+this.logaction as I18nKey,
							this.userDetails(),
							undefined, // Don't know if male / female.
							undefined,
							`<a href='${this.href}'>${this.title}</a>`,
							`<a href='${this.wikiInfo.getUrl(`Special:AbuseFilter/history/${filterId}/diff/prev/${historyId}`)}'>${i18n("abusefilter-log-detailslink")}</a>`
						);
						break;
					}
				}
				break;
			}
			case "abuse": {
				const { result, filter, filter_id } = this.logParams;
				let filterFromDesc: { id?:number, private?:boolean, found:number } = { found:0 };
				if(filter.trim() != "") {
					Object.keys(this.wikiInfo.abuseFilterFilters).forEach((i)=>{
						if(this.wikiInfo.abuseFilterFilters[i].description == filter) {
							filterFromDesc.found++;
							filterFromDesc.id = Number(i);
							filterFromDesc.private = this.wikiInfo.abuseFilterFilters[i].private;
						}
					});
				}
				// We only trust the result if it's exactly 1
				if(filterFromDesc.found !== 1) {
					filterFromDesc.id = filterFromDesc.private = undefined;
				}
				filterFromDesc.private = filterFromDesc.private !== undefined ? filterFromDesc.private : true; // If undefined we can't trust the filter values
				
				const resultString = result === ""
					? i18n('abusefilter-log-noactions')
					: result.split(",").map(r=>i18n('abusefilter-action-'+r as I18nKey)).join(", ");
				const filterIdLink = !filterFromDesc.private && filterFromDesc.id
					? `<a href='${this.wikiInfo.getUrl('Special:AbuseFilter/'+filterFromDesc.id)}'>${i18n('abusefilter-log-detailedentry-local', filterFromDesc.id)}</a>`
					: i18n('abusefilter-log-detailedentry-local', filterFromDesc.id !== undefined ? filterFromDesc.id : "?");
				// If user can view detailed logs, then link to them + the filter
				if(this.wikiInfo.user.rights.abusefilter_log_detail) {
					// let action = i18n('abusefilter-action-'+this.logaction as I18nKey);
					tLogMessage = i18n('abusefilter-log-detailedentry-meta',
						undefined,
						this.userDetails(),
						filterIdLink,
						this.logaction,
						`<a href='${this.href}'>${this.title}</a>`,
						resultString,
						filter,
						[
							`<a href='${this.wikiInfo.getUrl(`Special:AbuseLog/${this.pageid}`)}'>${i18n('abusefilter-log-detailslink')}</a>`,
							`<a href='${this.wikiInfo.getUrl(`Special:AbuseFilter/examine/log/${this.pageid}`)}'>${i18n('abusefilter-changeslist-examine')}</a>`,
						].join(" | "),
						undefined, // Don't know if male / female.
					);
				} else {
					// let action = i18n('abusefilter-action-'+this.logaction as I18nKey);
					tLogMessage = i18n('abusefilter-log-entry',
						undefined,
						this.userDetails(),
						this.logaction,
						`<a href='${this.href}'>${this.title}</a>`,
						resultString,
						filter,
						undefined,
						undefined, // Don't know if male / female.
					);
					if(filterFromDesc.id !== undefined && !filterFromDesc.private) {
						tLogMessage += ` (${filterIdLink})`;
					}
				}
				// we don't use the date, so remove it - remove whole '$1: ' if it exists (most langugaes), otherwise settle for removing the $1
				tLogMessage = tLogMessage.replace("$1: ", "").replace("$1", "");
				break;
			}
			case 'contentmodel': {
				const { oldmodel, newmodel } = this.logParams;
				
				switch(this.logaction) {
					case "new":
					case "change":
					{
						// logaction assumed: new, change
						tLogMessage += i18n("logentry-contentmodel-"+this.logaction as I18nKey,
							this.userDetails(),
							undefined, // Don't know if male / female.
							`<a href='${this.href}'>${this.title}</a>`,
							oldmodel,
							newmodel,
						);
						break;
					}
				}
				if(this.logaction == "change" && this.wikiInfo.user.rights.editcontentmodel) {
					tLogMessage += ` (<a href='${this.wikiInfo.getUrl('Special:ChangeContentModel', { pagetitle:this.hrefTitle, model:oldmodel, reason:i18n('logentry-contentmodel-change-revert') })}'>${i18n('logentry-contentmodel-change-revertlink')}</a>)`
				}
				break;
			}
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
