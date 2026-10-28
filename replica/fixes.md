# What the original's users hate, what they ask for, and what Taskraft fixes

Date 2026-10-28. Source sheet: `replica/reviews.csv` (1,255 rows, 1,252 after `reviews.py` removed 3 duplicates). Ranked themes: `replica/feedback.md` (themes in `replica/themes.json`, the skill's defaults plus this category's words). Every quote below is verbatim from the sheet with its link. Nothing here was written by us.

## The sample, honestly

| source | rows | how read | range | notes |
| --- | --- | --- | --- | --- |
| App Store | 918 | Apple's customer-reviews RSS feed (US, GB, CA, AU, 10 pages each, most recent first) | 2017-10 to 2026-10 | 366 five-star, 283 one-star. Since 2025 the mix is 84 one-star to 60 five-star (188 reviews). |
| Trustpilot | 100 | read in the browser, 1 to 3 star filter, pages 1 to 5 of 19 | 2025-07 to 2026-10 | low ratings only, by design: 3,445 reviews exist at 1 to 3 stars |
| Hacker News | 177 | Algolia API, comments mentioning the product | 2017-12 to 2026-10 | mostly incidental mentions; weak signal about the product itself, kept for honesty |
| Feature board | 60 | the original's own request board, Trending sort, read in the browser | votes as of 2026-10-28 | vote counts are the board's; no dates |

Not reached: Reddit (every request to the public JSON endpoints returned `HTTP 403: Blocked`), G2 and Capterra (not read this round), Google Play (no official feed; not read this round). Changelog: not cross-checked, so a request below may already have shipped on the original's side; the vote counts are what the board showed today.

Because the Trustpilot slice is low ratings only and the App Store feed skews to people with a grievance, the shares below say what unhappy users complain about, not how many users are unhappy.

## 1. What they hate

Ranked by the `feedback.md` score (weight by low rating and recency), with the review count and sources from that table.

1. **Support is a bot and a human never comes.** "Support that does not answer": 81 reviews, 3 sources; "Support is a bot; no human": 23 reviews, 2 sources. 39 of the 100 Trustpilot reviews mention support, a bot or a human.
   - "We are on an Enterprise level subscription, and I just find it extremely ironic that as I wait in this never-ending line to talk to a human, I'm staring at their web page which promises 'lightning fast responses' and 'human-centric support'." (trustpilot, 1*, 2026-09-22) https://www.trustpilot.com/reviews/6ab294b8223fb509e707cdb5
   - "the product itself is fantastic. your imagination and your own time are the only limits. […] The customer support is useless! I have tried getting in contact via email and online chat, both of which are clearly run by AI." (trustpilot, 1*, 2026-10-07) https://www.trustpilot.com/reviews/6ac652f73af1b3fa3f92b483
2. **Price: seat minimums, per-seat quotes, add-ons for basics.** "Price and paywalls": 158 reviews, 3 sources; "Seat minimums and per-seat pricing": 26 reviews, 3 sources; "Plan limits": 11 reviews, 4 sources (thin).
   - "But I'm a solopreneur, and I have to pay for THREE SEATS minimum when it's just me?? And then, when I begin to use the tool, I discover that basic features like table filtering are not included in the Basic tier??" (trustpilot, 1*, 2026-10-05) https://www.trustpilot.com/reviews/6ac3dd074be4f72de2978644
   - "You'll get a free trial using only one seat, but when you move to a paid plan $19 (seems fine right)..after 14 days you will be forced into a plan with 5 seats. That's $19 per seat. This was not disclosed anywhere" (app-store, 1*, 2026-01-11) https://itunes.apple.com/us/review?id=1290128888&type=Purple%20Software
   - "I'm honestly tired of the endless add ons. You pay for the main plan and then find out basic features like AI, automations, extra tools and integrations cost even more." (trustpilot, 2*, 2026-09-22) https://www.trustpilot.com/reviews/6ab23fcf47d0729ad4fb92d7
