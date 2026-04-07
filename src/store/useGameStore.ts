import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
import { SHOP_ITEMS, INCIDENTS, LOCATIONS, LOCATION_UPGRADES } from '@/constants/gameData';
import { TUTORIAL_STEPS } from '@/constants/tutorialSteps';

export interface InventoryItem {
  id: string;
  isInsured: boolean;
  isBroken: boolean;
}

export interface ActiveIncident {
  id: string;
  title: string;
  damage: number;
  insurable: boolean;
  brokenItemId?: string;
  brokenLocationId?: string;
}

interface GameState {
  isOnboarded: boolean;
  coins: number;
  inventory: InventoryItem[];
  unlockedLocations: string[];
  purchasedUpgrades: string[];
  currentLocation: string;
  activeIncident: ActiveIncident | null;
  lastEarnEvent: { itemId: string; amount: number; ts: number } | null;
  debt: number;
  creditLimit: number;
  creditDueDate: number;
  lastIncidentId: string | null;
  lastIncidentTime: number;
  lastRepairEvent: { itemId: string; ts: number } | null;

  // Tutorial state
  tutorialActive: boolean;
  tutorialStep: number;
  tutorialWorkCount: number;
  tutorialCompleted: boolean;

  // Quiz state
  quizCompleted: boolean;
  quizScore: number;
  showQuizModal: boolean;

  completeOnboarding: () => void;
  incrementCoins: (amount: number) => void;
  buyLocation: (locId: string) => void;
  changeLocation: (locId: string) => void;
  buyUpgrade: (upgradeId: string) => void;
  buyItem: (itemId: string) => void;
  buyInsurance: (itemId: string) => void;
  workOnItem: (itemId: string) => void;
  repairItem: (itemId: string, method: 'pocket' | 'insurance') => void;
  takeCredit: (amount: number) => void;
  repayCredit: (amount: number) => void;
  bankLogicTick: () => void;

  // Tutorial actions
  startTutorial: () => void;
  advanceTutorial: () => void;
  skipTutorial: () => void;

