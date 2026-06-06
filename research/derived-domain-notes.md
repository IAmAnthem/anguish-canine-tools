# Derived Domain Notes

These notes summarize domain implications from `research/message-board-articles.md`.

The raw article scrape should remain source material. These notes are working interpretation for product and data-model planning.

## Canine Species And Appearance

Canines may be dogs, foxes, jackals, wolves, or similar canine types.

Known implications:

- Canine type does not appear to change eventual size or power when traits and growth effort are equivalent.
- Mixed-type breeding has a penalty.
- Coat color, markings, eye color, and gender are believed to be cosmetic for power/trait effect.

Model implication:

- Track `species` or `canineType` separately from identity.
- Track appearance fields only if they help players search, identify, or pursue cosmetic goals.
- Breeding planner should warn when selected parents are mixed type.

## Growth And Maturity

Observed early growth stages:

1. small
2. normal
3. large
4. very large

Relevant notes:

- Growth continues after very large.
- Very large stage 2, or `VL2`, is the breeding-maturity threshold.
- Males are immediately viable at VL2.
- Females reach physical maturity at VL2 but must also wait for heat before breeding.
- Generation matters especially through approximately generation 10.
- Player age and canine age can diverge when the player statues/idles, so manual timing data can be contaminated.

Model implication:

- Growth tracking is not a core goal for this app. The app is about breeding decisions, not general time tracking.
- Growth facts should be captured only when they affect breeding availability or planning.
- If maturity/readiness is modeled, distinguish `matureAtVL2` from `currentlyInHeat`.
- If added, growth observations need source/timing notes and should not be treated as exact unless the player avoided statue/idle distortion.

## Relationship Penalty

Related breeding has a penalty. Closer relationships produce stronger penalties.

Current legacy logic treats any shared tracked self/parent/grandparent as related.

Additional notes:

- The parent and grandparent columns from the official website are the important practical columns for the existing workflow.
- Great-grandparent and deeper columns may exist, but their gameplay value is uncertain for current planning.
- NPCs in a family tree can be treated as null/unrelated to everyone and to each other.
- Unique names make manual tracking easier, but names are still not reliable identity.

Model implication:

- Relationship checks should report the shared ancestors, not only safe/unsafe.
- Later versions may classify relationship severity if more game evidence exists.
- Parent and grandparent lineage is enough for the known website-derived workflow.
- NPC/null ancestors should not create false relationship matches.

## Trait Certainty

Canine comparison text has confidence levels.

Known implications:

- `certain` comparisons are trusted.
- `think` and `feel` comparisons are skewed and inaccurate.
- The trait calculator should reject or clearly warn on non-certain comparison text.

Model implication:

- Trait-solving inputs should include confidence.
- Derived trait data should have a confidence/source field if it can come from non-certain inputs.

## Comparison Ranges

The evaluator workbook and legacy PowerShell calculator agree on the numeric ranges for certain comparison phrases.

Model implication:

- Comparison phrase ranges are reference data.
- The app should use the numeric `min` and `max` values, not the human display wording in older spreadsheets.

## Total Score

Total trait score is a progress marker, but not a complete measure of potential.

Known implications:

- Each trait may matter for a different purpose.
- A lower total canine may still be strategically valuable if it has important individual traits.
- Procreation is especially important to breeding throughput because it affects litter size.
- Appetite appears to influence feeding frequency.
- Development appears to influence growth time, likely to a small degree.

Model implication:

- Candidate ranking should not sort by total alone.
- The UI should surface individual important traits, especially Procreation.
- Ranking weights should eventually be configurable or at least transparent.

## Puppy Trait Outcomes

Puppy outcomes are not exactly predictable.

Known implications:

- The rough expectation is based on the parents' average.
- Observed examples suggest a random spread around that average.
- The distribution appears roughly bell-shaped and may be slightly favorable to advancement.
- A same-score breeding such as 200 plus 200 might produce roughly 170 to 230, but the exact formula is unknown.
- A useful mental model is approximately `(mother + father) / 2 + random adjustment`, not a deterministic result.

Model implication:

- The planner should avoid promising exact puppy stats.
- Candidate ranking can estimate expected value, but should label it as an estimate.
- More puppies means more chances to roll an unusually good result, which reinforces Procreation as a major breeding-program trait.

## Breeding Throughput

Breeding progress is constrained by time.

Known time factors:

- Female heat cycle after pups are tamed away.
- Time before puppies can be tamed away.
- Time to grow a kept puppy to breeding maturity.
- Fast raise and fast heat can improve breeding cadence.
- Breeding a female with an NPC male can count toward faster heats.
- Forest-tamed pets and released traited puppies do not count toward fast-raising.
- Maintaining a gender line can help assign the larger time burden to a player who can manage females and heat cycles.

Model implication:

- Breeding planner should eventually include throughput concepts, not only genetic safety.
- A simple v1 can rank by current data; later versions can estimate breeding-cycle cost.
- Time tracking itself is out of scope unless it supports breeding readiness or planning decisions.

## Gender-Run Population Lift

The multi-step planning workflow is often run as a same-gender carry-forward strategy.

Known operating pattern:

