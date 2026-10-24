// Lesson card: one instruction at a time, top-left below the top bar (SPEC §2.7, §11).
import { useApp } from '../store';
import { Button, RealTerm } from '../ui/kit';
import { GLOSSARY } from '../data/glossary';
import { QUESTIONS } from './lessons';
import { useLessonRunner } from './engine';
import { LiveRow, RichText } from './live';
import './lessons.css';

export default function LessonCard() {
  const r = useLessonRunner();
  const setScreen = useApp((s) => s.setScreen);
  const { lesson, step, stepIndex, finished } = r;
  if (!lesson) return null;
  const total = lesson.steps.length;

  const header = (
    <div className="lesson-head">
      <div className="xsmall muted">
        Lesson {lesson.number} of 10 · Question {lesson.question}
      </div>
      <button className="lesson-x" onClick={r.exit} aria-label="Back to lessons" title="Back to lessons">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  );

  const dots = (
    <div className="lesson-dots" aria-label={`Step ${Math.min(stepIndex + 1, total)} of ${total}`}>
      {lesson.steps.map((_, i) => (
        <span key={i} className={`lesson-dot ${i < stepIndex || finished ? 'past' : ''} ${i === stepIndex && !finished ? 'now' : ''}`} />
      ))}
    </div>
  );

  if (finished || !step) {
    return (
      <section className="panel panel-pad lesson-card" aria-label={`${lesson.title}, finished`}>
        {header}
        <h2 className="lesson-title">{lesson.title}</h2>
        {dots}
        <div className="lesson-body">
          <div className="lesson-kicker small">Lesson complete</div>
          <RichText text={lesson.summary} className="lesson-text" />
          {lesson.aha && <p className="lesson-aha">{lesson.aha}</p>}
          <p className="xsmall muted">Question {lesson.question}: {QUESTIONS[lesson.question].short}</p>
        </div>
        <div className="lesson-actions lesson-actions-col">
          {r.hasNextLesson && <Button primary onClick={r.startNext}>Next lesson</Button>}
          <Button onClick={() => setScreen('lab')}>Open the City Lab</Button>
          <Button ghost onClick={r.exit}>Back to lessons</Button>
        </div>
      </section>
    );
  }

  const p = step.predict;
  const answeredIdx = r.answered;
  const showActions = !!step.actions?.length && (!p || answeredIdx !== undefined) && !r.done;
  const showAfter = r.done && (!!step.after || !!p);
  const ahaOnText = step.aha === 'text' || (step.aha === true && !step.after);
  const ahaOnAfter = step.aha === 'after' || (step.aha === true && !!step.after);

  return (
    <section className="panel panel-pad lesson-card" aria-label={`${lesson.title}, step ${stepIndex + 1} of ${total}`}>
      {header}
      <h2 className="lesson-title">{lesson.title}</h2>
      {dots}

      <div className="lesson-body">
        <div className={ahaOnText ? 'lesson-aha' : ''}>
          <RichText text={step.text} className="lesson-text" />
        </div>
        {step.term && <TermLine id={step.term} />}

        {p && (
          <div className="lesson-predict">
            <div className="small lesson-predict-q">{p.question}</div>
            <div className="lesson-choices" role="group" aria-label="Your guess">
              {p.choices.map((c, i) => (
                <button
                  key={i}
                  className={`lesson-choice ${answeredIdx === i ? 'picked' : ''} ${r.done && p.correct === i ? 'correct' : ''}`}
                  disabled={answeredIdx !== undefined}
                  aria-pressed={answeredIdx === i}
                  onClick={() => r.answer(i)}
                >
                  {c}
                </button>
              ))}
            </div>
            {answeredIdx !== undefined && !r.done && <div className="small muted">Let's see.</div>}
          </div>
        )}

        {showActions && (
          <div className="lesson-do">
            {step.actions!.map((a) => (
              <Button key={a.label} onClick={() => a.run(useApp.getState())}>{a.label}</Button>
            ))}
          </div>
        )}

        {step.watch && step.watch.length > 0 && <LiveRow kinds={step.watch} />}

        {showAfter && (
          <div className={`lesson-after ${ahaOnAfter ? 'is-aha' : ''}`} aria-live="polite">
            {p && <RichText text={p.reveal} className="lesson-text" />}
            {step.after && <RichText text={step.after} className="lesson-text" />}
            {step.afterTerm && <TermLine id={step.afterTerm} />}
          </div>
        )}
      </div>

      <div className="lesson-actions">
        <Button ghost onClick={r.back} disabled={stepIndex === 0}>Back</Button>
        <Button primary onClick={r.next} disabled={!r.done}>
          {stepIndex === total - 1 ? 'Finish' : 'Next'}
        </Button>
        <Button ghost onClick={r.skip}>Skip step</Button>
        <Button ghost onClick={r.restart} ariaLabel="Restart this lesson" title="Restart this lesson">Restart</Button>
      </div>
      <div className="lesson-links xsmall">
        {r.effective?.camera && (
          <button className="lesson-link" onClick={r.returnToView}>Return to view</button>
        )}
        <button className="lesson-link" onClick={() => setScreen('lab')}>Skip to sandbox</button>
      </div>
    </section>
  );
}

function TermLine({ id }: { id: keyof typeof GLOSSARY }) {
  const g = GLOSSARY[id];
  if (!g) return null;
  return (
    <div className="lesson-term" title={g.explain}>
      <RealTerm>{g.term}</RealTerm>
    </div>
  );
}
