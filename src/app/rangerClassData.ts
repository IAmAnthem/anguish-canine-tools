export const rangerClassOverview = {
  classHall: "31n, 9w, 10n, 16e, 1s, enter camp",
  defenseModes: "none, dodge, block",
  levelBonus: "strike and woodcraft further improve with additional player levels",
  skilling: "marksmanship is extremely fast, knife is very fast, shortsword/spear are fast, others are average",
  symbol: "a scout knife",
  introduction:
    "The Ranger class is centered on its ability to interact with nature and its canine companion. Woodcraft determines the effectiveness of most ranger powers and is increased with dexterity, intelligence, wisdom, and levels."
} as const;

export const rangerRaceRows = [
  ["Dwarf", "17", "14", "12", "17", "15", "178", "162", "Bear, Chaos, Knights, Scythe, Snowfolk"],
  ["Elf", "13", "17", "17", "14", "14", "154", "178", "Bear, Chaos, Eldar, Knights, Monks, Snowfolk"],
  ["Half-Elf", "14", "15", "16", "14", "16", "154", "170", "Bear, Chaos, Eldar, Knights, Monks, Snowfolk"],
  ["Human", "16", "15", "15", "16", "14", "170", "162", "Bear, Chaos, Eldar, Knights, Monks, Scythe, Snowfolk"],
  ["Orc", "16", "16", "13", "17", "13", "178", "146", "Bear, Chaos, Scythe, Snowfolk"]
] as const;

export const rangerAbilityRows = [
  ["bearings", "3", "displays the approximate direction to locations set with memorize"],
  ["braid", "-", "craft various items using sinew"],
  ["build", "-", "assemble structures such as bridges, fires, shelters, snares, and tents"],
  ["carve", "-", "create hunks of meat from a dead animal"],
  ["compare", "10", "display canine traits and relative power levels"],
  ["conceal", "-", "hide a tent or shelter from sight after building it"],
  ["consider", "-", "show pelt, sinew, or feather requirements for an item"],
  ["cook", "-", "cook carved meats and foraged foods"],
  ["cut", "5+", "chop wood or split meats; SP cost varies by target"],
  ["distill", "-", "extract medicine, alcohol, perfume, or antidotes"],
  ["elude", "~", "attempt to stop an opponent from hunting you"],
  ["forage", "2", "search for bait, herbs, food, wood, and similar materials"],
  ["forget", "-", "remove a memorized location"],
  ["gather", "2", "retrieve useful items found by forage"],
  ["glance", "2", "quick target info, less detailed than observe"],
  ["gut", "-", "retrieve sinew from a dead animal"],
  ["impale", "-", "place a corpse on a stake to frighten others"],
  ["label", "-", "attach custom writing to crafted items"],
  ["make", "-", "craft items using pelts, sinew, and feathers"],
  ["mark", "5", "draw a direction or symbol into dirt"],
  ["memorize", "10", "set a location for later use with bearings"],
  ["obscure", "5/25", "erase ranger marks; fresh marks cost more"],
  ["observe", "30", "detailed target information including difficulty and weak spots"],
  ["pluck", "-", "pull feathers from a dead bird"],
  ["repair", "-", "fix bolas, bridges, shelters, or tents"],
  ["reveal", "-", "reverse conceal on a tent or shelter"],
  ["scan", "5/20", "display entities within line of sight or the nearby area"],
  ["sharpen", "5/55", "make stakes or spears from beams or staffs"],
  ["skin", "-", "create pelts from a dead animal"],
  ["strike", "6", "grant an extra attack every other round"],
  ["string", "~", "attach sinew to an item such as a whistle or bowstave"],
  ["survey", "2", "show surrounding area information and small outdoor map"],
  ["tame", "50", "attempt to convert a wild canine into a companion"],
  ["track", "10+", "find a living target, with extra cost per movement"],
  ["whittle", "~", "create items from firewood"]
] as const;

export const rangerObserveRows = [
  ["11+ less", "looks like a pretty laughable opponent"],
  ["6-10 less", "looks like a very weak opponent"],
  ["4-5 less", "looks like a weak opponent"],
  ["3 less", "looks like a somewhat weak opponent"],
  ["1-2 less", "looks like an adequate opponent"],
  ["0-1 more", "looks like a worthy opponent"],
  ["2-3 more", "looks like a strong opponent"],
  ["4-5 more", "looks like a dangerous opponent"],
  ["6-7 more", "looks like a very dangerous opponent"],
  ["8-9 more", "looks like a fearsome opponent"],
  ["10+ more", "looks like an invincible opponent"]
] as const;

