import './default.scss';

export interface Style {
  setPostState(threadId: number, canPost: boolean): void;
  styleRow(row: JQuery, stateName: string): void;
}

export class StyleFactory {
  static registeredStyles: Array<[() => boolean, () => Style]> = [
    [() => true, () => new BaseStyle('forum-games-checker-default__row')],
  ];
  static build() {
    return StyleFactory.registeredStyles.find(([testFunction, _]) => testFunction())[1]();
  }

  static registerStyle(testFunction: () => boolean, createFunction: () => Style) {
    this.registeredStyles.unshift([testFunction, createFunction]);
  }
}

export class BaseStyle implements Style {
  #rowClassName;
  constructor(rowClassName) {
    this.#rowClassName = rowClassName;
  }

  modifyIcon(icon: JQuery<HTMLElement>, canPost: boolean) {
    console.log(icon, icon.find('.last_topic'));
    icon
      .next()
      .find('.last_topic')
      .attr('title', `You are ${canPost ? 'eligible' : 'ineligible'} to participate in this forum game.`);
  }

  setPostState(threadId: number, canPost: boolean): void {
    const icon = $(`a[href$='threadid=${threadId}']`).closest('td').prev();

    this.modifyIcon(icon, canPost);

    if (
      !icon.length ||
      // Technically only locked should be excluded, but we don't have sticky logic
      icon.is(
        '.unread_locked_sticky, .read_locked_sticky, ' +
          '.unread_sticky, .read_sticky, ' +
          '.unread_locked, .read_locked',
      )
    ) {
      return;
    }

    const row = icon.closest('tr');
    console.log(threadId, threadId, canPost);
    if (icon.is('.unread')) {
      if (canPost) this.styleRow(row, 'unread-eligible');
      else this.styleRow(row, 'unread-ineligible');
    } else {
      if (canPost) this.styleRow(row, 'read-eligible');
      else this.styleRow(row, 'read-ineligible');
    }
  }

  styleRow(row: JQuery, stateName: string) {
    row.addClass([this.#rowClassName, this.#rowClassName + '--' + stateName]);
  }
}
