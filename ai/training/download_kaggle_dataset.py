from __future__ import annotations

import argparse
import hashlib
import re
import shutil
import urllib.request
import zipfile
from pathlib import Path


DATASET_REF_PATTERN = re.compile(r"^[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+$")


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _safe_extract(archive: zipfile.ZipFile, output: Path) -> None:
    output_root = output.resolve()
    for member in archive.infolist():
        target = (output / member.filename).resolve()
        if target != output_root and output_root not in target.parents:
            raise ValueError(f"Unsafe path in dataset archive: {member.filename}")
    archive.extractall(output)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", help="Public Kaggle reference: owner/slug")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--expected-sha256")
    parser.add_argument("--keep-archive", action="store_true")
    args = parser.parse_args()

    if not DATASET_REF_PATTERN.fullmatch(args.dataset):
        raise ValueError("Dataset must use the public Kaggle owner/slug format.")

    args.output.mkdir(parents=True, exist_ok=True)
    archive_path = args.output.with_suffix(".zip")
    url = f"https://www.kaggle.com/api/v1/datasets/download/{args.dataset}"
    request = urllib.request.Request(url, headers={"User-Agent": "SignLearn/1.0"})
    with urllib.request.urlopen(request) as response, archive_path.open("wb") as target:
        shutil.copyfileobj(response, target)

    checksum = _sha256(archive_path)
    if args.expected_sha256 and checksum.lower() != args.expected_sha256.lower():
        raise ValueError(
            f"Dataset checksum mismatch: expected {args.expected_sha256}, got {checksum}"
        )
    with zipfile.ZipFile(archive_path) as archive:
        _safe_extract(archive, args.output)
    if not args.keep_archive:
        archive_path.unlink()
    print(f"Kaggle dataset {args.dataset} extracted to {args.output}")
    print(f"Archive SHA-256: {checksum}")


if __name__ == "__main__":
    main()
