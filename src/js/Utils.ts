import Global from "./Global";

let $ = window.jQuery;
let mw = window.mediaWiki;

interface CommonElementAttributes {
	// Special mapped ones
	style?: string;
	// Normal
	id?: string;
	className?: string;
	title?: string;
	innerHTML?: string|number;
	htmlFor?: string;
	name?: string;
	type?: string;
	value?: string|number;
	selected?: string;
	rel?: string;
	href?: string;
}

//######################################
// General Helper Methods - STATIC
//######################################
export default class Utils
{
	/***************************
	* Element Stuff
	***************************/
	// Allows forEach even on nodelists
	static forEach(collection, callback, pScope?:any) : void { if(collection != undefined) { Array.prototype.forEach.call(collection, callback, pScope); } }
	
	// newElement method overloads
	static newElement(tag:"div", attributes?:CommonElementAttributes|null, parent?:HTMLElement|Element) : HTMLDivElement;
	static newElement(tag:"span", attributes?:CommonElementAttributes|null, parent?:HTMLElement|Element) : HTMLSpanElement;
	static newElement(tag:"input", attributes?:CommonElementAttributes|null, parent?:HTMLElement|Element) : HTMLInputElement;
	static newElement(tag:"select", attributes?:CommonElementAttributes|null, parent?:HTMLElement|Element) : HTMLSelectElement;
	static newElement(tag:string, attributes?:CommonElementAttributes|null, parent?:HTMLElement|Element) : HTMLElement;
	// Creates a new HTML element (not jQuery) with specific attributes
	static newElement(tag:string, attributes?:CommonElementAttributes|null, parent?:HTMLElement|Element) : HTMLElement {
		var element = document.createElement(tag);
		if(!!attributes) {
			for(var key in attributes) {
				if(key == "style") {
					element.style.cssText = attributes[key];
				} else {
					element[key] = attributes[key];
				}
			}
		}
		if(parent != undefined) (<HTMLElement>parent).appendChild(element);
		return element;
	}
	
	static removeElement(pNode:HTMLElement|Element) : void {
		pNode = <HTMLElement>pNode;
		pNode.parentNode.removeChild(pNode);
	}
	
	static addTextTo(pText:string, pNode:HTMLElement|Element) : void {
		(<HTMLElement>pNode).appendChild( document.createTextNode(pText) );
	}
	
	static elemIsVisible(pElem:HTMLElement|Element) : boolean {
		let rect = (<HTMLElement>pElem).getBoundingClientRect();
		let viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
		return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
	}
	
	static insertAfter(pNewNode:HTMLElement|Element, pRef:HTMLElement|Element) : HTMLElement {
		return <HTMLElement>(pRef.nextSibling ? pRef.parentNode.insertBefore(pNewNode, pRef.nextSibling) : pRef.parentNode.appendChild(pNewNode));
		// if (pRef.nextSibling) {
		// 	return <HTMLElement>pRef.parentNode.insertBefore(pNewNode, pRef.nextSibling);
		// } else {
		// 	return <HTMLElement>pRef.parentNode.appendChild(pNewNode);
		// }
	}
	
	static prependChild(pNewNode:HTMLElement|Element, pRef:HTMLElement|Element) : HTMLElement {
		return <HTMLElement>(pRef.firstChild ? pRef.insertBefore(pNewNode, pRef.firstChild) : pRef.appendChild(pNewNode));
		// if(pRef.firstChild) {
		// 	return <HTMLElement>pRef.insertBefore(pNewNode, pRef.firstChild);
		// } else {
		// 	return <HTMLElement>pRef.appendChild(pNewNode);
		// }
	}
	
	/***************************
	* Date Methods
	***************************/
	static getSeconds(pDate:Date) : number{ return Global.timezone == "utc" ? pDate.getUTCSeconds() : pDate.getSeconds(); }
	static getMinutes(pDate:Date) : number{ return Global.timezone == "utc" ? pDate.getUTCMinutes() : pDate.getMinutes(); }
	static getHours(pDate:Date) : number	{ return Global.timezone == "utc" ? pDate.getUTCHours() : pDate.getHours(); }
	static getDate(pDate:Date) : number	{ return Global.timezone == "utc" ? pDate.getUTCDate() : pDate.getDate(); }
	static getMonth(pDate:Date) : number	{ return Global.timezone == "utc" ? pDate.getUTCMonth() : pDate.getMonth(); }
	static getYear(pDate:Date) : number	{ return Global.timezone == "utc" ? pDate.getUTCFullYear() : pDate.getFullYear(); }
	
