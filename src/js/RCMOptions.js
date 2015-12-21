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
		this.settingsSaveCookieCheckbox		= null;
		
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
		this.root = null;
		
		this.rcParams = null;
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
	
	RCMOptions.prototype.init = function(pElem) {
		this.root = pElem;
		this.rcParams = this.getSave();//$.extend({}, this.manager.rcParamsBase);
		this.manager.rcParams = $.extend(this.manager.rcParams, this.rcParams);
		
		var tFieldset = Utils.newElement("fieldset", { className:"rcoptions collapsible" }, pElem);
		Utils.newElement("legend", { innerHTML:i18n.RC_TEXT['recentchanges-legend'] }, tFieldset);
		var tContent = Utils.newElement("div", { className:"rc-fieldset-content" }, tFieldset);
		
		/***************************
		 * RCMOptions settings
		 ***************************/
		var tSettingsPanel = Utils.newElement("aside", { className:"rcm-options-settings" }, tContent);
		tSettingsPanel.innerHTML = '<svg style="height:19px; vertical-align: top;" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"  viewBox="0 0 24 24" enable-background="new 0 0 24 24" xml:space="preserve"><path d="M20,14.5v-2.9l-1.8-0.3c-0.1-0.4-0.3-0.8-0.6-1.4l1.1-1.5l-2.1-2.1l-1.5,1.1c-0.5-0.3-1-0.5-1.4-0.6L13.5,5h-2.9l-0.3,1.8 C9.8,6.9,9.4,7.1,8.9,7.4L7.4,6.3L5.3,8.4l1,1.5c-0.3,0.5-0.4,0.9-0.6,1.4L4,11.5v2.9l1.8,0.3c0.1,0.5,0.3,0.9,0.6,1.4l-1,1.5 l2.1,2.1l1.5-1c0.4,0.2,0.9,0.4,1.4,0.6l0.3,1.8h3l0.3-1.8c0.5-0.1,0.9-0.3,1.4-0.6l1.5,1.1l2.1-2.1l-1.1-1.5c0.3-0.5,0.5-1,0.6-1.4 L20,14.5z M12,16c-1.7,0-3-1.3-3-3s1.3-3,3-3s3,1.3,3,3S13.7,16,12,16z" fill="currentColor" /></svg>';
		
		this.settingsSaveCookieCheckbox = Utils.newElement("input", { type:"checkbox" }, tSettingsPanel);
		Utils.addTextTo(i18n.TEXT["optionsPanelSaveWithCookie"], tSettingsPanel);
		
		this.settingsSaveCookieCheckbox.checked = !$.isEmptyObject(this.rcParams);
		
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
		return this;
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
		this.settingsSaveCookieCheckbox.addEventListener("change", this._onChange_settingsSaveCookie.bind(this));
		
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
		this.settingsSaveCookieCheckbox.removeEventListener("change", this._onChange_settingsSaveCookie.bind(this));
		
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
	
	RCMOptions.prototype._onChange_settingsSaveCookie = function(pEvent) {
		if(pEvent.target.checked) {
			this.save();
		} else {
			localStorage.removeItem(module.OPTIONS_SETTINGS_LOCAL_STORAGE_ID);
		}
	}
	
	/***************************
	 * Helper Methods
	 ***************************/
	// Will add / edit the url param & script value with details entered.
	RCMOptions.prototype.afterChangeNumber = function(pKey, pVal) {
		this.rcParams[pKey] = pVal;
		this.manager.rcParams[pKey] = pVal;
		this.manager.refresh(true);
		this.save();
	}
	
	RCMOptions.prototype.afterChangeBoolean = function(pKey, pVal) {
		this.rcParams[pKey] = pVal;
		this.manager.rcParams[pKey] = pVal;
		this.manager.refresh(true);
		this.save();
	}
	
	RCMOptions.prototype.save = function() {
		if(this.settingsSaveCookieCheckbox.checked) {
			localStorage.setItem(module.OPTIONS_SETTINGS_LOCAL_STORAGE_ID, JSON.stringify(this.rcParams));
		}
	}
	
	RCMOptions.prototype.getSave = function() {
		return localStorage.getItem(module.OPTIONS_SETTINGS_LOCAL_STORAGE_ID)
			? JSON.parse(localStorage.getItem(module.OPTIONS_SETTINGS_LOCAL_STORAGE_ID))
			: {}
			;
	}
	
	return RCMOptions;
	
})(window.jQuery, document, window.mediaWiki, window.dev.RecentChangesMultiple, window.dev.RecentChangesMultiple.Utils, window.dev.RecentChangesMultiple.i18n);
//</syntaxhighlight>