# Data Model

The web app should model canines as related domain records instead of copying the old flat CSVs directly.

## Core Entities

### Human

A real player or community contact.

Fields:

- `id`
- `displayName`
- `contact`
- `status`

Notes:

- A human may own many characters.
- The contact field may eventually hold Discord name, forum name, or other coordination notes.

### Character

An in-game persona owned by a human.

Fields:

- `id`
- `name`
- `humanId`
- `status`

Notes:

- A human can have unlimited characters.
- A human cannot log into multiple characters at the same time, so their own alternate characters are not practical direct breeding partners.
- `humanId` may be `null` for unattributed or privacy-protected historical records. This keeps the character/canine available as lineage history without connecting it to any public human/player identity.

### Canine

An individual pet object.

Fields:

- `id`
- `externalIds` optional
- `callName`
- `displayName`
- `characterId`
- `gender`
- `canineType`
- `appearance` optional
- `status`

Notes:

- A canine's in-game name is not a reliable unique identity.
- A character can have only one active canine at a time.
- Historical canines for the same character should be marked `inactive` or `unknown` so they do not pollute current breeding suggestions.
- Some players give every new canine a new name.
- Some players reuse the same pet name across generations because the game uses that name for pet commands and command aliases are easier to preserve.
- Legacy data currently uses labels like `Mulapin Ringo 733/54` as practical identifiers and quick human summaries.
- In that convention, the label means character `Mulapin`, canine call name `Ringo`, total trait score `733`, and Procreation `54`.
- The new model should assign stable internal IDs so display names can be corrected without breaking references.
- The name suffix should be treated as display metadata, not the source of truth.
- Lineage references must use stable canine IDs, not names.
- External source IDs, such as website `wolfid` values, should be stored when available but should not replace the internal ID.
- External source IDs are optional. Some parent data may never receive a website ID if the parent is gone before the delayed website tables are generated.

Naming fields:

- `callName`: the in-game command name used to interact with the pet
- `displayName`: the human-facing label shown by the app, usually derived from call name plus trait summary
- `canineType`: dog, fox, jackal, wolf, or other canine type
- `externalIds`: optional IDs from external systems, such as an anguish.org `wolfid`
- `appearance`: optional colors/eyes used for search, display, and cosmetic breeding goals

Example:

- `callName`: `Ringo`
- `displayName`: `Mulapin Ringo 733/54`
- `character`: `Mulapin`
- `total`: `733`
- `procreation`: `54`

Canine type notes:

- Canine type is not believed to change final power when traits and effort are equivalent.
- Mixed-type breeding has a penalty, so type matters to breeding-planner warnings.
- Coat color, markings, and eye color may matter for player preference but are not currently core breeding mechanics.
- Visible appearance is not necessarily the full inherited appearance state.
- Current color inheritance notes suggest canines may carry hidden color values that can appear in offspring.
- Appearance prediction should be treated as probabilistic guidance, not exact output.

Appearance shape:

```json
{
  "primaryColor": "Black",
  "secondaryColor": "Silver",
  "eyeColor": "Turquoise"
}
```

Possible future appearance-planning shape:

```json
{
  "visible": {
    "primaryColor": "Black",
    "secondaryColor": "Silver",
    "eyeColor": "Turquoise"
  },
  "hypothesis": {
    "primaryColorWeight": 7,
    "secondaryColorWeight": 2,
    "hiddenColorWeight": 1,
    "hiddenColor": null
  }
}
```

The future shape should not replace current visible `appearance` fields until the model is backed by enough observed data.

### TraitProfile

Known or solved trait values for a canine.

Fields:

- `canineId`
- one value for each of the 17 tracked traits
- `total`
- `status`

Trait values may be exact numbers, ranged values, or unsolved.

Notes:

- `total` is the broad quality score players use for quick comparison.
- `Procreation` is one of the 17 tracked traits.
- `Procreation` deserves first-class treatment in application behavior because it influences litter size.
- Higher Procreation improves the breeding program as a whole by creating more puppies per breeding opportunity.
- Display names may include `total/procreation`, but generated names should be derived from `TraitProfile` data.

### LineageProfile

Tracked parent and grandparent relationships for a canine.

Fields:

