// Gas plant (SPEC §5.1, §8.6): turbine hall and one stack. Faint grey puffs rise while it runs,
// faster when it makes more power.
import { SOURCE_COLORS } from '../../data/colors';
import { NEUTRAL, Block, Cyl, Puffs, accent, genFrac, usePlantOn } from './shared';

const STACK: [number, number, number] = [5.2, 0, -3.2];
const STACK_H = 15;

function exhaustRate(): number {
  const f = genFrac('gas', 0.5);
  return f > 0.001 ? 0.25 + 0.75 * f : 0;
}

export default function GasPlant() {
  const on = usePlantOn('gas');
  const band = accent(SOURCE_COLORS.gas, on);

  return (
    <group>
      <Block p={[0, 0, 0]} s={[20, 0.12, 16]} color={NEUTRAL.concrete} shadow={false} />

      {/* Turbine hall */}
      <Block p={[-2.5, 0, 1.5]} s={[10, 5.5, 6.5]} color={NEUTRAL.offWhite} />
      <Block p={[-2.5, 5.5, 1.5]} s={[10.2, 0.3, 6.7]} color={NEUTRAL.roof} />
      <Block p={[-2.5, 4.6, 4.78]} s={[10.05, 0.4, 0.05]} color={band} shadow={false} />
      <Block p={[-2.5, 2.4, 4.78]} s={[7.5, 0.9, 0.05]} color={NEUTRAL.window} shadow={false} />

      {/* Heat recovery box and duct to the stack */}
      <Block p={[4.6, 0, 1.2]} s={[3.6, 6.2, 4]} color={NEUTRAL.white} />
      <Block p={[5.2, 3.6, -1.4]} s={[1.4, 1.6, 2.2]} color={NEUTRAL.concreteDark} />

      {/* Stack with a soft band near the top */}
      <Cyl p={STACK} r={0.75} h={STACK_H} color={NEUTRAL.concrete} />
      <Cyl p={[STACK[0], STACK_H - 2.2, STACK[2]]} r={0.79} h={0.7} color={band} shadow={false} />

      {/* Gas line and meter box */}
      <Block p={[-8.4, 0, -4.4]} s={[2, 1.6, 1.6]} color={NEUTRAL.steel} />
      <Block p={[-3.2, 0.5, -4.4]} s={[8.6, 0.35, 0.35]} color={NEUTRAL.steel} />

      <Puffs
        origin={[STACK[0], STACK_H + 0.4, STACK[2]]}
        rate={exhaustRate}
        color="#9c9893"
        opacity={0.3}
        max={18}
        perSecond={2.2}
        rise={11}
        size={1.1}
      />
    </group>
  );
}
