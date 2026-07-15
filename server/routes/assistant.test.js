const assert = require('assert');
const { buildSuggestion } = require('./assistant');

const jobs = [
  {
    title: 'Build a landing page',
    description: 'Need a modern marketing website for a local coffee shop with a booking form and SEO copy.',
    budget: 1200,
    postedBy: { username: 'Mina' },
  },
  {
    title: 'Create a mobile app UI',
    description: 'Design a clean mobile app interface for a fitness tracker with onboarding and dashboard flows.',
    budget: 2500,
    postedBy: { username: 'Alex' },
  },
  {
    title: 'Set up a simple automation workflow',
    description: 'Automate invoice reminders and follow-up emails for a small consultancy.',
    budget: 800,
    postedBy: { username: 'Jules' },
  },
];

for (const job of jobs) {
  const suggestion = buildSuggestion({ job, freelancer: { skills: ['React', 'UI/UX'] } });
  assert.ok(suggestion.quote >= 40, `${job.title}: quote should be at least 40`);
  assert.ok(suggestion.deliveryTime >= 3, `${job.title}: timeline should be at least 3 days`);
  assert.ok(suggestion.proposalText.includes(job.title.toLowerCase()), `${job.title}: proposal should mention the job title`);
  console.log(`${job.title} -> $${suggestion.quote} / ${suggestion.deliveryTime} days`);
}
