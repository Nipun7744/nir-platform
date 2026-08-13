# NIR Platform — Requirements Gap Analysis Report

**Documents compared:**
1. **ToR** — Terms of Reference for Develop and Implement National Innovation Repository (NIR) System (`ToR NIR.docx`)
2. **SRS** — Software Requirements Specification for the NIR Platform, ISO/IEC/IEEE 29148:2018 (`SRS_NIR_Platform with UML.docx`)
3. **Policy** — National Innovation Policy of Bangladesh – 2026, Zero Draft (`Innovation Policy Zero Draft.docx`)

**Prepared:** 2026-07-23
**Total findings:** 40 (8 High · 27 Medium · 5 Low), across 7 categories.

**Caveat on source completeness:** The ToR's Deliverables/Payment Schedule (§14), Work Distribution and Team Composition (§15), and Human Resource Qualification Criteria sections rendered as embedded tables/images that could not be extracted as text. Findings below are based on the text that could be extracted; anything in those specific tables could not be cross-checked and is not represented in this report.

---

## Executive Summary

The SRS is, on the whole, a faithful and often more rigorous elaboration of the ToR — it adds unique IDs, priorities, use cases, and a centralized CMS/reference-data model that the ToR only implies. However, the comparison surfaces three systemic risk patterns worth a2i's attention before design sign-off:

1. **Silent renumbering and silent scope decisions.** The SRS reshuffles the ToR's module numbering (Module 4 ≠ Component 4) and introduces at least one net-new component (Innovation Management) and several specific, numeric commitments (80% test coverage, monthly code handovers) that do not trace back to the ToR. None of these are flagged as vendor-proposed additions requiring approval — they read as if they were already agreed.
2. **Compliance detail is lost in the "translation" from ToR to SRS.** The ToR's accessibility checklist (24 items), testing taxonomy (9 named test types), risk management plan, and training obligations are each summarized down to a sentence or two in the SRS, or dropped outright (Risk Management Plan has no SRS presence at all).
3. **The Policy's ambition for NIR exceeds the ToR/SRS's system boundary.** The Policy treats NIR as national infrastructure feeding a future Innovation Policy Execution Unit (IPEU) and National Innovation Council (NIC); the ToR/SRS scope NIR as an a2i-owned, a2i-hosted, a2i-administered platform. No document addresses the governance handoff this implies.

---

## Component / Module Cross-Reference

The ToR's 8 modules (§5.3.1) and the SRS's 8 components (§3) do not share the same numbering, which creates real risk when either document is cited by number in a contract conversation.

| ToR Module | ToR Name | SRS Component | SRS Name | Status |
|---|---|---|---|---|
| 1 | Innovation Registration & Submission | C1 | Innovation Submission & Evaluation System | Merged with Module 2 |
| 2 | Evaluation & Recognition | C1 | (same) | Merged |
| 3 | Investor & Funding Matchmaking | C2 | Innovation Funding Matchmaking | Aligned, renamed |
| 4 | Innovation Repository & Knowledge Management | C3 | Repository & Knowledge Management | Aligned, **renumbered** |
| 5 | Communication & Stakeholder Engagement | C4 | Communication & Stakeholder Engagement | Aligned, **renumbered** + CMS module added |
| 6 | Performance Monitoring & Reporting | C5 | Performance Monitoring & Reporting | Aligned, **renumbered** |
| 7 | Ministry Innovation Submission | C8 | Ministry Innovation Submission & Annual Reporting | Aligned, **renumbered** |
| 8 | Mentor Engagement & Guidance | C6 | Mentorship & Expert Guidance | Aligned, **renumbered** |
| — | *(no ToR source)* | C7 | Innovation Management | **New — not sourced from ToR** |

---

## 1. Missing Requirements

**M1 — [High] iBAS++ integration dropped.** ToR §12.4 lists iBAS++ (financial/budget system) as an optional integration point, and it appears in the ToR's own abbreviations list. SRS §4.3 (External Interfaces) omits it entirely — not scoped in, not explicitly excluded.

**M2 — [Medium] IP-status field missing from the SRS data model.** ToR §4 requires capturing patent/IP status as one of three fixed values: *Patented, Patent Pending, Under Processing*. SRS §6.1's Innovation entity has no such attribute; FR-C1.M2.05 covers only advisory flagging, not status storage.

**M3 — [Medium] "SQTC Testing" required but never defined, and dropped from the SRS.** ToR §6 and §7.5 both mandate "SQTC Testing" / "SQTC test report," but the acronym is undefined anywhere in the ToR (it's absent even from the ToR's own abbreviations list). The SRS carries no equivalent requirement. Needs a2i clarification regardless of which document is authoritative.