	static formatWikiTimeStamp(pDate:Date, pShowTime:boolean=true) : string {
		let tDateString = Utils.formatWikiTimeStampDateOnly(pDate),
			tTime = pShowTime ? Utils.formatWikiTimeStampTimeOnly(pDate) : "";
		if(Global.userOptions.date != "ISO 8601") {
			if(tTime) { tTime = tTime+", "; }
			tDateString = tTime+tDateString;
		} else {
			if(tTime) { tTime = "T"+tTime; }
			tDateString = tDateString+tTime;
		}
		return tDateString;
	}
	static formatWikiTimeStampDateOnly(pDate:Date) : string {
		let tYear = Utils.getYear(pDate),
			tMonth = Utils.getMonth(pDate)+1,
			tMonthName = Global.config.wgMonthNames[tMonth],
			tDay = Utils.getDate(pDate);
		switch(Global.userOptions.date) {
			case "mdyts":
			case "mdyt":
			case "mdy": default: return `${tMonthName} ${tDay}, ${tYear}`;
			case "dmyts":
			case "dmyt":
			case "dmy": return `${tDay} ${tMonthName} ${tYear}`;
			case "ymdts":
			case "ymdt":
			case "ymd": return `${tYear} ${tMonthName} ${tDay}`;
			case "ISO 8601": return `${tYear}-${Utils.pad(tMonth, 2, 0)}-${Utils.pad(tDay, 2, 0)}`;
		}
	}
	static formatWikiTimeStampTimeOnly(pDate:Date, pNoSeconds:boolean=false) : string {
		let tHours = Utils.getHours(pDate),
			tMinutes = Utils.getMinutes(pDate),
			tSeconds = Utils.getSeconds(pDate),
			tSuffix = "",
			tTime;
		if(Global.timeFormat == "12") {
			tSuffix = tHours >= 12 ? "PM":"AM";
			tHours = ((tHours + 11) % 12 + 1);
		}
		tTime = Utils.pad( tHours, 2 )+ ":" +Utils.pad( tMinutes, 2 );
		if(!pNoSeconds && Global.userOptions.date == "ISO 8601") {
			tTime += ":" +Utils.pad( tSeconds, 2 );
		}
		tTime += tSuffix;
		return tTime;
	}
	
	// Convert from MediaWiki time format to one Date object like.
	static getTimestampForYYYYMMDDhhmmSS(pNum:number|string) : string {
		pNum = ""+pNum;
		var i = 0;
		return pNum.slice(i, i+=4) +"-"+ pNum.slice(i, i+=2) +"-"+ pNum.slice(i, i+=2) +"T"+ pNum.slice(i, i+=2) +":"+ pNum.slice(i, i+=2) +":"+ pNum.slice(i, i+=2);
		// return pNum.splice(0, 4) +"-"+ pNum.splice(0, 2) +"-"+ pNum.splice(0, 2) +"T"+ pNum.splice(0, 2) +":"+ pNum.splice(0, 2) +":"+ pNum.splice(0, 2);
	}
	
	/***************************
	* String Methods
	***************************/
	// http://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript
	static pad(n:number|string, width:number, z:number|string=0) : string {//Number, max padding (ex:3 = 001), what to pad with (default 0)
		n = n.toString();
		return n.length >= width ? n : new Array(width - n.length + 1).join(z.toString()) + n;
	}
	
	// http://stackoverflow.com/a/4673436/1411473
	static formatString(format:string, ...pArgs:(string|number|boolean)[]) : string {
		return format.replace(/{(\d+)}/g, (match, number) => {
			return typeof pArgs[number] != 'undefined'
				? <string>pArgs[number]
				: match
			;
		});
	}
	
