//<syntaxhighlight lang="javascript">
	
//######################################
// #### Recent Change Data ####
// * A data object to keep track of RecentChanges data in an organized way, as well as also having convenience methods.
// * These should only ever be used in RCList.
//######################################
window.dev.RecentChangesMultiple.RCData = (function($, document, mw, module, Utils, i18n){
	"use strict";
	
	RCData.TYPE = Object.freeze({ NORMAL:"normalChange", LOG:"logChange", COMMENT:"commentType", WALL:"wallChange", BOARD:"boardChange", });
	
	// Constructor
	function RCData(pWikiInfo, pManager) {
		this.manager = pManager; // {RCMManager} Keep track of what manager this data is attached to.
		this.wikiInfo = pWikiInfo; // {WikiData} Keep track of what Wiki this data belongs to.
		
		/***************************
		 * Ajax Data - https://www.mediawiki.org/wiki/API:RecentChanges
		 ***************************/
		this.date				= null; // {Date} The DateTime this edit was made at.
		this.author				= null; // {string} The user or anon that made the edit.
		this.userEdited			= null; // {bool} Wether the author is a user vs an anon.
		this.userhidden			= null; // {bool} If the rc is marked "userhidden"
		this.title				= null; // {string} Title of the page. (without "/@comment"s). Includes namespace.
		this.namespace			= null; // {int} Namespace of the page edited.
		this.logtype			= null; // {string} What log fired
		this.logaction			= null; // {string} What the log did
		this.newlen				= null; // {int} New file size after edit
		this.oldlen				= null; // {int} Previous file size before edit
		this.summary			= null; // {string} Submit comment for the edit.
		
		this.pageid				= null; // {int} rc_cur_id - https://www.mediawiki.org/wiki/Manual:Recentchanges_table#rc_cur_id
		this.revid				= null; // {int} rc_this_oldid - https://www.mediawiki.org/wiki/Manual:Recentchanges_table#rc_this_oldid
		this.old_revid			= null; // {int} rc_last_oldid - https://www.mediawiki.org/wiki/Manual:Recentchanges_table#rc_last_oldid
		
		/***************************
		 * "Calculated" Data
		 ***************************/
		this.type				= null; // {enum<TYPE>} What kind of edit the RC is.
		this.isNewPage			= null; // {bool} If this edit created a new page
		this.isBotEdit			= null; // {bool} If this edit has been flaged as a bot edit.
		this.isMinorEdit		= null; // {bool} If this edit was flagged as minor.
		this.isPatrolled		= null; // {bool} If this page has been patrolled.
		this.titleNoNS			= null; // {string} Same as this.title, but with the namespace removed (if there is one)
		this.uniqueID			= null; // {string} A unique ID is primarily important for boards/walls, since they group by the first "/@comment" in the page name.
		this.href				= null; // {string} link the the page (no "&diff", etc) ex: http://test.wikia.com/wiki/Test
		this.hrefBasic			= null; // {string} Same as this.href, but with no "/@comment"s either.
		this.hrefFS				= null; // {string} Same as this.href, but followed by this.wikiInfo.firstSeperator.
		
		/***************************
		 * Situational Data - depends on the type, might even be used, and may remain be null.
		 ***************************/
		this.isSubComment		= null; // {bool} If the is a "reply" to a comment/board/wall (versus the original it replies too)
		this.isWallBoardAction	= null; // {bool} If an action was taken on a wall / board (instead of a "normal" edit)
		this.threadTitle		= null; // {string} The name of the thread if known (if a wall / board)
		this.log_info_0			= null; // {dynamic} Generic info passed for a rc/log
		this.actionhidden		= null; // {bool} If the rc is marked "actionhidden"
		
		/***************************
		 * Log Info - info for specific logs that require additional info via API:Logevents.
		 * THESE ARE USED, but not instantiated since no reason to take up the memory until used.
		 ***************************/
		// this.log_move_newTitle			= null; // {string} Name of new page after page moved.
		// this.log_move_noredirect		= null; // {string} If redirect is suppressed, should be "-noredirect" else ""
		// this.log_rights_oldgroups		= null; // {string} string of all groups separated by commas
		// this.log_rights_newgroups		= null; // {string} string of all groups separated by commas
		// this.log_delete_revisions_num	= null; // {int} Number of revisions
		// this.log_delete_new_bitmask		= null; // {string} action taken on visibility change
		// this.log_block_duration			= null; // {string} how long the block is for
		// this.log_block_flags			= null; // {string} string of block flags separated by commas
		// this.log_merge_destination		= null; // {string} title of the page being merged into.
		// this.log_merge_mergepoint		= null; // {string} timestamp the merge is up to.
	}
	
	RCData.prototype.dispose = function() {
		this.manager = null;
		this.wikiInfo = null;
		
		this.date = null;
		this.type = null;
	}
	
	RCData.prototype.init = function(pData, pLogDataArray) {
		this.date = new Date(pData.timestamp);
		this.userEdited = pData.user != "";
		this.author = this.userEdited ? pData.user : pData.anon;
		this.userhidden = pData.userhidden == "";
		this.title = Utils.escapeCharacters( pData.title.split("/@comment")[0] );
		this.namespace = pData.ns;
		this.logtype = pData.logtype;
		this.logaction = pData.logaction;
		this.newlen = pData.newlen;
		this.oldlen = pData.oldlen;
		if(pData.commenthidden != "") {
			this.summary = pData.parsedcomment; // De-wikified.
			this.summary = this.summary.replace("<a href=\"/", "<a href=\""+this.wikiInfo.server+"/"); // Make links point to correct wiki.
		} else {
			this.summary = '<span class="history-deleted">'+i18n.RC_TEXT["rev-deleted-comment"]+'</span>';
		}
		
		this.pageid = pData.pageid;
		this.revid = pData.revid;
		this.old_revid = pData.old_revid;
		
		this.isNewPage = pData["new"] == "";
		this.isBotEdit = pData.bot == "";
		this.isMinorEdit = pData.minor == "";
		this.isPatrolled = pData.patrolled == "";
		this.titleNoNS = (this.namespace != 0 && this.title.indexOf(":") > -1) ? this.title.split(":")[1] : this.title;
		this.uniqueID = this.title; // By default; make change based on this.type.
		this.href = Utils.escapeCharacters( this.wikiInfo.articlepath + pData.title.replace(/ /g, "_") );
		this.hrefBasic = this.href.split("/@comment")[0];
		this.hrefFS	= this.href + this.wikiInfo.firstSeperator;
		
		// Figure out the type of edit this is.
		if(this.logtype && this.logtype != "0") { // It's a "real" log. "0" signifies a wall/board.
			this.type = RCData.TYPE.LOG;
			this.log_info_0 = pData["0"];
			
			this.actionhidden = pData.actionhidden == "";
			this._initLog(pData, pLogDataArray);
		}
		else if(pData.title.indexOf("/@comment") > -1) { // It's a comment / board / wall
			this.isSubComment = pData.title.indexOf("/@comment") != pData.title.lastIndexOf("/@comment"); // Check if it has more than one "/@comment"s
			if(/*Board Thread*/this.namespace == 2001) { this.type = RCData.TYPE.BOARD; }
			else if(/*Wall Thread*/this.namespace == 1201) { this.type = RCData.TYPE.WALL; }
			else { this.type = RCData.TYPE.COMMENT; }
			
			if(this.type == RCData.TYPE.BOARD || this.type == RCData.TYPE.WALL) {
				this.uniqueID = this.title + "/@comment" + pData.title.split("/@comment")[1]; // Walls/boards can have 2 /@comments, the first one is what we care about for lists.
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
					this.summary = this.type == RCData.TYPE.BOARD ? i18n.RC_TEXT["forum-recentchanges-edit"] : i18n.RC_TEXT["wall-recentchanges-edit"];
				}
			}
		}
		else { // else it's a normal freakin edit =p
			this.type = RCData.TYPE.NORMAL;
		}
		
		return this; // Return self for chaining or whatnot.
	}
	
	// If it's a log, init data if needed for that type.
	RCData.prototype._initLog = function(pRCData, pLogDataArray) {
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
				this.log_move_noredirect = false;
				if(this.wikiInfo.useOutdatedLogSystem == false) {
					if(tLogParams) {
						this.log_move_newTitle = Utils.escapeCharacters( tLogParams.target_title );
						this.log_move_noredirect = tLogParams.suppressredirect=="";
						// target_ns
					}
				} else {
					tLogParams = tLogParams.move;
					if(tLogParams) {
						this.log_move_newTitle = Utils.escapeCharacters( tLogParams.new_title );
						this.log_move_noredirect = tLogParams.suppressedredirect=="";
						// new_ns
					}
				}
				// If true, add a flag for it.
				this.log_move_noredirect = this.log_move_noredirect ? "-noredirect" : "";
				break;
			}
			case "rights": {
				this.log_rights_oldgroups = "?";
				this.log_rights_newgroups = "?";
				if(this.wikiInfo.useOutdatedLogSystem == false) {
					if(tLogParams) {
						this.log_rights_oldgroups = tLogParams.oldgroups.length == 0 ? i18n.RC_TEXT["rightsnone"] : tLogParams.oldgroups.join(", ");
						this.log_rights_newgroups = tLogParams.newgroups.length == 0 ? i18n.RC_TEXT["rightsnone"] : tLogParams.newgroups.join(", ");
					}
				} else {
					tLogParams = tLogParams.rights;
					if(tLogParams) {
						this.log_rights_oldgroups = tLogParams.old == "" ? i18n.RC_TEXT["rightsnone"] : tLogParams.old;
						this.log_rights_newgroups = tLogParams["new"] == "" ? i18n.RC_TEXT["rightsnone"] : tLogParams["new"];
					}
				}
				break;
			}
			case "block": {
				// Assumes "block-log-flags" for: anononly, nocreate, noautoblock, noemail, nousertalk, autoblock, hiddenname
				this.log_block_duration = "?";
				this.log_block_flags = [];
				if(this.wikiInfo.useOutdatedLogSystem == false) {
					if(tLogParams) {
						this.log_block_duration = tLogParams.duration;
						this.log_block_flags = tLogParams.flags || [];
					}
				} else {
					tLogParams = tLogParams.block;
					if(tLogParams) {
						this.log_block_duration = tLogParams.duration;
						this.log_block_flags = tLogParams.flags.split(",");
					}
				}
				
				for (var i = 0; i < this.log_block_flags.length; i++) {
					// If we have a translation for flag, use it. otherwise, leave the flag id alone.
					if(i18n.RC_TEXT["block-log-flags-" + this.log_block_flags[i]]) {
						this.log_block_flags[i] = i18n.RC_TEXT["block-log-flags-" + this.log_block_flags[i]];
					}
				}
				this.log_block_flags = "("+ this.log_block_flags.join(", ") +")";
				break;
			}
			case "delete": {
				this.log_delete_revisions_num = 1;
				this.log_delete_new_bitmask = "?";
				if(this.wikiInfo.useOutdatedLogSystem == false) {
					if(tLogParams) {
						this.log_delete_revisions_num = (tLogParams.ids || [1]).length;
						this.log_delete_new_bitmask = (tLogParams["new"] || {}).bitmask;
					}
				} else {
					// tLogParams = tLogParams.delete;
					// if(tLogParams) {
						
					// }
					if(this.log_info_0) {
						// this.log_delete_revisions_num = ????; // No clue how to get this; but haven't been able to find example of it being used, so meh.
						this.log_delete_new_bitmask = parseInt((this.log_info_0.split("\n")[3] || "=1").split("=")[1]);
					}
				}
				
				switch(this.log_delete_new_bitmask) {
					case 1: {
						this.log_delete_new_bitmask = i18n.RC_TEXT["revdelete-content-hid"];
						break;
					}
					case 2: {
						this.log_delete_new_bitmask = i18n.RC_TEXT["revdelete-summary-hid"]; // I'm assuming; couldn't actually find what "2" was.
						break;
					}
					case 3: {
						this.log_delete_new_bitmask = i18n.RC_TEXT["revdelete-content-hid"] + i18n.RC_TEXT["and"] + " " + i18n.RC_TEXT["revdelete-summary-hid"];
						break;
					}
				}
				break;
			}
			case "merge": {
				this.log_merge_destination = "";
				this.log_merge_mergepoint = 0;
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
	};
	
	RCData.prototype.time = function() {
		return Utils.pad(Utils.getHours(this.date, this.manager.timezone),2)+":"+Utils.pad(Utils.getMinutes(this.date, this.manager.timezone),2);
	};
	
	RCData.prototype.userDetails = function() {
		if(this.userhidden) {
			return '<span class="history-deleted">'+i18n.RC_TEXT["rev-deleted-user"]+'</span>';
		}
		var blockText = this.wikiInfo.canBlock ? i18n.RC_TEXT["pipe-separator"]+"<a href='{0}Special:Block/{1}'>"+i18n.RC_TEXT["blocklink"]+"</a>" : "";
		if(this.userEdited) {
			return Utils.formatString("<span class='mw-usertoollinks'><a href='{0}User:{1}'>{1}</a> (<a href='{0}User_talk:{1}'>"+i18n.RC_TEXT["talkpagelinktext"]+"</a>"+i18n.RC_TEXT["pipe-separator"]+"<a href='{0}Special:Contributions/{1}'>"+i18n.RC_TEXT["contribslink"]+"</a>"+blockText+")</span>", this.wikiInfo.articlepath, this.author);
		} else {
			return Utils.formatString("<span class='mw-usertoollinks'><a href='{0}Special:Contributions/{1}'>{1}</a> (<a href='{0}User_talk:{1}'>"+i18n.RC_TEXT["talkpagelinktext"]+"</a>"+blockText+")</span>", this.wikiInfo.articlepath, this.author);
		}
	}
	
	RCData.prototype.logTitleText = function() {
		var logTemplate = "(<a href='"+this.wikiInfo.articlepath+"Special:Log/{0}'>{1}</a>)";
		switch(this.logtype) {
			case "abusefilter"	:{ return Utils.formatString(logTemplate, this.logtype,	i18n.RC_TEXT["abusefilter-log"]); }
			case "block"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n.RC_TEXT["blocklogpage"]); }
			case "chatban"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n.RC_TEXT["chat-chatban-log"]); }
			case "delete"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n.RC_TEXT["dellogpage"]); }
			case "import"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n.RC_TEXT["importlogpage"]); }
			case "maps"			:{ return Utils.formatString(logTemplate, this.logtype,	i18n.RC_TEXT["wikia-interactive-maps-log-name"]); }
			case "merge"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n.RC_TEXT["mergelog"]); }
			case "move"			:{ return Utils.formatString(logTemplate, this.logtype,	i18n.RC_TEXT["movelogpage"]); }
			case "protect"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n.RC_TEXT["protectlogpage"]); }
			case "upload"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n.RC_TEXT["uploadlogpage"]); }
			case "useravatar"	:{ return Utils.formatString(logTemplate, this.logtype,	i18n.RC_TEXT["useravatar-log"]); }
			case "newusers"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n.RC_TEXT["newuserlogpage"]); }
			case "renameuser"	:{ return Utils.formatString(logTemplate, this.logtype,	i18n.RC_TEXT["userrenametool-logpage"]); }
			case "rights"		:{ return Utils.formatString(logTemplate, this.logtype,	i18n.RC_TEXT["rightslog"]); }
			case "wikifeatures"	:{ return Utils.formatString(logTemplate, this.logtype,	i18n.RC_TEXT["wikifeatures-log-name"]); }
			default				:{ return Utils.formatString(logTemplate, this.logtype,	this.logtype); } // At least display it as a log.
		}
		return "";
	}
	
	// Check each entry for "threadTitle", else return default text.
	RCData.prototype.getThreadTitle = function() {
		return this.threadTitle ? this.threadTitle :  "<i>"+i18n.TEXT.unknownThreadName+"</i>";
	}
	
	RCData.prototype.getSummary = function(pSummary) {
		if(this.summary == "" || this.summary == undefined) {
			return "";
		} else {
			this.summary = this.summary.trim();
			this.summary = this.summary.replace(/(\r\n|\n|\r)/gm, " ");
			return ' <span class="comment" dir="auto">('+this.summary+')</span>';
		}
	}
	
	// Returns text explaining what the log did. Also returns user details (since it's a part of some of their wiki text).
	// Some info is only present in the edit summary for some logtypes, so these parts won't be translated.
	RCData.prototype.logActionText = function() {
		var tLogMessage = "";
		
		if(this.actionhidden) {
			tLogMessage = '<span class="history-deleted">'+i18n.RC_TEXT["rev-deleted-event"]+'</span>';
			tLogMessage += this.getSummary();
		}
		
		switch(this.logtype) {
			case "block": {
				tLogMessage += this.userDetails()+" ";
				switch(this.logaction) {
					case "block": { tLogMessage += Utils.wiki2html( i18n.RC_TEXT["blocklogentry"],		this.href+"|"+this.titleNoNS, this.log_block_duration, this.log_block_flags ); break; }
					case "reblock": { tLogMessage += Utils.wiki2html( i18n.RC_TEXT["reblock-logentry"],	this.href+"|"+this.titleNoNS, this.log_block_duration, this.log_block_flags ); break; }
					case "unblock": { tLogMessage += Utils.wiki2html( i18n.RC_TEXT["unblocklogentry"],	this.titleNoNS ); break; }
				}
				break;
			}
			case "delete": {
				// logactions assumed: delete, restore, event, revision, event-legacy, revision-legacy
				tLogMessage += Utils.wiki2html( i18n.RC_TEXT["logentry-delete-"+this.logaction],
					this.userDetails(),
					undefined, // Cannot know gender of edit user
					"<a href='"+this.href+"'>"+this.title+"</a>",
					this.log_delete_new_bitmask,
					this.log_delete_revisions_num
				);
				break;
			}
			case "import": {
				tLogMessage += this.userDetails()+" ";
				switch(this.logaction) {
					case "upload": { tLogMessage += Utils.wiki2html( i18n.RC_TEXT["import-logentry-upload"], this.href+"|"+this.title ); break; }
					case "interwiki": { tLogMessage += Utils.wiki2html( i18n.RC_TEXT["import-logentry-interwiki"], this.title ); break; }
				}
				break;
			}
			case "merge": {
				tLogMessage += this.userDetails()+" ";
				// merged [[$1]] into [[$2]] (revisions up to $3)
				tLogMessage += Utils.wiki2html( i18n.RC_TEXT["import-logentry-upload"],
					this.href + "|" + this.title,
					this.wikiInfo.articlepath+this.log_merge_destination + "|" + this.log_merge_destination,
					this.getLogTimeStamp(new Date(this.log_merge_mergepoint))
				);
				break;
			}
			case "move": {
				// logactions assumed: move, move-noredirect, move_redir, move_redir-noredirect
				tLogMessage += Utils.wiki2html( i18n.RC_TEXT["logentry-move-"+this.logaction+this.log_move_noredirect],
					this.userDetails(),
					undefined, // Don't know if male / female.
					"<a href='"+ this.hrefFS+"redirect=no" +"'>"+ this.title + "</a>",
					"<a href='"+ this.wikiInfo.articlepath+this.log_move_newTitle.replace(" ", "_") +"'>"+ this.log_move_newTitle + "</a>"
				);
				break;
			}
			case "protect": {
				tLogMessage += this.userDetails()+" ";
				var t$1 = this.href+"|"+this.title;
				switch(this.logaction) {
					case "protect": { tLogMessage += Utils.wiki2html( i18n.RC_TEXT["protectedarticle"], t$1 ) + " "+this.log_info_0; break; }
					case "modify": { tLogMessage += Utils.wiki2html( i18n.RC_TEXT["modifiedarticleprotection"], t$1 ) + " "+this.log_info_0; break; }
					case "unprotect": { tLogMessage += Utils.wiki2html( i18n.RC_TEXT["unprotectedarticle"], t$1 ); break; }
					case "move_prot": { tLogMessage += Utils.wiki2html( i18n.RC_TEXT["movedarticleprotection"].replace("[[$2]]", this.log_info_0), t$1 ); break; }
				}
				break;
			}
			case "upload": {
				tLogMessage += this.userDetails()+" ";
				switch(this.logaction) {
					case "upload": { tLogMessage += Utils.wiki2html( i18n.RC_TEXT["uploadedimage"],		this.href+"|"+this.title ); break; }
					case "overwrite": { tLogMessage += Utils.wiki2html( i18n.RC_TEXT["overwroteimage"],	this.href+"|"+this.title ); break; }
				}
				break;
			}
			case "newusers": {
				// logactions assumed: newusers, create, create2, autocreate (kinda sorta maybe)
				tLogMessage += Utils.wiki2html( i18n.RC_TEXT["logentry-newusers-"+this.logaction], this.userDetails(), undefined, "" );
				break;
			}
			case "rights": {
				tLogMessage += this.userDetails()+" ";
				switch(this.logaction) {
					case "rights": { tLogMessage += Utils.wiki2html( i18n.RC_TEXT["rightslogentry"], "<a href='"+this.href + "'>" + this.title+"</a>", this.log_rights_oldgroups, this.log_rights_newgroups ); break; }
				}
				break;
			}
			case "useravatar": {
				tLogMessage += this.userDetails()+" ";
				switch(this.logaction) {
					case "avatar_chn": { tLogMessage += i18n.RC_TEXT["blog-avatar-changed-log"]; break; } // 'Added or changed avatar'
					case "avatar_rem": { tLogMessage += Utils.wiki2html( i18n.RC_TEXT["blog-avatar-removed-log"], "<a href='"+this.href+"'>"+this.title+"</a>"); break; } // "Removed $1's avatars"
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
				tLogMessage += Utils.wiki2html( i18n.RC_TEXT["chat-"+this.logaction+"-log-entry"], "<a href='"+this.href+"'>"+this.titleNoNS+"</a>", tChatData[2], t$3 );
				tChatData = null;
				break;
			}
			case "maps": {
				// logactions assumed: create_map, update_map, delete_map, undelete_map
				//						create_pin_type, update_pin_type, delete_pin_type
				//						create_pin, update_pin, delete_pin
				tLogMessage += Utils.wiki2html( i18n.RC_TEXT["logentry-maps-"+this.logaction], this.userDetails(), undefined, this.title );
				break;
			}
			case "abusefilter": {
				var tAbusePage = this.log_info_0.split("\n");
				var tAbuseItem = tAbusePage.shift();
				
				tLogMessage += this.userDetails()+" ";
				switch(this.logaction) {
					case "modify": {
						tLogMessage += Utils.wiki2html( i18n.RC_TEXT["abusefilter-log-entry-modify"],
							"<a href='"+this.href + "'>" + this.title+"</a>",
							"<a href='"+this.wikiInfo.articlepath + "Special:AbuseFilter/history/" + tAbusePage + "/diff/prev/" + tAbuseItem + "'>" + i18n.RC_TEXT["abusefilter-log-detailslink"] + "</a>"
						);
						break;
					}
				}
				break;
			}
		}
		if(tLogMessage == "") {
			tLogMessage += this.userDetails()+" ??? ("+this.logtype+" - "+this.logaction+") ";
		}
		tLogMessage += this.getSummary();
		return tLogMessage;
	}
	
	// Assumes it's a wall/board that has an action (will just return summary otherwise).
	RCData.prototype.wallBoardActionMessageWithSummary = function() {
		var tLocalizedActionMessage = "";
		var tPrefix = this.type == RCData.TYPE.BOARD ? "forum-recentchanges" : "wall-recentchanges";
		var tMsgType = this.isSubComment ? "reply" : "thread";
		switch(this.logaction) {
			case "wall_remove":			tLocalizedActionMessage = tPrefix + "-removed-" + tMsgType;
			case "wall_admindelete":	tLocalizedActionMessage = tPrefix + "-deleted-" + tMsgType;
			case "wall_restore":		tLocalizedActionMessage = tPrefix + "-restored-" + tMsgType;
			case "wall_archive":		tLocalizedActionMessage = tPrefix + "-closed-thread";
			case "wall_reopen":			tLocalizedActionMessage = tPrefix + "-reopened-thread";
		}
		if(tLocalizedActionMessage != "") {
			return " "+Utils.wiki2html(i18n.RC_TEXT[tLocalizedActionMessage], this.href, this.getThreadTitle(), this.getBoardWallParentLink(), this.titleNoNS) + this.getSummary();
		} else {
			return this.getSummary(); // Else not a wall/board action
		}
	}
	
	RCData.prototype.getBoardWallParentTitleWithNamespace = function() {
		if(this.type == RCData.TYPE.BOARD) {
			return "Board:" + this.titleNoNS;
		}
		else if(this.type == RCData.TYPE.WALL) {
			return "Message_Wall:" + this.titleNoNS;
		}
		else {
			if(module.debug) { console.log("This should not happen in getBoardWallParent()"); }
			return this.title;
		}
	}
	
	RCData.prototype.getBoardWallParentLink = function() {
		return this.wikiInfo.articlepath + this.getBoardWallParentTitleWithNamespace();
	}
	
	RCData.prototype.pageTitleTextLink = function() {
		if(this.type == RCData.TYPE.COMMENT) {
			return Utils.wiki2html(i18n.RC_TEXT["article-comments-rc-comment"], this.href, this.titleNoNS);
		} else {
			return Utils.formatString("<a href='{0}'>{1}</a>", this.href, this.title);
		}
	}
	
	RCData.prototype.wallBoardTitleText = function(pThreadTitle) {
		if(pThreadTitle == undefined) { pThreadTitle = this.getThreadTitle(); }
		if(this.type == RCData.TYPE.WALL) {
			return Utils.wiki2html(i18n.RC_TEXT["wall-recentchanges-thread-group"],
				"<a href='"+this.href+"'>"+pThreadTitle+"</a>",
				this.getBoardWallParentLink(),
				this.titleNoNS
			);
		} else {
			return Utils.wiki2html(i18n.RC_TEXT["forum-recentchanges-thread-group"],
				"<a href='"+this.href+"'>"+pThreadTitle+"</a>",
				this.getBoardWallParentLink(),
				this.titleNoNS
			);
		}
	}
	
	RCData.prototype.wallBoardHistoryLink = function() {
		var tLink = "", tText = "";
		if(this.type == RCData.TYPE.WALL) {
			tLink = this.wikiInfo.articlepath + this.getBoardWallParentTitleWithNamespace() + this.wikiInfo.firstSeperator + "action=history";
			tText = this.isSubComment ? "wall-recentchanges-thread-history-link" : "wall-recentchanges-history-link";
		} else {
			tLink = this.wikiInfo.articlepath + this.getBoardWallParentTitleWithNamespace() + this.wikiInfo.firstSeperator + "action=history";
			tText = this.isSubComment ? "forum-recentchanges-thread-history-link" : "forum-recentchanges-history-link";
		}
		return Utils.formatString("(<a href='{0}'>{1}</a>)", tLink, i18n.RC_TEXT[tText]);
	}
	
	RCData.prototype.getLogTimeStamp = function(pDate) {
		return ""
			+ 			Utils.pad( Utils.getHours(pDate, this.manager.timezone), 2 )
			+ ":" +		Utils.pad( Utils.getMinutes(pDate, this.manager.timezone), 2 )
			+ ", " +	Utils.pad( Utils.getDate(pDate, this.manager.timezone), 2 )
			+ " " +		mw.config.get('wgMonthNames')[Utils.getMonth(pDate, this.manager.timezone)+1]
			+ " " +		Utils.getYear(pDate, this.manager.timezone)
		;
	}
	
	return RCData;
	
})(window.jQuery, document, window.mediaWiki, window.dev.RecentChangesMultiple, window.dev.RecentChangesMultiple.Utils, window.dev.RecentChangesMultiple.i18n);
//</syntaxhighlight>