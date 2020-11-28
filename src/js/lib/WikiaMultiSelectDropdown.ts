import i18n from "../i18n";
// const $ = window.jQuery;

/***************************
* Combination of Observable, Wikia.Dropdown and Wikia.MultiSelectDropdown from the pre-UCP wikia JS
* Merged into one file for convenience and do to annoying errors
****************************/
export class WikiaMultiSelectDropdown
{
	events: { [eventName:string]:Array<{ fn:Function, scope:any }> } = {};
	
	settings:any = {
		closeOnEscape: !0,
		closeOnOutsideClick: !0,
		eventNamespace: 'WikiaMultiSelectDropdown',
		onChange: null,
		onDocumentClick: null,
		onClick: null,
		onKeyDown: null,
		maxHeight: 390,
		minHeight: 30
	};

	$document: JQuery<Document>;
	$wrapper: JQuery<any>;
	$dropdown: JQuery<any>;
	$selectedItems: JQuery<any>;
	$selectedItemsList: JQuery<any>;
	
	dropdownMarginBottom: number;
	dropdownItemHeight: number;
	$checkboxes: JQuery<any>;
	$footerToolbar: JQuery<any>;
	$selectAll: JQuery<any>;
	
	// Constructor
	constructor(element:any, options?:any) {
		this.settings = $.extend(this.settings, options);
		this.$document = $(document);
		this.$wrapper = $(element).addClass('closed');
	}
	init() {
		this.$dropdown = this.$wrapper.find('.dropdown');
		this.$selectedItems = this.$wrapper.find('.selected-items');
		this.$selectedItemsList = this.$selectedItems.find('.selected-items-list');
		
		this.dropdownMarginBottom = parseFloat(this.$dropdown.css('marginBottom')) || 10;
		this.dropdownItemHeight = parseFloat(this.getItems().eq(0).css('lineHeight')) || 30;
		this.$checkboxes = this.getItems().find(':checkbox');
		this.$footerToolbar = $('.WikiaFooter .toolbar');
		this.updateDropdownHeight();
		this.updateSelectedItemsList();
		this.$selectAll = this.$dropdown.find('.select-all');
		this.$selectAll.on('change', this.selectAll.bind(this));
		this.$selectAll.prop('checked', this.everythingSelected());
		this.bindEvents();
		return this;
	}
	
	/************************************************
	* Observable
	*************************************************/
	bind(e:any, cb:Function|Function[], scope?:any) {
		if (typeof e == 'object') {
			scope = cb;
			for (var i in e) {
				if (i !== 'scope') {
					this.bind(i, e[i], e.scope || scope);
				}
			}
		} else if ($.isArray(cb)) {
			for (let i = 0; i < (<any[]>cb).length; i++) {
				this.bind(e, cb[i], scope);
			}
		} else {
			scope = scope || this;
			this.events[e] = this.events[e] || [];
			this.events[e].push({
				fn: cb,
				scope: scope
			});
		}
		return true;
	}
	
	unbind(e:any, cb:Function|Function[], scope?:any) {
		if (typeof e == 'object') {
			scope = cb;
			var ret = !1;
			for (var i in e) {
				if (i !== 'scope') {
					ret = this.unbind(i, e[i], e.scope || scope) || ret;
				}
			}
			return ret;
		} else if ($.isArray(cb)) {
			var ret = !1;
			for (let i = 0; i < (<any[]>cb).length; i++) {
				ret = this.unbind(e, cb[i], scope) || ret;
			}
			return ret;
		} else {
			if (!this.events[e]) {
				return false;
			}
			scope = scope || this;
			for (var i in this.events[e]) {
				if (this.events[e][i].fn == cb && this.events[e][i].scope == scope) {
					delete this.events[e][i];
					return true;
				}
			}
			return false;
		}
	}
	on(e, cb) {
		this.bind.apply(this, arguments);
	}
	un(e, cb) {
		this.unbind.apply(this, arguments);
	}
	relayEvents(o, e, te) {
		te = te || e;
		o.bind(e, function() {
			var a = [
				te
			].concat(arguments);
			this.fire.apply(this, a);
		}, this);
	}
	fire(e:string, ...args:any[]) {
		if (!this.events[e]) return true;
		var ee = this.events[e];
		for (var i = 0; i < ee.length; i++) {
			if (typeof ee[i].fn == 'function') {
				var scope = ee[i].scope || this;
				if (ee[i].fn.apply(scope, args) === false) {
					return false;
				}
			}
		}
		return true;
	}
	
	
	
	
	/************************************************
	* Wikia.Dropdown
	*************************************************/
	bindEvents() {
		this.$wrapper.off('click.' + this.settings.eventNamespace).on('click.' + this.settings.eventNamespace, this.onClick.bind(this));
		this.getItems().off('click.' + this.settings.eventNamespace).on('click.' + this.settings.eventNamespace, this.onChange.bind(this));
		this.$document.off('click.' + this.settings.eventNamespace).off('keydown.' + this.settings.eventNamespace);
		if (this.settings.closeOnEscape || this.settings.onKeyDown) {
			this.$document.on('keydown.' + this.settings.eventNamespace, this.onKeyDown.bind(this));
		}
		if (this.settings.closeOnOutsideClick || this.settings.onDocumentClick) {
			this.$document.on('click.' + this.settings.eventNamespace, this.onDocumentClick.bind(this));
		}
		this.fire('bindEvents');
	}

