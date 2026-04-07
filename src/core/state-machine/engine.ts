import type { StateMachineConfig, StateNode, TransitionConfig, TransitionEffect } from './types';
import { TransitionError, GuardError } from './errors';

export class StateMachine<TContext = Record<string, unknown>> {
  constructor(
    private config: StateMachineConfig,
    private transitions: TransitionConfig<TContext>[],
  ) {}

  get id(): string {
    return this.config.id;
  }

  get initial(): string {
    return this.config.initial;
  }

  getState(state: string): StateNode | undefined {
    return this.config.states[state];
  }

  isTerminal(state: string): boolean {
    return this.config.states[state]?.terminal === true;
  }

  isEditable(state: string): boolean {
    return this.config.states[state]?.editable === true;
  }

  getAllStates(): Record<string, StateNode> {
    return this.config.states;
  }

  getAvailableTransitions(
    currentState: string,
    userPermissions: Set<string>,
  ): TransitionConfig<TContext>[] {
    return this.transitions.filter(t => {
      const fromStates = Array.isArray(t.from) ? t.from : [t.from];
      if (!fromStates.includes(currentState)) return false;
      if (!t.requiredPermissions.every(p => userPermissions.has(p))) return false;
      return true;
    });
  }

  async transition(
    currentState: string,
    action: string,
    context: TContext,
  ): Promise<{ newState: string; effects: TransitionEffect<TContext>[] }> {
    // Find matching transition
    const transition = this.transitions.find(t => {
      const fromStates = Array.isArray(t.from) ? t.from : [t.from];
      return fromStates.includes(currentState) && t.action === action;
    });

    if (!transition) {
      throw new TransitionError(
        `No transition "${action}" from state "${currentState}"`,
        currentState,
        action,
      );
    }

    // Run guards
    for (const guard of transition.guards ?? []) {
      const result = guard.check(context);
      if (!result.pass) {
        throw new GuardError(guard.name, result.reason ?? 'Guard check failed');
      }
    }

    // Resolve target state
    const newState = typeof transition.to === 'function'
      ? transition.to(context)
      : transition.to;

    // Validate target state exists
    if (!this.config.states[newState]) {
      throw new TransitionError(
        `Target state "${newState}" does not exist`,
        currentState,
        action,
      );
    }

    return { newState, effects: transition.effects ?? [] };
  }
}
