import type { ChatSchema } from '@chat-and-react/core';

/**
 * A multi-page demo schema that exercises all five input types and branching.
 * Page flow:
 *   intro → preferences → (student? → education | working → profession) → final
 */
export const demoSchema: ChatSchema = {
  'x-chat-version': '1',
  'x-chat-options': {
    userResumable: true,
    localStorage: true,
    autoComplete: false,
  },
  'x-chat-pages': [
    {
      id: 'intro',
      title: 'Welcome',
      questions: [
        {
          id: 'full_name',
          type: 'string',
          'x-chat-input': 'text',
          title: "What's your full name?",
          'x-chat-placeholder': 'Type your name…',
        },
        {
          id: 'bio',
          type: 'string',
          'x-chat-input': 'textarea',
          title: 'Tell us a little about yourself.',
          'x-chat-placeholder': 'A sentence or two…',
          'x-chat-condition': { ref: 'has_name' },
        },
      ],
      branching: [{ type: 'always', destination_id: 'preferences' }],
    },
    {
      id: 'preferences',
      title: 'Your Preferences',
      questions: [
        {
          id: 'contact_method',
          type: 'string',
          'x-chat-input': 'radio',
          title: 'How should we reach you?',
          enum: ['Email', 'Phone', 'SMS'],
        },
        {
          id: 'interests',
          type: 'array',
          'x-chat-input': 'checkbox',
          title: 'Which topics interest you? (select all that apply)',
          items: { enum: ['Technology', 'Science', 'Arts', 'Sports', 'Travel'] },
        },
        {
          id: 'country',
          type: 'string',
          'x-chat-input': 'dropdown',
          title: 'Which country are you based in?',
          enum: ['United Kingdom', 'United States', 'Canada', 'Australia', 'Other'],
        },
        {
          id: 'occupation',
          type: 'string',
          'x-chat-input': 'radio',
          title: 'What best describes your current status?',
          enum: ['Student', 'Working', 'Other'],
        },
      ],
      branching: [
        { type: 'if', form_element: 'occupation', value: 'Student', destination_id: 'education' },
        { type: 'if', form_element: 'occupation', value: 'Working', destination_id: 'profession' },
        { type: 'always', destination_id: 'final' },
      ],
    },
    {
      id: 'education',
      title: 'Education',
      questions: [
        {
          id: 'school_name',
          type: 'string',
          'x-chat-input': 'text',
          title: "What's the name of your school or university?",
          'x-chat-placeholder': 'e.g. Oxford University',
        },
        {
          id: 'study_level',
          type: 'string',
          'x-chat-input': 'dropdown',
          title: 'What level are you studying at?',
          enum: ['Secondary school', 'Undergraduate', 'Postgraduate', 'PhD', 'Other'],
        },
      ],
      branching: [{ type: 'always', destination_id: 'final' }],
    },
    {
      id: 'profession',
      title: 'Your Work',
      questions: [
        {
          id: 'job_title',
          type: 'string',
          'x-chat-input': 'text',
          title: "What's your job title?",
          'x-chat-placeholder': 'e.g. Software Engineer',
        },
        {
          id: 'industry',
          type: 'string',
          'x-chat-input': 'dropdown',
          title: 'Which industry do you work in?',
          enum: ['Technology', 'Finance', 'Healthcare', 'Education', 'Other'],
        },
      ],
      branching: [{ type: 'always', destination_id: 'final' }],
    },
    {
      id: 'final',
      title: 'Almost Done',
      questions: [
        {
          id: 'feedback',
          type: 'string',
          'x-chat-input': 'textarea',
          title: 'Any final comments or feedback for us?',
          'x-chat-placeholder': 'Optional — press Send to skip.',
        },
      ],
      branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
    },
  ],
  'x-chat-rules': {
    has_name: { '!!': [{ var: 'full_name' }] },
  },
};
