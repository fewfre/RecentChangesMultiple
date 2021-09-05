import Utils from './Utils';
import i18n, {I18nKey} from "./i18n";
import Global from "./Global";
import RCMModal from "./RCMModal";
import WikiData from './WikiData';
import { RCDataAbstract, RCDataArticle, RCDataFandomDiscussion } from './rc_data';
import { JsonModelDataProps } from './rc_data/RCDataFandomDiscussion';

let mw = window.mediaWiki;

//########################################################
// #### GlobalModal - static class for general modals ####
//########################################################

// https://www.mediawiki.org/wiki/API:Revisions
// Inspired by http://dev.fandom.com/wiki/AjaxDiff / http://dev.fandom.com/wiki/LastEdited
interface DiffTableInfoProp {
	wikiInfo: WikiData;
	titleUrlEscaped: string;
	newRev: { user:string, summary:string, date:Date, minor:boolean }
}
// Note: don't pass the RCData object directly, as it may have been deleted between the time this is called and content is loaded
export function previewDiff(pPageName:string, pageID:string|number, pAjaxUrl:string, pDiffLink:string, pUndoLink:string, pDiffTableInfo:DiffTableInfoProp) : void {
	Utils.logUrl("(previewDiff)", pAjaxUrl); mw.log(pDiffLink); mw.log(pUndoLink);
	
	var tTitle = `${pPageName} - ${i18n('modal-diff-title')}`;
	// Need to push separately since undo link -may- not exist (Wikia style forums sometimes).
	var tButtons = [];
	tButtons.push(modalLinkButton('modal-diff-open', "diff", pDiffLink));
	if(pUndoLink != null) {
		tButtons.push(modalLinkButton('modal-diff-undo', "undo", pUndoLink));
	}
	
	const getRcUrl=(params?:{ [key:string]:string|number }) => pDiffTableInfo.wikiInfo.getPageUrl(pDiffTableInfo.titleUrlEscaped, params);
	
	RCMModal.showLoadingModal({ title:tTitle, buttons:tButtons }).then(() => {
		// Retrieve the diff table.
		// TODO - error support?
		$.ajax({ type: 'GET', dataType: 'jsonp', data: {}, url: pAjaxUrl }).then(function (pData) {
			if(!RCMModal.isModalOpen()) { return; }
			var tPage = pData.query.pages[pageID];
			var tRevision = tPage.revisions[0];
			
			// mw.log("Rollback: ", pRollbackLink, pData.query.tokens?.rollbacktoken, tPage.lastrevid, tRevision.diff.to, pData);
			// if(pRollbackLink != null && pData.query.tokens?.rollbacktoken && tPage.lastrevid == tRevision.diff.to) {
			// 	tButtons.splice(tButtons.length-2, 0, {
			// 		value: i18n('rollbacklink'),
			// 		event: "rollback",
			// 		callback: () => { window.open(pRollbackLink+tRevision.rollbacktoken, '_blank'); },
			// 	});
			// }
			
			var tOMinor = tRevision.minor == "" ? `<abbr class="minoredit">${i18n('minoreditletter')}</abbr> ` : "";
			var tNMinor = pDiffTableInfo.newRev.minor ? `<abbr class="minoredit">${i18n('minoreditletter')}</abbr> ` : "";
			let tRevDate = new Date(tRevision.timestamp);
			let tNewRevDate = pDiffTableInfo.newRev.date;
			// TODO: Find out if new revision is most recent, and have timestamp message show the "most recent revision" message. Also make edit button not have "oldid" in the url.
			var tModalContent = [
			"<div id='rcm-diff-view'>",
			"<table class='diff'>",
				"<colgroup>",
					"<col class='diff-marker'>",
					"<col class='diff-content'>",
					"<col class='diff-marker'>",
					"<col class='diff-content'>",
				"</colgroup>",
				"<tbody>",
					"<tr class='diff-header' valign='top'>",
						"<td class='diff-otitle' colspan='2'>",
							"<div class='mw-diff-otitle1'>",
								"<strong>",
									"<a href='"+getRcUrl({ oldid:tRevision.diff.from })+"' data-action='revision-link-before'>",
										i18n('revisionasof', Utils.formatWikiTimeStamp(tRevDate), Utils.formatWikiTimeStampDateOnly(tRevDate), Utils.formatWikiTimeStampTimeOnly(tRevDate)),
									"</a>",
									" <span class='mw-rev-head-action'>",
										`(<a href="${getRcUrl({ oldid:tRevision.diff.from, action:'edit' })}" data-action="edit-revision-before">${i18n('editold')}</a>)`,
									"</span>",
								"</strong>",
							"</div>",
							"<div class='mw-diff-otitle2'>"+RCDataArticle.formatUserDetails(pDiffTableInfo.wikiInfo, tRevision.user, tRevision.userhidden == "", tRevision.anon != "")+"</div>",
							"<div class='mw-diff-otitle3'>"+tOMinor+RCDataAbstract.renderSummary(RCDataArticle.tweakParsedComment(tRevision.parsedcomment, tRevision.commenthidden == "", pDiffTableInfo.wikiInfo))+"</div>",
							// +"<div class='mw-diff-otitle4'></div>",
						"</td>",
						"<td class='diff-ntitle' colspan='2'>",
							"<div class='mw-diff-ntitle1'>",
								"<strong>",
									"<a href='"+getRcUrl({ oldid:tRevision.diff.to })+"' data-action='revision-link-after'>",
										i18n('revisionasof', Utils.formatWikiTimeStamp(tNewRevDate), Utils.formatWikiTimeStampDateOnly(tNewRevDate), Utils.formatWikiTimeStampTimeOnly(tNewRevDate)),
									"</a>",
									" <span class='mw-rev-head-action'>",
										`(<a href="${getRcUrl({ oldid:tRevision.diff.to, action:'edit' })}" data-action="edit-revision-after">${i18n('editold')}</a>)`,
									"</span>",
									"<span class='mw-rev-head-action'>",
										`(<a href="${getRcUrl({ action:'edit', undoafter:tRevision.diff.to, undo:tRevision.diff.to })}" data-action="undo">${i18n('editundo')}</a>)`,
									"</span>",
								"</strong>",
							"</div>",
							"<div class='mw-diff-ntitle2'>"+pDiffTableInfo.newRev.user+"</div>",
							"<div class='mw-diff-ntitle3'>"+tNMinor+pDiffTableInfo.newRev.summary+"</div>",
							// "<div class='mw-diff-ntitle4'></div>",
						"</td>",
					"</tr>",
					tRevision.diff["*"],
				"</tbody>",
			"</table>",
			"</div>",
			].join("");
			// RCMModal.showModal({ title:tTitle, content:tModalContent, rcm_buttons:tButtons });
			RCMModal.setModalContent(tModalContent);
		});
	});
}