	disable() {
		this.close();
		this.$wrapper.addClass('disable');
	}
	enable() {
		this.$wrapper.removeClass('disable');
	}
	close() {
		this.$wrapper.removeClass('open').addClass('closed');
		this.fire('close');
		this.updateSelectedItemsList();
	}
	open() {
		if (this.$wrapper.hasClass('disable')) {
			this.updateDropdownHeight();
			return true;
		}
		this.$wrapper.toggleClass('open closed');
		this.fire('open');
		this.updateDropdownHeight();
	}
	getItems() {
		return this.$dropdown.find('.dropdown-item');
	}
	getSelectedItems() {
		// return this.getItems().filter('.selected');
		return this.$dropdown.find(':checked:not(.select-all)');
	}
	isOpen() {
		return this.$wrapper.hasClass('open');
	}
	
	onClick(event) {
		var $target = $(event.target);
		if ($target.is(this.getItems().find('label'))) {
			return;
		}
		if (!this.settings.onClick || this.settings.onClick() !== false) {
			if (!this.isOpen()) {
				this.open();
			}
		}
		this.fire('click', event);
	}
	// onChange=(event) => {
	// 	var $target = $(event.target);
	// 	var value = $target.text();
	// 	if ($.isFunction(this.settings.onChange)) {
	// 		this.settings.onChange.call(this, event, $target);
	// 	}
	// 	this.getSelectedItems().removeClass('selected');
	// 	$target.parent().addClass('selected');
	// 	this.$selectedItemsList.text(value);
	// 	this.fire('change', event);
	// 	this.close();
	// }
	onChange(event) {
		var $checkbox = $(event.target);
		if (!this.settings.onChange || this.settings.onChange() !== false) {
			$checkbox.closest('.dropdown-item').toggleClass('selected');
		}
		if (this.$selectAll.is(':checked')) {
			this.$selectAll.toggleClass('modified', !this.everythingSelected());
		}
		this.fire('change', event);
	}
	onKeyDown(event) {
		if (!this.settings.onKeyDown || this.settings.onKeyDown() !== false) {
			if (this.settings.closeOnEscape && event.keyCode == 27 && this.isOpen()) {
			this.close();
			}
		}
		this.fire('keyDown', event);
	}
	onDocumentClick(event) {
		if (!this.settings.onDocumentClick || this.settings.onDocumentClick() !== false) {
			if (this.settings.closeOnOutsideClick && this.isOpen() && !$.contains(this.$wrapper[0], event.target)) {
				this.close();
			}
		}
		this.fire('documentClick', event);
	}
	
	
	
	
	/************************************************
	* Wikia.MultiSelectDropdown
	*************************************************/
	everythingSelected() {
		return this.getItems().length == this.getSelectedItems().length;
	}
	selectAll(event) {
		var checked = this.$selectAll.removeClass('modified').is(':checked');
		this.doSelectAll(checked);
	}
	doSelectAll(checked) {
		this.getItems().toggleClass('selected', checked).find(':checkbox').prop('checked', checked);
	}
	updateDropdownHeight() {
		var dropdownOffset = this.$dropdown.offset().top,
		footerToolbarOffset = this.$footerToolbar.length ? this.$footerToolbar.offset().top : 0,
		dropdownHeight = dropdownOffset - this.dropdownMarginBottom;
		dropdownHeight = Math.min(this.settings.maxHeight, footerToolbarOffset ? (footerToolbarOffset - dropdownHeight)  : dropdownHeight);
		dropdownHeight = Math.max(this.settings.minHeight, Math.floor(dropdownHeight / this.dropdownItemHeight) * this.dropdownItemHeight);
		this.$dropdown.height(dropdownHeight);
	}
	updateSelectedItemsList() {
		var remaining,
		items = this.getItems(),
		maxDisplayed = 3,
		selected = [
		];
		this.$selectedItemsList.empty();
		items.each((i, element) => {
			var $element = $(element),
			$checkbox = $element.find(':checkbox');
			if (!$checkbox.is(':checked')) {
				$checkbox.removeAttr('checked');
			} else {
				selected.push($element.find('label').text());
			}
		});
		var all = (items.length == selected.length);
		this.$selectedItemsList.append($('<strong>').text(all ? i18n('allmessages-filter-all') : selected.length > 0 ? selected.slice(0, maxDisplayed).join(', ') : i18n('rightsnone')));
		// if (!all && (remaining = selected.length - maxDisplayed) > 0) {
		// 	this.$selectedItemsList.html($.msg('wikiastyleguide-dropdown-selected-items-list', this.$selectedItemsList.html(), remaining));
		// }
		this.$dropdown.css('width', this.$selectedItems.outerWidth());
		this.fire('update');
	}
	getSelectedValues() {
		return this.getSelectedItems().map(function () : any {
			return $(this).val();
		}).get();
	}
}