from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[3]


def test_batch_build_idempotent_and_invalid_module_keeps_last_artifact(tmp_path):
    (tmp_path / "src").mkdir()
    (tmp_path / "scripts").mkdir()
    shutil.copy2(ROOT / "build_master.py", tmp_path / "build_master.py")
    shutil.copy2(ROOT / "scripts/check_syntax.cjs", tmp_path / "scripts/check_syntax.cjs")
    (tmp_path / "src/01_fixture.js").write_text("function fixture() { return 1; }\n")
    def build():
        return subprocess.run(["python3", "build_master.py"], cwd=tmp_path, capture_output=True, text=True)
    assert build().returncode == 0
    artifact = tmp_path / "ultra_rotina_master.js"
    original = (artifact.read_bytes(), artifact.stat().st_mtime_ns)
    assert build().returncode == 0
    assert (artifact.read_bytes(), artifact.stat().st_mtime_ns) == original
    # Somados, os fragmentos poderiam formar JS válido; separadamente são inválidos.
    (tmp_path / "src/02_invalid.js").write_text("function broken() {")
    (tmp_path / "src/03_invalid.js").write_text("return 1; }")
    assert build().returncode != 0
    assert (artifact.read_bytes(), artifact.stat().st_mtime_ns) == original
