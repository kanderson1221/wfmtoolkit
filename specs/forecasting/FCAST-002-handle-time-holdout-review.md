---
id: FCAST-002
title: Leakage-Safe Handle-Time Holdout Review
status: implemented
owners: []
depends_on: [FCAST-001]
supersedes: []
last_reviewed: 2026-07-18
---

# Purpose

This specification defines how the adjacent forecasting workbench validates the
monthly average-handle-time (AHT) assumption method on the same historical
holdout used for daily contacts. AHT accuracy affects workload and staffing even
when contact accuracy is strong, so it must be reviewed separately.

# Training and Scoring Contract

- AHT assumption history shall stop at the contact model's training cutoff.
  AHT actuals on contact holdout dates shall never influence either candidate.
- The configured AHT method shall be scored only on holdout dates with valid
  AHT and positive contacts.
- The review shall disclose scored days as a numerator and all contact holdout
  days as the denominator. Missing or zero-contact AHT rows shall not be
  presented as zero error.
- The comparison benchmark shall be the contact-weighted average AHT from the
  training window only.
- Existing projects require no migration; evidence is derived from retained
  history, configuration, and holdout boundaries.

# Measures

For positive-contact scored days, with contacts `C_t`, actual AHT `A_t`, and
candidate AHT `F_t` in seconds:

- `weighted MAE = Σ(C_t × |F_t - A_t|) / Σ C_t`, in seconds
- `weighted bias = Σ(C_t × (F_t - A_t)) / Σ C_t`, in seconds
- `AHT workload error = 100 × Σ(C_t × |F_t - A_t|) / Σ(C_t × A_t)`, in percent

Lower workload error and weighted MAE are better. Bias nearer zero is better;
positive bias overstates AHT and workload. Workload error shall be unavailable
when actual scored workload is zero.

# Desktop Workflow and Export

- The AHT result tab shall show the holdout comparison between the historical
  chart and the future monthly-assumption worksheet.
- The configured method and benchmark shall align in one semantic native table
  using the same review pattern as contact accuracy.
- The result may name the lower-error candidate, but shall not automatically
  accept or reject the forecast.
- A CSV shall include every scored date, contacts, actual AHT, both candidate
  values, and their absolute and signed errors.

# Acceptance Scenarios

1. A holdout AHT outlier does not change future AHT assumptions because it is
   excluded from all training summaries.
2. Partial AHT coverage shows `scored of holdout` and exports only scored dates.
3. No positive-contact AHT rows produces unavailable evidence, not perfect
   accuracy.
4. The configured method and training weighted average reconcile to the stated
   contact-weighted formulas.
