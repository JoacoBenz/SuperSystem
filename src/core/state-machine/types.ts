export interface StateMachineConfig {
  id: string;
  initial: string;
  states: Record<string, StateNode>;
}

export interface StateNode {
  label: string;
  terminal?: boolean;
  editable?: boolean;
  meta?: Record<string, unknown>;
}

export interface TransitionConfig<TContext = Record<string, unknown>> {
  action: string;
  from: string | string[];
  to: string | ((ctx: TContext) => string);
  label: string;
  requiredPermissions: string[];
  segregationRule?: string;
  guards?: Guard<TContext>[];
  effects?: TransitionEffect<TContext>[];
}

export interface Guard<TContext = Record<string, unknown>> {
  name: string;
  description: string;
  check: (ctx: TContext) => { pass: boolean; reason?: string };
}

export interface TransitionEffect<TContext = Record<string, unknown>> {
  name: string;
  execute: (ctx: TContext) => Promise<void>;
}
