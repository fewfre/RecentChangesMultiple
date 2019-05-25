import ConstantsApp from "./ConstantsApp";
import RCMManager from "./RCMManager";
import RCParams from "./RCParams";
import WikiData from "./WikiData";
import Utils from "./Utils";
import i18n from "./i18n";

let $ = (<any>window).jQuery;
let mw = (<any>window).mediaWiki;

//######################################
// #### Wiki Data ####
// * A data object to keep track of wiki data in an organized way, as well as also having convenience methods.
// * These should only be created once per wiki per RCMManager. No reason to re-create every refresh.
//######################################
export default class UserData
{
	// Storage
	readonly manager	: RCMManager; // Keep track of what manager this data is attached to.
	readonly wikiInfo	: WikiData; // Keep track of what Wiki this data belongs to.
	
	/***************************
	* List Data - Data defined by "&attr=" style data on the url list elements.
	* ex: *dev.wikia.com &hideusers=Test
	****************************/
	userid				: string;
	name				: string;
	groups				: string[];
	// editcount			: number;
	// registration		: Date;
	block				: { by:string, reason:string, expiration:string };
	
	// Constructor
	constructor(pWikiInfo:WikiData, pManager:RCMManager) {
		this.manager = pManager;
	}
	
	dispose() : void {
		// delete this.manager;
		// delete this.wikiInfo;
		
		this.groups = null;
		// this.registration = null;
		this.block = null;
	}
	
	// Handle data retrieved from https://www.mediawiki.org/wiki/API:Users
	init(pData:any) : UserData {
		this.userid = pData.userid;
		this.name = pData.name;
		// this.editcount = pData.editcount;
		this.groups = pData.groups || []; Utils.removeFromArray(this.groups, "*");
		// this.registration = new Date(pData.registration);
		if(pData.blockedby) {
			this.block = { by:pData.blockedby, reason:pData.blockreason, expiration:pData.blockexpiry };
		}
		
		return this; // Return self for chaining or whatnot.
	}
	
	// Get user CSS classes as a string.
	getClassNames() : string {
		return "rcm-usergroup-"+this.groups.join(" rcm-usergroup-") + (this.block ? " rcm-userblocked" : "");
	}
	
	static getUsersApiUrl(pList:string[], pScriptpath:string) : string {
		var tReturnText = pScriptpath+"/api.php?action=query&format=json&continue=&list=users";
		tReturnText += "&usprop=" + ["blockinfo", "groups"].join("|"); // "editcount", "registration"
		tReturnText += "&ususers=" + Utils.escapeCharactersLink(pList.join("|").replace(/ /g, "_"));
		
		mw.log("[UserData](getUsersApiUrl)", tReturnText.replace("&format=json", "&format=jsonfm"));
		return tReturnText;
	}
}
