import ConstantsApp from "./ConstantsApp";
import Utils from "./Utils";
import i18n from "./i18n";

let $ = (<any>window).jQuery;
let mw = (<any>window).mediaWiki;

interface ModalProp {
	title?:string,
	content?:string,
	vars?:any,
	rcm_buttons?:{ value:string, event:string, closeOnClick?:boolean, callback?:(any)=>void }[],
	rcm_onModalShown?:()=>void,
}

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
	
	// pData = { title:String, content:String, rcm_buttons:Array<{ value:String, event:String, callback:Event->Void, closeOnClick:Boolean=true }>, rcm_onModalShown:Void->Void, vars:Object }
	// 'vars' is same as `wikia.ui.factory` modal.
	static showModal(pData:ModalProp) : void {
		// Re-open modal so that it gets re-positioned based on new content size.
		RCMModal.closeModal();
		
		// Prepare content for modal
		var tModalDataOptions = { type: "default", vars: $.extend({
			id: RCMModal.MODAL_ID,
			title: pData.title,
			content: '<div id="'+RCMModal.MODAL_CONTENT_ID+'">'+pData.content+'</div>', // style="max-height:'+(($(window).height() - 220) + "px")+';"
			size: 'auto',
			buttons: [],
		}, pData.vars) };
		var tModalData = tModalDataOptions.vars;
		
		tModalData.buttons.unshift({vars:{
			value: i18n('flags-edit-modal-close-button-text'),
			data: { key:"event", value:"close_button" },
		}});
		if(pData.rcm_buttons) {
			pData.rcm_buttons.forEach(function(o, i, a){
				tModalData.buttons.push({vars:{
					value: o.value,
					classes: [ 'normal', 'primary' ],
					data: { key:"event", value:o.event },
				}});
			});
		}
		
		RCMModal.createModalComponent(tModalDataOptions, function(modal) {
			// cancel - user clicked 'Cancel'
			modal.bind("close_button", function(e) { modal.trigger("close"); });
			if(pData.rcm_buttons) {
				pData.rcm_buttons.forEach(function(o, i, a){
					if(o.event && o.callback) {
						modal.bind(o.event, function(e){
							o.callback(e);
							if(o.closeOnClick !== false) { modal.trigger("close"); }
						});
					}
				});
			}
			
			// show modal
			modal.show();
			if(pData.rcm_onModalShown) {
				// setTimeout(pData.rcm_onModalShown, 100);
				pData.rcm_onModalShown();
			}
		});
	}
	
	private static createModalComponent(pData:any, pCallback:(any)=>void) : void {
		if(RCMModal.modalFactory) {
			RCMModal.createModalComponentWithExistingFactory(pData, pCallback);
		} else {
			(<any>window).require(['wikia.ui.factory'], function(ui) {
				ui.init(['modal']).then(function(modal) {
					RCMModal.modalFactory = modal;
					RCMModal.createModalComponentWithExistingFactory(pData, pCallback);
				});
			});
		}
	}
	
	private static createModalComponentWithExistingFactory(pData:any, pCallback:(any)=>void) : void {
		RCMModal.modalFactory.createComponent(pData, function(obj){
			RCMModal.modal = obj;
			obj.bind("close", function(e) { RCMModal.modal = null; });
			pCallback(obj);
		});
	}
	
	// Give same title and buttons as showModal()
	static showLoadingModal(pData:ModalProp, pOnModalShown:()=>void) : void {
		// While we are waiting for results, open diff window to acknowledge user's input
		if (!RCMModal.isModalOpen()) {
			pData.content = "<div style='text-align:center; padding:10px;'>"+ConstantsApp.getLoaderLarge()+"</div>";
			pData.rcm_onModalShown = pOnModalShown;
			RCMModal.showModal(pData);
		}
	}
	
	static setModalContent(pHTML:string) : void {
		document.querySelector("#"+RCMModal.MODAL_CONTENT_ID).innerHTML = pHTML;
	}

	static isModalOpen() : boolean {
		return !!RCMModal.modal;
	}

	static closeModal() : void {
		if(RCMModal.isModalOpen()) {
			RCMModal.modal.trigger("close");
		}
	}
}
