interface Window {
	mediaWiki: MediaWiki;
	jQuery:JQueryStatic;
	importArticles: (data:{ type:"script"|"style", articles:string[] })=>Promise<any>;
	ajaxCallAgain?: (()=>void)[];
	
	/******************************
	* Dev wiki tools
	*******************************/
	dev: {
		RecentChangesMultiple: { app:any };
		modal: { Modal:any, modals:any, _windowManager:any };
		i18n: DevI18nModule;
	};
}