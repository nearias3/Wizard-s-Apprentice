import Phaser from "phaser";
import GameHelpers from "../utils/GameHelpers";

class Map2Scene extends Phaser.Scene {
  constructor() {
    super({ key: "Map2Scene" });
    this.isPaused = false;
  }

  preload() {
    this.load.image(
      "placeholderMap2Scene",
      "src/assets/placeholderMap2Scene.png"
    );
    this.load.image(
      "placeholderCharacter",
      "src/assets/placeholderCharacter.png"
    );
    this.load.image("door", "src/assets/door.png");
  }

  create() {
    const mapImage = this.add.image(400, 300, "placeholderMap2Scene");
    mapImage.setDisplaySize(this.cameras.main.width, this.cameras.main.height);

    GameHelpers.createPlayer(this); // Player creation using GameHelpers shared logic

    // Create the door
    this.door = this.add.rectangle(700, 300, 50, 100, 0xff0000).setOrigin(-1.5);
    this.battleZone = this.add
      .zone(500, 300, 100, 100)
      .setOrigin(0)
      .setInteractive();

    this.battleZone.on("pointerdown", () => {
      this.scene.start("BattleScene");
    });

    this.cursors = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    });
    // Set up the pause menu using GameHelpers
    GameHelpers.createPauseMenu(this);

    // Listen for the "Enter" key to toggle pause
    this.input.keyboard.on("keydown-ENTER", () => {
      GameHelpers.togglePauseMenu(this);
    });
  }

  update() {
    GameHelpers.handlePlayerMovement(this, this.cursors, this.player); // Refactored movement logic
    GameHelpers.checkDoorInteraction(this, this.player, this.door, 'Map3Scene');
  }
}

export default Map2Scene;