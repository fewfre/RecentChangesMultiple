import ConstantsApp from "./ConstantsApp";
import RCMManager from "./RCMManager";
import Utils from "./Utils";
import i18n from "./i18n";

let $ = window.jQuery;
let mw = window.mediaWiki;

//######################################
// #### Run-time Options ####
// * Custom version of RC "options" section, using url params to keep track of options.
//######################################
export default class RCMOptions
{
	// Storage
	manager				: RCMManager; // Keep track of what manager this data is attached to.
	root				: HTMLElement;
	localStorageID		: string;
	
	/***************************
	 * Data
	 ***************************/
	rcParams			: any;
	discussionsEnabled	: boolean;
	
	/***************************
	 * Fields
	 ***************************/
	settingsSaveCookieCheckbox	: HTMLInputElement;
	settingsShowDiscussionsCheckbox	: HTMLInputElement;
	
	limitField					: HTMLSelectElement;
	daysField					: HTMLSelectElement;
	
	minorEditsCheckbox			: HTMLInputElement;
	botsCheckbox				: HTMLInputElement;
	anonsCheckbox				: HTMLInputElement;
	usersCheckbox				: HTMLInputElement;
	myEditsCheckbox				: HTMLInputElement;
	groupedChangesCheckbox		: HTMLInputElement;
	logsCheckbox				: HTMLInputElement;
	
	// Constructor
	constructor(pManager:RCMManager) {
		this.manager = pManager;
		this.localStorageID = ConstantsApp.OPTIONS_SETTINGS_LOCAL_STORAGE_ID + "-" + pManager.modID.replace(".", "");
	}
	
	dispose() : void {
		this.removeEventListeners();
		
		this.manager = null;
		this.root = null;
		
		this.rcParams = null;
		
		this.settingsSaveCookieCheckbox	= null;
		this.settingsShowDiscussionsCheckbox= null;
		
		this.limitField					= null;
		this.daysField					= null;
		
		this.minorEditsCheckbox			= null;
		this.botsCheckbox				= null;
		this.anonsCheckbox				= null;
		this.usersCheckbox				= null;
		this.myEditsCheckbox			= null;
		this.groupedChangesCheckbox		= null;
		this.logsCheckbox				= null;
	}
	
	init(pElem:HTMLElement|Element) : RCMOptions {
		this.root = <HTMLElement>pElem;
		
		let tSave = this.getSave();
		this.rcParams = tSave.options || {};//$.extend({}, this.manager.rcParamsBase);
		this.manager.rcParams = $.extend(this.manager.rcParams, this.rcParams);
		this.discussionsEnabled = tSave.discussionsEnabled;
		if(this.discussionsEnabled != null) {
			this.manager.discussionsEnabled = this.discussionsEnabled;
		}
		
		this._addElements();
		
		return this;
	}
	
