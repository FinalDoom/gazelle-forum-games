// ==UserScript==
// @name        GGn Forum Games Checker
// @description Tracks forum games participation eligibility and marks thread read indicators accordingly.
// @namespace   https://gazellegames.net/
// @require     https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @match       https://gazellegames.net/forums.php?*action=viewforum&forumid=55*
// @match       https://gazellegames.net/forums.php?*action=viewthread&threadid=*
// @version     3.2.0
// @homepage    https://github.com/FinalDoom/gazelle-forum-games
// @author      FinalDoom
// @license     ISC
// @grant       GM.getValue
// @grant       GM.setValue
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
PERFORMANCE OF THIS SOFTWARE.*/

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

  ___$insertStylesToHeader(".forum-games-checker-game_room__row.rowa {\n  background-color: var(--rowa); }\n\n.forum-games-checker-game_room__row.rowb {\n  background-color: var(--rowb); }\n\n.forum-games-checker-game_room__row--unread-ineligible td:first-of-type {\n  background-blend-mode: overlay;\n  background-color: brown;\n  mask-image: url(\"static/styles/game_room/images/balloon-unread.png\");\n  mask-position: 50%;\n  mask-repeat: no-repeat; }\n\n.forum-games-checker-game_room__row--unread-eligible td:first-of-type {\n  background-blend-mode: overlay;\n  background-color: olive;\n  mask-image: url(\"static/styles/game_room/images/balloon-unread.png\");\n  mask-position: 50%;\n  mask-repeat: no-repeat; }\n\n.forum-games-checker-game_room__row--read-ineligible td:first-of-type {\n  background-blend-mode: overlay;\n  background-color: rgba(255, 0, 0, 0.3);\n  mask-image: url(\"static/styles/game_room/images/balloon-unread.png\");\n  mask-position: 50%;\n  mask-repeat: no-repeat; }\n\n.forum-games-checker-game_room__row--read-eligible td:first-of-type {\n  background-blend-mode: overlay;\n  background-color: rgba(0, 255, 0, 0.2);\n  mask-image: url(\"static/styles/game_room/images/balloon-unread.png\");\n  mask-position: 50%;\n  mask-repeat: no-repeat; }\n");

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

  ___$insertStylesToHeader(".forum-games-checker-default__row--unread-ineligible span.last_topic::before {\n  content: '';\n  background-color: red;\n  border: 1px solid black;\n  border-radius: 7.5px;\n  box-shadow: 1px 1px 0.5px gray;\n  box-sizing: border-box;\n  float: left;\n  margin-right: 5px;\n  height: 15px;\n  width: 15px; }\n\n.forum-games-checker-default__row--unread-eligible span.last_topic::before {\n  content: '';\n  background-color: green;\n  border: 1px solid black;\n  border-radius: 7.5px;\n  box-shadow: 1px 1px 0.5px gray;\n  box-sizing: border-box;\n  float: left;\n  margin-right: 5px;\n  height: 15px;\n  width: 15px; }\n\n.forum-games-checker-default__row--read-ineligible span.last_topic::before {\n  content: '';\n  background-color: red;\n  border: 1px solid black;\n  border-radius: 7.5px;\n  box-shadow: 1px 1px 0.5px gray;\n  box-sizing: border-box;\n  float: left;\n  margin-right: 5px;\n  height: 15px;\n  width: 15px; }\n\n.forum-games-checker-default__row--read-eligible span.last_topic::before {\n  content: '';\n  background-color: green;\n  border: 1px solid black;\n  border-radius: 7.5px;\n  box-shadow: 1px 1px 0.5px gray;\n  box-sizing: border-box;\n  float: left;\n  margin-right: 5px;\n  height: 15px;\n  width: 15px; }\n");

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
          icon
              .next()
              .find('.last_topic')
              .attr('title', `You are ${canPost ? 'eligible' : 'ineligible'} to participate in this forum game.`);
      }
      setPostState(threadId, canPost) {
          const icon = $(`a[href$='threadid=${threadId}']`).closest('td').prev();
          this.modifyIcon(icon, canPost);
          if (!icon.length ||
              // Technically only locked should be excluded, but we don't have sticky logic
              icon.is('.unread_locked_sticky, .read_locked_sticky, ' +
                  '.unread_sticky, .read_sticky, ' +
                  '.unread_locked, .read_locked')) {
              return;
          }
          const row = icon.closest('tr');
          if (icon.is('.unread')) {
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
          row.addClass([__classPrivateFieldGet(this, _BaseStyle_rowClassName, "f"), __classPrivateFieldGet(this, _BaseStyle_rowClassName, "f") + '--' + stateName]);
      }
  }
  _BaseStyle_rowClassName = new WeakMap();

  // Import matching scss so our class assignments will do stuff
  // Register this style in the factory so it'll be used when our condition matches.
  StyleFactory.registerStyle(() => $('link[rel="stylesheet"][title]').attr('title') === 'game_room', () => new GameRoomStyle());
  class GameRoomStyle extends BaseStyle {
      constructor() {
          // class name that matches imported .scss
          super('forum-games-checker-game_room__row');
      }
      // Instead of applying title to the thread link span, we apply it to the icon itself for this style
      modifyIcon(icon, canPost) {
          icon.attr('title', `You are ${canPost ? 'eligible' : 'ineligible'} to participate in this forum game.`);
      }
  }

  var _GazelleApi_key, _GazelleApi_log, _GazelleApi_store;
  const TEN_SECOND_DELAY_MILLIS = 11000;
  const MAX_API_QUERIES_BEFORE_THROTTLE = 5;
  class GazelleApi {
      constructor(store, log) {
          _GazelleApi_key.set(this, void 0);
          _GazelleApi_log.set(this, void 0);
          _GazelleApi_store.set(this, void 0);
          __classPrivateFieldSet(this, _GazelleApi_store, store, "f");
          __classPrivateFieldSet(this, _GazelleApi_log, log, "f");
          __classPrivateFieldSet(this, _GazelleApi_key, __classPrivateFieldGet(this, _GazelleApi_store, "f").apiKey, "f");
          if (!__classPrivateFieldGet(this, _GazelleApi_key, "f")) {
              const input = window.prompt(`Please input your GGn API key.
If you don't have one, please generate one from your Edit Profile page: https://gazellegames.net/user.php?action=edit.
The API key must have "Items" permission

Please disable this userscript until you have one as this prompt will continue to show until you enter one in.`);
              const trimmed = input.trim();
              if (/[a-f0-9]{64}/.test(trimmed)) {
                  __classPrivateFieldGet(this, _GazelleApi_store, "f").apiKey = trimmed;
                  __classPrivateFieldSet(this, _GazelleApi_key, trimmed, "f");
              }
          }
      }
      // Execute an API call and also handle throttling to 5 calls per 10 seconds
      async call(data) {
          while (true) {
              const nowTimeBeforeWait = new Date().getTime();
              if (__classPrivateFieldGet(this, _GazelleApi_store, "f").apiTenSecondRequests >= MAX_API_QUERIES_BEFORE_THROTTLE &&
                  nowTimeBeforeWait - __classPrivateFieldGet(this, _GazelleApi_store, "f").apiTenSecondTime < TEN_SECOND_DELAY_MILLIS) {
                  __classPrivateFieldGet(this, _GazelleApi_log, "f").log(() => `Waiting ${((TEN_SECOND_DELAY_MILLIS - (nowTimeBeforeWait - __classPrivateFieldGet(this, _GazelleApi_store, "f").apiTenSecondTime)) / 1000).toFixed(1)} seconds for more API calls.`);
                  await new Promise((resolve) => setTimeout(resolve, TEN_SECOND_DELAY_MILLIS - (nowTimeBeforeWait - __classPrivateFieldGet(this, _GazelleApi_store, "f").apiTenSecondTime)));
              }
              else {
                  break;
              }
          }
          if (new Date().getTime() - __classPrivateFieldGet(this, _GazelleApi_store, "f").apiTenSecondTime > TEN_SECOND_DELAY_MILLIS) {
              __classPrivateFieldGet(this, _GazelleApi_store, "f").resetApiThrottle();
          }
          __classPrivateFieldGet(this, _GazelleApi_store, "f").incrementApiRequestsCount();
          __classPrivateFieldGet(this, _GazelleApi_log, "f").debug('API call', data);
          return fetch('/api.php?' + new URLSearchParams(data).toString(), {
              method: 'GET',
              headers: {
                  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                  'X-API-Key': __classPrivateFieldGet(this, _GazelleApi_key, "f"),
              },
          })
              .then((response) => response.json())
              .then((data) => {
              const status = data.status;
              if (status !== 'success' || !('response' in data)) {
                  __classPrivateFieldGet(this, _GazelleApi_log, "f").error(`API returned unsuccessful: ${status}`, data);
                  return;
              }
              return data.response;
          });
      }
      async threadInfo(threadId) {
          return await this.call({ request: 'forums', type: 'thread_info', id: String(threadId) })
              // Also available title and subscribed
              .then(({ id, forumID, locked, postCountLimit, postTimeLimit, canPost }) => {
              if (Number(forumID) !== 55) {
                  const fail = `Thread ${id} is not a forum game post`;
                  __classPrivateFieldGet(this, _GazelleApi_log, "f").error(fail);
                  throw fail;
              }
              if (locked)
                  return undefined;
              return {
                  postCountLimit: Number(postCountLimit),
                  postTimeLimit: Number(postTimeLimit),
                  canPost: canPost.toString() === 'true',
              };
          })
              .catch((reason) => {
              __classPrivateFieldGet(this, _GazelleApi_log, "f").error(reason);
              return reason !== 'thread does not exist' ? false : undefined;
          });
      }
  }
  _GazelleApi_key = new WeakMap(), _GazelleApi_log = new WeakMap(), _GazelleApi_store = new WeakMap();

  var _ForumGameStore_instances, _ForumGameStore_apiKey, _ForumGameStore_apiTenSecondRequests, _ForumGameStore_apiTenSecondTime, _ForumGameStore_gameStates, _ForumGameStore_initGM, _ForumGameStore_initLocalStorage, _ForumGameStore_setGM, _ForumGameStore_setLocalStorage, _ForumGameStore_storageListener, _ForumGameStore_allGameStates;
  const GM_KEYS = {
      apiKey: 'forumgames_apikey',
  };
  const LOCAL_STORAGE_KEYS = {
      apiTenSecondTime: 'forumGamesTenSecondTime',
      apiTenSecondRequests: 'forumGamesApiRequests',
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
          _ForumGameStore_apiTenSecondRequests.set(this, void 0);
          _ForumGameStore_apiTenSecondTime.set(this, void 0);
          _ForumGameStore_gameStates.set(this, void 0);
      }
      async init() {
          __classPrivateFieldSet(this, _ForumGameStore_apiKey, await __classPrivateFieldGet(this, _ForumGameStore_instances, "m", _ForumGameStore_initGM).call(this, 'apiKey'), "f");
          __classPrivateFieldSet(this, _ForumGameStore_apiTenSecondRequests, __classPrivateFieldGet(this, _ForumGameStore_instances, "m", _ForumGameStore_initLocalStorage).call(this, 'apiTenSecondRequests', 0), "f");
          __classPrivateFieldSet(this, _ForumGameStore_apiTenSecondTime, __classPrivateFieldGet(this, _ForumGameStore_instances, "m", _ForumGameStore_initLocalStorage).call(this, 'apiTenSecondTime', 0), "f");
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
      // API-related functions
      get apiTenSecondRequests() {
          return __classPrivateFieldGet(this, _ForumGameStore_apiTenSecondRequests, "f");
      }
      set apiTenSecondRequests(requests) {
          const oldValue = __classPrivateFieldGet(this, _ForumGameStore_apiTenSecondRequests, "f");
          __classPrivateFieldSet(this, _ForumGameStore_apiTenSecondRequests, requests, "f");
          __classPrivateFieldGet(this, _ForumGameStore_instances, "m", _ForumGameStore_setLocalStorage).call(this, 'apiTenSecondRequests', oldValue, requests);
      }
      get apiTenSecondTime() {
          return __classPrivateFieldGet(this, _ForumGameStore_apiTenSecondTime, "f");
      }
      set apiTenSecondTime(time) {
          const oldValue = __classPrivateFieldGet(this, _ForumGameStore_apiTenSecondTime, "f");
          __classPrivateFieldSet(this, _ForumGameStore_apiTenSecondTime, time, "f");
          __classPrivateFieldGet(this, _ForumGameStore_instances, "m", _ForumGameStore_setLocalStorage).call(this, 'apiTenSecondTime', oldValue, time);
      }
      resetApiThrottle() {
          this.apiTenSecondRequests = 0;
          this.apiTenSecondTime = new Date().getTime();
      }
      incrementApiRequestsCount() {
          this.apiTenSecondRequests = __classPrivateFieldGet(this, _ForumGameStore_apiTenSecondRequests, "f") + 1;
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
  _ForumGameStore_apiKey = new WeakMap(), _ForumGameStore_apiTenSecondRequests = new WeakMap(), _ForumGameStore_apiTenSecondTime = new WeakMap(), _ForumGameStore_gameStates = new WeakMap(), _ForumGameStore_instances = new WeakSet(), _ForumGameStore_initGM = async function _ForumGameStore_initGM(name, defaultValue) {
      if (!(await GM.getValue(GM_KEYS[name])) && defaultValue) {
          await GM.setValue(GM_KEYS[name], defaultValue);
          return defaultValue;
      }
      return await GM.getValue(GM_KEYS[name]);
  }, _ForumGameStore_initLocalStorage = function _ForumGameStore_initLocalStorage(name, defaultValue, stringify = JSON.stringify, parse = JSON.parse) {
      if (!window.localStorage.hasOwnProperty(LOCAL_STORAGE_KEYS[name])) {
          window.localStorage.setItem(LOCAL_STORAGE_KEYS[name], stringify(defaultValue));
          return defaultValue;
      }
      return parse(window.localStorage.getItem(LOCAL_STORAGE_KEYS[name]));
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
  }, _ForumGameStore_setLocalStorage = function _ForumGameStore_setLocalStorage(name, oldValue, newValue, stringify = JSON.stringify) {
      if (oldValue !== newValue) {
          if (newValue !== undefined)
              window.localStorage.setItem(LOCAL_STORAGE_KEYS[name], stringify(newValue));
          else
              window.localStorage.removeItem(LOCAL_STORAGE_KEYS[name]);
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

  var _Forum_api, _Forum_store, _Forum_style;
  class Forum {
      constructor(api, store, style) {
          _Forum_api.set(this, void 0);
          _Forum_store.set(this, void 0);
          _Forum_style.set(this, void 0);
          __classPrivateFieldSet(this, _Forum_api, api, "f");
          __classPrivateFieldSet(this, _Forum_store, store, "f");
          __classPrivateFieldSet(this, _Forum_style, style, "f");
          this.showForumGamePostAvailability();
          this.listenForMorePages();
          this.recheckEligibility();
          window.addEventListener('storage', (event) => event.key.startsWith(KEY_GAME_STATE_PREFIX) && this.showForumGamePostAvailability());
      }
      showForumGamePostAvailability() {
          for (const [key, state] of __classPrivateFieldGet(this, _Forum_store, "f").gameStates.entries()) {
              __classPrivateFieldGet(this, _Forum_style, "f").setPostState(key, state.canPost);
          }
      }
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
      async recheckEligibility() {
          for (const [threadId, { nextPostTime }] of __classPrivateFieldGet(this, _Forum_store, "f").gameStates.entries()) {
              await new Promise((resolve) => window.setTimeout(async () => {
                  const threadInfo = await __classPrivateFieldGet(this, _Forum_api, "f").threadInfo(threadId);
                  if (threadInfo) {
                      __classPrivateFieldGet(this, _Forum_store, "f").setGameState(threadId, { nextPostTime: nextPostTime, ...threadInfo });
                  }
                  resolve();
              }, TEN_SECOND_DELAY_MILLIS / MAX_API_QUERIES_BEFORE_THROTTLE));
          }
          window.setTimeout(this.recheckEligibility.bind(this), 60000);
      }
  }
  _Forum_api = new WeakMap(), _Forum_store = new WeakMap(), _Forum_style = new WeakMap();

  var _ForumThread_instances, _ForumThread_api, _ForumThread_isLastPage, _ForumThread_log, _ForumThread_store, _ForumThread_threadId, _ForumThread_getRecentPostInfo;
  class ForumThread {
      constructor(api, log, store, threadId) {
          _ForumThread_instances.add(this);
          _ForumThread_api.set(this, void 0);
          _ForumThread_isLastPage.set(this, void 0);
          _ForumThread_log.set(this, void 0);
          _ForumThread_store.set(this, void 0);
          _ForumThread_threadId.set(this, void 0);
          __classPrivateFieldSet(this, _ForumThread_api, api, "f");
          __classPrivateFieldSet(this, _ForumThread_log, log, "f");
          __classPrivateFieldSet(this, _ForumThread_store, store, "f");
          __classPrivateFieldSet(this, _ForumThread_threadId, threadId, "f");
          __classPrivateFieldSet(this, _ForumThread_isLastPage, !!document.querySelector('.linkbox_top > strong:last-child'), "f");
      }
      static getPostId(post) {
          return (post &&
              Number(new URLSearchParams(post.querySelector('a.post_id').href).get('postid').split('#')[0]));
      }
      static getPostTime(post) {
          return post && new Date(post.querySelector('.time').title).getTime();
      }
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
      async changeMonitoring(monitoringOn) {
          if (this.isMonitored === monitoringOn)
              return true;
          if (monitoringOn) {
              unsafeWindow.noty({ type: 'success', text: 'Monitoring forum game for post readiness.' });
              const threadInfo = await __classPrivateFieldGet(this, _ForumThread_api, "f").threadInfo(__classPrivateFieldGet(this, _ForumThread_threadId, "f"));
              if (threadInfo) {
                  this.state = threadInfo;
              }
          }
          else {
              if (window.confirm('You are about to remove monitoring for this forum game. Press OK to confirm.')) {
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
          const monitorLink = document.createElement('a');
          monitorLink.innerText = this.isMonitored ? '[ Unmonitor this game ]' : '[ Monitor this game ]';
          monitorLink.addEventListener('click', async () => {
              await this.changeMonitoring(!this.isMonitored);
              monitorLink.innerText = this.isMonitored ? '[ Unmonitor this game ]' : '[ Monitor this game ]';
          });
          document.querySelector('#subscribe-link').after(monitorLink);
          // Checkbox and label next to subscribe checkbox to change monitoring on post submission
          const monitorCheckbox = document.createElement('input');
          monitorCheckbox.type = 'checkbox';
          monitorCheckbox.id = 'monitoring';
          if (this.isMonitored)
              monitorCheckbox.checked = true;
          const monitorLabel = document.createElement('label');
          monitorLabel.append(monitorCheckbox, 'Monitor game');
          document.querySelector('#subbox').nextElementSibling.after(monitorLabel);
          document.querySelector('#quickpostform').addEventListener('submit', async () => {
              return await this.changeMonitoring(monitorCheckbox.checked);
          });
          // Update state if monitored
          if (this.isMonitored && __classPrivateFieldGet(this, _ForumThread_isLastPage, "f")) {
              const state = this.state;
              if (state) {
                  const { canPost: previousCanPost } = state;
                  __classPrivateFieldGet(this, _ForumThread_log, "f").debug('Updating states from', state);
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
          __classPrivateFieldGet(this, _ForumThread_log, "f").log('Current thread state:', () => this.state);
      }
  }
  _ForumThread_api = new WeakMap(), _ForumThread_isLastPage = new WeakMap(), _ForumThread_log = new WeakMap(), _ForumThread_store = new WeakMap(), _ForumThread_threadId = new WeakMap(), _ForumThread_instances = new WeakSet(), _ForumThread_getRecentPostInfo = function _ForumThread_getRecentPostInfo() {
      if (__classPrivateFieldGet(this, _ForumThread_isLastPage, "f")) {
          const userId = document.querySelector('#nav_userinfo a').href.match(/id=(\d+)/)[1];
          let lastPostByUser;
          for (const el of document.querySelectorAll(`.forum_post a.username[href$='id=${userId}']`)) {
              // :visible
              if (el.offsetWidth > 0 || el.offsetHeight > 0) {
                  lastPostByUser = el.closest('table');
              }
          }
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

  var _ConsoleLog_instances, _ConsoleLog_level, _ConsoleLog_prefix, _ConsoleLog_start, _ConsoleLog_logToConsole;
  var LogLevel;
  (function (LogLevel) {
      LogLevel[LogLevel["None"] = 0] = "None";
      LogLevel[LogLevel["Error"] = 1] = "Error";
      LogLevel[LogLevel["Warning"] = 2] = "Warning";
      LogLevel[LogLevel["Log"] = 3] = "Log";
      LogLevel[LogLevel["Debug"] = 4] = "Debug";
      LogLevel[LogLevel["Timing"] = 5] = "Timing";
  })(LogLevel || (LogLevel = {}));
  class ConsoleLog {
      constructor(prefix, level = LogLevel.Log) {
          _ConsoleLog_instances.add(this);
          _ConsoleLog_level.set(this, void 0);
          _ConsoleLog_prefix.set(this, void 0);
          _ConsoleLog_start.set(this, new Date());
          __classPrivateFieldSet(this, _ConsoleLog_prefix, prefix, "f");
          __classPrivateFieldSet(this, _ConsoleLog_level, level, "f");
      }
      timing(...args) {
          if (__classPrivateFieldGet(this, _ConsoleLog_level, "f") >= LogLevel.Timing)
              __classPrivateFieldGet(this, _ConsoleLog_instances, "m", _ConsoleLog_logToConsole).call(this, console.debug, () => `(${new Date().valueOf() - __classPrivateFieldGet(this, _ConsoleLog_start, "f").valueOf()})`, ...args);
      }
      debug(...args) {
          if (__classPrivateFieldGet(this, _ConsoleLog_level, "f") >= LogLevel.Debug)
              __classPrivateFieldGet(this, _ConsoleLog_instances, "m", _ConsoleLog_logToConsole).call(this, console.debug, ...args);
      }
      log(...args) {
          if (__classPrivateFieldGet(this, _ConsoleLog_level, "f") >= LogLevel.Log)
              __classPrivateFieldGet(this, _ConsoleLog_instances, "m", _ConsoleLog_logToConsole).call(this, console.log, ...args);
      }
      warn(...args) {
          if (__classPrivateFieldGet(this, _ConsoleLog_level, "f") >= LogLevel.Warning)
              __classPrivateFieldGet(this, _ConsoleLog_instances, "m", _ConsoleLog_logToConsole).call(this, console.warn, ...args);
      }
      error(...args) {
          if (__classPrivateFieldGet(this, _ConsoleLog_level, "f") >= LogLevel.Error)
              __classPrivateFieldGet(this, _ConsoleLog_instances, "m", _ConsoleLog_logToConsole).call(this, console.error, ...args);
      }
  }
  _ConsoleLog_level = new WeakMap(), _ConsoleLog_prefix = new WeakMap(), _ConsoleLog_start = new WeakMap(), _ConsoleLog_instances = new WeakSet(), _ConsoleLog_logToConsole = function _ConsoleLog_logToConsole(logMethod, ...args) {
      const resolvedArgs = args.map((arg) => (typeof arg === 'function' ? arg() : arg));
      logMethod(__classPrivateFieldGet(this, _ConsoleLog_prefix, "f"), ...resolvedArgs);
  };

  (async function () {
      const LOG = new ConsoleLog('[GGn Forum Games Helper]');
      const STORE = new ForumGameStore();
      await STORE.init();
      const API = new GazelleApi(STORE, LOG);
      if (new URLSearchParams(window.location.search).get('action') === 'viewthread' && ForumThread.isForumGame) {
          new ForumThread(API, LOG, STORE, Number(new URLSearchParams(window.location.search).get('threadid'))).init();
      }
      else {
          const STYLE = StyleFactory.build();
          new Forum(API, STORE, STYLE);
      }
  })();

})();
