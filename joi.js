/*# joi: the sunnier side of Javascript
 *# version 0.5 alpha
 *# Developed by Nathan Wall, 2005-2012.
 *# http://joijs.com/
 *# 
 *# This version of joi is released to the public domain by its author.
 *# 
 *# You are free to use this version of the joi in any capacity you wish.
 *# This is a test version of joi and may be vulnerable to exploits.
 *# The author provides this library as a free resource to anyone, and
 *# is not responsible for any errors or vulnerabilities in the library.
 *# 
 *# Visit the website for updates and any further information.
 */
var joi = (function() {
  
	var $buildNumber = 76471762;
	
	var $window, $document, undefined, nullf = function() { };
	
	 // TODO: What was this? Should I get it working again?

function extend(extendWhat, extendWith) {
	
	var g, s;
	
	if(!extendWith) {
		return;
	}
	
	for(var i in extendWith) {
		/* TODO: Once browsers start getting support for Object.defineProperty, allow for that as well
		 * (and update other places in the jsl where __defineGetter__ is used to also use defineProperty
		 * for browsers that only support it (e.g. IE9, when it comes out)).
		 */
		if(extendWith.__lookupGetter__) {
			g = extendWith.__lookupGetter__(i);
			s = extendWith.__lookupSetter__(i);
			if(g || s) {
				if(g) {
					extendWhat.__defineGetter__(i, g);
				}
				if(s) {
					extendWhat.__defineSetter__(i, s);
				}
			} else {
				extendWhat[i] = extendWith[i];
			}
		} else {
			extendWhat[i] = extendWith[i];
		}
	}
	
	//if(!window.c) window.c = 1; // TODO: see TODO below starting "why if you uncomment these two..."
	if(Browser.isIe && Browser.version.major < 9) {
		/* forceOverride is needed on IE6 because certain property names aren't iterated over, even when they're user-defined.
		 * Non-IE browsers skip this for efficiency.
		 * 2012/01/25: It seems IE9 does iterate over the property names, so I have
		 * added the check to skip this on IE9 or greater.
		 */
		var forceOverride = [ 'toString', 'valueOf' ]; //  TODO: get a complete list of these.
		var s;
		for(var i = 0; i < forceOverride.length; i++) {
			s = forceOverride[i];
			if(extendWith[s].toString().indexOf('[native code]') == -1) {
				//if(window.c++ < 20) alert('9up:' + extendWith[s]); // TODO: why if you uncomment these two window.c lines does the Collection's method sayind "...toArray().toString()" come up so much?
				/* NOTE: 2012/01/25: I tried examining the problem mentioned above in Firefox
				 * by commenting out the browser check line (so that Firefox processed this part)
				 * and then uncommenting the window.c lines. I did not see the result the note above
				 * is talking about (namely repetitive "...toArray().toString()" alerts). Perhaps the
				 * problem was inadvertantly fixed while other code was being edited in the past several
				 * years since the note was left.  Or perhaps the problem only pertained to IE6.
				 * For now, I am leaving this note in here.  In the future, it can be decided whether to
				 * remove this note or test on IE6.
				 */
				extendWhat[s] = extendWith[s];
			}
		}
	}
	
	return extendWhat;
	
}

function extendMethods(obj) {
	for(var i in obj) {
		if(
			(
				(obj.__lookupGetter__ && !obj.__lookupGetter__(i))
				|| !obj.__lookupGetter__
			)
			&& typeof obj[i] == 'function'
			&& !(obj[i] == Unit || obj[i].prototype instanceof Unit)
		) {
			if(!obj[i].methodName) { // TODO: If this check is removed, Html.ContainerDomUnit['#constructor'].methodName is '#constructor' while Xml.ContainerDomUnit['#constructor'].methodName is '{constructor}'. Why?
				obj[i].methodName = i;
			}
			if(!obj[i].isJFunction) {
				obj[i] = extendFunction(obj[i]);
				if(obj[i].aliasFor) {
					// TODO: This shortcut doesn't seem to be working (the originally created method (by alias) seems to be being used instead).
					obj[i] = obj[obj[i].aliasFor];
				}
			}
		}
	}
}

function getArguments(from) {
	/* This method returns an array rather than a Collection because Collections
	 * cannot be passed to function.apply(object, args), and that is a common thing
	 * that is done with arguments retrieved using the getArugments function.
	 */
	
	var args = getArguments.caller.arguments;
	var r = [ ];
	
	if(from === undefined) {
		from = 0;
	}
	
	for(var i = from; i < args.length; i++) {
		r.push(args[i]);
	}
	
	return r;
	
}

function defer(options/*, DEPRECATED arguments (see note below): arg1, arg2, arg3, ... */) {
	/* This can be used as a shortcut to creating a Task.
	 * options can be an options object or a function.
	 * If options is a function, any arguments after the function will be
	 * passed as arguments to the function.
	 * If options is an options object, it will be used to create a Task.
	 * 
	 * NOTE: Using arguments other than options is temporarily DEPRECATED.
	 * I think it would be best to put a bind argument after options, so
	 * that defer could be used like: defer(function() { this.ex(); }, this);
	 * where "this" is an object to bind the function to.
	 * TODO: get defer working as described above. It shouldn't be too hard, 
	 * as I don't think much (if anything) uses the old, deprecated way of adding
	 * arguments (arg1, arg2, arg3, ...) after the function.
	 * However it should be checked out before being redone.
	 */
	
	var t, args, obj;
	
	if(typeof options == 'function') {
		// A shortcut for a common use of defer, for efficiency
		obj = this;
		args = getArguments(1);
		setTimeout(function() {
			options.apply(obj, args);
		}, 0);
		return;
	}
	
	t = new Task(options);
	
	t.defer(function() {
		t.dispose();
	});
	
}

function deferred() {
	/* Accepts the same options as defer.
	 * 
	 * Returns a pointer to a deferred function.
	 * Different from defer because defer executes the function in a deferred way,
	 * while deferred doesn't execute the function but instead just defers it.
	 */
	var args = arguments;
	return function() {
		defer.apply(this, args);
	};
}

function bind(options/* | f, scope, arg1, arg2, arg3, ... */) {
	/* This can be used as a shortcut to creating a Task and retrieving the run method.
	 * options can be an options object or a function.
	 * If options is a function, the second argument can be the scope, and
	 * any others will be binded to the function as arguments.
	 * If options is an options object, it will be used to create a Task.
	 */
	
	var t;
	
	if(typeof options == 'function') {
		options = {
			'function': arguments[0],
			scope: arguments[1],
			arguments: getArguments(2)
		};
	}
	
	t = new Task(options);
	
	return function() {
		return t.run.apply(t, arguments);
	};
	
}

function alias(methodName) {
	/* Creates an alias of another method of an object.
	 * Ex:
	 * {
	 *    m1: alias('m2'),
	 *    m2: function() {
	 * 	    ...
	 *    }
	 * }
	 */
	var f = function() {
		return this[methodName].apply(this, arguments);
	};
	f.aliasFor = methodName;
	return f;
}

function clone(o) {
	/* Use the Unit.prototype.clone method to clone a Unit. That way
	 * it will preserve the unitConstructor. This is a lower level
	 * cloning function for cloning basic objects/hashes.
	 */
	
	var obj = { };
	
	for(var i in o) {
		if(o.hasOwnProperty(i)) {
			obj[i] = o[i];
		}
	}
	
	return obj;
	
}

function warn(s) {
	if(console) {
		console.log(s);
	}
}
var extendFunction = (function() {
	/* DEPRECATED.
	 * JFunction is temporarily deprecated pending review. Do not use JFunction until the
	 * issue of whether to keep it or remove it permanently is resolved.
	 * TODO: Think about whether JFunction should be kept around.
	 */
	/* Note: JFunction is an internal name only. JFunction should be accessed
	 * externally as joi.extendFunction.
	 * Warning: Unlike JString, JFunction objects ARE instances of the native Function
	 * constructor. Objects created with JFunction ARE NOT instances of the JFunction
	 * constructor. It is recommended that you do not use the new keyword with JFunction;
	 * although it works, it is not necessary and will most likely be confusing. Simply use
	 * it like a function that adds new methods to a function and returns it (that's
	 * exactly what it does).
	 */
	
	var constructor = function(options) {
		/* options can be either an options literal with the function property set to the
		 * function to use as the base of the JFunction or options can be the function to be
		 * used as the base itself.
		 */
		
		if(typeof options == 'undefined') {
			options = {
				'function': function() { }
			};
		} 
		
		if(typeof options['function'] == 'undefined') {
			options = {
				'function': options
			};
		}
		
		if(options['function'] == null) {
			options['function'] = function() { };
		}
		
		var f = options['function'];
		
		if(Unit && (f == Unit || f.prototype instanceof Unit)) {
			throw 'Cannot use extendFunction on a Unit constructor.';
		}
		
		extend(f, constructor.prototype);
		
		return f;
		
	};
	
	constructor.prototype = {
		
		isJFunction: true,
		
		bind: function(options) {
			/* options can be either an options literal or simply the scope followed by any optional
			 * arguments as additional arguments.
			 * example: f.bind(scope, arg1, arg2, arg3);
			 * 
			 * options:
			 * 		scope:		Optional. The scope to execute the function in. If no scope is provided,
			 * 					the scope the wrapper function is executed in is relayed.
			 * 					Note: If the comma separated option for passing arguments is used (instead
			 * 					of an options literal) the first argument should be null if the scope should
			 * 					be relayed.
			 * 		arguments:	Optional. Arguments to pass to the function.
			 * 		relay:		Optional. Whether or not arguments that are passed to the new function
			 * 					should be relayed to the orignal function after any arguments specified
			 * 					with the arguments option. Default is true.
			 */
			
			var f = this;
			
			var args = Collection.castAsArray(arguments);
			args.shift();
			
			if(!options) {
				options = {
					arguments: args
				};
			} else if(!options.scope) {
				options = {
					scope: options,
					arguments: args
				};
			}
			
			if(typeof options.relay == 'undefined') {
				options.relay = true;
			}
			
			return extendFunction(function() {
				var r = new Collection(options.arguments);
				var scope = options.scope ? options.scope : this;
				if(options.relay) {
					r.pushAll(arguments);
				}
				f.apply(scope, r.toArray());
			});
			
		},
		
		defer: function(options) {
			/* Waits until the thread is finished executing until calling the function.
			 */
			if(!options) {
				options = { };
			}
			options.task = this;
			options.interval = 0;
			options.autostart = true;
			(new TimedTask(options));
		}
		
	};
	
	/* TODO: do this for Function
	var implementInString = new Collection({
		items: [
			'charAt', 'charCodeAt', 'concat', 'eval', 'hasOwnProperty', 'indexOf', 'isPrototypeOf',
			'lastIndexOf', 'match', 'propertyIsEnumerable', 'replace', 'search', 'slice', 'split',
			'splice', 'substr', 'substring', 'toLocaleLowerCase', 'toLowerCase', 'toUpperCase'
		]
	});
	
	implementInString.forEach(function(u) {
		constructor.prototype[u] = function() {
			var ret;
			var args = getArguments();
			args.forEach(function(v, i) {
				if(v instanceof JString) {
					// Convert JString arguments to native Strings before calling the String method
					args[i] = v.toString();
				}
			});
			ret = String.prototype[u].apply(this.toString(), args);
			if(typeof ret == 'string' || ret instanceof String) {
				return new JString(ret);
			} else {
				return ret;
			}
		}
	}, this);*/
	
	return constructor;
	
}());var Browser = (function() {
	
	var StyleNames = (function() {
	
	var _StyleNames = {
		
		transform: null,
		
		fix: function(styles) {
			var fixStyles = [ 'transform' ], fixStyle;
			for(var i = 0; i < fixStyles.length; i++) {
				fixStyle = fixStyles[i];
				if(styles[fixStyle] !== undefined && _StyleNames[fixStyle]) {
					styles[StyleNames[fixStyle]] = styles[fixStyle];
					delete styles[fixStyle];
				}
			}
		}
		
	};
	
	defer(function() {
		joi.on({
			ready: function() {
				checkTransform();
			}
		});
	});
	
	function checkTransform() {
		var prefixes = [ 'Moz', 'Ms', 'Webkit', 'O' ];
		var name;
		var style = document.body.style;
		if(style.transform !== undefined) {
			_StyleNames.transform = 'transform';
		}
		for(var i = 0; i < prefixes.length; i++) {
			name = prefixes[i] + 'Transform';
			if(style[name] !== undefined) {
				_StyleNames.transform = name;
			}
		}
	}
	
	return _StyleNames;
	
}());
var Supports = (function() {
	
	var rxRgba = /^rgba/;
	
	var object = {
		
		transition: null,
		rgba: null
		
	};
	
	defer(function() {
		joi.on({
			ready: function() {
				checkTransition();
				checkRgba();
			}
		});
	});
	
	function checkTransition() {
		var style = document.body.style;
		object.transition = (
			style.transition !== undefined
			|| style.MozTransition !== undefined
			|| style.WebkitTransition !== undefined
			|| style.OTransition !== undefined
			|| style.MsTransition !== undefined
		);
	}
	
	function checkRgba() {
		var style = document.body.style;
		var result = false, oldColor;
		try {
			oldColor = style.color;
			style.color = 'rgba(0,0,0,0.9)';
			result = rxRgba.test(style.color);
			style.color = oldColor;
		} catch(x) { }
		object.rgba = result;
	}
	
	return object;
	
}());

	
	var _Browser = {
		
		isIe: (navigator.userAgent.indexOf('MSIE') != -1),
		isFirefox: (navigator.userAgent.indexOf('Firefox') != -1),
		isChrome: (navigator.userAgent.indexOf('Chrome') != -1),
		isSafari: (navigator.userAgent.indexOf('Safari') != -1) && (navigator.userAgent.indexOf('Chrome') == -1),
		isOpera: (navigator.userAgent.indexOf('Opera') != -1),
		
		version: null,
		
		getVersion: getVersion, // TODO: get rid of this and just use .version
		
		Supports: Supports,
		StyleNames: StyleNames,
		
		supportsPositionFixed: function() {
			
			if(Browser.isIe) {
				return Browser.getVersion().major >= 7;
			}
			
			return true;
			
		},
		
		supportsSvg: function() {
			/* Note: These version numbers do not necessarily represent the lowest
			 * working version for each browser, but rather just a known working version.
			 * This is not considered to be an important issue, since most of these browsers
			 * do a good job of keeping themselves updated, so the version numbers being used
			 * are probably a fair check just to see if the browser isn't an out of date version.
			 */
			if(_Browser.isIe) {
				/* Even though IE9 supports some SVG, IE is excluded by this
				 * method because it's implementation of SVG can also be pretty
				 * buggy.
				 * TODO: Reevaluate for IE10.
				 */
				return false;
			}
			if(_Browser.isChrome) {
				return true;
			}
			if(_Browser.isFirefox && _Browser.version.major >= 10) {
				return true;
			}
			if(_Browser.isSafari && _Browser.version.major >= 534) {
				return true;
			}
			if(_Browser.isOpera && _Browser.version.major >= 9) {
				return true;
			}
			return false;
		}
		
	};
	
	_Browser.version = getVersion(); // NOTE: This object is replaced by a Version object after the Version constructor is created in Version.jsx.
	
	function getVersion() {
		
		var r, s;
		var ua, eov;
		
		if(_Browser.isIe) {
			ua = 'MSIE';
		} else if(_Browser.isFirefox) {
			ua = 'Firefox';
		} else if(_Browser.isChrome) {
			ua = 'Chrome';
		} else if(_Browser.isSafari) {
			ua = 'Safari';
		} else if(_Browser.isOpera) {
			ua = 'Opera';
		}
		
		if(ua) {
			s = navigator.userAgent;
			s = s.substring(s.indexOf(ua + '/') + ua.length + 1);
			eov = s.indexOf(/\s;/);
			if(eov != -1) {
				s = s.substring(0, eov)
			}
		} else {
			s = '0.0.0'; // TODO: work on versioning for other browsers
		}
		
		r = s.split('.');
		
		return {
			major: r[0],
			minor: r[1],
			toString: function() {
				return this.major + '.' + this.minor;
			}
		};
		
	}
	
	return _Browser;
	
})();var Unit = (function() {
	
	var constructor = function(options) {
		/* options
		 * 		dontConstruct:		Optional. Instructs the constructor not to complete the construction of the Unit.
		 * 							This is used when a subconstructor is created for a Unit.
		 * 		on:					Optional. An object literal or Hashtable of method names and either a corresponding
		 * 							function or a corrosponding array or Collection of functions.
		 * 		instanceName:		Optional. Names this instance of the Unit (can be used for identification in debugging).
		 * 		disposableWith:		Optional. Specifies a "parent" Unit which will dispose of this Unit when it is disposed.
		 * 							This is equivalent to adding this Unit the parent Unit's disposable array.
		 */
		
		var disposable, on;
		
		if(options && options.dontConstruct) {
			/* Note: The dontConstruct option will only ever be passed to the Unit's _defined_ constructor
			 * because all other constructors will be wrapped, and the wrappers will bypass the defined
			 * constructors if dontConstruct is passed. Therefore, Unit is the only constructor which needs
			 * to check for this option.
			 */
			return;
		}
		
		if(!this.unitConstructor) {
			this.unitConstructor = Unit;
		}
		
		if(options) {
			
			on = options.on;
						
			if(on && !(on instanceof Function)) {
				/* TODO: Why does it check to see if on is an instanceof Function?
				 * Could the newly added short on syntax mess with this in any way?
				 */
				this.on(on);
			}
			
			if(!options.instanceName) {
				this.instanceName = null;
			} else {
				this.instanceName = options.instanceName;
			}
			
			if(options.disposableWith) {
				options.disposableWith.disposable.push(this);
			}
			
		}
				
	};
	
	constructor.prototype = {
		
		unitName: 'Unit',
		
		unitConstructor: null,
		
		base: function() {
			// TODO: this system could be thrown off if an error is thrown inside a base method
			
			var c = this.base.caller;
			var methodName = c.methodName;
			var oB, b, val;
			
			oB = this['#base:' + methodName];
			
			if(!oB) {
				oB = this.unitConstructor;
			}
			
			b = oB;
			do {
				b = b.base;
			} while(methodName != '{constructor}' && b.prototype[methodName] == oB.prototype[methodName]);
			this['#base:' + methodName] = b;
			
			if(methodName == '{constructor}') {
				val = b.apply(this, arguments);
			} else {
				val = b.prototype[methodName].apply(this, arguments);
			}
			
			this['#base:' + methodName] = oB;
			
			return val;
			
		},
		
		clone: function() {
			
			var obj = new this.unitConstructor();
			
			for(var i in this) {
				if(this.hasOwnProperty(i)) {
					obj[i] = this[i];
				}
			}
			
			return obj;
			
		},
		
		extend: function(obj) {
			extend(this, obj);
			return this;
		},
		
		disposable: [ ],
		
		dispose: function() {
			
			this.disposed = true;
			
			GarbageCollector.queue(this);
			
		},
		
		temporary: function() {
			/* This marks the unit to be disposed at a later time but allows it to remain in use
			 * throughout the life cycle of the thread.
			 */
			
			GarbageCollector.temporary.mark(this);
			
		},
		
		toString: function(options) {
			/* options:
			 * 		hierarchy:	Optioanl. If true, will display a complete list of inherited constructors.
			 * 		members:	Optional. false, true/'public', or 'all'. If true or 'public', all member
			 * 					names and types will be listed except ones begining with a hash (#). If
			 * 					'all', member names begining with a hash will also be included.
			 */
			
			var hierarchy = options ? options.hierarchy : false; 
			var s;
			var check;
			
			s = '[';
			if(this.instanceName) {
				s += this.instanceName + ':';
			}
			if(hierarchy) {
				s += this.getHierarchy();
			} else {
				if(this.unitName) {
					s += this.unitName;
				} else if(this.unitName) { // DEPRECATED, use unitName instead
					s += this.unitName;
				} else {
					s += '(unknown Unit)';
				}
			}
			s += ']';
			
			if(!options) {
				options = { };
			}
			
			if(options.members) {
				s += ' = { \n';
				check = false;
				for(var i in this) {
					if(options.members == 'all' || i.charAt(0) != '#') {
						check = true;
						s += '\t' + i + ': ';
						if(typeof this[i] == undefined) {
							s += 'undefined';
						} else if(this[i] == null) {
							s += 'null';
						} else if (typeof this[i] == 'boolean') {
							s += this[i];
						} else if(typeof this[i] == 'number') {
							s += this[i];
						} else if(typeof this[i] == 'array' || this[i] instanceof Collection) {
							s += '[' + this[i].toString() + ']';
						} else if(typeof this[i] == 'string') {
							s += "'" + this[i] + "'";
						} else if(typeof this[i] == 'function') {
							s += '[function Function]';
						} else if(this[i] instanceof String || this[i] instanceof XString) {
							s += "'" + this[i].toString() + "'";
						} else if(this[i] instanceof Unit) {
							s += this[i].toString();
						} else if(typeof this[i] == 'object') {
							s += '[object Object]';
						} else {
							s += '[' + typeof this[i] +' ?]';
						}
						s += ',\n';
					}
				}
				if(check) {
					s = s.substring(0, s.length - 2);
				}
				s += '\n}';
			}
			
			return s;
			
		},
		
		on: function(options, returnHandlers) {
			/* options can either be an object literal or a Hashtable.
			 * An alternate form is also supported: on(methodName, function, returnHandlers)
			 * 
			 * options should be method names with corresponding functions to execute when the
			 * method is called. More than one function for one method can be specified in an array.
			 * 
			 * returnHandlers can be used to request that EventHandlers be returned. By default
			 * EventHandlers will not be returned to keep the number of objects created low.
			 */
			
			var object = this, opTmp;
			
			if(typeof options == 'string') {
				opTmp = { };
				opTmp[arguments[0]] = arguments[1];
				returnHandlers = arguments[2];
				options = opTmp;
			}
			
			if(options instanceof Hashtable) {
				options = options.toLiteral();
			}
			
			var eventHandlers = null, eh, r, ehr;
			
			if(returnHandlers) {
				eventHandlers = new EventHandling.EventHandlerHashtable();
			}
			
			for(var method in options) {
				
				if(options[method] instanceof Function) {
					r = [ options[method] ];
				} else {
					r = options[method];
				}
				
				if(this[method].beforeListen) {
					/* beforeListen can be used by methods which need to be set up in some way
					 * before the listener is added. This is used by Html.Element in order to
					 * set up the event listener for the DOM element.
					 */
					this[method].beforeListen(this, method, r); // TODO: Should r be cast as a Collection? NOTE: If so, only cast it before passing it to beforeListen, not before, as it's not needed.
				}
				
				if(!this[method].isListener) {
					this[method] = EventHandling.createListener(this[method]);
					this[method]['#listenerOwner'] = this; // This information is used by the GarbageCollector.
				}
				
				if(returnHandlers) {
					ehr = new EventHandling.EventHandlerCollection();
				}
				
				for(var i = 0; i < r.length; i++) {
					if(returnHandlers) {
						eh = new EventHandling.EventHandler({
							scope: this,
							listener: this[method],
							'function': r[i]
						});
					} else {
						(function(f, listener) {
							/* Using this faux EventHandler when possible can make significant
							 * improvements in performance over using a real EventHandler object.
							 */
							eh = {
								'#listener': listener,
								run: function() { return f.apply(object, arguments); },
								dispose: EventHandling.EventHandler.prototype.dispose,
								base: function() { },
								'#canSkipDispose': true
							};
						})(r[i], object[method]);
					}
					this[method].eventHandlers.push(eh);
					if(returnHandlers) {
						ehr.push(eh);
					}
				}
				
				if(returnHandlers) {
					eventHandlers.put(method, ehr);
				}
				
			}
			
			return eventHandlers;
			
		},
		
		getHierarchy: function() {
			
			var r = new Collection();
			
			var sc = this.unitConstructor;
			
			while(sc) {
				r.push(sc);
				sc = sc.base;
			}
			r.reverse();
			
			r.toString = function() {
				var s = '';
				for(var i = this.length - 1; i >= 0; i--) {
					if(this[i].prototype.unitName) {
						s += ' < ' + this[i].prototype.unitName;
					} else {
						s += ' < ' + this[i].prototype.unitName;
					}
				}
				return s.substring(3);
			};
			
			return r;
			
		}
		
	};
	
	constructor.prototype.base['#dontExpose'] = true; // TODO: What else shouldn't be exposed?
	
	var callExtendMethods = (function(){
		
		var queue = [];
		
		return function(obj) {
			if(typeof Html == 'undefined') {
				queue.push(obj);
			} else {
				while(queue.length > 0) {
					extendMethods(queue.shift());
				}
				extendMethods(obj);
			}
		};
		
	})();
	
	function setupGetters(obj, getters) {
		/* If the browser supports getters, they will be set up here. Otherwise, when the object
		 * is created, the getters will be turned into members.
		 */
		
		for(var i in getters) {
			obj.__defineGetter__(i, wrapGetter(i, getters[i]));
		}
		
	}
	
	function wrapGetter(name, f) {
		/* Getters are wrapped to keep them from being executed on the prototype level accidentally.
		 * (The possibility is unusual and was really only noticed during debugging with Firebug, but
		 * it had the potential of creating problems, so getters have been wrapped now.)
		 * The simple check done makes sure that the getter is being called on an instantiated object
		 * instead of a constructor's prototype.
		 */
		return function() {
			if(this.unitConstructor) {
				if(!Browser.isSafari) {
					/* Safari 5 throws an error:
					 * "TypeError: setting a property that has only a getter"
					 */
					this[name] = f;
				}
					/* Skip this check on the next call with this object, to improve performance.
					 * Note that in some sense this breaks the inheritence chain, so that if the
					 * getter is changed on the prototype, it won't be changed across all inheriting
					 * objects. It is believed, however, that this is not a very big deal due to the
					 * way getters are defined in the jsl, so the decision has been made to err toward
					 * improved performance.
					 */
				return f.apply(this, arguments);
			}
		};
	}
	
	function setupGettersUnsupported(obj, getters) {
		/* This function is used by browsers which don't support getters.
		 */
		
		for(var i in getters) {
			obj[i] = getters[i].call(obj, true);
		}
		
	}
	
	extend(constructor, {
		
		cast: function(obj) {
			/* Use to cast an object as a type of Unit.
			 * For instance, Collection.cast(r) will cast array r as a Collection.
			 * This is different from new Collection(r) because this will not create
			 * a new Collection if r is already a Collection.
			 * TEMPORARILY DEPRECATED. Use the use method or the new keyword for now until
			 * a decision is made about whether to keep cast around (or to merge use with
			 * cast). A potential downside to cast is it is likely to result in undisposed
			 * units. That may not really matter, however, as things like Collections, Hashtables,
			 * etc (the kinds of things that would normally be used with cast) may not really
			 * need to be disposed in order for the JS to mark them as unused memory once they
			 * fall out of practical use. This should probably be researched some and the importance
			 * of actually disposing different types of things should be considered.
			 */
			
			if(!(obj instanceof this)) {
				obj = new this(obj);
			}
			
			return obj;
			
		},
		
		use: function(obj) {
			/* use works like cast except any new units which are created are only temporary
			 * and should only be used within the thread in which they are created. They will
			 * eventually be disposed of automatically.
			 */
			
			if(!(obj instanceof this)) {
				obj = new this(obj);
				obj.temporary();
			}
			
			return obj;
			
		},
		
		clone: constructor.prototype.clone,
		
		extend: constructor.prototype.extend,
		
		sub: function(subConstructor) {
			
			var getters = null;
			var disposable = subConstructor.prototype.disposable;
			
			delete subConstructor.prototype.disposable;
						
			var c = function(options) {
				
				if(!options) {
					options = { };
				}
				
				if(options.dontConstruct) {
					return;
				}
				
				if(!this.unitConstructor) {
					this.unitConstructor = c;
				}
				
				if(getters && !this.delayGetterCreation) {
					setupGettersUnsupported(this, getters);
				}
				
				if(!this.disposable.isInstance) {
					this.disposable = [ ];
					this.disposable.isInstance = true;
				}
				if(disposable) {
					this.disposable.push.apply(this.disposable, disposable);
				}
				
				subConstructor.apply(this, arguments);
				
				if(getters && this.delayGetterCreation) {
					setupGettersUnsupported(this, getters);
				}
				
			};
			
			/* Units support getters in order to improve performance for browsers which support
			 * them. Browsers which don't support getters will deal with the getters member by
			 * defining those getters when the Unit object is created.
			 * So for browers which support getters, they allow you to only create certain members
			 * when they are accessed, and for browsers which don't support getters, those members
			 * will still be accessible but will be created whether they are ever accessed or not.
			 * (See an example of this at work in Elements/Element.jsx for the styles and fx members.)
			 * 
			 * Getters can determine if they are created by an unsupported browser by checking the first
			 * argument (unsupported). This argument will be true if it is called through an unsupported
			 * means. 
			 * 
			 * NOTE: For browsers that don't support getters, all members are set up BEFORE the constructors
			 * are called. This is important because the getter functions must not access any members that
			 * are created in the constructor, or else they won't be defined yet for browsers which don't
			 * support getters (IE8-).
			 * This behavior can be changed by setting the delayGetterCreation property of the constructor's
			 * prototype to true (see EventHandling/Event.jsx for an example).
			 */
			if(subConstructor.getters) {
				if(subConstructor.__defineGetter__) {
					setupGetters(subConstructor, subConstructor.getters);
				} else {
					setupGettersUnsupported(subConstructor, subConstructor.getters);
				}
				//delete subConstructor.getters; NOTE: See comment below.
			}
			if(subConstructor.prototype.getters) {
				if(subConstructor.prototype.__defineGetter__) {
					setupGetters(subConstructor.prototype, subConstructor.prototype.getters);
				} else {
					getters = subConstructor.prototype.getters;
				}
				//delete subConstructor.prototype.getters; NOTE: This is commented out so that extensions like ContainerElement will work.
			}
			
			callExtendMethods(subConstructor);
			callExtendMethods(subConstructor.prototype);
			
			extend(c, this);
			extend(c, subConstructor);
			
			c.prototype = new this({ dontConstruct: true });
			extend(c.prototype, subConstructor.prototype);
			
			/*if(this.prototype.disposable != c.prototype.disposable) {
				c.prototype.disposable.push.apply(c.prototype.disposable, this.prototype.disposable);
			}*/
			
			c.base = this;
			c.superConstructor = c.base; // DEPRECATED. Use base instead. TODO: Remove.
			
			subConstructor.methodName = '{constructor}';
			
			if(!subConstructor.prototype.unitName) {
				c.prototype.unitName = null;
			}
			
			return c;
			
		}
		
	});
	
	callExtendMethods(constructor);
	callExtendMethods(constructor.prototype);
	
	return constructor;
	
}());var Thing = Unit;var GarbageCollector = (function() {
	/* TODO: Improve the GarbageCollector so that it works more vigorously depending
	 * on how many items it has to collect and keeps from using up too many resources
	 * when there aren't many items to collect.  Also, maybe let it judge when to collect
	 * based on the last time something was queued (waiting a while if possible since if
	 * units are currently being queued, resources should be devoted toward whatever
	 * process is currently active instead of the GarbageCollector).
	 */
	
	var pending = false;
	var queue = [ ];
	var tm;
	var tmp = {
		pending: false,
		queue: [ ],
		tm: null
	};
	
	var object = {
		
		size: 20,
		timer: 700,
		
		queue: function(unit) {
			
			queue.push(unit);
			
			if(!pending) {
				pending = true;
				tm = setInterval(object.collect, object.timer);
			}
			
		},
		
		collect: function() {
			/* Members are set to null rather than being deleted because if they are deleted,
			 * the default member from the object's constructor.prototype is used. By setting
			 * them to null they are rendered useless, thus preventing the object from accidentally
			 * being used after disposal.
			 */
			
			var unit, ehr, eh, d, q, dom;
			
			q = queue.splice(0, object.size);
			
			for(var k = 0; k < q.length; k++) {
				
				unit = q[k];
				
				if(!unit.collected) {
					
					for(var i = 0; i < unit.disposable.length; i++) {
						d = unit.disposable[i];
						if(typeof d == 'string') {
							if(unit[d] && unit[d].dispose) {
								unit[d].dispose();
							}
						} else if(d.dispose) {
							d.dispose();
						}
					}
					unit.disposable.splice(0, unit.disposable.length);
					
					for(var i in unit) {
						if(unit.__lookupGetter__ && unit.__lookupGetter__(i)) {
							unit.__defineGetter__(i, nullf);
						} else {
							if(
								typeof unit[i] == 'function'
								&& unit[i].isListener
								&& unit[i].eventHandlers
								&& unit[i]['#listenerOwner'] == unit
							) {
								ehr = unit[i].eventHandlers;
								while(eh = ehr.pop()) {
									if(!eh['#canSkipDispose']) {
										eh.dispose({ '#preRemovedFromList': true });
									}
								}
								unit[i].eventHandlers = null;
							}
							if(unit instanceof Html.DomUnit && i == 'dom') {
								// TODO: What else should be removed from the dom?
								dom = unit.dom;
								disposeChildNodes(dom);
								for(var j in dom) {
									if(j.indexOf('on') == 0) {
										dom[j] = null;
									}
								}
							}
							unit[i] = null;
						}
					}
					
				}
				
				unit.disposed = true;
				unit.collected = true;
				
			}
			
			if(queue.length == 0) {
				pending = false;
				clearInterval(tm);
				tm = null;
			}
			
		},
		
		temporary: {
			
			size: 100,
			timer: 3200,
			
			mark: function(unit) {
				
				tmp.queue.push(unit);
				
				if(!tmp.pending) {
					tmp.pending = true;
					tmp.tm = setInterval(object.temporary.dispose, object.temporary.timer);
				}
				
			},
			
			dispose: function() {
				
				var q = tmp.queue.splice(0, object.temporary.size);
				
				for(var i = 0; i < q.length; i++) {
					q[i].dispose();
				}
				
				if(tmp.queue.length == 0) {
					tmp.pending = false;
					clearInterval(tmp.tm);
					tmp.tm = null;
				}
				
			}
			
		}
		
	};
	
	function disposeChildNodes(el) {
		var r = el.childNodes, domUnit, dom;
		if(!r) {
			return;
		}
		for(var i = 0; i < r.length; i++) {
			domUnit = Html.getAssignment(r[i]);
			if(domUnit) {
				dom = r[i];
				domUnit.dispose();
				if(r[i] != dom) {
					// After the disposal, the node will be detached.
					i--;
				}
			} else if(r[i].childNodes) {
				disposeChildNodes(r[i]);
			}
		}
	}
	
	return object;
	
})();var Property = Unit.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 		object:		An object to apply the property to.
		 */
		
		this.object = options.object;
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Property',
		
		object: null
		
	};
	
	return constructor;
	
}());var Data = (function() {var Stock = Unit.sub(function() {
	
	function constructor(options) {
		/* options:
		 * 		expose:			Optional. A constructor to expose.
		 * 		emulate:		Optional. An object to emulate.
		 */
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
		if(options.expose) {
			this.expose(options.expose);
		}
		
		if(options.emulate) {
			this.emulate(options.emulate);
		}
		
	}
	
	extend(constructor.prototype, {
		
		iterator: null,
		
		emulate: function(obj) {
			/* This method allows a Collection to extend any constructor so that
			 * the prototype's methods will be called on every item of the Collection
			 * as if they had been called on each item directly.
			 */
			// TODO: get working
			
			for(var i in obj) {
				if(typeof this[i] != 'undefined') {
					throw 'Cannot emulate: method already defined!';
				}
				(function() {
					
					var method = i;
					
					this[method] = function() {
						var args = Collection.castAsArray(arguments);
						args.unshift(obj[method]);
						callEmulatedMethod.apply(this, args);
					};
					
				}).apply(this);
			}
							
		},
		
		expose: function(unit, dontExpose) {
			 /* dontExpose can be a method or array of methods to prevent from exposing.
			  * 
			  * TODO: update description
			  * 
			  * THE FOLLOWIND DESCRIPTION IS WRONG AND NEEDS TO BE UPDATED
			  *(However, at the present time, the prototype's method won't actually be called.
			 *  Basically the prototype supplies the method names that can be called, but the
			 *  methods which are on each item in the Collection are the ones that are actually called.
			 *  TODO: Is this the best way to do it? Should there be an option to force emulation to
			 *  work the other way -- by calling the prototype's method instead?) 
			 * Note: A method can contain the member #dontExpose if it should not be exposed.
			 */
			
			var exposeMethod = false;
			
			if(typeof dontExpose == 'string') {
				dontExpose = [ dontExpose ];
			}
			
			for(var i in unit.prototype) {
				if(
					typeof this[i] == 'undefined'
					&& typeof unit.prototype[i] == 'function'
					&& !unit.prototype[i]['#dontExpose']
					&& i != 'dispose' // (2010/03/14): The dispose method should never be exposed. TODO: Is there a better way to manage this? (ie methods that should never be exposed, no matter where they are defined.)
				) {
					exposeMethod = false;
					if(dontExpose) {
						for(var j = 0; j < dontExpose.length; j++) {
							if(dontExpose[j] == i) {
								exposeMethod = false;
								break;
							}
						}
					}
					if(!exposeMethod) {
						(function() {
							
							var method = i;
							
							this[method] = function() {
								var args = Collection.castAsArray(arguments);
								args.unshift(method);
								callExposedMethod.apply(this, args);
							};
							
						}).apply(this);
					}
				}
			}
			
		}
		
	});
	
	function callEmulatedMethod(method) {
		
		var args = Collection.castAsArray(arguments);
		args.shift();
		
		if(typeof this.length != 'undefined') {
			for(var i = 0; i < this.length; i++) {
				method.apply(this[i], args);
			}
		} else {
			this.forEach(function(u) {
				method.apply(u, args);
			});
		}
		
		return this;
		
	}
	
	function callExposedMethod(method) {
		
		var args = Collection.castAsArray(arguments);
		args.shift();
		
		if(typeof this.length != 'undefined') {
			for(var i = 0; i < this.length; i++) {
				this[i][method].apply(this[i], args);
			}
		} else {
			this.forEach(function(u) {
				u[method].apply(u, args);
			});
		}
		
		return this;
		
	}
	
	return constructor;
	
}());
var Collection = Stock.sub(function() {
	
	function constructor(options) {
		/* options
		 * 		items:		An array of objects.
		 */
		
		if(!options) {
			options = { };
		}
		
		if(typeof options.length != 'undefined') {
			options = {
				items: options
			};
		}
		
	this['#base:{constructor}'] = Stock; Stock.call(this, options);
		
		var r = options.items;
		
		if(!r) {
			r = [];
		}
		
		for(var i = 0; i < r.length; i++) {
			this[i] = r[i];
		}
		
		this.length = r.length;
		
	};
	
	extend(constructor, {
		
		isArray: function(r) {
			return r.constructor == Array;
		},
		
		isIterable: function(r) {
			return r.length;
		},
		
		castAsArray: function(r) {
			var r2;
			if(r instanceof Array) {
				return r;
			} else if(typeof r.length != 'undefined') {
				r2 = [];
				for(var i = 0; i < r.length; i++) {
					r2[r2.length] = r[i]; // An Opera article said this was faster than push. It implied that was true for most browsers.
				}
				return r2;
			} else {
				r2 = [ ];
				r.forEach(function(u) {
					r2.push(u);
				});
				return r2;
			}
		},
		
		castAsIterable: function(r) {
			/* The difference between castAsArray and castAsIterable is castAsArray will force an
			 * array to be returned, while castAsIterable will simply force something with a length
			 * property to be returned. castAsIterable will simply return arrays, Collections, and
			 * strings in tact, but Hashtables will be converted to arrays.
			 */
			if(typeof r.length != 'undefined') {
				return r;
			} else {
				var r2 = [];
				r.forEach(function(u) {
					r2.push(u);
				});
				return r2;
			}
		},
		
		cloneToArray: function(r) {
			/* r can be another array, a Collection, a Hashtable, a Set, or anything Collection can
			 * recognize and make iterable. The difference between this and castAsArray is if an
			 * array is passed in as the argument, then a new array is returned rather than the
			 * original. Otherwise it works just like castAsArray.
			 */
			
			if(r instanceof Array) {
				var x = [ ];
				x.push.apply(x, r);
				return x;
			} else {
				return Collection.castAsArray(r);
			}
			
		},
		
		forEach: function(r, f) {
			if(r.forEach) {
				return r.forEach(f);
			} else {
				return constructor.prototype.forEach.call(r, f);
			}
		}
		
	});
	
	constructor.prototype = {
		
		unitName: 'Collection',
		
		autoDisposeItems: false, // Whether or not to dispose items when the Collection is disposed.
		
		concat: function() { return new this.unitConstructor(Array.prototype.concat.apply(this, arguments)); },
		eval: Array.prototype.eval,
		hasOwnProperty: Array.prototype.hasOwnProperty,
		isPrototypeOf: Array.prototype.isPrototypeOf,
		join: Array.prototype.join,
		pop: Array.prototype.pop,
		propertyIsEnumerable: Array.prototype.propertyIsEnumerable,
		push: Array.prototype.push,
		reverse: function() { return new this.unitConstructor(Array.prototype.reverse.apply(this, arguments)); },
		shift: Array.prototype.shift,
		slice: function() { return new this.unitConstructor(Array.prototype.slice.apply(this, arguments)); },
		sort: function() { return new this.unitConstructor(Array.prototype.sort.apply(this, arguments)); },
		splice: function() { return new this.unitConstructor(Array.prototype.splice.apply(this, arguments)); },
		toLocaleString: Array.prototype.toLocaleString,
		toString: function() { return this.toArray().toString(); },
		unshift: Array.prototype.unshift,
		valueof: Array.prototype.valueOf,
		
		clear: function() {
			this.splice(0, this.length);
			return this;
		},
		empty: alias('clear'),
		
		clone: function() {
			
			var col = new this.unitConstructor();
			
			for(var i = 0; i < this.length; i++) {
				col.push(this[i]);
			}
						
			return col;
			
		},
		
		peek: alias('last'),
		last: function() {
			return this[this.length - 1];
		},
		
		unshiftAll: function(r) {
			if(typeof r.length != 'undefined') {
				if(r.reverse) {
					this.unshift.apply(this, r.reverse());
				} else {
					var length = r.length;
					for(var i = 0; i < length; i++) {
						this.unshift(r[i]);
					}
				}
			} else if(r.forEach) {
				r.forEach(function(u) {
					this.unshift(u);
				}, this);
			} else {
				throw 'Cannot iterate object: ' + r;
			}
		},
		
		pushAll: function(r) {
			if(typeof r.length != 'undefined') {
				if(r instanceof Array) {
					this.push.apply(this, r);
				} else {
					this.push.apply(this, Collection.castAsArray(r));
				}
			} else if(r.forEach) {
				r.forEach(function(u) {
					this.push(u);
				}, this);
			} else {
				throw 'Cannot iterate object: ' + r;
			}
		},
		
		forEach: function(f, bind) {
			/* Executes a function for each item in the Collection.
			 * 
			 * f can be a function or a method name. If f is a method name, the method will
			 * be executed for each item in the Collection. bind cannot be specified if
			 * f is a method name, instead any arguments following f will be passed to the method. 
			 * 
			 * If a function is specified for f and a value is returned from one of the function calls,
			 * the iteration will break and the value will be returned. (The reason the native Firefox
			 * forEach is replaced with this one is to allow for a break and return value.)
			 * 
			 * If a string is specified for f, then iteration cannot be broken.
			 */
			
			var val, args;
						
			if(typeof f == 'string') {
				args = getArguments(1);
				for(var i = 0; i < this.length; i++) {
					this[i][f].apply(this[i], args);
				}
			} else {
				if(!bind) {
					bind = this;
				}
				for(var i = 0; i < this.length; i++) {
					val = f.call(bind, this[i], i);
					if(val) {
						return val;
					}
				}
			}
			
		},
		
		exists: alias('has'),
		contains: alias('has'),
		has: function(item) {
			
			var val = false;
			
			this.forEach(function(u) {
				if(u === item) {
					val = true;
					return true; // break
				}
			});
			
			return val;
			
		},
		
		remove: function(from, to) {
			/* from can be an index or it can be an item to be removed.
			 */
			
			if(typeof from != 'number') {
				this.purge(from, true);
				return this;
			}
			
			if(!to) {
				to = from;
			}
			
			// Array@splice is used to keep a new Collection from being created.
			Array.prototype.splice.call(this, from, to - from + 1);
			
			return this;
			
		},
		
		purge: function(item, removeOne) {
			/* Removes all instances of item in the Collection unless removeOne
			 * is specified. The primary purpose of removeOne is to allow callers
			 * to improve performance where it is known that only one instance
			 * of the item occurs in the Collection.
			 */
			
			var splice = Array.prototype.splice;
			
			if(removeOne) {
				/* This condition is checked here instead of inside the loop to
				 * improve performance (since this way it only needs to be
				 * checked once instead of repetitively).
				 */
				for(var i = 0, l = this.length; i < l; i++) {
					if(this[i] === item) {
						splice.call(this, i, 1);
						break;
					}
				}
			} else {
				for(var i = 0, l = this.length; i < l; i++) {
					if(this[i] === item) {
						splice.call(this, i, 1);
						i--;
						l--;
					}
				}
			}
			
			return this;
			
		},
		
		purgeAll: function(r) {
			if(typeof r.length != 'undefined') {
				if(r instanceof Array) {
					this.purge.apply(this, r);
				} else {
					this.purge.apply(this, Collection.castAsArray(r));
				}
			} else if(r.forEach) {
				r.forEach(function(u) {
					this.purge(u);
				}, this);
			} else {
				throw 'Cannot iterate object: ' + r;
			}
		},
		
		purgeDuplicates: function() {
			for(var i = 0; i < this.length - 1; i++) {
				for(var j = i + 1; j < this.length; j++) {
					if(this[i] === this[j]) {
						this.splice(j, 1);
						j--;
					}
				}
			}
		},
		
		random: alias('getRandom'),
		getRandom: function() {
			return this[JMath.Random.getInteger(0, this.length - 1)];
		},
		
		toArray: function() {
			
			var r = [];
			
			//r.push.call(r, this);
			for(var i = 0 ; i < this.length; i++) {
				r.push(this[i]);
			}
			
			return r;
			
		},
		
		quicksort: function(f) {
			// Note: Unlike the native sort method, this allows a member name to be passed as the argument.
			return JMath.Sort.quicksort(this, f);
		},
		
		getMax: function() {
			var max = this[0];
			for(var i = 1; i < this.length; i++) {
				if(this[i] > max) {
					max = this[i];
				}
			}
			return max;
		},
		
		getMin: function() {
			var min = this[0];
			for(var i = 1; i < this.length; i++) {
				if(this[i] < min) {
					min = this[i];
				}
			}
			return min;
		},
		
		mix: function(replace) {
			/* If replace is false (default), a new Collection will be returned
			 * containing the mixed values. If replace is true, the current
			 * collection will be replaced with the mixed values.
			 */ 
			var mixed = JMath.Sort.random(this);
			if(replace) {
				for(var i = 0; i < mixed.length; i++) {
					this[i] = mixed[i];
				}
				mixed.dispose();
				return this;
			} else {
				return mixed;
			}
		},
		
		dispose: function(disposeItems) {
			if(disposeItems || this.autoDisposeItems) {
				this.forEach(function(u) {
					u.dispose();
				});
			}
			this.base();
		}
		
	};
	
	return constructor;
	
}());



var Color = Unit.sub(function() {
	
	var reRgba = /rgb[a]?\s*\(\s*([.0-9]+)\s*,\s*([.0-9]+)\s*,\s*([.0-9]+)\s*(,\s*([.0-9]+)\s*)?\)/;
	
	function constructor(options) {
		/* options:
		 * 		value:	Optional. A string representation of the rgba value or an object with
		 * 				red, green, blue, and/or alpha properties defined.
		 * 				Can be in hash form (e.g. '#00f') or rgb/rgba form (e.g. 'rgb(0, 0, 255)').
		 * 
		 * options can simply be the value option.
		 */
		
		if(options && (typeof options == 'string' || options.red)) {
			options = {
				value: options
			};
		}
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
		this['#value'] = [ 0, 0, 0 ];
		
		if(options && options.value) {
			this.setValue(options.value);
		}
		
	};
	
	constructor.prototype = {
		
		unitName: 'Color',
		
		'#value': null,
		
		setValue: function(s) {
			
			var val;
			
			if(typeof s != 'string') {
				val = [
					s.red,
					s.green,
					s.blue
				];
				if(s.alpha) {
					val.push(s.alpha);
				} else {
					val.push(1);
				}
			} else if(s.charAt(0) == '#') {
				val = parseHash(s);
			} else if(s.substring(0, 3) == 'rgb') {
				val = parseRgba(s);
			} else {
				throw 'String value not understood: ' + s;
			}
			
			this['#value'] = val;
			
		},
		
		getRgba: function() {
			var val = this['#value'];
			return {
				red: val[0],
				green: val[1],
				blue: val[2],
				alpha: val[3]
			};
		},
		
		toHex: function() {
			var val = this['#value'];
			var s = '';
			s += zeroPad(val[0].toString(16));
			s += zeroPad(val[1].toString(16));
			s += zeroPad(val[2].toString(16));
			return '#' + s;
		},
		
		toRgb: function() {
			var val = this['#value'];
			return 'rgb(' + val[0] + ',' + val[1] + ',' + val[2] + ')';
		},
		
		toRgba: function() {
			var val = this['#value'];
			return 'rgba(' + val[0] + ',' + val[1] + ',' + val[2] + ',' + val[3] + ')';
		},
		
		toSupportedString: function() {
			// Returns rgba if the browser supports it; otherwise, returns rgb.
			if(Browser.Supports.rgba) {
				return this.toRgba();
			} else {
				return this.toRgb();
			}
		}
		
	};
	
	function zeroPad(s) {
		if(s.length == 1) {
			return '0' + s;
		} else return s;
	}
	
	function parseHash(s) {
		var r, val = [ ];
		s = s.substring(1);
		if(s.length == 3) {
			r = s.split('');
			for(var i = 0; i < r.length; i++) {
				r[i] = r[i] + r[i];
			}
		} else if(s.length == 6) {
			r = [ ];
			for(var i = 0; i < s.length; i += 2) {
				r.push(s.substring(i, 2));
			}
		} else {
			throw 'String value not understood: ' + s;
		}
		for(var i = 0; i < r.length; i++) {
			val.push(parseInt(r[i], 16));
		}
		val.push(1);
		return val;
	}
	
	function parseRgba(s) {
		var mR = reRgba.exec(s);
		var val = [ ];
		if(mR.length < 4) {
			throw 'String value not understood: ' + s;
		}
		val.push(mR[1] * 1);
		val.push(mR[2] * 1);
		val.push(mR[3] * 1);
		if(mR[5]) {
			val.push(mR[5] * 1);
		} else {
			val.push(1);
		}
		return val;
	}
	
	return constructor;
	
}());var Hashtable = Stock.sub(function() {
	
	function constructor(options) {
		/* options can be either an options literal with the object property set to the
		 * object to use as the base of the Hashtable or options can be the object to be
		 * used as the base itself.
		 * 
		 * Note: [2012/03/21] The following statement was removed from above, "It is recommended that an options literal be used."
		 * I no longer believe this to be best. TODO: evaluate and remove this Note.
		 * 
		 * options
		 * 		object:				Optional/Required. An object with member names to use ase keys and corresponding values
		 * 							to put in the Hashtable.
		 * 							Note: This is required in order to use other options. Otherwise, any other options will
		 * 							be considered Hashtable keys.
		 * 		autoDisposeItems:	Optional. Whether or not to auto dispose of each item in the Hashtable when the Hashtable
		 * 							is disposed.
		 * 
		 * TODO: remove the ability to use a base object directly and force the use of an object literal
		 * Note: [2012/03/21] It is my current belief that the above TODO should probably not be implemented.
		 * TODO: [2012/03/21] Evaluate and remove the above notes.
		 * 
		 * TODO: [2012/03/21] improve lookup time for keys which are objects by converting them to strings (or indices). Look into hash functions as a possibility.
		 */
		
		if(!options) {
			options = { };
		}
		
		if(!options.object) {
			options = {
				object: options
			};
		}
		
	this['#base:{constructor}'] = Stock; Stock.call(this, options);
		
		this['#items'] = [ ];
		this['#stringKeyIndices'] = { };
		this['#hashKeyIndices'] = { };
		
		for(var i in options.object) {
			this.put(i, options.object[i]);
		}
		
		if(options.autoDisposeItems) {
			this.autoDisposeItems = true;
		}
		
	};
	
	function getKeyIndex(ht, key) {
		/* TODO: If key is a very long string, should a hash be computed for it?
		 * Would performance be improved by shortening long key strings?
		 */
		
		var index = -1;
		
		if(typeof key == 'string') {
			index = ht['#stringKeyIndices'][key];
			if(index == null) {
				return -1;
			} else {
				return index;
			}
		}
		
		var hash = computeHash(ht, key);
		var hashKeys = ht['#hashKeyIndices'];
		
		if(hashKeys[hash]) {
			return hashKeys[hash].index;
		} else {
			return -1;
		}
		
		/*
		for(var i = 0; i < ht['#items'].length; i++) {
			if(ht['#items'][i].key == key) {
				return i;
			}
		}
		
		return index;*/
		
	}
	
	function computeHash(ht, key) {
		
		var maxLength = 16;
		var maxMembers = 5, curMember = 0;
		
		var hashInc, inc = 0;
		var hashKeys = ht['#hashKeyIndices'];
		
		if(key === null) {
			return 'null';
		} else if(key === undefined) {
			return 'undefined';
		}
		var s = key.toString(), hash;
		for(var i in key) {
			curMember++;
			s += '|' + i + ':' + key[i];
			if(curMember >= maxMembers) {
				break;
			}
		}
		hash = s;
		while(s.length > maxLength) {
			hash = '';
			for(var i = 0; i < s.length; i += 2) {
				hash += s.charAt(i);
			}
			s = hash;
		}
		
		hashInc = '#' + hash;
		while(hashKeys[hashInc]) {
			if(hashKeys[hashInc].key == key) {
				break;
			}
			inc++;
			hashInc = inc + '#' + hash;
		}
		
		return hashInc;
	}
	
	extend(constructor, {
		
		castAsLiteral: function(object) {
			if(object.toLiteral) {
				return object.toLiteral();
			} else {
				return object;
			}
		},
		
		getKeys: function(obj) {
			if(obj instanceof Hashtable) {
				return obj.keys();
			} else if(obj.toLiteral) {
				obj = obj.toLiteral();
			}
			var keys = [ ];
			for(var i in obj) {
				keys.push(i);
			}
			return keys;
		}
		
	});
	
	constructor.prototype = {
		
		unitName: 'Hashtable',
		
		autoDisposeItems: false,
		
		'#items': null,
		'#stringKeyIndices': null, // For efficiency, the indices of string keys are kept in this reference object.
		'#hashKeyIndices': null,
		
		// methods similar to Java's Hashtable
		
		empty: alias('clear'),
		clear: function() {
			this['#items'].splice(0, this['#items'].length);;
			this['#stringKeyIndices'] = { };
			this['#hashKeyIndices'] = { };
		},
		
		clone: function() {
			
			var ht = new Hashtable();
			
			this.forEach(function(u, i) {
				ht.put(i, u);
			});
			
			return ht;
			
		},
		
		contains: alias('has'),
		exists: alias('has'),
		has: function(obj) {
			
			return this.forEach(function(u) {
				if(obj == u) {
					return true;
				}
			}) === true;
			
		},
		
		containsKey: function(key) {
			return this.get(key) !== undefined;
		},
		
		items: alias('values'),
		values: function() {
			/* The method name items is used rather than Java's elements because the word element
			 * is ambiguous and the greater meaning in Javascript is that having to do with HTML
			 * elements.
			 */
			
			var items = this['#items'];
			var r = new Collection();
			
			for(var i = 0; i < items.length; i++) {
				r.push(items[i].value);
			}
			
			return r;
			
		},
		
		equals: function(obj) {
			
			if(!(obj instanceof Hashtable)) {
				return false;
			}
			
			if(obj.size() != this.size()) {
				return false;
			}
			
			return this.forEach(function(u, i) {
				if(obj.get(i) != u) {
					return true;
				}
			}) !== true;
			
		},
		
		get: function(key) {
			
			var index = getKeyIndex(this, key);
			
			if(index == -1) {
				return;
			}
			
			return this['#items'][index].value;
						
		},
		
		isEmpty: function() {
			
			return this.size() == 0;
			
		},
		
		keys: function() {
			
			var keys = new Collection();
			
			this.forEach(function(u, i) {
				keys.push(i);
			});
			
			return keys;
			
		},
		
		put: function(key, obj) {
			
			var index = getKeyIndex(this, key);
			
			if(index == -1) {
				index = this['#items'].length;
				this['#items'].push({
					key: key,
					value: obj
				});
				if(typeof key == 'string') {
					this['#stringKeyIndices'][key] = index;
				} else {
					this['#hashKeyIndices'][computeHash(this, key)] = {
						key: key,
						index: index
					};
				}
			} else {
				this['#items'][index] = {
					key: key,
					value: obj
				};
			}
			
		},
		
		putAll: function(ht) {
			Hashtable.use(ht).forEach(function(u, i) {
				this.put(i, u);
			}, this);
		},
		
		remove: function(/* key, key, ... */) {
			
			var key, index;
			var stringKeys = this['#stringKeyIndices'], hashKeys = this['#hashKeyIndices'];
			var hash, hashInc, inc, hashBase;
			
			for(var i = 0; i < arguments.length; i++) {
				
				key = arguments[i];
				index = getKeyIndex(this, key);
				
				this['#items'].splice(index, 1);
				/* TODO: The following loops for fixing stringKeys and hashKeys will cause
				 * the remove method to be inefficient under some circumstances, especially
				 * when the hashtable contains many items. Another mechanism should be sought.
				 * (The way the keys are stored may need rewriting.)
				 * For instance, if #items was itself an associative array with string keys
				 * looking like i0, i1, i2, etc instead of an array with indices 0, 1, 2, etc
				 * then the indices wouldn't have to change everytime items were removed.
				 * Currently, if 1 is removed then 2 must become 1 and 3 must become 2, etc.
				 * But if i1 was removed under the other model then there could just be a gap:
				 * i0, i2, i3, etc.
				 */
				for(var j in stringKeys) {
					if(stringKeys[j] > index) {
						stringKeys[j]--;
					}
				}
				for(var j in hashKeys) {
					if(hashKeys[j].index > index) {
						hashKeys[j].index--;
					}
				}
				if(typeof key == 'string') {
					delete stringKeys[key];
				} else {
					hash = computeHash(this, key);
					if(hash && hashKeys[hash]) {
						delete hashKeys[hash];
						if(hash.charAt(0) == '#') {
							inc = 0;
							hashBase = hash;
						} else {
							inc = hash.substring(0, hash.indexOf('#')) * 1;
							hashBase = hash.substring(hash.indexOf('#'));
						}
						inc++;
						hashInc = inc + hashBase;
						while(hashKeys[hashInc]) {
							hashKeys[hashInc].index--;
							inc++;
							hashInc = inc + hashBase;
						}
					}
				}
				
			}
			
		},
		
		size: function() {
			
			return this['#items'].length;
			
		},
		
		toString: function() {
			
			var s = '[' + this.unitName + ']\n';
			
			if(this.size() == 0) {
				return s + '{ }';
			}
			
			s += '{';
			
			this.forEach(function(u, i) {
				s += '\n\t' + i + ': ' + u + ',';
			});
			
			s = s.substring(0, s.length - 1);
			
			s += '\n}';
			
			return s;
			
		},
		
		// other methods
		
		dispose: function(disposeItems) {
			if(disposeItems || this.autoDisposeItems) {
				this.forEach(function(u) {
					u.dispose();
				});
			}
			this.base();
		},
		
		toLiteral: function() {
			var obj = { };
			this.forEach(function(value, key) {
				obj[key] = value;
			});
			return obj;
		},
		
		toIterable: function() {
			return Collection.castAsIterable(this);
		},
		
		toDataSet: function(options) {
			/* options:
			 * 		key:	The field name to map the key to.
			 * 		value:	The field name to map the value to.
			 */
			
			var items = this['#items'];
			
			return new DataSet({
				fields: [ options.key, options.value ],
				data: items,
				dataHandler: function(datum) {
					var obj = { };
					obj[options.key] = datum.key;
					obj[options.value] = datum.value;
					return obj;
				}
			});
			
		},
		
		forEach: function(f, scope) {
			/* Executes a function for each item in the Hashtable.
			 * 
			 * f can be a function or a method name. If f is a method name, the method will
			 * be executed for each item in the Hashtable. scope cannot be specified if
			 * f is a method name, instead any arguments following f will be passed to the method. 
			 * 
			 * If a value is returned from one of the function calls, the iteration will
			 * break and the value will be returned.
			 */
			
			var items = this['#items'];
			var val, args, l = items.length;
			
			if(!scope) {
				scope = this;
			}
			
			if(typeof f == 'string') {
				args = getArguments(1);
				for(var i = 0; i < l; i++) {
					val = items[i].value[f].apply(items[i].value, args);
					if(val) {
						return val;
					}
					if(l != items.length) {
						// TODO: Come up with a better error handling / warning solution. This should probably just be a warning, not a full error.
						throw 'Hashtable.forEach: Length change warning. The length of a Hashtable should not be changed in a forEach loop.';
					}
				}
			} else {
				for(var i = 0; i < l; i++) {
					val = f.call(scope, items[i].value, items[i].key);
					if(val) {
						return val;
					}
					if(l != items.length) {
						// TODO: See above.
						throw 'Hashtable.forEach: Length change warning. The length of a Hashtable should not be changed in a forEach loop.';
					}
				}
			}
			
			/*this['#items'].forEach(function(u) {
				val = f.call(scope, u.value, u.key, this);
				if(val) {
					return true;
				}
			});
			
			return val;*/
			
		},
		
		quicksort: function(f) {
			/* f can be a string indicating a member of the Hashtable items to use when
			 * sorting, f can be null (indicating to sort by the items themselves), or
			 * f can be a function.
			 */
			
			var items, v, r;
			
			if(!f) {
				r = JMath.Sort.quicksort(this['#items'], 'value');
			} else if(typeof f == 'string') {
				items = [ ];
				this.forEach(function(value, key) {
					v = value[f];
					if(typeof v == 'function') {
						v = v.apply(value);
					}
					items.push({
						key: key,
						value: value,
						sortBy: v
					});
				});
				r = JMath.Sort.quicksort(items, 'sortBy');
				for(var i = 0; i < r.length; i++) {
					delete r[i].sortBy;
				}
			} else {
				// TODO: make it work for functions.
			}
			
			return new Collection(r);
			
		}
		
	};
	
	return constructor;
	
}());var Set = Collection.sub(function() {
	/* A Set is a Collection which forces all the items to be unique.
	 */
	
	function constructor(options) {
		
	this['#base:{constructor}'] = Collection; Collection.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Set',
		
		push: function(/* item, item, ... */) {
			
			var r = arguments;
			
			for(var i = 0; i < r.length; i++) {
				if(!this.exists(r[i])) {
					this.base(r[i]);
				}
			}
			
		},
		
		unshift: function(/* item, item, ... */) {
			
			var r = arguments;
			
			for(var i = 0; i < r.length; i++) {
				if(!this.exists(r[i])) {
					this.base(r[i]);
				}
			}
			
		},
		
		splice: function(index, howMany/*, item, item, ... */) {
			
			var r = getArguments(2);
			
			for(var i = 0; i < r.length; i++) {
				if(this.exists(r[i])) {
					r.splice(i, 1);
					i--;
				}
			}
			
			r.unshift(index, howMany);
			
			this.base.apply(this, r);
			
		}
		
	};
	
	return constructor;
	
}());var DataSet = Unit.sub(function() {
	
	var Field = Unit.sub(function() {
	
	function constructor(options) {
		/* options:
		 * 		name:	Required. The name of the field.
		 * 		unique: Optional. Whether the field is unique.
		 */
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
		this.name = options.name;
		
		if(options.unique) {
			this.unique = options.unique;
		}
		
	};
	
	constructor.prototype = {
		
		unitName: 'Field',
		
		name: null,
		unique: false
		
	};
	
	return constructor;
	
}());
var Fields = Property.sub(function() {
	
	function constructor(options) {
		
	this['#base:{constructor}'] = Property; Property.call(this, options);
		
		this['#fields'] = new Data.Hashtable({
			autoDisposeItems: true
		});
		
	};
	
	constructor.prototype = {
		
		unitName: 'Fields',
		
		'#fields': null,
		
		disposable: [
			'#fields'
		],
		
		exists: function(/* name, name, ... */) {
			
			var fields = this['#fields'];
			
			for(var i = 0; i < arguments.length; i++) {
				if(!fields.containsKey(arguments[i])) {
					return false;
				}
			}
			
			return true;
			
		},
		
		add: function(/* options, options, ... */) {
			/* options can be simply the name of the field or a Field options argument.
			 */
			
			var options;
			
			for(var i = 0; i < arguments.length; i++) {
				
				options = arguments[i];
				
				if(typeof options == 'string') {
					options = {
						name: options
					};
				}
				
				if(this.exists(options.name)) {
					throw 'Field already defined: ' + options.name;
				}
				
				this['#fields'].put(options.name, new Field(options));
				
			}
			
		},
		
		get: function(name) {
			return this['#fields'].get(name);
		},
		
		remove: function(/* name, name, ... */) {
			
			var fields = this['#fields'];
			var name, field;
			
			for(var i = 0; i < arguments.length; i++) {
				
				name = arguments[i];
				
				field = fields.get(name);
				field.dispose();
				
				fields.remove(name)
				
			}
			
		},
		
		forEach: function(f, scope) {
			
			var fields = this['#fields'].items();
			var ret = fields.forEach(f, scope);
			
			fields.dispose();
			
			return ret;
			
		},
		
		toString: function() {
			/* TODO: Improve this.
			 */
			
			return this['#fields'].join(', ');
			
		},
		
		toArray: function() {
			var r = [ ];
			this['#fields'].forEach(function(name) {
				r.push(name);
			});
			return r;
		}
		
	};
	
	return constructor;
	
}());var Row = Hashtable.sub(function() {
	
	function constructor(options) {
		
	this['#base:{constructor}'] = Hashtable; Hashtable.call(this, options);
			
	};
	
	constructor.prototype = {
		
		unitName: 'Row'
		
	};
	
	return constructor;
	
}());

	
	function constructor(options) {
		/* options:
		 * 		fields:			Optional. A list of Field names or options to add to the DataSet.
		 * 		data:			Optional. A list of data to insert into the DataSet.
		 * 		dataHandler:	Optional. A handler to use when inserting the data.
		 */
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
		this['#data'] = [ ];
		
		if(options.fields) {
			this.fields.add.apply(this.fields, Collection.castAsArray(options.fields));
		}
		
		if(options.data) {
			this.insertAll(options.data, options.dataHandler);
		}
		
	};
	
	extend(constructor, {
		Field: Field,
		Fields: Fields,
		Row: Row
	});
	
	constructor.prototype = {
		
		unitName: 'DataSet',
		
		'#data': null,
		
		'#fields': null,
		getters: {
			
			fields: function() {
				if(!this['#fields']) {
					this['#fields'] = new Fields({ object: this });
				}
				return this['#fields'];
			}
			
		},
		
		disposable: [
			'#fields'
		],
		
		insert: function(/* datum, datum, ...[, dataHandler]*/) {
			/* As many datum may be passed in as needed. The dataHandler argument is optional,
			 * and is a function which can help the DataSet insert the data by returning an
			 * object mapping the data to fields in the DataSet. Otherwise, the data itself
			 * is considered to be a direct map. Note: Only members in the map corresponding to
			 * fields in the DataSet will be mapped.
			 */
			
			var data = getArguments();
			var dataHandler = null;
			var map, row;
			var datum;
			
			if(typeof data[data.length - 1] == 'function') {
				dataHandler = data.pop();
			}
			
			for(var i = 0; i < data.length; i++) {
				
				datum = data[i];
				
				if(datum instanceof Hashtable) {
					datum = datum.toLiteral();
				}
				
				if(dataHandler) {
					map = Hashtable.castAsLiteral(dataHandler(datum));
				} else {
					map = datum;
				}
				
				row = new Row();
				
				this.fields.forEach(function(u) {
					
					var value = map[u.name];
					
					if(value === undefined) {
						return;
					}
					
					if(u.unique) {
						if(this.getByField(u.name).exists(value)) {
							return;
						}
					}
					
					row.put(u.name, value);
					
				}, this);
				
				this['#data'].push(row);
				
			}
			
		},
		
		insertAll: function(data, dataHandler) {
			
			if(dataHandler) {
				data = Collection.cloneToArray(data);
				data.push(dataHandler);
			}
			
			this.insert.apply(this, Collection.castAsArray(data));
			
		},
		
		count: function() {
			return this['#data'].length;
		},
		
		getByField: function(name) {
			/* Returns all data in the specified field.
			 */
			
			if(!this.fields.exists(name)) {
				throw 'Field does not exist: ' + name;
			}
			
			var r = new Collection();
			var data = this['#data'];
			
			for(var i = 0; i < data.length; i++) {
				r.push(data[i].get(name));
			}
			
			return r;
			
		},
		
		filter: function(conditions) {
			/* Returns a new DataSet based on conditions.
			 * conditions can be an object or a function returning true or false.
			 */
			
			var data = this['#data'];
			var datum;
			var ds = new DataSet({
				fields: this.fields.toArray()
			});
			
			for(var i = 0; i < data.length; i++) {
				datum = data[i];
				if(typeof conditions == 'function') {
					if(conditions(datum)) {
						ds.insert(datum);
					}
				} else {
					for(var j in conditions) {
						if(datum.get(j) == conditions[j]) {
							ds.insert(datum);
						}
					}
				}
			}
			
			return ds;
			
		},
		
		select: function(/* name, name, ... */) {
			
			var data = this['#data'];
			var results = new Collection([ ]);
			var result;
			
			for(var i = 0; i < data.length; i++) {
				results.push(result = new Collection([ ]));
				for(var j = 0; j < arguments.length; j++) {
					result.push(data[i].get(arguments[j]));
				}
			}
			
			return results;
			
		},
		
		forEach: function(f, scope) {
			var r = new Collection(this['#data']);
			r.forEach(f, scope);
			r.dispose();
		}
		
	};
	
	return constructor;
	
}());
var object = {DataSet: DataSet,Collection: Collection,Color: Color,Hashtable: Hashtable,Set: Set,Stock: Stock};return object;})();/* joi.Collection is provided as an alias to joi.Data.Collection, since this
 * is used so frequently. It has been decided (as of 2012/01/22) that this
 * alias will remain a feature of the joi in the forseable future, and so it
 * can be used freely. (In fact we recommend using it instead of the more
 * cumbersome joi.Data.Collection.)
 */

var Collection = Data.Collection;/* joi.Hashtable is provided as an alias to joi.Data.Hashtable, since this
 * is used so frequently. It has been decided (as of 2012/01/22) that this
 * alias will remain a feature of the joi in the forseable future, and so it
 * can be used freely. (In fact we recommend using it instead of the more
 * cumbersome joi.Data.Hashtable.)
 */

var Hashtable = Data.Hashtable;var CommonCache = (function() {
	/* The CommonCache is used internally by the jsl as a cache of miscellaneous
	 * commonly used objects.
	 */
	
	var object = {
		
		RegEx: {
			
			whitespace: new RegExp(/\s+/g)
			
		}
		
	};
	
	return object;
	
})();var Html = (function() {
	
	var DomUnit = Unit.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 		dom:	Required. The dom object to use as the base of the DomUnit.
		 */
		
		this.dom = options.dom;
		JHtml.assign(this.dom, this);
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'DomUnit',
		
		dom: null,
		
		equals: function(unit) {
			if(!unit) {
				return false;
			} else {
				return this.dom == unit.dom;
			}
		},
		
		dispose: function() {
			
			JHtml.removeAssignment(this);
			
			this.base();
			
		}
		
	};
	
	return constructor;
	
}());var Node = DomUnit.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 		attach:		Optional. options argument for the attach method.
		 */
		
	this['#base:{constructor}'] = DomUnit; DomUnit.call(this, options);
		
		if(options.attach) {
			if(
				!this.attach.isListener				// Only take the shortcut if the attach method has no listeners attached to it.
				&& options.attach instanceof Node
				&& this.attach == doAttach			// Only take the shortcut if the attach method hasn't been overridden.
			) {
				/* Reduce calls to attach to improve performance.
				 * (This may not actually be very helpful, but it's probably not harmful.)
				 */
				options.attach.dom.appendChild(this.dom);
			} else {
				this.attach(options.attach);
			}
		}
		
	};
	
	constructor.prototype = {
		
		unitName: 'Node',
		
		getDocument: function() {
			return JHtml(this.dom.ownerDocument);
		},
		
		attach: doAttach, // This method is declared below so that it can also be checked above (for efficiency).
		
		detach: function() {
			
			// TODO: I can't reproduce this error. try { // IE throws an error if there is no parentNode (at least for text nodes.
				var p = this.dom.parentNode;
			// } catch(x) {
			// 	return;
			// }
			
			if(p) {
				p.removeChild(this.dom);
			}
			
			return this;
			
		},
		
		getParent: function() {
			return JHtml(this.dom.parentNode);
		},
		
		parent: alias('getParent'),
		
		getFirstChild: function() {
			return JHtml(this.dom.firstChild);
		},
		
		getPreviousSibling: function() {
			return JHtml(this.dom.previousSibling);
		},
		
		getNextSibling: function() {
			return JHtml(this.dom.nextSibling);
		},
		
		previous: alias('getPreviousSibling'),
			/* 2012/03/17: Was DEPRECATED, but I don't think this method should be removed anymore.
			 * It should be provided as an alias for getPreviousSibling.
			 */
		
		next: alias('getNextSibling'),
		
		getCommonAncestor: function(n) {
			
			var aPl = this.getAncestors();
			var bPl = n.getAncestors();
			
			var aP, bP, p;
			
			do {
				p = aP;
				aP = aPl.pop();
				bP = bPl.pop();
			} while(aP && bP && aP.equals(bP));
			
			return p;
			
		},
		
		getAncestors: function() {
			var n = this.getParent();
			var r = new NodeCollection();
			do {
				r.push(n);
			} while(n.getParent && (n = n.getParent()));
			return r;
		},
		
		getAncestryLevel: function() {
			// Returns a count of how many ancestors the node has.
			return this.getAncestors().length;
		},
		
		dispose: function() {
			
			this.detach();
			
			this.base();
			
		},
		
		swap: function(n) {
			/* Swaps the current node (it's position in the document) with another one.
			 * If both nodes are attached, then their positions will be swapped; if one
			 * node is attached and the other is not, they will also be swapped and the
			 * attached one will be detached.
			 * n can be a Node or a Widget.
			 */
			
			if(n instanceof Ui.Widget) {
				n = n.root;
			}
			
			var tP = this.getParent(), nP = n.getParent();
			var swapEl;
			
			if(!nP) {
				n.attach({
					to: tP,
					before: this
				});
				this.detach();
			} else if(!tP) {
				this.attach({
					to: nP,
					before: n
				});
				n.detach();
			} else if(nP && tP) {
				swapEl = new Elements.Span(); // Temporary element for swapping
				swapEl.attach({
					to: nP,
					before: n
				});
				n.attach({
					to: tP,
					before: this
				});
				this.attach({
					to: nP,
					before: swapEl
				});
				swapEl.dispose(); 
			}
			
			return this;
			
		}
		
	};
	
	function doAttach(options) {
		/* options can be either an options object, an element, or a string representing an element's id.
		 * 
		 * options
		 * 		to:				A DomUnit to attach this node to.
		 * 		before:			Optional. Either a sibling node to insert the current node before or an index
		 * 						at where to insert the node (ie, 0 to make it the first child node).
		 * 						By default it will be appended as the last child node.
		 * 		after:			Optional. Overrides before.
		 * 		returnParent:	Optional. Querys to find what parent the node will be attached to, but does not
		 * 						attach the node. This may be used to find out what parent a node would be attached
		 * 						to but without actually attaching it. It is used by Dialog so that the dialogLayer
		 * 						can be attached to the parent. When using this argument, the other options should
		 * 						be wrapped inside an "options" option. Default: false.
		 * 						Note: When this option is used, it's best to call it using Node.prototype.attach.call(...).
		 * 						That way it will avoid calling attach listeners if they exist on the particular node.
		 * 		options:		Optional. Used with returnParent to pass any other attach options along.
		 * Note: If before or after is a node, the to option will be ignored.
		 */
		
		var returnParent = false;
		
		/*if(this.dom.parentNode) {
			this.detach();
		}*/
		
		if(options.returnParent) {
			returnParent = true;
			options = options.options;
		}
		
		if(typeof options == 'string') {
			options = {
				to: this.getDocument().get(options)
			};
		}
		
		if(options instanceof Node) {
			options = {
				to: options
			};
		}
		if(options.tagName && options.nodeType) {
			options = {
				to: {
					dom: options
				}
			};
		}

		
		if(typeof options.after != 'undefined') {
			if(options.after instanceof Node) {
				options.before = options.after.getNextSibling();
			} else {
				options.before = options.after + 1;
			}
		}
		
		if(
			typeof options.before == 'undefined'
			|| options.before === null
		) {
			if(returnParent) return options.to;
			options.to.dom.appendChild(this.dom);
		} else if(options.before instanceof Node) {
			if(returnParent) return options.before.getParent();
			options.before.dom.parentNode.insertBefore(this.dom, options.before.dom);
		} else if(options.before === options.to.dom.childNodes.length) {
			if(returnParent) return options.to.dom;
			options.to.dom.appendChild(this.dom);
		} else {
			if(returnParent) return options.to.dom;
			options.to.dom.insertBefore(this.dom, options.to.dom.childNodes[options.before]);
		}
		
		return this;
		
	}
	
	return constructor;
	
}());
var ContainerDomUnit = DomUnit.sub(function() {
	/* TODO: Change methods to a mixin to mix into ContainerElement.
	 */
	
	var fJoin = Array.prototype.join;
	
	var constructor = function(options) {
		/* options can be an options object, an array, or a string.  If it is a string, the string
		 * will be used as the text of the element. If it is an array, the array will be used as
		 * the children of the element.
		 * 
		 * options
		 * 		children:	Optional. A mixed array of Nodes, strings, or option objects.  See Node.attach()
		 * 					for a list of options.
		 */
		
		var r;
		
		if(!options) {
			options = { };
		}
		
		if(typeof options == 'string' || typeof options == 'number') {
			options = {
				children: [
					options
				]
			};
		} else if(typeof options == 'object' && typeof options.length != 'undefined') {
			options = {
				children: options
			};
		}
		
		 /* This is needed to keep the compiler from shortcuting the
						   * base call because of the multiple inheritance hack used by
						   * ContainerElement.
						   */
		this.base(options);
		
		if(!options) {
			options = { };
		}
		
		if(options.children && options.text) {
			throw 'A ContainerDomUnit cannot be created with both children and text options.';
		}
		
		if(typeof options.text !== 'undefined') {
			options.children = [ options.text ];
		}
		
		if(options.children) {
			this['#attachChildren'](options.children);
		}
		
	};
	
	extend(constructor, {
		
		'#constructor': constructor
		
	});
	
	constructor.prototype = {
		
		unitName: 'ContainerDomUnit',
		
		'#attachChildren': alias('append'),
			 /* TODO: Replace calls to #attachChildren with calls to append and remove this.
			  * 2012/02/15: It has been decided, after a very lengthy time of discouraging
			  * the use of this method outside joi, to permit this method to be used (renamed
			  * to append below). The reason for this is mainly because it could be useful,
			  * so there doesn't seem to be a good reason to prevent it. 
			  */
		append: function(children) {
			/* A single child or several children arguments may also be passed instead of a children array.
			 * The DOM is used rather than joi methods/constructors when possible to improve performance.
			 */
			
			var doc = this.dom.ownerDocument;
			var ch = children;
			var r, n, node;
			
			if(ch.toIterable) {
				ch = ch.toIterable();
			}
			
			if(typeof ch == 'string' || ch.length === undefined) {
				ch = arguments;
			}
			
			for(var i = 0, u; i < ch.length; i++) {
				
				u = ch[i];
				
				if(u === null || u === undefined) {
					/* Skip null or undefined. This permits the use of conditional operators
					 * within the declaration of an array to be passed to #attachChildren.
					 */ 
				} else if(u instanceof Array || u instanceof Collection) {
					/* If an array is passed as a child, a Div is created to be the
					 * default container.
					 */
					// TODO: Can a div be created using the native createElement to improve performance?
					new Elements.Div({
						attach: {
							to: this
						},
						children: u
					});
				} else if(u instanceof Node && !u.attach.isListener) {
					this.dom.appendChild(u.dom);
				} else if(u.attach) {
					u.attach({
						to: this
					});
				} else if(u.constructor === String || u.constructor == Number) {
					if(u.constructor == Number) {
						u = u + '';
					}
					if(u.indexOf('\n') == -1) {
						n = doc.createTextNode(u);
						this.dom.appendChild(n);
					} else {
						r = u.split('\n');
						for(var j = 0; j < r.length; j++) {
							n = doc.createTextNode(r[j]);
							this.dom.appendChild(n);
							if(j < r.length - 1) {
								n = doc.createElement('br');
								this.dom.appendChild(n);
							}
						}
					}
				} else if(u.nodeType == 1 || u.nodeType == 3) {
					this.dom.appendChild(u);
				} else {
					// TODO: What is this used for?
					node = u.node;
					delete u.node;
					node.attach(u);
				}
								
			}
			
		},
		
		attach: Node.prototype.attach,
		detach: Node.prototype.detach,
		
		get: function(id) {
			
			var el = this.getDocument().dom.getElementById(id);
			var p, dom = this.dom;
			
			if(!el) {
				return null;
			}
			
			while(p = el.parentNode) {
				/* Make sure the DomUnit get was called on is a parent of the element.
				 */
				if(p == dom) {
					return el;
				}
			}
			
			return null;
			
		},
		
		select: function() {
			
			if(arguments.length == 0) {
				// If no argument is passed, all child nodes (including text nodes) are returned.
				// DEPRECATED.
				// TODO: Remove this functionality and add a suitable method, such as getChildNodes.
				return JHtml(this.dom.childNodes);
			}
			
			if(arguments.length == 1) {
				return JHtml(Quicksand.select(arguments[0], this.dom));
			} else {
				return JHtml(Quicksand.select(fJoin.call(arguments, ','), this.dom));
			}
			
		},
		
		getFirstChild: function() {
			return JHtml(this.dom.firstChild);
		},
		
		empty: function() {
			/* See note on dump below.
			 */
			
			var dom = this.dom;
			var n, nT;
			
			while(n = dom.firstChild) {
				/* TODO: maybe work more on node disposal. perhaps make it so any node which hasn't
				 * had a method called on it from an external source (or some method called on a parent
				 * like select() that could have chosen that node) but has only been referenced
				 * interally, automatically dispose itself on detach, if possible
				 * 
				 * 2010/03/01: The above TODO is probably a bad idea.
				 * 
				 * 2012/02/22: The dump method below was added to help with some of these issues, but
				 * the possibility of safe disposable within empty might still be something worth exploring.
				 * 
				 * TODO: Review code within the jsl using empty to see if some of it should use dump instead.
				 */
				nT = JHtml.getAssignment(n);
				if(nT && nT.detach.isListener) {
					nT.detach();
				} else {
					dom.removeChild(n);
				}
			}
			
			return this;
			
		},
		
		dump: function() {
			/* The difference between empty and dump is dump will dispose of the
			 * children, while empty will not dispose of them. Use dump when you
			 * know all children can be disposed of without affecting other areas
			 * of the script.
			 */
			
			var dom = this.dom;
			var n, nT;
			
			while(n = dom.firstChild) {
				nT = JHtml.getAssignment(n);
				if(nT) {
					nT.detach();
					nT.dispose();
				} else {
					dom.removeChild(n);
				}
			}
			
			return this;
			
		},
		
		getText: function() {
			/* Note: innerText may behave slightly differently from textContent.
			 * Chrome supports both, but line breaks are ignored in innerText while
			 * they are preserved in textContent (in other words, textContent seems
			 * to be the original text in the document (before HTML formatting) while
			 * innerText seems to be the calculated text based on HTML whitespace rules.)
			 * TODO: Check to see if browsers that don't support textContent
			 * (old versions of IE?) ignore the line breaks as well and try to
			 * find a workaround. -- possibly even find a way to support both features.
			 * (How would the innerText-type behavior be done in Firefox?)
			 * 
			 * TODO: implement a "get plain text" solution to provide similar results for all browsers.
			 * See http://clubajax.org/plain-text-vs-innertext-vs-textcontent/
			 */
			if(this.dom.textContent) {
				return this.dom.textContent;
			} else {
				return this.dom.innerText;
			}
		},
		
		addText: function(text) {
			/* Note 2012/03/16: new line support was recently added to addText.
			 * I'm not sure if this could mess any existing scripts up, and I'm
			 * not positive it's a good idea.
			 * TODO: Decide whether to keep this behavior and remove this note.
			 */
			var doc = this.dom.ownerDocument;
			var r;
			if(!text.indexOf || text.indexOf('\n') == -1) {
				this.dom.appendChild(
					doc.createTextNode(text)
				);
			} else {
				r = text.split('\n');
				for(var j = 0; j < r.length; j++) {
					this.dom.appendChild(
						doc.createTextNode(r[j])
					);
					if(j < r.length - 1) {
						this.dom.appendChild(
							doc.createElement('br')
						);
					}
				}
			}
		},
		
		print: alias('addText'),
		println: function(/* s, s, s, ... */) {
			for(var i = 0; i < arguments.length; i++) {
				this.addText(arguments[i] + '\n');
			}
		},
		printh: alias('addHtml'), // EXPERIMENTAL
		addHtml: function(html) {
			/* EXPERIMENTAL. This method is marked experimental because it has not
			 * yet been decided whether it will remain a part of joi in the future.
			 * It is currently being evaluated for its usefulness and for whether it
			 * promotes bad or ugly programming practices.
			 */
			// TODO: Does innerHTML work on all target browsers?
			/* TODO: joi has avoided this kind of thing since its inception.
			 * Is moving in this direction a good idea? Check on prevailing ideas
			 * about the use of innerHTML vs document.createElement.
			 */
			this.dom.innerHTML += html;
			return this;
		},
		printf: function(s) { // NOT IMPLEMENTED
			// TODO: Implement
		},
		printfh: function(html) { // EXPERIMENTAL
			// TODO: Implement
		},
		
		setText: function(text) {
			this.empty();
			this.addText(text);
		},
		
		hasDescendant: function(el) {
			var p = el.dom;
			if(!p) {
				return false;
			}
			while(p.parentNode) {
				p = p.parentNode;
				if(p == this.dom) {
					return true;
				}
			}
			return false;
		},
		
		hasDescendant_old: function(el) {
			/* DEPRECATED
			 * Is there a reason why getParent might be better than just checking the dom's parentNode?
			 * Perhaps if this is intended to work in places where the dom would fail so that a more
			 * general getParent approach might be necessary?
			 */
			var p = el.dom;
			while(p.getParent && (p = p.getParent())) {
				if(p.dom == this.dom) {
					return true;
				}
			}
			return false;
		},
		
		hasDescendants: function(r) {
			// TODO: (maybe) combine hasDescendant and hasDescendants, like getAncestorOf
			r = Collection.castAsIterable(r);
			for(var i = 0; i < r.length; i++) {
				if(!this.hasDescendant(r[i])) {
					return false;
				}
			}
			return true;
		},
		
		getAncestorOf: function(n) {
			/* Returns the child node that is an ancestor of n.
			 * If n is a child node, n is returned.
			 * n can be a node or a Collection of nodes.
			 */
			
			var p = null, r;
			
			if(n instanceof Collection) {
				
				r = new NodeCollection();
				
				n.forEach(function(u) {
					r.push(this.getAncestorOf(u));
				}, this);
				
				r.purgeDuplicates();
				
				return r;
				
			} else {
				
				this.select().forEach(function(u) {
					if(u.equals(n) || (u.hasDescendant && u.hasDescendant(n))) {
						p = u;
						return true;
					}
				});
				
				return p;
				
			}
			
		}
		
	};
	
	return constructor;
	
}());var Document = DomUnit.sub(function() {
	
	var constructor = function(options) {
		/* options can be either an options literal or a dom object.
		 * 
		 * options
		 * 		dom:	The W3C DOM document object.
		 */
		
		if(!options.dom) {
			options = {
				dom: options
			};
		}
		
	this['#base:{constructor}'] = DomUnit; DomUnit.call(this, options);
		
		this.root = JHtml(this.dom.documentElement);
		this.documentElement = this.root; // DEPRECATED: Replaced with this.root. TODO: Remove.
		this.head = JHtml(options.dom.getElementsByTagName('head')[0]);
		this.body = JHtml(options.dom.body);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Document',
		
		disposable: [
			'#cookies'
		],
		
		head: null,
		
		body: null,
		
		'#cookies': null,
		getters: {
			
			cookies: function() {
				if(!this['#cookies']) {
					this['#cookies'] = new Properties.Cookies({ object: this });
				}
				return this['#cookies'];
			}
			
		},
		
		get: function(id) {
			return JHtml(this.dom.getElementById(id));
		},
		
		select: function() {
			return this.root.select.apply(this, arguments);
		},
		
		location: null,
		
		importScript: function(url) {
			var script = new Elements.Script({
				attach: this.head,
				url: url
			});
			return script;
		}
		
	};
	
	extendWithEventMethods(constructor);
	
	return constructor;
	
}());var Fragment = ContainerDomUnit.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 
		 * 		dom:		Optional. A DOM node to use as the core of the Element.
		 * 					If no DOM node is specified, a new one will be created.
		 * 
		 * 		document:	Optional. If dom is not specified, the new DOM node will
		 * 					be created using document. If no document is specified
		 * 					the default document will be used.
		 * 					Note: document is expected to be a MetaDom document object,
		 * 					not a DOM document object.
		 * 
		 */
		
		if(!options) {
			options = { };
		}
		
		if(!options.dom) {
			
			if(!options.document) {
				options.document = $document;
			}
			
			options.dom = options.document.dom.createDocumentFragment();
			
		}
		
	this['#base:{constructor}'] = ContainerDomUnit; ContainerDomUnit.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Fragment'
		
	};
	
	return constructor;
	
}());
function extendWithEventMethods(constructor) {
	// TODO: ? When the element is disposed, remove handlers.
	
	var events = new Collection([
		'load', 'click', 'mouseover', 'mousemove', 'mouseout', 'mousedown', 'mouseup', 'focus', 'blur', 'scroll',
		'keypress', 'keyup', 'keydown', 'change', 'submit' // TODO: maybe change needs to only be for input elements? what about blur and focus?
	]);
	
	events.forEach(function(u) {
		
		constructor.prototype[u] = extendFunction(function() {
			if(this.dom[u]) {
				if(Browser.isIe) {
					/* For some reason IE6 throws an error when element.click is called using apply.
					 * I don't know if this happens for other similar methods.
					 */
					this.dom[u](
						arguments[0], arguments[1], arguments[2], arguments[3], arguments[4],
						arguments[5], arguments[6], arguments[7], arguments[8], arguments[9]
					);
				} else {
					if(this.dom[u]) {
						this.dom[u].apply(this.dom, arguments);
					}
				}
			}
		});
		
		constructor.prototype[u].beforeListen = function(object, method) {
			
			if(object[method] != this) {
				throw 'The object or method passed are incorrect.';
			}
			
			var dom = object.dom;
			var f = dom['on' + method];
			var f2 = object[method];
			var suppressF2 = false, suppressDOMCallback = false;
			
			object[method] = extendFunction(function(options) {
				var args = arguments, ret;
				if(f) {
					ret =  f.apply(dom, args);
					if(typeof ret != 'undefined') {
						return ret;
					}
				}
				if(!suppressF2 && f2) {
					suppressDOMCallback = true;
					return f2.apply(object, args);
				} else {
					suppressF2 = false;
				}
			});
			
			/* Execution needs to be delayed for DomUnits because the native events
			 * won't be executed until the thread is returned (since the f executed
			 * above is merely a representative function of the navite function, but
			 * won't actually execute the native code for that DOM object.
			 */
			object[method].eventStrongDefer = true;
			
			dom['on' + method] = function() {
				// TODO: maybe this is where event should be wrapped instead of in createListener()?
				if(!suppressDOMCallback) {
					suppressF2 = true;
					return object[method].apply(object, arguments);
				} else {
					suppressDOMCallback = false;
				}
			};
			
		};
		
	});
	
}
var NodeCollection = Collection.sub(function() {
	
	var constructor = function(r) {
		
		this.base(r);
		
	};
	
	constructor.prototype = { };
	
	Collection.prototype.expose.call(constructor.prototype, Node);
	
	extend(constructor.prototype, {
		
		unitName: 'NodeCollection',
		
		clone: function() {
			return this.base();
		},
		
		attach: function(options) {
			/* attach must be overridden for the case when options.after is used, so
			 * that the nodes are attached all at once and appear in the correct order.
			 */
			
			if(this.length == 0) {
				return;
			}
			
			var frag = new Fragment({
				document: this[0].getDocument(),
				children: this
			});
			
			frag.attach(options);
			
		}
		
	});
	
	return constructor;
	
}());
var StyleTable = Hashtable.sub(function() {
	/* A StyleTable works just like a Hashtable with a few modifications to make working with
	 * style properties easier and more standardized.  StyleTables don't distinguish between
	 * camel case identifiers and dash-separated identifiers.  You can use either and a StyleTable
	 * will store and retrieve them as the same identifier.  For instance:
	 *		var st = new StyleTable();
	 *		st.put('test-word', 'value');
	 *		st.get('testWord'); // returns 'value'
	 */
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = Hashtable; Hashtable.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'StyleTable',
		
		put: function(key, object) {
			if(key.indexOf('-') != -1) {
				key = JString.toCamelCase(key);
			}
			Hashtable.prototype.put.call(this, key, object);
		},
		
		get: function(key) {
			if(key.indexOf('-') != -1) {
				key = JString.toCamelCase(key);
			}
			return Hashtable.prototype.get.call(this, key);
		}
		
	};
	
	return constructor;
	
}());var TextNode = Node.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 
		 * 		dom:		Optional. A DOM node to use as the core of the Element.
		 * 					If no DOM node is specified, a new one will be created.
		 * 
		 * 		document:	Optional. If dom is not specified, the new DOM node will
		 * 					be created using document. If no document is specified
		 * 					the default document will be used.
		 * 					Note: document is expected to be a MetaDom document object,
		 * 					not a DOM document object.
		 * 
		 * 		text:		Optional. If dom is not specified, the new DOM node will
		 * 					be created with this text. If no text is specified, an
		 * 					empty string will be used.
		 * 
		 */
		
		if(!options) {
			options = { };
		}
		
		if(options.constructor === String || options.constructor === Number) {
			options = {
				text: options
			};
		}
		
		if(!options.dom) {
			
			if(!options.document) {
				options.document = $document;
			}
			
			if(!options.text) {
				options.text = '';
			}
			
			options.dom = options.document.dom.createTextNode(options.text);
			
		}
		
	this['#base:{constructor}'] = Node; Node.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'TextNode',
		
		getText: function() {
			return this.dom.nodeValue;
		},
		
		setText: function(s) {
			this.dom.nodeValue = s;
		},
		
		/* TODO: The following are a few methods from JString. Should all of the methods
		 * from JString be included?
		 */
		take: function(n) {
			this.dom.nodeValue = this.dom.nodeValue.substring(0, n);
		},
		
		takeRight: function(n) {
			var s = this.dom.nodeValue;
			this.dom.nodeValue = s.substring(s.length - n);
		},
		
		drop: function(n) {
			this.dom.nodeValue = this.dom.nodeValue.substring(n);
		},
		
		dropRight: function(n) {
			var s = this.dom.nodeValue;
			this.dom.nodeValue = s.substring(0, s.length - n);
		}
		
	};
	
	return constructor;
	
}());
var Window = DomUnit.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = DomUnit; DomUnit.call(this, options);
		
		this.document = JHtml(options.dom.document);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Window',
		
		document: null
		
	};
	
	return constructor;
	
}());
var Elements = (function() {var Element = Node.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 		dom:		Optional. A DOM node to use as the core of the Element.
		 * 					If no DOM node is specified, a new one will be created.
		 * 		document:	Optional. If dom is not specified, the new DOM node will
		 * 					be created using document. If no document is specified
		 * 					the default document object will be used.
		 * 					Note: document is expected to be a MetaDom document object,
		 * 					not a DOM document object.
		 * 		id:			Optional. The Element's id.
		 * 		name:		Opitonal. The name of the input element.
		 * 		styles:		Optional. Styles to be applied to the element.
		 * 		classes:	Optional. Array of class names to be set for the  element.
		 * 		title:		Optional. The title to use for the element.
		 * 		show:		Optional. Determines whether the element will be shown.
		 * 					Default is true.
		 * 		focus:		Optional. Whether the element should receive focus.
		 * 					Default is false.
		 * 		selectable:	Optional. Determines whether an element is selectable.
		 * 					Default is true.
		 * 		fx:			Optional. An object literal or Hashtable specifying the fx
		 * 					to apply to specific methods (such as show or hide). 
		 */
		
		var object = this;
		var nameSet = false;
		
		if(!options) {
			options = { };
		}
		
		if(!options.dom) {
			
			if(!options.document) {
				if($document) {
					options.document = $document;
				} else {
					options.document = {
						dom: document
					};
				}
			}
			
			if(this.unitConstructor.tag == 'input' && this.unitConstructor.prototype.type) {
				if(Browser.isIe && Browser.version.major < 9) {
					options.dom = options.document.dom.createElement('<input type="' + this.unitConstructor.prototype.type + '" ' + (options.name ? 'name="' + options.name + '"' : '') + '>');
					nameSet = true;
				} else {
					options.dom = options.document.dom.createElement(this.unitConstructor.tag);
					options.dom.type = this.unitConstructor.prototype.type;
				}
			} else {
				if(options.name && Browser.isIe && Browser.version.major < 9) {
					options.dom = options.document.dom.createElement('<' + this.unitConstructor.tag + ' name="' + options.name + '">');
					nameSet = true;
				} else {
					options.dom = options.document.dom.createElement(this.unitConstructor.tag);
				}
			}
			
		}
		
		//setEvents(this, options.dom); // TODO: maybe this needs to be moved to DomUnit? depending on whether TextNodes, etc can have events in the DOM..
		
	this['#base:{constructor}'] = Node; Node.call(this, options);
		
		if(options.id) {
			this.setId(options.id);
		}
		
		if(!nameSet && options.name) {
			this.setName(options.name);
		}
		
		if(options.title) {
			this.setTitle(options.title);
		}
		
		if(options.styles) {
			this.styles.set(options.styles);
		}
		
		if(options.fx) {
			// TODO: This has changed. Was anything [using] the old way?
			this.fx.attach(options.fx);
		}
		
		if(options.classes) {
			/* The following used instead of the classes property to keep the Classes Property object from
			 * being created unnecessarily, in order to improve performance, since classes are added so
			 * often at Element instantiation.
			 */
			this.dom.className += ' ' + options.classes.join(' ');
		}
		
		if(options.show === false) {
			this.hide({ suppressFx: true });
		}
		
		if(options.focus) {
			defer(bind(this.focus, this));
		}
		
		if(options.selectable === false) {
			this.setSelectable(false);
		}
		
	};
	
	function setEvents(el, dom) { // TODO: remove this function, it has been moved to Html.functions.jsx
		/* TODO: When the element is destroyed, these events need to be removed from the DOM.
		 */
		
		/* TODO: Look up the rest of the events and add them to the collection below.
		 */
		
		var events = new Collection([
			'load', 'click', 'mouseover', 'mouseout', 'mousedown', 'mouseup', 'focus', 'blur',
			'keypress', 'keyup', 'keydown', 'change', 'submit' // TODO: maybe change needs to only be for input elements? what about blur and focus?
		]);
		
		events.forEach(function(u) {
			var f = dom['on' + u];
			var f2 = el[u];
			el[u] = extendFunction(function(options) {
				var args = arguments, ret;
				var suppressF2 = false;
				if(el[u].__eventSuppressF2) {
					el[u].__eventSuppressF2 = false;
					suppressF2 = true;
				}
				if(f) {
					ret =  f.apply(dom, args);
					if(typeof ret != 'undefined') {
						return ret;
					}
				}
				if(!suppressF2 && f2) {
					return f2.apply(el, args);
				}
			});
			dom['on' + u] = function() {
				// TODO: maybe this is where event should be wrapped instead of in createListener()?
				el[u].__eventSuppressF2 = true;
				return el[u](arguments);
			};
		});
		
	}
	
	extend(constructor, {
		
		cast: function(obj) {
			/* This will either cast a DOM element as a specific type of MetaDom
			 * Element or cast a MetaDom Element as another type of MetaDom Element.
			 * It is recommended that this method be avoided and MetaDom() be used
			 * to convert DOM elements to MetaDom Elements.
			 * This method is provided for conformity to the Unit constructor.
			 */
			
			if(!(obj instanceof this)) {
				if(obj.dom) {
					/* obj is a DomUnit
					 */
					obj = new this({ dom: obj.dom });
				} else {
					/* obj is not a DomUnit (should be a DOM element).
					 * The reason MetaDom(obj) isn't used is because the only time cast should be
					 * used on a DOM element is to force it to be a specific type of MetaDom Element.
					 * The cast method should be avoided and MetaDom() should be used for converting
					 * DOM elements into MetaDom Elements instead.
					 */
					obj = new this({ dom: obj });
				}
			}
			
			return obj;
			
		}
		
	});
	
	constructor.prototype = {
		
		unitName: 'Element',
		
		'#classes': null,
		'#fx': null,
		'#styles': null,
		getters: {
			/* Getters are used if possible to improve performance.
			 */
			
			classes: function() {
				if(!this['#classes']) {
					this['#classes'] = new Properties.Classes({ object: this });
				}
				return this['#classes'];
			},
			
			fx: function() {
				if(!this['#fx']) {
					this['#fx'] = new Properties.ElementFx({ object: this });
				}
				return this['#fx'];
			},
			
			styles: function() {
				if(!this['#styles']) {
					this['#styles'] = new Properties.Styles({ object: this });
				}
				return this['#styles'];
			}
			
		},
		
		disposable: [
			'#classes',
			'#fx',
			'#styles'
		],
		
		getId: function() {
			return this.dom.id;
		},
		
		setId: function(id) {
			this.dom.id = id;
		},
		
		setRandomId: function() {
			/* This can be used for Elements which need to have some id when it doesn't matter what that id is.
			 */
			// TODO: is it worth making sure this is unique?
			
			var s = 'jsl_rnd$' + JMath.Random.getChars(16) + '$';
			
			this.setId(s);
			
			return s;
			
		},
		
		getName: function() {
			return this.dom.name;
		},
		
		setName: function(name) {
			var p = this.getParent();
			this.dom.name = name;
			if(p) {
				/* The element needs to be detached and reattached to the document in order
				 * for the name update to take effect. (This is required at least for iframes
				 * in FF2 in order for the target attribute of a form to work correctly. I am
				 * not sure if it is required for other uses of the name attribute or in other
				 * browsers.)
				 */
				// TODO: does this cause any problems with input elements? particularly in IE?
				this.attach({
					to: p,
					before: this.next()
				});
			}
		},
		
		setRandomName: function() {
			/* This can be used for Elements which need to have some name when it doesn't matter what that name is.
			 */
			// TODO: is it worth making sure this is unique?
			
			var s = 'jsl_rnd$' + Random.getChars(16) + '$';
			
			this.setName(s);
			
			return s;
			
		},
		
		show: function() {
			this.styles.set({
				display: ''
			});
			if(this.styles.get('display') == 'none') {
				// TODO: change block here to pick the display type based on the tag name of the element
				this.styles.set({ display: 'block' });
			}
			return this;
		},
		
		hide: function() {
			if(this['#styles']) {
				this['#styles'].set({
					display: 'none'
				});
			} else {
				// This is done to improve performance.
				this.dom.style.display = 'none';
			}
			return this;
		},
		
		toggle: function() {
			if(this.dom.style.display == 'none') {
				this.show();
			} else {
				this.hide();
			}
			return this;
		},
		
		classes: null,
		
		addClass: function(className) { // DEPRECATED. TODO: Remove.
			this.classes.add(className);
		},
		addClasses: function(classes) { // DEPRECATED. TODO: Remove.
			this.classes.add(classes);
		},
		hasClass: function(className) { // DEPRECATED. TODO: Remove.
			return this.classes.exists(className);
		},
		removeClass: function(className) { // DEPRECATED. TODO: Remove.
			return this.classes.remove(className);
		},
		
		setTitle: function(title) {
			this.dom.title = title;
		},
		
		getTitle: function() {
			return this.dom.title;
		},
		
		setSelectable: function(selectable) {
			// TODO: This hasn't been tested.
			if(selectable) {
				this.dom.unselectable = 'off';
				this.styles.set({
					MozUserSelect: 'inherit'
				});
			} else {
				this.dom.unselectable = 'on';
				this.styles.set({
					MozUserSelect: 'none'
				});
			}
		},
		
		getAttribute: function(attribute) {
			// Setting the second argument to 2 improves performance in IE
			return this.dom.getAttribute(attribute, 2);
		},
		// TODO: ? setAttribute
		
		getData: function(dataAttribute) {
			// Setting the second argument to 2 improves performance in IE
			return this.dom.getAttribute('data-' + dataAttribute, 2);
		},
		// TODO: ? setData
		
		resize: function() { },
		
		isShown: function() {
			return this.dom.style.display != 'none';
		}
				
	};
	
	extendWithEventMethods(constructor);
	
	return constructor;
	
}());var ContainerElement = Element.sub(function() {
	
	var constructor = function(options) {
		
		ContainerDomUnit['#constructor'].call(this, options);
		/* The above call is used instead of ContainerDomUnit.call(this, options) in order to make the
		 * this.base() call in ContainerDomUnit.#constructor continue on to Element rather than
		 * ContainerDomUnit's super Unit.
		 */
		
	};
	
	constructor.prototype = { };
	
	extend(constructor.prototype, ContainerDomUnit.prototype);
	
	extend(constructor.prototype, {
		
		unitName: 'ContainerElement'
		
	});
	
	return constructor;
	
}());var ElementCollection = NodeCollection.sub(function() {
	
	var constructor = function(r) {
		
		this.base(r);
		
	};
	
	constructor.prototype = { };
	
	NodeCollection.prototype.expose.call(constructor.prototype, Element, 'attach'); // attach is overwritten by NodeCollection
	
	extend(constructor.prototype, {
		
		unitName: 'ElementCollection'
		
	});
	
	return constructor;
	
}());
var ContainerElementCollection = ElementCollection.sub(function() {
	
	var constructor = function(r) {
		
		this.base(r);
		
	};
	
	constructor.prototype = { };
	
	NodeCollection.prototype.expose.call(constructor.prototype, ContainerElement, 'attach'); // attach is overwritten by NodeCollection
	
	extend(constructor.prototype, {
		
		unitName: 'ContainerElementCollection'
		
	});
	
	return constructor;
	
}());
var A = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 		url:		The URL to use as the href of the Element. By default "#" is used. This is because it is
		 * 					assumed that most of the time an A Element is created it will be used as a link, if not
		 * 					to a URL then for a JavaScript event.
		 * 					To avoid this behavior, set url to false.
		 * 		target:		The target to open the url in.
		 * 
		 * If only a string is passed (instead of an options literal) and it is a url, then 
		 * the string will be used as both the text and the url of the link.
		 */
		
		var domPreExisted = false;
		
		if(!options) {
			options = { };
		} else if(options.dom) {
			domPreExisted = true;
		}
		
		if(
			typeof options == 'string'
			&& JString.startsWith(options, [ 'http:', 'https:', 'ftp:' ])
		) {
			options = {
				text: options,
				url: options
			};
		}
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
		var url = options.url;
		
		if(this.getUrl() == '') {
			
			if(typeof url == 'undefined' && !domPreExisted) {
				// allow for "" as a valid url
				// don't insert an auto '#' for the url if the dom element existed previously
				
				url = '#';  // use as the default url so that all A elements are links by default (unless url is specified as "").
							// '#' is used instead of 'javascript:void(0);' because the latter will cause the page to stop loading in IE6.
				
				this.on({
					click: function(v) {
						/* If the url was set automatically to # then set a return value of false to keep
						 * the page from scrolling up.  This is different from 'v.stop(false);' because that
						 * would cancel other listeners.  Setting the returnValue simply allows for returning
						 * a value to the DOM event handler without cancelling other listeners.
						 */
						var s = this.getUrl();
						if(s.length > 0) {
							s = s.substring(s.length - 1);
						}
						if(s == '#') {
							v.returnValue = false;
						}
					}
				});
				
			}
		}
		
		if(typeof url != 'undefined' && url !== false) {
			this.setUrl(url);
		}
		
		if(options.target) {
			this.setTarget(options.target);
		}
		
	};
	
	extend(constructor, {
		tag: 'a'
	});
	
	constructor.prototype = {
		
		unitName: 'A',
		
		getUrl: function() {
			return this.dom.href;
		},
		
		setUrl: function(url) {
			this.dom.href = url;
		},
		
		getTarget: function() {
			return this.dom.target;
		},
		
		setTarget: function(target) {
			this.dom.target = target;
		}
		
	};
	
	return constructor;
	
}());
var B = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'b'
	});
	
	constructor.prototype = {
		
		unitName: 'B'
		
	};
	
	return constructor;
	
}());
var Body = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'body'
	});
	
	constructor.prototype = {
		
		unitName: 'Body'
		
	};
	
	return constructor;
	
}());
var Br = Element.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = Element; Element.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'br'
	});
	
	constructor.prototype = {
		
		unitName: 'Br'
		
	};
	
	return constructor;
	
}());
var Dd = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'dd'
	});
	
	constructor.prototype = {
		
		unitName: 'Dd'
		
	};
	
	return constructor;
	
}());
var Div = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		/* options:
		 * 		containers:	Optional. Array of class names to generate Div containers for.
		 * 					This is especially helpful for styling. An array can be contained
		 * 					inside the containers array to specify multiple class names.
		 * 					containers are attached inside the specified element, and so are
		 * 					containers for the content, not for the element itself.
		 */
		
		var classes, p, children, firstContainer;
		
		if(options && options.containers) {
			if(options.children) {
				children = options.children;
			}
			for(var i = 0, l = options.containers.length; i < l; i++) {
				classes = options.containers[i]
				if(typeof classes == 'string') {
					classes = [ classes ];
				}
				opts = {
					attach: p,
					classes: classes
				};
				if(i == l - 1) {
					opts.children = children;
				}
				p = new Div(opts);
				if(!firstContainer) {
					firstContainer = p;
				}
			}
			options.children = [ firstContainer ];
		}
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
		this['#lastContainer'] = p;
		
	};
	
	extend(constructor, {
		tag: 'div'
	});
	
	constructor.prototype = {
		
		unitName: 'Div',
		
		'#lastContainer': null,
		append: function(children, appendToContainer) {
			/* appendToContainer can be set to false to force the append to occur
			 * to the div itself if it has any containers.
			 */
			var lastContainer = this['#lastContainer'];
			if(appendToContainer !== false && lastContainer) {
				lastContainer.append.apply(lastContainer, arguments);
			} else {
				this.base.apply(this, arguments);
			}
		},
		
		getLastContainer: function() {
			if(this['#lastContainer']) {
				return this['#lastContainer'];
			} else {
				return this;
			}
		}
		
	};
	
	return constructor;
	
}());
var Dl = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'dl'
	});
	
	constructor.prototype = {
		
		unitName: 'Dl'
		
	};
	
	return constructor;
	
}());
var Dt = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'dt'
	});
	
	constructor.prototype = {
		
		unitName: 'Dt'
		
	};
	
	return constructor;
	
}());
var Em = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'em'
	});
	
	constructor.prototype = {
		
		unitName: 'Em'
		
	};
	
	return constructor;
	
}());
var Form = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 		method:		Optional. The method to use in submitting the form.
		 * 					POST is used by default.
		 * 		url:		Optional. The url to submit the form to.
		 * 		encoding:	Optional. An encoding to use when sending the form data.
		 * 		target:		Optional. Either the name of a frame or window or a
		 * 					window or frame to submit the form to.
		 */
		
		if(!options) options = { };
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
		if(!options.method) {
			options.method = 'POST';
		}
		this.setMethod(options.method);
		
		if(options.url) {
			this.setUrl(options.url);
		}
		
		if(options.encoding) {
			this.setEncoding(options.encoding);
		}
		
		if(options.target) {
			this.setTarget(options.target);
		}
		
	};
	
	extend(constructor, {
		tag: 'form'
	});
	
	constructor.prototype = {
		
		unitName: 'Form',
		
		getMethod: function() {
			return this.dom.method;
		},
		
		setMethod: function(method) {
			this.dom.method = method.toLowerCase(); // Convert to lower case since the official XHTML documentation requires lowercase.
		},
		
		getUrl: function() {
			return this.dom.action;
		},
		
		setUrl: function(url) {
			this.dom.action = url;
		},
		
		getEncoding: function() {
			return Browser.isIe ? this.dom.encoding : this.dom.enctype;
		},
		
		setEncoding: function(encoding) {
			this.dom.enctype = encoding;
			this.dom.encoding = encoding; // for IE
		},
		
		setTarget: function(target) {
			/* target can be a name, a DomUnit, or a DOM object. If target is a DomUnit
			 * or a DOM object the target will be linked so that any time the target's name
			 * is changed the target property of this element will also be updated to match it.
			 * This will not occur if setTarget is called with a name, only if it is called
			 * with a DomUnit or DOM object.
			 */
			
			var me = this, el;
			
			if(this['#target']) {
				this['#updateTarget'].dispose();
				this['#target'] = null;
				this['#updateTarget'] = null;
			}
			
			if(typeof target == 'string') {
				this.dom.target = target;
			} else {
				el = JHtml(target);
				if(!el.getParent()) {
					el.attach(this);
				}
				if(!el.getName()) {
					// TODO: ! this causes problems on IE since the name needs to be defined at the same time as createElement for IE. This should probably be remived, and perhaps the entire setName functionality should be removed since its not very reliable, in particular with IE
					el.setRandomName();
				}
				this.dom.target = el.getName();
				this['#updateTarget'] = el.on({
					setName: function() {
						me.dom.target = el.dom.name;
					}
				}, true);
				this['#target'] = el;
			}
			
		},
		
		reset: function() {
			this.dom.reset();
		}
		
	};
	
	return constructor;
	
}());
var FormElement = Element.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 		value:		the value of the input element
		 * 		enabled:	Optional. Default is true.
		 * 		commit:		Optional. An element or id of an element to call the
		 * 					click event on when enter is pressed.
		 */
		
	this['#base:{constructor}'] = Element; Element.call(this, options);
		
		if(typeof options.value != 'undefined') {
			this.setValue(options.value);
		}
		
		if(options.enabled === false) {
			this.disable();
		}
		
		if(options.commit) {
			this.on({
				enter: function() {
					if(typeof options.commit == 'string') {
						$document.get(options.commit).click();
					} else {
						options.commit.click();
					}
				}
			});
		}
		
	};
	
	constructor.prototype = {
		
		unitName: 'FormElement',
		
		getValue: function(value) {
			return this.dom.value;
		},
		
		setValue: function(value) {
			this.dom.value = value;
		},
		
		clear: function() {
			this.dom.value = '';
		},
		
		setEnabled: function(enabled) {
			// DEPRECATED. Use the disable and enable methods instead.
			this.dom.disabled = !enabled;
		},
		
		disable: function() {
			this.dom.disabled = true;
		},
		
		enable: function() {
			this.dom.disabled = false;
		},
		
		enter: (function() {
			// enter is called when the Enter or Return key is pressed for the element.
			var f = function() { };
			f.beforeListen = function(element, method) {
				element.on({
					keyup: function(v) {
						if(v.key.code == 13) {
							element.enter();
						}
					}
				});
			};
			return f;
		})(),
		
		escape: (function() {
			// enter is called when the Enter or Return key is pressed for the element.
			var f = function() { };
			f.beforeListen = function(element, method) {
				element.on({
					keyup: function(v) {
						if(v.key.code == 27) {
							element.escape();
						}
					}
				});
			};
			return f;
		})()
		
	};
	
	return constructor;
	
}());var Head = Element.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = Element; Element.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'head'
	});
	
	constructor.prototype = {
		
		unitName: 'Head'
		
	};
	
	return constructor;
	
}());
var Html = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'html'
	});
	
	constructor.prototype = {
		
		unitName: 'Html'
		
	};
	
	return constructor;
	
}());
var I = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'i'
	});
	
	constructor.prototype = {
		
		unitName: 'I'
		
	};
	
	return constructor;
	
}());
var IFrame = Element.sub(function() {
	
	var constructor = function(options) {
		
		if(!options) {
			options = { };
		}
		
	this['#base:{constructor}'] = Element; Element.call(this, options);
		
		if(options.url) {
			this.setUrl(options.url);
		}
		
	};
	
	extend(constructor, {
		tag: 'iframe'
	});
	
	constructor.prototype = {
		
		unitName: 'IFrame',
		
		getUrl: function() {
			return this.dom.src;
		},
		
		setUrl: function(url) {
			this.dom.src = url;
		}
		
	};
	
	return constructor;
	
}());
var Img = Element.sub(function() {
	
	var constructor = function(options) {
		/* options can be an options object or simply the url.
		 * 
		 * options
		 * 		url:			Optional. The URL to use as the src of the Element.
		 * 		loadIndicator:	Optional. An object that extends Ui.LoadIndicator.
		 * 						If set to true a default LoadIndicator will be created.
		 */
		
		if(options === undefined) {
			options = {	};
		}
		
		if(typeof options == 'string') {
			options = {
				url: options
			};
		}
		
	this['#base:{constructor}'] = Element; Element.call(this, options);		
		
		if(options.loadIndicator) {
			if(options.loadIndicator === true) {
				this.addLoadIndicator(new Ui.LoadIndicator());
			} else {
				this.addLoadIndicator(options.loadIndicator);
			}
		}
		
		if(options.url) {
			this.setUrl(options.url);
		}
		
	};
	
	extend(constructor, {
		tag: 'img'
	});
	
	constructor.prototype = {
		
		unitName: 'Img',
		
		'#loadIndicators': null,
		
		disposable: [
			'#loadIndicators'
		],
		
		getUrl: function() {
			return new Uri(this.dom.src);
		},
		
		setUrl: function(url) {
			this.dom.src = Uri.process(url);
		},
		
		'#genLoadIndicators': function() {
			if(!this['#loadIndicators']) {
				this['#loadIndicators'] = new Hashtable();
			}
		},
		
		addLoadIndicator: function(li) {
			
			var callers;
			
			callers = this.on({
				setUrl: function() {
					li.begin(this);
				},
				load: function() {
					li.complete(this);
				}
			}, true);
			
			this['#genLoadIndicators']();
			this['#loadIndicators'].put(li, callers);
			
		},
		
		removeLoadIndicator: function(li) {
			var callers = this['#loadIndicators'].get(li);
			callers.off();
			this['#genLoadIndicators']();
			this['#loadIndicators'].remove(li);
		}
		
	};
	
	return constructor;
	
}());var Label = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 		
		 * 		link:	Optional. The Element that this is a label for (see the setLink method for accepted types).
		 * 
		 */
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
		if(typeof options != 'string' && options.link) {
			this.setLink(options.link);
		}
		
	};
	
	extend(constructor, {
		tag: 'label'
	});
	
	constructor.prototype = {
		
		unitName: 'Label',
		
		setLink: function(element) {
			/* element can be an element id, a MetaDom Element, or a DOM Element.
			 * When setLink is called with a MetaDom Element or a DOM element, if
			 * the element's id changes, the Label's link will be updated to the
			 * element's new id.  This does not apply if setLink is called with an
			 * id.
			 */
			
			var id, object;
			
			//if(this['#linkedTo']) {
				// TODO: the setId event handler needs to be removed from the old element.
			//}
			
			if(typeof element == 'string') {
				this.dom.htmlFor = element;
			} else {
				element = JHtml(element);
				id = element.getId();
				if(!id) {
					id = element.setRandomId();
				}
				this.dom.htmlFor = id;
				object = this;
				element.on({
					setId: function(v) {
						v.defer(function() {
							object.dom.htmlFor = element.getId();
						});
					}
				});
				this['#linkedTo'] = element;
			}
			
		},
		
		getLink: function() {
			/* returns the Element the Label is linked to
			 */
			return this.document.get(this.dom.htmlFor);
		}
		
	};
	
	return constructor;
	
}());var Li = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'li'
	});
	
	constructor.prototype = {
		
		unitName: 'Li'
		
	};
	
	return constructor;
	
}());
var Object = Element.sub(function() { // TODO: Should it be a ContainerElement?
	
	var constructor = function(options) {
		/* options:
		 * 		type:	Optional.
		 * 		url:	Optional.
		 */
		
	this['#base:{constructor}'] = Element; Element.call(this, options);
		
		if(options) {
			if(options.type) {
				this.setType(options.type);
			}
			if(options.url) {
				this.setUrl(options.url);
			}
		}
		
	};
	
	extend(constructor, {
		tag: 'object'
	});
	
	constructor.prototype = {
		
		unitName: 'Object',
		
		setType: function(type) {
			this.dom.type = type;
		},
		
		setUrl: function(url) {
			this.dom.data = url;
		}
		
	};
	
	return constructor;
	
}());
var Ol = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'ol'
	});
	
	constructor.prototype = {
		
		unitName: 'Ol'
		
	};
	
	return constructor;
	
}());
var Option = FormElement.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 		text:		Optional. The text of the element.
		 */
		
	this['#base:{constructor}'] = FormElement; FormElement.call(this, options);
		
		if(options.text) {
			this.setText(options.text);
		}
		
	};
	
	extend(constructor, {
		tag: 'option'
	});
	
	constructor.prototype = { };
	
	extend(constructor.prototype, ContainerElement.prototype);
	
	extend(constructor.prototype, {
		
		unitName: 'Option',
		
		getIndex: function() {
			return this.dom.index;
		}
		
	});
	
	return constructor;
	
}());
var P = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'p'
	});
	
	constructor.prototype = {
		
		unitName: 'P'
		
	};
	
	return constructor;
	
}());
var Script = Element.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 		url:		Optional. The URL to use as the src of the script.
		 * 
		 * options can be an options object or just the url option.
		 */
		
		if(!options) {
			options = { };
		}
		
		if(typeof options == 'string') {
			options = {
				url: options
			};
		}
		
	this['#base:{constructor}'] = Element; Element.call(this, options);
		
		if(options.url) {
			this.setUrl(options.url);
		}
		
		this.dom.type = 'text/javascript';
		
	};
	
	extend(constructor, {
		tag: 'script'
	});
	
	constructor.prototype = {
		
		unitName: 'Script',
		
		getUrl: function() {
			return this.dom.src;
		},
		
		setUrl: function(url) {
			this.dom.src = url;
		}
		
	};
	
	return constructor;
	
}());
var Select = FormElement.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 		options:	Optional. An array of strings (or objects/Hashtables with text and value attributes) to be used in creating Option Elements as children
		 * 		selected:	Optional. The default option selected (by value).
		 */
		
		if(!options) {
			options = { };
		}
		
	this['#base:{constructor}'] = FormElement; FormElement.call(this, options);
		
		if(options.options) {
			this.setOptions(options.options);
		}
		
		if(options.selected !== undefined) {
			this.setSelection(this.getOptionByValue(options.selected))
		}
		
	};
	
	extend(constructor, {
		tag: 'select'
	});
	
	constructor.prototype = {
		
		unitName: 'Select',
		
		setSelection: function(el) {
			if(el.dom) {
				this.dom.selectedIndex = el.dom.index;
			} else {
				this.dom.selectedIndex = el.index;
			}
		},
		
		setSelectedText: function(text) {
			this.setSelection(this.getOptionByText(text));
		},
		setSelectedValue: function(value) {
			this.setSelection(this.getOptionByValue(value));
		},
				
		getSelected: function(el) {
			return JHtml(this.dom.options[this.dom.selectedIndex]);
		},
		
		getIndexByText: function(text) {
			// DEPRECATED. TODO: remove this function. This was the old name for getOptionByText.
			// It seems to have been misnamed; I'm not sure why.
			return this.getOptionByText(text);
		},
		getIndexByValue: function(value) {
			// DEPRECATED. TODO: remove this function. This was the old name for getOptionByValue.
			// It seems to have been misnamed; I'm not sure why.
			return this.getOptionByValue(value);
		},
		
		getOptionByText: function(text) {
			return JHtml(this.dom.options).forEach(function(u) {
				if(u.getText() == text) {
					return u;
				}
			});
		},
		
		getOptionByValue: function(value) {
			return JHtml(this.dom.options).forEach(function(u) {
				if(u.getValue() == value) {
					return u;
				}
			});
		},
		
		clearOptions: function() {
			ContainerElement.prototype.empty.apply(this);
		},
		
		setOptions: function(options) {
			this.clearOptions();
			this.addOptions(options);
		},
		
		addOptions: function(options) {
			
			var op;
			var doc = this.getDocument().dom;
			var dom = this.dom;
			var text, value, isDefault;
			
			r = Collection.castAsIterable(options);
			
			for(var i = 0; i < r.length; i++) {
				isDefault = false;
				u = r[i];
				if(u instanceof Elements.Option) {
					u.attach(this);
				} else {
					if(u instanceof Hashtable) {
						text = u.get('text');
						value = u.get('value');
						if(u.get('default')) {
							isDefault = true;
						}			
					} else if(typeof u.text != 'undefined') {
						text = u.text;
						value = u.value;
						if(u['default']) {
							isDefault = true;
						}
					} else {
						text = u;
						value = u;
					}
					op = doc.createElement('option');
					op.text = text;
					op.value = value;
					dom.appendChild(op);
					if(isDefault) {
						this.setSelection(op);
					}
				}
			}
			
		}
		
	};
	
	return constructor;
	
}());
var Span = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'span',
		alternateTags: [
			'u'
		]
	});
	
	constructor.prototype = {
		
		unitName: 'Span'
		
	};
	
	return constructor;
	
}());
var Strong = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'strong'
	});
	
	constructor.prototype = {
		
		unitName: 'Strong'
		
	};
	
	return constructor;
	
}());
var Table = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		/* children for a table can be passed in the same way as a TBody. Any arrays in
		 * the children Collection will be passed directly to a TBody constructor.
		 * Note: A TBody is not automatically constructed for each Table unless at least
		 * one array is in the children Collection.
		 */
		
		var r = [ ], u, tbodyPos = null;
		
		if(typeof options == 'undefined') {
			options = { };
		}
		
		if(options instanceof Array) {
			options = {
				children: options
			};
		}
		
		if(options.children) {
			options.children = Collection.castAsIterable(options.children);
			for(var i = 0; i < options.children.length; i++) {
				u = options.children[i];
				if(u instanceof Array || u.forEach) {
					r.push(u);
					options.children.splice(i, 1);
					if(tbodyPos === null) {
						tbodyPos = i;
					}
					i--;
				}
			}
			if(r.length > 0) {
				options.children.splice(tbodyPos, 0, new Elements.TBody({
					children: r
				}));
			}
		}
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'table'
	});
	
	constructor.prototype = {
		
		unitName: 'Table'
		
	};
	
	return constructor;
	
}());
var TBody = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		
		var u;
		
		if(typeof options == 'undefined') {
			options = { };
		}
		
		if(options.children) {
			options.children = Collection.castAsIterable(options.children);
			for(var i = 0; i < options.children.length; i++) {
				u = options.children[i];
				if(u instanceof Array || u.forEach) {
					options.children[i] = new Elements.Tr({
						children: u
					});
				}
			}
		}
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'tbody'
	});
	
	constructor.prototype = {
		
		unitName: 'TBody'
		
	};
	
	return constructor;
	
}());
var Td = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'td'
	});
	
	constructor.prototype = {
		
		unitName: 'Td'
		
	};
	
	return constructor;
	
}());
var TextArea = FormElement.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = FormElement; FormElement.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'textarea'
	});
	
	constructor.prototype = {
		
		unitName: 'TextArea'
		
	};
	
	return constructor;
	
}());
var Th = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'th'
	});
	
	constructor.prototype = {
		
		unitName: 'Th'
		
	};
	
	return constructor;
	
}());
var Tr = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		
		var u;
		
		if(typeof options == 'undefined') {
			options = { };
		}
		
		if(options.children) {
			options.children = Collection.castAsIterable(options.children);
			for(var i = 0; i < options.children.length; i++) {
				u = options.children[i];
				if(u instanceof Array || u.forEach) {
					options.children[i] = new Elements.Td({
						children: u
					});
				}
			}
		}
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'tr'
	});
	
	constructor.prototype = {
		
		unitName: 'Tr'
		
	};
	
	return constructor;
	
}());var Ul = ContainerElement.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = ContainerElement; ContainerElement.call(this, options);
		
	};
	
	extend(constructor, {
		tag: 'ul'
	});
	
	constructor.prototype = {
		
		unitName: 'Ul'
		
	};
	
	return constructor;
	
}());
var Input = (function() {var InputElement = FormElement.sub(function() {
	
	function constructor(options) {
		/* options
		 * 		name:	the name of the input element
		 */
		
		if(typeof options == 'string') {
			options = {
				value: options
			};
		}
		
		if(options.name) {
			// The name needs to be set at the same time as document.createElement for radio input elements in IE6
			this._setNameTo = options.name;
		}
		
	this['#base:{constructor}'] = FormElement; FormElement.call(this, options);
		
		this.dom.className += ' ' + this.type;
		
	};
	
	extend(constructor, {
		tag: 'input'
	});
	
	constructor.prototype = {
		
		unitName: 'InputElement'
		
	};
	
	return constructor;
	
}());var OptionInputElement = InputElement.sub(function() {
	
	function constructor(options) {
		/* options can be an options object or simply the text option.
		 * 
		 * options
		 * 		text:		Optional. The text to serve as the label for the Element.
		 * 		selected:	Optional. Boolean indicating whether the option is selected or not.
		 */
		// TODO: OptionInputElements don't seem to be instances of Element although they are instances of Node and InputElement.  Why? (There is a similiar TODO in createListener in globals.)
		
		var d;
		
		if(!options) {
			options = { };
		}
		
		if(typeof options == 'string') {
			options = {
				text: options
			};
		}
		
		if(!options.on) {
			options.on = { };
		}
		
		extend(options.on, {
			
			attach: function(v) {
				/* TODO: When there is a good way to override methods and call the super method, this needs
				 * to be taken out of the listeners and these methods need to be overridden, that way the
				 * v.defer thing here won't need to be used.
				 */
				v.defer(function() {
					var label = this.getLabel();
					if(label) {
						label.attach({
							to: this.getParent(),
							before: this.next()
						});
					}
				});
			},
			
			detach: function(v) {
				var label = this.getLabel();
				if(label) {
					label.detach();
				}
			},
			
			show: function() {
				var label = this.getLabel();
				if(label) {
					label.show();
				}
			},
			
			hide: function() {
				var label = this.getLabel();
				if(label) {
					label.hide();
				}
			},
			
			click: function() {
				this.change();
			}

		});
		
	this['#base:{constructor}'] = InputElement; InputElement.call(this, options);
		
		/* if(options.styles) {
			// TODO: this needs lots of work.. i'm not sure how feasible the idea even is.
			this._labelStyles = new Hashtable(options.styles);
			if(this._labelStyles.get('position') == 'absolute') {
				d = this.styles.getDimensions();
				this._labelStyles.put('left', d.left.toPixels() + d.width.toPixels());
			}
		} */
		
		if(options.text) {
			this.setText(options.text);
		}
		
		if(options.selected) {
			this.setSelected(true);
			this.dom.defaultChecked = true;
		}
		
	};
	
	constructor.prototype = {
		
		unitName: 'OptionInputElement',
		
		_label: null,
		_labelStyles: null,
				
		getLabel: function(forceCreate) {
			
			if(!this._label && forceCreate) {
				
				var id = this.getId();
				var p;
				
				if(!id) {
					id = this.setRandomId();
				}
				
				this._label = new Label({
					link: id
				});
				
				p = this.getParent();
				
				if(p) {
					this._label.attach({
						to: p,
						before: this.next()
					});
				}
				
				if(this._labelStyles) {
					this._label.styles.set(this._labelStyles);
				}
				
			}
			
			return this._label;
			
		},
		
		setText: function(text) {
			
			var label = this.getLabel(true);
			
			label.setText(text);
			
		},
		
		getText: function() {
			
			var label = this.getLabel(true);
			
			return label.getText();
			
		},
		
		isSelected: function() {
			return this.dom.checked;
		},
		
		setSelected: function(selected) {
			// DEPRECATED. Use select and unselect instead.
			this.dom.checked = selected;
		},
		
		select: function() {
			this.dom.checked = true;
		},
		
		unselect: function() {
			this.dom.checked = false;
		}
		
	};
	
	return constructor;
	
}());
var Button = InputElement.sub(function() {
	
	function constructor(options) {
		
	this['#base:{constructor}'] = InputElement; InputElement.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Button',
		type: 'button'
		
	};
	
	return constructor;
	
}());
var Checkbox = OptionInputElement.sub(function() {
	
	function constructor(options) {
		
	this['#base:{constructor}'] = OptionInputElement; OptionInputElement.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Checkbox',
		type: 'checkbox'
		
	};
	
	return constructor;
	
}());
var File = InputElement.sub(function() {
	
	function constructor(options) {
		
	this['#base:{constructor}'] = InputElement; InputElement.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'File',
		type: 'file'
		
	};
	
	return constructor;
	
}());
var Hidden = InputElement.sub(function() {
	
	function constructor(options) {
	this['#base:{constructor}'] = InputElement; InputElement.call(this, options);
	};
	
	constructor.prototype = {
		unitName: 'Hidden',
		type: 'hidden'
	};
	
	return constructor;
	
}());
var Password = InputElement.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = InputElement; InputElement.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Password',
		type: 'password'
		
	};
	
	return constructor;
	
}());
var Radio = OptionInputElement.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = OptionInputElement; OptionInputElement.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Radio',
		type: 'radio'
		
	};
	
	return constructor;
	
}());
var Submit = Button.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = Button; Button.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Submit',
		type: 'submit'
		
	};
	
	return constructor;
	
}());
var Text = InputElement.sub(function() {
	
	var constructor = function(options) {
		/* options:
		 * 		filter:		Optional. Options for setCharFilter.
		 */
		
	this['#base:{constructor}'] = InputElement; InputElement.call(this, options);
		
		if(options && options.filter) {
			this.setCharFilter(options.filter);
		}
		
	};
	
	constructor.prototype = {
		
		unitName: 'Text',
		
		type: 'text',
		
		setCharFilter: function(options) {
			/* options
			 * 		type:	Either "allow" or "block".  Specifies whether the filter should
			 * 				only allow the specified characters or only block the specified
			 * 				characters.
			 * 		chars:	A string of characters.
			 * 
			 * Alternatively, options can be a regular expression which matches the characters
			 * that should be removed.
			 */
			
			var rx;
			
			if(options instanceof RegExp) {
				rx = options;
			} else if(options.type == 'allow') {
				rx = new RegExp('[^' + options.chars + ']', 'g');
			} else if(options.type == 'block' ){
				rx = new RegExp('[' + options.chars + ']', 'g');
			} else {
				throw 'Invalid value for type.';
			}
			
			this.on({
				keydown: function(v) {
					v.defer(function() {
						this.setValue(this.getValue().replace(rx, ''));
					});
				}
			});
			
		}
		
	};
	
	return constructor;
	
}());
var object = {Button: Button,Checkbox: Checkbox,File: File,Hidden: Hidden,InputElement: InputElement,OptionInputElement: OptionInputElement,Password: Password,Radio: Radio,Submit: Submit,Text: Text};return object;})();var object = {Input: Input,A: A,B: B,Body: Body,Br: Br,ContainerElement: ContainerElement,ContainerElementCollection: ContainerElementCollection,Dd: Dd,Div: Div,Dl: Dl,Dt: Dt,Element: Element,ElementCollection: ElementCollection,Em: Em,Form: Form,FormElement: FormElement,Head: Head,Html: Html,I: I,IFrame: IFrame,Img: Img,Label: Label,Li: Li,Object: Object,Ol: Ol,Option: Option,P: P,Script: Script,Select: Select,Span: Span,Strong: Strong,Table: Table,TBody: TBody,Td: Td,TextArea: TextArea,Th: Th,Tr: Tr,Ul: Ul};return object;})();var Properties = (function() {var Classes = Property.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = Property; Property.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Classes',
		
		exists: alias('has'),
			/* 2012/02/20: I have switched the primary method name from exists to has. Change
			 * code inside the jsl to reflect this change to "has" by replacing occurances of "exists"
			 * when referring to classes.
			 */
		has: function(/*className, className, ... */) {
			/* This method accepts multiple className arguments either in the form of an array
			 * or as a comma separated list.
			 * It will return true if all classes exist or false if any class does not exist.
			 */
			
			var classes, el = this.object.dom, re;
			var className = arguments[0];
			
			if(typeof className == 'string') {
				className = arguments;
			}
			
			if(className.length === undefined) {
				classes = Collection.castAsIterable(className);
			} else {
				classes = className;
			}
			
			for(var i = 0; i < classes.length; i++) {
				re = new RegExp('(^|\\s)+(' + classes[i] + ')($|\\s)+');
				if(el.className.search(re) == -1) {
					return false;
				}
			}
			
			return true;
			
		},
		
		add: function(/* className, className, ... */) {
			/* This method accepts multiple className arguments either in the form of an array
			 * or as a comma separated list.
			 */
			
			var classes, el = this.object.dom;
			var className = arguments[0];
			
			if(typeof className == 'string') {
				className = arguments;
			}
			
			if(className.length === undefined) {
				classes = Collection.castAsIterable(className);
			} else {
				classes = className;
			}
			
			for(var i = 0; i < classes.length; i++) {
				if(!this.has(classes[i])) {
					el.className += (' ' + classes[i]);
				}
			}
			
		},
		
		remove: function(/* className, className, ... */) {
			/* This method accepts multiple className arguments either in the form of an array
			 * or as a comma separated list.
			 */
			
			var classes, re, el = this.object.dom;
			var className = arguments[0];
			
			if(typeof className == 'string') {
				className = arguments;
			}
			
			classes = Collection.castAsIterable(className);
			
			for(var i = 0; i < classes.length; i++) {
				re = new RegExp('(^|\\s)+(' + classes[i] + ')($|\\s)+');
				el.className = el.className.replace(re, ' ');
			}
			
		},
		
		toggle: function(/*className, className, ... */) {
			
			var classes, el = this.object;
			var className = arguments[0];
			
			if(typeof className == 'string') {
				className = arguments;
			}
			
			classes = Collection.castAsIterable(className);
			
			for(var i = 0, l = classes.length; i < l; i++) {
				if(el.has(classes[i])) {
					el.remove(classes[i]);
				} else {
					el.add(classes[i]);
				}
			}
			
		},
		
		forEach: function(f, scope) {
			
			var classes = new Collection((this.object.dom.className + ' ').split(' '));
			classes.pop();
			
			return classes.forEach(f, scope);
			
		},
		
		toString: function() {
			
			var r = (this.object.dom.className + ' ').split(' ');
			var s;
			
			r.pop();
			for(var i = 0; i < r.length; i++) {
				if(r[i] == '') {
					r.splice(i, 1);
				}
			}
			
			return r.join(', ');
			
		}
		
	};
	
	return constructor;
	
}());var Cookies = Property.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = Property; Property.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Cookies',
		
		get: function(name) {
			
			var doc = this.object.dom;
			var cookies = doc.cookie;
			var r = (cookies + ';').split(';');
			var parts, cname, value;
			
			for(var i = 0; i < r.length - 1; i++) {
				parts = r[i].split('=');
				cname = JString.trim(parts[0]);
				value = parts[1];
				if(cname == name) {
					return value;
				}
			}
			
			return undefined;
			
		},
		
		set: function(name, value, duration) {
			/* duration is the time in seconds until the cookie expires.
			 */
			
			var d = new Date();
			var expires = '';
			
			if(duration != undefined) {
				d.setSeconds(d.getSeconds() + duration);
				expires = '; expires=' + d.toUTCString();
			}
			
			document.cookie = name + '=' + value + expires;
			
		},
		
		remove: function(name) {
			// TODO: Is there a better way to remove a cookie?
			
			document.cookie = name + '=; expires=0';
			
		}
		
	};
	
	return constructor;
	
}());var ElementFx = Property.sub(function() {
	
	var FadeFx = {
	
	fade: function(options) {
		// options can simply be the to option.
		
		if(typeof options == 'number') {
			options = {
				to: options
			};
		}
		
		if(options.from !== undefined) {
			options.from = {
				opacity: options.from
			};
		}
		if(options.to !== undefined) {
			options.to = {
				opacity: options.to
			};
		}
				
		this.transition(options);
		//setRunning.call(this, 'fade', this.transition(opts));
		/* TODO: Running transitions should be managed somehow. Is setRunning the correct
		 * way to do it, or should it be done another way?
		 * Also, note that setRunning calls start, so something needs to be done to keep
		 * start from being called twice if setRunning is used (since transition also calls
		 * start).
		 */ 
		
	},
	
	fadeOut: function(options) {
		// options can simply be the speed option.
		
		if(!options) {
			options = { };
		}
		
		if(!options.to) {
			options.to = 0;
		}
		
		if(typeof options == 'string') {
			options = {
				speed: options
			};
		}
				
		this.fade(options);
		
	},
	
	fadeIn: function(options) {
		// options can simply be the speed option.
		
		if(!options) {
			options = { };
		}
		
		if(!options.to) {
			options.to = 1;
		}
		
		if(typeof options == 'string') {
			options = {
				speed: options
			};
		}
		
		this.fade(options);
		
	},
	
	appear: function(options) {
		// options can simply be the speed option.
		if(!options) {
			options = { };
		} else if(typeof options == 'string') {
			options = {
				speed: options
			};
		}
		this.object.show({ suppressFx: true });
		options.from = 0;
		options.to = 1;
		this.fade(options);
	},
	
	vanish: function(options) {
		// options can simply be the speed option.
		if(!options) {
			options = { };
		} else if(typeof options == 'string') {
			options = {
				speed: options
			};
		}
		var el = this.object;
		options.to = 0;
		addOnDone(options, function() {
			el.hide({ suppressFx: true });
			el.styles.set({ opacity: 1 });
		});
		this.fade(options);
	}
	
};var MoveFx = {
	/* TODO: These methods should all return effect objects (like the move method does).
	 * Also get other fx returning effect objects (other than just MoveFx).
	 * 
	 * TODO: rework these to use transitions. move itself is probably unneeded now that transition can cover that.
	 * however, it may be good to keep it around with a setRunning call.
	 * other methods, like moveIn, moveOut, ... can be helpful and should be reworked
	 * NOTE: expand and collapse have already been reworked to use transition
	 */
	
	move: function(options) {
		
		var effect;
		
		if(!options) {
			options = { };
		}
		
		options.element = this.object;
		options.disposableWith = this;
		
		effect = new Fx.Element.Move(options);
		
		setRunning.call(this, 'move', effect);
		
		return effect;
		
	},
	
	shift: function(options) {
		/* options:
		 * 		direction:	Required. The direction to move: up, down, left, or right.
		 * 		amount:		Required. The amount of pixels to move.
		 * 
		 * options may also be passed as 2 individual arguments, e.g. shift(direction, amount)
		 */
		
		var direction;
		var amount;
		var dx = this.object.styles.getDimensions();
		var x = Math.round(dx.left.toPixels());
		var y = Math.round(dx.top.toPixels());
		var opts;
		
		if(typeof options == 'string') {
			direction = options;
			amount = arguments[1];
		} else {
			direction = options.direction;
			amount = options.amount;
		}
		
		opts = { };
		
		switch(direction) {
			case 'left':
				opts.left = x - amount;
				break;
			case 'right':
				opts.left = x + amount;
				break;
			case 'up':
				opts.top = y - amount;
				break;
			case 'down':
				opts.top = y + amount;
				break;
		}
		
		return this.move(opts);
		
	},
	
	moveIn: function(options) {
		/* options:
		 * 		direction: 'up', 'down', 'left', 'right', or 'random'
		 */
		
		var object = this;
		
		if(!options) {
			options = { };
		}
		
		defer(function() {
			
			var el = object.object;
			var dx = el.styles.getDimensions();
			
			if(options.direction == 'random' || !options.direction) {
				options.direction = JMath.Random.choose([ 'up', 'down', 'left', 'right' ]);
			}
			switch(options.direction) {
				case 'up':
					options.top = 0;
					el.styles.set({
						top: dx.height
					});
					break;
				case 'down':
					options.top = 0;
					el.styles.set({
						top: -dx.height
					});
					break;
				case 'left':
					options.left = 0;
					el.styles.set({
						top: dx.width
					});
					break;
				case 'right':
					options.left = 0;
					el.styles.set({
						top: -dx.height
					});
					break;
				default:
					throw 'Direction not understood: ' + options.direction;
			}
			
			object.move(options);
			
		});
		
	},
	
	moveOut: function(options) {
		/* options:
		 * 		direction: 'up', 'down', 'left', 'right', or 'random'
		 */
		// TODO: This method isn't working yet.
		
		if(!options) {
			options = { };
		}
		
		var el = this.object;
		var p = el.getParent();
		if(!p) {
			return;
		}
		var dx = p.styles.getDimensions();
		
		if(options.direction == 'random' || !options.direction) {
			options.direction = JMath.Random.choose([ 'up', 'down', 'left', 'right' ]);
		}
		switch(options.direction) {
			case 'up':
				options.top = 0;
				el.styles.set({
					top: dx.height
				});
				break;
			case 'down':
				options.top = 0;
				el.styles.set({
					top: -dx.height
				});
				break;
			case 'left':
				options.left = 0;
				el.styles.set({
					top: dx.width
				});
				break;
			case 'right':
				options.left = 0;
				el.styles.set({
					top: -dx.height
				});
				break;
			default:
				throw 'Direction not understood: ' + options.direction;
		}
		
		this.move(options);
		
	},
	
	expand: function(options) {
		/* options:
		 * 		dimension:	'height', 'width', or 'all'
		 */
		
		var object = this;
		var el = this.object;
		var xHeight, xWidth;
		
		if(!options) {
			options = { };
		}
		options.to = { };
		
		this.object.show({ suppressFx: true });
		
		switch(options.dimension) {
			case 'height':
				xHeight = true;
				break;
			case 'width':
				xWidth = true;
				break;
			case 'all':
				xHeight = true;
				xWidth = true;
				break;
		}
		
		if(xWidth) {
			el.styles.set({ width: '' });
		}
		if(xHeight) {
			el.styles.set({ height: '' });
		}
		
		defer(function() {
			
			var p = el.getParent();
			var dx = p.styles.getDimensions();
			
			if(xHeight) {
				options.to.height = dx.height.toPixels();
				el.styles.set({
					height: 0
				});
			}
			if(xWidth) {
				options.to.width = dx.width.toPixels();
				el.styles.set({
					width: 0
				});
			}
			
			object.transition(options);
			
		});
		
	},
	
	collapse: function(options) {
		/* options:
		 * 		dimension:	'height', 'width', or 'all'
		 */
		
		var object = this;
		
		if(!options) {
			options = { };
		}
		options.to = { };
		
		defer(function() {
			
			var el = object.object;
			var p = el.getParent();
			var dx = p.styles.getDimensions();
			var xHeight, xWidth;
			
			switch(options.dimension) {
				case 'height':
					xHeight = true;
					break;
				case 'width':
					xWidth = true;
					break;
				case 'all':
					xHeight = true;
					xWidth = true;
					break;
			}
			
			if(xHeight) {
				options.to.height = 0;
			}
			if(xWidth) {
				options.to.width = 0;
			}
			
			addOnDone(options, function() { object.object.hide({ suppressFx: true }); });
			
			object.transition(options);
			
		});
		
	},
	
	resize: alias('move')
	
};var ZoomFx = {
	
	zoomOutAppear: function(options) {
		// options can simply be the speed option.
		if(!options) {
			options = { };
		} else if(typeof options == 'string') {
			options = {
				speed: options
			};
		}
		this.object.show({ suppressFx: true });
		options.from = {
			opacity: 0,
			transform: 'scale(2)'
		};
		options.to = {
			opacity: 1,
			transform: 'scale(1)'
		};
		this.transition(options);
	},
	
	zoomOutVanish: function(options) {
		// options can simply be the speed option.
		if(!options) {
			options = { };
		} else if(typeof options == 'string') {
			options = {
				speed: options
			};
		}
		var el = this.object;
		options.to = {
			opacity: 0,
			transform: 'scale(.5)'
		};
		addOnDone(options, function() {
			el.hide({ suppressFx: true });
			el.styles.set({
				opacity: 1,
				transform: ''
			});
		});
		this.transition(options);
	},
	
	zoomInAppear: function(options) {
		// options can simply be the speed option.
		if(!options) {
			options = { };
		} else if(typeof options == 'string') {
			options = {
				speed: options
			};
		}
		this.object.show({ suppressFx: true });
		options.from = {
			opacity: 0,
			transform: 'scale(.5)'
		};
		options.to = {
			opacity: 1,
			transform: 'scale(1)'
		};
		this.transition(options);
	},
	
	zoomInVanish: function(options) {
		// options can simply be the speed option.
		if(!options) {
			options = { };
		} else if(typeof options == 'string') {
			options = {
				speed: options
			};
		}
		var el = this.object;
		options.to = {
			opacity: 0,
			transform: 'scale(2)'
		};
		addOnDone(options, function() {
			el.hide({ suppressFx: true });
			el.styles.set({
				opacity: 1,
				transform: ''
			});
		});
		this.transition(options);
	}
	
};
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = Property; Property.call(this, options);
		
	};
	
	function setRunning(property, effect) {
		
		var s = '#runOnly.' + property;
		
		if(this[s] && this[s].running) {
			var oldEffect = this[s];
			this[s] = null;
			oldEffect.stop();
		}
		
		this[s] = effect.start();
		
	}
	
	constructor.prototype = {
		
		unitName: 'ElementFx',
		
		'#runCssFx': function(name, options) {
			var classes = this.object.classes;
			classes.remove('Fx-' + name + '_run');
			classes.add('Fx-' + name + '_init');
			defer(function() {
				classes.add('Fx-' + name + '_run');
			});
			setTimeout(function() {
				classes.remove('Fx-' + name + '_run', 'Fx-' + name + '_init');
				if(options && options.on && options.on.done) {
					options.on.done();
				}
			}, 350);
		},
		
		attach: function(options) {
			var fx = this;
			var object = this.object;
			if(options.toLiteral) {
				options = options.toLiteral();
			}
			for(var i in options) {
				(function(method, effects) {
					var fxOpts = { };
					var delay = false;
					if(effects.length === undefined || typeof effects == 'string') {
						effects = [ effects ];
					}
					if(method == 'hide' || method == 'detach' || method == 'dispose') {
						// Delay execution until after the fx are done.
						delay = true;
					}
					fxOpts[method] = function(v) {
						var methodOptions = v.arguments[0];
						if(methodOptions && methodOptions.suppressFx) {
							/* A method which has effects attached to it through this method
							 * can be called with suppressFx to keep the effects from activating.
							 */
							return;
						}
						var running = [ ], effect;
						for(var i = 0; i < effects.length; i++) {
							if(typeof effects[i] == 'string') {
								effect = {
									type: effects[i]
								};
							} else {
								effect = clone(effects[i]);
							}
							if(!delay) {
								fx[effect.type](effect);
							} else {
								running[i] = true;
								(function(effect, i) {
									effect.on = {
										done: function() {
											var allDone = true;
											running[i] = false;
											for(var j = 0; j < running.length; j++) {
												if(running[j]) {
													allDone = false;
													break;
												}
											}
											if(allDone) {
												Elements.Element.prototype[method].apply(object);
											}
										}
									};
								})(effect, i);
								fx[effect.type](effect);
							}
						}
						if(delay) {
							v.stop();
						}
					};
					object.on(fxOpts);
				})(i, options[i]);
			}
		},
		
		transition: function(options) {
			/* options:
			 * 		speed:	'x-slow', 'slow', 'normal', 'fast', or 'x-fast'
			 */
			var effect, opts = options;
			if(!opts.to) {
				opts = {
					to: clone(options)
				};
				if(opts.to.on) {
					opts.on = opts.to.on;
					delete opts.to.on;
				}
			}
			opts.element = this.object;
			opts.disposableWith = this;
			if(opts.speed) {
				switch(opts.speed) {
					case 'x-slow':		opts.duration = 1.6; break;
					case 'slow': 		opts.duration = .8; break;
					case 'fast':		opts.duration = .2; break;
					case 'x-fast':		opts.duration = .1; break;
				}
			}
			if(opts.to) {
				Browser.StyleNames.fix(opts.to);
			}
			if(opts.from) {
				Browser.StyleNames.fix(opts.from);
			}
			if(Browser.Supports.transition) {
				effect = new Fx.Element.CssTransition(opts);
			} else {
				effect = new Fx.Element.NumericStyles(opts);
			}
			effect.start();
			return effect;
		}
		
	};
	
	extend(constructor.prototype, FadeFx);
	extend(constructor.prototype, MoveFx);
	extend(constructor.prototype, ZoomFx);
	
	function addOnDone(options, f) {
		if(!options.on) {
			options.on = { };
		}
		if(options.on.done) {
			if(Collection.isArray(options.on.done)) {
				options.on.done.push(f);
			} else {
				options.on.done = [
					options.on.done,
					f
				];
			}
		} else {
			options.on.done = f;
		}
	}
	
	return constructor;
	
}());var Styles = Property.sub(function() {
	
	var Transitions = Property.sub(function() {
	
	var transitionCssName;
	var checkTransitionCssNames = [ 'transition', 'MozTransition', 'WebkitTransition', 'OTransition', 'MsTransition' ];
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = Property; Property.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Classes',
		
		exists: alias('has'),
		has: function(/*property, property, ... */) {
			/* This method accepts multiple property arguments either in the form of an array
			 * or as a comma separated list.
			 * It will return true if all properties exist or false if any property does not exist.
			 */
			
			if(!transitionCssName) {
				initTransitionCssName();
			}
			
			var properties, el = this.object.object.dom;
			var propertyName = arguments[0];
			var transitionStr = el.style[transitionCssName];
			
			if(typeof propertyName == 'string') {
				propertyName = arguments;
			}
			
			if(propertyName.length === undefined) {
				properties = Collection.castAsIterable(propertyName);
			} else {
				properties = propertyName;
			}
			
			for(var i = 0; i < properties.length; i++) {
				re = new RegExp('(^|[\\s,])+(' + properties[i] + ')($|[\\s,])+');
				if(transitionStr.search(re) == -1) {
					return false;
				}
			}
			
			return true;
			
		},
		
		add: function(options) {
			/* options:
			 * 		property:	Optional. A property name to apply the transition to.
			 * 		duration:	Optional. How long the transition should last.
			 * 		function:	Optional. A timing function string or options.
			 * 		delay:		Optional. How long to delay before the transition starts.
			 * 
			 * options can also be passed in their respective orders listed above or all
			 * as a single string.
			 */
			
			if(!transitionCssName) {
				initTransitionCssName();
			}
			
			var transitionStr, property;
			var el = this.object.object.dom, curTS;
			var style = el.style;
			
			if(typeof options == 'string') {
				if(arguments.length == 1) {
					// All options passed in a single string
					transitionStr = options;
					property = (transitionStr + ' ').split(' ')[0];
				} else {
					// Options passed as separate arguments
					transitionStr = getArguments().join(' ');
					property = arguments[0];
				}
			} else {
				// Options passed as an options object
				transitionStr = options.property;
				property = options.property;
				if(options.duration) {
					transitionStr += ' ' + options.duration;
				}
				if(options['function']) {
					transitionStr += ' ' + options['function'];
				}
				if(options.delay) {
					transitionStr += ' ' + options.delay;
				}
			}
			
			if(this.has(property)) {
				this.remove(property);
			}
			curTS = style[transitionCssName];
			if(curTS.length > 0) {
				transitionStr = ', ' + transitionStr;
			}
			style[transitionCssName] += transitionStr;
			
		},
		
		remove: function(/* propertyName, propertyName, ... */) {
			/* This method accepts multiple propertyName arguments either in the form of an array
			 * or as a comma separated list.
			 */
			
			var properties, re, el = this.object.object.dom;
			var propertyName = arguments[0];
			var style = el.style;
			var transitions, ts, property, dropTransitions = [ ], checkProperty;
			
			if(!transitionCssName) {
				initTransitionCssName();
			}
			
			if(!transitionCssName || style[transitionCssName] == '') {
				return;
			}
			
			if(typeof propertyName == 'string') {
				propertyName = arguments;
			}
			
			properties = Collection.castAsIterable(propertyName);
			
			ts = style[transitionCssName];
			if(ts.indexOf(',') == -1) {
				transitions = [ ts ];
			} else {
				transitions = ts.split(',');
			}
			
			for(var i = 0; i < properties.length; i++) {
				property = JString.toHyphenated(properties[i]);
				for(var j = 0; j < transitions.length; j++) {
					checkProperty = (JString.trim(property) + ' ').split(' ')[0];
					if(checkProperty == property) {
						dropTransitions[j] = true;
						/* Don't break in case there's another one, although joi
						 * operates, in theory, as if there shouldn't be more than
						 * one transition under the same property.
						 */
					}
				}
			}
			
			if(dropTransitions.length == 0) {
				return;
			}
			
			ts = '';
			for(var i = 0; i < transitions.length; i++) {
				if(!dropTransitions[i]) {
					ts += transitions[i];
				}
			}
			style[transitionCssName] = ts;
			
		},
		
		
		// TODO: get the rest below working...
		toggle: function(/*className, className, ... */) {
			
			var classes, el = this.object;
			var className = arguments[0];
			
			if(typeof className == 'string') {
				className = arguments;
			}
			
			classes = Collection.castAsIterable(className);
			
			for(var i = 0, l = classes.length; i < l; i++) {
				if(el.has(classes[i])) {
					el.remove(classes[i]);
				} else {
					el.add(classes[i]);
				}
			}
			
		},
		
		forEach: function(f, scope) {
			
			var classes = new Collection((this.object.dom.className + ' ').split(' '));
			classes.pop();
			
			return classes.forEach(f, scope);
			
		},
		
		toString: function() {
			
			var r = (this.object.dom.className + ' ').split(' ');
			var s;
			
			r.pop();
			for(var i = 0; i < r.length; i++) {
				if(r[i] == '') {
					r.splice(i, 1);
				}
			}
			
			return r.join(', ');
			
		}
		
	};
	
	function initTransitionCssName() {
		var el = document.body;
		for(var i = 0; i < checkTransitionCssNames.length; i++) {
			if(el.style[checkTransitionCssNames[i]] !== undefined) {
				transitionCssName = checkTransitionCssNames[i];
				break;
			}
		}
	}
	
	return constructor;
	
}());
	
	var setMethods_names = [ 'float', 'opacity' ];
	var setMethods = { }; // setMethods_names will be converted to a literal hash for efficiency.
	var resizeOnSet_styles = [
		'top', 'bottom', 'left', 'right', 'width', 'height',
		'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
		'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'
	];
	var resizeOnSet = { }; // resizeOnSet_styles will be converted to a literal hash for efficiency.
	var numericStyleMap = { // Maps style shortcut names to the actual styles we can retrieve numeric values for
		background: 'background-color',
		font: 'font-size',
		border: 'border-top-width',
		'border-width': 'border-top-width'
	};
	
	var constructor = function(options) {
		/* options
		 * 		styles:		Optional. The styles to be applied to the element.
		 */
		
		if(options.styles) {
			this.set(options.styles);
		}
		
	this['#base:{constructor}'] = Property; Property.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Styles',
		
		'#transitions': null,
		
		disposable: [ '#transitions' ],
		
		getters: {
			transitions: function() {
				if(!this['#transitions']) {
					this['#transitions'] = new Transitions({ object: this });
				}
				return this['#transitions'];
			}
		},
		
		set: function(styles) {
			/* styles can be an object literal, Hashtable, or StyleTable.
			 * Instead of passing styles as an object, a single style can also be passed
			 * as two separate arguments. e.g. styles.set('width', 100);
			 */
			
			var el = this.object, style, stylesTmp, value, callResize = false, styleName;
			
			if(typeof styles == 'string') {
				stylesTmp = { };
				stylesTmp[arguments[0]] = arguments[1];
				styles = stylesTmp;
			}
			
			if(styles.toLiteral) {
				styles = styles.toLiteral();
			}
			
			Browser.StyleNames.fix(styles);
				
			for(var i in styles) {
				styleName = JString.toCamelCase(i);
				value = styles[i];
				if(value instanceof Data.Color) {
					value = value.toSupportedString();
				}
				if(setMethods[styleName]) {
					setMethods[styleName].call(this, value);
				} else {
					if(typeof value == 'number') {
						el.dom.style[styleName] = value + 'px';
					} else if(value.getPixels) {
						el.dom.style[styleName] = value.toPixels() + 'px';
					} else {
						el.dom.style[styleName] = value;
					}
				}
				if(resizeOnSet[styleName]) {
					callResize = true;
				}
			}
			
			if(callResize) {
				el.resize();
			}
			
			return el;
			
		},
		
		get: function(style) {
			if(this.object.dom.currentStyle) {
				return this.object.dom.currentStyle[JString.toHyphenated(style)];
			} else {
				return this.object.dom.ownerDocument.defaultView.getComputedStyle(this.object.dom).getPropertyValue(JString.toHyphenated(style), null);
			}
		},
		
		computeNumeric: function(style) {
			var el = this.object;
			var dom = el.dom;
			var doc = dom.ownerDocument;
			var dV = doc.defaultView ? doc.defaultView : doc.parentWindow;
			var x;
			style = JString.toHyphenated(style);
			if(numericStyleMap[style]) {		
				style = numericStyleMap[style];
			}
			if(dV.getComputedStyle) {
				x = dV.getComputedStyle(dom).getPropertyValue(style, null);
				if(x == 'auto') {
					/* This is needed for IE9, which will return auto instead of actually
					 * computing the style sometimes.
					 * TODO: Some of this is pretty hacky and can surely lead to incompatible results
					 * in the targetted browsers. Try to work on getting more uniform results across
					 * browsers, particularly IE9-.
					 */ 
					x = el.dom['offset' + toProperCase(style)];
					return x;
				}
				if(x == '') {
					return 0;
				} else if(x.substring(x.length - 2) == 'px') {
					x = x.substring(0, x.length - 2);
					return x * 1;
				} else if(x.charAt(0) == '#' || x.substring(0, 3) == 'rgb') {
					return new Data.Color(x);
				} else if(!isNaN(x * 1)) {
					return x * 1;
				} else {
					if(style == 'opacity') {
						// Make a guess with opacity.
						return 1;
					}
					return undefined;
				}
			} else {
				x = el.dom.currentStyle[style];
				if(x == 'auto' || x === undefined) {
					x = el.dom['offset' + toProperCase(style)]; // This is not exactly the same but may be close enough in many situations
				} else if(x.charAt(0) == '#' || x.substring(0, 3) == 'rgb') {
					x = new Data.Color(x);
				} else if(x == 'medium') {
					/* This probably means the style is a border-width that hasn't been set.
					 * Medium is the default, and seems to represent about 3px. Although in
					 * theory some websites may use this default, it seems most likely that
					 * finding it means a border hasn't been set, so the decision has been
					 * made to return 0 instead.
					 */
					x = 0;
				}
				return x;
			}
		},
		
		fix: function(/* style, style, ... */) {
			/* Accepts an array of styles to fix either as an array
			 * or as a list of arguments.
			 * "Fix" means to set in stone if they are calculated rather than
			 * set directly. For instance, auto widths can be "fixed" to their
			 * numerical equivalent.
			 */
			
			var styleNames, styles = { }, value;
			
			if(typeof arguments[0] != 'string') {
				styleNames = arguments[0];
			} else {
				styleNames = arguments;
			}
			
			for(var i = 0; i < styleNames.length; i++) {
				value = this.computeNumeric(styleNames[i]);
				if(value !== undefined) {
					styles[styleNames[i]] = value;
				}
			}
			
			this.set(styles);
			
		},
		
		fixSize: function() {
			/* If an element is sized automatically, this method can be used to force that
			 * size to be fixed. This is useful if you are about to switch the position to
			 * absolute, which will lose automatic sizing, while preserving the original sizing.
			 */
			var dx = this.getDimensions();
			this.set({
				width: dx.width,
				height: dx.height
			});
		},
		fixWidth: function() {
			var dx = this.getDimensions();
			this.set({
				width: dx.width
			});
		},
		fixHeight: function() {
			var dx = this.getDimensions();
			this.set({
				height: dx.height
			});
		},
		fixPosition: function() {
			var dx = this.getDimensions();
			this.set({
				left: dx.left,
				top: dx.top,
				right: 'auto',
				bottom: 'auto'
			});
		},
		
		getDimensions: function() {
			var obj = {
				top: getDimension.call(this, 'top'),
				windowTop: getDimension.call(this, 'top', true),
				bottom: getDimension.call(this, 'bottom'),
				left: getDimension.call(this, 'left'),
				windowLeft: getDimension.call(this, 'left', true),
				right: getDimension.call(this, 'right'),
				width: getDimension.call(this, 'width'),
				height: getDimension.call(this, 'height')
			};
			if(this.object == $document.body) {
				extend(obj, {
					windowWidth: getDimension.call(this, function() {
						return getWindowDimensions().width;
					}),
					windowHeight: getDimension.call(this, function() {
						return getWindowDimensions().height;
					})
				});
			}
			return obj;
		},
		
		setFloat: function(cssFloat) {
			this.object.dom.style.cssFloat = cssFloat;
			this.object.dom.style.styleFloat = cssFloat;
		},
		
		setOpacity: function(opacity) {
			if(Browser.isIe) {
				// this.set({ zoom: 1 });
				// TODO: this isn't very clean, so if IE7 supports style.opacity like FF, then this should only be for IE6, same as for the getOpacity method
				this['#setOpacity:opacity'] = opacity;
				if(!this.object.dom.parentNode) {
					/* This keeps the opacity from being set on unattached elements.  In IE6, elements that aren't attached will
					 * throw an error below in the try..catch block, and the defer down there will continually create new objects,
					 * causing IE to steadily consume more memory. So this was added to keep that loop from happening.
					 * TODO: perhaps the try..catch block can be removed now. This may take care of all cases that was needed for.
					 */
					if(this['#setOpacity:eventHandler:attach']) {
						this['#setOpacity:eventHandler:attach'].off();
						this['#setOpacity:eventHandler:attach'] = 'null'
					}
					this['#setOpacity:eventHandler:attach'] = this.object.on({
						attach: extendFunction(function(args, v) {
							v.defer(
								this.setOpacity.bind({ scope: this, arguments: args })
							);
							this['#setOpacity:eventHandler:attach'].off();
							this['#setOpacity:eventHandler:attach'] = null;
						}).bind({ scope: this, arguments: [ arguments ] })
					}, true);
					return;
				}
				if(typeof this.object.dom.filters == 'unknown') {
					this.setOpacity.bind({ scope: this, arguments: arguments }).defer();
					return;
				}
				try {
					if(this.object.dom.style.filter.indexOf('DXImageTransform.Microsoft.Alpha') == -1) {
						// TODO: does the above expression in the if ever evaluate to false?
						this.object.dom.style.filter += 'progid:DXImageTransform.Microsoft.Alpha(opacity=100)';
					}
					this.object.dom.filters.item('DXImageTransform.Microsoft.Alpha').opacity = opacity * 100;
				} catch(x) {
					this.setOpacity.bind({ scope: this, arguments: arguments }).defer();
				}
				//this.object.dom.filters.alpha.opacity = opacity * 100;
				this['#setOpacity:opacity'] = null;
			} else {
				this.object.dom.style.opacity = opacity;
			}
		},
		
		getOpacity: function() {
			if(Browser.isIe) {
				if(
					typeof this['#setOpacity:opacity'] != 'undefined'
					&& this['#setOpacity:opacity'] !== null
				) {
					return this['#setOpacity:opacity'];
				}
				try {
					return this.object.dom.filters.item('DXImageTransform.Microsoft.Alpha').opacity / 100
				} catch(x) {
					return 1;
				}
			} else {
				if(
					typeof this.object.dom.style.opacity != 'string'
					|| this.object.dom.style.opacity == ''
				) {
					return 1;
				} else {
					return this.object.dom.style.opacity * 1;
				}
			}
		}
		
	};
	
	for(var i = 0; i < resizeOnSet_styles.length; i++) {
		resizeOnSet[resizeOnSet_styles[i]] = true;
	}
	var _methodName;
	for(var i = 0; i < setMethods_names.length; i++) {
		_methodName = setMethods_names[i];
		setMethods[_methodName] = constructor.prototype['set' + toProperCase(_methodName)];
	}
	
	function getDimension(dimension, computeWindow) {
		// dimension can be a dimension name or a function
		
		var object = this;
		var el = this.object;
		var doc = el.dom.ownerDocument;
		var dV = doc.defaultView;
		var offsetDimension;
		var x;
		
		return {
			
			toString: function() {
				return this.toPixels() + 'px';
			},
			
			valueOf: function() {
				return this.toPixels();
			},
			
			toPixels: typeof dimension == 'function' ? dimension : function(computeOuter) {
				/* computeOuter can be specified to include the border and padding in the computation
				 * of width and height. For top and left, computeOuter can be used to determine the
				 * top and left relative to the window instead of a css computed top and left.
				 */
				if(!offsetDimension) {
					offsetDimension = 'offset' + toProperCase(dimension);
				}
				if(computeWindow) {
					return computeWindowDimension(el.dom, offsetDimension);
				} else if(computeOuter) {
					return el.dom[offsetDimension];
				} else {
					if(dV.getComputedStyle) {
						x = dV.getComputedStyle(el.dom).getPropertyValue(dimension, null);
						if(x == 'auto') {
							/* This is needed for IE9, which will return auto instead of actually
							 * computing the style sometimes.
							 * TODO: Some of this is pretty hacky and can surely lead to incompatible results
							 * in the targetted browsers. Try to work on getting more uniform results across
							 * browsers, particularly IE9-.
							 */ 
							return el.dom[offsetDimension];
						}
					} else {
						return el.dom[offsetDimension]; // This is not exactly the same but may be close enough in many situations
						// TODO: Get this working. IE8 and down don't support getComputedStyle
					}
					if(x.substring(x.length - 2) == 'px') {
						x = x.substring(0, x.length - 2);
					} else if(x == 'auto' ) {
						x = 0;
						/* TODO: It seems like this happens sometimes before the page is loaded and the
						 * dimension can be determined. Could it happen in any other case?
						 */
					} else {
						throw 'Dimension not understood or cannot be computed: ' + dimension;
					}
					return x * 1;
				}
			},
			
			// set cannot be used with computeWindow or a function dimension
			set: (computeWindow || typeof dimension == 'function') ? null : function(v) {
				var styles = { };
				styles[dimension] = v;
				object.set(styles);
			}
			
		};
		
	}
	
	function computeWindowDimension(dom, offsetDimension) {
		var p = dom;
		var x = 0;
		do {
			x += p[offsetDimension];
		} while((p = p.parentNode) && p[offsetDimension] !== undefined);
		return x;
	}
	
	function toProperCase(s) {
		return s.substring(0, 1).toUpperCase() + s.substring(1);
	}
	
	function getWindowDimensions() {
		
		var width;
		var height;
		
		if(typeof window.innerWidth != 'undefined') {
			width = window.innerWidth,
			height = window.innerHeight
		} else if(
			typeof document.documentElement != 'undefined'
			&& typeof document.documentElement.clientWidth != 'undefined'
			&& document.documentElement.clientWidth != 0
		) {
			width = document.documentElement.clientWidth,
			height = document.documentElement.clientHeight
		} else {
			width = document.body.clientWidth,
			height = document.body.clientHeight
		}
		
		return {
			width: width,
			height: height
		};
		
	}
	
	return constructor;
	
}());var object = {ElementFx: ElementFx,Styles: Styles,Classes: Classes,Cookies: Cookies};return object;})();
	
	var metaUnits = new Hashtable();
	var domAssignMember = '#jsl#metaUnit';
	var storeInHash = {
		//'3': true
	};
	var dontStore = {
		'3': true
	};
	/* TextNodes have to be stored in a Hashtable because members can't be added to TextNodes
	 * (at least in IE6 when the node isn't attached to document), but other metaUnits are stored
	 * as a member of the DOM element in order to cut down on the processing time that is needed by
	 * the Hashtable.
	 */
	/* NOTE: currently the Hashtable method of assigning DomUnits to DOM objects is
	 * not being used. It does seem to improve performance in some test cases, but
	 * this approach should be further evaluated.
	 * TODO: decide whether to remove metaUnits permanently or to go back to using it.
	 */
	/* TODO: ! Use a element uid and a corresponding associative array to assign DOM Nodes to their
	 * corresponding DomUnits (similar to the way Quicksand uses element._qs_elId).
	 * NOTE: Do not use this method for text nodes due to the IE6 bug of not allowing members to
	 * be added to text nodes (I am unaware if this restriction exists in other browsers but it
	 * is definitely a possibility).
	 */
	
	var JHtml = function(dom) {
		// JHtml is for internal use.
		/* dom can be either a DomUnit or an array of DomUnits;
		 */
		
		if(!dom) {
			return null;
		}
		
		if(dom instanceof DomUnit) {
			return dom;
		}
		
		if(
			!dom.nodeType
			&& !dom.document // the window object has length (in FF3.5 with Firebug).
			&& (dom.length || dom.length === 0)
		) {
			
			var collectionType = Elements.ContainerElementCollection, domN, metaN;
			var r = [ ];
			
			var domR = Collection.castAsIterable(dom);
			for(var i = 0, l = domR.length; i < l; i++) {
				domN = domR[i];
				metaN = JHtml(domR[i]);
				if(domN.nodeType != 1) {
					collectionType = NodeCollection;
				} else if(
					!(metaN instanceof Elements.ContainerElement)
					&& collectionType == Elements.ContainerElementCollection
				) {
					collectionType = Elements.ElementCollection;
				}
				r.push(metaN);
			}
			
			r = new collectionType(r);
			
			return r;
			
		}
		
		var metaUnit;
		
		metaUnit = JHtml.getAssignment(dom);
		
		if(!metaUnit) {
			
			switch(dom.nodeType) {
				
				case 1: // element
					var tagName = dom.tagName.toLowerCase();
					if(tagName == 'input') {
						for(var i in Elements.Input) {
							if(Elements.Input[i].prototype.type == dom.type) {
								metaUnit = new Elements.Input[i]({ dom : dom });
							}
						}
						if(!metaUnit) {
							metaUnit = new Elements.Input.InputElement({ dom: dom });
						}
					} else {
						for(var i in Elements) {
							if(
								Elements[i].tag == tagName
								|| (
									Elements[i].alternateTags
									&& tagExists(Elements[i].alternateTags, tagName)
								)
							) {
								metaUnit = new Elements[i]({ dom: dom });
								break;
							}
						}
					}
					if(!metaUnit) { // use ContainerElement by default
						metaUnit = new Elements.ContainerElement({ dom: dom });
					}
					break;
				
				case 3: // text node
					metaUnit = new TextNode({ dom: dom });
					break;
				
				case 9: // document
					metaUnit = new Document(dom);
					break;
				
				default:
					if(dom.document) { // window
						metaUnit = new Window({ dom: dom });
					}
					break;
				
			}
			
			JHtml.assign(dom, metaUnit);
			
		}
		
		return metaUnit;
		
	};
	
	function tagExists(r, tagName) {
		for(var i = 0; i < r.length; i++) {
			if(r[i] == tagName) {
				return true;
			}
		}
		return false;
	}
	
	extend(JHtml, Unit.prototype);
	
	JHtml.extend({
		
		pairDom: true,
		/* [[2010/02/19]: I'm thinking now it may be best to just always use pairDom=true. One thing I didn't think
		 * about originally was the fact that the DomUnit objects are still often recreated when pairDom is off
		 * even when elements aren't referenced through ids, classes, etc. If pairDom is off, ANY attempt to retrieve
		 * a DOM element creates a new DomUnit for it, including methods like getNextSibling and select. Therefore,
		 * in practice, applications that would be improved by turning pairDom off are probably non-existant. The
		 * new default for pairDom as of today is true. TODO: think about this some more, possibly remove the ability
		 * to even set pairDom to false, and remove all these notes once a decision is reached. TODO: if the option to
		 * turn off pairDom is removed, then the DomUnit@equals method should be deprecated.] 
		 * 
		 * pairDom is whether to remember the DomUnit object that corresponds to a DOM object after the first time
		 * it is assigned. Setting pairDom to true can improve performance for applications where DOM objects are
		 * continually referenced through their id, class names, etc, because it will keep the jsl from recreating
		 * a new DomUnit everytime the DOM object is referenced.
		 * However, in applications where a large number of DOM objects will be referenced only once, turning pairDom
		 * off can improve performance by not wasting memory on keeping up with DomUnits that won't be used in the future.
		 * The recommended (and default) setting for pairDom is false.
		 * 
		 * TODO: In practice, is there much of a difference? Setting pairDom to true could help keep scripts working
		 * normatively. One downside to turning pairDom off is that whenever elements are retrieved they get a new
		 * DomUnit container, so some methods can't be listened to effectively (for instance the detach method can't
		 * be listened to effectively since it will only be called on one of the DomUnits, not all of them... perhaps
		 * another workaround could be used instead of pairDom .. for instance a pseudo-method in the dom that is called
		 * by any DomUnit, which can be listened to by other DomUnits? but would that be any better than pairDom?) 
		 */
		
		DomUnit: DomUnit,
		Window: Window,
		Document: Document,
		Node: Node,
		ContainerDomUnit: ContainerDomUnit,
		NodeCollection: NodeCollection,
		TextNode: TextNode,
		Fragment: Fragment,
		StyleTable: StyleTable,
		Properties: Properties,
		Elements: Elements,
		
		assign: function(dom, metaUnit) {
			/* Assign a DomUnit to a DOM object.
			 */
			
			if(JHtml.pairDom) {
				
				if(storeInHash[dom.nodeType]) {
					metaUnits.put(dom, metaUnit);
				} else if(dontStore[dom.nodeType]) {
				} else {
					dom[domAssignMember] = metaUnit;
				}
				
			}
			
		},
		
		getAssignment: function(dom) {
			
			var metaUnit;
			
			if(JHtml.pairDom) {
				
				if(storeInHash[dom.nodeType]) {
					return metaUnits.get(dom);
				} else if(dontStore[dom.nodeType]) {
					return null;
				} else {
					metaUnit = dom[domAssignMember];
					if(metaUnit) {
						if(metaUnit.dom != dom) {
							/* This check is needed because an iframe with designmode on in IE8 will
							 * automatically carry over any properties of one dom node to a derivative
							 * dom node. This means that when the cursor is in a <p> element and the
							 * user presses enter, creating a new <p> element, the new element will
							 * inherit the old element's assignment, which will be incorrect.
							 */
							dom[domAssignMember] = null;
							return null;
						} else {
							return metaUnit;
						}
					}
				}
				
			}
			
			return null;
			
		},
		
		removeAssignment: function(metaUnit) {
			
			var dom = metaUnit.dom;
			
			if(JHtml.pairDom) {
				
				if(storeInHash[dom.nodeType]) {
					metaUnits.remove(dom);
				} else if(dontStore[dom.nodeType]) {
				} else {
					dom[domAssignMember] = null;
				}
				
			}
			
		}
		
	});
	
	return JHtml;
	
})();var XString = Unit.sub(function() {
	/* Warning: XString is not an instanceof the native String object nor
	 * will the typeof operator return 'string'. XStrings should be checked
	 * using instanceof joi.XString.
	 */
	
	var constructor = function(options) {
		/* options can be either an options literal with the string property set to the
		 * string to use as the base of the XString or options can be the object to be
		 * used as the base itself.
		 */
		
		if(typeof options == 'undefined') {
			options = {
				string: ''
			};
		} 
		
		if(typeof options.string == 'undefined') {
			options = {
				string: options
			};
		}
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
		if(options.string == null) {
			options.string = '';
		}
		
		this['#string'] = options.string;
		
		this.length = this['#string'].length;
		
	};
	
	constructor.prototype = {
		
		unitName: 'XString',
		
		'#string': null,
		
		length: 0,
		
		toString: function() {
			return this['#string'].toString();
		},
		
		valueOf: function() {
			return this['#string'].toString();
		},
		
		forEach: function(f, scope) {
			return JString.forEach(this['#string'], f, scope);
		}
		
	};
	
	// TODO: simplify the code below by getting rid of the boilerplates
	var implementInJString = Collection.use([
		'toCharArray', 'toCollection', 'toCamelCase', 'toHyphenated', 'toTitleCase', 'take',
		'takeRight', 'drop', 'dropRight', 'contains', 'intersect'
	]);
	
	implementInJString.forEach(function(u) {
		constructor.prototype[u] = function() {
			
			var ret, args = [ ];
			
			for(var i = 0; i < arguments.length; i++) {
				if(arguments[i] instanceof XString) {
					// Convert XString arguments to native Strings before calling the JString method
					args.push(arguments[i].toString());
				} else {
					args.push(arguments[i]);
				}
			}
			
			args.unshift(this.toString());
			ret = JString[u].apply(JString, args);
			if(typeof ret == 'string') {
				ret = new XString(ret); 
			}
			
			return ret;
			
		};
	});
	
	var implementInString = Collection.use([
		'charAt', 'charCodeAt', 'concat', 'eval', 'hasOwnProperty', 'indexOf', 'isPrototypeOf',
		'lastIndexOf', 'match', 'propertyIsEnumerable', 'replace', 'search', 'slice', 'split',
		'splice', 'substr', 'substring', 'toLocaleLowerCase', 'toLowerCase', 'toUpperCase'
	]);
	
	implementInString.forEach(function(u) {
		constructor.prototype[u] = function() {
			
			var ret, args = [ ];
			
			for(var i = 0; i < arguments.length; i++) {
				if(arguments[i] instanceof XString) {
					// Convert XString arguments to native Strings before calling the String method
					args.push(arguments[i].toString());
				} else {
					args.push(arguments[i]);
				}
			}
			
			ret = String.prototype[u].apply(this.toString(), args);
			if(typeof ret == 'string') {
				ret = new XString(ret); 
			}
			
			return ret;
			
		};
		constructor.prototype[u]['#stringNative'] = true;
	});
	
	return constructor;
	
}());var Ui = (function() {var Elements = Html.Elements;

var Widget = Unit.sub(function() {
	
	var constructor = function(options) {
		/* options:
		 * 		root:		Optional. A DomUnit to use as the root node for the Widget's contents.
		 * 		inline:		Optional. If true, the widget's root will be a span element. Otherwise,
		 * 					it will be a div element. Default is false.
		 * 		attach:		Optional. A ContainerWidget or ContainerDomUnit to attach the Widget to.
		 * 		show:		Optional. Sets whether the Widget should be shown or not. default = true.
		 * 		id:			Optional. An id to give to the root element.
		 * 		classes:	DEPRECATED. Optional. Classes to add to the root element.
		 * 					Note: Why is this deprecated?
		 * 		theme:		Optional. Will apply a class to the widget's root element. If no theme is
		 * 					specified, a default will be applied from Appearance.defaultTheme.
		 * 					To prevent a theme from being applied, set theme to false.
		 * 
		 * Note: A Widget's root element will automatically be assigned its unitName as a class.
		 */
		
		var object = this;
		
		var sc;
		
		if(!options) {
			options = { };
		}
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
		if(options.root) {
			if(options.root instanceof Html.DomUnit) {
				this.root = options.root;
			}
		} else {
			if(options.inline) {
				this.root = new Html.Elements.Span();
			} else {
				this.root = new Html.Elements.Div();
			}
		}
		
		if(options.attach) {
			this.attach(options.attach);
		}
		
		if(options.show === false) {
			this.hide();
		}
		
		this.root.dom.className += ' Widget';
		
		if(options.id) {
			this.root.setId(options.id);
		}
		
		if(options.classes) {
			// TODO: Remove this. (It has been deprecated.)
			this.root.classes.add(options.classes);
		}
		
		if(options.theme !== false) {
			if(options.theme === undefined) {
				if(Appearance.defaultTheme !== false) {
					this.root.classes.add('Theme_' + Appearance.defaultTheme);
				}
			} else {
				this.root.classes.add('Theme_' + options.theme);
			}
		}
		
		if(this.unitName != 'Widget') {
			sc = this.unitConstructor;
			while(sc) {
				if(sc.prototype.unitName == 'Widget') {
					break;
				}
				if(sc.prototype.unitName) {
					this.root.dom.className += ' ' + sc.prototype.unitName;
				}
				sc = sc.base;
			}
		}
		
		this.root.on({
			dispose: function(v) {
				if(!object['#dispose:inProcess']) {
					object['#dispose:inProcess'] = true;
					v.defer(function() {
						object.dispose();
					});
				}
			}
		});
		
		this['#root'] = this.root; // TODO: phase #root out.
		
	};
		
	constructor.prototype = {
		
		unitName: 'Widget',
		
		'#root': null, // DEPRECATED: Use root instead.
		root: null,
		
		attach: function(object) {
			/* object can be a ContainerWidget, a ContainerElement, or a ContainerDomUnit
			 * or attach options
			 * TODO: fix it so attach options can reference a Widget
			 * 2012/01/27: ?? If it can work with a ContainerWidget (as bove mentions) then it probably
			 * shouldn't work for a regular Widget. Check to see if it works for ContainerWidget.
			 */
			if(object instanceof ContainerWidget) {
				this.root.attach(object['#container']);
			} else {
				this.root.attach(object);
			}
		},
		
		detach: function() {
			this.root.detach();
		},
		
		getParent: function() {
			return this.root.getParent();
		},
		
		show: function() {
			this.root.show();
		},
		
		hide: function() {
			this.root.hide();
		},
		
		isShown: function() {
			return this.root.isShown();
		},
		
		dispose: function() {
			if(!this['#dispose:inProcess']) {
				this['#dispose:inProcess'] = true;
				this.root.dispose();
			}
			
			this.base();
			
		}
		
	};
	
	return constructor;
	
}());
var ContainerWidget = Widget.sub(function() {
	
	var constructor = function(options) {
		/* options:
		 * 		container:	Optional. An element to use as the container for child elements or widgets.
		 * 		children:	Optional. An array or Collection of elements and/or widgets.
		 * 		text:		Optional. A string.
		 */
		
		if(!options) {
			options = { };
		}
		
		if(typeof options == 'string') {
			options = {
				text: options
			};
		} else if(options.length !== undefined) {
			options = {
				children: options
			};
		}
		
	this['#base:{constructor}'] = Widget; Widget.call(this, options);
		
		if(options.container) {
			this.container = options.container;
			/* NOTE: This used to be used, but it caused some problems in the FpcCms admin
			 * script, specifically when some resources were edited later. I haven't tracked
			 * down exactly what situations caused an error to occur, but it seems better to
			 * just remove this and force ContainerWidgets to attach their containers somewhere
			 * to the root manually.  That makes sense to me now, so the following lines were
			 * removed.  I'm leaving them here for now in the case that some ContainerWidget
			 * that makes use of the auto attachment seen here breaks, but in the future if
			 * everything continues to work well, these lines can be deleted, as I currently
			 * see no reason to automatically attach the container to the root. A unit that
			 * extends ContainerWidget should take care of where to attach the container.
			 * 
			 if(!this.container.getParent()) {
				this.container.attach(this.root);
			}*/
		} else {
			this.container = this.root;
		}
		
		if(options.children) {
			this.container['#attachChildren'](options.children);
		} else if(options.text) {
			this.container.setText(options.text);
		}
		
		this['#container'] = this.container; // TODO: phase #container out.
		
	};
		
	constructor.prototype = {
		
		unitName: 'ContainerWidget',
		
		'#container': null, // DEPRECATED. Use container instead.
		container: null,
		
		empty: function() {
			this.container.empty();
		},
		
		dump: function() {
			this.container.dump();
		},
		
		addText: function(s) {
			this.container.addText(s);
		},
		
		setText: function(s) {
			this.container.setText(s);
		}
		
	};
	
	return constructor;
	
}());
var Appearance = (function() {
	
	
	
	var object = {
		
		defaultTheme: 'Glass' // Set to false to prevent a default theme from being applied
		
	};
	
	return object;
	
})();
var LoadIndicator = Unit.sub(function() {
	/* TODO: Why isn't this a widget? Is there a good reason? 
	 * Is this even useful? Could this be made more useful?
	 */
	
	var constructor = function(options) {
		/* options
		 * 		element:	Optional. An element to display while loading. If no element is supplied,
		 * 					a default element will be used.
		 */
		
		var Elements = Html.Elements;
		
		if(!options) {
			options = { };
		}
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
		if(!options.element) {
			this['#indicator'] = new Elements.Div({
				styles: {
					position: 'absolute',
					background: '#fff',
					color: '#000',
					fontSize: '90%',
					textAlign: 'left',
					opacity: .6,
					overflow: 'hidden'
				},
				children: [
					'Loading...'
				]
			});
		} else {
			this['#indicator'] = options.element;
		}
		
	};
	
	constructor.prototype = {
		
		unitName: 'LoadIndicator',
		
		'#indicator': null,
		
		begin: function(element) {
			
			var me = this;
			var el = this['#indicator'];
			var p = element.getParent();
			var ai = attachIndicator.bind({
				scope: this,
				arguments: [ element ],
				relay: false
			});
			
			if(p) {
				ai();
			}
			
			this['#eventHandler:attach'] = element.on({
				attach: function(v) {
					me['#waitForAttach'] = true;
					v.defer(function() {
						ai();
						me['#waitForAttach'] = false;
					});
				}
			}, true);
						
			this['#eventHandler:detach'] = element.on({
				detach: el.detach.bind(el)
			}, true);
			
		},
		
		complete: function(element) {
			if(this['#waitForAttach']) {
				new TimedTask({
					task: this.complete,
					arguments: arguments,
					scope: this,
					interval: 100,
					autostart: true
				});
				return;
			}
			this['#indicator'].detach();
			if(this['#tm']) {
				this['#tm'].stop();
				this['#tm'] = null;
			}
			this['#eventHandler:attach'].off();
			this['#eventHandler:attach'] = null;
			this['#eventHandler:detach'].off();
			this['#eventHandler:detach'] = null;
		}
		
	};
	
	var attachIndicator = extendFunction(function(element) {
		var el = this['#indicator'];
		var xy = element.styles.getDimensions();
		el.attach({
			to: element.getParent(),
			before: element
		});
		el.styles.set({
			width: xy.width,
			height: xy.height
		});
		this['#tm'] = new TimedTask({
			task: function() {
				var xy2 = element.styles.getDimensions();
				if(
					xy2.width != xy.width
					|| xy2.height != xy.height
				) {
					xy = xy2;
					el.styles.set({
						width: xy.width,
						height: xy.height
					});
				}
			},
			interval: 100,
			iterations: -1,
			autostart: true
		});
	});
	
	return constructor;
	
}());

// This is for adding more LoadIndicators that will be accessed through LoadIndicator.type.
LoadIndicator.extend((function() {
	
	return {
		
	};
	
})()); // TODO: Switch this over to !includes and move it to inside the function above.
var object = {Appearance: Appearance,LoadIndicator: LoadIndicator,ContainerWidget: ContainerWidget,Widget: Widget};return object;})();var JString = (function() {
	/* Note: JString is an internal name only. JString should be accessed
	 * externally as joi.String.
	 */
	
	var entities = { // TODO: expand list & deal with case sensitive entities
		quot: '"', amp: '&', apos: "'", lt: '<', gt: '>', nbsp: '\u00a0', iexcl: '\u00a1',
		cent: '\u00a2', pound: '\u00a3', curren: '\u00a4', yen: '\u00a5', brvbar: '\u00a6',
		sect: '\u00a7', uml: '\u00a8', copy: '\u00a9', ordf: '\u00aa', laquo: '\u00ab',
		not: '\u00ac', shy: '\u00ad', reg: '\u00ae', macr: '\u00af', deg: '\u00b0',
		plusmn: '\u00b1', sup2: '\u00b2', sup3: '\u00b3', acute: '\u00b4', micro: '\u00b5',
		para: '\u00b6', middot: '\u00b7', cedil: '\u00b8', sup1: '\u00b9', ordm: '\u00ba',
		raquo: '\u00bb', frac14: '\u00bc', frac12: '\u00bd', frac34: '\u00be', iquest: '\u00bf',
		agrave: '\u00c0', aacute: '\u00c1', acirc: '\u00c2', atilde: '\u00c3', auml: '\u00c4',
		aring: '\u00c5', aelig: '\u00c6', ccedil: '\u00c7', egrave: '\u00c8', eacute: '\u00c9',
		ecirc: '\u00c9', euml: '\u00cb', igrave: '\u00cc'
	};
	var reEntities = /\&\#?\w+\;/g;
	
	var extendableMethods;
	var object = {
		
		extend: function(s) {
			// Can be used to extend a string with JString methods.
			for(var i in extendableMethods) {
				(function() {
					var method = i;
					s[method] = function() {
						var args = [ ];
						args.push(this);
						args.push.apply(args, arguments);
						return extendableMethods[method].apply(object, args);
					};
				})();
			}
		},
		
		extendAllStrings: function() {
			/* EXPERIMENTAL
			 * Can be used to add joi.String methods to all strings by extending String.prototype
			 * This only adds methods which don't already exist. Existing methods won't be overridden.
			 * Note: Only use this if you understand what it is doing.
			 * TODO: Determine if this should remain in joi and if so remove the EXPERIMENTAL marker
			 */
			for(var i in extendableMethods) {
				if(String.prototype[i] === undefined) (function() {
					var method = i;
					String.prototype[method] = function() {
						var args = [ ];
						args.push(this);
						args.push.apply(args, arguments);
						return extendableMethods[method].apply(object, args);
					};
				})();
			}
		}
		
	};
	
	extendableMethods = {
		
		trim: function(s) {
			if(s === null) {
				return null;
			}
			if(s.trim) {
				return s.trim();
			} else {
				return s.replace(/^\s\s*/, '').replace(/\s\s*$/, ''); // TODO: ? use compiled, cached regular expressions for these methods
			}
		},
		
		trimLeft: function(s) {
			if(s === null) {
				return null;
			}
			if(s.trimLeft) {
				return s.trimLeft();
			} else {
				return s.replace(/^\s\s*/, '');
			}
		},
		
		trimRight: function(s) {
			if(s === null) {
				return null;
			}
			if(s.trimRight) {
				return s.trimRight();
			} else {
				return s.replace(/\s\s*$/, '');
			}
		},
		
		toCamelCase: function(s) {
			return s.replace(/[\-_\s]+([a-z])/g, function(u, v) {
				return v.toUpperCase();
			});
		},
		
		toTitleCase: function(s) { // EXPERIMENTAL
			/* This method is marked experimental because it may change in the future.
			 * TODO: Decide whether this method should convert "The boy who could fly"
			 * to "TheBoyWhoCouldFly" or "The Boy Who Could Fly".
			 */
			if(s.length < 1) {
				return s;
			}
			return s.substring(0, 1).toUpperCase() + s.substring(1).replace(/([\s]+)([a-z])/g, function(u, v, w) {
				return v + w.toUpperCase();
			});
		},
		
		toHyphenated: function(s) {
			return s.replace(/[A-Z\s]+/g, function(u, v) {
				return '-' + u.replace(/\s/g, '').toLowerCase();
			});
		},
		
		forEach: function(s, f, scope) {
			
			var ret;
			
			for(var i = 0; i < s.length; i++) {
				ret = f.call(scope, s.charAt(i), i);
				if(ret) {
					return ret;
				}
			}
			
		},
		
		toCharArray: function(s) {
			var r = [ ];
			for(var i = 0; i < s.length; i++) {
				r.push(s.charAt(i));
			}
			return r;
		},
		
		toCollection: function(s) {
			var r = new Collection();
			for(var i = 0; i < s.length; i++) {
				r.push(s.charAt(i));
			}
			return r;
		},
		
		startsWith: function(s, r) {
			/* Checks to see if a string starts with another string.
			 * You can pass either a string as r or an array of strings to check.
			 */
			
			if(typeof r == 'string') {
				r = [ r ];
			}
			
			r = Collection.castAsIterable(r);
			for(var i = 0; i < r.length; i++) {
				if(s.indexOf(r[i]) == 0) {
					return true;
				}
			}
			
		},
		
		encodeEntities: function(s, allEntities) {
			/* TODO: allEntities needs to be implemented. If set to true, this should
			 * convert every character that can be represented by an html entity
			 * (similar to php's htmlentities function).
			 */
			s = s.replace(/\&/g, '&amp;');
			s = s.replace(/\</g, '&lt;');
			s = s.replace(/\>/g, '&gt;');
			return s;
		},
		
		decodeEntities: function(s) {
			var matches = s.match(reEntities), M, m;
			if(!matches) return s;
			for(var i = 0; i < matches.length; i++) {
				M = matches[i];
				m = M.substring(1, M.length - 1);
				if(entities[m]) {
					s = s.replace(M, entities[m], 'g');
				} else if(m.charAt(0) == '#') {
					if(m.charAt(1) == 'x') {
						s = s.replace(M, String.fromCharCode(parseInt(m.substring(2), 16)), 'g');
					} else {
						s = s.replace(M, String.fromCharCode(m.substring(1) * 1), 'g');
					}
				}
			}
			return s;
		},
		
		
		// From Sala StringOps
		
		take: function(s, n) {
			return s.substring(0, n);
		},
		
		takeRight: function(s, n) {
			return s.substring(s.length - n);
		},
		
		drop: function(s, n) {
			return s.substring(n);
		},
		
		dropRight: function(s, n) {
			return s.substring(0, s.length - n);
		},
		
		dropWord: function(s) {
			var s = object.trimLeft(s);
			s = s.replace(/^\S+\s*/, '');
			return s;
		},
		
		dropRightWord: function(s) {
			var s = object.trimRight(s);
			s = s.replace(/\s*\S+$/, '');
			return s;
		},
		
		contains: function(s, what) {
			return s.indexOf(what) != -1;
		},
		
		intersect: function(s, what) {
			var set, intersection = '';
			set = JString.toCharArray(s);
			for(var i = 0; i < set.length; i++) {
				if(what.indexOf(set[i]) != -1) {
					intersection += set[i];
				}
			}
			return intersection;
		}
		
	};
	
	extend(object, extendableMethods);
	
	return object;
	
}());// TODO: Should this be moved to Chrono? Lookup what it's used for, and maybe move it.

var Range = Unit.sub(function() {
	
	var constructor = function(options) {
		/* options:
		 * 		from:	Optional.
		 * 		to:		Optional.
		 */
		
		if(!options) {
			options = { };
		}
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
		if(options.from !== undefined && options.from !== null) {
			this.from = options.from;
		}
		
		if(options.to !== undefined && options.to !== null) {
			this.to = options.to;
		}
		
		if(this.from !== null && this.to !== null) {
			if(this.from.compare) {
				if(this.from.compare(this.to) > 0) {
					this.from = this.to.clone();
				}
			} else {
				if(this.from > this.to) {
					this.from = this.to;
				}
			}
		}
		
	};
		
	constructor.prototype = {
		
		unitName: 'Range',
		
		from: null,
		to: null
		
	};
	
	return constructor;
	
}());
var Task = Unit.sub(function() {
	
	var constructor = function(options) {
		/* options can be either an options literal or simply the function option.
		 * 
		 * options
		 * 		function:	Required. The function to execute.
		 * 		scope:		Optional. The scope that should be applied to the task function.
		 * 		arguments:	Optional. An array of arguments to pass to the task function.
		 * 		relay:		Optional. Whether or not arguments that are passed to the new function
		 * 					should be relayed to the orignal function after any arguments specified
		 * 					with the arguments option. Default is true.
		 *		defer:		Optional. If set to true, the task will be deferred automatically.
		 */
		
		if(!options['function']) {
			options = {
				'function': options
			};
		}
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
		this['#function'] = options['function'];
		
		if(options.scope) {
			this['#scope'] = options.scope;
		}
		
		if(options.arguments) {
			this['#arguments'] = Collection.cloneToArray(options.arguments);
		}
		
		if(options.relay !== undefined) {
			this['#relay'] = options.relay;
		}
		
		if(options.defer) {
			this.defer();
		}
		
	};
		
	constructor.prototype = {
		
		unitName: 'Task',
		
		'#function': null,
		'#scope': null,
		'#arguments': null,
		'#relay': true,
		
		run: function() {
			
			var args = this['#arguments'] ? Collection.cloneToArray(this['#arguments']) : [ ];
			
			if(this['#relay'] && arguments.length > 0) {
				args.push.apply(args, arguments);
			}
			
			return this['#function'].apply(this['#scope'], args);
			
		},
		
		defer: function(afterRun) {
			
			var object = this;
			var args = arguments;
			
			setTimeout(function() {
				object.run.apply(object, args);
				if(afterRun) {
					afterRun();
				}
			}, 0);
			
		}
		
	};
	
	return constructor;
	
}());
// TODO: mabye? TimedTask needs to extend Task
// TODO: [2012/04/12] TimedTask has recently been set so that autostart is true by default. Check to see if this affects any existing code.

var TimedTask = Unit.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 		task:		The function to execute.
		 * 		interval:	The interval at which to execute the task function.
		 * 		iterations:	Optional. How many times to iterate the TimedTask. -1 for inifinite. Default: 1.
		 * 		bind:		Optional. The object that should be applied to the task function.
		 * 		scope:		DEPRECATED. Use bind instead.
		 * 		arguments:	Optional. An array of arguments to pass to the task function.
		 * 		autostart:	Optional. Whether to start the TimedTask immediately. Default: true.
		 */
		
		if(!options) {
			options = { };
		}
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
				
		this.task = options.task;
		this.interval = options.interval;
		if(options.bind) {
			this.bind = options.bind;
		} else {
			this.bind = options.scope;
		}
		this.scope = this.bind;
		
		if(!options.arguments) {
			options.arguments = [ ];
		}
		
		this.arguments = options.arguments;
		
		if(!options.iterations) {
			options.iterations = 1;
		}
		
		this.iterations = options.iterations;
		
		if(options.autostart !== false) {
			this.start();
		}
		
	};
	
	function run() {
		
		this.task.apply(this.bind, this.arguments);
		
		if(this.iterations == -1) {
			return;
		}
		
		this.__iterations--;
		
		if(this.__iterations < 1) {
			this.stop();
		}
		
	}
	
	constructor.prototype = {
		
		unitName: 'TimedTask',
		
		task: null,
		interval: null,
		bind: null,
		scope: null, // DEPRECATED
		
		running: false,
		
		start: function() {
			
			var obj = this;
			
			this.running = true;
			
			if(this.iterations == 0) {
				return;
			}
			
			this.__iterations = this.iterations;
			
			this.tm = setInterval(
				function() {
					run.apply(obj);
				},
				this.interval
			);
			
		},
		
		stop: function() {
			
			this.running = false;
			
			clearInterval(this.tm);
			
		},
		
		restart: function() {
			this.stop();
			this.start();
		}
		
	};
	
	return constructor;
	
}());
var Uri = XString.sub(function() {
	
	var REGEX_HOST = /^\w+:\/+([\w.]+)/;
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = XString; XString.call(this, options);
		
		if(constructor.applicationPath && this.substring(0, 1) == '~') {
			this['#string'] = constructor.process(this['#string']);
		}
		
	};
	
	extend(constructor, {
		
		applicationPath: null,
		
		process: function(uri) {
			if(Uri.applicationPath && uri.substring(0, 1) == '~') {
				return Uri.applicationPath + uri.substring(1);
			}
			return uri;
		}
		
	});
	
	constructor.prototype = {
		
		unitName: 'Uri',
		
		getBeforeQuery: function(signal) {
			// TODO: is there a better name for this?
			if(typeof signal == 'undefined') {
				signal = '?';
			}
			var i = this.indexOf(signal);
			if(i == -1) {
				return this.toString();
			}
			return this.substring(0, i);
		},
		
		getPath: function(signal) {
			// TODO: work on better parsing here.
			var s = this.getBeforeQuery(signal);
			var i = s.indexOf('/');
			while(s.charAt(i) == '/') { i++; }
			s = s.substring(i);
			i = s.indexOf('/');
			return s.substring(i);
		},
		
		getQuery: function(signal, delim) {
			// TODO: don't include the part after anchor information (#...) for non-anchor query strings (?...), such as in the url: http://www.example.com/?q1=a#anchor, the #anchor part should be left off
			// TODO: instead of returning a string, return a QueryString object.. the QueryString object should act like a Hashtable but maybe inherit from String instead. this is to be decided upon further reflection.
			/* signal can be used to change the string considered to be the beginning of the
			 * query. For example in an Ajax application using queries that begin with '#', the
			 * signal could be set to '#'.  By default signal is '?'.
			 * 
			 * delim can be used to change the query delimiter. By default this is '&'.
			 */
			
			if(typeof signal == 'undefined') {
				signal = '?';
			}
			
			if(typeof delim == 'undefined') {
				delim = '&';
			}
			
			var i = this.indexOf(signal);
			
			if(i == -1) {
				return '';
			}
			
			return this.substring(i + 1);
			
		},
		
		getParam: function(param, signal, delim) {
			// TODO: when a QueryString object exists (see TODO in getQuery method), then simply let this method call the getParam method on the QueryString returned by getQuery
			
			if(typeof delim == 'undefined') {
				// TODO: this can be removed when QueryString is used because getQuery (or the constructor for QueryString itself) will assign the default value for delim
				delim = '&';
			}
			
			var q = this.getQuery(signal, delim);
			
			var r = (q + delim).split(delim);
			r.pop();
			
			for(var i = 0; i < r.length; i++) {
				if(r[i].substring(0, param.length + 1) == param + '=') {
					return r[i].substring(param.length + 1);
				}
			}
			
			return null;
						
		},
		
		getHost: function() {
			var m = this['#string'].match(REGEX_HOST);
			if(m.length > 1) {
				return m[1];
			} else {
				return null;
			}
		}
		
	};
	
	return constructor;
	
}());var Version = Unit.sub(function() {
	// TODO: methods for version comparison
	
	var constructor = function(options) {
		/* options
		 * 		major:			Required. Major version number.
		 * 		minor:			Optional. Minor version number.
		 * 		revision:		Optional. Revision version number. (Requires minor to be specified.)
		 * 		build:			Optional. The build number.
		 * 		alpha:			Optional. Is this an alpha version?
		 * 		beta:			Optional. Is this a beta version? (Overrides alpha.)
		 * 		buildBase:		Optional. Integer that sets the base to display the build base in.
		 * 						By default the build number is displayed in hexidecimal format.
		 */
		
		if(!options) {
			options = { };
		}
		
		this.major = options.major * 1;
		if(options.minor)		{ this.minor = options.minor * 1; }
		if(options.revision)	{ this.revision = options.revision * 1; }
		if(options.build)		{ this.build = options.build * 1; }
		
		if(options.beta) {
			this.buildStage = 'beta';
		} else if(options.alpha) {
			this.buildStage = 'alpha';
		} else {
			this.buildStage = 'release';
		}
		
		if(options.buildDecimal) {
			this['#buildBase'] = 10;
		}
		
	};
	
	constructor.prototype = {
		
		major: null,
		minor: null,
		revision: null,
		build: null,
		buildStage: null, // beta, alpha, or release
		
		'#buildBase': 16,
		
		toString: function(options) {
			/* options:
			 * 		showBuild:	Determines whether to show the build number in the version. Default: true
			 */
			
			var s = this.major;
			
			if(this.minor) {
				s += '.' + this.minor;
				if(this.revision) {
					s += '.' + this.revision;
				}
			}
			
			if(this.buildStage != 'release') {
				s += ' ' + this.buildStage;
			}
			
			if(this.build && (
				!options
				|| options.showBuild !== false
			)) {
				s += ', build ' + this.build.toString(this['#buildBase']);
			}
			
			return s;
			
		},
		
		compareTo: function(version) {
			/* version can be a string, a number, an options object to create
			 * a new Version object, or a Version object.
			 * 
			 * Returns 0 if the versions are equal, a value greater than 0 if
			 * the version argument is less than this version object, or a
			 * value less than 0 if the version argument is greater than this
			 * version object.
			 */
			
			var thisIsAbove = 1, thisIsBelow = -1;
			var r1, r2, obj, v;
			
			if(typeof version == 'number') {
				version = version + '';
			}
			
			if(typeof version == 'string') {
				r1 = (version + ' ').split(' ');
				r2 = (r1[0] + '.').split('.');
				r2.pop();
				obj = {
					major: r2[0]
				};
				if(r2[1]) {
					obj.minor = r2[1];
				}
				if(r2[2]) {
					obj.revision = r2[2];
				}
				version = new Version(obj);
			} else if(typeof version == 'object' && !(version instanceof Version)) {
				version = new Version(version);
			}
			
			if(this.alpha != version.alpha) {
				if(this.alpha) {
					return thisIsBelow;
				} else {
					return thisIsAbove;
				}
			}
			
			if(this.buildStage != version.buildStage) {
				if(buildStageToValue(this.buildStage) < buildStageToValue(version.buildStage)) {
					return thisIsBelow;
				} else {
					return thisIsAbove;
				}
			}
			
			if(this.major < version.major) {
				return thisIsBelow;
			} else if(this.major > version.major) {
				return thisIsAbove;
			}
			
			if(this.minor < version.minor) {
				return thisIsBelow;
			} else if(this.minor > version.minor) {
				return thisIsAbove;
			}
			
			if(this.revision < version.revision) {
				return thisIsBelow;
			} else if(this.revision > version.revision) {
				return thisIsAbove;
			}
			
			if(this.build < version.build) {
				return thisIsBelow;
			} else if(this.build > version.build) {
				return thisIsAbove;
			}
			
			return 0;
			
		}
		
	};
	
	function buildStageToValue(buildStage) {
		switch(buildStage) {
			case 'alpha':
				return 0;
			case 'beta':
				return 1;
			case 'release':
				return 2;
		}
	}
	
	return constructor;
	
}());

Browser.version = new Version(Browser.version);
var Chrono = (function() {var $_Date = window.Date; // to provide access to javascript's native Date.

var Date = Unit.sub(function() {
	
	var days = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ];
	var months = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];
	
	function constructor(options) {
		/* options can be an options object or simply the date parameter.
		 * 
		 * For more options, see the set method.
		 */
		
		if(!options) {
			options = { };
		}
		
		if(options instanceof $_Date || typeof options == 'string' || typeof options == 'number') {
			options = {
				date: options
			};
		}
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
		this.set(options);
		
	};
	
	extend(constructor, {
		
		format: function(s, date) {
			/* Format options can be passed as s.
			 * Format options are similar to those for PHP.
			 * See http://us2.php.net/manual/en/function.date.php
			 * 
			 * date can be a native Date object, a joi Date object, or undefined.
			 * If a date is not passed, the current date & time will be used.
			 */
			
			var d = date;
			var x, xs;
			var notFormatted = false;
			
			if(!d) {
				d = new $_Date();
			} else if(d instanceof Date) {
				d = d['#date'];
			}
			
			if(!s) {
				s = 'M j, Y';
				if(this['#timeSet']) {
					s += '; G:i:s ';
				}
				notFormatted = true;
			}
			
			x = JString.toCharArray(s);
			
			rep(x, 'd', pad(d.getDate(), '0', 2));
			rep(x, 'D', days[d.getDay()].substring(0, 3));
			rep(x, 'j', d.getDate() + '');
			rep(x, 'l', days[d.getDay()]);
			rep(x, 'w', d.getDay() + '');
			rep(x, 'F', months[d.getMonth()]);
			rep(x, 'm', pad(d.getMonth() + 1, '0', 2));
			rep(x, 'M', months[d.getMonth()].substring(0, 3));
			rep(x, 'n', (d.getMonth() + 1) + '');
			rep(x, 'Y', d.getFullYear() + '');
			rep(x, 'y', (d.getFullYear() + '').substring(2));
			rep(x, 'G', d.getHours());
			rep(x, 'g', format12hour(d.getHours()));
			rep(x, 'H', pad(d.getHours(), '0', 2));
			rep(x, 'h', pad(format12hour(d.getHours()), '0', 2));
			rep(x, 'i', pad(d.getMinutes(), '0', 2));
			rep(x, 's', pad(d.getSeconds(), '0', 2));
			rep(x, 'a', isAm(d.getHours()) ? 'am' : 'pm');
			rep(x, 'A', isAm(d.getHours()) ? 'AM' : 'PM');
			
			xs = '';
			for(var i = 0; i < x.length; i++) {
				if(typeof x[i] == 'string') {
					xs += x[i];
				} else {
					xs += x[i]['string'];
				}
			}
			
			if(notFormatted) {
				xs = '[Date] ' + xs;
			}
			
			return xs;
			
		}
		
	});
	
	constructor.prototype = {
		
		unitName: 'Date',
		
		'#date': null,
		'#timeSet': false,
		
		clone: function() {
			var obj = this.base();
			obj['#date'] = new $_Date(this['#date']);
			return obj;
		},
		
		set: function(options) {
			/* options:
			 * 		date:		Optional. A date object, string, or number representing the date.
			 * 		time:		Optional. A string representing a time.
			 * 		year:		Optional.
			 * 		month:		Optional.
			 * 		day:		Optional.
			 * 		hours:		Optional. 0-23
			 * 		minutes:	Optional.
			 */
			if(options.date) {
				if(options.date instanceof $_Date) {
					this['#date'] = options.date;
					this['#timeSet'] = true;
				} else if(typeof options.date == 'string') {
					this['#date'] = createDateFromString(options.date);
					this['#timeSet'] = this['#date']['#timeSet'];
				} else {
					this['#date'] = new $_Date(options.date);
					this['#timeSet'] = true;
				}
			} else {
				if(!this['#date']) {
					this['#date'] = new $_Date();
				}
				if(options.year) {
					this['#date'].setFullYear(options.year);
				}
				if(options.month !== undefined) {
					this['#date'].setMonth(options.month - 1);
				}
				if(options.day) {
					this['#date'].setDate(options.day);
				}
				if(options.hours) {
					this['#date'].setHours(options.hours);
					this['#timeSet'] = true;
				}
				if(options.minutes) {
					this['#date'].setMinutes(options.minutes);
					this['#timeSet'] = true;
				}
				if(options.seconds) {
					this['#date'].setSeconds(options.seconds);
					this['#timeSet'] = true;
				}
			}
		},
		
		compare: function(obj) {
			// obj can be a jsl Date, a javascript Date, a string, or a number.
			if(obj instanceof Date) {
				return this['#date'] - obj['#date'];
			} else if(obj instanceof $_Date) {
				return this['#date'] - obj;
			} else {
				return this['#date'] - new $_Date(obj);
			}
		},
		
		before: function(obj) {
			return this.compare(obj) < 1;
		},
		
		after: function(obj) {
			return this.compare(obj) > 1;
		},
		
		equals: function(obj) {
			return this.compare(obj) == 0;
		},
		
		getYear: function() {
			return this['#date'].getFullYear();
		},
		
		getMonth: function() {
			return this['#date'].getMonth() + 1;
		},
		
		getDay: function() {
			/* It has been decided to use the word "day" to represent the day number in
			 * the month instead of JavaScripts usage of "day" to represent the day
			 * number in the week, because the wording "year, month, day" sounds more
			 * fluid and because using the word "date" to represent the day number in
			 * the month (as JavaScript does) can be ambiguous, since the word "date"
			 * can also mean the full date (year, month, day). It has been decided that
			 * in the jsl, "date" will refer to a full date representation, while "day"
			 * will refer to the particular day of the month. To get the day of the week,
			 * see the getDayOfWeek and getDayName methods.
			 */
			return this['#date'].getDate();
		},
		getDate: function() { // DEPRECATED. TODO: Remove this. See note above.
			return this.getDay();
		},
		
		getDayOfWeek: function() {
			return this['#date'].getDay();
		},
		
		getDayName: function() {
			return days[this['#date'].getDay()];
		},
		
		toString: function(s) {
			return constructor.format(s, this['#date']);
		}
		
	};
	
	function pad(s, padWith, length) {
		
		if(typeof s != 'string') {
			s = s + '';
		}
		
		while(s.length < length) {
			s = padWith + s;
		}
		
		return s;
		
	}
	
	function format12hour(H) {
		if(H > 12) {
			return H - 12;
		} else if (H == 0) {
			return 12;
		} else {
			return H;
		}
	}
	
	function isAm(H) {
		if(H > 12) {
			return false;
		} else {
			return true;
		}
	}
	
	function rep(x, repWhat, repWith) {
		
		for(var i = 0; i < x.length; i++) {
			if(x[i] == repWhat) {
				x[i] = {
					'string': repWith
				};
			}
		}
		
	}
	
	function createDateFromString(s) {
		/* Supports formats:
		 *      [Date]				[Time]
		 * 		yyyy/mm/dd			hh:mm:ss [AM|am/PM|pm]
		 * 		yyyy/m/d			h:m:s [AM|am/PM|pm]
		 * 		mm/dd/yyyy			hh:mm [AM|am/PM|pm]
		 * 		m/d/yyyy			h:m [AM|am/PM|pm]
		 * 
		 * Dashes (-) may be substituted for slashes (/).
		 * A space should be between the date the time. Both date and time aren't
		 * required, either one or both could be specified.
		 * Years must be specified in four digit format. 
		 */
		
		var r = (s + ' ').split(' ');
		var d = {
			year: 0,
			month: 0,
			day: 0
		};
		var t = null, timeSet = true;
		var dateIndex;
		var date;
		
		if(r[0].indexOf(':') == -1) {
			d = parseDate(r[0]);
			if(r[1].indexOf(':') != -1) {
				t = parseTime(r[1], r[2]);
			}
		} else {
			switch(r[1].toUpperCase()) {
				case 'AM': case 'PM':
					t = parseTime(r[0], r[1]);
					dateIndex = 2;
					break;
				default:
					t = parseTime(r[0]);
					dateIndex = 1;
					break;
			}
			if(r[dateIndex].indexOf('/') != -1 || r[dateIndex].indexOf('-') != -1) {
				d = parseDate(r[1]);
			}
		}
		
		if(t === null) {
			t = {
				hours: 0,
				minutes: 0,
				seconds: 0
			};
			timeSet = false;
		}
		
		date = new $_Date(d.year, d.month - 1, d.day, t.hours, t.minutes, t.seconds);
		if(timeSet) {
			date['#timeSet'] = true;
		}
		
		return date;
		
	}
	
	function parseDate(s) {
		
		var d = s.replace('-', '/');
		var dr = d.split('/');
		var year, month, day;
		
		if(dr[0].length == 4) {
			year = dr[0] * 1;
			month = dr[1] * 1;
			day = dr[2] * 1;
		} else {
			year = dr[2] * 1;
			month = dr[0] * 1;
			day = dr[1] * 1;
		}
		
		return {
			year: year,
			month: month,
			day: day
		};
		
	}
	
	function parseTime(s, amPm) {
		
		var tr = s.split(':');
		var hours = 0, minutes = 0, seconds = 0;
		
		if(tr != '') {
			hours = tr[0] * 1;
			minutes = tr[1] * 1;
			if(tr.length > 2) {
				seconds = tr[2] * 1;
			}
			if(amPm.toUpperCase() == 'PM') {
				if(hours < 12) {
					hours += 12;
				}
				if(hours == 24) {
					hours = 0;
				}
			}
		}
		
		return {
			hours: hours,
			minutes: minutes,
			seconds: seconds
		};
		
	}
	
	return constructor;
	
}());var DateRange = Range.sub(function() {
	
	function constructor(options) {
		/* options:
		 * 		from:	Optional. A date object, string, or number representing the date. Default is today.
		 * 		to:		Optional. A date object, string, or number representing the date. Default is today.
		 * Note: to must be after from, otherwise to will be set to the same value as from.
		 */
		
		if(!options) {
			options = { };
		}
		
		if(options.from) {
			if(options.from instanceof Date) {
				this.from = options.from;
			} else {
				this.from = new Date(options.from);
			}
		} else {
			this.from = new $_Date();
		}
		
		if(options.to) {
			if(options.to instanceof Date) {
				this.to = options.to;
			} else {
				this.to = new Date(options.to);
			}
		} else {
			this.to = new $_Date();
		}
		
		options.from = null;
		options.to = null;
		
	this['#base:{constructor}'] = Range; Range.call(this, options);
		
	};
		
	constructor.prototype = {
		
		unitName: 'DateRange',
		
		from: null,
		to: null,
		
		toString: function(s) {
			return this.from.toString(s) + ' to ' + this.to.toString(s);
		}
		
	};
	
	return constructor;
	
}());
var object = {Date: Date,DateRange: DateRange};return object;})();var Debug = (function() {
	
	var UnitMonitor = (function() {
	
	var object = {
		
		units: [ ],
		
		monitor: function(unit) {
			
			var units = this.units;
			var oDispose;
			
			units.push(unit);
			
			oDispose = unit.dispose;
			unit.dispose = function() {
				for(var i = 0; i < units.length; i++) {
					if(units[i] == this) {
						units.splice(i, 1);
						break;
					}
				}
				oDispose.apply(unit, arguments);
			};
			
		},
		
		countConstructors: function() {
			
			var units = this.units;
			var ht = new Hashtable();
			var c, r;
			
			for(var i = 0; i < units.length; i++) {
				c = ht.get(units[i].unitName);
				if(!c) {
					c = 0;
				}
				ht.put(units[i].unitName, c + 1);
			}
			
			r = ht.quicksort(null, true).reverse();
			
			ht.dispose();
			
			return r;
			
		},
		
		getByConstructor: function(constructor) {
			
			var units = this.units;
			var r = new Collection();
			
			for(var i = 0; i < units.length; i++) {
				if(units[i].unitConstructor == constructor) {
					r.push(units[i]);
				}
			}
			
			return r;
			
		},
		
		toString: function() {
			
			var r = this.countConstructors();
			var total = this.units.length;
			var s = '';
			
			s += '--- Debug:UnitMonitor ---\n';
			s += 'Total units: ' + total + '\n';
			
			for(var i = 0; i < r.length; i++) {
				s += '\u2022 ' + r[i].value + ' \t' + r[i].key + ' (' + Math.round((r[i].value / total) * 100) + '%)\n';
			}
			
			r.dispose();
			
			return s;
			
		}
		
	};
	
	
	
	return object;
	
})();
	
	var object = {
		
		UnitMonitor: UnitMonitor,
		
		monitor: monitor
		
	};
	
	function monitor(level, globalVarNameForCallers) {
		/* The first argument can optionally be a level. The default level is 1, meaning to monitor the calling
		 * function. Any higher level will cause it to monitor higher up in the calling functions stack. 
		 * globalVarNameForCallers can be used to create a global variable which holds the callers rather than
		 * using a member of the function to store the callers. One way this can be used is to combine information
		 * from more than one monitored function into a single variable.
		 * If globalVarNameForCallers is false, the caller will not be stored but will be returned instead.
		 */
		
		var f = monitor.caller;
		var z = f.caller;
		var ch, iCount = 0;
		var callerArray;
		
		if(!level) {
			level = 1;
		}
		
		ch = f;
		do { // TODO: This may no longer be needed. Does monitor make any external calls any more?
			if(ch == monitor) {
				return;
			}
			iCount++;
			if(iCount > 100) {
				break;
			} 
		} while(ch = ch.caller);
		
		if(globalVarNameForCallers) {
			if(!window[globalVarNameForCallers]) {
				window[globalVarNameForCallers] = monitor.createCallerArray();
			}
			callerArray = window[globalVarNameForCallers];
		} else if(globalVarNameForCallers === false) {
			callerArray = false;
		} else {
			if(!f.___callers) {
				f.___callers = monitor.createCallerArray();
			}
			callerArray = f.___callers;
		}
		
		for(var i = 1; i < level; i++) {
			if(z.caller) {
				z = z.caller;
			}
		}
		
		if(!callerArray) {
			return z;
		}
		
		var count = callerArray.get(z);
		
		if(!count) {
			count = 0;
		}
		
		callerArray.put(z, count + 1);
		
	}
	
	monitor.createCallerArray = function() {
		var r = [ ];
		r.put = function(f, count) {
			for(var i = 0; i < this.length; i++) {
				if(this[i].f == f) {
					this[i].count = count;
					return;
				}
			}
			this.push({
				f: f,
				count: count
			});
		};
		r.get = function(f) {
			for(var i = 0; i < this.length; i++) {
				if(this[i].f == f) {
					return this[i].count;
				}
			}
		};
		return r;
	};
	
	return object;
	
})();var ErrorHandling = (function() {var Exceptions = (function() {var Exception = Unit.sub(function() {
	
	function constructor(options) {
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Exception'
		
	};
	
	return constructor;
	
}());var Uninitialized = Exception.sub(function() {
	
	function constructor(options) {
		
	this['#base:{constructor}'] = Exception; Exception.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Uninitialized'
		
	};
	
	return constructor;
	
}());var object = {Exception: Exception,Uninitialized: Uninitialized};return object;})();var object = {Exceptions: Exceptions};return object;})();var EventHandling = (function() {
	
	var Event = Unit.sub(function() {
	
	function constructor(options) {
		/* options
		 * 		event:		Optional. The browser's event object corresponding
		 * 					to the event (if there is one).
		 * 		arguments:	Optional. The arguments that were used in
		 * 					calling the listener method (if there are any).
		 * 					No arguments are available for W3C events.
		 */
		
		if(!options) {
			options = { };
		}
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
		this.event = options.event;
		this.arguments = Collection.castAsArray(options.arguments);
		
	};
		
	constructor.prototype = {
		
		unitName: 'Event',
		
		'#deferFunctions': null,
		
		event: null,
		arguments: null,
		
		target: null,
		
		disposable: [
			'#key', '#mouse' 	// #target is not disposed because it is a previously existing Element on the page, and should remain on the page after the event.
		],
		
		delayGetterCreation: true,
		'#target': null,
		'#key': null,
		'#mouse': null,
		getters: {
			
			target: function() {
				if(!this['#target']) {
					if(this.event) {
						if(this.event.target) {
							this['#target'] = Html(this.event.target);
						} else if(this.event.srcElement) {
							this['#target'] = Html(this.event.srcElement);
						}
					}
				}
				return this['#target'];
			},
			
			key: function() {
				if(!this['#key']) {
					if(this.event) {
						this['#key'] = new KeyInformation({ event: this.event });
					}
				}
				return this['#key'];
			},
			
			mouse: function() {
				if(!this['#mouse']) {
					if(this.event) {
						this['#mouse'] = new MouseInformation({ event: this.event });
					}
				}
				return this['#mouse'];
			}
			
		},
		
		'#stopped': false,
		stop: function(returnValue) {
			/* Can be used to stop an event from bubbling.
			 */
			var e = this.event;
			if(e) {
				e.cancelBubble = true;
				if(e.stopPropagation) {
					e.stopPropagation();
				}
			}
			this['#stopped'] = true;
			this['#stopped:return'] = returnValue;
		},
		
		defer: function(f) {
			/* Event.defer can be used to defer the execution of a function until after the execution of
			 * all event handlers and the original listener function.
			 */
			
			if(!this['#deferFunctions']) {
				this['#deferFunctions'] = [];
			}
			
			this['#deferFunctions'].push(f);
			
		}
		
	};
	
	return constructor;
	
}());var EventHandler = Task.sub(function() {
	
	function constructor(options) {
		/* options
		 * 		listener:	The listener method that the event handler is attached to.
		 */
		
	this['#base:{constructor}'] = Task; Task.call(this, options);
		
		this['#listener'] = options.listener;
		
	};
	
	constructor.prototype = {
		
		unitName: 'EventHandler',
		
		off: function() {
			// DEPRECATED. off has been deprecated in favor of dispose.
			this.dispose();
		},
		
		dispose: function(options) {
			/* options:
			 * 		#preRemovedFromList:	This is used by the GarbageCollector to inform this method
			 * 								that the EventHandler has already been removed from the
			 * 								eventHandlers list and does not need to be spliced out,
			 * 								in order to improve performance.
			 */
			
			if(!options || !options['#preSplicedFromList']) {
				
				var r = this['#listener'].eventHandlers;
				
				for(var i = 0; i < r.length; i++) {
					if(r[i] == this) {
						r.splice(i, 1);
						i--;
					}
				}
				
			}
			
			this.run = nullf;
			
			this.base();
			
		}
		
	};
	
	return constructor;
	
}());
var EventHandlerCollection = Collection.sub(function() {
	
	function constructor(options) {
		
	this['#base:{constructor}'] = Collection; Collection.call(this, options);
		
	};
		
	constructor.prototype = {
		
		unitName: 'EventHandlerCollection',
		
		off: function() {
			// DEPRECATED. off has been deprecated in favor of dispose.
			this.dispose();
		},
		
		dispose: function() {
			
			var length = this.length;
			
			for(var i = 0; i < length; i++) {
				if(!this[i].disposed) {
					this[i].dispose();
				}
			}
			
			this.base();
			
		}
		
	};
	
	Collection.prototype.expose.call(constructor.prototype, EventHandler);
	
	return constructor;
	
}());var EventHandlerHashtable = Hashtable.sub(function() {
	
	function constructor(options) {
		
	this['#base:{constructor}'] = Hashtable; Hashtable.call(this, options);
		
	};
		
	constructor.prototype = {
		
		unitName: 'EventHandlerHashtable',
		
		off: function() {
			// DEPRECATED. off has been deprecated in favor of dispose.
			this.dispose();
		},
		
		dispose: function() {
			
			this.forEach('dispose');
			
			this.base();
			
		}
		
	};
	
	Hashtable.prototype.expose.call(constructor.prototype, EventHandler);
	
	return constructor;
	
}());var EventMonitor = Task.sub(function() {
	
	function constructor(options) {
		/* EventMonitor allows the monitoring of several events at once and the execution
		 * of a function once those events have all fired.
		 * 
		 * An example situation where this might be used is in the situation where several
		 * items need to be loaded before a function is called.
		 * 
		 * options
		 * 		listen:	Required. An array of object literals defining the object and
		 * 				method name to listen to.
		 */
		
		var object = this;
		var uncalledHandlers = new Collection();
		
		Collection.cast(options.listen).forEach(function(u) {
			var op = { };
			var h;
			op[u.method] = function() {
				h.dispose();
				uncalledHandlers.purge(h);
				if(uncalledHandlers.length == 0) {
					object.run();
				}
			};
			h = u.object.on(op, true);
			uncalledHandlers.push(h);
		});
		
	this['#base:{constructor}'] = Task; Task.call(this, options);
		
	};
	
	constructor.prototype = {
		
	};
	
	return constructor;
	
}());
var KeyInformation = Unit.sub(function() {
	
	function constructor(options) {
		/* options
		 * 		event:		Required. The dom event object.
		 */
		
		var code, character;
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
		code = options.event.keyCode;
		
		if(!code) {
			code = options.event.which;
		}
		
		character = String.fromCharCode(options.event.charCode);
		
		if(!character) {
			/* TODO: when the A button is pressed, if a capital A is used, the same keycode
			 * will be returned for a lowercase A. In FF the above line using charCode should
			 * work, but in IE it may not, so the below line is used, however, it can't
			 * distinguish between "A" and "a", although there are ways to check if shift has
			 * been pressed, so maybe a better way to distinguish can be used for IE?
			 */
			character = String.fromCharCode(code);
		}
		
		this.code = code;
		this.character = character;
		
	};
	
	constructor.prototype = {
		
		unitName: 'KeyInformation',
		
		code: null, // DEPRECATED
		/* code is currently DEPRECATED due to browser inconsistencies.
		 * See http://unixpapa.com/js/key.html
		 * Currently, it is recommended to use the native DOM supplied
		 * keyCode/which properties to obtain a key code if one is needed.
		 * TODO: Try to reach a cross-browser implementation of this.
		 * Look into which browsers support the DOM3 key properties.
		 * If no suitable cross-browser solution can be reached, key code
		 * retrieval should probably be removed from joi.
		 */
		
		character: null
		
	};
	
	return constructor;
	
}());var Listener = (function(){
	/* Can be used to create a listener from a function.
	 * All Units' methods are automatically created as listeners.
	 */
	
	function constructor(options){
		
		/* options can be either a function or an object literal with the function property set.
		 * 
		 * options
		 * 		function:	The function to create a listener function for.
		 * 
		 * To access this externally, use the joi.createListener alias.
		 * 
		 * Warning: Functions created using the Listener constructor will not be instances of
		 * Listener. It is recommended that the new keyword not be used in the creation of
		 * Listener functions. Although it will work, it is not needed and can only cause
		 * confusion about what's happening. Listener should be treated as a function that
		 * wraps an argument function in a new function with methods for event handling.
		 */
		
		if(!options['function']) {
			options['function'] = options;
		}
		
		var f = function() {
			return callF.call(f, this, options['function'], Collection.castAsArray(arguments));
		};
		
		extend(f, constructor.prototype);
		
		f.eventHandlers = [ ];
		
		return f;
		
	};
	
	constructor.prototype = {
		
		isListener: true,
		
		eventHandlers: null
		
	};
	
	var xf = extendFunction(function() { }); // TODO: Does this do anything? Should it be removed?
	extend(constructor.prototype, xf);
	
	var callF = extendFunction(function(scope, f, args) {
		
		var ev;
		/* IE8 Beta throws an error if "args[0] instanceof Object" isn't included.
		 * The error it throws is due to some bug where a primitive can't be checked to be an instanceof
		 * window.Event.  "var a = 1; a instanceof Event;" will duplicate the error.
		 */
		if(window.Event && args[0] instanceof Object && args[0] instanceof window.Event) {
			ev = args[0];
		}
		
		var returnValue, overrideReturnValue, deferR;
		var eh = this.eventHandlers.slice(0); // The slice is done to clone the array. This is important because some event handlers may turn themselves off while being executed, thus changing the size of the eventHandlers array.
		var v; 
		
		for(var i = 0; i < eh.length; i++) {
			
			v = new Event({
				event: ev ? ev : window.event,
				arguments: args
			});
			
			returnValue = eh[i].run(v);
			
			if(v['#stopped']) {
				/* This means v.stop() was called, which terminates the event. The difference
				 * between v.stop() here and returnValue below is v.stop() will keep the event
				 * from bubbling up to other elements in the hierarchy, while returning a value
				 * will only end execution on *that* element (in case there are multiple listeners
				 * attached to a single element). It's the difference between multiple listeners
				 * on one element or multiple listeners spread across multiple elements.
				 */
				v.temporary();
				if(v.event) {
					if(v['#stopped:return']) {
						return v['#stopped:return'];
					} else {
						/* Return false for a DOM initiated event in order to prevent the
						 * default behavior.
						 */
						return false;
					}
				}
				return v['#stopped:return'];
			}
			
			if(typeof returnValue != 'undefined') {
				warn(
					'Event/Listener: returning a value from an event handler is no longer supported.\n'
					+ 'Use event.stop(returnValue) intsead.\n'
					+ 'value returned: ' + returnValue
				);
				returnValue = undefined;
				//v.dispose();
				//return returnValue;
			}
			
			if(v['#deferFunctions']) {
				if(!deferR) {
					deferR = [];
				}
				deferR.push.apply(deferR, v['#deferFunctions']);
			}
			
			if(typeof v.returnValue != 'undefined') {
				/* v.returnValue can be used to override the return value of the original function
				 * without skipping execution of the original function and other listeners.
				 */
				overrideReturnValue = v.returnValue;
			}
			
			v.dispose();
			
		}
		
		returnValue = f.apply(scope, args);
		
		if(deferR) {
			if(f.eventStrongDefer) { // TODO: scope instanceof Element returned false for the amount Text Input Element on the get-stamps page for PledgeMail, although it returned true for DomUnit, Node, InputElement, and Input.Text.  Why? It should work for Element as well. (this is in FF 2) I don't think its because the native Element obj was used because I tested with Html.Elements.Element specified
				/* eventStrongDefer is used by elements for methods that are native event handlers, such
				 * as onclick and onfocus. eventStrongDefer forces the event's deferred functions to be
				 * deferred until after the process is complete, rather than the default weak defer which
				 * just defers execution until the jsl event has been dealt with.
				 * See notes in Html.functions.jsx for more information. 
				 */
				defer(execDeferR, deferR, scope, args);
			} else {
				execDeferR(deferR, scope, args);
			}
		}
		
		return (typeof overrideReturnValue != 'undefined') ? overrideReturnValue : returnValue;
		
	});
	
	function execDeferR(deferR, scope, args) {
		for(var i = 0; i < deferR.length; i++) {
			deferR[i].apply(scope, args);
		}
	};
	
	return constructor;
	
}());var MouseInformation = Unit.sub(function() {
	
	function constructor(options) {
		/* options
		 * 		event:		Required. The dom event object.
		 */
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
		this.x = options.event.clientX;
		this.y = options.event.clientY;
		
	};
	
	constructor.prototype = {
		
		unitName: 'MouseInformation',
		
		x: null,
		y: null
		
	};
	
	return constructor;
	
}());
	
	return {
		
		KeyInformation: KeyInformation,
		MouseInformation: MouseInformation,
		Event: Event,
		EventHandler: EventHandler,
		EventHandlerCollection: EventHandlerCollection,
		EventHandlerHashtable: EventHandlerHashtable,
		EventMonitor: EventMonitor,
		
		createListener: Listener
		
	};
	
}());
var Fx = (function() {var Effect = Unit.sub(function() {
	
	function constructor(options) {
		/* options
		 * 		autostart:	Optional. Whether or not to automatically begin. Default: false.
		 * 		interval:	Optional.
		 * 		iterations:	Optional.
		 * 		controller:	Optional. A task which controls the speed and timing of the effect.
		 */
		
		if(!options) {
			options = { };
		}
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
		if(!options.interval) {
			options.interval = 40;
		}
		
		if(!options.iterations) {
			options.iterations = -1;
		}
		
		this.tm = new TimedTask({
			autostart: false,
			task: this.run,
			scope: this,
			interval: options.interval,
			iterations: options.iterations
		});
		
		if(options.autostart) {
			this.start.defer({ scope: this });
		}
		
	};
	
	constructor.prototype = {
		
		unitName: 'Effect',
		
		/* Abstract */
		run: null,
		/************/
		
		tm: null,
		running: false,
		
		start: function() {
			
			this.running = true;
			
			this.run();
			
			this.tm.start();
			
			return this;
			
		},
		
		stop: function() {
			
			var object = this;
			
			this.running = false;
			this.tm.stop();
			
			defer(function() {
				object.done();
			});
			
			return this;
			
		},
		
		done: function() {
			/* This is for event listening. Generally, to listen for when an effect is done, a
			 * listener should be added to this method rather than to stop. The reason is because
			 * this.running is set to false by stop, but listeners to stop are called before stop
			 * is executed, so any listener on stop will still see the effect as running (which is
			 * correct since a listener could of course cancel the stop call). Chaining together
			 * different effects can especially cause errors if the stop method is listened to
			 * rather than the done method because the new effect will be started before the old
			 * effect has been stopped, and in fact the old effect could be stopped more than once
			 * due to recursion. So it is recommended that listening to stop be avoided except in
			 * special circumstances and listening to done be used instead.
			 * 
			 * Note: done is called every time stop is called (it is called by stop itself), so
			 * it is not only called when the effect completes itself but also when it is interrupted.
			 */
		}
		
	};
	
	return constructor;
	
}());
var Controllers = (function() {var Controller = Task.sub(function() {
	
	function constructor(options) {
		/* options:
		 * 		duration:	Optional. The amount of time (seconds) it should take
		 * 					for the effect to complete.
		 * 		start:		A value to start at.
		 * 		end:		A value to end at.
		 */
		
		options['function'] = bind(this.run, this);
		
	this['#base:{constructor}'] = Task; Task.call(this, options);
		
		this.initialize(options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Controller',
		
		'#duration': 2,
		'#start': null,
		'#end': null,
		'#startTime': null,
		'#firstPass': true,
		
		initialize: function(options) {
			/* Should be at the beginning of the time period
			 * for the effect.
			 */
			
			if(options.duration) {
				this['#duration'] = options.duration;
			}
			this['#start'] = options.start;
			this['#end'] = options.end;
			this['#startTime'] = new Date();
			
			if(typeof this['#start'] == 'string') {
				if(
					this['#start'].charAt(0) == '#'
					|| this['#start'].substring(0, 3) == 'rgb'
				) {
					this['#start'] = new Data.Color(this['#start']);
				}
			}
			if(typeof this['#end'] == 'string') {
				if(
					this['#end'].charAt(0) == '#'
					|| this['#end'].substring(0, 3) == 'rgb'
				) {
					this['#end'] = new Data.Color(this['#end']);
				}
			}
			
		},
		
		run: function() { }
		
	};
	
	return constructor;
	
}());
var Linear = Controller.sub(function() {
	
	function constructor(options) {
		
		if(!options) {
			options = { };
		}
		
	this['#base:{constructor}'] = Controller; Controller.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Linear',
		
		run: function() {
			var start = this['#start'], end = this['#end'], duration = this['#duration'];
			var elapsed = ((new Date()) - this['#startTime']);
			var current = Math.round((start + (end - start) / duration * elapsed / 1000) * 1000) / 1000;
			return balance(current, start, end);
		}
		
	};
		
	function balance(current, start, end) {
		if(
			end >= start && current >= end
			|| end < start && current <= end
		) {
			return end;
		}
		return current;
	}
	
	return constructor;
	
}());
var RgbaMultiController = Controller.sub(function() {
	
	var colors = [ 'red', 'green', 'blue', 'alpha' ];
	
	function constructor(options) {
		/* options:
		 * 		controllerType:	Required. RgbaMultiController isn't really a complete controller.
		 * 						It's a wrapper that allows a controller to be applied to a Color.
		 * 						controllerType specifies the controller constructor to use as the
		 * 						timing function for the effect.
		 */
		
		var startVal, endVal;
		
		if(typeof options.start == 'string') {
			options.start = new Data.Color(options.start);
		}
		if(typeof options.end == 'string') {
			options.end = new Data.Color(options.end);
		}
		
	this['#base:{constructor}'] = Controller; Controller.call(this, options);
		
		startVal = options.start.getRgba();
		endVal = options.end.getRgba();
		
		this['#controllers'] = [ ];
		for(var i = 0, color; i < colors.length; i++) {
			color = colors[i];
			this['#controllers'].push({
				color: color,
				controller: new options.controllerType({
					start: startVal[color],
					end: endVal[color],
					duration: this['#duration']
				})
			});
		}
		
	};
	
	constructor.prototype = {
		
		unitName: 'RgbaMultiController',
		
		'#controllers': null,
		
		run: function() {
			var controllers = this['#controllers'];
			var val = { }, c;
			for(var i = 0; i < controllers.length; i++) {
				c = controllers[i];
				val[c.color] = c.controller.run();
			}
			return new Data.Color({
				value: val,
				disposableWith: this
			});
		}
		
	};
	
	return constructor;
	
}());
var object = {Controller: Controller,Linear: Linear,RgbaMultiController: RgbaMultiController};return object;})();var Element = Effect.sub(function() {
	
	function constructor(options) {
		/* options
		 * 		element:	The element to apply the effect to.
		 */
		
	this['#base:{constructor}'] = Effect; Effect.call(this, options);
		
		this.element = options.element;
		this['#element'] = options.element; // DEPRECATED.
		
	};
	
	constructor.prototype = {
		
		unitName: 'Element',
		
		'#element': null, // DEPRECATED. TODO: Replace this.
		element: null
		
	};
	
	return constructor;
	
}());

extend(Element, (function() {

	var Transition = Element.sub(function() {
	
	var skipStyles = [ 'position', 'float' ];
	
	function constructor(options) {
		/* options:
		 * 		from:		Optional. A hash of styles to transform from.
		 * 		to:			Optional. A hash of styles to transform to.
		 * 		duration:	Optional. The number of seconds for the duration to take.
		 * 
		 * options can simply be the to option.
		 */
		
		var styles;
		var orig;
		var from, to;
		
		if(options.to) {
			to = clone(options.to);
		} else if(options.from) {
			to = null;
		} else {
			to = { };
			for(var i in options) {
				to[i] = options[i];
			}
			delete to.controller;
			delete to.duration;
			delete to.element;
		}
		
	this['#base:{constructor}'] = Element; Element.call(this, options);
		
		if(options.duration) {
			this['#duration'] = options.duration;
		}
		
		styles = this['#element'].styles;
		if(options.from) {
			orig = { };
			from = { };
			for(var i in options.from) {
				orig[i] = styles.computeNumeric(i);
				from[i] = options.from[i];
			}
			styles.set(options.from);
		}
		
		if(!to) {
			to = orig;
		} else {
			for(var i in orig) {
				if(to[i] === undefined) {
					to[i] = orig[i];
				}
			}
		}
		
		for(var i = 0; i < skipStyles.length; i++) {
			if(to[skipStyles[i]]) {
				styles.set(skipStyles[i], to[skipStyles[i]]);
				delete to[skipStyles[i]];
			}
		}
		
		this['#to'] = to;
		this['#from'] = from;
		
	};
	
	constructor.prototype = {
		
		unitName: 'Transition',
		
		'#to': null,
		'#from': null,
		'#duration': .4,
		
		start: function() {
			var object = this;
			this.base.call(this, arguments);
			setTimeout(function() {
				object.stop();
			}, this['#duration'] * 1000);
		},
		
		stop: function() {
			this.base.apply(this, arguments);
			this.element.styles.set(this['#to']);
		}
		
	};
		
	return constructor;
	
}());var CssTransition = Transition.sub(function() {
	
	function constructor(options) {
		/* options:
		 * 		from:				Optional. A hash of styles to transform from.
		 * 		to:					Optional. A hash of styles to transform to.
		 * 		timingFunction:		Optional. A timing function or options.
		 *	 						Default: 'linear'
		 * 		duration:			Optional. Time for the effect to take (in seconds).
		 * 							Only if the controller is unspecified (so is 'linear' by default)
		 * 							or is named by a string.
		 * 
		 * options can simply be the to option.
		 */
		
		if(options.duration) {
			options.interval = options.duration * 1000;
		} else {
			options.interval = this['#duration'] * 1000;
		}
		
	this['#base:{constructor}'] = Transition; Transition.call(this, options);
		
		if(options.timingFunction) {
			this['#timingFunction'] = options.timingFunction;
		}
		
	};
	
	constructor.prototype = {
		
		unitName: 'CssTransition',
		
		'#timingFunction': 'linear',
		'#properties': null,
		
		start: function() {
			
			var object = this;
			var styles, from, to, timingFunction;
			
			this.base.apply(this, arguments);
			
			styles = this.element.styles;
			from = this['#from'];
			to = this['#to'];
			timingFunction = this['#timingFunction'];
			
			if(from) {
				styles.set(from);
			}
			this['#properties'] = Hashtable.getKeys(to);
			styles.fix(this['#properties']);
			
			defer(function() {
				for(var i in to) {
					styles.transitions.add({
						property: JString.toHyphenated(i),
						'function': timingFunction,
						duration: object['#duration'] + 's'
					});
				}
				defer(function() { styles.set(to); });
			});
			
		},
		
		run: function() { },
		
		stop: function() {
			this.base.apply(this, arguments);
			this.element.styles.transitions.remove(this['#properties']);
		}
		
	};
	
	return constructor;
	
}());var Fade = Element.sub(function() {
	
	function constructor(options) {
		/* options
		 * 		opacity:	The opacity to fade to.
		 * 		step:		Optional. Either a number or a function.
		 */
		
	this['#base:{constructor}'] = Element; Element.call(this, options);
		
		this['#fromOpacity'] = this['#element'].styles.getOpacity();
		this['#opacity'] = this['#fromOpacity'];
		this['#toOpacity'] = options.opacity;
		
		if(options.step) {
			this['#step'] = options.step;
		}
		
		if(this['#opacity'] < this['#toOpacity']) {
			this['#direction'] = 1;
			if(typeof this['#step'] != 'function') {
				this['#step'] = Math.abs(this['#step']);
			}
		} else {
			this['#direction'] = -1;
			if(typeof this['#step'] != 'function') {
				this['#step'] = -Math.abs(this['#step']);
			}
		}
		
		/* Note (2012/02/02): I have commented this out because I don't know why overflow is set to hidden.
		 * Was there a reason for this? Perhaps it was left over from a resize effect or something? Should
		 * this be removed?
		 * 
		 * TODO: Decide what to do about this
		 * 
		this['#overflow'] = this['#element'].styles.get('overflow');
		
		this['#element'].styles.set({
			overflow: 'hidden'
		});*/
		
	};
	
	constructor.prototype = {
		
		unitName: 'Fade',
		
		'#opacity': null,
		'#fromOpacity': null,
		'#toOpacity': null,
		'#direction': null,	// 1 for positive, -1 for negative
		
		'#step': function(opacity) {
			
			if(opacity.to == opacity.from) {
				return {
					stop: true
				};
			}
			
			var frames = 28;
			var blocks = 0;
			
			for(var i = 1; i <= frames; i++) {
				blocks += i;
			}
			
			var blockSize = (opacity.to - opacity.from) / blocks;
			
			var o = opacity.from;
			
			for(var i = frames; i > 0; i--) {
				if(o == opacity.current) {
					return {
						opacity: blockSize * i
					};
				}
				o += blockSize * i;
			}
			
			return {
				stop: true
			};
			
		},
		
		run: function() {
			
			var step;
			
			if(typeof this['#step'] == 'function') {
				
				step = this['#step']({
					from: this['#fromOpacity'],
					current: this['#opacity'],
					to: this['#toOpacity']
				});
				
				if(step.stop) {
					
					this['#element'].styles.set({
						opacity: this['#toOpacity']
					});
					
					this.stop();
					
				} else {
					
					this['#opacity'] += step.opacity;
					
					this['#element'].styles.set({
						opacity: this['#opacity']
					});
					
				}
				
			} else {
				
				step = this['#step'];
				
				if(this['#opacity'] == this['#toOpacity']) {
					step.opacity = 0;
				}
				
				this['#opacity'] += step;
				
				if(this['#direction'] == 1) {
					if(this['#opacity'] > this['#toOpacity']) {
						this['#opacity'] = this['#toOpacity'];
					}
				} else {
					if(this['#opacity'] < this['#toOpacity']) {
						this['#opacity'] = this['#toOpacity'];
					}
				}
				
				this['#element'].styles.set({
					opacity: this['#opacity']
				});
				
				if(
					this['#opacity'] == this['#toOpacity']
					&& this['#opacity'] == this['#toOpacity']
				) {
					this.stop();
				}
				
			}
			
		}
		
	};
	
	return constructor;
	
}());var Move = Element.sub(function() {
	
	function constructor(options) {
		/* options
		 * 		top:	Optional.
		 * 		left:	Optional.
		 * 		width:	Optional.
		 * 		height:	Optional.
		 * 		step:	Optional. Either a number or a function.
		 * 
		 */
		
	this['#base:{constructor}'] = Element; Element.call(this, options);
		
		var xy = this['#element'].styles.getDimensions();
		
		this['#fromTop'] = xy.top.toPixels();
		this['#fromLeft'] = xy.left.toPixels();
		this['#fromWidth'] = xy.width.toPixels();
		this['#fromHeight'] = xy.height.toPixels();
		
		this['#top'] = this['#fromTop'];
		this['#left'] = this['#fromLeft'];
		this['#width'] = this['#fromWidth'];
		this['#height'] = this['#fromHeight'];
		
		if(typeof options.top != 'undefined') {
			this['#toTop'] = options.top;
		} else {
			this['#toTop'] = null;
		}
		
		if(typeof options.left != 'undefined') {
			this['#toLeft'] = options.left;
		} else {
			this['#toLeft'] = null;
		}
		
		if(typeof options.width != 'undefined') {
			this['#toWidth'] = options.width;
		} else {
			this['#toWidth'] = null;
		}
		
		if(typeof options.height != 'undefined') {
			this['#toHeight'] = options.height;
		} else {
			this['#toHeight'] = null;
		}
		
		if(options.step) {
			this['#step'] = options.step;
		}
		
		if(typeof this['#step'] == 'number') {
			this['#step'] = {
				top: this['#step'],
				left: this['#step'],
				width: this['#step'],
				height: this['#step']
			};
		}
		
		this['#direction'] = {
			top: null, // 1 for positive, -1 for negative,
			left: null,
			width: null,
			height: null
		};
		
		if(this['#top'] < this['#toTop']) {
			this['#direction'].top = 1;
			if(typeof this['#step'] != 'function') {
				this['#step'].top = Math.abs(this['#step'].top);
			}
		} else {
			this['#direction'].top = -1;
			if(typeof this['#step'] != 'function') {
				this['#step'].top = -Math.abs(this['#step'].top);
			}
		}
		
		if(this['#left'] < this['#toLeft']) {
			this['#direction'].left = 1;
			if(typeof this['#step'] != 'function') {
				this['#step'].left = Math.abs(this['#step'].left);
			}
		} else {
			this['#direction'].left = -1;
			if(typeof this['#step'] != 'function') {
				this['#step'].left = -Math.abs(this['#step'].left);
			}
		}
		
		if(this['#width'] < this['#toWidth']) {
			this['#direction'].width = 1;
			if(typeof this['#step'] != 'function') {
				this['#step'].width = Math.abs(this['#step'].width);
			}
		} else {
			this['#direction'].width = -1;
			if(typeof this['#step'] != 'function') {
				this['#step'].width = -Math.abs(this['#step'].width);
			}
		}
		
		if(this['#height'] < this['#toHeight']) {
			this['#direction'].height = 1;
			if(typeof this['#step'] != 'function') {
				this['#step'].height = Math.abs(this['#step'].height);
			}
		} else {
			this['#direction'].height = -1;
			if(typeof this['#step'] != 'function') {
				this['#step'].height = -Math.abs(this['#step'].height);
			}
		}
		
		this['#overflow'] = this['#element'].styles.get('overflow');
		
		this['#element'].styles.set({
			overflow: 'hidden'
		});
		
	};
	
	constructor.prototype = {
		
		unitName: 'Move',
		
		'#step': function(xy) {
			
			if(
				(xy.top.to === null || xy.top.from == xy.top.to)
				&& (xy.left.to === null || xy.left.from == xy.left.to)
				&& (xy.width.to === null || xy.width.from == xy.width.to)
				&& (xy.height.to === null || xy.height.from == xy.height.to)
			) {
				return {
					stop: true
				};
			}
			
			var frames = 10;
			var blocks = 0;
			
			for(var i = 1; i <= frames; i++) {
				blocks += i;
			}
			
			var blockTop = (xy.top.to - xy.top.from) / blocks;
			var blockLeft = (xy.left.to - xy.left.from) / blocks;
			var blockWidth = (xy.width.to - xy.width.from) / blocks;
			var blockHeight = (xy.height.to - xy.height.from) / blocks;
			
			var top = xy.top.from;
			var left = xy.left.from;
			var width = xy.width.from;
			var height = xy.height.from;
			
			for(var i = frames; i > 0; i--) {
				if(
					(xy.top.to === null || top == xy.top.current)
					&& (xy.left.to === null || left == xy.left.current)
					&& (xy.width.to === null || width == xy.width.current)
					&& (xy.height.to === null || height == xy.height.current)
				) {
					return {
						top: xy.top.to === null ? null : blockTop * i,
						left: xy.left.to === null ? null : blockLeft * i,
						width: xy.width.to === null ? null : blockWidth * i,
						height: xy.height.to === null ? null : blockHeight * i
					};
				}
				top += blockTop * i;
				left += blockLeft * i;
				width += blockWidth * i;
				height += blockHeight * i;
			}
			
			return {
				stop: true
			};
			
		},
		
		run: function() {
			
			var step;
			
			if(typeof this['#step'] == 'function') {
				
				step = this['#step']({
					top: {
						from: this['#fromTop'],
						current: this['#top'],
						to: this['#toTop']
					},
					left: {
						from: this['#fromLeft'],
						current: this['#left'],
						to: this['#toLeft']
					},
					width: {
						from: this['#fromWidth'],
						current: this['#width'],
						to: this['#toWidth']
					},
					height: {
						from: this['#fromHeight'],
						current: this['#height'],
						to: this['#toHeight']
					}
				});
				
				if(step.stop) {
					
					this['#element'].styles.set(getStyleTable.call(
						this,
						{
							top: this['#toTop'],
							left: this['#toLeft'],
							width: this['#toWidth'],
							height: this['#toHeight']
						}
					));
					
					this.stop();
					
				} else {
					
					if(step.top !== null) this['#top'] += step.top;
					if(step.left !== null) this['#left'] += step.left;
					if(step.width !== null) this['#width'] += step.width;
					if(step.height !== null) this['#height'] += step.height;
					
					this['#element'].styles.set(getStyleTable.call(
						this,
						{
							top: this['#top'],
							left: this['#left'],
							width: this['#width'],
							height: this['#height']
						}
					));
					
				}
				
			} else {
				
				step = this['#step'];
				
				if(this['#top'] == this['#toTop']) {
					step.top = 0;
				}
				if(this['#left'] == this['#toLeft']) {
					step.left = 0;
				}
				if(this['#width'] == this['#toWidth']) {
					step.width = 0;
				}
				if(this['#height'] == this['#toHeight']) {
					step.height = 0;
				}
				
				this['#top'] += step.top;
				this['#left'] += step.left;
				this['#width'] += step.width;
				this['#height'] += step.height;
				
				if(
					this['#direction'].top == 1
					&& this['#top'] > this['#toTop']
				) {
					this['#top'] = this['#toTop'];
				} else if(
					this['#direction'].top == -1
					&& this['#top'] < this['#toTop']
				) {
					this['#top'] = this['#toTop'];
				}
				
				if(
					this['#direction'].left == 1
					&& this['#left'] > this['#toLeft']
				) {
					this['#left'] = this['#toLeft'];
				} else if(
					this['#direction'].left == -1
					&& this['#left'] < this['#toLeft']
				) {
					this['#left'] = this['#toLeft'];
				}
				
				if(
					this['#direction'].width == 1
					&& this['#width'] > this['#toWidth']
				) {
					this['#width'] = this['#toWidth'];
				} else if(
					this['#direction'].width == -1
					&& this['#width'] < this['#toWidth']
				) {
					this['#width'] = this['#toWidth'];
				}
				
				if(
					this['#direction'].height == 1
					&& this['#height'] > this['#toHeight']
				) {
						this['#height'] = this['#toHeight'];
				} else if(
					this['#direction'].height == -1
					&& this['#height'] < this['#toHeight']
				) {
					this['#height'] = this['#toHeight'];
				}
				
				this['#element'].styles.set(getStyleTable.call(
					this,
					{
						top: this['#top'],
						left: this['#left'],
						width: this['#width'],
						height: this['#height']
					}
				));
				
				if(
					(this['#toTop'] === null || this['#top'] == this['#toTop'])
					&& (this['#toLeft'] === null || this['#left'] == this['#toLeft'])
					&& (this['#toWidth'] === null || this['#width'] == this['#toWidth'])
					&& (this['#toHeight'] === null || this['#height'] == this['#toHeight'])
				) {
					this.stop();
				}
				
			}
			
		},
		
		stop: function() {
			
			this['#element'].styles.set({
				overflow: this['#overflow']
			});
			
			Element.prototype.stop.apply(this, arguments);
			
		}
		
	};
	
	function getStyleTable(styles) {
		
		var st = new Html.StyleTable(styles);
		this.disposable.push(st);
		
		if(this['#toTop'] === null) {
			st.remove('top');
		}
		if(this['#toLeft'] === null) {
			st.remove('left');
		}
		if(this['#toWidth'] === null) {
			st.remove('width');
		}
		if(this['#toHeight'] === null) {
			st.remove('height');
		}
		
		return st;
		
	}
	
	return constructor;
	
}());/* TODO: NumericStyles is the replacement for old fx. After getting NumericStyles working,
 * remove Move, Fade, and Resize, and replace them with NumericStyles (or at least
 * turn them into subconstructors for NumericStyles).
 */
var NumericStyles = Transition.sub(function() {
	/* One goal of NumericStyles is to provide identical transition effects
	 * for browsers which don't support CSS3 transitions.
	 * However, that it is not NumericStyles' entire purpose. NumericStyles
	 * provides a mechanism for applying controllers to css styles, and may
	 * provide greater functionality (in the form of more controllers or in
	 * the form of methods and options) than CSS3 transitions.
	 */
	
	var controllerTypes = { };
	
	function constructor(options) {
		/* options:
		 * 		from:		Optional. A hash of styles to transform from.
		 * 		to:			Optional. A hash of styles to transform to.
		 * 		controller:	Optional. Options for creating a controller.
		 * 			type: 		Can be used to specify the controller name (a lowercase
		 * 						representation of the unitName).
		 * 					controller can simply be a string specifying the type option.
		 * 					Default: 'linear'
		 * 		duration:	Optional. Time for the effect to take (in seconds).
		 * 					Only if the controller is unspecified (so is 'linear' by default)
		 * 					or is named by a string.
		 * 
		 * options can simply be the to option.
		 */
		
		var styles;
		var controllers, controllerType;
		var from, to, toParts, skipStyle;
		
	this['#base:{constructor}'] = Transition; Transition.call(this, options);
		
		styles = this['#element'].styles;
		from = this['#from'];
		to = clone(this['#to']); // Clone it incase it's modified later. (There is at least one codepath that modifies it.)
		
		if(typeof options.controller == 'string') {
			controllerType = options.controller;
		} else if(options.controller && options.controller.type) {
			controllerType = options.controller.type;
		} else {
			controllerType = 'linear';
		}
		
		if(!from) {
			from = { };
		}
		
		// TODO: The following can be rewritten much cleaner (with references to to[i] and from[i] for example).
		controllers = [ ];
		for(var i in to) {
			skipStyle = false;
			if(from[i] === undefined) {
				if(typeof to[i] == 'string') {
					if(to[i].indexOf(' ') != -1) {
						/* Check for some style shortcuts to apply effects to parts of them.
						 * Only do this when from isn't defined because if from is defined,
						 * then going from and to would be more difficult. If at some point
						 * this is wanted to be accomplished, then the from styles could be
						 * applied and then read...
						 */
						if(i == 'border') {
							toParts = to[i].split(' ');
							delete to[i];
							i = 'border-width';
							to[i] = toParts[0];
							from[i] = styles.computeNumeric(i); // This needs to be done before the styles are set below, or else a default border-width is set in FF
							if(toParts.length == 2) {
								styles.set({
									borderStyle: toParts[1]
								});
							} else if(toParts.length >= 3) {
								styles.set({
									borderStyle: toParts[1],
									borderColor: toParts[2]
								});
							}
						}
					}
					// Don't use else because we want it to evaluate the following after the changes from above
					if(to[i].indexOf(' ') == -1) {
						if(to[i].substring(to[i].length - 2) == 'px') {
							to[i] = to[i].substring(0, to[i].length - 2) * 1;
						}
					}
				}
				if(from[i] === undefined) { // Needs to be checked again because it can be set above.
					from[i] = styles.computeNumeric(i);
					if(typeof from[i] == 'string') {
						skipStyle = true;
					}
				}
			}
			if(!skipStyle) {
				if(from[i] instanceof Data.Color) {
					if(typeof to[i] == 'string') {
						to[i] = new Data.Color(to[i]);
					}
					controllers.push({
						style: i,
						controller: new Controllers.RgbaMultiController({
							controllerType: controllerTypes[controllerType],
							start: from[i],
							end: to[i],
							duration: this['#duration'],
							disposableWith: this
						})
					});
				} else {
					if(typeof to[i] == 'string') {
						styles.set(i, to[i]);
						defer({
							'function': function(i) {
								controllers.push({
									style: i,
									controller: new controllerTypes[controllerType]({
										start: from[i],
										end: styles.computeNumeric(i),
										duration: this['#duration'],
										disposableWith: this
									})
								});
								styles.set(i, from[i]);
							},
							arguments: [ i ],
							scope: this
						});
					} else {
						controllers.push({
							style: i,
							controller: new controllerTypes[controllerType]({
								start: from[i],
								end: to[i],
								duration: this['#duration'],
								disposableWith: this
							})
						});
					}
				}
			}
		}
		
		this['#controllers'] = controllers;
		
	};
	
	constructor.prototype = {
		
		unitName: 'NumericStyles',
		
		'#controllers': null,
		
		run: function() {
			var controllers = this['#controllers'];
			var controller, style;
			var cv, stylesH = { };
			for(var i = 0; i < controllers.length; i++) {
				controller = controllers[i].controller;
				style = controllers[i].style;
				if(controller) {
					cv = controller.run();
					if(typeof cv != 'number' || !isNaN(cv)) {
						stylesH[style] = cv;
					}
				}
			}
			this['#element'].styles.set(stylesH);
		}
		
	};
	
	for(var i in Controllers) {
		if(Controllers[i].prototype instanceof Controllers.Controller) {
			controllerTypes[i.toLowerCase()] = Controllers[i];
		}
	}
	
	return constructor;
	
}());// DEPRECATED: This has been replaced by Move

var Resize = Element.sub(function() {
	
	function constructor(options) {
		/* options
		 * 		width:	Optional.
		 * 		height:	Optional.
		 * 		step:	Optional. Either a number or a function.
		 */
		
	this['#base:{constructor}'] = Element; Element.call(this, options);
		
		var xy = this['#element'].styles.getDimensions();
		
		this['#fromWidth'] = xy.width.toPixels();
		this['#fromHeight'] = xy.height.toPixels();
		
		this['#width'] = this['#fromWidth'];
		this['#height'] = this['#fromHeight'];
		
		if(typeof options.width != 'undefined') {
			this['#toWidth'] = options.width;
		} else {
			this['#toWidth'] = xy.width.toPixels();
		}
		
		if(typeof options.height != 'undefined') {
			this['#toHeight'] = options.height;
		} else {
			this['#toHeight'] = xy.height.toPixels();
		}
		
		if(options.step) {
			this['#step'] = options.step;
		}
		
		if(typeof this['#step'] == 'number') {
			this['#step'] = {
				width: this['#step'],
				height: this['#step']
			};
		}
		
		this['#direction'] = {
			width: null, // 1 for positive, -1 for negative, 
			height: null
		};
		
		if(this['#width'] < this['#toWidth']) {
			this['#direction'].width = 1;
			if(typeof this['#step'] != 'function') {
				this['#step'].width = Math.abs(this['#step'].width);
			}
		} else {
			this['#direction'].width = -1;
			if(typeof this['#step'] != 'function') {
				this['#step'].width = -Math.abs(this['#step'].width);
			}
		}
		
		if(this['#height'] < this['#toHeight']) {
			this['#direction'].height = 1;
			if(typeof this['#step'] != 'function') {
				this['#step'].height = Math.abs(this['#step'].height);
			}
		} else {
			this['#direction'].height = -1;
			if(typeof this['#step'] != 'function') {
				this['#step'].height = -Math.abs(this['#step'].height);
			}
		}
		
		this['#overflow'] = this['#element'].styles.get('overflow');
		
		this['#element'].styles.set({
			overflow: 'hidden'
		});
		
	};
	
	constructor.prototype = {
		
		unitName: 'Resize',
		
		'#width': null,
		'#height': null,
		'#fromWidth': null,
		'#fromHeight': null,
		'#toWidth': null,
		'#toHeight': null,
		'#direction': null,
		'#overflow': null,
		
		'#step': function(xy) {
			
			if(
				xy.width.from == xy.width.to
				&& xy.height.from == xy.height.to
			) {
				return {
					stop: true
				};
			}
			
			var frames = 10;
			var blocks = 0;
			
			for(var i = 1; i <= frames; i++) {
				blocks += i;
			}
			
			var blockWidth = (xy.width.to - xy.width.from) / blocks;
			var blockHeight = (xy.height.to - xy.height.from) / blocks;
			
			var width = xy.width.from;
			var height = xy.height.from;
			
			for(var i = frames; i > 0; i--) {
				if(width == xy.width.current && height == xy.height.current) {
					return {
						width: blockWidth * i,
						height: blockHeight * i
					};
				}
				width += blockWidth * i;
				height += blockHeight * i;
			}
			
			return {
				stop: true
			};
			
		},
		
		run: function() {
			
			var step;
			
			if(typeof this['#step'] == 'function') {
				
				step = this['#step']({
					width: {
						from: this['#fromWidth'],
						current: this['#width'],
						to: this['#toWidth']
					},
					height: {
						from: this['#fromHeight'],
						current: this['#height'],
						to: this['#toHeight']
					}
				});
				
				if(step.stop) {
					
					this['#element'].styles.set({
						width: this['#toWidth'],
						height: this['#toHeight']
					});
					
					this.stop();
					
				} else {
					
					this['#width'] += step.width;
					this['#height'] += step.height;
					
					this['#element'].styles.set({
						width: this['#width'],
						height: this['#height']
					});
					
				}
				
			} else {
				
				step = this['#step'];
				
				if(this['#width'] == this['#toWidth']) {
					step.width = 0;
				}
				if(this['#height'] == this['#toHeight']) {
					step.height = 0;
				}
				
				this['#width'] += step.width;
				this['#height'] += step.height;
				
				if(
					this['#direction'].width == 1
					&& this['#width'] > this['#toWidth']
				) {
					this['#width'] = this['#toWidth'];
				} else if(
					this['#direction'].width == -1
					&& this['#width'] < this['#toWidth']
				) {
					this['#width'] = this['#toWidth'];
				}
				
				if(
					this['#direction'].height == 1
					&& this['#height'] > this['#toHeight']
				) {
						this['#height'] = this['#toHeight'];
				} else if(
					this['#direction'].height == -1
					&& this['#height'] < this['#toHeight']
				) {
					this['#height'] = this['#toHeight'];
				}
				
				this['#element'].styles.set({
					width: this['#width'],
					height: this['#height']
				});
				
				if(
					this['#width'] == this['#toWidth']
					&& this['#height'] == this['#toHeight']
				) {
					this.stop();
				}
				
			}
			
		},
		
		stop: function() {
			
			this['#element'].styles.set({
				overflow: this['#overflow']
			});
			
			Element.prototype.stop.apply(this, arguments);
			
		}
		
	};
	
	return constructor;
	
}());
	
	return {
		Fade: Fade,
		Move: Move,
		NumericStyles: NumericStyles,
		CssTransition: CssTransition
	};

})());
var object = {Controllers: Controllers,Element: Element,Effect: Effect};return object;})();var History = (function() {var Manager = (function() {
	/* EXPERIMENTAL.
	 * This object is currently marked expiremental and its behavior may changed
	 * drastically in the future.
	 * TODO: One thing to think about is whether this should be a constructor
	 * instead of an object. ?
	 */
	
	var popstateSetup = false;
	
	var object = new Unit();
	
	extend(object, {
		
		setPath: function(path, data) {
			// TODO: Work on this more.
			if(history !== undefined && history.pushState) {
				history.pushState(data, '', path);
			} else {
				location.hash = '#!' + path;
			}
			if(!popstateSetup) {
				popstateSetup = true;
				setupPopstate();
			}
		},
		
		pathChanged: function(data) { }
		
	});
	
	function setupPopstate() {
		// TODO: Needs to handle browsers which don't support pushState and onpopstate
		var oldhandler;
		if(window.onpopstate) {
			oldhandler = window.onpopstate;
		}
		window.onpopstate = function(v) {
			var ret;
			if(oldhandler) {
				ret = oldhandler.apply(this, arguments);
			}
			object.pathChanged(v.state);
			return ret;
		}
	}
	
	return object;
	
}());var object = {Manager: Manager};return object;})();var JMath = (function() {
	
	var knownPrimes_set = [ 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97 ];
	var knownPrimes, lastKnownPrime;
	
	var Random = (function() {
	
	return {
		
		get: function(min, max) {
			/* Returns a number between min and max (min inclusive, max exclusive).
			 * 
			 * min and max are both optional.  If only one parameter is passed, it will be used as the max,
			 * and min will be set to 0.
			 */
			
			if(typeof min == 'undefined' && typeof max == 'undefined') {
				min = 0;
				max = 1;
			}
			
			if(typeof max == 'undefined') {
				max = min;
				min = 0;
			}
			
			min = Math.ceil(min);
			max = Math.floor(max);
			
			return Math.random() * (max - min) + min;
			
		},
		
		getInteger: function(min, max) {
			/* Returns a number between min and max, inclusive.
			 */
			
			if(typeof min == 'undefined' && typeof max == 'undefined') {
				min = 0;
				max = 1;
			}
			
			if(typeof max == 'undefined') {
				max = min;
				min = 0;
			}
			
			return Math.floor(Random.get(min, max + 1));
			
		},
		
		getChar: function(charset) {
			
			if(!charset) {
				charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
			}
			
			var i = Random.getInteger(charset.length - 1);
			
			return charset.charAt(i);
			
		},
		
		getString: function(length, charset) {
			
			var s = '';
			
			for(var i = 0; i < length; i++) {
				s += Random.getChar(charset);
			}
			
			return s;
			
		},
		
		getChars: function() {
			// DEPRECATED. TODO: remove getChars in favor of getString
			return Random.getString.apply(Random, arguments);
		},
		
		choose: function(r) {
			/* Choose an item from an array randomly.
			 * Instead of an array, multiple arguments may be passed as well.
			 */
			if(arguments.length > 1) {
				return arguments[Random.getInteger(0, arguments.length - 1)];
			} else {
				return r[Random.getInteger(0, r.length - 1)];
			}
		}
		
	};
	
}());var Sort = (function() {
	
	function qs_partition(r, from, to, pivotIndex) {
		
		var v = r[pivotIndex].value;
		var store, tmp;
		
		tmp = r[pivotIndex]; r[pivotIndex] = r[to]; r[to] = tmp; // swap
		
		store = from;
		for(var i = from; i < to; i++) {
			if(r[i].value <= v) {
				tmp = r[i]; r[i] = r[store]; r[store] = tmp; // swap
				store++;
			}
		}
		
		tmp = r[store]; r[store] = r[to]; r[to] = tmp; // swap
		
		return store;
		
	}
	
	function quicksort(r, from, to) {
		
		var pivotIndex;
		
		if(to > from) {
			pivotIndex = Math.round((from + to) / 2);
			pivotIndex = qs_partition(r, from, to, pivotIndex);
			quicksort(r, from, pivotIndex - 1);
			quicksort(r, pivotIndex + 1, to);
		}
		
	}
	
	return {
		
		// TODO ?: make a 'sort' method and choose the best sorting algorithm based on size of array and possibly other factors (add sort method to Collection as well)
		// NOTE: Don't forget Javascript Arrays have a native sort method.
		
		quicksort: function(r, f) {
			/* f can be undefined, a member name, or a function that returns a value based on
			 * an item in the array.
			 */
			// Note, perhaps use the native array sort method when possible to improve performance.
			
			var r2 = [ ], v;
			
			r = Collection.castAsIterable(r);
			
			for(var i = 0; i < r.length; i++) {
				if(typeof f == 'string') {
					v = r[i][f];
					if(typeof v == 'function') {
						v = v.apply(r[i]);
					}
				} else if(typeof f == 'function') {
					v = f(r[i]);
				} else {
					v = r[i];
				}
				r2.push({
					value: v,
					object: r[i]
				});
			}
			
			quicksort(r2, 0, r2.length - 1);
			
			r = new Collection();
			for(var i = 0; i < r2.length; i++) {
				r.push(r2[i].object);
			}
			
			return r;
			
		},
		
		random: function(r) {
			
			var j;
			var r2 = new Collection([ ]);
			
			r = Collection.use(r);
			r = r.clone();
			
			while(r.length > 0) {
				j = Random.getInteger(0, r.length - 1);
				r2.push(r[j]);
				r.remove(j);
			}
			
			r.dispose();
			
			return r2;
			
		}
		
	};
	
}());
	
	return {
		
		Random: Random,
		Sort: Sort,
		
		max: function(/* a1, a2, a3, ... */) {
			// TODO: ? Make it so that an array or collection can be passed as the argument as well?
			// TODO: Add a max method to Collection
			if(arguments.length == 0) {
				return undefined;
			}
			var max = arguments[0];
			for(var i = 1; i < arguments.length; i++) {
				if(arguments[i] > max) {
					max = arguments[i];
				}
			}
			return max;
		},
		
		isPrime: function(num) {
			if(num == 1) {
				return false;
			}
			if(!knownPrimes) {
				generateKnownPrimes();
			}
			if(num <= lastKnownPrime) {
				if(knownPrimes['p' + num]) {
					return true;
				} else {
					return false;
				}
			}
			var checkTo = Math.sqrt(num), factor;
			for(var i = 0; i < knownPrimes_set.length; i++) {
				factor = knownPrimes_set[i];
				if(factor > checkTo) {
					return true;
				}
				if(num % factor == 0) {
					return false;
				}
			}
			for(var i = lastKnownPrime + 1; i <= checkTo; i++) {
				if(num % i == 0) {
					return false;
				}
			}
			return true;
		}
		
	};
	
	function generateKnownPrimes() {
		knownPrimes = { };
		for(var i = 0; i < knownPrimes_set.length; i++) {
			knownPrimes['p' + knownPrimes_set[i]] = true;
		}
		lastKnownPrime = knownPrimes_set[knownPrimes_set.length - 1];
	}
	
}());var Live = (function() {var getDefaultHandler = (function() {
	
	var mh;
	
	function getDefaultHandler() {
		if(!mh) {
			mh = new MessageHandler({
				antiCaching: true,
				maxConnections: 2,
				retries: 0
			});
		}
		return mh;
	}
	
	return getDefaultHandler;
	
})();var Json = (function() {
	
	var object = {
		
		parse: function(json) {
			// TODO: ! actually make a parser instead of using eval.
			return eval('(' + json + ')');
		}
		
	};
	
	return object;
	
}());/* TODO: Check out FormData objects https://developer.mozilla.org/en/DOM/XMLHttpRequest/Using_XMLHttpRequest
 * and other more recent developments in AJAX.
 */

var Request = Unit.sub(function(){

    var constructor = function(options) {
        /* options
         *
         * 		method:		Optional. The method to use when connecting to the host. Default: GET
         *
         * 		url:		Optional. The url to connect to.
         *
         * 		async:		Optional. Whether to use an asynchrous request. Default: true
         *
         * 		send:		Optional. A message to send. If this option is specified a connection will automatically
         * 					be made and the message will immediately be sent.
         *
         */
		
		if(!options) {
			options = {};
		}
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
		this.req = getNewXMLHttpRequest.apply(this);
		
		if(options.method) {
			this.method = options.method;
		}
		
		if(options.url) {
			this.setUrl(options.url);
        }
        
        if(options.async) {
            this.async = options.async;
        }
        
        if(typeof options.send != 'undefined') {
            /* The typeof options.send is checked because a null string is a false value but it needs
             * to be sent if a null string is the value of options.send.
             */
            this.send(options.send);
        }
        
    };
    
    function getNewXMLHttpRequest(){
    
        var req;
        
        try {
            req = new XMLHttpRequest();
        } 
        catch (x) {
            try {
                req = new ActiveXObject('Msxml2.XMLHTTP');
            } 
            catch (x) {
                req = new ActiveXObject('Microsoft.XMLHTTP');
            }
        }
        
        return req;
        
    }
    
    constructor.prototype = {
    
        unitName: 'Request',
        
		'#url': null,
        method: 'GET',
        async: true,
        
		getUrl: function() {
			/* The url is cloned because #url may be disposed when a new url is set,
			 * but whatever retrieves the url may want to continue using it for other
			 * purposes after #url has been disposed.
			 */ 
			return this['#url'].clone();
		},
		
		setUrl: function(url) {
			if(this['#url'] && this['#url'].temporary) {
				this['#url'].dispose();
			}
			if(url instanceof Uri) {
				this['#url'] = url;
			} else {
            	this['#url'] = new Uri(url);
				this['#url'].temporary = true;
			}
		},
		
        abort: function(){
            this.req.abort();
        },
		
        open: function(options) {
            /* options
             * 		method:		Optional.
             * 		url:		Optional.
             * 		async:		Optional.
             */
            if (!options) {
                options = {};
            }
            
            if(options.method) {
                this.method = options.method;
            }
            
	        if(options.url) {
				this.setUrl(options.url);
	        }
            
            if(options.async) {
                this.async = options.async;
            }
            
            this.req.onreadystatechange = function() { };
            this.req.abort();
            this.req = getNewXMLHttpRequest();
            /* For some reason FF3 needs a new request object if the old one failed due to being unable to connect.
             * TODO: Perhaps the way the request object is supposed to work is by creating a new one each time?
             * TODO: See if there's a way around doing this. If creating a whole new object is the best way, then
             * it should probably be reworked a little.. maybe creating the object only on open and not when the Request
             * instance is created.. of course then some things would need to be changed about getStatus and other methods
             * that expect a request object...
             */
            this.req.onreadystatechange = bind(this.readystatechange, this);
            this.req.open(this.method, this['#url'], this.async);
            
        },
        
        send: function(s){
            /* If there is no connection already present, a new connection will be opened automatically.
             */
            if (this.getReadyState() == 0) {
                this.open();
            }
            
            this.req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded'); // TODO: should this data type be used? default is application/xml... at the least a method needs to be added for a user to set this, but default needs to be considered. maybe use xml default here and form data as default in Message?
            this.req.send(s);
            
        },
        
        getReadyState: function(){
            return this.req.readyState;
        },
        
        getStatus: function(){
            /* The status can only be checked after the readyState is 4 (complete), so
             * if the readyState is not yet 4, the status will be returned as -1.
             *
             * (Note: FF does allow status to be checked in readyStates 2 and 3 but for
             * conformity jsl only allows status to be checked in readyState 4.)
             */
            if (this.getReadyState() == 4) {
                try { // FF2 throws an error if the status is accessed when the request could not connect to the server.
                    return this.req.status;
                } 
                catch (x) {
                    return 0;
                }
            }
            else {
                return -1;
            }
            
        },
        
        getResponseText: function(){
            return this.req.responseText;
        },
        
        getResponseXml: function(){
            return Xml(this.req.responseXML);
        },
        
        readystatechange: function() { }
        
    };
    
    return constructor;
    
}());
var send = (function() {
	
	function send() {
		var mh = getDefaultHandler();
		mh.send.apply(mh, arguments);
	}
	
	return send;
	
})();var Comet = (function() {var Client = Unit.sub(function(){
	/* Note: Commet support is not currently implemented for IE and likely will never
	 * be implemented into the jsl for IE vesions less than 8.  The reason for this is
	 * because IE versions less than 8 don't support a work-around for this type of
	 * Comet implementation. For compatibility with IE7 and lower, use the IFRAME push
	 * technique.
	 * Note: For WebKit clients to work, an intial packet of 2k should be sent.
	 * 
	 * TODO: Fix this to work with IE8 using XDomainRequest.
	 * http://blogs.msdn.com/b/ieinternals/archive/2010/04/06/comet-streaming-in-internet-explorer-with-xmlhttprequest-and-xdomainrequest.aspx
	 */
	
    var constructor = function(options) {
		/* options
		 * 		
		 * 		method:		Optional. The method to use when connecting to the host. Default: POST
		 * 		
		 * 		url:		Optional. The url to connect to.
		 * 		
		 * 		connect:	Optional. Indicates whether to connect automatically.
		 * 
		 */
		
		if(!options) {
			options = { };
		}
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
		if(options.method) {
			this.method = options.method;
		}
		
		if(options.url) {
			this.url = options.url;
		}
		
		if(options.connect) {
			this.connect();
		}
		
    };
    
    constructor.prototype = {
    	
        unitName: 'Client',
		
		'#req': null,
		
		method: null,
		url: null,
		
		disposable: [ '#req' ],
		
		connect: function() {
			var object = this;
			var lastResponseLength = 0;
			var req = new Request({
				method: this.method,
				url: this.url,
				async: true,
				on: {
					readystatechange: function() {
						var readyState = req.getReadyState();
						if(readyState < 3) {
							return;
						}
						var responseText = req.getResponseText();
						var newText = responseText.substring(lastResponseLength);
						lastResponseLength = responseText.length;
						object.update(newText);
					}
				}
			});
			req.send();
			this['#req'] = req;
		},
		
		update: function(text) { }
        
    };
    
    return constructor;
    
}());
var object = {Client: Client};return object;})();var HtmlNodes = (function() {var Data = Html.Elements.ContainerElement.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 		messageHandler:		Optional. A MessageHandler to use when sending the Message.
		 * 		message:			Optional. Either a Message or an options object to use for creating a new Message.
		 * 		showBusy:			Optional. Whether to indicate when the data node is busy. Default: true
		 */
		
	this['#base:{constructor}'] = Html.Elements.ContainerElement; Html.Elements.ContainerElement.call(this, options);
		
		this['#messageHandler'] = options.messageHandler;
		
		if(!this['#messageHandler']) {
			this['#messageHandler'] = new MessageHandler();
		}
		
		this['#showBusy'] = options.showBusy !== false;
		
		this['#busyNode'] = new Html.TextNode({
			text: 'Loading...'
		});
		
		if(options.message) {
			this.send(options.message);
		}
		
	};
	
	extend(constructor, {
		tag: 'data'
	});
	
	constructor.prototype = {
		
		unitName: 'Data',
		
		'#messageHandler': null,
		'#showBusy': true,
		'#busyNode': null,
		
		send: function(message) {
			
			if(!(message instanceof MessageHandler.Message)) {
				message = new MessageHandler.Message(message);
			}
			
			message.dataNode = this;
			
			message.on({
				response: function() {
					this.dataNode.statusChange(false);
				},
				error: function() {
					this.dataNode.statusChange(false);
				}
			});
			
			this.statusChange(true);
			
			this['#messageHandler'].send(message);
			
		},
		
		statusChange: function(busy) {
			if(this['#showBusy']) {
				if(busy) {
					this['#busyNode'].attach(this);
				} else {
					this['#busyNode'].detach();
				}
			}
		}
		
	};
	
	return constructor;
	
}());
/* An HtmlData Element attaches any returned HTML automatically.
 * A normal Data Element merely serves as a placeholder in a document, but the data must be inserted manually.
 * The HTML returned is expected to be contained in <html>..</html> tags, although
 * no <body> tag is expected (any contents between the <html>..</html> tags will be
 * inserted directly into the HtmlData Element).
 */

var HtmlData = Data.sub(function() {
	
	var constructor = function(options) {
		
	this['#base:{constructor}'] = Data; Data.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'HtmlData',
		
		'#message': null,
		
		send: function(message) {
			
			if(!(message instanceof MessageHandler.Message)) {
				message = new MessageHandler.Message(message);
			}
			
			if(this['#message']) {
				this['#messageHandler'].cancel(this['#message']);
			}
			this['#message'] = message;
			
			message.on({
				response: function(v) {
					var re = v.arguments[0];
					var s = re.getText();
					this.dataNode.update(s);
				}
			});
			
			this.empty();
			
			Data.prototype.send.call(this, message);
			
		},
		
		update: function(html) {
			
			var iStart = html.toLowerCase().indexOf('<html>');
			var iEnd = html.toLowerCase().indexOf('</html>');
			var s;
			
			if(iStart == -1 || iEnd < iStart) {
				throw 'HTML not recognized by HtmlDataNode';
			}
			
			s = html.substring(iStart + 6, iEnd);
			
			this.empty();
			this.dom.innerHTML = s;
			
		}
		
	};
	
	return constructor;
	
}());
var object = {Data: Data,HtmlData: HtmlData};return object;})();var MessageHandler = Unit.sub(function() {
	// TODO: add timeout so a failed request doesn't block other requests
	
	var Message = Unit.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 		
		 * 		method:		Optional. The method to use when connecting to the host. Default: POST
		 * 		
		 * 		url:		Optional. The url to connect to.
		 * 		
		 * 		data:		Optional. The data to send as the body of a POST request or in the uri of a GET request.
		 * 					The data can be either a string, a number, a Hashtable, or an object literal.
		 * 		
		 */
		
		if(!options) {
			options = { };
		}
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
		if(options.method) {
			this.method = options.method;
		}
		
		if(options.url) {
			this.url = options.url;
		}
		
		if(typeof options.data != 'undefined') {
			this.data = options.data;
		}
		
		this.data = constructor.encode(this.data);
		
		if(this.data && this.method.toUpperCase() == 'GET') {
			this.url += '?' + this.data;
		}
		
	};
	
	function dataEncode(s) {
		
		if(s instanceof Html.Elements.FormElement) {
			s = s.getValue();
		}
		
		s = escape(s);
		
		s = s.replace(/\+/g, '%2b');
		
		return s;
		
	}
	
	extend(constructor, {
		encode: function(data) {
			
			var s;
			
			if(typeof data == 'string' || typeof data == 'number') {
				
				s = data;
				
			} else if(data instanceof Hashtable) {
				
				s = '';
				
				data.forEach(function(value, name) {
					s += dataEncode(name) + '=' + dataEncode(value) + '&';
				});
				
				if(s != '') {
					s = s.substring(0, s.length - 1);
				}
				
			} else { // object literal
				
				s = '';
				
				for(var i in data) {
					s += dataEncode(i) + '=' + dataEncode(data[i]) + '&';
				}
				
				if(s != '') {
					s = s.substring(0, s.length - 1);
				}
				
			}
			
			return s;
			
		}
	});
	
	constructor.prototype = {
		
		unitName: 'Message',
		
		method: 'GET',
		url: null,
		data: '',
		
		response: function(response) {
			this.done();
		},
		error: function() {
			this.done();
		},
		done: function() { } // called whether the request was successful or an error
		
	};
	
	return constructor;
	
}());var Response = Unit.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 		request:	The Request object used to send the Message.
		 */
		
		this.request = options.request;
		
	};
	
	constructor.prototype = {
		
		unitName: 'Response',
		
		request: null,
		
		getText: function() {
			return this.request.getResponseText();
		},
		
		getXml: function() {
			return this.request.getResponseXml();
		},
		
		getJson: function() {
			return Json.parse(this.request.getResponseText());
		}
		
	};
	
	return constructor;
	
}());
	
	var constructor = function(options) {
		/* options
		 * 		maxConnections:		Optional. The maximum number of allowed simultaneous connections.
		 * 							Default is 1.
		 * 		retry:				Optional. Retries options or simply the attempts option.
		 * 			attempts:			Optional. The number of retry attempts if a message fails. -1 for infinite.
		 * 								Default is 0.
		 * 			interval:			Optional. An interval of time (in milliseconds) to wait before retrying.
		 * 								Default is currently 3000, but this behavior is subject to change in the future.
		 * 								Do not rely on it. If a certain behavior for interval is desired, it is better to set it manually.
		 * 			methods:			Optional. An array of methods that should be retried. Any other methods will not be retried.
		 * 								Default: [ 'GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS' ] (Idempotent Methods)
		 * 								See http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html
		 * 								To specify all methods set retry to 'all'.
		 * 								Note: TRACE is not included in the defaults because of XST vulnerabilities.
		 * 			preserveOrder:		TODO: implement this option and make requests skip ones waiting for a retry if this option is not set to true.
		 * 		antiCaching:		True or False. If true, MessageHandler will take extra measures to prevent browsers
		 * 							from caching AJAX messages (by appending a random query string).
		 */
		
		var mh = this;
		
		if(!options) {
			options = { };
		}
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
		var mh = this;
		
		if(!options.maxConnections) {
			options.maxConnections = 1;
		}
		
		if(options.retry) {
			/* methods is cloned so that if the array is altered on one instance,
			 * it won't be altered on all instances.
			 */
			this.retry.methods = Collection.cloneToArray(this.retry.methods);
			if(typeof options.retry == 'number') {
				this.retry.attempts = options.retry;
			} else {
				if(options.retry.attempts) {
					this.retry.attempts = options.retry.attempts;
				}
				if(retry.interval) {
					this.retry.interval = options.retry.interval;
				}
				if(retry.methods) {
					this.retry.methods = options.retry.methods;
				}
			}
		}
		
		if(options.antiCaching) {
			this.antiCaching = options.antiCaching;
		}
		
		this['#idleRequests'] = new Collection();
		this['#busyRequests'] = new Collection();
		this['#queue'] = new Collection();
		
		for(var i = 0; i < options.maxConnections; i++) {
			this['#idleRequests'].push(new Request({
				
				on: {
					
					readystatechange: function() {
						
						if(this.getReadyState() == 4) {
							// TODO: deal with 3xx status codes.. probably by redirecting the request
							
							var req = this;
							var status = this.getStatus();
							var sendNext = true;
							var permitRetry = false, retryAttempts, retryMethods, method;
							
							if(status >= 200 && status < 300) {
								
								this.message.response(new Response({
									request: this
								}));
								
								if(this.message['#mh:temporary']) {
									this.message.dispose();
								}
								
							} else if(
								status == 0 // Unable to connect.
								|| (status >= 400 && status < 600)
							) {
								
								if(!this['#tries']) {
									this['#tries'] = 1;
								} else {
									this['#tries']++;
								}
								
								// Check to see if the method used is allowed to retry
								retryMethods = mh.retry.methods;
								if(retryMethods == 'all') {
									permitRetry = true;
								} else {
									method = this.message.method.toLowerCase();
									for(var i = 0; i < retryMethods.length; i++) {
										if(retryMethods[i].toLowerCase() == method) {
											permitRetry = true;
											break;
										}
									}
								}
								
								retryAttempts = mh.retry.attempts;
								
								if(permitRetry && (retryAttempts == -1 || retryAttempts >= this['#tries'])) {
									setTimeout(function() {
										sendMessage(req, req.message, mh.antiCaching);
									}, mh.retry.interval);
									sendNext = false;
								} else {
									this.message.error({ // TODO: better error information. perhaps make an object for it.
										status: status
									});
									if(this.message['#mh:temporary']) {
										this.message.dispose();
									}
								}
								
							} else {
								throw 'Status code ' + status + ' not expected.';
							}
							
							if(sendNext) {
								if(mh['#queue'].length > 0) {
									sendMessage(this, mh['#queue'].shift(), mh.antiCaching);
								} else {
									mh['#busyRequests'].purge(this);
									mh['#idleRequests'].unshift(this);
								}
							}
							
						}
						
					}
					
				}
				
			}));
		}
		
	};
	
	function sendMessage(req, message, antiCaching) {
		
		var url;
		
		req.message = message;
		
		url = message.url;
		if(antiCaching) {
			if(url.indexOf('?') != -1) {
				url += '&-joi-XAC=' + JMath.Random.getString(8);
			} else {
				url += '?-joi-XAC=' + JMath.Random.getString(8);
			}
		}
		
		req.open({
			method: message.method,
			url: url,
			async: true
		});
		
		req.send(message.data);
		
	}
	
	extend(constructor, {
		
		Message: Message,
		Response: Response
		
	});
	
	extend(constructor.prototype, {
		
		unitName: 'MessageHandler',
		
		'#idleRequests': null,
		'#busyRequests': null,
		'#queue': null,
		
		antiCaching: false,
		retry: {
			attempts: 0, // 0 is the default since it can't be certain a failed message didn't produce action on the server.
			interval: 3000,
			methods: [ 'GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS' ] // This is cloned by each new instance so that if one array is altered it doesn't alter all.
		},
		
		send: function(/* options, options, options, ... */) {
			/* options
			 * 		message:	Either a Message object or an options object to use when creating a Message object.
			 * 					If the message member is empty, a new Message object will be created using the options
			 * 					passed to send.
			 * 
			 * multiple messages can be sent in one call to send.
			 */
			
			var options;
			
			for(var i = 0; i < arguments.length; i++) {
				
				options = arguments[i];
				
				if(!options.message) {
					options = {
						message: options
					};
				}
				
				if(!(options.message instanceof Message)) {
					options.message = new Message(options.message);
					options.message['#mh:temporary'] = true;
				}
				
				var req;
				
				if(this['#idleRequests'].length > 0) {
					
					req = this['#idleRequests'].shift();
					this['#busyRequests'].push(req);
					
					sendMessage(req, options.message, this.antiCaching);
					
				} else {
					
					this['#queue'].push(options.message);
					
				}
				
			}
			
		},
		
		cancel: function(message) {
			
			var found = false;
			
			this['#busyRequests'].forEach(function(u) {
				if(u.message == message) {
					u.abort();
					found = true;
					return true;
				}
			});
			
			if(found) {
				return;
			}
			
			this['#queue'].purge(message);
			
		}
		
	});
	
	return constructor;
	
}());var object = {Comet: Comet,HtmlNodes: HtmlNodes,MessageHandler: MessageHandler,getDefaultHandler: getDefaultHandler,Json: Json,Request: Request,send: send};return object;})();var Quicksand = (function() {
	
	/*# Quicksand
 *# Developed by Nathan Wall
 *# http://quicksand.joijs.com/
 *# 
 *# Design goals: Speed and accurate results are the top priorities for Quicksand.
 *# Readability and maintainability take a backseat to the speed of this library.
 *# This version of Quicksand is built for HTML only, but QuicksandParser fully
 *# supports Selectors Levels 3 (and the current draft of Selectors Level 4), including
 *# XML properties (such as namespaces). It wouldn't be hard to port Quicksand
 *# to XML or to use QuicksandParser as a foundation for building an XML selector.
 */

var Quicksand = (function() {
	
	'use strict';
	
	var undefined,
		
		fPush = Array.prototype.push,
		fUnshift = Array.prototype.unshift,
		fSplice = Array.prototype.splice,
		
		documentElement = document.documentElement,
		supportsHasAttribute = !!documentElement.hasAttribute,
		
		nextElId = 1,
		
		// Quicksand will produce an array of "fast track" regexes which can be used
		// to determine if there is a faster algorithm for finding a selection than
		// the full selector algorithm.
		fastTrack = [ ],
		fastTrackCache = { },
		
		supportsGetAttribute = !!documentElement.getAttribute,
		
		customPseudoClasses = { };
	 
	var		/* -- CONSTANTS --
		 * The numbering is based on the first draft of Selectors 4.
		 * Most of the numbering comes from the draft but is trivial in meaning (and subject to change).
		 * However, numbers in the 4xxxx range (40,000 to 49,999) represent
		 * Selector Level 4 additions and are therefore subject to change or removal.
		 * Numbers in the 9xxxx range (90,000 to 99,999) represent non-standard additions.
		 * Numbers in the 10xxxx range (100,000 to 199,999) are reserved for custom pseudo-classes.
		 * Negative numbers are references to highly experimental non-standard additions.
		 * An addition is considered highly-expiremental if there is good reason it may change
		 * or be removed in the future.
		 */
		
		// [ 14 Combinators ]
		DESCENDANT_COMBINATOR = 1401,
		CHILD_COMBINATOR = 1402,
		ADJACENT_SIBLING_COMBINATOR = 1403,
		GENERAL_SIBLING_COMBINATOR = 1404,
		REFERENCE_COMBINATOR = 41405, // CSS4
		
		// [ Pseudo-Classes ]
		
		// 4 Logical Combinations
		MATCHES_PSEUDOCLASS = 40401, // CSS4
		NOT_PSEUDOCLASS = 402,
		CONTAINS_PSEUDOCLASS = 90403, // non-standard
		
		// 7 Location Pseudo-classes
		ANY_LINK_PSEUDOCLASS = 40701, // CSS4
		LINK_PSEUDOCLASS = 702,
		VISITED_PSEUDOCLASS = 703,
		LOCAL_LINK_PSEUDOCLASS = 40704, // CSS4
		TARGET_PSEUDOCLASS = 705,
		SCOPE_PSEUDOCLASS = 40706, // CSS4
		
		// 8 User Action Pseudo-classes
		HOVER_PSEUDOCLASS = 801,
		ACTIVE_PSEUDOCLASS = 802,
		FOCUS_PSEUDOCLASS = 803,
		
		// 9 Time-dimensional Pseudo-classes
		CURRENT_PSEUDOCLASS = 40901, // CSS4
		PAST_PSEUDOCLASS = 40902, // CSS4
		FUTURE_PSEUDOCLASS = 40903, // CSS4
		
		// 10 Linguistic Pseudo-classes
		DIR_PSEUDOCLASS = 41001, // CSS4
		LANG_PSEUDOCLASS = 1002,
		
		// 11 UI States Pseudo-classes
		ENABLED_PSEUDOCLASS = 1101,
		DISABLED_PSEUDOCLASS = 1102,
		CHECKED_PSEUDOCLASS = 1103,
		UNCHECKED_PSEUDOCLASS = 91104, // non-standard
		INDETERMINATE_PSEUDOCLASS = 41105, // CSS4 (reserved in CSS3 but not implemented)
		DEFAULT_PSEUDOCLASS = 41106, // CSS4
		VALID_PSEUDOCLASS = 41107, // CSS4
		INVALID_PSEUDOCLASS = 41108, // CSS4
		IN_RANGE_PSEUDOCLASS = 41109, // CSS4
		OUT_OF_RANGE_PSEUDOCLASS = 41110, // CSS4
		REQUIRED_PSEUDOCLASS = 41111, // CSS4
		OPTIONAL_PSEUDOCLASS = 41112, // CSS4
		READ_ONLY_PSEUDOCLASS = 41113, // CSS4
		READ_WRITE_PSEUDOCLASS = 41114, // CSS4
		
		// 12 Tree-Structural Pseudo-classes
		ROOT_PSEUDOCLASS = 1201,
		NTH_CHILD_PSEUDOCLASS = 1202,
		NTH_LAST_CHILD_PSEUDOCLASS = 1203,
		NTH_OF_TYPE_PSEUDOCLASS = 1204,
		NTH_LAST_OF_TYPE_PSEUDOCLASS = 1205,
		NTH_MATCH_PSEUDOCLASS = 41206, // CSS4
		NTH_LAST_MATCH_PSEUDOCLASS = 41207, // CSS4
		NTH_PSEUDOCLASS = -1208, // non-standard (highly expiremental); Quicksand proposal replacement for CSS4 :nth-matches
		NTH_LAST_PSEUDOCLASS = -1209, // non-standard (higly experimental); Quicksand proposal; Quicksand proposal replacement for CSS4 :nth-last-matches
		FIRST_CHILD_PSEUDOCLASS = 1210,
		LAST_CHILD_PSEUDOCLASS = 1211,
		FIRST_OF_TYPE_PSEUDOCLASS = 1212,
		LAST_OF_TYPE_PSEUDOCLASS = 1213,
		ONLY_CHILD_PSEUDOCLASS = 1214,
		ONLY_OF_TYPE_PSEUDOCLASS = 1215,
		EMPTY_PSEUDOCLASS = 1216,
		
		// 13 Grid-Structural Pseudo-classes
		COLUMN_PSEUDOCLASS = 41301, // CSS4
		NTH_COLUMN_PSEUDOCLASS = 41302, // CSS4
		NTH_LAST_COLUMN_PSEUDOCLASS = 41303, // CSS4
		
		// [ 6 Attribute Selectors ]
		HAS_ATTRIBUTE_OPERATOR = 601,
		EQUALS_ATTRIBUTE_OPERATOR = 602,
		CONTAINS_WORD_ATTRIBUTE_OPERATOR = 603,
		STARTS_WITH_DASH_ATTRIBUTE_OPERATOR = 604,
		STARTS_WITH_ATTRIBUTE_OPERATOR = 605,
		ENDS_WITH_ATTRIBUTE_OPERATOR = 606,
		CONTAINS_ATTRIBUTE_OPERATOR = 607,
		DOESNT_EQUAL_ATTRIBUTE_OPERATOR = 90608, // non-standard
		DOESNT_CONTAIN_WORD_ATTRIBUTE_OPERATOR = 90609, // non-standard
		DOESNT_START_WITH_DASH_ATTRIBUTE_OPERATOR = 90610, // non-standard
		DOESNT_START_WITH_ATTRIBUTE_OPERATOR = 90611, // non-standard
		DOESNT_END_WITH_ATTRIBUTE_OPERATOR = 90612, // non-standard
		DOESNT_CONTAIN_ATTRIBUTE_OPERATOR = 90613, // non-standard
		
		// namespace constants
		NO_NAMESPACE = 401,
		DEFAULT_NAMESPACE = 402;
	
	var LOCAL_LINK_PARTIAL_ATTRIBUTE_OPERATOR = 100000,
		LOCAL_LINK_EXACT_ATTRIBUTE_OPERATOR = 100001;
	
	// include and setup QuicksandParser
	/*# QuicksandParser
 *# Developed by Nathan Wall
 *# http://quicksand.joijs.com/
 *# 
 *# Design goals: Create a readable, maintainable, CSS selector parser which
 *# conforms to Selectors Level 3 and Selectors Level 4, with the aim of producing
 *# selector objects which can be processed quickly to produce element results in
 *# the document. Unlike Quicksand, speed is not a top priority with QuicksandParser
 *# because the results can be cached.
 */

var QuicksandParser = (function() {
	
	/* Selectors Level 4 in this parser is based on:
	 * "W3C Working Draft 29 September 2011."
	 * http://www.w3.org/TR/selectors4/
	 */
	
	var undefined,
		
		/* css4Enabled is an expiremental feature. Due to the fact that CSS4 selectors
		 * are currently only in a first draft, this specification could change.
		 * Quicksand will adapt to the changes in the CSS4 specification as it is developed.
		 * To enable CSS4 features, use QuicksandParser.enableCss4();
		 */
		css4Enabled = false,
		
		/* extendedEnabled determines whether Quicksand's extended selector features are
		 * enabled.  If set to false, only standardized Selector Level 3 or 4 features will
		 * be available.
		 * To enable Quicksand's extended features, use QuicksandParser.enableExtended();
		 */
		extendedEnabled = false,
		
		/* experimentalEnabled can be used to enable extended selector features which are
		 * considered highly experimental. The difference between "experimental" and "extended"
		 * features is experimental features are considered likely to be open to change or
		 * removal in future versions of Quicksand, while extended features are considered
		 * more stable.
		 */
		experimentalEnabled = false,
		
		/* Allows the enabling of subject selectors ($) even if Css4Enabled is false.
		 * This is to account for the fact that a library may want to enable subject selectors without
		 * enabling broad CSS4 support and for the fact that subject selectors cannot be used with a prefix. 
		 * Note: If Css4Enabled is true, subject selectors will work even if subjectEnabled is false.
		 */
		subjectEnabled = false,
		
		/* Two subject modes are supported: ! and $
		 * In ! mode, the subject identifier (!) needs to be appended to the compound selector.
		 * In $ mode, the subject idetenfier ($) needs to be prepended to the compound selector.
		 */
		subjectMode = '!',
		
		/* Allows custom prefixes. Selector prefixes can be added with enableCss4, enableExtended,
		 * and enableExperimental. Note: The "-qs-" prefix is enabled by default but can be disabled
		 * with disableCss4, disableExtended, and disableExperimental.
		 */
		selectorPrefixes = [
			{
				prefix: '-qs-',
				css4: true,
				extended: true,
				experimental: true
			}
		],
		
		cacheEnabled = false,
		
		selectorCache = {
			selectorLists: { },
			itemSelectors: { }
		},
				
		reWhitespace = /\s/,
		
		subjectSet = false,
		
		nextCustomIdBase = 0;
	
	
	
	var parseSelector = (function() {
	
	var cache = selectorCache.itemSelectors;
	
	function parseSelector(selector, disableAutoUniversal, preTrimmed) {
		// disableAutoUniversal is used by :not to parse a selector without inserting an auto '*' type
		
		if(selector == '') throw 'QuicksandParser: Empty selector';
		
		var pSel = [ ], // The full parsed selector-list
			cpSel = [ ], // The current parsed selector
			pos = 0, xpos, res, firstPass, curCombinator = { type: DESCENDANT_COMBINATOR },
			itemEndGuess, cacheKey, item;
		
		pSel.original = selector;
		
		pSel.push(cpSel);
		
		// Advance past any leading whitespace in the selector.
		while(reWhitespace.test(selector.charAt(pos))) pos++;
		
		firstPass = true;
		subjectSet = false;
		while(pos < selector.length) {
			
			item = null;
			
			// Caching item selectors currently only works on descendant combinators
			if(cacheEnabled && curCombinator.type == DESCENDANT_COMBINATOR) {
				// Make an educated guess of what the compound selector is and see if it has been cached
				itemEndGuess = selector.indexOf(' ', pos);
				if(itemEndGuess == -1) cacheKey = selector.substring(pos);
				else cacheKey = selector.substring(pos, itemEndGuess);
				item = cache[cacheKey];
				if(item) {
					if(itemEndGuess == -1) pos = selector.length;
					else pos += itemEndGuess;
					cpSel.push(item);
				}
			}
			
			if(!item) {
				res = parseCompoundSelector(selector, pos, disableAutoUniversal);
				if(res) {
					item = {
						combinator: curCombinator,
						compoundSelector: res.cSel
					};
					if(cacheEnabled && pos == itemEndGuess) cache[cacheKey] = item;
					cpSel.push(item);
					pos = res.pos;
				} else if(!firstPass || !QuicksandParser.allowInitialCombinator) {
					throw 'QuicksandParser: Selector not understood at character ' + pos + ': ' + selector
						+ (firstPass ? '\nIf you are trying to start a selector with a combinator, allowInitialCombinator must be set to true' : '');
				}
			}
			firstPass = false;
			
			if(pos == selector.length) break;
			
			// Advance past any whitespace to see if the next character is a comma
			xpos = pos;
			while(reWhitespace.test(selector.charAt(xpos))) xpos++;
			if(selector.charAt(xpos) == ',') {
				pos = xpos;
				firstPass = true;
				subjectSet = false;
				cpSel = [ ];
				pSel.push(cpSel);
				pos++;
				// Advance past any leading whitespace in the selector.
				while(reWhitespace.test(selector.charAt(pos))) pos++;
			} else {
				
				res = parseCombinator(selector, pos);
				curCombinator = res.combSel;
				pos = res.pos;
				
				if(pos == selector.length && curCombinator) {
					if(QuicksandParser.allowTerminalCombinator) {
						cpSel.push({
							combinator: curCombinator,
							compoundSelector: {
								type: {
									namespace: DEFAULT_NAMESPACE,
									name: '*'
								}
							}
						});
					} else throw 'QuicksandParser: Selectors cannot end in a combinator unless allowTerminalCombinator is turned on: ' + selector;
				}
				
			}
			
		}
		
		return pSel;
		
	}
		
	return parseSelector;
	
})();
	var parseCombinator = (function() {
	
	function parseCombinator(selector, pos) {
		
		var combSel = { }, whitespaceFound = false, res;
		
		// Advance past whitespace
		while(reWhitespace.test(selector.charAt(pos))) {
			whitespaceFound = true;
			pos++;
		}
		
		if(pos >= selector.length) {
			// Don't mistake whitespace at the end of a selector for a descendant combinator.
			return {
				combSel: null,
				pos: pos
			};
		}
		
		switch(selector.charAt(pos)) {
			case '>': pos++; combSel.type = CHILD_COMBINATOR; break;
			case '+': pos++; combSel.type = ADJACENT_SIBLING_COMBINATOR; break;
			case '~': pos++; combSel.type = GENERAL_SIBLING_COMBINATOR; break;
			case '/': // CSS4
				if(!css4Enabled) throw 'QuicksandParser: Reference combinators are not allowed when CSS4 mode is disabled. To enable use ' + QuicksandParser.libName + '.enableCss4();';
				pos++;
				combSel.type = REFERENCE_COMBINATOR;
				res = getQualifiedName(selector, pos, true);
				pos = res.pos;
				if(res.namespace == DEFAULT_NAMESPACE) res.namespace = NO_NAMESPACE; // See [NOTE A] in loadAttribute
				combSel.attribute = {
					namespace: res.namespace,
					name: res.name
				};
				if(selector.charAt(pos) == '/') pos++;
				else throw 'QuicksandParser: Reference combinator not understood at character ' + pos + ' in selector: ' + selector;
				break;
			default:
				if(whitespaceFound) combSel.type = DESCENDANT_COMBINATOR;
				else throw 'QuicksandParser: Combinator expected but not found at position ' + pos + ' in selector: ' + selector;
				break;
		}
		
		// Advance past whitespace
		while(reWhitespace.test(selector.charAt(pos))) pos++;
		
		return {
			combSel: combSel,
			pos: pos
		};
		
	}
	
	return parseCombinator;
	
})();
	var parseCompoundSelector = (function() {
	
	function parseCompoundSelector(selector, pos, disableAutoUniversal) {
		
		if(pos >= selector.length) return null;
		
		var cSel, // The compound selector object
			c, res, initPos = pos, isSubject,
			checkFilterLast = false; // make sure the filter (:nth or :nth-last) is the last part of the compound selector
			
		cSel = { };
		
		if(selector.charAt(pos) == '$') {
			if(subjectMode == '$') {
				if(!css4Enabled && !subjectEnabled) throw 'QuicksandParser: Subject selectors ($) cannot be used in CSS3 mode. To enable use ' + QuicksandParser.libName + '.enableCss4() or ' + QuicksandParser.libName + '.enableSubject().';
				if(subjectSet) throw 'QuicksandParser: A selector cannot have two subjects (character ' + pos + '): ' + selector;
				// This is the subject of the selector
				cSel.subject = true;
				pos++;
				subjectSet = true;
				isSubject = true;
			} else throw 'QuicksandParser: Symbol not expected ($). If you are trying to use a subject selector, set subject mode to "$" using ' + QuicksandParser.libName + '.enableSubject("$").';
		}
		
		// Get the type (tag) selector
		res = getQualifiedName(selector, pos, true);
		cSel.type = {
			namespace: res.namespace,
			name: res.name
		};
		if(!cSel.type.name && !disableAutoUniversal) cSel.type.name = '*';
		pos = res.pos;
		
		while(c = selector.charAt(pos)) {
			
			if(cSel.filter) {
				if(checkFilterLast) throw 'QuicksandParser: The pseudo-classes :nth and :nth-last must be the last part of a compound selector.';
				else checkFilterLast = true;
			}
			
			switch(c) {
				case '#': pos = loadId(cSel, selector, pos + 1); break;
				case ':': pos = loadPseudoClass(cSel, selector, pos + 1); break;
				case '.': pos = loadClass(cSel, selector, pos + 1); break;
				case '[': pos = loadAttribute(cSel, selector, pos + 1); break;
				default:
					// Return null if no selectors were found
					if(pos == initPos) return null;
					else if(isSubject && pos - 1 == initPos) {
						// The only thing in this compount selector was the subject selector.
						throw 'QuicksandParser: The subject identifier cannot be alone (character ' + pos + '): ' + selector;
					} else {
						if(c == '!') {
							if(subjectMode == '!') {
								if(!css4Enabled && !subjectEnabled) throw 'QuicksandParser: Subject selectors (!) cannot be used in CSS3 mode. To enable use ' + QuicksandParser.libName + '.enableCss4() or ' + QuicksandParser.libName + '.enableSubject().';
								if(subjectSet) throw 'QuicksandParser: A selector cannot have two subjects (character ' + pos + '): ' + selector;
								cSel.subject = true;
								pos++;
								subjectSet = true;
								isSubject = true;
							} else throw 'QuicksandParser: Symbol not expected (!). If you are trying to use a subject selector, set subject mode to "!" using ' + QuicksandParser.libName + '.enableSubject("!").';
						}
						return {
							cSel: cSel,
							pos: pos
						};
					}
			}
			
		}
		
		if(checkFilterLast) throw 'QuicksandParser: The pseudo-classes :nth and :nth-last must be the last part of a compound selector.';
		
		// Return null if no selectors were found
		if(pos == initPos) return null;
		else if(isSubject && pos - 1 == initPos) {
			// The only thing in this compount selector was the $ symbol.
			throw 'QuicksandParser: The subject identifier ($) must be prepended to a compound selector (character ' + pos + '): ' + selector;
		} else return {
			cSel: cSel,
			pos: pos
		};
		
	}
		
	return parseCompoundSelector;
	
})();
	var getQualifiedName = (function() {
	
	function getQualifiedName(selector, pos, allowWildcard) {
		/* There are two types of blank namespaces.
		 * foo 		- will have a namespace of DEFAULT_NAMESPACE
		 * |foo		- will have a namespace of NO_NAMESPACE
		 */
		
		var res, namespace, name;
		
		res = getIdentifier(selector, pos);
		name = res.identifier;
		pos = res.pos;
		
		if(!name) {
			if(allowWildcard && selector.charAt(pos) == '*') {
				name = '*';
				pos++;
			} else name = undefined;
		}
		
		if(selector.charAt(pos) == '|') {
			// namespace
			
			res = getIdentifier(selector, pos + 1);
			
			if(res.pos != pos + 1) {
				// Only accept an identifier. This helps with cases like "div[attr|=value]" because otherwise "attr" is seen
				// as a namespace with no name following the "|". But in this case "|=" is an operator.
				namespace = name;
				name = res.identifier;
				pos = res.pos;
				
				if(!name) {
					if(allowWildcard && selector.charAt(pos) == '*') {
						name = '*';
						pos++;
					} else name = undefined;
				}
				
				if(!namespace) namespace = NO_NAMESPACE;
			}
			
		} else namespace = DEFAULT_NAMESPACE;
		
		return {
			namespace: namespace,
			name: name,
			pos: pos
		};
		
	}
	
	return getQualifiedName;
	
})();
	var getIdentifier = (function() {
	
	var reNextNonWord = /[^\w\-]/,
		reNumber = /[0-9]/;
	
	function getIdentifier(selector, pos) {
		
		var initPos = pos, c, nextNW, res, realPosDiff = 0;
		
		c = selector.charAt(pos);
		if(reNumber.test(c)) {
			// identifier cannot start with a number
			return {
				identifier: null,
				pos: pos
			};
		}
		
		if(c == '-') {
			c = selector.charAt(pos + 1);
			if(c == '-' || reNumber.test(c)) {
				// identifier cannot start with two hyphens or a hyphen and a number
				return {
					identifier: null,
					pos: pos
				};
			}
		}
		
		while(pos < selector.length) {
			nextNW = selector.substring(pos).search(reNextNonWord);
			if(~nextNW) pos += nextNW;
			else {
				// All remaining characters are word characters, so return the rest of the string
				pos = selector.length;
				return {
					identifier: selector.substring(initPos),
					pos: pos
				};
			}
			c = selector.charAt(pos);
			if(c == '\\') {
				res = replaceEscapedChars(selector, pos);
				pos = res.pos;
				selector = res.selector;
				realPosDiff += res.realPos - pos;
			} else if(c >= '\u00a0') {
				// All characters above U+00A0 can be a part of an identifier
				pos++;
			} else {
				// The end of the identifier has been reached
				break;
			}
		}
		
		return {
			identifier: selector.substring(initPos, pos),
			pos: pos + realPosDiff
		};
		
	}
	
	return getIdentifier;
	
})();
	var loadId = (function() {
	
	function loadId(cSel, selector, pos) {
		
		var res, id;
		
		res = getIdentifier(selector, pos);
		id = res.identifier;
		pos = res.pos;
		
		if(!id) throw 'QuicksandParser: Id selector empty in: ' + selector;
		
		cSel.id = id;
				
		return pos;
		
	}
	
	return loadId;
	
})();
	var pseudoClassTypes,
	requireArgument;

var loadPseudoClass = (function() {
	
	pseudoClassTypes = {
		
		'matches': MATCHES_PSEUDOCLASS,
		'not': NOT_PSEUDOCLASS,
		'contains': CONTAINS_PSEUDOCLASS,
		
		'any-link': ANY_LINK_PSEUDOCLASS,
		'link': LINK_PSEUDOCLASS,
		'visited': VISITED_PSEUDOCLASS,
		'local-link': LOCAL_LINK_PSEUDOCLASS,
		'target': TARGET_PSEUDOCLASS,
		'scope': SCOPE_PSEUDOCLASS,
		
		'hover': HOVER_PSEUDOCLASS,
		'active': ACTIVE_PSEUDOCLASS,
		'focus': FOCUS_PSEUDOCLASS,
		
		'current': CURRENT_PSEUDOCLASS,
		'past': PAST_PSEUDOCLASS,
		'future': FUTURE_PSEUDOCLASS,
		
		'dir': DIR_PSEUDOCLASS,
		'lang': LANG_PSEUDOCLASS,
		
		'enabled': ENABLED_PSEUDOCLASS,
		'disabled': DISABLED_PSEUDOCLASS,
		'checked': CHECKED_PSEUDOCLASS,
		'unchecked': UNCHECKED_PSEUDOCLASS,
		'indeterminate': INDETERMINATE_PSEUDOCLASS,
		'default': DEFAULT_PSEUDOCLASS,
		'valid': VALID_PSEUDOCLASS,
		'invalid': INVALID_PSEUDOCLASS,
		'in-range': IN_RANGE_PSEUDOCLASS,
		'out-of-range': OUT_OF_RANGE_PSEUDOCLASS,
		'required': REQUIRED_PSEUDOCLASS,
		'optional': OPTIONAL_PSEUDOCLASS,
		'read-only': READ_ONLY_PSEUDOCLASS,
		'read-write': READ_WRITE_PSEUDOCLASS,
		
		'root': ROOT_PSEUDOCLASS,
		'nth-child': NTH_CHILD_PSEUDOCLASS,
		'nth-last-child': NTH_LAST_CHILD_PSEUDOCLASS,
		'nth-of-type': NTH_OF_TYPE_PSEUDOCLASS,
		'nth-last-of-type': NTH_LAST_OF_TYPE_PSEUDOCLASS,
		'nth-match': NTH_MATCH_PSEUDOCLASS,
		'nth-last-match': NTH_LAST_MATCH_PSEUDOCLASS,
		'nth': NTH_PSEUDOCLASS,
		'nth-last': NTH_LAST_PSEUDOCLASS,
		'first-child': FIRST_CHILD_PSEUDOCLASS,
		'last-child': LAST_CHILD_PSEUDOCLASS,
		'first-of-type': FIRST_OF_TYPE_PSEUDOCLASS,
		'last-of-type': LAST_OF_TYPE_PSEUDOCLASS,
		'only-child': ONLY_CHILD_PSEUDOCLASS,
		'only-of-type': ONLY_OF_TYPE_PSEUDOCLASS,
		'empty': EMPTY_PSEUDOCLASS,
		
		'column': COLUMN_PSEUDOCLASS,
		'nth-column': NTH_COLUMN_PSEUDOCLASS,
		'nth-last-column': NTH_LAST_COLUMN_PSEUDOCLASS
		
	};
	
	// The following pseudo-classes require arguments
	// False doesn't explicitly need to be set for pseudo-classes which don't require arguments,
	// but I'm doing it for some of them here as a reminder that I didn't just forget them.
	// (To remind myself that they can (or at least sound like they could) be argumentless)
	// TODO: When the next draft of Selectors Level 4 comes out some of these might need to be readdressed.
	requireArgument = {
		'nth-child': true,
		'nth-last-child': true,
		'nth-of-type': true,
		'nth-last-of-type': true,
		'nth-match': true,
		'nth-last-match': true,
		'nth': true,
		'nth-last': true,
		'column': false, // I'm unsure about this one, so I'm just setting it to false for now. Can revisit later and make true if it needs to be.
		'nth-column': true,
		'nth-last-column': true,
		'not': true,
		'matches': true,
		'current': false, // current, past, and future seem like they can be argumentless from the spec
		'past': false,
		'future': false,
		'dir': false,
		'lang': true,
		'contains': true
	};
	
	var reANpB = /^([0-9]+)?n([\+\-][0-9]+)?$|^[\-]?[0-9]+$/, // an+b
		
		/* This may need to be changed as Selectors 4 evolves.
		 * The current draft seems to have " of " separating the arguments, while
		 * I have seen some places with ", " separating the arguments.
		 */
		reNthMatchesSplitter = /\s+of\s+/,
		
		reIsInteger = /^[0-9]+$/,
		reEndWhitespace = /\s+$/,
		reCommaSeparator = /\s*\,\s*/;
	
	function loadPseudoClass(cSel, selector, pos) {
		// returns the position of the end of the pseudo-class
		
		var c, initPos = pos,
			pseudoClassInfo, pseudoClass, pseudoClassName, cPseudoClass,
			res, openParens = 0, argument, matches, realPosDiff = 0, stringOpen,
			_css4Enabled = css4Enabled,
			_extendedEnabled = extendedEnabled,
			_experimentalEnabled = experimentalEnabled;
		
		if(!cSel.pseudoClasses) cSel.pseudoClasses = [ ];
		
		res = getIdentifier(selector, pos);
		pseudoClassName = res.identifier;
		pseudoClass = pseudoClassTypes[ pseudoClassName ];
		if(!pseudoClass) {
			pseudoClassInfo = evaluatePrefix(pseudoClassName);
			if(pseudoClassInfo) {
				pseudoClassName = pseudoClassInfo.identifier;
				pseudoClass = pseudoClassTypes[ pseudoClassName ];
				if(pseudoClassInfo.css4) _css4Enabled = true;
				if(pseudoClassInfo.extended) _extendedEnabled = true;
				if(pseudoClassInfo.experimental) _experimentalEnabled = true;
			}
		}
		pos = res.pos;
		
		// cPseudoClass allows checking custom pseudo-class properties as well
		// (whether they should be considered extended, css4, or experimental).
		cPseudoClass = pseudoClass;
		if(cPseudoClass > 100000) cPseudoClass -= 100000;
		
		if(!pseudoClass) throw 'QuicksandParser: Pseudo-class not recognized: ' + selector.substring(initPos, pos);
		if(!_css4Enabled && cPseudoClass >= 40000 && cPseudoClass < 50000) throw 'QuicksandParser: Pseudo-class not supported in CSS3 mode. Use ' + QuicksandParser.libName + '.enableCss4().';
		if(!_extendedEnabled && cPseudoClass >= 90000 && cPseudoClass < 100000) throw 'QuicksandParser: Pseudo-class not supported in standard mode. Use ' + QuicksandParser.libName + '.enableExtended().';
		if(!_experimentalEnabled && pseudoClass < 0) throw 'QuicksandParser: Pseudo-class not supported in standard mode. Use ' + QuicksandParser.libName + '.enableExperimental().';
		
		c = selector.charAt(pos);
		if(c == '(') {
			
			// load argument
			pos++;
			while(reWhitespace.test(selector.charAt(pos))) pos++; // Advance past any leading whitespace
			initPos = pos;
			openParens = 1;
			stringOpen = false;
			while(c = selector.charAt(pos)) {
				if(!stringOpen && c == ')') {
					openParens--;
					if(openParens == 0) {
						pos++;
						break;
					}
				} else if(!stringOpen && c == '(') openParens++;
				else if(c == '\\')  {
					res = replaceEscapedChars(selector, pos);
					selector = res.selector;
					pos = res.pos - 1;
					realPosDiff += res.realPos - pos;
				} else if(c == '"' || c == "'") {
					stringOpen = !stringOpen;
				}
				pos++;
			}
			argument = selector.substring(initPos, pos - 1);
			// Trim any trailing whitespace from the argument
			if(reEndWhitespace.test(argument)) argument = argument.substring(0, argument.search(reEndWhitespace));
			if(argument == '') throw 'Quicksand Parser: Pseudo-class argument cannot be empty.';
			
			switch(pseudoClass) {
				case NTH_CHILD_PSEUDOCLASS:
				case NTH_LAST_CHILD_PSEUDOCLASS:
				case NTH_OF_TYPE_PSEUDOCLASS:
				case NTH_LAST_OF_TYPE_PSEUDOCLASS:
				case NTH_COLUMN_PSEUDOCLASS:
				case NTH_LAST_COLUMN_PSEUDOCLASS:
					// Argument should be in the form an+b or "even" or "odd"
					matches = matchANpB(argument);
					cSel.pseudoClasses.push({
						pseudoClass: pseudoClass,
						a: matches.a,
						b: matches.b
					});
					break;
				case NTH_PSEUDOCLASS:
				case NTH_LAST_PSEUDOCLASS:
					// Argument should be in the form an+b or "even" or "odd"
					if(cSel.filter) throw 'QuicksandParser: A filter has already been defined for this compound selector: ' + pseudoClass;
					matches = matchANpB(argument);
					cSel.filter = {
						type: pseudoClass,
						a: matches.a,
						b: matches.b
					};
					break;
				case NTH_MATCH_PSEUDOCLASS:
				case NTH_LAST_MATCH_PSEUDOCLASS:
					argument = argument.split(reNthMatchesSplitter);
					if(argument.length != 2) throw 'QuicksandParser: Argument not understood: ' + argument.join(' | ');
					matches = matchANpB(argument[0]);
					cSel.pseudoClasses.push({
						pseudoClass: pseudoClass,
						a: matches.a,
						b: matches.b,
						selector: parseSelector(argument[1])
					});
					break;
				case CURRENT_PSEUDOCLASS:
					// It sounds like, from the draft, :current can be argumentless or have a selector list argument.
				case PAST_PSEUDOCLASS:
				case FUTURE_PSEUDOCLASS:
					// The first draft mentions nothing of :past and :future having an argument, but it seems that they would from their similarity to :current
					// TODO: When next draft comes out, check to see if there's an update to this.
				case COLUMN_PSEUDOCLASS:
					cSel.pseudoClasses.push({
						pseudoClass: pseudoClass,
						selector: parseSelector(argument)
					});
					break;
				case MATCHES_PSEUDOCLASS:
				case NOT_PSEUDOCLASS:
					cSel.pseudoClasses.push({
						pseudoClass: pseudoClass,
						selector: parseSelector(argument, true) // The true argument disables auto-universal type insertion
					});
					break;
				case CONTAINS_PSEUDOCLASS: // non-standard
					// Argument must be a "keyword" or quoted string as per Selectors Candidate Recommendation 13 November 2001
					// http://www.w3.org/TR/2001/CR-css3-selectors-20011113/#content-selectors
					// Since it is unclear what is meant by "keyword", Quicksand allows identifiers.
					cSel.pseudoClasses.push({
						pseudoClass: pseudoClass,
						content: parseStringArgument(argument)
					});
					break;
				case DIR_PSEUDOCLASS:
					// ltr and rtl are the only defined arguments, but the draft says any identifier is "acceptable" and others may be accepted and implemented in the future
					if(!isIdentifier(argument)) throw 'QuicksandParser: Argument for :dir pseudo-class must be a valid identifier.';
					cSel.pseudoClasses.push({
						pseudoClass: pseudoClass,
						direction: argument
					});
					break;
				case LANG_PSEUDOCLASS:
					// Check to make sure the argument is a valid identifier
					cSel.pseudoClasses.push({
						pseudoClass: pseudoClass,
						languages: splitLanguages(argument)
					});
					break;
				case LOCAL_LINK_PSEUDOCLASS:
					// The argument must be an integer
					if(!reIsInteger.test(argument)) throw 'QuicksandParser: Argument for :local-link pseudo-class must be a single integer.';
					cSel.pseudoClasses.push({
						pseudoClass: pseudoClass,
						pathLevels: argument * 1
					});
					break;
				default:
					// Custom pseudo-class arguments aren't handled here, so don't throw an error if the pseudo-class is custom.
					if(pseudoClass < 100000) throw 'QuicksandParser: Argument not expected for pseudo-class ' + pseudoClassName + ': ' + argument;
					cSel.pseudoClasses.push({
						pseudoClass: pseudoClass,
						argument: argument
					});
					break;
			}
			
		} else {
			if(requireArgument[ pseudoClassName ]) throw 'QuicksandParser: Pseudo-class :' + pseudoClassName + ' requires an argument.';
			cSel.pseudoClasses.push({
				pseudoClass: pseudoClass
			});
		}
		
		return pos + realPosDiff;
		
	}
	
	function matchANpB(argument) {
		var matches, a, b;
		argument = argument.toLowerCase();
		if(argument == 'even') { a = 2; b = 0; }
		else if(argument == 'odd') { a = 2; b = 1; }
		else {
			matches = reANpB.exec(argument);
			if(matches) {
				if(~matches[0].indexOf('n')) {
					if(matches[1]) a = matches[1] * 1;
					else a = 1;
					if(matches[2]) b = matches[2] * 1;
					else b = 0;
				} else {
					a = 0;
					b = matches[0] * 1;
				}
			} else throw('QuicksandParser: Pseudo-class argument not understood: ' + argument);
		}
		return {
			a: a,
			b: b
		};
	}
	
	function isIdentifier(test) {
		res = getIdentifier(test, 0);
		return test == res.identifier;
	}
	
	function parseStringArgument(argument) {
		// Accepts a single identifier or a string enclosed in quotes as the arugment
		var c = argument.charAt(0), c2, res, identifier, pos;
		if(c == '"' || c == "'") {
			c2 = argument.charAt(argument.length - 1);
			if(c2 != c) throw 'QuicksandParser: Argument not understood: ' + argument;
			return argument.substring(1, argument.length - 1);
		} else {
			res = getIdentifier(argument, 0);
			identifier = res.identifier;
			pos = res.pos;
			if(pos < argument.length) throw 'QuicksandParser: Argument not understood: ' + argument;
			return identifier;
		}
	}
	
	function splitLanguages(argument) {
		// Note: Although the first Working Draft of Selectors 4 doesn't state that :lang should accept multiple
		// languages, the Editor's Draft (http://dev.w3.org/csswg/selectors4/#lang-pseudo) does.
		var langs = argument.split(reCommaSeparator), lang;
		for(var i = 0; i < langs.length; i++) {
			lang = trim(langs[i]);
			if(lang.substring(0, 2) == '*-') {
				if(!isIdentifier(lang.substring(2))) throw 'QuicksandParser: Arguments for :lang pseudo-class must be valid identifiers or begin with "*-".';
			} else if(!isIdentifier(lang)) throw 'QuicksandParser: Arguments for :lang pseudo-class must be valid identifiers or begin with "*-".';
			if(~lang.indexOf('--')) throw 'QuicksandParser: Argument for :lang should not contain two dashes.';
			lang[i] = lang;
		}
		return langs;
	}
		
	function evaluatePrefix(identifier) {
		var pObj, prefix;
		for(var i = 0; i < selectorPrefixes.length; i++) {
			pObj = selectorPrefixes[i];
			prefix = pObj.prefix;
			if(identifier.substring(0, prefix.length) == prefix) {
				return {
					identifier: identifier.substring(prefix.length),
					css4: pObj.css4,
					extended: pObj.extended,
					experimental: pObj.experimental
				};
			}
		}
		return false;
	}
	
	return loadPseudoClass;
	
})();
	function loadClass(cSel, selector, pos) {
	// returns the position of the end of the class
	
	var res = getIdentifier(selector, pos),
		className = res.identifier,
		pos = res.pos;
	
	if(!cSel.classes) cSel.classes = [ ];
	cSel.classes.push(className);
	
	return pos;
	
}

	var loadAttribute = (function() {
	
	var operatorMap = {
		'=': EQUALS_ATTRIBUTE_OPERATOR,
		'~=': CONTAINS_WORD_ATTRIBUTE_OPERATOR,
		'|=': STARTS_WITH_DASH_ATTRIBUTE_OPERATOR,
		'^=': STARTS_WITH_ATTRIBUTE_OPERATOR,
		'$=': ENDS_WITH_ATTRIBUTE_OPERATOR,
		'*=': CONTAINS_ATTRIBUTE_OPERATOR,
		'!=': DOESNT_EQUAL_ATTRIBUTE_OPERATOR,
		'!~=': DOESNT_CONTAIN_WORD_ATTRIBUTE_OPERATOR,
		'!|=': DOESNT_START_WITH_DASH_ATTRIBUTE_OPERATOR,
		'!^=': DOESNT_START_WITH_ATTRIBUTE_OPERATOR,
		'!$=': DOESNT_END_WITH_ATTRIBUTE_OPERATOR,
		'!*=': DOESNT_CONTAIN_ATTRIBUTE_OPERATOR
	};
	
	function loadAttribute(cSel, selector, pos) {
		
		var res, namespace, name, value, initPos = pos, operator, c;
		
		res = getQualifiedName(selector, pos, true);
		namespace = res.namespace;
		name = res.name;
		pos = res.pos;
		
		// [NOTE A]: According to section 6.4 of the first draft,
		// if no namespace is specified, do not use a default for attributes. The only attributes that should
		// match are those with no namespace. i.e. [foo=bar] is the same as [|foo=bar]
		// The following line makes this explicit.
		if(namespace == DEFAULT_NAMESPACE) namespace = NO_NAMESPACE;
		
		if(!name) throw 'QuicksandParser: Attribute selector not understood at character ' + pos + ' for selector: ' + selector;
		
		c = selector.charAt(pos);
		pos++;
		if(c == ']') {
			// no value / end of attribute selector
			addAttribute(cSel, namespace, name, HAS_ATTRIBUTE_OPERATOR);
			return pos;
		}
		
		// Load operator
		operator = c;
		if(c != '=') {
			while(c = selector.charAt(pos)) {
				operator += c;
				pos++;
				if(c == '=') break;
			}
		}
		operator = operatorMap[operator];
		if(!operator) throw 'QuicksandParser: Attribute selector not understood for selector: ' + selector;
		
		if(!extendedEnabled && operator > 90000) throw 'QuicksandParser: Extended features currently disabled for selector: ' + selector + '\nUse ' + QuicksandParser.libName + '.enableExtended();';
		
		res = getValue(selector, pos);
		value = res.value;
		pos = res.pos;
		
		if(selector.charAt(pos) == ']') {
			addAttribute(cSel, namespace, name, operator, value);
			pos++;
		} else if(reWhitespace.test(selector.charAt(pos))) {
			pos++;
			while(c = selector.charAt(pos)) {
				if(!reWhitespace.test(c)) break;
				pos++;
			}
			if(c == 'i' && selector.charAt(pos + 1) == ']') {
				addAttribute(cSel, namespace, name, operator, value, true);
				pos += 2;
			} else throw 'QuicksandParser: Attribute selector not understood for selector: ' + selector;
		} else throw 'QuicksandParser: Attribute selector not understood for selector: ' + selector;
		
		return pos;
		
	}
	
	function addAttribute(cSel, namespace, name, operator, value, caseInsensitive) {
		var attrSel = {
			namespace: namespace,
			name: name,
			operator: operator
		};
		if(!cSel.attributes) cSel.attributes = [ ];
		if(value) attrSel.value = value;
		if(caseInsensitive) attrSel.caseInsensitive = true;
		cSel.attributes.push(attrSel);
	}
	
	function getValue(selector, pos) {
		
		var c, startQuote, startQuotePos, res;
		
		c = selector.charAt(pos);
		
		if(c == '"' || c == "'") {
			startQuote = c;
			pos++;
			startQuotePos = pos;
			while(c = selector.charAt(pos)) {
				if(c == startQuote) break;
				if(c == '\\') {
					// increase an extra space to skip escaped quotes
					pos++;
					if(!selector.charAt(pos)) break;
				}
				pos++;
			}
			if(!c) {
				return {
					pos: startQuotePos - 1,
					value: ''
				};
			}
			pos++; // Advance past the closing quote
			return {
				value: parseString(selector.substring(startQuotePos, pos - 1)),
				pos: pos
			};
		} else {
			res = getIdentifier(selector, pos);
			return {
				value: res.identifier,
				pos: res.pos
			};
		}
		
	}
	
	function parseString(s) {
		// Remove escaped characters from a string
		var slashPos = s.indexOf('\\'), res, pos;
		while(slashPos != -1) {
			res = replaceEscapedChars(s, slashPos);
			s = res.selector;
			pos = res.pos;
			slashPos = s.indexOf('\\', pos);
		}
		return s;
	}
	
	return loadAttribute;
	
})();
	var replaceEscapedChars = (function() {
	
	var reHexNum = /[0-9a-fA-F]/;
	
	function replaceEscapedChars(selector, pos) {
		
		var hexCount = 0, initPos = pos, c, hexNum,
			
			// realPos is for keeping up with the position in the original string,
			// while pos keeps up with the position as the string changes
			realPos;
		
		pos++; // skip backslash
		c = selector.charAt(pos);
		
		if(reHexNum.test(c)) {
			// An escaped hexidecimal number
			
			do {
				hexCount++;
				pos++;
			} while(reHexNum.test(selector.charAt(pos)) && hexCount < 6);
			realPos = pos; // realPos is the position in the original selector
			
			hexNum = parseInt(selector.substring(initPos + 1, pos), 16);
			if(hexNum == 0) throw 'Quicksand: Hexidecimal value "0" not allowed after an escape character.';
			if(hexNum > 0x10ffff) hexNum = 0xfffd; // replace numbers too large with "replacement character"
			c = hexToChar(hexNum);
			selector = selector.substring(0, initPos) + c + selector.substring(pos);
			// adjust pos to account for the change in the selector
			// c.length is used instead of 1 because some unicode "characters" may have length of 2
			// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/String/fromCharCode
			pos = initPos + c.length;
			
			c = selector.charAt(pos);
			if(reWhitespace.test(c)) {
				// If the hex code was terminated by a whitespace character, then remove it.
				if(c == '\r' && selector.charAt(pos + 1) == '\n') {
					
					// Remove both \r and \n characters if they both follow a hex code
					selector = selector.substring(0, pos) + selector.substring(pos + 2);
					
					// pos is already at the next character after the removed space.
					// No backup or forward operation is needed.
					
					// Increase realPos to account for the extra character
					realPos++;
					
				} else {
					selector = selector.substring(0, pos) + selector.substring(pos + 1);
					// pos is already at the next character after the removed space.
					// No backup or forward operation is needed.
				}
				// Increase realPos to account for the character
				realPos++;
			}
			
		} else if(c == '\n' || c == '\r') {
			/* The specification states that outside of strings a backslash followed by a new line
			 * stands for itself. So skip only the backslash, don't replace anything, and continue
			 * processing at the new line.  In other words, this codepath is left intentionally blank
			 * because nothing should happen in this case.
			 * http://www.w3.org/TR/CSS21/syndata.html#characters
			 * 
			 * TODO: A backslash inside a string followed by a new line should ignore both the backslash
			 * and the new line.  At this time, string processing hasn't been set up, but this issue may
			 * need to be addressed later. For now, replaceEscapedChars is only meant for processing
			 * identifiers, but it could be extended to work for strings as well.
			 */
			
			// The string wasn't changed, so realPos is the same as pos
			realPos = pos;
			
		} else {
			
			// Skip whichever char comes next.
			// just remove the backslash, keeping the following character
			selector = selector.substring(0, pos - 1) + selector.substring(pos);
			
			// pos is automatically advanced past the following character because the length
			// of selector before pos shrinks by 1.
			
			// Increase realPos to account for the escaped character.
			realPos = pos + 1;
			
		}
		
		return {
			pos: pos,
			realPos: realPos,
			selector: selector
		};
		
	}
	
	function hexToChar(h) {
		if(h > 0xFFFF) {
			h -= 0x10000;  
			return String.fromCharCode(0xD800 + (h >> 10), 0xDC00 + (h & 0x3FF));  
		} else return String.fromCharCode(h);
	}
	
	return replaceEscapedChars;
	
})();
	var parseCachableSelector = (function() {
	
	var cache = selectorCache.selectorLists;
	
	function parseCachableSelector(selector) {
		
		var pSel = cache[selector];
		
		if(!pSel) {
			pSel = parseSelector(selector);
			cache[selector] = pSel;
		}
		
		return pSel;
		
	}
	
	return parseCachableSelector;
	
})();
	
	// Library Object Definition
	var QuicksandParser = {
		
		/* Change libName if you would like error messages to display an alternate object for calling
		 * methods like enableExtended, enableCss4, and enableExtended. Please make sure that you
		 * implement these methods on your alternate object.
		 */
		libName: 'QuicksandParser',
		
		version: {
			major: 2,
			minor: 0,
			revision: 0,
			beta: true
		},
		
		parse: parseSelector,
		
		// allowInitialCombinator can be set to true to allow the selector to begin with a combinator.
		allowInitialCombinator: false,
		
		// allowTerminalCombinator can be set to true to allow the selector to end with a combinator.
		allowTerminalCombinator: false,
		
		cache: selectorCache,
		
		enableCache: function(tf) {
			/* Can be used to enable selector caching
			 * Please note that by enabling caching, you must make sure not to modify the returned selector object
			 * unless you want the modifications to be returned on subsequent calls. When caching is turned on
			 * a new object is not created for each call with the same selector. The object is created once and
			 * recycled after that, so any changes to the selector object will remain in the cache.
			 */
			if(tf === undefined) tf = true;
			if(tf) QuicksandParser.parse = parseCachableSelector;
			else QuicksandParser.parse = parseSelector;
			cacheEnabled = !!tf;
		},
		
		enableCss4: function(prefix) {
			// EXPIREMENTAL. See note on css4Enabled variable.
			if(!prefix) css4Enabled = true;
			else getPrefixObject(prefix).css4 = true;
		},
		
		disableCss4: function(prefix) {
			if(!prefix) css4Enabled = false;
			else getPrefixObject(prefix).css4 = false;
		},
		
		enableExtended: function(prefix) {
			if(!prefix) extendedEnabled = true;
			else getPrefixObject(prefix).extended = true;
		},
		
		disableExtended: function(prefix) {
			if(!prefix) extendedEnabled = false;
			else getPrefixObject(prefix).extended = false;
		},
		
		enableExperimental: function(prefix) {
			// EXPIREMENTAL. See note on css4Enabled variable.
			if(!prefix) experimentalEnabled = true;
			else getPrefixObject(prefix).experimental = true;
		},
		
		disableExperimental: function(prefix) {
			if(!prefix) experimentalEnabled = false;
			else getPrefixObject(prefix).experimental = false;
		},
		
		enableSubject: function(symbol) {
			// symbol is optional.
			if(symbol == '$') subjectMode = '$';
			else if(symbol == '!') subjectMode = '!';
			else if(symbol) throw 'QuicksandParser: Symbol not recognized (' + symbol + ') in enableSubject. Please use "$" or "!".';
			subjectEnabled = true;
		},
		
		disableSubject: function() {
			subjectEnabled = false;
		},
		
		addPseudoClass: function(identifier, options) {
			/* options:
			 * 		requireArgument:	true/false. Determines whether an argument is required. Default is false.
			 * 		extended:			true/false. Determines whether the pseudo-class is considered an extended feature. Default is false.
			 * 		css4:				true/false. Determines whether the pseudo-class is considered a CSS4 feature. Overrides extended.
			 * 							Default is false.
			 * 		experimental:		true/false. Determines whether the pseudo-class is considered an experimental feature.
			 * 							Overrides extended and css4. Default is false.
			 * 
			 * Note: Due to QuicksandParser's cache system, the extended, css4, and experimental flags cannot be changed on a second
			 * call to addPseudoClass. The requireArgument option can, however, be changed with a subsequent all using the same identifier.
			 */
			
			var pcId = pseudoClassTypes[identifier],
				preExisted = true;
			
			if(!pcId) {
				pcId = 100000 + (++nextCustomIdBase);
				preExisted = false;
			} else if(pcId < 100000) throw 'QuicksandParser: The pseudo-class cannot be overridden: ' + identifier;
			
			if(options) {
				
				// Do not allow changes in the pseudo-class id for pre-existing identifiers
				if(!preExisted) {
					if(options.experimental) pcId = -pcId;
					else if(options.css4) pcId += 40000;
					else if(options.extended) pcId += 90000;
				}
				
				if(options.requireArgument) requireArgument[identifier] = true;
				else if(options.requireArgument === false) requireArgument[identifier] = false; // allow this option to be changed back to false if it was set to true
				
			}
			
			pseudoClassTypes[identifier] = pcId;
			
			return pcId;
			
		},
		
		getPseudoClass: function(identifier) {
			return pseudoClassTypes[identifier];
		}
		
	};
	
	function getPrefixObject(prefix) {
		for(var i = 0; i < selectorPrefixes.length; i++) {
			if(selectorPrefixes[i].prefix == prefix) {
				return selectorPrefixes[i];
			}
		}
		var pObj = { prefix: prefix };
		selectorPrefixes.push(pObj);
		return pObj;
	}
	
	function trim(s) {
		if(s.trim) return s.trim();
		return s.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
	}
	
	return QuicksandParser;
	
})();
	QuicksandParser.libName = 'Quicksand';
	QuicksandParser.enableCache();
	
	// include fast track selectors
	var setupFastTracks = (function() {
	
	var fastTrack = [ ],
		fastTrackSetup = {
			'^[\\w\\s\\,]+$': getTags,
			'^\\.[\\w\\-]+$': getClass
		};
	
	for(var i in fastTrackSetup) {
		if(fastTrackSetup.hasOwnProperty(i)) {
			fastTrack.push({
				regex: new RegExp(i),
				process: fastTrackSetup[i]
			});
		}
	}
	
	function setupFastTracks(selectorList) {
		// Returns true if fast tracks were set up or false if they weren't
		var str = selectorList.original, track;
		for(var i = 0; i < fastTrack.length; i++) {
			track = fastTrack[i];
			if(track.regex.test(str)) {
				selectorList.algorithm = [[
					{ call: track.process(trim(str)) }
				]];
				return true;
			}
		}
		return false;
	}
	
	function getBody() {
		return function(p) {
			var parent = p[0];
			if(parent == document || parent == documentElement) {
				return [ document.body ];
			} else {
				return [ ];
			}
		};
	}
	
	function getBodyAndTag(selector) {
		var matches = /^body\s+([\w]+)$/.exec(selector);
		return function(p) {
			var selection, parent = p[0];
			if(parent == document || parent == documentElement) {
				selection = [ ];
				fPush.apply(selection, document.body.getElementsByTagName(matches[1]));
				return selection;
			} else {
				return [ ];
			}
		};
	}
	
	function getTag(selector) {
		return function(p) {
			var selection = [ ];
			fPush.apply(selection, p[0].getElementsByTagName(selector));
			return selection;
		};
	}
	
	function getTags(selector) {
		if(~selector.indexOf(',')) return getEachTag(selector);
		var matches = selector.match(/\w+/g);
		if(matches.length == 1) {
			if(matches[0] == 'body') return getBody(selector);
			else return getTag(selector);
		} else if(matches.length == 2 && matches[0] == 'body') {
			return getBodyAndTag(selector);
		} else {
			return function(p) {
				var selection, curElements, tag, parent = p[0];
				curElements = [ ];
				fPush.apply(curElements, parent.getElementsByTagName(matches[0]));
				for(var i = 1; i < matches.length; i++) {
					tag = matches[i];
					p = curElements;
					curElements = [ ];
					for(var j = 0; j < p.length; j++) {
						fPush.apply(curElements, p[j].getElementsByTagName(tag));
					}
				}
				return removeDuplicates(curElements);
			};
		}
	}
		
	function getEachTag(selector) {
		var selectors = selector.split(/\s*\,\s*/),
			algorithm = [ ],
			reHasCombinator = /\w\s\w/;
		for(var i = 0; i < selectors.length; i++) {
			if(!reHasCombinator.test(selectors[i])) algorithm[i] = true; // true means to use getElementsByTagName
			else algorithm[i] = getTags(selectors[i]);
		}
		return function(p) {
			var selection = [ ], parent = p[0];
			for(var i = 0; i < algorithm.length; i++) {
				if(algorithm[i] === true) fPush.apply(selection, parent.getElementsByTagName(selectors[i]));
				else fPush.apply(selection, algorithm[i](p));
			}
			return selection;
		};
	}
	
	function getClass(selector) {
		var className = selector.substring(1);
		if(document.getElementsByClassName) {
			return function(p) {
				var selection = [ ];
				fPush.apply(selection, p[0].getElementsByClassName(selector.replace(/\./g, ' ')));
				return selection;
			};
		} else {
			var reHasClass = new RegExp('(^|\\s)' + className + '(\\s|$)');
			return function(p) {
				var allElements = p[0].getElementsByTagName('*'),
					selection = [ ], el;
				for(var i = 0, al = allElements.length; i < al; i++) {
					el = allElements[i];
					if(reHasClass.test(el.className)) {
						selection.push(el);
					}
				}
				return selection;
			}
		}
	}
	
	return setupFastTracks;
	
})();
	
	function warn(obj) {
	if(Quicksand.debugMode) {
		if(console && console.log) console.log('Quicksand (warning): ' + (obj.toString ? obj.toString() : obj));
	}
}

function Warning(s) {
	this._string = s;
}
Warning.prototype = {
	toString: function() { return this._string; }
};

function BrowserSupportWarning(options) {
	this._string = 'Browser support for ' + options.selector + ' may be limited.\n'
			+ 'Supported browsers:\n'
			+ 'Internet Explorer ' + options.ie
			+ ', Firefox ' + options.firefox
			+ ', Chrome ' + options.chrome
			+ ', Safari ' + options.safari
			+ ', Opera '  + options.opera;
	this.support = {
		ie: options.ie,
		firefox: options.firefox,
		chrome: options.chrome,
		safari: options.safari,
		opera: options.opera
	};
}

BrowserSupportWarning.prototype = new Warning();

	/* Performs any optimizations possible to make the selector one that can
 * be processed more quickly.
 */
var optimizeSelector = (function() {
	
	var attributeProperties = { };
	
	function optimizeSelector(selectorList) {
		
		var selector,
			
			// item selector
			item,
			
			// compound selector
			cSel;
		
		for(var i = 0; i < selectorList.length; i++) {
			selector = selectorList[i];
			for(var j = 0; j < selector.length; j++) {
				item = selector[j];
				if(!item.algorithm) {
					cSel = item.compoundSelector;
					if(cSel.pseudoClasses && splitAnyMatches(cSel, selectorList, i, j)) {
						i--;
						break;
					}
				}
			}
		}
		
		for(var i = 0; i < selectorList.length; i++) {
			selector = selectorList[i];
			for(var j = 0; j < selector.length; j++) {
				item = selector[j];
				if(!item.algorithm) {
					cSel = item.compoundSelector;
					if(cSel.type.name) optimizeType(cSel);
					if(cSel.attributes) optimizeAttributes(cSel);
					if(cSel.classes) optimizeClasses(cSel);
					if(cSel.pseudoClasses) optimizePseudoClasses(cSel, selectorList, i, j);
				}
			}
			
		}
		
	}
	
	function optimizeType(cSel) {
		// Convert tag names to uppercase
		cSel.type.name = cSel.type.name.toUpperCase();
	}
	
	function optimizeAttributes(cSel) {
		var attributes = cSel.attributes, attribute;
		for(var i = 0; i < attributes.length; i++) {
			attribute = attributes[i];
			switch(attribute.name) {
				
				case 'id':
					// Replace [id=X] selectors with #X selectors
					if(!cSel.id && attribute.operator == EQUALS_ATTRIBUTE_OPERATOR) {
						cSel.id = attribute.value;
						attributes.splice(i, 1);
						i--;
					}
					break;
					
				case 'class':
					// Replace [class~=X] selectors with .X selectors
					if(attribute.operator == CONTAINS_WORD_ATTRIBUTE_OPERATOR) {
						if(!cSel.classes) cSel.classes = [ ];
						cSel.classes.push(attribute.value);
						attributes.splice(i, 1);
						i--;
					}
					break;
			}
			if(attributeProperties[attribute.name]) attribute.property = attributeProperties[attribute.name];
		}
		if(attributes.length == 0) cSel.attributes = undefined;
	}
	
	function optimizeClasses(cSel) {
		// Generate regular expressions for each class
		var regexes = [ ];
		for(var i = 0; i < cSel.classes.length; i++) {
			regexes.push(new RegExp('(^|\s)' + cSel.classes[i] + '(\s|$)'));
		}
		cSel.classes_regexes = regexes;
	}
	
	function splitAnyMatches(cSel, selectorList, sIndex, iIndex) {
		// selectorList, sIndex, and iIndex are used by optimizeMatches.
		
		var pseudoClasses = cSel.pseudoClasses, didSplit = false;
		
		for(var i = 0; i < pseudoClasses.length; i++) {
			if(pseudoClasses[i].pseudoClass == MATCHES_PSEUDOCLASS) {
				// TODO: When :nth and :nth-last are fixed (see note in filterFilter.jsx) and when :matches returns in document order, then they can be allowed together.
				if(cSel.filter) throw 'Quicksand: The :nth or :nth-last pseudo-classes are not allowed with :matches.';
				optimizeMatches(cSel, pseudoClasses[i], selectorList, sIndex, iIndex);
				didSplit = true;
				break;
			}
		}
		
		return didSplit;
		
	}
	
	function optimizePseudoClasses(cSel) {
		// selectorList, sIndex, and iIndex are used by optimizeMatches.
		
		var pseudoClasses = cSel.pseudoClasses, pc, removePc;
		
		for(var i = 0; i < pseudoClasses.length; i++) {
			pc = pseudoClasses[i];
			removePc = false;
			switch(pc.pseudoClass) {
				
				case NTH_CHILD_PSEUDOCLASS:
					// Remove :nth-child(an+b) pseudo-class when a = 1 and b = 0
					if(pc.a == 1 && pc.b == 0) {
						removePc = true;
					}
					break;
				
				case NOT_PSEUDOCLASS:
					optimizeNot(cSel, pc);
					removePc = true;
					break;
				
				case ANY_LINK_PSEUDOCLASS:
					/* Note: The first draft has minimal information on how any-link is supposed to behave.
					 * From the little that's there and from looking at the behavior of -moz-any-link, it seems
					 * like it's just supposed to select any link, regardless of whether it has been visited.
					 */
				case LINK_PSEUDOCLASS:
					if(!cSel.attributes) cSel.attributes = [ ];
					cSel.attributes.push({
						name: 'href',
						operator: HAS_ATTRIBUTE_OPERATOR
					});
					removePc = true;
					break;
				case VISITED_PSEUDOCLASS:
					// All links will be treated as unvisited due to privacy considerations and browser security restrictions.
					cSel.noResults = true;
					removePc = true;
					break;
				case LOCAL_LINK_PSEUDOCLASS:
					if(!cSel.attributes) cSel.attributes = [ ];
					if(pc.pathLevels === undefined) {
						cSel.attributes.push({
							name: 'href',
							operator: LOCAL_LINK_EXACT_ATTRIBUTE_OPERATOR
						});
					} else {
						cSel.attributes.push({
							name: 'href',
							operator: LOCAL_LINK_PARTIAL_ATTRIBUTE_OPERATOR,
							value: pc.pathLevels
						});
					}
					removePc = true;
					break;
					
				case TARGET_PSEUDOCLASS:
					cSel.optimizedSelPath_target = true;
					break;
				case FOCUS_PSEUDOCLASS:
					// Note: filterFocus uses document.activeElement, which lacks support in old browsers.
					// It has been determined, however, that support is extensive enough for Quicksand to support this feature.
					// Support information from: https://developer.mozilla.org/en/DOM/document.activeElement
					warn(new BrowserSupportWarning({
						selector: ':focus',
						chrome: 2,
						firefox: 3,
						ie: 4,
						opera: 9.6,
						safari: 4
					}));
					cSel.optimizedSelPath_focus = true;
					break;
					
				case ROOT_PSEUDOCLASS:
					if(cSel.type.name == '*') cSel.type.name = 'HTML';
					else if(cSel.type.name != 'HTML') cSel.noResults = true;
					break;
					
				case COLUMN_PSEUDOCLASS:
					optimizeColumnSelector(pc.selector);
					break;
								
			}
			
			if(removePc) {
				pseudoClasses.splice(i, 1);
				i--;
			}
			
		}
		
		if(pseudoClasses.length == 0) cSel.pseudoClasses = undefined;
		
	}
	
	function optimizeNot(cSel, pc) {
		var csl = optimizeCompoundSelectorList(pc.selector),
			cSelTypeName = cSel.type.name,
			notCSel;
		for(var i = 0; i < csl.length; i++) {
			notCSel = csl[i];
			if(notCSel.type != undefined) {
				if(cSelTypeName != '*') {
					if(cSelTypeName == notCSel.type.name.toUpperCase()) {
						// The selector should return no results.
						cSel.noResults = true;
					} else {
						// cSel's tag name doesn't match notCSel's tag name, so the :not tag name will be excluded implicitly
						notCSel.type = undefined;
					}
				}
			}
			// TODO: Do more checks to speed up nonsensical things, like #my_id:not(#my_id)
		}
		if(cSel.not) fPush.apply(cSel.not, csl); // permit multiple not pseudo-classes on the same compound selector	
		else cSel.not = csl;
	}
	
	function optimizeMatches(cSel, pc, selectorList, sIndex, iIndex) {
		// sIndex: the index of the current selector in the selectorList
		// iIndex: the index of the current item selector in the current selector
		
		var csl = optimizeCompoundSelectorList(pc.selector),
			cSelTypeName = cSel.type.name,
			matchesCSel, newSelector, newSelectors = [ ], newCSel, newItem,
			curSelector = selectorList[sIndex],
			skip;
		
		for(var i = 0; i < csl.length; i++) {
			
			matchesCSel = csl[i];
			skip = false;
			
			if(matchesCSel.type != undefined) {
				if(cSel.type.name == '*') {
					if(csl.length == 1) cSel.type.name = matchesCSel.type.name;
				} else if(cSelTypeName == matchesCSel.type.name.toUpperCase()) {
					// There's no reason to double check the tag name
					matchesCSel.type = undefined;
				} else {
					// The tag names don't match, so skip this matches selector
					skip = true;
				}
			}
			if(matchesCSel.id != undefined) {
				if(cSel.id == matchesCSel.id) {
					// There's no reason to double check the id
					matchesCSel.type = undefined;
				} else {
					// The ids don't match, so skip this matches selector
					skip = true;
				}
			}
			
			if(!skip) {
				// build new selector lists to replace current one, expanding :matches
				
				newCSel = {
					type: { name: cSel.type.name },
					id: cSel.id || matchesCSel.id,
					classes: copyArray(cSel.classes),
					pseudoClasses: copyArrayExcept(cSel.pseudoClasses, pc),
					attributes: copyArray(cSel.attributes)
				};
				if(matchesCSel.type) newCSel.type.name = matchesCSel.type.name;
				if(matchesCSel.classes) newCSel.classes = addToArray(newCSel.classes, matchesCSel.classes);
				if(matchesCSel.pseudoClasses) newCSel.pseudoClasses = addToArray(newCSel.pseudoClasses, matchesCSel.pseudoClasses);
				if(matchesCSel.attributes) newCSel.attributes = addToArray(newCSel.attributes, matchesCSel.attributes);
				
				newItem = {
					combinator: curSelector[iIndex].combinator,
					compoundSelector: newCSel
				};
				
				newSelector = [ ];
				for(var j = 0; j < iIndex; j++) {
					newSelector.push(curSelector[j]);
				}
				newSelector.push(newItem);
				for(var j = iIndex + 1; j < curSelector.length; j++) {
					newSelector.push(curSelector[j]);
				}
				newSelectors.push(newSelector);
				
			}
			
		}
		
		// Update the selector list with the new selectors
		newSelectors.unshift(sIndex, 1);
		fSplice.apply(selectorList, newSelectors);
		
	}
	
	function optimizeCompoundSelectorList(sl) {
		if(sl.optimizedCSL) return sl.optimizedCSL;
		var sel, item, cSel, cSelList = [ ];
		for(var i = 0; i < sl.length; i++) {
			sel = sl[i];
			item = sel[0];
			cSel = item.compoundSelector;
			if(sel.length > 1 || item.combinator.type != DESCENDANT_COMBINATOR) throw 'Quicksand: Combinators are not allowed as arguments in pseudo-classes.';
			if(cSel.type.name == undefined) cSel.type = undefined;
			if(cSel.attributes) optimizeAttributes(cSel);
			if(cSel.classes) optimizeClasses(cSel);
			if(cSel.pseudoClasses) optimizePseudoClasses(cSel);
			cSelList.push(cSel);
		}
		sl.optimizedCSL = cSelList;
		return cSelList;
	}
	
	function optimizeColumnSelector(sl) {
		var sel, item, cSel;
		for(var i = 0; i < sl.length; i++) {
			sel = sl[i];
			for(var j = 0; j < sel.length; j++) {
				item = sel[j];
				cSel = item.compoundSelector;
				// The selector can only select COL elements
				if(cSel.type.name == '*') cSel.type.name = 'COL';
				// toUpperCase() is needed below because no optimizations have yet been performed on this selector-list 
				else if(cSel.type.name.toUpperCase() != 'COL') cSel.noResults = true;
			}
		}
		preProcessSelectorList(sl);
	}
	
	function copyArray(arr) {
		return arr ? arr.slice(0, arr.length) : undefined;
	}
	
	function copyArrayExcept(arr, exception) {
		var arr2 = [ ], item;
		for(var i = 0; i < arr.length; i++) {
			item = arr[i];
			if(item != exception) arr2.push(item);
		}
		if(arr2.length == 0) return undefined;
		return arr2;
	}
	
	function addToArray(arr1, arr2) {
		if(!arr1) return arr2.slice(0, arr2.length);
		fPush.apply(arr1, arr2);
		return arr1;
	}
	
	if(!supportsHasAttribute) {
		attributeProperties = {
			'class': 'className'
		};
	}
	
	return optimizeSelector;
	
})();
	var qSelect = (function() {
	
	function qSelect(selectorList, root, scope) {
		
		var algorithm = selectorList.algorithm,
			curElements,
			selAlg, item, args, selection = [ ];
		
		for(var i = 0; i < algorithm.length; i++) {
			selAlg = algorithm[i];
			curElements = [ root ];
			for(var j = 0; j < selAlg.length; j++) {
				item = selAlg[j];
				args = [ curElements, scope ];
				if(item.arguments) fUnshift.apply(args, item.arguments)
				curElements = item.call.apply(null, args);
			}
			fPush.apply(selection, curElements);
		}
		
		if(algorithm.length > 1) {
			selection = sortElements(selection);
			selection = removeDuplicates(selection);
		}
		
		if(scope) selection = filterDescendants(selection, scope);
		
		return selection;
		
	}
	
	function filterDescendants(selection, ancestor) {
		// TODO: This can probably be sped up.
		var newSelection = [ ], el, p, lastP;
		for(var i = 0; i < selection.length; i++) {
			el = selection[i];
			p = el.parentNode;
			if(p == lastP || isDescendant(p, ancestor)) {
				lastP = p;
				newSelection.push(el);
			}
		}
		return newSelection;
	}
	
	function isDescendant(p, ancestor) {
		if(!p) return false;
		do {
			if(p == ancestor) return true;
		} while(p = p.parentNode);
		return false;
	}
	
	return qSelect;
	
})();

	var removeDuplicates = (function() {
	
	function removeDuplicates(curElements) {
		
		if(curElements.length <= 1) return curElements;
		
		var el, id, newCurElements = [ ], cache = [ ];
		
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			id = el._qs_elId;
			if(!id) {
				id = el._qs_elId = ++nextElId;
				newCurElements.push(el);
				cache[id] = true;
			} else if(!cache[id]) {
				newCurElements.push(el);
				cache[id] = true;
			}
		}
		
		return newCurElements;
		
	}
	
	return removeDuplicates;
	
})();
	function sortElements(curElements) {
	
	if(curElements.length <= 1) return curElements;
	
	var el, id, newCurElements = [ ], elIds = [ ],
		all, tagName = curElements[0].tagName,
		elId;
	
	for(var i = 0; i < curElements.length; i++) {
		el = curElements[i];
		if(tagName != '*' && tagName != el.tagName) tagName = '*';
		elId = el._qs_elId;
		if(!elId) elId = el._qs_elId = ++nextElId;
		elIds[elId] = true;
	}
	
	all = curElements[0].ownerDocument.getElementsByTagName(tagName)
	
	for(var i = 0, l = all.length; i < l; i++) {
		el = all[i];
		elId = el._qs_elId;
		if(elId && elIds[elId]) newCurElements.push(el);
	}
	
	return newCurElements;
	
}
	function isAncestor(ancestor, el) {
	var p = el;
	while(p = p.parentNode) {
		if(p == ancestor) return true;
	}
	return false;
}
	// Creates and caches an array of functions which can be called
// to select the elements for this selector list
var processSelectorList = (function() {
	
	var curCombinator;
	
	var filterAdjacentSiblings = (function() {
	
	function filterAdjacentSiblings(el, ch) {
		var curElements = [ ], cel, pel = el.parentNode;
		for(var i = 0, chl = ch.length; i < chl; i++) {
			cel = ch[i];
			if(cel.parentNode == pel && areAdjacentSiblings(el, cel)) {
				curElements.push(cel);
				el = cel;
			}
		}
		return curElements;
	}
	
	function areAdjacentSiblings(el1, el2) {
		// el2 should be the next element after el1 in the document
		while(el1 = el1.nextSibling) {
			if(el1 == el2) return true;
			if(el1.nodeType == 1) return false;
		}
		return false;
	}
	
	return filterAdjacentSiblings;
	
})();var filterAttributes = (function() {
	
	var filterHas;
	
	function filterAttributes(attributes, algorithm) {
		
		var attribute, name, value, caseInsensitive,
			
			// safeName will be the attribute name which should be used for getAttribute (which needs to be the property name in IE)
			safeName;
		
		for(var i = 0; i < attributes.length; i++) {
			attribute = attributes[i];
			name = attribute.name;
			value = attribute.value;
			caseInsensitive = !!attribute.caseInsensitive;
			safeName = attribute.property || name;
			if(caseInsensitive && value) value = value.toLowerCase();
			switch(attribute.operator) {
				
				case HAS_ATTRIBUTE_OPERATOR:
					algorithm.push({
						call: filterHas,
						arguments: [ name ]
					});
					break;
				case EQUALS_ATTRIBUTE_OPERATOR:
					algorithm.push({
						call: caseInsensitive ? filterEqualsCI : filterEquals,
						arguments: [ safeName, value ]
					});
					break;
				case STARTS_WITH_DASH_ATTRIBUTE_OPERATOR:
					algorithm.push({
						call: caseInsensitive ? filterStartsWithCI : filterStartsWith,
						arguments: [ safeName, value + '-' ]
					});
					break;
				case STARTS_WITH_ATTRIBUTE_OPERATOR:
					algorithm.push({
						call: caseInsensitive ? filterStartsWithCI : filterStartsWith,
						arguments: [ safeName, value ]
					});
					break;
				case ENDS_WITH_ATTRIBUTE_OPERATOR:
					algorithm.push({
						call: caseInsensitive ? filterEndsWithCI : filterEndsWith,
						arguments: [ safeName, value ]
					});
					break;
				case CONTAINS_ATTRIBUTE_OPERATOR:
					algorithm.push({
						call: caseInsensitive ? filterContainsCI : filterContains,
						arguments: [ safeName, value ]
					});
					break;
				case CONTAINS_WORD_ATTRIBUTE_OPERATOR:
					algorithm.push({
						call: caseInsensitive ? filterContainsWordCI : filterContainsWord,
						arguments: [ safeName, value ]
					});
					break;
				
				case DOESNT_EQUAL_ATTRIBUTE_OPERATOR:
					algorithm.push({
						call: caseInsensitive ? filterDoesntEqualCI : filterDoesntEqual,
						arguments: [ safeName, value ]
					});
					break;
				case DOESNT_CONTAIN_WORD_ATTRIBUTE_OPERATOR:
					algorithm.push({
						call: caseInsensitive ? filterDoesntContainWordCI : filterDoesntContainWord,
						arguments: [ safeName, value ]
					});
					break;
				case DOESNT_START_WITH_DASH_ATTRIBUTE_OPERATOR:
					algorithm.push({
						call: caseInsensitive ? filterDoesntStartWithCI : filterDoesntStartWith,
						arguments: [ safeName, value + '-' ]
					});
					break;
				case DOESNT_START_WITH_ATTRIBUTE_OPERATOR:
					algorithm.push({
						call: caseInsensitive ? filterDoesntStartWithCI : filterDoesntStartWith,
						arguments: [ safeName, value ]
					});
					break;
				case DOESNT_END_WITH_ATTRIBUTE_OPERATOR:
					algorithm.push({
						call: caseInsensitive ? filterDoesntEndWithCI : filterDoesntEndWith,
						arguments: [ safeName, value ]
					});
					break;
				case DOESNT_CONTAIN_ATTRIBUTE_OPERATOR:
					algorithm.push({
						call: caseInsensitive ? filterDoesntContainCI : filterDoesntContain,
						arguments: [ safeName, value ]
					});
					break;
				
				// Used by the :local-link pseudo-class
				case LOCAL_LINK_PARTIAL_ATTRIBUTE_OPERATOR:
					algorithm.push({
						call: filterPartialLocalLink,
						arguments: [ safeName, value ]
					});
					break;
				case LOCAL_LINK_EXACT_ATTRIBUTE_OPERATOR:
					algorithm.push({
						call: filterExactLocalLink,
						arguments: [ safeName ]
					});
					break;
				
				default: throw 'Quicksand: Attribute operator not implemented: ' + attribute.operator;
				
			}
			
		}
		
	}
	
	if(supportsHasAttribute) {
		
		filterHas = function(name, curElements) {
			var newCurElements = [ ], el;
			for(var i = 0; i < curElements.length; i++) {
				el = curElements[i];
				if(el.hasAttribute(name)) {
					newCurElements.push(el);
				}
			}
			return newCurElements;
		}
		
	} else {
		
		filterHas = function(name, curElements) {
			var newCurElements = [ ], el, n;
			for(var i = 0; i < curElements.length; i++) {
				el = curElements[i];
				n = el.getAttributeNode(name);
				if(n && n.specified) newCurElements.push(el);
			}
			return newCurElements;
		}
		
	}
	
	function filterEquals(name, value, curElements) {
		var newCurElements = [ ], el;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// Using 2 as the second argument can help speed up IE7 considerably
			if(el.getAttribute(name, 2) == value) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
	
	function filterEqualsCI(name, value, curElements) {
		var newCurElements = [ ], el, s;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// Using 2 as the second argument can help speed up IE7 considerably
			s = el.getAttribute(name, 2);
			if(s && s.toLowerCase() == value) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
	
	function filterDoesntEqual(name, value, curElements) {
		var newCurElements = [ ], el;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// Using 2 as the second argument can help speed up IE7 considerably
			if(el.getAttribute(name, 2) != value) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
	
	function filterDoesntEqualCI(name, value, curElements) {
		var newCurElements = [ ], el, s;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// Using 2 as the second argument can help speed up IE7 considerably
			s = el.getAttribute(name, 2);
			if(!s || s.toLowerCase() != value) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
	
	function filterStartsWith(name, value, curElements) {
		var newCurElements = [ ],
			vl = value.length, s, el;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// Using 2 as the second argument can help speed up IE7 considerably
			s = el.getAttribute(name, 2);
			if(s && s.substring(0, vl) == value) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
	
	function filterStartsWithCI(name, value, curElements) {
		var newCurElements = [ ],
			vl = value.length, s, el;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// Using 2 as the second argument can help speed up IE7 considerably
			s = el.getAttribute(name, 2);
			if(s && s.toLowerCase().substring(0, vl) == value) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
	
	function filterDoesntStartWith(name, value, curElements) {
		var newCurElements = [ ],
			vl = value.length, s, el;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// Using 2 as the second argument can help speed up IE7 considerably
			s = el.getAttribute(name, 2);
			if(!s || s.substring(0, vl) != value) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
	
	function filterDoesntStartWithCI(name, value, curElements) {
		var newCurElements = [ ],
			vl = value.length, s, el;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// Using 2 as the second argument can help speed up IE7 considerably
			s = el.getAttribute(name, 2);
			if(!s || s.toLowerCase().substring(0, vl) != value) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
	
	function filterEndsWith(name, value, curElements) {
		var newCurElements = [ ],
			s, vl = value.length, el;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// Using 2 as the second argument can help speed up IE7 considerably
			s = el.getAttribute(name, 2);
			if(s && s.substring(s.length - vl) == value) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
	
	function filterEndsWithCI(name, value, curElements) {
		var newCurElements = [ ],
			s, vl = value.length, el;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// Using 2 as the second argument can help speed up IE7 considerably
			s = el.getAttribute(name, 2);
			if(s && s.toLowerCase().substring(s.length - vl) == value) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
	
	function filterDoesntEndWith(name, value, curElements) {
		var newCurElements = [ ],
			s, vl = value.length;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// Using 2 as the second argument can help speed up IE7 considerably
			s = el.getAttribute(name, 2);
			if(!s || s.substring(s.length - vl) != value) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
	
	function filterDoesntEndWithCI(name, value, curElements) {
		var newCurElements = [ ],
			s, vl = value.length;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// Using 2 as the second argument can help speed up IE7 considerably
			s = el.getAttribute(name, 2);
			if(!s || s.toLowerCase().substring(s.length - vl) != value) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
	
	function filterContains(name, value, curElements) {
		var newCurElements = [ ],
			el, s;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// Using 2 as the second argument can help speed up IE7 considerably
			s = el.getAttribute(name, 2);
			if(s && s.indexOf(value) > -1) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
	
	function filterContainsCI(name, value, curElements) {
		var newCurElements = [ ],
			el, s;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// Using 2 as the second argument can help speed up IE7 considerably
			s = el.getAttribute(name, 2);
			if(s && s.toLowerCase().indexOf(value) > -1) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
	
	function filterDoesntContain(name, value, curElements) {
		var newCurElements = [ ],
			el, s;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// Using 2 as the second argument can help speed up IE7 considerably
			s = el.getAttribute(name, 2);
			if(!s || s.indexOf(value) == -1) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
	
	function filterDoesntContainCI(name, value, curElements) {
		var newCurElements = [ ],
			el, s;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// Using 2 as the second argument can help speed up IE7 considerably
			s = el.getAttribute(name, 2);
			if(!s || s.toLowerCase().indexOf(value) == -1) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
	
	function filterContainsWord(name, value, curElements) {
		var newCurElements = [ ],
			re = new RegExp('(^|\s)' + value + '(\s|^)'),
			el, s;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// Using 2 as the second argument can help speed up IE7 considerably
			s = el.getAttribute(name, 2);
			if(s && (s == value || re.test(s))) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
	
	function filterContainsWordCI(name, value, curElements) {
		var newCurElements = [ ],
			re = new RegExp('(^|\s)' + value + '(\s|^)'),
			el, s;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// Using 2 as the second argument can help speed up IE7 considerably
			s = el.getAttribute(name, 2);
			if(s) {
				s = s.toLowerCase();
				if(s && (s == value || re.test(s))) {
					newCurElements.push(el);
				}
			}
		}
		return newCurElements;
	}
	
	function filterDoesntContainWord(name, value, curElements) {
		var newCurElements = [ ],
			re = new RegExp('(^|\s)' + value + '(\s|^)'),
			el, s;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// Using 2 as the second argument can help speed up IE7 considerably
			s = el.getAttribute(name, 2);
			if(!s || (s != value && !re.test(s))) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
	
	function filterDoesntContainWordCI(name, value, curElements) {
		var newCurElements = [ ],
			re = new RegExp('(^|\s)' + value + '(\s|^)'),
			el, s;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// Using 2 as the second argument can help speed up IE7 considerably
			s = el.getAttribute(name, 2);
			if(!s) newCurElements.push(el);
			else {
				s = s.toLowerCase();
				if((s != value && !re.test(s))) {
					newCurElements.push(el);
				}
			}
		}
		return newCurElements;
	}
	
	function filterPartialLocalLink(name, value, curElements) {
		var newCurElements = [ ],
			el, s;
		value = getLocalUrl(value);
		if(!value) return [ ];
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			s = el[name];
			if(s && urlStartsWith(s, value)) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
	
	function filterExactLocalLink(name, curElements) {
		var newCurElements = [ ],
			el, s;
		value = getLocalUrl();
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			s = el[name];
			if(s && removeFragment(s) == value) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
	
	function urlStartsWith(url, part) {
		url = removeFragment(removeFragment(url), '?');
		var loc = url.indexOf(':/'), end;
		if(loc == -1) return false;
		loc += 2;
		while(url.charAt(loc) == '/') loc++;
		end = loc + part.length;
		return url.substring(loc, end) == part && (url.length == end || url.charAt(end) == '/');
	}
	
	function removeFragment(url, startChar) {
		var loc = url.indexOf(startChar || '#');
		if(loc == -1) return url;
		return url.substring(0, loc);
	}
	
	// This method was moved from optimizeSelector to here due to the fact that if the value is cached
	// then history.pushState can break it. The local url needs to be calculated each time the :local-link
	// pseudo-class is used in order to keep up with a dynamic document location. 
	function getLocalUrl(pathLevels) {
		/* Note: Due to the implementation of this function, the :local-link selector will not
		 * work across frames. There are some other selectors that could also return unexpected
		 * results across frames, such as :first-child which will probably return the documentElement,
		 * since the current implemenation only tests to make sure the current frame's documentElement
		 * is not the element, but it doesn't test across frames.
		 * TODO: There are three potential approaches that could be taken.
		 *   (1) Fix this problem so that Quicksand will work across frames. However, this solution will
		 *       come at a speed cost.
		 *   (2) Set up Quicksand to create a new instance of the Quicksand object inside a frame on which
		 *       it is called, so that the new internal version of Quicksand can be used to test elements
		 *       across frames and do so accurately and quickly. This solution will come at a memory cost,
		 *       but the cost should be very minor.
		 *   (3) Simply document that Quicksand is not intended for cross-frame usage and recommend that
		 *       users include Quicksand within any frames in which they want to select elements.
		 */
		
		if(pathLevels === undefined) return location.href.substring(0, location.href.length - (location.hash || '').length);
		else if(pathLevels == 0) return location.hostname;
		
		var pathParts = location.pathname.split('/'), localUrl;
		
		if(pathLevels > pathParts.length) {
			// Note: The first draft of Selectors 4 makes it sound like :local-link should never match
			// if there are too many path levels, but it isn't clear.
			// TODO: Reevaluate this behavior when the next draft comes out.
			return false;
		}
		
		localUrl = location.hostname;
		for(var i = 1; i <= pathLevels; i++) {
			localUrl += '/' + pathParts[i];
		}
		
		return localUrl;
		
	}
	
	return filterAttributes;
	
})();var filterGeneralSiblings = (function() {
	
	function filterGeneralSiblings(el, ch) {
		var curElements = [ ], cel, pel = el.parentNode;
		for(var i = 0, chl = ch.length; i < chl; i++) {
			cel = ch[i];
			if(cel.parentNode == pel && areGeneralSiblings(el, cel)) {
				curElements.push(cel);
				el = cel;
			}
		}
		return curElements;
	}
	
	function areGeneralSiblings(el1, el2) {
		// el2 should come after el1 in the document
		while(el1 = el1.nextSibling) {
			if(el1 == el2) return true;
		}
		return false;
	}
	
	return filterGeneralSiblings;
	
})();function hasClasses(className, regexes) {
	for(var i = 0; i < regexes.length; i++) {
		if(!regexes[i].test(className)) return false;
	}
	return true;
}function isAdjacentSibling(elA, elB) {
	// Checks to see if elB is the element right after elA
	while(elA = elA.nextSibling) {
		if(elA.nodeType == 1) return elA == elB;
	}
	return false;
}function isGeneralSibling(elA, elB) {
	// Checks to see if elB is a sibling element following elA
	if(elA.parentNode != elB.parentNode) return false;
	while(elA = elA.nextSibling) {
		if(elA == elB) return true;
	}
	return false;
}var processCompoundSelector = (function() {
	
	function processCompoundSelector(item, algorithm) {
		
		var cSel = item.compoundSelector;
		
		if(cSel.noResults) {
			// The selector should return no results
			algorithm.push({ call: returnEmpty });
			return;
		}
		
		if(cSel.id) {
			if(cSel.type.name != '*' || cSel.classes) selectByPath_idPlus(item, algorithm);
			else selectByPath_id(item, algorithm);
		}
		else if(cSel.classes && cSel.type.name != '*') selectByPath_tagAndClasses(item, algorithm);
		else if(cSel.type.name != '*') selectByPath_tagName(item, algorithm);
		else if(cSel.classes) selectByPath_classes(item, algorithm);
		else if(cSel.optimizedSelPath_target) selectByPath_target(item, algorithm);
		else selectByPath_tagName(item, algorithm);
		
		if(cSel.attributes) filterAttributes(cSel.attributes, algorithm);
		if(cSel.pseudoClasses) filterPseudoClasses(cSel.pseudoClasses, algorithm);
		if(cSel.not) filterNot(cSel.not, algorithm);
		// Filters must be done at the end of the algorithm
		if(cSel.filter) filterFilter(cSel.filter, algorithm);
		
	}
	
	return processCompoundSelector;
	
})();var processSelector = (function() {
	
	function processSelector(selector) {
		
		var item, algorithm = [ ], iAlg, subjectMode = false, subjectModeSwitch = false;
		
		for(var i = 0; i < selector.length; i++) {
			
			if(subjectModeSwitch) subjectMode = true;
			
			// A combinator / compound selector pair
			item = selector[i];
			
			if(!item.algorithm) {
				/* Combinator / compound selector pairs may be cached individually from the full
				 * selector list, so check to see if this compound selector has already been processed.
				 */
				
				// Create a temporary array of functions to call for this compound selector.
				// This array is only defined temporarily (instead of on the item object) in case there
				// is an error thrown during its definition, in which case the partially created array
				// should not be cached for later use.
				iAlg = [ ];
				processCompoundSelector(item, iAlg);
				
				// Now that the array has been created successfully, cache it for later use.
				item.algorithm = iAlg;				
				
				if(item.compoundSelector.subject) subjectModeSwitch = true;
				
			}
			
			if(subjectMode) {
				// A previous compound selector contained a subject selector.
				item.algorithm = [{
					call: subjectSelect,
					arguments: [ item.algorithm ]
				}];
			}
			
			// Push the functions for this combinator onto the selector's algorithm array
			fPush.apply(algorithm, item.algorithm);
			
		}
		
		if(subjectMode) {
			algorithm.push({
				call: zToElements
			});
		}
		
		if(selector.length > 1) algorithm.push({ call: removeDuplicates });
		
		return algorithm;
				
	}
	
	function subjectSelect(algorithm, z) {
		// z is either an array of subject element / current element matchings or
		// (if this is the first compound selector after the subject selector) z
		// is an array of current elements which are the subject elements.
		
		if(z.length == 0) return [ ];
		
		var newZ, resElements;
		
		if(!z[0].current) {
			newZ = [ ];
			for(var i = 0; i < z.length; i++) {
				newZ.push({
					subject: z[i],
					current: z[i]
				});
			}
			z = newZ;
		}
		
		newZ = [ ];
		for(var i = 0; i < z.length; i++) {
			resElements = resolveAlgorithm(algorithm, z[i].current);
			for(var j = 0; j < resElements.length; j++) {
				newZ.push({
					subject: z[i].subject,
					current: resElements[j]
				});
			}
		}
		
		return newZ;
		
	}
	
	function resolveAlgorithm(algorithm, parent) {
		
		var curElements = [ parent ],
			item, args, selection = [ ];
		
		for(var j = 0; j < algorithm.length; j++) {
			item = algorithm[j];
			args = [ curElements ];
			if(item.arguments) fUnshift.apply(args, item.arguments)
			curElements = item.call.apply(null, args);
		}
		
		return curElements;
		
	}
	
	function zToElements(z) {
		var curElements = [ ];
		for(var i = 0; i < z.length; i++) {
			curElements.push(z[i].subject);
		}
		return curElements;
	}
	
	return processSelector;
	
})();
function returnEmpty() {
	return [ ];
}
var filterFilter = (function() {
	/* TODO: Get :nth and :nth-last working other places instead of just at the end.
	 * This filter property of a compound selector is sort of an ad-hoc property to get
	 * :nth and :nth-last working at the end of a compound selector.
	 * Ideally, they could work anywhere in a compound selector, and any simple selectors
	 * before the filter will be pre-filtered before the :nth or :nth-last pseudo-classes
	 * are applied and any simple selectors after the filter will be post-filtered.
	 * For instance:
	 *   A. div:nth(even).example	=> selects all divs, then filters the even ones, then filters out the class "example"
	 *   B. div.example:nth(even)	=> selects all divs with class "example", then filters the even ones
	 * 
	 * So for the elements below:
	 *   <div>1<div><div class="example">2</div><div>3</div><div>4</div><div class="example">5</div>
	 * 
	 * A. would select div 2
	 * B. would select div 5
	 * 
	 * This would require a fair amount of work, but it should be doable and not too hard. Even though
	 * Quicksand does not work linearly (for instance, it is set up to select by tag and class first if
	 * they're available, so currently A would select by div and .example before looking at the pseudo-classes)
	 * some work could be done to keep these non-linear optimizations while returning the correct results
	 * for :nth and :nth-last pseudo-classes.
	 */
	
	function filterNth(a, b, curElements) {
	
	var el, cel, elId,
		
		// The element number starting at 1
		elNum,
		
		// Using a new array to push to seems faster than splicing out the old ones in IE7
		newCurElements = [ ];
	
	for(var i = 0; i < curElements.length; i++) {
		
		cel = el = curElements[i];
			
		elNum = i + 1;
		
		// Add element if it fits the constraints
		if(a == 0) {
			if(elNum == b) newCurElements.push(cel);
		} else if(((elNum - b) % a) == 0 && elNum >= b && a * elNum + b >= 0) {
			newCurElements.push(cel)
		}
		
	}
	
	return newCurElements;
	
}
function filterNthLast(a, b, curElements) {
	
	var el, cel, elId,
		
		// The element number starting at 1
		elNum = 0,
		
		// Using a new array to push to seems faster than splicing out the old ones in IE7
		newCurElements = [ ];
	
	for(var i = curElements.length - 1; i >= 0; i--) {
		
		cel = el = curElements[i];
		
		elNum++;
		
		// Add element if it fits the constraints
		if(a == 0) {
			if(elNum == b) newCurElements.push(cel);
		} else if(((elNum - b) % a) == 0 && elNum >= b && a * elNum + b >= 0) {
			newCurElements.push(cel)
		}
		
	}
	
	return newCurElements;
	
}

	
	function filterFilter(filter, algorithm) {
		
		switch(filter.type) {
			
			case NTH_PSEUDOCLASS:
				algorithm.push({
					call: filterNth,
					arguments: [ filter.a, filter.b ]
				});
				break;
			case NTH_LAST_PSEUDOCLASS:
				algorithm.push({
					call: filterNthLast,
					arguments: [ filter.a, filter.b ]
				});
				break;
			
			default: throw 'Quicksand: Filter not implemented: ' + filter.type;
			
		}
		
	}
	
	return filterFilter;
	
})();var filterNot = (function() {
	
	function doFilterNegateAlgorithm(isAlgorithm, curElements) {
	var newCurElements = [ ], isElements = curElements, item, args, isElementsHash = [ ], elId, el;
	for(var i = 0; i < isAlgorithm.length; i++) {
		item = isAlgorithm[i];
		args = [ isElements ];
		if(item.arguments) fUnshift.apply(args, item.arguments);
		isElements = item.call.apply(null, args);
	}
	for(var i = 0; i < isElements.length; i++) {
		el = isElements[i];
		elId = el._qs_elId;
		if(!elId) elId = el._qs_elId = ++nextElId;
		isElementsHash[elId] = true;
	}
	for(var i = 0; i < curElements.length; i++) {
		el = curElements[i];
		if(!isElementsHash[el._qs_elId]) newCurElements.push(el);
	}
	return newCurElements;
}
var filterNotAttributes = (function() {
	
	function filterNotAttributes(attributes, algorithm) {
		var isAlgorithm = [ ];
		filterAttributes(attributes, isAlgorithm);
		algorithm.push({
			call: doFilterNegateAlgorithm,
			arguments: [ isAlgorithm ]
		});
	}
		
	return filterNotAttributes;
	
})();var filterNotClasses = (function() {
	
	function filterNotClasses(regexes, algorithm) {
		algorithm.push({
			call: doFilterNotClasses,
			arguments: [ regexes ]
		});
	}
	
	function doFilterNotClasses(regexes, curElements) {
		var newCurElements = [ ], el;
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			if(!hasClasses(el.className, regexes)) {
				newCurElements.push(el);
			}
		}
		return newCurElements;
	}
		
	return filterNotClasses;
	
})();var filterNotId = (function() {
	
	function filterNotId(id, algorithm) {
		algorithm.push({
			call: doFilterNotId,
			arguments: [ id ]
		});
	}
	
	function doFilterNotId(id, curElements) {
		var newCurElements = [ ];
		for(var i = 0; i < curElements.length; i++) {
			if(curElements[i].id != id) {
				newCurElements.push(curElements[i]);
			}
		}
		return newCurElements;
	}
		
	return filterNotId;
	
})();var filterNotPseudoClasses = (function() {
	
	function filterNotPseudoClasses(pseudoClasses, algorithm) {
		var isAlgorithm = [ ];
		filterPseudoClasses(pseudoClasses, isAlgorithm);
		algorithm.push({
			call: doFilterNegateAlgorithm,
			arguments: [ isAlgorithm ]
		});
	}
		
	return filterNotPseudoClasses;
	
})();var filterNotTagName = (function() {
	
	function filterNotTagName(tagName, algorithm) {
		algorithm.push({
			call: doFilterNotTagName,
			arguments: [ tagName.toUpperCase() ]
		});
	}
	
	function doFilterNotTagName(tagName, curElements) {
		var newCurElements = [ ];
		for(var i = 0; i < curElements.length; i++) {
			if(curElements[i].tagName != tagName) {
				newCurElements.push(curElements[i]);
			}
		}
		return newCurElements;
	}
		
	return filterNotTagName;
	
})();
	
	function filterNot(notSelectors, algorithm) {
		var sel;
		for(var i = 0; i < notSelectors.length; i++) {
			sel = notSelectors[i];
			if(sel.id) filterNotId(sel.id, algorithm);
			if(sel.type) filterNotTagName(sel.type.name, algorithm);
			if(sel.classes_regexes) filterNotClasses(sel.classes_regexes, algorithm);
			if(sel.pseudoClasses) filterNotPseudoClasses(sel.pseudoClasses, algorithm);
			if(sel.attributes) filterNotAttributes(sel.attributes, algorithm);
		}
	}
	
	return filterNot;
	
})();var filterPseudoClasses = (function() {
	// NOTE: The NOT_PSEUDOCLASS is not filtered here. It is filtered in filterNot.
	
	var filterChecked = (function() {
	
	function filterChecked(value, curElements) {
		
		var el, newElements = [ ], type;
		
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			if(el.checked === value) {
				type = el.type;
				// If value is false, make sure type is either radio or checkbox, otherwise
				// other input elements (like text boxes) will be returned also (for :unchecked).
				// The check is not needed when value is true (:checked) becaus if an element
				// has it's checked property set to true we can assume someone's using it's checked
				// value in a useful way -- so we should assume that it is checked.
				// TODO: Are there any other valid tags or input types that should be returned
				// by :unchecked? Particularly any new ones in HTML5?
				if(value || type == 'radio' || type == 'checkbox') newElements.push(el);
			}
		}
		
		return newElements;
		
	}
	
	return filterChecked;
	
})();
var filterColumn = (function() {
	
	function filterColumn(selectorList, curElements) {
		
		var el, newCurElements = [ ], cache = [ ], cellRange, tagName,
			cols, col,
			colsInfo = [ ], colInfo, colRange,
			table;
		
		if(curElements.length == 0) return [ ];
		
		cols = qSelect(selectorList, curElements[0].ownerDocument);
		if(cols.length == 0) return [ ];
		
		for(var i = 0; i < cols.length; i++) {
			col = cols[i];
			table = getTable(col);
			if(table) {
				colRange = getColRange(col, cache);
				colsInfo.push({
					table: table,
					min: colRange.min,
					max: colRange.max
				});
			}
		}
		
		if(colsInfo.length == 0) return [ ];
		
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			tagName = el.tagName;
			if(tagName == 'TD' || tagName == 'TH') {
				table = getTable(el);
				if(table) {
					cellRange = false;
					for(var j = 0; j < colsInfo.length; j++) {
						colInfo = colsInfo[j];
						if(table == colInfo.table) {
							if(!cellRange) cellRange = getCellRange(el, cache);
							if(
								(cellRange.min >= colInfo.min && cellRange.min <= colInfo.max)
								|| (cellRange.max >= colInfo.min && cellRange.max <= colInfo.max)
								|| (cellRange.min <= colInfo.min && cellRange.max >= colInfo.max)
							) {
								newCurElements.push(el)
								break;
							}
						}
					}
				}
			}
		}
		
		return newCurElements;
		
	}
	
	function getTable(col) {
		var el = col;
		while(el = el.parentNode) {
			if(el.tagName == 'TABLE') return el;
		}
		return null;
	}
	
	function getColRange(el, cache) {
		
		var xel = el, colNum = 1, maxColNum, elId, cachedNum, tagName;
		
		while(xel = xel.previousSibling) {
			elId = xel._qs_elId;
			if(elId) cachedNum = cache[elId];
			if(cachedNum) {
				colNum += cachedNum;
				break;
			}
			tagName = xel.tagName;
			if(tagName == 'COL') {
				colNum += xel.span;
			}
		}
		
		maxColNum = colNum + el.span - 1;
		
		elId = el._qs_elId;
		if(!elId) elId = el._qs_elId = ++nextElId;
		// Cache the largest value in the range
		cache[elId] = maxColNum
		
		return {
			min: colNum,
			max: maxColNum
		};
		
	}
	
	function getCellRange(el, cache) {
		
		var xel = el, colNum = 1, maxColNum, elId, cachedNum, tagName;
		
		while(xel = xel.previousSibling) {
			elId = xel._qs_elId;
			if(elId) cachedNum = cache[elId];
			if(cachedNum) {
				colNum += cachedNum;
				break;
			}
			tagName = xel.tagName;
			if(tagName == 'TD' || tagName == 'TH') {
				colNum += xel.colSpan;
			}
		}
		
		maxColNum = colNum + el.colSpan - 1;
		
		elId = el._qs_elId;
		if(!elId) elId = el._qs_elId = ++nextElId;
		// Cache the largest value in the range
		cache[elId] = maxColNum
		
		return {
			min: colNum,
			max: maxColNum
		};
		
	}
		
	return filterColumn;
	
})();
var filterContains = (function() {
	
	function filterContains(content, curElements) {
		
		var el, newCurElements = [ ];
		
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			if((el.textContent || el.innerText || '').indexOf(content) > -1) {
				newCurElements.push(el);
			}
		}
		
		return newCurElements;
		
	}
	
	return filterContains;
	
})();
var filterCustom = (function() {
	
	function filterCustom(pseudoClass, argument, curElements) {
		
		var f = customPseudoClasses[pseudoClass],
			el, newCurElements = [ ];
		
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			if(f(el, argument)) newCurElements.push(el);
		}
		
		return newCurElements;
		
	}
	
	return filterCustom;
	
})();
var filterDefault = (function() {
	// TODO: This currently checks for default checkboxes, radios, and submit buttons. Could there be another kind of default that should be returned?
	
	function filterDefault(curElements) {
		
		var el, newElements = [ ], type, cache = [ ];
		
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			if(el.defaultChecked) newElements.push(el);
			else if(el.tagName == 'INPUT' && el.type.toLowerCase() == 'submit') {
				// The first submit button in a form is a defacto default in most browsers.
				// TODO: Check this out in all target browsers to make, especially with variables
				// such as whether the buttons are hidden or whether they have strange tab indices
				// to see if this implementation needs to be altered.
				if(isFirstSubmitInForm(el, cache)) newElements.push(el);
			}
		}
		
		return newElements;
		
	}
	
	function isFirstSubmitInForm(submitEl, cache) {
		var formEl = submitEl, r, formElId;
		while(formEl = formEl.parentNode) {
			if(formEl.tagName == 'FORM') break;
		}
		if(!formEl) return false;
		formElId = formEl._qs_elId;
		if(!formElId) formElId = formEl._qs_elId = ++nextElId;
		if(cache[formElId]) return false;
		r = formEl.getElementsByTagName('input');
		for(var i = 0; i < r.length; i++) {
			if(r[i] == submitEl) {
				cache[formElId] = true;
				return true;
			} else if(r[i].type.toLowerCase() == 'submit') {
				cache[formElId] = true;
				return false;
			}
		}
	}
	
	return filterDefault;
	
})();
var filterDir = (function() {
	
	function filterDir(direction, curElements) {
		
		var el, newCurElements = [ ], cache = [ ];
		
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			if(getDir(el, cache) == direction) newCurElements.push(el);
		}
		
		return newCurElements;
		
	}
	
	function getDir(el, cache) {
		var elId = el._qs_elId, elDir;
		if(!elId) elId = el._qs_elId = ++nextElId;
		else elDir = cache[elId];
		if(!elDir) {
			elDir = el.dir;
			while(!elDir) {
				el = el.parentNode;
				if(!el) break;;
				elDir = cache[el._qs_elId] || el.dir;
			}
		}
		cache[elId] = elDir;
		return elDir;
	}
	
	return filterDir;
	
})();
var filterDisabled = (function() {
	
	function filterDisabled(value, curElements) {
		
		var el, newElements = [ ];
		
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			// style tags can have a disabled property.
			// TODO: Are there any other tags that can report a disabled property
			// but aren't user-interface elements?
			if(el.disabled === value && el.tagName != 'STYLE') newElements.push(el);
		}
		
		return newElements;
		
	}
	
	return filterDisabled;
	
})();
function filterEmpty(curElements) {
	
	var el, xel, newCurElements = [ ], isEmpty;
	
	for(var i = 0; i < curElements.length; i++) {
		el = curElements[i];
		isEmpty = true;
		xel = el.firstChild;
		if(xel) do {
			if(xel.nodeType < 6) { isEmpty = false; break; }
		} while(xel = xel.nextSibling);
		if(isEmpty) newCurElements.push(el);
	}
	
	return newCurElements;
	
}function filterFirstChild(curElements) {
	
	var el, cel, newCurElements = [ ], addEl;
	
	for(var i = 0; i < curElements.length; i++) {
		cel = el = curElements[i];
		addEl = true;
		// The root element should not be included; it has no parent.
		if(el == documentElement) addEl = false;
		else while(el = el.previousSibling) {
			if(el.nodeType == 1) {
				addEl = false;
				break;
			}
		}
		if(addEl) newCurElements.push(cel);
	}
	
	return newCurElements;
	
}
function filterFirstOfType(curElements) {
	
	var el, cel, newCurElements = [ ], addEl, tagName;
	
	for(var i = 0; i < curElements.length; i++) {
		cel = el = curElements[i];
		tagName = el.tagName;
		addEl = true;
		// The root element should not be included; it has no parent.
		if(el == documentElement) addEl = false;
		else while(el = el.previousSibling) {
			if(el.tagName == tagName) {
				addEl = false;
				break;
			}
		}
		if(addEl) newCurElements.push(cel);
	}
	
	return newCurElements;
	
}
var filterFocus = (function() {
	
	function filterFocus(curElements) {
		
		var el,
			activeEl;
		
		if(curElements.length == 0) return [ ];
		
		activeEl = curElements[0].ownerDocument.activeElement;
		if(!activeEl || !(activeEl.type || activeEl.href)) return [ ];
		
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			if(el == activeEl) return [ el ];
		}
		
		return [ ];
		
	}
	
	return filterFocus;
	
})();
function filterIndeterminate(curElements) {
	
	var el, newElements = [ ];
	
	for(var i = 0; i < curElements.length; i++) {
		el = curElements[i];
		if(el.indeterminate) newElements.push(el);
	}
	
	return newElements;
	
}var filterLang = (function() {
	
	function filterLang(langs, curElements) {
		/* NOTE: According to the Selectors 4 Editor's Draft (http://dev.w3.org/csswg/selectors4/#lang-pseudo),
		 * languages should be matched based on RFC4647 (http://www.ietf.org/rfc/rfc4647.txt).
		 * This is a long document, and this implementation may need to be adjusted to correctly comply with it.
		 * This implementation is, instead, based on a mishmash of information in the Selector's Level 4
		 * Editor's Draft and the first Working Draft (http://www.w3.org/TR/selectors4/#lang-pseudo).
		 */
		
		var el, newCurElements = [ ], lang, cache = [ ], reLangs, reLangsStr;
		
		reLangsStr = '';
		for(var i = 0; i < langs.length; i++) {
			lang = langs[i];
			if(lang.substring(0, 2) == '*\\-') reLangStr += '^[a-z0-9]+' + genImplicitWildcards(langs[i].substring(2)) + '\\-?|';
			reLangsStr += '^' + genImplicitWildcards(langs[i]) + '\\-?|';
		}
		reLangs = new RegExp(reLangsStr.substring(0, reLangsStr.length - 1), 'i');
		
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			if(reLangs.test(getLang(el, cache))) newCurElements.push(el);
		}
		
		return newCurElements;
		
	}
	
	function getLang(el, cache) {
		var elId = el._qs_elId, elLang;
		if(!elId) elId = el._qs_elId = ++nextElId;
		else elLang = cache[elId];
		if(!elLang) {
			elLang = el.lang;
			while(!elLang) {
				el = el.parentNode;
				if(!el) break;
				elLang = cache[el._qs_elId] || el.lang;
			}
		}
		cache[elId] = elLang;
		return elLang;
	}
	
	function genImplicitWildcards(lang) {
		// From the examples in the Editor's Draft (http://dev.w3.org/csswg/selectors4/#lang-pseudo),
		// it seems like all dashes should be treated as possible implicit wildcards.
		// e.g. de-DE should match de-Latf-DE
		
		var parts = lang.split('-'), s = '';
		
		for(var i = 0; i < parts.length; i++) {
			s += parts[i];
			if(i < parts.length - 1) s += '\\-([a-z0-9]+\\-)*';
		}
		
		return s;
		
	}
	
	return filterLang;
	
})();function filterLastChild(curElements) {
	
	var el, cel, newCurElements = [ ], addEl;
	
	for(var i = 0; i < curElements.length; i++) {
		cel = el = curElements[i];
		addEl = true;
		// The root element should not be included; it has no parent.
		if(el == documentElement) addEl = false;
		else while(el = el.nextSibling) {
			if(el.nodeType == 1) {
				addEl = false;
				break;
			}
		}
		if(addEl) newCurElements.push(cel);
	}
	
	return newCurElements;
	
}
function filterLastOfType(curElements) {
	
	var el, cel, newCurElements = [ ], addEl, tagName;
	
	for(var i = 0; i < curElements.length; i++) {
		cel = el = curElements[i];
		tagName = el.tagName;
		addEl = true;
		// The root element should not be included; it has no parent.
		if(el == documentElement) addEl = false;
		else while(el = el.nextSibling) {
			if(el.tagName == tagName) {
				addEl = false;
				break;
			}
		}
		if(addEl) newCurElements.push(cel);
	}
	
	return newCurElements;
	
}
function filterNthChild(a, b, curElements) {
	
	var el, cel, elId,
		
		// The element child number starting at 1
		elNum,
		
		// Cache child numbers
		cache = [ ], cachedNum,
		
		// Using a new array to push to seems faster than splicing out the old ones in IE7
		newCurElements = [ ];
	
	for(var i = 0; i < curElements.length; i++) {
		
		cel = el = curElements[i];
		
		// The root element should not be included; it has no parent.
		if(el != documentElement) {
			
			elNum = 1;
			while(el = el.previousSibling) {
				if(el.nodeType == 1) {
					cachedNum = cache[el._qs_elId];
					if(cachedNum) {
						elNum += cachedNum;
						break;
					}
					elNum++;
				}
			}
			
			// Cache the element number for later elements in this loop
			elId = cel._qs_elId;
			if(!elId) elId = cel._qs_elId = ++nextElId;
			cache[elId] = elNum;
			
			// Add element if it fits the constraints
			if(a == 0) {
				if(elNum == b) newCurElements.push(cel);
			} else if(((elNum - b) % a) == 0 && elNum >= b && a * elNum + b >= 0) {
				newCurElements.push(cel)
			}
			
		}
		
	}
	
	return newCurElements;
	
}
var filterNthColumn = (function() {
	
	function filterNthColumn(a, b, curElements) {
		
		var el, newCurElements = [ ], cache = [ ], colRange, tagName;
		
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			tagName = el.tagName;
			if(tagName == 'TD' || tagName == 'TH') {
				colRange = getColumnRange(el, cache);
				for(var colNum = colRange.min; colNum <= colRange.max; colNum++) {
					if(a == 0) {
						if(colNum == b) newCurElements.push(el);
					} else if(((colNum - b) % a) == 0 && colNum >= b && a * colNum + b >= 0) {
						newCurElements.push(el)
					}
				}
			}
		}
		
		return newCurElements;
		
	}
	
	function getColumnRange(el, cache) {
		
		var xel = el, colNum = 1, maxColNum, elId, cachedNum, tagName;
		
		while(xel = xel.previousSibling) {
			elId = xel._qs_elId;
			if(elId) cachedNum = cache[elId];
			if(cachedNum) {
				colNum += cachedNum;
				break;
			}
			tagName = xel.tagName;
			if(tagName == 'TD' || tagName == 'TH') {
				colNum += xel.colSpan;
			}
		}
		
		maxColNum = colNum + el.colSpan - 1;
		
		elId = el._qs_elId;
		if(!elId) elId = el._qs_elId = ++nextElId;
		// Cache the largest value in the range
		cache[elId] = maxColNum
		
		return {
			min: colNum,
			max: maxColNum
		};
		
	}
		
	return filterNthColumn;
	
})();
function filterNthLastChild(a, b, curElements) {
	
	var el, cel, elId,
		
		// The element child number starting at 1
		elNum,
		
		// Cache child numbers
		cache = [ ], cachedNum,
		
		// Using a new array to push to seems faster than splicing out the old ones in IE7
		newCurElements = [ ];
	
	for(var i = curElements.length - 1; i >= 0; i--) {
		
		cel = el = curElements[i];
		
		// The root element should not be included; it has no parent.
		if(el != documentElement) {
			
			elNum = 1;
			while(el = el.nextSibling) {
				if(el.nodeType == 1) {
					cachedNum = cache[el._qs_elId];
					if(cachedNum) {
						elNum += cachedNum;
						break;
					}
					elNum++;
				}
			}
			
			// Cache the element number for later elements in this loop
			elId = cel._qs_elId;
			if(!elId) elId = cel._qs_elId = ++nextElId;
			cache[elId] = elNum;
			
			// Add element if it fits the constraints
			if(a == 0) {
				if(elNum == b) newCurElements.push(cel);
			} else if(((elNum - b) % a) == 0 && elNum >= b && a * elNum + b >= 0) {
				newCurElements.push(cel)
			}
			
		}
		
	}
	
	return newCurElements;
	
}
var filterNthLastColumn = (function() {
	
	function filterNthLastColumn(a, b, curElements) {
		
		var el, newCurElements = [ ], cache = [ ], colRange, tagName;
		
		for(var i = curElements.length - 1; i >= 0; i--) {
			el = curElements[i];
			tagName = el.tagName;
			if(tagName == 'TD' || tagName == 'TH') {
				colRange = getColumnRange(el, cache);
				for(var colNum = colRange.min; colNum <= colRange.max; colNum++) {
					if(a == 0) {
						if(colNum == b) newCurElements.push(el);
					} else if(((colNum - b) % a) == 0 && colNum >= b && a * colNum + b >= 0) {
						newCurElements.push(el)
					}
				}
			}
		}
		
		return newCurElements;
		
	}
	
	function getColumnRange(el, cache) {
		
		var xel = el, colNum = 1, maxColNum, elId, cachedNum, tagName;
		
		while(xel = xel.nextSibling) {
			elId = xel._qs_elId;
			if(elId) cachedNum = cache[elId];
			if(cachedNum) {
				colNum += cachedNum;
				break;
			}
			tagName = xel.tagName;
			if(tagName == 'TD' || tagName == 'TH') {
				colNum += xel.colSpan;
			}
		}
		
		maxColNum = colNum + el.colSpan - 1;
		
		elId = el._qs_elId;
		if(!elId) elId = el._qs_elId = ++nextElId;
		// Cache the largest value in the range
		cache[elId] = maxColNum
		
		return {
			min: colNum,
			max: maxColNum
		};
		
	}
	
	return filterNthLastColumn;
	
})();
function filterNthLastOfType(a, b, curElements) {
	
	var el, cel, elId,
		
		// The element child number starting at 1
		elNum,
		
		// Cache child numbers
		cache = [ ], cachedNum,
		
		// Using a new array to push to seems faster than splicing out the old ones in IE7
		newCurElements = [ ],
		
		tagName;
	
	for(var i = curElements.length - 1; i >= 0; i--) {
		
		cel = el = curElements[i];
		tagName = cel.tagName;
		
		// The root element should not be included; it has no parent.
		if(el != documentElement) {
			
			elNum = 1;
			while(el = el.nextSibling) {
				if(el.tagName == tagName) {
					cachedNum = cache[el._qs_elId];
					if(cachedNum) {
						elNum += cachedNum;
						break;
					}
					elNum++;
				}
			}
			
			// Cache the element number for later elements in this loop
			elId = cel._qs_elId;
			if(!elId) elId = cel._qs_elId = ++nextElId;
			cache[elId] = elNum;
			
			// Add element if it fits the constraints
			if(a == 0) {
				if(elNum == b) newCurElements.push(cel);
			} else if(((elNum - b) % a) == 0 && elNum >= b && a * elNum + b >= 0) {
				newCurElements.push(cel)
			}
			
		}
		
	}
	
	return newCurElements;
	
}
function filterNthOfType(a, b, curElements) {
	
	var el, cel, elId,
		
		// The element child number starting at 1
		elNum,
		
		// Cache child numbers
		cache = [ ], cachedNum,
		
		// Using a new array to push to seems faster than splicing out the old ones in IE7
		newCurElements = [ ],
		
		tagName;
	
	for(var i = 0; i < curElements.length; i++) {
		
		cel = el = curElements[i];
		tagName = cel.tagName;
		
		// The root element should not be included; it has no parent.
		if(el != documentElement) {
			
			elNum = 1;
			while(el = el.previousSibling) {
				if(el.tagName == tagName) {
					cachedNum = cache[el._qs_elId];
					if(cachedNum) {
						elNum += cachedNum;
						break;
					}
					elNum++;
				}
			}
			
			// Cache the element number for later elements in this loop
			elId = cel._qs_elId;
			if(!elId) elId = cel._qs_elId = ++nextElId;
			cache[elId] = elNum;
			
			// Add element if it fits the constraints
			if(a == 0) {
				if(elNum == b) newCurElements.push(cel);
			} else if(((elNum - b) % a) == 0 && elNum >= b && a * elNum + b >= 0) {
				newCurElements.push(cel)
			}
			
		}
		
	}
	
	return newCurElements;
	
}
var filterOnlyChild = (function() {
	
	function filterOnlyChild(curElements) {
		
		var el, newCurElements = [ ];
		
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			if(el != documentElement && !hasNextElement(el) && !hasPreviousElement(el)) {
				newCurElements.push(el);
			}
		}
		
		return newCurElements;
		
	}
	
	function hasPreviousElement(el) {
		while(el = el.previousSibling) {
			if(el.nodeType == 1) return true;
		}
		return false;
	}
	
	function hasNextElement(el) {
		while(el = el.nextSibling) {
			if(el.nodeType == 1) return true;
		}
		return false;
	}
	
	return filterOnlyChild;
	
})();
var filterOnlyOfType = (function() {
	
	function filterOnlyOfType(curElements) {
		
		var el, newCurElements = [ ], tagName;
		
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			tagName = el.tagName;
			if(el != documentElement && !hasNextElement(el, tagName) && !hasPreviousElement(el, tagName)) {
				newCurElements.push(el);
			}
		}
		
		return newCurElements;
		
	}
	
	function hasPreviousElement(el, tagName) {
		while(el = el.previousSibling) {
			if(el.tagName == tagName) return true;
		}
		return false;
	}
	
	function hasNextElement(el, tagName) {
		while(el = el.nextSibling) {
			if(el.tagName == tagName) return true;
		}
		return false;
	}
	
	return filterOnlyOfType;
	
})();
var filterReadOnly = (function() {
	
	function filterReadOnly(readOnly, curElements) {
		// Selects input[type=text], textarea, and elements with contentEditable set to true.
		// TODO: Are there other elements that should be included?
		// TODO: Isn't there an old IE version of contentEditable under another name? Should that be included?
		
		var el, newCurElements = [ ];
		
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			if(
				(el.tagName == 'INPUT' && el.type.toLowerCase() == 'text')
				|| el.tagName == 'TEXTAREA'
				|| isEditable(el)
			) {
				if(!readOnly) newCurElements.push(el);
			} else if(readOnly) newCurElements.push(el);
		}
		
		return newCurElements;
		
	}
	
	function isEditable(el) {
		while(el && el.contentEditable == 'inherit') {
			el = el.parentNode;
		}
		if(!el) return false;
		// TODO: Are these values correct?
		if(el.contentEditable == 'true' || el.contentEditable == true) return true;
		return false;
	}
	
	return filterReadOnly;
	
})();
var filterRequired = (function() {
	
	function filterRequired(value, curElements) {
		
		var el, newCurElements = [ ];
		
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			if(el.required === value) newCurElements.push(el);
		}
		
		return newCurElements;
		
	}
	
	return filterRequired;
	
})();
var filterRoot = (function() {
	
	function filterRoot(curElements) {
		
		var el;
		
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			if(el == documentElement) return [ el ];
		}
		
		return [ ];
		
	}
	
	return filterRoot;
	
})();
function filterScope(curElements, scope) {
	
	if(!scope) return [ ];
	
	for(var i = 0; i < curElements.length; i++) {
		if(curElements[i] == scope) return [ scope ];
	}
	
	return [ ];
	
}var filterTarget = (function() {
	
	function filterTarget(curElements) {
		
		var el,
			fragId = location.hash,
			potentialEl;
		
		if(!fragId) return [ ];
		else if(fragId.charAt(0) != '#') return [ ];
		fragId = fragId.substring(1);
		if(!fragId || fragId.charAt(0) == '!') return [ ];
		
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			if(el.id == fragId) return [ el ];
			else if(!potentialEl && el.name == fragId) potentialEl = el;
		}
		
		if(potentialEl && potentialEl.tagName == 'A') return [ potentialEl ];
		else return [ ];
		
	}
	
	return filterTarget;
	
})();
var filterValid = (function() {
	
	function filterValid(value, curElements) {
		
		var el, newElements = [ ];
		
		for(var i = 0; i < curElements.length; i++) {
			el = curElements[i];
			if(el.validity && el.validity.valid === value) newElements.push(el);
		}
		
		return newElements;
		
	}
	
	return filterValid;
	
})();

	
	function filterPseudoClasses(pseudoClasses, algorithm) {
		
		var pc, f;
		
		for(var i = 0; i < pseudoClasses.length; i++) {
			pc = pseudoClasses[i];
			switch(pc.pseudoClass) {
				
				case FIRST_CHILD_PSEUDOCLASS:
					algorithm.push({
						call: filterFirstChild
					});
					break;
				case LAST_CHILD_PSEUDOCLASS:
					algorithm.push({
						call: filterLastChild
					});
					break;
				case FIRST_OF_TYPE_PSEUDOCLASS:
					algorithm.push({
						call: filterFirstOfType
					});
					break;
				case NTH_CHILD_PSEUDOCLASS:
					algorithm.push({
						call: filterNthChild,
						arguments: [ pc.a, pc.b ]
					});
					break;
				case NTH_LAST_CHILD_PSEUDOCLASS:
					algorithm.push({
						call: filterNthLastChild,
						arguments: [ pc.a, pc.b ]
					});
					break;
				case NTH_OF_TYPE_PSEUDOCLASS:
					algorithm.push({
						call: filterNthOfType,
						arguments: [ pc.a, pc.b ]
					});
					break;
				case NTH_LAST_OF_TYPE_PSEUDOCLASS:
					algorithm.push({
						call: filterNthLastOfType,
						arguments: [ pc.a, pc.b ]
					});
					break;
				case ONLY_CHILD_PSEUDOCLASS:
					algorithm.push({
						call: filterOnlyChild
					});
					break;
				case ONLY_OF_TYPE_PSEUDOCLASS:
					algorithm.push({
						call: filterOnlyOfType
					});
					break;
				
				case CONTAINS_PSEUDOCLASS:
					algorithm.push({
						call: filterContains,
						arguments: [ pc.content ]
					});
					break;
				case EMPTY_PSEUDOCLASS:
					algorithm.push({
						call: filterEmpty
					});
					break;
					
				case TARGET_PSEUDOCLASS:
					algorithm.push({
						call: filterTarget
					});
					break;
				case SCOPE_PSEUDOCLASS:
					algorithm.push({
						call: filterScope
					});
					break;
				
				case HOVER_PSEUDOCLASS: throw 'Quicksand: The :hover pseudo-class is not supported due to limitations in JavaScript and performance concerns.';
				case ACTIVE_PSEUDOCLASS: throw 'Quicksand: The :active pseudo-class is not supported due to limitations in JavaScript and performance concerns.';
				case FOCUS_PSEUDOCLASS:
					algorithm.push({
						call: filterFocus
					});
					break;
				
				case CURRENT_PSEUDOCLASS:
				case PAST_PSEUDOCLASS:
				case FUTURE_PSEUDOCLASS:
					throw 'Quicksand: Time-dimensional pseudo-classes (:current, :past, :future) are not supported.';
				
				case DIR_PSEUDOCLASS:
					algorithm.push({
						call: filterDir,
						arguments: [ pc.direction ]
					});
					break;
				case LANG_PSEUDOCLASS:
					algorithm.push({
						call: filterLang,
						arguments: [ pc.languages ]
					});
					break;
					
				case ENABLED_PSEUDOCLASS:
					algorithm.push({
						call: filterDisabled,
						arguments: [ false ]
					});
					break;
				case DISABLED_PSEUDOCLASS:
					algorithm.push({
						call: filterDisabled,
						arguments: [ true ]
					});
					break;
				case CHECKED_PSEUDOCLASS:
					algorithm.push({
						call: filterChecked,
						arguments: [ true ]
					});
					break;
				case UNCHECKED_PSEUDOCLASS:
					algorithm.push({
						call: filterChecked,
						arguments: [ false ]
					});
					break;
				case INDETERMINATE_PSEUDOCLASS:
					/* Note: Even though the indeterminate property is not supported by older target browsers,
					 * we can go ahead and support this property without a warning because any implementation
					 * which wants to select by :indeterminate will have to have already used the indeterminate
					 * property at some point. Therefore, support for indeterminate should have already been
					 * assessed by the script calling for the selection.
					 */
					algorithm.push({
						call: filterIndeterminate
					});
					break;
				case DEFAULT_PSEUDOCLASS:
					algorithm.push({
						call: filterDefault
					});
					break;
				case VALID_PSEUDOCLASS:
					// Note: The same note as on :indeterminate also applies to :valid and :invalid
					algorithm.push({
						call: filterValid,
						arguments: [ true ]
					});
					break;
				case INVALID_PSEUDOCLASS:
					algorithm.push({
						call: filterValid,
						arguments: [ false ]
					});
					break;
				case IN_RANGE_PSEUDOCLASS:
				case OUT_OF_RANGE_PSEUDOCLASS:
					// :in-range and :out-of-range will remain unsupported for now, due to a lack of
					// browser support for <input type="range" /> (at the moment, FF12 doesn't support),
					// and lack of understanding of when this selector would be used (Chrome supports
					// <input type="range" />, but it's unclear how it could get out of range; trying to
					// set it out of range with JavaScript fails).
					throw 'Quicksand: The :in-range and :out-of-range pseudoclasses are currently not supported.';
				case REQUIRED_PSEUDOCLASS:
					algorithm.push({
						call: filterRequired,
						arguments: [ true ]
					});
					break;
				case OPTIONAL_PSEUDOCLASS:
					algorithm.push({
						call: filterRequired,
						arguments: [ false ]
					});
					break;
				case READ_ONLY_PSEUDOCLASS:
					algorithm.push({
						call: filterReadOnly,
						arguments: [ true ]
					});
					break;
				case READ_WRITE_PSEUDOCLASS:
					algorithm.push({
						call: filterReadOnly,
						arguments: [ false ]
					});
					break;
					
				case ROOT_PSEUDOCLASS:
					algorithm.push({
						call: filterRoot
					});
					break;
				
				case COLUMN_PSEUDOCLASS:
					algorithm.push({
						call: filterColumn,
						arguments: [ pc.selector ]
					});
					break;
				case NTH_COLUMN_PSEUDOCLASS:
					algorithm.push({
						call: filterNthColumn,
						arguments: [ pc.a, pc.b ]
					});
					break;
				case NTH_LAST_COLUMN_PSEUDOCLASS:
					algorithm.push({
						call: filterNthLastColumn,
						arguments: [ pc.a, pc.b ]
					});
					break;
				
				case NTH_MATCH_PSEUDOCLASS:
				case NTH_LAST_MATCH_PSEUDOCLASS:
					/* There are a few reasons :nth-match and :nth-last-match are not supported including some ambiguity
					 * and lack of clarity in the working draft. It also seems like the kind of thing that could change
					 * dramatically as the spec is developed.
					 * Another major reason nth-match is not supported is it's current form seems cumbersome and confusing.
					 * Quicksand has :nth and :nth-last pseudo-classes which are thought to be more clear, less verbose,
					 * and more in the spirit of CSS (not sacrificing simplicity, understandability, and readability for power).
					 * The :nth-match and :nth-match-last selectors, as they stand, seem more like XPATH selectors (power rules).
					 */
					throw 'Quicksand: The :nth-match and :nth-last-match pseudoclasses are currently not supported.\nTry using Quicksand\'s :nth or :nth-last instead.';
				
				default:
					if(!customPseudoClasses[pc.pseudoClass]) throw 'Quicksand: Pseudo-class not implemented: ' + pc.pseudoClass;
					// The customPseudoClasses[pc.pseudoClass] function is not itself cached in order to allow it to be changed.
					algorithm.push({
						call: filterCustom,
						arguments: [ pc.pseudoClass, pc.argument ]
					});
					break;
				
			}
		}
		
	}
	
	return filterPseudoClasses;
	
})();// Optimized selection path for classes
var selectByPath_classes = (function() {
	
	var supportsGEBCN = !!documentElement.getElementsByClassName,
		selectDescendants = supportsGEBCN ? selectDescendantsGEBCN : selectDescendantsRegex,
		selectGeneralSiblings = supportsGEBCN ? selectGeneralSiblingsGEBCN : selectGeneralSiblingsRegex,
		selectChildren = supportsGEBCN ? selectChildrenGEBCN : selectChildrenRegex,
		selectReference = supportsGetAttribute ? selectReferenceGA : selectReferenceA;
	
	function selectByPath_classes(item, algorithm) {
		
		var combinator = item.combinator,
			cSel = item.compoundSelector,
			classes = cSel.classes,
			className = classes.join(' '),
			regexes = cSel.classes_regexes,
			curElements = [ ];
		
		switch(combinator.type) {
			
			case DESCENDANT_COMBINATOR:
				algorithm.push({
					call: selectDescendants,
					arguments: [ className, regexes ]
				});
				break;
				
			case ADJACENT_SIBLING_COMBINATOR:
				algorithm.push({
					call: selectAdjacentSiblings,
					arguments: [ regexes ]
				});
				break;
				
			case GENERAL_SIBLING_COMBINATOR:
				algorithm.push({
					call: selectGeneralSiblings,
					arguments: [ className, regexes ]
				});
				break;
				
			case CHILD_COMBINATOR:
				algorithm.push({
					call: selectChildren,
					arguments: [ className, regexes ]
				});
				break;
				
			case REFERENCE_COMBINATOR:
				algorithm.push({
					call: selectReference,
					arguments: [ combinator.attribute.name, className, regexes ]
				});
				break;
			
		}
		
	}
	
	function selectDescendantsGEBCN(className, regexes, p) {
		var curElements = [ ];
		for(var i = 0; i < p.length; i++) {
			fPush.apply(curElements, p[i].getElementsByClassName(className));
		}
		return curElements;
	}
	
	function selectDescendantsRegex(className, regexes, p) {
		var curElements = [ ], ch, el;
		for(var i = 0; i < p.length; i++) {
			ch = p[i].getElementsByTagName('*');
			for(var j = 0, chl = ch.length; j < chl; j++) {
				el = ch[j];
				if(hasClasses(el.className, regexes)) curElements.push(el);
			}
		}
		return curElements;
	}
	
	function selectAdjacentSiblings(regexes, p) {
		var curElements = [ ], el;
		for(var i = 0; i < p.length; i++) {
			el = p[i];
			while(el = el.nextSibling) {
				if(el.nodeType == 1) {
					if(hasClasses(el.className, regexes)) curElements.push(el);
					break;
				}
			}
		}
		return curElements;
	}
	
	function selectGeneralSiblingsGEBCN(className, regexes, p) {
		// Use a random number to determine whether an element's child nodes have been processed or not.
		// TODO: probably should switch this over to elId method
		var curElements = [ ],
			callId = Math.random(),
			el, pel, ch, el2;
		for(var i = 0; i < p.length; i++) {
			el = p[i];
			pel = el.parentNode;
			if(pel._qs_selClass_GSB != callId) {
				pel._qs_selClass_GSB = callId;
				ch = pel.getElementsByClassName(className);
				for(var j = 0, chl = ch.length; j < chl; j++) {
					el2 = ch[j];
					if(el2.parentNode == pel && isGeneralSibling(el, el2)) {
						curElements.push(el2);
						el = el2;
					}
				}
			}
		}
		return curElements;
	}
	
	function selectGeneralSiblingsRegex(className, regexes, p) {
		// Use a random number to determine whether an element's child nodes have been processed or not.
		var curElements = [ ],
			callId = Math.random(),
			el, pel;
		for(var i = 0; i < p.length; i++) {
			el = p[i];
			pel = el.parentNode;
			if(pel._qs_selClass_GSB != callId) {
				pel._qs_selClass_GSB = callId;
				while(el = el.nextSibling) {
					if(el.nodeType == 1 && hasClasses(el.className, regexes)) curElements.push(el);
				}
			}
		}
		return curElements;
	}
	
	function selectChildrenGEBCN(className, regexes, p) {
		var curElements = [ ], ch, pel;
		for(var i = 0; i < p.length; i++) {
			pel = p[i];
			ch = pel.getElementsByClassName(className);
			for(var j = 0, chl = ch.length; j < chl; j++) {
				el = ch[j];
				if(el.parentNode == pel) curElements.push(el);
			}
		}
		return curElements;
	}
	
	function selectChildrenRegex(className, regexes, p) {
		var curElements = [ ], el, pel;
		for(var i = 0; i < p.length; i++) {
			pel = p[i];
			el = pel.firstChild;
			do {
				if(el.nodeType == 1 && hasClasses(el.className, regexes)) curElements.push(el);
			} while(el = el.nextSibling);
		}
		return curElements;
	}
	
	function selectReferenceGA(attribute, className, regexes, p) {
		var curElements = [ ], el, attrVal, cel, doc;
		for(var i = 0; i < p.length; i++) {
			el = p[i];
			attrVal = el.getAttribute(attribute, 2);
			if(attrVal && attrVal.charAt(0) == '#') attrVal = attrVal.substring(1);
			if(!doc) doc = el.ownerDocument;
			cel = doc.getElementById(attrVal);
			if(cel && hasClasses(cel.className, regexes)) curElements.push(cel);
		}
		return curElements;
	}
	
	function selectReferenceA(attribute, className, regexes, p) {
		var curElements = [ ], el, attrVal, cel, doc;
		for(var i = 0; i < p.length; i++) {
			el = p[i];
			attrVal = el.attributes[attribute];
			if(attrVal) {
				attrVal = attrVal.value;
				if(attrVal && attrVal.charAt(0) == '#') attrVal = attrVal.substring(1);
				if(!doc) doc = el.ownerDocument;
				cel = doc.getElementById(attrVal);
				if(cel && hasClasses(cel.className, regexes)) curElements.push(cel);
			}
		}
		return curElements;
	}
	
	return selectByPath_classes;
	
})();
// Optimized selection path for id
var selectByPath_id = (function() {
	
	var selectReference = supportsGetAttribute ? selectReferenceGA : selectReferenceA;
	
	function selectByPath_id(item, algorithm) {
		// TODO: Filter out elements which don't match tagname or classes
		
		var id = item.compoundSelector.id;
		
		switch(item.combinator.type) {
			
			case CHILD_COMBINATOR:
				algorithm.push({
					call: selectChildren,
					arguments: [ id ]
				});
				break;
				
			case DESCENDANT_COMBINATOR:
				algorithm.push({
					call: selectDescendants,
					arguments: [ id ]
				});
				break;
				
			case ADJACENT_SIBLING_COMBINATOR:
				algorithm.push({
					call: selectAdjacentSiblings,
					arguments: [ id ]
				});
				break;
				
			case GENERAL_SIBLING_COMBINATOR:
				algorithm.push({
					call: selectGeneralSiblings,
					arguments: [ id ]
				});
				break;
			
			case REFERENCE_COMBINATOR:
				algorithm.push({
					call: selectReference,
					arguments: [ item.combinator.attribute.name, id ]
				});
				break;
			
		}
		
	}
	
	function selectChildren(id, p) {
		var parent, el = document.getElementById(id);
		if(!el) return [ ];
		parent = el.parentNode;
		for(var i = 0; i < p.length; i++) {
			if(p[i] == parent) return [ el ];
		}
		return [ ];
	}
	
	function selectDescendants(id, p) {
		var el = document.getElementById(id);
		if(!el) return [ ];
		for(var i = 0; i < p.length; i++) {
			if(isAncestor(p[i], el)) return [ el ];
		}
		return [ ];
	}
	
	function selectAdjacentSiblings(id, p) {
		var el = document.getElementById(id);
		if(!el) return [ ];
		for(var i = 0; i < p.length; i++) {
			if(isAdjacentSibling(p[i], el)) return [ el ];
		}
		return [ ];
	}
	
	function selectGeneralSiblings(id, p) {
		var el = document.getElementById(id);
		if(!el) return [ ];
		for(var i = 0; i < p.length; i++) {
			if(isGeneralSibling(p[i], el)) return [ el ];
		}
		return [ ];
	}
	
	function selectReferenceGA(attribute, id, p) {
		
		if(p.length == 0) return [ ];
		
		var doc = p[0].ownerDocument,
			potentialEl = doc.getElementById(id);
		if(!potentialEl) return [ ];
		
		var curElements = [ ], el, attrVal;
		for(var i = 0; i < p.length; i++) {
			el = p[i];
			attrVal = el.getAttribute(attribute, 2);
			if(attrVal && attrVal.charAt(0) == '#') attrVal = attrVal.substring(1);
			if(attrVal == id) return [ potentialEl ];
		}
		return [ ];
		
	}
	
	function selectReferenceA(attribute, id, p) {
		
		if(p.length == 0) return [ ];
		
		var doc = p[0].ownerDocument,
			potentialEl = doc.getElementById(id);
		if(!potentialEl) return [ ];
		
		var curElements = [ ], el, attrVal;
		for(var i = 0; i < p.length; i++) {
			el = p[i];
			attrVal = el.attributes[attribute];
			if(attrVal) {
				attrVal = attrVal.value;
				if(attrVal && attrVal.charAt(0) == '#') attrVal = attrVal.substring(1);
				if(attrVal == id) return [ potentialEl ];
			}
		}
		return [ ];
		
	}
	
	return selectByPath_id;
	
})();
// Optimized selection path for id + tag or classes
var selectByPath_idPlus = (function() {
	
	var selectReference = supportsGetAttribute ? selectReferenceGA : selectReferenceA;
	
	function selectByPath_idPlus(item, algorithm) {
		
		var cSel = item.compoundSelector,
			id = cSel.id,
			tagName = cSel.type.name == '*' ? false : cSel.type.name,
			classes_regexes = cSel.classes_regexes;
		
		switch(item.combinator.type) {
			
			case CHILD_COMBINATOR:
				algorithm.push({
					call: selectChildren,
					arguments: [ id, tagName, classes_regexes ]
				});
				break;
				
			case DESCENDANT_COMBINATOR:
				algorithm.push({
					call: selectDescendants,
					arguments: [ id, tagName, classes_regexes ]
				});
				break;
				
			case ADJACENT_SIBLING_COMBINATOR:
				algorithm.push({
					call: selectAdjacentSiblings,
					arguments: [ id, tagName, classes_regexes ]
				});
				break;
				
			case GENERAL_SIBLING_COMBINATOR:
				algorithm.push({
					call: selectGeneralSiblings,
					arguments: [ id, tagName, classes_regexes ]
				});
				break;
			
			case REFERENCE_COMBINATOR:
				algorithm.push({
					call: selectReference,
					arguments: [ item.combinator.attribute.name, id, tagName, classes_regexes ]
				});
				break;
			
		}
		
	}
	
	function selectChildren(id, tagName, classes_regexes, p) {
		var parent, el = document.getElementById(id);
		if(!el) return [ ];
		if(tagName && el.tagName != tagName) return [ ];
		if(classes_regexes && !hasClasses(el, classes_regexes)) return [ ];
		parent = el.parentNode;
		for(var i = 0; i < p.length; i++) {
			if(p[i] == parent) return [ el ];
		}
		return [ ];
	}
	
	function selectDescendants(id, tagName, classes_regexes, p) {
		var el = document.getElementById(id);
		if(!el) return [ ];
		if(tagName && el.tagName != tagName) return [ ];
		if(classes_regexes && !hasClasses(el, classes_regexes)) return [ ];
		for(var i = 0; i < p.length; i++) {
			if(isAncestor(p[i], el)) return [ el ];
		}
		return [ ];
	}
	
	function selectAdjacentSiblings(id, tagName, classes_regexes, p) {
		var el = document.getElementById(id);
		if(!el) return [ ];
		if(tagName && el.tagName != tagName) return [ ];
		if(classes_regexes && !hasClasses(el, classes_regexes)) return [ ];
		for(var i = 0; i < p.length; i++) {
			if(isAdjacentSibling(p[i], el)) return [ el ];
		}
		return [ ];
	}
	
	function selectGeneralSiblings(id, tagName, classes_regexes, p) {
		var el = document.getElementById(id);
		if(!el) return [ ];
		if(tagName && el.tagName != tagName) return [ ];
		if(classes_regexes && !hasClasses(el, classes_regexes)) return [ ];
		for(var i = 0; i < p.length; i++) {
			if(isGeneralSibling(p[i], el)) return [ el ];
		}
		return [ ];
	}
	
	function isAdjacentSibling(elA, elB) {
		// Checks to see if elB is the element right after elA
		while(elA = elA.nextSibling) {
			if(elA.nodeType == 1) {
				if(elA == elB) return true;
				else return false;
			}
		}
		return false;
	}
	
	function selectReferenceGA(attribute, id, tagName, classes_regexes, p) {
		var el, attrVal, doc;
		for(var i = 0; i < p.length; i++) {
			el = p[i];
			attrVal = el.getAttribute(attribute, 2);
			if(attrVal && attrVal.charAt(0) == '#') attrVal = attrVal.substring(1);
			if(attrVal == id) {
				if(!doc) doc = el.ownerDocument;
				el = doc.getElementById(attrVal);
				if(el && el.tagName == tagName && hasClasses(el, classes_regexes)) return [ el ];
			}
		}
		return [ ];
	}
	
	function selectReferenceA(attribute, id, tagName, classes_regexes, p) {
		var el, attrVal, doc;
		for(var i = 0; i < p.length; i++) {
			el = p[i];
			attrVal = el.attributes[attribute];
			if(attrVal) {
				attrVal = attrVal.value;
				if(attrVal && attrVal.charAt(0) == '#') attrVal = attrVal.substring(1);
				if(attrVal == id) {
					if(!doc) doc = el.ownerDocument;
					el = doc.getElementById(attrVal);
					if(el && el.tagName == tagName && hasClasses(el, classes_regexes)) return [ el ];
				}
			}
		}
		return [ ];
	}
	
	return selectByPath_idPlus;
	
})();
// Optimized selection path for tag name and classes
var selectByPath_tagAndClasses = (function() {
	
	var selectReference = supportsGetAttribute ? selectReferenceGA : selectReferenceA;
	
	function selectByPath_tagAndClasses(item, algorithm) {
		
		var combinator = item.combinator,
			cSel = item.compoundSelector,
			tagName = cSel.type.name,
			regexes = cSel.classes_regexes;
		
		switch(combinator.type) {
			
			case DESCENDANT_COMBINATOR:
				algorithm.push({
					call: selectDescendants,
					arguments: [ tagName, regexes ]
				});
				break;
				
			case ADJACENT_SIBLING_COMBINATOR:
				algorithm.push({
					call: selectAdjacentSiblings,
					arguments: [ tagName, regexes ]
				});
				break;
				
			case GENERAL_SIBLING_COMBINATOR:
				algorithm.push({
					call: selectGeneralSiblings,
					arguments: [ tagName, regexes ]
				});
				break;
				
			case CHILD_COMBINATOR:
				algorithm.push({
					call: selectChildren,
					arguments: [ tagName, regexes ]
				});
				break;
			
			case REFERENCE_COMBINATOR:
				algorithm.push({
					call: selectReference,
					arguments: [ combinator.attribute.name, tagName, regexes ]
				});
				break;
			
		}
		
	}
	
	function selectDescendants(tagName, regexes, p) {
		var curElements = [ ], ch, el;
		for(var i = 0; i < p.length; i++) {
			ch = p[i].getElementsByTagName(tagName);
			for(var j = 0, chl = ch.length; j < chl; j++) {
				el = ch[j];
				if(hasClasses(el.className, regexes)) curElements.push(el);
			}
		}
		return curElements;
	}
	
	function selectAdjacentSiblings(tagName, regexes, p) {
		var curElements = [ ], el;
		for(var i = 0; i < p.length; i++) {
			el = p[i];
			while(el = el.nextSibling) {
				if(el.nodeType == 1) {
					if(el.tagName == tagName && hasClasses(el.className, regexes)) curElements.push(el);
					break;
				}
			}
		}
		return curElements;
	}
	
	function selectGeneralSiblings(tagName, regexes, p) {
		var curElements = [ ], el, callId;
		// Use a random number to determine whether an element's child nodes have been processed or not.
		callId = Math.random();
		for(var i = 0; i < p.length; i++) {
			el = p[i];
			if(el.parentNode._qs_selTag_GSB != callId) {
				el.parentNode._qs_selTag_GSB = callId;
				while(el = el.nextSibling) {
					if(el.nodeType == 1 && el.tagName == tagName && hasClasses(el.className, regexes)) curElements.push(el);
				}
			}
		}
		return curElements;
	}
	
	function selectChildren(tagName, regexes, p) {
		var curElements = [ ], el, pel, ch;
		for(var i = 0; i < p.length; i++) {
			pel = p[i];
			ch = pel.getElementsByTagName(tagName);
			for(var j = 0, chl = ch.length; j < chl; j++) {
				el = ch[j];
				if(el.parentNode == pel && hasClasses(el.className, regexes)) curElements.push(el);
			}
		}
		return curElements;
	}
	
	function selectReferenceGA(attribute, tagName, regexes, p) {
		var curElements = [ ], el, attrVal, cel, doc;
		for(var i = 0; i < p.length; i++) {
			el = p[i];
			attrVal = el.getAttribute(attribute, 2);
			if(attrVal && attrVal.charAt(0) == '#') attrVal = attrVal.substring(1);
			if(!doc) doc = el.ownerDocument;
			cel = doc.getElementById(attrVal);
			if(cel && cel.tagName == tagName && hasClasses(cel.className, regexes)) curElements.push(cel);
		}
		return curElements;
	}
	
	function selectReferenceA(attribute, tagName, regexes, p) {
		var curElements = [ ], el, attrVal, cel, doc;
		for(var i = 0; i < p.length; i++) {
			el = p[i];
			attrVal = el.attributes[attribute];
			if(attrVal) {
				attrVal = attrVal.value;
				if(attrVal && attrVal.charAt(0) == '#') attrVal = attrVal.substring(1);
				if(!doc) doc = el.ownerDocument;
				cel = doc.getElementById(attrVal);
				if(cel && cel.tagName == tagName && hasClasses(cel.className, regexes)) curElements.push(cel);
			}
		}
		return curElements;
	}
	
	return selectByPath_tagAndClasses;
	
})();
// Optimized selection path for tag name
var selectByPath_tagName = (function() {
	
	var selectReference = supportsGetAttribute ? selectReferenceGA : selectReferenceA;
	
	function selectByPath_tagName(item, algorithm) {
		
		var combinator = item.combinator,
			tagName = item.compoundSelector.type.name;
		
		switch(combinator.type) {
			
			case DESCENDANT_COMBINATOR:
				algorithm.push({
					call: selectDescendants,
					arguments: [ tagName ]
				});
				break;
				
			case ADJACENT_SIBLING_COMBINATOR:
				algorithm.push({
					call: selectAdjacentSiblings,
					arguments: [ tagName ]
				});
				break;
				
			case GENERAL_SIBLING_COMBINATOR:
				algorithm.push({
					call: selectGeneralSiblings,
					arguments: [ tagName ]
				});
				break;
				
			case CHILD_COMBINATOR:
				algorithm.push({
					call: selectChildren,
					arguments: [ tagName ]
				});
				break;
			
			case REFERENCE_COMBINATOR:
				algorithm.push({
					call: selectReference,
					arguments: [ combinator.attribute.name, tagName ]
				});
				break;
			
		}
		
	}
	
	function selectDescendants(tagName, p) {
		// TODO: I think the following line is safe. Should it be uncommented and implemented elsewhere for improved performance?
		//if(p.length == 1) return p[0].getElementsByTagName(tagName);
		var curElements = [ ];
		for(var i = 0; i < p.length; i++) {
			fPush.apply(curElements, p[i].getElementsByTagName(tagName));
		}
		return curElements;
	}
	
	function selectAdjacentSiblings(tagName, p) {
		var curElements = [ ], el;
		for(var i = 0; i < p.length; i++) {
			el = p[i];
			while(el = el.nextSibling) {
				if(el.nodeType == 1) {
					if(el.tagName == tagName) curElements.push(el);
					break;
				}
			}
		}
		return curElements;
	}
	
	function selectGeneralSiblings(tagName, p) {
		// Use a random number to determine whether an element's child nodes have been processed or not.
		// TODO: It might be faster to switch from using callId to the element's qs ID.
		var curElements = [ ], el, callId;
		callId = Math.random();
		for(var i = 0; i < p.length; i++) {
			el = p[i];
			if(el.parentNode._qs_selTag_GSB != callId) {
				el.parentNode._qs_selTag_GSB = callId;
				while(el = el.nextSibling) {
					if(el.nodeType == 1 && el.tagName == tagName) curElements.push(el);
				}
			}
		}
		return curElements;
	}
	
	function selectChildren(tagName, p) {
		var curElements = [ ], el, ch, pel;
		for(var i = 0; i < p.length; i++) {
			pel = p[i];
			ch = pel.getElementsByTagName(tagName);
			for(var j = 0, chl = ch.length; j < chl; j++) {
				el = ch[j];
				if(el.parentNode == pel) curElements.push(el);
			}
		}
		return curElements;
	}
	
	function selectReferenceGA(attribute, tagName, p) {
		var curElements = [ ], el, attrVal, cel, doc;
		for(var i = 0; i < p.length; i++) {
			el = p[i];
			attrVal = el.getAttribute(attribute, 2);
			if(attrVal && attrVal.charAt(0) == '#') attrVal = attrVal.substring(1);
			if(!doc) doc = el.ownerDocument;
			cel = doc.getElementById(attrVal);
			if(cel && cel.tagName == tagName) curElements.push(cel);
		}
		return curElements;
	}
	
	function selectReferenceA(attribute, tagName, p) {
		var curElements = [ ], el, attrVal, cel, doc;
		for(var i = 0; i < p.length; i++) {
			el = p[i];
			attrVal = el.attributes[attribute];
			if(attrVal) {
				attrVal = attrVal.value;
				if(attrVal && attrVal.charAt(0) == '#') attrVal = attrVal.substring(1);
				if(!doc) doc = el.ownerDocument;
				cel = doc.getElementById(attrVal);
				if(cel && cel.tagName == tagName) curElements.push(cel);
			}
		}
		return curElements;
	}
	
	return selectByPath_tagName;
	
})();
// Optimized selection path for :target pseudo-class
var selectByPath_target = (function() {
	
	var selectReference = supportsGetAttribute ? selectReferenceGA : selectReferenceA;
	
	function selectByPath_target(item, algorithm) {
		
		switch(item.combinator.type) {
			
			case CHILD_COMBINATOR:
				algorithm.push({
					call: selectChildren
				});
				break;
				
			case DESCENDANT_COMBINATOR:
				algorithm.push({
					call: selectDescendants
				});
				break;
				
			case ADJACENT_SIBLING_COMBINATOR:
				algorithm.push({
					call: selectAdjacentSiblings
				});
				break;
				
			case GENERAL_SIBLING_COMBINATOR:
				algorithm.push({
					call: selectGeneralSiblings
				});
				break;
			
			case REFERENCE_COMBINATOR:
				algorithm.push({
					call: selectReference,
					arguments: [ item.combinator.attribute.name ]
				});
				break;
			
		}
		
	}
	
	function selectChildren(p) {
		
		var fragId = location.hash;
		if(!fragId) return [ ];
		else if(fragId.charAt(0) != '#') return [ ];
		fragId = fragId.substring(1);
		if(!fragId || fragId.charAt(0) == '!') return [ ];
		
		var parent, el = document.getElementById(fragId);
		if(!el) {
			el = document.getElementsByName(fragId)[0];
			// Only count named elements if they are "a" elements (as per http://dev.w3.org/html5/spec/single-page.html#scroll-to-fragid)
			if(!el || el.tagName != 'A') return [ ];
		}
		parent = el.parentNode;
		for(var i = 0; i < p.length; i++) {
			if(p[i] == parent) return [ el ];
		}
		return [ ];
		
	}
	
	function selectDescendants(p) {
		
		var fragId = location.hash;
		if(!fragId) return [ ];
		else if(fragId.charAt(0) != '#') return [ ];
		fragId = fragId.substring(1);
		if(!fragId || fragId.charAt(0) == '!') return [ ];
		
		var el = document.getElementById(fragId);
		if(!el) {
			el = document.getElementsByName(fragId)[0];
			// Only count named elements if they are "a" elements (as per http://dev.w3.org/html5/spec/single-page.html#scroll-to-fragid)
			if(!el || el.tagName != 'A') return [ ];
		}
		for(var i = 0; i < p.length; i++) {
			if(isAncestor(p[i], el)) return [ el ];
		}
		return [ ];
		
	}
	
	function selectAdjacentSiblings(p) {
		
		var fragId = location.hash;
		if(!fragId) return [ ];
		else if(fragId.charAt(0) != '#') return [ ];
		fragId = fragId.substring(1);
		if(!fragId || fragId.charAt(0) == '!') return [ ];
		
		var el = document.getElementById(fragId);
		if(!el) {
			el = document.getElementsByName(fragId)[0];
			// Only count named elements if they are "a" elements (as per http://dev.w3.org/html5/spec/single-page.html#scroll-to-fragid)
			if(!el || el.tagName != 'A') return [ ];
		}
		for(var i = 0; i < p.length; i++) {
			if(isAdjacentSibling(p[i], el)) return [ el ];
		}
		return [ ];
		
	}
	
	function selectGeneralSiblings(p) {
		
		var fragId = location.hash;
		if(!fragId) return [ ];
		else if(fragId.charAt(0) != '#') return [ ];
		fragId = fragId.substring(1);
		if(!fragId || fragId.charAt(0) == '!') return [ ];
		
		var el = document.getElementById(fragId);
		if(!el) {
			el = document.getElementsByName(fragId)[0];
			// Only count named elements if they are "a" elements (as per http://dev.w3.org/html5/spec/single-page.html#scroll-to-fragid)
			if(!el || el.tagName != 'A') return [ ];
		}
		for(var i = 0; i < p.length; i++) {
			if(isGeneralSibling(p[i], el)) return [ el ];
		}
		return [ ];
		
	}
	
	function selectReferenceGA(attribute, p) {
		
		if(p.length == 0) return [ ];
		
		var fragId = location.hash;
		if(!fragId) return [ ];
		else if(fragId.charAt(0) != '#') return [ ];
		fragId = fragId.substring(1);
		if(!fragId || fragId.charAt(0) == '!') return [ ];
		
		var doc = p[0].ownerDocument,
			potentialEl = doc.getElementById(fragId);
		if(!potentialEl) return [ ];
		
		var curElements = [ ], el, attrVal;
		for(var i = 0; i < p.length; i++) {
			el = p[i];
			attrVal = el.getAttribute(attribute, 2);
			if(attrVal && attrVal.charAt(0) == '#') attrVal = attrVal.substring(1);
			if(attrVal == fragId) return [ potentialEl ];
		}
		return [ ];
		
	}
	
	function selectReferenceA(attribute, p) {
		
		if(p.length == 0) return [ ];
		
		var fragId = location.hash;
		if(!fragId) return [ ];
		else if(fragId.charAt(0) != '#') return [ ];
		fragId = fragId.substring(1);
		if(!fragId || fragId.charAt(0) == '!') return [ ];
		
		var doc = p[0].ownerDocument,
			potentialEl = doc.getElementById(fragId);
		if(!potentialEl) return [ ];
		
		var el, attrVal;
		for(var i = 0; i < p.length; i++) {
			el = p[i];
			attrVal = el.attributes[attribute];
			if(attrVal) {
				attrVal = attrVal.value;
				if(attrVal && attrVal.charAt(0) == '#') attrVal = attrVal.substring(1);
				if(attrVal == fragId) return [ potentialEl ];
			}
		}
		return [ ];
		
	}
	
	return selectByPath_target;
	
})();


	
	function processSelectorList(selectorList) {
		
		var selector, algorithm = [ ];
		
		for(var i = 0; i < selectorList.length; i++) {
			selector = selectorList[i];
			algorithm.push(processSelector(selector));
		}
		
		// Cache the algorithm on the selector list
		selectorList.algorithm = algorithm;
		
	}
	
	return processSelectorList;
	
})();

	var onready = (function() {
	// Note: This function is only intended to be used by setupSelect to make selector optimizations.
	// There is no guarantee that it will work on all browsers. If its use is expanded, it will need
	// to be modified to be sure the function will be called on all browsers.
	
	var callOnReady = [ ],
		ready = false,
		tm,
		
		reIsIe = /\sMSIE\s/,
		
		isIe = reIsIe.test(navigator.userAgent);
	
	function onready(f) {
		callOnReady.push(f);
	}
	
	function execReady() {
		if(ready) return;
		ready = true;
		for(var i = 0; i < callOnReady.length; i++) {
			callOnReady[i]();
		}
	}
	
	function checkIe() {
		if(ready) return;
		try { document.documentElement.doScroll('left'); }
		catch(x) { return; }
		clearInterval(tm);
	    execReady();
	}
	
	if(document.addEventListener) {
		document.addEventListener('DOMContentLoaded', execReady, false);
	} else if(isIe && window == top) {
		// IE8 should be the only browser that follows this path, since IE7 doesn't support
		// querySelectorAll and IE9 supports DOMContentLoaded
		tm = setInterval(checkIe, 250);
	} else {
		window.onload = execReady;
	}
	// No special path is needed for Opera and Safari since DOMContentLoaded and querySelectorAll
	// were both first supported in the same versions (3.1 and 9.0 respectively).
	
	// We are hesitant to use window.onload as a fallback, because we don't really want Quicksand
	// to touch that part of the DOM (even though it can be done while carefully preserving any existing functions).
	// We want to leave that area open for libraries & developers to use.
	// The fallback really shouldn't be needed, and in the rare event it is, it will be okay if
	// the browser misses out on some of the optimizations used in setupSelect (which is the only thing that
	// makes use of onload). The selector should work well and quickly without those optimizations.
	
	return onready;
	
})();

	// TODO: Cache useNativeCache using web storage when available.

var useStandardSelect,
	preProcessSelectorList,
	
select = (function() {
	
	var clockSelectors = [ ],
		clockSelectorsObj = {
			// selector: regex match for related selectors
			'body': /^body$/,
			'div': /^\w+$/,
			'body div': /^body\s+\w+$/,
			'div p': /^\w+\s+\w+$/,
			'div p a': /^[\w\s]+$/,
			'.class': /^\.[\w\-]+$/,
			'div.class': /^[\w\-]+\.[\w\-]+$/,
			'div.class1 p.class2': /^[\w\.\s\-]+$/,
			'p:nth-child(2n+1)': /\:nth\-/,
			'p:only-child': /\:only\-child/,
			'p:first-child': /\:first\-child/,
			'p:last-child': /\:last\-child/,
			'[attribute-start]': /(^|\s)\[.+\]/,
			'a[href]': /\[href\]/,
			'div[class]': /\[class\]/,
			'div[data-test]': /\[[\w\-]+\]/,
			'div[class=classname]': /\[class\=[\w\-]+\]/,
			'div[data-test=foo]': /\[\w+\=[\w\-]+\]/,
			'div[data-test^=foo]': /\[.+\]/,
			'div, p, a': /\,/,
			'div > p': /\>/,
			'p + .class': /\+/,
			'div ~ p': /\~/
		},
		
		// An array of regular expressions determining whether to use native querySelectorAll or standardSelect
		useNative = [ ],
		
		// A cache of whether to use native querySelectorAll or not for selectors
		useNativeCache = { },
		
		// Attemps to speed up selectors on Chrome have been mostly unsuccessful using advancedSelect.
		// Use a function specifically crafted for Chrome.
		reIsWebkit5Gt = /\sAppleWebKit\/[5-9]/,
		isWebkit5Gt = reIsWebkit5Gt.test(navigator.userAgent),
		reIsChrome = /\sChrome\//,
		isChrome = isWebkit5Gt && reIsChrome.test(navigator.userAgent),
		
		// The standardSelector has tested faster on Chrome 18 for these selectors
		reChromeUseStandard = /^body$|\:nth\-/,
		
		// A unique id to use in scoping querySelectorAll
		nativeSelectId = '_qs_ns_' + (new Date()).getTime();
	
	useStandardSelect = function() {
		select = standardSelect;
	};
	
	function standardSelect(selectorStr, root, scope) {
		// Quicksand's built-in selector, for when querySelectorAll is
		// not available, is too slow, or can't perform the selection
		
		if(!root) root = document;
		
		var selectorList = QuicksandParser.parse(selectorStr);
		
		preProcessSelectorList(selectorList);
				
		return qSelect(selectorList, root, scope);
		
	}
	
	preProcessSelectorList = function _preProcessSelectorList(selectorList) {
		// We don't need to optimize a selector twice -- the cached version will remain optimized
		if(!selectorList.optimized) {
			optimizeSelector(selectorList);
			if(!setupFastTracks(selectorList)) processSelectorList(selectorList);
			selectorList.optimized = true;
		}
	}
	
	function advancedSelect(selectorStr, root, scope) {
		// Choose between the built-in selector or querySelectorAll
		
		var cached = useNativeCache[selectorStr];
		
		if(cached === undefined) {
			for(var i = 0; i < useNative.length; i++) {
				if(useNative[i].regex.test(selectorStr)) {
					if(useNative[i].value) {
						useNativeCache[selectorStr] = true;
						try {
							return nativeSelect(selectorStr, root, scope);
						} catch(x) { break; }
					} else break;
				}
			}
			useNativeCache[selectorStr] = false;
			return standardSelect(selectorStr, root, scope);
		}
		else if(cached) return nativeSelect(selectorStr, root, scope);
		else return standardSelect(selectorStr, root, scope);
		
	}
	
	function nativeSelect(selectorStr, root, scope) {
		var selection = [ ], oldId, scopeId, list;
		if(root && root.nodeType != 9) {
			// Fix querySelectorAll to use the root element
			
			if(~selectorStr.indexOf(',')) {
				// Multiple selectors could be used, although the comma could be from a :not pseudo-class
				// or another pseudo-class or a string
				list = selectorStrToList(selectorStr);
				for(var i = 0; i < list.length; i++) {
					fPush.apply(selection, nativeSelect(list[i], root, scope));
				}
				return selection;
			}
			
			oldId = root.id;
			if(oldId) scopeId = oldId;
			else {
				scopeId = nativeSelectId;
				root.id = scopeId;
			}
			selectorStr = '[id="' + scopeId + '"] ' + selectorStr;
			
		}
		fPush.apply(selection, (scope || root || document).querySelectorAll(selectorStr));
		if(root) root.id = oldId;
		return selection;
	}
	
	function selectorStrToList(selectorStr) {
		// Can be used to convert a selector string which is a selector list
		// to an array of selector strings which aren't selector lists
		
		// Load places where the selector should be split
		var parensOpen = 0, inString = false, c, splitPositions = [ ], list = [ ], pos, lastPos;
		for(var i = 0; i < selectorStr.length; i++) {
			c = selectorStr.charAt(i);
			switch(c) {
				case '\\':
					// Skip the next character. Note: An advanced understanding of escape sequences is not needed
					// due to the fact that we are only looking for parentheses, quotes, and commas.
					// Longer escape sequences based on numbers will be ignored anyway.
					i++;
					break;
				case '"': case "'":
					if(!inString) inString = c;
					else if(inString == c) inString = false;
					break;
				case '(':
					parensOpen++;
					break;
				case ')':
					parensOpen--;
					break;
				case ',':
					if(!parensOpen && !inString) splitPositions.push(i);
					break;
			}
		}
		
		// now split at splitPositions
		lastPos = 0;
		for(var i = 0; i < splitPositions.length; i++) {
			pos = splitPositions[i];
			list.push(trim(selectorStr.substring(lastPos, pos)));
			lastPos = pos + 1;
		}
		list.push(trim(selectorStr.substring(lastPos)));
		
		return list;
		
	}
	
	function chromeSelect(selectorStr, root, scope) {
		var cached;
		cached = useNativeCache[selectorStr];
		if(cached === undefined) {
			if(reChromeUseStandard.test(selectorStr)) {
				useNativeCache[selectorStr] = false;
				return standardSelect(selectorStr, root, scope);
			} else {
				useNativeCache[selectorStr] = true;
				try {
					return nativeSelect(selectorStr, root, scope);
				} catch(x) {
					useNativeCache[selectorStr] = false;
					return standardSelect(selectorStr, root, scope);
				}
			}
		}
		else if(cached) return nativeSelect(selectorStr, root, scope);
		else return standardSelect(selectorStr, root, scope);
	}
	
	var currentSelector = 0;
	function setupAdvancedSelect() {
		for(var i in clockSelectorsObj) {
			if(clockSelectorsObj.hasOwnProperty(i)) {
				clockSelectors.push({
					selector: i,
					regex: clockSelectorsObj[i]
				});
			}
		}
		onready(function() {
			var selector;
			for(var i = 0; i < clockSelectors.length; i++) {
				selector = clockSelectors[i].selector;
				standardSelect(selector);
				try { document.querySelectorAll(selector); }
				catch(x) {
					useNativeCache[selector] = false;
				}
			}
			setTimeout(setupNextSelector, 100);
		});
	}
	function setupNextSelector() {
		// Check to see whether standardSelect or querySelectorAll is faster for a range of selectors for this browser on this page
		// TODO: Use WebWorkers when possible.
		
		var selector, regex,
			res, start, stop, qsaSpeed, stdSpeed,
			iterations, maxIterations = 100, maxTime = 50, r;
		
		do {
			selector = clockSelectors[currentSelector].selector;
			regex = clockSelectors[currentSelector].regex;
			currentSelector++;
			if(!selector) return;
		} while(useNativeCache[selector] !== undefined);
		
		iterations = 0;
		start = new Date().getTime();
		stop = start;
		while(iterations < maxIterations && stop - start < maxTime) {
			r = [ ];
			res = document.querySelectorAll(selector);
			fPush.apply(r, res);
			iterations++;
			stop = new Date().getTime();
		}
		qsaSpeed = (stop - start) / iterations;
		
		iterations = 0;
		start = new Date().getTime();
		stop = start;
		while(iterations < maxIterations && stop - start < maxTime) {
			res = standardSelect(selector);
			iterations++;
			stop = new Date().getTime();
		}
		stdSpeed = (stop - start) / iterations;
		
		if(qsaSpeed < stdSpeed) {
			// Faster on native querySelectorAll
			useNative.push({
				regex: regex,
				value: true
			});
		} else {
			// Faster on standardSelect
			useNative.push({
				regex: regex,
				value: false
			});
		}
		
		if(currentSelector < clockSelectors.length) setTimeout(setupNextSelector, 50);
		
	}
	
	if(document.querySelectorAll) {
		if(isChrome) return chromeSelect;
		else {
			setupAdvancedSelect();
			return advancedSelect;
		}
	} else return standardSelect;
	
})();
	
	// Library Object Definition
	var Quicksand = {
		
		// Debug Mode can be used to detect warnings in the console. If warn() is called, it will
		// only output to the console if debugMode is turned on.
		debugMode: false,
		
		version: {
			major: 2,
			minor: 1,
			revision: 2,
			beta: true
		},
		
		// Allow external access to the parser
		parser: QuicksandParser,
		
		select: select,
		
		useStandardSelect: function() {
			// Remap the select method to the Quicksand's own standardSelect method.
			// Disables use of querySelectorAll (mostly intended for debugging)
			useStandardSelect();
			Quicksand.select = select;
		},
		
		enableCss4: function() { return QuicksandParser.enableCss4.apply(QuicksandParser, arguments); },
		disableCss4: function() { return QuicksandParser.disableCss4.apply(QuicksandParser, arguments); },
		
		enableExtended: function() { return QuicksandParser.enableExtended.apply(QuicksandParser, arguments); },
		disableExtended: function() { return QuicksandParser.disableExtended.apply(QuicksandParser, arguments); },
		
		enableExperimental: function() { QuicksandParser.enableExperimental.apply(QuicksandParser, arguments); },
		disableExperimental: function() { QuicksandParser.disableExperimental.apply(QuicksandParser, arguments); },
		
		enableSubject: function() { QuicksandParser.enableSubject.apply(QuicksandParser, arguments); },
		disableSubject: function() { QuicksandParser.disableSubject.apply(QuicksandParser, arguments); },
		
		enableInitialCombinators: function() { QuicksandParser.allowInitialCombinator = true; },
		enableTerminalCombinators: function() { QuicksandParser.allowTerminalCombinator = true; },
		
		setCustomPseudoClass: function(identifier, f, options) {
			customPseudoClasses[QuicksandParser.addPseudoClass(identifier, options)] = f;
		},
		
		hasCustomPseudoClass: function(identifier) {
			var pcId = QuicksandParser.getPseudoClass(identifier);
			return !!pcId && !!customPseudoClasses[pcId];
		}
		
	};
	
	function trim(s) {
		if(s.trim) return s.trim();
		return s.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
	}
	
	return Quicksand;
	
})();

















	
	Quicksand.enableExtended();
	Quicksand.enableSubject();
	Quicksand.enableCss4('-joi-');
	Quicksand.enableExperimental('-joi-');
	Quicksand.enableInitialCombinators();
	Quicksand.enableTerminalCombinators();
	Quicksand.parser.libName = 'joi.Quicksand';
	
	return Quicksand;
	
})();
var Xml = (function() {
	
	var DomUnit = Unit.sub(function() {
	// Xml.DomUnit is different from Html.DomUnit.
	
	var constructor = function(options) {
		/* options
		 * 		dom:	Required. The dom object to use as the base of the DomUnit.
		 */
		
		this.dom = options.dom;
		
	this['#base:{constructor}'] = Unit; Unit.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'DomUnit',
		
		dom: null
		
	};
	
	return constructor;
	
}());var Node = DomUnit.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 		attach:		Optional. options argument for the attach method.
		 */
		
	this['#base:{constructor}'] = DomUnit; DomUnit.call(this, options);
		
		if(options.attach) {
			this.attach(options.attach);
		}
		
	};
	
	constructor.prototype = {
		
		unitName: 'Node',
		
		getDocument: function() {
			return JXml(this.dom.ownerDocument);
		},
		
		attach: function(options) {
			/* options can be either an options object or simply an Element.
			 * 
			 * options
			 * 		to:			A DomUnit to attach this node to.
			 * 		before:		Optional. Either a sibling node to insert the current node before or an index
			 * 					at where to insert the node (ie, 0 to make it the first child node).
			 * 					By default it will be appended as the last child node.
			 * 		after:		Optional. Overrides before.
			 */
			
			var attach, before;
			
			if(this.dom.parentNode) {
				this.detach();
			}
			
			attach = Node['#conformAttachOptions'](options);
			before = attach.before;
			
			if(typeof attach.after != 'undefined') {
				if(attach.after instanceof Node) {
					before = attach.after.getNextSibling();
				} else {
					before = attach.after + 1;
				}
			}
			
			if(
				typeof before == 'undefined'
				|| before === null
			) {
				attach.to.dom.appendChild(this.dom);
			} else if(before instanceof Node) {
				attach.to.dom.insertBefore(this.dom, before.dom);
			} else if(before === attach.to.dom.childNodes.length) {
				attach.to.dom.appendChild(this.dom);
			} else {
				attach.to.dom.insertBefore(this.dom, attach.to.dom.childNodes[before]);
			}
			
			return this;
			
		},
		
		detach: function() {
			
			var p = this.dom.parentNode;
			
			if(p) {
				p.removeChild(this.dom);
			}
			
			return this;
			
		},
		
		getParent: function() {
			return JXml(this.dom.parentNode);
		}
		
	};
	
	extend(constructor, {
		
		'#conformAttachOptions': function(options) {
			
			if(
				options instanceof ContainerDomUnit
				|| options instanceof ContainerElement
			) {
				options = {
					to: options
				};
			}
			
			return options;
			
		}
		
	});
	
	return constructor;
	
}());var Element = Node.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 
		 * 		dom:		Optional. A DOM node to use as the core of the Element.
		 * 					If no DOM node is specified, a new one will be created.
		 * 
		 * 		document:	Optional. If dom is not specified, the new DOM node will
		 * 					be created using document. If no document is specified
		 * 					then the attach option is required and the document will
		 * 					be taken from that.
		 * 
		 * 		tag:		Optional. The tag name to use when creating the new element.
		 * 					This assumes the dom option isn't specified.
		 * 
		 */
		
		var attach, doc;
		
		if(!options.dom) {
			
			doc = options.document;
			
			if(!doc) {
				attach = Node['#conformAttachOptions'](options.attach);
				doc = attach.to.getDocument();
			}
			
			options.dom = doc.dom.createElement(options.tag);
			
		}
		
	this['#base:{constructor}'] = Node; Node.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Element',
		
		getTag: function() {
			return this.dom.tagName;
		},
		
		set: function(attribute, value) {
			this.dom.setAttribute(attribute, value);
		},
		
		get: function(attribute) {
			return this.dom.getAttribute(attribute);
		}
		
	};
	
	return constructor;
	
}());var ContainerDomUnit = DomUnit.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 		children:	Optional. A mixed array of Nodes, strings, or option objects.  See Node.attach()
		 * 					for a list of options.
		 */
		
		var op, children;
		
		 /* This is needed to keep the compiler from shortcuting the
						   * base call because of the multiple inheritance hack used by
						   * ContainerElement.
						   */ 
		this.base(options);
		
		op = options;
		if(!op) {
			op = { };
		}
		
		if(typeof op.text !== 'undefined') {
			children = [ op.text ];
		} else {
			children = op.children;
		}
		
		if(children) {
			this['#attachChildren'](children);
		}
		
	};
	
	extend(constructor, {
		
		'#constructor': constructor
		
	});
	
	constructor.prototype = {
		
		unitName: 'ContainerDomUnit',
		
		'#attachChildren': function(children) {
			
			children = Collection.castAsIterable(children);
			
			for(var i = 0, u; i < children.length; i++) {
				
				u = children[i];
				
				if(u.attach) {
					u.attach({
						to: this
					});
				} else if(typeof u == 'string' || typeof u == 'number') {
					r = new Collection(('\n' + u).split('\n'));
					r.forEach(function(v, j) {
						if(j > 0) {
							new TextNode({
								text: v,
								attach: this
							});
							if(j < r.length - 1) {
								new Elements.Br({
									attach: this
								});
							}
						}
					}, this);
				} else {
					// TODO: Huh? What is this? (This came from Html.ContainerDomUnit; don't know what it is there either.)
					var node = u.node;
					delete u.node;
					node.attach(u);
				}
								
			}
			
		},
		
		attach: Node.prototype.attach,
		detach: Node.prototype.detach,
		
		select: function() {
			// TODO: this only works for 1 tag name right now, should work kind of like a CSS selector
			// TODO: get Quicksand working on XML and use it for this.
			
			if(arguments.length == 0) {
				/* If no argument is passed, all child nodes (including text nodes) are returned.
				 */
				return JXml(this.dom.childNodes);
			}
						
			var r = [ ], elr;
			
			for(var i = 0; i < arguments.length; i++) {
				elr = this.dom.getElementsByTagName(arguments[i]);
				for(var j = 0; j < elr.length; j++) {
					r.push(elr[j]);
				}
			}
			
			r = JXml(r, true);
			
			return r;
			
		},
		
		empty: function() {
			/* TODO: Performance improvements can be done by not converting each item into
			 * a jsl Node unless it has a detach property set (similarly to how it is done
			 * in Html). dump can also be made more efficent.
			 */
			while(this.dom.firstChild) {
				JXml(this.dom.firstChild).detach();
			}
		},
		
		dump: function() {
			var n;
			while(this.dom.firstChild) {
				n = JXml(this.dom.firstChild);
				n.detach();
				n.dispose();
			}
		},
		
		getText: function() {
			if(typeof this.dom.innerText != 'undefined') {
				return this.dom.innerText;
			} else {
				return this.dom.textContent;
			}
		},
		
		addText: function(text) {
			var node = new TextNode({
				attach: this,
				text: text
			});
		},
		
		setText: function(text) {
			this.empty();
			this.addText(text);
		},
		
		dispose: function() {
			// TODO: make this work
			// Dispose all child nodes.
			/*this.select().forEach(function(u) {
				u.dispose();
			});*/
			
			this.base();
			
		}
		
	};
	
	return constructor;
	
}());var ContainerElement = Element.sub(function() {
	
	var constructor = function(options) {
		
		ContainerDomUnit['#constructor'].call(this, options);
		/* The above call is used instead of ContainerDomUnit.call(this, options) in order to make the
		 * this.base() call in ContainerDomUnit.#constructor continue on to Element rather than
		 * ContainerDomUnit's super Unit.
		 */
		
	};
	
	constructor.prototype = { };
	
	extend(constructor.prototype, ContainerDomUnit.prototype);
	
	extend(constructor.prototype, {
		
		unitName: 'ContainerElement'
		
	});
	
	return constructor;
	
}());var Document = DomUnit.sub(function() {
	
	var constructor = function(options) {
		/* options:
		 * 		rootTag:	Optional. If no dom option is specified, rootTag will set the
		 * 					root tag name for the document.
		 */
		
		var rootTag;
		
		if(!options) {
			options = { };
		}
		
		if(!options.dom) {
			rootTag = options.rootTag;
			if(!rootTag) {
				rootTag = 'document';
			}
			options.dom = document.implementation.createDocument(null, rootTag, null);
		}
		
	this['#base:{constructor}'] = DomUnit; DomUnit.call(this, options);
		
		this.root = JXml(this.dom.documentElement);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Document',
		
		serialize: function() {
			return (new XMLSerializer()).serializeToString(this.dom);
		}
		
	};
	
	return constructor;
	
}());var Fragment = ContainerDomUnit.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 
		 * 		dom:		Optional. A DOM node to use as the core of the Element.
		 * 					If no DOM node is specified, a new one will be created.
		 * 
		 * 		document:	Optional. Required if dom is not specified.
		 * 
		 */
		
		if(!options) {
			options = { };
		}
		
		if(!options.dom) {
			options.dom = options.document.dom.createDocumentFragment();
		}
		
	this['#base:{constructor}'] = ContainerDomUnit; ContainerDomUnit.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'Fragment'
		
	};
	
	return constructor;
	
}());
var NodeCollection = Collection.sub(function() {
	
	var constructor = function(r) {
		
		this.base(r);
		
	};
	
	constructor.prototype = {
		
	};
	
	Collection.prototype.expose.call(constructor.prototype, Node);
	
	extend(constructor.prototype, {
		
		unitName: 'NodeCollection',
		
		attach: function(options) {
			/* attach must be overridden for the case when options.after is used, so
			 * that the nodes are attached all at once and appear in the correct order.
			 */
			
			if(this.length == 0) {
				return;
			}
			
			var frag = new Fragment({
				document: this[0].getDocument(),
				children: this
			});
			
			frag.attach(options);
			
		}
		
	});
	
	return constructor;
	
}());
var TextNode = Node.sub(function() {
	
	var constructor = function(options) {
		/* options
		 * 
		 * 		dom:		Optional. A DOM node to use as the core of the Element.
		 * 					If no DOM node is specified, a new one will be created.
		 * 					Note: If dom is not specified either document or attach
		 * 					is required.
		 * 
		 * 		document:	Optional. If dom is not specified, the new DOM node will
		 * 					be created using document. If no document is specified
		 * 					then the attach option is required and the document will
		 * 					be taken from that.
		 * 
		 * 		text:		Optional. If dom is not specified, the new DOM node will
		 * 					be created with this text. If no text is specified, an
		 * 					empty string will be used.
		 * 
		 */
		
		var attach, doc, text;
		
		if(!options.dom) {
			
			doc = options.document;
			
			if(!doc) {
				attach = Node['#conformAttachOptions'](options.attach);
				doc = attach.to.getDocument();
			}
			
			if(options.text) {
				text = options.text;
			} else {
				text = '';
			}
			
			options.dom = doc.dom.createTextNode(text);
			
		}
		
	this['#base:{constructor}'] = Node; Node.call(this, options);
		
	};
	
	constructor.prototype = {
		
		unitName: 'TextNode',
		
		getText: function() {
			return this.dom.nodeValue;
		},
		
		setText: function(s) {
			this.dom.nodeValue = s;
		}
		
	};
	
	return constructor;
	
}());

	
	var metaUnits = new Hashtable();
	var storeInHash = {
		'3': true
	};
	/* TextNodes have to be stored in a Hashtable because members can't be added to TextNodes
	 * (at least in IE6 when the node isn't attached to document), but other metaUnits are stored
	 * as a member of the DOM element in order to cut down on the processing time that is needed by
	 * the Hashtable.
	 * TODO: This was carried over from Html. Is this true for XML TextNodes also?
	 */
	
	var JXml = function(dom) {
		// JXml is for internal use.
		
		if(!dom) {
			return null;
		}
		
		if(dom instanceof DomUnit) {
			return dom;
		}
		
		if(
			!dom.nodeType
			&& (dom.length || dom.length === 0)
		) {
			
			var r = new NodeCollection();
			
			var domR = Collection.castAsIterable(dom);
			for(var i = 0; i < domR.length; i++) {
				r.push(JXml(domR[i]));
			}
			
			return r;
			
		}
		
		var metaUnit;
		
		if(storeInHash[dom.nodeType]) {
			metaUnit = metaUnits.get(dom);
		} else {
			metaUnit = dom['#jsl#metaUnit'];
		}
		
		if(!metaUnit) {
			
			switch(dom.nodeType) {
				
				case 1: // element
					metaUnit = new ContainerElement({ dom: dom });
					break;
				
				case 3: // text node
					metaUnit = new TextNode({ dom: dom });
					break;
				
				case 9: // document
					metaUnit = new Document({ dom: dom });
					break;
				
				default:
					if(dom.document) { // window
						metaUnit = new Window({ dom: dom });
					}
					break;
				
			}
			
			JXml.assign(dom, metaUnit);
			
		}
		
		return metaUnit;
		
	};
	
	extend(JXml, {
		
		DomUnit: DomUnit,
		ContainerDomUnit: ContainerDomUnit,
		Document: Document,
		Node: Node,
		NodeCollection: NodeCollection,
		TextNode: TextNode,
		Element: Element,
		ContainerElement: ContainerElement,
		Fragment: Fragment,
		
		assign: function(dom, metaUnit) {
			/* Assign a DomUnit to a DOM object.
			 * TODO: update assign to work similar to Html, inclugind medhods for retrieval and removal.
			 */
			
			if(storeInHash[dom.nodeType]) {
				metaUnits.put(dom, metaUnit);
				metaUnit.on({
					dispose: function() {
						metaUnits.remove(dom);
					}
				});
			} else {
				dom['#jsl#metaUnit'] = metaUnit;
			}
			
		}
		
	});
	
	return JXml;
	
})();

	
	var Elements = Html.Elements;
	
	var object = {
		
		version: new Version({
			major: 0,
			minor: 5,
			revision: 13,
			alpha: true,
			build: $buildNumber
		}),
		
		extend: extend,
		extendFunction: extendFunction,
		extendMethods: extendMethods,
		defer: defer,
		deferred: deferred,
		bind: bind,
		alias: alias,
		clone: clone,
		send: Live.send,
		
		Quicksand: Quicksand,
		Debug: Debug,
		GarbageCollector: GarbageCollector,
		Browser: Browser,
		Unit: Unit,
		Unit: Unit,
		Version: Version,
		ErrorHandling: ErrorHandling,
		Property: Property,
		Task: Task,
		EventHandling: EventHandling,
		String: JString,
		XString: XString,
		Range: Range,
		Chrono: Chrono,
		Date: Chrono.Date, // DEPRECATED. TODO: Remove this shortcut; simply use Chrono.Date
		Data: Data,
		Collection: Data.Collection,
		Uri: Uri,
		Hashtable: Hashtable,
		TimedTask: TimedTask,
		Math: JMath,
		Random: JMath.Random, // A shortcut to Math.Random
		Html: Html,
		Ajax: Live, // DEPRECATED. TODO: remove this.
		Live: Live,
		Ui: Ui,
		Fx: Fx,
		Xml: Xml,
		History: History,
		
		window: null,
		document: null,
		
		on: function(options, returnHandlers) {
			
			var ret = Unit.prototype.on.call(this, options, returnHandlers);
			
			if(this.initialized && typeof options.ready != 'undefined') {
				defer(options.ready);
			}
			
			return ret;
			
		},
		
		get: function() {
			if(!$document) {
				throw new ErrorHandling.Exceptions.Uninitialized();
			}
			return $document.get.apply($document, arguments);
		},
		
		select: function() {
			if(!$document) {
				throw new ErrorHandling.Exceptions.Uninitialized();
			}
			return $document.select.apply($document, arguments);
		},
		
		initialized: false,
		'#initialize': function() {
			
			$window = null; //= Html(window); <- Using this method causes errors in FF when joi is used across a different domain.
			$document = Html(document);
			
			this.window = $window;
			this.document = $document;
			
			this.initialized = true;
			
			this.ready();
			
		},
		
		toString: function() {
			return '[ joi Javascript Library ]';
		},
		
		forEach: Data.Collection.forEach,
		
		ready: function() { } // To execute a function when joi is ready add an EventHandler to the joi.ready method.
		
	};
	
	extendMethods(object);
	
	return object;
	
})();

(function() {
	/* TODO: This needs to be updated to work better. It needs to execute init() when the document (and stylesheets)
	 * are loaded, but it doesn't need to wait on images and other media. It also needs to detect if the document is
	 * already loaded prior to joi's inclusion on the page.
	 */
	
	function init() {
		if(joi.initialized) {
			return;
		}
		joi['#initialize']();
	}
	
	// any browser
	var onload;
	if(window.onload) {
		onload = window.onload;
	}
	window.onload = function() {
		if(onload) {
			onload();
		}
		init();
	};
	
	// Firefox
	if(document.addEventListener) {
		document.addEventListener("DOMContentLoaded", init, false);
	}
	
	// IE
	window['#joi:initialize'] = init;
	// TODO: for some reason this doesn't work in IE
	//document.write('<script type="text/javascript" defer="defer">if(document.body) { window["#joi:initialize"](); }<\/script>');
	
})();

joi.Ui.Widgets = { // DEPRECATED.
	Appearance: joi.Ui.Appearance,
	Widget: joi.Ui.Widget,
	ContainerWidget: joi.Ui.ContainerWidget
};
















