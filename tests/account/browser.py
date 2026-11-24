"""Run from a clean checkout after npm ci. Uses two regular temporary Chromium profiles."""
import os
import re
from tempfile import TemporaryDirectory
from threading import Thread
from playwright.sync_api import expect, sync_playwright
from fixture import Service

A, B = "a@example.test", "b@example.test"
PASSWORD, NEW = "fixture-pass-123", "fixture-new-456"


def passed(message):
    print("PASS", message, flush=True)


def sign_in(page, email, password=PASSWORD):
    page.get_by_label("Email", exact=True).fill(email)
    page.get_by_label("Password", exact=True).fill(password)
    page.get_by_role("button", name="Sign in", exact=True).click()


def status(page, text):
    expect(page.locator("#status")).to_contain_text(text, timeout=12000)


def launch(driver, directory, width, height):
    return driver.chromium.launch_persistent_context(directory,
        executable_path=os.getenv("CHROMIUM_PATH", "/usr/bin/chromium"), headless=True,
        viewport={"width": width, "height": height},
        args=["--no-sandbox", "--disable-dev-shm-usage", "--no-zygote", "--disable-gpu"])


def layout(page, width):
    assert page.evaluate("innerWidth") == width
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")


def run():
    service = Service()
    Thread(target=service.serve_forever, daemon=True).start()
    service.signup(B, PASSWORD)
    service.confirmed.add(B)
    base = service.url + "/account/"
    try:
        with sync_playwright() as p, TemporaryDirectory() as d1, TemporaryDirectory() as d2:
            desktop = launch(p, d1, 1440, 900)
            mobile = launch(p, d2, 390, 844)
            print("Browser", desktop.pages[0].evaluate("navigator.userAgent"), flush=True)
            page, phone = desktop.pages[0], mobile.pages[0]
            # Keep the test entirely within the synthetic service, including the demo's optional fonts.
            for context in (desktop, mobile):
                context.route(re.compile(r"^https?://(?!" + re.escape(service.url.split("//")[1]) + r"/)"), lambda r: r.abort())
            page.goto(service.url)
            page.get_by_role("button", name="Explore as Alex").click()
            # The demo chooser persists the profile on onboarding. Plant a distinct old progress value as well.
            demo_key = "hydra-stack-demo-v1:alex"
            demo_record = '{"profile":{"id":"alex"},"leads":{},"drafts":{"fixture":"demo-only-marker"}}'
            page.evaluate("([k,v]) => localStorage.setItem(k,v)", [demo_key, demo_record])
            page.goto(service.url)
            page.get_by_role("link", name="Open my customer workspace").click()
            status(page, "Sign in")
            layout(page, 1440)
            passed("desktop landing → account, 1440 × 900, no horizontal overflow")
            page.get_by_role("button", name="Create an account").click()
            page.get_by_label("Email", exact=True).fill(A)
            page.get_by_label("Password", exact=True).fill(PASSWORD)
            page.get_by_role("button", name="Sign up", exact=True).click()
            status(page, "Check your email")
            assert not page.locator("#workspace").is_visible() and not service.rows
            passed("signup pending confirmation, no workspace created")
            link = base + "#type=email&token_hash=" + service.links["email"][1]
            page.goto(link)
            page.get_by_role("button", name="Continue from email").click()
            status(page, "Email confirmed")
            assert page.url == base
            page.get_by_role("link", name="Return to account").click()
            sign_in(page, A, "wrong-password")
            status(page, "Request unsuccessful")
            assert not page.locator("#workspace").is_visible()
            passed("confirmation consumed; bad credentials kept workspace closed")
            sign_in(page, A)
            status(page, "workspace is empty")
            assert not service.rows and page.get_by_label("Career goal").input_value() == ""
            page.get_by_label("Career goal").fill("A career goal")
            page.get_by_label("Next step").fill("A next step")
            page.get_by_role("button", name="Save workspace").click()
            status(page, "Workspace saved")
            page.reload()
            status(page, "Your saved workspace")
            expect(page.get_by_label("Next step")).to_have_value("A next step")
            passed("first explicit save and reload restored A's two fields")
            phone.goto(service.url)
            phone.get_by_role("link", name="Open my customer workspace").click()
            sign_in(phone, A)
            status(phone, "Your saved workspace")
            expect(phone.get_by_label("Career goal")).to_have_value("A career goal")
            layout(phone, 390)
            passed("mobile 390 × 844, independent browser profile restored A, no horizontal overflow")
            phone.get_by_label("Next step").fill("phone edit")
            phone.get_by_role("button", name="Save workspace").click()
            status(phone, "Workspace saved")
            page.get_by_label("Next step").fill("stale desktop edit")
            page.get_by_role("button", name="Save workspace").click()
            status(page, "Save unconfirmed")
            expect(page.get_by_label("Next step")).to_have_value("stale desktop edit")
            page.once("dialog", lambda dialog: dialog.accept())
            page.get_by_role("button", name="Reload saved workspace").click()
            expect(page.get_by_label("Next step")).to_have_value("phone edit")
            passed("two-device conflict preserved remote value and retained draft until explicit discard")
            service.fail_read = True
            writes = service.writes
            page.reload()
            status(page, "Could not load")
            assert not page.locator("#workspace").is_visible() and service.writes == writes
            service.fail_read = False
            page.get_by_role("button", name="Reload saved workspace").click()
            status(page, "Your saved workspace")
            page.get_by_label("Next step").fill("retry my draft")
            # Drop only the mutation at the transport boundary.
            page.route("**/rest/v1/customer_workspaces*", lambda r: r.abort("failed"))
            page.get_by_role("button", name="Save workspace").click()
            status(page, "Save unconfirmed")
            expect(page.get_by_label("Next step")).to_have_value("retry my draft")
            assert service.writes == writes
            page.unroute("**/rest/v1/customer_workspaces*")
            page.get_by_role("button", name="Save workspace").click()
            status(page, "Workspace saved")
            passed("failed load blocked writes; disconnected save retained draft and explicit retry succeeded")
            service.hold = "PATCH"
            page.get_by_label("Next step").fill("A delayed save")
            page.get_by_role("button", name="Save workspace").click()
            assert service.started.wait(5)
            page.get_by_role("button", name="Sign out").click()
            expect(page.locator("#credentials")).to_be_visible()
            sign_in(page, B)
            status(page, "workspace is empty")
            with page.expect_request_finished(lambda r: r.method == "PATCH"):
                service.release.set()
            page.evaluate("new Promise(done => setTimeout(done, 0))")
            expect(page.get_by_label("Next step")).to_have_value("")
            status(page, "workspace is empty")
            assert service.users[B]["id"] not in service.rows
            passed("late A write response after B sign-in left B blank; A write used A's token")
            service.release.clear()
            service.started.clear()
            service.hold = "GET"
            other = desktop.new_page()
            other.goto(base)
            assert service.started.wait(5)
            page.get_by_role("button", name="Sign out").click()
            expect(other.locator("#credentials")).to_be_visible()
            sign_in(page, A)
            status(other, "Your saved workspace")
            with other.expect_request_finished(lambda r: "/rest/v1/" in r.url):
                service.release.set()
            other.evaluate("new Promise(done => setTimeout(done, 0))")
            expect(other.get_by_label("Next step")).to_have_value("A delayed save")
            passed("cross-tab sign-out and reauthentication discarded a delayed B read")
            other.close()
            service.fail_logout = True
            page.get_by_role("button", name="Sign out").click()
            status(page, "could not confirm session revocation")
            assert not page.locator("#workspace").is_visible()
            service.fail_logout = False
            expect(page.locator("#credentials")).to_be_visible()
            page.reload()
            expect(page.locator("#credentials")).to_be_visible()
            assert page.evaluate("(k)=>localStorage.getItem(k)", demo_key) == demo_record
            passed("failed server revocation reported; reload stayed signed out locally; demo bytes unchanged")
            page.get_by_label("Email", exact=True).fill(A)
            page.get_by_role("button", name="Send password reset email").click()
            status(page, "password reset email")
            link = base + "#type=recovery&token_hash=" + service.links["recovery"][1]
            # B's persisted session shares this browser with A's email link.
            sign_in(page, B)
            status(page, "workspace is empty")
            recover = desktop.new_page()
            recover.goto(link)
            recover.get_by_role("button", name="Continue from email").click()
            recover.get_by_label("New password").fill(NEW)
            recover.get_by_role("button", name="Update password").click()
            status(recover, "Password updated")
            assert service.passwords[B] == PASSWORD and service.passwords[A] == NEW
            recover.goto(base)
            status(recover, "workspace is empty")
            expect(recover.locator("#identity")).to_have_text(B)
            recover.goto(link)
            recover.get_by_role("button", name="Continue from email").click()
            status(recover, "could not be verified")
            passed("A recovery changed A only while B remained signed in; reused email link rejected")
            recover.close()
            page.get_by_role("button", name="Sign out").click()
            expect(page.locator("#credentials")).to_be_visible()
            service.lifetime = 70
            sign_in(page, A, NEW)
            status(page, "Your saved workspace")
            refreshed = service.refreshes
            service.lifetime = 3600
            page.reload()
            status(page, "Your saved workspace")
            assert service.refreshes > refreshed
            expect(page.get_by_label("Next step")).to_have_value("A delayed save")
            passed("SDK rotated a near-expiry session and restored the same account")
            service.reject_session = True
            page.get_by_label("Next step").fill("rejected edit")
            page.get_by_role("button", name="Save workspace").click()
            status(page, "service rejected this session")
            assert not page.locator("#workspace").is_visible()
            assert service.rows[service.users[A]["id"]]["next_step"] == "A delayed save"
            service.reject_session = False
            page.get_by_role("button", name="Sign out").click()
            expect(page.locator("#credentials")).to_be_visible()
            passed("server-rejected session locked the editor and preserved remote data")
            service.lifetime = 5
            sign_in(page, A, NEW)
            status(page, "Your saved workspace")
            status(page, "session expired")
            assert not page.locator("#workspace").is_visible()
            assert page.locator("#identity").text_content() == ""
            passed("new password worked; expiry cleared identity, fields and write controls")
            phone.route("**/account/config.mjs", lambda r: r.fulfill(
                content_type="text/javascript", body="export const projectUrl='', publicKey='';"))
            phone.reload()
            status(phone, "Customer accounts are unavailable")
            phone.get_by_role("link", name="Hydra Stack demo profiles").click()
            expect(phone.get_by_role("button", name="Explore as Alex")).to_be_visible()
            passed("unconfigured customer route closed safely; original demo remained accessible")
            mobile.close()
            desktop.close()
    finally:
        service.release.set()
        service.shutdown()
        service.server_close()
        service.assets.cleanup()


if __name__ == "__main__":
    run()
