/*!
    Knockout.js ES5 plugin
    (c) Steven Sanderson - MIT license
*/
(function(global) {

(function() {
    'use strict';

    var objectToObservableMap; // Lazily instantiated
    function getAllObservablesForObject(obj, createIfNotDefined) {
        if (!objectToObservableMap) {
            objectToObservableMap = new getWeakMapConstructor()();
        }

        var result = objectToObservableMap.get(obj);
        if (!result && createIfNotDefined) {
            result = {};
            objectToObservableMap.set(obj, result);
        }
        return result;
    }

    function track(obj, propertyNames) {
        if (!obj || typeof obj !== 'object') {
            throw new Error('When calling ko.track, you must pass an object as the first parameter.');
        }

        var ko = this;
        propertyNames = propertyNames || Object.getOwnPropertyNames(obj);

        propertyNames.forEach(function(propertyName) {
            var observable = ko.observable(obj[propertyName]);

            Object.defineProperty(obj, propertyName, {
                configurable: true,
                enumerable: true,
                get: observable,
                set: observable
            });

            getAllObservablesForObject(obj, true)[propertyName] = observable;
        });

        return obj;
    }

    function getObservable(obj, propertyName) {
        if (!obj || typeof obj !== 'object') {
            return null;
        }

        var allObservablesForObject = getAllObservablesForObject(obj, false);
        return (allObservablesForObject && allObservablesForObject[propertyName]) || null;
    }

    function valueHasMutated(obj, propertyName) {
        var observable = getObservable(obj, propertyName);

        if (observable) {
            observable.valueHasMutated();
        }
    }

    function attachToKo(ko) {
        ko.track = track;
        ko.getObservable = getObservable;
        ko.valueHasMutated = valueHasMutated;
    }

    function prepareExports() {
        // If you're using a Node-style module loader, mix in this plugin using:
        //     require('knockout-es5').attach(ko);
        // ... where ko is the instance you've already loaded.
        // Or in a non-module case in a browser, just be sure to reference the knockout.js script file
        // before you reference knockout.es5.js, and we will attach to the global instance.
        if (typeof module !== 'undefined') {
            module.exports = { attach: attachToKo };
        } else if (typeof exports !== 'undefined') {
            exports.attach = attachToKo;
        } else if ('ko' in global) {
            // Non-module case - attach to the global instance
            attachToKo(global.ko);
        }
    }

    prepareExports();

})();

function getWeakMapConstructor() {
  var global = (0, eval)('this');

  // Use native implementation if available
  if ('WeakMap' in global) {
    return global.WeakMap;
  } else {
    return (function(undefined_, undefined) {
      // If not, create a shim implementation

      /*! (The MIT License)
       * WeakMap shim
       * Copyright (c) 2012 Brandon Benvie <http://bbenvie.com>
       *
       * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
       * associated documentation files (the 'Software'), to deal in the Software without restriction,
       * including without limitation the rights to use, copy, modify, merge, publish, distribute,
       * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
       * furnished to do so, subject to the following conditions:
       *
       * The above copyright notice and this permission notice shall be included with all copies or
       * substantial portions of the Software.
       *
       * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
       * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
       * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY  CLAIM,
       * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
       * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
       */

      // Original WeakMap implementation by Gozala @ https://gist.github.com/1269991
      // Updated and bugfixed by Raynos @ https://gist.github.com/1638059
      // Expanded by Benvie @ https://github.com/Benvie/harmony-collections
      // Reduced to a factory function (not a module) for inclusion in knockout-es5 by Steve Sanderson

      var getProps = Object.getOwnPropertyNames,
          defProp  = Object.defineProperty,
          toSource = Function.prototype.toString,
          create   = Object.create,
          hasOwn   = Object.prototype.hasOwnProperty,
          funcName = /^\n?function\s?(\w*)?_?\(/;


      function define(object, key, value){
        if (typeof key === 'function') {
          value = key;
          key = nameOf(value).replace(/_$/, '');
        }
        return defProp(object, key, { configurable: true, writable: true, value: value });
      }

      function nameOf(func){
        return typeof func !== 'function'
              ? '' : 'name' in func
              ? func.name : toSource.call(func).match(funcName)[1];
      }

      // ############
      // ### Data ###
      // ############

      var Data = (function(){
        var dataDesc = { value: { writable: true, value: undefined } },
            datalock = 'return function(k){if(k===s)return l}',
            uids     = create(null),

            createUID = function(){
              var key = Math.random().toString(36).slice(2);
              return key in uids ? createUID() : uids[key] = key;
            },

            globalID = createUID(),

            storage = function(obj){
              if (hasOwn.call(obj, globalID))
                return obj[globalID];

              if (!Object.isExtensible(obj))
                throw new TypeError("Object must be extensible");

              var store = create(null);
              defProp(obj, globalID, { value: store });
              return store;
            };

        // common per-object storage area made visible by patching getOwnPropertyNames'
        define(Object, function getOwnPropertyNames(obj){
          var props = getProps(obj);
          if (hasOwn.call(obj, globalID))
            props.splice(props.indexOf(globalID), 1);
          return props;
        });

        function Data(){
          var puid = createUID(),
              secret = {};

          this.unlock = function(obj){
            var store = storage(obj);
            if (hasOwn.call(store, puid))
              return store[puid](secret);

            var data = create(null, dataDesc);
            defProp(store, puid, {
              value: new Function('s', 'l', datalock)(secret, data)
            });
            return data;
          }
        }

        define(Data.prototype, function get(o){ return this.unlock(o).value });
        define(Data.prototype, function set(o, v){ this.unlock(o).value = v });

        return Data;
      }());


      var WM = (function(data){
        var validate = function(key){
          if (key == null || typeof key !== 'object' && typeof key !== 'function')
            throw new TypeError("Invalid WeakMap key");
        }

        var wrap = function(collection, value){
          var store = data.unlock(collection);
          if (store.value)
            throw new TypeError("Object is already a WeakMap");
          store.value = value;
        }

        var unwrap = function(collection){
          var storage = data.unlock(collection).value;
          if (!storage)
            throw new TypeError("WeakMap is not generic");
          return storage;
        }

        var initialize = function(weakmap, iterable){
          if (iterable !== null && typeof iterable === 'object' && typeof iterable.forEach === 'function') {
            iterable.forEach(function(item, i){
              if (item instanceof Array && item.length === 2)
                set.call(weakmap, iterable[i][0], iterable[i][1]);
            });
          }
        }


        function WeakMap(iterable){
          if (this === global || this == null || this === WeakMap.prototype)
            return new WeakMap(iterable);

          wrap(this, new Data);
          initialize(this, iterable);
        }

        function get(key){
          validate(key);
          var value = unwrap(this).get(key);
          return value === undefined_ ? undefined : value;
        }

        function set(key, value){
          validate(key);
          // store a token for explicit undefined so that "has" works correctly
          unwrap(this).set(key, value === undefined ? undefined_ : value);
        }

        function has(key){
          validate(key);
          return unwrap(this).get(key) !== undefined;
        }

        function delete_(key){
          validate(key);
          var data = unwrap(this),
              had = data.get(key) !== undefined;
          data.set(key, undefined);
          return had;
        }

        function toString(){
          unwrap(this);
          return '[object WeakMap]';
        }

        try {
          var src = ('return '+delete_).replace('e_', '\\u0065'),
              del = new Function('unwrap', 'validate', src)(unwrap, validate);
        } catch (e) {
          var del = delete_;
        }

        var src = (''+Object).split('Object');
        var stringifier = function toString(){
          return src[0] + nameOf(this) + src[1];
        };

        define(stringifier, stringifier);

        var prep = { __proto__: [] } instanceof Array
          ? function(f){ f.__proto__ = stringifier }
          : function(f){ define(f, stringifier) };

        prep(WeakMap);

        [toString, get, set, has, del].forEach(function(method){
          define(WeakMap.prototype, method);
          prep(method);
        });

        return WeakMap;
      }(new Data));

      /* Disabling this because it's not used in knockout-es5
      var defaultCreator = Object.create
        ? function(){ return Object.create(null) }
        : function(){ return {} };

      function createStorage(creator){
        var weakmap = new WM;
        creator || (creator = defaultCreator);

        function storage(object, value){
          if (value || arguments.length === 2) {
            weakmap.set(object, value);
          } else {
            value = weakmap.get(object);
            if (value === undefined) {
              value = creator(object);
              weakmap.set(object, value);
            }
          }
          return value;
        }

        return storage;
      }
      */

      /* Disabling the following code which exports the WeakMap shim as a module,
         since for knockout-es5 we're only using it inline, not as a module
      if (typeof module !== 'undefined') {
        module.exports = WM;
      } else if (typeof exports !== 'undefined') {
        exports.WeakMap = WM;
      } else if (!('WeakMap' in global)) {
        global.WeakMap = WM;
      }
      */

      /* Also disable this because it's nonstandard and not used in knockout-es5
      WM.createStorage = createStorage;
      if (global.WeakMap)
        global.WeakMap.createStorage = createStorage;
      */

      return WM;
    })();
  }

}
})(this);