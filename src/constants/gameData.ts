export const LOCATIONS = [
  { id: 'room', name: 'Стартовая комната', cost: 0, bg: '/bg_room.png' },
  { id: 'apartment', name: 'Квартира', cost: 5000, bg: '/bg_apartment.png' },
  { id: 'house', name: 'Частный дом', cost: 12000, bg: '/bg_house.png' }
];

export const SHOP_ITEMS = [
  { id: 'smartphone', locationId: 'room', name: 'Смартфон', cost: 0, insuranceCost: 50, income: 20, riskChance: 0.08, isoCoords: { x: 300, y: 500 } },
  { id: 'pc', locationId: 'room', name: 'Игровой ПК', cost: 1000, insuranceCost: 150, income: 100, riskChance: 0.1, isoCoords: { x: 550, y: 350 } },
  { id: 'tv', locationId: 'apartment', name: 'Планшет', cost: 3000, insuranceCost: 300, income: 200, riskChance: 0.08, isoCoords: { x: 480, y: 500 } },
  { id: 'gpu', locationId: 'apartment', name: 'YouTube-канал', cost: 5000, insuranceCost: 500, income: 20, isPassive: true, riskChance: 0.05, isoCoords: { x: 580, y: 520 } },
  { id: 'car', locationId: 'house', name: 'Электросамокат', cost: 8000, insuranceCost: 800, income: 500, riskChance: 0.12, isoCoords: { x: 200, y: 500 } }
];

export const INCIDENTS = [
  { id: 'broken_screen', title: 'Разбитый экран', damage: 300, insurable: true, requiredItemId: 'smartphone' },
  { id: 'water_damage', title: 'Уронил в воду', damage: 500, insurable: true, requiredItemId: 'smartphone' },
  { id: 'stolen_subway', title: 'Украли в метро', damage: 1000, insurable: true, requiredItemId: 'smartphone' },
  { id: 'pc_virus', title: 'Вирус-шифровальщик', damage: 800, insurable: true, requiredItemId: 'pc' },
  { id: 'power_surge', title: 'Сгорел блок питания', damage: 1500, insurable: true, requiredItemId: 'pc' },
  { id: 'scam_csgo', title: 'Скам на скины CS:GO', damage: 2500, insurable: false, requiredItemId: 'pc' },
  { id: 'apartment_flood', title: 'Затопили соседи', damage: 2500, insurable: true, requiredLocationId: 'apartment' },
  { id: 'car_crash', title: 'Авария на самокате', damage: 4000, insurable: true, requiredItemId: 'car' }
];

export const LOCATION_UPGRADES = [
  // Квартира
  // Диван у левой стены — уменьшен, на полу
  { id: 'apt_sofa',    locationId: 'apartment', name: 'Диван',             cost: 1500,  image: '/decor_sofa.png',   scale: 0.13, depth: 3, flipX: true,  isoCoords: { x: 260, y: 480 } },
  // Лампа — маленькая, в центре-левее
  { id: 'apt_lamp',    locationId: 'apartment', name: 'Лампа',             cost: 300,   image: '/item_lamp.png',    scale: 0.09, depth: 5, flipX: false, isoCoords: { x: 370, y: 510 } },
  // ТВ — на задней стене справа, небольшой
  { id: 'apt_tv',      locationId: 'apartment', name: 'Телевизор',         cost: 2000,  image: '/item_tv.png',      scale: 0.11, depth: 2, flipX: false, isoCoords: { x: 560, y: 340 } },
  // Кухня у правой задней стены
  { id: 'apt_kitchen', locationId: 'apartment', name: 'Кухня',             cost: 4000,  image: '/item_kitchen.png', scale: 0.13, depth: 2, flipX: false, isoCoords: { x: 640, y: 390 } },
  // Холодильник у правой стены
  { id: 'apt_fridge',  locationId: 'apartment', name: 'Холодильник',       cost: 1800,  image: '/item_fridge.png',  scale: 0.10, depth: 3, flipX: false, isoCoords: { x: 700, y: 440 } },
  // Стиралка у правой стены ниже холодильника
  { id: 'apt_washer',  locationId: 'apartment', name: 'Стиралка',          cost: 1200,  image: '/item_washer.png',  scale: 0.10, depth: 3, flipX: false, isoCoords: { x: 640, y: 490 } },
  // Дом: машина в левом углу, отражена
  { id: 'house_car',   locationId: 'house',     name: 'Электросамокат',    cost: 8000,  image: '/decor_car.png',    scale: 0.18, depth: 1, flipX: true,  isoCoords: { x: 200, y: 520 } },
  { id: 'house_pool',  locationId: 'house',     name: 'Джакузи',           cost: 8000,  image: '/decor_pool.png',   scale: 0.15, depth: 1, flipX: false, isoCoords: { x: 550, y: 520 } }
];