// https://www.mediawiki.org/wiki/API:Imageinfo
// TODO - error support?
export function previewImages(pAjaxUrl:string, pImageNames:string[], pArticlePath:string) : void {
	let tImagesInLog = pImageNames.slice();
	const size = 210; // Must match in CSS - Logic: (1000-~40[for internal wrapper width]) / 4 - (15 * 2 [padding])
	pAjaxUrl += "&iiurlwidth="+size+"&iiurlheight="+size;
	let tCurAjaxUrl = pAjaxUrl + "&titles="+tImagesInLog.splice(0, 50).join("|");
	
	Utils.logUrl("(previewImages)", tCurAjaxUrl, pImageNames);
	
	let tTitle = i18n("images");
	let tButtons = [];
	
	let tAddLoadMoreButton = () => {
		if(tImagesInLog.length > 0) {
			mw.log("Over 50 images to display; Extra images must be loaded later.");
			let tModal = document.querySelector("#"+RCMModal.MODAL_CONTENT_ID);
			let tGallery = tModal.querySelector(".rcm-gallery");
			let tCont = Utils.newElement("center", { style:'margin-bottom: 8px;' }, tModal);
			let tButton = Utils.newElement("button", { innerHTML:i18n('modal-gallery-load-more') }, tCont);
			
			tButton.addEventListener("click", () => {
				tCurAjaxUrl = pAjaxUrl + "&titles="+tImagesInLog.splice(0, 50).join("|");
				Utils.logUrl("(previewImages) click", tCurAjaxUrl);
				tCont.innerHTML = Global.getLoader(25);
				
				$.ajax({ type: 'GET', dataType: 'jsonp', data: {}, url: tCurAjaxUrl }).then(function(pData) {
					Utils.removeElement(tCont);
					tGallery.innerHTML += previewImages_getGalleryItemsFromData(pData.query.pages, pArticlePath, size);
					tAddLoadMoreButton();
				});
			});
		}
	}
	
	RCMModal.showLoadingModal({ title:tTitle, buttons:tButtons }).then(() => {
		$.ajax({ type: 'GET', dataType: 'jsonp', data: {}, url: tCurAjaxUrl }).then(function(pData) {
			if(!RCMModal.isModalOpen()) { return; }
			let tModalContent = ''
			+'<div class="rcm-gallery wikia-gallery wikia-gallery-caption-below wikia-gallery-position-center wikia-gallery-spacing-medium wikia-gallery-border-small wikia-gallery-captions-center wikia-gallery-caption-size-medium">'
				+previewImages_getGalleryItemsFromData(pData.query.pages, pArticlePath, size)
			+'</div>';
			
			RCMModal.setModalContent(tModalContent);
			tAddLoadMoreButton();
		});
	});
}
function previewImages_getGalleryItemsFromData(pData:any, pArticlePath:string, pSize:number) : string {
	let tReturnText = "";
	for(let key in pData) {
		tReturnText += previewImages_getGalleryItem(pData[key], pArticlePath, pSize);
	}
	return tReturnText;
}
function previewImages_getGalleryItem(pPage:any, pArticlePath:string, pSize:number) : string {
	let tTitle:string = pPage.title,
		tPageTitleNoNS = tTitle.indexOf(":") > -1 ? tTitle.split(":")[1] : tTitle,
		tImage = pPage.imageinfo ? pPage.imageinfo[0] : null,
		tInvalidImage:{ thumbHref:string, thumbText:string } = null
	;
	if(pPage.missing == "") {
		tInvalidImage = {
			thumbHref: pArticlePath+Utils.escapeCharactersUrl(tTitle),
			thumbText: i18n('filedelete-success', tTitle)
		};
	} else if(tImage == null) {
		tInvalidImage = {
			thumbHref: pArticlePath+Utils.escapeCharactersUrl(tTitle),
			thumbText: i18n('redirectto')+" "+tTitle
		};
	} else if(Utils.isFileAudio(tTitle)) {
		tInvalidImage = {
			thumbHref: tImage.url,
			thumbText: '<img src="/extensions/OggHandler/play.png" height="22" width="22"><br />'+tTitle
		};
	} else if(tImage.thumburl == "" || (tImage.width == 0 && tImage.height == 0)) {
		tInvalidImage = {
			thumbHref: tImage.url,
			thumbText: tTitle
		};
	}
	
	var tRCM_galleryItemTemplate = ({ wrapperStyle, image, imageHref, imageStyle, isLightbox, caption }):string => {
		wrapperStyle = wrapperStyle ? `style="${wrapperStyle}"` : "";
		let lightBoxClass = isLightbox ? "image-no-lightbox" : "image lightbox";
		
		return '<div class="wikia-gallery-item">'
			+'<div class="thumb">'
				+`<div class="gallery-image-wrapper accent" ${wrapperStyle}>`
				+`<a class="${lightBoxClass}" href="${imageHref}" style="${imageStyle}">`
					+image
				+'</a>'
				+'</div>'
			+'</div>'
			+`<div class="lightbox-caption" style="width:100%;">${caption}</div>`
		+'</div>';
	};
	
	if(tInvalidImage) {
		// Display text instead of image
		return tRCM_galleryItemTemplate({ isLightbox:false, wrapperStyle:null,
			image:tInvalidImage.thumbText,
			imageHref:tInvalidImage.thumbHref,
			imageStyle:`height:${pSize}px; width:${pSize}px; line-height:inherit;`,
			caption: tPageTitleNoNS,
		});
	} else {
		// Returned thumb width/height calculates to fit within size requested at fetch, even if the wiki doesn't return scaled down image.
		let tOffsetY = pSize/2 - tImage.thumbheight/2;
		let tScaledWidth = tImage.thumbwidth;
		
		return tRCM_galleryItemTemplate({ isLightbox:true,
			wrapperStyle:`position: relative; width:${tScaledWidth}px; top:${tOffsetY}px;`,
			image:`<img class="thumbimage" src="${tImage.thumburl}" alt="${tTitle}">`,
			imageHref:tImage.descriptionurl,
			imageStyle:`width:${tScaledWidth}px;`,
			caption: `<a href="${tImage.descriptionurl}">${tPageTitleNoNS}</a>`
				// Icon to open link to actual image
				+` &#32; <a class="rcm-ajaxIcon" href="${tImage.url}" target="_blank">${Global.getSymbol("rcm-picture")}</a>`,
		});
	}
}

