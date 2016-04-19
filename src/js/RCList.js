//<syntaxhighlight lang="javascript">

//######################################
// #### Recent Change List ####
// * Contains one or more RCData objects. Formats list as needed.
//######################################
window.dev.RecentChangesMultiple.RCList = (function($, document, mw, module, RCData, Utils, i18n){
	"use strict";
	
	// Static Constants
	var SEP = " . . ";
	
	// Constructor
	function RCList(pManager) {
		this.manager = pManager; // {RCMManager}
		
		/***************************
		 * "Calculated" Data
		 ***************************/
		this.list			= []; // {array<RCData>} List of RCData this list contains. Should always be at least 1.
		this.removeListeners= []; // {array<function>} List of callbacks that will remove event listeners.
		
		/***************************
		 * Properties
		 ***************************/
		Object.defineProperty(this, "newest", { get: function() { return this.list[0]; }, enumerable: true });
		Object.defineProperty(this, "oldest", { get: function() { return this.list[this.list.length-1]; }, enumerable: true });
		Object.defineProperty(this, "date", { get: function() { return this.newest.date; }, enumerable: true });
		Object.defineProperty(this, "wikiInfo", { get: function() { return this.newest.wikiInfo; }, enumerable: true });
		Object.defineProperty(this, "type", { get: function() { return this.newest.type; }, enumerable: true });
	}
	
	RCList.prototype.dispose = function() {
		this.manager = null;
		
		for(i=0; i < this.list.length; i++) {
			this.list[i].dispose();
			this.list[i] = null;
		}
		this.list = null;
		
		// Remove event listeners.
		for(i=0; i < this.removeListeners.length; i++) {
			this.removeListeners[i]();
			this.removeListeners[i] = null;
		}
		this.removeListeners = null;
	};
	
	RCList.prototype.addRC = function(pRC) {
		this.list.push(pRC);
		return this; // Return self for chaining or whatnot.
	};
	
	RCList.prototype.shouldGroupWith = function(pRC) {
		if(this.wikiInfo.servername == pRC.wikiInfo.servername
			&& this.type == pRC.type
			&& Utils.getMonth(this.date, this.manager.timezone) == Utils.getMonth(pRC.date, pRC.manager.timezone)
			&& Utils.getDate(this.date, this.manager.timezone) == Utils.getDate(pRC.date, pRC.manager.timezone)
		) {
			switch(this.type) {
				case RCData.TYPE.LOG: {
					if(this.newest.logtype == pRC.logtype) { return true; }
					break;
				}
				default: {
					if(this.newest.uniqueID == pRC.uniqueID) { return true; }
					break;
				}
			}
		}
		return false;
	};
	
	// Returns a url that compares the edits of two RCs (can be the same one twice, since a RC has info on the current and previous edit).
	// If "pToRC" is null, it will link to newest edit.
	RCList.prototype.getLink = function(pRC, pDiff, pOldId) {
		return pRC.hrefFS + "curid=" + pRC.pageid + (pDiff||pDiff==0 ? "&diff="+pDiff : "") + (pOldId ? "&oldid="+pOldId : "");
	};
	
	// Returns a url that compares the edits of two RCs (can be the same one twice, since a RC has info on the current and previous edit).
	// If "pToRC" is null, it will link to newest edit.
	RCList.prototype.getDiffLink = function(pFromRC, pToRC) {
		return Utils.formatString( "{0}curid={1}&diff={2}&oldid={3}", pFromRC.hrefFS , pFromRC.pageid , (pToRC ? pToRC.revid : 0) , pFromRC.old_revid );
	};
	
	RCList.prototype._diffHist = function(pRC) {
		var diffLink = i18n.RC_TEXT.diff;
		if(pRC.isNewPage == false) {
			diffLink = "<a href='"+this.getDiffLink(pRC, pRC)+"'>"+diffLink+"</a>"+this.getAjaxDiffButton();
		}
		if(this.type == RCData.TYPE.NORMAL && pRC.namespace == 6) {
			diffLink += this.getAjaxImageButton();
		}
		return "("+diffLink+i18n.RC_TEXT["pipe-separator"]+"<a href='"+pRC.hrefFS+"action=history'>"+i18n.RC_TEXT.hist+"</a>)";
	};
	
	// Calculates the size difference between the recent change(s), and returns formatted text to appear in HTML.
	RCList.prototype._diffSizeText = function(pToRC, pFromRC/*optional*/) {
		var tDiffSize = pToRC.newlen - (pFromRC ? pFromRC : pToRC).oldlen;
		var tDiffSizeText = mw.language.convertNumber(tDiffSize);
		
		// var html = "<strong class='{0}'>({1}{2})</strong>";
		var html = "<strong class='{0}'>{1}</strong>";
		if(tDiffSize > 0) {
			return Utils.formatString(html, "mw-plusminus-pos", Utils.wiki2html(i18n.RC_TEXT.parentheses, "+"+tDiffSizeText));
			// html = Utils.formatString(html, "mw-plusminus-pos", "+", tDiffSizeText);
		} else if(tDiffSize < 0) {
			return Utils.formatString(html, "mw-plusminus-neg", Utils.wiki2html(i18n.RC_TEXT.parentheses, tDiffSizeText));
			// html = Utils.formatString(html, "mw-plusminus-neg", "", tDiffSizeText); // The negative is part of the number, so no reason to add it.
		} else {
			return Utils.formatString(html, "mw-plusminus-null", Utils.wiki2html(i18n.RC_TEXT.parentheses, tDiffSizeText));
			// html = Utils.formatString(html, "mw-plusminus-null", "", tDiffSizeText);
		}
		// return html;
	};
	
	RCList.prototype._contributorsCountText = function() {
		var contribs = {}, indx;
		this.list.forEach(function(rc){
			if(contribs.hasOwnProperty(rc.author)) {
				contribs[rc.author].count++;
			} else {
				contribs[rc.author] = { count:1, userEdited:rc.userEdited };
			}
		});
		
		var returnText = "[", total = 0, tLength = this.list.length;
		Object.keys(contribs).forEach(function (key) {
			returnText += this._userPageLink(key, contribs[key].userEdited) + (contribs[key].count > 1 ? " ("+contribs[key].count+"&times;)" : "");
			total += contribs[key].count;
			if(total < tLength) { returnText += "; "; }
		}, this);
		return returnText + "]";
	};
	
	// For use with comments / normal pages
	RCList.prototype._changesText = function() {
		//var returnText = Utils.formatString(i18n.RC_TEXT.numChanges, this.list.length);
		var returnText = Utils.wiki2html(i18n.RC_TEXT["nchanges"], this.list.length);
		if(this.type == RCData.TYPE.NORMAL && this.oldest.isNewPage == false) {
			returnText = "<a href='"+this.getDiffLink(this.oldest, this.newest)+"'>"+returnText+"</a>"+this.getAjaxDiffButton();
		}
		return returnText;
	};
	
	RCList.prototype._userPageLink = function(pUsername, pUserEdited) {
		if(pUserEdited) {
			return Utils.formatString("<a href='{0}User:{1}'>{2}</a>", this.wikiInfo.articlepath, Utils.escapeCharactersLink(pUsername), pUsername);
		} else {
			return Utils.formatString("<a href='{0}Special:Contributions/{1}'>{2}</a>", this.wikiInfo.articlepath, Utils.escapeCharactersLink(pUsername), pUsername);
		}
	};
	
	// Check each entry for "threadTitle", else return default text.
	RCList.prototype.getThreadTitle = function() {
		var tTitle = null;//"<i>"+i18n.TEXT.unknownThreadName+"</i>";
		this.list.some(function(rc){
			if(rc.threadTitle) {
				tTitle = rc.threadTitle;
				return true;
			}
			return false;
		});
		if(this.manager.extraLoadingEnabled) {
			var tElemID = Utils.uniqID();
			tTitle = "<span id='"+tElemID+"'><i>"+(tTitle ? tTitle : i18n.TEXT.unknownThreadName)+"</i></span>";
			
			var self = this;
			this.manager.secondaryWikiData.push({
				url: self.wikiInfo.scriptpath+"/api.php?action=query&format=json&prop=revisions&titles="+this.newest.uniqueID+"&rvprop=content",
				callback: function(data){
					var tSpan = document.querySelector("#"+tElemID);
					for(var tPageIndex in data.query.pages)
					
					tSpan.parentNode.href = self.wikiInfo.articlepath + "Thread:" + data.query.pages[tPageIndex].pageid;
					var tTitleData = /<ac_metadata title="(.*?)".*?>.*?<\/ac_metadata>/g.exec(data.query.pages[tPageIndex].revisions[0]["*"]);
					if(tTitleData != null) {
						tSpan.innerHTML = tTitleData[1];
					}
				}
			});
		} else {
			if(tTitle == null) {
				tTitle = "<i>"+i18n.TEXT.unknownThreadName+"</i>";
			}
		}
		
		return tTitle;
	};
	
	RCList.prototype.getAjaxDiffButton = function() {
		// https://commons.wikimedia.org/wiki/File:Columns_font_awesome.svg
		// inline SVG allows icon to use font color.
		return ' <span class="rcm-ajaxIcon rcm-ajaxDiff">'
			+'<svg width="15px" height="15px" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 -256 1792 1792" id="svg2" version="1.1" inkscape:version="0.48.3.1 r9886" sodipodi:docname="columns_font_awesome.svg">'
				+'<metadata id="metadata12">'
					+'<rdf:rdf>'
						+'<cc:work rdf:about="">'
							+'<dc:format>image/svg+xml</dc:format>'
							+'<dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"></dc:type>'
						+'</cc:work>'
					+'</rdf:rdf>'
				+'</metadata>'
				+'<defs id="defs10"></defs>'
				+'<sodipodi:namedview pagecolor="#ffffff" bordercolor="#666666" borderopacity="1" objecttolerance="10" gridtolerance="10" guidetolerance="10" inkscape:pageopacity="0" inkscape:pageshadow="2" inkscape:window-width="640" inkscape:window-height="480" id="namedview8" showgrid="false" inkscape:zoom="0.13169643" inkscape:cx="896" inkscape:cy="896" inkscape:window-x="0" inkscape:window-y="25" inkscape:window-maximized="0" inkscape:current-layer="svg2"></sodipodi:namedview>'
				+'<g transform="matrix(1,0,0,-1,68.338983,1277.8305)" id="g4">'
					+'<path d="M 160,0 H 768 V 1152 H 128 V 32 Q 128,19 137.5,9.5 147,0 160,0 z M 1536,32 V 1152 H 896 V 0 h 608 q 13,0 22.5,9.5 9.5,9.5 9.5,22.5 z m 128,1216 V 32 q 0,-66 -47,-113 -47,-47 -113,-47 H 160 Q 94,-128 47,-81 0,-34 0,32 v 1216 q 0,66 47,113 47,47 113,47 h 1344 q 66,0 113,-47 47,-47 47,-113 z" id="path6" inkscape:connector-curvature="0" style="fill:currentColor"></path>'
				+'</g>'
			+'</svg>'
		+'</span>';
		//<img src="//upload.wikimedia.org/wikipedia/commons/e/ed/Cog.png" />
	};
	
	RCList.prototype.getAjaxImageButton = function() {
		// <div>Icons made by <a href="http://www.flaticon.com/authors/dave-gandy" title="Dave Gandy">Dave Gandy</a> from <a href="http://www.flaticon.com" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></div>
		// inline SVG allows icon to use font color.
		return ' <span class="rcm-ajaxIcon rcm-ajaxImage">'
			+'<svg width="15px" height="15px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 548.176 548.176" style="enable-background:new 0 0 548.176 548.176;" xml:space="preserve">'
				+'<g>'
					+'<path style="fill:currentColor" d="M534.75,68.238c-8.945-8.945-19.694-13.417-32.261-13.417H45.681c-12.562,0-23.313,4.471-32.264,13.417 C4.471,77.185,0,87.936,0,100.499v347.173c0,12.566,4.471,23.318,13.417,32.264c8.951,8.946,19.702,13.419,32.264,13.419h456.815 c12.56,0,23.312-4.473,32.258-13.419c8.945-8.945,13.422-19.697,13.422-32.264V100.499 C548.176,87.936,543.699,77.185,534.75,68.238z M511.623,447.672c0,2.478-0.899,4.613-2.707,6.427 c-1.81,1.8-3.952,2.703-6.427,2.703H45.681c-2.473,0-4.615-0.903-6.423-2.703c-1.807-1.813-2.712-3.949-2.712-6.427V100.495 c0-2.474,0.902-4.611,2.712-6.423c1.809-1.803,3.951-2.708,6.423-2.708h456.815c2.471,0,4.613,0.905,6.42,2.708 c1.801,1.812,2.707,3.949,2.707,6.423V447.672L511.623,447.672z"/>'
					+'<path style="fill:currentColor" d="M127.91,237.541c15.229,0,28.171-5.327,38.831-15.987c10.657-10.66,15.987-23.601,15.987-38.826 c0-15.23-5.333-28.171-15.987-38.832c-10.66-10.656-23.603-15.986-38.831-15.986c-15.227,0-28.168,5.33-38.828,15.986 c-10.656,10.66-15.986,23.601-15.986,38.832c0,15.225,5.327,28.169,15.986,38.826C99.742,232.211,112.683,237.541,127.91,237.541z"/>'
					+'<polygon style="fill:currentColor" points="210.134,319.765 164.452,274.088 73.092,365.447 73.092,420.267 475.085,420.267 475.085,292.36 356.315,173.587"/>'
				+'</g>'
			+'</svg>'
		+'</span>';
		//<img src="//upload.wikimedia.org/wikipedia/commons/e/ed/Cog.png" />
	};
	
	// https://www.mediawiki.org/wiki/API:Revisions
	RCList.prototype.addPreviewDiffListener = function(pElem, pFromRC, pToRC) {
		if(pElem) {
			if(pToRC == undefined) { pToRC = pFromRC; }
			// Initializing here since "rc" may be nulled by the time the event is triggered.
			var pageName = pFromRC.title;
			var pageID = pFromRC.pageid;
			var ajaxLink = this.wikiInfo.scriptpath+"/api.php?action=query&prop=revisions&format=json&rvprop=size&rvdiffto="+pToRC.revid+"&revids="+pFromRC.old_revid;
			var diffLink = Utils.formatString( "{0}curid={1}&diff={2}&oldid={3}", pFromRC.hrefFS , pFromRC.pageid , pToRC.revid , pFromRC.old_revid );
			var undoLink = Utils.formatString( "{0}curid={1}&undo={2}&undoafter={3}&action=edit", pFromRC.hrefFS , pFromRC.pageid , pToRC.revid , pFromRC.old_revid );
			
			var tRCM_previewdiff = function() {
				RCData.previewDiff(pageName, pageID, ajaxLink, diffLink, undoLink);
			}
			pElem.addEventListener("click", tRCM_previewdiff);
			this.removeListeners.push(function(){ pElem.removeEventListener("click", tRCM_previewdiff); });
			
			pFromRC = null;
			pToRC = null;
		}
	};
	
	// https://www.mediawiki.org/wiki/API:Imageinfo
	RCList.prototype.addPreviewImageListener = function(pElem, pImageRCs) {
		if( Object.prototype.toString.call( pImageRCs ) !== '[object Array]' ) {
			pImageRCs = [ pImageRCs ];
		}
		if(pElem) {
			var tImageNames = [];
			for (var i = 0; i < pImageRCs.length; i++) { tImageNames.push(pImageRCs[i].hrefTitle); }
			var ajaxLink = this.wikiInfo.scriptpath+"/api.php?action=query&prop=imageinfo&format=json&redirects&iiprop=url|size&titles="+tImageNames.join("|");
			var articlepath = this.wikiInfo.articlepath;
			
			var tRCM_previewdiff = function() {
				RCData.previewImages(ajaxLink, articlepath);
			}
			pElem.addEventListener("click", tRCM_previewdiff);
			this.removeListeners.push(function(){ pElem.removeEventListener("click", tRCM_previewdiff); });
			
			tImageNames = null;
			pImageRCs = null;
		}
	};
	
	// RCList.prototype._addRollbackLink = function(pRC) {
	// 	if(this.extraLoadingEnabled == false) { return ""; }
		
	// 	var tRollback = Utils.newElement("span", { className:"mw-rollback-link" });
	// 	tRollback.appendChild(document.createTextNode(" "));
	// 	var tRollbackLink = Utils.newElement("a", { innerHTML:i18n.RC_TEXT["rollbacklink"] }, tRollback);
	// 	tRollback.appendChild(document.createTextNode("]"));
		
	// 	// Initializing here since "rc" may be nulled by the time the event is triggered.
	// 	var tScriptDir = this.wikiInfo.scriptpath;
	// 	var tVersion = this.wikiInfo.mwversion;
	// 	var tPageName = this.title;
	// 	var tPageID = this.pageid;
	// 	var tRollbackLink = this.hrefFS+"action=rollback&from="+pRC.author+"&token=";
		
	// 	var tRCM_rollback = function(){
	// 		RCList.ajaxRollback(tScriptDir, tVersion, tPageName, tPageID, tRollbackLink);
	// 		tRollbackLink.removeEventListener("click", tRCM_rollback);
	// 	}
	// 	tRollbackLink.addEventListener("click", tRCM_rollback);
	// 	this.removeListeners.push(function(){ tRollbackLink.removeEventListener("click", tRCM_rollback); });
		
	// 	pRC = null;
		
	// 	return ;
	// }
	
	// Provide the <abbr> element appropriate to a given abbreviated flag with the appropriate class.
	// Returns a non-breaking space if flag not set.
	RCList.prototype._flag = function(pFlag, pRC, pEmpty) {
		var tI18nLetter = "", tI18nTooltip = "";
		switch(pFlag) {
			case "newpage":		{ if(pRC.isNewPage)		{ tI18nLetter="newpageletter";		tI18nTooltip="recentchanges-label-newpage";	} break; }
			case "minoredit":	{ if(pRC.isMinorEdit)	{ tI18nLetter="minoreditletter";	tI18nTooltip="recentchanges-label-minor";	} break; }
			case "botedit":		{ if(pRC.isBotEdit)		{ tI18nLetter="boteditletter";		tI18nTooltip="recentchanges-label-bot";		} break; }
			// case "unpatrolled":	{ if(pRC.zzzzzz)	{ tI18nLetter="unpatrolledletter"; tI18nTooltip="recentchanges-label-unpatrolled"; } }
		}
		if(tI18nLetter == "") { return pEmpty; }
		else {
			return "<abbr class='"+pFlag+"' title='"+i18n.RC_TEXT[tI18nTooltip]+"'>"+i18n.RC_TEXT[tI18nLetter]+"</abbr>";
		}
	};
	
	RCList.prototype._getFlags = function(pRC, pEmpty, pData) {
		pData = pData || {};
		return ""
			+this._flag("newpage", pRC, pEmpty)
			+(pData.ignoreminoredit ? pEmpty : this._flag("minoredit", pRC, pEmpty) )
			+this._flag("botedit", pRC, pEmpty)
			+pEmpty//this._flag("unpatrolled", this.oldest)
		;
	};
	
	// An RC that is NOT part of a "block" of related changes (logs, edits to same page, etc)
	RCList.prototype._toHTMLSingle = function(pRC) {
		if(this.list.length > 1) { return this._toHTMLBlock(); }
		
		var html = "";
		switch(pRC.type) {
			case RCData.TYPE.LOG: {
				html += pRC.logTitleText();
				if(pRC.logtype=="upload") { html += this.getAjaxImageButton(); }
				html += SEP;
				html += pRC.logActionText();
				break;
			}
			case RCData.TYPE.WALL:
			case RCData.TYPE.BOARD: {
				if(pRC.isWallBoardAction) {
					html += SEP;
					html += pRC.userDetails();
					html += pRC.wallBoardActionMessageWithSummary( this.getThreadTitle() );
				} else {
					html += pRC.wallBoardTitleText( this.getThreadTitle() );
					html += " "+this._diffHist(pRC);
					html += SEP;
					html += this._diffSizeText(pRC);
					html += SEP;
					html += pRC.userDetails();
					html += pRC.getSummary();
				}
				break;
			}
			case RCData.TYPE.COMMENT:
			case RCData.TYPE.NORMAL:
			default: {
				html += pRC.pageTitleTextLink();
				html += " "+this._diffHist(pRC);
				html += SEP;
				html += this._diffSizeText(pRC);
				html += SEP;
				html += pRC.userDetails();
				html += pRC.getSummary();
				// if(this.type == RCData.TYPE.NORMAL && this.isNewPage == false && this.wikiInfo.canRollback) {
				//  html += " [<a href='"+this.href+"action=rollback&from="+this.entry.author.name+"'>rollback</a>]";
				// }
				break;
			}
		}
		
		var tTable = Utils.newElement("table", { className:"mw-enhanced-rc "+pRC.wikiInfo.rcClass });
		Utils.newElement("caption", { className:"rcm-tiled-favicon" }, tTable); // Needed for CSS background.
		var tRow = Utils.newElement("tr", {}, tTable);
		Utils.newElement("td", { innerHTML:pRC.wikiInfo.getFaviconHTML(true) }, tRow);
		Utils.newElement("td", { className:"mw-enhanced-rc", innerHTML:""
			+'<img src="http://slot1.images.wikia.nocookie.net/__cb1422546004/common/skins/common/images/Arr_.png" width="12" height="12" alt="&nbsp;" title="">'
			+this._getFlags(pRC, "&nbsp;")
			+"&nbsp;"
			+pRC.time()
			+"&nbsp;"
		}, tRow);
		Utils.newElement("td", { innerHTML:html }, tRow);
		
		this.addPreviewDiffListener(tTable.querySelector(".rcm-ajaxDiff"), pRC);
		this.addPreviewImageListener(tTable.querySelector(".rcm-ajaxImage"), pRC);
		
		return tTable;
	};
	
	// An RCList that IS a "block" of related changes (logs, edits to same page, etc)
	RCList.prototype._toHTMLBlock = function() {
		if(this.list.length == 1) { return this._toHTMLSingle(this.newest); }
		
		var tBlockHead = this._toHTMLBlockHead();
		for(var i=0; i < this.list.length; i++) {
			tBlockHead.querySelector("tbody").appendChild( this._toHTMLBlockLine(this.list[i]) );
		}
		// Make "blocks" collapsible - for this to work, make sure neither this NOR IT'S PARENT is modified via innerHTML after this has been added (to avoid event being "eaten").
		if($(tBlockHead).makeCollapsible) { $(tBlockHead).makeCollapsible(); }
		return tBlockHead;
	};
	
	// The first line of a RC "group"
	RCList.prototype._toHTMLBlockHead = function() {
		var html = "";
		switch(this.type) {
			case RCData.TYPE.LOG: {
				html += this.newest.logTitleText();
				if(this.newest.logtype=="upload") { html += this.getAjaxImageButton(); }
				break;
			}
			case RCData.TYPE.NORMAL: {
				html += "<a href='"+this.newest.href+"'>"+this.newest.title+"</a>";
				html += " ("+this._changesText()+i18n.RC_TEXT["pipe-separator"]+"<a href='"+this.newest.hrefFS+"action=history'>"+i18n.RC_TEXT["hist"]+"</a>)";
				html += SEP
				html += this._diffSizeText(this.newest, this.oldest);
				break;
			}
			case RCData.TYPE.WALL: {
				html += this.newest.wallBoardTitleText( this.getThreadTitle() );
				html += " ("+this._changesText()+")";
				break;
			}
			case RCData.TYPE.BOARD: {
				html += this.newest.wallBoardTitleText( this.getThreadTitle() );
				html += " ("+this._changesText()+")";
				break;
			}
			case RCData.TYPE.COMMENT: {
				// Link to comments sections on main page. If in main namespace, add the namespace to the page (if requested, custom namespaces can have comments)
				html += Utils.wiki2html( i18n.RC_TEXT["article-comments-rc-comments"].replace("$1", "$3|$1"), this.newest.titleNoNS, undefined, this.wikiInfo.articlepath+(this.newest.namespace==1 ? "" : this.wikiInfo.namespaces[String(this.newest.namespace-1)]["*"]+":")+this.newest.titleNoNS+"#WikiaArticleComments" );
				html += " ("+this._changesText()+")";
				// html += SEP
				// html += this._diffSizeText(this.newest, this.oldest);
				break;
			}
		}
		html += SEP;
		html += this._contributorsCountText();
		
		var tTable = Utils.newElement("table", { className:"mw-collapsible mw-enhanced-rc mw-collapsed "+this.newest.wikiInfo.rcClass }); // mw-made-collapsible
		Utils.newElement("caption", { className:"rcm-tiled-favicon" }, tTable); // Needed for CSS background.
		var tTbody = Utils.newElement("tbody", {}, tTable); // tbody is needed for $.makeCollapsible() to work.
		var tRow = Utils.newElement("tr", {}, tTbody);
		Utils.newElement("td", { innerHTML:this.newest.wikiInfo.getFaviconHTML(true) }, tRow);
		var td1 = Utils.newElement("td", {}, tRow);
			Utils.newElement("span", { className:"mw-collapsible-toggle", innerHTML:''
				+'<span class="mw-rc-openarrow"><a title="'+i18n.RC_TEXT["rc-enhanced-expand"]+'">'// href="#"
					+'<img width="12" height="12" title="'+i18n.RC_TEXT["rc-enhanced-expand"]+'" alt="+" src="http://slot1.images.wikia.nocookie.net/__cb1422546004/common/skins/common/images/Arr_r.png">'
				+'</a></span>'
				+'<span class="mw-rc-closearrow"><a title="'+i18n.RC_TEXT["rc-enhanced-hide"]+'">'// href="#"
						+'<img width="12" height="12" title="'+i18n.RC_TEXT["rc-enhanced-hide"]+'" alt="-" src="http://slot1.images.wikia.nocookie.net/__cb1422546004/common/skins/common/images/Arr_d.png">'
				+'</a></span>' }, td1);
		Utils.newElement("td", { className:"mw-enhanced-rc", innerHTML:""
			+this._getFlags(this.oldest, "&nbsp;", { ignoreminoredit:true })
			+"&nbsp;"
			+this.newest.time()
			+"&nbsp;"
		}, tRow);
		Utils.newElement("td", { innerHTML:html }, tRow);
		
		this.addPreviewDiffListener(tTable.querySelector(".rcm-ajaxDiff"), this.oldest, this.newest);
		this.addPreviewImageListener(tTable.querySelector(".rcm-ajaxImage"), this.list);
		
		return tTable;
	};
	
	// The individual lines of a RC "group"
	RCList.prototype._toHTMLBlockLine = function(pRC) {
		var html = "";
		
		switch(pRC.type) {
			case RCData.TYPE.LOG: {
				html += "<span class='mw-enhanced-rc-time'>"+pRC.time()+"</span>"
				if(pRC.logtype=="upload") { html += this.getAjaxImageButton(); }
				html += SEP;
				html += pRC.logActionText();
				break;
			}
			case RCData.TYPE.WALL:
			case RCData.TYPE.BOARD: {
				if(pRC.isWallBoardAction) {
					html += "<span class='mw-enhanced-rc-time'>"+pRC.time()+"</span>"
					html += SEP;
					html += pRC.userDetails();
					html += pRC.wallBoardActionMessageWithSummary( this.getThreadTitle() );
				} else {
					html += "<span class='mw-enhanced-rc-time'><a href='"+pRC.href+"' title='"+pRC.title+"'>"+pRC.time()+"</a></span>";
					html += " (<a href='"+pRC.href+"'>"+i18n.RC_TEXT["cur"]+"</a>";
					if(pRC.isNewPage == false) {
						html += i18n.RC_TEXT["pipe-separator"]+"<a href='"+this.getDiffLink(pRC, pRC)+"'>"+i18n.RC_TEXT["last"]+"</a>"+this.getAjaxDiffButton();
					}
					html += ")";
					html += SEP;
					html += this._diffSizeText(pRC);
					html += SEP;
					html += pRC.userDetails();
					html += pRC.getSummary();
				}
				break;
			}
			case RCData.TYPE.COMMENT:
			case RCData.TYPE.NORMAL: {
				html += "<span class='mw-enhanced-rc-time'><a href='"+this.getLink(pRC, null, pRC.revid)+"' title='"+pRC.title+"'>"+pRC.time()+"</a></span>"
				html += " (<a href='"+this.getLink(pRC, 0, pRC.revid)+"'>"+i18n.RC_TEXT["cur"]+"</a>";
				if(pRC.isNewPage == false) {
					html += i18n.RC_TEXT["pipe-separator"]+"<a href='"+this.getLink(pRC, pRC.revid, pRC.old_revid)+"'>"+i18n.RC_TEXT["last"]+"</a>"+this.getAjaxDiffButton();
				}
				html += ")";
				html += SEP;
				html += this._diffSizeText(pRC);
				html += SEP;
				html += pRC.userDetails();
				html += pRC.getSummary();
				break;
			}
		}
		
		var tRow = Utils.newElement("tr", { style:"display: none;" });
		Utils.newElement("td", {}, tRow); // Blank spot for where favicon would be on a normal table
		Utils.newElement("td", {}, tRow); // Blank spot for where collapsing arrow would be on the table
		Utils.newElement("td", { className:"mw-enhanced-rc", innerHTML:""
			+this._getFlags(pRC, "&nbsp;")
			+"&nbsp;"
		}, tRow);
		Utils.newElement("td", { className:"mw-enhanced-rc-nested", innerHTML:html }, tRow);
		
		this.addPreviewDiffListener(tRow.querySelector(".rcm-ajaxDiff"), pRC);
		this.addPreviewImageListener(tRow.querySelector(".rcm-ajaxImage"), pRC);
		
		return tRow;
	};
	
	RCList.prototype._toHTMLNonEnhanced = function(pRC, pIndex) {
		var html = "";
		switch(pRC.type) {
			case RCData.TYPE.LOG: {
				html += pRC.logTitleText();
				if(pRC.logtype=="upload") { html += this.getAjaxImageButton(); }
				html += i18n.RC_TEXT["semicolon-separator"]+pRC.time();
				html += SEP;
				html += pRC.logActionText();
				break;
			}
			case RCData.TYPE.WALL:
			case RCData.TYPE.BOARD: {
				if(pRC.isWallBoardAction) {
					html += pRC.wallBoardHistoryLink();
					html += i18n.RC_TEXT["semicolon-separator"]+pRC.time();
					html += SEP;
					html += pRC.userDetails();
					html += pRC.wallBoardActionMessageWithSummary( this.getThreadTitle() );
				} else {
					html += this._diffHist(pRC);
					html += SEP;
					html += this._getFlags(pRC, "")+" ";
					html += pRC.wallBoardTitleText();
					html += i18n.RC_TEXT["semicolon-separator"]+pRC.time();
					html += SEP;
					html += this._diffSizeText(pRC);
					html += SEP;
					html += pRC.userDetails();
					html += pRC.getSummary();
				}
				break;
			}
			case RCData.TYPE.COMMENT:
			case RCData.TYPE.NORMAL:
			default: {
				html += this._diffHist(pRC);
				html += SEP;
				html += this._getFlags(pRC, "")+" ";
				html += pRC.pageTitleTextLink();
				html += i18n.RC_TEXT["semicolon-separator"]+pRC.time();
				html += SEP;
				html += this._diffSizeText(pRC);
				html += SEP;
				html += pRC.userDetails();
				html += pRC.getSummary();
				break;
			}
		}
		
		var tLi = Utils.newElement("li", { className:(pIndex%2==0 ? "mw-line-even" : "mw-line-odd")+" "+pRC.wikiInfo.rcClass });
		Utils.newElement("div", { className:'rcm-tiled-favicon' }, tLi);;
		tLi.innerHTML += pRC.wikiInfo.getFaviconHTML(true);
		tLi.innerHTML += html;
		
		this.addPreviewDiffListener(tLi.querySelector(".rcm-ajaxDiff"), pRC);
		this.addPreviewImageListener(tLi.querySelector(".rcm-ajaxImage"), pRC);
		
		return tLi;
	};
	
	RCList.prototype.toHTML = function(pIndex) {
		if(this.manager.rcParams.hideenhanced) {
			return this._toHTMLNonEnhanced(this.newest, pIndex);
		} else {
			if(this.list.length > 1) {
				return this._toHTMLBlock();
			} else {
				return this._toHTMLSingle(this.newest);
			}
		}
	};
	
	//######################################
	// Static methods
	//######################################
	// RCList.ajaxRollback = function(pScriptDir, pVersion, pPageName, pPageID, pRollbackLink) {
	// 	var tAPiUrl = pScriptDir+"/api.php?", isV1_24Plus = Utils.version_compare(pVersion, "1.24", ">=");
	// 	if(isV1_24Plus) {
	// 		tAPiUrl += "action=query&meta=tokens&type=rollback";
	// 	} else {
	// 		tAPiUrl += "action=query&prop=revisions&format=json&rvtoken=rollback&titles="+Utils.escapeCharactersLink(pPageName)
	// 	}
		
	// 	$.ajax({ type: 'GET', dataType: 'jsonp', data: {}, url:tAPiUrl,
	// 		success: function(pData) {
	// 			var tToken = "";
	// 			if(isV1_24Plus) {
	// 				tToken = pData.query.tokens.rollbacktoken;
	// 			} else {
	// 				tToken = pData.query.pages[pPageID].revisions[0].rollbacktoken;
	// 			}
	// 			console.log(pRollbackLink+tToken);
	// 		},
	// 		error: function(pData) {
				
	// 		},
	// 	});
	// }
	
	return RCList;
	
})(window.jQuery, document, window.mediaWiki, window.dev.RecentChangesMultiple, window.dev.RecentChangesMultiple.RCData, window.dev.RecentChangesMultiple.Utils, window.dev.RecentChangesMultiple.i18n);
//</syntaxhighlight>