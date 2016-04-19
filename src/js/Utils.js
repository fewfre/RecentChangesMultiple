//<syntaxhighlight lang="javascript">

//######################################
// General Helper Methods - STATIC
//######################################
(window.dev = window.dev || {}).RecentChangesMultiple = window.dev.RecentChangesMultiple || {};
(function($, document, mw, module) {
	"use strict";
	window.dev.RecentChangesMultiple.Utils = {
		// Allows forEach even on nodelists
		forEach: function(collection, callback, pScope) { if(collection != undefined) { Array.prototype.forEach.call(collection, callback, pScope); } },
		
		// http://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript
		pad: function(n, width, z) {//Number, max padding (ex:3 = 001), what to pad with (default 0)
			z = z || '0';
			n = n + '';
			return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
		},
		
		// http://stackoverflow.com/a/4673436/1411473
		formatString: function(format) {
			var args = Array.prototype.slice.call(arguments, 1);
			return format.replace(/{(\d+)}/g, function(match, number) { 
				return typeof args[number] != 'undefined'
					? args[number] 
					: match
				;
			});
		},
		
		// http://download.remysharp.com/wiki2html.js
		wiki2html: function(pText) {
			if(pText == undefined) { console.log("ERROR: [RecentChangesMultiple] Utils.wiki2html was passed an undefined string"); return pText; };
			var args = Array.prototype.slice.call(arguments, 1); // Used for formatting string with $1
			
			return pText
				// bold
				.replace(/'''(.*?)'''/g, function (m, l) {
					return '<strong>' + l + '</strong>';
				})
				// italic
				.replace(/''(.*?)''/g, function (m, l) {
					return '<em>' + l + '</em>';
				})
				// normal link
				.replace(/[^\[](http[^\[\s]*)/g, function (m, l) {
					return '<a href="' + l + '">' + l + '</a>';
				})
				// format string by replacing wiki $1 string vars with text.
				.replace(/\$(\d+)/g, function(match, number) { 
					return typeof args[number-1] != 'undefined' ? args[number-1]  : match ;
				})
				// internal link or image
				.replace(/\[\[(.*?)\]\]/g, function (m, l) {
					var p = l.split(/\|/);
					var link = p.shift();

					// if (link.match(/^Image:(.*)/)) {
					// 	// no support for images - since it looks up the source from the wiki db
					// 	return m;
					// } else {
						return '<a href="' + link + '">' + (p.length ? p.join('|') : link) + '</a>';
					// }
				})
				// external link
				.replace(/[\[](http:\/\/.*|\/\/.*)[!\]]/g, function (m, l) {
					var p = l.replace(/[\[\]]/g, '').split(/ /);
					var link = p.shift();
					return '<a href="' + link + '">' + (p.length ? p.join(' ') : link) + '</a>';
				})
				/*******************************************************************************
				 * https://doc.wikimedia.org/mediawiki-core/master/js/#!/api/mw.language
				 *******************************************************************************/
				// {{GENDER}} - cannot be checked by script, so just uses {{{1}}}/{{{2}}}
				.replace(/{{GENDER:(.*?)}}/g, function(m, l) { 
					var p = l.split("|");
					var user = p.shift(); // Currently doesn't work, so this will just assume male.
					return mw.language.gender(user, p);
				})
				// {{PLURAL}} - only does default support
				.replace(/{{PLURAL:(.*?)}}/g, function(m, l) { 
					var p = l.split("|");
					var num = p.shift();
					return mw.language.convertPlural(num, p);
				})
				// {{GRAMMAR}}
				.replace(/{{GRAMMAR:(.*?)}}/g, function(m, l) { 
					var p = l.split("|");
					//var num = p.shift();
					return mw.language.convertGrammar(p[1], p[0]);
				})
			;
		},
		
		// Creates a new HTML element (not jQuery) with specific attributes
		newElement: function(tag, attributes, parent) {
			var element = document.createElement(tag);
			if(attributes != undefined) {
				for(var key in attributes) {
					if(key == "style") {
						element.style.cssText = attributes[key];
					} else {
						element[key] = attributes[key];
					}
				}
			}
			if(parent != undefined) parent.appendChild(element);
			return element;
		},
		
		removeElement: function(pNode) {
			pNode.parentNode.removeChild(pNode);
		},
		
		addTextTo: function(pText, pNode) {
			pNode.appendChild( document.createTextNode(pText) );
		},
		
		// Based on: http://stackoverflow.com/a/9229821
		uniq_fast_key: function(a, key) {
			var seen = {};
			var out = [];
			var len = a.length;
			var j = 0;
			for(var i = 0; i < len; i++) {
				var item = a[i];
				if(seen[item[key]] !== 1) {
					seen[item[key]] = 1;
					out[j++] = item;
				}
			}
			return out;
		},
		
		uniqID: function() {
			return "id"+(++module.uniqID);
		},
		
		getMinutes: function(pDate, timeZone)	{ return timeZone == "utc" ? pDate.getUTCMinutes() : pDate.getMinutes(); },
		getHours: function(pDate, timeZone)		{ return timeZone == "utc" ? pDate.getUTCHours() : pDate.getHours(); },
		getDate: function(pDate, timeZone)		{ return timeZone == "utc" ? pDate.getUTCDate() : pDate.getDate(); },
		getMonth: function(pDate, timeZone)		{ return timeZone == "utc" ? pDate.getUTCMonth() : pDate.getMonth(); },
		getYear: function(pDate, timeZone)		{ return timeZone == "utc" ? pDate.getUTCFullYear() : pDate.getFullYear(); },
		
		// Convert from MediaWiki time format to one Date object like.
		getTimestampForYYYYMMDDhhmmSS: function(pNum) {
			pNum = ""+pNum;
			return pNum.splice(0, 4) +"-"+ pNum.splice(0, 2) +"-"+ pNum.splice(0, 2) +"T"+  pNum.splice(0, 2) +":"+ pNum.splice(0, 2) +":"+ pNum.splice(0, 2);
		},
		
		escapeCharacters: function(pString) {
			return pString ? pString.replace(/"/g, '&quot;').replace(/'/g, '&apos;') : pString;
		},
		
		escapeCharactersLink: function(pString) {
			return pString ? pString.replace(/%/g, '%25').replace(/ /g, "_").replace(/"/g, '%22').replace(/'/g, '%27').replace(/\?/g, '%3F').replace(/\+/g, '%2B') : pString;
		},
		
		// Assumes the file has already been checked to be in namespace 6
		isFileAudio: function(pTitle) {
			var tExt = null, audioExtensions = ["oga", "ogg", "ogv"]; // Audio extensions allowed by Wikia
			for(var i = 0; i < audioExtensions.length; i++) {
				tExt = "."+audioExtensions[i];
				if(pTitle.indexOf(tExt, pTitle.length - tExt.length) !== -1) { return true; } // If title ends with extension.
			}
			return false;
		},
		
		// http://phpjs.org/functions/version_compare/
		// Simulate PHP version_compare
		version_compare: function (v1, v2, operator) {
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
				prepVersion = function(v) {
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
			v1 = prepVersion(v1);
			v2 = prepVersion(v2);
			x = Math.max(v1.length, v2.length);
			for (i = 0; i < x; i++) {
				if (v1[i] == v2[i]) { continue; }
				v1[i] = numVersion(v1[i]);
				v2[i] = numVersion(v2[i]);
				if (v1[i] < v2[i]) { compare = -1; break; }
				else if (v1[i] > v2[i]) { compare = 1; break; }
			}
			if (!operator) { return compare; }
			
			switch (operator) {
				case '>': case 'gt':			{ return (compare > 0); }
				case '>=': case 'ge':			{ return (compare >= 0); }
				case '<=': case 'le':			{ return (compare <= 0); }
				case '==': case '=': case 'eq':	{ return (compare === 0); }
				case '<>': case '!=': case 'ne':{ return (compare !== 0); }
				case '': case '<': case 'lt':	{ return (compare < 0); }
				default:						{ return null; }
			}
		},
	};
})(window.jQuery, document, window.mediaWiki, window.dev.RecentChangesMultiple);
//</syntaxhighlight>