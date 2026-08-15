from __future__ import annotations

import argparse
import hashlib
import shutil
import urllib.request
import zipfile
from pathlib import Path


DATASET_ID = "4xnkvr88tk"
DATASET_VERSION = 1
DATASET_DOI = "10.17632/4xnkvr88tk.1"
DATASET_URL = (
    f"https://data.mendeley.com/public-api/zip/{DATASET_ID}/download/{DATASET_VERSION}"
)
ARCHIVE_SHA256 = "da4d83e3d9a577fef6c4f5fba33315257ecedc613ad4f151c39e6fbd70d9e804"


def _safe_extract(archive: zipfile.ZipFile, output: Path) -> None:
    output_root = output.resolve()
    for member in archive.infolist():
        target = (output / member.filename).resolve()
        if target != output_root and output_root not in target.parents:
            raise ValueError(f"Unsafe path in dataset archive: {member.filename}")
    archive.extractall(output)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("data/raw/mendeley_bisindo_v1"))
    parser.add_argument("--keep-archive", action="store_true")
    args = parser.parse_args()

    args.output.mkdir(parents=True, exist_ok=True)
    archive_path = args.output.with_suffix(".zip")
    request = urllib.request.Request(DATASET_URL, headers={"User-Agent": "SignLearn/1.0"})
    with urllib.request.urlopen(request) as response, archive_path.open("wb") as target:
        shutil.copyfileobj(response, target)

    actual_hash = _sha256(archive_path)
    if actual_hash != ARCHIVE_SHA256:
        raise ValueError(
            f"Dataset checksum mismatch: expected {ARCHIVE_SHA256}, got {actual_hash}"
        )
    with zipfile.ZipFile(archive_path) as archive:
        _safe_extract(archive, args.output)
    if not args.keep_archive:
        archive_path.unlink()
    print(f"Mendeley BISINDO dataset ({DATASET_DOI}) extracted to {args.output}")


if __name__ == "__main__":
    main()
