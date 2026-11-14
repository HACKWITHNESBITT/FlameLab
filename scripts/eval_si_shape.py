"""Shape check for si/eval/questions.yaml (not the LLM eval itself).

Asserts: >=20 cases, all six required types present, each case has
id/type/question/expected. Full semantic eval is Dev 4 work (Day 2).
"""
import sys

try:
    import yaml
except ImportError:
    print("PyYAML required: pip install pyyaml", file=sys.stderr)
    sys.exit(2)

REQUIRED_TYPES = {"coverage", "gap", "trap", "scope", "procedure", "comparison"}

with open("si/eval/questions.yaml") as f:
    data = yaml.safe_load(f)

cases = data.get("cases", [])
errors = []
if len(cases) < 20:
    errors.append(f"need >=20 cases, found {len(cases)}")
found = set()
for i, c in enumerate(cases):
    for key in ("id", "type", "question", "expected"):
        if key not in c:
            errors.append(f"case[{i}] missing '{key}'")
    if "type" in c:
        found.add(c["type"])
missing_types = REQUIRED_TYPES - found
if missing_types:
    errors.append(f"missing types: {sorted(missing_types)}")

if errors:
    for e in errors:
        print(f"FAIL: {e}")
    sys.exit(1)
print(f"eval shape OK: {len(cases)} cases, all 6 types present.")
