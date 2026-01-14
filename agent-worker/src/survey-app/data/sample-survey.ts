import { Survey } from '../types/survey';

/**
 * Sample Survey - Complete Reference Implementation
 *
 * 📚 PIPING EXAMPLES INDEX:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * TEXT PIPING (Insert dynamic values into question text):
 * Q5:  [INSERT Q4.SUM] - Calculate sum (e.g., "$45/month")
 * Q7:  [INSERT CONCEPT NAME] + [INSERT S11 RESPONSE] - Multiple piping
 * Q8:  [INSERT CONCEPT NAME] - Variable piping
 * Q8a: [INSERT CUSTOMER_TYPE LABEL] - Label piping (shows "Verizon" not "verizon")
 * Q8b: [INSERT Q4.COUNT] - Count piping (number of selections)
 * Q8c: [INSERT Q4a LABEL] - Multiple choice labels (comma-separated)
 * Q8d: [INSERT S11] - Raw value piping (exact number)
 *
 * CONDITIONAL OPTIONS (Show/hide options based on previous responses):
 * Q2:  showIf based on Q1 - Different currency options for different countries
 *      US respondents see USD, Canada sees CAD, UK sees GBP
 *
 * CONDITIONAL ROUTING/BRANCHING (Show different questions based on selection):
 * Q6→Q7/Q8: Complete "ASK IF" pattern - Source has skip logic, targets have show conditions
 *            Demonstrates BOTH source routing AND target show (critical for reliability)
 * Q8e-Q8g: Branching example - Select "Software" → Q8f shows, Select "Hardware" → Q8g shows
 *          Demonstrates A/B routing pattern based on option selection
 *
 * DYNAMIC OPTION PIPING (Generate options from previous responses):
 * Q10: pipeOptionsFrom Q9 (selected_options) - Options = what user selected
 * Q12: pipeOptionsFrom Q10 (selected_options) - Chain piping (Q9 → Q10 → Q12)
 *
 * DYNAMIC MATRIX ROW PIPING (Generate matrix rows from previous responses):
 * Q11: pipeRowsFrom Q10 (selected_options) - Rows = what user selected in Q10
 *      Supports chained piping: Q11 → Q10 → Q9
 *
 * Other features demonstrated:
 * - Randomization & Anchoring (Q4, Q4a)
 * - Exclusive Options (Q4)
 * - "Other (Please Specify)" (Q4a, Q9)
 * - Logic & Navigation (S1, Q4, Q6, Q7, Q8, Q8e-Q8g)
 * - Validation (S11, Q7)
 * - Matrix Questions (Q5a, Q11)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

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
              destination: 'TERMINATE'
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
              destination: 'TERMINATE'
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
              destination: 'TERMINATE'
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
          defaultNextQuestion: 'Q1',
          metadata: {
            conceptAssigned: 'RANDOM' // In real implementation, this would randomly assign 1, 2, or 3
          },
          notes: ['Randomly assign concept: 1=Satellite Connectivity, 2=Enhanced Network, 3=Enhanced Network Plus']
        },
        {
          id: 'Q1',
          type: 'single_choice',
          text: 'In which country is your company headquarters located?',
          required: true,
          options: [
            { id: 20, label: 'United States', value: 20 },
            { id: 4, label: 'Canada', value: 4 },
            { id: 19, label: 'United Kingdom', value: 19 }
          ],
          defaultNextQuestion: 'Q2',
          notes: [
            '✅ CONDITIONAL OPTIONS EXAMPLE',
            'This question determines which currency options appear in Q2',
            'Q2 uses showIf conditions to display USD, CAD, or GBP based on this answer'
          ]
        },
        {
          id: 'Q2',
          type: 'single_choice',
          text: "What is your organization's annual global revenue? Please provide your best estimate.",
          required: true,
          options: [
            // US OPTIONS - shown when Q1=20
            { id: 1, label: 'Less than $50 million USD', value: 'tier_1_usd', showIf: { operator: 'eq', left: 'Q1', right: 20 } },
            { id: 2, label: '$50 million to less than $250 million USD', value: 'tier_2_usd', showIf: { operator: 'eq', left: 'Q1', right: 20 } },
            { id: 3, label: '$250 million to less than $500 million USD', value: 'tier_3_usd', showIf: { operator: 'eq', left: 'Q1', right: 20 } },
            { id: 4, label: '$500 million to less than $1 billion USD', value: 'tier_4_usd', showIf: { operator: 'eq', left: 'Q1', right: 20 } },
            { id: 5, label: '$1 billion USD or more', value: 'tier_5_usd', showIf: { operator: 'eq', left: 'Q1', right: 20 } },

            // CANADA OPTIONS - shown when Q1=4
            { id: 11, label: 'Less than $70 million CAD', value: 'tier_1_cad', showIf: { operator: 'eq', left: 'Q1', right: 4 } },
            { id: 12, label: '$70 million to less than $348 million CAD', value: 'tier_2_cad', showIf: { operator: 'eq', left: 'Q1', right: 4 } },
            { id: 13, label: '$348 million to $695 million CAD', value: 'tier_3_cad', showIf: { operator: 'eq', left: 'Q1', right: 4 } },
            { id: 14, label: '$695 million to less than $1.4 billion CAD', value: 'tier_4_cad', showIf: { operator: 'eq', left: 'Q1', right: 4 } },
            { id: 15, label: '$1.4 billion CAD or more', value: 'tier_5_cad', showIf: { operator: 'eq', left: 'Q1', right: 4 } },

            // UK OPTIONS - shown when Q1=19
            { id: 21, label: 'Less than £37 million GBP', value: 'tier_1_gbp', showIf: { operator: 'eq', left: 'Q1', right: 19 } },
            { id: 22, label: '£37 million to less than £185 million GBP', value: 'tier_2_gbp', showIf: { operator: 'eq', left: 'Q1', right: 19 } },
            { id: 23, label: '£185 million to less than £370 million GBP', value: 'tier_3_gbp', showIf: { operator: 'eq', left: 'Q1', right: 19 } },
            { id: 24, label: '£370 million to less than £740 million GBP', value: 'tier_4_gbp', showIf: { operator: 'eq', left: 'Q1', right: 19 } },
            { id: 25, label: '£740 million GBP or more', value: 'tier_5_gbp', showIf: { operator: 'eq', left: 'Q1', right: 19 } }
          ],
          defaultNextQuestion: 'Q4',
          notes: [
            '✅ CONDITIONAL OPTIONS EXAMPLE',
            'All 15 options defined (5 USD + 5 CAD + 5 GBP)',
            'getQuestionOptions() automatically filters based on Q1 value',
            'US respondent (Q1=20) sees only 5 USD options',
            'Canada respondent (Q1=4) sees only 5 CAD options',
            'UK respondent (Q1=19) sees only 5 GBP options',
            '',
            'HOW IT WORKS:',
            '1. QuestionRenderer calls: getQuestionOptions(Q2, responses, allQuestions)',
            '2. Returns all 15 options',
            '3. filterOptions() evaluates each showIf condition',
            '4. Only options matching Q1 value pass through',
            '5. Result: Respondent sees only relevant currency options',
            '',
            '⚠️ WRONG: Combining currencies like "Less than $50M USD / $70M CAD / £37M GBP"',
            '✅ CORRECT: Separate options with showIf (this approach)'
          ]
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
            randomize: true,       // ✅ EXAMPLE: Randomize option order on load
            anchor: [7],           // ✅ EXAMPLE: Keep option 7 at bottom (array of option IDs)
            exclusiveOptions: [7]  // ✅ EXAMPLE: Option 7 deselects all others when selected
          },
          notes: [
            '✅ RANDOMIZATION EXAMPLE: Options 1-6 randomized, option 7 anchored at bottom',
            '✅ EXCLUSIVE OPTION EXAMPLE: Option 7 (None) deselects all others when selected',
            '✅ OTHER FEATURES: Combining randomize + anchor + exclusive in one question',
            'Multiple selection allowed',
            'Services shown depend on CONCEPT_ASSIGNMENT',
            'Sum of selected prices used in Q5 via piping',
            'SKIP to Q8 if ONLY "None of the above" selected'
          ]
        },
        {
          id: 'Q4a',
          type: 'multiple_choice',
          text: 'Which communication tools does your company use? Please select all that apply.',
          required: true,
          options: [
            { id: 1, label: 'Slack', value: 'slack' },
            { id: 2, label: 'Microsoft Teams', value: 'teams' },
            { id: 3, label: 'Zoom', value: 'zoom' },
            { id: 4, label: 'Google Meet', value: 'google_meet' },
            { id: 5, label: 'Webex', value: 'webex' },
            { id: 99, label: 'Other (please specify)', value: 'other' }
          ],
          defaultNextQuestion: 'Q5',
          metadata: {
            randomize: true,       // ✅ RANDOMIZATION WITH ANCHOR EXAMPLE: Randomize options 1-5
            anchor: [99],          // ✅ Keep "Other" option at bottom
            hasOtherOption: true,
            otherOptionId: 99,
            otherInputRequired: true,
            otherInputPlaceholder: 'Please specify the tool name',
            otherInputMaxLength: 100
          },
          notes: [
            '✅ RANDOMIZATION + ANCHOR EXAMPLE: Options 1-5 randomized, option 99 anchored at bottom',
            '✅ "OTHER (PLEASE SPECIFY)" EXAMPLE: Text input validation when option 99 selected',
            'When "Other" is selected, text input appears and is required',
            'User must enter text before proceeding to next question',
            'Shows randomization + anchor + other option all working together'
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
          notes: [
            '✅ SUM/CALCULATION PIPING EXAMPLE: Shows calculated total (e.g., "$45/month")',
            'Uses [INSERT Q4.SUM] to calculate sum of selected service prices',
            'SKIP to Q8 if "Definitely would not"'
          ]
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
          defaultNextQuestion: 'Q6',
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
            },
            {
              action: 'skip',
              when: {
                operator: 'or',
                conditions: [
                  {
                    operator: 'in',
                    left: 'Q4',
                    right: ['satellite']
                  },
                  {
                    operator: 'in',
                    left: 'Q4',
                    right: ['enhanced_network']
                  },
                  {
                    operator: 'in',
                    left: 'Q4',
                    right: ['enhanced_plus']
                  }
                ]
              },
              destination: 'Q7'
            }
          ],
          defaultNextQuestion: 'Q8',
          notes: [
            'Only shown to Verizon customers - ASK IF CUSTOMER_TYPE=VERIZON',
            '✅ ROUTING LOGIC EXAMPLE: Routes to Q7 if selected services, Q8 if not',
            'Demonstrates BOTH source routing (this question) AND target show conditions (Q7/Q8)'
          ]
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
                conditions: [
                  {
                    operator: 'in',
                    left: 'Q4',
                    right: ['satellite']
                  },
                  {
                    operator: 'in',
                    left: 'Q4',
                    right: ['enhanced_network']
                  },
                  {
                    operator: 'in',
                    left: 'Q4',
                    right: ['enhanced_plus']
                  }
                ]
              }
            }
          ],
          defaultNextQuestion: 'Q8a',
          metadata: {
            piping: ['CONCEPT_ASSIGNMENT', 'S11']
          },
          notes: [
            '✅ MULTIPLE PIPING EXAMPLE: Combines variable + numeric piping in one question',
            'Uses [INSERT CONCEPT NAME] (shows "Satellite Connectivity") and [INSERT S11 RESPONSE] (shows number like "50")',
            'ASK IF user selected ANY concept service in Q4 (satellite OR enhanced_network OR enhanced_plus)',
            'Must not exceed 100%',
            'Both Q7 and Q8 paths converge at Q8a'
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
                operator: 'and',
                conditions: [
                  {
                    operator: 'notIn',
                    left: 'Q4',
                    right: ['satellite']
                  },
                  {
                    operator: 'notIn',
                    left: 'Q4',
                    right: ['enhanced_network']
                  },
                  {
                    operator: 'notIn',
                    left: 'Q4',
                    right: ['enhanced_plus']
                  }
                ]
              }
            }
          ],
          defaultNextQuestion: 'Q8a',
          metadata: {
            piping: ['CONCEPT_ASSIGNMENT']
          },
          notes: [
            '✅ VARIABLE PIPING EXAMPLE: Shows dynamic text based on concept assignment',
            'Uses [INSERT CONCEPT NAME] pattern',
            'ASK IF user did NOT select ANY concept services in Q4 (none of: satellite, enhanced_network, enhanced_plus)',
            'Mutually exclusive with Q7 - either Q7 or Q8 will show, not both',
            'Multiple selection allowed'
          ]
        },
        {
          id: 'Q8a',
          type: 'single_choice',
          text: 'You indicated your company primarily uses [INSERT CUSTOMER_TYPE LABEL]. How satisfied are you with their service?',
          required: true,
          options: [
            { id: 1, label: 'Very satisfied', value: 'very_satisfied' },
            { id: 2, label: 'Somewhat satisfied', value: 'somewhat_satisfied' },
            { id: 3, label: 'Neither satisfied nor dissatisfied', value: 'neutral' },
            { id: 4, label: 'Somewhat dissatisfied', value: 'somewhat_dissatisfied' },
            { id: 5, label: 'Very dissatisfied', value: 'very_dissatisfied' }
          ],
          defaultNextQuestion: 'Q8b',
          metadata: {
            piping: ['CUSTOMER_TYPE']
          },
          notes: [
            '✅ LABEL PIPING EXAMPLE: Shows carrier name (e.g., "Verizon") instead of value (e.g., "verizon")',
            'Pipes in carrier name from CUSTOMER_TYPE question',
            'Uses [INSERT CUSTOMER_TYPE LABEL] pattern'
          ]
        },
        {
          id: 'Q8b',
          type: 'text',
          text: 'You selected [INSERT Q4.COUNT] services in total. Which one is most important to your business?',
          required: true,
          defaultNextQuestion: 'Q8c',
          metadata: {
            inputType: 'textarea',
            maxLength: 500,
            piping: ['Q4.COUNT']
          },
          notes: [
            '✅ COUNT PIPING EXAMPLE: Shows number of items selected (e.g., "You selected 3 services...")',
            'Uses [INSERT Q4.COUNT] pattern',
            'Dynamically calculates count from multiple choice response'
          ]
        },
        {
          id: 'Q8c',
          type: 'single_choice',
          text: 'You mentioned you use [INSERT Q4a LABEL] for communication. How critical is this tool to your daily operations?',
          required: true,
          options: [
            { id: 1, label: 'Absolutely critical - cannot function without it', value: 'critical' },
            { id: 2, label: 'Very important - significant impact if unavailable', value: 'very_important' },
            { id: 3, label: 'Moderately important - some impact if unavailable', value: 'moderately_important' },
            { id: 4, label: 'Slightly important - minimal impact', value: 'slightly_important' },
            { id: 5, label: 'Not important', value: 'not_important' }
          ],
          defaultNextQuestion: 'Q8d',
          metadata: {
            piping: ['Q4a']
          },
          notes: [
            '✅ MULTIPLE CHOICE LABEL PIPING EXAMPLE: Shows selected tool names (e.g., "Slack, Teams")',
            'Pipes in selected communication tools from Q4a',
            'Uses [INSERT Q4a LABEL] to show comma-separated list of labels',
            'If multiple selected: "Slack, Microsoft Teams, Zoom"'
          ]
        },
        {
          id: 'Q8d',
          type: 'numeric',
          text: 'Your company has [INSERT S11] wireless lines. Approximately how many employees use these lines daily?',
          required: true,
          validation: [
            { type: 'required', message: 'Please enter a number' },
            { type: 'min', value: 1, message: 'Must be at least 1' }
          ],
          defaultNextQuestion: 'Q9',
          metadata: {
            inputType: 'number',
            min: 1,
            piping: ['S11']
          },
          notes: [
            '✅ RAW VALUE PIPING EXAMPLE: Shows exact numeric response (e.g., "Your company has 50 wireless lines")',
            'Uses [INSERT S11] pattern (no LABEL keyword)',
            'Pipes in numeric response from S11 question',
            'Shows raw value, not option label'
          ]
        },
        {
          id: 'Q8e',
          type: 'single_choice',
          text: 'Which type of technology assessment are you most interested in?',
          required: true,
          options: [
            { id: 1, label: 'Software and cloud services assessment', value: 'software' },
            { id: 2, label: 'Hardware and infrastructure assessment', value: 'hardware' }
          ],
          defaultNextQuestion: 'Q8f',
          notes: [
            '✅ BRANCHING/ROUTING EXAMPLE: This question branches to different follow-ups',
            'If user selects "Software" (software) → shows Q8f',
            'If user selects "Hardware" (hardware) → shows Q8g',
            'Demonstrates conditional routing based on option selection',
            'Both Q8f and Q8g eventually route to Q9'
          ]
        },
        {
          id: 'Q8f',
          type: 'text',
          text: 'What specific software or cloud services would you like to assess?',
          required: true,
          logic: [
            {
              action: 'show',
              when: {
                operator: 'eq',
                left: 'Q8e',
                right: 'software'
              }
            }
          ],
          defaultNextQuestion: 'Q9',
          metadata: {
            inputType: 'textarea',
            maxLength: 500,
            placeholder: 'Describe the software/cloud services you want to evaluate...'
          },
          notes: [
            '✅ CONDITIONAL DISPLAY EXAMPLE: Only shown if Q8e = "software"',
            'Uses logic.action = "show" with operator "eq"',
            'If condition is false, this question is skipped automatically',
            'Routes to Q9 after completion'
          ]
        },
        {
          id: 'Q8g',
          type: 'text',
          text: 'What specific hardware or infrastructure would you like to assess?',
          required: true,
          logic: [
            {
              action: 'show',
              when: {
                operator: 'eq',
                left: 'Q8e',
                right: 'hardware'
              }
            }
          ],
          defaultNextQuestion: 'Q9',
          metadata: {
            inputType: 'textarea',
            maxLength: 500,
            placeholder: 'Describe the hardware/infrastructure you want to evaluate...'
          },
          notes: [
            '✅ CONDITIONAL DISPLAY EXAMPLE: Only shown if Q8e = "hardware"',
            'Uses logic.action = "show" with operator "eq"',
            'If condition is false, this question is skipped automatically',
            'Routes to Q9 after completion',
            'Together with Q8f, demonstrates A/B branching pattern'
          ]
        },
        {
          id: 'Q9',
          type: 'multiple_choice',
          text: 'Which of the following technology tools does your IT department currently use? Select all that apply.',
          required: true,
          options: [
            { id: 1, label: 'Cloud Storage (Dropbox, Google Drive, OneDrive)', value: 'cloud_storage' },
            { id: 2, label: 'Project Management (Asana, Trello, Monday.com)', value: 'project_mgmt' },
            { id: 3, label: 'CRM Software (Salesforce, HubSpot)', value: 'crm' },
            { id: 4, label: 'Analytics Platform (Tableau, Power BI)', value: 'analytics' },
            { id: 5, label: 'Cybersecurity Tools (Firewall, VPN, Antivirus)', value: 'cybersecurity' },
            { id: 6, label: 'None of the above', value: 'none' },
            { id: 99, label: 'Other (please specify)', value: 'other' }
          ],
          defaultNextQuestion: 'Q10',
          metadata: {
            randomize: true,
            anchor: [6, 99],
            exclusiveOptions: [6],
            hasOtherOption: true,
            otherOptionId: 99,
            otherInputRequired: true,
            otherInputPlaceholder: 'Please specify the technology tool',
            otherInputMaxLength: 100
          },
          notes: [
            '⚙️ SOURCE QUESTION for dynamic option piping',
            'Q10 will dynamically generate options based on selections here',
            'Combines multiple features: randomization, anchoring, exclusive option, other option',
            'This is the "source question" that Q10 will reference'
          ]
        },
        {
          id: 'Q10',
          type: 'multiple_choice',
          text: 'Of the tools you selected, which ones would you recommend to other companies? Select all that apply.',
          required: true,
          options: [],
          defaultNextQuestion: 'Q11',
          metadata: {
            minSelections: 1,
            pipeOptionsFrom: {
              sourceQuestionId: 'Q9',
              generateFrom: 'selected_options',
              excludeValues: ['none', 'other'],
              includeOtherText: true
            }
          },
          notes: [
            '✅ DYNAMIC OPTION PIPING EXAMPLE #1: Options generated from Q9 selected values',
            'options: [] stays EMPTY - options are generated at runtime',
            'pipeOptionsFrom.sourceQuestionId: "Q9" - Get options from Q9',
            'pipeOptionsFrom.generateFrom: "selected_options" - Only show what user selected in Q9',
            'pipeOptionsFrom.excludeValues: ["none", "other"] - Filter out "None" and "Other" options',
            'pipeOptionsFrom.includeOtherText: true - Include user-typed text from Q9 "Other" input',
            'Example: If user selected Cloud Storage, CRM, and typed "Slack" in Other → Q10 shows those 3 as options',
            'This is different from text piping - we\'re generating the OPTIONS themselves, not inserting text'
          ]
        },
        {
          id: 'Q11',
          type: 'matrix',
          text: 'For each tool you recommended, please rate its performance in the following areas:',
          required: true,
          matrixRows: [], // ⚠️ KEEP EMPTY - rows generated at runtime
          matrixColumns: [
            { id: 1, label: 'Poor', value: 'poor' },
            { id: 2, label: 'Fair', value: 'fair' },
            { id: 3, label: 'Good', value: 'good' },
            { id: 4, label: 'Very Good', value: 'very_good' },
            { id: 5, label: 'Excellent', value: 'excellent' }
          ],
          defaultNextQuestion: 'Q12',
          metadata: {
            pipeRowsFrom: {
              sourceQuestionId: 'Q10',
              generateFrom: 'selected_options',
              excludeValues: [],
              includeOtherText: true
            },
            requireAllRows: true
          },
          notes: [
            '✅ DYNAMIC MATRIX ROW PIPING EXAMPLE: Rows generated from Q10 selections',
            'matrixRows: [] stays EMPTY - rows are generated at runtime',
            'pipeRowsFrom.sourceQuestionId: "Q10" - Get rows from Q10 selections',
            'pipeRowsFrom.generateFrom: "selected_options" - Only show what user selected in Q10',
            'Each tool from Q10 becomes a row in this matrix',
            'Supports chained piping: Q11 → Q10 → Q9 (Q10 itself has dynamic options from Q9)',
            'Example: User selected 3 tools in Q10 → Q11 shows 3 rows (one per tool)',
            'This demonstrates DYNAMIC MATRIX ROWS with chained source resolution'
          ]
        },
        {
          id: 'Q12',
          type: 'single_choice',
          text: 'Of the tools you would recommend, which ONE is the most critical for business operations?',
          required: true,
          options: [],
          defaultNextQuestion: 'COMPLETE',
          metadata: {
            pipeOptionsFrom: {
              sourceQuestionId: 'Q10',
              generateFrom: 'selected_options',
              excludeValues: [],
              includeOtherText: false
            }
          },
          notes: [
            '✅ DYNAMIC OPTION PIPING EXAMPLE #2: Chained piping (Q9 → Q10 → Q12)',
            'options: [] stays EMPTY - options are generated at runtime',
            'pipeOptionsFrom.sourceQuestionId: "Q10" - Get options from Q10 (not Q9!)',
            'pipeOptionsFrom.generateFrom: "selected_options" - Only show what user selected in Q10',
            'pipeOptionsFrom.excludeValues: [] - No exclusions this time',
            'pipeOptionsFrom.includeOtherText: false - Don\'t include other text (already filtered in Q10)',
            'Example: User selected 5 tools in Q9 → recommended 3 in Q10 → picks 1 most critical in Q12',
            'This demonstrates CHAINED dynamic option piping across multiple questions'
          ]
        }
      ]
    }
  ],
  settings: {
    allowBack: true,
    showProgress: true,
    autoSave: true,
    timeLimit: 600, // 10 minutes in seconds
    showTimer: true
  }
};

// Run schema validation in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  import('../lib/schema-validator').then(({ validateSurveySchema, printValidationWarnings }) => {
    const warnings = validateSurveySchema(sampleSurvey);
    if (warnings.length > 0) {
      printValidationWarnings(warnings);
    }
  });
}