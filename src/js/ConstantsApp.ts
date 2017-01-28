let mw = (<any>window).mediaWiki;

//###########################################################
// #### ConstantsApp - static class for script-wide data ####
//###########################################################
export default class ConstantsApp
{
	static readonly version					: string = "2.6";
	static readonly lastVersionDateString	: string = "Sun Jan 29 2017 00:39:12 GMT-0400 (Eastern Standard Time)";
	static readonly config					: any = mw.config.get([
		"skin",
		"debug",
		"wgPageName",
		"wgUserName",
		"wgUserLanguage",
		"wgServer",
		"wgScriptPath",
		"wgMonthNames",
	]);
	static userOptions						: any; // Unlike config user data potentially needs to be loaded first.
	static readonly debug					: boolean = ConstantsApp.config.debug;
	
	static AUTO_REFRESH_LOCAL_STORAGE_ID	: string = "RecentChangesMultiple-autorefresh-" + ConstantsApp.config.wgPageName;
	static OPTIONS_SETTINGS_LOCAL_STORAGE_ID: string = "RecentChangesMultiple-saveoptionscookie-" + ConstantsApp.config.wgPageName;
	static FAVICON_BASE						: string = "http://www.google.com/s2/favicons?domain="; // Fallback option (encase all other options are unavailable)
	static LOADER_IMG						: string = "http://slot1.images.wikia.nocookie.net/__cb1421922474/common/skins/common/images/ajax.gif";
	static NOTIFICATION_ICON				: string = "http://vignette1.wikia.nocookie.net/fewfre/images/4/44/RecentChangesMultiple_Notification_icon.png/revision/latest?cb=20161013043805";
	
	static readonly username				: string = ConstantsApp.config.wgUserName;
	
	// These may be update ay given points.
	static uniqID							: number = 0;
	static useLocalSystemMessages			: boolean = true;
	static timezone							: string = "utc";
	static loadDelay						: number = 10; // In miliseconds
	
	// Initialize
	static init(pScriptConfig:any) : void {
		ConstantsApp.FAVICON_BASE = pScriptConfig.FAVICON_BASE || ConstantsApp.FAVICON_BASE;
		ConstantsApp.LOADER_IMG = pScriptConfig.LOADER_IMG || ConstantsApp.LOADER_IMG;
		ConstantsApp.NOTIFICATION_ICON = pScriptConfig.NOTIFICATION_ICON || ConstantsApp.NOTIFICATION_ICON;
		
		ConstantsApp.userOptions = mw.user.options.get([
			"date", // Date format
			"gender", // System messages
		])
		// For Testing CSS
		// mw.util.addCSS(`
		// `);
	}
	
	/*************************************
	* Get loading asset
	**************************************/
	static getLoader(pSize:string|number=15) : string {
		// return `<img src='${ConstantsApp.LOADER_IMG}' />`;
		// return ConstantsApp.getSymbol('rcm-loading', pSize, pSize);
		// Chrome doesn't like animations in <use> tags.
		return `<svg width="${pSize}" height="${pSize}" id="rcm-loading" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" xmlns="http://www.w3.org/2000/svg">
			<g transform="translate(20 50)">
				<rect class="bar bar1" fill="#3769c8" x="-10" y="-30" width="20" height="60" opacity="0.3" style="outline:1px solid #3769c8;"/>
			</g>
			<g transform="translate(50 50)">
				<rect class="bar bar2" fill="#3769c8" x="-10" y="-30" width="20" height="60" opacity="0.6" style="outline:1px solid #3769c8;"/>
			</g>
			<g transform="translate(80 50)">
				<rect class="bar bar3" fill="#3769c8" x="-10" y="-30" width="20" height="60" opacity="0.9" style="outline:1px solid #3769c8;"/>
			</g>
		</svg>`;
	}
	
