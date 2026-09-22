import type { DivisionServiceContent } from '../types';

export const physicalSocialEngineering: DivisionServiceContent = {
  slug: 'physical-social-engineering',
  navLabel: 'Physical social engineering',
  metaTitle: 'Physical social engineering tests | New Wave: Social Engineering',
  metaDescription:
    'Physical social engineering assessment in Fort Lauderdale: authorized tailgating, impersonation, and badge tests that show how your office holds up. Let’s talk.',
  keywords:
    'physical social engineering assessment, physical social engineering fort lauderdale, physical social engineering south florida, onsite social engineering test, tailgating test, impersonation testing, badge and door access testing',
  serviceType: 'Physical social engineering assessment',
  icon: 'building',
  kicker: 'On-site assessments',
  headline: 'Physical social engineering assessments that start at your front door',
  summary:
    'New Wave: Social Engineering runs authorized physical social engineering assessments for offices, clinics, and family offices across Fort Lauderdale and South Florida. Our testers try what a real intruder would: following staff through a secured door, posing as a vendor or IT technician, and walking past reception with a confident story. Every visit is approved in writing, and nothing is forced or damaged.',
  cardSummary:
    'On-site tests of tailgating, impersonation, reception procedures, and badge controls, run under written authorization with no forced entry.',
  whatWeTest: [
    {
      title: 'Tailgating and piggybacking',
      detail:
        'Whether a tester can follow staff through badge-controlled doors, garage entrances, and elevator lobbies, and whether anyone asks who they are. In the multi-tenant office towers common across South Florida, we also test the handoff between building security downstairs and your own suite door.',
    },
    {
      title: 'Impersonation of vendors, couriers, and IT',
      detail:
        'A delivery driver, an HVAC contractor, a copier technician, or someone “from IT” here to check the network. A good pretext looks almost exactly like every other visit that day, which is why it works. We find out which stories get a stranger past the front desk and into areas they shouldn’t reach.',
    },
    {
      title: 'Reception and visitor procedures',
      detail:
        'How the front desk handles sign-in, ID checks, visitor badges, and escorts, and what happens when a visitor asks to drop something off or wait inside. We look for whether staff verify an unexpected visit through a known contact rather than the number the visitor provides.',
    },
    {
      title: 'Badge and door controls',
      detail:
        'Propped or slow-closing doors, stairwell and side entrances, shared or borrowed badges, network closets, and how access changes after hours. Testers try doors the way a visitor would. We don’t pick locks, bypass hardware, or force anything.',
    },
    {
      title: 'Clean desks, unattended screens, and dropped media',
      detail:
        'Unlocked workstations, passwords on sticky notes, sensitive printouts left on shared printers, and whether dropped USB drives get plugged in. Any drive we leave is a harmless marker that records a connection and nothing more.',
    },
  ],
  howItWorks: [
    {
      title: 'Authorization and scoping',
      detail:
        'Someone with authority over the premises signs a written authorization, and in a shared building, property management also authorizes testing of lobbies, garages, and other common areas in writing before any visit. Rules of engagement list addresses, entrances, in-bounds and off-limits areas, test windows, allowed pretexts, and emergency contacts who can be reached throughout. Testers carry the signed authorization letter at all times, and there is no forced entry, no damage, and no testing of anyone outside work.',
    },
    {
      title: 'Reconnaissance and pretext planning',
      detail:
        'We study your site the way an outsider would: entrances, parking and garage access, delivery routines, and what the lobby looks like at different hours. Research stays on the premises and public business sources, never employees’ personal social media. Pretexts are written to fit how your office actually operates and reviewed with your point of contact before the visit.',
    },
    {
      title: 'On-site testing',
      detail:
        'Testers work through the agreed scenarios within the agreed windows, recording timestamps and photos of doors, desks, and screens rather than people. If a tester is challenged, they stop, identify themselves, and present the authorization letter. Your point of contact can pause or end the test at any time.',
    },
    {
      title: 'Debrief and readout',
      detail:
        'A short debrief with your point of contact follows each visit, then a written report explains what happened, where the process broke down, and how to fix it. Many fixes are simple: a door closer, a callback step at reception, or clear permission for staff to politely challenge a stranger. Many on-site pretexts start with a phone call, so this work pairs well with vishing and pretext testing.',
    },
  ],
  deliverables: [
    'Signed authorization letter, rules of engagement, and an emergency contact sheet for every visit',
    'A scenario plan covering entrances, pretexts, test windows, and off-limits areas',
    'Written report with timestamped observations and photo evidence of doors, desks, and screens',
    'Prioritized fixes across people, process, and facilities, with technical items ready to hand to your IT team or New Wave IT',
    'A leadership summary and a debrief session for reception, facilities, and office management staff',
    'Records that help document physical access and security awareness controls for HIPAA, SOC 2, and cyber-insurance reviews',
  ],
  metrics: [
    'Time to first challenge',
    'Tailgating attempts challenged',
    'Visitors verified at reception',
    'Restricted areas reached',
    'Unlocked screens and exposed documents',
  ],
  faqs: [
    {
      question: 'Is a physical social engineering assessment legal, and what happens if a tester is stopped?',
      answer:
        'We run a physical assessment only with written authorization from someone who has authority over the premises, and in a shared building, property management also authorizes any testing of common areas in writing. Every tester carries the signed authorization letter and a list of emergency contacts. If staff, building security, or police stop a tester, the tester stops, identifies themselves, and presents the letter so an authorized contact can confirm the engagement.',
    },
    {
      question: 'Will an on-site social engineering test disrupt our office?',
      answer:
        'The visits are designed to look like ordinary traffic: a delivery, a vendor, a technician. Test windows are agreed in advance, and sensitive areas such as patient care rooms or client meetings can be placed off-limits. There is no forced entry or damage, and testers stop immediately if your point of contact asks or if anyone’s safety could be affected.',
    },
    {
      question: 'How are employees treated if they let a tester in?',
      answer:
        'Holding a door or helping a visitor usually means someone was trying to be courteous, so we treat findings as coaching opportunities, not grounds for discipline. Reports focus on doors, procedures, and roles, and how individual observations are shared is set in the rules of engagement. The fix is often a clearer procedure and explicit permission to politely ask who someone is.',
    },
    {
      question: 'How often should we run a physical assessment, and what affects the cost?',
      answer:
        'We usually recommend a periodic on-site assessment, such as once a year, plus another after an office move, a renovation, a change in front-desk staffing, or a security incident. Cost depends on the number of locations and entrances, whether after-hours testing is included, which scenarios are in scope, and how much coordination a shared building requires. We scope it on a short call and confirm everything in writing before any visit.',
    },
  ],
};