	private _addElements() : RCMOptions {
		var tFieldset = Utils.newElement("fieldset", { className:"rcoptions collapsible" }, this.root);
		Utils.newElement("legend", { innerHTML:i18n('recentchanges-legend') }, tFieldset);
		var tContent = Utils.newElement("div", { className:"rc-fieldset-content" }, tFieldset);
		
		/***************************
		 * RCMOptions settings
		 ***************************/
		var tSettingsPanel = Utils.newElement("aside", { className:"rcm-options-settings" }, tContent);
		tSettingsPanel.innerHTML = ConstantsApp.getSymbol("rcm-settings-gear", 19); tSettingsPanel.querySelector("svg").style.cssText = "vertical-align: top;";
		var tSettingsPanelContent = <HTMLInputElement>Utils.newElement("div", { className:"rcm-options-settings-cont" }, tSettingsPanel);
		
		this.settingsSaveCookieCheckbox = this._createNewSettingsOption(i18n('optionspanel-savewithcookie'), this.isSaveEnabled(), tSettingsPanelContent);
		this.settingsShowDiscussionsCheckbox = this._createNewSettingsOption(i18n('discussions'), this.manager.discussionsEnabled, tSettingsPanelContent);
		
		/***************************
		 * First line of choices (numbers)
		 ***************************/
		var tRow1Text = i18n('rclinks').split("<br />")[0].split("$3")[0].split(/\$1|\$2/);
		var tRow1 = Utils.newElement("div", {  }, tContent);
		
		Utils.addTextTo(tRow1Text[0], tRow1);
		this.limitField = <HTMLSelectElement>Utils.newElement("select", {}, tRow1);
		Utils.addTextTo(tRow1Text[1], tRow1);
		this.daysField = <HTMLSelectElement>Utils.newElement("select", {}, tRow1);
		Utils.addTextTo(tRow1Text[2]||"", tRow1);
		
		/***************************
		 * Second line of choices (checkboxes)
		 ***************************/
		var tRow2 = Utils.newElement("div", {  }, tContent);
		var t1Text = "";//i18n('show');
		
		this.minorEditsCheckbox = this._newCheckbox(i18n('rcshowhideminor', t1Text), tRow2);
		
		Utils.addTextTo(" | ", tRow2);
		this.botsCheckbox = this._newCheckbox(i18n('rcshowhidebots', t1Text), tRow2);
		
		Utils.addTextTo(" | ", tRow2);
		this.anonsCheckbox = this._newCheckbox(i18n('rcshowhideanons', t1Text), tRow2);
		
		Utils.addTextTo(" | ", tRow2);
		this.usersCheckbox = this._newCheckbox(i18n('rcshowhideliu', t1Text), tRow2);
		
		Utils.addTextTo(" | ", tRow2);
		this.myEditsCheckbox = this._newCheckbox(i18n('rcshowhidemine', t1Text), tRow2);
		if(ConstantsApp.username && this.manager.hideusers.indexOf(ConstantsApp.username) != -1) {
			this.myEditsCheckbox.disabled = true;
			this.myEditsCheckbox.checked = false;
			this.myEditsCheckbox.title = i18n('optionspanel-hideusersoverride');
		}
		
		Utils.addTextTo(" | ", tRow2);
		if(ConstantsApp.isUcpWiki) {
			this.groupedChangesCheckbox = this._newCheckbox(" "+i18n('rcfilters-group-results-by-page').toLowerCase(), tRow2);
		} else {
			this.groupedChangesCheckbox = this._newCheckbox(i18n('rcshowhideenhanced', t1Text), tRow2);
		}
		
		Utils.addTextTo(" | ", tRow2);
		if(ConstantsApp.isUcpWiki) {
			this.logsCheckbox = this._newCheckbox(" "+i18n('rcfilters-filter-logactions-label').toLowerCase(), tRow2);
		} else {
			this.logsCheckbox = this._newCheckbox(i18n('rcshowhidelogs', t1Text), tRow2);
		}
		
		/***************************
		 * Third line of choices (discussions)
		 ***************************/
		// let tRow3 = Utils.newElement("div", {  }, tContent);
		
		// Utils.addTextTo("<b>Discussions:</b> ", tRow3);
		
		// this.settingsShowDiscussionsCheckbox = this._createNewSettingsOption(i18n('allmessages-filter-all'), this.manager.discussionsEnabled, tRow3);
		// Utils.addTextTo(" | ", tRow2);
		// this.settingsShowDiscussionsCheckbox = this._createNewSettingsOption(i18n('discussions'), this.manager.discussionsEnabled, tRow3);
		// Utils.addTextTo(" | ", tRow2);
		// this.settingsShowDiscussionsCheckbox = this._createNewSettingsOption(i18n('message-wall'), this.manager.discussionsEnabled, tRow3);
		// Utils.addTextTo(" | ", tRow2);
		// this.settingsShowDiscussionsCheckbox = this._createNewSettingsOption(i18n('comments'), this.manager.discussionsEnabled, tRow3);
		
		/***************************
		 * Finish - make this work!
		 ***************************/
		this.addEventListeners();
		
		this.refresh();
		return this;
	}
	
	private _newCheckbox(pText:string, pParent:HTMLElement) : HTMLInputElement {
		let tLabel = Utils.newElement("label", null, pParent);
		let tCheckbox = <HTMLInputElement>Utils.newElement("input", { type:"checkbox" }, tLabel);
		Utils.addTextTo(pText, tLabel);
		return tCheckbox;
	}
	
	private _createNewSettingsOption(pText:string, pChecked:boolean, pParent:HTMLElement) : HTMLInputElement {
		let tCheckbox = this._newCheckbox(pText, pParent);
		tCheckbox.checked = pChecked;
		return tCheckbox;
	}
	
