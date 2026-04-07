'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useChat } from 'ai/react';
import { useGameStore } from '@/store/useGameStore';
import { SHOP_ITEMS, LOCATIONS, LOCATION_UPGRADES } from '@/constants/gameData';
import { TUTORIAL_STEPS } from '@/constants/tutorialSteps';
import { QUIZ_QUESTIONS } from '@/constants/quizData';
import { Send, Gamepad2, MessageCircle, Shield, ShieldAlert, Wrench, Zap, Home, GraduationCap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const PhaserGame = dynamic(() => import('@/components/PhaserGame'), { ssr: false });

const S = {
  page: { display: 'flex', flexDirection: 'column' as const, height: '100dvh', overflow: 'hidden', background: '#08080f', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' },
  tabBar: { display: 'flex', borderBottom: '1px solid #1e1e3a', flexShrink: 0 },
  tab: (active: boolean) => ({
    flex: 1, padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    background: active ? '#140d2e' : 'transparent', color: active ? '#a78bfa' : '#475569',
    borderTop: 'none', borderLeft: 'none', borderRight: 'none',
    borderBottom: active ? '2px solid #7c3aed' : '2px solid transparent',
    cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all .2s',
  }),
  tabContent: { flex: 1, overflow: 'hidden', position: 'relative' as const },
  scroll: { height: '100%', overflowY: 'auto' as const, padding: 8 },
  card: (broken: boolean) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', marginBottom: 6, borderRadius: 10,
    background: broken ? 'linear-gradient(135deg,#2d0a0a,#1a0505)' : 'linear-gradient(135deg,#1a0a3e,#130828)',
    border: `1px solid ${broken ? '#ef4444' : '#2d1b69'}`, transition: 'border .3s',
  }),
  btn: (color: string, disabled = false) => ({
    padding: '9px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, minHeight: 36,
    background: disabled ? '#374151' : color, color: 'white', border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
    display: 'flex', alignItems: 'center', gap: 4, boxShadow: disabled ? 'none' : `0 0 10px ${color}66`,
  }),
  badge: (color: string) => ({
    display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
    borderRadius: 8, fontSize: 12, fontWeight: 700, color,
    background: `${color}18`, border: `1px solid ${color}40`,
  }),
  msg: (isUser: boolean) => ({
    maxWidth: '85%', padding: '8px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.5,
    background: isUser ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : '#1a0a3e', color: '#e2e8f0',
    borderBottomRightRadius: isUser ? 4 : 12, borderBottomLeftRadius: isUser ? 12 : 4,
    border: isUser ? 'none' : '1px solid #2d1b69',
  }),
};

