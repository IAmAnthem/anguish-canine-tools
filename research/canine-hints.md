Traited Canines, some random notes

Time:
	Investing time in generations of pets is rewarded with 
	faster growing pets.  Pets must reach VL2 to advance your
	generation count.
	
	The starting time to VL2 is approximately 40 hours.
	The fastest time to VL2 is approximately 4 hours.
	Additional speed up can happen, probably from the Development trait.

	Ensure you are VL2 by logging in a level 7 character, and using the magic stone to LEVEL the pet.
	Refer to Anguish Research for the chart of results.
	
	A forest-tamed pet OR a released traited puppy do not count towards fast-raising.

	Males are immediately virile at VL2.
	Females start their heat-timer upon reaching VL2.
	Heat duration is variable, refer to Anguish Research.

	Getting all pets to fastest raising time, and fastest heat time is 
	exceptionally useful.

	Personally I start all pets as female, have at least 6 litters
	and as many as 6 generations before I consider a pet 'ready for prime-time'.

	Breeding your female pet with an NPC male counts towards faster heats, so if
	nobody unrelated or you don't really have a plan, just breed Dasher or some other
	male NPC canine.

Compare:
	Having CERTAIN compares happens for females after N puppies are born.
		Easily observed by comparing pup to dam during birthing.
		At some point your compares will start showing certain.
	Unknown how males achieve this.

	Having CERTAIN compares is useful for accurately inferring the trait point values for a canine.

	Some time after CERTAIN, you will also gain the ability to see if canines are related.
	This is useful if you're breeding with other players who you do not know thier lineage.
	This is unnecessary if you have built the table example below.

Traits:
	I would highly advise starting with ANY traited pet over a forest-tame.
	Forest tames would be useful for changing BREED or COLOR late
	in the plan for your character.

	NPC pets have very tiny traits and are not particularly useful
	for breeding.  Again, BREED or COLOR would be the exception.

	Very little is known about the effects of traits.
	Appetite seems to influence the frequence of feeding required.
	Development seems to influence time to grow (to a small degree).
	Procreation seems to influence size of litter.
		As a breeder this quickly becomes the lynchpin trait.
		Bigger litters equals more chances for a better puppy.

Calculating Traits:
You can utilize Excel with this table to process the text and generate estimates IF YOU HAVE KNOWN PETS TO BASELINE AGAINST.
Establishing a database of known pet values is critical to being able to stat canines.
Text			Range		Min Value	Max Value
totally inferior	-71 to -1700	-1700		-71
very inferior		-21 to -70	-70		-20
inferior		-10 to -20	-19		-10
slightly inferior	-5 to -9	-9		-5
marginally inferior	-2 to -4	-4		-2
barely inferior		-1		-1		-1
similar			0		0		0
barely better		1		1		1
marginally better	2 to 4		2		4
slightly better		5 to 9		5		9
better			10 to 20	10		19
much better		21 to 70	20		70
outstandingly better	71 to 1700	71		1700


Breeding:
	Canine breed matters.  
	There is an unknown penalty for cross-breeding (wolf + fox, fox + hound, etc.)

	Family trees matter.  
	Login to anguish.org with your ranger character's credentials.  
	Scroll down and look at the tree for your pet.  
	The PARENT and GRANDPARENT columns matter.
	Other columns are of unknown value.

	All NPCs in your tree can be considered NULL, unrelated to anyone or each other.

	It is quite useful for each pet to have a unique name.

One approach is to build a table like this:

YOUR ALTS									EXISTING BREEDING CADRE FEEDS YOU DASHER-PUPS
PLAYER-PET		Sire			Dam				S-P1			S-P2			D-P1			D-P2
TomRanger-Alpha1	NPC-Dasher		Dave-Rambo			NPC			NPC			Dave-Sly		Ann-Beatrix
DickRanger-Bravo1	NPC-Dasher		Bill-Boots			NPC			NPC			Bill-Momma		Deb-Foo
HarryRanger-Charlie1	NPC-Dasher		John-Tiki			NPC			NPC			John-Kits		Tina-Bar
AmyRanger-Delta1	NPC-Dasher		Mark-Babs			NPC			NPC			Mark-Spot		Karen-Zab
MaryRanger-Echo1	NPC-Dasher		Nate-Blue			NPC			NPC			Nate-Red		Lisa-Cobb
SuzyRanger-Foxtrot1	NPC-Dasher		Otto-Mitzi			NPC			NPC			Otto-Fred		Jackie-Cotton
Cover Empire		Mitten Kip		Cover Droid			Mulapin Brock		Mitten Abet		Cover Gundam		Genuine Magpie
Calico Siah		Calico Tad		Crescendo Nova			Calico Lux		Exie Rebound		Ardent Funfzig		Crescendo Flipper


