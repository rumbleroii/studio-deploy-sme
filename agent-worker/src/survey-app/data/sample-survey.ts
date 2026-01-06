import { Survey } from '../types/survey';

export const sampleSurvey: Survey = {
  id: 'sample-survey',
  metadata: {
    title: 'Sample Survey',
    description: 'Understanding preferences for business wireless add-on services',
    objectives: [
      'Evaluate interest in new add-on service offerings',
      'Understand pricing sensitivity for bundled services',
      'Identify key drivers and barriers to adoption',
      'Assess competitive positioning against T-Mobile and AT&T'
    ],
    audience: {
      description: 'Business decision makers with company wireless plans',
      sampleSize: 500,
      quotas: [
        'Verizon customers: 250',
        'Non-Verizon customers: 250'
      ]
    },
    version: 1
  },
  sections: [
    {
      id: 'screener',
      title: 'Screener',
      description: 'Qualification questions',
      questions: [
        {
          id: 'S1',
          type: 'single_choice',
          text: 'Are you involved in making decisions about your company\'s wireless service provider or plan?',
          required: true,
          options: [
            { id: 1, label: 'Yes, I am the primary decision maker', value: 'primary' },
            { id: 2, label: 'Yes, I am involved in the decision', value: 'involved' },
            { id: 3, label: 'No, I am not involved in these decisions', value: 'not_involved' }
          ],
          logic: [
            {
              action: 'terminate',
              when: {
                operator: 'eq',
                left: 'S1',
                right: 'not_involved'
              },
              destination: 'TERM1'
            }
          ],
          defaultNextQuestion: 'S11',
          notes: ['TERMINATE if not involved in decision making']
        },
        {
          id: 'S11',
          type: 'numeric',
          text: 'How many wireless lines does your company currently have?',
          required: true,
          validation: [
            { type: 'required', message: 'Please enter number of lines' },
            { type: 'min', value: 1, message: 'Must be at least 1' }
          ],
          logic: [
            {
              action: 'terminate',
              when: {
                operator: 'lt',
                left: 'S11',
                right: 10
              },
              destination: 'TERM1'
            }
          ],
          defaultNextQuestion: 'CUSTOMER_TYPE',
          notes: ['Used for calculating percentage in Q7', 'TERMINATE if less than 10 lines (too small for business study)']
        },
        {
          id: 'CUSTOMER_TYPE',
          type: 'single_choice',
          text: 'Which wireless carrier does your company primarily use?',
          required: true,
          options: [
            { id: 1, label: 'Verizon', value: 'verizon' },
            { id: 2, label: 'T-Mobile', value: 'tmobile' },
            { id: 3, label: 'AT&T', value: 'att' },
            { id: 4, label: 'Other', value: 'other' }
          ],
          logic: [
            {
              action: 'terminate',
              when: {
                operator: 'eq',
                left: 'CUSTOMER_TYPE',
                right: 'other'
              },
              destination: 'TERM1'
            }
          ],
          defaultNextQuestion: 'CONCEPT_ASSIGNMENT',
          notes: ['Used for Q6 logic', 'TERMINATE if carrier is "Other" (not target audience)']
        },
        {
          id: 'CONCEPT_ASSIGNMENT',
          type: 'introduction',
          text: 'Thank you. In this survey, we will show you information about potential add-on services for business wireless plans. Please review the concepts carefully.',
          required: false,
          defaultNextQuestion: 'Q4',
          metadata: {
            conceptAssigned: 'RANDOM'
          },
          notes: ['Randomly assign concept: 1=Satellite Connectivity, 2=Enhanced Network, 3=Enhanced Network Plus']
        }
      ]
    },
    {
      id: 'concept-evaluation',
      title: 'Concept Evaluation',
      description: 'Service selection and evaluation',
      questions: [
        {
          id: 'Q4',
          type: 'multiple_choice',
          text: 'Based on the concept you just reviewed, which of the following services would you be interested in adding to your business wireless plan? Please select all that apply.',
          required: true,
          options: [
            { id: 1, label: 'Satellite Connectivity - Stay connected even without cell coverage ($15/month per line)', value: 'satellite' },
            { id: 2, label: 'Enhanced Network - Priority data access during peak times ($10/month per line)', value: 'enhanced_network' },
            { id: 3, label: 'Enhanced Network Plus - Priority data + 50GB mobile hotspot ($20/month per line)', value: 'enhanced_plus' },
            { id: 4, label: 'Mobile Security Suite - Advanced threat protection and VPN ($8/month per line)', value: 'security' },
            { id: 5, label: 'Device Protection Plus - Same-day replacement and tech support ($12/month per line)', value: 'protection' },
            { id: 6, label: 'International Business Plan - Unlimited calling/data in 200+ countries ($25/month per line)', value: 'international' },
            { id: 7, label: 'None of the above', value: 'none' }
          ],
          logic: [
            {
              action: 'skip',
              when: {
                operator: 'and',
                left: '',
                right: '',
                conditions: [
                  {
                    operator: 'in',
                    left: 'Q4',
                    right: ['none']
                  },
                  {
                    operator: 'eq',
                    left: 'Q4.length',
                    right: 1
                  }
                ]
              },
              destination: 'Q8'
            }
          ],
          defaultNextQuestion: 'Q5',
          metadata: {
            randomize: true,
            anchor: [7]
          },
          notes: [
            'Multiple selection allowed',
            'Option 7 (None) should be anchored at bottom',
            'Services shown depend on CONCEPT_ASSIGNMENT',
            'Sum of selected prices used in Q5',
            'SKIP to Q8 if ONLY "None of the above" selected'
          ]
        },
        {
          id: 'Q5',
          type: 'single_choice',
          text: 'How likely would you be to add these additional services for $[INSERT Q4.SUM]/month? Select one.',
          required: true,
          options: [
            { id: 1, label: 'Definitely would', value: 'definitely_would' },
            { id: 2, label: 'Probably would', value: 'probably_would' },
            { id: 3, label: 'Might or might not', value: 'might' },
            { id: 4, label: 'Probably would not', value: 'probably_not' },
            { id: 5, label: 'Definitely would not', value: 'definitely_not' }
          ],
          logic: [
            {
              action: 'skip',
              when: {
                operator: 'eq',
                left: 'Q5',
                right: 'definitely_not'
              },
              destination: 'Q8'
            }
          ],
          defaultNextQuestion: 'Q5a',
          metadata: {
            piping: ['Q4.SUM']
          },
          notes: ['Price shown is sum of services selected in Q4', 'SKIP to Q8 if "Definitely would not"']
        },
        {
          id: 'Q5a',
          type: 'matrix',
          text: 'And how likely would you be to add these services if available from the following carriers? Select one for each.',
          required: true,
          matrixRows: [
            { id: 'verizon', label: 'Verizon' },
            { id: 'tmobile', label: 'T-Mobile' },
            { id: 'att', label: 'AT&T' }
          ],
          matrixColumns: [
            { id: 1, label: 'Definitely would', value: 'definitely_would' },
            { id: 2, label: 'Probably would', value: 'probably_would' },
            { id: 3, label: 'Might or might not', value: 'might' },
            { id: 4, label: 'Probably would not', value: 'probably_not' },
            { id: 5, label: 'Definitely would not', value: 'definitely_not' }
          ],
          validation: [
            { type: 'required', message: 'Please answer all rows' }
          ],
          defaultNextQuestion: 'Q6',
          metadata: {
            requireAllRows: true
          },
          notes: ['Progressive grid/matrix question', 'One response per row required']
        },
        {
          id: 'Q6',
          type: 'single_choice',
          text: 'These services you just saw are only available through Verizon\'s Business Unlimited Wireless plan. If the plan you are on doesn\'t qualify, which of the following actions would you take?',
          required: true,
          options: [
            { id: 1, label: 'I would keep my existing plan and forgo these add-on features', value: 'keep_plan' },
            { id: 2, label: 'I would consider upgrading to Verizon\'s Business Unlimited Wireless to take advantage of these add-on features', value: 'upgrade_plan' }
          ],
          logic: [
            {
              action: 'show',
              when: {
                operator: 'eq',
                left: 'CUSTOMER_TYPE',
                right: 'verizon'
              }
            }
          ],
          defaultNextQuestion: 'Q7',
          notes: ['Only shown to Verizon customers', 'ASK IF CUSTOMER_TYPE=VERIZON CUSTOMER']
        },
        {
          id: 'Q7',
          type: 'numeric',
          text: 'You indicated that you would sign up for [INSERT CONCEPT NAME]. What % of your [INSERT S11 RESPONSE] lines would you add this to?',
          required: true,
          validation: [
            { type: 'required', message: 'Please enter a percentage' },
            { type: 'min', value: 0, message: 'Must be 0 or greater' },
            { type: 'max', value: 100, message: 'Cannot exceed 100%' }
          ],
          logic: [
            {
              action: 'show',
              when: {
                operator: 'or',
                left: '',
                right: '',
                conditions: [
                  {
                    operator: 'and',
                    left: 'CONCEPT_ASSIGNMENT',
                    right: '1',
                    conditions: [
                      {
                        operator: 'in',
                        left: 'Q4',
                        right: ['satellite']
                      }
                    ]
                  },
                  {
                    operator: 'and',
                    left: 'CONCEPT_ASSIGNMENT',
                    right: '2',
                    conditions: [
                      {
                        operator: 'in',
                        left: 'Q4',
                        right: ['enhanced_network']
                      }
                    ]
                  },
                  {
                    operator: 'and',
                    left: 'CONCEPT_ASSIGNMENT',
                    right: '3',
                    conditions: [
                      {
                        operator: 'in',
                        left: 'Q4',
                        right: ['enhanced_plus']
                      }
                    ]
                  }
                ]
              }
            }
          ],
          defaultNextQuestion: 'Q8',
          metadata: {
            piping: ['CONCEPT_ASSIGNMENT', 'S11']
          },
          notes: [
            'ASK IF (CONCEPT 1 AND Satellite selected) OR (CONCEPT 2 AND Enhanced Network selected) OR (CONCEPT 3 AND Enhanced Network Plus selected)',
            'Pipes in concept name and number of lines',
            'Must not exceed 100%'
          ]
        },
        {
          id: 'Q8',
          type: 'multiple_choice',
          text: 'Earlier, you did not select [INSERT CONCEPT NAME]. Please indicate the reasons for not selecting this service. Select all that apply.',
          required: true,
          options: [
            { id: 1, label: 'I don\'t have a need for this add-on feature', value: 'no_need' },
            { id: 2, label: 'It\'s too expensive', value: 'too_expensive' },
            { id: 3, label: 'I already have other services that address this need', value: 'have_alternative' },
            { id: 4, label: 'I did not notice this add-on feature', value: 'didnt_notice' }
          ],
          logic: [
            {
              action: 'show',
              when: {
                operator: 'or',
                left: '',
                right: '',
                conditions: [
                  {
                    operator: 'and',
                    left: 'CONCEPT_ASSIGNMENT',
                    right: '1',
                    conditions: [
                      {
                        operator: 'notIn',
                        left: 'Q4',
                        right: ['satellite']
                      }
                    ]
                  },
                  {
                    operator: 'and',
                    left: 'CONCEPT_ASSIGNMENT',
                    right: '2',
                    conditions: [
                      {
                        operator: 'notIn',
                        left: 'Q4',
                        right: ['enhanced_network']
                      }
                    ]
                  },
                  {
                    operator: 'and',
                    left: 'CONCEPT_ASSIGNMENT',
                    right: '3',
                    conditions: [
                      {
                        operator: 'notIn',
                        left: 'Q4',
                        right: ['enhanced_plus']
                      }
                    ]
                  }
                ]
              }
            }
          ],
          defaultNextQuestion: 'THANK1',
          metadata: {
            piping: ['CONCEPT_ASSIGNMENT']
          },
          notes: [
            'ASK IF (CONCEPT 1 AND Satellite NOT selected) OR (CONCEPT 2 AND Enhanced Network NOT selected) OR (CONCEPT 3 AND Enhanced Network Plus NOT selected)',
            'Multiple selection allowed',
            'Pipes in concept name'
          ]
        }
      ]
    },
    {
      id: 'termination',
      title: 'End Screens',
      description: 'Survey completion and termination screens',
      questions: [
        {
          id: 'TERM1',
          type: 'introduction',
          text: 'Thank you for your interest in this survey. Unfortunately, you do not meet the qualification criteria for this particular study. We appreciate your time.',
          required: false,
          notes: ['Termination screen for disqualified respondents']
        },
        {
          id: 'THANK1',
          type: 'introduction',
          text: 'Thank you for completing our survey! Your responses have been recorded. We appreciate your time and feedback.',
          required: false,
          notes: ['Thank you screen for completed surveys']
        }
      ]
    }
  ],
  settings: {
    allowBack: true,
    showProgress: true,
    autoSave: true,
    timeLimit: 600,
    showTimer: true
  }
};
