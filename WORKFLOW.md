# GeGeXD Blog Workflow

## Daily Edit

1. Read the target post, theme file, or config before changing it.
2. Keep edits scoped to the requested page or component.
3. Run `tools/check.sh` after edits.
4. Preview only when the change is visual or layout related.

## Publish

Use one command when the change is ready:

```sh
tools/publish.sh "commit message"
```

This command:

- checks the source diff;
- cleans and generates the Hexo site;
- verifies generated core files and cache version;
- commits source changes when a message is provided;
- pushes the source branch;
- deploys the generated site;
- cleans local Hexo preview/background processes on exit.

## Cleanup Only

```sh
tools/cleanup.sh
```

Use this after manual previews or interrupted deploys.

## Notes

- Do not put helper shell scripts in the root `scripts/` folder. Hexo treats that folder as a JavaScript plugin folder.
- When CSS, JavaScript, or visual assets change, bump `source_version` in `themes/archer/_config.yml` so browsers fetch fresh files.
- Baidu URL submit may return `401 site error`; GitHub Pages deploy can still succeed.
