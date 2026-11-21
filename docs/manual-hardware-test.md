# Manual hardware test

Testing Stride Link against a real treadmill is done by a person, never by CI or a coding
agent. Follow these steps in order for every release candidate and record the results.

## Before you start

1. **Safety key in reach.** Attach the treadmill's safety key and keep it within arm's
   reach for the whole session.
2. **Stand clear.** Stand beside the treadmill, never on the belt.
3. **Record the environment.** Note the browser name and version, the operating system,
   the treadmill model, and the Stride Link version and commit from the page footer.

## Run to a verdict

4. Close the official Echelon app and any other app connected to the treadmill.
5. Open `stride-link.html` and press **Connect**.
6. Select the treadmill in the chooser and wait for a verdict.
7. Record the verdict and its reason.

## Export the log

8. Press **Export log** and keep the `.txt` file with the test record.

## Belt checks (Talks or Unlocked only)

9. Only at or below 3 km/h. Tick **I am standing clear of the belt**.
10. Press **Start**, then set speed to 1.0 km/h and confirm the belt moves.
11. Press **Stop belt** and confirm the belt stops.
12. Start again and press **Escape**; confirm the belt stops.
13. Set incline to 1, then back to 0.
14. Export the log again.

If the belt does not stop from the page at any point, stop it with the treadmill's stop
button or safety key immediately and record the failure.

## Test record

| Field | Value |
| --- | --- |
| Date | |
| Tester | |
| Stride Link version and commit | |
| Browser and version | |
| Operating system | |
| Treadmill model | |
| Verdict and reason | |
| Belt checks passed | |
| Log file name | |
