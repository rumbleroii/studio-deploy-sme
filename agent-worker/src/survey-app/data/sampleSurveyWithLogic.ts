import { Survey } from '../types/survey';

/**
 * Sample survey with logic conditions to demonstrate interactive behavior
 */
export const sampleSurveyWithLogic: Survey = {
  id: 'demo-survey-001',
  metadata: {
    title: 'Customer Satisfaction Survey',
    description: 'Help us understand your experience with our product',
    objectives: [
      'Measure overall customer satisfaction',
      'Identify areas for improvement',
      'Understand feature usage patterns'
    ],
    audience: {
      description: 'Current customers who have used the product for at least 30 days',
      sampleSize: 500,
      quotas: ['50% existing users', '50% new users']
    },
    version: 1
  },
  settings: {
    allowBack: true,
    showProgress: true,
    autoSave: true
  },
  sections: [
    {
      id: 'SEC1',
      title: 'General Information',
      description: 'Tell us about yourself',
      questions: [
        {
          id: 'Q1',
          type: 'single_choice',
          text: 'Are you a current user of our product?',
          required: true,
          options: [
            { id: 1, label: 'Yes', value: 'yes' },
            { id: 2, label: 'No', value: 'no' }
          ],
          logic: [
            {
              action: 'show',
              when: {
                operator: 'eq',
                left: 'Q1',
                right: 'yes'
              },
              destination: 'Q2'
            },
            {
              action: 'terminate',
              when: {
                operator: 'eq',
                left: 'Q1',
                right: 'no'
              }
            }
          ],
          notes: ['This is a screener question', 'Non-users will be terminated']
        },
        {
          id: 'Q2',
          type: 'single_choice',
          text: 'How long have you been using our product?',
          required: true,
          options: [
            { id: 1, label: 'Less than 1 month', value: '<1month' },
            { id: 2, label: '1-3 months', value: '1-3months' },
            { id: 3, label: '3-6 months', value: '3-6months' },
            { id: 4, label: 'More than 6 months', value: '>6months' }
          ],
          logic: [
            {
              action: 'show',
              when: {
                operator: 'eq',
                left: 'Q2',
                right: '>6months'
              },
              destination: 'Q3'
            }
          ],
          notes: ['Only shown if user answered "Yes" to Q1']
        },
        {
          id: 'Q3',
          type: 'text',
          text: 'As a long-term user, what keeps you coming back?',
          required: false,
          notes: ['Only shown to users with >6 months experience']
        }
      ]
    },
    {
      id: 'SEC2',
      title: 'Product Satisfaction',
      description: 'Rate your experience',
      questions: [
        {
          id: 'Q4',
          type: 'rating',
          text: 'How satisfied are you with our product overall?',
          description: 'Rate from 1 (Very Dissatisfied) to 5 (Very Satisfied)',
          required: true,
          options: [
            { id: 1, label: '1 - Very Dissatisfied', value: 1 },
            { id: 2, label: '2 - Dissatisfied', value: 2 },
            { id: 3, label: '3 - Neutral', value: 3 },
            { id: 4, label: '4 - Satisfied', value: 4 },
            { id: 5, label: '5 - Very Satisfied', value: 5 }
          ],
          logic: [
            {
              action: 'show',
              when: {
                operator: 'lte',
                left: 'Q4',
                right: 2
              },
              destination: 'Q5'
            }
          ]
        },
        {
          id: 'Q5',
          type: 'text',
          text: 'What could we do to improve your experience?',
          description: 'Please be specific',
          required: true,
          notes: ['Only shown to dissatisfied users (rating ≤ 2)']
        },
        {
          id: 'Q6',
          type: 'multiple_choice',
          text: 'Which features do you use most frequently?',
          description: 'Select all that apply',
          required: true,
          options: [
            { id: 1, label: 'Dashboard', value: 'dashboard' },
            { id: 2, label: 'Reports', value: 'reports' },
            { id: 3, label: 'Analytics', value: 'analytics' },
            { id: 4, label: 'Export', value: 'export' },
            { id: 5, label: 'API Integration', value: 'api' }
          ],
          logic: [
            {
              action: 'show',
              when: {
                operator: 'contains',
                left: 'Q6',
                right: 'api'
              },
              destination: 'Q7'
            }
          ]
        },
        {
          id: 'Q7',
          type: 'single_choice',
          text: 'How would you rate our API documentation?',
          required: true,
          options: [
            { id: 1, label: 'Excellent', value: 'excellent' },
            { id: 2, label: 'Good', value: 'good' },
            { id: 3, label: 'Fair', value: 'fair' },
            { id: 4, label: 'Poor', value: 'poor' }
          ],
          notes: ['Only shown if user selected "API Integration" in Q6']
        }
      ]
    },
    {
      id: 'SEC3',
      title: 'Final Thoughts',
      questions: [
        {
          id: 'Q8',
          type: 'single_choice',
          text: 'Would you recommend our product to a friend or colleague?',
          required: true,
          options: [
            { id: 1, label: 'Definitely', value: 'definitely' },
            { id: 2, label: 'Probably', value: 'probably' },
            { id: 3, label: 'Not sure', value: 'notsure' },
            { id: 4, label: 'Probably not', value: 'probablynot' },
            { id: 5, label: 'Definitely not', value: 'definitelynot' }
          ]
        },
        {
          id: 'Q9',
          type: 'text',
          text: 'Any additional comments or suggestions?',
          required: false
        }
      ]
    }
  ]
};
