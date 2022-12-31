import {monitor, triggerUpdate, unmonitor} from './ipc';
import log, {Logger} from './log';
import Store from './store';

/**
 * Handles checking individual forum thread details and updating state if possible.
 */
export default class ForumThread {
  #log: Logger;
  #store: Store;
  #threadId: number;

  constructor(store: Store, threadId: number) {
    this.#log = log.getLogger('Forum Thread');
    this.#store = store;
    this.#threadId = threadId;
  }

  /**
   * Checks if the current thread is a forum game thread.
   *
   * @returns true if the current thread is a forum game.
   */
  static get isForumGame() {
    if (
      window.location.pathname === '/forums.php' &&
      new URLSearchParams(window.location.search).get('action') === 'viewthread'
    ) {
      const linkBox = document.querySelector('#content .linkbox_top');
      let prev = linkBox.previousElementSibling;
      while (prev && prev.tagName !== 'H2') {
        prev = prev.previousElementSibling;
      }
      return Array.from(prev.querySelectorAll('a')).some((el) => el.textContent.includes('Forum Games'));
    }

    return false;
  }

  async #isMonitored() {
    return await this.#store.isGameMonitored(this.#threadId);
  }

  /**
   * Monitors or unmonitors this thread, if it was not already in that state.
   *
   * @param monitoringOn true to turn on monitoring, false to turn it off
   * @returns true if the monitoring state was changed, false if it was not
   */
  async changeMonitoring(monitoringOn) {
    if ((await this.#isMonitored()) === monitoringOn) return true;
    if (monitoringOn) {
      this.#log.debug('Set monitoring on for thread ', this.#threadId);
      unsafeWindow.noty({type: 'success', text: 'Monitoring forum game for post readiness.'});
      this.#store.setGameState(this.#threadId, -1);
      monitor(this.#threadId);
    } else {
      if (window.confirm('You are about to remove monitoring for this forum game. Press OK to confirm.')) {
        this.#log.debug('Turned monitoring off for thread', this.#threadId);
        this.#store.removeMonitoring(this.#threadId);
        unmonitor(this.#threadId);
      } else {
        return false;
      }
    }
    return true;
  }

  async init() {
    // Add link / checkbox to monitor thread
    this.#log.debug('Adding monitoring link to thread');
    const monitorLink = document.createElement('a');
    monitorLink.innerText = (await this.#isMonitored()) ? '[ Unmonitor this game ]' : '[ Monitor this game ]';
    monitorLink.addEventListener('click', async () => {
      await this.changeMonitoring(!(await this.#isMonitored()));
      monitorLink.innerText = (await this.#isMonitored()) ? '[ Unmonitor this game ]' : '[ Monitor this game ]';
    });
    document.querySelector('#subscribe-link').after(monitorLink);

    // Trigger state update if monitored
    this.#log.debug('Trigger update?', await this.#isMonitored());
    if (await this.#isMonitored()) {
      triggerUpdate(this.#threadId);
    }

    if (!document.querySelector('#subbox')) {
      this.#log.info('You cannot post to the current thread.');
    } else {
      // Checkbox and label next to subscribe checkbox to change monitoring on post submission
      this.#log.debug('Adding monitoring checkbox to thread');
      const monitorCheckbox = document.createElement('input');
      monitorCheckbox.type = 'checkbox';
      monitorCheckbox.id = 'monitoring';
      if (await this.#isMonitored()) monitorCheckbox.checked = true;

      const monitorLabel = document.createElement('label');
      monitorLabel.append(monitorCheckbox, 'Monitor game');
      document.querySelector('#subbox').nextElementSibling.after(monitorLabel);

      document.querySelector<HTMLFormElement>('#quickpostform').addEventListener('submit', async () => {
        this.#log.debug('Reply submitted, checking monitoring checkbox');
        return await this.changeMonitoring(monitorCheckbox.checked);
      });
    }
  }
}
