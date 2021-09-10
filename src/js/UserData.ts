import RCMManager from "./RCMManager";
import WikiData from "./WikiData";
import Utils from "./Utils";
// const { jQuery:$, mediaWiki:mw } = window;

//######################################
// #### Wiki Data ####
// * A data object to keep track of wiki data in an organized way, as well as also having convenience methods.
// * These should only be created once per wiki per RCMManager. No reason to re-create every refresh.
//######################################
export default class UserData
{
	// Storage
	readonly manager	: RCMManager; // Keep track of what manager this data is attached to.
	// readonly wikiInfo	: WikiData; // Keep track of what Wiki this data belongs to.
	
	/***************************
	* List Data - Data defined by "&attr=" style data on the url list elements.
	* ex: *dev.fandom.com &hideusers=Test
	****************************/
	userid				: string;
	name				: string;
	groups				: string[];
	// editcount			: number;
	// registration		: Date;
	block				?: { by:string, reason:string, expiration:string };
	
	// Constructor
	constructor(wikiInfo:WikiData, manager:RCMManager, userData:any) {
		// this.wikiInfo = wikiInfo;
		this.manager = manager;
		
		// Handle data retrieved from https://www.mediawiki.org/wiki/API:Users
		this.userid = userData.userid;
		this.name = userData.name;
		// this.editcount = pData.editcount;
		this.groups = userData.groups || []; Utils.removeFromArray(this.groups, "*");
		// this.registration = new Date(pData.registration);
		if(userData.blockedby) {
			this.block = { by:userData.blockedby, reason:userData.blockreason, expiration:userData.blockexpiry };
		}
	}
	
	dispose() : void {
		// @ts-ignore - It's read only, but we still want it deleted here
		delete this.manager;
		// @ts-ignore - It's read only, but we still want it deleted here
		// delete this.wikiInfo;
		
		this.groups = undefined;
		// this.registration = undefined;
		this.block = undefined;
	}
	
	// Get user CSS classes as a string.
	getClassNames() : string {
		return "rcm-usergroup-"+this.groups.join(" rcm-usergroup-") + (this.block ? " rcm-userblocked" : "");
	}
	
	// Max value is 50
	static getUsersApiUrl(pList:string[], pScriptpath:string) : string {
		var tReturnText = pScriptpath+"/api.php?action=query&format=json&continue=&list=users";
		tReturnText += "&usprop=" + ["blockinfo", "groups"].join("|"); // "editcount", "registration"
		tReturnText += "&ususers=" + Utils.escapeCharactersUrl(pList.join("|").replace(/ /g, "_"));
		
		Utils.logUrl("[UserData](getUsersApiUrl)", tReturnText);
		return tReturnText;
	}
}
