## Decisions

- Separate CI job `terraform` on ubuntu-latest with official HashiCorp setup action or apt/binary.
- `terraform init -backend=false` then `fmt -check` and `validate`.
- No credentials required for validate of this module.

## Risks

Provider download time on cold runners — acceptable for challenge CI.