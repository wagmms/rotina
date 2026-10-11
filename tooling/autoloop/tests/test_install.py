from pathlib import Path
import importlib.util
import shutil
import pytest

SOURCE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("autoloop_install_fixture", SOURCE / "install.py")
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


def original_home(tmp_path):
    home = tmp_path / "home"
    target = home / ".local/bin/autoloop"
    target.parent.mkdir(parents=True)
    return home, target


def test_install_detects_external_change_without_overwriting(tmp_path, monkeypatch):
    home, target = original_home(tmp_path)
    target.write_text("external change")
    monkeypatch.setattr(installer, "ROOT", tmp_path)
    with pytest.raises(RuntimeError, match="mudou após"):
        installer.install(home)
    assert target.read_text() == "external change"


def test_install_idempotent_and_backup_and_resume_preserves_user_choice(tmp_path, monkeypatch):
    home, target = original_home(tmp_path)
    target.write_bytes((SOURCE / "autoloop.py").read_bytes())
    target.chmod(0o755)
    monkeypatch.setattr(installer, "ROOT", tmp_path)
    installer.install(home)
    assert target.read_bytes() == (SOURCE / "autoloop.py").read_bytes()
    assert (home / ".local/lib/autoloop_core/execution.py").read_bytes() == (SOURCE / "core/execution.py").read_bytes()
    assert list((tmp_path / "data/autoloop_backups").glob("*/manifest.json"))
    control = home / ".cache/ia-hub/alvo_visual.txt"
    control.parent.mkdir(parents=True)
    control.write_text("habitflow")
    state = tmp_path / "data/.autoloop_upgrade_state.json"
    state.write_text('{"prior_visual_target":"rotina"}')
    installer.resume(home)
    assert control.read_text() == "habitflow"
    control.write_text("pausar")
    installer.resume(home)
    assert control.read_text() == "rotina" and not state.exists()
