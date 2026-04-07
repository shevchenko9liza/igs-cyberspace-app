import * as Phaser from 'phaser';
import { useGameStore, InventoryItem } from '@/store/useGameStore';
import { SHOP_ITEMS, LOCATIONS, LOCATION_UPGRADES } from '@/constants/gameData';

interface ItemObject {
  container: Phaser.GameObjects.Container;
  itemImage: Phaser.GameObjects.Image;
  emitter: Phaser.GameObjects.Particles.ParticleEmitter | null;
}

export class MainScene extends Phaser.Scene {
  private dog!: Phaser.GameObjects.Image;
  private bgImage!: Phaser.GameObjects.Image;
  private itemObjects: Map<string, ItemObject> = new Map();
  private upgradeObjects: Map<string, Phaser.GameObjects.Image> = new Map();
  
  private unsubInventory?: () => void;
  private unsubEarnEvent?: () => void;
  private unsubLocation?: () => void;
  private unsubRepairEvent?: () => void;
  private unsubUpgrades?: () => void;

  constructor() {
    super('MainScene');
  }

  preload() {
    this.load.image('dog', '/dog.png');
    this.load.image('item_smartphone', '/item_smartphone.png');
    this.load.image('item_pc', '/item_pc.png');
    this.load.image('item_tv', '/item_tv.png');
    this.load.image('item_car', '/item_car.png');
    this.load.image('item_gpu', '/item_gpu.png');
    // Preload location backgrounds
    for (const loc of LOCATIONS) {
      this.load.image(`bg_${loc.id}`, loc.bg);
    }
    // Preload location upgrades
    for (const upg of LOCATION_UPGRADES) {
      if (upg.image) this.load.image(`upg_${upg.id}`, upg.image);
    }
  }

