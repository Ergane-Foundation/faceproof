# ml_prep

Small Python tools for looking at the models. You do not need them to build or
use the SDK: `yarn setup:models` downloads the models.

| Script | What it does |
|--------|--------------|
| `inspect_model.py` | Prints input and output names, shapes, types and quantization of one or all `.tflite` files. |
| `verify_models.py` | Loads each model, runs one inference on random input and reports pass or fail. The time it prints is from your computer's CPU, not a phone. |
| `calibrate_threshold.py` | Measures how well the face-match threshold separates the same person from different people on the LFW dataset, and recommends a threshold. |

## Setup

Python 3.10 or newer. In a virtual environment:

```sh
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install tensorflow
# calibrate_threshold.py also needs these
pip install pillow numpy 
# Optional: install matplotlib to generate roc.png
pip install matplotlib
```

## Usage

```sh
python ml_prep/inspect_model.py
python ml_prep/inspect_model.py android/src/main/assets/models/mobilefacenet.tflite
python ml_prep/verify_models.py
```

Paths are resolved relative to the script, so these commands work from any folder
and on Windows, macOS and Linux.

## Calibrating the match threshold

`calibrate_threshold.py` runs the SDK's own models on the LFW pairs protocol and
measures how often the match threshold accepts the wrong person or rejects the
right one. It follows the same steps as the Android path without an app-provided
face box: face detection, alignment, embedding and cosine similarity. Images where
Android would answer `NO_FACE` or `MULTIPLE_FACES` are left out and counted, so the
numbers describe what the SDK would actually do.

FAR (false accept rate) is the share of different-person comparisons that are
wrongly accepted. TAR (true accept rate) is the share of same-person comparisons
that are correctly accepted.

### Run it

From the repository root:

```sh
yarn setup:models
python ml_prep/calibrate_threshold.py
```

Options:

- `--target-far 1e-4`: FAR per comparison used for the recommended threshold (default `1e-4`).
- `--limit N`: use only the first N pairs, as a quick smoke test.
- `--out DIR`: output folder (default `ml_prep/.cache/calibration/`).

The first run downloads LFW (about 180 MB, checked by SHA-256) into
`ml_prep/.cache/`, which Git ignores. The time a full run takes depends on your
computer; the run time is saved in `summary.json` as `seconds`. Progress is
printed while it runs.

### Output

Files are written to `ml_prep/.cache/calibration/`:

- `summary.json`: the numbers described below.
- `roc.csv`: columns `threshold`, `far` and `tar`, for thresholds from -0.2 to 1.0 in steps of 0.005.
- `roc.png`: the ROC curve (only written if matplotlib is installed).

Fields in `summary.json`:

| Field | Meaning |
|-------|---------|
| `dataset` | Dataset and protocol used. |
| `pairs_total` | Number of pairs in the protocol (or the number you chose with `--limit`). |
| `pairs_used` | Pairs where both images produced an embedding. |
| `genuine_pairs` | Same-person pairs where both images produced an embedding. |
| `impostor_pairs_protocol` | Different-person pairs from `pairs.txt` where both images produced an embedding. |
| `impostor_pairs_all_cross_identity` | All different-person pairs among the embedded images. FAR is measured on these, because the protocol's own different-person pairs are too few to measure a FAR of 1e-4. |
| `images` | Distinct images referenced by the pairs. |
| `images_excluded` | Counts of `no_face` and `multiple_faces` (these images are excluded) and `low_quality` (counted only, not excluded). |
| `image_exclusion_rate` | Share of images excluded for having no face or several faces. |
| `pair_exclusion_rate` | Share of the protocol pairs dropped because one or both images were excluded. One excluded image removes every pair it appears in, so this is usually higher than `image_exclusion_rate`. |
| `ten_fold_accuracy_mean`, `ten_fold_accuracy_std` | Mean and standard deviation of the standard LFW 10-fold accuracy. |
| `tar_at_far` | One entry for each FAR target (1e-2, 1e-3 and 1e-4): the `threshold`, the FAR measured there (`far_measured`) and the `tar`. |
| `recommended_threshold` | The lowest threshold whose measured FAR is at or below the target, rounded up to 2 decimals. |
| `recommended_for_far` | The FAR target used (`--target-far`). |
| `recommended_far_measured`, `recommended_tar_measured` | FAR and TAR measured at the rounded recommended threshold. |
| `one_to_n_false_accept_probability` | Chance that a person who is not enrolled is falsely matched against N enrolled people, for N = 10, 100 and 1000. It is 1 - (1 - FAR)^N, which is about N x FAR while that is small. |
| `model_sha256` | SHA-256 hashes of the two model files used. |
| `python` | Python version used for the run. |
| `seconds` | Run time in seconds. |

LFW is made of clean web photos, and the model's training data overlaps LFW
identities, so treat the results as an upper bound and re-check the threshold on
data from your own users and cameras. For the measured results, see
[docs/BENCHMARKS.md](../docs/BENCHMARKS.md#accuracy).