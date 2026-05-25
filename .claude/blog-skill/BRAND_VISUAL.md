# McBride PM — Brand Visual Style (for AI hero image generation)

This document is the brand visual style guide referenced by the daily blog skill. Every hero image generated for a blog post must match this style. Consistency is the brand asset — the goal is for any McBride PM blog hero to feel obviously, recognizably like a McBride PM image regardless of topic.

---

## Aesthetic in one line

**Real estate photography meets editorial documentary — warm, honest, locally grounded, never staged.**

The visual reference points are *Southern Living* editorial photography and high-end real estate listings (think Compass, not Zillow). NOT stock-photo conference rooms, NOT corporate office hand-shakes, NOT generic city skylines.

## Core style spec — include in every prompt

When you generate an image prompt for Canva (or any image API), the prompt MUST include all of the following clauses:

- **Photography style:** "realistic real estate / editorial photography, shallow depth of field where natural, warm late-afternoon or early-morning natural light, slight golden hour cast"
- **Composition:** "16:9 landscape orientation, rule-of-thirds composition, eye-level perspective unless aerial / interior is essential to subject"
- **Color palette:** "warm neutrals — cream, oak, sand, soft navy accents, muted gold accents; avoid oversaturated colors; avoid cool / blue-shifted tones"
- **Setting:** "Southeastern United States vernacular architecture — brick ranch, craftsman bungalow, traditional two-story, occasional white-painted board-and-batten; pine trees, hardwoods, manicured lawns; never palm trees, never desert, never urban Manhattan"
- **People:** "no people in frame unless the topic is specifically about people (e.g., a post about working with a property manager); if people are included, hands and partial-figure shots only — never face-forward portraits, never stock-photo handshakes"
- **Negative prompt — explicitly exclude:** "no text overlays, no logos, no watermarks, no signs with text, no captions, no oversaturated colors, no cartoon style, no illustration style, no AI-generated text artifacts, no extra fingers, no warped architecture, no fake-looking sky"

## Topic → subject mapping

When deciding what to actually photograph, choose the most specific, evocative real-world subject that matches the post topic. Some examples:

| Post topic                                    | Subject prompt                                                                                            |
|-----------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| Evans, GA neighborhood market                 | "Established brick ranch home on a tree-lined Evans, Georgia residential street, late-afternoon sun"     |
| Tenant screening                              | "Clean wood desk with a credit-report printout, fountain pen, and a small potted plant, warm window light"|
| Georgia eviction process                      | "Wooden gavel on a desk beside a folder labeled 'Dispossessory', soft natural light"                     |
| Summer maintenance / HVAC                     | "Outdoor HVAC condenser at the side of a brick home, lush green lawn, clean and well-maintained, summer light" |
| 1031 exchange                                 | "Two small architectural model homes on a desk being exchanged between two hands, soft natural light"     |
| PCS landlord / Fort Gordon                    | "Suburban home in Grovetown or Evans GA with a stylized 'For Rent' sign on a manicured front yard, no readable text on the sign" |
| Security deposit best practices               | "Calculator, ledger book, and a small set of house keys on a clean wooden surface, soft natural light"   |
| North Augusta SC rentals                      | "View of the Savannah River from a North Augusta neighborhood porch, golden hour"                         |
| Multifamily investment                        | "Three-unit Craftsman-style apartment building exterior, brick facade, mature trees"                     |
| Landlord insurance                            | "Open binder with insurance policy documents next to a small architectural model home, warm desk light"   |
| Pet policy                                    | "Friendly golden retriever lying on a hardwood floor by a sun-lit window in a clean rental interior, no people" |
| Owner financial reporting                     | "Laptop showing a clean financial dashboard mockup on a wooden desk, no readable text, no logos"          |
| Tenant turnover / make-ready                  | "Empty, freshly-painted living room interior with hardwood floors and natural light through a window"     |
| Renters insurance                             | "Set of house keys, a smartphone, and a small pet on a clean kitchen counter, warm light"                |

When the post topic doesn't fit any of these, derive a subject by asking: **what would I photograph for a Southern Living article on this topic?**

## Three images per post: hero + 2 body images

Every published post gets a hero image (frontmatter) AND two body images inserted at H2 transitions inside the post. The three images must be visually distinct from each other — not three angles of the same subject.

A good three-image set follows a wide → tight → contextual rhythm:

| Slot      | Composition       | Subject pattern                                                                         |
|-----------|-------------------|-----------------------------------------------------------------------------------------|
| Hero      | Wide / establishing | The full home, the neighborhood street, the broad architectural setting               |
| Body 1    | Tight / detail      | A specific object, fixture, or close-up element related to the first third of the post |
| Body 2    | Interior or process | A different scene type — an interior, a desk-top object arrangement, a worked surface  |

Example sets:

- **Topic: SCRA lease termination**
  - Hero: military-family neighborhood street, suburban Grovetown
  - Body 1: a manila folder labeled "Lease Termination" with a copy of PCS orders on a clean wooden desk
  - Body 2: a calculator, a keychain with a single house key, and a printed BAH chart on a kitchen counter
- **Topic: Tenant screening**
  - Hero: warm well-lit home office desk seen wide
  - Body 1: a credit-report printout overlapping a rental application
  - Body 2: a fountain pen resting on a property-management ledger book
- **Topic: Evans neighborhood market**
  - Hero: tree-lined Evans residential street, late afternoon
  - Body 1: detail of a brick mailbox at the entrance of a subdivision
  - Body 2: a clean kitchen interior with hardwood floors and natural light through a window

A weak set repeats compositions. Don't do this:
- Hero: ranch home exterior
- Body 1: ranch home exterior (slightly different angle)
- Body 2: ranch home exterior (different time of day)

That's one image three times — not three images.

## Avoid

- Stock-photo aesthetics: backlit silhouettes, generic city skyline at dusk, businesspeople in suits, conference-room handshakes
- Cartoon, illustration, or 3D-render style (we want photographic realism)
- Text inside the image (the image rendering AI will get the text wrong; never include text)
- Logos of real companies (Augusta National, Wellstar, the Army, etc.) — risk of trademark issues
- Faces front-and-center (uncanny-valley risk; also avoid implying race/age/family-status to stay clear of Fair Housing optics)
- Generic "miniature houses in a row on a desk" stock-property tropes
- Drone shots of urban skylines that aren't the actual CSRA (visual misrepresentation)
- Anything that looks staged, sterile, or corporate

## When in doubt

A simple, honest photograph of a single subject related to the topic, shot in warm natural light, with thoughtful composition, will be more on-brand than anything more elaborate. **Restraint reads as quality.**
