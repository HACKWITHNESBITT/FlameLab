"""Record validator per docs/DATA_SCHEMA.md validation rules.

Passes with a note when no records exist yet.
Lenient on scalar-vs-wrapped representation (Phase 0 open question);
strict on presence, enums, ranges, and the no-partial-gravity rule.
"""
import glob
import json
import sys

HARDWARE = {"CIR", "MSG", "other"}
GRAVITY = {"microgravity", "normal_gravity", "mimicked_partial"}
FUEL_CLASS = {"solid", "gas", "liquid_droplet", "aerosol_dust", "other"}
INVESTIGATION_TYPES = {"microgravity", "ground"}
REQUIRED = ("id", "psi_id", "name", "hardware", "gravity_regime", "fuel_class",
            "investigation_type", "doi_citation")


def unwrap(field):
    if isinstance(field, dict) and "value" in field:
        return field["value"], field
    return field, None


def check_range(value, label, errors, low=None, high=None):
    if value is None:
        return
    if isinstance(value, dict) and ("min" in value or "max" in value):
        lo, hi = value.get("min"), value.get("max")
        if lo is not None and hi is not None and lo > hi:
            errors.append(f"{label}: min {lo} > max {hi}")
        for v in (lo, hi):
            if v is None:
                continue
            if low is not None and v < low or high is not None and v > high:
                errors.append(f"{label}: {v} outside [{low},{high}]")
    elif isinstance(value, (int, float)):
        if low is not None and value < low or high is not None and value > high:
            errors.append(f"{label}: {value} outside [{low},{high}]")


def validate(path):
    errors = []
    with open(path) as f:
        rec = json.load(f)
    for key in REQUIRED:
        if key not in rec:
            errors.append(f"missing required field '{key}'")
    hw, _ = unwrap(rec.get("hardware"))
    if hw is not None and hw not in HARDWARE:
        errors.append(f"hardware '{hw}' not in {sorted(HARDWARE)}")
    gr, _ = unwrap(rec.get("gravity_regime"))
    if gr is not None and gr not in GRAVITY:
        errors.append(f"gravity_regime '{gr}' not in {sorted(GRAVITY)} "
                      "(never use a Moon/Mars gravity value)")
    fc, _ = unwrap(rec.get("fuel_class"))
    if fc is not None and fc not in FUEL_CLASS:
        errors.append(f"fuel_class '{fc}' not in {sorted(FUEL_CLASS)}")
    it, _ = unwrap(rec.get("investigation_type"))
    if it is not None and it not in INVESTIGATION_TYPES:
        errors.append(f"investigation_type '{it}' not in {sorted(INVESTIGATION_TYPES)}")
    def has_source(node):
        if isinstance(node, dict):
            if "source" in node and isinstance(node["source"], dict) and node["source"].get("doc"):
                return True
            return any(has_source(v) for v in node.values())
        if isinstance(node, list):
            return any(has_source(v) for v in node)
        return False

    if not has_source(rec) and "psi_url" not in rec:
        errors.append("need at least one source (field-level source or psi_url)")
    tc_raw, _ = unwrap(rec.get("test_conditions"))
    for tc in tc_raw or []:
        if not isinstance(tc, dict):
            continue
        o2, _ = unwrap(tc.get("oxygen_percent"))
        check_range(o2, "oxygen_percent", errors, 0, 100)
        p, _ = unwrap(tc.get("pressure_psi"))
        check_range(p, "pressure_psi", errors)
        a, _ = unwrap(tc.get("airflow_cm_s"))
        check_range(a, "airflow_cm_s", errors)

    def walk(node, trail=""):
        if isinstance(node, dict):
            if "status" in node and node["status"] not in ("read", "inferred", "missing", "ambiguous"):
                errors.append(f"{trail or 'field'}: bad status '{node['status']}'")
            if node.get("status") == "inferred" and not node.get("note"):
                errors.append(f"{trail or 'field'}: status inferred needs a note")
            for k, v in node.items():
                walk(v, f"{trail}.{k}" if trail else k)
        elif isinstance(node, list):
            for i, v in enumerate(node):
                walk(v, f"{trail}[{i}]")

    walk(rec)
    return errors


def main():
    paths = sorted(p for p in glob.glob("data/records/*.json"))
    if not paths:
        print("validate-records: no records yet.")
        return 0
    failed = False
    for path in paths:
        errs = validate(path)
        if errs:
            failed = True
            print(f"FAIL {path}:")
            for e in errs:
                print(f"  - {e}")
        else:
            print(f"OK {path}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
