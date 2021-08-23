import RCMManager from "./RCMManager";
import WikiData from "./WikiData";
import Utils from "./Utils";
import i18n, {I18nKey} from "./i18n";
import RCData from "./RCData";
import TYPE from "./types/RC_TYPE";
import { UNKNOWN_GENDER_TYPE } from "./Global";

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
			expiry:string,
			sitewide:boolean,
		}
		| { type:"contentmodel",
			oldmodel: string, // name of old model type
			newmodel: string, // name of new model type
		}
		| { type:"delete",
			ids_length:number, // Number of revisions
			new_bitmask:number, // action taken on visibility change
			count?: { revisions:number, files:number },
		}
		| { type:"import" }
		| { type:"merge",
			destination:string, // title of the page being merged into.
			mergepoint:string, // timestamp the merge is up to.
		}
		| { type:"move",
			newTitle:string, // name of new page after page moved.
			suppressredirect:boolean, // if redirect is suppressed
		}
		| { type:"protect",
			description:string,
			cascade:boolean, // if the protection is cascading
			oldtitle_title:string, // used when moving protection
		}
		| { type:"upload" }
		| { type:"useravatar" }
		| { type:"newusers" }
		| { type:"renameuser" }
		| { type:"rights",
			legacy:boolean,
			oldgroups:string, // string of all groups separated by commas
			newgroups:string, // string of all groups separated by commas
		}
		| { type:"wikifeatures" }
	;
	
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
	
	initLog(pData:any) : this {
		this.type = TYPE.LOG;
		super.init(pData);
		
		this.log_info_0 = pData["0"];
		this.actionhidden = pData.actionhidden == "";
		this._initLog(pData);
		
		return this; // Return self for chaining or whatnot.
	}
	
	// If it's a log, init data if needed for that type.
	protected _initLog(pRCData:any) : void {
		if(this.actionhidden) { return; }
		
		// @ts-ignore
		this.logParams = { type:this.logtype, ...(pRCData.logparams ?? {}) };
		
		/////////////////////////////////////
		// Store important info for a log
		/////////////////////////////////////
		switch(this.logParams.type) {
			case "abuse": {
				const { result, filter, filter_id } = pRCData;
				this.logParams = {
					type: "abuse",
					result: result,
					filter: filter,
					filter_id: filter_id,
				};
				break;
			}
			case "abusefilter": {
				const { historyId, newId } = pRCData.logparams ?? {};
				this.logParams = {
					type: "abusefilter",
					historyId,
					newId,
				};
				break;
			}
			case "block": {
				const { duration, flags, expiry, sitewide } = pRCData.logparams ?? {};
				
				this.logParams = {
					type: "block",
					duration,
					flags: ((flags ?? []) as string[])
						// Assumes "block-log-flags" for: anononly, nocreate, noautoblock, noemail, nousertalk, autoblock, hiddenname
						.map(f=>i18n.exists("block-log-flags-"+f) ? i18n(<I18nKey>("block-log-flags-"+f)) : f)
						.join(", "),
					expiry: expiry,
					sitewide: sitewide==="",
				}
				break;
			}
			case "contentmodel": {
				const { oldmodel, newmodel } = pRCData.logparams ?? {};
				this.logParams = {
					type:"contentmodel",
					oldmodel,
					newmodel,
				};
				break;
			}
			case "delete": {
				const { count, ids, old:oldMask, new:newMask } = pRCData.logparams ?? {};
				this.logParams = {
					type: "delete",
					ids_length: ids?.length ?? 1,
					new_bitmask: newMask?.bitmask,
					count: count,
				};
				break;
			}
			case "merge": {
				const { dest_title, mergepoint } = pRCData.logparams ?? {};
				this.logParams = {
					type: "merge",
					destination: dest_title ? Utils.escapeCharacters( dest_title ) : "",
					mergepoint,
					// dest_ns
				};
				break;
			}
			case "move": {
				const { target_title, suppressredirect } = pRCData.logparams ?? {};
				this.logParams = {
					type: "move",
					// If true, add a flag for it.
					suppressredirect: suppressredirect=="",
					newTitle: target_title && Utils.escapeCharacters( target_title ),
				};
				break;
			}
			case "protect": {
				const { description, details, cascade, oldtitle_ns, oldtitle_title } = pRCData.logparams ?? {};
				this.logParams = {
					type: "protect",
					description,
					cascade: cascade==="",
					oldtitle_title,
					// oldtitle_ns,
				};
				break;
			}
			case "rights": {
				const { oldgroups, newgroups } = pRCData.logparams ?? {};
				this.logParams = {
					type: "rights",
					legacy: !newgroups && !oldgroups,
					newgroups: newgroups?.length > 0 ? newgroups.join(", ") : i18n("rightsnone"),
					oldgroups: oldgroups?.length > 0 ? oldgroups.join(", ") : i18n("rightsnone"),
				};
				break;
			}
		}
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
			case "contentmodel"	: return i18n("log-name-contentmodel");
			case "delete"		: return i18n("dellogpage");
			case "import"		: return i18n("importlogpage");
			case "merge"		: return i18n("mergelog");
			case "move"			: return i18n("movelogpage");
			case "newusers"		: return i18n("newuserlogpage");
			case "protect"		: return i18n("protectlogpage");
			case "renameuser"	: return i18n("userrenametool-logpage");
			case "rights"		: return i18n("rightslog");
			case "upload"		: return i18n("uploadlogpage");
			case "useravatar"	: return i18n("useravatar-log");
			case "wikifeatures"	: return i18n("wikifeatures-log-name");
			default				: return this.logtype; // At least display it as a log.
		}
	}
	
	// Returns text explaining what the log did. Also returns user details (since it's a part of some of their wiki text).
	// Some info is only present in the edit summary for some logtypes, so these parts won't be translated.
	logActionText() : string {
		let tLogMessage = "";
		let tAfterLogMessage:string|undefined;
		
		if(this.actionhidden) {
			tLogMessage = `<span class="history-deleted">${i18n("rev-deleted-event")}</span>`;
			tLogMessage += this.getSummary();
		}
		
		switch(this.logParams.type) {
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
						UNKNOWN_GENDER_TYPE,
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
						UNKNOWN_GENDER_TYPE,
					);
					if(filterFromDesc.id !== undefined && !filterFromDesc.private) {
						tLogMessage += ` (${filterIdLink})`;
					}
				}
				// we don't use the date, so remove it - remove whole '$1: ' if it exists (most langugaes), otherwise settle for removing the $1
				tLogMessage = tLogMessage.replace("$1: ", "").replace("$1", "");
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
							UNKNOWN_GENDER_TYPE,
							undefined,
							`<a href='${this.href}'>${this.title}</a>`,
							`<a href='${this.wikiInfo.getUrl(`Special:AbuseFilter/history/${filterId}/diff/prev/${historyId}`)}'>${i18n("abusefilter-log-detailslink")}</a>`
						);
						break;
					}
				}
				break;
			}
			case "block": {
				const { duration, flags } = this.logParams;
				
				// logactions assumed: block, reblock, unblock
				tLogMessage += i18n(<I18nKey>("logentry-block-"+this.logaction),
					this.userDetails(),
					UNKNOWN_GENDER_TYPE,
					`<a href='${this.href}'>${this.titleNoNS}</a>`,
					UNKNOWN_GENDER_TYPE, // api doesn't tell use the blocked user's gender
					duration,
					flags && i18n('parentheses', flags),
				);
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
							UNKNOWN_GENDER_TYPE,
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
			case "delete": {
				const { ids_length, new_bitmask, count } = this.logParams;
				
				let arg4:string = undefined;
				switch(this.logaction) {
					case 'restore': {
						if(count) {
							let tArray = [];
							if(count?.revisions > 0) {
								tArray.push(i18n('restore-count-revisions', count.revisions));
							}
							if(count?.files > 0) {
								tArray.push(i18n('restore-count-files', count.files));
							}
							arg4 = tArray.join(i18n("and")+i18n("word-separator"));
						} else {
							this.logaction += '-nocount';
						}
						break;
					}
					case 'revision':
					case 'event': {
						arg4 = {
							1: i18n("revdelete-content-hid"),
							2: i18n("revdelete-summary-hid"), // I'm assuming; couldn't actually find what "2" was.
							3: i18n("revdelete-content-hid") + i18n("and") + i18n("word-separator") + i18n("revdelete-summary-hid"),
						}[new_bitmask] ?? "?";
						break;
					}
				}
				
				// logactions assumed: delete, restore, restore-nocount, event, revision, event-legacy, revision-legacy
				tLogMessage += i18n(<I18nKey>("logentry-delete-"+this.logaction),
					this.userDetails(),
					UNKNOWN_GENDER_TYPE,
					`<a href='${this.href}'>${this.title}</a>`,
					arg4,
					ids_length, // Plural check
				);
				
				// Added undelete links at the end, just like log page does it
				if(this.wikiInfo.user.rights.undelete && this.logaction == "delete") {
					tAfterLogMessage = " "+i18n('parentheses', `<a href='${this.wikiInfo.getUrl('Special:Undelete', { target:this.hrefTitle })}'>${i18n("undeletelink")}</a>`);
				}
				break;
			}
			case "import": {
				// logactions assumed: upload, interwiki
				tLogMessage += i18n(<I18nKey>("logentry-import-"+this.logaction),
					this.userDetails(),
					UNKNOWN_GENDER_TYPE,
					`<a href='${this.href}'>${this.title}</a>`,
				);
				break;
			}
			case "merge": {
				const { destination, mergepoint } = this.logParams;
				
				tLogMessage += this.userDetails()+" ";
				// merged [[$1]] into [[$2]] (revisions up to $3)
				tLogMessage += i18n("pagemerge-logentry",
					this.href + "|" + this.title,
					this.wikiInfo.articlepath+destination + "|" + destination,
					this.getLogTimeStamp(new Date(mergepoint))
				);
				break;
			}
			case "move": {
				const { newTitle, suppressredirect } = this.logParams;
				const noredirect = suppressredirect ? "-noredirect" : "";
				// logactions assumed: move, move-noredirect, move_redir, move_redir-noredirect
				tLogMessage += i18n(<I18nKey>("logentry-move-"+this.logaction+noredirect),
					this.userDetails(),
					UNKNOWN_GENDER_TYPE,
					`<a href='${this.hrefFS}redirect=no'>${this.title}</a>`,
					`<a href='${this.wikiInfo.articlepath + Utils.escapeCharactersLink(newTitle)}'>${newTitle}</a>`
				);
				break;
			}
			case "newusers": {
				// logactions assumed: newusers, create, create2, autocreate (kinda sorta maybe)
				tLogMessage += i18n(<I18nKey>("logentry-newusers-"+this.logaction), this.userDetails(), undefined, "" );
				break;
			}
			case "protect": {
				const { description, cascade, oldtitle_title } = this.logParams;
				
				let arg4 = description;
				switch(this.logaction) {
					case "move_prot": {
						arg4 = this.wikiInfo.getUrl(oldtitle_title);
						break;
					}
				}
				
				// logactions assumed: protect, modify, unprotect, move_prot, modify-cascade, protect-cascade
				tLogMessage += i18n(<I18nKey>("logentry-protect-"+this.logaction+(cascade ? '-cascade' : '')),
					this.userDetails(),
					UNKNOWN_GENDER_TYPE,
					`<a href='${this.href}'>${this.title}</a>`,
					arg4,
				);
				break;
			}
			case "renameuser": {
				tLogMessage += this.userDetails()+" renameuser"; // Rest of the info is in the edit summary (so won't be translated by script).
				break;
			}
			case "rights": {
				const { oldgroups, newgroups, legacy } = this.logParams;
				
				if(legacy && this.logaction=="rights") {
					this.logaction += '-legacy';
				}
				
				// logactions assumed: rights, autopromote, rights-legacy
				tLogMessage += i18n(<I18nKey>("logentry-rights-"+this.logaction),
					this.userDetails(),
					UNKNOWN_GENDER_TYPE,
					`<a href='${this.href}'>${this.title}</a>`,
					oldgroups,
					newgroups,
					UNKNOWN_GENDER_TYPE, // api doesn't tell use the gender of the user with rights changed
				);
				break;
			}
			case "upload": {
				// logactions assumed: upload, overwrite, revert
				tLogMessage += i18n(<I18nKey>("logentry-upload-"+this.logaction),
					this.userDetails(),
					UNKNOWN_GENDER_TYPE,
					`<a href='${this.href}'>${this.title}</a>`,
				);
				break;
			}
			// Depretiated? doesn't seem to be used anymore
			case "useravatar": {
				tLogMessage += this.userDetails()+" ";
				switch(this.logaction) {
					case "avatar_chn": { tLogMessage += i18n("blog-avatar-changed-log"); break; } // 'Added or changed avatar'
					case "avatar_rem": { tLogMessage += i18n("blog-avatar-removed-log", `<a href='${this.href}'>${this.title}</a>`); break; } // "Removed $1's avatars"
				}
				break;
			}
			// Depretiated? doesn't seem to be used anymore
			case "wikifeatures": {
				tLogMessage += this.userDetails()+" wikifeatures"; // Rest of the info is in the edit summary (so won't be translated by script).
				break;
			}
		}
		if(tLogMessage == "") {
			tLogMessage += this.userDetails()+` ??? (${this.logtype} - ${this.logaction}) `;
		}
		tLogMessage += this.getSummary();
		if(tAfterLogMessage) {
			tLogMessage += tAfterLogMessage;
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
