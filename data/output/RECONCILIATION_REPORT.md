# ClearLedger Reconciliation Report

Generated: 2026-08-30T06:34:20.678Z

## Summary

| Metric | Value |
|---|---|
| Total bank rows processed | 50 |
| Matched | 44 |
| Flagged as exceptions | 6 |
| Match rate | 88.0% |
| Precision | 100.0% |
| Recall | 100.0% |
| False positives (wrong matches) | 0 |
| False negatives (missed real matches) | 0 |
| Correctly flagged orphans | 6 |

**What precision and recall mean here:** precision is the share of the 
agent's matches that were actually correct (a low precision means it's 
making false matches — the costlier error in finance-ops). Recall is the 
share of real matches it successfully found (a low recall means it's 
too conservative, pushing real matches into the exceptions queue unnecessarily).

## Matched Transactions

| Bank Statement ID | Matched Ledger ID | Confidence | Reason |
|---|---|---|---|
| STM-5004 | LED-1004 | high | Exact amount match (24345.26), zero date difference, and strong narration match ("MAPANDCO" aligning with "Maple & Co" and "INV2899" with "INV-2899"). |
| STM-5029 | LED-1029 | high | Exact match on amount (39347.15), date (2026-08-04), and reference (INV-2666), with strong counterparty name and narration overlap. |
| STM-5025 | LED-1025 | high | Exact match on amount (22621.88), date (2026-08-17), and reference invoice INV-2680 with corresponding counterparty Maple & Co. |
| STM-5006 | LED-1006 | high | Exact amount match (29133.42), 1-day bank lag, matching counterparty, and explicit reference INV-2596 in the narration. |
| STM-5024 | LED-1024 | high | Exact amount match (38159.57), exact date match, and strong reference/name alignment with INV-2815 and Ivory Interiors. |
| STM-5042 | LED-1042 | high | Matches exact date, reference INV-2339, counterparty Orbit Electronics, with a normal 1.43% fee difference in amount. |
| STM-5007 | LED-1007 | high | Exact match on amount (42234.73), date (2026-08-14), reference (INV-2994), and counterparty name (Redwood Pharma). |
| STM-5044 | LED-1044 | high | Exact amount match (31722.9), a normal 3-day settlement lag (dateDiff=3d), and matching counterparty/invoice reference (Silverline Textiles, INV-2738). |
| STM-5036 | LED-1036 | high | Exact amount match (13507.37), matching reference INV-2668, consistent counterparty name ("Bluepeak Retail"), and a normal 1-day settlement lag. |
| STM-5005 | LED-1005 | high | Exact amount match ($9391.32), exact date (2026-08-10), matching invoice reference (INV-2821), and strong counterparty token overlap with "Pinnacle Steel" / "PINSTE". |
| STM-5003 | LED-1003 | high | Exact amount match (21841.31), exact date match, and clear narration/reference alignment with Crestline Media and INV-2137. |
| STM-5043 | LED-1043 | high | Exact match on amount (34730.21), date (2026-08-03), and strong narration reference to Amber Foods and INV-2286. |
| STM-5012 | LED-1012 | high | Exact amount match (7003.94), exact date match (2026-08-17), and matching invoice reference (INV-2369) with strong counterparty overlap. |
| STM-5001 | LED-1001 | high | Exact match on amount (37061.76), date (2026-08-17), and reference (INV-2507) with the counterparty name clearly present in the bank narration. |
| STM-5031 | LED-1031 | high | Exact match on amount (13736.29), date (2026-08-11), and reference/counterparty details. |
| STM-5026 | LED-1026 | high | Exact match on amount (16801.9), exact date (2026-08-17), and strong counterparty/reference match with Falcon Freight and INV-2151. |
| STM-5040 | LED-1040 | high | Exact amount match (34520.21), exact date match, and invoice number reference (INV-2546) match perfectly with the bank narration. |
| STM-5013 | LED-1013 | high | Exact amount match (10844.94), exact date match, and invoice number reference INV-2489 matches the bank narration INV-2489. |
| STM-5035 | LED-1035 | high | Exact match on amount (40339.83), date (2026-08-11), reference (INV-2176), and counterparty name. |
| STM-5030 | LED-1030 | high | Exact match on amount (23223.47), date (2026-08-09), and reference/counterparty details (INV-2331 and Zenith Auto Parts). |
| STM-5028 | LED-1028 | high | Exact match on amount (14018.5) and date (2026-08-03), with strong narration overlap ("NIMLOG" matching "Nimbus Logistics" and reference INV-2047). |
| STM-5018 | LED-1018 | high | Exact match on amount (33630.14), exact match on date (2026-08-05), and strong narrative/reference overlap with Orbit Electronics and INV-2169. |
| STM-5022 | LED-1022 | high | Exact match on amount (19787.36), date (2026-08-11), and reference/counterparty ("Vertex Industries" and "INV-2984"). |
| STM-5027 | LED-1027 | high | Matches exact date, reference INV-2955, and counterparty Bluepeak Retail, with an amount difference of 1.56% due to standard bank fees. |
| STM-5037 | LED-1037 | high | Exact match on amount (17222.94), date (2026-08-06), counterparty, and invoice reference (INV-2833). |
| STM-5021 | LED-1021 | high | Exact amount match (42098.58), expected settlement date lag of 3 days, and direct reference to invoice INV-2450 with matching counterparty Harbor Exports. |
| STM-5038 | LED-1038 | high | Exact match on amount (47628.84), date (2026-08-06), and invoice reference (INV-2518) with counterparty Crestline Media. |
| STM-5017 | LED-1017 | high | Exact match on amount (27544.92) and date (2026-08-12), with clear reference to Falcon Freight and INV-2235 in both the bank narration and ledger entry. |
| STM-5009 | LED-1009 | high | Exact match on amount (24031.89), date (2026-08-16), reference (INV-2129), and counterparty name ("Bluepeak Retail"). |
| STM-5015 | LED-1015 | high | Exact amount match (49433.93), exact date match (2026-08-04), and clear reference to invoice INV-2170 in the bank narration. |
| STM-5014 | LED-1014 | high | Exact match on amount (14136.49), date (2026-08-07), and reference invoice INV-2029 with Silverline Textiles. |
| STM-5032 | LED-1032 | high | Matches exact date, same counterparty (Nimbus Logistics), matching reference (INV-2943), and expected minor amount difference due to bank fees. |
| STM-5002 | LED-1002 | high | Exact amount match (4197.38), close date (1 day lag), and direct counterparty and reference (Silverline Textiles, INV-2680) alignment. |
| STM-5041 | LED-1041 | high | Exact amount match (15781.58), matching invoice reference INV-2667, counterparty "Lotus Handicrafts", and an expected 3-day bank settlement lag. |
| STM-5011 | LED-1011 | high | Exact amount match (10744.23), identical date, and matching counterparty name and reference (INV-2886). |
| STM-5020 | LED-1020 | high | Matches exact date (2026-08-18), exact invoice reference (INV-2811), and counterparty name (Maple & Co), with the amount difference of 1.80% falling well within expected gateway fee deductions. |
| STM-5019 | LED-1019 | high | Exact amount match (16032.84), identical date (2026-08-01), matching reference INV-2577, and matching counterparty Nimbus Logistics. |
| STM-5033 | LED-1033 | high | Exact amount match (5390.17), matching invoice reference INV-2056, consistent counterparty name, and a standard 3-day settlement date lag. |
| STM-5023 | LED-1023 | high | Exact match on amount (37309.22), date (2026-08-02), and strong reference alignment with INV-2069 and counterparty Quantum Devices. |
| STM-5010 | LED-1010 | high | Exact amount match (35134.72), identical date (2026-08-05), and strong name/reference overlap between narration and ledger counterparty/reference. |
| STM-5016 | LED-1016 | high | Candidate LED-1016 matches the exact date (2026-08-08), exact reference (INV-2336), has strong counterparty name overlap, and shows an expected 1.24% gateway fee difference in amount. |
| STM-5039 | LED-1039 | high | Exact match on amount (28642.54), exact match on date (2026-08-16), and exact invoice reference (INV-2311) present in both the bank narration and ledger entry. |
| STM-5008 | LED-1008 | high | Exact amount match, matching reference INV-2696, and a logical 3-day bank settlement lag with counterparty Harbor Exports. |
| STM-5034 | LED-1034 | high | Exact match on amount (5183.55) and date (2026-08-19), with strong narration overlap ("Greenfield Agro" and invoice reference "INV-2750"). |

