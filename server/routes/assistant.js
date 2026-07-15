const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const scoreComplexity = (text = '') => {
  const lower = text.toLowerCase();
  const keywords = ['web', 'app', 'mobile', 'api', 'automation', 'design', 'marketing', 'seo', 'data', 'analytics'];
  const matches = keywords.filter((keyword) => lower.includes(keyword));
  return matches.length;
};

const buildSuggestion = ({ job, freelancer }) => {
  const budget = Number(job.budget || 0);
  const complexity = scoreComplexity(job.description || '');
  const multiplier = complexity >= 3 ? 0.72 : complexity >= 1 ? 0.64 : 0.58;
  const quote = Math.max(40, Math.round(budget * multiplier));
  const timeline = Math.max(3, Math.min(14, Math.round((budget / 200) + 3 + Math.max(0, complexity - 1))));
  const skills = (freelancer?.skills || []).slice(0, 3).join(', ') || 'web development and design';
  const name = freelancer?.username || 'there';
  const poster = job.postedBy?.username || 'there';

  const proposalText = [
    `Hi ${poster},`,
    `\nI came across your job posting for "${job.title}" and I'm confident I can deliver exactly what you're looking for.`,
    `\n\nWith hands-on experience in ${skills}, I've handled similar projects and know how to keep things efficient, communicative, and on time.`,
    `\nHere's my approach: I'll start by fully understanding your requirements, then work iteratively to deliver a polished result within ${timeline} days.`,
    `\n\nBased on the project scope, I'd like to propose a budget of $${quote}. I'm open to discussing this if your needs differ.`,
    `\n\nLooking forward to working together!`,
    `\n\n— ${name}`,
  ].join('');

  return { quote, deliveryTime: timeline, proposalText };
};

router.post('/proposal', async (req, res) => {
  try {
    const { job, freelancer } = req.body;
    if (!job?.title || !job?.description) {
      return res.status(400).json({ message: 'A job title and description are required.' });
    }

    const suggestion = buildSuggestion({ job, freelancer });
    res.json(suggestion);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to generate proposal suggestion.' });
  }
});

module.exports = {
  buildSuggestion,
  router,
};
