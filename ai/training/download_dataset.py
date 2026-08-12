from __future__ import annotations

import argparse
import shutil
import urllib.request
import zipfile
from pathlib import Path


DATASET_URL = "https://www.kaggle.com/api/v1/datasets/download/achmadnoer/alfabet-bisindo"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("data/raw"))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    archive = args.output / "alfabet-bisindo.zip"
    with urllib.request.urlopen(DATASET_URL) as response, archive.open("wb") as target:
        shutil.copyfileobj(response, target)
    with zipfile.ZipFile(archive) as dataset_zip:
        dataset_zip.extractall(args.output)
    archive.unlink()
    print(f"Dataset extracted to {args.output}")


if __name__ == "__main__":
    main()
