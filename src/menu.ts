import Log, {LogLevel} from './log';

/**
 * Handles adding greasemonkey menu items.
 */
export default class Menu {
  constructor(log: Log) {
    this.buildLogMenuItems(log);
  }

  /**
   * Add menu items to set logging level.
   * @param log Log to set the level on.
   */
  async buildLogMenuItems(log: Log) {
    //GM.registerMenuCommand('Set Log Level to Timing', () => log.setLevel(LogLevel.Timing), 'T');
    GM.registerMenuCommand('Set Log Level to Debug', () => log.setLevel(LogLevel.Debug), 'D');
    GM.registerMenuCommand('Set Log Level to Warning', () => log.setLevel(LogLevel.Warning), 'W');
    GM.registerMenuCommand('Set Log Level to Log', () => log.setLevel(LogLevel.Log), 'L');
    GM.registerMenuCommand('Set Log Level to Error', () => log.setLevel(LogLevel.Error), 'E');
    GM.registerMenuCommand('Turn off logging', () => log.setLevel(LogLevel.None), 'o');
  }
}
