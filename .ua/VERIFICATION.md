# Analysis verification record

Date: 2026-10-29 (Asia/Taipei). Scope: local static application source/documentation only. No app code changed, original knowledge read, app launched, provider contacted, or cloud/database operation performed.

## Executed checks

Every listed command exited 0 after the reported corrections:

1. `node <PLUGIN_ROOT>/skills/understand/scan-project.mjs <PROJECT_ROOT> <PROJECT_ROOT>/.ua/tmp/ua-scan-files.json --exclude-analysis-data`
2. `node <PLUGIN_ROOT>/skills/understand/extract-import-map.mjs <input.json> <output.json>`
3. `node <PLUGIN_ROOT>/skills/understand/compute-batches.mjs <PROJECT_ROOT>`
4. `node <PLUGIN_ROOT>/skills/understand/extract-structure.mjs <batch-input.json> <extract-output.json>` for every batch.
5. Semantic assembly from extractor results plus reviewed source; original batch indices retained in batch JSON filenames. All parser-declared functions/classes retained, with explicit manual supplements documented.
6. `<PLUGIN_ROOT>/.runtime/python/python.exe <PLUGIN_ROOT>/skills/understand/merge-batch-graphs.py <PROJECT_ROOT>`
7. Local finalizer checked core KnowledgeGraphSchema, unique IDs, dangling edges, exact allowed-file coverage, parser-symbol coverage, source ranges, one layer per file, tour references, topology, and guide output.
8. `node <PLUGIN_ROOT>/skills/understand/build-fingerprints.mjs <PROJECT_ROOT>/.ua/intermediate/fingerprint-input.json` completed with a baseline for every scanned file. Only then was meta.json written.
9. `node .ua/verify-understanding.mjs` revalidated the saved graph, guide, fingerprints, meta baseline and exclusion boundaries. See coverage-report.json for exact counts.

`PLUGIN_ROOT` is the workspace `.agents/understand-anything-plugin`. `CLAUDE_PLUGIN_ROOT` is set to the same directory in orchestration shells. Local pnpm/Python are used; nothing was installed for this analysis.

## Corrections and limitations

The bundled scanner could not call git ls-files in its process and used the documented recursive fallback. A Node child-process git baseline lookup also failed; `git rev-parse HEAD` was run successfully through PowerShell and the exact returned hash was passed to metadata/fingerprint generation. The content digest still describes the selected source snapshot; the Git hash alone does not include uncommitted files.

Unsupported structural formats retain file nodes and manual semantic descriptions. Warnings and parser limitations are listed in analysis-warnings.json and coverage-report.json. Callback arrows/dynamic dispatch/record-generated accessors are not promised exhaustive coverage. This is not independent security review or fresh application acceptance testing.

## Read and rollback boundary

Exclusions were approved before scanning and strengthened for discovered private runtime folders before their contents were read. Generated UNDERSTAND.md is excluded from future scans to avoid self-ingestion. Saved knowledge, auth metadata, uploads, raw documents, credentials, dependencies and generated builds remain outside scope.

Scratch outputs are moved under this .ua directory into a timestamped .trash-analysis folder, preserving intermediate/scan-result.json for future updates. No recursive deletion is performed. To undo this task, review and remove only these newly generated analysis artifacts and UNDERSTAND.md; preserve all application source, private runtime stores and cloud records. No hooks or persistent services were installed.