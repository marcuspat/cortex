/**
 * ADR-001: agentic-flow as core foundation
 *
 * Main entry point for agentic-flow integration
 */

export * from './agent';
export * from './coordinator';
export * from './workflow';
export * from './factory';
export * from './orchestration';
export * from './task-executor';

// Re-export agentic-flow core types
export { Agent, Workflow, Coordinator } from 'agentic-flow';