**M4 — [High] Five-month delivery window not carried into the SRS.** ToR §14 fixes delivery within 5 months of contract signing. SRS Appendix A lists delivery phases (Inception → Support) with deliverables but no durations or milestone dates anywhere.

**M5 — [High] Risk Management Plan has no SRS presence.** ToR §12.9 mandates a detailed plan covering qualitative and quantitative risk analysis across technical, operational, financial, schedule, compliance, and external categories. The SRS has no section, requirement, or traceability-matrix row addressing risk management at all.

**M6 — [Medium] Named test types thinned from nine to three.** ToR §12.5 lists Unit, Functional, Integration, System, Acceptance, Compatibility, Accessibility, Performance, Security (OWASP), Regression, Usability, Vulnerability/Penetration, and VPAT testing — each with its own report. SRS §5.8 compresses this to "functional, security, and performance testing" plus an 80% coverage figure. Compatibility, Regression, Usability, and VPAT testing are not separately named.

**M7 — [High] 24-point accessibility checklist not carried forward.** ToR §10.8 enumerates 24 specific accessibility requirements (sign-language video, blink/flicker frequency limits, style-sheet override support, skip-navigation links, accessibility plugin features, HTML/CSS validation, etc.). SRS §4.1/§5.4 reduce this to one sentence covering alt-text, screen-reader compatibility, keyboard navigation, and color contrast.

**M8 — [Medium] Security & Privacy Plan not listed as an SRS deliverable.** ToR §7 requires the Firm to "submit a comprehensive Security and Privacy Plan during the System Design phase." SRS Appendix A's Design-phase deliverables (UI/UX assets, architecture docs, API design, SDD) do not name this plan.

**M9 — [Low] Training obligations thinned.** ToR §12.11 specifies quarterly mini-training sessions, Training of Trainers (ToT), dedicated resource persons, and operational manuals. SRS Appendix A reduces this to "training materials, recorded video tutorials."

**M10 — [Medium] Explicit 24/7 support commitment dropped.** ToR §12.12 states the Firm must offer 24/7 support for bill generation, report generation, server issues, and notifications. SRS Appendix A lists only generic Support-phase deliverables (SLA document, maintenance logs, issue tracker) without restating the 24/7 obligation.

**M11 — [Medium] Mentor user class missing from the ToR's own user table.** ToR §6's user-role table lists 11 classes and never includes "Mentor," despite ToR Module 8 defining a full mentor feature set. SRS §2.3 correctly adds Mentor as a 12th class — a silent (if sensible) repair of a ToR authoring gap that should be confirmed with a2i since it wasn't explicit scope.

**M12 — [Medium] IPEU/NIC not represented as a system stakeholder.** Policy §10.2 assigns the Innovation Policy Execution Unit a role consuming NIR's monitoring data. Neither the ToR's nor the SRS's user-role tables name IPEU or the National Innovation Council as an actor or access level.

---

## 2. Contradictions

**C1 — [Medium] SRS traceability matrix cites ToR section numbers that don't exist.** SRS §7 maps each component to "TOR §5.1" through "TOR §5.8." The actual ToR has no such subsections — its real structure is §5.1 Objectives, §5.2 Scope, §5.3 Functional Requirements, with Modules 1–8 nested under §5.3.1. The citation scheme appears fabricated, which undermines the traceability matrix's purpose as an audit tool.

**C2 — [High] Component numbering reshuffled without a changelog.** See the cross-reference table above. Anyone citing "Module 4" (ToR) or "Component 4" (SRS) is referring to two different scope areas. This is a real contract-compliance risk in review meetings and change-order discussions.

**C3 — [High] SRS Component 7 ("Innovation Management") is a net-new component.** Its four requirements (track progress, review/comment, upload documents, update fund-disbursement info) overlap with ToR Module 6's "Fund Disbursement Record" but establish a new editing authority and pipeline-tracking capability the ToR never scoped as a distinct component. Needs explicit a2i sign-off as an addition, not an assumption that it was already agreed.

**C4 — [Medium] Anonymous review downgraded from mandatory to optional.** ToR §6 states flatly: "Anonymous Reviews: Evaluators access submissions anonymously" — phrased as an absolute requirement. SRS FR-C1.M2.06 reframes this as an optional "anonymized review mode" at Medium priority.

