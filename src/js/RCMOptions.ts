import Global from "./Global";
import RCMManager from "./RCMManager";
import Utils from "./Utils";
import i18n from "./i18n";
import { WikiaMultiSelectDropdown } from "./lib/WikiaMultiSelectDropdown";

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
	discNamespaces		: { FORUM:boolean, WALL:boolean, ARTICLE_COMMENT:boolean };
	
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
	
	discussionsDropdown			: WikiaMultiSelectDropdown;
	
	// Constructor
	constructor(pManager:RCMManager) {
		this.manager = pManager;
		this.localStorageID = Global.OPTIONS_SETTINGS_LOCAL_STORAGE_ID + "-" + pManager.modID.replace(".", "");
	}
	
	dispose() : void {
		this.removeEventListeners();
		
		this.manager = null;
		this.root = null;
		
		this.rcParams = null;
		this.discNamespaces = null;
		
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
		
		// By default we want them all enabled
		const dns = this.manager.discNamespaces;
		this.discNamespaces = $.extend({ FORUM:dns.FORUM, WALL:dns.WALL, ARTICLE_COMMENT:dns.ARTICLE_COMMENT }, (tSave.discNamespaces || {}));
		this.manager.discNamespaces = { ...this.discNamespaces };
		this.manager.discussionsEnabled = Object.keys(this.discNamespaces).filter(key=>this.discNamespaces[key]).length > 0;
		
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
		tSettingsPanel.innerHTML = Global.getSymbol("rcm-settings-gear", 19); tSettingsPanel.querySelector("svg").style.cssText = "vertical-align: top;";
		var tSettingsPanelContent = Utils.newElement("div", { className:"rcm-options-settings-cont" }, tSettingsPanel);
		
		this.settingsSaveCookieCheckbox = this._createNewSettingsOption(i18n('optionspanel-savewithcookie'), this.isSaveEnabled(), tSettingsPanelContent);
		// this.settingsShowDiscussionsCheckbox = this._createNewSettingsOption(i18n('discussions'), this.manager.discussionsEnabled, tSettingsPanelContent);
		
		/***************************
		 * First line of choices (numbers)
		 ***************************/
		var tRow1Text = i18n('rclinks').split("<br />")[0].split("$3")[0].split(/\$1|\$2/);
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
		
		this.minorEditsCheckbox = this._newCheckbox(i18n('rcshowhideminor', ""), tRow2);
		
		Utils.addTextTo(" | ", tRow2);
		this.botsCheckbox = this._newCheckbox(i18n('rcshowhidebots', ""), tRow2);
		
		Utils.addTextTo(" | ", tRow2);
		this.anonsCheckbox = this._newCheckbox(i18n('rcshowhideanons', ""), tRow2);
		
		Utils.addTextTo(" | ", tRow2);
		this.usersCheckbox = this._newCheckbox(i18n('rcshowhideliu', ""), tRow2);
		
		Utils.addTextTo(" | ", tRow2);
		this.myEditsCheckbox = this._newCheckbox(i18n('rcshowhidemine', ""), tRow2);
		if(Global.username && this.manager.hideusers.indexOf(Global.username) != -1) {
			this.myEditsCheckbox.disabled = true;
			this.myEditsCheckbox.checked = false;
			this.myEditsCheckbox.title = i18n('optionspanel-hideusersoverride');
		}
		
		Utils.addTextTo(" | ", tRow2);
		this.groupedChangesCheckbox = this._newCheckbox(i18n('rcfilters-group-results-by-page'), tRow2);
		
		Utils.addTextTo(" | ", tRow2);
		this.logsCheckbox = this._newCheckbox(i18n('rcfilters-filter-logactions-label'), tRow2);
		
		/***************************
		 * Third line of choices (discussions)
		 ***************************/
		Utils.newElement("hr", null, tContent);
		
		let tRow3 = Utils.newElement("table", { className:"mw-recentchanges-table" }, tContent);
		let tRow3Row = Utils.newElement("row", { className:"mw-recentchanges-table" }, tRow3);
		
		// Utils.addTextTo("<b>Discussions:</b> ", tRow3);
		Utils.newElement("td", { className:"mw-label", innerHTML:i18n("socialactivity-page-title")+":" }, tRow3Row);
		
		let tRow3RowTdInput = Utils.newElement("td", { className:"mw-input" }, tRow3Row);
		this.discussionsDropdown = this._createNewMultiSelectDropdown([
			{ label:i18n('discussions'), value:"FORUM" },
			{ label:i18n('message-wall'), value:"WALL" },
			{ label:i18n('comments'), value:"ARTICLE_COMMENT" },
		], this.manager.discNamespaces, tRow3RowTdInput);
		
		/***************************
		 * Finish - make this work!
		 ***************************/
		this.addEventListeners();
		
		this.refresh();
		return this;
	}
	
	private _newCheckbox(pText:string, pParent:HTMLElement) : HTMLInputElement {
		let tLabel = Utils.newElement("label", null, pParent);
		let tCheckbox = Utils.newElement("input", { type:"checkbox" }, tLabel);
		Utils.addTextTo(" "+Utils.ucfirst(pText.trim()), tLabel);
		return tCheckbox;
	}
	
	private _createNewSettingsOption(pText:string, pChecked:boolean, pParent:HTMLElement) : HTMLInputElement {
		let tCheckbox = this._newCheckbox(pText, pParent);
		tCheckbox.checked = pChecked;
		return tCheckbox;
	}
	
	private _createNewMultiSelectDropdown(pList:Array<{ label:string, value:string|number }>, pChecked:any, pParent:HTMLElement) {
		const $dropdown = $(`<div class="WikiaDropdown MultiSelect disc">
			<div class="selected-items">
				<span class="selected-items-list"></span>
				<img class="arrow" src="data:image/gif;base64,R0lGODlhAQABAIABAAAAAP///yH5BAEAAAEALAAAAAABAAEAQAICTAEAOw%3D%3D" />
			</div>
			<div class="dropdown">
				<div class="toolbar">
					<label><input type="checkbox" name="select-all" class="select-all" value="all">${i18n("listusers-select-all")}</label>
				</div>
				<ul class="dropdown-list">
					${pList.map((o,i)=>{
						const checked = pChecked[o.value];// || pChecked.indexOf(o.value) > -1;
						return `<li class="dropdown-item ${checked ? "selected" : ""}">
							<label><input type="checkbox" name="namespace[]" value="${o.value}" ${checked ? "checked" : ""}>${o.label}</label>
						</li>`;
					}).join("")}
				</ul>
			</div>
		</div>`)
		.appendTo(pParent);
		
		// Seems the old MultiSelectDropdown system was only really designed for a single use (makes sense) so a custom namespace needs to be made for each RCM manager instance
		return (new WikiaMultiSelectDropdown($dropdown, { eventNamespace: 'WikiaMultiSelectDropdown'+this.manager.modID, minHeight:100, maxHeight:100 })).init();
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
		
		Object.keys(this.discNamespaces).forEach((ns)=>{
			this.discussionsDropdown.$dropdown.find(`[value=${ns}]`).attr("checked", this.discNamespaces[ns]);
		});
	}
	
	addEventListeners() : void {
		this.settingsSaveCookieCheckbox.addEventListener("change", this._onChange_settingsSaveCookie);
		
		this.limitField.addEventListener("change", this._onChange_limit);
		this.daysField.addEventListener("change", this._onChange_days);
		
		this.minorEditsCheckbox.addEventListener("change", this._onChange_hideminor);
		this.botsCheckbox.addEventListener("change", this._onChange_hidebots);
		this.anonsCheckbox.addEventListener("change", this._onChange_hideanons);
		this.usersCheckbox.addEventListener("change", this._onChange_hideliu);
		this.myEditsCheckbox.addEventListener("change", this._onChange_hidemyself);
		this.groupedChangesCheckbox.addEventListener("change", this._onChange_hideenhanced);
		this.logsCheckbox.addEventListener("change", this._onChange_hidelogs);
		
		this.discussionsDropdown.on("change", this._onChange_discussionsDropdown);
		this.discussionsDropdown.$selectAll.on("change", this._onChange_discussionsDropdown);
	}
	
	removeEventListeners() : void {
		this.settingsSaveCookieCheckbox.removeEventListener("change", this._onChange_settingsSaveCookie);
		
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
	
	private _onChange_discussionsDropdown = (pEvent:any) : void => {
		const dropdown = this.discussionsDropdown;
		
		this.discussionsDropdown.$dropdown.find(`.dropdown-item input`).each((i, o)=>{
			const checkbox = (<HTMLInputElement>o);
			this.discNamespaces[checkbox.value] = checkbox.checked;
			this.manager.discNamespaces[checkbox.value] = checkbox.checked;
		});
		
		this.manager.discussionsEnabled = dropdown.getSelectedItems().length > 0;
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
			const { rcParams:options, discNamespaces } = this;
			localStorage.setItem(this.localStorageID, JSON.stringify({ options, discNamespaces }));
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
