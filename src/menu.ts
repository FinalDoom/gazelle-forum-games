import log from './log';
import Store from './store';

/**
 * Handles adding greasemonkey menu items to set logging level for the script.
 */
export const buildMenu = (store: Store) => {
  GM.registerMenuCommand(
    (store.showCached ? 'Hide' : 'Show') + ' initial cached state',
    () => (store.showCached = !store.showCached),
    'c',
  );
  GM.registerMenuCommand('Set Log Level to Trace', () => log.setLevel('TRACE'), 'T');
  GM.registerMenuCommand('Set Log Level to Debug', () => log.setLevel('DEBUG'), 'D');
  GM.registerMenuCommand('Set Log Level to Warning', () => log.setLevel('WARN'), 'W');
  GM.registerMenuCommand('Set Log Level to Info', () => log.setLevel('INFO'), 'I');
  GM.registerMenuCommand('Set Log Level to Error', () => log.setLevel('ERROR'), 'E');
  GM.registerMenuCommand('Turn off logging', () => log.setLevel('SILENT'), 'o');
};
