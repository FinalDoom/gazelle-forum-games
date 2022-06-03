# About

This is a Greasemonkey (Tampermonkey/Violentmonkey/Firemonkey) userscript for tracking and displaying whether you are able to participate in a forum game on GGn.

Install URL: https://github.com/FinalDoom/gazelle-forum-games/releases/latest/download/eligibility-checker.user.js

# Styleshets and customization

The eligibility display currently supports the following stylesheets:

- Game Room  
  ![Styling on Game Room](/screenshots/game_room.jpg?raw=true 'Styling on Game Room')
- Other (including external)  
  ![Default styling on Elephantish](</screenshots/default(elephantish).jpg?raw=true> 'Default styling on Elephantish')

If you use another stylesheet and want to see specific support, open an issue, message me, or see the section below on doing it yourself.

## Adding support for a new stylesheet

It's fairly simple to add styling for an unsupported GGn stylesheet. In the styles folder, copy game-room.scss and game-room.ts, then modify to fit your style. Add an import for your new .ts file into all-styles.ts and it should load automatically.

See the comments in game-room.ts and all-styles.ts for more information on specifics, as well as JSDocs.