  create() {
    const { width, height } = this.scale;

    // ── Background ────────────────────────────────────────────────────────
    const initialLocationId = useGameStore.getState().currentLocation || 'room';
    this.bgImage = this.add.image(width / 2, height / 2, `bg_${initialLocationId}`)
      .setDisplaySize(width, height)
      .setDepth(-10);

    // ── Pre-generated textures ─────────────────────────────────────────────
    this.generateSmokeTex();

    // ── Dog ───────────────────────────────────────────────────────────────
    this.dog = this.add.image(150, height * 0.92, 'dog')
      .setDisplaySize(80, 80)
      .setOrigin(0.5, 1)
      .setDepth(10);

    const baseScaleY = this.dog.scaleY;
    this.tweens.add({
      targets: this.dog,
      scaleY: baseScaleY * 0.92,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ── State subscriptions ───────────────────────────────────────────────
    this.unsubLocation = useGameStore.subscribe(
      (s) => s.currentLocation,
      (locId) => this.switchRoom(locId)
    );

    this.unsubInventory = useGameStore.subscribe(
      (s) => s.inventory,
      (inv) => this.syncInventory(inv)
    );

    this.unsubEarnEvent = useGameStore.subscribe(
      (s) => s.lastEarnEvent,
      (evt) => { if (evt) this.showEarnVFX(evt.itemId, evt.amount); }
    );

    this.unsubRepairEvent = useGameStore.subscribe(
      (s) => s.lastRepairEvent,
      (evt) => { if (evt) this.showRepairVFX(evt.itemId); }
    );

    this.unsubUpgrades = useGameStore.subscribe(
      (s) => s.purchasedUpgrades,
      (upgrades) => this.syncUpgrades(upgrades)
    );

    // Initial render
    this.syncInventory(useGameStore.getState().inventory);
    this.syncUpgrades(useGameStore.getState().purchasedUpgrades);
  }

  private generateSmokeTex() {
    const g = this.add.graphics().setVisible(false);
    g.fillStyle(0xaaaaaa, 0.8);
    g.fillCircle(6, 6, 6);
    g.generateTexture('smoke', 12, 12);
    g.destroy();
  }


  private switchRoom(locId: string) {
    // Crossfade background
    const newBg = this.add.image(this.scale.width / 2, this.scale.height / 2, `bg_${locId}`)
      .setDisplaySize(this.scale.width, this.scale.height)
      .setDepth(-11)
      .setAlpha(0);

    this.tweens.add({
      targets: newBg,
      alpha: 1,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        this.bgImage.setTexture(`bg_${locId}`);
        newBg.destroy();
      }
    });

    // Destroy all current visible items
    for (const [, obj] of this.itemObjects.entries()) {
      obj.emitter?.destroy();
      obj.container.destroy();
    }
    this.itemObjects.clear();
    
    for (const [, img] of this.upgradeObjects.entries()) {
      img.destroy();
    }
    this.upgradeObjects.clear();

    // Re-sync items for the *new* room
    this.syncInventory(useGameStore.getState().inventory);
    this.syncUpgrades(useGameStore.getState().purchasedUpgrades);
  }

  private syncInventory(inventory: InventoryItem[]) {
    const activeLocId = useGameStore.getState().currentLocation;
    
    // Find all items that should be rendered in the current room
    const relevantItems = inventory.filter(invItem => {
      const shopDef = SHOP_ITEMS.find((s) => s.id === invItem.id);
      return shopDef?.locationId === activeLocId;
    });

    // Remove stale items from the physical scene (if they were insured/fixed/deleted)
    for (const [id, obj] of Array.from(this.itemObjects.entries())) {
      if (!relevantItems.find((i) => i.id === id)) {
        obj.emitter?.destroy();
        obj.container.destroy();
        this.itemObjects.delete(id);
      }
    }

    // Add / update relevant items
    for (const invItem of relevantItems) {
      if (!this.itemObjects.has(invItem.id)) {
        const shopDef = SHOP_ITEMS.find((s) => s.id === invItem.id);
        if (shopDef) this.spawnItem(invItem.id, shopDef.isoCoords.x, shopDef.isoCoords.y);
      }
      this.setBrokenState(invItem.id, invItem.isBroken);
    }
  }

  private syncUpgrades(purchasedUpgrades: string[]) {
    const activeLocId = useGameStore.getState().currentLocation;
    
    // Find relevant upgrades for this location that have been purchased
    const activeUpgrades = purchasedUpgrades.filter(id => {
      const def = LOCATION_UPGRADES.find(u => u.id === id);
      return def?.locationId === activeLocId;
    });

    // Remove stale upgrades
    for (const [id, img] of Array.from(this.upgradeObjects.entries())) {
      if (!activeUpgrades.includes(id)) {
        img.destroy();
        this.upgradeObjects.delete(id);
      }
    }

    // Spawn new ones
    for (const id of activeUpgrades) {
      if (!this.upgradeObjects.has(id)) {
        const def = LOCATION_UPGRADES.find(u => u.id === id);
        if (def) {
          const img = this.add.image(def.isoCoords.x, def.isoCoords.y, `upg_${def.id}`)
            .setOrigin(0.5, 1)
            .setScale(def.scale || 1)
            .setDepth(def.depth || 1)
            .setFlipX(!!((def as Record<string, unknown>).flipX));
          
          img.setAlpha(0);
          this.tweens.add({ targets: img, alpha: 1, duration: 1500, ease: 'Power1' });
          this.upgradeObjects.set(id, img);
        }
      }
    }
  }

  private spawnItem(id: string, x: number, y: number) {
    const shopDef = SHOP_ITEMS.find((s) => s.id === id);
    if (!shopDef) return;

    const itemImage = this.add.image(0, 0, `item_${id}`)
      .setOrigin(0.5, 1)
      .setDisplaySize(110, 110);

    const nameText = this.add.text(0, -110, shopDef.name, {
      fontSize: '14px', color: '#ffffff', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 1);

    const container = this.add.container(x, y, [itemImage, nameText]);
    container.setDepth(5).setAlpha(0);

    this.itemObjects.set(id, { container, itemImage, emitter: null });

    this.tweens.add({ targets: container, y, alpha: 1, duration: 700, ease: 'Bounce.easeOut' });
  }

  private setBrokenState(id: string, broken: boolean) {
    const obj = this.itemObjects.get(id);
    if (!obj) return;
    const shopDef = SHOP_ITEMS.find((s) => s.id === id);

    if (broken) {
      obj.itemImage.setTint(0x555555);
      if (!obj.emitter && shopDef) {
        const emitter = this.add.particles(shopDef.isoCoords.x, shopDef.isoCoords.y - 60, 'smoke', {
          speed: { min: 8, max: 28 }, angle: { min: 258, max: 282 },
          scale: { start: 0.9, end: 0 }, alpha: { start: 0.55, end: 0 },
          lifespan: 2200, frequency: 280, quantity: 1, gravityY: -18,
        });
        emitter.setDepth(6);
        this.itemObjects.set(id, { ...obj, emitter });
      }
    } else {
      obj.itemImage.clearTint();
      if (obj.emitter) {
        obj.emitter.destroy();
        this.itemObjects.set(id, { ...obj, emitter: null });
      }
    }
  }

  private showEarnVFX(itemId: string, amount: number) {
    const shopDef = SHOP_ITEMS.find((s) => s.id === itemId);
    const obj = this.itemObjects.get(itemId);
    if (!obj || !shopDef) return; // Only show VFX if the item is currently on screen!

    const x = obj.container.x;
    const y = obj.container.y - 30;

    const txt = this.add.text(x, y, `+${amount} 🪙`, {
      fontSize: '22px', color: '#facc15', stroke: '#000000', strokeThickness: 3, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: txt, y: y - 70, alpha: 0, duration: 1100, ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  private showRepairVFX(itemId: string) {
    const obj = this.itemObjects.get(itemId);
    if (!obj) return;
    
    // Green flash
    obj.itemImage.setTintFill(0x00ff00);
    this.tweens.add({
       targets: obj.itemImage,
       alpha: 1, // dummy property to use tween duration
       duration: 400,
       yoyo: true, // effectively flashes it
       onComplete: () => obj.itemImage.clearTint()
    });
  }

  shutdown() {
    this.unsubInventory?.();
    this.unsubEarnEvent?.();
    this.unsubLocation?.();
    this.unsubRepairEvent?.();
    this.unsubUpgrades?.();
  }
}
