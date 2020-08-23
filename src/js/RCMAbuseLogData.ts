import ConstantsApp from "./ConstantsApp";
import RCMManager from "./RCMManager";
import RCMModal from "./RCMModal";
import WikiData from "./WikiData";
import RCData from "./RCData";
import Utils from "./Utils";
import i18n from "./i18n";
import TYPE from "./types/RC_TYPE";

let $ = window.jQuery;
let mw = window.mediaWiki;



// Unused, can't get abuse log data due to requiring user logged in
/*
https://runescape.fandom.com/api.php?action=query&format=json&continue=&rcprop=user|flags|title|ids|sizes|timestamp|loginfo|parsedcomment|comment&rclimit=500&rcshow=!bot&rctype=edit|new|log&rcexcludeuser=Fewfre&leprop=details|user|title|timestamp|type|ids&letype=rights|move|delete|block|merge&lelimit=250&leend=2019-03-04T02:04:09.864Z&list=recentchanges|logevents|abuselog&aflprop=ids|user|title|action|result|timestamp&afllimit=500
https://runescape.fandom.com/api.php?action=query&format=json&continue=&rcprop=user|flags|title|ids|sizes|timestamp|loginfo|parsedcomment|comment&rclimit=500&rcshow=!bot&rctype=edit|new|log&rcexcludeuser=Fewfre&leprop=details|user|title|timestamp|type|ids&letype=rights|move|delete|block|merge&lelimit=250&leend=2019-03-04T02:04:09.864Z&list=abuselog&aflprop=ids|user|title|action|result|timestamp&afllimit=500&aflstart=2018-10-19T17:10:27Z
https://runescape.fandom.com/api.php?action=query&format=json&continue=&rcprop=user|flags|title|ids|sizes|timestamp|loginfo|parsedcomment|comment&rclimit=250&rcshow=!bot&rctype=edit|new|log&rcexcludeuser=Fewfre&leprop=details|user|title|timestamp|type|ids&letype=rights|move|delete|block|merge&lelimit=250&leend=2019-03-04T02:04:09.864Z&list=abusefilters&abflimit=500&abfshow=enabled&abfprop=id|description|actions|private
https://runescape.fandom.com/api.php?action=query&meta=allmessages&format=jsonfm&amfilter=abusefilter
https://www.mediawiki.org/wiki/Extension:AbuseFilter
https://dev.fandom.com/wiki/AbuseLogRC
https://runescape.fandom.com/wiki/Special:AbuseLog?offset=20181019171027&limit=500
*/


	
//######################################
// #### Recent Change Data ####
// * A data object to keep track of RecentChanges data in an organized way, as well as also having convenience methods.
// * These should only ever be used in RCList.
//######################################
export default class RCMAbuseLogData extends RCData
{
	// Constructor
	constructor(pWikiInfo:WikiData, pManager:RCMManager) {
		super(pWikiInfo, pManager);
	}
	
	/*override*/ dispose() : void {
		super.dispose();
	}
	
	/*override*/ init(pData:any) : this {
		this.type = TYPE.LOG;
		this.date = new Date(pData.timestamp);
		
		this.userEdited = 
			// IPv6
			/(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/.test(pData.user)
			// IPv4
			|| /((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])/.test(pData.user)
		;
		this.author = pData.user;
		this.title = Utils.escapeCharacters( pData.title.split("/@comment")[0] );
		this.namespace = pData.ns;
		this.logtype = "abuse";
		// this.logaction = pData.logaction;
		// this.newlen = pData.newlen;
		// this.oldlen = pData.oldlen;
		
		this.summary = pData.rawContent;
		if(this.summary.length > 175) {
			this.summary = this.summary.slice(0, 175)+"...";
		}
		this.unparsedComment = this.summary;
		
		this.pageid = pData.id;//pData.pageid;
		// this.revid = pData.revid;
		// this.old_revid = pData.old_revid;
		
		this.isBotEdit = false;//pData.bot == "";
		this.isMinorEdit = false//pData.minor == "";
		this.isPatrolled = false;//pData.patrolled == "";
		this.titleNoNS = (this.namespace != 0 && this.title.indexOf(":") > -1) ? this.title.split(/:(.+)/)[1] : this.title; // Regex only matches first ":"
		this.uniqueID = this.title; // By default; make change based on this.type.
		this.hrefTitle = Utils.escapeCharactersLink( pData.title );
		this.href = this.wikiInfo.articlepath + this.hrefTitle;
		this.hrefBasic = this.href.split("/@comment")[0];
		this.hrefFS	= this.href + this.wikiInfo.firstSeperator;
		
		return this; // Return self for chaining or whatnot.
	}
	
	/*override*/ logActionText() : string {
		var tLogMessage = "";
		tLogMessage = i18n('abusefilter-log-entry', "DATE", "USER");
		return tLogMessage;
	}
}
