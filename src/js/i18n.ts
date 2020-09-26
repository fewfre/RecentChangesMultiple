import Global from "./Global";

let $ = window.jQuery;
let mw = window.mediaWiki;

/*
*  devI18n - Uses I18n-js script on dev wiki. Custom text used in the script to explain what's happening. $1 means that the script will input a number / word / url here on the fly, and is expected / potentially important.
* 			This i18n is set depending on your local language (en if not available).
* MESSAGES - This contains words used in the actual RC page. Only the English information is listed below, because the script prompts the server for those translations by looping through the IDs in the list.
* 			Since some languages depend on the English defaults for things (like "minoreditletter"), it's values are default (to avoid having to load english first).
* NOTES:
*		Common messages: https://github.com/Wikia/app/tree/808a769df6cf8524aa6defcab4f971367e3e3fd8/languages/messages
* 		Search: /api.php?action=query&meta=allmessages&format=jsonfm&amfilter=searchterm
* POTENTIAL ISSUES:
* 		Script cannot check proper use of "{{GENDER}}" (gender is hidden by external API calls for security), so just does male.
*/

// Key for all messages, to avoid typos when using a function
export type I18nKey = keyof typeof MESSAGES | I18nDevKeys;
type I18nDevKeys = 
"error-loading-syntaxhang"
| "error-loading-http"
| "error-loading-connection"
| "error-trymoretimes"

| "status-loading"
| "status-discussions-loading"
| "status-loading-sorting"
| "status-refresh"
| "status-timestamp"
| "status-changesadded"
| "autorefresh"
| "autorefresh-tooltip"

| "wikipanel-wikisloaded"

| "previouslyloaded"
| "nonewchanges"

| "footer"

| "optionspanel-hideusersoverride"
| "optionspanel-savewithcookie"

| "modal-close"
| "modal-diff-title"
| "modal-diff-open"
| "modal-diff-undo"
| "modal-preview-openpage"
| "modal-gallery-load-more"

| "notification-edited-by"
| "notification-edit-summary"
| "notification-new"

| "discussions"
| "comments"
| "message-wall"

| "unknownthreadname"

| "rc-comment"
| "rc-comments"
;

// Using a function as the base of this Singleton allows it to be called as a function directly for ease-of-use and conciseness.
interface i18nInterface {
	(pKey:I18nKey, ...pArgs:(string|number)[]):string;
	defaultLang: string,
	devI18n: DevI18n,
	init: (pLang:string) => void,
	exists: (pKey:string) => boolean,
	MESSAGES: any,
	mwLanguageData: any,
	wiki2html: (pText:string, ...pArgs:(string|number)[]) => string
}
var i18n:i18nInterface = <i18nInterface>function(pKey:string, ...pArgs:(string|number)[]) : string {
	let tText:string;
	let devMsg = i18n.devI18n.msg(pKey, ...pArgs);
	if(devMsg.exists) {
		// return devMsg.parse();
		tText = devMsg.plain();
	} else {
		tText = i18n.MESSAGES[pKey];
	}
	if(tText == undefined) {
		mw.log(`[RecentChangesMultiple.i18n]() '${pKey}' is undefined.`);
		return pKey;
	}
	return i18n.wiki2html(tText, ...pArgs);
}
i18n.defaultLang = "en";

i18n.init = function(pLang?:string) : void {
	// Set default lang for script
	i18n.defaultLang = pLang ? pLang.toLowerCase() : Global.config.wgUserLanguage;
	// split("-") checks for the "default" form of a language encase the specialized version isn't available for mwLanguageData (ex: zh and zh-tw)
	i18n.mwLanguageData = $.extend(i18n.mwLanguageData.en, i18n.mwLanguageData[i18n.defaultLang] || i18n.mwLanguageData[i18n.defaultLang.split("-")[0]]);
	mw.language.setData(Global.config.wgUserLanguage, i18n.mwLanguageData); // Gets mw.language.convertPlural() to work.
}

i18n.exists = function(pKey:string) : boolean {
	let devMsg = i18n.devI18n.msg(pKey);
	return devMsg.exists || i18n.MESSAGES[pKey];
}

