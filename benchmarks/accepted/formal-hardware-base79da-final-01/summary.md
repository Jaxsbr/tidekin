Tidekin performance: **FAIL**

Base: 79da54bdbd029090d4ed9d6fd3dd2caea1a4847c · Candidate: 6acc82a545a59d643b7649957bc39bf9cb02bb63

| Gate | Verdict | Base | Candidate | Delta |
|---|---|---:|---:|---:|
| cold/menuReadyMs | inconclusive | 54.09999990463257 | 58.89999961853027 | 4.799999713897705 |
| memory-peak/transition/1/home-reef/heapBytes | inconclusive | 41404192 | 62362856 | 20958664 |
| memory-peak/transition/8/salvage:horizon-wreck/heapBytes | inconclusive | 65427744 | 66176456 | 748712 |
| memory-peak/transition/20/salvage:horizon-wreck/heapBytes | inconclusive | 61250940 | 68813628 | 7562688 |
| memory-peak/entry/home-reef/heapBytes | fail | 42574900 | 69358920 | 26784020 |
| memory-peak/entry/sheltered-cove/heapBytes | inconclusive | 103537016 | 95373424 | -8163592 |
| memory-peak/entry/salvage:home-pearls/heapBytes | inconclusive | 83037560 | 61133544 | -21904016 |

Raw records retain collected frame/state/transition checkpoints and fixed transition warmup. Inconclusive exits nonzero; rerun both commits, never widen policy automatically. Software CI does not certify hardware FPS.
