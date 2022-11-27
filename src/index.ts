import {GazelleApi} from './api';
import Forum from './forum';
import ForumThread from './forum-thread';
import Logger from './log';
import {buildMenu} from './menu';
import {ForumGameStore} from './store';
import './styles/all-styles';
import {StyleFactory} from './styles/style';

('use strict');

declare global {
  interface Window {
    noty: (options: {type: 'error' | 'warn' | 'success'; text: string}) => void;
  }
}

(async function () {
  const log = Logger.getLogger('index');
  buildMenu();

  log.debug('Loading stored settings');
  const STORE = new ForumGameStore();
  await STORE.init();
  log.debug('Settings loaded');

  function askForApiKey() {
    log.debug('Querying for API key');
    const input = window.prompt(`Please input your GGn API key.
If you don't have one, please generate one from your Edit Profile page: https://gazellegames.net/user.php?action=edit.
The API key must have "Forums" permission

Please disable this userscript until you have one as this prompt will continue to show until you enter one in.`);
    const trimmed = input.trim();

    if (/[a-f0-9]{64}/.test(trimmed)) {
      log.debug('API key is valid length, storing');
      STORE.apiKey = trimmed;
      return STORE.apiKey;
    } else {
      Logger.getLogger('critical').error('API key entered is not valid. It must be 64 hex characters 0-9a-f.');
      throw 'No API key found.';
    }
  }

  const API = new GazelleApi(STORE.apiKey || askForApiKey());

  if (ForumThread.isForumGame) {
    new ForumThread(API, STORE, Number(new URLSearchParams(window.location.search).get('threadid'))).init();
  } else {
    const STYLE = StyleFactory.build();
    new Forum(API, STORE, STYLE);
  }
})();
