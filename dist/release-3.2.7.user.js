// ==UserScript==
// @name        GGn Forum Games Checker
// @description Tracks forum games participation eligibility and marks thread read indicators accordingly.
// @namespace   https://gazellegames.net/
// @require     https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @match       https://gazellegames.net/forums.php?*action=viewforum&forumid=55*
// @match       https://gazellegames.net/forums.php?*action=viewthread&threadid=*
// @version     3.2.7
// @homepage    https://github.com/FinalDoom/gazelle-forum-games
// @author      FinalDoom
// @license     ISC
// @downloadURL https://github.com/FinalDoom/gazelle-forum-games/releases/latest/download/gazelle-forum-games-eligibility-checker.user.js
// @grant       GM.getValue
// @grant       GM.setValue
// @grant       GM.registerMenuCommand
// ==/UserScript==

/*
ISC License

Copyright (c) 2022 FinalDoom

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
*/

(function () {
    'use strict';

    

    function ___$insertStylesToHeader(css) {
      if (!css) {
        return
      }
      if (typeof window === 'undefined') {
        return
      }

      const style = document.createElement('style');

      style.setAttribute('type', 'text/css');
      style.innerHTML = css;
      document.head.appendChild(style);
      return css
    }

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    function __classPrivateFieldGet(receiver, state, kind, f) {
      if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
      return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    }
    function __classPrivateFieldSet(receiver, state, value, kind, f) {
      if (kind === "m") throw new TypeError("Private method is not writable");
      if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
      return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
    }

    const universal = typeof globalThis !== "undefined" ? globalThis : global;
    const performance = universal.performance;

    // generate timestamp or delta
    // see http://nodejs.org/api/process.html#process_process_hrtime
    function hrtime(previousTimestamp) {
      const clocktime = performance.now() * 1e-3;
      let seconds = Math.floor(clocktime);
      let nanoseconds = Math.floor(clocktime % 1 * 1e9);
      if (previousTimestamp != undefined) {
        seconds = seconds - previousTimestamp[0];
        nanoseconds = nanoseconds - previousTimestamp[1];
        if (nanoseconds < 0) {
          seconds--;
          nanoseconds += 1e9;
        }
      }
      return [seconds, nanoseconds];
    }
    // The current timestamp in whole milliseconds
    function getMilliseconds() {
      const [seconds, nanoseconds] = hrtime();
      return seconds * 1e3 + Math.floor(nanoseconds / 1e6);
    }
    // Wait for a specified number of milliseconds before fulfilling the returned promise.
    function wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * A hierarchical token bucket for rate limiting. See
     * http://en.wikipedia.org/wiki/Token_bucket for more information.
     *
     * @param options
     * @param options.bucketSize Maximum number of tokens to hold in the bucket.
     *  Also known as the burst rate.
     * @param options.tokensPerInterval Number of tokens to drip into the bucket
     *  over the course of one interval.
     * @param options.interval The interval length in milliseconds, or as
     *  one of the following strings: 'second', 'minute', 'hour', day'.
     * @param options.parentBucket Optional. A token bucket that will act as
     *  the parent of this bucket.
     */
    class TokenBucket {
      constructor({
        bucketSize,
        tokensPerInterval,
        interval,
        parentBucket
      }) {
        this.bucketSize = bucketSize;
        this.tokensPerInterval = tokensPerInterval;
        if (typeof interval === "string") {
          switch (interval) {
            case "sec":
            case "second":
              this.interval = 1000;
              break;
            case "min":
            case "minute":
              this.interval = 1000 * 60;
              break;
            case "hr":
            case "hour":
              this.interval = 1000 * 60 * 60;
              break;
            case "day":
              this.interval = 1000 * 60 * 60 * 24;
              break;
            default:
              throw new Error("Invalid interval " + interval);
          }
        } else {
          this.interval = interval;
        }
        this.parentBucket = parentBucket;
        this.content = 0;
        this.lastDrip = getMilliseconds();
      }
      /**
       * Remove the requested number of tokens. If the bucket (and any parent
       * buckets) contains enough tokens this will happen immediately. Otherwise,
       * the removal will happen when enough tokens become available.
       * @param count The number of tokens to remove.
       * @returns A promise for the remainingTokens count.
       */
      async removeTokens(count) {
        // Is this an infinite size bucket?
        if (this.bucketSize === 0) {
          return Number.POSITIVE_INFINITY;
        }
        // Make sure the bucket can hold the requested number of tokens
        if (count > this.bucketSize) {
          throw new Error(`Requested tokens ${count} exceeds bucket size ${this.bucketSize}`);
        }
        // Drip new tokens into this bucket
        this.drip();
        const comeBackLater = async () => {
          // How long do we need to wait to make up the difference in tokens?
          const waitMs = Math.ceil((count - this.content) * (this.interval / this.tokensPerInterval));
          await wait(waitMs);
          return this.removeTokens(count);
        };
        // If we don't have enough tokens in this bucket, come back later
        if (count > this.content) return comeBackLater();
        if (this.parentBucket != undefined) {
          // Remove the requested from the parent bucket first
          const remainingTokens = await this.parentBucket.removeTokens(count);
          // Check that we still have enough tokens in this bucket
          if (count > this.content) return comeBackLater();
          // Tokens were removed from the parent bucket, now remove them from
          // this bucket. Note that we look at the current bucket and parent
          // bucket's remaining tokens and return the smaller of the two values
          this.content -= count;
          return Math.min(remainingTokens, this.content);
        } else {
          // Remove the requested tokens from this bucket
          this.content -= count;
          return this.content;
        }
      }
      /**
       * Attempt to remove the requested number of tokens and return immediately.
       * If the bucket (and any parent buckets) contains enough tokens this will
       * return true, otherwise false is returned.
       * @param {Number} count The number of tokens to remove.
       * @param {Boolean} True if the tokens were successfully removed, otherwise
       *  false.
       */
      tryRemoveTokens(count) {
        // Is this an infinite size bucket?
        if (!this.bucketSize) return true;
        // Make sure the bucket can hold the requested number of tokens
        if (count > this.bucketSize) return false;
        // Drip new tokens into this bucket
        this.drip();
        // If we don't have enough tokens in this bucket, return false
        if (count > this.content) return false;
        // Try to remove the requested tokens from the parent bucket
        if (this.parentBucket && !this.parentBucket.tryRemoveTokens(count)) return false;
        // Remove the requested tokens from this bucket and return
        this.content -= count;
        return true;
      }
      /**
       * Add any new tokens to the bucket since the last drip.
       * @returns {Boolean} True if new tokens were added, otherwise false.
       */
      drip() {
        if (this.tokensPerInterval === 0) {
          const prevContent = this.content;
          this.content = this.bucketSize;
          return this.content > prevContent;
        }
        const now = getMilliseconds();
        const deltaMS = Math.max(now - this.lastDrip, 0);
        this.lastDrip = now;
        const dripAmount = deltaMS * (this.tokensPerInterval / this.interval);
        const prevContent = this.content;
        this.content = Math.min(this.content + dripAmount, this.bucketSize);
        return Math.floor(this.content) > Math.floor(prevContent);
      }
    }

    /**
     * A generic rate limiter. Underneath the hood, this uses a token bucket plus
     * an additional check to limit how many tokens we can remove each interval.
     *
     * @param options
     * @param options.tokensPerInterval Maximum number of tokens that can be
     *  removed at any given moment and over the course of one interval.
     * @param options.interval The interval length in milliseconds, or as
     *  one of the following strings: 'second', 'minute', 'hour', day'.
     * @param options.fireImmediately Whether or not the promise will resolve
     *  immediately when rate limiting is in effect (default is false).
     */
    class RateLimiter {
      constructor({
        tokensPerInterval,
        interval,
        fireImmediately
      }) {
        this.tokenBucket = new TokenBucket({
          bucketSize: tokensPerInterval,
          tokensPerInterval,
          interval
        });
        // Fill the token bucket to start
        this.tokenBucket.content = tokensPerInterval;
        this.curIntervalStart = getMilliseconds();
        this.tokensThisInterval = 0;
        this.fireImmediately = fireImmediately !== null && fireImmediately !== void 0 ? fireImmediately : false;
      }
      /**
       * Remove the requested number of tokens. If the rate limiter contains enough
       * tokens and we haven't spent too many tokens in this interval already, this
       * will happen immediately. Otherwise, the removal will happen when enough
       * tokens become available.
       * @param count The number of tokens to remove.
       * @returns A promise for the remainingTokens count.
       */
      async removeTokens(count) {
        // Make sure the request isn't for more than we can handle
        if (count > this.tokenBucket.bucketSize) {
          throw new Error(`Requested tokens ${count} exceeds maximum tokens per interval ${this.tokenBucket.bucketSize}`);
        }
        const now = getMilliseconds();
        // Advance the current interval and reset the current interval token count
        // if needed
        if (now < this.curIntervalStart || now - this.curIntervalStart >= this.tokenBucket.interval) {
          this.curIntervalStart = now;
          this.tokensThisInterval = 0;
        }
        // If we don't have enough tokens left in this interval, wait until the
        // next interval
        if (count > this.tokenBucket.tokensPerInterval - this.tokensThisInterval) {
          if (this.fireImmediately) {
            return -1;
          } else {
            const waitMs = Math.ceil(this.curIntervalStart + this.tokenBucket.interval - now);
            await wait(waitMs);
            const remainingTokens = await this.tokenBucket.removeTokens(count);
            this.tokensThisInterval += count;
            return remainingTokens;
          }
        }
        // Remove the requested number of tokens from the token bucket
        const remainingTokens = await this.tokenBucket.removeTokens(count);
        this.tokensThisInterval += count;
        return remainingTokens;
      }
      /**
       * Attempt to remove the requested number of tokens and return immediately.
       * If the bucket (and any parent buckets) contains enough tokens and we
       * haven't spent too many tokens in this interval already, this will return
       * true. Otherwise, false is returned.
       * @param {Number} count The number of tokens to remove.
       * @param {Boolean} True if the tokens were successfully removed, otherwise
       *  false.
       */
      tryRemoveTokens(count) {
        // Make sure the request isn't for more than we can handle
        if (count > this.tokenBucket.bucketSize) return false;
        const now = getMilliseconds();
        // Advance the current interval and reset the current interval token count
        // if needed
        if (now < this.curIntervalStart || now - this.curIntervalStart >= this.tokenBucket.interval) {
          this.curIntervalStart = now;
          this.tokensThisInterval = 0;
        }
        // If we don't have enough tokens left in this interval, return false
        if (count > this.tokenBucket.tokensPerInterval - this.tokensThisInterval) return false;
        // Try to remove the requested number of tokens from the token bucket
        const removed = this.tokenBucket.tryRemoveTokens(count);
        if (removed) {
          this.tokensThisInterval += count;
        }
        return removed;
      }
      /**
       * Returns the number of tokens remaining in the TokenBucket.
       * @returns {Number} The number of tokens remaining.
       */
      getTokensRemaining() {
        this.tokenBucket.drip();
        return this.tokenBucket.content;
      }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    var loglevel = {exports: {}};

    /*
    * loglevel - https://github.com/pimterry/loglevel
    *
    * Copyright (c) 2013 Tim Perry
    * Licensed under the MIT license.
    */
    (function (module) {
      (function (root, definition) {

        if (module.exports) {
          module.exports = definition();
        } else {
          root.log = definition();
        }
      })(commonjsGlobal, function () {

        // Slightly dubious tricks to cut down minimized file size
        var noop = function () {};
        var undefinedType = "undefined";
        var isIE = typeof window !== undefinedType && typeof window.navigator !== undefinedType && /Trident\/|MSIE /.test(window.navigator.userAgent);
        var logMethods = ["trace", "debug", "info", "warn", "error"];

        // Cross-browser bind equivalent that works at least back to IE6
        function bindMethod(obj, methodName) {
          var method = obj[methodName];
          if (typeof method.bind === 'function') {
            return method.bind(obj);
          } else {
            try {
              return Function.prototype.bind.call(method, obj);
            } catch (e) {
              // Missing bind shim or IE8 + Modernizr, fallback to wrapping
              return function () {
                return Function.prototype.apply.apply(method, [obj, arguments]);
              };
            }
          }
        }

        // Trace() doesn't print the message in IE, so for that case we need to wrap it
        function traceForIE() {
          if (console.log) {
            if (console.log.apply) {
              console.log.apply(console, arguments);
            } else {
              // In old IE, native console methods themselves don't have apply().
              Function.prototype.apply.apply(console.log, [console, arguments]);
            }
          }
          if (console.trace) console.trace();
        }

        // Build the best logging method possible for this env
        // Wherever possible we want to bind, not wrap, to preserve stack traces
        function realMethod(methodName) {
          if (methodName === 'debug') {
            methodName = 'log';
          }
          if (typeof console === undefinedType) {
            return false; // No method possible, for now - fixed later by enableLoggingWhenConsoleArrives
          } else if (methodName === 'trace' && isIE) {
            return traceForIE;
          } else if (console[methodName] !== undefined) {
            return bindMethod(console, methodName);
          } else if (console.log !== undefined) {
            return bindMethod(console, 'log');
          } else {
            return noop;
          }
        }

        // These private functions always need `this` to be set properly

        function replaceLoggingMethods(level, loggerName) {
          /*jshint validthis:true */
          for (var i = 0; i < logMethods.length; i++) {
            var methodName = logMethods[i];
            this[methodName] = i < level ? noop : this.methodFactory(methodName, level, loggerName);
          }

          // Define log.log as an alias for log.debug
          this.log = this.debug;
        }

        // In old IE versions, the console isn't present until you first open it.
        // We build realMethod() replacements here that regenerate logging methods
        function enableLoggingWhenConsoleArrives(methodName, level, loggerName) {
          return function () {
            if (typeof console !== undefinedType) {
              replaceLoggingMethods.call(this, level, loggerName);
              this[methodName].apply(this, arguments);
            }
          };
        }

        // By default, we use closely bound real methods wherever possible, and
        // otherwise we wait for a console to appear, and then try again.
        function defaultMethodFactory(methodName, level, loggerName) {
          /*jshint validthis:true */
          return realMethod(methodName) || enableLoggingWhenConsoleArrives.apply(this, arguments);
        }
        function Logger(name, defaultLevel, factory) {
          var self = this;
          var currentLevel;
          defaultLevel = defaultLevel == null ? "WARN" : defaultLevel;
          var storageKey = "loglevel";
          if (typeof name === "string") {
            storageKey += ":" + name;
          } else if (typeof name === "symbol") {
            storageKey = undefined;
          }
          function persistLevelIfPossible(levelNum) {
            var levelName = (logMethods[levelNum] || 'silent').toUpperCase();
            if (typeof window === undefinedType || !storageKey) return;

            // Use localStorage if available
            try {
              window.localStorage[storageKey] = levelName;
              return;
            } catch (ignore) {}

            // Use session cookie as fallback
            try {
              window.document.cookie = encodeURIComponent(storageKey) + "=" + levelName + ";";
            } catch (ignore) {}
          }
          function getPersistedLevel() {
            var storedLevel;
            if (typeof window === undefinedType || !storageKey) return;
            try {
              storedLevel = window.localStorage[storageKey];
            } catch (ignore) {}

            // Fallback to cookies if local storage gives us nothing
            if (typeof storedLevel === undefinedType) {
              try {
                var cookie = window.document.cookie;
                var location = cookie.indexOf(encodeURIComponent(storageKey) + "=");
                if (location !== -1) {
                  storedLevel = /^([^;]+)/.exec(cookie.slice(location))[1];
                }
              } catch (ignore) {}
            }

            // If the stored level is not valid, treat it as if nothing was stored.
            if (self.levels[storedLevel] === undefined) {
              storedLevel = undefined;
            }
            return storedLevel;
          }
          function clearPersistedLevel() {
            if (typeof window === undefinedType || !storageKey) return;

            // Use localStorage if available
            try {
              window.localStorage.removeItem(storageKey);
              return;
            } catch (ignore) {}

            // Use session cookie as fallback
            try {
              window.document.cookie = encodeURIComponent(storageKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
            } catch (ignore) {}
          }

          /*
           *
           * Public logger API - see https://github.com/pimterry/loglevel for details
           *
           */

          self.name = name;
          self.levels = {
            "TRACE": 0,
            "DEBUG": 1,
            "INFO": 2,
            "WARN": 3,
            "ERROR": 4,
            "SILENT": 5
          };
          self.methodFactory = factory || defaultMethodFactory;
          self.getLevel = function () {
            return currentLevel;
          };
          self.setLevel = function (level, persist) {
            if (typeof level === "string" && self.levels[level.toUpperCase()] !== undefined) {
              level = self.levels[level.toUpperCase()];
            }
            if (typeof level === "number" && level >= 0 && level <= self.levels.SILENT) {
              currentLevel = level;
              if (persist !== false) {
                // defaults to true
                persistLevelIfPossible(level);
              }
              replaceLoggingMethods.call(self, level, name);
              if (typeof console === undefinedType && level < self.levels.SILENT) {
                return "No console available for logging";
              }
            } else {
              throw "log.setLevel() called with invalid level: " + level;
            }
          };
          self.setDefaultLevel = function (level) {
            defaultLevel = level;
            if (!getPersistedLevel()) {
              self.setLevel(level, false);
            }
          };
          self.resetLevel = function () {
            self.setLevel(defaultLevel, false);
            clearPersistedLevel();
          };
          self.enableAll = function (persist) {
            self.setLevel(self.levels.TRACE, persist);
          };
          self.disableAll = function (persist) {
            self.setLevel(self.levels.SILENT, persist);
          };

          // Initialize with the right level
          var initialLevel = getPersistedLevel();
          if (initialLevel == null) {
            initialLevel = defaultLevel;
          }
          self.setLevel(initialLevel, false);
        }

        /*
         *
         * Top-level API
         *
         */

        var defaultLogger = new Logger();
        var _loggersByName = {};
        defaultLogger.getLogger = function getLogger(name) {
          if (typeof name !== "symbol" && typeof name !== "string" || name === "") {
            throw new TypeError("You must supply a name when creating a logger.");
          }
          var logger = _loggersByName[name];
          if (!logger) {
            logger = _loggersByName[name] = new Logger(name, defaultLogger.getLevel(), defaultLogger.methodFactory);
          }
          return logger;
        };

        // Grab the current global log variable in case of overwrite
        var _log = typeof window !== undefinedType ? window.log : undefined;
        defaultLogger.noConflict = function () {
          if (typeof window !== undefinedType && window.log === defaultLogger) {
            window.log = _log;
          }
          return defaultLogger;
        };
        defaultLogger.getLoggers = function getLoggers() {
          return _loggersByName;
        };

        // ES6 default export, for compatibility
        defaultLogger['default'] = defaultLogger;
        return defaultLogger;
      });
    })(loglevel);
    var log = loglevel.exports;

    var loglevelPluginPrefix = {exports: {}};

    (function (module) {
      (function (root, factory) {
        if (module.exports) {
          module.exports = factory();
        } else {
          root.prefix = factory(root);
        }
      })(commonjsGlobal, function (root) {

        var merge = function (target) {
          var i = 1;
          var length = arguments.length;
          var key;
          for (; i < length; i++) {
            for (key in arguments[i]) {
              if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
                target[key] = arguments[i][key];
              }
            }
          }
          return target;
        };
        var defaults = {
          template: '[%t] %l:',
          levelFormatter: function (level) {
            return level.toUpperCase();
          },
          nameFormatter: function (name) {
            return name || 'root';
          },
          timestampFormatter: function (date) {
            return date.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, '$1');
          },
          format: undefined
        };
        var loglevel;
        var configs = {};
        var reg = function (rootLogger) {
          if (!rootLogger || !rootLogger.getLogger) {
            throw new TypeError('Argument is not a root logger');
          }
          loglevel = rootLogger;
        };
        var apply = function (logger, config) {
          if (!logger || !logger.setLevel) {
            throw new TypeError('Argument is not a logger');
          }

          /* eslint-disable vars-on-top */
          var originalFactory = logger.methodFactory;
          var name = logger.name || '';
          var parent = configs[name] || configs[''] || defaults;
          /* eslint-enable vars-on-top */

          function methodFactory(methodName, logLevel, loggerName) {
            var originalMethod = originalFactory(methodName, logLevel, loggerName);
            var options = configs[loggerName] || configs[''];
            var hasTimestamp = options.template.indexOf('%t') !== -1;
            var hasLevel = options.template.indexOf('%l') !== -1;
            var hasName = options.template.indexOf('%n') !== -1;
            return function () {
              var content = '';
              var length = arguments.length;
              var args = Array(length);
              var key = 0;
              for (; key < length; key++) {
                args[key] = arguments[key];
              }

              // skip the root method for child loggers to prevent duplicate logic
              if (name || !configs[loggerName]) {
                /* eslint-disable vars-on-top */
                var timestamp = options.timestampFormatter(new Date());
                var level = options.levelFormatter(methodName);
                var lname = options.nameFormatter(loggerName);
                /* eslint-enable vars-on-top */

                if (options.format) {
                  content += options.format(level, lname, timestamp);
                } else {
                  content += options.template;
                  if (hasTimestamp) {
                    content = content.replace(/%t/, timestamp);
                  }
                  if (hasLevel) content = content.replace(/%l/, level);
                  if (hasName) content = content.replace(/%n/, lname);
                }
                if (args.length && typeof args[0] === 'string') {
                  // concat prefix with first argument to support string substitutions
                  args[0] = content + ' ' + args[0];
                } else {
                  args.unshift(content);
                }
              }
              originalMethod.apply(undefined, args);
            };
          }
          if (!configs[name]) {
            logger.methodFactory = methodFactory;
          }

          // for remove inherited format option if template option preset
          config = config || {};
          if (config.template) config.format = undefined;
          configs[name] = merge({}, parent, config);
          logger.setLevel(logger.getLevel());
          if (!loglevel) {
            logger.warn('It is necessary to call the function reg() of loglevel-plugin-prefix before calling apply. From the next release, it will throw an error. See more: https://github.com/kutuluk/loglevel-plugin-prefix/blob/master/README.md');
          }
          return logger;
        };
        var api = {
          reg: reg,
          apply: apply
        };
        var save;
        if (root) {
          save = root.prefix;
          api.noConflict = function () {
            if (root.prefix === api) {
              root.prefix = save;
            }
            return api;
          };
        }
        return api;
      });
    })(loglevelPluginPrefix);
    var prefix = loglevelPluginPrefix.exports;

    const TEMPLATE_PLACEHOLDERS = {
        prefix: '%c%p%c',
        timestamp: '%c[%t]%c',
        logLevel: '%c%l%c',
        name: '%c(%n)%c',
    };
    const SCRIPT_PREFIX = '[GGn Forum Games Helper]';
    const MESSAGE_TEMPLATE = `${TEMPLATE_PLACEHOLDERS.prefix}${TEMPLATE_PLACEHOLDERS.name} ${TEMPLATE_PLACEHOLDERS.logLevel}:%c`;
    const colors = {
        prefix: 'background-color:darkolivegreen;color:white;border-radius:2px;padding:2px',
        timestamp: 'color:gray',
        logLevel: (methodName, _, __) => {
            switch (methodName) {
                case 'trace':
                    return 'color:magenta';
                case 'debug':
                    return 'color:cyan';
                case 'info':
                    return '';
                case 'warn':
                    return 'color:yellow';
                case 'error':
                    return 'color:red';
            }
        },
        name: 'background-color:darkolivegreen;color:white;border-radius:2px;padding:2px',
        message: (_, __, loggerName) => {
            switch (loggerName) {
                case 'critical':
                    return 'color:red;font-weight:bold';
                default:
                    return '';
            }
        },
    };
    log.setDefaultLevel('INFO');
    prefix.reg(log);
    prefix.apply(log, {
        template: MESSAGE_TEMPLATE.replace(/%p/, SCRIPT_PREFIX),
        levelFormatter(level) {
            return level.toLocaleUpperCase();
        },
        nameFormatter(name) {
            return name || 'root';
        },
        timestampFormatter(date) {
            return date.toISOString();
        },
    });
    const placeholderIndex = (type) => {
        return [type, MESSAGE_TEMPLATE.indexOf(TEMPLATE_PLACEHOLDERS[type])];
    };
    const placeholderOrder = new Map([
        placeholderIndex('prefix'),
        placeholderIndex('timestamp'),
        placeholderIndex('logLevel'),
        placeholderIndex('name'),
        ['message', MESSAGE_TEMPLATE.match(/(?<!%\w)%c$/) ? 999 : -1],
    ].sort(([_, aIndex], [__, bIndex]) => aIndex - bIndex));
    // Supplement above formatter with browser css color args
    const originalFactory = log.methodFactory;
    log.methodFactory = function addCssColors(methodName, logLevel, loggerName) {
        const rawMethod = originalFactory(methodName, logLevel, loggerName);
        const colorArgs = [];
        for (let [key, value] of placeholderOrder) {
            if (!!~value) {
                const colorVal = colors[key];
                const colorArg = typeof colorVal === 'string' ? colorVal : colorVal(methodName, logLevel, loggerName);
                if (key === 'message') {
                    colorArgs.push(colorArg);
                }
                else {
                    colorArgs.push(colorArg, '');
                }
            }
        }
        return function colorTemplate(...messages) {
            rawMethod(messages.shift(), ...colorArgs, ...messages);
        };
    };

    var _GazelleApi_instances, _GazelleApi_key, _GazelleApi_limiter, _GazelleApi_log, _GazelleApi_sleep, _GazelleApi_fetchAndRetryIfNecessary, _GazelleApi_acquireToken;
    const API_THROTTLE_WINDOW_MILLLIS = 10000;
    const MAX_QUERIES_PER_WINDOW = 5;
    const BACKOFF_TIME_MILLIS = 2000;
    class GazelleApi {
        constructor(apiKey) {
            _GazelleApi_instances.add(this);
            _GazelleApi_key.set(this, void 0);
            _GazelleApi_limiter.set(this, void 0);
            _GazelleApi_log.set(this, void 0);
            __classPrivateFieldSet(this, _GazelleApi_key, apiKey, "f");
            __classPrivateFieldSet(this, _GazelleApi_log, log.getLogger('API'), "f");
            __classPrivateFieldSet(this, _GazelleApi_limiter, new RateLimiter({
                tokensPerInterval: MAX_QUERIES_PER_WINDOW,
                interval: API_THROTTLE_WINDOW_MILLLIS,
            }), "f");
            __classPrivateFieldGet(this, _GazelleApi_log, "f").debug('Built API with throttle %d queries per %d milliseconds.', MAX_QUERIES_PER_WINDOW, API_THROTTLE_WINDOW_MILLLIS);
        }
        async call(data) {
            __classPrivateFieldGet(this, _GazelleApi_log, "f").debug('Call attempt', data);
            return __classPrivateFieldGet(this, _GazelleApi_instances, "m", _GazelleApi_fetchAndRetryIfNecessary).call(this, () => __classPrivateFieldGet(this, _GazelleApi_instances, "m", _GazelleApi_acquireToken).call(this, () => {
                __classPrivateFieldGet(this, _GazelleApi_log, "f").debug('Call executing fetch', data);
                return fetch('/api.php?' + new URLSearchParams(data).toString(), {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'X-API-Key': __classPrivateFieldGet(this, _GazelleApi_key, "f"),
                    },
                });
            }));
        }
        threadInfo(threadId) {
            __classPrivateFieldGet(this, _GazelleApi_log, "f").debug('Getting thread info for threadId: ', threadId);
            return (this.call({ request: 'forums', type: 'thread_info', id: String(threadId) })
                .then((response) => response.json())
                .then((data) => {
                const status = data.status;
                if (status !== 'success' || !('response' in data)) {
                    __classPrivateFieldGet(this, _GazelleApi_log, "f").error(`API returned unsuccessful: ${status}`, data);
                    throw data.error;
                }
                __classPrivateFieldGet(this, _GazelleApi_log, "f").debug('Thread Info response for threadId %d:', threadId, data.response);
                return data.response;
            })
                // Also available title and subscribed
                .then(({ id, forumID, locked, postCountLimit, postTimeLimit, canPost }) => {
                if (Number(forumID) !== 55) {
                    const fail = `Thread ${id} is not a forum game post`;
                    __classPrivateFieldGet(this, _GazelleApi_log, "f").error(fail);
                    throw fail;
                }
                if (locked) {
                    const fail = `Thread ${id} is a locked post`;
                    __classPrivateFieldGet(this, _GazelleApi_log, "f").error(fail);
                    throw fail;
                }
                return {
                    postCountLimit: Number(postCountLimit),
                    postTimeLimit: Number(postTimeLimit),
                    canPost: canPost.toString() === 'true',
                };
            }));
        }
    }
    _GazelleApi_key = new WeakMap(), _GazelleApi_limiter = new WeakMap(), _GazelleApi_log = new WeakMap(), _GazelleApi_instances = new WeakSet(), _GazelleApi_sleep = async function _GazelleApi_sleep(millisToSleep) {
        await new Promise((resolve) => setTimeout(resolve, millisToSleep));
    }, _GazelleApi_fetchAndRetryIfNecessary = async function _GazelleApi_fetchAndRetryIfNecessary(callFn) {
        const response = await callFn();
        if (response.status === 429) {
            await __classPrivateFieldGet(this, _GazelleApi_instances, "m", _GazelleApi_sleep).call(this, BACKOFF_TIME_MILLIS);
            return __classPrivateFieldGet(this, _GazelleApi_instances, "m", _GazelleApi_fetchAndRetryIfNecessary).call(this, callFn);
        }
        return response;
    }, _GazelleApi_acquireToken = async function _GazelleApi_acquireToken(fn) {
        if (__classPrivateFieldGet(this, _GazelleApi_limiter, "f").tryRemoveTokens(1)) {
            return fn();
        }
        else {
            await __classPrivateFieldGet(this, _GazelleApi_instances, "m", _GazelleApi_sleep).call(this, API_THROTTLE_WINDOW_MILLLIS);
            return __classPrivateFieldGet(this, _GazelleApi_instances, "m", _GazelleApi_acquireToken).call(this, fn);
        }
    };

    var _ForumGameStore_instances, _ForumGameStore_apiKey, _ForumGameStore_gameStates, _ForumGameStore_initGM, _ForumGameStore_setGM, _ForumGameStore_storageListener, _ForumGameStore_allGameStates;
    const GM_KEYS = {
        apiKey: 'forumgames_apikey',
    };
    const KEY_GAME_STATE_PREFIX = 'forumGamesState';
    /**
     * @param key window.localStorage key to parse for thread id
     * @returns numeric thread id of the passed key
     */
    function keyToThreadId(key) {
        return Number(key.substring(KEY_GAME_STATE_PREFIX.length));
    }
    class ForumGameStore {
        constructor() {
            _ForumGameStore_instances.add(this);
            _ForumGameStore_apiKey.set(this, void 0);
            _ForumGameStore_gameStates.set(this, void 0);
        }
        async init() {
            __classPrivateFieldSet(this, _ForumGameStore_apiKey, await __classPrivateFieldGet(this, _ForumGameStore_instances, "m", _ForumGameStore_initGM).call(this, 'apiKey'), "f");
            __classPrivateFieldSet(this, _ForumGameStore_gameStates, __classPrivateFieldGet(this, _ForumGameStore_instances, "m", _ForumGameStore_allGameStates).call(this), "f");
            window.addEventListener('storage', __classPrivateFieldGet(this, _ForumGameStore_instances, "m", _ForumGameStore_storageListener).bind(this));
        }
        get apiKey() {
            return __classPrivateFieldGet(this, _ForumGameStore_apiKey, "f");
        }
        set apiKey(key) {
            const oldValue = __classPrivateFieldGet(this, _ForumGameStore_apiKey, "f");
            __classPrivateFieldSet(this, _ForumGameStore_apiKey, key, "f");
            __classPrivateFieldGet(this, _ForumGameStore_instances, "m", _ForumGameStore_setGM).call(this, 'apiKey', oldValue, key);
        }
        // Game state-related functions
        getGameState(threadId) {
            const key = typeof threadId === 'string' && threadId.startsWith(KEY_GAME_STATE_PREFIX)
                ? keyToThreadId(threadId)
                : Number(threadId);
            return __classPrivateFieldGet(this, _ForumGameStore_gameStates, "f").get(key);
        }
        setGameState(threadId, state) {
            const key = KEY_GAME_STATE_PREFIX + threadId;
            __classPrivateFieldGet(this, _ForumGameStore_gameStates, "f").set(threadId, state);
            window.localStorage.setItem(key, JSON.stringify(state));
        }
        get gameStates() {
            return __classPrivateFieldGet(this, _ForumGameStore_gameStates, "f");
        }
        isGameMonitored(threadId) {
            return __classPrivateFieldGet(this, _ForumGameStore_gameStates, "f").has(threadId);
        }
        removeMonitoring(threadId) {
            if (__classPrivateFieldGet(this, _ForumGameStore_gameStates, "f").has(threadId)) {
                __classPrivateFieldGet(this, _ForumGameStore_gameStates, "f").delete(threadId);
                window.localStorage.removeItem(KEY_GAME_STATE_PREFIX + threadId);
            }
        }
    }
    _ForumGameStore_apiKey = new WeakMap(), _ForumGameStore_gameStates = new WeakMap(), _ForumGameStore_instances = new WeakSet(), _ForumGameStore_initGM = async function _ForumGameStore_initGM(name, defaultValue) {
        if (!(await GM.getValue(GM_KEYS[name])) && defaultValue) {
            await GM.setValue(GM_KEYS[name], defaultValue);
            return defaultValue;
        }
        return await GM.getValue(GM_KEYS[name]);
    }, _ForumGameStore_setGM = async function _ForumGameStore_setGM(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            if (newValue !== undefined)
                await GM.setValue(GM_KEYS[name], newValue);
            else
                await GM.deleteValue(GM_KEYS[name]);
            window.dispatchEvent(new StorageEvent('storage', {
                key: name,
                newValue: JSON.stringify(newValue),
                oldValue: JSON.stringify(oldValue),
            }));
        }
    }, _ForumGameStore_storageListener = function _ForumGameStore_storageListener(storageEvent) {
        if (storageEvent.key in this) {
            const key = storageEvent.key;
            this[key] = JSON.parse(storageEvent.newValue);
        }
        else if (storageEvent.key.startsWith(KEY_GAME_STATE_PREFIX)) {
            if (storageEvent.newValue)
                __classPrivateFieldGet(this, _ForumGameStore_gameStates, "f").set(keyToThreadId(storageEvent.key), JSON.parse(storageEvent.newValue));
            else
                __classPrivateFieldGet(this, _ForumGameStore_gameStates, "f").delete(keyToThreadId(storageEvent.key));
        }
    }, _ForumGameStore_allGameStates = function _ForumGameStore_allGameStates() {
        return new Map(Object.keys(window.localStorage)
            .filter((key) => key.startsWith(KEY_GAME_STATE_PREFIX))
            .map((key) => [Number(keyToThreadId(key)), JSON.parse(window.localStorage.getItem(key))]));
    };

    var _Forum_api, _Forum_log, _Forum_store, _Forum_style;
    const isRejected = (input) => input.status === 'rejected';
    const isFulfilled = (input) => input.status === 'fulfilled';
    /**
     * Handles displaying game state on the forum index.
     */
    class Forum {
        constructor(api, store, style) {
            _Forum_api.set(this, void 0);
            _Forum_log.set(this, void 0);
            _Forum_store.set(this, void 0);
            _Forum_style.set(this, void 0);
            __classPrivateFieldSet(this, _Forum_api, api, "f");
            __classPrivateFieldSet(this, _Forum_log, log.getLogger('Forum'), "f");
            __classPrivateFieldSet(this, _Forum_store, store, "f");
            __classPrivateFieldSet(this, _Forum_style, style, "f");
            this.showForumGamePostAvailability();
            this.listenForMorePages();
            this.updateEligibility();
            window.addEventListener('storage', (event) => {
                if (event.key.startsWith(KEY_GAME_STATE_PREFIX)) {
                    __classPrivateFieldGet(this, _Forum_log, "f").debug('Listener heard state update for ', event.key);
                    this.showForumGamePostAvailability();
                }
            });
        }
        /**
         * Style each thread row with its state.
         */
        showForumGamePostAvailability() {
            for (const [key, state] of __classPrivateFieldGet(this, _Forum_store, "f").gameStates.entries()) {
                __classPrivateFieldGet(this, _Forum_style, "f").setPostState(key, state.canPost);
            }
        }
        /**
         * Watch for additional forum thread lines added by other endless scroll scripts
         * and style them accordingly.
         */
        listenForMorePages() {
            const forumTable = document.querySelector('.forum_55 table.forum_index');
            if (forumTable) {
                var observer = new MutationObserver(() => {
                    observer.disconnect();
                    this.showForumGamePostAvailability();
                    this.listenForMorePages();
                });
                observer.observe(forumTable, {
                    attributes: false,
                    childList: true,
                    characterData: false,
                    subtree: true,
                });
            }
        }
        /**
         * @param canPostInThread true to get threads that can be posted in, false otherwise
         * @returns thread ids for tracked threads that can or cannot be posted in (according to {@link canPostInThread})
         */
        getThreadIds(canPostInThread) {
            return [...__classPrivateFieldGet(this, _Forum_store, "f").gameStates.entries()]
                .filter(([_, { canPost }]) => {
                return canPost === canPostInThread;
            })
                .map(([threadId, _]) => threadId);
        }
        /**
         * Checks all thread eligibility first, then sets up a recheck every minute that only checks
         * ineligible threads.
         *
         * The assumption is that the state may not match on initial load, but once updated, the script
         * should be updating states to ineligible when posts are made. So we just have to check those
         * going forward. There is an exceedingly rare case where a game's eligibility requirements
         * might change, but the initial load will catch those next time.
         */
        updateEligibility() {
            __classPrivateFieldGet(this, _Forum_log, "f").debug('Updating state of threads marked as posting eligible');
            this.updateThreads(this.getThreadIds(true));
            this.recheckEligibility();
        }
        /**
         * Checks all threads marked as canPost === false via API to see if eligibility has changed.
         * Repeats every minute after all checks are done.
         */
        async recheckEligibility() {
            __classPrivateFieldGet(this, _Forum_log, "f").debug('Updating state of threads marked as posting ineligible');
            await this.updateThreads(this.getThreadIds(false));
            __classPrivateFieldGet(this, _Forum_log, "f").debug('Waiting 60 seconds before rechecking ineligible threads');
            window.setTimeout(this.updateEligibility.bind(this), 60000);
        }
        /**
         * @param threads IDs of threads to check eligibility for.
         */
        async updateThreads(threads) {
            const updates = await Promise.allSettled(threads.map((threadId) => new Promise((resolve, reject) => {
                __classPrivateFieldGet(this, _Forum_api, "f")
                    .threadInfo(threadId)
                    .then((info) => resolve([threadId, info]))
                    .catch(reject);
            })));
            updates.forEach((result) => {
                if (isRejected(result)) {
                    __classPrivateFieldGet(this, _Forum_log, "f").error('Failed updating a thread: ', result.reason);
                }
                else if (isFulfilled(result)) {
                    const [threadId, threadInfo] = result.value;
                    __classPrivateFieldGet(this, _Forum_store, "f").setGameState(threadId, {
                        nextPostTime: __classPrivateFieldGet(this, _Forum_store, "f").gameStates.get(threadId).nextPostTime,
                        ...threadInfo,
                    });
                }
            });
        }
    }
    _Forum_api = new WeakMap(), _Forum_log = new WeakMap(), _Forum_store = new WeakMap(), _Forum_style = new WeakMap();

    var _ForumThread_instances, _ForumThread_api, _ForumThread_isLastPage, _ForumThread_log, _ForumThread_store, _ForumThread_threadId, _ForumThread_getRecentPostInfo;
    /**
     * Handles checking individual forum thread details and updating state if possible.
     */
    class ForumThread {
        constructor(api, store, threadId) {
            _ForumThread_instances.add(this);
            _ForumThread_api.set(this, void 0);
            _ForumThread_isLastPage.set(this, void 0);
            _ForumThread_log.set(this, void 0);
            _ForumThread_store.set(this, void 0);
            _ForumThread_threadId.set(this, void 0);
            __classPrivateFieldSet(this, _ForumThread_api, api, "f");
            __classPrivateFieldSet(this, _ForumThread_log, log.getLogger('Forum Thread'), "f");
            __classPrivateFieldSet(this, _ForumThread_store, store, "f");
            __classPrivateFieldSet(this, _ForumThread_threadId, threadId, "f");
            __classPrivateFieldSet(this, _ForumThread_isLastPage, !!document.querySelector('.linkbox_top > strong:last-child'), "f");
            __classPrivateFieldGet(this, _ForumThread_log, "f").debug(`Forum thread detected (${__classPrivateFieldGet(this, _ForumThread_isLastPage, "f") ? '' : 'not '}last page)`);
        }
        /**
         * @param post the post to get the ID of.
         * @returns the ID of the post passed in.
         */
        static getPostId(post) {
            return (post &&
                Number(new URLSearchParams(post.querySelector('a.post_id').href).get('postid').split('#')[0]));
        }
        /**
         * @param post the post to get the post time of.
         * @returns post date as epoch millis of the post passed in.
         */
        static getPostTime(post) {
            return post && new Date(post.querySelector('.time').title).getTime();
        }
        /**
         * Checks if the current thread is a forum game thread.
         *
         * @returns true if the current thread is a forum game.
         */
        static get isForumGame() {
            if (window.location.pathname === '/forums.php' &&
                new URLSearchParams(window.location.search).get('action') === 'viewthread') {
                const linkBox = document.querySelector('#content .linkbox_top');
                let prev = linkBox.previousElementSibling;
                while (prev && prev.tagName !== 'H2') {
                    prev = prev.previousElementSibling;
                }
                return Array.from(prev.querySelectorAll('a')).some((el) => el.textContent.includes('Forum Games'));
            }
            return false;
        }
        /**
         * @returns true if the argument is a table element (type guard)
         */
        static isTableElement(elem) {
            return elem.tagName === 'table';
        }
        get isMonitored() {
            return __classPrivateFieldGet(this, _ForumThread_store, "f").isGameMonitored(__classPrivateFieldGet(this, _ForumThread_threadId, "f"));
        }
        get state() {
            return __classPrivateFieldGet(this, _ForumThread_store, "f").getGameState(__classPrivateFieldGet(this, _ForumThread_threadId, "f"));
        }
        set state(state) {
            __classPrivateFieldGet(this, _ForumThread_store, "f").setGameState(__classPrivateFieldGet(this, _ForumThread_threadId, "f"), state);
        }
        /**
         * Monitors or unmonitors this thread, if it was not already in that state.
         *
         * @param monitoringOn true to turn on monitoring, false to turn it off
         * @returns true if the monitoring state was changed, false if it was not
         */
        async changeMonitoring(monitoringOn) {
            if (this.isMonitored === monitoringOn)
                return true;
            if (monitoringOn) {
                __classPrivateFieldGet(this, _ForumThread_log, "f").debug('Set monitoring on for thread ', __classPrivateFieldGet(this, _ForumThread_threadId, "f"));
                unsafeWindow.noty({ type: 'success', text: 'Monitoring forum game for post readiness.' });
                const threadInfo = await __classPrivateFieldGet(this, _ForumThread_api, "f").threadInfo(__classPrivateFieldGet(this, _ForumThread_threadId, "f"));
                if (threadInfo) {
                    this.state = threadInfo;
                }
            }
            else {
                if (window.confirm('You are about to remove monitoring for this forum game. Press OK to confirm.')) {
                    __classPrivateFieldGet(this, _ForumThread_log, "f").debug('Turned monitoring off for thread ', __classPrivateFieldGet(this, _ForumThread_threadId, "f"));
                    __classPrivateFieldGet(this, _ForumThread_store, "f").removeMonitoring(__classPrivateFieldGet(this, _ForumThread_threadId, "f"));
                }
                else {
                    return false;
                }
            }
            return true;
        }
        async init() {
            // Add link / checkbox to monitor thread
            __classPrivateFieldGet(this, _ForumThread_log, "f").debug('Adding monitoring link to thread');
            const monitorLink = document.createElement('a');
            monitorLink.innerText = this.isMonitored ? '[ Unmonitor this game ]' : '[ Monitor this game ]';
            monitorLink.addEventListener('click', async () => {
                await this.changeMonitoring(!this.isMonitored);
                monitorLink.innerText = this.isMonitored ? '[ Unmonitor this game ]' : '[ Monitor this game ]';
            });
            document.querySelector('#subscribe-link').after(monitorLink);
            // Checkbox and label next to subscribe checkbox to change monitoring on post submission
            __classPrivateFieldGet(this, _ForumThread_log, "f").debug('Adding monitoring checkbox to thread');
            const monitorCheckbox = document.createElement('input');
            monitorCheckbox.type = 'checkbox';
            monitorCheckbox.id = 'monitoring';
            if (this.isMonitored)
                monitorCheckbox.checked = true;
            const monitorLabel = document.createElement('label');
            monitorLabel.append(monitorCheckbox, 'Monitor game');
            if (document.querySelector('#subbox')) {
                document.querySelector('#subbox').nextElementSibling.after(monitorLabel);
                document.querySelector('#quickpostform').addEventListener('submit', async () => {
                    __classPrivateFieldGet(this, _ForumThread_log, "f").debug('Reply submitted, checking monitoring checkbox');
                    return await this.changeMonitoring(monitorCheckbox.checked);
                });
                // Update state if monitored
                if (this.isMonitored && __classPrivateFieldGet(this, _ForumThread_isLastPage, "f")) {
                    const state = this.state;
                    if (state) {
                        const { canPost: previousCanPost } = state;
                        __classPrivateFieldGet(this, _ForumThread_log, "f").debug('Updating thread states from', state);
                        const { lastPostTime, otherPostIds } = __classPrivateFieldGet(this, _ForumThread_instances, "m", _ForumThread_getRecentPostInfo).call(this);
                        if (!isNaN(lastPostTime)) {
                            const nextPostTime = new Date(lastPostTime + state.postTimeLimit * 3600000);
                            state.nextPostTime = nextPostTime;
                            state.canPost = otherPostIds.length >= state.postCountLimit || nextPostTime < new Date();
                        }
                        else {
                            state.canPost = otherPostIds.length >= state.postCountLimit;
                        }
                        __classPrivateFieldGet(this, _ForumThread_log, "f").debug('New state', state);
                        if (previousCanPost != state.canPost)
                            __classPrivateFieldGet(this, _ForumThread_store, "f").setGameState(__classPrivateFieldGet(this, _ForumThread_threadId, "f"), state);
                    }
                }
                __classPrivateFieldGet(this, _ForumThread_log, "f").log('Current thread state:', this.state);
            }
            else {
                __classPrivateFieldGet(this, _ForumThread_log, "f").info('Current thread is locked.');
            }
        }
    }
    _ForumThread_api = new WeakMap(), _ForumThread_isLastPage = new WeakMap(), _ForumThread_log = new WeakMap(), _ForumThread_store = new WeakMap(), _ForumThread_threadId = new WeakMap(), _ForumThread_instances = new WeakSet(), _ForumThread_getRecentPostInfo = function _ForumThread_getRecentPostInfo() {
        if (__classPrivateFieldGet(this, _ForumThread_isLastPage, "f")) {
            __classPrivateFieldGet(this, _ForumThread_log, "f").debug('Getting user recent post info from last page');
            const userId = document.querySelector('#nav_userinfo a').href.match(/id=(\d+)/)[1];
            let lastPostByUser;
            for (const el of document.querySelectorAll(`.forum_post a.username[href$='id=${userId}']`)) {
                // :visible
                if (el.offsetWidth > 0 || el.offsetHeight > 0) {
                    lastPostByUser = el.closest('table');
                }
            }
            __classPrivateFieldGet(this, _ForumThread_log, "f").debug(`Post by user ${lastPostByUser ? '' : 'not '} found on page.`);
            const firstPostOnPage = document.querySelector('.forum_post');
            const post = lastPostByUser ? lastPostByUser : firstPostOnPage;
            const otherPosts = [];
            if (post === firstPostOnPage) {
                // Include the first post (not belonging to this user)
                otherPosts.push(ForumThread.getPostId(firstPostOnPage));
            }
            let nextPost = post;
            while ((nextPost = nextPost.nextElementSibling)) {
                if (ForumThread.isTableElement(nextPost) && !/\bsticky_post\b/.test(nextPost.className)) {
                    otherPosts.push(ForumThread.getPostId(nextPost));
                }
            }
            return { lastPostTime: ForumThread.getPostTime(lastPostByUser), otherPostIds: otherPosts };
        }
    };

    /**
     * Handles adding greasemonkey menu items to set logging level for the script.
     */
    const buildMenu = () => {
        GM.registerMenuCommand('Set Log Level to Trace', () => log.setLevel('TRACE'), 'T');
        GM.registerMenuCommand('Set Log Level to Debug', () => log.setLevel('DEBUG'), 'D');
        GM.registerMenuCommand('Set Log Level to Warning', () => log.setLevel('WARN'), 'W');
        GM.registerMenuCommand('Set Log Level to Log', () => log.setLevel('INFO'), 'L');
        GM.registerMenuCommand('Set Log Level to Error', () => log.setLevel('ERROR'), 'E');
        GM.registerMenuCommand('Turn off logging', () => log.setLevel('SILENT'), 'o');
    };

    ___$insertStylesToHeader(".forum-games-checker-game_room__row.rowa {\n  background-color: var(--rowa);\n}\n.forum-games-checker-game_room__row.rowb {\n  background-color: var(--rowb);\n}\n.forum-games-checker-game_room__row--unread-ineligible td:first-of-type {\n  background-blend-mode: overlay;\n  background-color: brown;\n  mask-image: url(\"static/styles/game_room/images/balloon-unread.png\");\n  mask-position: 50%;\n  mask-repeat: no-repeat;\n}\n.forum-games-checker-game_room__row--unread-eligible td:first-of-type {\n  background-blend-mode: overlay;\n  background-color: olive;\n  mask-image: url(\"static/styles/game_room/images/balloon-unread.png\");\n  mask-position: 50%;\n  mask-repeat: no-repeat;\n}\n.forum-games-checker-game_room__row--read-ineligible td:first-of-type {\n  background-blend-mode: overlay;\n  background-color: rgba(255, 0, 0, 0.3);\n  mask-image: url(\"static/styles/game_room/images/balloon-unread.png\");\n  mask-position: 50%;\n  mask-repeat: no-repeat;\n}\n.forum-games-checker-game_room__row--read-eligible td:first-of-type {\n  background-blend-mode: overlay;\n  background-color: rgba(0, 255, 0, 0.2);\n  mask-image: url(\"static/styles/game_room/images/balloon-unread.png\");\n  mask-position: 50%;\n  mask-repeat: no-repeat;\n}");

    ___$insertStylesToHeader(".forum-games-checker-default__row--unread-ineligible span.last_topic::before {\n  content: \"\";\n  background-color: red;\n  border: 1px solid black;\n  border-radius: 7.5px;\n  box-shadow: 1px 1px 0.5px gray;\n  box-sizing: border-box;\n  float: left;\n  margin-right: 5px;\n  height: 15px;\n  width: 15px;\n}\n.forum-games-checker-default__row--unread-eligible span.last_topic::before {\n  content: \"\";\n  background-color: green;\n  border: 1px solid black;\n  border-radius: 7.5px;\n  box-shadow: 1px 1px 0.5px gray;\n  box-sizing: border-box;\n  float: left;\n  margin-right: 5px;\n  height: 15px;\n  width: 15px;\n}\n.forum-games-checker-default__row--read-ineligible span.last_topic::before {\n  content: \"\";\n  background-color: red;\n  border: 1px solid black;\n  border-radius: 7.5px;\n  box-shadow: 1px 1px 0.5px gray;\n  box-sizing: border-box;\n  float: left;\n  margin-right: 5px;\n  height: 15px;\n  width: 15px;\n}\n.forum-games-checker-default__row--read-eligible span.last_topic::before {\n  content: \"\";\n  background-color: green;\n  border: 1px solid black;\n  border-radius: 7.5px;\n  box-shadow: 1px 1px 0.5px gray;\n  box-sizing: border-box;\n  float: left;\n  margin-right: 5px;\n  height: 15px;\n  width: 15px;\n}");

    var _BaseStyle_rowClassName;
    /**
     * Array of test functions to functions that instantiate a {@link Style}.
     * Use {@link StyleFactory.registerStyle} to alter.
     */
    const registeredStyles = [];
    /**
     * Used to build a style matching the current forum game index stylesheet.
     */
    const StyleFactory = {
        /**
         * @returns An instance of a {@link Style} that matches the current index stylesheet.
         */
        build: () => {
            const matchedStyle = registeredStyles.find(([testFunction, _]) => testFunction());
            return matchedStyle ? matchedStyle[1]() : new BaseStyle('forum-games-checker-default__row');
        },
        /**
         * Register a new {@link Style} to be returned by {@link build}.
         *
         * @param testFunction Function that returns true if the caller {@link Style} can be applied to the current index stylesheet.
         * @param createFunction Function that instantiates the caller {@link Style}.
         */
        registerStyle: (testFunction, createFunction) => {
            registeredStyles.unshift([testFunction, createFunction]);
        },
    };
    /**
     * Base style that can be overridden for specific stylesheet logic. Has the default implementation of all methods.
     */
    class BaseStyle {
        /**
         * Instantiation of Style that can be called to style forum index page.
         *
         * @param rowClassName base class identifier used in matching .scss file. Must be unique on the site and other style types. Suggested format follows BEM, such as 'forum-games-checker-STYLE_NAME__row'
         */
        constructor(rowClassName) {
            _BaseStyle_rowClassName.set(this, void 0);
            __classPrivateFieldSet(this, _BaseStyle_rowClassName, rowClassName, "f");
        }
        modifyIcon(icon, canPost) {
            icon.nextElementSibling.querySelector('.last_topic').title = `You are ${canPost ? 'eligible' : 'ineligible'} to participate in this forum game.`;
        }
        setPostState(threadId, canPost) {
            const icon = document.querySelector(`a[href$='threadid=${threadId}']`)?.closest('td')
                ?.previousElementSibling;
            if (!icon ||
                // Technically only locked should be excluded, but we don't have sticky logic
                [
                    'unread_locked_sticky',
                    'read_locked_sticky',
                    'unread_sticky',
                    'read_sticky',
                    'unread_locked',
                    'read_locked',
                ].some((className) => icon.classList.contains(className))) {
                return;
            }
            this.modifyIcon(icon, canPost);
            const row = icon.closest('tr');
            if (icon.classList.contains('unread')) {
                if (canPost)
                    this.styleRow(row, 'unread-eligible');
                else
                    this.styleRow(row, 'unread-ineligible');
            }
            else {
                if (canPost)
                    this.styleRow(row, 'read-eligible');
                else
                    this.styleRow(row, 'read-ineligible');
            }
        }
        styleRow(row, stateName) {
            row.classList.add(__classPrivateFieldGet(this, _BaseStyle_rowClassName, "f"), __classPrivateFieldGet(this, _BaseStyle_rowClassName, "f") + '--' + stateName);
        }
    }
    _BaseStyle_rowClassName = new WeakMap();

    // Import matching scss so our class assignments will do stuff
    // Register this style in the factory so it'll be used when our condition matches.
    StyleFactory.registerStyle(() => document.querySelector('link[rel="stylesheet"][title]').title === 'game_room', () => new GameRoomStyle());
    class GameRoomStyle extends BaseStyle {
        constructor() {
            // class name that matches imported .scss
            super('forum-games-checker-game_room__row');
        }
        // Instead of applying title to the thread link span, we apply it to the icon itself for this style
        modifyIcon(icon, canPost) {
            icon.title = `You are ${canPost ? 'eligible' : 'ineligible'} to participate in this forum game.`;
        }
    }

    (async function () {
        const log$1 = log.getLogger('index');
        buildMenu();
        log$1.debug('Loading stored settings');
        const STORE = new ForumGameStore();
        await STORE.init();
        log$1.debug('Settings loaded');
        function askForApiKey() {
            log$1.debug('Querying for API key');
            const input = window.prompt(`Please input your GGn API key.
If you don't have one, please generate one from your Edit Profile page: https://gazellegames.net/user.php?action=edit.
The API key must have "Forums" permission

Please disable this userscript until you have one as this prompt will continue to show until you enter one in.`);
            const trimmed = input.trim();
            if (/[a-f0-9]{64}/.test(trimmed)) {
                log$1.debug('API key is valid length, storing');
                STORE.apiKey = trimmed;
                return STORE.apiKey;
            }
            else {
                log.getLogger('critical').error('API key entered is not valid. It must be 64 hex characters 0-9a-f.');
                throw 'No API key found.';
            }
        }
        const API = new GazelleApi(STORE.apiKey || askForApiKey());
        if (ForumThread.isForumGame) {
            new ForumThread(API, STORE, Number(new URLSearchParams(window.location.search).get('threadid'))).init();
        }
        else {
            const STYLE = StyleFactory.build();
            new Forum(API, STORE, STYLE);
        }
    })();

})();
