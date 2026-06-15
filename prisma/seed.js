import prisma from '../src/config/db.js';

async function main() {
  console.log('Starting seeding database...');

  // 1. Clean existing data
  await prisma.contact.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.form.deleteMany({});
  await prisma.campaign.deleteMany({});

  console.log('Cleaned old database records.');

  // 2. Create Campaigns
  const campaignRealEstate = await prisma.campaign.create({
    data: {
      name: 'Q3 Real Estate Inbound Campaign',
      description: 'Capturing inbound queries for the upcoming luxury apartments listing.',
      status: 'ACTIVE',
    },
  });

  const campaignSaas = await prisma.campaign.create({
    data: {
      name: 'SaaS Enterprise Demo Campaign',
      description: 'Targeting mid-to-large enterprises for automated testing software demo bookings.',
      status: 'ACTIVE',
    },
  });

  console.log('Created campaigns successfully.');

  // 3. Create Forms linked to Campaigns
  const formRealEstate = await prisma.form.create({
    data: {
      campaignId: campaignRealEstate.id,
      name: 'Property Inquiry Form',
      fields: JSON.stringify([
        { name: 'propertyType', label: 'Property Type', type: 'text', required: true },
        { name: 'budget', label: 'Max Budget (USD)', type: 'number', required: true },
        { name: 'preferredLocation', label: 'Preferred Location', type: 'text', required: false },
      ]),
    },
  });

  const formSaas = await prisma.form.create({
    data: {
      campaignId: campaignSaas.id,
      name: 'Enterprise Demo Form',
      fields: JSON.stringify([
        { name: 'companyName', label: 'Company Name', type: 'text', required: true },
        { name: 'teamSize', label: 'Engineering Team Size', type: 'number', required: true },
        { name: 'primaryFramework', label: 'Primary Tech Stack', type: 'text', required: false },
      ]),
    },
  });

  console.log('Created lead capture forms.');

  // 4. Create Initial Leads
  const lead1 = await prisma.lead.create({
    data: {
      campaignId: campaignRealEstate.id,
      formId: formRealEstate.id,
      firstName: 'Sarah',
      lastName: 'Connor',
      email: 'sarah.connor@skyline.io',
      phone: '1234567890',
      status: 'NEW',
      submittedData: JSON.stringify({
        propertyType: 'Penthouse Apartment',
        budget: '850000',
        preferredLocation: 'Downtown Austin',
      }),
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      campaignId: campaignSaas.id,
      formId: formSaas.id,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@techcorp.com',
      phone: '9876543210',
      status: 'CONTACTED',
      submittedData: JSON.stringify({
        companyName: 'TechCorp Solutions',
        teamSize: '75',
        primaryFramework: 'React & Node.js',
      }),
    },
  });

  console.log('Created initial leads.');

  // 5. Create Contacts associated with the Leads
  await prisma.contact.create({
    data: {
      leadId: lead1.id,
      firstName: 'Sarah',
      lastName: 'Connor',
      email: 'sarah.connor@skyline.io',
      phone: '1234567890',
      notes: 'Initial contact: interested in luxury penthouse. Budget is flexible.',
    },
  });

  await prisma.contact.create({
    data: {
      leadId: lead2.id,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@techcorp.com',
      phone: '9876543210',
      notes: 'Initial contact: Enterprise SaaS Demo booked. Technical lead developer.',
    },
  });

  console.log('Created CRM contact profiles.');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