**C5 — [Medium] "Should" quietly became "shall" for the concurrent-user target.** ToR §10.2 uses recommend-level language: "System **should** handle at least 1000 concurrent users" — and the SRS's own document conventions (§1.2) define "should" as recommended, not mandatory. SRS NFR-PERF.01 restates this as "**shall**," a binding requirement, without flagging the change in obligation level.

**C6 — [Medium] Monthly code-handover cadence invented.** SRS §5.9 fixes handovers at "every one (1) month from the first delivery milestone." The ToR only requires handover at final closure plus continuously-updated Git access — no monthly cadence appears anywhere in the ToR text. A vendor could reasonably contest this as scope beyond the signed ToR.

**C7 — [Medium] 80% unit-test-coverage threshold invented.** SRS §5.8 sets this specific numeric bar; the ToR never specifies a coverage percentage anywhere in its testing or QA sections.

**C8 — [Medium] ToR self-contradicts on accessibility compliance level.** ToR §10.8's heading claims "WCAG 2.2 compliant," but checklist item 24 in the same section says "Have to follow the WCAG 2.1 Level A Guidelines at least" — 2.1 Level A is materially lower than 2.2 Level AA. The SRS silently resolves this by asserting "WCAG 2.2 Level AA" throughout, without flagging that it's overriding an internal ToR inconsistency. Should be explicitly reconciled with a2i rather than resolved silently.

**C9 — [Medium] Overlapping user-role definitions in the ToR, resolved inconsistently by the SRS.** ToR's "Investor as Individual" (row 4, 100+ users) and "Industry Representatives/Experts" (row 5, 500+ users) carry identical role descriptions. SRS silently drops "Industry Representatives/Experts" as a distinct class instead of documenting the merge — leaving 500+ estimated users' access rights unaccounted for.

---

## 3. Functional Gaps

**F1 — [Medium] No defined integration with DPDT / an IP Registration Authority.** Policy §6.1 envisions a "streamlined IP Registration and Commercialization Authority," and SRS FR-C1.M2.05 names DPDT as a dependency for IP-advisory flagging — but no requirement in either the ToR or SRS specifies an actual API, data exchange, or workflow connecting NIR to DPDT. The linkage is named but never specified.

**F2 — [Medium] National Innovation Excellence Ranking has no system support.** Policy §10.3 calls for an annual cross-sector ranking. Neither the ToR nor the SRS defines a requirement, scoring model, or report capable of producing this ranking from NIR data.

**F3 — [Medium] National-level KPI scope mismatch.** Policy §4.9 envisions an "Innovation Dashboard with KPIs for real-time tracking" at the national-policy level (R&D investment, GII standing, sectoral innovation counts). SRS's KPI Dashboard (FR-C5.M1.05) is scoped only to internal operational metrics (average review time, adoption rate).

**F4 — [Medium] Native mobile app scope left undefined.** The ToR's Conclusion states the platform will be delivered as "web-based and optionally mobile-accessible," and its handover protocol (§10.14) requests "mobile app documentation... if applicable." The SRS never addresses whether a native/hybrid app is in or out of scope — it specifies only responsive web across desktop/tablet/mobile browsers.

**F5 — [Medium] Diaspora/international-collaboration features absent.** Policy §7 (international partnerships, diaspora talent/brain-gain strategy, global expos) has no corresponding NIR feature in either the ToR or SRS.

**F6 — [High] IPEU/NIC governance handoff unaddressed.** The Policy positions NIR as national infrastructure eventually overseen by the NIC/IPEU. The ToR/SRS scope NIR entirely as an a2i-operated, a2i-hosted, a2i-administered system (a2i Sign-off Committee, a2i-nominated data center, a2i Innovation Lab Team as Platform Administrator). No document addresses the eventual governance transition — this has real implications for admin-role design, data ownership, and hosting agreements, not just documentation.

**F7 — [Low] Centralized reference-data governance is an SRS-only addition.** FR-C4.M2.11's requirement that all controlled-vocabulary fields (Category, SDG Tag, Sector, Region, etc.) be centrally managed via the CMS is a genuinely useful consistency mechanism, but it isn't grounded in any ToR requirement. Flagged for awareness and confirmation, not as a defect.

---

## 4. Non-Functional Gaps

*(In addition to M4, M5, M6, M9, M10 above, all of which are non-functional in nature — durations, risk management, testing taxonomy, training, and support commitments.)*

**N1 — [Medium] No performance target for report generation or bulk operations.** The On-Demand Report Generator (FR-C5.M1.04) and legacy-data bulk upload (~10,000 records via Excel) have no response-time or processing-time target in either document — unlike search, which has an explicit <2-second target.

