export interface Fact {
  value: number;
  unit: string;
  label: string;
}

export type FactMap = Record<string, Fact>;

export function f(value: number, unit: string, label: string): Fact {
  return { value, unit, label };
}