Having built the table above, you can now breed safely knowing exactly who is related to who.

An example breeding:
TomRanger-Alpha1 + AmyRanger-Delta1 	= TomRanger-Alpha2
TomRanger-Alpha2 + MaryRanger-Echo1 	= TomRanger-Alpha3
TomRanger-Alpha3 + SuzyRanger-Foxtrot1 	= TomRanger-Alpha4
TADA!  TomRanger-Alpha4 is unrelated to AmyRanger-Delta1.  Oh No, he's much higher points!
Restart the cycle with Amy taking the pets, going Dick, Harry, Tom (so you're ending on the prior end).
Rinse and repeat.


A real example:
Cover Empire				Calico Siah				VALIDATION COLUMN
Dave			OWNER		Sarah					DO PETS IN LIST A
XXX			POINTS		XXX					EXIST IN LIST B?
Male			GENDER		Female					
Mitten Kip		Sire		Calico Tad				NO
Cover Droid		Dam		Crescendo Nova				NO
Mulapin Brock		S-P1		Calico Lux				NO
Mitten Abet		S-P2		Exie Rebound				NO
Cover Gundam		D-P1		Ardent Funfzig				NO
Genuine Magpie		D-P2		Crescendo Flipper			NO

PLAYER-PET	Sire		Dam			S-P1			S-P2			D-P1			D-P2
Calico Puppy	Cover Empire	Calico Siah		Mitten Kip		Cover Droid		Calico Tad		Crescendo Nova

You can do this manually, or you can automate this to some degree. Excel vLookup is your friend here.

TRAIT POINTS:
	The math is tweaked to favor an overall advancement every generation, but this is NOT guaranteed.

	For a given same-same breeding (200 point male + 200 point female) the outputs may vary from 170-230.
	
I did maintain records for 1000 puppies and ran the results through various logical models trying to find patterns.
The best I can give you is ROUGHLY (Mother Value + Father Value) / 2 + RANDOM(6)
(20+30)/2 = 25 + -4 = 21
(20+30)/2 = 25 + 4 = 29

This operates on a simple bell curve, and I think the center of the bell is shifted slightly right to favor players.  Somehow.  Wish I could read the code. 

	You may go many matings before you get a pet you want.

	Placing constraints on your desired puppy makes this challenging (color, breed, gender).

	However, maintaining a gender line does make it relatively easier to designate the greater time
	investment to one person (females have their heat timer to deal with for each cycle).
	I.E. - I can't idle pets at work, but my breeding partner can, so they handle females and I handle males.


Time Tracking

I track the times for pets to grow, using NICKS and then transfer those nicks to a spreadsheet.
I track this by doing: nick NN[GENERATION]-N[STAGE]-Heat# (optional if female)-Away(what time did pups get tamed away)
For example, small trained = 1, trained = 2, large = 3, very large = 4, huge = 5, enormous = 6, gigantic = 7
The following example is a Generation 22, female, who's had 9 litters.  You can see by the Away to next Heat, how I can now predict roughly when I'll go to heat.
22-1       = 14d 20h 2m 18s
22-2       = 14d 20h 33m 14s
22-3       = 14d 21h 34m
22-4       = 14d 23h 5m 48s
22-4-H1    = 15d 0h 44m 4s
22-4-H1-A  = 15d 1h 54m 48s
22-4-H2    = 15d 3h 22m 50s
22-4-H2-A  = 15d 4h 23m 32s
22-4-H3    = 15d 5h 12m 40s
22-4-H3-A  = 15d 6h 19m 14s
22-4-H4-a  = 15d 8h 15m 36s
22-4-H5    = 15d 9h 35m 48s
22-4-H5-A  = 15d 10h 39m 36s
22-4-H6    = 15d 11h 59m 24s
22-4-H6-A  = 15d 13h 5m 30s
22-4-H7    = 15d 13h 51m 2s
22-4-H7-A  = 15d 14h 53m 6s
22-5       = 15d 15h 21m 30s
22-5-H1    = 15d 15h 37m 56s
22-5-H1A   = 15d 16h 50m
22-5-H2    = 15d 17h 35m 42s
22-5-H2-A  = 15d 18h 35m 38s
