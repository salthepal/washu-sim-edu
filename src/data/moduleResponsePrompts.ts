interface ModuleResponsePrompt {
  required: boolean;
}

export const moduleResponsePrompts: Record<string, Record<string, ModuleResponsePrompt>> = {
  '01-learning-objectives-and-educational-design': {
    'goal-to-objective': { required: true },
    'success-criteria': { required: true },
  },
  '02-case-writing-and-scenario-design': {
    'case-decision-point': { required: true },
    'case-distractor': { required: true },
    'case-assessment-plan': { required: true },
  },
  '03-running-the-case': {
    'modality-choice': { required: true },
    'operations-plan': { required: true },
    'evaluation-plan': { required: true },
  },
  '04-prebriefing-and-debriefing': {
    'prebrief-plan': { required: true },
    'debrief-map': { required: true },
    'advocacy-inquiry': { required: true },
  },
  '12-simulation-research': {
    'research-question': { required: true },
    'theory-outcomes': { required: true },
    'protocol-risks': { required: true },
  },
};
