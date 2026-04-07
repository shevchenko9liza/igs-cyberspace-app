import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';

/* ── Встроенная база знаний (факты, а не генерация) ──────────────── */
const INSURANCE_KNOWLEDGE_BASE = `
## БАЗА ЗНАНИЙ — отвечай ТОЛЬКО на основе этих фактов:

### Что такое страхование
Страхование — это способ защититься от больших финансовых потерь. Ты платишь небольшую сумму (страховую премию), а если случается что-то плохое (страховой случай), страховая компания покрывает убыток.

### Ключевые понятия
- **Страховая премия** — сумма, которую ты платишь за страховку (как подписка).
- **Страховой случай** — событие, от которого ты застрахован (разбил телефон, затопили квартиру, украли вещь).
- **Страховая выплата** — деньги, которые тебе заплатит страховая, если случился страховой случай.
- **Франшиза (дедактибл)** — часть убытка, которую ты оплачиваешь сам. Например, при франшизе 20% от убытка в 1000 ты платишь 200, а страховая — 800.
- **Полис** — договор страхования, документ.

### Виды страхования, понятные подростку
- **Страхование имущества** — телефон, ноутбук, велосипед, самокат.
- **Медицинское страхование (ОМС/ДМС)** — покрывает лечение. ОМС есть у всех бесплатно, ДМС — платное, с расширенными услугами.
- **Страхование от несчастных случаев** — травмы на спорте, переломы.
- **Страхование путешественников** — если заболел за границей или потерял багаж.
- **ОСАГО** — обязательное страхование автомобиля (будет актуально, когда получишь права).
- **Страхование ответственности** — если ты случайно причинил ущерб другим (разбил чужое окно мячом).

### Зачем страхование нужно
- Защита от крупных непредвиденных расходов.
- Спокойствие: знаешь, что если что-то случится — не потеряешь всё.
- Некоторые виды страхования обязательны по закону (ОСАГО, ОМС).

### Что НЕ покрывает страхование
- Умышленные действия (сам сломал телефон специально).
- Мошенничество (скам в играх обычно не страхуется).
- События, не указанные в полисе.

### Кредит и долг
- Кредит — это деньги, которые ты берёшь в долг. Их нужно вернуть с процентами.
- Чем дольше не платишь — тем больше растёт долг (штрафы, пени).
- Важно: сначала подумай, нужен ли кредит, и сможешь ли вернуть.

### Риск
- Риск — это вероятность, что произойдёт что-то плохое.
- Чем выше риск — тем дороже страховка (спорткар дороже застраховать, чем велосипед).
- Управление рисками — это когда ты заранее думаешь о возможных проблемах и готовишься к ним.
`;

/* ── Fallback-ответы при отсутствии API ────────────────────────── */
const FALLBACK_RESPONSES: Record<string, string> = {
  'страхов': 'Страхование — это способ защиты от больших финансовых потерь. Ты платишь небольшую сумму (премию), а если происходит страховой случай — компания покрывает убыток. В игре это работает так же: купи страховку на предмет, и если он сломается — заплатишь только 20% от ущерба (франшизу), а не всю сумму.',
  'франшиз': 'Франшиза — это часть ущерба, которую ты платишь сам. В нашей игре франшиза составляет 20%. Если ущерб 1000 монет, ты заплатишь 200, а страховая покроет 800. Это делает страховку дешевле.',
  'кредит': 'Кредит — деньги в долг с процентами. В игре комиссия 15% сразу при получении, и штраф 5% каждые 60 секунд при просрочке. Совет: бери кредит только если уверен, что сможешь быстро заработать и вернуть.',
  'риск': 'Риск — вероятность того, что произойдёт что-то плохое. У каждого предмета в игре свой уровень риска. Чем выше риск — тем важнее страховка. Спорткар рискованнее смартфона, поэтому и страховка на него дороже.',
  'полис': 'Полис — это твой договор со страховой компанией. В нём указано: что застраховано, от каких случаев, сколько ты платишь и сколько получишь при страховом случае.',
  'инцидент': 'Когда происходит инцидент (сломался предмет), у тебя два варианта: оплатить ремонт из своего кармана (всю сумму) или использовать страховку (только 20% — франшизу). Поэтому страховка выгодна при дорогих поломках.',
};

/* ── Проверка off-topic ────────────────────────────────────────── */
const ALLOWED_TOPICS = [
  'страхов', 'полис', 'франшиз', 'кредит', 'долг', 'риск', 'монет', 'деньг',
  'инцидент', 'ремонт', 'банк', 'процент', 'штраф', 'ущерб', 'выплат',
  'осаго', 'каско', 'дмс', 'омс', 'премия', 'взнос', 'защит',
  'застрахов', 'имущество', 'случай', 'покрыт', 'убыт', 'компенсац',
  'финанс', 'бюджет', 'копи', 'сбережен', 'вклад', 'накопл',
  'игр', 'предмет', 'купить', 'продать', 'заработ', 'работ',
  'совет', 'помощь', 'помоги', 'объясни', 'расскажи', 'что такое', 'как работает',
  'привет', 'здравствуй', 'хай', 'спасибо', 'пока',
];

function isOnTopic(message: string): boolean {
  const lower = message.toLowerCase();
  // Короткие сообщения (приветствия и т.д.) — пропускаем
  if (lower.length < 10) return true;
  return ALLOWED_TOPICS.some(topic => lower.includes(topic));
}