3. **The mobile app is a stripped-down second product.** "The mobile app itself": 268 reviews, 4 sources (App Store dominated, as expected from the feed); "Platforms, offline and mobile": 125 reviews, 3 sources.
   - "The desktop version is fine but the mobile app is completely useless. You can't access anything or add any new notes or activities. It seems to have been this way for years based off of other reviews." (app-store, 1*, 2026-07-20) https://itunes.apple.com/ca/review?id=1290128888&type=Purple%20Software
   - "I would love to be able to use the iPad app in my workflow, but the fact that sorting/filtering does not mimic what you see in the desktop app is terribly frustrating." (app-store, 2*) https://itunes.apple.com/us/review?id=1290128888&type=Purple%20Software
   - "Monday doesn't allow you to access the web version and forces you into the mobile version. Can only use this app when sitting at a desk." (app-store, 1*, 2026-03-10) https://itunes.apple.com/us/review?id=1290128888&type=Purple%20Software
4. **Billing: hard to cancel, data held hostage when a trial ends.** "Billing, cancelling and refunds": 64 reviews, 3 sources, average 1.3 stars.
   - "they onboard you as free for two users then force you to be on a plan a month later or you lose everything you worked on" (trustpilot, 1*, 2026-10-15) https://www.trustpilot.com/reviews/6ad0d5bf6a49b8ea459aa802
   - "The chatbot said it had checked my account and confirmed refund eligibility. After I provided the requested cancellation consent, it reversed that answer." (trustpilot, 1*, 2026-10-14) https://www.trustpilot.com/reviews/6acfb17a0128c8719768b068
5. **Bugs people hit daily: My Work not updating, notifications stuck, login loops.** "Bugs and crashes": 135 reviews, 4 sources; "Notifications": 37, 3 sources; "Login and account": 46, 3 sources.
   - "if I have a task marked "In Process" and change it to "Waiting for Approval," the My Work page often won't update to reflect that change. I can refresh it multiple times, completely close the app, and reopen it, and it still shows the wrong status." (app-store, 2*, 2026-10-15) https://itunes.apple.com/us/review?id=1290128888&type=Purple%20Software
   - "I can't see any of my notifications in the app, it just keeps loading forever." (app-store, 1*, 2026-08-06) https://itunes.apple.com/us/review?id=1290128888&type=Purple%20Software
   - "Logging in is a nightmare, their support systems are always down and two factor authentication is a mess." (app-store, 1*, 2025-06-25) https://itunes.apple.com/us/review?id=1290128888&type=Purple%20Software
6. **AI pushed where nobody asked for it.** Thin as a theme (14 reviews, 2 sources) but 29 of the 100 Trustpilot reviews mention AI, almost always as a complaint.
   - "You can't click anywhere without dodging unremovable AI prompts or fighting through a cluttered sidebar. Worst of all, their AI bot keeps barging into private client meetings even after we explicitly disabled it in settings." (trustpilot, 1*, 2026-08-18) https://www.trustpilot.com/reviews/6a84b801cd93c0e847bc05ed
   - "Too focussed on AI which doesn't work that well. Unsubscribe from emails is still broken for the last few months." (trustpilot, 1*, 2026-09-05) https://www.trustpilot.com/reviews/6a9bcb3fe4c2d314d6de040f
7. **Confusing to find things.** "Confusing or clunky": 78 reviews, 4 sources; "Finding things: search and navigation": 70 reviews, 4 sources. Mostly App Store, mostly about the app's navigation; no single quote carries it.

Thin (listed, not a trend): "A redesign or update made it worse" 17 reviews, 2 sources; "Ads" 27 reviews but on reading they are marketing emails, not ads in the product.

## 2. What is missing

From the original's own feature board (votes as shown today, one source, so each is "many votes" rather than "many reviews") and from the 3 and 4 star App Store reviews.