	// Need to escape quote for when text is manually added to an html tag attribute.
	static escapeCharacters(pString:string) : string {
		return pString ? pString.replace(/"/g, '&quot;').replace(/'/g, '&apos;') : pString;
	}
	
	static escapeCharactersUrl(pString:string) : string {
		return mw.util.wikiUrlencode(pString);
		//return pString ? pString.replace(/%/g, '%25').replace(/ /g, "_").replace(/"/g, '%22').replace(/'/g, '%27').replace(/\?/g, '%3F').replace(/\&/g, '%26').replace(/\+/g, '%2B') : pString;
	}
	
	// UpperCaseFirstLetter
	static ucfirst(s:string) : string { return s && s[0].toUpperCase() + s.slice(1); }
	
	/***************************
	* Array Helpers
	***************************/
	// Based on: http://stackoverflow.com/a/9229821
	// Remove duplicates
	static uniq_fast_key(a:any[], key:string) : any[] {
		var seen:any = {};
		var out:any[] = [];
		var len:number = a.length;
		var j:number = 0;
		for(var i = 0; i < len; i++) {
			var item:any = a[i];
			if(seen[item[key]] !== 1) {
				seen[item[key]] = 1;
				out[j++] = item;
			}
		}
		return out;
	}
	
	static removeFromArray<T>(pArray:T[], pData:T) : T {
		let i = pArray.indexOf(pData);
		if(i != -1) {
			return pArray.splice(i, 1)[0];
		}
		return null;
	}
	
	static arrayFind<T>(pArray:T[], pFunc:(o:T)=>boolean) : T|null {
		for (var i = 0; i < pArray.length; ++i) {
			if(pFunc(pArray[i])) { return pArray[i]; }
		}
		return null;
	}
	
	/**
	 * Returns an array with arrays of the given size.
	 *
	 * @param myArray {Array} array to split
	 * @param chunk_size {Integer} Size of every group
	 */
	 static chunkArray<T>(myArray:T[], chunk_size:number) : T[][] {
		var index = 0, arrayLength = myArray.length, chunkedArray = [];
		
		for (index = 0; index < arrayLength; index += chunk_size) {
			chunkedArray.push( myArray.slice(index, index+chunk_size) );
		}

		return chunkedArray;
	}
	
	/***************************
	* Misc Methods
	***************************/
	
	static uniqID() : string {
		return "id"+(++Global.uniqID);
	}
	
	static getFirstItemFromObject(pData:any) : any {
		for(var tKey in pData)
		return pData[tKey];
	}
	
	// { foo=1, bar=2 } -> "foo=1&bar=2"
	static objectToUrlQueryData(data:any) : string {
		const ret = [];
		for (let d in data) {
			ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
		}
		return ret.join('&');
	}
	
	// Assumes the file has already been checked to be in namespace 6
	static isFileAudio(pTitle:string) : boolean {
		var tExt = null, audioExtensions = ["oga", "ogg", "ogv"]; // Audio extensions allowed by Wikia
		for(var i = 0; i < audioExtensions.length; i++) {
			tExt = "."+audioExtensions[i];
			if(pTitle.indexOf(tExt, pTitle.length - tExt.length) !== -1) { return true; } // If title ends with extension.
		}
		return false;
	}
	
	// Makes log-friendly urls (changes format and encodes data to make them link properly)
	static logUrl(pPrefix:string, pUrl:string, ...args:any[]) : void {
		let [start, ...vars] = pUrl.replace("&format=json", "&format=jsonfm").split(/\?|\&/);
		// Take all the url vars and encode the data to prevent console wierdness (primarily with `|`)
		// vars = vars.map(s=>(([p,d])=>`${p}=${encodeURIComponent(d)}`)(s.split("=")))
		mw.log(pPrefix, `${start}?${vars.join("&")}`, ...args);
	}
	
	// http://phpjs.org/functions/version_compare/
	// Simulate PHP version_compare
	static version_compare(v1Arg:string|number, v2Arg:string|number, operator:string) : string {
		//       discuss at: http://phpjs.org/functions/version_compare/
		//      original by: Philippe Jausions (http://pear.php.net/user/jausions)
		//      original by: Aidan Lister (http://aidanlister.com/)
		// reimplemented by: Kankrelune (http://www.webfaktory.info/)
		//      improved by: Brett Zamir (http://brett-zamir.me)
		//      improved by: Scott Baker
		//      improved by: Theriault
		//        example 1: version_compare('8.2.5rc', '8.2.5a');
		//        returns 1: 1
		//        example 2: version_compare('8.2.50', '8.2.52', '<');
		//        returns 2: true
		//        example 3: version_compare('5.3.0-dev', '5.3.0');
		//        returns 3: -1
		//        example 4: version_compare('4.1.0.52','4.01.0.51');
		//        returns 4: 1
		var i = 0, x = 0, compare = 0,
			// Leave as negatives so they can come before numerical versions
			vm = { 'dev': -6, 'alpha': -5, 'a': -5, 'beta': -4, 'b': -4, 'RC': -3, 'rc': -3, '#': -2, 'p': 1, 'pl': 1 },
			// Format version string to remove oddities.
			prepVersion = function(v:string|number) : (string|number)[] {
				v = ('' + v)
				.replace(/[_\-+]/g, '.');
				v = v.replace(/([^.\d]+)/g, '.$1.')
					.replace(/\.{2,}/g, '.');
				return (!v.length ? [-8] : v.split('.'));
			};
		// This converts a version component to a number.
		var numVersion = function(v) {
			return !v ? 0 : (isNaN(v) ? vm[v] || -7 : parseInt(v, 10));
		},
		v1 = prepVersion(v1Arg),
		v2 = prepVersion(v2Arg);
		x = Math.max(v1.length, v2.length);
		for (i = 0; i < x; i++) {
			if (v1[i] == v2[i]) { continue; }
			v1[i] = numVersion(v1[i]);
			v2[i] = numVersion(v2[i]);
			if (v1[i] < v2[i]) { compare = -1; break; }
			else if (v1[i] > v2[i]) { compare = 1; break; }
		}
		if (!operator) { return compare.toString(); }
		
		switch (operator) {
			case '>': case 'gt':			{ return (compare > 0).toString(); }
			case '>=': case 'ge':			{ return (compare >= 0).toString(); }
			case '<=': case 'le':			{ return (compare <= 0).toString(); }
			case '==': case '=': case 'eq':	{ return (compare === 0).toString(); }
			case '<>': case '!=': case 'ne':{ return (compare !== 0).toString(); }
			case '': case '<': case 'lt':	{ return (compare < 0).toString(); }
			default:						{ return null; }
		}
	}
}
