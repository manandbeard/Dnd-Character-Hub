const fs = await import('fs');
const phase1 = `# Phase 1: Foundation, Auth & Character Core
## What & Why
Build the foundational layer of the D&D app: user authentication, the database schema for all core domain models, a rules data ingestion pipeline for SRD JSON data (races, classes, backgrounds, spells, items), and a fully functional character creation wizard and sheet UI backed by real API endpoints. This is the bedrock everything else depends on.
## Done looks like
- Users can sign up, log in, and manage their account via Clerk auth
- The database holds schemas for User, Character, RulesReference (race, class, background, item, spell), and derived stat tables
- SRD JSON data is seeded/importable into the database via a script
- Users can create a character through a multi-step wizard (Race → Class → Background → Abilities → Skills → Equipment)
- A full character sheet is viewable and editable (stats, derived values, HP, AC, skills, saving throws, spells, inventory)
- All stat calculations (ability modifiers, proficiency bonus, skill bonuses, spell DC/attack, passive scores) are computed server-side
- The web app is live at the root path and navigable
## Out of scope
- Campaign/party features (Phase 2)
- AI features (Phase 3)
- Real-time / WebSocket features (Phase 2+)
- Social/discovery features (Phase 4)
## Steps
1. **Auth setup** — Integrate Clerk auth; add user model and session middleware to the Express API server; protect all character endpoints.
2. **Database schema** — Define Drizzle ORM schemas for User, Character (core stats, derived fields, ability scores, HP), RulesReference tables (Race, Class, Background, Item, Spell), and CharacterInventory; run the initial migration.
3. **Rules data seeder** — Write a script that ingests SRD-compatible JSON (races, classes, backgrounds, spells, items) into the RulesReference tables. Expose a RulesService module with typed query methods (getClass, getRace, getSpellList, getStartingEquipment, computeModifiers, etc.).
4. **OpenAPI spec & codegen** — Define the full API contract in openapi.yaml covering: auth/user endpoints, character CRUD, rules data endpoints (list races/classes/backgrounds/spells/items), and derived stats endpoint. Run codegen to generate typed React Query hooks.
5. **Backend routes** — Implement all API route handlers using Zod validation and the RulesService for business logic (character creation, stat derivation, level-up calculations).
6. **Character builder & sheet frontend** — Build the React/Vite web app at the root path: character list, multi-step character creation wizard with real rules data choices, and a full multi-tab character sheet (Overview, Abilities/Skills, Combat, Spells, Inventory, Features & Traits, Notes). Wire all hooks to live API data.
## Relevant files
- \`lib/api-spec/openapi.yaml\`
- \`lib/db/src/schema/index.ts\`
- \`artifacts/api-server/src/routes/index.ts\`
- \`artifacts/api-server/src/app.ts\`
- \`lib/api-client-react/src/generated/api.ts\`
`;
const phase2 = `# Phase 2: Campaigns & Shared Party Ledger
## What & Why
Introduce the campaign layer — the social container that groups characters, enables DM/player collaboration, and hosts the Shared Party Ledger. This phase delivers the campaign dashboard, party overview, and the full party inventory/ledger system with currency management and transaction history.
## Done looks like
- Users can create and join campaigns (via invite code) with DM and player roles
- A campaign dashboard shows all party members with key stats (HP, AC, passive Perception, conditions)
- Characters can be attached to a campaign
- A Party Inventory screen shows shared items with ownership, filters, and search
- A Party Currency Pool supports all D&D denominations with automatic conversion and coin containers
- Items can be moved between individual character inventories and the party stash (drag-and-drop or action menus)
- Every inventory transaction is recorded as a LedgerEntry with timestamp, actor, and notes
- A Transaction History tab shows the full audit trail with filters
- Helper actions exist for even coin split across party members (with remainder handling) and stack splitting
## Out of scope
- AI-assisted ledger suggestions (Phase 3)
- Real-time WebSocket sync (deferred, static polling acceptable for MVP)
- Session recap / notes (Phase 3)
- Social discovery (Phase 4)
## Steps
1. **Campaign & membership schema** — Add Campaign, CampaignMember (roles: DM/player), and CampaignCharacter join tables to the database schema.
2. **Party ledger schema** — Add PartyInventory, PartyItem (with ownership field), CurrencyEntry (per character and party pool, with denomination), and LedgerEntry tables. Each LedgerEntry records type, timestamp, source/target entity, items and currency involved, and actor user ID.
3. **Campaign & ledger API** — Extend the OpenAPI spec with endpoints for: campaign CRUD, invite code generation/redemption, campaign membership management, party inventory (list/add/remove/transfer items), party currency pool operations, ledger entry listing with filters, and the coin-split helper endpoint. Run codegen.
4. **Campaign backend routes** — Implement all campaign and party ledger route handlers with proper access control (only campaign members can read; only DM or item owner can modify).
5. **Campaign & party frontend** — Build the campaign dashboard (member cards with key stats, quick-link to sheets), Party Inventory tab (item list with ownership, party currency pool, transfer actions), and Transaction History tab. Wire all views to live API data.
## Relevant files
- \`lib/api-spec/openapi.yaml\`
- \`lib/db/src/schema/index.ts\`
- \`artifacts/api-server/src/routes/index.ts\`
- \`lib/api-client-react/src/generated/api.ts\`
`;
const phase3 = `# Phase 3: AI-Enhanced Workflows
## What & Why
Layer AI capabilities on top of the existing character and campaign data to provide high-value, context-aware assistance: backstory generation, a rules/build advisor, session recap generation, and a party ledger assistant. AI features are additive — all core flows continue to work without AI responses.
## Done looks like
- Users can click "Generate Backstory" in the character creator and receive a tailored 300+ word narrative based on their race, class, background, alignment, and optional player prompts
- Users can regenerate or refine the backstory with follow-up prompts
- A "Build Advisor" sidebar on the character sheet answers rules questions and suggests feats/spells/items based on build goals
- DMs can trigger "Generate Recap" on a campaign session (with raw notes input) and get a structured in-character or neutral recap with highlighted unresolved threads
- A Party Ledger AI helper can suggest fair treasure splits, flag under-geared characters, and summarize debt/loan balances
- All AI endpoints accept a cancel/timeout so slow responses don't block the UI
- AI features are clearly labeled and optional — the app is fully usable without them
## Out of scope
- AI-generated character portrait art (future phase)
- Autonomous AI agents / scheduled AI jobs (future phase)
- Social matching AI (Phase 4)
## Steps
1. **AI service abstraction** — Create an AiService module in the API server that wraps the Replit-provided LLM integration (OpenAI-compatible). It accepts structured prompt contexts and returns typed responses. All AI endpoints route through this service.
2. **Backstory generation endpoint** — Implement POST /ai/characters/:id/backstory that reads the character's race, class, background, alignment, and an optional player prompt, constructs a tailored prompt with SRD context, and returns a backstory + personality traits object. Store the result on the character record.
3. **Build advisor endpoint** — Implement POST /ai/characters/:id/advice that accepts a build goal string and returns feat, spell, and item suggestions grounded in the character's current build and the SRD rules data.
4. **Session recap endpoint** — Implement POST /ai/campaigns/:id/recap that accepts raw session notes text and returns a structured recap (summary, unresolved hooks, NPC highlights).
5. **Party ledger assistant endpoint** — Implement POST /ai/campaigns/:id/ledger-advice that reads the current party inventory, currency pool, and recent ledger entries to return treasure split suggestions and under-geared character flags.
6. **Frontend AI integration** — Add the "Generate Backstory" flow in the character creator, a collapsible Build Advisor sidebar on the character sheet, a "Generate Recap" action on campaign sessions, and a Ledger Assistant panel in Party Inventory. All panels show loading states and graceful error handling.
## Relevant files
- \`artifacts/api-server/src/routes/index.ts\`
- \`artifacts/api-server/src/app.ts\`
- \`lib/api-spec/openapi.yaml\`
- \`lib/api-client-react/src/generated/api.ts\`
`;
const phase4 = `# Phase 4: Social Graph & Campaign Discovery
## What & Why
Enable players to discover campaigns, build public profiles, and connect with other players — turning the app into a light social platform for finding D&D groups. Includes campaign recruitment listings, join request flows, safety primitives, and extended player profiles.
## Done looks like
- Users have public profiles with playstyle tags (roleplay-heavy, tactical, rules-light), time zone, experience level, and availability windows
- DMs can publish campaign recruitment listings with system, level range, schedule, and description; listings are searchable and filterable
- Players can request to join a public campaign; DMs can approve or decline
- Campaign privacy controls exist: public, invite-only (existing behavior), or private (DM only)
- Basic safety tools are present: soft-block a player from your campaigns, report a user
- Campaign listings page is accessible without login (read-only)
## Out of scope
- AI-powered player/campaign matching (stretch goal, post-MVP)
- External identity linking (Discord, Google OAuth — deferred)
- Calendar/scheduling integrations
- In-app notifications/email for join requests
## Steps
1. **Extended user profile schema** — Add playstyle tags, experience level, time zone, and availability fields to the User table.
2. **Campaign discovery schema & API** — Add a \`isPublic\` / privacy enum to Campaign, a CampaignRecruitmentListing model, and a JoinRequest table. Expose public listing endpoints (no auth required for reads) with filters for system, level, and schedule.
3. **Join request flow** — Implement the join request creation and DM approval/decline endpoints with proper authorization checks.
4. **Safety primitives** — Add a UserBlock table and a Report table (user/campaign reports). Expose block/unblock and report endpoints. Filter out blocked users from campaign listings.
5. **Frontend: profiles & discovery** — Build the player profile page (view and edit own profile), the campaign discovery/search page (filterable public listings with join request button), and the DM's join request inbox on the campaign dashboard.
## Relevant files
- \`lib/api-spec/openapi.yaml\`
- \`lib/db/src/schema/index.ts\`
- \`artifacts/api-server/src/routes/index.ts\`
- \`lib/api-client-react/src/generated/api.ts\`
`;
fs.writeFileSync('.local/tasks/phase1-foundation.md', phase1);
fs.writeFileSync('.local/tasks/phase2-campaigns-ledger.md', phase2);
fs.writeFileSync('.local/tasks/phase3-ai.md', phase3);
fs.writeFileSync('.local/tasks/phase4-social.md', phase4);
console.log('All plan files written.');