| ask | evidence | Taskraft today |
| --- | --- | --- |
| Reorder views | 427 votes https://community.monday.com/feature-requests/post/ability-to-reorder-views-LuXRWJwLMuNVO1a | done (round three) |
| Subitems under subitems | 365 votes https://community.monday.com/feature-requests/post/subitems-under-subitems-further-subitem-hierarchy-h3g6oBCBAmMHsNw | one level only |
| Wrap text in headings and cells | 352 votes https://community.monday.com/feature-requests/post/wrap-text-in-column-headings-and-or-cells-a1tJx4Hctv2d2bF | no |
| One item on several boards | 310 votes https://community.monday.com/feature-requests/post/item-lives-on-multiple-boards-MylxXEVdGhZeSmn | no (connect boards out of scope) |
| Recurring tasks | 259 votes https://community.monday.com/feature-requests/post/recurring-repeating-tasks-HNovGOCw46RHia6 | no |
| Undo from the activity log | 227 votes https://community.monday.com/feature-requests/post/adding-an-undo-feature-in-activity-tab-CNNHAGVYwXc9QAp | undo toasts and trash only |
| Holiday and blackout days in Gantt | 224 votes https://community.monday.com/feature-requests/post/holiday-blackout-days-in-timeline-gantt-views-Szn6GFFIYuYH2JT | weekends only |
| Hide a view, including the main table | 133 + 76 votes https://community.monday.com/feature-requests/post/hide-option-for-main-table-view-vgvVFFjXBK27waS and https://community.monday.com/feature-requests/post/hide-views-Ih3I9doZWv3h9v1 | no |
| Internal-only comments on shared boards | 75 votes https://community.monday.com/feature-requests/post/internal-only-comments-kli6AufXMMV2kaX | no |
| Required columns | 52 votes https://community.monday.com/feature-requests/post/set-columns-as-required-to-be-filled-Fcu3bu90W6SJ4zV | no |
| Type a date instead of scrolling a picker | 50 votes https://community.monday.com/feature-requests/post/enter-date-versus-scrolling-to-find-date-on-date-picker-gDWhdNy0qVIjCGI | done (native date input) |
| Let viewers comment | 49 votes https://community.monday.com/feature-requests/post/allow-viewers-to-comment-oSvMdUKvg38ty7E | done (view-and-comment permission set) |
| Work offline | "But it really needs to be able to work off-line" (app-store, 4*, 2026-04-09) https://itunes.apple.com/us/review?id=1290128888&type=Purple%20Software | queue exists; lost on reload |
| A My Work view across projects | "I can look by due date grouping, but there is no overall my work vie[w]" (app-store, 1*, 2026-09-10) https://itunes.apple.com/us/review?id=1290128888&type=Purple%20Software | buckets by date; no views |
| Restore archived items from a phone | "there is no way to do this without using the web version from a laptop" (app-store, 4*) https://itunes.apple.com/us/review?id=1290128888&type=Purple%20Software | done (one app; trash works on a phone) |
| Export everything | "a few obviously missing features - proper export all function, limited iPad functionality" (trustpilot, 1*, 2026-09-05) https://www.trustpilot.com/reviews/6a9bcb3fe4c2d314d6de040f | selected rows only |

All 60 board rows with their votes are in `replica/reviews.csv` (source `feature-board`).

## 3. What is unsolved (positioning)

1. **One person, or two.** The seat minimum turns a solo business away at checkout: "You can only purchase 3 seats as a minimum, which for a solo business is pointless. Why price quoted is PER SEAT, not the total price." (trustpilot, 2*, 2026-01-28) https://www.trustpilot.com/reviews/697a453f195ec72630f8a494. Also "you need to pay at least 2 seats. Plus the fact that you need to pay an extra $11 Dolar's a month per hear to have charts" (app-store, 3*, 2026-02-26) https://itunes.apple.com/au/review?id=1290128888&type=Purple%20Software.
2. **Teams that work from a phone or an iPad.** Salons, sites, field staff: "We use this in our Salon and Spa to be in communication with our team […] by the time you get to the 15th you cannot open it on your phone and if you try to type something, it deletes it" (app-store, 3*, 2026-07-16) https://itunes.apple.com/ca/review?id=1290128888&type=Purple%20Software.
3. **Small businesses who need a human when something breaks.** "if your customers depend on your software to operate their businesses, there has to be a way to get meaningful help when that software isn't working correctly." (trustpilot, 1*, 2026-09-28) https://www.trustpilot.com/reviews/6abab2c9f50e2ac27f1c1422.
4. **Agencies sharing boards with clients.** Guest teams are enterprise-only on the original: "Basic features are locked behind paywall, for example teams for guests are in enterprise plan" (trustpilot, 1*, 2026-08-01) https://www.trustpilot.com/reviews/6a6e4f5e7817f37de301d9ab; internal-only comments have 75 votes.

