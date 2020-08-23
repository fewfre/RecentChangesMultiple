interface Window {
	mediaWiki: any;
	jQuery:JQueryStatic;
	importArticles: (data:{ type:"script"|"style", articles:string[] })=>Promise<any>;
	dev: any;
	ajaxCallAgain?: (()=>void)[];
}