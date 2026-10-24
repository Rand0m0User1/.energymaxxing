// Step runner for lessons: applies each step's setup once, polls its check, and exposes navigation.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import type { ControlKey, InsideViewId, StationId, ToolId } from '../types';
import { LESSON_BY_ID, LESSONS, nextLesson } from './lessons';
import { findBadTokens } from './live';
import type { Lesson, Step } from './types';

export interface Effective {
  controls: ControlKey[] | 'all';
  camera: StationId | null;
  tool: ToolId | null;
  inside: { id: InsideViewId; level: number } | null;
}

/** Controls, camera, tool and inside view in force at step i (inherited from earlier steps). */
export function effectiveFor(lesson: Lesson, i: number): Effective {
  const e: Effective = { controls: ['dashboard'], camera: null, tool: null, inside: null };
  for (let k = 0; k <= i && k < lesson.steps.length; k++) {
    const s = lesson.steps[k];
    if (s.controls !== undefined) e.controls = s.controls;
    if (s.camera !== undefined) e.camera = s.camera;
    if (s.tool !== undefined) e.tool = s.tool;
    if (s.inside !== undefined) e.inside = s.inside;
  }
  return e;
}

/** Applies a step to the store: visible controls, tool, inside view, setup, camera. */
export function applyStep(lesson: Lesson, i: number): void {
  const step = lesson.steps[i];
  if (!step) return;
  const app = useApp.getState();
  const eff = effectiveFor(lesson, i);
  app.setVisibleControls(eff.controls);
  if (eff.inside) {
    if (app.inside !== eff.inside.id) app.openInside(eff.inside.id, eff.inside.level);
  } else if (app.inside) {
    app.closeInside();
  }
  if (useApp.getState().tool !== eff.tool) useApp.getState().openTool(eff.tool);
  try {
    step.setup?.(useApp.getState());
  } catch (err) {
    console.error(`[lessons] setup failed in ${lesson.id} step ${i + 1}`, err);
  }
  // Fly on the first step (so the lesson starts framed) and whenever a step names a camera.
  const cam = step.camera ?? (i === 0 ? eff.camera : null);
  if (cam) useApp.getState().flyTo(cam);
}

export interface LessonRunner {
  lesson: Lesson | null;
  stepIndex: number;
  step: Step | null;
  finished: boolean;
  answered: number | undefined;
  /** The step's check passed (or it is an auto step) and any prediction is answered. */
  done: boolean;
  effective: Effective | null;
  answer: (choice: number) => void;
  next: () => void;
  back: () => void;
  skip: () => void;
  restart: () => void;
  returnToView: () => void;
  exit: () => void;
  startNext: () => void;
  hasNextLesson: boolean;
}

export function useLessonRunner(): LessonRunner {
  const ls = useApp((s) => s.lesson);
  const lesson = ls ? LESSON_BY_ID[ls.id] ?? null : null;
  const stepIndex = ls?.step ?? 0;
  const finished = !!lesson && stepIndex >= lesson.steps.length;
  const step = lesson && !finished ? lesson.steps[stepIndex] ?? null : null;
  const answered = ls?.answered?.[stepIndex];
  const [nonce, setNonce] = useState(0);
  const runKey = lesson ? `${lesson.id}:${stepIndex}:${nonce}` : '';
  const [passedKey, setPassedKey] = useState<string | null>(null);

  // Run the step's setup once when the step starts (or restarts).
  useEffect(() => {
    if (lesson && step) applyStep(lesson, stepIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey]);

  // Lesson finished: mark complete and unlock everything.
  useEffect(() => {
    if (lesson && finished) {
      const app = useApp.getState();
      app.completeLesson(lesson.id);
      app.setVisibleControls('all');
      app.setPlaying(false);
    }
  }, [lesson, finished]);

  // Poll the check about four times a second; latch once it passes.
  useEffect(() => {
    if (!step || step.auto || !step.check || passedKey === runKey) return;
    const check = step.check;
    const test = () => {
      try {
        if (check(useApp.getState())) setPassedKey(runKey);
      } catch {
        /* a check must never break the card */
      }
    };
    test();
    const id = window.setInterval(test, 250);
    return () => window.clearInterval(id);
  }, [step, runKey, passedKey]);

  const predictOk = !step?.predict || answered !== undefined;
  const checkOk = !!step && (step.auto || !step.check || passedKey === runKey);
  const done = !!step && predictOk && checkOk;

  const effective = useMemo(() => (lesson ? effectiveFor(lesson, Math.min(stepIndex, lesson.steps.length - 1)) : null), [lesson, stepIndex]);

  const answer = useCallback((choice: number) => {
    const app = useApp.getState();
    if (!lesson || !step?.predict || app.lesson?.answered?.[stepIndex] !== undefined) return;
    app.answerPrediction(stepIndex, choice);
    try {
      step.predict.run?.(useApp.getState());
    } catch (err) {
      console.error('[lessons] prediction run failed', err);
    }
  }, [lesson, step, stepIndex]);

  const go = useCallback((n: number) => {
    if (!lesson) return;
    useApp.getState().setLessonStep(Math.max(0, Math.min(lesson.steps.length, n)));
  }, [lesson]);

  const next = useCallback(() => go(stepIndex + 1), [go, stepIndex]);
  const back = useCallback(() => go(stepIndex - 1), [go, stepIndex]);
  const skip = next;

  const restart = useCallback(() => {
    if (!lesson) return;
    useApp.getState().startLesson(lesson.id);
    setNonce((n) => n + 1);
  }, [lesson]);

  const returnToView = useCallback(() => {
    if (!effective) return;
    const app = useApp.getState();
    // Reopen the step's tool or inside view if the viewer closed it (e.g. with Esc).
    if (effective.inside && app.inside !== effective.inside.id) app.openInside(effective.inside.id, effective.inside.level);
    if (effective.tool && app.tool !== effective.tool) app.openTool(effective.tool);
    if (effective.camera) {
      if (app.cameraMode === 'map') app.setCameraMode('orbit');
      useApp.getState().flyTo(effective.camera);
    }
  }, [effective]);

  const exit = useCallback(() => {
    const app = useApp.getState();
    app.exitLesson();
    if (app.tool) app.openTool(null);
    if (app.inside) app.closeInside();
    app.setPlacePickerOpen(false);
  }, []);

  const nl = lesson ? nextLesson(lesson.id) : null;
  const startNext = useCallback(() => {
    if (nl) useApp.getState().startLesson(nl.id);
  }, [nl]);

  return {
    lesson, stepIndex, step, finished, answered, done, effective,
    answer, next, back, skip, restart, returnToView, exit, startNext, hasNextLesson: !!nl,
  };
}

/** Starts a lesson from anywhere (picker tiles, presenter, other modules). */
export function startLessonById(id: string): void {
  if (LESSON_BY_ID[id]) useApp.getState().startLesson(id);
}

// Dev check: every token in lesson text must resolve.
if (import.meta.env?.DEV) {
  for (const l of LESSONS) {
    const texts = [l.summary, l.aha ?? '', ...l.steps.flatMap((s) => [s.text, s.after ?? '', s.predict?.reveal ?? '', s.predict?.question ?? ''])];
    const bad = texts.flatMap(findBadTokens);
    if (bad.length) console.warn(`[lessons] ${l.id}: unknown tokens`, bad);
  }
}
