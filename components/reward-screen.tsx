'use client';
import { useEffect, useRef, type CSSProperties } from 'react';
import { ArrowUpRight, RotateCcw, Shield, Heart, Zap, Crosshair, Sparkles, Flame, Snowflake, Orbit, Move, TrendingUp, Dice5 } from 'lucide-react';
import type { GameSnapshot } from '@/lib/game-model';
import { RARITY_COLOR, getWeapon, type Reward, type WeaponId } from '@/lib/roguelike';

export function WeaponDiagram({ id, color }: { id: WeaponId; color: string }) {
  const w = getWeapon(id), count = Math.min(12, w.pellets);
  return <svg viewBox="0 0 200 76" className="weapon-diagram" aria-hidden="true">
    <path d="M0 38H200M100 0V76" stroke="currentColor" opacity=".07"/>
    {id === 'nova' ? Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return <path key={i} d={`M${100 + Math.cos(a) * 12} ${38 + Math.sin(a) * 12}L${100 + Math.cos(a) * 32} ${38 + Math.sin(a) * 32}`} stroke={color} strokeWidth="2"/>; }) : id === 'tesla' ? <path d="M25 38 64 38 76 21 91 53 108 25 123 40 157 17 173 30" fill="none" stroke={color} strokeWidth="2"/> : id === 'ricochet' ? <path d="M24 38 76 10 130 65 180 35" fill="none" stroke={color} strokeWidth="2"/> : id === 'seeker' ? <><path d="M25 38Q105 -3 165 22M25 38Q105 79 165 54" fill="none" stroke={color} strokeWidth="2"/><circle cx="168" cy="38" r="7" stroke={color} fill="none" strokeDasharray="3 3"/></> : Array.from({ length: count }, (_, i) => { const y = count === 1 ? 38 : 10 + i / (count - 1) * 56; return <g key={i}><path d={`M30 38L155 ${y}`} stroke={color} opacity=".25"/><path d={`M${id === 'rail' ? 35 : 126} ${id === 'rail' ? 38 : 38 + (y - 38) * .77}L156 ${y}`} stroke={color} strokeWidth={id === 'mortar' ? 7 : id === 'flame' ? 5 : 2.5} strokeLinecap="round"/>{id === 'mortar' && <circle cx="164" cy="38" r="20" fill="none" stroke={color} opacity=".4" strokeDasharray="4 4"/>}</g>; })}
    <path d="M24 32 35 38 24 44 27 38Z" stroke={color} fill="none" strokeWidth="1.5"/>
  </svg>;
}
function RewardIcon({ reward }: { reward: Reward }) {
  const Icon = reward.relicId === 'hull' ? Heart : reward.relicId === 'reroll' ? Dice5 : ['DEFENSE','SUPPLY'].includes(reward.category) ? Shield : reward.category === 'FIRE' ? Flame : reward.category === 'FROST' ? Snowflake : reward.category === 'ELECTRIC' ? Zap : reward.category === 'ORBITAL' ? Orbit : reward.category === 'MOBILITY' ? Move : reward.type === 'upgrade' ? TrendingUp : reward.category === 'FORTUNE' ? Sparkles : Crosshair;
  return <Icon size={36} strokeWidth={1.3}/>;
}
export function RewardScreen({ game, onChoose, onReroll }: { game: GameSnapshot; onChoose: (id: string) => void; onReroll: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [game.wave]);
  return <section className="reward-screen" aria-label="Choose your wave reward">
    <div className="reward-heading"><div><div className="eyebrow mint">WAVE {String(game.wave).padStart(2, '0')} CLEARED</div><h2 ref={heading} tabIndex={-1}>{game.wave === 1 ? 'Choose your weapon.' : 'Choose your next edge.'}</h2><p>{game.wave === 1 ? 'Three weapons. Ten possibilities. This is where your build begins.' : 'Take one reward. Everything you collect lasts for this run.'}</p></div><div className="draft-badge"><Sparkles size={16}/><span>CHOOSE<br/><b>1 OF 3</b></span></div></div>
    <div className="reward-cards" aria-label="Three reward choices">
      {game.rewards.map((reward, i) => <button key={reward.id} className={`reward-card ${reward.type}`} style={{ '--rarity': RARITY_COLOR[reward.rarity] } as CSSProperties} onClick={() => onChoose(reward.id)} aria-label={`Choose ${reward.rarity} ${reward.name}. ${reward.description}`}>
        <div className="card-topline"><span className="rarity"><i/>{reward.rarity}</span><kbd>{i + 1}</kbd></div>
        <div className="reward-visual">{reward.type === 'weapon' ? <WeaponDiagram id={reward.weaponId!} color={RARITY_COLOR[reward.rarity]}/> : <RewardIcon reward={reward}/>}</div>
        <span className="reward-category">{reward.category}</span><h3>{reward.name}</h3><p>{reward.description}</p>
        <div className="card-choose">{reward.type === 'weapon' ? `EQUIP · LEVEL ${reward.amount}` : reward.type === 'upgrade' ? 'UPGRADE & CONTINUE' : 'TAKE & CONTINUE'}<ArrowUpRight size={18}/></div>
      </button>)}
    </div>
    <div className="reward-bottom"><div><button className="reroll-button" onClick={onReroll} disabled={game.rerolls === 0}><RotateCcw size={16}/>REROLL CHOICES<span>{game.rerolls} LEFT</span><kbd>R</kbd></button><p>{game.rerolls === 0 ? 'No rerolls left. Second Opinion rewards can grant more.' : 'Shared across the entire run. Spend wisely.'}</p></div><div className="current-weapon"><span>YOUR WEAPON</span><b style={{ color: game.weapon.color }}>{game.weapon.name} <small>LV. {game.weapon.level}</small></b><span className="current-quality">{game.weapon.rarity} · {game.relics.length} relics</span></div></div>
    {game.weapon.synergies.length > 0 && <div className="synergy-strip"><Sparkles size={13}/>{game.weapon.synergies.join('  /  ')}</div>}
  </section>;
}
