# About

This is a Greasemonkey (Tampermonkey/Violentmonkey/Firemonkey) userscript for tracking and displaying whether you are able to participate in a forum game on GGn.

Install URL: https://github.com/FinalDoom/gazelle-forum-games/releases/latest/download/gazelle-forum-games-eligibility-checker.user.js

# Requirements

The script will ask for an API key the first time it runs. You can generate these on the edit profile page. The key must have `Forums` permission.

# Usage

1. Install the script in your favorite userscript manager.
2. Visit the forum games forum or a forum thread, and follow the popup prompt instructions to enter your API key.
3. Visit your favorite forum games, and click the `[ Monitor this game ]` link that appears at the top when this script is enabled.
4. Keep the forum games index open in a tab, which will keep game states updated and display eligibility.
   - **Note** that updating eligibility can take a while: 10 seconds per 5 monitored games after the first 5.

## About eligibility updating

Eligibility will be updated any time you post in a game, once the last page has loaded.

When you load the forum games index, the script will first check all monitored games for eligibility.
After the initial check, the script will update the status for any game you are ineligible for, every minute (once current round of checking completes).

The script will display eligibility on the forum games index, including if you have endless scroll enabled via another script.
As eligibility updates, the indicators on the index will update as well.

## Resetting API Key

To reset the API key, you must remove the Greasemonkey storage key `forumgames_apikey`.
Each script manager has a different way to access and modify the script storage that should be available in its documentation, possibly near info for GM_setValue.
When you find where to modify the script storage, just remove the storage line that starts with `forumgames_apikey`.

If that is not immediately obvious how to accomplish, you can also delete the key by adding a line after `use strict;` in the script, so it reads:

```
use strict;
GM.setValue('forumgames_apikey', null);
```

Remember to remove this line after loading a page where this script runs, or it will always forget your API key.

## Resetting game and watch state

Game states are stored in `window.localStorage` in keys starting with `forumGamesState`.

To remove monitoring and state for a single game, the simplest method is to go to that game thread and click the `[ Unmonitor this game ]` link at the top.

To remove monitoring for all games, you can open the developer console (press `f12`), click the `console` tab, paste the following code, and hit enter:

```
Object.keys(window.localStorage).filter((key)=>key.startsWith('forumGamesState')).forEach((key)=>window.localStorage.removeItem(key));
```

# Styleshets and customization

The eligibility display currently supports the following stylesheets:

- Game Room  
  ![Styling on Game Room](/screenshots/game_room.jpg?raw=true 'Styling on Game Room')
- Other (including external)  
  ![Default styling on Elephantish](</screenshots/default(elephantish).jpg?raw=true> 'Default styling on Elephantish')

If you use another stylesheet and want to see specific support, post in the forum games script job thread, message me, or see the section below on doing it yourself.

## Adding support for a new stylesheet

It's fairly simple to add styling for an unsupported GGn stylesheet. In the styles folder, copy game-room.scss and game-room.ts, then modify to fit your style. Add an import for your new .ts file into all-styles.ts and it should load automatically.

See the comments in game-room.ts and all-styles.ts for more information on specifics, as well as JSDocs.

# Troubleshooting

There is not a lot of info for troubleshooting, but there are a few steps you can take aside from posting to the support thread:

- Double check you followed the steps under [Usage](#usage).
- Press F12 to open the developer console. You can see API requests under the networking tab, and logs in the console.
- In your userscript manager menu, there should be menu items for the script to turn on different levels of logging. Turn on Debug or Trace logging.
