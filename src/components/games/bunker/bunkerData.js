// ─── BUNKER: Static Game Data ───────────────────────────────────────────────

export const PROFESSIONS = [
  {
    name: 'Surgeon',
    fact1: 'Can perform emergency amputations with improvised tools',
    fact2: 'Has memorized 200+ medication interactions and dosages',
    inventory: 'Field surgical kit (sterile, 40+ instruments)',
  },
  {
    name: 'Chemist',
    fact1: 'Can synthesize water purification compounds from raw materials',
    fact2: 'Knows how to neutralize 30+ toxic industrial chemicals',
    inventory: 'Portable spectrometer + reagent set',
  },
  {
    name: 'Military Engineer',
    fact1: 'Can construct blast-resistant shelters from salvaged materials',
    fact2: 'Has extensive training in minesweeping and IED disposal',
    inventory: 'Combat multitool + 10m det cord',
  },
  {
    name: 'Botanist',
    fact1: 'Can identify 300+ edible wild plants across all climates',
    fact2: 'Has seeds for 40 high-yield crop varieties hidden in their clothing',
    inventory: 'Sealed seed vault (heirloom varieties)',
  },
  {
    name: 'Psychologist',
    fact1: 'Trained in crisis de-escalation and hostage negotiation',
    fact2: 'Can detect deception with 87% accuracy through micro-expression analysis',
    inventory: 'Laminated behavioural assessment protocol cards',
  },
  {
    name: 'Electrician',
    fact1: 'Can wire a functional solar micro-grid from salvaged parts in 6 hours',
    fact2: 'Knows how to safely tap into abandoned power infrastructure',
    inventory: 'Linesman toolkit + 50m 12-gauge wire',
  },
  {
    name: 'Chef',
    fact1: 'Can extend food shelf life by 3× using fermentation and smoke curing',
    fact2: 'Knows 60+ high-calorie recipes achievable with minimal ingredients',
    inventory: 'Vacuum sealer + 200g salt block',
  },
  {
    name: 'Navy Diver',
    fact1: 'Can free-dive to 40m and hold breath for 6+ minutes under stress',
    fact2: 'Certified in underwater welding and hull breach repair',
    inventory: 'Rebreather unit + dive knife',
  },
  {
    name: 'Geneticist',
    fact1: 'Carries frozen cell samples from 12 endangered species on their person',
    fact2: 'Can design selective breeding programs to boost crop disease resistance',
    inventory: 'Cryo-flask (liquid nitrogen, 72-hour capacity)',
  },
  {
    name: 'Veterinarian',
    fact1: 'Can perform surgery on humans using adapted animal anaesthesia protocols',
    fact2: 'Knows antibiotic alternatives derived from common plants and fungi',
    inventory: 'Large-animal medical kit + rabies post-exposure vaccine (×3)',
  },
  {
    name: 'Architect',
    fact1: 'Can assess structural integrity of damaged buildings in under 2 minutes',
    fact2: 'Has memorised load-bearing ratios for 8 common construction materials',
    inventory: 'Structural stress calculator + blueprint paper rolls',
  },
  {
    name: 'Nuclear Technician',
    fact1: 'Can operate and maintain a nuclear reactor with degraded instrumentation',
    fact2: 'Knows decontamination procedures to reduce radiation exposure by 90%',
    inventory: 'Geiger counter (calibrated) + potassium iodide tablets ×100',
  },
  {
    name: 'Anthropologist',
    fact1: 'Speaks 4 languages and can learn survival-level communication in 72 hours',
    fact2: 'Understands the social dynamics needed to prevent group collapse in isolation',
    inventory: 'Oral history recorder + 3 cultural mediation frameworks (laminated)',
  },
  {
    name: 'Demolitions Expert',
    fact1: 'Can clear a 10-ton rockfall with precisely calculated charges and zero collateral',
    fact2: 'Knows how to neutralise buried ordnance using hand tools alone',
    inventory: 'Blasting caps + 2kg PETN (sealed, inert without detonator)',
  },
  {
    name: 'Microbiologist',
    fact1: 'Can culture antibiotics from soil samples using salvaged lab equipment',
    fact2: 'Able to identify pathogen outbreak sources from symptoms alone within 4 hours',
    inventory: 'Portable PCR unit + 50 sterile collection swabs',
  },
  {
    name: 'Pilot',
    fact1: 'Rated on 12 aircraft types including fixed-wing, rotary, and ultralight',
    fact2: 'Can navigate 800km using dead reckoning with no electronics',
    inventory: 'Aviation charts (5-country coverage) + manual altimeter',
  },
  {
    name: 'Cryptographer',
    fact1: 'Can break basic cipher communications and intercept enemy signals manually',
    fact2: 'Designed the encryption protocol used by 3 national intelligence agencies',
    inventory: 'One-time pad set + shortwave signal decoder',
  },
  {
    name: 'Marine Biologist',
    fact1: 'Can locate freshwater springs using coastal geology and tidal patterns',
    fact2: 'Knows which sea creatures are edible vs toxic across all ocean zones',
    inventory: 'Collapsible fish trap + tide chart compendium',
  },
];