	static getLoaderLarge(pSize:string|number=75) : string {
		// return `<img src='${ConstantsApp.LOADER_IMG}' />`;
		// return ConstantsApp.getSymbol('rcm-loading-large', pSize, pSize);
		// Chrome doesn't like animations in <use> tags.
		return `<svg width="${pSize}" height="${pSize}" id="rcm-loading-large" viewBox="0 0 100 100">
			<g transform="translate(-20,-20)">
				<path class="gear1" fill="#8f7f59" d="M79.9,52.6C80,51.8,80,50.9,80,50s0-1.8-0.1-2.6l-5.1-0.4c-0.3-2.4-0.9-4.6-1.8-6.7l4.2-2.9c-0.7-1.6-1.6-3.1-2.6-4.5 L70,35c-1.4-1.9-3.1-3.5-4.9-4.9l2.2-4.6c-1.4-1-2.9-1.9-4.5-2.6L59.8,27c-2.1-0.9-4.4-1.5-6.7-1.8l-0.4-5.1C51.8,20,50.9,20,50,20 s-1.8,0-2.6,0.1l-0.4,5.1c-2.4,0.3-4.6,0.9-6.7,1.8l-2.9-4.1c-1.6,0.7-3.1,1.6-4.5,2.6l2.1,4.6c-1.9,1.4-3.5,3.1-5,4.9l-4.5-2.1 c-1,1.4-1.9,2.9-2.6,4.5l4.1,2.9c-0.9,2.1-1.5,4.4-1.8,6.8l-5,0.4C20,48.2,20,49.1,20,50s0,1.8,0.1,2.6l5,0.4 c0.3,2.4,0.9,4.7,1.8,6.8l-4.1,2.9c0.7,1.6,1.6,3.1,2.6,4.5l4.5-2.1c1.4,1.9,3.1,3.5,5,4.9l-2.1,4.6c1.4,1,2.9,1.9,4.5,2.6l2.9-4.1 c2.1,0.9,4.4,1.5,6.7,1.8l0.4,5.1C48.2,80,49.1,80,50,80s1.8,0,2.6-0.1l0.4-5.1c2.3-0.3,4.6-0.9,6.7-1.8l2.9,4.2 c1.6-0.7,3.1-1.6,4.5-2.6L65,69.9c1.9-1.4,3.5-3,4.9-4.9l4.6,2.2c1-1.4,1.9-2.9,2.6-4.5L73,59.8c0.9-2.1,1.5-4.4,1.8-6.7L79.9,52.6 z M50,65c-8.3,0-15-6.7-15-15c0-8.3,6.7-15,15-15s15,6.7,15,15C65,58.3,58.3,65,50,65z"/>
			</g>
			<g transform="translate(20,20) rotate(15 50 50)">
				<path class="gear2" fill="#9f9fab" d="M79.9,52.6C80,51.8,80,50.9,80,50s0-1.8-0.1-2.6l-5.1-0.4c-0.3-2.4-0.9-4.6-1.8-6.7l4.2-2.9c-0.7-1.6-1.6-3.1-2.6-4.5 L70,35c-1.4-1.9-3.1-3.5-4.9-4.9l2.2-4.6c-1.4-1-2.9-1.9-4.5-2.6L59.8,27c-2.1-0.9-4.4-1.5-6.7-1.8l-0.4-5.1C51.8,20,50.9,20,50,20 s-1.8,0-2.6,0.1l-0.4,5.1c-2.4,0.3-4.6,0.9-6.7,1.8l-2.9-4.1c-1.6,0.7-3.1,1.6-4.5,2.6l2.1,4.6c-1.9,1.4-3.5,3.1-5,4.9l-4.5-2.1 c-1,1.4-1.9,2.9-2.6,4.5l4.1,2.9c-0.9,2.1-1.5,4.4-1.8,6.8l-5,0.4C20,48.2,20,49.1,20,50s0,1.8,0.1,2.6l5,0.4 c0.3,2.4,0.9,4.7,1.8,6.8l-4.1,2.9c0.7,1.6,1.6,3.1,2.6,4.5l4.5-2.1c1.4,1.9,3.1,3.5,5,4.9l-2.1,4.6c1.4,1,2.9,1.9,4.5,2.6l2.9-4.1 c2.1,0.9,4.4,1.5,6.7,1.8l0.4,5.1C48.2,80,49.1,80,50,80s1.8,0,2.6-0.1l0.4-5.1c2.3-0.3,4.6-0.9,6.7-1.8l2.9,4.2 c1.6-0.7,3.1-1.6,4.5-2.6L65,69.9c1.9-1.4,3.5-3,4.9-4.9l4.6,2.2c1-1.4,1.9-2.9,2.6-4.5L73,59.8c0.9-2.1,1.5-4.4,1.8-6.7L79.9,52.6 z M50,65c-8.3,0-15-6.7-15-15c0-8.3,6.7-15,15-15s15,6.7,15,15C65,58.3,58.3,65,50,65z"/>
			</g>
		</svg>`;
	}
	
