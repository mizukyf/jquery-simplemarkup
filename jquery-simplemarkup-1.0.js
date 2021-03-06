/** 
 * @projectDescription jquery.simplemarkup.js is a small clone of markItUp! editor.
 *
 * @author 	mizuki fujitani (makinosuke) f-mzk@m78.com
 * @version 1.0
 * @license GPL
 */

(function($){

var SMU_NS = 'simplemarkup@m12i.com';

var simple_markup = function(options, textarea){
	var that = {}, wrap, canvas, toolbar, status, is_blocked = false;
	
	options = $.extend({
		width: 'auto',
		height: 300,
		toolbar: true,
		resizeHandle: true,
		select: false,
		markupSet: [
			/*
			 * {
			 *     name: {String},
			 *     label: {String},
			 *     className: {String},
			 *     iconClass: {String},
			 *     openWith: {String | Function},
			 *     closeWith: {String | Function},
			 *     replaceWith: {String | Function},
			 *     beforeInsert: {Function},
			 *     afterInsert {Function},
			 *     placeHolder: {String}
			 * },
			 * { ... }, ...
			 * 
			 */
		]
		
	}, options);
	
	if(options.markupSet.length === 0){
		options.toolbar = false;
	}
	if(options.highlight && options.highlightScheme.length === 0){
		options.highlight = false;
	}
	
	// UI (1)
	
	wrap = $('<div class="simplemarkup"><div class="smu-container ui-widget ui-widget-content ui-corner-all"><div style="'+(options.toolbar ? '' : 'display: none;')+'" class="smu-toolbar"><ul class="ui-helper-clearfix"></ul></div><div class="smu-canvas ui-widget-content"></div></div></div>');
	
	textarea = textarea ? $(textarea).after(wrap) : $('<textarea></textarea>');
	canvas = $('div.smu-canvas', wrap).css({
		width: options.width,
		height: options.height,
	});
	canvas.prepend(textarea);
	
	textarea.mouseup(function(event){ // fake-select event
		status = get_sel();
		status.event = event;
		if(options.select){
			options.select.call(that, status);
		}
	});
	
	block = $('div.smu-block', canvas);
	buttons = $('div.smu-toolbar > ul', wrap);
	
	// Internal functions
	
	var get_sel = function(){
		var selection, caretPosition,
		val = textarea.val(), dom = textarea.focus().get(0);
		
		if (document.selection) {
			selection = document.selection.createRange().text;
			if ($.browser.msie) { // ie
				var range = document.selection.createRange(), rangeCopy = range.duplicate();
				rangeCopy.moveToElementText(dom);
				caretPosition = -1;
				while(rangeCopy.inRange(range)) { // fix most of the ie bugs with linefeeds...
					rangeCopy.moveStart('character');
					caretPosition ++;
				}
			} else { // opera
				caretPosition = dom.selectionStart;
				val = dom.value;
			}
		} else { // gecko
			caretPosition = dom.selectionStart;
			selection = val.substring(caretPosition, dom.selectionEnd);
		}
		
		if(selection.length === 0 && caretPosition === val.length){
			textarea.scrollTop(9999)
		}
		
		return {
			selection: selection,
			scrollPosition: textarea.scrollTop(),
			caretPosition: caretPosition,
			textarea: dom,
			
			fulltext: val,
			start: caretPosition,
			end: caretPosition + selection.length,
			before: val.substring(0, caretPosition),
			after: val.substring(caretPosition + selection.length)
		};
	},
	set_sel = function (start, length) {
		var dom = textarea.focus().get(0), value = dom.value;
		
		if($.browser.opera && value.indexOf('\r') !== -1){ // opera
			var i = 0;
			while(i <= start){
				if(value.charAt(i) === '\r'){
					start ++;
				}
				i ++;
			}
			// i = start;
			while(i <= start + length){
				if(value.charAt(i) === '\r'){
					length ++;
				}
				i ++;
			}
		}
		
		if (dom.createTextRange){
			range = dom.createTextRange();
			range.collapse(true);
			range.moveStart('character', start); 
			range.moveEnd('character', length); 
			range.select();
		} else if (dom.setSelectionRange ){
			dom.setSelectionRange(start, start + length);
		}
		textarea.mouseup(); // fire fake-select event listener.
	},
	setup_button = function(){
		buttons.empty();
		var button_defaults = {
			name: 'button',
			label: '', // extended
			className: '',
			iconClass: '', // extended
//			openWith: '',
//			closeWith: '',
//			replaceWith: '',
			beforeInsert: false,
			afterInsert: false,
			placeHolder: ''
			
		}, button;
		for(i = 0; i < options.markupSet.length; i++){
			button = options.markupSet[i];
			if(typeof button !== 'object'){
				continue;
			}else{
				button = $.extend({}, button_defaults, button);
			}
			buttons.append($('<li class="smu-button ui-state-default ui-corner-all '+button.className+'"><div class="smu-button-icon '+button.iconClass+'"></div><div class="smu-button-label"'+(button.label.length ? '' : ' style="diaplay: none;"')+'>'+button.label+'</div></li>').click((function(button){
				return function(event){
					if(!is_blocked){
						markup(button, event);
					}
				};
			})(button)).hover(function(){
				if(!is_blocked) $(this).addClass('ui-state-hover');
			},function(){
				$(this).removeClass('ui-state-hover');
			}).mousedown(function(){
				if(!is_blocked) $(this).addClass('ui-state-active');
			}).mouseup(function(){
				$(this).removeClass('ui-state-active');
			}).mouseout(function(){
				$(this).removeClass('ui-state-active');
			}));
		}
	},
	markup = function(setting, event){
		status = $.extend({}, setting, get_sel());
		status.event = event;
		var scroll = textarea.scrollTop(),
		before = status.before, selection = status.selection, after = status.after;
		
		if(setting.beforeInsert
		&& setting.beforeInsert.call(that, status) === false){
			return false;
		}
		
		before += 'openWith' in setting
			? $.isFunction(setting.openWith)
				? setting.openWith(status)
				: setting.openWith
			: '';
		
		selection = 'replaceWith' in setting
			? $.isFunction(setting.replaceWith)
				? setting.replaceWith(status)
				: setting.replaceWith
			: selection.length === 0 && 'placeHolder' in setting 
				? setting.placeHolder
				: selection;
		
		after = ('closeWith' in setting
			? $.isFunction(setting.closeWith)
				? setting.closeWith(status)
				: setting.closeWith
			: '') + after;
		
		if(before === false || selection === false || after === false){
			return false;
		}
		
		if(setting.afterInsert
		&& setting.afterInsert.call(that, status) === false){
			return false;
		}
		textarea.val(before + selection + after).scrollTop(scroll);
		set_sel( status.end + (before.length - status.before.length)
			+ (selection.length - status.selection.length)
			+ (after.length - status.after.length) , 0);
	},
	resizable = function(bool){
		if(bool){
			canvas.resizable({
				handles: 's',
				resize: function(){
					canvas.css({
						width: 'auto',
						top: null,
						left: null
					});
				}
			});
		}else{
			canvas.resizable('destroy');
		}
	};
	
	// External functions
	
	var method_option = function(optionName, optionValue){
		if(arguments.length > 1 && typeof optionName === 'string'){
			switch(optionName){
				case 'width':
				case 'height':
					options[optionName] = optionValue;
					canvas.css({width: options.width, height: options.height});
					break;
				case 'select':
					options[optionName] = optionValue;
					break;
				case 'markupSet':
					options[optionName] = optionValue;
					setup_button();
					break;
				case 'resizeHandle':
					options[optionName] = (optionValue !== false);
					resizable();
					break;
				case 'toolbar':
					options[optionName] = (optionValue !== false);
					canvas.prev().css('display', optionValue !== false ? 'block' : 'none');
					break;
			}
			return that;
		}else{
			return options[optionName];
		}
	},
	method_val = function(string){
		if(arguments.length && typeof string === 'string'){
			textarea.val(string);
			return that;
		}else{
			return textarea.val();
		}
	},
	method_scroll = function(number){
		if(typeof number === 'number'){
			textarea.scrollTop(number);
		}
		return that;
	},
	method_markup = function(setting){
		markup(setting);
		that;
	},
	method_selection = function(start, length){
		if(arguments.length === 2){
			set_sel(typeof start === 'number' && start >= 0 ? start : 0, typeof length === 'number' && length >= 0 ? length : 0);
			return that;
		}else{
			return get_sel();
		}
	},
	method_textarea = function(){
		return textarea;
	},
	method_ui = function(){
		return wrap;
	},
	method_block = function(){
		textarea.attr('disabled', true).addClass('ui-state-disabled');
		$('> li', buttons).addClass('ui-state-disabled');
		is_blocked = true;
		return that;
	},
	method_unblock = function(){
		$('> li', buttons).removeClass('ui-state-disabled');
		textarea.removeAttr('disabled').removeClass('ui-state-disabled');
		is_blocked = false;
		return that;
	},
	method_destroy = function(){
		$.removeData(textarea.get(0), SMU_NS);
		wrap.before(textarea).remove();
		for(var i in that){
			if(that.hasOwnProperty){
				that[i] = undefined;
			}
		}
		return textarea;
	};
	that.option = method_option;
	that.val = method_val;
	that.scroll = method_scroll;
	that.markup = method_markup;
	that.selection = method_selection;
	that.block = method_block;
	that.unblock = method_unblock;
	that.ui = method_ui;
	that.textarea = method_textarea;
	that.destroy = method_destroy;
	
	// UI (2)
	
	setup_button();
	if(options.resizeHandle && $.ui.resizable){
		resizable(true);
	}
	
	$.data(textarea.get(0), SMU_NS, that);
	return that;
};

$.extend({
	simpleMarkUp: function(/* {Object} */ userOptions){
		return simple_markup(userOptions);
	}
});

$.fn.extend({
	simpleMarkUp: function(/* {Object | String} */ userOptions, arg0, arg1){
		var result = this, args = arguments;
		this.each(function(){
			if(this.nodeName.toLowerCase() === 'textarea'){
				if(typeof userOptions !== 'string'){
					simple_markup(userOptions, this);
				}else{
					var smu = $.data(this, SMU_NS);
					if(userOptions === 'object'){
						result = smu;
						return false;
					}else if(userOptions in smu && $.isFunction(smu[useOptions])){
						if(args.length >= 2){
							result = smu[useOptions](arg0, arg1);
							return false;
						}else{
							smu[useOptions](arg0, arg1);
						}
					}
				}
			}
		});
		return result;
	}
});

})(jQuery);
