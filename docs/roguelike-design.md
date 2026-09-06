# Roguelike research and implementation direction

Research conducted September 5, 2026. These games provide design principles; Geometry Conflict uses original weapons, effects, names, and balancing.

## References

- **Hades:** Supergiant describes weapon aspects, dozens of powers, and Duo Boons combining Olympian effects. The relevant principle is a recognizable weapon foundation with combinations that change how a run plays. [Supergiant: Blood Price update](https://www.supergiantgames.com/blog/hades-the-blood-price-update-patch-notes/). The community reference distinguishes run-specific Daedalus Hammer upgrades from permanent progression and notes that Hades itself does not permit rerolling hammer choices; our first-wave draft deliberately follows the user's reroll rule instead. [Daedalus Hammer reference](https://hades.fandom.com/wiki/Daedalus_Hammer).
- **Enter the Gungeon:** The publisher emphasizes distinct gun tactics, ammunition behavior, and escalating encounters. Our ten weapons therefore differ in trajectories, range, cadence, and on-hit behavior rather than being damage reskins. [Devolver: Enter the Gungeon](https://www.devolverdigital.com/games/enter-the-gungeon). Its documented item combinations also motivate visible, named synergies. [Community synergy reference](https://enterthegungeon.fandom.com/wiki/Synergies).
- **Ravenswatch:** Passtech's updates describe reroll resources, three-choice shrines, talent upgrades, and sacrificing health for damage. Its item changes connect shields to damage bonuses and introduce items that improve rarity. These motivate the shared reroll budget, explicit rarity effects, defensive/offensive combinations, and the Glass Reactor tradeoff. [Nightmares Unleashed](https://www.passtechgames.com/ravenswatch-news/the-nightmares-unleashed-update-is-live/), [Merlin update](https://www.passtechgames.com/ravenswatch-news/the-merlin-hero-dlc-free-update-are-now-live-version-1-04/).

## Run rules

1. Begin with the Needle: one stream, no score-triggered weapon upgrade.
2. Clearing wave one always offers three distinct weapons from exactly ten choices. Choosing one replaces the Needle.
3. Begin each run with two shared rerolls. Each reroll replaces all three choices; the initial two rerolls expose nine different weapons. Additional rerolls can be selected as rewards.
4. Clearing wave five offers three distinct weapons from the nine not already equipped. The selected level-2 weapon joins the first; both fire simultaneously at their own cadence. These are the only two weapon drafts. Waves 2–4 and every clear after wave 5 offer only upgrades for equipped weapons and 36 relics. Rerolls cannot introduce weapon choices on other waves. The initial power-up draft includes an upgrade for an eligible equipped weapon; either slot can be targeted.
5. Weapon level and rarity are separate. Explicit upgrades raise levels, improve damage and cadence, and can improve weapon rarity. At maximum level, eligible upgrades can still raise quality. Upgrade cards name the weapon they improve. The second weapon addition preserves the first weapon’s level and rarity; global damage, fire-rate, and projectile-effect relics benefit both. No weapon swaps or additions occur after wave five.
6. Common, uncommon, rare, epic, and legendary rewards have different effect magnitudes. Luck and wave progression influence rarity. Capped or inapplicable effects are filtered from the pool.
7. Combat, survival time, input, and resource consumption stop while choosing. A selection is validated against the current offer and can be applied only once.
8. A new run resets weapons, relics, levels, lives, shields, and rerolls. Only personal best and sound preference persist on the device.

## Combinations

- **Thermal Shock:** burning and chilled targets take 50% extra direct damage from shots carrying both effects.
- **Thunderstorm:** explosive, chaining shots gain 25% blast radius and longer chain reach.
- **Deadeye:** with at least 15% critical chance and piercing, critical shots pierce two extra enemies.
- **Predator:** homing ricochets reacquire living targets after bouncing.
- **Fortress:** shield regeneration maintains the condition for shield-powered damage.

Effects compose across weapons: a homing shotgun, freezing chain lightning, burning ricochets, or a shield-powered railgun are valid builds. Rarity and weapon levels add further variation.

## Difficulty

The revised assault begins with 36 enemies; wave two has 74, wave three 134, and wave five 272. Bursts grow from one enemy to three, five, and nine respectively. Elite enemies arrive on wave three with larger silhouettes and three times normal health. Speed, health, interception, and elite frequency increase quickly to challenge upgraded builds. Spawn warning and safe spawn distance remain consistent.

The live enemy cap remains 160 and projectile cap is 900. Pending enemies are retained when the arena is crowded. Effects avoid recursive proc chains, damage is bounded by each projectile's hit history, and expired effects are cleaned up.

### First incremental balance pass

Player feedback found the jump into wave two too punishing. All ten draft weapons now deal 20% more base damage, including Cinder Jet’s burn; the Needle starter is unchanged. A common level-one Pulse Repeater now kills a normal wave-two chaser in one hit instead of two. Wave two has six fewer enemies (74 instead of 80) spread over the same assault duration. Other enemy tuning and weapon level/rarity scaling are unchanged. Continue with small adjustments based on play feedback rather than replacing the difficulty curve.
