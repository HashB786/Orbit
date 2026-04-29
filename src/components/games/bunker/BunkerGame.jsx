import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, MessageSquare, ChevronDown, ChevronUp,
  Skull, Zap, Eye, Crown, Lock, Copy, Check,
  User, X, Send, Flame, Settings, Pause, Play,
  Plus, Minus, AlertTriangle, ChevronRight,
} from 'lucide-react';
import { db } from '../../../config/firebase';
import {
  doc, setDoc, onSnapshot, updateDoc, getDoc, arrayUnion,
} from 'firebase/firestore';
import {
  generateCode, generatePlayerId, generateAllCards, getStatValue,
  tallyVotes, tallyStatVotes, formatTime, phaseTimers, sysMsg,
} from './bunkerUtils';
import { STAT_CATEGORIES, SPECIAL_POWERS } from './bunkerData';

// ─── Constants ───────────────────────────────────────────────────────────────

const COLLECTION = 'bunker_games';
const MAX_CHAT = 120;

const PHASE_LABELS = {
  lobby: 'LOBBY',
  card_phase: 'READ YOUR CARD',
  stat_vote: 'STAT VOTE',
  reveal: 'REVEAL',
  discussion: 'OPEN DISCUSSION',
  elim_vote: 'ELIMINATION VOTE',
  defense: 'DEFENSE PHASE',
  revote: 'RE-VOTE',
  eliminated_reveal: 'ELIMINATED',
  game_over: 'GAME OVER',
};

// Discussion-phase powers (can be activated before the vote)
const DISCUSSION_POWERS = ['system_breach', 'double_vote', 'ghost_protocol'];

// ─── Styled primitives ───────────────────────────────────────────────────────

const Btn = ({ children, onClick, disabled, variant = 'primary', className = '', small = false }) => {
  const base = 'font-mono font-bold tracking-wider uppercase transition-all duration-150 border focus:outline-none flex items-center justify-center gap-1.5';
  const size = small ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm';
  const v = {
    primary: disabled
      ? 'border-green-900 text-green-900 cursor-not-allowed'
      : 'border-green-500 text-green-400 hover:bg-green-500/10 active:scale-95',
    danger: disabled
      ? 'border-red-900 text-red-900 cursor-not-allowed'
      : 'border-red-500 text-red-400 hover:bg-red-500/10 active:scale-95',
    ghost: 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300 active:scale-95',
    solid: disabled
      ? 'border-green-900 bg-green-900/20 text-green-900 cursor-not-allowed'
      : 'border-green-500 bg-green-500/15 text-green-300 hover:bg-green-500/25 active:scale-95',
    yellow: disabled
      ? 'border-yellow-900 text-yellow-900 cursor-not-allowed'
      : 'border-yellow-600 text-yellow-400 hover:bg-yellow-500/10 active:scale-95',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${size} ${v[variant]} ${className}`}>
      {children}
    </button>
  );
};

// ─── Timer ───────────────────────────────────────────────────────────────────

const PhaseTimer = ({ deadline, paused, pausedRemaining }) => {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (paused) {
      setRemaining(pausedRemaining ?? 0);
      return;
    }
    if (!deadline) { setRemaining(0); return; }
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [deadline, paused, pausedRemaining]);

  const secs = Math.ceil(remaining / 1000);
  const critical = !paused && secs <= 10 && secs > 0;

  return (
    <motion.div
      animate={critical ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
      transition={critical ? { repeat: Infinity, duration: 0.75 } : {}}
      className={`font-mono text-3xl font-black tabular-nums select-none ${
        paused ? 'text-yellow-500' : critical ? 'text-red-400' : 'text-green-400'
      }`}
      style={paused
        ? { textShadow: '0 0 12px rgba(234,179,8,0.5)' }
        : critical
          ? { textShadow: '0 0 16px rgba(248,113,113,0.8)' }
          : { textShadow: '0 0 12px rgba(74,222,128,0.5)' }
      }
    >
      {paused ? `${secs}s ⏸` : `${secs}s`}
    </motion.div>
  );
};

// ─── Chat panel ──────────────────────────────────────────────────────────────

const ChatPanel = ({ chat, onSend, myId }) => {
  const [msg, setMsg] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.length]);

  const send = () => {
    const text = msg.trim().slice(0, 200);
    if (!text) return;
    onSend(text);
    setMsg('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 border-l border-gray-800">
      <div className="px-3 py-2 border-b border-gray-800 flex items-center gap-2 shrink-0">
        <MessageSquare size={13} className="text-green-500" />
        <span className="font-mono text-xs text-green-400 tracking-widest uppercase">COMMS</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0">
        {(chat || []).map((m) => (
          <div key={m.id} className="text-xs font-mono leading-relaxed break-words">
            {m.isSystem ? (
              <span className="text-yellow-600 italic"><span className="text-yellow-500 not-italic">[SYS]</span> {m.text}</span>
            ) : (
              <span>
                <span className={m.authorId === myId ? 'text-green-400' : 'text-blue-400'}>{m.author}:</span>{' '}
                <span className="text-gray-300">{m.text}</span>
              </span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-2 border-t border-gray-800 flex gap-1.5 shrink-0">
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          maxLength={200}
          placeholder="Message…"
          className="flex-1 min-w-0 bg-gray-900 border border-gray-700 text-green-300 font-mono text-xs px-2 py-1.5 focus:outline-none focus:border-green-600 placeholder-gray-700"
        />
        <button onClick={send} className="px-2 py-1.5 bg-green-900/30 border border-green-800 text-green-400 hover:bg-green-900/50 transition-colors shrink-0">
          <Send size={12} />
        </button>
      </div>
    </div>
  );
};

// ─── My Card panel ───────────────────────────────────────────────────────────

const MyCard = ({ card, powerUsed, powerVisible, onToggleVisibility, game, myId, onQuickActivate }) => {
  const [open, setOpen] = useState(true);
  if (!card) return null;

  const phase = game?.phase;
  const me = game?.players.find((p) => p.id === myId);
  const isIsolated = game?.effects?.isolatedPlayer === myId;
  const powerId = card.specialPower?.id;
  const canQuickActivate =
    !powerUsed && !isIsolated &&
    DISCUSSION_POWERS.includes(powerId) &&
    (phase === 'discussion');

  return (
    <div className="bg-gray-950 border border-green-900/60">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 border-b border-gray-800 hover:bg-gray-900/40 transition-colors"
      >
        <span className="font-mono text-xs text-green-400 tracking-widest uppercase flex items-center gap-1.5">
          <Lock size={11} /> MY CARD
        </span>
        {open ? <ChevronUp size={13} className="text-gray-600" /> : <ChevronDown size={13} className="text-gray-600" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="p-2 space-y-1">
              {[
                ['PROFESSION', card.profession],
                ['FACT 1', card.fact1],
                ['FACT 2', card.fact2],
                ['INVENTORY', card.inventory],
                ['PHOBIA', card.phobia],
                ['POWER', `${card.specialPower?.name}${powerUsed ? ' ✓' : ''}`],
                ['POWER FX', card.specialPower?.description],
                ['HEALTH', card.health],
                ['AGE/SEX', `${card.age} · ${card.gender}`],
              ].map(([label, val]) => (
                <div key={label} className="grid grid-cols-[76px_1fr] gap-1 text-xs font-mono">
                  <span className="text-gray-700 uppercase tracking-wide truncate">{label}</span>
                  <span className={`leading-tight ${label === 'POWER' && powerUsed ? 'line-through text-gray-600' : label === 'POWER' ? 'text-yellow-400 font-bold' : 'text-gray-300'}`}>
                    {val}
                  </span>
                </div>
              ))}

              {/* Power visibility toggle */}
              <div className="pt-1 border-t border-gray-900">
                <button
                  onClick={onToggleVisibility}
                  className={`w-full text-left font-mono text-xs px-1 py-1 transition-colors ${
                    powerVisible
                      ? 'text-green-500 hover:text-green-400'
                      : 'text-gray-600 hover:text-gray-400'
                  }`}
                >
                  {powerVisible ? '● POWER SHOWN to others' : '○ POWER HIDDEN from others'}
                </button>
              </div>

              {/* Quick-activate for discussion-phase powers */}
              {canQuickActivate && (
                <div className="pt-1 border-t border-yellow-900/40">
                  <p className="font-mono text-xs text-yellow-600 mb-1 uppercase tracking-wide">
                    ⚡ Activate now (before vote)
                  </p>
                  <QuickActivatePanel power={card.specialPower} game={game} myId={myId} onActivate={onQuickActivate} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Quick-activate for discussion-phase powers (System Breach, Double Vote, Ghost Protocol)
const QuickActivatePanel = ({ power, game, myId, onActivate }) => {
  const activePlayers = (game?.players || []).filter((p) => !p.eliminated && p.id !== myId);

  if (power?.id === 'double_vote' || power?.id === 'ghost_protocol') {
    return (
      <Btn variant="yellow" small className="w-full" onClick={() => onActivate(power.id, {})}>
        <Zap size={11} /> USE: {power.name}
      </Btn>
    );
  }

  if (power?.id === 'system_breach') {
    return (
      <div className="space-y-1">
        <p className="font-mono text-xs text-gray-600">Select who to nullify:</p>
        {activePlayers.map((p) => (
          <button
            key={p.id}
            onClick={() => onActivate(power.id, { targetId: p.id })}
            className="w-full text-left px-2 py-1 border border-gray-700 font-mono text-xs text-gray-300 hover:border-yellow-600 hover:text-yellow-300 transition-colors"
          >
            {p.name}
          </button>
        ))}
      </div>
    );
  }

  return null;
};

// ─── Player list ─────────────────────────────────────────────────────────────

const PlayerList = ({ players, hostId, myId, currentHotSeat, onKick, isHostView, phase }) => (
  <div className="bg-gray-950 border border-gray-800">
    <div className="px-3 py-2 border-b border-gray-800 flex items-center gap-2">
      <Users size={13} className="text-green-500" />
      <span className="font-mono text-xs text-green-400 tracking-widest uppercase">SURVIVORS</span>
    </div>
    <div className="p-1 space-y-px">
      {players.map((p) => (
        <div
          key={p.id}
          className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-mono transition-colors
            ${p.eliminated ? 'opacity-25' : ''}
            ${p.id === currentHotSeat ? 'bg-red-950/50 border-l-2 border-red-700' : ''}`}
        >
          {p.id === hostId && <Crown size={9} className="text-yellow-500 shrink-0" />}
          {p.id === currentHotSeat && <Flame size={9} className="text-red-400 shrink-0" />}
          <span className={`flex-1 truncate ${p.eliminated ? 'line-through text-gray-600' : p.id === myId ? 'text-green-400' : 'text-gray-300'}`}>
            {p.name}
          </span>
          {p.eliminated && <Skull size={9} className="text-red-800 shrink-0" />}
          {!p.eliminated && isHostView && p.id !== myId && phase !== 'game_over' && (
            <button
              onClick={() => onKick(p.id)}
              title="Kick player"
              className="text-gray-700 hover:text-red-400 transition-colors ml-0.5 shrink-0"
            >
              <X size={10} />
            </button>
          )}
        </div>
      ))}
    </div>
  </div>
);