export const rangerAbilityNotes = [
  "Build: a complete bridge with all optional attachments takes 32 beams, 24 planks, 180 sinew, and a box of nails. Nails extend bridge duration and can be stacked repeatedly.",
  "Cook: carved meats spoil if left uncooked; cooked meats heal better.",
  "Cut: staffs, spears, and bowstaves can be sized for yourself or another player, and meats can be split for low-Constitution characters.",
  "Distill: herbs become medicine, flowers become perfume, ginseng becomes antidote, and fruits/roots/grains become alcohol.",
  "Repair: Rangers can repair bolas with sinew as well as bridges, tents, and shelters.",
  "Corpse processing order matters: pluck, skin, gut, carve is the best sequence.",
  "Woodcraft governs success and quality for Ranger abilities, but stat boosters do not improve Woodcraft directly.",
  "An artificer amulet of nature and a very shiny ring from Dymwood Gnomes both grant Woodcraft bonuses.",
  "Cutting wood and making wooden items is easier with an axe equipped.",
  "Indoor areas, nighttime, and poor weather all hurt various Ranger abilities."
] as const;

export const rangerPetRoleNotes = [
  "Disposable pets are short-term utility animals. They can be fine for basic class use, experiments, or late cosmetic changes, but they are not where a serious breeding program stores value.",
  "Bonded pets are long-term working animals. They are the ones worth real growth time, careful feeding, stat checking, and breeding decisions.",
  "Wild tames take real bonding time. Guide notes suggest roughly 20 minutes by idling or closer to 5 minutes if you are actively killing with the pet.",
  "Bred puppies bond instantly, so this bonding delay belongs to wild tames, not to puppies from a breeding line.",
  "Keep bonded pets fed and happy. If a bonded wolf ferals, it is gone for good.",
  "If a bonded wolf dies after it reaches the larger trained sizes, it can return a size smaller. Deaths are expensive."
] as const;

export const rangerBreedingStockNotes = [
  "Wild-tamed stock starts from whatever the game gives you in the wild. It can be useful for getting started, for changing breed, or for chasing a cosmetic goal, but it begins with much weaker breeding potential.",
  "Bred-line stock means a puppy already improved through prior generations of trait breeding. This is the livestock-style breeding-program version of a pet line.",
  "Forest-tamed pets and NPC pets are usually weak breeding foundations. Starting with any traited pet is strongly preferred when possible.",
  "Once a player gets serious about advancement, the goal is usually to move from wild stock into bred-line stock and keep lifting that line forward."
] as const;

export const rangerTameNotes = [
  "Rangers can tame coyote, dingo, dog, fox, hound, jackal, and wolf races.",
  "Wisdom sets the minimum level you can tame: your Wisdom must at least match the canine's level, but that still does not guarantee first-try success.",
  "A tamed companion provides a tracking bonus. Larger and smarter pets are better.",
  "If you whittle and string a whistle, you can summon your canine with it.",
  "Canines can wear collars for extra protection, must be fed meat regularly, and can help reveal hidden Rogues or catch theft attempts."
] as const;

export const rangerSizeRows = [
  ["01-02", "a small trained <canine>"],
  ["03-05", "a trained <canine>"],
  ["06-08", "a large trained <canine>"],
  ["09-11", "a very large trained <canine>"],
  ["12-14", "a huge trained <canine>"],
  ["15-17", "an enormous trained <canine>"],
  ["18-20", "a gigantic trained <canine>"]
] as const;

export const rangerBondingRows = [
  ["Orc (13 Wis)", "enormous", "15", "about 90 hours"],
  ["Elf (14 Wis)", "enormous", "16", "about 110 hours"],
  ["Human (14 Wis)", "enormous", "16", "about 110 hours"],
  ["Dwarf (15 Wis)", "enormous", "17", "about 125 hours"],
  ["Half-Elf (16 Wis)", "gigantic", "18", "about 140 hours"]
] as const;

export const rangerCommandRows = [
  ["name <name>", "give your canine a name that it responds to"],
  ["give collar to <canine>", "equip a collar on the canine"],
  ["uncollar <canine>", "remove the canine's collar"],
  ["give meat to <canine>", "feed meat from inventory"],
  ["point meat, say <canine> eat", "eat a meat item from the ground"],
  ["point corpse, say <canine> ravage", "eat and dispose of the corpse"],
  ["point <item>, say <canine> fetch", "bring an item to you"],
  ["say <canine> carry", "carry an item in its mouth"],
  ["say <canine> give", "bring carried item to you"],
  ["say <canine> drop", "drop carried item"],
  ["point <item>, say <canine> guard", "guard an item on the ground"],
  ["say <canine> identify/show", "display guarded items"],
  ["point <item>, say <canine> ignore", "stop guarding an item"],
  ["point <player>, say <canine> enemy/friend", "set hostile or protective view of a player"],
  ["point <target>, say <canine> attack/kill/sic", "attack the target"],
  ["say <canine> rescue", "attempt rescue in combat"],
  ["say <canine> come/heel/here", "follow you"],
  ["say <canine> lie / sit/stay / stand", "wait at the location in a chosen posture"],
  ["say <canine> hush/quiet", "become silent and stop playfulness"],
  ["say <canine> go away/go home", "leave forever"],
  ["say <canine> beg/good/play dead/roll over/speak", "entertainment only"]
] as const;

