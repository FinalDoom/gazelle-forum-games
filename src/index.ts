import './styles/all-styles';
import {GazelleApi} from './api';
import Forum from './forum';
import ForumThread from './forum-thread';
import {ConsoleLog} from './log';
import {ForumGameStore} from './store';
import {StyleFactory} from './styles/style';
import Menu from './menu';

('use strict');

declare global {
  interface Window {
    noty: (options: {type: 'error' | 'warn' | 'success'; text: string}) => void;
  }
}

(async function () {
  const LOG = new ConsoleLog('[GGn Forum Games Helper]');
  const STORE = new ForumGameStore();
  await STORE.init();

  function askForApiKey() {
    const input = window.prompt(`Please input your GGn API key.
If you don't have one, please generate one from your Edit Profile page: https://gazellegames.net/user.php?action=edit.
The API key must have "Forums" permission

Please disable this userscript until you have one as this prompt will continue to show until you enter one in.`);
    const trimmed = input.trim();

    if (/[a-f0-9]{64}/.test(trimmed)) {
      STORE.apiKey = trimmed;
      return STORE.apiKey;
    } else {
      throw 'No API key found.';
    }
  }

  const API = new GazelleApi(LOG, STORE.apiKey || askForApiKey());
  new Menu(LOG);

  if (new URLSearchParams(window.location.search).get('action') === 'viewthread' && ForumThread.isForumGame) {
    new ForumThread(API, LOG, STORE, Number(new URLSearchParams(window.location.search).get('threadid'))).init();
  } else {
    const STYLE = StyleFactory.build();
    new Forum(API, LOG, STORE, STYLE);
  }
})();
