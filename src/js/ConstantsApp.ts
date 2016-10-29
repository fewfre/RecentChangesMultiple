let mw = (<any>window).mediaWiki;

//###########################################################
// #### ConstantsApp - static class for script-wide data ####
//###########################################################
export default class ConstantsApp
{
	static readonly version					: string = "2.0";
	static readonly lastVersionDateString	: string = "Thu Oct 29 2016 00:39:12 GMT-0400 (Eastern Standard Time)";
	static debug							: boolean = false;
	
	static AUTO_REFRESH_LOCAL_STORAGE_ID	: string = "RecentChangesMultiple-autorefresh-" + mw.config.get("wgPageName");
	static OPTIONS_SETTINGS_LOCAL_STORAGE_ID: string = "RecentChangesMultiple-saveoptionscookie-" + mw.config.get("wgPageName");
	static FAVICON_BASE						: string = "http://www.google.com/s2/favicons?domain="; // Fallback option (encase all other options are unavailable)
	static LOADER_IMG						: string = "http://slot1.images.wikia.nocookie.net/__cb1421922474/common/skins/common/images/ajax.gif";
	static NOTIFICATION_ICON				: string = "http://vignette1.wikia.nocookie.net/fewfre/images/4/44/RecentChangesMultiple_Notification_icon.png/revision/latest?cb=20161013043805";
	
	// These may be update ay given points.
	static uniqID							: number = 0;
	static useLocalSystemMessages			: boolean = true;
	static loadDelay						: number = 10; // In miliseconds
	
	// Initialize
	static init(pScriptConfig:any) : void {
		ConstantsApp.debug = pScriptConfig.debug || ConstantsApp.debug;
		ConstantsApp.FAVICON_BASE = pScriptConfig.FAVICON_BASE || ConstantsApp.FAVICON_BASE;
		ConstantsApp.LOADER_IMG = pScriptConfig.LOADER_IMG || ConstantsApp.LOADER_IMG;
		ConstantsApp.NOTIFICATION_ICON = pScriptConfig.NOTIFICATION_ICON || ConstantsApp.NOTIFICATION_ICON;
	}
}
