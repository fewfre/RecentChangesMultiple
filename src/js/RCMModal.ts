import Global from "./Global";
import i18n from "./i18n";

let $ = window.jQuery;
let mw = window.mediaWiki;

interface RCMModalProp {
	title?:string,
	content?:string,
	// vars?:any,
	buttons?:{ text:string, event:string, callback:(any)=>void, closeOnClick?:boolean }[],
	rcm_onModalShown?:()=>void,
}

interface ModalJsProp {
	id: string,
	title: string, isHTML?:boolean,
	content: string,
	size: "small"|"medium"|"large"|"larger"|"content-size",
	
	buttons?: ModalJsButtonProp[],
	events?: ModalJsEventMap,
	
	close: ()=>void,
}
interface ModalJsButtonProp { text:string, event:string, classes?:string[], normal?:boolean, primary?:boolean }
interface ModalJsEventMap { [event:string]:(...args)=>void }

//######################################
// #### Modal Manager ####
// This is a STATIC class. This is a helper class for using Wikia modals, as RCM has some specific requirements.
//######################################
export default class RCMModal
{
	static readonly MODAL_ID = "rcm-modal";
	static readonly MODAL_CONTENT_ID = "rcm-modal-content";
	static modalFactory = null;
	static modal = null;
	static isOpen = false;
	
	// Load factory and create modal for later use
	static init() : void {
		mw.hook('dev.modal').add(function(module) {
			RCMModal.modalFactory = module;
		});
		if(Global.isUcpWiki) {
			try {
				// At this time the Modal.js script doesn't trigger close callback correctly, so manually calling it here
				window.dev.modal._windowManager.on("closing", function(modal){
					if(modal.elementId == RCMModal.MODAL_ID) {
						RCMModal.isOpen = false;
					}
				});
			}
			catch(e){}
		}
	}
	
	private static async createModal(pData:ModalJsProp) : Promise<any> {
		// mw.log("[RCMModal](createModal)", pData);
		return new Promise(function(resolve){
			RCMModal.clearModalCache();
			// Create a new Modal
			let modalBase = new RCMModal.modalFactory.Modal(pData);
			modalBase.create().then(function(modal){
				RCMModal.modal = modal;
				resolve(modal);
			});
		});
	}
	
	// Delete the cached modal that Modal.js uses - not a good feature for this script
	private static clearModalCache() {
		delete RCMModal.modalFactory.modals[RCMModal.MODAL_ID];
		$(`#${RCMModal.MODAL_ID}, #blackout_${RCMModal.MODAL_ID}`).remove();
	}
	
	// pData = { title:String, content:String, rcm_buttons:Array<{ value:String, event:String, callback:Event->Void, closeOnClick:Boolean=true }>, rcm_onModalShown:Void->Void, vars:Object }
	// 'vars' is same as `wikia.ui.factory` modal.
	static async showModal(pData:RCMModalProp) : Promise<void> {
		// Re-open modal so that it gets re-positioned based on new content size.
		RCMModal.closeModal();
		RCMModal.isOpen = true;
		
		let buttons:ModalJsButtonProp[] = [], events:ModalJsEventMap = {};
		
		// Close button
		buttons.push({
			text: i18n('modal-close'),
			event: "close_button",
			normal: false, primary: false,
		});
		events["close_button"] = function(){ RCMModal.modal.close(); };
		
		// Optional buttons + events
		pData.buttons && pData.buttons.forEach(function(o, i, a){
			buttons.push({ text: o.text, event:o.event, normal: true, primary: true });
			if(o.closeOnClick !== false) {
				events[o.event] = function(e){
					o.callback(e);
					RCMModal.modal.close();
				};
			} else {
				events[o.event] = o.callback;
			}
		});
		
		// Update/Show modal
		let modal = await RCMModal.createModal({
			id: RCMModal.MODAL_ID,
			size: Global.isUcpWiki ? 'larger' : 'content-size',
			close: function(){ RCMModal.isOpen = false; return true; },
			
			title: pData.title,
			content: `<div id="${RCMModal.MODAL_CONTENT_ID}">${pData.content}</div>`, // style="max-height:'+(($(window).height() - 220) + "px")+';"
			buttons,
			events,
		});
		modal.show();
		return;
	}
	
	// Give same title and buttons as showModal()
	static async showLoadingModal(pData:RCMModalProp) : Promise<void> {
		// While we are waiting for results, open loading window to acknowledge user's input
		// if (!RCMModal.isModalOpen()) {
			pData.content = "<div style='text-align:center; padding:10px;'>"+Global.getLoaderLarge()+"</div>";
			await RCMModal.showModal(pData);
		// }
	}
	
	static setModalContent(pHTML:string) : void {
		// try {
		// 	// Don't set it if it has been closed
		// 	if(!RCMModal.modal) { return; }
		// 	RCMModal.modal
		// 		.setContent('<div id="'+RCMModal.MODAL_CONTENT_ID+'">'+pHTML+'</div>')
		// 		.show()
		// 	;
		// } catch(e) {
			document.querySelector("#"+RCMModal.MODAL_CONTENT_ID).innerHTML = pHTML;
		// }
		
		// Update window size to fit new content
		if(Global.isUcpWiki) {
			try {
				window.dev.modal._windowManager.windows[RCMModal.MODAL_ID].updateSize();
			}
			catch(e){}
		}
	}

	static isModalOpen() : boolean {
		// mw.log("(isModalOpen)", RCMModal.modal != null , RCMModal.isOpen);
		return RCMModal.modal != null && RCMModal.isOpen;
	}

	static closeModal() : void {
		if(RCMModal.isModalOpen()) {
			RCMModal.modal.close();
		}
	}
}
