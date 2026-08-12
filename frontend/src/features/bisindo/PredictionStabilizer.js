export const DetectionState = Object.freeze({
  NO_HAND: "NO_HAND",
  LOW_CONFIDENCE: "LOW_CONFIDENCE",
  UNKNOWN: "UNKNOWN",
  DETECTING: "DETECTING",
  COMMITTED: "COMMITTED",
  WAIT_FOR_RELEASE: "WAIT_FOR_RELEASE",
});

export const RejectionReason = Object.freeze({
  LOW_CONFIDENCE: "LOW_CONFIDENCE",
  LOW_MARGIN: "LOW_MARGIN",
  NOT_STABLE_YET: "NOT_STABLE_YET",
  NO_HAND: "NO_HAND",
  WAITING_RELEASE: "WAITING_RELEASE",
  COOLDOWN: "COOLDOWN",
  ROI_INVALID: "ROI_INVALID",
});

function rankProbabilities(probabilities) {
  return Object.entries(probabilities || {}).sort((left, right) => right[1] - left[1]);
}

function mean(values) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function mostFrequentLabel(history) {
  const counts = new Map();
  history.forEach((sample, index) => {
    if (!sample.label) return;
    const current = counts.get(sample.label) || { label: sample.label, votes: 0, latest: -1 };
    current.votes += 1;
    current.latest = index;
    counts.set(sample.label, current);
  });
  return [...counts.values()].sort((left, right) => right.votes - left.votes || right.latest - left.latest)[0] || null;
}

export class PredictionStabilizer {
  constructor(config) {
    this.config = config;
    this.reset();
  }

  reset() {
    this.smoothed = {};
    this.history = [];
    this.candidate = null;
    this.candidateFrames = 0;
    this.candidateSince = null;
    this.lockedLabel = null;
    this.repeatReleased = true;
    this.releaseSince = null;
    this.lastCommittedAt = Number.NEGATIVE_INFINITY;
    this.state = DetectionState.NO_HAND;
  }

