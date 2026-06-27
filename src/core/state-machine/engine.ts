import type { StateMachineConfig, StateNode, TransitionConfig, TransitionEffect } from './types';
import type { SegregationRule } from '@/src/core/permissions/types';
import { TransitionError, GuardError } from './errors';
import { checkSegregation } from '@/src/core/permissions/segregation';

export class StateMachine<TContext = Record<string, unknown>> {
  constructor(
    private config: StateMachineConfig,
    private transitions: TransitionConfig<TContext>[],
    private options?: { segregationRules?: Record<string, SegregationRule> },
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
    userPermissions?: Set<string>,
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

    // Enforce required permissions when caller provides the user's permission set
    if (userPermissions && transition.requiredPermissions?.length) {
      const missing = transition.requiredPermissions.filter(p => !userPermissions.has(p));
      if (missing.length > 0) {
        throw new GuardError('insufficient_permissions', `Missing required permissions: ${missing.join(', ')}`);
      }
    }

    // Run guards
    for (const guard of transition.guards ?? []) {
      const result = guard.check(context);
      if (!result.pass) {
        throw new GuardError(guard.name, result.reason ?? 'Guard check failed');
      }
    }

    // Enforce segregation of duties if a rule is declared on this transition
    if (transition.segregationRule && this.options?.segregationRules) {
      const rule = this.options.segregationRules[transition.segregationRule];
      if (rule) {
        const result = checkSegregation(rule, (context as any).userId, context as any);
        if (!result.allowed) {
          throw new GuardError('segregation_of_duties', result.reason!);
        }
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
