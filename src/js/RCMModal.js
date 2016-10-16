//<syntaxhighlight lang="javascript">
	
//######################################
// #### Modal Manager ####
// This is a STATIC class. This is a helper class for using Wikia modals, as RCM has some specific requirements.
//######################################
window.dev.RecentChangesMultiple.RCMModal = (function($, document, mw, module, Utils, i18n){
	"use strict";
	
	RCMModal.MODAL_ID = "rcm-modal";
	RCMModal.MODAL_CONTENT_ID = "rcm-modal-content";
	RCMModal.modal = null;
	
	// Constructor
	function RCMModal(pWikiInfo, pManager) {}
	
	// pData = { title:String, content:String, rcm_buttons:Array<{ value:String, event:String, callback:Event->Void, closeOnClick:Boolean=true }>, rcm_onModalShown:Void->Void, vars:Object }
	// 'vars' is same as `wikia.ui.factory` modal.
	RCMModal.showModal = function(pData) {
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
		
		createModalComponent(tModalDataOptions, function(modal) {
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
	
	function createModalComponent(pData, pCallback) {
		require(['wikia.ui.factory'], function(ui) {
			ui.init(['modal']).then(function(modal) {
				modal.createComponent(pData, function(obj){
					RCMModal.modal = obj;
					obj.bind("close", function(e) { RCMModal.modal = null; });
					pCallback(obj);
				});
			});
		});
	}
	
	// Give same title and buttons as showModal()
	RCMModal.showLoadingModal = function(pData) {
		// While we are waiting for results, open diff window to acknowledge user's input
		if (!RCMModal.isModalOpen()) {
			pData.content = "<div style='text-align:center; padding:10px;'><img src='"+module.LOADER_IMG+"'></div>";
			RCMModal.showModal(pData);
		}
	}

	RCMModal.isModalOpen = function() {
		return !!RCMModal.modal;
	}

	RCMModal.closeModal = function() {
		if(RCMModal.isModalOpen()) {
			RCMModal.modal.trigger("close");
		}
	}
	
	return RCMModal;

})(window.jQuery, document, window.mediaWiki, window.dev.RecentChangesMultiple, window.dev.RecentChangesMultiple.Utils, window.dev.RecentChangesMultiple.i18n);
//</syntaxhighlight>
