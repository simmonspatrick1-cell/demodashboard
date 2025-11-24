/**
 * Quick manual test for the email export pipeline.
 * - Imports prepareEmailContent and filterToNetSuiteData
 * - Uses a payload with extra/non-NetSuite fields
 * - Prints subject/body and quick checks that only allowlisted fields are emitted
 *
 * Run:
 *   node scripts/test-email-export.js
 */
import { prepareEmailContent, filterToNetSuiteData } from '../email-export-utils.js';

const samplePayload = {
  type: 'project',
  exportVersion: '1.0',
  timestamp: '2025-01-01T00:00:00.000Z',

  customer: {
    name: 'Acme Corp',
    entityid: 'ACME-001',
    email: 'ops@acme.com',
    phone: '555-123-4567',
    // Invalid / non-NS fields (should be filtered out)
    industry: 'Manufacturing',
    revenue: '$2M',
    size: '200'
  },

  project: {
    name: 'NTI Implementation',
    code: 'PRJ-1001',
    customerId: 12345,
    startDate: '2025-01-01',
    endDate: '2025-03-31',
    budget: 150000,
    status: 'OPEN',
    description: 'Initial phase'
  },

  estimate: {
    // SuiteScript maps names/IDs; this is intentionally mixed input
    status: 'Open',
    dueDate: '2025-02-15',
    class: 'Services',
    department: 'Delivery',
    location: 'HQ',
    // Invalid / non-NS fields (should be filtered out)
    type: 'T&M',
    total: 50000,
    items: [
      { name: 'Professional Services', quantity: 100, rate: 150, description: 'Implementation' },
      { name: 'Software Licensing', quantity: 12, rate: 500 }
    ]
  },

  tasks: [
    { name: 'Requirements', estimatedHours: '40', assignee: 'john.doe@example.com', dueDate: '2025-01-15' }
  ],

  checklists: [
    { name: 'Kickoff', items: [ { name: 'Invite stakeholders', completed: true }, { name: 'Deck', completed: false } ] }
  ]
};

function printDivider(title) {
  console.log('\n' + '-'.repeat(20) + ' ' + title + ' ' + '-'.repeat(20) + '\n');
}

(async function run() {
  try {
    printDivider('FILTERED STRUCTURE');
    const filtered = filterToNetSuiteData(samplePayload);
    console.log(JSON.stringify(filtered, null, 2));

    printDivider('EMAIL CONTENT');
    const emailContent = prepareEmailContent(samplePayload, {
      recipientEmail: 'you@example.com',
      includeInstructions: false,
      includeValidation: true,
      includeJsonFiltered: true
    });

    console.log('To:', emailContent.to);
    console.log('Subject:', emailContent.subject);
    console.log('\nBody (first 80 lines for brevity):\n');
    console.log(emailContent.body.split('\n').slice(0, 80).join('\n'));

    printDivider('SANITY CHECKS');
    const checks = [
      { label: 'No #estimateType hashtag', ok: !emailContent.body.includes('#estimateType') },
      { label: 'No #estimateTotal hashtag', ok: !emailContent.body.includes('#estimateTotal') },
      { label: 'Has #idempotencyKey', ok: emailContent.body.includes('#idempotencyKey:') },
      { label: 'Filtered JSON excludes "industry"', ok: !JSON.stringify(filtered).includes('industry') },
      { label: 'Filtered JSON excludes "revenue"', ok: !JSON.stringify(filtered).includes('revenue') },
      { label: 'Filtered JSON excludes "size"', ok: !JSON.stringify(filtered).includes('size') }
    ];
    for (const c of checks) {
      console.log(`${c.ok ? '✓' : '✗'} ${c.label}`);
    }

    printDivider('DONE');
    console.log('If all checks are ✓, the export email contains only NetSuite-supported fields.');
  } catch (err) {
    console.error('Test failed:', err);
    process.exitCode = 1;
  }
})();