	/*************************************
	* SVGs - Inline SVG allows icon to use font color.
	**************************************/
	static getSymbol(pID:string, pWidth:string|number=15, pHeight:string|number=pWidth) : string {
		return `<svg width="${pWidth}" height="${pHeight}" class='rcm-svg-icon'><use xlink:href="#${pID}" width="${pWidth}" height="${pHeight}" /></svg>`;
	}
	
	static readonly SVG_SYMBOLS : string[] = [
		// Loading icon - general use
		// http://loading.io
		`<symbol id="rcm-loading" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" xmlns="http://www.w3.org/2000/svg">
			<g transform="translate(20 50)">
				<rect class="bar bar1" fill="#3769c8" x="-10" y="-30" width="20" height="60" opacity="0.3" style="outline:1px solid #3769c8;"/>
			</g>
			<g transform="translate(50 50)">
				<rect class="bar bar2" fill="#3769c8" x="-10" y="-30" width="20" height="60" opacity="0.6" style="outline:1px solid #3769c8;"/>
			</g>
			<g transform="translate(80 50)">
				<rect class="bar bar3" fill="#3769c8" x="-10" y="-30" width="20" height="60" opacity="0.9" style="outline:1px solid #3769c8;"/>
			</g>
		</symbol>`,
		
		// Large Loading icon - for filling empty space during loading (language / modal loading)
		// http://loading.io
		`<symbol id="rcm-loading-large" viewBox="0 0 100 100">
			<g transform="translate(-20,-20)">
				<path class="gear1" fill="#8f7f59" d="M79.9,52.6C80,51.8,80,50.9,80,50s0-1.8-0.1-2.6l-5.1-0.4c-0.3-2.4-0.9-4.6-1.8-6.7l4.2-2.9c-0.7-1.6-1.6-3.1-2.6-4.5 L70,35c-1.4-1.9-3.1-3.5-4.9-4.9l2.2-4.6c-1.4-1-2.9-1.9-4.5-2.6L59.8,27c-2.1-0.9-4.4-1.5-6.7-1.8l-0.4-5.1C51.8,20,50.9,20,50,20 s-1.8,0-2.6,0.1l-0.4,5.1c-2.4,0.3-4.6,0.9-6.7,1.8l-2.9-4.1c-1.6,0.7-3.1,1.6-4.5,2.6l2.1,4.6c-1.9,1.4-3.5,3.1-5,4.9l-4.5-2.1 c-1,1.4-1.9,2.9-2.6,4.5l4.1,2.9c-0.9,2.1-1.5,4.4-1.8,6.8l-5,0.4C20,48.2,20,49.1,20,50s0,1.8,0.1,2.6l5,0.4 c0.3,2.4,0.9,4.7,1.8,6.8l-4.1,2.9c0.7,1.6,1.6,3.1,2.6,4.5l4.5-2.1c1.4,1.9,3.1,3.5,5,4.9l-2.1,4.6c1.4,1,2.9,1.9,4.5,2.6l2.9-4.1 c2.1,0.9,4.4,1.5,6.7,1.8l0.4,5.1C48.2,80,49.1,80,50,80s1.8,0,2.6-0.1l0.4-5.1c2.3-0.3,4.6-0.9,6.7-1.8l2.9,4.2 c1.6-0.7,3.1-1.6,4.5-2.6L65,69.9c1.9-1.4,3.5-3,4.9-4.9l4.6,2.2c1-1.4,1.9-2.9,2.6-4.5L73,59.8c0.9-2.1,1.5-4.4,1.8-6.7L79.9,52.6 z M50,65c-8.3,0-15-6.7-15-15c0-8.3,6.7-15,15-15s15,6.7,15,15C65,58.3,58.3,65,50,65z"/>
			</g>
			<g transform="translate(20,20) rotate(15 50 50)">
				<path class="gear2" fill="#9f9fab" d="M79.9,52.6C80,51.8,80,50.9,80,50s0-1.8-0.1-2.6l-5.1-0.4c-0.3-2.4-0.9-4.6-1.8-6.7l4.2-2.9c-0.7-1.6-1.6-3.1-2.6-4.5 L70,35c-1.4-1.9-3.1-3.5-4.9-4.9l2.2-4.6c-1.4-1-2.9-1.9-4.5-2.6L59.8,27c-2.1-0.9-4.4-1.5-6.7-1.8l-0.4-5.1C51.8,20,50.9,20,50,20 s-1.8,0-2.6,0.1l-0.4,5.1c-2.4,0.3-4.6,0.9-6.7,1.8l-2.9-4.1c-1.6,0.7-3.1,1.6-4.5,2.6l2.1,4.6c-1.9,1.4-3.5,3.1-5,4.9l-4.5-2.1 c-1,1.4-1.9,2.9-2.6,4.5l4.1,2.9c-0.9,2.1-1.5,4.4-1.8,6.8l-5,0.4C20,48.2,20,49.1,20,50s0,1.8,0.1,2.6l5,0.4 c0.3,2.4,0.9,4.7,1.8,6.8l-4.1,2.9c0.7,1.6,1.6,3.1,2.6,4.5l4.5-2.1c1.4,1.9,3.1,3.5,5,4.9l-2.1,4.6c1.4,1,2.9,1.9,4.5,2.6l2.9-4.1 c2.1,0.9,4.4,1.5,6.7,1.8l0.4,5.1C48.2,80,49.1,80,50,80s1.8,0,2.6-0.1l0.4-5.1c2.3-0.3,4.6-0.9,6.7-1.8l2.9,4.2 c1.6-0.7,3.1-1.6,4.5-2.6L65,69.9c1.9-1.4,3.5-3,4.9-4.9l4.6,2.2c1-1.4,1.9-2.9,2.6-4.5L73,59.8c0.9-2.1,1.5-4.4,1.8-6.7L79.9,52.6 z M50,65c-8.3,0-15-6.7-15-15c0-8.3,6.7-15,15-15s15,6.7,15,15C65,58.3,58.3,65,50,65z"/>
			</g>
		</symbol>`,
		
		// Columns - for use in AjaxDiff
		// https://commons.wikimedia.org/wiki/File:Columns_font_awesome.svg
		`<symbol id="rcm-columns" viewBox="0 -256 1792 1792" version="1.1" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" inkscape:version="0.48.3.1 r9886" sodipodi:docname="columns_font_awesome.svg">
			<metadata id="metadata12"><rdf:rdf><cc:work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"></dc:type></cc:work></rdf:rdf></metadata>
			<defs id="defs10"></defs>
			<sodipodi:namedview pagecolor="#ffffff" bordercolor="#666666" borderopacity="1" objecttolerance="10" gridtolerance="10" guidetolerance="10" inkscape:pageopacity="0" inkscape:pageshadow="2" inkscape:window-width="640" inkscape:window-height="480" id="namedview8" showgrid="false" inkscape:zoom="0.13169643" inkscape:cx="896" inkscape:cy="896" inkscape:window-x="0" inkscape:window-y="25" inkscape:window-maximized="0" inkscape:current-layer="svg2"></sodipodi:namedview>
			<g transform="matrix(1,0,0,-1,68.338983,1277.8305)" id="g4">
				<path d="M 160,0 H 768 V 1152 H 128 V 32 Q 128,19 137.5,9.5 147,0 160,0 z M 1536,32 V 1152 H 896 V 0 h 608 q 13,0 22.5,9.5 9.5,9.5 9.5,22.5 z m 128,1216 V 32 q 0,-66 -47,-113 -47,-47 -113,-47 H 160 Q 94,-128 47,-81 0,-34 0,32 v 1216 q 0,66 47,113 47,47 113,47 h 1344 q 66,0 113,-47 47,-47 47,-113 z" id="path6" inkscape:connector-curvature="0" style="fill:currentColor"></path>
			</g>
		</symbol>`,
		
		// Picture - for use in AjaxGallery
		// Icon made by <a href="http://www.flaticon.com/authors/dave-gandy" title="Dave Gandy">Dave Gandy</a> from <a href="http://www.flaticon.com" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a>
		`<symbol id="rcm-picture" viewBox="0 0 548.176 548.176" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="enable-background:new 0 0 548.176 548.176;" xml:space="preserve">
			<g>
				<path style="fill:currentColor" d="M534.75,68.238c-8.945-8.945-19.694-13.417-32.261-13.417H45.681c-12.562,0-23.313,4.471-32.264,13.417 C4.471,77.185,0,87.936,0,100.499v347.173c0,12.566,4.471,23.318,13.417,32.264c8.951,8.946,19.702,13.419,32.264,13.419h456.815 c12.56,0,23.312-4.473,32.258-13.419c8.945-8.945,13.422-19.697,13.422-32.264V100.499 C548.176,87.936,543.699,77.185,534.75,68.238z M511.623,447.672c0,2.478-0.899,4.613-2.707,6.427 c-1.81,1.8-3.952,2.703-6.427,2.703H45.681c-2.473,0-4.615-0.903-6.423-2.703c-1.807-1.813-2.712-3.949-2.712-6.427V100.495 c0-2.474,0.902-4.611,2.712-6.423c1.809-1.803,3.951-2.708,6.423-2.708h456.815c2.471,0,4.613,0.905,6.42,2.708 c1.801,1.812,2.707,3.949,2.707,6.423V447.672L511.623,447.672z"/>
				<path style="fill:currentColor" d="M127.91,237.541c15.229,0,28.171-5.327,38.831-15.987c10.657-10.66,15.987-23.601,15.987-38.826 c0-15.23-5.333-28.171-15.987-38.832c-10.66-10.656-23.603-15.986-38.831-15.986c-15.227,0-28.168,5.33-38.828,15.986 c-10.656,10.66-15.986,23.601-15.986,38.832c0,15.225,5.327,28.169,15.986,38.826C99.742,232.211,112.683,237.541,127.91,237.541z"/>
				<polygon style="fill:currentColor" points="210.134,319.765 164.452,274.088 73.092,365.447 73.092,420.267 475.085,420.267 475.085,292.36 356.315,173.587"/>
			</g>
		</symbol>`,
		
		// Preview - for use in AjaxPagePreview
		// Icon made by <a href="http://www.flaticon.com/authors/freepik" title="Freepik">Freepik</a> from <a href="http://www.flaticon.com" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a>
		`<symbol id="rcm-preview" viewBox="0 0 480.606 480.606" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="enable-background:new 0 0 480.606 480.606;" xml:space="preserve">
			<g>
				<rect x="85.285" y="192.5" width="200" height="30"/>
				<path style="fill:currentColor" d="M439.108,480.606l21.213-21.213l-71.349-71.349c12.528-16.886,19.949-37.777,19.949-60.371
					c0-40.664-24.032-75.814-58.637-92.012V108.787L241.499,0H20.285v445h330v-25.313c6.188-2.897,12.04-6.396,17.475-10.429
					L439.108,480.606z M250.285,51.213L299.072,100h-48.787V51.213z M50.285,30h170v100h100v96.957
					c-4.224-0.538-8.529-0.815-12.896-0.815c-31.197,0-59.148,14.147-77.788,36.358H85.285v30h126.856
					c-4.062,10.965-6.285,22.814-6.285,35.174c0,1.618,0.042,3.226,0.117,4.826H85.285v30H212.01
					c8.095,22.101,23.669,40.624,43.636,52.5H50.285V30z M307.389,399.208c-39.443,0-71.533-32.09-71.533-71.533
					s32.089-71.533,71.533-71.533s71.533,32.089,71.533,71.533S346.832,399.208,307.389,399.208z"/>
			</g>
		</symbol>`,
		
		// Upvote Circle - for use in discussions
		// Taken from Wikia Discussions page
		`<symbol id="rcm-upvote-tiny" viewBox="0 0 14 14">
			<path style="fill:currentColor" d="M9.746 6.83c-.114.113-.263.17-.413.17-.15 0-.298-.057-.412-.17L7.584 5.49V10.5c0 .322-.26.583-.583.583-.322 0-.583-.26-.583-.583V5.492L5.08 6.829c-.23.227-.598.227-.826 0-.228-.23-.228-.598 0-.826L6.588 3.67c.053-.053.117-.095.19-.125.142-.06.303-.06.445 0 .07.03.136.072.19.126l2.333 2.334c.228.228.228.597 0 .825M7 0C3.14 0 0 3.14 0 7s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7" fill-rule="evenodd"/>
		</symbol>`,
		
		// Lock - for use in discussions
		// Taken from Wikia Discussions page
		`<symbol id="rcm-lock" viewBox="0 0 18 18">
			<path style="fill:currentColor" d="M11 6H7V5c0-1.1.9-2 2-2s2 .9 2 2v1zm-1 6.7V14H8v-1.3c-.6-.3-1-1-1-1.7 0-1.1.9-2 2-2s2 .9 2 2c0 .7-.4 1.4-1 1.7zM9 1C6.8 1 5 2.8 5 5v1H3c-.6 0-1 .4-1 1v9c0 .6.4 1 1 1h12c.6 0 1-.4 1-1V7c0-.6-.4-1-1-1h-2V5c0-2.2-1.8-4-4-4z" fill="#999" fill-rule="evenodd"/>
		</symbol>`,
		
		// Alert/Report exlamation point circle - for use in discussions
		// Taken from Wikia Discussions page
		`<symbol id="rcm-report" viewBox="0 0 18 18">
			<path style="fill:currentColor" d="M10 9a1 1 0 0 1-2 0V4.5a1 1 0 0 1 2 0V9zm0 4.5a1 1 0 0 1-2 0V13a1 1 0 0 1 2 0v.5zM9 1a8 8 0 1 0 0 16A8 8 0 0 0 9 1z" fill-rule="evenodd"></path>
		</symbol>`,
		
		// Settings gear icon - for use on RCMOptions panel.
		`<symbol id="rcm-settings-gear" viewBox="0 0 24 24" enable-background="new 0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve">
			<path style="fill:currentColor" d="M20,14.5v-2.9l-1.8-0.3c-0.1-0.4-0.3-0.8-0.6-1.4l1.1-1.5l-2.1-2.1l-1.5,1.1c-0.5-0.3-1-0.5-1.4-0.6L13.5,5h-2.9l-0.3,1.8 C9.8,6.9,9.4,7.1,8.9,7.4L7.4,6.3L5.3,8.4l1,1.5c-0.3,0.5-0.4,0.9-0.6,1.4L4,11.5v2.9l1.8,0.3c0.1,0.5,0.3,0.9,0.6,1.4l-1,1.5 l2.1,2.1l1.5-1c0.4,0.2,0.9,0.4,1.4,0.6l0.3,1.8h3l0.3-1.8c0.5-0.1,0.9-0.3,1.4-0.6l1.5,1.1l2.1-2.1l-1.1-1.5c0.3-0.5,0.5-1,0.6-1.4 L20,14.5z M12,16c-1.7,0-3-1.3-3-3s1.3-3,3-3s3,1.3,3,3S13.7,16,12,16z"/>
		</symbol>`,
	];
	
	// Svg <symbol>s are added here and used via <use> tags to avoid injecting long html into the page multiple times.
	// Due to how symbols work, this only needs to be injected once per script.
	static initSymbols() : string {
		if(!ConstantsApp.SVG_SYMBOLS) { return; }
		let tSVG = `<svg xmlns:dc="http://purl.org/dc/elements/1.1/" style="height: 0px; width: 0px; position: absolute; overflow: hidden;">'
			${ConstantsApp.SVG_SYMBOLS.join("")}
		</svg>`;
		delete ConstantsApp.SVG_SYMBOLS;
		return tSVG;
	}
}