export function previewPage(pAjaxUrl, pPageName:string, pPageHref:string, pServerLink:string) : void {
	Utils.logUrl("(previewPage)", pAjaxUrl);
	
	var tTitle = `${pPageName}`;
	var tButtons = [
		modalLinkButton('modal-preview-openpage', "view", pPageHref),
	];
	RCMModal.showLoadingModal({ title:tTitle, buttons:tButtons }).then(() => {
		// TODO - error support?
		$.ajax({ type: 'GET', dataType: 'jsonp', data: {}, url: pAjaxUrl }).then(function(pData) {
			if(!RCMModal.isModalOpen()) { return; }
			var tContentText = pData.parse.text["*"];
			
			var tModalContent = ''
			+"<div class='ArticlePreview'>"
			+"<div class='ArticlePreviewInner'>"
			+"<div class='WikiaArticle'>"
			+"<div id='mw-content-text'>"
				+ tContentText
			+"</div>"
			+"</div>"
			+"</div>"
			+"</div>";
			
			RCMModal.setModalContent(tModalContent);
			let tModalCont:HTMLElement = <HTMLElement>document.querySelector("#"+RCMModal.MODAL_CONTENT_ID);
			let tCont:HTMLElement = <HTMLElement>document.querySelector(`#${RCMModal.MODAL_CONTENT_ID} #mw-content-text`);
			if((<any>tCont).attachShadow) {
				// Setup Shadow dom
				tModalCont.innerHTML = "";
				tModalCont = (<any>tModalCont).attachShadow({ mode:"open" });
				tModalCont.innerHTML = tModalContent;
				tCont = <HTMLElement>tModalCont.querySelector("#mw-content-text");
				tCont.innerHTML = "";
				
				// This is done up here for a really dumb reason:
				// Even though tPreviewHead is never added to the page right away, simply parsing head data into the dom
				// is enough to let it override the favicon. Rather than try and replace it in string form
				// (defeating the purpose of us parsing it like this), moving it up here simply lets tCurPageHead (right below)
				// immediately re-update the favicon back to correct one. hacky workaround for hacky problem; yay!
				let tPreviewHead = Utils.newElement("div", { innerHTML:pData.parse.headhtml["*"] });
				
				// Convert <link> tags (not supported in shadow dom) to <style> tags via @import (bad, but neccisary)
				// Do it for current wiki head first (since shadow dom strips all css)
				let tCurPageHead = <HTMLElement>document.querySelector("head").cloneNode(true);
				Utils.forEach(tCurPageHead.querySelectorAll("link[rel=stylesheet]"), (o, i, a) => {
					tCont.innerHTML += "<style> @import url("+o.href+"); </style>";//o.outerHTML;
				});
				// Prevent warnings from poping up about shadow dom not supporting <link>.
				Utils.forEach(tCurPageHead.querySelectorAll("link"), (o, i, a) => { Utils.removeElement(o); });
				
				// Add page info
				Utils.forEach(tPreviewHead.querySelectorAll("link[rel=stylesheet]"), (o, i, a) => {
					tCont.innerHTML += "<style> @import url("+o.href+"); </style>";//o.outerHTML;
				});
				// Prevent warnings from poping up about shadow dom not supporting <link>.
				Utils.forEach(tPreviewHead.querySelectorAll("link"), (o, i, a) => { Utils.removeElement(o); });
				
				tCont.innerHTML += tCurPageHead.innerHTML;
				tCont.innerHTML += "\n<!-- Loaded Wiki Styles -->\n";
				tCont.innerHTML += tPreviewHead.innerHTML;
				tCont.innerHTML += tContentText;
			}
			// Using scoped styles is only intended as a fallback since not many browsers yet allow modifying the shadow dom.
			else if("scoped" in document.createElement("style")) {
				let tPreviewHead = Utils.newElement("div", { innerHTML:pData.parse.headhtml["*"] });
				Utils.forEach(tPreviewHead.querySelectorAll("link[rel=stylesheet]"), (o, i, a) => {
					tCont.innerHTML += "<style scoped> @import url("+o.href+"); </style>";//o.outerHTML;
				});
			}
			// Fix all local links to point to wiki.
			Utils.forEach(tCont.querySelectorAll("a[href^='/']"), (o, i, a) => {
				o.href = pServerLink + o.getAttribute("href");
			});
			mw.hook('wikipage.content').fire($(tCont)); // Makes sure infoboxes tabs/section collapsing works.
		});
	});
}

