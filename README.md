# Ember and the Ashlands

(Note that this is a school project in researching asymmetrical game design.)

https://matt-mich.github.io/Ember/

## Installation 

Clone this repository somewhere on your computer, and run the 'game_server.py' script, and you're good to go! To see the HTML version, check out the Login section!

To run the UE4 version, just open the 'UE4_Game\Ember_Final.uproject' file in Unreal Engine 4.27 (Be sure to check the VaRest requirement below).

## Login
(Note: This will only work if you have the server running)

Navigating to http://localhost:5000 will result in a login page where you can log into, or make your own world.

http://localhost:5000/game will lead you to the default world (World Name: b, Password: b) which the UE4 version also defaults to.

To login to a specific world in the UE4 version, pressing L will open the login screen.

## Gameplay:

ON HTML:
(Note: The game works best with a vertical aspect ratio, or full screen. Resizing only sort of works horizontally, but vertical is broken.)
Click on the arrows on the bottom of the page to scroll side to side. Click on the 'Tasks' button to complete a task to gain resources. Click on the shadow plots to build something with those resources! Click on Ember to talk to him!

ON UE4:
Same concept, but all you have to do is walk up to a plot or to Ember!

## REQUIREMENT TO RUN UE4 GAME (VaRest):
The VaRest plugin for UE4 is integral to the entire system as it allows for communication between the Flask server and both versions of the game. It must be installed into the Engine after being downloaded from the Unreal Marketplace. If the game still isn’t working, make sure the Flask Server is running and there’s console output when the game is being played. If there’s still no output, make sure VaRest is enabled in the project plugins. (The UE4 version of the game will be posted on the GitHub sometime next week)

## Credit
Credit to Phaser 3 for some of the assets and the core engine:
https://phaser.io/phaser3


