# BISINDO alphabet model research and production decision

## Outcome

SignLearn now uses `models/bisindo_geometry_v5.pkl`, a 26-class A-Z model built
for webcam inference. Evaluation keeps complete capture/signer groups out of
training. This is deliberately stricter than randomly splitting adjacent video
frames.

| Metric | Legacy model | Geometry v5 evaluation model |
| --- | ---: | ---: |
| Raw accuracy on detected signer-test frames | 5.97% | 74.68% |
| Raw macro F1 | 2.69% | 73.88% |
| Accepted accuracy at production threshold | not calibrated | 96.88% |
| Accepted coverage of detected test frames | not applicable | 33.25% |
| Validation accepted accuracy / coverage | not applicable | 99.42% / 45.41% |
| Classifier latency (MediaPipe excluded) | not comparable | 5.15 ms/frame |
| End-to-end CPU latency, p95 (104 images) | not measured | 40.99 ms/frame |

Production prioritizes precision: frames below confidence `0.93` or margin
`0.02` are reported as rejected and cannot enter the frontend vote. The camera
then requires consistent accepted frames before committing a character.

## Root causes found

1. The legacy model used only 312 source images (12 per class), then augmented
   those images and randomly split the derivatives. That makes its reported 99%
   metric optimistic and explains its poor webcam transfer.
2. Absolute x/y/z coordinates learned camera position and hand scale. V5 uses
   local pose, normalized bone direction, pairwise intra-hand distances, and a
   complete 21x21 cross-hand contact matrix.
3. A resting hand was often detected as part of a one-hand letter. V5 ignores a
   distant passive hand unless the hands are within 1.5 palm widths.
4. A global stateful MediaPipe tracker mixed tracking state across unrelated
   HTTP clients. Runtime extraction is now static/stateless per frame.
5. Published BISINDO work often uses random frame splits. Those metrics do not
   measure a new signer. SignLearn reserves filename groups `_2` and `_3`
   wholesale for validation and test during model selection.

## Public-model audit

- [`ademaulana/CNN-BISINDO`](https://huggingface.co/ademaulana/CNN-BISINDO) is MIT and small, but its preprocessing contract is
  undocumented. Direct tests on 281 detectable source images ranged from 8%
  to 42% under plausible landmark order/normalization variants, so it was not
  safe to deploy.
- [`Syizuril/YOLO11-BISINDO-Detection`](https://huggingface.co/Syizuril/YOLO11-BISINDO-Detection) reports very high mAP, but is AGPL-3.0 and
  its signer-independent evaluation is not documented. It was not bundled.
- [`Syizuril/bisindo-sign-language`](https://huggingface.co/Syizuril/bisindo-sign-language) reports 98.8% validation accuracy, but its
  model artifact does not state a clear license and the validation protocol is
  underdocumented. It was not bundled.
- Frozen ImageNet MobileNetV3 features were also tested locally. Full-frame and
  hand-crop transfer reached only 7.4% and 13.8% on the strict signer test;
  background/signers dominated the representation, so this path was rejected.

## Reproduce

Download/extract the three datasets, then run from the repository root:

```bash
npm run ai:train:production
```

The command regenerates ignored feature caches, trains candidates using the
validation signer, calibrates rejection, evaluates the untouched test signer,
and finally refits the deployment bundle using all public participants. The
full machine-readable result is `reports/production_v5.json`.

## Remaining limitation

The accepted predictions are production-conservative, but coverage is not yet
uniform across all signers and classes. A real deployment should log opt-in,
consented rejected frames without identity data, obtain validation from BISINDO
teachers/the Deaf community, and keep a separate multi-user webcam test set.
No public static-image metric can replace that field validation.