export function previewDiscussionHTML(rc:RCDataFandomDiscussion) : void {
	const { jsonModel, attachments, poll } = rc.previewData;
	let html = "";
	
	if(poll) {
		const { answers, question, totalVotes } = poll;
		const isImagePoll = !!answers?.[0]?.image;
		const customStyles = {
			poll__answers:"display: flex; align-items: flex-end; flex-wrap: wrap; text-align: center;",
			imageCont:"width: 175px; height: 175px; position: relative;",
			image:"object-fit: cover; height: 100%; left: 0; position: absolute; top: 0; width: 100%;",
		};
		html = `
		<section class="post-info">
			<header class="post-info__title" role="presentation" itemprop="headline">
				<!-- <a class="post-info__title-link" href="/f/p/${rc.threadId}">${question}</a> -->
				<big class="post-info__title-link">${question}</big>
			</header>
			<div>
				<div class="${isImagePoll ? 'image-poll' : 'post-poll'}" itemscope="" itemtype="http://schema.org/Question">
					${!isImagePoll
					? `
						${answers.map(ans=>`
						<div class="post-poll__answer" role="presentation" itemscope="" itemtype="http://schema.org/Answer">
							<span class="post-poll__text" itemprop="text">${ans.text}</span>
							<span class="post-poll__votes" itemprop="upvoteCount">${Math.floor(ans.votes / totalVotes)}%</span>
						</div>
						`).join("")}
					`
					: `
					<div class="image-poll__answers image-poll__answers-4" style="${customStyles.poll__answers}">
						${answers.map(ans=>`
						<div class="image-poll__answer" role="presentation" itemscope="" itemtype="http://schema.org/Answer">
							<div class="image-poll__image-wrapper"  style="${customStyles.imageCont}">
								<img class="image-poll__image" style="${customStyles.image}" sizes="(max-width: 420px) 180px, 370px" src="${ans.image?.url}" alt="" loading="lazy">
							</div>
							<div class="image-poll__gradient-wrapper"></div>
							<span class="image-poll__text" itemprop="text">${ans.text}</span>
						</div>
						`).join("")}
					</div>
					`}
					<div class="post-poll__vote">
						<p class="post-poll__total-votes" itemprop="answerCount" role="presentation">${totalVotes} Votes in Poll</p>
					</div>
				</div>
			</div>
		</section>
		`;
	} else {
		// jsonModel makes heavy use of recursive data types, so lots of recursion in this
		const jsonModelDataToString=(props:JsonModelDataProps):string => {
			const recur = (content?:JsonModelDataProps[]) => content?.map(jsonModelDataToString).join("");
			switch(props.type) {
				case "doc": return `<div class="entity-content">${recur(props.content) ?? ""}</div>`;
				case "paragraph": return `<p>${recur(props.content) ?? "<br />"}</p>`;
				case "code_block": return `<pre><code>${recur(props.content) ?? "<br />"}</code></pre>`;
				
				case "bulletList": return `<ul>${recur(props.content) ?? ""}</ul>`;
				case "orderedList": return `<ol>${recur(props.content) ?? ""}</ol>`;
				case "listItem": return `<li>${recur(props.content) ?? ""}</li>`;
				
				case "image": return `<div class="post__image-wrapper"><img src="${attachments[0]?.contentImages[props.attrs.id]?.url}" style="max-width: 100%;" /></div>`;
				case "text": {
					let text = props.text ?? "";
					props.marks?.forEach(mark=>{
						switch(mark.type) {
							case 'strong': text = `<strong>${text}</strong>`; break;
							case 'em': text = `<em>${text}</em>`; break;
							case 'link': text = `<a href="${mark.attrs.href}" ${mark.attrs.title ? `title="${mark.attrs.title}"` : ''} target="_blank">${text}</a>`; break;
						}
					});
					return text;
				}
				case "openGraph": {
					const graphData = attachments[0]?.openGraphs[props.attrs.id];
					const customStyles = {
						imageCont:"max-height: 175px; max-width: 175px;",
						post__og:"line-height:0;",
						post__og_link:"line-height:0; display: block;",
						post__og_wrapper:"border: 1px solid var(--theme-border-color);",
						post__og_summary:"white-space: normal;",
						post__og_source:"white-space: normal;",
					};
					return `<div class="post__og" style="${customStyles.post__og}">
						<a class="post__og-link" target="_blank" rel="noopener noreferrer" href="${graphData.url}" style="${customStyles.post__og_link}">
							<span class="post__og-data-wrapper" itemscope="" itemtype="http://schema.org/Article" style="${customStyles.post__og_wrapper}">
								<span class="post__og-image-container" style="${customStyles.imageCont}">
									<img class="post__og-image" style="background-image: url(&quot;${graphData.imageUrl}&quot;);" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Doodle Champion Island Games!" itemprop="image" role="presentation" loading="lazy">
								</span>
								<span class="post__og-details">
									<span class="post__og-summary" style="${customStyles.post__og_summary}">
										<span class="post__og-title" itemprop="headline">${graphData.title}</span>
									</span>
									${graphData.siteName ? `<span class="post__og-source" itemprop="publisher" style="${customStyles.post__og_source}">
										${graphData.siteName}
										<svg class="wds-icon wds-icon-tiny"><use xlink:href="#wds-icons-external-tiny"></use></svg>
									</span>` : ''}
								</span>
							</span>
						</a>
					</div>`;
				}
			}
			mw.log("RCM: Unknown discussion preview type", rc.wikiInfo.servername, props);
			return "";
		};
		
		html = jsonModelDataToString(jsonModel);
	}
	
	const title = rc.containerType != "ARTICLE_COMMENT" ? rc.getThreadTitle() : i18n("rc-comment", rc.forumName);;
	let buttons = [
		modalLinkButton('modal-preview-openpage', "view", rc.href),
	];
	RCMModal.showModal({ title, content:html, buttons });
}

//########################################################
// #### Helpers
//########################################################
function modalLinkButton(text:I18nKey,event:string,link:string) {
	return { text:i18n(text), event, callback:() => { window.open(link, '_blank'); } };
}