export const rangerTrainingNotes = [
  "Loyalty: a few hours after bonding you can pet and scratch the canine to build loyalty and reduce feral risk.",
  "Ravage: unlocks a few hours after bonding and provides food, healing, and corpse disposal.",
  "Carry: usually unlocks around large size. Heavy carried items train strength; Graddam helps up to about 5 weight. Traitless maximum is about 9 weight.",
  "Guard: usually unlocks around very large size. Guarding more items trains the ability; Norich helps up to about 5 guarded items. Traitless maximum is about 11 items.",
  "Rescue: usually unlocks around huge size. Rescue training happens in combat; Marika can help train it to moderate success."
] as const;

export const rangerVisibleStatTables = {
  armour: [
    ["1 of 10", "scantily clad"],
    ["2 of 10", "lightly covered"],
    ["3 of 10", "somewhat lightly protected"],
    ["4 of 10", "lightly protected"],
    ["5 of 10", "quite heavily covered"],
    ["6 of 10", "quite heavily protected"],
    ["7 of 10", "heavily covered"],
    ["8 of 10", "heavily protected"],
    ["9 of 10", "armoured"],
    ["10 of 10", "heavily armoured"]
  ],
  constitution: [
    ["1 of 5", "looks like a skeleton covered in skin"],
    ["2 of 5", "looks rather scrawny"],
    ["3 of 5", "looks a little thin"],
    ["4 of 5", "is well built"],
    ["5 of 5", "is sturdy"]
  ],
  dexterity: [
    ["1 of 5", "moves like a turtle"],
    ["2 of 5", "is very slow and sluggish"],
    ["3 of 5", "moves rather slowly"],
    ["4 of 5", "moves with confidence"],
    ["5 of 5", "moves with practiced ease"]
  ],
  intelligence: [
    ["1 of 6", "look around vacantly"],
    ["2 of 6", "look around curiously"],
    ["3 of 6", "survey his/her surroundings cautiously"],
    ["4 of 6", "scan the surroundings with interest"],
    ["5 of 6", "observe the area alertly"],
    ["6 of 6", "seem to watch your every movement"]
  ],
  strength: [
    ["1 of 5", "looks to be pathetically weak"],
    ["2 of 5", "looks like he/she has not done any exercise"],
    ["3 of 5", "looks a little weak"],
    ["4 of 5", "seems to be of average strength"],
    ["5 of 5", "appears to be well-toned"]
  ]
} as const;

export const rangerStatNotes = [
  "Use observe to read armour class, intelligence, strength, dexterity, and constitution.",
  "Armour improves naturally with growth.",
  "Intelligence improves as the canine becomes efficient with its abilities.",
  "Strength improves by training carry.",
  "Dexterity improves by fighting.",
  "Constitution improves by feeding.",
  "When a canine grows into a new size, the visible stat descriptions may look lower because the ratings are relative to its new level."
] as const;

export const rangerBreedingNotes = [
  "Bonded and non-bonded canines can mate, but only player-tamed females can become pregnant.",
  "Different canine species can breed, but conception is harder and the litter contains normal pups of each parent species rather than hybrids.",
  "To breed, bring a female in heat near a male, ensure both are level 10 or higher, and watch the interaction messages. Encourage can help force attempts.",
  "After a successful breeding it takes about 20 minutes for pregnancy to show, about 20 more minutes for birth, about 30 minutes before pups are tameable, and roughly an hour before untamed pups leave.",
  "Rangers who tame newborn puppies gain a hidden fast-growth bonus for future canines, but they must raise each puppy to level 10 to lock the bonus in permanently.",
  "Having a canine sit prevents mating."
] as const;

export const rangerHeatRows = [
  ["Default base", "about 6 hours with a 30 minute variance either direction"],
  ["After a mating", "next heat base is 30 minutes sooner"],
  ["After forgoing a mating", "next heat base is 30 minutes later"],
  ["Minimum base", "about 1 hour"],
  ["Maximum base", "about 10 hours"]
] as const;