export default function GamePage() {
  const {
    isOnboarded, completeOnboarding, coins, inventory, unlockedLocations, purchasedUpgrades, currentLocation, activeIncident,
    debt, creditLimit, creditDueDate, takeCredit, repayCredit, bankLogicTick,
    buyItem, buyInsurance, workOnItem, repairItem, buyLocation, changeLocation, buyUpgrade,
    tutorialActive, tutorialStep, tutorialCompleted, startTutorial, advanceTutorial, skipTutorial,
    showQuizModal, quizCompleted, quizScore, openQuiz, closeQuiz, completeQuiz,
  } = useGameStore();

  const [now, setNow] = useState(Date.now());
  const [creditInput, setCreditInput] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      bankLogicTick();
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [bankLogicTick]);

  const [tab, setTab] = useState<'assets' | 'real_estate' | 'mentor'>('assets');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Quiz local state
  const [quizCurrentQ, setQuizCurrentQ] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizShowResult, setQuizShowResult] = useState(false);

  // Tutorial auto-advance for informational steps
  useEffect(() => {
    if (!tutorialActive) return;
    const step = TUTORIAL_STEPS[tutorialStep];
    if (step?.autoAdvanceMs) {
      const timer = setTimeout(() => advanceTutorial(), step.autoAdvanceMs);
      return () => clearTimeout(timer);
    }
  }, [tutorialActive, tutorialStep, advanceTutorial]);

  // Tutorial: open quiz after completion
  useEffect(() => {
    if (tutorialCompleted && !quizCompleted) {
      const timer = setTimeout(() => openQuiz(), 1000);
      return () => clearTimeout(timer);
    }
  }, [tutorialCompleted, quizCompleted, openQuiz]);

  const handleQuizAnswer = useCallback((answerIdx: number) => {
    setQuizAnswers(prev => ({ ...prev, [quizCurrentQ]: answerIdx }));
    setQuizShowResult(true);
  }, [quizCurrentQ]);

  const handleQuizNext = useCallback(() => {
    setQuizShowResult(false);
    if (quizCurrentQ < QUIZ_QUESTIONS.length - 1) {
      setQuizCurrentQ(prev => prev + 1);
    } else {
      const finalAnswers = { ...quizAnswers };
      const finalScore = Object.values(finalAnswers).filter(
        (aIdx, i) => QUIZ_QUESTIONS[i].correctIndex === aIdx
      ).length;
      completeQuiz(finalScore);
      setQuizCurrentQ(0);
      setQuizAnswers({});
    }
  }, [quizCurrentQ, quizAnswers, completeQuiz]);

  const { messages, input, handleInputChange, handleSubmit, append } = useChat({
    api: '/api/chat',
    body: { gameState: { coins, inventory, unlockedLocations, currentLocation, activeIncident } },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOnboarded) {
    return (
      <div style={{ ...S.page, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dog.png" alt="dog" style={{ width: 120, height: 120, borderRadius: '50%', border: '3px solid #ef4444', marginBottom: 20, display: 'block', margin: '0 auto 20px', objectFit: 'cover' }} />
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#a78bfa', marginBottom: 8 }}>CyberSpace & Mentor</h1>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6, lineHeight: 1.7 }}>
            Интерактивный гайд по страхованию
          </div>
          <div style={{ fontSize: 14, color: '#cbd5e1', marginBottom: 20, lineHeight: 1.7 }}>
            Узнай, как работает страхование, через реальные сценарии. Дарю Смартфон — работай на нём, но <strong style={{ color: '#ef4444' }}>берегись рисков!</strong>
          </div>
          <button onClick={() => { completeOnboarding(); startTutorial(); }} style={{ width: '100%', padding: '14px 0', borderRadius: 12, fontSize: 16, fontWeight: 900, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 0 30px rgba(124,58,237,0.5)', marginBottom: 10 }}>
            <GraduationCap size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
            Начать обучение
          </button>
          <button onClick={completeOnboarding} style={{ width: '100%', padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, background: 'transparent', color: '#64748b', border: '1px solid #2d1b69', cursor: 'pointer' }}>
            Свободная игра →
          </button>
        </div>
      </div>
    );
  }

  // Filter items that belong to the current location
  const currentItems = SHOP_ITEMS.filter(item => item.locationId === currentLocation);

  return (
    <div style={S.page}>
      <div style={{ flexShrink: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 20, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <Dialog>
             <DialogTrigger style={{ ...S.badge('#facc15'), background: 'rgba(250,204,21,0.25)', backdropFilter: 'blur(4px)', cursor: 'pointer', border: '1px solid #facc15' }}>
               🏦 Банк: {coins} 🪙
             </DialogTrigger>
             <DialogContent className="bg-[#0f0a1e] text-white border-[#7c3aed]">
               <DialogHeader>
                 <DialogTitle className="text-xl font-bold text-[#a78bfa]">Кибер-Банк</DialogTitle>
               </DialogHeader>
               <div className="flex flex-col gap-4 mt-2">
                 <div className="text-sm text-gray-300">
                    <div>Свободный лимит: <strong className="text-green-400">{creditLimit - debt} 🪙</strong></div>
                    <div>Текущий долг: <strong className="text-red-400">{debt} 🪙</strong></div>
                    {debt > 0 && <div className="text-red-400 text-xs mt-1">Пеня (5%) через {Math.max(0, Math.floor((creditDueDate - now)/1000))} сек</div>}
                 </div>
                 <input 
                   type="number" 
                   value={creditInput} 
                   onChange={(e) => setCreditInput(e.target.value)}
                   className="bg-[#140d2e] border border-[#2d1b69] text-white p-2 text-sm rounded outline-none w-full"
                   placeholder="Введите сумму..."
                 />
                 <div className="flex gap-2">
                   <button 
                     onClick={() => { takeCredit(Number(creditInput)); setCreditInput(''); }}
                     disabled={!creditInput || Number(creditInput) <= 0}
                     className="flex-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 p-2 rounded font-bold text-sm text-white cursor-pointer"
                   >
                     Взять (+15% комиссия)
                   </button>
                   <button 
                     onClick={() => { repayCredit(Number(creditInput) || debt); setCreditInput(''); }}
                     disabled={debt <= 0}
                     className="flex-1 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 p-2 rounded font-bold text-sm text-white cursor-pointer"
                   >
                     Погасить
                   </button>
                 </div>
               </div>
             </DialogContent>
          </Dialog>
           {debt > 0 && (
             <div style={{ ...S.badge('#ef4444'), background: 'rgba(239,68,68,0.15)', backdropFilter: 'blur(4px)' }}>
               Долг: {debt} 🪙 (Пеня через {Math.max(0, Math.floor((creditDueDate - now)/1000))}с)
             </div>
           )}
        </div>
        <PhaserGame />
      </div>

      {/* ── Tutorial Bubble ── */}
      {tutorialActive && TUTORIAL_STEPS[tutorialStep] && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
          background: 'linear-gradient(135deg, #1a0a3e, #0f0a1e)',
          borderTop: '2px solid #7c3aed', borderBottom: '2px solid #7c3aed',
          flexShrink: 0,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dog.png" alt="mentor" style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #ef4444', objectFit: 'cover', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 }}>{TUTORIAL_STEPS[tutorialStep].message}</div>
            {TUTORIAL_STEPS[tutorialStep].autoAdvanceMs && (
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Продолжение через несколько секунд...</div>
            )}
          </div>
          <button onClick={skipTutorial} style={{ fontSize: 11, color: '#475569', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '4px 8px' }}>Пропустить</button>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0d0820', borderTop: '1px solid #7c3aed', overflow: 'hidden' }}>
        <div style={S.tabBar}>
          <button style={{
            ...S.tab(tab === 'assets'),
            ...(tutorialActive && TUTORIAL_STEPS[tutorialStep]?.highlightTab === 'assets' ? { boxShadow: '0 0 12px #7c3aed', animation: 'pulse 1.5s infinite' } : {}),
          }} onClick={() => setTab('assets')}><Gamepad2 size={14} /> Имущество</button>
          <button style={S.tab(tab === 'real_estate')} onClick={() => setTab('real_estate')}><Home size={14} /> Недвижимость</button>
          <button style={{
            ...S.tab(tab === 'mentor'),
            ...(tutorialActive && TUTORIAL_STEPS[tutorialStep]?.highlightTab === 'mentor' ? { boxShadow: '0 0 12px #7c3aed', animation: 'pulse 1.5s infinite' } : {}),
          }} onClick={() => setTab('mentor')}><MessageCircle size={14} /> Ментор</button>
        </div>

        <div style={S.tabContent}>
          {/* ── Assets Tab ── */}
          {tab === 'assets' && (
            <div style={S.scroll}>
              <div style={{ padding: '4px 8px 12px 8px', fontSize: 12, fontWeight: 800, color: '#34d399', letterSpacing: 1 }}>АКТИВЫ (ПРИНОСЯТ ДОХОД)</div>
              {currentItems.length === 0 && <div style={{textAlign:'center', padding:20, color:'#64748b', fontSize:13}}>Здесь пока нет активов для заработка.</div>}
              {currentItems.map((shopItem) => {
                const invItem = inventory.find((i) => i.id === shopItem.id);
                const owned = !!invItem;
                const broken = invItem?.isBroken ?? false;
                const insured = invItem?.isInsured ?? false;
                const canBuy = !owned && coins >= shopItem.cost;
                const canInsure = owned && !insured && coins >= shopItem.insuranceCost;
                const emojiMap: Record<string, string> = { smartphone: '📱', pc: '💻', tv: '📺', gpu: '🎬', car: '🛴' };

                return (
                  <div key={shopItem.id} style={S.card(broken)}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: broken ? '#fca5a5' : '#e2e8f0' }}>
                        {emojiMap[shopItem.id]} {shopItem.name} {broken && <span style={{ color: '#ef4444', marginLeft: 6, fontSize: 11 }}>🔴 СЛОМАН</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 2 }}>
                        +(shopItem.income) 🪙{('isPassive' in shopItem && shopItem.isPassive) ? '/сек' : ''} · Риск {Math.round(shopItem.riskChance * 100)}%
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                      {!owned && (
                        <button onClick={() => buyItem(shopItem.id)} disabled={!canBuy && shopItem.cost > 0} style={S.btn('linear-gradient(135deg,#2563eb,#1d4ed8)', !canBuy && shopItem.cost > 0)}>
                          <Zap size={12} /> {shopItem.cost > 0 ? `Купить ${shopItem.cost} 🪙` : 'Забрать'}
                        </button>
                      )}
                      {owned && !broken && !('isPassive' in shopItem && shopItem.isPassive) && (
                        <button onClick={() => workOnItem(shopItem.id)} style={S.btn('linear-gradient(135deg,#059669,#047857)')}>
                          <Zap size={12} /> Работать +{shopItem.income}
                        </button>
                      )}
                      {owned && !broken && ('isPassive' in shopItem && shopItem.isPassive) && (
                        <div style={S.badge('#10b981')}>Запущено (+{shopItem.income}/с)</div>
                      )}
                      {owned && broken && (
                        <button disabled style={S.btn('#ef4444', true)}>
                          <Wrench size={12} /> Сломан
                        </button>
                      )}
                      {owned && !insured && (
                        <button onClick={() => buyInsurance(shopItem.id)} disabled={!canInsure} style={S.btn('linear-gradient(135deg,#7c3aed,#5b21b6)', !canInsure)}>
                          <ShieldAlert size={12} /> Страховка {shopItem.insuranceCost} 🪙
                        </button>
                      )}
                      {owned && insured && <div style={S.badge('#34d399')}><Shield size={12} /> Застраховано</div>}
                    </div>
                  </div>
                );
              })}

              <div style={{ padding: '24px 8px 12px 8px', fontSize: 12, fontWeight: 800, color: '#a78bfa', letterSpacing: 1 }}>ПАССИВЫ (ПРЕДМЕТЫ РОСКОШИ)</div>
              {LOCATION_UPGRADES.filter(u => u.locationId === currentLocation).map(upg => {
                const hasUpgrade = purchasedUpgrades.includes(upg.id);
                const canBuyUpgrade = coins >= upg.cost;
                return (
                  <div key={upg.id} style={{ ...S.card(false), padding: '12px 14px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0' }}>✨ {upg.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Не приносит дохода, просто стильно</div>
                    </div>
                    {hasUpgrade ? (
                      <div style={S.badge('#34d399')}>Приобретено</div>
                    ) : (
                      <button 
                        onClick={() => buyUpgrade(upg.id)} 
                        disabled={!canBuyUpgrade} 
                        style={S.btn('linear-gradient(135deg,#7c3aed,#5b21b6)', !canBuyUpgrade)}
                      >
                        Купить {upg.cost} 🪙
                      </button>
                    )}
                  </div>
                );
              })}
              {LOCATION_UPGRADES.filter(u => u.locationId === currentLocation).length === 0 && (
                <div style={{textAlign:'center', padding:20, color:'#64748b', fontSize:13}}>В этой локации нет доступных покупок роскоши.</div>
              )}
            </div>
          )}

          {/* ── Real Estate Tab ── */}
          {tab === 'real_estate' && (
            <div style={S.scroll}>
              {LOCATIONS.map(loc => {
                const isUnlocked = unlockedLocations.includes(loc.id);
                const isActive = currentLocation === loc.id;
                const canBuy = !isUnlocked && coins >= loc.cost;
                
                return (
                  <div key={loc.id} style={{...S.card(false), border: isActive ? '1px solid #3b82f6' : '1px solid #2d1b69'}}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{loc.name} {isActive && '📍'}</div>
                      {!isUnlocked && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Стоимость: {loc.cost} 🪙</div>}
                      {isUnlocked && <div style={{ fontSize: 11, color: '#34d399', marginTop: 2 }}>Куплено</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {!isUnlocked && (
                         <button onClick={() => buyLocation(loc.id)} disabled={!canBuy} style={S.btn('linear-gradient(135deg,#2563eb,#1d4ed8)', !canBuy)}>Купить</button>
                      )}
                      {isUnlocked && !isActive && (
                         <button onClick={() => changeLocation(loc.id)} style={S.btn('linear-gradient(135deg,#7c3aed,#5b21b6)')}>Переехать &rarr;</button>
                      )}
                      {isActive && <div style={S.badge('#3b82f6')}>Текущая</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Mentor Tab ── */}
          {tab === 'mentor' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid #1e1e3a', flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/dog.png" alt="dog" style={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid #ef4444', objectFit: 'cover' }} />
                <div><div style={{ fontWeight: 800, fontSize: 13 }}>Красная Собака 🐶</div><div style={{ fontSize: 11, color: '#64748b' }}>Финансовый ИИ-Ментор</div></div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <div style={{ color: '#475569', fontSize: 13, marginBottom: 12 }}>Спроси про страхование, риски или кредиты</div>
                    {!quizCompleted && (
                      <button onClick={openQuiz} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: 'white', border: 'none', cursor: 'pointer' }}>
                        <GraduationCap size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Пройти квиз
                      </button>
                    )}
                    {quizCompleted && (
                      <div style={{ fontSize: 12, color: '#34d399' }}>Квиз пройден: {quizScore}/{QUIZ_QUESTIONS.length}</div>
                    )}
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {m.role !== 'data' && <div style={S.msg(m.role === 'user')}>{m.content || (m.toolInvocations?.length ? '🔍 Ищу информацию в интернете (Perplexity)...' : '')}</div>}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, padding: '8px 12px', borderTop: '1px solid #1e1e3a', flexShrink: 0 }}>
                <input value={input} onChange={handleInputChange} placeholder="Спроси совета..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13, background: '#140d2e', border: '1px solid #2d1b69', color: '#e2e8f0', outline: 'none' }} />
                <button type="submit" style={{ padding: '8px 12px', borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: 'white', border: 'none', cursor: 'pointer' }}><Send size={16} /></button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ── Quiz Modal ── */}
      {showQuizModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(5px)' }}>
          <div style={{ background: 'linear-gradient(135deg,#0f0a1e,#1a0a3e)', border: '1px solid #7c3aed', borderRadius: 16, padding: 24, maxWidth: 380, width: '92%', boxShadow: '0 0 40px rgba(124,58,237,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#a78bfa' }}>
                <GraduationCap size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                Квиз: Проверь себя
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{quizCurrentQ + 1}/{QUIZ_QUESTIONS.length}</div>
            </div>

            <div style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.6, marginBottom: 16 }}>
              {QUIZ_QUESTIONS[quizCurrentQ].question}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {QUIZ_QUESTIONS[quizCurrentQ].options.map((opt, idx) => {
                const answered = quizShowResult;
                const isCorrect = idx === QUIZ_QUESTIONS[quizCurrentQ].correctIndex;
                const isSelected = quizAnswers[quizCurrentQ] === idx;
                let bg = 'rgba(45,27,105,0.5)';
                let border = '#2d1b69';
                if (answered && isCorrect) { bg = 'rgba(5,150,105,0.3)'; border = '#059669'; }
                else if (answered && isSelected && !isCorrect) { bg = 'rgba(239,68,68,0.3)'; border = '#ef4444'; }

                return (
                  <button
                    key={idx}
                    onClick={() => !answered && handleQuizAnswer(idx)}
                    disabled={answered}
                    style={{
                      padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                      background: bg, border: `1px solid ${border}`, color: '#e2e8f0',
                      cursor: answered ? 'default' : 'pointer', textAlign: 'left',
                      transition: 'all .2s',
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {quizShowResult && (
              <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(124,58,237,0.1)', border: '1px solid #7c3aed40', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                {QUIZ_QUESTIONS[quizCurrentQ].explanation}
              </div>
            )}

            {quizShowResult && (
              <button
                onClick={handleQuizNext}
                style={{ width: '100%', marginTop: 12, padding: '12px 0', borderRadius: 10, fontSize: 14, fontWeight: 800, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                {quizCurrentQ < QUIZ_QUESTIONS.length - 1 ? 'Следующий вопрос →' : 'Завершить квиз'}
              </button>
            )}

            <button onClick={closeQuiz} style={{ width: '100%', marginTop: 8, padding: '8px 0', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'transparent', color: '#475569', border: 'none', cursor: 'pointer' }}>
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* ── Quiz Complete Banner ── */}
      {quizCompleted && !showQuizModal && !tutorialActive && (
        <div style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 40, padding: '8px 16px', borderRadius: 12,
          background: 'linear-gradient(135deg,#059669,#047857)', color: 'white',
          fontSize: 13, fontWeight: 700, boxShadow: '0 4px 20px rgba(5,150,105,0.4)',
          animation: 'fadeIn 0.5s ease-out',
        }}>
          Квиз пройден: {quizScore}/{QUIZ_QUESTIONS.length} правильных ответов
        </div>
      )}

      {activeIncident && tab !== 'mentor' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)' }}>
          <div style={{ background: 'linear-gradient(135deg,#0f0a1e,#1a0505)', border: '1px solid #ef4444', borderRadius: 16, padding: 24, maxWidth: 340, width: '90%', boxShadow: '0 0 40px rgba(239,68,68,0.4)' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#ef4444', marginBottom: 10 }}>⚠️ ЧП: {activeIncident.title}</div>
            <div style={{ fontSize: 14, color: '#cbd5e1', marginBottom: 6 }}>Ущерб: <strong style={{ color: '#ef4444' }}>-{activeIncident.damage} 🪙</strong></div>
            {!activeIncident.insurable && <div style={{ fontSize: 12, color: '#fbbf24', padding: 8, background: 'rgba(251,191,36,0.1)', borderRadius: 8, marginBottom: 10 }}>⚡ Не покрывается страховкой!</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              {(() => {
                 const canUseInsurance = activeIncident.insurable && activeIncident.wasInsured;
                 const targetId = activeIncident.brokenItemId ?? activeIncident.brokenLocationId!;

                 return (
                   <>
                     {canUseInsurance && (
                       <button 
                         onClick={() => repairItem(targetId, 'insurance')} 
                         style={{ padding: 12, borderRadius: 10, fontWeight: 800, fontSize: 14, background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 0 20px rgba(5,150,105,0.4)', marginBottom: 4 }}
                       >
                         Страховая выплата (франшиза 20% = -{activeIncident.damage ? Math.floor(activeIncident.damage * 0.2) : 0} 🪙)
                       </button>
                     )}
                     <button 
                       onClick={() => repairItem(targetId, 'pocket')} 
                       style={{ padding: 12, borderRadius: 10, fontWeight: 800, fontSize: 14, background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 0 20px rgba(220,38,38,0.4)' }}
                     >
                       Оплатить ремонт на 100% (-{activeIncident.damage} 🪙)
                     </button>
                     <button 
                       onClick={() => {
                         setTab('mentor');
                         append({ role: 'user', content: `У меня ЧП: ${activeIncident.title}! Как мне лучше поступить в этой ситуации?` });
                       }} 
                       style={{ padding: 12, borderRadius: 10, fontWeight: 800, fontSize: 14, background: 'transparent', color: '#a78bfa', border: '1px solid #7c3aed', cursor: 'pointer' }}
                     >
                       💬 Спросить совета у Ментора
                     </button>
                   </>
                 );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