// ─── Revealed stats (grouped by player) ──────────────────────────────────────

const RevealedStats = ({ revealedStats, players }) => {
  const [open, setOpen] = useState(true);
  const [view, setView] = useState('player'); // 'player' | 'stat'

  if (!revealedStats?.length) return null;

  // Build player-grouped structure
  const byPlayer = {};
  for (const entry of revealedStats) {
    const key = entry.playerId || entry.playerName;
    if (!byPlayer[key]) byPlayer[key] = { name: entry.playerName, stats: [] };
    byPlayer[key].stats.push(entry);
  }

  // Stat order for display
  const statOrder = STAT_CATEGORIES;
  const sortStats = (stats) =>
    [...stats].sort((a, b) => statOrder.indexOf(a.stat) - statOrder.indexOf(b.stat));

  return (
    <div className="bg-gray-950 border border-gray-800">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 border-b border-gray-800 hover:bg-gray-900/40 transition-colors"
      >
        <span className="font-mono text-xs text-green-400 tracking-widest uppercase flex items-center gap-1.5">
          <Eye size={11} /> KNOWN DATA
        </span>
        {open ? <ChevronUp size={13} className="text-gray-600" /> : <ChevronDown size={13} className="text-gray-600" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            {/* View toggle */}
            <div className="flex border-b border-gray-900">
              {['player', 'stat'].map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`flex-1 py-1 font-mono text-xs uppercase tracking-widest transition-colors ${
                    view === v ? 'text-green-400 bg-green-900/10' : 'text-gray-700 hover:text-gray-500'
                  }`}
                >
                  by {v}
                </button>
              ))}
            </div>

            <div className="max-h-72 overflow-y-auto">
              {view === 'player' ? (
                // Grouped by player
                <div className="divide-y divide-gray-900/60">
                  {Object.values(byPlayer).map(({ name, stats }) => (
                    <div key={name} className="p-2">
                      <p className="font-mono text-xs text-blue-400 font-bold mb-1">{name}</p>
                      <div className="space-y-0.5 pl-2">
                        {sortStats(stats).map((entry, i) => (
                          <div key={i} className={`grid grid-cols-[80px_1fr] gap-1 text-xs font-mono ${entry.isPropaganda ? 'text-yellow-600' : ''}`}>
                            <span className="text-gray-600 truncate">{entry.stat}</span>
                            <span className="text-gray-300 leading-tight">
                              {entry.value}{entry.isPropaganda ? ' ⚠' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Grouped by stat
                <div className="divide-y divide-gray-900/60">
                  {STAT_CATEGORIES.filter((cat) =>
                    revealedStats.some((r) => r.stat === cat)
                  ).map((cat) => (
                    <div key={cat} className="p-2">
                      <p className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-1">{cat}</p>
                      <div className="space-y-0.5 pl-2">
                        {revealedStats
                          .filter((r) => r.stat === cat)
                          .map((entry, i) => (
                            <div key={i} className={`grid grid-cols-[80px_1fr] gap-1 text-xs font-mono ${entry.isPropaganda ? 'text-yellow-600' : ''}`}>
                              <span className="text-blue-400 truncate">{entry.playerName}</span>
                              <span className="text-gray-300 leading-tight">
                                {entry.value}{entry.isPropaganda ? ' ⚠' : ''}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Host controls (pause + settings) ────────────────────────────────────────

const HostControls = ({ game, myId, onPause, onResume, onUpdateSurvivors }) => {
  if (game.hostId !== myId || game.phase === 'lobby' || game.phase === 'game_over') return null;

  const isPaused = !!game.paused;
  const survivors = game.settings?.survivors ?? 2;
  const activePlayers = game.players.filter((p) => !p.eliminated).length;

  return (
    <div className="bg-gray-950 border border-yellow-900/50">
      <div className="px-3 py-2 border-b border-yellow-900/30 flex items-center gap-2">
        <Crown size={11} className="text-yellow-500" />
        <span className="font-mono text-xs text-yellow-500 tracking-widest uppercase">HOST</span>
      </div>
      <div className="p-2 space-y-2">
        {/* Pause / Resume */}
        {game.phase !== 'card_phase' && game.phase !== 'reveal' && game.phase !== 'eliminated_reveal' && (
          <Btn
            variant={isPaused ? 'solid' : 'yellow'}
            small
            className="w-full"
            onClick={isPaused ? onResume : onPause}
          >
            {isPaused ? <><Play size={11} /> RESUME</> : <><Pause size={11} /> PAUSE TIMER</>}
          </Btn>
        )}
        {/* Survivor count adjust */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-600 flex-1 uppercase tracking-wide">Survivors</span>
          <button
            onClick={() => onUpdateSurvivors(Math.max(1, survivors - 1))}
            disabled={survivors <= 1}
            className="w-6 h-6 border border-gray-700 text-gray-400 hover:border-red-600 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Minus size={10} />
          </button>
          <span className="font-mono text-sm text-green-400 w-4 text-center">{survivors}</span>
          <button
            onClick={() => onUpdateSurvivors(Math.min(activePlayers - 1, survivors + 1))}
            disabled={survivors >= activePlayers - 1}
            className="w-6 h-6 border border-gray-700 text-gray-400 hover:border-green-600 hover:text-green-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Plus size={10} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Entry screen ─────────────────────────────────────────────────────────────

const EntryScreen = ({ onCreate, onJoin, error }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [tab, setTab] = useState('create');
  const [survivors, setSurvivors] = useState(2);
  const [total, setTotal] = useState(6);
  const [localErr, setLocalErr] = useState('');

  const handleCreate = () => {
    if (!name.trim()) { setLocalErr('Enter your name'); return; }
    onCreate(name.trim(), { total, survivors });
  };

  const handleJoin = () => {
    if (!name.trim()) { setLocalErr('Enter your name'); return; }
    if (code.trim().length !== 4) { setLocalErr('Enter a valid 4-character code'); return; }
    onJoin(name.trim(), code.trim().toUpperCase());
  };

  const displayErr = localErr || error;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Shield size={40} className="text-green-500 mx-auto mb-3"
            style={{ filter: 'drop-shadow(0 0 14px rgba(74,222,128,0.6))' }} />
          <h1 className="font-mono text-5xl font-black text-green-400 tracking-[0.2em]"
            style={{ textShadow: '0 0 30px rgba(74,222,128,0.4)' }}>BUNKER</h1>
          <p className="font-mono text-gray-600 text-xs tracking-widest mt-2 uppercase">Survive. Convince. Enter.</p>
        </div>

        <div className="flex border border-gray-800">
          {['create', 'join'].map((t) => (
            <button key={t} onClick={() => { setTab(t); setLocalErr(''); }}
              className={`flex-1 py-2.5 font-mono text-xs tracking-widest uppercase transition-colors ${
                tab === t ? 'bg-green-500/10 text-green-400 border-b-2 border-green-500' : 'text-gray-600 hover:text-gray-400'
              }`}>
              {t === 'create' ? '[ CREATE ]' : '[ JOIN ]'}
            </button>
          ))}
        </div>

        <div className="border border-t-0 border-gray-800 p-6 space-y-4 bg-gray-950">
          <div>
            <label className="font-mono text-xs text-gray-500 uppercase tracking-widest block mb-1">Your Name</label>
            <input value={name} onChange={(e) => { setName(e.target.value); setLocalErr(''); }}
              maxLength={20} placeholder="Callsign…"
              className="w-full bg-gray-900 border border-gray-700 text-green-300 font-mono text-sm px-3 py-2 focus:outline-none focus:border-green-600 placeholder-gray-700" />
          </div>

          {tab === 'join' && (
            <div>
              <label className="font-mono text-xs text-gray-500 uppercase tracking-widest block mb-1">Game Code</label>
              <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase().slice(0, 4)); setLocalErr(''); }}
                maxLength={4} placeholder="XXXX"
                className="w-full bg-gray-900 border border-gray-700 text-green-300 font-mono text-2xl text-center tracking-[0.4em] px-3 py-3 focus:outline-none focus:border-green-600 placeholder-gray-700 uppercase" />
            </div>
          )}

          {tab === 'create' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-mono text-xs text-gray-500 uppercase tracking-widest block mb-1">Players (2–10)</label>
                <input type="number" min={2} max={10} value={total}
                  onChange={(e) => setTotal(Math.min(10, Math.max(2, +e.target.value)))}
                  className="w-full bg-gray-900 border border-gray-700 text-green-300 font-mono text-sm px-3 py-2 focus:outline-none focus:border-green-600" />
              </div>
              <div>
                <label className="font-mono text-xs text-gray-500 uppercase tracking-widest block mb-1">Survivors (1–4)</label>
                <input type="number" min={1} max={4} value={survivors}
                  onChange={(e) => setSurvivors(Math.min(4, Math.max(1, +e.target.value)))}
                  className="w-full bg-gray-900 border border-gray-700 text-green-300 font-mono text-sm px-3 py-2 focus:outline-none focus:border-green-600" />
              </div>
            </div>
          )}

          {displayErr && <p className="font-mono text-xs text-red-400">{displayErr}</p>}

          <Btn variant="solid" className="w-full" onClick={tab === 'create' ? handleCreate : handleJoin}>
            {tab === 'create' ? '[ INITIALISE BUNKER ]' : '[ ENTER BUNKER ]'}
          </Btn>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Lobby ────────────────────────────────────────────────────────────────────

const LobbyScreen = ({ game, myId, onReady, onKick, onStart, onLeave }) => {
  const [copied, setCopied] = useState(false);
  const isHost = game.hostId === myId;
  const me = game.players.find((p) => p.id === myId);

  const copyCode = () => {
    try { navigator.clipboard.writeText(game.code); } catch (_) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-5">
        <div className="text-center">
          <h1 className="font-mono text-4xl font-black text-green-400 tracking-[0.2em]"
            style={{ textShadow: '0 0 20px rgba(74,222,128,0.4)' }}>BUNKER</h1>
          <p className="font-mono text-gray-600 text-xs mt-1">LOBBY — waiting for survivors</p>
        </div>

        <div className="border border-green-900 bg-green-950/10 p-4 text-center">
          <p className="font-mono text-xs text-gray-600 uppercase tracking-widest mb-1">Game Code</p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-4xl font-black text-green-400 tracking-[0.3em]"
              style={{ textShadow: '0 0 20px rgba(74,222,128,0.5)' }}>{game.code}</span>
            <button onClick={copyCode} className="text-gray-600 hover:text-green-400 transition-colors">
              {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
            </button>
          </div>
          <p className="font-mono text-xs text-gray-700 mt-1">
            {game.settings.total} players · {game.settings.survivors} survivor{game.settings.survivors !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="border border-gray-800">
          <div className="px-3 py-2 border-b border-gray-800">
            <span className="font-mono text-xs text-green-400 uppercase tracking-widest">
              Players ({game.players.length}/{game.settings.total})
            </span>
          </div>
          <div className="divide-y divide-gray-900">
            {game.players.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                {p.id === game.hostId && <Crown size={13} className="text-yellow-500 shrink-0" />}
                <span className={`flex-1 font-mono text-sm ${p.id === myId ? 'text-green-400' : 'text-gray-300'}`}>
                  {p.name} {p.id === myId && <span className="text-gray-600">(you)</span>}
                </span>
                <span className={`font-mono text-xs ${p.ready ? 'text-green-500' : 'text-gray-600'}`}>
                  {p.ready ? '● READY' : '○ WAITING'}
                </span>
                {isHost && p.id !== myId && (
                  <button onClick={() => onKick(p.id)} className="text-gray-700 hover:text-red-400 transition-colors">
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
            {Array.from({ length: Math.max(0, game.settings.total - game.players.length) }).map((_, i) => (
              <div key={`e${i}`} className="px-4 py-2.5">
                <span className="font-mono text-xs text-gray-800">— awaiting survivor —</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          {!me?.ready ? (
            <Btn variant="solid" className="flex-1" onClick={onReady}>[ READY ]</Btn>
          ) : (
            <div className="flex-1 border border-green-800/50 bg-green-900/10 py-2.5 text-center font-mono text-sm text-green-700 tracking-wider">
              ● READY
            </div>
          )}
          {isHost && (
            <Btn variant="solid" className="flex-1" onClick={onStart} disabled={game.players.length < 2}>
              [ START GAME ]
            </Btn>
          )}
        </div>
        <button onClick={onLeave} className="w-full font-mono text-xs text-gray-700 hover:text-red-400 transition-colors text-center py-1">
          leave game
        </button>
      </div>
    </div>
  );
};

// ─── Card phase ───────────────────────────────────────────────────────────────

const CardPhaseScreen = ({ game, myId, onReady }) => {
  const me = game.players.find((p) => p.id === myId);
  const card = me?.card;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-5">
        <div className="text-center">
          <p className="font-mono text-xs text-gray-600 uppercase tracking-widest">Your bunker profile</p>
          <h2 className="font-mono text-2xl font-black text-green-400 mt-1">READ YOUR CARD</h2>
          <div className="mt-2"><PhaseTimer deadline={game.phaseDeadline} paused={game.paused} pausedRemaining={game.pausedRemaining} /></div>
        </div>

        {card && (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="border border-green-800 overflow-hidden">
            <div className="px-4 py-2 bg-green-900/15 border-b border-green-900 flex items-center gap-2">
              <Shield size={13} className="text-green-500" />
              <span className="font-mono text-xs text-green-400 tracking-widest uppercase">CLASSIFIED — EYES ONLY</span>
            </div>
            <div className="p-4 space-y-2.5">
              {[
                ['Profession', card.profession],
                ['Fact 1', card.fact1],
                ['Fact 2', card.fact2],
                ['Inventory', card.inventory],
                ['Phobia', card.phobia],
                ['Special Power', card.specialPower?.name],
                ['Power Effect', card.specialPower?.description],
                ['Health', card.health],
                ['Age', String(card.age)],
                ['Gender', card.gender],
              ].map(([label, val]) => (
                <div key={label} className="grid grid-cols-[120px_1fr] gap-2 text-sm font-mono border-b border-gray-900 pb-2">
                  <span className="text-gray-500 uppercase text-xs tracking-wide self-start pt-0.5">{label}</span>
                  <span className={`text-gray-200 leading-tight ${label === 'Special Power' ? 'text-yellow-400 font-bold' : ''}`}>{val}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 bg-red-900/10 border-t border-red-900/30">
              <p className="font-mono text-xs text-red-700">Age and Gender are permanently private and cannot be revealed by votes.</p>
            </div>
          </motion.div>
        )}

        <div className="flex flex-col gap-2 items-center">
          <Btn variant="solid" className="w-full" onClick={onReady} disabled={me?.ready}>
            {me?.ready ? '● READY — Waiting for others…' : '[ I\'M READY ]'}
          </Btn>
          <p className="font-mono text-xs text-gray-700">
            {game.players.filter((p) => p.ready).length}/{game.players.length} ready
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Game layout ──────────────────────────────────────────────────────────────

const GameLayout = ({
  game, myId, myCard, powerUsed, powerVisible,
  onSendChat, onTogglePowerVisibility, onKick, onPause, onResume,
  onUpdateSurvivors, onQuickActivate, children,
}) => {
  const isHost = game.hostId === myId;

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-4 px-4 py-2 bg-gray-950 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-green-500" />
          <span className="font-mono text-xs text-green-400 font-bold tracking-wider">BUNKER</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-0.5 border border-gray-800">
          <div className={`w-1.5 h-1.5 rounded-full ${game.paused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`} />
          <span className="font-mono text-xs text-gray-400 uppercase tracking-widest">
            {PHASE_LABELS[game.phase] || game.phase}
          </span>
          <span className="font-mono text-xs text-gray-600">R{game.round}</span>
        </div>
        <div className="font-mono text-xs text-gray-700 tracking-widest">{game.code}</div>
        <div className="ml-auto font-mono text-xs text-gray-600">
          {game.players.filter((p) => !p.eliminated).length} active · {game.settings?.survivors} survive
        </div>
      </div>

      {/* Three-column body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-56 xl:w-64 shrink-0 flex flex-col border-r border-gray-800 overflow-y-auto">
          <div className="p-2 space-y-2 flex-1">
            <PlayerList
              players={game.players}
              hostId={game.hostId}
              myId={myId}
              currentHotSeat={game.currentHotSeat}
              onKick={onKick}
              isHostView={isHost}
              phase={game.phase}
            />
            <HostControls
              game={game}
              myId={myId}
              onPause={onPause}
              onResume={onResume}
              onUpdateSurvivors={onUpdateSurvivors}
            />
            <RevealedStats revealedStats={game.revealedStats} players={game.players} />
          </div>
          {/* My card at bottom of left sidebar */}
          <div className="border-t border-gray-800">
            <MyCard
              card={myCard}
              powerUsed={powerUsed}
              powerVisible={powerVisible}
              onToggleVisibility={onTogglePowerVisibility}
              game={game}
              myId={myId}
              onQuickActivate={onQuickActivate}
            />
          </div>
        </div>

        {/* Center */}
        <div className="flex-1 overflow-y-auto min-w-0">
          {children}
        </div>

        {/* Right sidebar — chat */}
        <div className="w-56 xl:w-64 shrink-0 flex flex-col border-l border-gray-800">
          <ChatPanel chat={game.chat} onSend={onSendChat} myId={myId} />
        </div>
      </div>
    </div>
  );
};

// ─── Stat vote ────────────────────────────────────────────────────────────────

const StatVotePhase = ({ game, myId, onVote, onBlackout }) => {
  const revealed = (game.revealedStats || []).map((r) => r.stat);
  // De-dupe (a stat can appear multiple times in revealedStats for different players)
  const revealedCats = [...new Set(revealed)];
  const myVote = game.statVotes?.[myId];
  const activePlayers = game.players.filter((p) => !p.eliminated);
  const me = game.players.find((p) => p.id === myId);
  const canBlackout = me?.card?.specialPower?.id === 'blackout'
    && !me?.powerUsed
    && game.effects?.isolatedPlayer !== myId;

  const tallied = {};
  for (const v of Object.values(game.statVotes || {})) tallied[v] = (tallied[v] || 0) + 1;

  return (
    <div className="p-6 space-y-5 max-w-xl mx-auto w-full">
      <div className="text-center">
        <p className="font-mono text-xs text-gray-600 uppercase tracking-widest">Round {game.round}</p>
        <h2 className="font-mono text-2xl font-bold text-green-400 mt-1">STAT VOTE</h2>
        <p className="font-mono text-xs text-gray-500 mt-1">Vote on which stat to reveal for all survivors</p>
        <div className="mt-3">
          <PhaseTimer deadline={game.phaseDeadline} paused={game.paused} pausedRemaining={game.pausedRemaining} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {STAT_CATEGORIES.map((cat) => {
          const isRevealed = revealedCats.includes(cat);
          const isMyVote = myVote === cat;
          const count = tallied[cat] || 0;
          return (
            <button key={cat} onClick={() => !isRevealed && !myVote && onVote(cat)}
              disabled={isRevealed || !!myVote}
              className={`relative p-3 border font-mono text-sm text-left transition-all
                ${isRevealed ? 'border-gray-900 text-gray-700 bg-gray-900/20 cursor-not-allowed line-through'
                  : isMyVote ? 'border-green-500 bg-green-900/20 text-green-300'
                  : myVote ? 'border-gray-800 text-gray-600 cursor-not-allowed'
                  : 'border-gray-700 text-gray-300 hover:border-green-700 hover:bg-green-900/10 cursor-pointer'}`}>
              {cat}
              {count > 0 && <span className="absolute top-1.5 right-2 text-xs text-green-700">{count}</span>}
              {isMyVote && <Check size={11} className="absolute bottom-1.5 right-2 text-green-500" />}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between items-center">
        <p className="font-mono text-xs text-gray-600">
          {Object.keys(game.statVotes || {}).length}/{activePlayers.length} voted
        </p>
        {canBlackout && (
          <Btn variant="danger" small onClick={onBlackout}>
            <Zap size={11} /> BLACKOUT
          </Btn>
        )}
      </div>
    </div>
  );
};

// ─── Reveal ───────────────────────────────────────────────────────────────────

const RevealPhase = ({ game }) => {
  const roundEntries = (game.revealedStats || []).filter((r) => r.round === game.round);

  return (
    <div className="p-6 space-y-5 max-w-xl mx-auto w-full">
      <div className="text-center">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="inline-block px-4 py-1 border border-yellow-700 bg-yellow-900/15 font-mono text-xs text-yellow-500 uppercase tracking-widest mb-2">
          REVEALING — {game.currentStatReveal || ''}
        </motion.div>
        <div className="mt-2">
          <PhaseTimer deadline={game.phaseDeadline} paused={game.paused} pausedRemaining={game.pausedRemaining} />
        </div>
      </div>
      <div className="space-y-1.5">
        {roundEntries.map((entry, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`flex items-start gap-4 p-3 border font-mono text-sm ${entry.isPropaganda ? 'border-yellow-800 bg-yellow-900/10' : 'border-gray-800 bg-gray-900/20'}`}>
            <span className="text-blue-400 w-28 shrink-0 truncate">{entry.playerName}</span>
            <span className="text-gray-300 flex-1 leading-snug">{entry.value}</span>
            {entry.isPropaganda && <span className="text-yellow-600 text-xs shrink-0">⚠ FAKE</span>}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ─── Discussion ───────────────────────────────────────────────────────────────

const DiscussionPhase = ({ game }) => (
  <div className="p-6 space-y-4 max-w-xl mx-auto w-full">
    <div className="text-center">
      <h2 className="font-mono text-2xl font-bold text-green-400">OPEN DISCUSSION</h2>
      <p className="font-mono text-xs text-gray-500 mt-1">
        Argue your case in the chat. Activate pre-vote powers from your card panel.
      </p>
      <div className="mt-3">
        <PhaseTimer deadline={game.phaseDeadline} paused={game.paused} pausedRemaining={game.pausedRemaining} />
      </div>
    </div>

    {/* Active pre-vote effects */}
    {(game.effects?.doubleVotePlayer || game.effects?.ghostedPlayer || game.effects?.systemBreachTarget) && (
      <div className="space-y-1">
        {game.effects.doubleVotePlayer && (
          <div className="border border-green-900/50 bg-green-950/20 px-3 py-2 font-mono text-xs text-green-600">
            ⚡ {game.players.find((p) => p.id === game.effects.doubleVotePlayer)?.name}'s vote will count twice.
          </div>
        )}
        {game.effects.ghostedPlayer && (
          <div className="border border-blue-900/50 bg-blue-950/20 px-3 py-2 font-mono text-xs text-blue-600">
            ⚡ {game.players.find((p) => p.id === game.effects.ghostedPlayer)?.name} is hidden from this vote.
          </div>
        )}
        {game.effects.systemBreachTarget && (
          <div className="border border-orange-900/50 bg-orange-950/20 px-3 py-2 font-mono text-xs text-orange-600">
            ⚡ {game.players.find((p) => p.id === game.effects.systemBreachTarget)?.name}'s vote is nullified.
          </div>
        )}
      </div>
    )}

    <div className="border border-gray-800 p-4 bg-gray-900/10 font-mono text-xs text-gray-600 text-center leading-relaxed">
      Make your case. Form alliances. The elimination vote starts when the timer expires.
    </div>
  </div>
);

// ─── Elimination vote ─────────────────────────────────────────────────────────

const ElimVotePhase = ({ game, myId, onVote }) => {
  const myVote = game.votes?.[myId];
  const totalVoters = game.players.filter((p) => !p.eliminated).length;
  const voteCount = Object.keys(game.votes || {}).length;
  const ghosted = game.effects?.ghostedPlayer;
  const nullified = game.effects?.systemBreachTarget === myId;

  const counts = {};
  for (const tid of Object.values(game.votes || {})) counts[tid] = (counts[tid] || 0) + 1;

  const voteable = game.players.filter(
    (p) => !p.eliminated && p.id !== myId && p.id !== ghosted
  );

  return (
    <div className="p-6 space-y-5 max-w-xl mx-auto w-full">
      <div className="text-center">
        <h2 className="font-mono text-2xl font-bold text-red-400"
          style={{ textShadow: '0 0 16px rgba(248,113,113,0.35)' }}>
          ELIMINATION VOTE
        </h2>
        <p className="font-mono text-xs text-gray-500 mt-1">Vote to remove a survivor from the bunker</p>
        <div className="mt-3">
          <PhaseTimer deadline={game.phaseDeadline} paused={game.paused} pausedRemaining={game.pausedRemaining} />
        </div>
      </div>

      {nullified && (
        <div className="border border-orange-800 bg-orange-900/10 p-2.5 font-mono text-xs text-orange-400 text-center">
          ⚡ SYSTEM BREACH — Your vote has been nullified this round.
        </div>
      )}
      {game.effects?.doubleVotePlayer === myId && (
        <div className="border border-green-800 bg-green-900/10 p-2.5 font-mono text-xs text-green-500 text-center">
          ⚡ DOUBLE VOTE — Your vote counts twice this round.
        </div>
      )}
      {ghosted === myId && (
        <div className="border border-blue-800 bg-blue-900/10 p-2.5 font-mono text-xs text-blue-400 text-center">
          ⚡ GHOST PROTOCOL — You are hidden from this vote. Others cannot vote for you.
        </div>
      )}

      <div className="space-y-2">
        {voteable.map((p) => {
          const isMyVote = myVote === p.id;
          const voteTotal = counts[p.id] || 0;
          return (
            <button key={p.id} onClick={() => !myVote && !nullified && onVote(p.id)}
              disabled={!!myVote || nullified}
              className={`w-full flex items-center gap-4 p-3 border font-mono text-sm text-left transition-all
                ${isMyVote ? 'border-red-500 bg-red-900/20 text-red-300'
                  : myVote || nullified ? 'border-gray-800 text-gray-600 cursor-not-allowed'
                  : 'border-gray-700 text-gray-300 hover:border-red-700 hover:bg-red-900/10 cursor-pointer'}`}>
              <span className="flex-1">{p.name}</span>
              {voteTotal > 0 && <span className="text-xs text-gray-600">{voteTotal} vote{voteTotal !== 1 ? 's' : ''}</span>}
              {isMyVote && <X size={13} className="text-red-400 shrink-0" />}
            </button>
          );
        })}
      </div>

      <p className="font-mono text-xs text-gray-600 text-center">{voteCount}/{totalVoters} voted</p>
    </div>
  );
};

// ─── Defense phase ────────────────────────────────────────────────────────────

const DefensePhase = ({ game, myId, onPowerActivate, onPeek, onPassDefense }) => {
  const hotSeatPlayer = game.players.find((p) => p.id === game.currentHotSeat);
  const isHotSeat = myId === game.currentHotSeat;
  const me = game.players.find((p) => p.id === myId);
  const myCard = me?.card;
  const powerUsed = me?.powerUsed;
  const [showPowerMenu, setShowPowerMenu] = useState(false);
  const [peekStat, setPeekStat] = useState(null);
  const [targetSelect, setTargetSelect] = useState(null);
  const [propagandaInput, setPropagandaInput] = useState({ stat: '', value: '' });

  const revealedCats = [...new Set((game.revealedStats || []).map((r) => r.stat))];
  const unrevealedCats = STAT_CATEGORIES.filter((c) => !revealedCats.includes(c));
  const activePlayers = game.players.filter((p) => !p.eliminated && p.id !== myId);
  const eliminated = game.players.filter((p) => p.eliminated);
  const isolated = game.effects?.isolatedPlayer === myId;
  const defenseComplete = game.defenseAction != null;

  const powerId = myCard?.specialPower?.id;
  const needsTarget = ['system_breach', 'data_leak', 'isolation_chamber', 'scapegoat', 'ghost_protocol', 'override_vote'].includes(powerId);
  const needsReviveTarget = powerId === 'evacuation_protocol';
  const needsPropaganda = powerId === 'propaganda';
  const noTarget = ['insider_info', 'double_vote', 'firewall', 'tribunal', 'bunker_extension'].includes(powerId);

  const voteCounts = Object.values(game.votes || {}).reduce((acc, t) => {
    acc[t] = (acc[t] || 0) + 1; return acc;
  }, {});

  return (
    <div className="p-5 space-y-5 max-w-xl mx-auto w-full">
      <div className="text-center">
        <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 border border-red-700 bg-red-900/15 font-mono text-xs text-red-400 uppercase tracking-widest mb-2">
          <Flame size={11} /> HOT SEAT — chain {game.hotSeatChain}/3
        </motion.div>
        <h2 className="font-mono text-xl font-bold text-red-400">{hotSeatPlayer?.name} is on trial</h2>
        <div className="mt-2">
          <PhaseTimer deadline={game.phaseDeadline} paused={game.paused} pausedRemaining={game.pausedRemaining} />
        </div>
      </div>

      {/* Vote summary */}
      <div className="border border-gray-800 bg-gray-900/20 p-3">
        <p className="font-mono text-xs text-gray-600 uppercase tracking-widest mb-2">Current votes</p>
        {Object.entries(voteCounts).sort(([, a], [, b]) => b - a).map(([pid, count]) => {
          const p = game.players.find((pl) => pl.id === pid);
          return (
            <div key={pid} className={`flex justify-between font-mono text-sm py-0.5 ${pid === game.currentHotSeat ? 'text-red-400' : 'text-gray-500'}`}>
              <span>{p?.name}</span>
              <span>{count} vote{count !== 1 ? 's' : ''}</span>
            </div>
          );
        })}
      </div>

      {isHotSeat && !defenseComplete && (
        <div className="space-y-3">
          <p className="font-mono text-sm text-yellow-400 text-center">Choose your action:</p>

          {/* Power activation */}
          {!powerUsed && !isolated && (
            <div>
              <Btn variant="solid" className="w-full" onClick={() => setShowPowerMenu((o) => !o)}>
                <Zap size={13} /> USE POWER: {myCard?.specialPower?.name}
              </Btn>
              <AnimatePresence>
                {showPowerMenu && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mt-2 border border-green-800 bg-gray-950 p-3 space-y-3">
                    <p className="font-mono text-xs text-gray-400 leading-snug">{myCard?.specialPower?.description}</p>

                    {/* No-target powers */}
                    {noTarget && (
                      <Btn variant="primary" className="w-full" onClick={() => { onPowerActivate({}); setShowPowerMenu(false); }}>
                        ACTIVATE
                      </Btn>
                    )}

                    {/* Powers needing a target from active players */}
                    {(needsTarget || needsReviveTarget) && (
                      <div className="space-y-1.5">
                        <p className="font-mono text-xs text-gray-600">Select target:</p>
                        {activePlayers.map((p) => (
                          <button key={p.id} onClick={() => { onPowerActivate({ targetId: p.id }); setShowPowerMenu(false); }}
                            className="w-full text-left px-3 py-2 border border-gray-700 font-mono text-sm text-gray-300 hover:border-green-600 hover:text-green-300 transition-colors">
                            {p.name}
                          </button>
                        ))}
                        {needsReviveTarget && eliminated.length > 0 && (
                          <>
                            <p className="font-mono text-xs text-gray-700 mt-2">Or revive an eliminated player:</p>
                            {eliminated.map((p) => (
                              <button key={p.id} onClick={() => { onPowerActivate({ targetId: p.id, revive: true }); setShowPowerMenu(false); }}
                                className="w-full text-left px-3 py-2 border border-gray-800 font-mono text-sm text-gray-600 hover:border-green-700 hover:text-green-400 transition-colors">
                                ↑ {p.name} (eliminated)
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}

                    {/* Propaganda */}
                    {needsPropaganda && (
                      <div className="space-y-2">
                        <p className="font-mono text-xs text-gray-600">Select target player:</p>
                        {activePlayers.map((p) => (
                          <button key={p.id} onClick={() => setTargetSelect(p.id)}
                            className={`w-full text-left px-3 py-2 border font-mono text-sm transition-colors ${targetSelect === p.id ? 'border-green-500 text-green-300' : 'border-gray-700 text-gray-300 hover:border-green-600 hover:text-green-300'}`}>
                            {p.name}
                          </button>
                        ))}
                        {targetSelect && (
                          <div className="space-y-2 mt-1">
                            <select value={propagandaInput.stat}
                              onChange={(e) => setPropagandaInput((s) => ({ ...s, stat: e.target.value }))}
                              className="w-full bg-gray-900 border border-gray-700 text-green-300 font-mono text-sm px-2 py-1.5 focus:outline-none">
                              <option value="">Select stat…</option>
                              {STAT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                            </select>
                            <input value={propagandaInput.value}
                              onChange={(e) => setPropagandaInput((s) => ({ ...s, value: e.target.value }))}
                              maxLength={80} placeholder="Fake value to display…"
                              className="w-full bg-gray-900 border border-gray-700 text-green-300 font-mono text-sm px-2 py-1.5 focus:outline-none" />
                            <Btn variant="primary" className="w-full"
                              disabled={!propagandaInput.stat || !propagandaInput.value}
                              onClick={() => { onPowerActivate({ targetId: targetSelect, ...propagandaInput }); setShowPowerMenu(false); }}>
                              PLANT FAKE STAT
                            </Btn>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {isolated && (
            <div className="border border-orange-800 bg-orange-900/10 p-2.5 font-mono text-xs text-orange-400 text-center">
              ⚡ ISOLATION CHAMBER — Your power is blocked this round.
            </div>
          )}

          {/* Peek unrevealed stat */}
          {unrevealedCats.length > 0 && (
            <div>
              <p className="font-mono text-xs text-gray-600 mb-2">Or peek at one of your unrevealed stats (private):</p>
              <div className="grid grid-cols-2 gap-1.5">
                {unrevealedCats.map((cat) => (
                  <button key={cat} onClick={() => { setPeekStat(cat); onPeek(cat); }}
                    className="px-3 py-2 border border-gray-700 font-mono text-xs text-gray-400 hover:border-blue-700 hover:text-blue-300 transition-colors text-left">
                    {cat}
                  </button>
                ))}
              </div>
              {peekStat && (
                <div className="mt-2 border border-blue-800 bg-blue-900/10 p-3 font-mono text-sm text-blue-300">
                  <span className="text-gray-500">{peekStat}: </span>
                  {getStatValue(myCard, peekStat)}
                </div>
              )}
            </div>
          )}

          <Btn variant="ghost" className="w-full" onClick={onPassDefense}>
            [ PASS — Do nothing ]
          </Btn>
        </div>
      )}

      {(defenseComplete || !isHotSeat) && (
        <div className="border border-gray-800 bg-gray-900/10 p-4 font-mono text-sm text-gray-500 text-center">
          {isHotSeat
            ? `Defense action: ${game.defenseAction}. Re-vote begins shortly.`
            : `${hotSeatPlayer?.name} is choosing… Re-vote begins shortly.`}
        </div>
      )}
    </div>
  );
};

// ─── Re-vote ──────────────────────────────────────────────────────────────────

const RevotePhase = ({ game, myId, onVote }) => {
  const myVote = game.revotes?.[myId];
  const totalVoters = game.players.filter((p) => !p.eliminated).length;
  const voteCount = Object.keys(game.revotes || {}).length;
  const ghosted = game.effects?.ghostedPlayer;
  const nullified = game.effects?.systemBreachTarget === myId;

  const counts = {};
  for (const tid of Object.values(game.revotes || {})) counts[tid] = (counts[tid] || 0) + 1;

  return (
    <div className="p-6 space-y-5 max-w-xl mx-auto w-full">
      <div className="text-center">
        <div className="font-mono text-xs text-red-700 uppercase tracking-widest mb-1">Re-vote</div>
        <h2 className="font-mono text-2xl font-bold text-red-400">FINAL VOTE</h2>
        <p className="font-mono text-xs text-gray-500 mt-1">
          Defense: <span className="text-green-400">{game.defenseAction || 'none'}</span>
        </p>
        <div className="mt-3">
          <PhaseTimer deadline={game.phaseDeadline} paused={game.paused} pausedRemaining={game.pausedRemaining} />
        </div>
      </div>

      {nullified && (
        <div className="border border-orange-800 bg-orange-900/10 p-2.5 font-mono text-xs text-orange-400 text-center">
          ⚡ Your vote is nullified this round.
        </div>
      )}

      <div className="space-y-2">
        {game.players
          .filter((p) => !p.eliminated && p.id !== myId && p.id !== ghosted)
          .map((p) => {
            const isMyVote = myVote === p.id;
            const voteTotal = counts[p.id] || 0;
            return (
              <button key={p.id} onClick={() => !myVote && !nullified && onVote(p.id)}
                disabled={!!myVote || nullified}
                className={`w-full flex items-center gap-4 p-3 border font-mono text-sm text-left transition-all
                  ${isMyVote ? 'border-red-500 bg-red-900/20 text-red-300'
                    : myVote || nullified ? 'border-gray-800 text-gray-600 cursor-not-allowed'
                    : 'border-gray-700 text-gray-300 hover:border-red-700 hover:bg-red-900/10 cursor-pointer'}`}>
                <span className="flex-1">{p.name}</span>
                {voteTotal > 0 && <span className="text-xs text-gray-600">{voteTotal}</span>}
                {isMyVote && <X size={13} className="text-red-400 shrink-0" />}
              </button>
            );
          })}
      </div>
      <p className="font-mono text-xs text-gray-600 text-center">{voteCount}/{totalVoters} voted</p>
    </div>
  );
};

// ─── Elimination reveal ───────────────────────────────────────────────────────

const EliminationRevealPhase = ({ game }) => {
  const eliminated = game.players.find((p) => p.id === game.lastEliminated);
  const card = eliminated?.card;

  return (
    <div className="p-6 space-y-5 max-w-xl mx-auto w-full">
      <div className="text-center">
        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}
          className="inline-flex items-center gap-2 font-mono text-xs text-red-500 uppercase tracking-widest">
          <Skull size={13} /> ELIMINATED
        </motion.div>
        <h2 className="font-mono text-3xl font-black text-red-400 mt-2">{eliminated?.name}</h2>
        <div className="mt-2">
          <PhaseTimer deadline={game.phaseDeadline} paused={game.paused} pausedRemaining={game.pausedRemaining} />
        </div>
      </div>

      {card && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="border border-red-900">
          <div className="px-4 py-2 bg-red-900/15 border-b border-red-900">
            <span className="font-mono text-xs text-red-400 uppercase tracking-widest">
              CLASSIFIED FILE — {eliminated?.name?.toUpperCase()}
            </span>
          </div>
          <div className="p-4 space-y-2">
            {[
              ['Profession', card.profession], ['Fact 1', card.fact1], ['Fact 2', card.fact2],
              ['Inventory', card.inventory], ['Phobia', card.phobia],
              ['Special Power', `${card.specialPower?.name}: ${card.specialPower?.description}`],
              ['Health', card.health], ['Age', String(card.age)], ['Gender', card.gender],
            ].map(([label, val]) => (
              <div key={label} className="grid grid-cols-[110px_1fr] gap-2 text-sm font-mono border-b border-gray-900 pb-1">
                <span className="text-gray-600 uppercase text-xs">{label}</span>
                <span className="text-gray-300 leading-tight">{val}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── Data Leak overlay ────────────────────────────────────────────────────────

const DataLeakOverlay = ({ targetPlayer, onClose }) => {
  if (!targetPlayer?.card) return null;
  const card = targetPlayer.card;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        className="w-full max-w-md border border-green-800 bg-gray-950">
        <div className="px-4 py-2 bg-green-900/15 border-b border-green-900 flex items-center justify-between">
          <span className="font-mono text-xs text-green-400 uppercase tracking-widest">
            ⚡ DATA LEAK — {targetPlayer.name}
          </span>
          <button onClick={onClose}><X size={13} className="text-gray-500 hover:text-white" /></button>
        </div>
        <div className="p-4 space-y-2">
          {[
            ['Profession', card.profession], ['Fact 1', card.fact1], ['Fact 2', card.fact2],
            ['Inventory', card.inventory], ['Phobia', card.phobia],
            ['Power', `${card.specialPower?.name}: ${card.specialPower?.description}`],
            ['Health', card.health], ['Age', String(card.age)], ['Gender', card.gender],
          ].map(([label, val]) => (
            <div key={label} className="grid grid-cols-[90px_1fr] gap-2 text-xs font-mono border-b border-gray-900 pb-1">
              <span className="text-gray-600 uppercase">{label}</span>
              <span className="text-gray-200 leading-tight">{val}</span>
            </div>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-gray-900">
          <p className="font-mono text-xs text-gray-700">Private — only visible to you.</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Game over ────────────────────────────────────────────────────────────────

const GameOverScreen = ({ game, myId }) => {
  const survivors = game.players.filter((p) => !p.eliminated);
  const eliminatedOrdered = [...(game.eliminationOrder || [])]
    .map((id) => game.players.find((p) => p.id === id))
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-950 p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-7">
        <div className="text-center">
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.4 }}>
            <Shield size={48} className="text-green-500 mx-auto mb-4"
              style={{ filter: 'drop-shadow(0 0 20px rgba(74,222,128,0.6))' }} />
          </motion.div>
          <h1 className="font-mono text-4xl font-black text-green-400 tracking-widest"
            style={{ textShadow: '0 0 30px rgba(74,222,128,0.4)' }}>BUNKER SEALED</h1>
          <p className="font-mono text-gray-500 mt-2">
            {survivors.length} survivor{survivors.length !== 1 ? 's' : ''} entered
          </p>
        </div>

        <div>
          <h2 className="font-mono text-xs text-green-700 uppercase tracking-widest mb-2">Survivors</h2>
          <div className="space-y-3">
            {survivors.map((p) => (
              <div key={p.id} className="border border-green-800 bg-green-900/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={14} className="text-green-500" />
                  <span className="font-mono font-bold text-green-300">{p.name}</span>
                  {p.id === myId && <span className="font-mono text-xs text-green-700">(you)</span>}
                </div>
                {p.card && (
                  <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                    <span className="text-gray-600">Profession:</span><span className="text-gray-300">{p.card.profession}</span>
                    <span className="text-gray-600">Power:</span><span className="text-gray-300">{p.card.specialPower?.name}</span>
                    <span className="text-gray-600">Age / Gender:</span><span className="text-gray-300">{p.card.age} · {p.card.gender}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {eliminatedOrdered.length > 0 && (
          <div>
            <h2 className="font-mono text-xs text-red-800 uppercase tracking-widest mb-2">Eliminated (in order)</h2>
            <div className="space-y-1.5">
              {eliminatedOrdered.map((p, i) => (
                <div key={p.id} className="border border-gray-800 bg-gray-900/10 p-3 flex items-center gap-3">
                  <span className="font-mono text-gray-700 text-xs w-4 shrink-0">{i + 1}</span>
                  <Skull size={11} className="text-red-900 shrink-0" />
                  <span className="font-mono text-sm text-gray-600 line-through">{p.name}</span>
                  <span className="font-mono text-xs text-gray-700 ml-auto">{p.card?.profession}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main BunkerGame ──────────────────────────────────────────────────────────

const BunkerGame = () => {
  const [myId] = useState(() => {
    let id = localStorage.getItem('bunkerPlayerId');
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('bunkerPlayerId', id);
    }
    return id;
  });

  const [game, setGame] = useState(null);
  const [gameCode, setGameCode] = useState(null);
  const [joinError, setJoinError] = useState('');
  const [dataLeakTarget, setDataLeakTarget] = useState(null);

  const gameRef = useRef(null);
  const phaseTimerRef = useRef(null);
  const unsubRef = useRef(null);

  // ── Firestore subscription ───────────────────────────────────────────────────
  useEffect(() => {
    if (!gameCode) return;
    const ref = doc(db, COLLECTION, gameCode);
    gameRef.current = ref;
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setGame(snap.data());
      } else {
        setJoinError('Game no longer exists.');
        setGameCode(null);
      }
    });
    unsubRef.current = unsub;
    return () => { unsub(); };
  }, [gameCode]);

  // ── Timer enforcement (host only, pause-aware) ───────────────────────────────
  useEffect(() => {
    if (!game || !gameCode) return;
    clearInterval(phaseTimerRef.current);

    const timed = ['card_phase', 'stat_vote', 'reveal', 'discussion', 'elim_vote', 'defense', 'revote', 'eliminated_reveal'];
    if (!timed.includes(game.phase)) return;
    if (game.hostId !== myId) return;

    phaseTimerRef.current = setInterval(async () => {
      if (game.paused) return;
      if (!game.phaseDeadline || Date.now() < game.phaseDeadline) return;
      clearInterval(phaseTimerRef.current);
      await advancePhase(game);
    }, 400);

    return () => clearInterval(phaseTimerRef.current);
  }, [game?.phase, game?.phaseDeadline, game?.hostId, game?.paused, myId, gameCode]);

  // ── Host: advance defense immediately when hot seat player acts ──────────────
  useEffect(() => {
    if (!game || game.phase !== 'defense' || game.hostId !== myId) return;
    if (game.defenseAction == null) return;
    advancePhase(game);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.defenseAction]);

  // ── Shared Firestore write ───────────────────────────────────────────────────
  const updateGame = useCallback(async (updates) => {
    if (!gameRef.current) return;
    await updateDoc(gameRef.current, { ...updates, lastUpdate: Date.now() });
  }, []);

  const appendChat = useCallback(async (msg) => {
    if (!gameRef.current) return;
    const snap = await getDoc(gameRef.current);
    const current = snap.data()?.chat || [];
    await updateDoc(gameRef.current, { chat: [...current, msg].slice(-MAX_CHAT), lastUpdate: Date.now() });
  }, []);

  // ── Phase advancement ────────────────────────────────────────────────────────
  const advancePhase = useCallback(async (g) => {
    if (!g) return;
    const ref = doc(db, COLLECTION, g.code);
    const activePlayers = g.players.filter((p) => !p.eliminated);
    const activeIds = activePlayers.map((p) => p.id);
    const chat = g.chat || [];

    if (g.phase === 'card_phase') {
      await updateDoc(ref, {
        phase: 'stat_vote', round: 1,
        phaseDeadline: Date.now() + phaseTimers.stat_vote,
        statVotes: {}, votes: {}, revotes: {},
        hotSeatChain: 0, currentHotSeat: null,
        defenseAction: null, effects: {},
        lastUpdate: Date.now(),
      });
      return;
    }

    if (g.phase === 'stat_vote') {
      if (g.effects?.blackoutUsed) {
        const msgs = [...chat, sysMsg('⚡ BLACKOUT — stat reveal cancelled this round.')];
        await updateDoc(ref, { phase: 'discussion', phaseDeadline: Date.now() + phaseTimers.discussion, chat: msgs.slice(-MAX_CHAT), lastUpdate: Date.now() });
        return;
      }
      const revealedCats = [...new Set((g.revealedStats || []).map((r) => r.stat))];
      const winner = tallyStatVotes(g.statVotes, revealedCats)
        || STAT_CATEGORIES.find((c) => !revealedCats.includes(c));

      if (!winner) {
        await updateDoc(ref, { phase: 'discussion', phaseDeadline: Date.now() + phaseTimers.discussion, lastUpdate: Date.now() });
        return;
      }

      const entries = activePlayers.map((p) => ({
        playerName: p.name, playerId: p.id,
        stat: winner, value: getStatValue(p.card, winner),
        round: g.round, isPropaganda: false,
      }));

      // Apply propaganda for this stat
      if (g.effects?.propagandaEntry?.stat === winner) {
        const pe = g.effects.propagandaEntry;
        const target = activePlayers.find((p) => p.id === pe.targetId);
        if (target) entries.push({ playerName: target.name, playerId: target.id, stat: winner, value: pe.value, round: g.round, isPropaganda: true });
      }

      // Apply Special Power reveal: respect powerVisibility
      const finalEntries = winner === 'Special Power'
        ? entries.map((e) => {
            const pv = g.powerVisibility?.[e.playerId];
            return pv ? e : { ...e, value: '[CLASSIFIED]' };
          })
        : entries;

      const newStats = [...(g.revealedStats || []), ...finalEntries];
      const msgs = [...chat, sysMsg(`REVEAL: ${winner} shown for all survivors.`)];
      await updateDoc(ref, {
        phase: 'reveal', phaseDeadline: Date.now() + phaseTimers.reveal,
        revealedStats: newStats, currentStatReveal: winner,
        chat: msgs.slice(-MAX_CHAT), lastUpdate: Date.now(),
      });
      return;
    }

    if (g.phase === 'reveal') {
      // Insider Info: second stat reveal
      if (g.effects?.insiderInfoPending) {
        const revealedCats = [...new Set((g.revealedStats || []).map((r) => r.stat))];
        const second = STAT_CATEGORIES.find((c) => !revealedCats.includes(c));
        if (second) {
          const entries = activePlayers.map((p) => ({
            playerName: p.name, playerId: p.id,
            stat: second, value: getStatValue(p.card, second),
            round: g.round, isPropaganda: false,
          }));
          const newStats = [...(g.revealedStats || []), ...entries];
          const msgs = [...chat, sysMsg(`INSIDER INFO: ${second} also revealed!`)];
          await updateDoc(ref, {
            phase: 'discussion', phaseDeadline: Date.now() + phaseTimers.discussion,
            revealedStats: newStats, 'effects.insiderInfoPending': false,
            chat: msgs.slice(-MAX_CHAT), lastUpdate: Date.now(),
          });
          return;
        }
      }
      await updateDoc(ref, { phase: 'discussion', phaseDeadline: Date.now() + phaseTimers.discussion, lastUpdate: Date.now() });
      return;
    }

    if (g.phase === 'discussion') {
      await updateDoc(ref, { phase: 'elim_vote', phaseDeadline: Date.now() + phaseTimers.elim_vote, votes: {}, lastUpdate: Date.now() });
      return;
    }

    if (g.phase === 'elim_vote') {
      const { topPlayerId } = tallyVotes(g.votes || {}, activeIds, g.effects || {});
      const hotSeat = topPlayerId || activeIds[0];
      const msgs = [...chat, sysMsg(`${g.players.find((p) => p.id === hotSeat)?.name} enters the hot seat.`)];
      await updateDoc(ref, {
        phase: 'defense', phaseDeadline: Date.now() + phaseTimers.defense,
        currentHotSeat: hotSeat, hotSeatChain: 1,
        hotSeatHistoryThisRound: [hotSeat], defenseAction: null, revotes: {},
        chat: msgs.slice(-MAX_CHAT), lastUpdate: Date.now(),
      });
      return;
    }

    if (g.phase === 'defense') {
      // Override Vote: defenseAction is 'power' but target is set — detect by effects
      if (g.effects?.overrideVoteTarget) {
        await eliminatePlayer(g, g.effects.overrideVoteTarget, ref);
        return;
      }
      await updateDoc(ref, {
        phase: 'revote', phaseDeadline: Date.now() + phaseTimers.revote, revotes: {}, lastUpdate: Date.now(),
      });
      return;
    }

    if (g.phase === 'revote') {
      const revoteEffects = { ...g.effects };
      const { topPlayerId: revoteTop } = tallyVotes(g.revotes || {}, activeIds, revoteEffects);
      const toElim = revoteTop || g.currentHotSeat;
      const elimPlayer = g.players.find((p) => p.id === toElim);

      // Tribunal: if eliminated player has tribunal and hasn't used it, force one more revote
      if (elimPlayer?.card?.specialPower?.id === 'tribunal' && !elimPlayer?.powerUsed && !g.effects?.tribunalUsed) {
        const updPlayers = g.players.map((p) => p.id === toElim ? { ...p, powerUsed: true } : p);
        const msgs = [...chat, sysMsg(`⚖ TRIBUNAL invoked by ${elimPlayer.name}! One final re-vote.`)];
        await updateDoc(ref, {
          phase: 'revote', phaseDeadline: Date.now() + phaseTimers.revote,
          revotes: {}, players: updPlayers,
          'effects.tribunalUsed': true, 'effects.firewallPlayer': null,
          chat: msgs.slice(-MAX_CHAT), lastUpdate: Date.now(),
        });
        return;
      }

      const isSamePlayer = toElim === g.currentHotSeat;
      if (!isSamePlayer && g.hotSeatChain < 3) {
        // Chain to new hot seat
        const history = [...(g.hotSeatHistoryThisRound || []), toElim];
        const msgs = [...chat, sysMsg(`${g.players.find((p) => p.id === toElim)?.name} enters the hot seat! Chain ${g.hotSeatChain + 1}/3.`)];
        await updateDoc(ref, {
          phase: 'defense', phaseDeadline: Date.now() + phaseTimers.defense,
          currentHotSeat: toElim, hotSeatChain: g.hotSeatChain + 1,
          hotSeatHistoryThisRound: history, defenseAction: null, revotes: {},
          chat: msgs.slice(-MAX_CHAT), lastUpdate: Date.now(),
        });
      } else {
        await eliminatePlayer(g, toElim, ref);
      }
      return;
    }

    if (g.phase === 'eliminated_reveal') {
      const remaining = g.players.filter((p) => !p.eliminated).length;
      if (remaining <= g.settings.survivors) {
        const msgs = [...chat, sysMsg('BUNKER SEALED. The survivors have been chosen.')];
        await updateDoc(ref, { phase: 'game_over', phaseDeadline: null, chat: msgs.slice(-MAX_CHAT), lastUpdate: Date.now() });
      } else {
        const msgs = [...chat, sysMsg(`Round ${g.round + 1} begins.`)];
        await updateDoc(ref, {
          phase: 'stat_vote', phaseDeadline: Date.now() + phaseTimers.stat_vote,
          round: (g.round || 1) + 1, statVotes: {}, votes: {}, revotes: {},
          hotSeatChain: 0, currentHotSeat: null, defenseAction: null, effects: {},
          chat: msgs.slice(-MAX_CHAT), lastUpdate: Date.now(),
        });
      }
    }
  }, []);

  const eliminatePlayer = async (g, playerId, ref) => {
    const player = g.players.find((p) => p.id === playerId);
    const updPlayers = g.players.map((p) => p.id === playerId ? { ...p, eliminated: true } : p);
    const newOrder = [...(g.eliminationOrder || []), playerId];
    const msgs = [...(g.chat || []), sysMsg(`${player?.name} has been eliminated.`)];
    await updateDoc(ref, {
      phase: 'eliminated_reveal', phaseDeadline: Date.now() + phaseTimers.eliminated_reveal,
      players: updPlayers, eliminationOrder: newOrder, lastEliminated: playerId,
      chat: msgs.slice(-MAX_CHAT), lastUpdate: Date.now(),
    });
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCreate = useCallback(async (playerName, settings) => {
    const code = generateCode();
    const state = {
      code, hostId: myId, settings,
      players: [{ id: myId, name: playerName, eliminated: false, card: null, ready: false, powerUsed: false }],
      phase: 'lobby', phaseDeadline: null, round: 0,
      revealedStats: [], statVotes: {}, votes: {}, revotes: {},
      currentHotSeat: null, hotSeatChain: 0, hotSeatHistoryThisRound: [],
      chat: [sysMsg(`${playerName} created the game.`)],
      eliminationOrder: [], lastEliminated: null, currentStatReveal: null,
      effects: {}, defenseAction: null, paused: false, pausedRemaining: null,
      powerVisibility: {}, createdAt: Date.now(), lastUpdate: Date.now(),
    };
    await setDoc(doc(db, COLLECTION, code), state);
    setGameCode(code);
  }, [myId]);

  const handleJoin = useCallback(async (playerName, code) => {
    const ref = doc(db, COLLECTION, code);
    const snap = await getDoc(ref);
    if (!snap.exists()) { setJoinError('Game not found. Check the code and try again.'); return; }
    const g = snap.data();
    if (g.phase !== 'lobby') { setJoinError('This game has already started.'); return; }
    if (g.players.length >= g.settings.total) { setJoinError('The bunker is full.'); return; }
    if (g.players.find((p) => p.id === myId)) { setGameCode(code); return; }
    const newPlayer = { id: myId, name: playerName, eliminated: false, card: null, ready: false, powerUsed: false };
    const chatMsg = sysMsg(`${playerName} entered the bunker.`);
    await updateDoc(ref, { players: arrayUnion(newPlayer), chat: arrayUnion(chatMsg), lastUpdate: Date.now() });
    setGameCode(code);
  }, [myId]);

  const handleLobbyReady = useCallback(async () => {
    if (!game) return;
    const updated = game.players.map((p) => p.id === myId ? { ...p, ready: true } : p);
    await updateDoc(gameRef.current, { players: updated, lastUpdate: Date.now() });
  }, [game, myId]);

  const handleLobbyKick = useCallback(async (targetId) => {
    if (!game) return;
    const updated = game.players.filter((p) => p.id !== targetId);
    await updateDoc(gameRef.current, { players: updated, lastUpdate: Date.now() });
  }, [game]);

  const handleKickInGame = useCallback(async (targetId) => {
    if (!game || game.hostId !== myId) return;
    const ref = gameRef.current;
    const player = game.players.find((p) => p.id === targetId);
    if (!player || player.eliminated) return;

    const updPlayers = game.players.map((p) => p.id === targetId ? { ...p, eliminated: true } : p);
    const newOrder = [...(game.eliminationOrder || []), targetId];
    const msgs = [...(game.chat || []), sysMsg(`[HOST] ${player.name} has been removed from the game.`)];

    // Check win condition
    const remaining = updPlayers.filter((p) => !p.eliminated).length;
    if (remaining <= game.settings.survivors) {
      await updateDoc(ref, {
        players: updPlayers, eliminationOrder: newOrder,
        phase: 'game_over', phaseDeadline: null,
        chat: [...msgs, sysMsg('BUNKER SEALED.')].slice(-MAX_CHAT),
        lastUpdate: Date.now(),
      });
      return;
    }

    // If kicked player is in hot seat, reset to next round
    if (game.currentHotSeat === targetId) {
      await updateDoc(ref, {
        players: updPlayers, eliminationOrder: newOrder,
        phase: 'stat_vote', phaseDeadline: Date.now() + phaseTimers.stat_vote,
        round: (game.round || 1) + 1, statVotes: {}, votes: {}, revotes: {},
        hotSeatChain: 0, currentHotSeat: null, defenseAction: null, effects: {},
        chat: msgs.slice(-MAX_CHAT), lastUpdate: Date.now(),
      });
    } else {
      await updateDoc(ref, {
        players: updPlayers, eliminationOrder: newOrder,
        chat: msgs.slice(-MAX_CHAT), lastUpdate: Date.now(),
      });
    }
  }, [game, myId]);

  const handleStart = useCallback(async () => {
    if (!game) return;
    const cards = generateAllCards(game.players.length);
    const updPlayers = game.players.map((p, i) => ({ ...p, card: cards[i], ready: false }));
    // Initialize power visibility: all hidden by default
    const powerVisibility = {};
    updPlayers.forEach((p) => { powerVisibility[p.id] = false; });
    const msgs = [...(game.chat || []), sysMsg('Game started. Read your cards carefully.')];
    await updateDoc(gameRef.current, {
      players: updPlayers, phase: 'card_phase',
      phaseDeadline: Date.now() + phaseTimers.card_phase,
      round: 0, powerVisibility,
      chat: msgs.slice(-MAX_CHAT), lastUpdate: Date.now(),
    });
  }, [game]);

  const handleCardReady = useCallback(async () => {
    if (!game) return;
    const updated = game.players.map((p) => p.id === myId ? { ...p, ready: true } : p);
    await updateDoc(gameRef.current, { players: updated, lastUpdate: Date.now() });
    if (game.hostId === myId && updated.every((p) => p.ready)) {
      await advancePhase({ ...game, players: updated, phase: 'card_phase' });
    }
  }, [game, myId, advancePhase]);

  const handleStatVote = useCallback(async (category) => {
    if (!game || game.statVotes?.[myId]) return;
    const newVotes = { ...(game.statVotes || {}), [myId]: category };
    const active = game.players.filter((p) => !p.eliminated);
    await updateDoc(gameRef.current, { statVotes: newVotes, lastUpdate: Date.now() });
    if (game.hostId === myId && Object.keys(newVotes).length >= active.length) {
      setTimeout(() => advancePhase({ ...game, statVotes: newVotes }), 400);
    }
  }, [game, myId, advancePhase]);

  const handleElimVote = useCallback(async (targetId) => {
    if (!game || game.votes?.[myId]) return;
    const newVotes = { ...(game.votes || {}), [myId]: targetId };
    const active = game.players.filter((p) => !p.eliminated);
    await updateDoc(gameRef.current, { votes: newVotes, lastUpdate: Date.now() });
    if (game.hostId === myId && Object.keys(newVotes).length >= active.length) {
      setTimeout(() => advancePhase({ ...game, votes: newVotes }), 400);
    }
  }, [game, myId, advancePhase]);

  const handleRevote = useCallback(async (targetId) => {
    if (!game || game.revotes?.[myId]) return;
    const newRevotes = { ...(game.revotes || {}), [myId]: targetId };
    const active = game.players.filter((p) => !p.eliminated);
    await updateDoc(gameRef.current, { revotes: newRevotes, lastUpdate: Date.now() });
    if (game.hostId === myId && Object.keys(newRevotes).length >= active.length) {
      setTimeout(() => advancePhase({ ...game, revotes: newRevotes }), 400);
    }
  }, [game, myId, advancePhase]);

  const handleDefenseAction = useCallback(async (action, extra = {}) => {
    if (!game || game.defenseAction != null) return;
    const me = game.players.find((p) => p.id === myId);
    if (!me) return;

    const updates = { defenseAction: action, lastUpdate: Date.now() };
    const msgs = [...(game.chat || [])];
    const effects = { ...(game.effects || {}) };

    if (action === 'power') {
      const power = me.card?.specialPower;
      updates.players = game.players.map((p) => p.id === myId ? { ...p, powerUsed: true } : p);
      msgs.push(sysMsg(`${me.name} activated: ${power?.name}!`));

      switch (power?.id) {
        case 'system_breach':
          effects.systemBreachTarget = extra.targetId;
          msgs.push(sysMsg(`${game.players.find((p) => p.id === extra.targetId)?.name}'s revote is nullified.`));
          break;
        case 'firewall':
          effects.firewallPlayer = myId;
          msgs.push(sysMsg(`${me.name} is immune. Votes shift to second-most-voted.`));
          break;
        case 'data_leak':
          effects.dataLeakActivator = myId;
          effects.dataLeakTarget = extra.targetId;
          break;
        case 'propaganda':
          effects.propagandaEntry = { targetId: extra.targetId, stat: extra.stat, value: extra.value };
          msgs.push(sysMsg(`${me.name} planted a fake stat entry.`));
          break;
        case 'double_vote':
          effects.doubleVotePlayer = myId;
          msgs.push(sysMsg(`${me.name}'s vote counts twice.`));
          break;
        case 'evacuation_protocol':
          if (extra.revive) {
            updates.players = game.players.map((p) =>
              p.id === extra.targetId ? { ...p, eliminated: false, powerUsed: true }
              : p.id === myId ? { ...p, powerUsed: true } : p
            );
            msgs.push(sysMsg(`${game.players.find((p) => p.id === extra.targetId)?.name} has been revived!`));
          } else {
            updates.players = game.players.map((p) => p.id === myId ? { ...p, powerUsed: true } : p);
          }
          break;
        case 'isolation_chamber':
          effects.isolatedPlayer = extra.targetId;
          msgs.push(sysMsg(`${game.players.find((p) => p.id === extra.targetId)?.name}'s power is blocked.`));
          break;
        case 'scapegoat':
          effects.scapegoat = { fromId: myId, toId: extra.targetId };
          msgs.push(sysMsg(`${me.name} transferred all votes to ${game.players.find((p) => p.id === extra.targetId)?.name}.`));
          break;
        case 'insider_info':
          effects.insiderInfoPending = true;
          msgs.push(sysMsg(`${me.name} forced an extra stat reveal!`));
          break;
        case 'ghost_protocol':
          effects.ghostedPlayer = myId;
          msgs.push(sysMsg(`${me.name} is hidden from the revote.`));
          break;
        case 'blackout':
          effects.blackoutUsed = true;
          msgs.push(sysMsg(`${me.name} activated BLACKOUT.`));
          break;
        case 'tribunal':
          effects.tribunalPending = myId;
          msgs.push(sysMsg(`${me.name} invoked TRIBUNAL — mandatory re-vote!`));
          break;
        case 'bunker_extension':
          const newS = Math.min(game.settings.survivors + 1, game.players.filter((p) => !p.eliminated).length - 1);
          updates.settings = { ...game.settings, survivors: newS };
          msgs.push(sysMsg(`${me.name} extended the bunker! Survivors: ${game.settings.survivors} → ${newS}.`));
          break;
        case 'override_vote':
          effects.overrideVoteTarget = extra.targetId;
          msgs.push(sysMsg(`${me.name} used OVERRIDE VOTE — ${game.players.find((p) => p.id === extra.targetId)?.name} is being eliminated!`));
          break;
      }

      updates.effects = effects;
    }
    // 'peek' and 'none' need no extra processing

    updates.chat = msgs.slice(-MAX_CHAT);
    await updateDoc(gameRef.current, updates);

    // Show Data Leak overlay locally
    if (action === 'power' && me?.card?.specialPower?.id === 'data_leak' && extra.targetId) {
      setDataLeakTarget(game.players.find((p) => p.id === extra.targetId));
    }
  }, [game, myId]);

  const handlePassDefense = useCallback(async () => {
    if (!game || game.defenseAction != null) return;
    await updateDoc(gameRef.current, { defenseAction: 'none', lastUpdate: Date.now() });
  }, [game]);

  const handleBlackout = useCallback(async () => {
    if (!game) return;
    const me = game.players.find((p) => p.id === myId);
    if (!me || me.powerUsed) return;
    const updPlayers = game.players.map((p) => p.id === myId ? { ...p, powerUsed: true } : p);
    const effects = { ...(game.effects || {}), blackoutUsed: true };
    const msgs = [...(game.chat || []), sysMsg(`${me.name} activated BLACKOUT — stat reveal cancelled!`)];
    await updateDoc(gameRef.current, {
      players: updPlayers, effects,
      chat: msgs.slice(-MAX_CHAT), lastUpdate: Date.now(),
    });
    if (game.hostId === myId) {
      setTimeout(() => advancePhase({ ...game, effects, players: updPlayers }), 400);
    }
  }, [game, myId, advancePhase]);

  // Quick-activate for discussion-phase powers
  const handleQuickActivate = useCallback(async (powerId, extra = {}) => {
    if (!game) return;
    const me = game.players.find((p) => p.id === myId);
    if (!me || me.powerUsed || game.effects?.isolatedPlayer === myId) return;

    const updPlayers = game.players.map((p) => p.id === myId ? { ...p, powerUsed: true } : p);
    const effects = { ...(game.effects || {}) };
    const msgs = [...(game.chat || [])];

    msgs.push(sysMsg(`${me.name} activated: ${me.card?.specialPower?.name}!`));

    switch (powerId) {
      case 'double_vote':
        effects.doubleVotePlayer = myId;
        msgs.push(sysMsg(`${me.name}'s vote will count twice this round.`));
        break;
      case 'ghost_protocol':
        effects.ghostedPlayer = myId;
        msgs.push(sysMsg(`${me.name} is hidden from the upcoming vote.`));
        break;
      case 'system_breach':
        effects.systemBreachTarget = extra.targetId;
        msgs.push(sysMsg(`${game.players.find((p) => p.id === extra.targetId)?.name}'s upcoming vote is nullified.`));
        break;
    }

    await updateDoc(gameRef.current, {
      players: updPlayers, effects,
      chat: msgs.slice(-MAX_CHAT), lastUpdate: Date.now(),
    });
  }, [game, myId]);

  const handlePause = useCallback(async () => {
    if (!game || !gameRef.current) return;
    const remaining = Math.max(0, (game.phaseDeadline || Date.now()) - Date.now());
    await updateDoc(gameRef.current, { paused: true, pausedRemaining: remaining, lastUpdate: Date.now() });
  }, [game]);

  const handleResume = useCallback(async () => {
    if (!game || !gameRef.current) return;
    await updateDoc(gameRef.current, {
      paused: false,
      phaseDeadline: Date.now() + (game.pausedRemaining || 0),
      pausedRemaining: null,
      lastUpdate: Date.now(),
    });
  }, [game]);

  const handleUpdateSurvivors = useCallback(async (newCount) => {
    if (!game || !gameRef.current) return;
    const newSettings = { ...game.settings, survivors: newCount };
    const msgs = [...(game.chat || []), sysMsg(`[HOST] Survivor count updated to ${newCount}.`)];
    await updateDoc(gameRef.current, { settings: newSettings, chat: msgs.slice(-MAX_CHAT), lastUpdate: Date.now() });

    // Check if game is already over with new count
    if (game.phase !== 'lobby' && game.phase !== 'card_phase' && game.phase !== 'game_over') {
      const remaining = game.players.filter((p) => !p.eliminated).length;
      if (remaining <= newCount && game.hostId === myId) {
        await updateDoc(gameRef.current, {
          phase: 'game_over', phaseDeadline: null,
          chat: [...msgs, sysMsg('BUNKER SEALED.')].slice(-MAX_CHAT),
          lastUpdate: Date.now(),
        });
      }
    }
  }, [game, myId]);

  const handleTogglePowerVisibility = useCallback(async () => {
    if (!game || !gameRef.current) return;
    const current = game.powerVisibility?.[myId] ?? false;
    await updateDoc(gameRef.current, {
      [`powerVisibility.${myId}`]: !current,
      lastUpdate: Date.now(),
    });
  }, [game, myId]);

  const handleSendChat = useCallback(async (text) => {
    if (!game) return;
    const me = game.players.find((p) => p.id === myId);
    if (!me) return;
    const msg = { id: generatePlayerId(), author: me.name, authorId: myId, text, ts: Date.now(), isSystem: false };
    await appendChat(msg);
  }, [game, myId, appendChat]);

  const handleLeave = useCallback(() => {
    if (unsubRef.current) unsubRef.current();
    setGame(null);
    setGameCode(null);
  }, []);

  // ── Data Leak overlay trigger ─────────────────────────────────────────────────
  useEffect(() => {
    if (!game?.effects?.dataLeakActivator || game.effects.dataLeakActivator !== myId) return;
    if (dataLeakTarget) return;
    const target = game.players.find((p) => p.id === game.effects.dataLeakTarget);
    if (target) setDataLeakTarget(target);
  }, [game?.effects?.dataLeakActivator, game?.effects?.dataLeakTarget, myId]);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const me = game?.players.find((p) => p.id === myId);
  const myCard = me?.card || null;
  const powerUsed = me?.powerUsed || false;
  const powerVisible = game?.powerVisibility?.[myId] ?? false;

  // ── Render ────────────────────────────────────────────────────────────────────

  if (!gameCode || !game) {
    return <EntryScreen onCreate={handleCreate} onJoin={handleJoin} error={joinError} />;
  }

  if (game.phase === 'lobby') {
    return (
      <LobbyScreen game={game} myId={myId}
        onReady={handleLobbyReady} onKick={handleLobbyKick}
        onStart={handleStart} onLeave={handleLeave} />
    );
  }

  if (game.phase === 'card_phase') {
    return <CardPhaseScreen game={game} myId={myId} onReady={handleCardReady} />;
  }

  if (game.phase === 'game_over') {
    return <GameOverScreen game={game} myId={myId} />;
  }

  const phaseContent = () => {
    switch (game.phase) {
      case 'stat_vote':
        return <StatVotePhase game={game} myId={myId} onVote={handleStatVote} onBlackout={handleBlackout} />;
      case 'reveal':
        return <RevealPhase game={game} />;
      case 'discussion':
        return <DiscussionPhase game={game} />;
      case 'elim_vote':
        return <ElimVotePhase game={game} myId={myId} onVote={handleElimVote} />;
      case 'defense':
        return (
          <DefensePhase game={game} myId={myId}
            onPowerActivate={(extra) => handleDefenseAction('power', extra)}
            onPeek={(cat) => handleDefenseAction('peek', { cat })}
            onPassDefense={handlePassDefense} />
        );
      case 'revote':
        return <RevotePhase game={game} myId={myId} onVote={handleRevote} />;
      case 'eliminated_reveal':
        return <EliminationRevealPhase game={game} />;
      default:
        return <div className="p-8 font-mono text-gray-600 text-center">{game.phase}</div>;
    }
  };

  return (
    <>
      <GameLayout
        game={game} myId={myId} myCard={myCard}
        powerUsed={powerUsed} powerVisible={powerVisible}
        onSendChat={handleSendChat}
        onTogglePowerVisibility={handleTogglePowerVisibility}
        onKick={handleKickInGame}
        onPause={handlePause} onResume={handleResume}
        onUpdateSurvivors={handleUpdateSurvivors}
        onQuickActivate={handleQuickActivate}
      >
        {phaseContent()}
      </GameLayout>

      <AnimatePresence>
        {dataLeakTarget && (
          <DataLeakOverlay targetPlayer={dataLeakTarget} onClose={() => setDataLeakTarget(null)} />
        )}
      </AnimatePresence>
    </>
  );
};

export default BunkerGame;