  // Quiz actions
  openQuiz: () => void;
  closeQuiz: () => void;
  completeQuiz: (score: number) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    subscribeWithSelector((set, get) => ({
    isOnboarded: false,
    coins: 0,
    inventory: [],
    unlockedLocations: ['room'],
    purchasedUpgrades: [],
    currentLocation: 'room',
    activeIncident: null,
    lastEarnEvent: null,
    debt: 0,
    creditLimit: 5000,
    creditDueDate: 0,
    lastIncidentId: null,
    lastIncidentTime: 0,
    lastRepairEvent: null,

    // Tutorial
    tutorialActive: false,
    tutorialStep: 0,
    tutorialWorkCount: 0,
    tutorialCompleted: false,

    // Quiz
    quizCompleted: false,
    quizScore: 0,
    showQuizModal: false,

    completeOnboarding: () =>
      set({
        isOnboarded: true,
        inventory: [{ id: 'smartphone', isInsured: false, isBroken: false }],
        unlockedLocations: ['room'],
        purchasedUpgrades: [],
        currentLocation: 'room',
      }),

    incrementCoins: (amount) =>
      set((state) => ({ coins: state.coins + amount })),

    buyLocation: (locId) => {
      const loc = LOCATIONS.find((l) => l.id === locId);
      if (!loc) return;
      const { coins, unlockedLocations } = get();
      if (coins < loc.cost) return;
      if (unlockedLocations.includes(locId)) return;
      set({
        coins: coins - loc.cost,
        unlockedLocations: [...unlockedLocations, locId],
        currentLocation: locId,
      });
    },

    buyUpgrade: (upgradeId) => {
      const { coins, purchasedUpgrades } = get();
      if (purchasedUpgrades.includes(upgradeId)) return;
      
      const upgrade = LOCATION_UPGRADES.find((u) => u.id === upgradeId);
      
      if (upgrade && coins >= upgrade.cost) {
        set({
          coins: coins - upgrade.cost,
          purchasedUpgrades: [...purchasedUpgrades, upgradeId]
        });
      }
    },

    changeLocation: (locId) => {
      const { unlockedLocations } = get();
      if (unlockedLocations.includes(locId)) {
        set({ currentLocation: locId });
      }
    },

    buyItem: (itemId) => {
      const shopItem = SHOP_ITEMS.find((i) => i.id === itemId);
      if (!shopItem) return;
      const { coins, inventory } = get();
      if (coins < shopItem.cost) return;
      if (inventory.find((i) => i.id === itemId)) return;
      set({
        coins: coins - shopItem.cost,
        inventory: [...inventory, { id: itemId, isInsured: false, isBroken: false }],
      });
    },

    buyInsurance: (itemId) => {
      const shopItem = SHOP_ITEMS.find((i) => i.id === itemId);
      if (!shopItem) return;
      const { coins, inventory, tutorialActive, tutorialStep } = get();
      if (coins < shopItem.insuranceCost) return;
      set({
        coins: coins - shopItem.insuranceCost,
        inventory: inventory.map((i) =>
          i.id === itemId ? { ...i, isInsured: true } : i
        ),
      });
      // Tutorial: advance if waiting for insurance purchase
      if (tutorialActive && TUTORIAL_STEPS[tutorialStep]?.requiredAction === 'buy_insurance_smartphone' && itemId === 'smartphone') {
        setTimeout(() => get().advanceTutorial(), 500);
      }
    },

    workOnItem: (itemId) => {
      const { inventory, currentLocation, tutorialActive, tutorialStep, tutorialWorkCount } = get();
      const invItem = inventory.find((i) => i.id === itemId);
      if (!invItem || invItem.isBroken) return;

      const shopItem = SHOP_ITEMS.find((i) => i.id === itemId);
      if (!shopItem || shopItem.locationId !== currentLocation) return;

      // Tutorial: считаем клики работы
      if (tutorialActive) {
        const currentTutorialStep = TUTORIAL_STEPS[tutorialStep];
        if (currentTutorialStep?.requiredAction === 'work_3_times') {
          const newCount = tutorialWorkCount + 1;
          set({ tutorialWorkCount: newCount });
          if (newCount >= 3) {
            // Автоматически переходим к следующему шагу
            setTimeout(() => get().advanceTutorial(), 300);
          }
        }
      }

      // Tutorial: на шаге 'trigger_incident' форсируем инцидент
      const isTutorialIncidentStep = tutorialActive && TUTORIAL_STEPS[tutorialStep]?.requiredAction === 'experience_incident';
      const roll = isTutorialIncidentStep ? 1.0 : Math.random(); // Force incident during tutorial

      if (roll > shopItem.riskChance) {
        set((state) => ({
          coins: state.coins + shopItem.income,
          lastEarnEvent: { itemId, amount: shopItem.income, ts: Date.now() },
        }));
      } else {
        // Tutorial: обходим cooldown
        if (!isTutorialIncidentStep && Date.now() - get().lastIncidentTime < 60000) return;

        const possibleIncidents = INCIDENTS.filter(i =>
          ((i.requiredItemId === itemId) || (i.requiredLocationId === currentLocation)) &&
          i.id !== get().lastIncidentId
        );
        // During tutorial, prefer insurable incidents
        let incident = null;
        if (isTutorialIncidentStep) {
          incident = possibleIncidents.find(i => i.insurable) || possibleIncidents[0];
        } else if (possibleIncidents.length > 0) {
          incident = possibleIncidents[Math.floor(Math.random() * possibleIncidents.length)];
        } else {
          incident = INCIDENTS.find(i => i.requiredItemId === itemId);
        }

        set((state) => ({
          inventory: state.inventory.filter((i) => i.id !== itemId),
          activeIncident: incident ? { ...incident, brokenItemId: itemId } : null,
          lastIncidentId: incident ? incident.id : state.lastIncidentId,
          lastIncidentTime: incident ? Date.now() : state.lastIncidentTime
        }));
      }
    },

    repairItem: (itemId, method) => {
      const { activeIncident, coins, debt, inventory } = get();
      
      const invItem = inventory.find((i) => i.id === itemId);
      let newCoins = coins;
      let newDebt = debt;
      let newCreditDueDate = get().creditDueDate;
      let burnedInsurance = false;
      
      if (method === 'pocket' && activeIncident) {
        if (coins >= activeIncident.damage) {
          newCoins -= activeIncident.damage;
        } else {
          newDebt += activeIncident.damage;
          if (debt === 0) newCreditDueDate = Date.now() + 60000;
        }
      } else if (method === 'insurance' && activeIncident && invItem?.isInsured) {
        // 20% franchise
        const franchiseAmount = Math.floor(activeIncident.damage * 0.2);
        if (coins >= franchiseAmount) {
          newCoins -= franchiseAmount;
        } else {
          newDebt += franchiseAmount;
          if (debt === 0) newCreditDueDate = Date.now() + 60000;
        }
        burnedInsurance = true;
      }

      set((state) => ({
        inventory: state.inventory.map((i) => {
          if (i.id === itemId) {
            return { ...i, isBroken: false, isInsured: burnedInsurance ? false : i.isInsured };
          }
          return i;
        }),
        coins: newCoins,
        debt: newDebt,
        creditDueDate: newCreditDueDate,
        activeIncident: null,
        lastRepairEvent: method === 'insurance' ? { itemId, ts: Date.now() } : null
      }));
      // Tutorial: advance after resolving incident
      const { tutorialActive, tutorialStep: tStep } = get();
      if (tutorialActive && TUTORIAL_STEPS[tStep]?.requiredAction === 'resolve_incident') {
        setTimeout(() => get().advanceTutorial(), 800);
      }
    },

    takeCredit: (amount) => {
       const { debt, creditLimit } = get();
       if (debt + amount > creditLimit) return;
       set((state) => ({ 
          coins: state.coins + amount, 
          debt: state.debt + Math.floor(amount * 1.15),
          creditDueDate: state.debt === 0 ? Date.now() + 60000 : state.creditDueDate
       }));
    },

    repayCredit: (amount) => {
       const { coins, debt } = get();
       if (coins < amount) return;
       const actualRepayment = Math.min(amount, debt);
       const newDebt = Math.max(0, debt - actualRepayment);
       set({ 
          coins: coins - actualRepayment, 
          debt: newDebt,
          creditDueDate: newDebt <= 0 ? 0 : get().creditDueDate
       });
    },
    
    // ── Tutorial actions ─────────────────────────────
    startTutorial: () => set({ tutorialActive: true, tutorialStep: 0, tutorialWorkCount: 0 }),

    advanceTutorial: () => {
      const { tutorialStep } = get();
      const nextStep = tutorialStep + 1;
      if (nextStep >= TUTORIAL_STEPS.length) {
        set({ tutorialActive: false, tutorialCompleted: true, tutorialStep: 0 });
      } else {
        set({ tutorialStep: nextStep, tutorialWorkCount: 0 });
      }
    },

    skipTutorial: () => set({ tutorialActive: false, tutorialStep: 0 }),

    // ── Quiz actions ──────────────────────────────────
    openQuiz: () => set({ showQuizModal: true }),
    closeQuiz: () => set({ showQuizModal: false }),
    completeQuiz: (score) => set({ quizCompleted: true, quizScore: score, showQuizModal: false }),

    bankLogicTick: () => {
       const { debt, creditDueDate, inventory, coins } = get();
       const stateUpdates: Partial<GameState> = {};
       
       if (debt > 0 && Date.now() > creditDueDate) {
          stateUpdates.debt = Math.floor(debt * 1.05); // 5% penalty
          stateUpdates.creditDueDate = Date.now() + 15000; // Reset deadline
       }

       let passiveIncome = 0;
       inventory.forEach(invItem => {
         if (!invItem.isBroken) {
           const shopDef = SHOP_ITEMS.find((s) => s.id === invItem.id);
           if (shopDef && 'isPassive' in shopDef && shopDef.isPassive) {
             passiveIncome += shopDef.income;
           }
         }
       });

       if (passiveIncome > 0) {
          stateUpdates.coins = (stateUpdates.coins ?? coins) + passiveIncome;
       }

       if (Object.keys(stateUpdates).length > 0) {
          set(stateUpdates);
       }
    }
  })),
  {
    name: 'cyberspace-storage-v2', // name of the item in the storage (must be unique)
  }
  )
);
