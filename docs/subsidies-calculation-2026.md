# Subsidies calculation 2026 (FinHub)

This document records the official sources and parameters used to calculate 2026 benefits.

## Sources (official)

- Zorgtoeslag 2026 (Berekening zorgtoeslag 2026, PDF)
  - https://download.belastingdienst.nl/toeslagen/docs/berekening_zorgtoeslag_tg0821z61fd.pdf
- Huurtoeslag 2026 (Berekening huurtoeslag 2026, PDF)
  - https://download.belastingdienst.nl/toeslagen/docs/berekening_huurtoeslag_tg0831z61fd.pdf
- Dienst Toeslagen 2026 change notes (no huurgrens as eligibility condition)
  - https://www.belastingdienst.nl/wps/wcm/connect/nl/toeslagen/content/wat-verandert-er-in-2026
- Rijksoverheid (25-11-2025) news release on removing maximum rent limits
  - https://www.rijksoverheid.nl/actueel/nieuws/2025/11/25/maximum-huurgrenzen-vervallen-als-voorwaarde-voor-de-huurtoeslag
- Kindgebonden budget 2026 (Berekening kindgebonden budget 2026, PDF)
  - https://download.belastingdienst.nl/toeslagen/docs/berekening_kindgebonden_budget_tg0811z61fd.pdf
- Kinderopvangtoeslag 2026 (Berekening kinderopvangtoeslag 2026, PDF)
  - https://download.belastingdienst.nl/toeslagen/docs/berekening_kinderopvangtoeslag_tg0801z61fd.pdf

## Inputs required per subsidy

- Zorgtoeslag
  - Annual income (applicant, partner if applicable)
  - Partner flag
  - Assumes domestic insurance (no CAK/woonlandfactor scenarios in wizard)
- Huurtoeslag
  - Age
  - Monthly rent (kale huur)
  - Annual income (applicant, partner if applicable)
  - Partner flag
  - Under-21 exception (child/disability) to select the correct rent limit
  - Assumes no medebewoners
  - 2026 rule changes: no huurgrens as an eligibility condition; service costs are excluded; only kale huur counts
- Kindgebonden budget (KGB)
  - Household income
  - Partner flag (single parent vs partner)
  - Children count
  - Children aged 12-15 and 16-17
  - Assumes woonlandfactor 100% (children in NL/EU/EEA/CH)
- Kinderopvangtoeslag (KOT)
  - Household income
  - Worked months in the year
  - Childcare type, hours per month, and hourly rate (per child)
  - Multiple children supported (per-child inputs, up to 4)

## Rounding rules

- Zorgtoeslag: monthly amount rounded down to whole euros.
- Huurtoeslag: monthly amount rounded down to whole euros.
- KGB: monthly amount rounded down to whole euros.
- KOT: monthly amount rounded down to whole euros.

## Updating to 2027

1) Add new parameters in `src/domain/subsidies/calculators/params/2027.ts`.
2) Update `src/domain/subsidies/calculators/params/index.ts` to select 2027.
3) Adjust calculator tests with official 2027 examples.
4) Update this document with new official sources.