	// Add / set the values of the fields.
	refresh() : void {
		/***************************
		 * Limit - max changes returned
		 ***************************/
		this.limitField.innerHTML = "";
		var tLimit = this.manager.rcParams.limit;
		var tLimitValues = [25, 50, 75, 100, 200, 350, 500];
		// If rcParam value is unique, add it to list
		if(tLimitValues.indexOf(tLimit) == -1) {
			tLimitValues.push(tLimit);
			tLimitValues.sort((a, b)=>{ return a - b; });
		}
		for(var i = 0; i < tLimitValues.length; i++) {
			Utils.newElement("option", { value:tLimitValues[i], innerHTML:tLimitValues[i], selected:(tLimit == tLimitValues[i] ? "selected" : undefined) }, this.limitField);
		}
		
		/***************************
		 * Days - max changes returned up to _ days before
		 ***************************/
		this.daysField.innerHTML = "";
		var tDays = this.manager.rcParams.days;
		var tDayValues = [1, 3, 7, 14, 30];
		// If rcParam value is unique, add it to list
		if(tDayValues.indexOf(tDays) == -1) {
			tDayValues.push(tDays);
			tDayValues.sort((a, b)=>{ return a - b; });
		}
		for(var i = 0; i < tDayValues.length; i++) {
			Utils.newElement("option", { value:tDayValues[i], innerHTML:tDayValues[i], selected:(tDays == tDayValues[i] ? "selected" : undefined) }, this.daysField);
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
	
	addEventListeners() : void {
		this.settingsSaveCookieCheckbox.addEventListener("change", this._onChange_settingsSaveCookie);
		this.settingsShowDiscussionsCheckbox.addEventListener("change", this._onChange_settingsShowDiscussions);
		
		this.limitField.addEventListener("change", this._onChange_limit);
		this.daysField.addEventListener("change", this._onChange_days);
		
		this.minorEditsCheckbox.addEventListener("change", this._onChange_hideminor);
		this.botsCheckbox.addEventListener("change", this._onChange_hidebots);
		this.anonsCheckbox.addEventListener("change", this._onChange_hideanons);
		this.usersCheckbox.addEventListener("change", this._onChange_hideliu);
		this.myEditsCheckbox.addEventListener("change", this._onChange_hidemyself);
		this.groupedChangesCheckbox.addEventListener("change", this._onChange_hideenhanced);
		this.logsCheckbox.addEventListener("change", this._onChange_hidelogs);
	}
	
	removeEventListeners() : void {
		this.settingsSaveCookieCheckbox.removeEventListener("change", this._onChange_settingsSaveCookie);
		this.settingsShowDiscussionsCheckbox.removeEventListener("change", this._onChange_settingsShowDiscussions);
		
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
	private _onChange_limit = (pEvent:Event) : void => {
		this.afterChangeNumber("limit", parseInt((<HTMLInputElement>pEvent.target).value));
	}
	
	private _onChange_days = (pEvent:Event) : void => {
		this.afterChangeNumber("days", parseInt((<HTMLInputElement>pEvent.target).value));
	}
	
	private _onChange_hideminor = (pEvent:Event) : void => {
		this.afterChangeBoolean("hideminor", !(<HTMLInputElement>pEvent.target).checked);
	}
	
	private _onChange_hidebots = (pEvent:Event) : void => {
		this.afterChangeBoolean("hidebots", !(<HTMLInputElement>pEvent.target).checked);
	}
	
	private _onChange_hideanons = (pEvent:Event) : void => {
		// Both "hideanons" and "hideliu" cannot be true
		if((<HTMLInputElement>pEvent.target).checked == false && this.usersCheckbox.checked == false) {
			this.manager.rcParams["hideliu"] = false;
			this.usersCheckbox.checked = true;
		}
		this.afterChangeBoolean("hideanons", !(<HTMLInputElement>pEvent.target).checked);
	}
	
	private _onChange_hideliu = (pEvent:Event) : void => {
		// Both "hideanons" and "hideliu" cannot be true
		if((<HTMLInputElement>pEvent.target).checked == false && this.anonsCheckbox.checked == false) {
			this.manager.rcParams["hideanons"] = false;
			this.anonsCheckbox.checked = true;
		}
		this.afterChangeBoolean("hideliu", !(<HTMLInputElement>pEvent.target).checked);
	}
	
	private _onChange_hidemyself = (pEvent:Event) : void => {
		this.afterChangeBoolean("hidemyself", !(<HTMLInputElement>pEvent.target).checked);
	}
	
	private _onChange_hideenhanced = (pEvent:Event) : void => {
		this.afterChangeBoolean("hideenhanced", !(<HTMLInputElement>pEvent.target).checked);
	}
	
	private _onChange_hidelogs = (pEvent:Event) : void => {
		this.afterChangeBoolean("hidelogs", !(<HTMLInputElement>pEvent.target).checked);
	}
	
	private _onChange_settingsSaveCookie = (pEvent:Event) : void => {
		if((<HTMLInputElement>pEvent.target).checked) {
			this.save();
		} else {
			localStorage.removeItem(this.localStorageID);
		}
	}
	
	private _onChange_settingsShowDiscussions = (pEvent:Event) : void => {
		this.discussionsEnabled = (<HTMLInputElement>pEvent.target).checked;
		this.manager.discussionsEnabled = (<HTMLInputElement>pEvent.target).checked;
		this.manager.hardRefresh(true);
		this.save();
	}
	
	/***************************
	 * Helper Methods
	 ***************************/
	// Will add / edit the url param & script value with details entered.
	afterChangeNumber(pKey:string, pVal:number, pHardRefresh:boolean=false) : void {
		this.rcParams[pKey] = pVal;
		this.manager.rcParams[pKey] = pVal;
		this.manager.hardRefresh(true);
		this.save();
	}
	
	afterChangeBoolean(pKey:string, pVal:boolean, pHardRefresh:boolean=false) : void {
		this.rcParams[pKey] = pVal;
		this.manager.rcParams[pKey] = pVal;
		this.manager.hardRefresh(true);
		this.save();
	}
	
	save() : void {
		if(this.settingsSaveCookieCheckbox.checked) {
			localStorage.setItem(this.localStorageID, JSON.stringify({ options:this.rcParams, discussionsEnabled:this.discussionsEnabled }));
		}
	}
	
	getSave() : any {
		return localStorage.getItem(this.localStorageID)
			? JSON.parse(localStorage.getItem(this.localStorageID))
			: {}
			;
	}
	
	isSaveEnabled() : boolean {
		return localStorage.getItem(this.localStorageID) != null;
	}
}