/*******************************************************************************
* DO NOT CHANGE THIS WHEN TRANSLATING
* MESSAGES is all text that is retrieved from the Wikia servers for any supported language.
* If it is necessary to overwrite a system message, simply use the I18n-js translation tool on dev wiki for this script.
********************************************************************************/
const MESSAGES = i18n.MESSAGES = {
	/***************************
	* Common Stuff
	****************************/
	// https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/languages/messages/MessagesEn.php
	'talkpagelinktext' : 'Talk', // L830 - "Talk" is more inter-wiki appropriate than "wall" (wall-message-wall-shorten)
	'cur' : 'cur', // L1492
	'last' : 'prev', // L1494
	'recentchanges-legend' : 'Recent changes options', // 2038
	'rclinks' : 'Show last $1 changes in last $2 days<br />$3', // 2054
	'rcshowhideminor'		: '$1 minor edits', // 2048
	'rcshowhidebots'		: '$1 bots', // 2049
	'rcshowhideliu'			: '$1 logged-in users', // 2050
	'rcshowhideanons'		: '$1 anonymous users', // 2051
	// 'rcshowhidepatr'		: '$1 patrolled edits', // 2052
	'rcshowhidemine'		: '$1 my edits', // 2053
	'rcshowhideenhanced'	: '$1 grouped recent changes', // LEGACY
	'rcfilters-group-results-by-page'	: 'Group results by page',
	'rcshowhidelogs'		: '$1 logs', // LEGACY
	'rcfilters-filter-logactions-label' : 'Logged actions',
	'diff' : 'diff', // L2055
	'hist' : 'hist', // L2056
	'hide' : 'Hide', // L2057
	'show' : 'Show', // L2058
	'minoreditletter' : 'm',
	'newpageletter' : 'N', // L2060
	'boteditletter' : 'b',
	'unpatrolledletter' : '!',
	'blocklink' : 'block', // L3150
	'contribslink' : 'contribs', // L3153
	'nchanges' : '$1 {{PLURAL:$1|change|changes}}', // L4650
	'rollbacklink' : 'rollback', // L2869
	// Tooltips
	'recentchanges-label-newpage' : 'This edit created a new page', // L2041
	'recentchanges-label-minor' : 'This is a minor edit',
	'recentchanges-label-bot' : 'This edit was performed by a bot',
	'recentchanges-label-unpatrolled' : 'This edit has not yet been patrolled',
	'rc-enhanced-expand' : 'Show details (requires JavaScript)', // L2070
	'rc-enhanced-hide' : 'Hide details', // L2071
	// "Extra" support - "# only translate this message to other languages if you have to change it"
	'semicolon-separator' : ';&#32;',
	'pipe-separator' : '&#32;|&#32;',
	'parentheses' : '($1)',
	// Revision deletion
	'rev-deleted-comment' : '(edit summary removed)',
	'rev-deleted-user' : '(username removed)',
	'rev-deleted-event' : '(log action removed)',
	// https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/extensions/wikia/ArticleComments/ArticleComments.i18n.php
	'and' : '&#32;and',
	// Wiki Infobar
	'recentchanges' : 'Recent changes',
	'newpages' : 'New pages',
	'newimages' : 'New photos', // There is no text for "New Files"; this was closest I could find. Alts: prefs-files (Files), listfiles (File list), statistics-files (Uploaded files)
	'log' : 'Logs',
	'insights' : 'Insights',
	'randompage' : 'Random page',
	'group-sysop' : 'Administrators',
	'group-user' : 'Users',
	'prefs-files' : 'Files',
	'awc-metrics-articles' : 'Articles', // LEGACY
	'articles' : 'Articles',
	'edits' : 'Edits',
	// Other
	'filedelete-success' : "'''$1''' has been deleted.",
	'shared_help_was_redirect' : 'This page is a redirect to $1', // LEGACY
	'redirectto' : 'Redirect to:',
	'awc-metrics-images' : 'Images', // LEGACY
	'images' : 'Images',
	'wikiacuratedcontent-content-empty-section' : 'This section needs some items', // LEGACY
	'expand_templates_input_missing' : 'You need to provide at least some input wikitext.',
	'wikia-hubs-remove': 'Remove', // LEGACY
	'wall-message-remove': 'Remove',
	'undeletelink': 'view/restore',
	'admindashboard-control-analytics-label': 'Analytics',
	
	/***************************
	* Diff Modal
	****************************/
	'revisionasof' : 'Revision as of $1',
	'editold' : 'edit',
	'editundo' : 'undo',
	
	/***************************
	* Log Names - wgLogHeaders
	****************************/
	// https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/languages/messages/MessagesEn.php
	'blocklogpage'						: 'Block log', // L3157
	'dellogpage'						: 'Deletion log', // L2848
	'importlogpage'						: 'Import log',// L3422
	'mergelog'							: 'Merge log', // L1643
	'movelogpage'						: 'Move log', // L3285
	'protectlogpage'					: 'Protection log', // L2890
	'uploadlogpage'						: 'Upload log', // L2115
	'newuserlogpage'					: 'User creation log', // L2695
	'rightslog'							: 'User rights log', // L1991
	// ## Non-standard Mediawiki logs ##
	// https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/extensions/wikia/UserProfilePageV3/UserProfilePage.i18n.php
	'useravatar-log'					: 'User avatar log',
	// https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/extensions/wikia/UserRenameTool/SpecialRenameuser.i18n.php
	'userrenametool-logpage'			: 'User rename log',
	// ## Wiki Features ##
	// https://github.com/Wikia/app/blob/bf1e586c95224922577b6feea8293df341265a44/extensions/wikia/WikiFeatures/WikiFeatures.i18n.php
	'wikifeatures-log-name'				: 'Wiki Features log',
	// https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/extensions/wikia/Chat2/Chat.i18n.php
	'chat-chatban-log'					: 'Chat ban log',
	// ## Extensions ##
	// https://git.wikimedia.org/blob/mediawiki%2Fextensions%2FAbuseFilter/be09eabbdd591fb869b30cd4e77a286763cbe4e1/i18n%2Fen.json
	'abusefilter-log'					: 'Abuse filter log',

	/***************************
	* Log Actions -
	****************************/
	// https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/languages/messages/MessagesEn.php
	// Block
	'blocklogentry'                   : 'blocked [[$1]] with an expiry time of $2 $3',
	'reblock-logentry'                : 'changed block settings for [[$1]] with an expiry time of $2 $3',
	'unblocklogentry'                 : 'unblocked $1',

	'block-log-flags-anononly'        : 'anonymous users only',
	'block-log-flags-nocreate'        : 'account creation disabled',
	'block-log-flags-noautoblock'     : 'autoblock disabled',
	'block-log-flags-noemail'         : 'e-mail blocked',
	'block-log-flags-nousertalk'      : 'cannot edit own talk page',
	'block-log-flags-angry-autoblock' : 'enhanced autoblock enabled',
	'block-log-flags-hiddenname'      : 'username hidden',
	// Delete
	'logentry-delete-delete'              : '$1 deleted page $3',
	'logentry-delete-restore'             : '$1 restored page $3',
	'logentry-delete-event'               : '$1 changed visibility of {{PLURAL:$5|a log event|$5 log events}} on $3: $4',
	'logentry-delete-revision'            : '$1 changed visibility of {{PLURAL:$5|a revision|$5 revisions}} on page $3: $4',
	'logentry-delete-event-legacy'        : '$1 changed visibility of log events on $3',
	'logentry-delete-revision-legacy'     : '$1 changed visibility of revisions on page $3',

	'revdelete-content-hid'               : 'content hidden',
	'revdelete-summary-hid'               : 'edit summary hidden',
	// Import
	'import-logentry-upload'           : 'imported [[$1]] by file upload',
	'import-logentry-interwiki'        : 'transwikied $1',
	// Merge
	'pagemerge-logentry'	: 'merged [[$1]] into [[$2]] (revisions up to $3)',
	// Move
	'logentry-move-move'                  : '$1 moved page $3 to $4',
	'logentry-move-move-noredirect'       : '$1 moved page $3 to $4 without leaving a redirect',
	'logentry-move-move_redir'            : '$1 moved page $3 to $4 over redirect',
	'logentry-move-move_redir-noredirect' : '$1 moved page $3 to $4 over a redirect without leaving a redirect',
	// Protect
	'protectedarticle'            : 'protected "[[$1]]"',
	'modifiedarticleprotection'   : 'changed protection level for "[[$1]]"',
	'unprotectedarticle'          : 'removed protection from "[[$1]]"',
	'movedarticleprotection'      : 'moved protection settings from "[[$2]]" to "[[$1]]"',
	// Upload
	'uploadedimage'               : 'uploaded "[[$1]]"',
	'overwroteimage'              : 'uploaded a new version of "[[$1]]"',
	// New User
	'logentry-newusers-newusers'          : '$1 created a user account',
	'logentry-newusers-create'            : '$1 created a user account',
	'logentry-newusers-create2'           : '$1 created a user account $3',
	'logentry-newusers-autocreate'        : 'Account $1 was created automatically',
	// Rights
	'rightslogentry'             : 'changed group membership for $1 from $2 to $3',
	'rightslogentry-autopromote' : 'was automatically promoted from $2 to $3',
	'rightsnone'                 : '(none)',
	// ## Non-standard Mediawiki logs ##
	// User Avatar - https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/extensions/wikia/UserProfilePageV3/UserProfilePage.i18n.php
	'blog-avatar-changed-log' : 'Added or changed avatar',
	'blog-avatar-removed-log' : "Removed $1's avatars",
	// User Rename - https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/extensions/wikia/UserRenameTool/SpecialRenameuser.i18n.php
	'userrenametool-success' : 'The user "$1" has been renamed to "$2".',
	// ## Wiki Features ##
	// Wiki Features - https://github.com/Wikia/app/blob/bf1e586c95224922577b6feea8293df341265a44/extensions/wikia/WikiFeatures/WikiFeatures.i18n.php

	// Chat - https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/extensions/wikia/Chat2/Chat.i18n.php
	'chat-chatbanadd-log-entry' : 'banned $1 from chat with an expiry time of $2, ends $3',
	'chat-chatbanremove-log-entry' : 'unbanned $1 from chat',
	'chat-chatbanchange-log-entry' : 'changed ban settings for $1 with an expiry time of $2, ends $3',
	// // ## Extensions ##
	// // Abuse Filter - https://git.wikimedia.org/blob/mediawiki%2Fextensions%2FAbuseFilter/be09eabbdd591fb869b30cd4e77a286763cbe4e1/i18n%2Fen.json
	// "abusefilter-log-entry-modify" : "modified $1 ($2)",
	// "abusefilter-log-detailslink" : "details",

	/***************************
	* Wall - https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/extensions/wikia/Wall/Wall.i18n.php#L191
	****************************/
	'wall-recentchanges-edit'					: 'edited message',
	'wall-recentchanges-removed-thread'			: 'removed thread "[[$1|$2]]" from [[$3|$4\'s wall]]',
	'wall-recentchanges-removed-reply'			: 'removed reply from "[[$1|$2]]" from [[$3|$4\'s wall]]',
	'wall-recentchanges-restored-thread'		: 'restored thread "[[$1|$2]]" to [[$3|$4\'s wall]]',
	'wall-recentchanges-restored-reply'			: 'restored reply on "[[$1|$2]]" to [[$3|$4\'s wall]]',
	'wall-recentchanges-deleted-thread'			: 'deleted thread "[[$1|$2]]" from [[$3|$4\'s wall]]',
	'wall-recentchanges-deleted-reply'			: 'deleted reply from "[[$1|$2]]" from [[$3|$4\'s wall]]',
	'wall-recentchanges-closed-thread'			: 'closed thread "[[$1|$2]]" on [[$3|$4\'s wall]]',
	'wall-recentchanges-reopened-thread'		: 'reopened thread "[[$1|$2]]" on [[$3|$4\'s wall]]',
	'wall-recentchanges-thread-group'			: '$1 on [[$2|$3\'s wall]]',
	'wall-recentchanges-history-link'			: 'wall history',
	'wall-recentchanges-thread-history-link'	: 'thread history',

	/***************************
	* Forum Boards - https://github.com/Wikia/app/blob/808a769df6cf8524aa6defcab4f971367e3e3fd8/extensions/wikia/Forum/Forum.i18n.php#L113
	****************************/
	'forum-recentchanges-edit'					: 'edited message',
	'forum-recentchanges-removed-thread'		: 'removed thread "[[$1|$2]]" from the [[$3|$4 Board]]',
	'forum-recentchanges-removed-reply'			: 'removed reply from "[[$1|$2]]" from the [[$3|$4 Board]]',
	'forum-recentchanges-restored-thread'		: 'restored thread "[[$1|$2]]" to the [[$3|$4 Board]]',
	'forum-recentchanges-restored-reply'		: 'restored reply on "[[$1|$2]]" to the [[$3|$4 Board]]',
	'forum-recentchanges-deleted-thread'		: 'deleted thread "[[$1|$2]]" from the [[$3|$4 Board]]',
	'forum-recentchanges-deleted-reply'			: 'deleted reply from "[[$1|$2]]" from the [[$3|$4 Board]]',
	'forum-recentchanges-thread-group'			: '$1 on the [[$2|$3 Board]]',
	'forum-recentchanges-history-link'			: 'board history',
	'forum-recentchanges-thread-history-link'	: 'thread history',
	'forum-recentchanges-closed-thread'			: 'closed thread "[[$1|$2]]" from [[$3|$4]]',
	'forum-recentchanges-reopened-thread'		: 'reopened thread "[[$1|$2]]" from [[$3|$4]]',
	
	/***************************
	* Discussions
	****************************/
	'forum-related-discussion-heading': 'Discussions about $1',
	'embeddable-discussions-loading': 'Loading Discussions...',
	'allmessages-filter-all': 'All',
	'listusers-select-all': 'Select all',
	
	/***************************
	* AbuseFilter
	****************************/
	'abusefilter-log-detailedentry-meta': '$1: $2 triggered $3, performing the action \"$4\" on $5.\nActions taken: $6;\nFilter description: $7 ($8)',
	'abusefilter-log-entry': '$1: $2 triggered an abuse filter, performing the action \"$3\" on $4.\nActions taken: $5;\nFilter description: $6',
	
	'abusefilter-action-block': 'Block',
	'abusefilter-action-blockautopromote': 'Block autopromote',
	'abusefilter-action-degroup': 'Remove from groups',
	'abusefilter-action-disallow': 'Disallow',
	'abusefilter-action-rangeblock': 'Range-block',
	'abusefilter-action-tag': 'Tag',
	'abusefilter-action-throttle': 'Throttle',
	'abusefilter-action-warn': 'Warn',
	
	"abusefilter-log-detailslink": "details",
	"abusefilter-changeslist-examine": "examine",
};