export const rangerCompareNotes = [
  "Compare exposes the 17 breeding traits and their relative ranking phrases from totally inferior through outstandingly better.",
  "If used out loud, the Ranger speaks the comparison so other players can see it.",
  "Compare also helps detect bloodlines and prevent inbreeding.",
  "Rangers who breed and raise newborn litters gain a hidden bonus that improves bloodline-detection accuracy, and the bonus is cumulative per pregnancy."
] as const;

export const rangerTraitNames = [
  "Alertness",
  "Appetite",
  "Brutality",
  "Development",
  "Eluding",
  "Energy",
  "Evasion",
  "Ferocity",
  "Fortitude",
  "Insight",
  "Might",
  "Nimbleness",
  "Patience",
  "Procreation",
  "Sufficiency",
  "Targeting",
  "Toughness"
] as const;

export const rangerTraitDescriptorRows = [
  ["Alertness", "Affects Intelligence; possible detection utility."],
  ["Appetite", "Controls metabolism and digestion or feeding cadence."],
  ["Brutality", "Adds to pet damage."],
  ["Development", "Speeds up leveling or growth; exact details uncertain."],
  ["Eluding", "Makes the pet harder to hit."],
  ["Energy", "Affects Constitution; notes suggest it may not factor into combat code."],
  ["Evasion", "Dodge ability."],
  ["Ferocity", "Adds to pet damage."],
  ["Fortitude", "Makes the pet sturdier; possibly maximum hit points."],
  ["Insight", "Affects how quickly the pet learns behaviors such as guarding or rescue."],
  ["Might", "Affects Strength; helps carrying, but notes suggest it does not affect damage output."],
  ["Nimbleness", "Affects Dexterity; helps dodge and avoid hits."],
  ["Patience", "Affects Wisdom; practical impact uncertain."],
  ["Procreation", "Influences litter size and likely breeding success chances."],
  ["Sufficiency", "Makes the pet's stomach larger, allowing it to eat more."],
  ["Targeting", "Controls pet accuracy."],
  ["Toughness", "Armor class or damage reduction from successful hits."]
] as const;

export const rangerAppearanceNotes = [
  "About 12 hours after bonding a canine begins shedding its generic coat, and about 6 hours after shedding starts it reaches its final coat.",
  "Light meats bias the result toward lighter coats. Dark meats bias the result toward darker coats.",
  "A canine can receive zero, one, or two secondary markings/features.",
  "Eye colors transition through stages too, and may continue changing after coat shedding ends."
] as const;

export const rangerEyeRows = [
  ["dark", "teal", "blue", "blue"],
  ["dark", "dark", "brownish", "brown"],
  ["dark", "dark", "ebony", "charcoal"],
  ["dark", "teal", "blue", "dark blue"],
  ["dark", "dark", "brownish", "dark brown"],
  ["dark", "teal", "greenish", "emerald green"],
  ["dark", "dark", "ebony", "glossy black"],
  ["dark", "teal", "greenish", "turquoise"],
  ["light", "plum", "reddish", "amber"],
  ["light", "light", "yellow", "coppery"],
  ["light", "plum", "reddish", "crimson"],
  ["light", "light", "yellow", "golden"],
  ["light", "plum", "bluish", "indigo"],
  ["light", "light", "cloudy", "light grey"],
  ["light", "light", "cloudy", "silver"],
  ["light", "plum", "bluish", "turquoise"]
] as const;

export const rangerDescriptorRows = [
  ["<color> marks", "marking"],
  ["<color> patches", "marking"],
  ["<color> streaks", "marking"],
  ["<color> stripes", "marking"],
  ["<color> circle around his/her left eye", "feature"],
  ["<color> circle around his/her right eye", "feature"],
  ["<color> line down the spine", "feature"],
  ["<color> muzzle", "feature"],
  ["<color> pair of socks on both forepaws", "feature"],
  ["<color> pair of socks on both hind legs", "feature"],
  ["<color> left ear", "feature"],
  ["<color> right ear", "feature"],
  ["<color> set of socks on all paws", "feature"],
  ["<color> star on the forehead", "feature"],
  ["<color> tip on the tail", "feature"],
  ["<color> underside", "feature"]
] as const;

export const rangerMiscNotes = [
  "Low-level bonding route: the Elven Forest den route from the guide is still useful for early Rangers trying to secure a bondable wolf pup.",
  "A bola on your canine can be removed by Graddam; Graddam also heals canines and the first heal is free.",
  "Marika sells a collar that shows the date you tamed your current canine.",
  "Canines remain active while a Ranger is stone-statue idle, but they go linkdead during linkdeath and leave when the Ranger logs off."
] as const;
