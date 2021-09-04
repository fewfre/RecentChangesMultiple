import Global from "../Global";
import RCMManager from "../RCMManager";
import WikiData from "../WikiData";
import Utils from "../Utils";
import i18n from "../i18n";
import { RCData, RC_TYPE } from ".";

let $ = window.jQuery;
let mw = window.mediaWiki;
	
//######################################
// #### Recent Change Data ####
// * A data object to keep track of RecentChanges data in an organized way, as well as also having convenience methods.
// * These should only ever be used in RCList.
//######################################
interface RCDataAbstractProps {
	title: string;
	date: Date;
	author: string;
	isUser: boolean;
	namespace: number;
	groupWithID: string;
	
	isNewPage?: boolean;
	isBotEdit?: boolean;
	isMinorEdit?: boolean;
	isPatrolled?: boolean;
}
export default abstract class RCDataAbstract
{
	// Storage
	readonly manager	: RCMManager; // Keep track of what manager this data is attached to.
	readonly wikiInfo	: WikiData; // Keep track of what Wiki this data belongs to.
	
	/***************************
	 * Storage
	 ***************************/
	abstract type		: RC_TYPE;
	titleOriginal		: string; // Title of the page. Includes namespace.
	title				: string; // Title of the page. Includes namespace.
	titleUrlEscaped		: string; // Title of page, escaped for url (necessary if page name as passed along an ajax call)
	date				: Date; // The DateTime this edit was made at.
	
	author				: string; // The user or anon that made the edit.
	userEdited			: boolean; // Whether the author is a user vs an anon.
	
	namespace			: number; // Namespace of the page edited.
	summary				: string; // Submit comment for the edit.
	summaryUnparsed		: string; // Submit comment for the edit without HTML tags.
	
	// Edit flags - even though not all rc types use all of these, all rc rows expect these values to exist
	editFlags			: {
		newpage:boolean, // If this edit created a new page
		botedit:boolean, // If this edit has been flaged as a bot edit.
		minoredit:boolean, // If this edit was flagged as minor.
		unpatrolled:boolean, // If this page has been patrolled.
	};
	
	groupWithID		: string; // A unique ID is primarily important for boards/walls/comments, since they group by the parent comment.
	
	get href() : string { return this.getUrl(); };
	
	// Constructor
	constructor(pWikiInfo:WikiData, pManager:RCMManager, props:RCDataAbstractProps) {
		this.manager = pManager;
		this.wikiInfo = pWikiInfo;
		
		if(!props.title) { props.title = ""; } // Small fix to prevent weird errors if title doesn't exist
		this.date = props.date;
		this.userEdited = props.isUser;
		this.author = props.author;
		// this.userhidden = props.userhidden == ""; [REMOVED]
		this.titleOriginal = props.title;
		this.title = Utils.escapeCharacters(props.title);
		this.titleUrlEscaped = Utils.escapeCharactersUrl(props.title);
		
		this.editFlags = {
			newpage: props.isNewPage ?? false,
			botedit: props.isBotEdit ?? false,
			minoredit: props.isMinorEdit ?? false,
			unpatrolled: !(props.isPatrolled ?? false),
		};
		
		this.groupWithID = props.groupWithID;
	}
	
	dispose() : void {
		// @ts-ignore - It's read only, but we still want it deleted here
		delete this.manager;
		// @ts-ignore - It's read only, but we still want it deleted here
		delete this.wikiInfo;
		
		this.date = null;
	}
	
	/**
	 * Get the url associated with this RC
	 * @param params any optional url params to include on the url
	 */
	abstract getUrl(params?:{ [key:string]:string|number }) : string;
	
	time() : string {
		return Utils.formatWikiTimeStampTimeOnly(this.date, true);
		// return Utils.pad(Utils.getHours(this.date),2)+":"+Utils.pad(Utils.getMinutes(this.date),2);
	}
	
	abstract userDetails() : string;
	
	getSummary() : string {
		return RCDataAbstract.renderSummary(this.summary);
	}
	static renderSummary(pSummary:string) : string {
		if(pSummary == "" || pSummary == undefined) {
			return "";
		}
		return ` <span class="comment" dir="auto">${i18n('parentheses', pSummary)}</span>`;
	}
	
	// Used for browser Notification title
	abstract getNotificationTitle() : string;
	
	getNSClass() : string {
		return "rc-entry-ns-"+this.namespace;
	}
	
	shouldBeRemoved(pDate:Date) : boolean {
		// First remove items past "days" (needs to be done first since it can change number allowed by "limit").
		if(this.date.getSeconds() < pDate.getSeconds()-(this.wikiInfo.rcParams.days * 86400)) { // days*24*60*60 = days->seconds)
			return true;
		}
		// Next start checking if enough items are listed for the wiki to go past it's "limit".
		// We have different things to check because some things use different api calls (normal RCs, discussions, and abuse logs)
		switch(this.getRemovalType()) {
			case "normal": return this.wikiInfo.resultsCount > this.wikiInfo.rcParams.limit;
			case "discussion": return this.wikiInfo.discussionsCount > Math.min(this.wikiInfo.rcParams.limit, 50);
			case "abuselog": return this.wikiInfo.abuseLogCount > this.wikiInfo.rcParams.limit;
		}
	}
	
	getRemovalType() {
		let rc = (<RCData><any>this);
		if(rc.type == RC_TYPE.DISCUSSION) { return "discussion"; }
		else if(rc.type == RC_TYPE.LOG && rc.logtype=="abuse") { return "abuselog"; }
		else { return "normal"; }
	}
}
