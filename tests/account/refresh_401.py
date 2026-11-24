"""A real SDK refresh in a second tab while the account page awaits a synthetic 401."""
import json
import time
import unittest
from tempfile import TemporaryDirectory
from threading import Thread

from playwright.sync_api import expect, sync_playwright
from browser import A, B, PASSWORD, launch, sign_in, status
from fixture import Service

TABLE = "**/rest/v1/customer_workspaces*"


class RefreshRejection(unittest.TestCase):
    def setUp(self):
        service = self.service = Service()
        Thread(target=service.serve_forever, daemon=True).start()
        self.addCleanup(service.assets.cleanup)
        self.addCleanup(service.server_close)
        self.addCleanup(service.shutdown)
        for email in (A, B):
            user = service.signup(email, PASSWORD)
            service.confirmed.add(email)
            service.rows[user["id"]] = dict(career_goal=email, next_step="saved", revision=user["id"])
        profile = self.enterContext(TemporaryDirectory())
        driver = self.enterContext(sync_playwright())
        self.context = launch(driver, profile, 1440, 900)
        self.addCleanup(self.context.close)
        self.page = self.context.pages[0]
        self.url = service.url + "/account/"
        self.page.goto(self.url)
        sign_in(self.page, A)
        status(self.page, "Your saved workspace")
        self.step = self.page.get_by_label("Next step")
        self.save = self.page.get_by_role("button", name="Save workspace")
        self.reload = self.page.get_by_role("button", name="Reload saved workspace")
        # A separate same-origin tab uses the actual SDK and its native auth broadcast.
        self.peer = self.context.new_page()
        self.peer.goto(self.url + "account.css")
        self.peer.add_script_tag(url=self.url + "supabase.js")
        self.peer.evaluate("""async () => {
            window.peer = supabase.createClient(location.origin, 'sb_publishable_fixture');
            if (!(await peer.auth.getSession()).data.session) throw Error('missing fixture session');
        }""")

    def hold(self, method, action):
        routes = []

        def intercept(route):
            if route.request.method == method and not routes:
                routes.append(route)
            else:
                route.continue_()

        self.page.route(TABLE, intercept)
        action()
        deadline = time.monotonic() + 5
        while not routes and time.monotonic() < deadline:
            self.page.wait_for_timeout(10)
        self.assertTrue(routes, "expected an outstanding " + method)
        return routes[0]

    def refuse(self, route):
        pending = self.page.locator("#status").inner_text()
        route.fulfill(status=401, content_type="application/json",
                      body=json.dumps({"message": "Rejected test bearer"}))
        expect(self.page.locator("#status")).not_to_have_text(pending)

    def rotate(self, route):
        old = route.request.header_value("authorization")
        self.page.evaluate("""() => {
            const key = Object.keys(localStorage).find(k => k.endsWith('-auth-token'));
            const channel = new BroadcastChannel(key);
            window.rotated = new Promise(resolve => {
                channel.onmessage = ({data}) => {
                    if (data.event === 'TOKEN_REFRESHED') {
                        channel.close();
                        resolve(data.session.access_token);
                    }
                };
            });
        }""")
        new = self.peer.evaluate("""async () => {
            const {data, error} = await peer.auth.refreshSession();
            if (error) throw Error('refresh failed');
            return data.session.access_token;
        }""")
        self.assertTrue(self.page.evaluate("window.rotated") == new)
        self.assertTrue(old != "Bearer " + new, "the two request credentials must differ")
        self.assertEqual(self.service.refreshes, 1)
        return "Bearer " + new

    def draft(self):
        self.page.get_by_label("Career goal").fill("A unsaved goal")
        self.step.fill("A unsaved step")

    def start_reload(self):
        # An ordinary failed save exposes the existing reload/discard control.
        self.service.fail_write = True
        self.save.click()
        status(self.page, "Save unconfirmed")
        self.service.fail_write = False
        self.page.once("dialog", lambda dialog: dialog.accept())
        return self.hold("GET", self.reload.click)

    def assert_retry(self, token):
        print("  observed", self.page.locator("#status").inner_text(),
              "editor_visible=", self.page.locator("#workspace").is_visible(),
              "draft_intact=", self.step.input_value() == "A unsaved step", flush=True)
        expect(self.page.locator("#identity")).to_have_text(A)
        expect(self.save).to_be_enabled()
        expect(self.step).to_have_value("A unsaved step")
        expect(self.page.get_by_label("Career goal")).to_have_value("A unsaved goal")
        self.assertIn("Save workspace", self.page.locator("#status").inner_text())
        owner = self.service.users[A]["id"]
        self.assertEqual(self.service.rows[owner]["next_step"], "saved")
        writes = self.service.writes
        with self.page.expect_request(lambda req: req.method == "PATCH") as retry:
            self.save.click()
        status(self.page, "Workspace saved")
        self.assertTrue(retry.value.header_value("authorization") == token)
        self.assertEqual(self.service.writes, writes + 1)
        self.page.reload()
        status(self.page, "Your saved workspace")
        expect(self.step).to_have_value("A unsaved step")
        expect(self.page.get_by_label("Career goal")).to_have_value("A unsaved goal")
        self.assertEqual(self.service.writes, writes + 1)
        print("  explicit retry: one accepted PATCH with rotated token; both fields survived reload", flush=True)

    def test_delayed_save_401_after_refresh(self):
        self.draft()
        route = self.hold("PATCH", self.save.click)
        token = self.rotate(route)
        self.refuse(route)
        self.assertEqual(self.service.writes, 0)
        self.assert_retry(token)

    def test_delayed_read_401_after_refresh(self):
        self.draft()
        route = self.start_reload()
        writes = self.service.writes
        token = self.rotate(route)
        self.refuse(route)
        self.assertEqual(self.service.writes, writes)
        self.assert_retry(token)

    def test_initial_read_can_retry_without_writing(self):
        route = self.hold("GET", lambda: self.page.reload(wait_until="domcontentloaded"))
        token = self.rotate(route)
        self.refuse(route)
        expect(self.reload).to_be_visible()
        expect(self.save).to_be_hidden()
        with self.page.expect_request(lambda r: "/rest/v1/" in r.url) as read:
            self.reload.click()
        status(self.page, "Your saved workspace")
        self.assertTrue(read.value.header_value("authorization") == token)
        expect(self.step).to_have_value("saved")
        self.assertEqual(self.service.writes, 0)

    def test_current_token_rejected_by_service(self):
        self.draft()
        self.service.reject_session = True
        self.save.click()
        self.assert_locked()
        self.service.reject_session = False
        self.page.get_by_role("button", name="Sign out").click()
        self.service.reject_session = True
        sign_in(self.page, A)
        self.assert_locked()
        self.assertEqual(self.service.writes, 0)

    def assert_locked(self):
        status(self.page, "service rejected this session")
        expect(self.page.locator("#workspace")).to_be_hidden()
        self.assertEqual(self.step.input_value(), "")
        self.assertEqual(self.page.locator("#identity").text_content(), "")

    def test_a_to_b_ignores_outstanding_401(self):
        self.draft()
        route = self.hold("PATCH", self.save.click)
        self.peer.evaluate("""async credentials => {
            const {error} = await peer.auth.signInWithPassword(credentials);
            if (error) throw Error('B sign-in failed');
        }""", {"email": B, "password": PASSWORD})
        expect(self.page.locator("#identity")).to_have_text(B)
        status(self.page, "Your saved workspace")
        expect(self.step).to_have_value("saved")
        expect(self.page.get_by_label("Career goal")).to_have_value(B)
        self.step.fill("B unsaved step")
        with self.page.expect_request_finished(lambda r: r.method == "PATCH"):
            route.fulfill(status=401, content_type="application/json", body="{}")
        self.page.evaluate("new Promise(done => setTimeout(done, 0))")
        expect(self.page.locator("#identity")).to_have_text(B)
        expect(self.step).to_have_value("B unsaved step")
        expect(self.save).to_be_enabled()
        self.assertEqual(self.service.writes, 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
