# Canonical Data

This folder contains public canonical data for the static app.

The first version uses repo-managed JSON tables. The app should read these files as source data, and data changes should happen through commits or pull requests.

## Tables

- `canonical/humans.json`: real players or community contacts
- `canonical/characters.json`: in-game characters owned by humans
- `canonical/canines.json`: individual canine objects
- `canonical/trait-profiles.json`: known or solved trait values
- `canonical/lineage-profiles.json`: parent and grandparent lineage
- `canonical/source-observations.json`: optional source metadata and external IDs
- `reference/collars.json`: collar/gem effects used during breeding or birth
- `reference/comparison-ranges.json`: text-to-range mapping for certain comparison output

## Import

Legacy data can be regenerated with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\import-legacy-data.ps1
```

The importer reads the legacy `CanineCalculations` and `CanineBreeding` CSV files from sibling repository folders and writes normalized JSON into `data/canonical/`.

If `private-data/Doli-Path.xlsx` exists locally, the importer also reads the reviewed `Breeders` sheet for richer lineage, trait, and appearance data. The workbook itself is ignored by Git and should not be committed.

## Identity Rules

Use internal IDs for relationships.

Do not use canine names as primary keys. Some players rename every canine, while others reuse the same call name across generations.

External IDs, such as anguish.org `wolfid`, are optional enrichment and should not replace internal IDs.

## Current Pet Versus Breeding Pet

`status` and breeding participation are separate concerns.

- `status` tracks whether a canine is current, historical, or uncertain.
- `breedingRole` tracks whether a current canine belongs to the breeding cadre.

Examples:

- `active` + `breeding`: current pet that should appear in breeding tools
- `active` + `play-only`: current pet that is being used or played, but not offered to the breeding pool
- `inactive` + `retired`: historical pet kept for records and lineage only

This split is important because players often keep one or two characters in the breeding cadre while actively playing a different current pet on other characters.

## Missing Data

Unknown, NPC, or untracked ancestors should be represented as `null` lineage references.

NPC ancestors are considered unrelated to everyone and should not match each other as shared ancestry.

## Trait Data

Trait profiles store all 17 trait values and the total score. Procreation is one of the 17 traits and should not be duplicated as a separate stored field.

Display labels such as `Mulapin Ringo 733/54` should be derived from character, call name, total, and Procreation.

## Reference Data

Reference data describes mechanics that help players make decisions but are not canonical canine records.

Collar/gem effects belong in reference data because they are player actions or modifiers at breeding/birth time. They should not be stored as inherited trait values.

There are two timed collar workflows:

- The unique pet collar/Opal Procreation effect is active during breeding.
- Color, eye, and gender influence collars are put on the female before birth and removed after all pups are born.

Appearance data is currently visible observed data only. Private analysis suggests hidden inherited color values may exist, so color planning should be guidance/probability rather than exact prediction.

Comparison ranges translate certain in-game comparison phrases into numeric low/high modifiers. These ranges come from the legacy PowerShell calculator and the reviewed evaluator workbook.

## Source Observations

Source observations are optional. Use them when a record comes from delayed website data, message-board notes, manual curation, or legacy imports.

Do not commit raw player-tools HTML unless it has been reviewed and sanitized.
