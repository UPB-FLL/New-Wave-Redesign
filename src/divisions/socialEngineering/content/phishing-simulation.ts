import type { DivisionServiceContent } from '../types';

export const phishingSimulation: DivisionServiceContent = {
  slug: 'phishing-simulation',
  navLabel: 'Phishing simulation',
  metaTitle: 'Phishing simulation services | New Wave: Social Engineering',
  metaDescription:
    'Phishing simulation services for Fort Lauderdale teams: realistic email, SMS, and QR lures, instant coaching, and report-rate tracking. Book a scoping call.',
  keywords:
    'phishing simulation services, phishing testing fort lauderdale, simulated phishing campaigns, phishing simulation south florida, employee phishing tests, smishing and qr code phishing simulation, phishing report rate',
  serviceType: 'Phishing simulation',
  icon: 'mail',
  kicker: 'Simulated phishing campaigns',
  headline: 'Phishing simulation that teaches your people to spot the hook',
  summary:
    'New Wave: Social Engineering runs authorized phishing simulation for organizations across Fort Lauderdale and South Florida. We send realistic email, text-message, and QR-code lures, turn every click into a short private lesson, and measure what matters most: how many people report a suspicious message, and how quickly.',
  cardSummary:
    'Email, SMS, and QR-code phishing simulations with an instant teachable moment, adaptive difficulty, and reporting built around report rate.',
  whatWeTest: [
    {
      title: 'Email lures and attachments',
      detail:
        'Credential prompts, invoice and payment requests, shared-document notices, and files that ask people to enable content. Lures reflect how your business actually communicates, and attachments are inert markers that record an open and nothing more.',
    },
    {
      title: 'Text-message and QR-code lures',
      detail:
        'Smishing and quishing move the conversation off managed email and onto a phone, where links are harder to inspect. SMS lures go only to work numbers you approve for testing.',
    },
    {
      title: 'Credential-harvest landing pages',
      detail:
        'Look-alike sign-in pages record that a submission happened, never what was typed. No password or anything else entered on the page is captured, stored, or transmitted.',
    },
    {
      title: 'MFA prompts and code requests',
      detail:
        'Messages that ask for a one-time code or tell someone to approve a sign-in, paired with coaching on MFA fatigue: deny and report any prompt you didn’t start.',
    },
    {
      title: 'Reporting habits',
      detail:
        'Every campaign checks whether people use the report button and how fast the first report arrives. A team that reports quickly gives your IT staff time to act before a real attack spreads.',
    },
  ],
  howItWorks: [
    {
      title: 'Authorization and scoping',
      detail:
        'We agree in writing on who is in scope, which lure types and channels are allowed, timing, exclusions, and who on your side knows. Rules of engagement cover allow-listing with your IT team, how real incidents are separated from tests, and how results are handled. We never target personal email, social media, or anyone’s life outside work.',
    },
    {
      title: 'Baseline campaign',
      detail:
        'A first campaign across the organization shows where you actually stand: who opens, who clicks, who submits, and who reports. Lures are realistic but fair, written for your industry rather than pulled from a generic template.',
    },
    {
      title: 'Ongoing cadence with adaptive difficulty',
      detail:
        'After the baseline, smaller campaigns run on a schedule you choose. Difficulty adjusts by group, so consistent reporters see harder lures and people who struggle get simpler ones with more coaching. The goal is a habit, not a gotcha.',
    },
    {
      title: 'Teachable moments and readouts',
      detail:
        'Anyone who clicks lands on a short, plain-language page that shows the clues they missed in that exact message. Each cycle ends with a readout of trends, problem lure types, and next steps. If you don’t have a one-click report button yet, we help you put one in place.',
    },
  ],
  deliverables: [
    'Signed rules of engagement and a campaign calendar',
    'Baseline report on click, submission, and report rates by department',
    'A custom lure library for your industry, reviewed with you before launch',
    'Plain-language teachable-moment pages for every lure',
    'Recurring trend reports with a short leadership summary',
    'Records of ongoing phishing testing that help document HIPAA, PCI DSS, and SOC 2 awareness controls and answer cyber-insurance questionnaires',
  ],
  metrics: [
    'Report rate',
    'Time to first report',
    'Click rate',
    'Credential submission rate',
    'Repeat-clicker trend',
  ],
  faqs: [
    {
      question: 'Is phishing simulation legal, and do employees need to know?',
      answer:
        'Phishing simulation is an organization-authorized test of company email and devices, not an attack on individuals. We start only with written authorization and agreed rules of engagement, and we never target personal email, social media, or anyone’s life outside work. Many organizations tell staff that simulated phishing is part of the security program without announcing dates, and we help you decide what to share.',
    },
    {
      question: 'What happens when an employee clicks a simulated phishing email?',
      answer:
        'They land on a short teachable-moment page that points out the clues in that specific message and what to do next time. Nothing they type is captured or stored, and no one is called out publicly. Results are used for coaching and program planning, not discipline, and how individual results are shared is set in the rules of engagement.',
    },
    {
      question: 'How often should we run phishing tests?',
      answer:
        'Start with a baseline campaign, then run smaller campaigns on a steady cadence you choose, such as monthly or quarterly. Consistency matters more than volume, because a regular rhythm builds the reporting habit without wearing people out. Difficulty adapts over time so strong reporters stay challenged and others get more support.',
    },
    {
      question: 'What affects the cost of a phishing simulation program?',
      answer:
        'Cost depends mainly on how many people are in scope, which channels you include (email, SMS, QR codes), how often campaigns run, and how much custom lure writing and reporting you need. Pairing simulation with security awareness training or vishing and pretext testing also changes the scope. We scope it on a short call and confirm everything in writing before anything starts.',
    },
  ],
};