## Exceptions Queue (require human review)

| Bank Statement ID | Amount | Date | Narration | Reason Flagged |
|---|---|---|---|---|
| STM-5046 | 31547.32 | 2026-08-05 | IMPS BLUEPEAK RETAIL INV-2480 | None of the candidate ledger entries have a coherent combination of matching amount and date, with date differences ranging from 9 to 10 days for the closest amount matches. |
| STM-5049 | 11881.47 | 2026-08-19 | IMPS VERTEX INDUSTRIES INV-2581 | None of the candidate ledger entries have amounts close to the bank statement amount of 11881.47 (the closest amount differs by ~40% and has an 8-day date gap). |
| STM-5048 | 45971.44 | 2026-08-03 | IMPS IVORY INTERIORS INV-2058 | None of the candidates share a coherent combination of name, amount, and reference signals with the bank row. |
| STM-5050 | 2088.04 | 2026-08-14 | NEFT FALCON FREIGHT INV-2798 | None of the candidate ledger entries have amounts reasonably close to the bank amount of 2088.04, with the closest amount difference exceeding 1%. |
| STM-5045 | 42875.31 | 2026-08-12 | IMPS SILVERLINE TEXTILES INV-2908 | None of the candidate ledger entries match the invoice reference (INV-2908) or have a coherent combination of matching amount and counterparty name. |
| STM-5047 | 26192.93 | 2026-08-10 | UPI PINNACLE STEEL INV-2591 | None of the candidate ledger entries have amounts reasonably close to the bank amount of 26192.93 (the closest amount is over 1000 away with a 4.63% difference for an incorrect counterparty, and the matching counterparty candidates have vastly different amounts). |

## Known Limitations

- Evaluated on a 50-row synthetic dataset with well-separated noise 
  categories (exact, date-lag, fee-adjusted, garbled-narration, orphan). 
  Real-world data at larger scale, with overlapping ambiguity between 
  candidates, would likely show lower precision/recall than reported here.
- The candidate pre-filter caps at 5 candidates per bank row; a true 
  duplicate-invoice scenario (two ledger entries with identical amount 
  and near-identical date) is not explicitly tested.
- Currently single-currency, single-bank-account. Multi-currency or 
  multi-account reconciliation would need additional disambiguation signals.
