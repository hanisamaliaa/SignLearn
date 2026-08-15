# BISINDO model files

`bisindo_geometry_v5.pkl` is the default production bundle. It contains a
26-class RBF SVM, Platt probability calibration, the feature-schema version,
and conservative rejection thresholds. It was trained from three public
sources:

- [Mendeley BISINDO dataset](https://data.mendeley.com/datasets/4xnkvr88tk/1),
  by Arya Raden and Muhammad Asshafi, DOI `10.17632/4xnkvr88tk.1`, CC BY 4.0.
- Kaggle [`achmadnoer/alfabet-bisindo`](https://www.kaggle.com/datasets/achmadnoer/alfabet-bisindo),
  CC0.
- Kaggle [`niputukarismadewi/talkee-bisindo-sign-language-dataset`](https://www.kaggle.com/datasets/niputukarismadewi/talkee-bisindo-sign-language-dataset),
  CC0.

`rf_bisindo_99.pkl` is retained only for explicit rollback. Its published 99%
score came from a small augmented random split; on the v5 signer-held-out test
it achieved 5.97% raw accuracy. It is no longer the application default.

Full evaluation, per-class results, rejection coverage, and reproducibility
metadata are in `../reports/production_v5.json`.
