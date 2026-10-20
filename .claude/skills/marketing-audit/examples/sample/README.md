# Sample audit (made-up business)

A runnable miniature of the pipeline with invented data ("Harbor Auto Care" does not exist). Use it to
check the tooling, and as the pattern for a real audit's files. A real audit has the full set of boards
and slides listed in `references/report-specs.md`; this one keeps only what the summary links to.

```bash
A=.claude/skills/marketing-audit; X=$A/examples/sample; W=$(mktemp -d)
python3 -I $A/scripts/roi_model.py $X/roi_inputs.json $W/roi.json
python3 -I $X/audit_spec.py $W/roi.json $W/audit_spec.json
python3 -I $A/scripts/build_audit.py $W/audit_spec.json $W/audit
echo "{\"asset:logo.svg\": \"$PWD/$X/brand/logo.svg\"}" | tee $W/audit/assets_map.json > /dev/null
node $A/scripts/measure_audit.cjs $W/audit
python3 -I $A/scripts/build_audit.py $W/audit_spec.json $W/audit --heights $W/audit/heights.json
python3 -I $X/deck.py $W/audit_spec.json $W/roi.json $W/deck "https://drive.google.com/file/d/EXAMPLE_AUDIT/view"
cp $W/audit/assets_map.json $W/deck/ && node $A/scripts/check_slides.cjs $W/deck
python3 -I $A/scripts/build_onepager.py $X/onepager.json $W/audit_spec.json $W/roi.json $W/deck $W/onepager.html
node $A/scripts/render_pdf.cjs audit $W/audit $W/pdf/audit.pdf
node $A/scripts/render_pdf.cjs deck $W/deck $W/pdf/deck.pdf
node $A/scripts/render_pdf.cjs summary $W/onepager.html $W/pdf/summary.pdf
python3 -I $A/scripts/check_links.py $W/pdf/*.pdf
```
