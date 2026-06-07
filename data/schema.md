# Data Schema

These are working schema notes for the canonical JSON tables. They are intentionally lightweight until the app code adds runtime validation.

## `humans.json`

```json
{
  "id": "human-dave",
  "displayName": "Dave",
  "contact": null,
  "status": "active"
}
```

## `characters.json`

```json
{
  "id": "character-mulapin",
  "name": "Mulapin",
  "humanId": "human-dave",
  "status": "active"
}
```

Use `"humanId": null` when a character or historical canine should remain in lineage history but must not be connected to any public human/player identity.

## `canines.json`

```json
{
  "id": "canine-mulapin-ringo-001",
  "externalIds": {},
  "callName": "Ringo",
  "displayName": "Mulapin Ringo 733/54",
  "characterId": "character-mulapin",
  "gender": "M",
  "canineType": "fox",
  "appearance": {
    "primaryColor": "Black",
    "secondaryColor": "Silver",
    "eyeColor": "Turquoise"
  },
  "status": "active",
  "breedingRole": "breeding"
}
```

Notes:

- `id` is the canonical identity.
- `callName` is the in-game command name.
- `displayName` is derived for humans.
- `externalIds` may include optional values such as `{ "anguishWolfId": "16829" }`.
- `appearance` is optional and may be `null` when color/eye data is unknown.
- `appearance` stores visible observed appearance only. It should not be treated as the full inherited appearance state.
- Hidden color/appearance data may exist but is not currently modeled in canonical records.
- A character can have only one active canine at a time. Historical canines for that character should be `inactive` or `unknown`.
- `status` answers whether the record is current, historical, or uncertain.
- `breedingRole` answers whether a current pet is part of the breeding cadre. Not every active pet is available for breeding suggestions.

## `trait-profiles.json`

```json
{
  "canineId": "canine-mulapin-ringo-001",
  "status": "known",
  "total": 733,
  "traits": {
    "Alertness": 30,
    "Appetite": 48,
    "Brutality": 26,
    "Development": 36,
    "Eluding": 52,
    "Energy": 37,
    "Evasion": 59,
    "Ferocity": 55,
    "Fortitude": 47,
    "Insight": 36,
    "Might": 47,
    "Nimbleness": 54,
    "Patience": 34,
    "Procreation": 54,
    "Sufficiency": 37,
    "Targeting": 38,
    "Toughness": 43
  }
}
```

Trait values may be exact numbers, ranges, or `UNSOLVED`.

Range shape:

```json
{
  "min": 136,
  "max": 137
}
```

Breeder lineage imports may produce summary-only trait profiles when only the total trait score is known:

```json
{
  "canineId": "canine-example",
  "status": "summary",
  "total": 705,
  "traits": null
}
```

## `lineage-profiles.json`

```json
{
  "canineId": "canine-mulapin-ringo-001",
  "sireId": null,
  "damId": null,
  "paternalGrandSireId": null,
  "paternalGrandDamId": null,
  "maternalGrandSireId": null,
  "maternalGrandDamId": null
}
```

Use `null` for unknown, NPC, or untracked ancestors. Do not represent all NPCs as the same shared ancestor.

## `source-observations.json`

```json
{
  "id": "source-observation-001",
  "entityType": "canine",
  "entityId": "canine-mulapin-ringo-001",
  "source": "manual",
  "sourceObservedAt": "2026-06-04",
  "sourceLag": null,
  "externalId": null,
  "notes": "Initial curated record."
}
```

Use source observations for delayed website data, legacy imports, or manual curation notes when the source matters.

## `reference/collars.json`

```json
{
  "gem": "Opal",
  "kind": "breeding",
  "trait": "Procreation",
  "activation": "during-breeding",
  "wearer": "unique-pet",
  "effect": "Unique pet collar: buffs Procreation during breeding, affecting litter size, breeding success, and crossbreed penalty; does not alter inherited trait numbers."
}
```

Kinds:

- `trait`: maps a collar gem to one of the 17 traits or trait-related behavior
- `breeding`: active during breeding, such as the unique pet collar/Opal Procreation effect
- `birth`: active around birth, affecting outcome such as color, eyes, or litter gender

Activation:

- `passive-reference`: reference information only, not a known timed breeding action
- `during-breeding`: worn during the breeding action
- `before-birth-through-litter`: put on the female before birth and remove after all pups are born

Birth collar notes:

- Color and eye influence collars are birth-time modifiers, not conception-time modifiers.
- Current appearance-inheritance notes suggest color influence may work as a one-time reroll if the initial outcome does not match the collar's target parent/color set.
- Rerolls still cannot guarantee a specific visible color because hidden inherited values may exist.

## `reference/comparison-ranges.json`

```json
{
  "text": "marginally better",
  "min": 2,
  "max": 4
}
```

These records translate certain in-game comparison text into numeric modifiers used by the trait calculator.
