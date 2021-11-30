## Ember Needs Your Help!
<img src="https://raw.githubusercontent.com/matt-mich/Ember/gh-pages/HTML_Screen.PNG" height="400">
<img src="https://raw.githubusercontent.com/matt-mich/Ember/gh-pages/UE4_Screen.PNG" height="400">

Welcome to a destroyed world. It's up to you to put it back together. 

## Why?

The purpose of the game is to have an always available game world for you to modify and interact with. Every way to play is synchronized in real time, and actions are carried over between play styles.

## How does it work?

The game itself works on the principles of asymmetrical game design. This is usually used for competitive games where one team has a different game interface than another, such as Left4Dead wherein one team plays humans and the other zombies. This is an asymmetrical system in terms of weapons and win-states, but they're still seeing the same game. Another example is the VR game *'Keep talking and No One Explodes'* where one player disarms a bomb in VR while the other player instructs them without seeing the game itself. What *Ember and the Ashlands* aims to accomplish is to create an asymmetrical single player experience where the same game can be played in different ways. 

This took a lot of research into how to get it right, but the core premise revolves around a single server that can accept requests to update the game world data status, and requests to read from it. Through frequent check-ins, the game is able to be effectively run on the data dispensing server (Running on Python with Flask), and communicate the current game state to each of the platforms running the game,and can even do it simultaneously!