function getFallbackResponse(message: string): string {
  const lower = message.toLowerCase();
  for (const [key, response] of Object.entries(FALLBACK_RESPONSES)) {
    if (lower.includes(key)) return response;
  }
  return 'Я помогаю разобраться в страховании и финансах. Спроси меня, например: "Что такое франшиза?", "Зачем нужна страховка?" или "Как работает кредит?" — и я объясню простым языком!';
}

/* ── Rate limiting (in-memory) ─────────────────────────────────── */
const requestCounts = new Map<string, number[]>();
const RATE_LIMIT = 15; // requests per minute
const RATE_WINDOW = 60_000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = requestCounts.get(ip) || [];
  const recent = timestamps.filter(t => now - t < RATE_WINDOW);
  requestCounts.set(ip, recent);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  return false;
}

/* ── API Route ─────────────────────────────────────────────────── */
export async function POST(req: Request) {
  // Rate limit
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'Слишком много сообщений. Подожди минуту.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { messages, gameState } = await req.json();

  // Получаем последнее сообщение пользователя
  const lastUserMessage = messages.filter((m: { role: string }) => m.role === 'user').pop()?.content || '';

  // Проверка off-topic
  if (!isOnTopic(lastUserMessage)) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const text = 'Я — Ментор по страхованию и финансам. К сожалению, на этот вопрос я ответить не смогу. Зато могу рассказать про страхование, риски, кредиты и как управлять деньгами. Спрашивай!';
        // Формат Vercel AI SDK data stream
        controller.enqueue(encoder.encode(`0:"${text.replace(/"/g, '\\"')}"\n`));
        controller.close();
      }
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  // Если нет API-ключа — fallback
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_key') {
    const fallback = getFallbackResponse(lastUserMessage);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`0:"${fallback.replace(/"/g, '\\"')}"\n`));
        controller.close();
      }
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  const inventoryDesc = (gameState.inventory || [])
    .map((i: { id: string; isInsured: boolean; isBroken: boolean }) => {
      const status = i.isBroken ? '(сломан)' : i.isInsured ? '(застрахован)' : '(без страховки)';
      return `${i.id} ${status}`;
    }).join(', ') || 'пусто';

  const incidentDesc = gameState.activeIncident
    ? `АКТИВНЫЙ ИНЦИДЕНТ: "${gameState.activeIncident.title}", ущерб ${gameState.activeIncident.damage} монет, ${gameState.activeIncident.insurable ? 'страхуемый' : 'НЕ страхуемый'}.`
    : 'Инцидентов нет.';

  const systemPrompt = `Ты — Красная Собака, дружелюбный ИИ-Ментор по страхованию и финансам для подростков.

## СТРОГИЕ ПРАВИЛА:
1. Отвечай ТОЛЬКО на вопросы о страховании, финансах, рисках и игровой механике.
2. На любые другие темы вежливо отказывай: "Я специалист по страхованию, давай поговорим о нём!"
3. Используй ТОЛЬКО факты из базы знаний ниже. НЕ придумывай цифры, законы или компании.
4. Говори простым языком, понятным 14-летнему подростку.
5. Максимум 3-4 предложения в ответе. Будь лаконичен.
6. Используй примеры из реальной жизни подростка: телефон, велосипед, самокат, путешествия, спорт.
7. Если не знаешь ответа — скажи честно, а не выдумывай.

${INSURANCE_KNOWLEDGE_BASE}

## СОСТОЯНИЕ ИГРОКА ПРЯМО СЕЙЧАС:
- Баланс: ${gameState.coins || 0} монет
- Долг: ${gameState.debt || 0} монет
- Инвентарь: ${inventoryDesc}
- ${incidentDesc}

## КАК РЕАГИРОВАТЬ НА СИТУАЦИИ:
- Если у игрока инцидент И есть страховка → посоветуй использовать страховку (заплатит только 20% франшизу).
- Если у игрока инцидент БЕЗ страховки → объясни, что придётся платить полную сумму, и порекомендуй застраховаться в будущем.
- Если у игрока большой долг → предупреди о штрафах и посоветуй сначала заработать и погасить.
- Если инцидент не страхуемый (скам) → объясни, что мошенничество не покрывается страховкой.`;

  try {
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages,
      tools: {
        searchPerplexity: tool({
          description: 'Поиск реальных данных о страховых законах РФ и тарифах.',
          parameters: z.object({ query: z.string().describe('Поисковый запрос о страховании') }),
          execute: async ({ query }) => {
            if (!process.env.PERPLEXITY_API_KEY) {
              return { data: 'Поиск недоступен. Отвечаю на основе базы знаний.' };
            }
            try {
              const res = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: 'sonar-small-online',
                  messages: [{ role: 'user', content: query }]
                })
              });
              const json = await res.json();
              return { data: json.choices?.[0]?.message?.content || 'Нет данных.' };
            } catch {
              return { data: 'Не удалось выполнить поиск. Отвечаю на основе базы знаний.' };
            }
          },
        }),
      },
      maxTokens: 300,
      temperature: 0.3, // Низкая температура = меньше галлюцинаций
    });

    return result.toDataStreamResponse();
  } catch {
    // Если API упало — fallback
    const fallback = getFallbackResponse(lastUserMessage);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`0:"${fallback.replace(/"/g, '\\"')}"\n`));
        controller.close();
      }
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