export const legacyMessagesRemovedContent = [
	"insights", // Feature removed on UCP
	// Old Logs
	"useravatar-log",
	"wikifeatures-log-name",
	"blog-avatar-changed-log",
	"blog-avatar-removed-log",
	// Chat logs (chat removed in UCP)
	"chat-chatban-log",
	"chat-chatbanadd-log-entry",
	"chat-chatbanremove-log-entry",
	"chat-chatbanchange-log-entry",
	// Wall logs (Thread-style walls removed in UCP)
	"wall-recentchanges-edit",
	"wall-recentchanges-removed-thread",
	"wall-recentchanges-removed-reply",
	"wall-recentchanges-restored-thread",
	"wall-recentchanges-restored-reply",
	"wall-recentchanges-deleted-thread",
	"wall-recentchanges-deleted-reply",
	"wall-recentchanges-closed-thread",
	"wall-recentchanges-reopened-thread",
	"wall-recentchanges-thread-group",
	"wall-recentchanges-history-link",
	"wall-recentchanges-thread-history-link",
	// Forum logs (Thread-style forum removed in UCP)
	"forum-recentchanges-edit",
	"forum-recentchanges-removed-thread",
	"forum-recentchanges-removed-reply",
	"forum-recentchanges-restored-thread",
	"forum-recentchanges-restored-reply",
	"forum-recentchanges-deleted-thread",
	"forum-recentchanges-deleted-reply",
	"forum-recentchanges-thread-group",
	"forum-recentchanges-history-link",
	"forum-recentchanges-thread-history-link",
	"forum-recentchanges-closed-thread",
	"forum-recentchanges-reopened-thread",
];