  update(rawPrediction, now = Date.now()) {
    if (!rawPrediction?.detected) {
      this.#addHistory({ label: null, timestamp: now, probabilities: {} });
      this.#observeRelease(now, true);
      this.state = DetectionState.NO_HAND;
      return this.#result(rawPrediction, { rejectionReason: RejectionReason.NO_HAND });
    }

    const probabilities = rawPrediction.probabilities || {};
    this.#smooth(probabilities);
    const [top1 = [rawPrediction.label, rawPrediction.confidence || 0], top2 = [null, 0]] =
      rankProbabilities(this.smoothed);
    const [smoothedLabel, smoothedConfidence] = top1;
    const validForVoting = smoothedConfidence >= this.config.uncertainConfidence;

    this.#addHistory({
      label: validForVoting ? smoothedLabel : null,
      timestamp: now,
      probabilities: { ...this.smoothed },
    });
    this.#observeRelease(now, smoothedConfidence < this.config.keepConfidence);

    const majority = mostFrequentLabel(this.history);
    this.candidate = majority?.label || null;
    this.candidateFrames = majority?.votes || 0;
    const candidateSamples = this.candidate
      ? this.history.filter((sample) => sample.label === this.candidate)
      : [];
    this.candidateSince = candidateSamples[0]?.timestamp ?? null;

    const candidateConfidence = mean(candidateSamples.map(
      (sample) => sample.probabilities[this.candidate] || 0,
    ));
    const candidateMargin = mean(candidateSamples.map((sample) => {
      const candidateProbability = sample.probabilities[this.candidate] || 0;
      const runnerUp = rankProbabilities(sample.probabilities)
        .find(([label]) => label !== this.candidate)?.[1] || 0;
      return candidateProbability - runnerUp;
    }));
    const stableDuration = this.candidateSince === null ? 0 : now - this.candidateSince;

    if (this.lockedLabel && this.candidate && this.candidate !== this.lockedLabel
      && this.candidateFrames >= this.config.releaseVotes) {
      this.repeatReleased = true;
    }

    const telemetry = {
      stableLabel: this.candidate,
      confidence: candidateConfidence,
      secondLabel: top2[0],
      secondConfidence: top2[1],
      margin: candidateMargin,
      smoothedLabel,
      smoothedConfidence,
      stableDuration,
    };

    if (!validForVoting) {
      this.state = DetectionState.LOW_CONFIDENCE;
      return this.#result(rawPrediction, {
        ...telemetry,
        rejectionReason: RejectionReason.LOW_CONFIDENCE,
      });
    }

    const recentFastVotes = this.history.slice(-this.config.fastWindow)
      .filter((sample) => sample.label === this.candidate).length;
    const fastAccepted = candidateConfidence >= this.config.fastConfidence
      && candidateMargin >= this.config.fastMargin
      && recentFastVotes >= this.config.fastVotes;
    const normalAccepted = this.candidateFrames >= this.config.minimumVotes
      && stableDuration >= this.config.stableDurationMs
      && candidateConfidence >= this.config.minConfidence;

    if (!fastAccepted && !normalAccepted) {
      this.state = DetectionState.DETECTING;
      const reason = this.candidateFrames < this.config.minimumVotes
        || stableDuration < this.config.stableDurationMs
        ? RejectionReason.NOT_STABLE_YET
        : RejectionReason.LOW_CONFIDENCE;
      return this.#result(rawPrediction, { ...telemetry, rejectionReason: reason });
    }

    const requiredMargin = candidateConfidence >= this.config.highConfidence
      ? this.config.highConfidenceMinMargin
      : this.config.minMargin;
    if (!fastAccepted && candidateMargin < requiredMargin) {
      this.state = DetectionState.UNKNOWN;
      return this.#result(rawPrediction, {
        ...telemetry,
        rejectionReason: RejectionReason.LOW_MARGIN,
      });
    }

    if (this.lockedLabel === this.candidate && !this.repeatReleased) {
      this.state = DetectionState.WAIT_FOR_RELEASE;
      return this.#result(rawPrediction, {
        ...telemetry,
        rejectionReason: RejectionReason.WAITING_RELEASE,
      });
    }

    if (this.lockedLabel === this.candidate
      && now - this.lastCommittedAt < this.config.duplicateCooldownMs) {
      this.state = DetectionState.WAIT_FOR_RELEASE;
      return this.#result(rawPrediction, {
        ...telemetry,
        rejectionReason: RejectionReason.COOLDOWN,
      });
    }

    this.lockedLabel = this.candidate;
    this.repeatReleased = false;
    this.releaseSince = null;
    this.lastCommittedAt = now;
    this.state = DetectionState.COMMITTED;
    return this.#result(rawPrediction, {
      ...telemetry,
      committedCharacter: this.candidate,
      rejectionReason: null,
    });
  }

  #smooth(probabilities) {
    const alpha = this.config.smoothingAlpha;
    const hasHistory = Object.keys(this.smoothed).length > 0;
    const labels = new Set([...Object.keys(this.smoothed), ...Object.keys(probabilities)]);
    for (const label of labels) {
      this.smoothed[label] = hasHistory
        ? alpha * (probabilities[label] || 0) + (1 - alpha) * (this.smoothed[label] || 0)
        : probabilities[label] || 0;
    }
  }

  #addHistory(sample) {
    this.history.push(sample);
    if (this.history.length > this.config.predictionWindow) this.history.shift();
  }

  #observeRelease(now, releasing) {
    if (!this.lockedLabel || this.repeatReleased) return;
    if (!releasing) {
      this.releaseSince = null;
      return;
    }
    this.releaseSince ??= now;
    if (now - this.releaseSince >= this.config.releaseDurationMs) {
      this.repeatReleased = true;
      this.history = [];
      this.smoothed = {};
      this.candidate = null;
      this.candidateFrames = 0;
      this.candidateSince = null;
    }
  }

  #result(raw, values = {}) {
    const rawRanked = rankProbabilities(raw?.probabilities);
    const rawTop1 = rawRanked[0] || [raw?.label || null, raw?.confidence || 0];
    const rawTop2 = rawRanked[1] || [raw?.secondLabel || null, 0];
    return {
      state: this.state,
      currentState: this.state,
      rawLabel: rawTop1[0],
      rawPrediction: rawTop1[0],
      top1Confidence: rawTop1[1],
      top2Confidence: rawTop2[1],
      topPredictions: rawRanked.slice(0, 3).map(([label, confidence]) => ({ label, confidence })),
      stableLabel: values.stableLabel || null,
      smoothedPrediction: values.smoothedLabel || null,
      smoothedConfidence: values.smoothedConfidence || 0,
      confidence: values.confidence || 0,
      secondLabel: values.secondLabel || rawTop2[0],
      secondConfidence: values.secondConfidence || 0,
      margin: values.margin || 0,
      handDetected: Boolean(raw?.detected),
      stableFrames: this.candidateFrames,
      candidateFrames: this.candidateFrames,
      stableDuration: values.stableDuration || 0,
      rejectionReason: values.rejectionReason ?? null,
      committedCharacter: values.committedCharacter || null,
    };
  }
}
