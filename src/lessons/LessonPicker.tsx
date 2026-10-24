// Lesson picker: ten tiles shown in the Guided Tour when no lesson is running (SPEC §2.7).
import { useApp } from '../store';
import { Button } from '../ui/kit';
import { LESSONS, QUESTIONS } from './lessons';
import { startLessonById } from './engine';
import './lessons.css';

export default function LessonPicker() {
  const completed = useApp((s) => s.completedLessons);
  const setScreen = useApp((s) => s.setScreen);
  const doneCount = LESSONS.filter((l) => completed.includes(l.id)).length;
  const firstOpen = LESSONS.find((l) => !completed.includes(l.id));

  return (
    <section className="panel panel-pad picker" aria-label="Guided tour: choose a lesson">
      <div className="picker-head">
        <div>
          <h2 className="picker-title">Guided tour</h2>
          <div className="muted small">Ten short lessons. Each one asks you to try one thing and watch what happens.</div>
        </div>
        <div className="xsmall muted num">{doneCount} of {LESSONS.length} done</div>
      </div>

      <div className="picker-grid">
        {LESSONS.map((l) => {
          const done = completed.includes(l.id);
          return (
            <button
              key={l.id}
              className={`picker-tile ${done ? 'done' : ''}`}
              onClick={() => startLessonById(l.id)}
              aria-label={`Lesson ${l.number}: ${l.title}. ${l.minutes} minutes. ${done ? 'Done.' : ''}`}
            >
              {done && (
                <span className="picker-done">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                  done
                </span>
              )}
              <span className="picker-tile-top">
                <span className="picker-num">{l.number}</span>
                <span className="picker-name">{l.title}</span>
              </span>
              <span className="picker-meta">
                Q{l.question} · {QUESTIONS[l.question].short} · {l.minutes} min
              </span>
              <span className="picker-learn">{l.learn}</span>
            </button>
          );
        })}
      </div>

      <div className="picker-foot">
        {firstOpen && <Button primary onClick={() => startLessonById(firstOpen.id)}>{doneCount === 0 ? 'Start with lesson 1' : `Continue with lesson ${firstOpen.number}`}</Button>}
        <Button onClick={() => setScreen('lab')}>Open the City Lab</Button>
        <Button onClick={() => setScreen('world')}>Explore the world</Button>
        <Button ghost onClick={() => setScreen('title')}>Back to the title</Button>
      </div>
    </section>
  );
}