/***************************
* mediawiki.language.data
*
* This probably be fetched naturally somehow (just telling native "messages" API to use a specific language for a little bit?), but not sure how. TODO!
* 
* "mwLanguageData" can be found by finding [ mw.loader.implement("mediawiki.language.data") ] in the page source. If not found may be cached, so visit page using a "private / incognito" window.
* or use mw.language.getData("en")?
 ***************************/
i18n.mwLanguageData = {
	en: { // English (ENGLISH)
		"digitTransformTable": null,
		"separatorTransformTable": null,
		"grammarForms": [],
		"pluralRules": ["i = 1 and v = 0 @integer 1"],
		"digitGroupingPattern": null,
		"fallbackLanguages": []
	},
	be: { // Беларуская (BELARUSIAN)
		"digitTransformTable": null ,
		"separatorTransformTable": {
			",": " ",
			".": ","
		},
		"grammarForms": {
			"родны": {
				"ВікіВіды": "ВікіВідаў",
				"ВікіКнігі": "ВікіКніг",
				"Вікікрыніцы": "Вікікрыніц",
				"ВікіНавіны": "ВікіНавін",
				"Вікіслоўнік": "Вікіслоўніка",
				"Вікіпедыя": "Вікіпедыі"
			},
			"вінавальны": {
				"Вікіпедыя": "Вікіпедыю"
			},
			"месны": {
				"ВікіВіды": "ВікіВідах",
				"ВікіКнігі": "ВікіКнігах",
				"Вікікрыніцы": "Вікікрыніцах",
				"ВікіНавіны": "ВікіНавінах",
				"Вікіслоўнік": "Вікіслоўніку",
				"Вікіпедыя": "Вікіпедыі"
			}
		},
		"pluralRules": [
		"n % 10 = 1 and n % 100 != 11 @integer 1, 21, 31, 41, 51, 61, 71, 81, 101, 1001, … @decimal 1.0, 21.0, 31.0, 41.0, 51.0, 61.0, 71.0, 81.0, 101.0, 1001.0, …", "n % 10 = 2..4 and n % 100 != 12..14 @integer 2~4, 22~24, 32~34, 42~44, 52~54, 62, 102, 1002, … @decimal 2.0, 3.0, 4.0, 22.0, 23.0, 24.0, 32.0, 33.0, 102.0, 1002.0, …", "n % 10 = 0 or n % 10 = 5..9 or n % 100 = 11..14 @integer 0, 5~19, 100, 1000, 10000, 100000, 1000000, … @decimal 0.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …"],
		"digitGroupingPattern": null ,
		"fallbackLanguages": ["en"]
	},
	ca: { // Català (CATALAN)
		"digitTransformTable": null ,
		"separatorTransformTable": {
			",": ".",
			".": ","
		},
		"grammarForms": [],
		"pluralRules": ["i = 1 and v = 0 @integer 1"],
		"digitGroupingPattern": null ,
		"fallbackLanguages": ["en"]
	},
	de: { // Deutsch (German)
		"digitTransformTable": null ,
		"separatorTransformTable": {
			",": ".",
			".": ","
		},
		"grammarForms": [],
		"pluralRules": ["i = 1 and v = 0 @integer 1"],
		"digitGroupingPattern": null ,
		"fallbackLanguages": ["en"]
	},
	es: { // Español (SPANISH)
		"digitTransformTable": null,
		"separatorTransformTable": null,
		"grammarForms": [],
		"pluralRules": ["i = 1 and v = 0 @integer 1"],
		"digitGroupingPattern": null,
		"fallbackLanguages": []
	},
	gl: { // Galego (GALICIAN) 
		"digitTransformTable": null ,
		"separatorTransformTable": {
			",": ".",
			".": ","
		},
		"grammarForms": [],
		"pluralRules": ["i = 1 and v = 0 @integer 1"],
		"digitGroupingPattern": null ,
		"fallbackLanguages": ["pt", "en"]
	},
	it: { // Italiano (ITALIAN)
		"digitTransformTable": null ,
		"separatorTransformTable": {
			",": " ",
			".": ","
		},
		"grammarForms": [],
		"pluralRules": ["i = 1 and v = 0 @integer 1"],
		"digitGroupingPattern": null ,
		"fallbackLanguages": ["en"]
	},
	ja: { // 日本語 (JAPANESE)
		"digitTransformTable": null ,
		"separatorTransformTable": null ,
		"grammarForms": [],
		"pluralRules": ["i = 1 and v = 0 @integer 1"],
		"digitGroupingPattern": null ,
		"fallbackLanguages": ["en"]
	},
	nl: { // Nederlands (DUTCH)
		"digitTransformTable": null ,
		"separatorTransformTable": { ",": ".", ".": "," },
		"grammarForms": [],
		"pluralRules": ["i = 1 and v = 0 @integer 1"],
		"digitGroupingPattern": null,
		"fallbackLanguages": ["en"]
	},
	oc: { // Occitan (OCCITAN)
		"digitTransformTable": null ,
		"separatorTransformTable": {
			",": " ",
			".": ","
		},
		"grammarForms": [],
		"pluralRules": ["i = 1 and v = 0 @integer 1"],
		"digitGroupingPattern": null ,
		"fallbackLanguages": ["en"]
	},
	pl: { // Polski (POLISH)
		"digitTransformTable": null,
		"separatorTransformTable": {",": " ",".": ","},
		"grammarForms": [],
		"pluralRules": ["i = 1 and v = 0 @integer 1", "v = 0 and i % 10 = 2..4 and i % 100 != 12..14 @integer 2~4, 22~24, 32~34, 42~44, 52~54, 62, 102, 1002, …", "v = 0 and i != 1 and i % 10 = 0..1 or v = 0 and i % 10 = 5..9 or v = 0 and i % 100 = 12..14 @integer 0, 5~19, 100, 1000, 10000, 100000, 1000000, …"],
		"digitGroupingPattern": null,
		"fallbackLanguages": ["en"]
	},
	pt: { // Português europeu
		"digitTransformTable": null ,
		"separatorTransformTable": { ",": " ", ".": "," },
		"grammarForms": [],
		"pluralRules": ["n = 0..2 and n != 2 @integer 0, 1 @decimal 0.0, 1.0, 0.00, 1.00, 0.000, 1.000, 0.0000, 1.0000"],
		"digitGroupingPattern": null ,
		"fallbackLanguages": ["pt-br", "en"]
	},
	"pt-br": { // Português brasileiro (PORTUGUESE BRAZIL)
		"digitTransformTable": null ,
		"separatorTransformTable": { ",": " ", ".": "," },
		"grammarForms": [],
		"pluralRules": ["n = 0..2 and n != 2 @integer 0, 1 @decimal 0.0, 1.0, 0.00, 1.00, 0.000, 1.000, 0.0000, 1.0000"],
		"digitGroupingPattern": null ,
		"fallbackLanguages": ["pt", "en"]
	},
	ro: { // Română (ROMANIAN)
		"digitTransformTable": null ,
		"separatorTransformTable": { ",": ".", ".": "," },
		"grammarForms": [],
		"pluralRules": ["i = 1 and v = 0 @integer 1", "v != 0 or n = 0 or n != 1 and n % 100 = 1..19 @integer 0, 2~16, 101, 1001, … @decimal 0.0~1.5, 10.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …"],
		"digitGroupingPattern": null ,
		"fallbackLanguages": ["en"]
	},
	ru: { // Русский (RUSSIAN)
		"digitTransformTable": null ,
		"separatorTransformTable": { ",": " ", ".": "," },
		"grammarForms": [],
		"pluralRules": ["v = 0 and i % 10 = 1 and i % 100 != 11 @integer 1, 21, 31, 41, 51, 61, 71, 81, 101, 1001, …", "v = 0 and i % 10 = 2..4 and i % 100 != 12..14 @integer 2~4, 22~24, 32~34, 42~44, 52~54, 62, 102, 1002, …", "v = 0 and i % 10 = 0 or v = 0 and i % 10 = 5..9 or v = 0 and i % 100 = 11..14 @integer 0, 5~19, 100, 1000, 10000, 100000, 1000000, …"],
		"digitGroupingPattern": null ,
		"fallbackLanguages": ["en"]
	},
	tr: { // Türkçe (TURKISH)
		"digitTransformTable": null ,
		"separatorTransformTable": { ",": ".", ".": "," },
		"grammarForms": [],
		"pluralRules":  [ "n = 1 @integer 1 @decimal 1.0, 1.00, 1.000, 1.0000" ],
		"digitGroupingPattern": null,
		"fallbackLanguages": ["en"]
	},
	uk: { // Українська (UKRAINIAN)
		"digitTransformTable": null ,
		"separatorTransformTable": { ",": " ", ".": "," },
		"grammarForms": {
			"genitive": {
				"Вікіпедія": "Вікіпедії",
				"Вікісловник": "Вікісловника",
				"Вікісховище": "Вікісховища",
				"Вікіпідручник": "Вікіпідручника",
				"Вікіцитати": "Вікіцитат",
				"Вікіджерела": "Вікіджерел",
				"Вікіновини": "Вікіновин",
				"Вікідані": "Вікіданих",
				"Вікімандри": "Вікімандрів"
			},
			"dative": {
				"Вікіпедія": "Вікіпедії",
				"Вікісловник": "Вікісловнику",
				"Вікісховище": "Вікісховищу",
				"Вікіпідручник": "Вікіпідручнику",
				"Вікіцитати": "Вікіцитатам",
				"Вікіджерела": "Вікіджерелам",
				"Вікіновини": "Вікіновинам",
				"Вікідані": "Вікіданим",
				"Вікімандри": "Вікімандрам"
			},
			"accusative": {
				"Вікіпедія": "Вікіпедію",
				"Вікісловник": "Вікісловник",
				"Вікісховище": "Вікісховище",
				"Вікіпідручник": "Вікіпідручник",
				"Вікіцитати": "Вікіцитати",
				"Вікіджерела": "Вікіджерела",
				"Вікіновини": "Вікіновини",
				"Вікідані": "Вікідані",
				"Вікімандри": "Вікімандри"
			},
			"instrumental": {
				"Вікіпедія": "Вікіпедією",
				"Вікісловник": "Вікісловником",
				"Вікісховище": "Вікісховищем",
				"Вікіпідручник": "Вікіпідручником",
				"Вікіцитати": "Вікіцитатами",
				"Вікіджерела": "Вікіджерелами",
				"Вікіновини": "Вікіновинами",
				"Вікідані": "Вікіданими",
				"Вікімандри":
				"Вікімандрами"
			},
			"locative": {
				"Вікіпедія": "у Вікіпедії",
				"Вікісловник": "у Вікісловнику",
				"Вікісховище": "у Вікісховищі",
				"Вікіпідручник": "у Вікіпідручнику",
				"Вікіцитати": "у Вікіцитатах",
				"Вікіджерела": "у Вікіджерелах",
				"Вікіновини": "у Вікіновинах",
				"Вікідані": "у Вікіданих",
				"Вікімандри": "у Вікімандрах"
			},
			"vocative": {
				"Вікіпедія": "Вікіпедіє",
				"Вікісловник": "Вікісловнику",
				"Вікісховище": "Вікісховище",
				"Вікіпідручник": "Вікіпідручнику",
				"Вікіцитати": "Вікіцитати",
				"Вікіджерела": "Вікіджерела",
				"Вікіновини": "Вікіновини",
				"Вікідані": "Вікідані",
				"Вікімандри": "Вікімандри"
			}
		},
		"pluralRules": [
		"v = 0 and i % 10 = 1 and i % 100 != 11 @integer 1, 21, 31, 41, 51, 61, 71, 81, 101, 1001, …", "v = 0 and i % 10 = 2..4 and i % 100 != 12..14 @integer 2~4, 22~24, 32~34, 42~44, 52~54, 62, 102, 1002, …", "v = 0 and i % 10 = 0 or v = 0 and i % 10 = 5..9 or v = 0 and i % 100 = 11..14 @integer 0, 5~19, 100, 1000, 10000, 100000, 1000000, …"],
		"digitGroupingPattern": null ,
		"fallbackLanguages": ["ru", "en"]
	},
	val: { // Valencià (VALENCIAN)
		"digitTransformTable": null ,
		"separatorTransformTable": null ,
		"grammarForms": [],
		"pluralRules": ["i = 1 and v = 0 @integer 1"],
		"digitGroupingPattern": null ,
		"fallbackLanguages": ["en"]
	},
	vi: { // Vietnamese
		"digitTransformTable": null ,
		"separatorTransformTable": {
			",": ".",
			".": ","
		},
		"grammarForms": [],
		"pluralRules": ["i = 1 and v = 0 @integer 1"],
		"digitGroupingPattern": null ,
		"fallbackLanguages": ["en"]
	},
	zh: { // 中文 (CHINESE)
		"digitTransformTable": null ,
		"separatorTransformTable": null ,
		"grammarForms": [],
		"pluralRules": ["i = 1 and v = 0 @integer 1"],
		"digitGroupingPattern": null ,
		"fallbackLanguages": ["zh-hans", "en"]
	},
	"zh-hant": { // 中文 (繁體) (CHINESE TRADITIONAL)
		"digitTransformTable": null ,
		"separatorTransformTable": null ,
		"grammarForms": [],
		"pluralRules": ["i = 1 and v = 0 @integer 1"],
		"digitGroupingPattern": null ,
		"fallbackLanguages": ["zh-hans", "en"]
	},
};

