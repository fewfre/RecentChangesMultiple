//<syntaxhighlight lang="javascript">

//######################################
// #### Run-time Options ####
// * Custom version of RC "options" section, using url params to keep track of options.
//######################################
window.dev.RecentChangesMultiple.RCMOptions = (function($, document, mw, module, Utils, i18n){
	"use strict";
	
	function RCMOptions(pManager) {
		this.manager = pManager; // {RCMManager} Keep track of what manager this data is attached to.
		this.root = null;
		
		/***************************
		 * Data
		 ***************************/
		this.rcParams				= null;
		
		/***************************
		 * Fields
		 ***************************/
		this.limitField				= null;
		this.daysField				= null;
		
		this.minorEditsCheckbox		= null;
		this.botsCheckbox			= null;
		this.anonsCheckbox			= null;
		this.usersCheckbox			= null;
		this.myEditsCheckbox		= null;
		this.groupedChangesCheckbox	= null;
		this.logsCheckbox			= null;
	}
	
	RCMOptions.prototype.dispose = function() {
		this.removeEventListeners();
		
		this.manager = null;
		this.wikiInfo = null;
		
		this.date = null;
		this.type = null;
	}
	
	RCMOptions.prototype.init = function(pElem) {
		this.root = pElem;
		
		var tFieldset = Utils.newElement("fieldset", { className:"rcoptions collapsible" }, pElem);
		Utils.newElement("legend", { innerHTML:i18n.RC_TEXT['recentchanges-legend'] }, tFieldset);
		var tContent = Utils.newElement("div", { className:"rc-fieldset-content" }, tFieldset);
		
		// $(tFieldset).makeCollapsible();
		
		// (function($) {
  //       var checkboxes = ['nsassociated', 'nsinvert'];
  //       var $select = null ;
  //       var rc = {
  //           handleCollapsible: function(cache) {
  //               var prefix = 'rce_'
  //                 , $collapsibleElements = $('.collapsible');
  //               function toggleCollapsible($collapsible) {
  //                   $collapsible.toggleClass('collapsed');
  //                   updateCollapsedCache($collapsible);
  //               }
  //               function updateCollapsedCache($collapsible) {
  //                   var id = $collapsible.attr('id');
  //                   if (id !== null ) {
  //                       if ($collapsible.hasClass('collapsed')) {
  //                           cache.set(prefix + id, 'collapsed', cache.CACHE_LONG);
  //                       } else {
  //                           cache.set(prefix + id, 'expanded', cache.CACHE_LONG);
  //                       }
  //                   }
  //               }
  //               $collapsibleElements.each(function() {
  //                   var $this = $(this)
  //                     , id = $this.attr('id');
  //                   if (id !== null ) {
  //                       var previousState = cache.get(prefix + id);
  //                       if (!!previousState) {
  //                           if (previousState === 'collapsed') {
  //                               $this.addClass('collapsed');
  //                           } else {
  //                               $this.removeClass('collapsed');
  //                           }
  //                       }
  //                   }
  //               }
  //               );
  //               $collapsibleElements.on('click', 'legend', function(e) {
  //                   toggleCollapsible($(e.currentTarget).parent());
  //               }
  //               );
  //           },
  //           bindTracking: function(tracker) {
  //               var $trackedElement = $('#recentchanges-on-wikia-box');
  //               if ($trackedElement.length > 0) {
  //                   $trackedElement.on('mousedown', 'a', function(e) {
  //                       tracker.track({
  //                           action: tracker.ACTIONS.CLICK_LINK_TEXT,
  //                           category: 'recentchanges-on-wikia',
  //                           label: $(e.currentTarget).attr('href'),
  //                           trackingMethod: 'analytics'
  //                       });
  //                   }
  //                   );
  //               }
  //           },
  //           updateCheckboxes: function() {
  //               var isAllNS = ('' === $select.find('option:selected').val());
  //               $.each(checkboxes, function(i, id) {
  //                   $('#' + id).prop('disabled', isAllNS);
  //               }
  //               );
  //           },
  //           init: function() {
  //               $select = $('#namespace');
  //               $select.change(rc.updateCheckboxes).change();
  //               require(['wikia.cache', 'wikia.tracker'], function(cache, tracker) {
  //                   rc.handleCollapsible(cache);
  //                   rc.bindTracking(tracker);
  //               }
  //               );
  //           }
  //       };
  //       $(rc.init);
  //   }
  //   )($);
  //   ;
		
		/***************************
		 * First line of choices (numbers)
		 ***************************/
		var tRow1Text = i18n.RC_TEXT['rclinks'].split("<br />")[0].split(/\$1|\$2/);
		var tRow1 = Utils.newElement("div", {  }, tContent);
		
		Utils.addTextTo(tRow1Text[0], tRow1);
		this.limitField = Utils.newElement("select", {}, tRow1);
		Utils.addTextTo(tRow1Text[1], tRow1);
		this.daysField = Utils.newElement("select", {}, tRow1);
		Utils.addTextTo(tRow1Text[2]||"", tRow1);
		
		/***************************
		 * Second line of choices (checkboxes)
		 ***************************/
		var tRow2 = Utils.newElement("div", {  }, tContent);
		var t1Text = "";//i18n.RC_TEXT['show'];
		
		this.minorEditsCheckbox = Utils.newElement("input", { type:"checkbox" }, tRow2);
		Utils.addTextTo(Utils.wiki2html(i18n.RC_TEXT['rcshowhideminor'], t1Text), tRow2);
		
		Utils.addTextTo(" | ", tRow2);
		
		this.botsCheckbox = Utils.newElement("input", { type:"checkbox" }, tRow2);
		Utils.addTextTo(Utils.wiki2html(i18n.RC_TEXT['rcshowhidebots'], t1Text), tRow2);
		
		Utils.addTextTo(" | ", tRow2);
		
		this.anonsCheckbox = Utils.newElement("input", { type:"checkbox" }, tRow2);
		Utils.addTextTo(Utils.wiki2html(i18n.RC_TEXT['rcshowhideanons'], t1Text), tRow2);
		
		Utils.addTextTo(" | ", tRow2);
		
		this.usersCheckbox = Utils.newElement("input", { type:"checkbox" }, tRow2);
		Utils.addTextTo(Utils.wiki2html(i18n.RC_TEXT['rcshowhideliu'], t1Text), tRow2);
		
		Utils.addTextTo(" | ", tRow2);
		
		this.myEditsCheckbox = Utils.newElement("input", { type:"checkbox" }, tRow2);
		Utils.addTextTo(Utils.wiki2html(i18n.RC_TEXT['rcshowhidemine'], t1Text), tRow2);
		if(mw.config.get("wgUserName") && this.manager.hideusers.indexOf(mw.config.get("wgUserName")) != -1) {
			this.myEditsCheckbox.disabled = true;
			this.myEditsCheckbox.checked = false;
			this.myEditsCheckbox.title = i18n.TEXT.optionsPanelHideUsersOverride;
		}
		
		Utils.addTextTo(" | ", tRow2);
		
		this.groupedChangesCheckbox = Utils.newElement("input", { type:"checkbox" }, tRow2);
		Utils.addTextTo(Utils.wiki2html(i18n.RC_TEXT['rcshowhideenhanced'], t1Text), tRow2);
		
		Utils.addTextTo(" | ", tRow2);
		
		this.logsCheckbox = Utils.newElement("input", { type:"checkbox" }, tRow2);
		Utils.addTextTo(Utils.wiki2html(i18n.RC_TEXT['rcshowhidelogs'], t1Text), tRow2);
		
		/***************************
		 * Finish - make this work!
		 ***************************/
		this.addEventListeners();
		
		this.refresh();
	}
	
	// Add / set the values of the fields.
	RCMOptions.prototype.refresh = function() {
		/***************************
		 * Limit - max changes returned
		 ***************************/
		this.limitField.innerHTML = "";
		var tLimit = this.manager.rcParams.limit;
		var tLimitValues = [25, 50, 75, 100, 200, 350, 500];
		for(var i = 0; i < tLimitValues.length; i++) {
			if(tLimit != tLimitValues[i] && tLimit < tLimitValues[i] && (i > 0 && tLimit > tLimitValues[i-1])) {
				Utils.newElement("option", { value:tLimit, innerHTML:tLimit, selected:"selected" }, this.limitField);
			}
			Utils.newElement("option", { value:tLimitValues[i], innerHTML:tLimitValues[i], selected:(tLimit == tLimitValues[i] ? "selected" : undefined) }, this.limitField);
		}
		if(tLimit > tLimitValues[tLimitValues.length-1]) {
			Utils.newElement("option", { value:tLimit, innerHTML:tLimit, selected:"selected" }, this.limitField);
		}
		
		/***************************
		 * Days - max changes returned up to _ days before
		 ***************************/
		this.daysField.innerHTML = "";
		var tDays = this.manager.rcParams.days;
		var tDayValues = [1, 3, 7, 14, 30];
		for(var i = 0; i < tDayValues.length; i++) {
			if(tDays != tDayValues[i] && tDays < tDayValues[i] && (i > 0 && tDays > tDayValues[i-1])) {
				Utils.newElement("option", { value:tDays, innerHTML:tDays, selected:"selected" }, this.daysField);
			}
			Utils.newElement("option", { value:tDayValues[i], innerHTML:tDayValues[i], selected:(tDays == tDayValues[i] ? "selected" : undefined) }, this.daysField);
		}
		if(tDays > tDayValues[tDayValues.length-1]) {
			Utils.newElement("option", { value:tDays, innerHTML:tDays, selected:"selected" }, this.daysField);
		}
		
		/***************************
		 * Checkboxes
		 ***************************/
		this.minorEditsCheckbox.checked = !this.manager.rcParams.hideminor;
		this.botsCheckbox.checked = !this.manager.rcParams.hidebots;
		this.anonsCheckbox.checked = !this.manager.rcParams.hideanons;
		this.usersCheckbox.checked = !this.manager.rcParams.hideliu;
		this.myEditsCheckbox.checked = !this.manager.rcParams.hidemyself;
		this.groupedChangesCheckbox.checked = !this.manager.rcParams.hideenhanced;
		this.logsCheckbox.checked = !this.manager.rcParams.hidelogs;
	}
	
	RCMOptions.prototype.addEventListeners = function() {
		this.limitField.addEventListener("change", this._onChange_limit.bind(this));
		this.daysField.addEventListener("change", this._onChange_days.bind(this));
		
		this.minorEditsCheckbox.addEventListener("change", this._onChange_hideminor.bind(this));
		this.botsCheckbox.addEventListener("change", this._onChange_hidebots.bind(this));
		this.anonsCheckbox.addEventListener("change", this._onChange_hideanons.bind(this));
		this.usersCheckbox.addEventListener("change", this._onChange_hideliu.bind(this));
		this.myEditsCheckbox.addEventListener("change", this._onChange_hidemyself.bind(this));
		this.groupedChangesCheckbox.addEventListener("change", this._onChange_hideenhanced.bind(this));
		this.logsCheckbox.addEventListener("change", this._onChange_hidelogs.bind(this));
	}
	
	RCMOptions.prototype.removeEventListeners = function() {
		this.limitField.removeEventListener("change", this._onChange_limit);
		this.daysField.removeEventListener("change", this._onChange_days);
		
		this.minorEditsCheckbox.removeEventListener("change", this._onChange_hideminor);
		this.botsCheckbox.removeEventListener("change", this._onChange_hidebots);
		this.anonsCheckbox.removeEventListener("change", this._onChange_hideanons);
		this.usersCheckbox.removeEventListener("change", this._onChange_hideliu);
		this.myEditsCheckbox.removeEventListener("change", this._onChange_hidemyself);
		this.groupedChangesCheckbox.removeEventListener("change", this._onChange_hideenhanced);
		this.logsCheckbox.removeEventListener("change", this._onChange_hidelogs);
	}
	
	/***************************
	 * Events
	 ***************************/
	RCMOptions.prototype._onChange_limit = function(pEvent) {
		this.afterChangeNumber("limit", parseInt(pEvent.target.value));
	}
	
	RCMOptions.prototype._onChange_days = function(pEvent) {
		this.afterChangeNumber("days", parseInt(pEvent.target.value));
	}
	
	RCMOptions.prototype._onChange_hideminor = function(pEvent) {
		this.afterChangeBoolean("hideminor", !pEvent.target.checked);
	}
	
	RCMOptions.prototype._onChange_hidebots = function(pEvent) {
		this.afterChangeBoolean("hidebots", !pEvent.target.checked);
	}
	
	RCMOptions.prototype._onChange_hideanons = function(pEvent) {
		// Both "hideanons" and "hideliu" cannot be true
		if(pEvent.target.checked == false && this.usersCheckbox.checked == false) {
			this.manager.rcParams["hideliu"] = false;
			this.usersCheckbox.checked = true;
		}
		this.afterChangeBoolean("hideanons", !pEvent.target.checked);
	}
	
	RCMOptions.prototype._onChange_hideliu = function(pEvent) {
		// Both "hideanons" and "hideliu" cannot be true
		if(pEvent.target.checked == false && this.anonsCheckbox.checked == false) {
			this.manager.rcParams["hideanons"] = false;
			this.anonsCheckbox.checked = true;
		}
		this.afterChangeBoolean("hideliu", !pEvent.target.checked);
	}
	
	RCMOptions.prototype._onChange_hidemyself = function(pEvent) {
		this.afterChangeBoolean("hidemyself", !pEvent.target.checked);
	}
	
	RCMOptions.prototype._onChange_hideenhanced = function(pEvent) {
		this.afterChangeBoolean("hideenhanced", !pEvent.target.checked);
	}
	
	RCMOptions.prototype._onChange_hidelogs = function(pEvent) {
		this.afterChangeBoolean("hidelogs", !pEvent.target.checked);
	}
	
	/***************************
	 * Helper Methods
	 ***************************/
	// Will add / edit the url param & script value with details entered.
	RCMOptions.prototype.afterChangeNumber = function(pKey, pVal) {
		this.manager.rcParams[pKey] = pVal;
		this.manager.refresh();
	}
	
	RCMOptions.prototype.afterChangeBoolean = function(pKey, pVal) {
		this.manager.rcParams[pKey] = pVal;
		this.manager.refresh();
	}
	
	return RCMOptions;
	
})(window.jQuery, document, window.mediaWiki, window.dev.RecentChangesMultiple, window.dev.RecentChangesMultiple.Utils, window.dev.RecentChangesMultiple.i18n);
//</syntaxhighlight>