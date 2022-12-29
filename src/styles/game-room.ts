// Import matching scss so our class assignments will do stuff
import './game-room.scss';
import {BaseStyle, StyleFactory} from './style';

// Register this style in the factory so it'll be used when our condition matches.
StyleFactory.registerStyle(
  () => document.querySelector<HTMLLinkElement>('link[rel="stylesheet"][title]').title === 'game_room',
  () => new GameRoomStyle(),
);

class GameRoomStyle extends BaseStyle {
  constructor() {
    // class name that matches imported .scss
    super('forum-games-checker-game_room__row');
  }

  // Instead of applying title to the thread link span, we apply it to the icon itself for this style
  modifyIcon(icon: HTMLElement, canPost: boolean): void {
    icon.title = `You are ${canPost ? 'eligible' : 'ineligible'} to participate in this forum game.`;
  }

  unmodifyIcon(icon: HTMLElement): void {
    icon.title = '';
  }
}
