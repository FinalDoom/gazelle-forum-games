import './default.scss';

type RowState = 'read-eligible' | 'read-ineligible' | 'unread-eligible' | 'unread-ineligible';

/**
 * Class that handles importing stylesheet and applying it to the forum index to indicate eligibility
 */
export default interface Style {
  /**
   * Method that can be overridden to apply additional styling to the created indicator icon, such as
   * titles or other information.
   *
   * @param icon element that eligibility styling is being applied to
   * @param canPost true if user is eligible to post in this thread, false otherwise.
   */
  modifyIcon(icon: HTMLElement, canPost: boolean): void;
  /**
   * Method that handles assigning participation state to individual rows.
   *
   * @param threadId site ID for the thread to be styled. Used in matches to find the correct row.
   * @param canPost true if user is eligible to post in this thread, false otherwise.
   */
  setPostState(threadId: number, canPost: boolean): void;
  /**
   * Method that handles styling individual rows to indicate game participation eligibility.
   *
   * @param row Element that references the current row (<tr>) to style
   * @param stateName text indicating game row state, used to set class/styling from imported scss
   */
  styleRow(row: HTMLTableRowElement, stateName: RowState): void;
}

/**
 * Array of test functions to functions that instantiate a {@link Style}.
 * Use {@link StyleFactory.registerStyle} to alter.
 */
const registeredStyles = [] as Array<[() => boolean, () => Style]>;

/**
 * Used to build a style matching the current forum game index stylesheet.
 */
export const StyleFactory = {
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
  registerStyle: (testFunction: () => boolean, createFunction: () => Style) => {
    registeredStyles.unshift([testFunction, createFunction]);
  },
};

/**
 * Base style that can be overridden for specific stylesheet logic. Has the default implementation of all methods.
 */
export class BaseStyle implements Style {
  #rowClassName;

  /**
   * Instantiation of Style that can be called to style forum index page.
   *
   * @param rowClassName base class identifier used in matching .scss file. Must be unique on the site and other style types. Suggested format follows BEM, such as 'forum-games-checker-STYLE_NAME__row'
   */
  constructor(rowClassName) {
    this.#rowClassName = rowClassName;
  }

  modifyIcon(icon: HTMLElement, canPost: boolean) {
    icon.nextElementSibling.querySelector<HTMLSpanElement>('.last_topic').title = `You are ${
      canPost ? 'eligible' : 'ineligible'
    } to participate in this forum game.`;
  }

  setPostState(threadId: number, canPost: boolean): void {
    const icon = document.querySelector(`a[href$='threadid=${threadId}']`)?.closest('td')
      ?.previousElementSibling as HTMLElement;

    if (
      !icon ||
      // Technically only locked should be excluded, but we don't have sticky logic
      [
        'unread_locked_sticky',
        'read_locked_sticky',
        'unread_sticky',
        'read_sticky',
        'unread_locked',
        'read_locked',
      ].some((className) => icon.classList.contains(className))
    ) {
      return;
    }

    this.modifyIcon(icon, canPost);

    const row = icon.closest('tr');
    if (icon.classList.contains('unread')) {
      if (canPost) this.styleRow(row, 'unread-eligible');
      else this.styleRow(row, 'unread-ineligible');
    } else {
      if (canPost) this.styleRow(row, 'read-eligible');
      else this.styleRow(row, 'read-ineligible');
    }
  }

  styleRow(row: HTMLTableRowElement, stateName: RowState) {
    row.classList.add(this.#rowClassName, this.#rowClassName + '--' + stateName);
  }
}
