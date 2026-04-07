export interface TutorialStep {
  id: string;
  /** Текст, который говорит собака-ментор */
  message: string;
  /** Какой таб подсветить (пульсация) */
  highlightTab?: 'assets' | 'realestate' | 'mentor';
  /** Действие, которое должен совершить игрок для перехода к следующему шагу */
  requiredAction?:
    | 'work_3_times'
    | 'buy_insurance_smartphone'
    | 'experience_incident'
    | 'resolve_incident'
    | 'open_mentor';
  /** Авто-переход через N миллисекунд (для информационных шагов) */
  autoAdvanceMs?: number;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    message: 'Привет! Я Красная Собака — твой ментор по финансам. Сейчас я покажу тебе, как работает страхование. Это проще, чем кажется!',
    autoAdvanceMs: 5000,
  },
  {
    id: 'earn_coins',
    message: 'Для начала — заработай немного монет. Нажми кнопку «Работать» на смартфоне 3 раза.',
    highlightTab: 'assets',
    requiredAction: 'work_3_times',
  },
  {
    id: 'explain_risk',
    message: 'Отлично! Каждый раз, когда ты работаешь, есть РИСК — шанс, что предмет сломается. Смартфон ломается в 8% случаев. Чем дороже вещь — тем больше риск.',
    autoAdvanceMs: 6000,
  },
  {
    id: 'buy_insurance',
    message: 'Теперь купи СТРАХОВКУ на смартфон. Это стоит всего 50 монет, но защитит тебя от больших потерь. Нажми «Застраховать» в табе Активы.',
    highlightTab: 'assets',
    requiredAction: 'buy_insurance_smartphone',
  },
  {
    id: 'explain_franchise',
    message: 'Страховка куплена! Теперь, если смартфон сломается, ты заплатишь только 20% от ущерба (это называется ФРАНШИЗА). Без страховки — пришлось бы платить 100%.',
    autoAdvanceMs: 6000,
  },
  {
    id: 'trigger_incident',
    message: 'Теперь продолжай работать на смартфоне. Рано или поздно произойдёт инцидент — и ты увидишь, как работает страховка!',
    highlightTab: 'assets',
    requiredAction: 'experience_incident',
  },
  {
    id: 'resolve_with_insurance',
    message: 'Инцидент! Видишь разницу? Со страховкой ты платишь только 20% от ущерба. Нажми «Использовать страховку», чтобы починить.',
    requiredAction: 'resolve_incident',
  },
  {
    id: 'tutorial_complete',
    message: 'Ты прошёл обучение! Теперь ты знаешь: страховка — это маленькая плата сейчас, чтобы не потерять много потом. Попробуй пройти квиз или продолжи в свободном режиме!',
    autoAdvanceMs: 7000,
  },
];