## 4. The fix plan

Evidence times how cheaply Taskraft can do it. Each is a row in `replica/features.csv` with `original` set to `no`.

| # | fix | size | skill | evidence |
| --- | --- | --- | --- | --- |
| 1 | **One price per person from one person up; filters, charts, automations and views in every plan; no add-ons.** | policy | replica-launch | price 158 reviews / 3 sources; seats 26 / 3; Trustpilot 6ac3dd07, 697a453f |
| 2 | **A human answers.** In-app "Get help" that sends the page, board and browser details to a person's inbox, with the promised reply time shown; no bot in front of it. | S | replica-build, replica-launch | support 81 / 3; bot 23 / 2; Trustpilot 6ab294b8, 6ac652f7 |
| 3 | **Export everything, always.** Whole board and whole workspace as CSV (one file per board, zipped) from the board menu and from settings, on every plan, including after a downgrade. Builds on the bulk-bar CSV. | S | replica-build | billing 64 / 3; Trustpilot 6ad0d5bf, 6a9bcb3f |
| 4 | **Downgrade never deletes.** When a plan lapses, boards go read-only with export open; nothing is removed. | policy + S (read-only flag) | replica-launch, replica-backend | Trustpilot 6ad0d5bf ("or you lose everything you worked on") |
| 5 | **Revert from the activity log.** Each cell change in Activity gets a Revert button (the log already stores before and after). | M | replica-build | 227 votes; "undo" theme 6 reviews / 3 sources (thin) |
| 6 | **Wrap text per column.** A column setting that wraps cell and heading text; rows grow. | S | replica-build | 352 votes |
| 7 | **Hide a view** from everyone but editors, including the main table. | S | replica-build | 133 + 76 votes |
| 8 | **Recurring items.** An automation recipe "every day / week / month, create an item like this one". | M | replica-backend | 259 votes; app-store 4* "Please make it easy to repeat different tasks again without automations" |

Already true and worth saying out loud (also rows with `original = no`): one web app everywhere, installable, the same views and filters on a phone (mobile 268 reviews / 4 sources); no AI anywhere in the product (AI 29 of 100 Trustpilot reviews); viewers can comment; dates are typed, not scrolled.

Pricing and billing complaints (1, 4) go to `/replica-launch`.

## 5. The angle

**A. For one-to-ten person businesses** who are quoted per seat, forced to buy three, and then cannot reach a human, Taskraft is one price per person from one person up, every feature included, and a person who writes back. Evidence: price 158 reviews / 3 sources; seats 26 / 3; support 81 / 3; bot 23 / 2.

**B. For teams who run their day from a phone or an iPad** and get a stripped-down app, Taskraft is one app everywhere: the same boards, views and filters on a phone, installable, with edits that wait for a signal. Evidence: mobile 268 / 4; platforms 125 / 3.

**C. For teams who have been burned by lock-in**, Taskraft keeps a Revert on every change, exports everything in one click, and goes read-only, never empty, when a plan lapses. Evidence: billing 64 / 3; undo 227 votes; export quotes above.

**Recommendation: A**, with B as the product proof in the first screenshots and C as the trust line on the pricing page. A is the only angle that is strong in all three recent sources (App Store 2026, Trustpilot 2026, the board's seat and add-on threads), and it costs policy, not engineering. B is already built. C is the next build round.

Do not put the original's name in the app name, ads or store listing. A comparison page is a legal question for a lawyer in the owner's country.

## Output of this step
`replica/reviews.csv` (1,255 rows), `replica/feedback.md`, `replica/themes.json`, this file, 12 new rows in `replica/features.csv`. Next: `/replica-brand`.
