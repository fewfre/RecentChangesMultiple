// DOC - Detailed guide on what's in the mediaWiki object
// https://doc.wikimedia.org/mediawiki-core/master/js/

interface MediaWiki {
	// Makes it so not -everything- has to be documented
	// [key:string]: any;
	
	config: MediaWikiMap;
	hook(name:string) : { add(func:any):any, remove(func:any):any, fire(...args:any[]):any };
	loader: any;
	log: {
		// Log is itself a function, but also has child functions
		(...args:any[]) : void;
		
		warn(...args:any[]) : void;
		error(...args:any[]) : void;
	};
	msg(key:string, ...parameters:any[]) : string;
	
	/**************************************
	* User Data
	***************************************/
	user: {
		options: MediaWikiMap;
	}
	
	/**************************************
	* Utils
	***************************************/
	util: {
		/**
		 * Append a new style block to the head
		 *
		 * @param text string CSS to be appended
		 * @return CSSStyleSheet
		 */
		addCSS(text:string) : CSSStyleSheet;
		
		/**
		 * Grab the URL parameter value for the given parameter.
		 * Returns null if not found.
		 *
		 * @param param string The parameter name.
		 * @param url string URL to search through (optional)
		 * @return mixed Parameter value or null.
		 */
		getParamValue(param:string, url?:string) : string|null;
		
		/**
		 * Check whether a string is an IP address
		 * 
		 * @param address String to check
		 */
		isIPAddress(address:string) : boolean;
		
		/**
		 * Encode page titles for use in a URL
		 * We want / and : to be included as literal characters in our title URLs
		 * as they otherwise fatally break the title
		 *
		 * @param str string String to be encoded
		 */
		wikiUrlencode(str:string) : string;
	}
	
	/**************************************
	* Language
	***************************************/
	language: {
		/**
		 * Grammatical transformations, needed for inflected languages.
		 * Invoked by putting `{{grammar:form|word}}` in a message.
		 *
		 * The rules can be defined in $wgGrammarForms global or computed
		 * dynamically by overriding this method per language.
		 *
		 * @param {string} word
		 * @param {string} form
		 * @return {string}
		 */
		convertGrammar(word:string, form:string) : string;
		
		/**
		 * Converts a number using #getDigitTransformTable.
		 *
		 * @param {number} num Value to be converted
		 * @param {boolean} [integer=false] Whether to convert the return value to an integer
		 * @return {number|string} Formatted number
		 */
		convertNumber(num:number, integer?:boolean) : number|string;

		/**
		 * Plural form transformations, needed for some languages.
		 *
		 * @param {number} count Non-localized quantifier
		 * @param {Array} forms List of plural forms
		 * @return {string} Correct form for quantifier in this language
		 */
		convertPlural(count:number, forms:string[]) : string;

		/**
		 * Provides an alternative text depending on specified gender.
		 *
		 * Usage in message text: `{{gender:[gender|user object]|masculine|feminine|neutral}}`.
		 * If second or third parameter are not specified, masculine is used.
		 *
		 * These details may be overriden per language.
		 *
		 * @param {string} gender 'male', 'female', or anything else for neutral.
		 * @param {Array} forms List of gender forms
		 * @return string
		 */
		gender(gender:string, forms:string[]) : string;
		
		/**
		 * Convenience method for setting language data.
		 *
		 * Creates the data mw.Map if there isn't one for the specified language already.
		 *
		 * @param {string} langCode
		 * @param {string|Object} dataKey Key or object of key/values
		 * @param {Mixed} [value] Value for dataKey, omit if dataKey is an object
		 */
		setData(langCode:string, dataKey:string|any, value?:any) : void;
	}
}

interface MediaWikiMap {
	values: any;
	get(selection:string|string[], fallback?:any) : any;
	set(selection:string|any, value?:any) : any;
	exists(selection:string|string[], value?:any) : boolean;
}