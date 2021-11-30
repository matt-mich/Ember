set_height_width()
var config = {
    type:Phaser.AUTO,
    width:g_width,
    height:g_height,
    // scale: {
    //     mode: Phaser.Scale.FIT,
    //     parent: 'phaser-example',
    //     width: w,
    //     height: h
    // },
    backgroundColor: 'black',
    scene: [gameworld]
};

var game = new Phaser.Game(config)

