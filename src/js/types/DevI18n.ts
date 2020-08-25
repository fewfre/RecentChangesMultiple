interface DevI18nModule {
	loadMessages(name:string, options?:{ cacheVersion?:number, language?:string, noCache?:boolean }) : JQueryDeferred<DevI18n>;
}

interface DevI18n {
	msg(message:string, ...args:(string|number)[]) : DevI18nMessage;
}

interface DevI18nMessage {
	exists: boolean; // true if a translation was found for the message, else false.
	
	plain() : string; // This outputs the message as is with no further processing.
	escape() : string; // This outputs the message with any HTML characters escaped.
	
	/*
	* This outputs the message with all basic wikitext links converted into HTML and some locale-specific magic words parsed. It also supports the inline tags <i>, <b>, <em>, <strong> and <span> and the attributes title, style and class. Note that disallowed tags will be removed along with their contents, disallowed attributes will be removed and url('...') in style attributes will cause the entire style attribute to be removed. The following wikitext syntax is supported:
	*
	* [url text]
	* [[pagename]]
	* [[pagename|text]]
	* {{PLURAL:count|singular|plural}} (more info)
	* {{GENDER:gender|masculine|feminine|neutral}} (more info)
	* Note that usernames aren't supported - the 'gender' argument should be either 'male', 'female', or anything else for neutral) 
	*/
	parse(): string;
}