**N2 — [Medium] No storage/data-volume sizing target.** Given prototype/video uploads, 10,000+ submitters, and unlimited public viewers, neither document specifies expected storage growth or archival sizing.

**N3 — [Low] Load-testing methodology unspecified.** The 1,000-concurrent-user and <2-second targets are stated as outcomes in both documents, but neither specifies how they'll be validated (tooling, test data volume, ramp-up profile).

---

## 5. Security Gaps

**S1 — [Medium] "Govt 40 API" reference undefined and dropped.** ToR §7.4 names a "Govt 40 API" among systems requiring secured API communication. The term is undefined anywhere in the ToR and is absent from the SRS's interface/security sections (generalized to "other government APIs"). Clarify the term, then re-verify it's covered.

**S2 — [High] CMS-specific injection surface not named in either document's control list.** The SRS introduces a centralized CMS with rich-content authoring and merge-field notification templates (FR-C4.M2.01, FR-C4.M2.04). Neither document's "minimum security controls" list (XSS/CSRF/SQLi/etc.) explicitly calls out stored-content XSS via rich-text authoring or template/merge-field injection in notifications — both are realistic risks specific to a component the ToR's original security analysis predates.

**S3 — [Low] NDA vs. IP/confidentiality agreement — unclear if the same instrument.** ToR §4.3 requires a standard NDA covering data exchange during requirement study, piloting, and maintenance. SRS §5.9 separately requires "an intellectual-property and confidentiality agreement." Neither document clarifies whether these are one instrument or two, with what scope and signatories.

**S4 — [Medium] Penetration-testing cadence unspecified in both documents.** Both ToR §7.5 and SRS §5.2.5 require "regular" vulnerability assessments/penetration testing without defining frequency (e.g., per release, quarterly, annually). This ambiguity is shared across both documents, not a discrepancy between them.

---

## 6. Performance Gaps

*(See also N1–N3 above, and C5's "should → shall" concurrent-user contradiction.)*

**P1 — [Medium] No Recovery Time Objective (RTO) defined.** Both documents specify backup frequency (24 hours = RPO) and an uptime target (99.9%), but neither states how quickly the system must be restored after an outage or disaster. Business-continuity design is under-specified without this.

---

## 7. UI Gaps

*(See also M7 — the 24-point accessibility checklist compressed to one sentence — and C8 — the ToR's internal WCAG 2.2 vs. 2.1 contradiction.)*

**U1 — [Medium] Sign-language video requirement dropped.** ToR checklist item 22 requires sign-language video for all audio-containing media. Absent from the SRS entirely.

**U2 — [Medium] Accessibility plugin features dropped.** ToR checklist item 23 names specific UI affordances: Monochrome, Invert Colors, Big Cursor, Highlight Link, Show Headings, Reading Guide, Reset Button, Keyboard Shortcut. None appear in the SRS.

**U3 — [Medium] Bangla/English same-page mixing constraint dropped.** ToR checklist item 16 explicitly discourages interspersing Bangla and English on the same page (for screen-reader compatibility). Absent from the SRS's multilingual requirements, which focus only on a language toggle.

**U4 — [Low] No named visual branding/style guide in either document.** Both documents say the UI "must follow government branding and design standards" without naming or linking one — the only guideline actually cited (Digital Service and Web Designing Guideline for Inclusive Accessibility, 2022) is accessibility-specific, not a visual brand guide.

---

## Recommended Priority Actions (High-severity items)

1. Reconcile ToR Module numbering with SRS Component numbering, or publish an explicit crosswalk (**C2**).
2. Get a2i sign-off, in writing, on SRS Component 7 "Innovation Management" as an authorized scope addition (**C3**).
3. Add a Risk Management Plan to the SRS, per ToR §12.9 (**M5**).
4. Restate the 5-month delivery window (or its current status) in the SRS (**M4**).
5. Restore the ToR's 24-point accessibility checklist in full, and explicitly resolve the WCAG 2.2 vs. 2.1 conflict with a2i rather than silently picking one (**M7**, **C8**).
6. Confirm iBAS++'s status (in-scope, deferred, or descoped) rather than leaving it silently absent (**M1**).
7. Name CMS-specific injection risks (stored XSS, template injection) explicitly in the security control list (**S2**).
8. Resolve the a2i → IPEU/NIC governance question before committing to an admin/hosting architecture that assumes a2i is the permanent owner (**F6**).