- The desired carry-forward puppy can be male or female.
- Players may run males for several generations, then females for several generations, then males again, depending on what the population needs.
- The carry-forward puppy should be incrementally better than the average of its parents, especially in total score.
- Mature female pets are the time-gated resource because heat, pregnancy, litter birth, puppy growth, and puppy statting require online play time.
- A player with less available online time can still contribute by raising or supplying the carry-forward line.
- A player with more online time can run mature female pets through the breeding cycle and produce the litter candidates.
- The goal is to lift the broader population while flushing the starting parents and their visible ancestry beyond the game's remembered relationship window.

Model implication:

- Multi-Step Plan Mode should support carry-forward puppies of either gender.
- The plan should choose opposite-gender mates for the selected carry-forward puppy.
- Litter entry should make it easy to compare actual puppies against parent average and best parent.
- Same-human direct-breeding checks require knowing who controls the selected planned puppy, not only its stats.

## Collars And Breeding/Birth Influence

Collars/gems affect breeding or birth setup and should be treated as reference data.

Trait-related gems:

- Topaz: Alertness
- Ruby: Appetite
- Turquoise: Brutality
- Moonstone: Development
- Onyx: Eluding
- Quartz: Energy
- Tigereye: Evasion
- Smokey Quartz: Ferocity
- Amethyst: Fortitude
- Sapphire: Insight
- Bloodstone: Might
- Emerald: Nimbleness
- Aquamarine: Patience
- Opal: Procreation, unique pet collar active during breeding
- Garnet: Sufficiency
- Jacinth: Targeting
- Diamond: Toughness

Birth influence notes:

- Red: coat color like mother
- Green: coat color like father
- Orange: more males than females
- Purple: more females than males
- Pink: eye color like mother
- Blue: eye color like father

Model implication:

- Collar effects should be modeled separately from inherited trait values.
- Collar planning may affect breeding choices, especially cosmetic/gender goals.
- Opal is special: notes indicate the unique pet collar buffs Procreation during breeding, affecting litter size, breeding success, and crossbreed penalty, not inherited trait numbers.
- Color, eye, and gender influence collars are put on the female before birth and removed after all pups are born.

## Appearance Inheritance Hypothesis

Private workbook analysis based on developer conversation suggests appearance is carried on the pet object as inherited hidden state, not calculated from a simple lookup table.

Working interpretation:

- Puppies inherit from underlying appearance information carried by the parents.
- Visible coat colors, markings, and eye colors are not the entire inherited state.
- A pet may carry hidden appearance values that can appear in later puppies.
- Primary and secondary visible colors appear to have different weights.
- The best current color model is a hypothesis, not confirmed game code.

The strongest approximation in the reviewed workbook is a primary-heavy 10-slot model:

- 7 slots for the primary visible color
- 2 slots for the secondary visible color
- 1 hidden slot

When two parents are combined, that implies a rough 20-slot outcome space:

- each parent's primary color: about 7/20, or 35%
- each parent's secondary color: about 2/20, or 10%
- each parent's hidden color: about 1/20, or 5%
- visible parent colors account for about 90% of outcomes

Model caveats:

- This model is an estimate meant to explain observed outcomes and developer comments.
- Hidden colors cannot usually be observed directly, so color predictions must remain probabilistic.
- The model may apply differently to markings or eye colors; treat those as related but not proven identical until more evidence exists.

Birth collar implications:

- Color influence collars appear to act at birth, not conception.
- The collar is best modeled as a one-time reroll attempt when the initial outcome does not match the collar's target parent/color set.
- A reroll can still miss the desired specific color because it rerolls from the same broader inherited outcome space.
- If the initial outcome already matches the collar's accepted set, no reroll is needed.
- Hidden values make exact color odds unknowable from visible parent appearance alone.

Product implication:

- Appearance planning should present odds or guidance, not guarantees.
- The app can show parent visible colors and birth-collar guidance, but should avoid claiming exact color prediction.
- Future appearance tools may model primary, secondary, and hidden-color slots separately from canonical visible appearance.

## Community And Data Sharing

Public data is sensitive socially, not just technically.

Known implications:

- Some players may not want to share all data.
- The community is small.
- Data curation and trust matter more than open anonymous editing.

Model implication:

- Repository-managed canonical data remains the right default.
- Submission workflows should be reviewable and reversible.
- Private/local data support may be useful later, but public canonical data should stay curated.

## Anguish.org Player Tools Family Tree

The player tools website exposes canine family tree data, but it is delayed.

Observed implications:

- The website updates roughly once per day.
- Historical/past canine entries may link to `tools/player_info.php?wolfid=...`.
- Current canine entries may appear without a `wolfid` link.
- Linked `wolfid` values appear to expose underlying game data IDs for past canine objects.
- Some parent IDs may never appear if the parent is gone before the delayed website tables are generated.
- The rendered family tree includes columns for great-grandparents, grandparents, parents, and puppy/current canine.
- Entries may include call name, owner/character context, color/marking summary, canine type, coat description, and eye color.

Model implication:

- `wolfid` is useful as an external source identifier when present.
- `wolfid` cannot be the sole primary key because it may be absent for current canines.
- Missing `wolfid` should be treated as normal.
- Website data needs a source timestamp because it is delayed.
- Scraped website data should be treated as observed/source data, not necessarily current live game state.
- Raw profile HTML may contain unrelated player/account/profile details and should not be committed unless sanitized.