/*******************************************************************************
* Convert wiki syntax found in messages into HTML
********************************************************************************/
// http://download.remysharp.com/wiki2html.js
i18n.wiki2html = function(pText:string, ...pArgs:(string|number)[]) : string {
	if(pText == undefined) { mw.log(`ERROR: [RecentChangesMultiple] i18n.wiki2html was passed an undefined string`); return pText; };

	return pText
		// bold
		.replace(/'''(.*?)'''/g, function (m, l) {
			return `<strong>${l}</strong>`;
		})
		// italic
		.replace(/''(.*?)''/g, function (m, l) {
			return `<em>${l}</em>`;
		})
		// normal link
		.replace(/[^\[](http[^\[\s]*)/g, function (m, l) {
			return `<a href="${l}">${l}</a>`;
		})
		// format string by replacing wiki $1 string vars with text.
		.replace(/\$(\d+)/g, function(match, number) {
			return typeof pArgs[number-1] != 'undefined' ? <string>pArgs[number-1]  : match ;
		})
		// internal link or image
		.replace(/\[\[(.*?)\]\]/g, function (m, l) {
			let p = l.split(/\|/);
			let link = p.shift();

			// if (link.match(/^Image:(.*)/)) {
			// 	// no support for images - since it looks up the source from the wiki db
			// 	return m;
			// } else {
				return `<a href="${link}">${(p.length ? p.join('|') : link)}</a>`;
			// }
		})
		// external link
		.replace(/[\[](https?:\/\/.*|\/\/.*)[!\]]/g, function (m, l) {
			let p = l.replace(/[\[\]]/g, '').split(/ /);
			let link = p.shift();
			return `<a href="${link}">${(p.length ? p.join(' ') : link)}</a>`;
		})
		/*******************************************************************************
		 * https://doc.wikimedia.org/mediawiki-core/master/js/#!/api/mw.language
		 *******************************************************************************/
		// {{GENDER}} - cannot be checked by script, so just uses {{{1}}}/{{{2}}}
		.replace(/{{GENDER:(.*?)}}/g, function(m, l) {
			let p = l.split("|");
			let user = p.shift(); // Remove user object from list
			return mw.language.gender(Global.userOptions.gender, p);
		})
		// {{PLURAL}} - only does default support
		.replace(/{{PLURAL:(.*?)}}/g, function(m, l) {
			let p = l.split("|");
			let num = p.shift();
			return mw.language.convertPlural(num, p);
		})
		// {{GRAMMAR}}
		.replace(/{{GRAMMAR:(.*?)}}/g, function(m, l) {
			let p = l.split("|");
			//let num = p.shift();
			return mw.language.convertGrammar(p[1], p[0]);
		})
	;
};

export default i18n;
