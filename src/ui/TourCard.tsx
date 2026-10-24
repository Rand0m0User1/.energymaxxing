// Tour card, top right: one step at a time. Next unlocks once the step's action is done.
// It stays above any demo the step opens.
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { Button, Icon, IconButton } from './kit';
import { TOURS, tourSummary } from './tours';

export default function TourCard() {
  const tour = useApp((s) => s.tour);
  const demo = useApp((s) => s.demo);
  const state = useApp();
  const [passedKey, setPassedKey] = useState<string | null>(null);

  const t = tour ? TOURS[tour.id] : null;
  const step = t ? t.steps[tour!.step] : null;
  const key = tour ? `${tour.id}:${tour.step}` : null;
  const passed = key != null && passedKey === key;

  // Set up the city when a step starts.
  useEffect(() => {
    if (!tour) return;
    TOURS[tour.id].steps[tour.step]?.setup?.(useApp.getState());
  }, [tour?.id, tour?.step]); // eslint-disable-line react-hooks/exhaustive-deps

  const sum = useMemo(() => tourSummary(state), [state.result, state.env, state.season, state.hourOfYear, state.input]); // eslint-disable-line react-hooks/exhaustive-deps
  const ok = !!step && (step.auto || !step.check || step.check(state, sum));

  useEffect(() => {
    if (!step || !key || !ok || passed || step.auto) return;
    // Re-check against the live store: the step's setup may have just changed it.
    const live = useApp.getState();
    if (!step.check || step.check(live, tourSummary(live))) {
      setPassedKey(key);
      step.onPass?.(useApp.getState());
    }
  }, [ok, passed, step, key]);

  if (!tour || !t || !step) return null;
  const done = step.auto || passed;
  const last = tour.step === t.steps.length - 1;

  return (
    <aside className="panel tour-card" aria-label={t.title} style={demo ? { zIndex: 1000 } : undefined}>
      <div className="tour-head">
        <span className="tour-title">{t.title}</span>
        <span className="tour-dots" aria-label={`Step ${tour.step + 1} of ${t.steps.length}`}>
          {t.steps.map((_, k) => <i key={k} className={k === tour.step ? 'cur' : k < tour.step ? 'past' : ''} />)}
        </span>
        <IconButton label="Close tour" onClick={state.endTour}><Icon name="close" /></IconButton>
      </div>
      <p className="tour-text">{step.text}</p>
      {!step.auto && passed && step.result && <p className="tour-result">{step.result}</p>}
      <div className="tour-actions">
        <Button ghost disabled={tour.step === 0} onClick={() => state.setTourStep(tour.step - 1)}>Back</Button>
        {last && step.end ? (
          step.end.map((b) => (
            <Button key={b.label} primary={b.primary} onClick={() => b.run(useApp.getState())}>{b.label}</Button>
          ))
        ) : (
          <Button primary disabled={!done} onClick={() => state.setTourStep(tour.step + 1)}>Next</Button>
        )}
      </div>
    </aside>
  );
}
