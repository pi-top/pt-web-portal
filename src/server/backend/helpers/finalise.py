from pitopcommon.logger import PTLogger
from fileinput import input as finput
from os import utime, remove
from pathlib import Path

from .command_runner import run_command
from .paths import (
    use_test_path,
    etc_pi_top,
    boot_cmdline_txt,
    startup_noise_breadcrumb,
    eula_agreed_breadcrumb
)


def available_space() -> int:
    PTLogger.info("Function: available_space()")
    out = run_command("df --block-size=1 --output=avail '/'",
                      timeout=2).splitlines()

    if use_test_path():
        return "1000000000000"

    if len(out) == 2:
        space = out[1].strip()
    else:
        space = None

    if space == "":
        space = None

    PTLogger.info("Available Space: '%s'" % space)
    return space


def expand_file_system() -> None:
    PTLogger.info("Function: expand_file_system()")
    run_command("/usr/lib/pt-web-portal/expand-fs.sh",
                timeout=60, lower_priority=True)


def configure_tour() -> None:
    PTLogger.info("Function: configure_tour()")
    run_command(
        "ln -s /usr/lib/pt-tour/pt-tour.desktop /etc/xdg/autostart", timeout=60, lower_priority=True)


def update_mime_database() -> None:
    PTLogger.info("Function: update_mime_database()")
    run_command("update-mime-database /usr/share/mime",
                timeout=90, lower_priority=True)


def deprioritise_openbox_session() -> None:
    PTLogger.info("Function: deprioritise_openbox_session()")
    run_command(
        "update-alternatives --install /usr/bin/x-session-manager " +
        "x-session-manager /usr/bin/openbox-session 40",
        timeout=30, lower_priority=True)


def stop_onboarding_autostart() -> None:
    PTLogger.info("Function: stop_onboarding_autostart()")
    run_command("systemctl disable pt-os-setup",
                timeout=30, lower_priority=True)
    run_command("systemctl mask pt-os-setup",
                timeout=30, lower_priority=True)


def enable_os_updater_service():
    PTLogger.info("Function: enable_os_updater()")

    return run_command("systemctl enable pt-os-updater",
                       timeout=30, lower_priority=True)


def enable_firmware_updater_service():
    PTLogger.info("Function: enable_firmware_updater()")

    return run_command("systemctl enable pt-firmware-updater",
                       timeout=30, lower_priority=True)


def enable_further_link_service():
    PTLogger.info("Function: enable_further_link()")

    return run_command("systemctl enable pt-further-link",
                       timeout=30, lower_priority=True)


def _touch_etc_pi_top_file(file_path) -> None:
    # create /etc/pi-top if it doesn't exist
    Path(etc_pi_top()).mkdir(exist_ok=True)

    try:
        utime(file_path, None)
    except OSError:
        open(file_path, 'a').close()


def disable_startup_noise() -> None:
    PTLogger.info("Function: disable_startup_noise()")
    _touch_etc_pi_top_file(startup_noise_breadcrumb())


def mark_eula_agreed() -> None:
    PTLogger.info("Function: mark_eula_agreed()")
    _touch_etc_pi_top_file(eula_agreed_breadcrumb())


def unhide_all_boot_messages() -> None:
    PTLogger.info("Function: unhide_all_boot_messages()")
    for line in finput(boot_cmdline_txt(), inplace=True):
        print(line.replace(" fbcon=map:2", "").rstrip())


def reboot() -> None:
    PTLogger.info("Function: reboot()")
    run_command("reboot", timeout=30, lower_priority=True)


def enable_pt_sys_oled():
    PTLogger.info("Function: enable_pt_sys_oled()")

    return run_command("systemctl enable pt-sys-oled",
                       timeout=30, lower_priority=True)


def enable_mouse_cursor():
    PTLogger.info("Function: enable_mouse_cursor()")

    return run_command('sed -i "s/xserver-command=X -nocursor/#xserver-command=X/1" /etc/lightdm/lightdm.conf',
                       timeout=30, lower_priority=True)


def restore_files():
    PTLogger.info("Function: restore_files()")

    run_command("rsync -av /usr/lib/pt-os-setup/bak/ /",
                timeout=30, lower_priority=True)
    run_command("rm -r /usr/lib/pt-os-setup/",
                timeout=30, lower_priority=True)


def disable_tour():
    PTLogger.info("Function: disable_tour()")
    try:
        remove("/etc/xdg/autostart/pt-tour.desktop")
    except FileNotFoundError:
        PTLogger.debug("Tour already disabled.")


def close_pt_browser():
    PTLogger.info("Function: close_pt_browser()")
    pids = run_command("pgrep pt-web-ui", timeout=5, check=False).split()
    for pid in pids:
        try:
            run_command(f"kill -9 {pids}", timeout=5)
        except Exception as e:
            PTLogger.debug(f"Error killing PID {pid}: {e}")


def python_sdk_docs_url():
    PTLogger.info("Function: python_sdk_docs_url()")
    return run_command("pi-top support links docs -p", timeout=5, check=False).strip()


def onboarding_completed():
    PTLogger.info("Function: onboarding_completed()")
    try:
        run_command("systemctl is-enabled -q pt-os-setup", timeout=5, log_errors=False)
        return False
    except Exception:
        return True


def open_further():
    PTLogger.info("Function: open_further()")
    try:
        run_command("pt-further", timeout=5, log_errors=False)
    except Exception:
        pass


def open_python_sdk_docs():
    PTLogger.info("Function: open_python_sdk_docs()")
    try:
        run_command(f"chromium-browser --new-window {python_sdk_docs_url()}", timeout=5, log_errors=False)
    except Exception:
        pass


def open_knowledge_base():
    PTLogger.info("Function: open_knowledge_base()")
    try:
        kbUrl = "https://knowledgebase.pi-top.com"
        run_command(f"chromium-browser --new-window {kbUrl}", timeout=5, log_errors=False)
    except Exception:
        pass
