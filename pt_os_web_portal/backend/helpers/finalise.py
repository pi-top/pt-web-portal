from os import path, remove

from pitop.common.command_runner import run_command, run_command_background
from pitop.common.logger import PTLogger
from pt_fw_updater.check import main as update_firmware

from ... import state
from .paths import use_test_path


def available_space() -> str:
    PTLogger.debug("Function: available_space()")
    out = run_command("df --block-size=1 --output=avail '/'", timeout=2).splitlines()

    if use_test_path():
        return "1000000000000"

    if len(out) == 2:
        space = out[1].strip()
    else:
        space = ""

    PTLogger.debug(f"Available Space: '{space}'")
    return space


def configure_tour() -> None:
    PTLogger.debug("Function: configure_tour()")
    run_command(
        f"ln -s {path.dirname(path.realpath(__file__))}/../../resources/pt-os-tour.desktop /etc/xdg/autostart",
        timeout=60,
        lower_priority=True,
    )


def deprioritise_openbox_session() -> None:
    PTLogger.debug("Function: deprioritise_openbox_session()")
    run_command(
        "update-alternatives --install /usr/bin/x-session-manager "
        + "x-session-manager /usr/bin/openbox-session 40",
        timeout=30,
        lower_priority=True,
    )


def stop_onboarding_autostart() -> None:
    PTLogger.debug("Function: stop_onboarding_autostart()")
    remove("/etc/xdg/autostart/pt-os-setup.desktop")
    state.set("app", "onboarded", "true")


def enable_firmware_updater_service():
    PTLogger.debug("Function: enable_firmware_updater()")

    return run_command(
        "systemctl enable pt-firmware-updater", timeout=30, lower_priority=True
    )


def enable_further_link_service():
    PTLogger.debug("Function: enable_further_link()")

    return run_command("systemctl enable further-link", timeout=30, lower_priority=True)


def reboot() -> None:
    PTLogger.debug("Function: reboot()")
    if path.exists("/tmp/.com.pi-top.pi-topd.pt-poweroff.reboot-on-shutdown"):
        # Do shutdown, let hub start back up
        run_command_background("shutdown -h now")
    else:
        run_command_background("reboot")


def enable_pt_miniscreen():
    PTLogger.debug("Function: enable_pt_miniscreen()")

    return run_command(
        "systemctl enable pt-miniscreen", timeout=30, lower_priority=True
    )


def restore_files():
    PTLogger.debug("Function: restore_files()")

    run_command(
        "rsync -av /usr/lib/pt-os-web-portal/bak/ /", timeout=30, lower_priority=True
    )
    run_command("rm -r /usr/lib/pt-os-web-portal/bak", timeout=30, lower_priority=True)


def disable_tour():
    PTLogger.debug("Function: disable_tour()")
    try:
        remove("/etc/xdg/autostart/pt-os-tour.desktop")
    except FileNotFoundError:
        PTLogger.debug("Tour already disabled.")


def python_sdk_docs_url():
    PTLogger.debug("Function: python_sdk_docs_url()")
    return run_command("pi-top support links docs -p", timeout=10, check=False).strip()


def onboarding_completed():
    return state.get("app", "onboarded", fallback="false") == "true"


def update_eeprom():
    PTLogger.debug("Function: update_eeprom()")
    run_command("/usr/lib/pt-os-notify-services/pt-eeprom -f", timeout=10, check=False)


def do_firmware_update():
    update_firmware("pt4_hub", force=True)

    run_command(
        "touch /tmp/.com.pi-top.pi-topd.pt-poweroff.reboot-on-shutdown",
        timeout=10,
    )
