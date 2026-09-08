// Run with Playwright available: NODE_PATH=/path/to/node_modules node tests/user-flow.cjs
// Uses isolated API fixtures so checking the flow never changes personal progress.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { days, corePracticeLoop } = require("../data/courseSeed");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const course = {
      corePracticeLoop,
      days: days.map((day) => ({
        ...day,
        progress: { status: "not_started", notes: "", selfRating: null },
      })),
    };
    const logs = [];
    let failCompletion = true;
    await page.route("**/api/**", async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      let result;
      if (url.pathname === "/api/auth/me")
        result = {
          id: "fixture-user",
          email: "fixture@example.com",
          name: "Fixture Speaker",
        };
      else if (url.pathname === "/api/recordings") result = [];
      else if (url.pathname === "/api/course") result = course;
      else if (url.pathname === "/api/logs" && request.method() === "GET")
        result = logs;
      else if (url.pathname === "/api/logs") {
        const data = request.postDataJSON();
        assert.equal(data.notes, "<script>unsafe</script> I kept going.");
        result = {
          id: 1,
          day: data.day,
          duration_minutes: data.durationMinutes,
          energy_level: data.energyLevel,
          confidence_level: data.confidenceLevel,
          notes: data.notes,
          created_at: "2026-09-08 12:00:00",
        };
        logs.unshift(result);
      } else {
        const data = request.postDataJSON();
        if (data.status === "completed" && failCompletion) {
          failCompletion = false;
          return route.fulfill({
            status: 500,
            json: { error: "Temporary save failure" },
          });
        }
        course.days[Number(url.pathname.split("/").pop()) - 1].progress = data;
        result = data;
      }
      await route.fulfill({ json: result });
    });
    await page.goto(process.env.APP_URL || "http://localhost:3000");
    await page
      .getByRole("heading", { name: "Your voice. A little stronger." })
      .waitFor();
    assert.equal(await page.locator(".day-card").count(), 10);
    await page.screenshot({
      path: "/tmp/speakwell-desktop.png",
      fullPage: true,
    });
    for (const day of course.days) {
      assert.equal(day.resources.length, 2);
      await page.locator(`.day-card[data-day="${day.day}"]`).click();
      await page.locator("#practice-title").waitFor();
      assert.equal(new URL(page.url()).hash, `#day/${day.day}`);
      assert.equal(await page.locator("dialog").count(), 0);
      const link = page.locator(".resource-card a");
      assert.equal(await link.getAttribute("href"), day.resources[0].url);
      assert.equal(await link.getAttribute("target"), "_blank");
      assert.equal(await page.locator(".resource-card li").count(), 3);
      await page
        .getByRole("link", { name: "Back to workshop", exact: true })
        .click();
    }
    await page.goto(`${process.env.APP_URL || "http://localhost:3000"}/#day/5`);
    await page
      .getByRole("heading", { name: "Past, Present, Future", exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByRole("heading", { name: "Past, Present, Future", exact: true })
      .waitFor();
    await page.getByRole("link", { name: "Next day", exact: true }).click();
    await page
      .getByRole("heading", { name: "Integration & Recap", exact: true })
      .waitFor();
    await page.goBack();
    await page
      .getByRole("heading", { name: "Past, Present, Future", exact: true })
      .waitFor();
    await page.goForward();
    await page
      .getByRole("heading", { name: "Integration & Recap", exact: true })
      .waitFor();
    await page.screenshot({
      path: "/tmp/speakwell-day-desktop.png",
      fullPage: true,
    });
    await page
      .getByRole("link", { name: "Back to workshop", exact: true })
      .click();
    await page.getByRole("button", { name: "Start today’s practice" }).click();
    await page.getByRole("button", { name: "Let’s practice" }).click();
    await page
      .getByRole("button", { name: "Start timer", exact: true })
      .click();
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    assert.notEqual(await page.locator("#timer-time").textContent(), "02:00");
    await page
      .getByRole("button", { name: "Resume timer", exact: true })
      .click();
    await page.getByRole("link", { name: "My progress", exact: true }).click();
    await page.goBack();
    await page
      .getByRole("button", { name: "Resume timer", exact: true })
      .waitFor();
    const returnedTime = await page.locator("#timer-time").textContent();
    await page.waitForTimeout(1100);
    assert.equal(
      await page.locator("#timer-time").textContent(),
      returnedTime,
      "Timer pauses when leaving the day",
    );
    await page.getByRole("button", { name: "Finish & reflect" }).click();
    await page
      .getByLabel("Your reflection")
      .fill("<script>unsafe</script> I kept going.");
    await page.getByLabel("Confidence (1–10)").fill("7");
    await page
      .getByRole("link", { name: "Practice journal", exact: true })
      .click();
    await page.goBack();
    await page.getByLabel("Your reflection").waitFor();
    assert.equal(
      await page.getByLabel("Your reflection").inputValue(),
      "<script>unsafe</script> I kept going.",
    );
    await page.getByRole("button", { name: "Save & complete day" }).click();
    await page.getByRole("button", { name: "Retry save" }).waitFor();
    assert.equal(logs.length, 1);
    await page.getByRole("button", { name: "Retry save" }).click();
    await page
      .getByRole("heading", { name: "You showed up for your voice." })
      .waitFor();
    assert.equal(logs.length, 1, "Retry must not duplicate a saved session");
    await page.getByRole("button", { name: "View your journal" }).click();
    await page.getByText("<script>unsafe</script> I kept going.").waitFor();
    assert.equal(await page.locator(".journal-entry script").count(), 0);
    await page.reload();
    await page.getByText("<script>unsafe</script> I kept going.").waitFor();
    await page.getByRole("link", { name: "My workshop", exact: true }).click();
    await page
      .getByRole("heading", { name: "The Volume Dial", exact: true })
      .first()
      .waitFor();
    for (const width of [390, 760]) {
      await page.setViewportSize({ width, height: 844 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `No horizontal overflow at ${width}px`,
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "/tmp/speakwell-mobile.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Start today’s practice" }).click();
    await page.getByRole("button", { name: "Let’s practice" }).click();
    await page.getByRole("button", { name: "Finish & reflect" }).click();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Day page fits mobile viewport",
    );
    await page.screenshot({
      path: "/tmp/speakwell-day-mobile.png",
      fullPage: true,
    });
    await page.getByLabel("Minutes practiced").fill("0");
    await page.getByRole("button", { name: "Save & complete day" }).click();
    assert.equal(
      await page.locator("#minutes").evaluate((el) => el.validity.valid),
      false,
    );
    assert.equal(logs.length, 1);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: 10 day screens, direct URLs, Back/Forward, retained drafts, auto-paused timers, resources, completion retries, journal, validation, and mobile layouts.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