- `canineId`
- `sireId` optional
- `damId` optional
- `paternalGrandSireId` optional
- `paternalGrandDamId` optional
- `maternalGrandSireId` optional
- `maternalGrandDamId` optional

Notes:

- Unknown, NPC, or untracked ancestors should be represented as missing/null lineage references.
- NPC ancestors are considered unrelated to everyone and should not match each other as shared ancestry.
- Parent and grandparent relationships are the core lineage data for practical breeding checks.
- Deeper ancestry may be captured as source observations later, but should not block v1.

## Relationship Concepts

### Genetically Unrelated

Two canines are genetically unrelated if their tracked relationship sets have no shared canine IDs.

The legacy tools compare:

- self
- sire
- dam
- paternal grandsire
- paternal granddam
- maternal grandsire
- maternal granddam

Missing, unknown, or NPC ancestry should be ignored for matching.

### Practical Breeding Candidate

A canine is a practical breeding candidate when:

- it is genetically unrelated to the selected canine or planned puppy
- it has the opposite required gender
- it is not owned by another character belonging to the same human
- it is active or otherwise available

### Breeding Value

Breeding value is not just total trait score.

The planner should expose at least these ranking signals:

- `total`: general trait strength
- `procreation`: breeding throughput and long-term program acceleration
- ownership/contact availability
- relationship safety

Procreation should be highly visible in candidate lists because a canine with strong Procreation can produce more attempts to roll unusually good puppies.

Estimated puppy value should be presented as uncertain. Puppy stats appear to vary around parent averages, and the exact formula is unknown.

### Mixed-Type Breeding

Mixed canine types have a breeding penalty.

The app should warn when planned parents have different `canineType` values. This warning is separate from relationship safety: two parents can be genetically unrelated but still be a weaker breeding choice because of mixed type.

### Breeding Readiness

Breeding readiness is not identical for males and females.

- Very large stage 2, or `VL2`, is the maturity threshold for breeding.
- Males are viable immediately at VL2.
- Females must reach VL2 and also be in heat.

This is probably not core v1 data, but future planning features should distinguish maturity from current availability.

### Planned Breeding

Planned breedings are not canonical canine records until an actual puppy is selected and promoted into the data.

A planned breeding may track:

- planned puppy label
- owner/human target
- sire and dam
- estimated total and trait values
- desired gender, type, or appearance
- status/notes
- resulting selected puppy, once known

Planned values should stay visibly separate from actual statted canine data.

### Collar Effects

Collars/gems are reference data used at breeding or birth time.

They should not be stored as ordinary inherited trait values. They are player-action modifiers or notes that can influence which setup a player chooses for a breeding attempt.

Collar effects fall into two broad groups:

- breeding-time effects, such as the unique pet collar/Opal Procreation buff
- birth-time effects, such as color, eyes, or gender influence

The app should surface relevant collar options near the actual breeding/birth workflow, especially when the plan has a desired gender or appearance outcome.

Birth influence collars are put on the female before birth and removed after all pups are born.

Current appearance notes suggest color influence collars should be modeled as birth-time outcome modifiers, likely a one-time reroll when the initial color outcome does not match the collar's target parent/color set. They should not be modeled as changing parent genetics or inherited trait values.

## Source Observations

Canonical records may be built from multiple observations.

Optional source metadata:

- `source`
- `sourceObservedAt`
- `sourceLag`
- `externalId`
- `notes`

The anguish.org player tools family tree is a useful source, but it updates roughly once per day. It may expose `wolfid` links for past canines while omitting those IDs for current canines. If a parent is gone before the website generates its delayed table, the source may never expose that parent's ID.

The app should preserve website IDs when present, while still relying on internal IDs for canonical relationships. Missing external IDs should be normal, not an error.

## Canonical Data

Canonical public data should be stored in the repository as structured files. The exact format is still open, but JSON or TypeScript data modules are preferred over user-maintained CSV for the app's internal source of truth.

CSV import/export may still exist for compatibility with legacy data and player workflows.

Legacy display names such as `Character CallName Total/Procreation` should be preserved where useful, but canonical data should store character, call name, total, and the 17 individual traits separately. Procreation should be read from the trait values, not duplicated in another column.
