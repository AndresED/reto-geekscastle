## Decisions

Use rejection sampling: draw byte until `byte < 256 - (256 % CHARSET.length)`, then `byte % CHARSET.length`. Keep length 16 and existing charset.

## Risks

Negligible extra draws; still O(1) expected.