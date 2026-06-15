// Using Node.js native global fetch (no imports needed)

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log('==================================================');
  console.log(' Running Automated Validation & API Tests...');
  console.log('==================================================\n');

  let activeForms = [];
  
  // 0. Fetch seeded forms to get a valid form ID for dynamic tests
  try {
    const res = await fetch(`${BASE_URL}/forms`);
    const data = await res.json();
    if (data.success && data.data.length > 0) {
      activeForms = data.data;
      console.log(`✓ Fetched ${activeForms.length} active forms for validation testing.`);
    } else {
      console.log('⚠ Database empty? Ensure you seeded it first: npm run db:seed');
      process.exit(1);
    }
  } catch (err) {
    console.error('✗ Server connection failed. Is the server running? Run "npm run dev" first!');
    process.exit(1);
  }

  // Find the Real Estate property inquiry form (requires propertyType and budget)
  const propertyForm = activeForms.find(f => f.name.includes('Property'));
  if (!propertyForm) {
    console.log('⚠ Could not find seeded Property form. Seeding may have failed.');
    process.exit(1);
  }

  console.log(`\nUsing Form ID: ${propertyForm.id} ("${propertyForm.name}") for dynamic field test.`);

  // Define test cases
  const testCases = [
    {
      name: 'TEST 1: Valid Lead Capture (Standard + Dynamic Fields)',
      payload: {
        campaignId: propertyForm.campaignId,
        formId: propertyForm.id,
        firstName: '  Michael  ', // Trims whitespace
        lastName: 'Scott',
        email: 'MICHAEL.SCOTT@DunderMifflin.com', // Normalizes email to lowercase
        phone: '5551234567',
        submittedData: {
          propertyType: 'Office Condo',
          budget: 250000,
          preferredLocation: 'Scranton, PA'
        }
      },
      expectedStatus: 201,
      validate: (data) => {
        const lead = data.data.lead;
        const contact = data.data.contact;
        
        // Assertions
        if (lead.firstName !== 'Michael') throw new Error(`First name not trimmed! Got: "${lead.firstName}"`);
        if (lead.email !== 'michael.scott@dundermifflin.com') throw new Error(`Email not normalized to lowercase! Got: "${lead.email}"`);
        if (contact.email !== 'michael.scott@dundermifflin.com') throw new Error('CRM Contact not created with matching email');
        console.log('   -> SUCCESS: Sanitization checked out. Lead & Contact saved.');
      }
    },
    {
      name: 'TEST 2: Missing Required Field (firstName is missing)',
      payload: {
        campaignId: propertyForm.campaignId,
        formId: propertyForm.id,
        lastName: 'Scott',
        email: 'michael.scott@dundermifflin.com',
        phone: '5551234567',
        submittedData: {
          propertyType: 'Office Condo',
          budget: 250000
        }
      },
      expectedStatus: 400,
      validate: (data) => {
        if (data.success !== false) throw new Error('Expected success flag to be false');
        if (!data.errors.firstName) throw new Error('Missing validation error for firstName field');
        console.log(`   -> SUCCESS: Blocked as expected. Error msg: "${data.errors.firstName}"`);
      }
    },
    {
      name: 'TEST 3: Invalid Email Format',
      payload: {
        campaignId: propertyForm.campaignId,
        formId: propertyForm.id,
        firstName: 'Pam',
        email: 'pam.beesly.at.dunder.com', // Invalid email format
        phone: '5551234567',
        submittedData: {
          propertyType: 'Studio',
          budget: 150000
        }
      },
      expectedStatus: 400,
      validate: (data) => {
        if (data.success !== false) throw new Error('Expected success flag to be false');
        if (!data.errors.email) throw new Error('Missing validation error for email field');
        console.log(`   -> SUCCESS: Blocked as expected. Error msg: "${data.errors.email}"`);
      }
    },
    {
      name: 'TEST 4: Invalid Phone Format (not 10 digits)',
      payload: {
        campaignId: propertyForm.campaignId,
        formId: propertyForm.id,
        firstName: 'Jim',
        email: 'jim.halpert@dundermifflin.com',
        phone: '+1 12345', // Invalid phone
        submittedData: {
          propertyType: 'House',
          budget: 350000
        }
      },
      expectedStatus: 400,
      validate: (data) => {
        if (data.success !== false) throw new Error('Expected success flag to be false');
        if (!data.errors.phone) throw new Error('Missing validation error for phone field');
        console.log(`   -> SUCCESS: Blocked as expected. Error msg: "${data.errors.phone}"`);
      }
    },
    {
      name: 'TEST 5: Dynamic Schema Violation (Missing required dynamic field: budget)',
      payload: {
        campaignId: propertyForm.campaignId,
        formId: propertyForm.id,
        firstName: 'Dwight',
        email: 'dwight.schrute@dundermifflin.com',
        phone: '5559876543',
        submittedData: {
          propertyType: 'Beet Farm',
          // budget is required by the form schema, but missing here
          preferredLocation: 'Scranton, PA'
        }
      },
      expectedStatus: 400,
      validate: (data) => {
        if (data.success !== false) throw new Error('Expected success flag to be false');
        const budgetError = data.errors['submittedData.budget'];
        if (!budgetError) throw new Error('Missing validation error for custom required dynamic field budget');
        console.log(`   -> SUCCESS: Blocked dynamic field omission. Error msg: "${budgetError}"`);
      }
    }
  ];

  let passed = 0;
  for (const tc of testCases) {
    console.log(`\nRunning: ${tc.name}...`);
    try {
      const res = await fetch(`${BASE_URL}/leads/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tc.payload)
      });

      const data = await res.json();
      
      if (res.status !== tc.expectedStatus) {
        throw new Error(`Expected HTTP status ${tc.expectedStatus}, but got ${res.status}. Body: ${JSON.stringify(data)}`);
      }

      tc.validate(data);
      console.log(`✓ Passed: ${tc.name}`);
      passed++;
    } catch (err) {
      console.error(`✗ Failed: ${tc.name}`);
      console.error(`  Reason: ${err.message}`);
    }
  }

  console.log('\n==================================================');
  console.log(` Test Suite Complete: ${passed}/${testCases.length} Passed`);
  console.log('==================================================');
}

runTests();