export const PHOBIAS = [
  'Nyctophobia',
  'Claustrophobia',
  'Mysophobia',
  'Arachnophobia',
  'Pyrophobia',
  'Aquaphobia',
  'Trypophobia',
  'Agoraphobia',
  'Hemophobia',
  'Thanatophobia',
  'Nosophobia',
  'Athazagoraphobia',
  'Autophobia',
  'Megalophobia',
  'Radiophobia',
];

export const HEALTH_CONDITIONS = [
  'Perfect condition',
  'Minor knee injury',
  'Diabetic (insulin-dependent)',
  'Colorblind (red-green)',
  'Mild anxiety disorder',
  'Chronic migraines',
  'Exceptional endurance athlete',
  'One kidney',
  'Hearing aid (right ear)',
  'Night blindness',
  'Recovering broken arm (3 weeks)',
  'Exceptional immune system',
];

export const INVENTORY_POOL = [
  'Hand-cranked emergency radio',
  'Compass + topographical maps (regional)',
  'Freeze-dried rations (3-month supply)',
  'Portable water filter (5000L capacity)',
  'Shortwave radio transmitter',
  'Collapsible crossbow + 40 bolts',
  'Encrypted satellite phone (1 charge remaining)',
  'Mechanical watch + star chart',
  'Folding solar panel (100W)',
  'Reinforced go-bag (packed, undisclosed contents)',
];

// ─── Special Powers ──────────────────────────────────────────────────────────
//
// timing values:
//   'defense'     — activated by hot-seat player during Defense Phase
//   'stat_vote'   — activated during Stat Vote (before reveal)
//   'discussion'  — activated during Discussion Phase (affects upcoming elim vote)
//   'any'         — can be used at any point (host-enforced)

export const SPECIAL_POWERS = [
  {
    id: 'system_breach',
    name: 'System Breach',
    description: 'Nullify one player\'s vote in the upcoming elimination vote.',
    timing: 'discussion',
  },
  {
    id: 'firewall',
    name: 'Firewall',
    description: 'Become immune to this elimination. Votes shift to the second-most voted player.',
    timing: 'defense',
  },
  {
    id: 'data_leak',
    name: 'Data Leak',
    description: 'Secretly view another player\'s full card. Visible only to you.',
    timing: 'defense',
  },
  {
    id: 'blackout',
    name: 'Blackout',
    description: 'Cancel the current stat reveal. No stat is shown this round.',
    timing: 'stat_vote',
  },
  {
    id: 'propaganda',
    name: 'Propaganda',
    description: 'Plant a fake stat entry under another player\'s name in the revealed data table.',
    timing: 'defense',
  },
  {
    id: 'double_vote',
    name: 'Double Vote',
    description: 'Your elimination vote counts twice this round. Activate before casting your vote.',
    timing: 'discussion',
  },
  {
    id: 'evacuation_protocol',
    name: 'Evacuation Protocol',
    description: 'Bring back one eliminated player. They return with no special power.',
    timing: 'defense',
  },
  {
    id: 'isolation_chamber',
    name: 'Isolation Chamber',
    description: 'Block one player from using their special power for the rest of this round.',
    timing: 'defense',
  },
  {
    id: 'scapegoat',
    name: 'Scapegoat',
    description: 'Transfer all votes currently on you to another player of your choice.',
    timing: 'defense',
  },
  {
    id: 'ghost_protocol',
    name: 'Ghost Protocol',
    description: 'Hide your name from the upcoming vote. Nobody can vote for you this round.',
    timing: 'discussion',
  },
  {
    id: 'tribunal',
    name: 'Tribunal',
    description: 'If eliminated, trigger a mandatory final re-vote. The second result cannot be appealed.',
    timing: 'defense',
  },
  {
    id: 'insider_info',
    name: 'Insider Info',
    description: 'Force an extra stat reveal this round — two stats shown instead of one.',
    timing: 'defense',
  },
  // ─── New powers ──────────────────────────────────────────────────────────
  {
    id: 'bunker_extension',
    name: 'Bunker Extension',
    description: 'Expand the bunker capacity by 1. One additional survivor can enter.',
    timing: 'defense',
  },
  {
    id: 'override_vote',
    name: 'Override Vote',
    description: 'Instantly eliminate one player of your choice. The round ends immediately — no re-vote.',
    timing: 'defense',
  },
];

export const STAT_CATEGORIES = [
  'Profession',
  'Fact 1',
  'Fact 2',
  'Inventory',
  'Phobia',
  'Special Power',
  'Health',
];

export const GENDERS = ['Male', 'Female', 'Non-binary'];
