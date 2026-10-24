Redesign and evolve this existing Campus Signal application into ETHOS — Ethical Governance System. Do not discard the existing product structure or simply generate an unrelated new dashboard. Preserve the core concepts of signals/reports, voting where appropriate, status tracking, signal detail, anonymous submission and administrative review, but redesign the visual system and information architecture for a serious multi-organization governance platform.

The product must not look like a generic AI-generated SaaS dashboard. Avoid the stereotypical “vibecoded” appearance: no excessive rounded cards, no giant gradient hero sections, no glassmorphism, no random glowing borders, no oversized metric cards everywhere, no excessive pill-shaped elements, and no generic purple/blue AI aesthetic. Do not imitate Linear, Vercel, Notion or a typical shadcn dashboard.

Create a distinctive institutional interface that feels like a combination of a secure operations console, civic reporting infrastructure and modern enterprise software. It should feel credible enough for a university, corporation, NGO or government organization while retaining a recognizable ETHOS identity.

Keep a dark-first visual language inspired by the existing Campus Signal interface, but make it substantially more refined. Use near-black and graphite surfaces, restrained borders, strong typography, precise spacing and a limited high-contrast accent system. Cyan/teal may remain part of the ETHOS identity, but use it deliberately for actions, active states and system intelligence rather than decorating every element. Status colors should have semantic meaning.

Establish a strong typographic hierarchy. Use large typography sparingly. Operational interfaces should be dense and information-rich. Prefer structured surfaces, dividers, tables, timelines, compact panels and deliberate whitespace over collections of floating cards. Give the product subtle technical character through identifiers, timestamps, audit markers, system states and carefully chosen monospace typography, without making the application look like a hacker terminal.

Introduce ETHOS Spaces. Every organization is an isolated private environment. Users should not be able to freely browse organizations. Create an organization access experience inspired conceptually by Google Classroom and Discord, but visually original.

The initial authenticated experience should contain “Your Spaces” and “Join an Organization”. Joining must support:

secure invitation link
organization invite/access code
verified organization email/domain where enabled
optional organization-issued member/student/employee ID verification

Clearly communicate that verification proves membership in the organization but does not need to reveal the user's identity when submitting an anonymous report.

Add a compact organization switcher to the application shell for users belonging to multiple organizations. Each ETHOS Space must have its own branding, departments, reporting categories, moderators, administrators, workflows, SLA policies and data boundaries.

Redesign the main organization environment. It should contain a purposeful navigation architecture with areas such as Overview, Reports, Submit Report, My Activity/Tracking, Organization Insights and appropriate organization-specific sections. Do not show administrative functionality to ordinary members.

Preserve the existing signal/report feed concept but mature it. Reports should communicate category, anonymized identifier, status, age, priority where publicly appropriate, organization response state and community support where voting is enabled. Avoid turning every report into a large social-media card.

Redesign report submission as a serious guided workflow. Support category, department, description, location/context, attachments/evidence, urgency indicators and anonymous submission. Include clear privacy explanations. After submission, issue an anonymous tracking credential/report ID that allows the reporter to monitor progress and communicate with authorized staff without exposing identity.

Make room for ETHOS Intelligence, an AI governance layer, without turning the product into an AI chatbot. AI should operate mostly as embedded system intelligence. Design reusable UI patterns for:

automatic report categorization
department routing
duplicate/similar-report detection
summarization
severity and urgency scoring
spam and abuse detection
sensitive-information detection/redaction
evidence/media analysis
sentiment/risk indicators where appropriate
SLA breach prediction
escalation recommendations
clustering of recurring organizational problems
administrator decision support

AI decisions must be explainable. Wherever AI assigns a category, severity or recommendation, provide a compact way to inspect “Why ETHOS suggested this”. Never imply that AI autonomously makes final disciplinary or governance decisions. Clearly distinguish AI recommendations from human decisions.

Create a substantially more advanced administrative environment. The admin interface should feel like an operations console rather than a standard analytics dashboard. Include:

report queue
triage workspace
severity
category
assigned department
responsible officer/admin
SLA timer
escalation state
AI confidence
duplicate clusters
evidence state
reporter communication
internal notes
status history
resolution controls

Create a detailed case workspace where an administrator can investigate one report. Use a structured multi-column layout with the report/evidence as the primary content, case metadata and AI analysis as supporting information, and an immutable activity/audit timeline.

Add organization management. Authorized organization owners should have configuration interfaces for:

organization profile
departments
reporting categories
member roles
permissions
invite codes and links
verified domains
workflow rules
SLA rules
escalation chains
moderation policies
AI policies
transparency settings
retention/privacy settings

Design the product around a real database-backed architecture. The UI should visibly anticipate entities such as Organization, Membership, User, AnonymousIdentity, Report, Category, Department, Evidence, Vote, Comment/Message, Assignment, WorkflowEvent, AIAnalysis, SLA, Escalation, Resolution and AuditEvent. Do not expose database terminology unnecessarily to normal users, but ensure the interface can support these entities rather than being a static prototype.

Add a dedicated audit trail concept. Important actions such as creation, assignment, status transition, escalation, administrative access and resolution should appear as immutable chronological events. Provide subtle integrity indicators that could later correspond to cryptographic/hash-chain verification.

Create organization analytics that emphasize accountability rather than vanity metrics. Examples include unresolved reports, median resolution time, SLA compliance, category trends, department workload, recurring issue clusters, escalation rate and resolution outcomes. Visualizations should be restrained, legible and operational.

Design for realistic states: empty states, loading, access denied, expired invite, invalid organization code, pending membership verification, AI processing, duplicate detected, SLA approaching breach, escalated case, resolved case and archived case.

Preserve responsiveness and accessibility. Maintain strong contrast, keyboard-friendly controls and readable information density.

Most importantly, create a recognizable ETHOS design language. Someone seeing a screenshot should be able to distinguish ETHOS from a generic React admin template. Build visual identity through typography, structured information architecture, restrained technical detailing, organization context, report identifiers, audit trails and a consistent governance-oriented interaction language—not through decorative gradients or gimmicks.

Update the existing application coherently rather than merely adding disconnected pages. The result should feel like Campus Signal has matured into a production-scale governance platform.